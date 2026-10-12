import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import db from './db.js';
import crypto from 'crypto';
import { DATA_DIR, KINDS, AUDIO_RE, IMAGE_RE, syncData, sectionDir, relPath, scanSection, mediaUrl } from './data.js';
import { parsePart } from './parse.js';
import { canonName, validName } from './names.js';

const app = express();
const SECRET = process.env.JWT_SECRET || 'change-me-in-production';
app.use(cors(), express.json({ limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: (r, f, cb) => cb(null, f.mimetype.startsWith('audio') ? 'uploads/audio' : 'uploads/images'),
  filename: (r, f, cb) => cb(null, Date.now() + path.extname(f.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const auth = (req, res, next) => {
  try { req.admin = jwt.verify((req.headers.authorization || '').slice(7), SECRET); next(); }
  catch { res.status(401).json({ error: 'Unauthorized' }); }
};
const J = (s) => { try { return JSON.parse(s); } catch { return s; } };
const settings = () => Object.fromEntries(db.prepare('SELECT * FROM settings').all().map(r => [r.key, J(r.value)]));

// ───────── AUTH ─────────
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const a = db.prepare('SELECT * FROM admins WHERE username=?').get(username);
  if (!a || !bcrypt.compareSync(password || '', a.password)) return res.status(401).json({ error: "Login yoki parol noto'g'ri" });
  res.json({ token: jwt.sign({ id: a.id, username }, SECRET, { expiresIn: '12h' }) });
});

// ───────── PUBLIC ─────────
app.get('/api/settings', (_, res) => res.json(settings()));

app.get('/api/mock/random', (_, res) => {
  const pick = (t) => db.prepare(`SELECT id FROM tests WHERE status='published' AND type=? ORDER BY RANDOM() LIMIT 1`).get(t)?.id;
  // avval data/full mock papkalaridan juftlik (bitta mockning Reading + Listening), bo'lmasa tasodifiy
  const pair = db.prepare(`SELECT r.id reading, l.id listening FROM tests r JOIN tests l ON l.mock_group = r.mock_group
    WHERE r.mock_group IS NOT NULL AND r.type='reading' AND l.type='listening' AND r.status='published' AND l.status='published' ORDER BY RANDOM() LIMIT 1`).get();
  const reading = pair?.reading ?? pick('reading'), listening = pair?.listening ?? pick('listening');
  reading && listening ? res.json({ reading, listening, session: crypto.randomUUID() }) : res.status(404).json({ error: 'Test yetarli emas' });
});

// ───────── MEDIA (data/ ichidagi audio va xarita rasmlari; javoblar fayli berilmaydi) ─────────
app.get('/media/*', (req, res) => {
  const r = String(req.params[0] || ''), full = path.resolve(DATA_DIR, r);
  const ok = full.startsWith(DATA_DIR + path.sep) && /(^|\/)(music|audio|map|maps)\//i.test(r) && (AUDIO_RE.test(full) || IMAGE_RE.test(full)) && fs.existsSync(full);
  ok ? res.sendFile(full) : res.status(404).end();
});

// ───────── TEST KODI: to'liq ekrandan chiqib ketgan o'quvchini blokdan chiqarish ─────────
const UNLOCK_CODE = process.env.UNLOCK_CODE || '654789', fails = new Map();
app.post('/api/unlock', async (req, res) => {
  const ip = req.ip || 'x', f = (fails.get(ip) || []).filter(t => Date.now() - t < 10 * 60 * 1000);
  if (f.length >= 20) return res.status(429).json({ error: "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring" });
  if (String(req.body.code || '').trim() === UNLOCK_CODE) return res.json({ ok: true });
  fails.set(ip, [...f, Date.now()]); await new Promise(r => setTimeout(r, 500));
  res.status(401).json({ error: "Kod noto'g'ri" });
});

app.get('/api/tests', (req, res) => {
  const { level, type } = req.query;
  res.json(db.prepare(`
    SELECT t.*, (SELECT COUNT(*) FROM questions q JOIN parts p ON p.id=q.part_id WHERE p.test_id=t.id) AS questions
    FROM tests t WHERE status='published' AND (@type IS NULL OR type=@type)
    ORDER BY id`).all({ type: type ?? null }));
});

// Bosh sahifa statistikasi (ochiq; faqat umumiy sonlar)
app.get('/api/stats', (_, res) => {
  const n = (sql) => db.prepare(sql).get().n || 0;
  res.json({
    tests: n(`SELECT COUNT(*) n FROM tests WHERE status='published'`),
    students: n(`SELECT COUNT(*) n FROM users`),
    attempts: n(`SELECT COUNT(*) n FROM attempts`),
    avg: Math.round(n(`SELECT AVG(percent) n FROM attempts`)),
  });
});
// O'quvchining oxirgi urinishlari: dashboard va progress grafigi uchun
app.get('/api/users/:id/attempts', (req, res) => {
  res.json(db.prepare(`SELECT a.id, a.score, a.total, a.percent, a.cefr, a.part_filter, a.created_at, t.title, t.type
    FROM attempts a JOIN tests t ON t.id=a.test_id WHERE a.user_id=? ORDER BY a.id DESC LIMIT 30`).all(+req.params.id || 0));
});

// Test to'liq tuzilmasi — to'g'ri javoblarsiz!
app.get('/api/tests/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM tests WHERE id=?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Topilmadi' });
  t.parts = db.prepare('SELECT * FROM parts WHERE test_id=? ORDER BY part_no').all(t.id).map(p => ({
    ...p, content: J(p.content),
    questions: db.prepare('SELECT id, order_no, data FROM questions WHERE part_id=? ORDER BY order_no').all(p.id)
      .map(q => ({ ...q, data: J(q.data) })),
  }));
  res.json(t);
});

