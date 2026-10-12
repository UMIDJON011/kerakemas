// data/ papkadan testlarni o'qiydi va bazaga sinxronlaydi.
//
//   data/reading/<test>/part1.txt … part5.txt            (+ answers.txt)
//   data/listening/<test>/part1.txt … part6.txt          (+ answers.txt)
//        music/part1.mp3 … part6.mp3                     (audio)
//        map/<screenshot>.png                            (Part 4 xaritasi; savollar part4.txt da)
//   data/full mock/<full_mock_1>/reading/…  va  listening/…   (yuqoridagi bilan bir xil tuzilma)
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { parsePart, parseKey, variants } from './parse.js';

export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data'));
export const KINDS = {
  reading: ['gap_fill', 'matching_ads', 'heading_matching', 'mc_tfng', 'summary_gap'],
  listening: ['mc', 'gap_fill', 'multi_matching', 'map_label', 'mc', 'gap_fill'] };
export const AUDIO_RE = /\.(mp3|wav|m4a|ogg|aac|flac)$/i, IMAGE_RE = /\.(png|jpe?g|webp|gif|svg)$/i;
const PARSER_V = 4;             // parser yaxshilansa — partlar qayta o'qiladi

export const safeName = (s) => String(s ?? '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').replace(/^\.+|\.+$/g, '').trim().slice(0, 60);
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const natural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const readTxt = (f) => fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');      // Windows Notepad BOM
const J = (s) => { try { return JSON.parse(s); } catch { return null; } };
const sha = (s) => crypto.createHash('sha1').update(s).digest('hex');
const list = (p, dirs) => { try { return fs.readdirSync(p, { withFileTypes: true }).filter(d => (dirs ? d.isDirectory() : d.isFile()) && !d.name.startsWith('.')).map(d => d.name).sort(natural); } catch { return []; } };
const child = (p, ...names) => list(p, true).find(d => names.map(norm).includes(norm(d)));
const pretty = (n) => n.replace(/_+/g, ' ').replace(/\s*[-—–]*\s*(reading|listening)\s*$/i, '').replace(/\s+/g, ' ').trim().replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()) || n;
const rel = (...p) => path.relative(DATA_DIR, path.join(...p)).split(path.sep).join('/');
export const mediaUrl = (r) => '/media/' + r.split('/').map(encodeURIComponent).join('/');

// Bitta bo'lim papkasi (reading yoki listening testi) -> tavsif
function scanSection(dir, type) {
  const warnings = [], parts = {}, audio = {}, max = KINDS[type].length;
  for (const f of list(dir, false)) {
    const m = f.match(/^part[\s_-]*(\d)\.txt$/i);
    if (m && +m[1] >= 1 && +m[1] <= max) parts[+m[1]] = readTxt(path.join(dir, f));
  }
  for (let n = 1; n <= max; n++) if (!parts[n]) warnings.push(`Part ${n}: part${n}.txt topilmadi`);
  const af = list(dir, false).find(f => /^(answers?|answer[\s_-]*key|key)\.txt$/i.test(f));
  let map = null;
  if (type === 'listening') {
    const md = child(dir, 'music', 'audio');
    for (const f of md ? list(path.join(dir, md), false) : []) {
      const m = f.match(/^part[\s_-]*(\d)\b.*$/i);
      if (m && AUDIO_RE.test(f) && !audio[+m[1]]) audio[+m[1]] = rel(dir, md, f);
    }
    for (let n = 1; n <= max; n++) if (!audio[n]) warnings.push(`Part ${n}: audio topilmadi (music/part${n}.mp3)`);
    const mp = child(dir, 'map', 'maps');
    const imgs = mp ? list(path.join(dir, mp), false).filter(f => IMAGE_RE.test(f)) : [];
    if (imgs.length) map = rel(dir, mp, imgs.find(f => /part[\s_-]*4/i.test(f)) || imgs[0]); else warnings.push('Part 4: xarita rasmi topilmadi (map/ papkasiga screenshot tashlang)');
  }
  return { type, parts, audio, map, answers: af ? readTxt(path.join(dir, af)) : null, warnings };
}

