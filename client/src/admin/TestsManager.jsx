import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Trash2, Pencil, Search, RefreshCw, X, Music, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { adm } from '../utils/api.js';
import AddTest from './AddTest.jsx';

export default function TestsManager() {
  const [rows, setRows] = useState(null), [f, setF] = useState({ q: '', level: '', type: '', status: '' }), [sync, setSync] = useState(null), [busy, setBusy] = useState(false), [add, setAdd] = useState(false);
  const load = () => adm.get('/tests', { params: Object.fromEntries(Object.entries(f).filter(([, v]) => v)) }).then(r => setRows(r.data));
  useEffect(() => { load(); }, [f]);
  const runSync = async () => {      // data/ papkani qayta o'qish
    setBusy(true);
    try { const { data } = await adm.post('/sync'); setSync(data); load(); } catch { toast.error("data papkani o'qib bo'lmadi"); }
    setBusy(false);
  };
  const act = async (fn, msg) => { await fn(); toast.success(msg); load(); };
  const Sel = ({ k, opts, ph }) => (
    <select className="field" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })}><option value="">{ph}</option>{opts.map(o => <option key={o}>{o}</option>)}</select>);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative"><Search className="absolute left-2 top-2.5 size-4 text-slate-400" /><input className="field pl-8" placeholder="Qidirish..." value={f.q} onChange={e => setF({ ...f, q: e.target.value })} /></div>
        <Sel k="type" ph="Tur" opts={['reading', 'listening']} /><Sel k="status" ph="Holat" opts={['draft', 'published']} />
        <button className="btn-ghost ml-auto" onClick={runSync} disabled={busy}><RefreshCw className={`size-4 ${busy ? 'animate-spin' : ''}`} />data papkani yangilash</button>
        <button className="btn" onClick={() => setAdd(true)}><Plus className="size-4" />Test qo'shish</button>
      </div>
      <p className="text-sm text-slate-500">Testlar loyihadagi <b>data/</b> papkadan olinadi: <code>data/reading/&lt;test&gt;/part1.txt…</code>, <code>data/listening/&lt;test&gt;/part1.txt… + music/ + map/</code>, <code>data/full mock/&lt;nom&gt;/reading|listening</code>. Fayllar o'zgarsa, o'zi yangilanadi.</p>
      {add && <AddTest onClose={() => setAdd(false)} onSaved={load} />}
      {sync && <SyncDialog r={sync} onClose={() => setSync(null)} />}
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800"><tr>{['Nomi', 'Tur', 'Vaqt', 'Urinish', 'Holat', ''].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>
            {rows?.map(t => (
              <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="p-3 font-medium"><Link to={`/admin/tests/${t.id}`} className="hover:text-indigo-600">{t.title}</Link>{t.source && <div className="text-xs font-normal text-slate-400">data/{t.source}</div>}</td>
                <td className="p-3 capitalize">{t.type}</td><td className="p-3">{t.duration}'</td><td className="p-3">{t.attempts}</td>
                <td className="p-3"><button onClick={() => act(() => adm.put(`/tests/${t.id}`, { status: t.status === 'published' ? 'draft' : 'published' }), 'Holat yangilandi')}
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{t.status}</button></td>
                <td className="flex gap-1 p-3">
                  <Link to={`/admin/tests/${t.id}`} className="btn-ghost p-2"><Pencil className="size-4" /></Link>
                  <button className="btn-ghost p-2" onClick={() => act(() => adm.post(`/tests/${t.id}/duplicate`), 'Nusxalandi')}><Copy className="size-4" /></button>
                  <button className="btn-ghost p-2 text-rose-600" onClick={() => confirm("O'chirilsinmi?") && act(() => adm.delete(`/tests/${t.id}`), "O'chirildi")}><Trash2 className="size-4" /></button>
                </td>
              </tr>))}
          </tbody>
        </table>
        {rows && !rows.length && <p className="p-6 text-center text-slate-500">Testlar topilmadi</p>}
      </div>
    </div>
  );
}

function SyncDialog({ r, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="card my-6 w-full max-w-2xl space-y-3 bg-white p-6 dark:bg-slate-900" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">data papka: {r.tests.length} ta test topildi</h2>
          <button className="btn-ghost p-2" onClick={onClose}><X className="size-4" /></button></div>
        <p className="break-all text-xs text-slate-500">{r.dir}</p>
        {r.warnings.map(w => <p key={w} className="text-sm text-amber-600">⚠ {w}</p>)}
        {r.tests.map(t => (
          <div key={t.source} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
            <div className="flex items-center justify-between gap-2"><b>{t.title}</b>
              <span className="text-xs"><span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{t.action}</span>
                <span className={`rounded-full px-2 py-0.5 font-semibold ${t.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{t.status}</span></span></div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-slate-500">{t.parts.map(p => <span key={p.no}>Part {p.no}: {p.count}{p.audio && <Music className="ml-0.5 inline size-3" />}</span>)}</div>
            {t.warnings.map(w => <p key={w} className="mt-1 text-xs text-amber-600">⚠ {w}</p>)}
          </div>))}
        {!r.tests.length && <p className="text-slate-500">Hozircha test yo'q. data/reading/test/part1.txt kabi fayl yarating.</p>}
        <button className="btn-ghost w-full" onClick={onClose}>Yopish</button>
      </div>
    </div>
  );
}
