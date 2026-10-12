import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Headphones, Layers, Clock, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, getUser, fmtDate, CEFR } from '../utils/api.js';
import Bubble from '../components/Bubble.jsx';
import LevelBadge from '../components/LevelBadge.jsx';

const MODES = [['reading', BookOpen, 'Only Reading', '5 part, 60 daqiqa'], ['listening', Headphones, 'Only Listening', '6 part, 60 daqiqa'], ['mock', Layers, 'Full Mock', '2 bo\'lim, 2 soat']];
const ICON = { reading: BookOpen, listening: Headphones };
const part$ = (a) => (a.part_filter ? `Part ${a.part_filter}` : null);

// O'quvchining shaxsiy progressi: urinishlar, eng yuqori daraja va so'nggi natijalar
export function ProgressPanel({ rows }) {
  const full = (rows || []).filter(a => !a.part_filter);
  const best = full.map(a => a.cefr).filter(Boolean).sort((a, b) => CEFR.findIndex(l => l.id === b) - CEFR.findIndex(l => l.id === a))[0];
  const avg = full.length ? Math.round(full.reduce((s, a) => s + a.percent, 0) / full.length) : null;
  return (
    <aside className="glass prog" aria-label="Sizning progressingiz" aria-busy={!rows}>
      <h2 className="h2">Sizning progressingiz</h2>
      {!rows ? <div style={{ display: 'grid', gap: 12 }}><div className="skel" style={{ height: 64 }} /><div className="skel" style={{ height: 52 }} /><div className="skel" style={{ height: 52 }} /></div> : <>
        <div className="kpis">
          <div className="kpi"><b>{rows.length}</b><span>Urinish</span></div>
          <div className="kpi"><b>{best ? <LevelBadge level={best} /> : '–'}</b><span>Eng yuqori</span></div>
          <div className="kpi"><b>{avg === null ? '–' : `${avg}%`}</b><span>O'rtacha</span></div>
        </div>
        {rows.length === 0 && <p className="empty" style={{ padding: 18 }}>Hali test topshirmagansiz. Birinchi natijangiz shu yerda chiqadi.</p>}
        {rows.slice(0, 5).map(a => (
          <div key={a.id} className="att">
            {a.cefr ? <LevelBadge level={a.cefr} /> : <span className="lvl" title="Bitta Part mashqi">{part$(a) || '–'}</span>}
            <div style={{ minWidth: 0 }}><div className="att-t">{a.title}</div><div className="att-d">{fmtDate(a.created_at)}</div><div className="meter"><i style={{ width: `${a.percent}%` }} /></div></div>
            <div className="att-p">{Math.round(a.percent)}%</div>
          </div>))}
      </>}
    </aside>
  );
}

export function TestCard({ t, part }) {
  const Icon = ICON[t.type] || BookOpen;
  return (
    <motion.article className="card tc" whileHover={{ y: -3 }} transition={{ duration: .2 }}>
      <div className="tc-top">
        <span className="ticon" style={{ width: 48, height: 48, borderRadius: 16, flex: 'none' }}><Icon className="size-5" /></span>
        <div>
          <h3 className="tc-n">{t.title}</h3>
          <div className="tc-m">
            <span><ListChecks className="size-4" />{t.questions} savol</span>
            <span><Clock className="size-4" />{t.duration} daqiqa</span>
            {part !== 'all' && part !== null && <span>Faqat Part {part}</span>}
          </div>
        </div>
      </div>
      <Link to={`/test/${t.id}`} state={{ part: part === 'all' ? null : part }} className="btn">Boshlash</Link>
    </motion.article>
  );
}

export default function Tests() {
  const nav = useNavigate(), [sp, setSp] = useSearchParams(), type = sp.get('type') || 'reading', user = getUser();
  const [tests, setTests] = useState(null), [part, setPart] = useState(null), [hist, setHist] = useState(null);      // part: null = hali tanlanmagan, 'all' = Full parts
  useEffect(() => { setPart(null); }, [type]);
  const nParts = type === 'listening' ? 6 : 5;
  useEffect(() => { if (type === 'mock') return; setTests(null); api.get('/tests', { params: { type } }).then(r => setTests(r.data)); }, [type]);
  useEffect(() => { if (user) api.get(`/users/${user.id}/attempts`).then(r => setHist(r.data)).catch(() => setHist([])); }, []);
  const startMock = async () => {   // imtihon tartibi: avval Listening, keyin Reading
    try { const { data } = await api.get('/mock/random'); nav(`/test/${data.listening}`, { state: { queue: [data.reading], results: [], session: data.session } }); }
    catch { toast.error('Full Mock uchun Reading va Listening testlar kerak'); }
  };
  return (
    <main className="page">
      <h1 className="h1">Testlar</h1>
      <p className="lede">Bo'limni tanlang, keyin test yoki Part. Natijangiz o'ng tomondagi progressga qo'shiladi.</p>
      <div className="dash" style={{ marginTop: 8 }}>
        <div>
          <div className="modes" role="group" aria-label="Bo'lim">
            {MODES.map(([k, Icon, l, sub]) => (
              <button key={k} type="button" className="mode" aria-pressed={type === k} onClick={() => setSp({ type: k })}>
                <span className="ticon" style={{ width: 44, height: 44, borderRadius: 14 }}><Icon className="size-5" /></span>
                <b>{l}</b><span>{sub}</span>
              </button>))}
          </div>
          {type === 'mock' ? (
            <section className="glass sheet-pad" style={{ maxWidth: 600 }}>
              <h2 className="q-title">Full Mock</h2>
              <p className="lede">Bitta sessiyada ikkala bo'lim topshiriladi. Testlar tasodifiy tanlanadi.</p>
              <ol className="steps">
                <li className="step"><Bubble size="lg">1</Bubble><div><b>Listening</b><br /><span>60 daqiqa, avval shu boshlanadi</span></div></li>
                <li className="step"><Bubble size="lg">2</Bubble><div><b>Reading</b><br /><span>60 daqiqa, Listening tugagach o'zi boshlanadi</span></div></li>
              </ol>
              <button type="button" className="btn" onClick={startMock}>Boshlash</button>
            </section>
          ) : (<>
            <div className="pick" role="group" aria-label="Part tanlash">
              <span className="pick-l">Part tanlang</span>
              {[['all', 'Hammasi'], ...Array.from({ length: nParts }, (_, i) => [i + 1, String(i + 1)])].map(([k, l]) =>
                <button key={k} type="button" onClick={() => setPart(k)} aria-pressed={part === k} aria-label={k === 'all' ? 'Barcha partlar' : `Part ${k}`} className="pbtn">{l}</button>)}
            </div>
            {part === null ? <p className="empty">Part tanlang, shunda testlar ro'yxati chiqadi.</p> :
              <div className="tgrid">
                {tests === null && [1, 2].map(i => <div key={i} className="skel" style={{ height: 150 }} />)}
                {tests?.length === 0 && <p className="empty" style={{ gridColumn: '1 / -1' }}>Bu bo'limda hozircha test yo'q. Ustozingizdan test qo'shishni so'rang.</p>}
                {tests?.map(t => <TestCard key={t.id} t={t} part={part} />)}
              </div>}
          </>)}
        </div>
        <ProgressPanel rows={hist} />
      </div>
    </main>
  );
}