// data/ ichidagi hamma testlar
// Admin panel yozadigan papka: reading/<nom>, listening/<nom>, full mock/<nom>/(reading|listening). Mavjud papka nomlari (katta-kichik harf) saqlanadi
export function sectionDir(kind, name, type) {
  const n = safeName(name); if (!n) throw new Error('Nom kiriting');
  const segs = kind === 'full' ? [['full mock', true, ['full mock', 'fullmock', 'full_mock']], [n, false], [type, true, [type]]] : [[kind, true, [kind]], [n, false]];
  let cur = DATA_DIR;
  for (const [seg, fuzzy, alias] of segs) cur = path.join(cur, (fs.existsSync(cur) && (fuzzy ? child(cur, ...alias) : list(cur, true).find(d => d === seg))) || seg);
  if (!cur.startsWith(DATA_DIR + path.sep)) throw new Error("Noto'g'ri nom");
  return cur;
}
export const relPath = (p) => path.relative(DATA_DIR, p).split(path.sep).join('/');
export { scanSection, mediaUrl as toMediaUrl };

export function scanData() {
  const out = [], warnings = [];
  if (!fs.existsSync(DATA_DIR)) return { tests: out, warnings: [`data papkasi topilmadi: ${DATA_DIR}`] };
  for (const type of ['reading', 'listening']) {
    const base = child(DATA_DIR, type);
    for (const name of base ? list(path.join(DATA_DIR, base), true) : [])
      out.push({ ...scanSection(path.join(DATA_DIR, base, name), type), source: rel(DATA_DIR, base, name), title: `${pretty(name)} — ${type === 'reading' ? 'Reading' : 'Listening'}`, group: null });
  }
  const fm = child(DATA_DIR, 'full mock', 'fullmock', 'full_mock', 'full mocks');
  for (const name of fm ? list(path.join(DATA_DIR, fm), true) : []) {
    const dir = path.join(DATA_DIR, fm, name);
    for (const type of ['reading', 'listening']) {
      const sub = child(dir, type);
      if (!sub) { warnings.push(`${name}: ${type} papkasi topilmadi`); continue; }
      out.push({ ...scanSection(path.join(dir, sub), type), source: rel(dir, sub), title: `${pretty(name)} — ${type === 'reading' ? 'Reading' : 'Listening'}`, group: pretty(name) });
    }
  }
  return { tests: out, warnings };
}

const tfng = (a) => { const s = a.trim().toLowerCase(); return /^(a|t|true)$/.test(s) ? 'TRUE' : /^(b|f|false)$/.test(s) ? 'FALSE' : /^(c|ng|ni|not given|no information)$/.test(s) ? 'NOT GIVEN' : a.trim().toUpperCase(); };
// Javoblar kaliti -> savollarga (bo'lim ichidagi tartib raqami bo'yicha: 1..35)
export function applyKey(db, testId, keyText) {
  const key = parseKey(keyText);
  const qs = db.prepare('SELECT q.id, q.data, p.kind FROM questions q JOIN parts p ON p.id=q.part_id WHERE p.test_id=? ORDER BY p.part_no, q.order_no').all(testId);
  let applied = 0;
  qs.forEach((q, i) => {
    const a = key[i + 1]; if (!a) return;
    const d = J(q.data) || {};
    const val = q.kind === 'mc_tfng' && !d.options?.length ? tfng(a) : (d.options?.length || /^[A-J]$/i.test(a.trim())) ? a.trim().toUpperCase()[0] : variants(a);
    db.prepare('UPDATE questions SET answer=? WHERE id=?').run(JSON.stringify(val), q.id); applied++;
  });
  return { applied, total: qs.length };
}
const emptyAnswers = (db, testId) => db.prepare(`SELECT COUNT(*) n FROM questions q JOIN parts p ON p.id=q.part_id WHERE p.test_id=? AND (q.answer='""' OR q.answer='[]' OR q.answer IS NULL)`).get(testId).n;

// Bitta Part savollarini yangilaydi (savol ID lari iloji boricha saqlanadi — eski natijalar buzilmasin)
function writePart(db, part, parsed) {
  db.prepare('UPDATE parts SET content=?, instructions=? WHERE id=?').run(JSON.stringify(parsed.content), parsed.instructions || part.instructions || '', part.id);
  const old = db.prepare('SELECT id FROM questions WHERE part_id=? ORDER BY order_no').all(part.id);
  parsed.questions.forEach((q, i) => {
    if (old[i]) db.prepare('UPDATE questions SET order_no=?, data=?, answer=? WHERE id=?').run(i + 1, JSON.stringify(q.data), JSON.stringify(q.answer), old[i].id);
    else db.prepare('INSERT INTO questions (part_id,order_no,data,answer,explanation) VALUES (?,?,?,?,?)').run(part.id, i + 1, JSON.stringify(q.data), JSON.stringify(q.answer), '');
  });
  old.slice(parsed.questions.length).forEach(o => db.prepare('DELETE FROM questions WHERE id=?').run(o.id));
}

