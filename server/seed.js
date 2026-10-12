import bcrypt from 'bcryptjs';
import fs from 'fs';
import db from './db.js';

db.prepare('INSERT OR REPLACE INTO admins (id,username,password) VALUES (1,?,?)').run('admin', bcrypt.hashSync('admin123', 10));
console.log('Admin: admin / admin123');
if (db.prepare('SELECT COUNT(*) n FROM tests').get().n) { console.log('Testlar mavjud — seed o‘tkazib yuborildi'); process.exit(0); }

const insT = db.prepare('INSERT INTO tests (title,type,duration,description,status) VALUES (?,?,?,?,?)');
const insP = db.prepare('INSERT INTO parts (test_id,part_no,kind,instructions,audio_url,image_url,content) VALUES (?,?,?,?,?,?,?)');
const insQ = db.prepare('INSERT INTO questions (part_id,order_no,data,answer,explanation) VALUES (?,?,?,?,?)');
db.transaction(() => {
  for (const f of fs.readdirSync('seed-data').filter(f => f.endsWith('.json')))
    for (const t of JSON.parse(fs.readFileSync(`seed-data/${f}`, 'utf8'))) {
      const id = insT.run(t.title, t.type, t.duration, '', 'published').lastInsertRowid;
      t.parts.forEach((p, i) => {
        const pid = insP.run(id, i + 1, p.kind, p.instructions, p.audio_url, p.image_url, JSON.stringify(p.content)).lastInsertRowid;
        p.questions.forEach((q, k) => insQ.run(pid, k + 1, JSON.stringify(q.data), JSON.stringify(q.answer), q.explanation || ''));
      });
      console.log('Qo‘shildi:', t.title);
    }
})();
