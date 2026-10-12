import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X, Search } from 'lucide-react';
import { adm, api, fmtDate } from '../utils/api.js';
import Ranking from '../components/Ranking.jsx';

const Score = ({ s }) => s
  ? <span className={`font-semibold ${s.score / (s.total || 1) >= 0.6 ? 'text-green-600' : 'text-slate-700 dark:text-slate-200'}`}>{s.score}/{s.total}{s.part && <span className="ml-1 rounded bg-slate-200 px-1 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">P{s.part}</span>}</span>
  : <span className="text-slate-400">—</span>;

// Bitta mock: har bir savol to'g'ri/noto'g'ri
export function ResultDetail({ rkey, onClose }) {
  const [d, setD] = useState(null), [wrong, setWrong] = useState(false);
  useEffect(() => { adm.get(`/results/${encodeURIComponent(rkey)}`).then(r => setD(r.data)); }, [rkey]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card my-6 w-full max-w-3xl bg-white p-6 dark:bg-slate-900" onClick={e => e.stopPropagation()}>
        {!d ? <div className="h-40 animate-pulse" /> : <>
          <div className="mb-4 flex items-start justify-between">
            <div><h2 className="text-xl font-bold">{d.name}</h2><p className="text-sm text-slate-500">{fmtDate(d.created_at)}</p></div>
            <button className="btn-ghost p-2" onClick={onClose}><X className="size-4" /></button>
          </div>
          <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={wrong} onChange={e => setWrong(e.target.checked)} /> Faqat xatolarni ko'rsat</label>
          {d.sections.map(s => (
            <section key={s.id} className="mb-6">
              <h3 className="mb-2 flex items-center justify-between font-semibold">
                <span>{s.type === 'listening' ? 'Listening' : 'Reading'} <span className="text-sm font-normal text-slate-500">· {s.title}</span></span>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">{s.score}/{s.total} to'g'ri</span>
              </h3>
              <div className="mb-3 flex flex-wrap gap-1">
                {s.parts.flatMap(p => p.items).map(i => (
                  <span key={i.id} title={`${i.no}-savol: ${i.ok ? "to'g'ri" : "noto'g'ri"}`}
                    className={`flex size-7 items-center justify-center rounded-md text-xs font-bold text-white ${i.ok ? 'bg-green-500' : 'bg-rose-500'}`}>{i.no}</span>))}
              </div>
              {s.parts.map(p => (
                <div key={p.part} className="mb-2">
                  <div className="text-xs font-semibold uppercase text-slate-500">Part {p.part} — {p.score}/{p.total}</div>
                  {p.items.filter(i => !wrong || !i.ok).map(i => (
                    <div key={i.id} className="flex items-start gap-2 border-b border-slate-100 py-1.5 text-sm dark:border-slate-800">
                      {i.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-500" /> : <XCircle className="mt-0.5 size-4 shrink-0 text-rose-500" />}
                      <span className="w-7 shrink-0 font-semibold">{i.no}.</span>
                      <span className="flex-1">{i.text && <span className="text-slate-500">{i.text} — </span>}javob: <b>{i.given || '—'}</b>
                        {!i.ok && <> · to'g'ri: <b className="text-green-600">{[].concat(i.correct).join(' / ')}</b></>}</span>
                    </div>))}
                </div>))}
            </section>))}
        </>}
      </div>
    </div>
  );
}

// Natijalar jadvali: o'quvchi · mock · Listening x/35 · Reading x/35
export function ResultsTable({ limit = 50, search = false, userId = null, mock = '' }) {
  const [rows, setRows] = useState(null), [q, setQ] = useState(''), [open, setOpen] = useState(null);
  useEffect(() => {
    const t = setTimeout(() => adm.get(userId ? `/users/${userId}/attempts` : '/results', { params: { q, limit, mock } }).then(r => setRows(r.data)), 250);
    return () => clearTimeout(t);
  }, [q, limit, userId, mock]);
  return (
    <div>
      {search && <div className="relative mb-3 max-w-xs"><Search className="absolute left-2 top-2.5 size-4 text-slate-400" />
        <input className="field w-full pl-8" placeholder="Ism yoki familya..." value={q} onChange={e => setQ(e.target.value)} /></div>}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800"><tr>
            {['O\'quvchi', 'Mock', 'Listening', 'Reading', 'Jami', 'Sana'].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {rows?.map(r => (
              <tr key={r.key} onClick={() => setOpen(r.key)} className="cursor-pointer border-b border-slate-100 hover:bg-indigo-50 dark:border-slate-800 dark:hover:bg-slate-800">
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 text-xs text-slate-500">{[r.listening?.title, r.reading?.title].filter(Boolean).join(' + ')}</td>
                <td className="p-3"><Score s={r.listening} /></td><td className="p-3"><Score s={r.reading} /></td>
                <td className="p-3 font-bold">{r.score}/{r.total}</td><td className="p-3 text-slate-500">{fmtDate(r.created_at)}</td>
              </tr>))}
          </tbody>
        </table>
        {rows && !rows.length && <p className="p-6 text-center text-slate-500">Natijalar yo'q</p>}
        {!rows && <div className="h-24 animate-pulse" />}
      </div>
      {open && <ResultDetail rkey={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// Natijalar mock bo'yicha: tanlangan mockning reytingi + shu mock natijalari
export function ResultsPage() {
  const [mocks, setMocks] = useState([]), [mock, setMock] = useState('');
  useEffect(() => { api.get('/ranking').then(r => { setMocks(r.data.mocks); setMock(r.data.mock || ''); }); }, []);
  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-3 p-5">
        <h1 className="text-xl font-bold">Natijalar</h1>
        <select className="field" value={mock} onChange={e => setMock(e.target.value)}>
          <option value="">Barcha mocklar</option>{mocks.map(m => <option key={m} value={m}>{m}</option>)}</select>
      </div>
      {mock && <div className="card p-5"><h2 className="mb-3 text-lg font-bold">Reyting — {mock}</h2><Ranking mock={mock} /></div>}
      <div className="card p-5"><h2 className="mb-3 text-lg font-bold">Barcha natijalar{mock ? ` — ${mock}` : ''}</h2><ResultsTable limit={500} search mock={mock} /></div>
    </div>
  );
}
