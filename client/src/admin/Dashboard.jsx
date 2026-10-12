import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';
import { adm } from '../utils/api.js';
import { ResultsTable } from './Results.jsx';

export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { adm.get('/dashboard').then(r => setD(r.data)); }, []);
  if (!d) return <div className="card h-64 animate-pulse" />;
  const cards = [['Testlar', d.cards.tests], ["O'quvchilar", d.cards.users], ['Urinishlar', d.cards.attempts], ["O'rtacha natija", `${d.cards.avg}%`]];
  const max = Math.max(1, ...d.popular.map(t => t.attempts));
  return (
    <div className="space-y-6">
      <h1 className="h1">Dashboard</h1>
      <div className="card stats">
        {cards.map(([l, v]) => <div key={l} className="stat"><div className="stat-n">{v}</div><div className="stat-l">{l}</div></div>)}
      </div>
      <div className="card h-72 p-5">
        <h2 className="h2 mb-3" style={{ fontSize: 16 }}>Oxirgi 30 kundagi urinishlar</h2>
        <ResponsiveContainer><AreaChart data={d.daily}><CartesianGrid stroke="#8993B133" vertical={false} /><XAxis dataKey="day" fontSize={11} tickLine={false} /><YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} /><Tooltip />
          <Area type="monotone" dataKey="count" name="Urinish" stroke="#2142D6" strokeWidth={2.5} fill="#2142D6" fillOpacity={0.14} /></AreaChart></ResponsiveContainer>
      </div>
      <div className="card p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="h2" style={{ fontSize: 16 }}>Mock natijalari <span className="small-note" style={{ fontWeight: 400 }}>— qatorga bosing, har bir savol ko'rinadi</span></h2>
          <Link to="/admin/results" className="font-semibold underline underline-offset-4" style={{ color: 'var(--link)' }}>Hammasi</Link></div>
        <ResultsTable limit={10} />
      </div>
      <div className="card p-5" style={{ maxWidth: 560 }}>
        <h2 className="h2 mb-2" style={{ fontSize: 16 }}>Eng ko'p topshirilgan testlar</h2>
        {d.popular.map(t => (
          <div key={t.id} className="pop"><span>{t.title}</span><b>{t.attempts}</b>
            <span className="pop-bar" aria-hidden="true"><i style={{ width: `${(t.attempts / max) * 100}%` }} /></span></div>))}
      </div>
    </div>
  );
}