// ───────── STUDENT LOGIN (ism + familya, parolsiz) ─────────
app.post('/api/users/register', (req, res) => {
  const first = canonName(req.body.first_name), last = canonName(req.body.last_name);
  if (!validName(first) || !validName(last)) return res.status(400).json({ error: "Ism va familyani to'g'ri kiriting" });
  const full = `${first} ${last}`;
  // bir xil ism-familya (katta/kichik harfdan qat'i nazar) = bitta o'quvchi
  let u = db.prepare('SELECT * FROM users WHERE lower(name)=lower(?)').get(full);
  if (!u) u = db.prepare('SELECT * FROM users WHERE id=?').get(
    db.prepare('INSERT INTO users (name,first_name,last_name) VALUES (?,?,?)').run(full, first, last).lastInsertRowid);
  else if (!u.first_name) db.prepare('UPDATE users SET first_name=?, last_name=? WHERE id=?').run(first, last, u.id);
  if (u.blocked) return res.status(403).json({ error: 'Akkaunt bloklangan' });
  res.json({ id: u.id, name: full, first_name: first, last_name: last });
});

// "Full Mock 17 — Reading" va "Full Mock 17 — Listening" = bitta mock ("Full Mock 17")
const mockName = (t) => String(t).replace(/\s*[—–-]+\s*(reading|listening)\s*$/i, '').trim();