export function syncData(db) {
  const { tests, warnings } = scanData(), report = [];
  for (const t of tests) {
    const info = { id: null, source: t.source, title: t.title, type: t.type, status: '', action: 'o\'zgarmagan', parts: [], warnings: [...t.warnings] };
    db.transaction(() => {
      let row = db.prepare('SELECT * FROM tests WHERE source=?').get(t.source), isNew = false;
      if (!row) {
        const id = db.prepare('INSERT INTO tests (title,level,type,duration,difficulty,description,status) VALUES (?,?,?,?,?,?,?)')
          .run(t.title, null, t.type, 60, 'medium', '', 'draft').lastInsertRowid;
        KINDS[t.type].forEach((k, i) => db.prepare('INSERT INTO parts (test_id,part_no,kind) VALUES (?,?,?)').run(id, i + 1, k));
        db.prepare('UPDATE tests SET source=?, mock_group=? WHERE id=?').run(t.source, t.group, id);
        row = db.prepare('SELECT * FROM tests WHERE id=?').get(id); isNew = true; info.action = 'yaratildi';
      } else if (row.title !== t.title || row.mock_group !== t.group) {
        db.prepare('UPDATE tests SET title=?, mock_group=? WHERE id=?').run(t.title, t.group, row.id);
      }
      info.id = row.id;
      let changed = isNew;
      for (let n = 1; n <= KINDS[t.type].length; n++) {
        const part = db.prepare('SELECT * FROM parts WHERE test_id=? AND part_no=?').get(row.id, n);
        if (!part) continue;
        const media = n === 4 && t.type === 'listening' ? t.map : null, audioRel = t.audio[n] || null;
        const hash = sha([PARSER_V, t.parts[n] ?? '', audioRel, media].join('|'));
        if (t.parts[n] !== undefined && part.src_hash !== hash) {
          writePart(db, part, parsePart(part.kind, t.parts[n])); changed = true; if (!isNew) info.action = 'yangilandi';
        }
        if (part.src_hash !== hash) {
          db.prepare('UPDATE parts SET audio_url=?, image_url=?, src_hash=? WHERE id=?').run(audioRel ? mediaUrl(audioRel) : part.audio_url, media ? mediaUrl(media) : part.image_url, hash, part.id);
        }
        const count = db.prepare('SELECT COUNT(*) n FROM questions WHERE part_id=?').get(part.id).n;
        info.parts.push({ no: n, count, audio: !!(audioRel || part.audio_url) });
        if (t.parts[n] !== undefined && !count) info.warnings.push(`Part ${n}: savol topilmadi — part${n}.txt formatini tekshiring`);
      }
      const ah = t.answers == null ? null : sha(PARSER_V + t.answers);
      if (t.answers != null && (changed || row.src_hash !== ah)) {
        const r = applyKey(db, row.id, t.answers); info.key = r; if (!isNew && info.action === "o'zgarmagan") info.action = 'javoblar yangilandi';
        db.prepare('UPDATE tests SET src_hash=? WHERE id=?').run(ah, row.id);
      } else if (t.answers == null) info.warnings.push('answers.txt topilmadi — javoblar kaliti yo\'q (test draft holatida qoladi)');
      const missing = emptyAnswers(db, row.id), total = db.prepare('SELECT COUNT(*) n FROM questions q JOIN parts p ON p.id=q.part_id WHERE p.test_id=?').get(row.id).n;
      if (total && missing) info.warnings.push(`${missing} ta savolga javob qo'yilmagan`);
      const full = total && !missing && info.parts.length === KINDS[t.type].length && info.parts.every(p => p.count > 0);      // hamma Part'da savol va javob bor
      // yangi test: javoblari to'liq bo'lsa darrov e'lon qilinadi; aks holda draft va javob to'lgach avtomatik e'lon qilinadi
      if (isNew) db.prepare('UPDATE tests SET status=?, auto_draft=? WHERE id=?').run(full ? 'published' : 'draft', full ? 0 : 1, row.id);
      else if (row.auto_draft && full) db.prepare("UPDATE tests SET status='published', auto_draft=0 WHERE id=?").run(row.id);
      info.status = db.prepare('SELECT status FROM tests WHERE id=?').get(row.id).status;
    })();
    report.push(info);
  }
  const known = new Set(tests.map(t => t.source));
  for (const r of db.prepare('SELECT title, source FROM tests WHERE source IS NOT NULL').all()) if (!known.has(r.source)) warnings.push(`"${r.title}": papka topilmadi (${r.source}) — test bazada qoldi`);
  return { at: new Date().toISOString(), dir: DATA_DIR, tests: report, warnings };
}
