import { useEffect, useState } from 'react';
import { Ban, Trash2, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { adm, fmtDate } from '../utils/api.js';
import { ResultsTable } from './Results.jsx';

export function UsersPage() {
  const [rows, setRows] = useState([]), [hist, setHist] = useState(null), [q, setQ] = useState('');
  const load = () => adm.get('/users').then(r => setRows(r.data)); useEffect(() => { load(); }, []);
  const shown = rows.filter(u => u.name?.toLowerCase().includes(q.trim().toLowerCase()));
  const first = (u) => u.first_name || (u.name || '').split(' ')[0], last = (u) => u.last_name || (u.name || '').split(' ').slice(1).join(' ');
  return (
    <div className="space-y-4">
      <div className="card overflow-x-auto p-1">
        <div className="p-3"><input className="field" placeholder="Ism yoki familya..." value={q} onChange={e => setQ(e.target.value)} /> <span className="ml-3 text-sm text-slate-500">{shown.length} ta o'quvchi</span></div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800"><tr>{['Ism', 'Familya', 'Testlar', 'Oxirgi kirish', 'Holat', ''].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead>
          <tbody>{shown.map(u => (
            <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800">
              <td className="p-3 font-medium">{first(u)}</td><td className="p-3 font-medium">{last(u)}</td><td className="p-3">{u.attempts}</td>
              <td className="p-3 text-slate-500">{u.last_at ? fmtDate(u.last_at) : '—'}</td>
              <td className="p-3">{u.blocked ? 'Bloklangan' : 'Faol'}</td>
              <td className="flex gap-1 p-3">
                <button className="btn-ghost p-2" title="Natijalar" onClick={() => setHist(u)}><History className="size-4" /></button>
                <button className="btn-ghost p-2" title="Bloklash" onClick={async () => { await adm.put(`/users/${u.id}/block`, { blocked: !u.blocked }); load(); }}><Ban className="size-4" /></button>
                <button className="btn-ghost p-2 text-rose-600" onClick={async () => { if (confirm("O'chirilsinmi?")) { await adm.delete(`/users/${u.id}`); setHist(null); load(); } }}><Trash2 className="size-4" /></button>
              </td></tr>))}</tbody>
        </table>
        {!shown.length && <p className="p-6 text-center text-slate-500">Hozircha o'quvchi yo'q</p>}
      </div>
      {hist && <div className="card p-5"><h3 className="mb-3 font-semibold">{hist.name} — natijalar</h3><ResultsTable userId={hist.id} limit={200} /></div>}
    </div>
  );
}

export function SettingsPage() {
  const [s, setS] = useState(null);
  useEffect(() => { adm.get('/dashboard'); fetch('/api/settings').then(r => r.json()).then(setS); }, []);
  if (!s) return null;
  const F = ({ k, label, type = 'text' }) => (
    <label className="block text-sm font-medium">{label}
      <input className="field mt-1 w-full" type={type} value={s[k] ?? ''} onChange={e => setS({ ...s, [k]: type === 'number' ? +e.target.value : e.target.value })} /></label>);
  return (
    <div className="card max-w-xl space-y-4 p-6">
      <F k="site_name" label="Sayt nomi" /><F k="logo" label="Logo URL" />
      <F k="listening_limit" label="Listening eshitish limiti" type="number" />
      <div className="grid grid-cols-2 gap-3"><F k="speed_min" label="Min tezlik" type="number" /><F k="speed_max" label="Max tezlik" type="number" /></div>
      <F k="admin_password" label="Yangi admin parol (ixtiyoriy)" type="password" />
      <button className="btn" onClick={async () => { await adm.put('/settings', s); toast.success('Saqlandi'); }}>Saqlash</button>
    </div>
  );
}