// Reyting: eng kam xato qilgan birinchi. Har bir o'quvchining shu mockdagi eng yaxshi urinishi olinadi;
// avval ikkala bo'limni ham topshirganlar, keyin xatolar soni bo'yicha. Bitta Part'lik mashqlar hisobga olinmaydi.
function ranking(mock, section = 'all') {
  const people = new Map();
  for (const r of db.prepare(`SELECT a.id, a.user_id, a.user_name, a.score, a.total, a.created_at, t.title, t.type
      FROM attempts a JOIN tests t ON t.id=a.test_id WHERE a.part_filter IS NULL ORDER BY a.id`).all()) {
    if (mockName(r.title) !== mock || (section !== 'all' && r.type !== section)) continue;
    const key = r.user_id ?? `n:${String(r.user_name).toLowerCase()}`;
    if (!people.has(key)) people.set(key, { user_id: r.user_id, name: r.user_name, listening: null, reading: null, last_at: r.created_at });
    const p = people.get(key), cur = p[r.type];
    if (!cur || r.total - r.score < cur.total - cur.score) p[r.type] = { id: r.id, score: r.score, total: r.total };
    if (r.created_at > p.last_at) p.last_at = r.created_at;
  }
  const list = [...people.values()].map(p => {
    const secs = [p.listening, p.reading].filter(Boolean), score = secs.reduce((n, x) => n + x.score, 0), total = secs.reduce((n, x) => n + x.total, 0);
    return { ...p, sections: secs.length, score, total, mistakes: total - score };
  }).sort((a, b) => b.sections - a.sections || a.mistakes - b.mistakes || (a.last_at < b.last_at ? -1 : 1));
  let rank = 0, prev = null;
  list.forEach((r, i) => { const k = `${r.sections}:${r.mistakes}`; if (k !== prev) { rank = i + 1; prev = k; } r.rank = rank; });
  return list;
}
app.get('/api/ranking', (req, res) => {
  const mocks = [...new Set(db.prepare(`SELECT t.title, MAX(a.id) m FROM attempts a JOIN tests t ON t.id=a.test_id WHERE a.part_filter IS NULL GROUP BY t.title ORDER BY m DESC`).all().map(r => mockName(r.title)))];
  const mock = mocks.includes(req.query.mock) ? req.query.mock : mocks[0] ?? null;
  const section = ['listening', 'reading'].includes(req.query.section) ? req.query.section : 'all';
  res.json({ mocks, mock, section, rows: mock ? ranking(mock, section) : [] });
});

// ───────── SCORING ─────────
const norm = (v) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const isCorrect = (given, answer) => {
  const accepted = Array.isArray(answer) ? answer : [answer];
  return accepted.some(a => norm(a) === norm(given));
};
const cefrOf = (p) => (p < 25 ? 'A1' : p < 40 ? 'A2' : p < 55 ? 'B1' : p < 70 ? 'B2' : p < 85 ? 'C1' : 'C2');

