import Database from 'better-sqlite3';
const db = new Database(process.env.DB_PATH || 'cefr.db');
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, name TEXT, email TEXT, blocked INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS tests (
  id INTEGER PRIMARY KEY, title TEXT NOT NULL,
  level TEXT,
  type TEXT CHECK(type IN ('reading','listening')),
  duration INTEGER DEFAULT 60, difficulty TEXT DEFAULT 'medium', description TEXT,
  status TEXT DEFAULT 'draft', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
-- Part: reading 1-5, listening 1-6. content = JSON (matiin, sarlavhalar, e'lonlar, variantlar bankasi)
CREATE TABLE IF NOT EXISTS parts (
  id INTEGER PRIMARY KEY, test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
  part_no INTEGER, kind TEXT, instructions TEXT,
  audio_url TEXT, image_url TEXT, content TEXT DEFAULT '{}');
-- data = JSON (savol matni, variantlar, hotspotlar); answer = JSON (to'g'ri javob yoki qabul qilinadigan javoblar ro'yxati)
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY, part_id INTEGER REFERENCES parts(id) ON DELETE CASCADE,
  order_no INTEGER DEFAULT 0, data TEXT DEFAULT '{}', answer TEXT NOT NULL, explanation TEXT);
CREATE TABLE IF NOT EXISTS attempts (
  id INTEGER PRIMARY KEY, test_id INTEGER REFERENCES tests(id) ON DELETE CASCADE,
  user_id INTEGER, user_name TEXT, score INTEGER, total INTEGER, percent REAL, cefr TEXT,
  breakdown TEXT, answers TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
`);

// Eski bazalarni buzmasdan yangilash (ustun yo'q bo'lsa qo'shiladi)
const addCol = (t, c, def) => { if (!db.prepare(`PRAGMA table_info(${t})`).all().some(x => x.name === c)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`); };
addCol('users', 'first_name', 'TEXT'); addCol('users', 'last_name', 'TEXT');
addCol('attempts', 'session_id', 'TEXT');
addCol('attempts', 'part_filter', 'TEXT');       // faqat bitta Part topshirilgan bo'lsa (masalan '3')
addCol('tests', 'source', 'TEXT');             // data/ papkadagi manzil (fayldan olingan testlar)
addCol('tests', 'mock_group', 'TEXT');         // full mock nomi (Reading + Listening juftligi)
addCol('tests', 'auto_draft', 'INTEGER DEFAULT 0');
addCol('tests', 'src_hash', 'TEXT');
addCol('parts', 'src_hash', 'TEXT');
db.exec('CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id)');

const def = { site_name: 'CEFR Multilevel', logo: '', listening_limit: 2, speed_min: 0.5, speed_max: 2 };
for (const [k, v] of Object.entries(def))
  db.prepare('INSERT OR IGNORE INTO settings VALUES (?,?)').run(k, JSON.stringify(v));

export default db;