app.post('/api/tests/:id/submit', (req, res) => {
  const { userId = null, answers = {}, sessionId = null } = req.body;
  const u = userId ? db.prepare('SELECT name, blocked FROM users WHERE id=?').get(userId) : null;
  if (u?.blocked) return res.status(403).json({ error: 'Akkaunt bloklangan' });
  const name = u?.name || String(req.body.name || 'Mehmon').slice(0, 80);
  const only = Array.isArray(req.body.parts) && req.body.parts.length ? req.body.parts.map(Number) : null;     // faqat tanlangan Part
  const parts = db.prepare('SELECT * FROM parts WHERE test_id=? ORDER BY part_no').all(req.params.id).filter(p => !only || only.includes(p.part_no));
  let score = 0, total = 0;
  const breakdown = parts.map(p => {
    const qs = db.prepare('SELECT * FROM questions WHERE part_id=? ORDER BY order_no').all(p.id);
    const items = qs.map(q => {
      const answer = J(q.answer), given = answers[q.id] ?? null, ok = given !== null && isCorrect(given, answer);
      return { id: q.id, given, correct: answer, ok, explanation: q.explanation };
    });
    const s = items.filter(i => i.ok).length;
    score += s; total += items.length;
    return { part: p.part_no, kind: p.kind, score: s, total: items.length, items };
  });
  const percent = total ? +(score / total * 100).toFixed(1) : 0, cefr = only ? null : cefrOf(percent);          // bitta Part uchun CEFR darajasi berilmaydi
  const r = db.prepare(`INSERT INTO attempts (test_id,user_id,user_name,score,total,percent,cefr,breakdown,answers,session_id,part_filter)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(req.params.id, userId, name, score, total, percent, cefr, JSON.stringify(breakdown), JSON.stringify(answers), sessionId ? String(sessionId).slice(0, 64) : null, only ? only.join(',') : null);
  res.json({ id: r.lastInsertRowid, name, score, total, percent, cefr, breakdown, part: only ? only.join(',') : null });
});

// ───────── ADMIN: TESTS ─────────
const A = express.Router();
A.use(auth);

A.get('/tests', (req, res) => {
  const { q = '', level, type, status } = req.query;
  res.json(db.prepare(`
    SELECT t.*, (SELECT COUNT(*) FROM attempts a WHERE a.test_id=t.id) attempts
    FROM tests t WHERE title LIKE @q AND (@type IS NULL OR type=@type) AND (@status IS NULL OR status=@status)
    ORDER BY id DESC`).all({ q: `%${q}%`, type: type ?? null, status: status ?? null }));
});
function createTest({ title, level = null, type, duration = 60, difficulty = 'medium', description = '', status = 'draft' }) {
  const r = db.prepare('INSERT INTO tests (title,level,type,duration,difficulty,description,status) VALUES (?,?,?,?,?,?,?)')
    .run(title, level, type, duration, difficulty, description, status);
  KINDS[type].forEach((k, i) => db.prepare('INSERT INTO parts (test_id,part_no,kind) VALUES (?,?,?)').run(r.lastInsertRowid, i + 1, k));
  return r.lastInsertRowid;
}
A.post('/tests', (req, res) => res.json({ id: createTest(req.body) }));
A.put('/tests/:id', (req, res) => {
  const f = ['title', 'level', 'type', 'duration', 'difficulty', 'description', 'status'].filter(k => k in req.body);
  db.prepare(`UPDATE tests SET ${f.map(k => k + '=?').join(',')} WHERE id=?`).run(...f.map(k => req.body[k]), req.params.id);
  res.json({ ok: true });
});
A.delete('/tests/:id', (req, res) => { db.prepare('DELETE FROM tests WHERE id=?').run(req.params.id); res.json({ ok: true }); });
A.post('/tests/:id/duplicate', (req, res) => {
  const tx = db.transaction(() => {
    const t = db.prepare('SELECT * FROM tests WHERE id=?').get(req.params.id);
    const nt = db.prepare('INSERT INTO tests (title,level,type,duration,difficulty,description,status) VALUES (?,?,?,?,?,?,?)')
      .run(t.title + ' (nusxa)', t.level, t.type, t.duration, t.difficulty, t.description, 'draft').lastInsertRowid;
    for (const p of db.prepare('SELECT * FROM parts WHERE test_id=?').all(t.id)) {
      const np = db.prepare('INSERT INTO parts (test_id,part_no,kind,instructions,audio_url,image_url,content) VALUES (?,?,?,?,?,?,?)')
        .run(nt, p.part_no, p.kind, p.instructions, p.audio_url, p.image_url, p.content).lastInsertRowid;
      for (const q of db.prepare('SELECT * FROM questions WHERE part_id=?').all(p.id))
        db.prepare('INSERT INTO questions (part_id,order_no,data,answer,explanation) VALUES (?,?,?,?,?)').run(np, q.order_no, q.data, q.answer, q.explanation);
    }
    return nt;
  });
  res.json({ id: tx() });
});

// ───────── ADMIN: PARTS & QUESTIONS ─────────
A.get('/tests/:id', (req, res) => {
  const t = db.prepare('SELECT * FROM tests WHERE id=?').get(req.params.id);
  t.parts = db.prepare('SELECT * FROM parts WHERE test_id=? ORDER BY part_no').all(t.id).map(p => ({
    ...p, content: J(p.content),
    questions: db.prepare('SELECT * FROM questions WHERE part_id=? ORDER BY order_no').all(p.id).map(q => ({ ...q, data: J(q.data), answer: J(q.answer) })),
  }));
  res.json(t);
});
A.put('/parts/:id', (req, res) => {
  const { instructions, audio_url, image_url, content } = req.body;
  db.prepare('UPDATE parts SET instructions=?, audio_url=?, image_url=?, content=? WHERE id=?')
    .run(instructions, audio_url, image_url, JSON.stringify(content || {}), req.params.id);
  res.json({ ok: true });
});
A.post('/parts/:id/questions', (req, res) => {
  const { data = {}, answer, explanation = '' } = req.body;
  const o = db.prepare('SELECT COALESCE(MAX(order_no),0)+1 n FROM questions WHERE part_id=?').get(req.params.id).n;
  const r = db.prepare('INSERT INTO questions (part_id,order_no,data,answer,explanation) VALUES (?,?,?,?,?)')
    .run(req.params.id, o, JSON.stringify(data), JSON.stringify(answer), explanation);
  res.json({ id: r.lastInsertRowid });
});
A.put('/questions/:id', (req, res) => {
  const { data, answer, explanation } = req.body;
  db.prepare('UPDATE questions SET data=?, answer=?, explanation=? WHERE id=?').run(JSON.stringify(data), JSON.stringify(answer), explanation, req.params.id);
  res.json({ ok: true });
});
A.delete('/questions/:id', (req, res) => { db.prepare('DELETE FROM questions WHERE id=?').run(req.params.id); res.json({ ok: true }); });
A.put('/parts/:id/reorder', (req, res) => {           // drag & drop: body = { ids: [3,1,2] }
  const st = db.prepare('UPDATE questions SET order_no=? WHERE id=? AND part_id=?');
  db.transaction(() => req.body.ids.forEach((id, i) => st.run(i + 1, id, req.params.id)))();
  res.json({ ok: true });
});
A.post('/parts/:id/import', (req, res) => {           // bulk JSON: body = { questions: [{data, answer, explanation}] }
  const st = db.prepare('INSERT INTO questions (part_id,order_no,data,answer,explanation) VALUES (?,?,?,?,?)');
  db.transaction(() => req.body.questions.forEach((q, i) =>
    st.run(req.params.id, i + 1, JSON.stringify(q.data || {}), JSON.stringify(q.answer), q.explanation || '')))();
  res.json({ imported: req.body.questions.length });
});
A.post('/upload', upload.single('file'), (req, res) =>
  res.json({ url: `/uploads/${req.file.mimetype.startsWith('audio') ? 'audio' : 'images'}/${req.file.filename}` }));

// ───────── ADMIN: USERS / SETTINGS / DASHBOARD ─────────
A.get('/users', (_, res) => res.json(db.prepare(`
  SELECT u.*, (SELECT COUNT(*) FROM attempts WHERE user_id=u.id) attempts,
    (SELECT MAX(created_at) FROM attempts WHERE user_id=u.id) last_at FROM users u ORDER BY id DESC`).all()));
A.put('/users/:id/block', (req, res) => { db.prepare('UPDATE users SET blocked=? WHERE id=?').run(req.body.blocked ? 1 : 0, req.params.id); res.json({ ok: true }); });
A.delete('/users/:id', (req, res) => { db.prepare('DELETE FROM users WHERE id=?').run(req.params.id); res.json({ ok: true }); });
A.get('/users/:id/attempts', (req, res) => res.json(results({ userId: req.params.id, limit: 200 })));

// ───────── ADMIN: NATIJALAR (mock = Listening + Reading bitta qatorda) ─────────
function results({ q = '', userId = null, limit = 50, mock = '' } = {}) {
  const rows = db.prepare(`SELECT a.id, a.user_id, a.user_name, a.score, a.total, a.percent, a.session_id, a.part_filter, a.created_at, t.title, t.type
    FROM attempts a JOIN tests t ON t.id=a.test_id WHERE (@uid IS NULL OR a.user_id=@uid) ORDER BY a.id DESC LIMIT 2000`).all({ uid: userId });
  const map = new Map();
  for (const r of rows) {
    const key = r.session_id || `a${r.id}`;
    let g = map.get(key);
    if (!g) map.set(key, g = { key, user_id: r.user_id, name: r.user_name, created_at: r.created_at, listening: null, reading: null, mocks: [] });
    g[r.type] = { id: r.id, title: r.title, score: r.score, total: r.total, percent: r.percent, part: r.part_filter };
    if (!g.mocks.includes(mockName(r.title))) g.mocks.push(mockName(r.title));
  }
  const needle = String(q).trim().toLowerCase();
  const out = [...map.values()].filter(g => (!needle || String(g.name).toLowerCase().includes(needle)) && (!mock || g.mocks.includes(mock)));
  return out.slice(0, +limit || 50).map(g => ({ ...g, score: (g.listening?.score || 0) + (g.reading?.score || 0), total: (g.listening?.total || 0) + (g.reading?.total || 0) }));
}
A.get('/results', (req, res) => res.json(results(req.query)));
A.get('/results/:key', (req, res) => {          // bitta mock: har bir savol to'g'ri/noto'g'ri
  const k = req.params.key, rows = k.startsWith('a') && /^a\d+$/.test(k)
    ? db.prepare('SELECT a.*, t.title, t.type FROM attempts a JOIN tests t ON t.id=a.test_id WHERE a.id=?').all(k.slice(1))
    : db.prepare('SELECT a.*, t.title, t.type FROM attempts a JOIN tests t ON t.id=a.test_id WHERE a.session_id=? ORDER BY a.id').all(k);
  if (!rows.length) return res.status(404).json({ error: 'Topilmadi' });
  const sections = rows.map(a => {
    const qtext = new Map(db.prepare('SELECT q.id, q.data FROM questions q JOIN parts p ON p.id=q.part_id WHERE p.test_id=?').all(a.test_id).map(q => [q.id, J(q.data)?.text || '']));
    let n = 0;
    const parts = (J(a.breakdown) || []).map(p => ({ ...p, items: p.items.map(i => ({ ...i, no: ++n, text: qtext.get(i.id) || '' })) }));
    return { id: a.id, type: a.type, title: a.title, score: a.score, total: a.total, percent: a.percent, parts };
  }).sort((x, y) => (x.type === 'listening' ? 0 : 1) - (y.type === 'listening' ? 0 : 1));
  res.json({ key: k, name: rows[0].user_name, created_at: rows[0].created_at, sections });
});

A.put('/settings', (req, res) => {
  const st = db.prepare('INSERT OR REPLACE INTO settings VALUES (?,?)');
  Object.entries(req.body).forEach(([k, v]) => k !== 'admin_password' && st.run(k, JSON.stringify(v)));
  if (req.body.admin_password) db.prepare('UPDATE admins SET password=? WHERE id=?').run(bcrypt.hashSync(req.body.admin_password, 10), req.admin.id);
  res.json({ ok: true });
});

A.get('/dashboard', (_, res) => {
  const one = (sql) => db.prepare(sql).get();
  res.json({
    cards: {
      tests: one('SELECT COUNT(*) n FROM tests').n, users: one('SELECT COUNT(*) n FROM users').n,
      attempts: one('SELECT COUNT(*) n FROM attempts').n, avg: +(one('SELECT AVG(percent) n FROM attempts').n || 0).toFixed(1),
    },
    daily: db.prepare(`SELECT date(created_at) day, COUNT(*) count FROM attempts WHERE created_at >= date('now','-30 day') GROUP BY day ORDER BY day`).all(),
    popular: db.prepare(`SELECT t.id, t.title, COUNT(a.id) attempts FROM tests t LEFT JOIN attempts a ON a.test_id=t.id GROUP BY t.id ORDER BY attempts DESC LIMIT 5`).all(),
    recent: results({ limit: 10 }),
  });
});

// ───────── data/ PAPKA -> TESTLAR ─────────
let lastSync = null;
const runSync = () => { try { lastSync = syncData(db); } catch (e) { lastSync = { at: new Date().toISOString(), dir: DATA_DIR, tests: [], warnings: [`Sinxronlashda xato: ${e.message}`] }; console.error(e); } return lastSync; };
// ───────── ADMIN: TEST QO'SHISH (fayllar data/ ga yoziladi) ─────────
const mem = multer({ storage: multer.memoryStorage(), limits: { fileSize: 300 * 1024 * 1024 } });
const SECTIONS = (kind) => (kind === 'full' ? ['reading', 'listening'] : [kind]);
const okKind = (k) => ['reading', 'listening', 'full'].includes(k);
const fileOf = (dir, re) => (fs.existsSync(dir) ? fs.readdirSync(dir).find(f => re.test(f)) : undefined);
const withErr = (fn) => (req, res) => { try { fn(req, res); } catch (e) { res.status(400).json({ error: e.message }); } };

// Screenshot -> OCR (jarayon loglari satrma-satr oqib keladi)
A.post('/ocr', mem.array('images', 8), async (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8'); res.setHeader('Cache-Control', 'no-cache'); res.setHeader('X-Accel-Buffering', 'no');
  const send = (o) => res.write(JSON.stringify(o) + '\n');
  try {
    const files = (req.files || []).filter(f => /^image\//.test(f.mimetype));
    if (!files.length) throw new Error('Rasm yuborilmadi');
    send({ t: 'log', msg: `${files.length} ta rasm qabul qilindi` });
    const { ocrImages } = await import('./ocr.js');
    const psm = ['3', '4', '6'].includes(String(req.body.psm)) ? String(req.body.psm) : '6';
    send({ t: 'log', msg: `OCR rejimi: ${psm === '6' ? 'bitta ustun (PSM 6)' : psm === '3' ? "ko'p ustun / avtomatik (PSM 3)" : 'PSM ' + psm}` });
    const text = await ocrImages(files.map(f => f.buffer), (e) => send({ t: 'log', ...e }), psm);
    send({ t: 'done', text });
  } catch (e) {
    const msg = /fetch|network|ENOTFOUND|EAI_AGAIN|ECONN|timed? ?out/i.test(String(e.message)) ? "Til faylini yuklab bo'lmadi — birinchi marta internet kerak" : String(e.message || e);
    send({ t: 'error', msg });
  }
  res.end();
});
// Part matni platformaga qanday qabul qilinishini ko'rsatadi
A.post('/parse-preview', withErr((req, res) => {
  const { type, part, text } = req.body, kind = KINDS[type]?.[part - 1];
  if (!kind) throw new Error('Part topilmadi');
  const r = parsePart(kind, String(text || ''));
  res.json({ kind, count: r.questions.length, options: r.content.options?.length || 0, instructions: r.instructions });
}));
// Mavjud test fayllarini o'qish (tahrirlash uchun)
A.get('/data/test', withErr((req, res) => {
  const { kind, name } = req.query; if (!okKind(kind)) throw new Error("Tur noto'g'ri");
  const sections = {}; let exists = false;
  for (const type of SECTIONS(kind)) {
    const dir = sectionDir(kind, name, type), ok = fs.existsSync(dir); exists ||= ok;
    const sc = ok ? scanSection(dir, type) : { parts: {}, answers: null, audio: {}, map: null };
    sections[type] = { parts: sc.parts, answers: sc.answers || '', audio: Object.fromEntries(Object.entries(sc.audio).map(([n, r]) => [n, mediaUrl(r)])), map: sc.map ? mediaUrl(sc.map) : null };
  }
  res.json({ exists, sections });
}));
// partN.txt va answers.txt fayllarini yozish, so'ng testni sinxronlash
A.post('/data/save', withErr((req, res) => {
  const { kind, name, sections = {} } = req.body; if (!okKind(kind)) throw new Error("Tur noto'g'ri");
  const written = [];
  for (const type of SECTIONS(kind)) {
    const dir = sectionDir(kind, name, type), sec = sections[type] || {}; fs.mkdirSync(dir, { recursive: true });
    if (type === 'listening') for (const sub of ['music', 'map']) fs.mkdirSync(path.join(dir, fs.readdirSync(dir).find(f => f.toLowerCase() === sub) || sub), { recursive: true });
    const put = (re, fallback, text) => {
      const f = fileOf(dir, re), body = String(text ?? '').replace(/\r\n/g, '\n').replace(/^\uFEFF/, '');
      if (body.trim()) { fs.writeFileSync(path.join(dir, f || fallback), body.trimEnd() + '\n', 'utf8'); written.push(relPath(path.join(dir, f || fallback))); }
      else if (f) fs.unlinkSync(path.join(dir, f));
    };
    for (let n = 1; n <= KINDS[type].length; n++) put(new RegExp(`^part[\\s_-]*${n}\\.txt$`, 'i'), `part${n}.txt`, sec.parts?.[n]);
    put(/^(answers?|answer[\s_-]*key|key)\.txt$/i, 'answers.txt', sec.answers);
  }
  const rep = runSync(), prefixes = SECTIONS(kind).map(t => relPath(sectionDir(kind, name, t)));
  res.json({ written, tests: rep.tests.filter(t => prefixes.includes(t.source)), warnings: rep.warnings });
}));
// Audio (music/partN.mp3) yoki xarita rasmi (map/) yuklash
A.post('/data/file', mem.single('file'), withErr((req, res) => {
  const { kind, name, section, target } = req.body, n = +req.body.part;
  if (!okKind(kind) || !SECTIONS(kind).includes(section) || !req.file) throw new Error("So'rov noto'g'ri");
  const dir = sectionDir(kind, name, section), ext = path.extname(req.file.originalname).toLowerCase(); fs.mkdirSync(dir, { recursive: true });
  let out;
  if (target === 'audio') {
    if (section !== 'listening' || !(n >= 1 && n <= 6) || !AUDIO_RE.test(ext)) throw new Error('Audio fayl (mp3, wav, m4a...) tanlang');
    const sub = path.join(dir, fs.readdirSync(dir).find(f => /^(music|audio)$/i.test(f)) || 'music'); fs.mkdirSync(sub, { recursive: true });
    fs.readdirSync(sub).filter(f => new RegExp(`^part[\\s_-]*${n}\\b`, 'i').test(f)).forEach(f => fs.unlinkSync(path.join(sub, f)));
    out = path.join(sub, `part${n}${ext}`);
  } else if (target === 'map') {
    if (section !== 'listening' || !IMAGE_RE.test(ext)) throw new Error('Rasm fayl (png, jpg...) tanlang');
    const sub = path.join(dir, fs.readdirSync(dir).find(f => /^maps?$/i.test(f)) || 'map'); fs.mkdirSync(sub, { recursive: true });
    fs.readdirSync(sub).filter(f => IMAGE_RE.test(f)).forEach(f => fs.unlinkSync(path.join(sub, f)));
    out = path.join(sub, `map${ext}`);
  } else throw new Error("So'rov noto'g'ri");
  fs.writeFileSync(out, req.file.buffer); runSync();
  res.json({ url: mediaUrl(relPath(out)) });
}));

A.post('/sync', (_, res) => res.json(runSync()));
A.get('/sync', (_, res) => res.json(lastSync || runSync()));
runSync();
try { let t; fs.watch(DATA_DIR, { recursive: true }, () => { clearTimeout(t); t = setTimeout(runSync, 1500); }); } catch { /* kuzatuvchi ixtiyoriy */ }

app.use('/api/admin', A);
// Production: build qilingan frontendni xizmat qiladi
const dist = path.resolve('../client/dist');
if (fs.existsSync(dist)) { app.use(express.static(dist)); app.get('*', (_, res) => res.sendFile(path.join(dist, 'index.html'))); }
app.listen(process.env.PORT || 5000, () => console.log('API: http://localhost:5000'));
