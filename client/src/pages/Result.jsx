import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ChevronDown, Award, Printer, TrendingUp, TrendingDown } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, getUser, CEFR, levelOf, nextLevel, fmtDate } from '../utils/api.js';
import LevelBadge from '../components/LevelBadge.jsx';
import Ring from '../components/Ring.jsx';
import PenScore from '../components/PenScore.jsx';
import Modal from '../components/Modal.jsx';
import Certificate from '../components/Certificate.jsx';

const HEX = { A1: '#64748B', A2: '#0EA5E9', B1: '#10B9A5', B2: '#3B63F5', C1: '#8B5CF6', C2: '#F59E0B' };
const Tick = ({ ok }) => <svg viewBox="0 0 24 24" className={`mark-i ${ok ? 'ok' : ''}`} aria-hidden="true">{ok ? <path d="M3.5 13 9.5 19.5 21 4.5" /> : <path d="M5 5 19 19M19 5 5 19" />}</svg>;
const secName = (r) => `${r.test.type === 'listening' ? 'Listening' : 'Reading'}${r.part ? `, Part ${r.part}` : ''}`;
const pc = (s, t) => (t ? Math.round((s / t) * 100) : 0);

function View({ r }) {
  const [open, setOpen] = useState(null); let n = 0;
  return (
    <section className="stack">
      <h2 className="h2" style={{ marginTop: 12 }}>{secName(r)}: javoblar tahlili</h2>
      {r.breakdown.map(p => (
        <div key={p.part} className="card">
          <div className="rpart-h"><h3>Part {p.part}</h3><span className="rpart-sc">{p.score}/{p.total}</span></div>
          <div className="marks" aria-hidden="true">{p.items.map(i => <Tick key={i.id} ok={i.ok} />)}</div>
          {p.items.map(i => {
            n++;
            const has = !!i.explanation, num = n;
            const row = (<>
              <Tick ok={i.ok} />
              <span className="ritem-n">{num}</span>
              <span>
                <span className="sr-only">{i.ok ? "To'g'ri: " : "Noto'g'ri: "}</span>
                {i.ok ? <b>{i.given}</b> : <>
                  {i.given ? <s>{i.given}</s> : <em className="none">javob yo'q</em>}
                  <span className="ritem-fix">{[].concat(i.correct)[0]}</span>
                </>}
              </span>
              {has ? <ChevronDown className="size-4" /> : <span />}
            </>);
            return (
              <div key={i.id}>
                {has ? <button type="button" className="ritem" aria-expanded={open === i.id} onClick={() => setOpen(open === i.id ? null : i.id)}>{row}</button> : <div className="ritem">{row}</div>}
                {open === i.id && has && <p className="why">{i.explanation}</p>}
              </div>);
          })}
        </div>))}
    </section>
  );
}

export default function Result() {
  const list = useLocation().state?.results, user = getUser();
  const [hist, setHist] = useState(null), [cert, setCert] = useState(false);
  useEffect(() => { if (user && list?.length) api.get(`/users/${user.id}/attempts`).then(r => setHist(r.data)).catch(() => setHist([])); }, []);
  if (!list?.length) return <Navigate to="/" />;

  const sc = list.reduce((s, r) => s + r.score, 0), tt = list.reduce((s, r) => s + r.total, 0), exact = tt ? (sc / tt) * 100 : 0, pct = Math.round(exact);
  const full = list.every(r => !r.part);                 // bitta Part mashqi uchun daraja berilmaydi (serverdagi qoida bilan bir xil)
  const level = full ? levelOf(exact) : null, next = full ? nextLevel(exact) : null;
  const band = level ? Math.min(100, Math.max(0, ((exact - level.min) / (level.max - level.min)) * 100)) : 0;
  const parts = list.flatMap(r => r.breakdown.map(p => ({ name: `${r.test.type === 'listening' ? 'L' : 'R'}${p.part}`, label: `${secName({ ...r, part: null })}, Part ${p.part}`, score: p.score, total: p.total, pct: pc(p.score, p.total) })));
  const sorted = [...parts].sort((a, b) => b.pct - a.pct), best = sorted[0], worst = sorted[sorted.length - 1];
  const trend = (hist || []).filter(a => !a.part_filter).slice().reverse().map((a, i) => ({ n: i + 1, pct: Math.round(a.percent), date: fmtDate(a.created_at), title: a.title }));
  const sections = list.map(r => ({ label: secName(r), score: r.score, total: r.total }));

  return (
    <main className="page" style={{ display: 'grid', gap: 24 }}>
      <section className="sheet report">
        <Ring value={exact} size={220}>
          <PenScore sc={sc} tt={tt} /><span>{pct}% to'g'ri</span>
        </Ring>
        <div>
          <h1>{user?.name}</h1>
          <p className="report-sub">{list.length > 1 ? 'Full Mock, umumiy natija' : 'Natija'}</p>
          {level ? (
            <div className="lvl-row">
              <LevelBadge level={level.id} xl />
              <p className="lvl-note"><b>{level.name}</b><br />Natijangiz {level.id === 'C2' ? `${level.min}% va undan yuqori` : `${level.min}–${level.max}%`} oralig'iga to'g'ri keladi.</p>
            </div>) : <p className="lvl-note" style={{ marginTop: 14 }}>Bitta Part mashqi uchun CEFR darajasi berilmaydi. Daraja to'liq bo'lim yoki Full Mock natijasida chiqadi.</p>}
          {next && (
            <div className="nextbar">
              <div className="nextbar-h"><span>{next.id} darajasigacha</span><span>yana {next.need}%</span></div>
              <div className="meter" role="progressbar" aria-label={`${next.id} darajasi sari progress`} aria-valuenow={Math.round(band)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${band}%` }} /></div>
            </div>)}
          {level && <button type="button" className="btn-ghost" style={{ marginTop: 18 }} onClick={() => setCert(true)}><Award className="size-4" />Sertifikatni ko'rish</button>}
        </div>
      </section>

      <div className="grid2">
        <section className="glass panel">
          <h2 className="h2">Bo'limlar bo'yicha</h2>
          {list.map(r => { const p = pc(r.score, r.total); return (
            <div key={r.id} className="sec">
              <span className="sec-n">{secName(r)}{!r.part && <LevelBadge level={levelOf(p).id} />}</span><b>{r.score}/{r.total}</b>
              <div className="meter"><i style={{ width: `${p}%` }} /></div>
            </div>); })}
          {parts.length > 1 && <>
            <div className="insight is-good"><TrendingUp className="size-5 shrink-0" style={{ color: 'var(--ok)' }} /><span>Eng kuchli: <b>{best.label}</b>, {best.pct}% ({best.score}/{best.total})</span></div>
            {worst.pct < 100 && <div className="insight is-weak"><TrendingDown className="size-5 shrink-0" style={{ color: 'var(--bad)' }} /><span>Eng zaif: <b>{worst.label}</b>, {worst.pct}% ({worst.score}/{worst.total}). Shu Partni alohida mashq qiling.</span></div>}
          </>}
        </section>
        <section className="glass panel" style={{ color: 'var(--fg-2)' }}>
          <h2 className="h2" style={{ color: 'var(--fg)' }}>Part bo'yicha natija, %</h2>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={parts} margin={{ top: 18, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(120,130,190,.25)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'currentColor', fontSize: 12 }} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tick={{ fill: 'currentColor', fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'rgba(120,130,190,.12)' }} formatter={(v, _, it) => [`${v}% (${it.payload.score}/${it.payload.total})`, it.payload.label]} labelFormatter={() => ''} />
                <Bar dataKey="pct" radius={[8, 8, 0, 0]} maxBarSize={38} isAnimationActive={false}>
                  {parts.map(p => <Cell key={p.name} fill={HEX[levelOf(p.pct).id]} />)}
                  <LabelList dataKey="pct" position="top" formatter={v => `${v}`} style={{ fill: 'currentColor', fontSize: 11, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="small-note" style={{ marginTop: 6 }}>Ustun rangi shu foizga mos CEFR darajasini bildiradi. L = Listening, R = Reading.</p>
          <table className="sr-only"><caption>Part bo'yicha natijalar</caption><tbody>{parts.map(p => <tr key={p.name}><th>{p.label}</th><td>{p.pct}%</td></tr>)}</tbody></table>
        </section>
      </div>

      <section className="glass panel" style={{ color: 'var(--fg-2)' }}>
        <h2 className="h2" style={{ color: 'var(--fg)' }}>Progress dinamikasi</h2>
        {hist === null ? <div className="skel" style={{ height: 220 }} /> :
          trend.length < 2 ? <p className="empty" style={{ padding: 20 }}>Progress grafigi to'liq bo'lim yoki mockni ikkinchi marta topshirgandan keyin chiqadi.</p> :
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 10, right: 28, left: -22, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(120,130,190,.2)" />
                <XAxis dataKey="n" tickLine={false} axisLine={false} tick={{ fill: 'currentColor', fontSize: 12 }} label={{ value: 'Urinish', position: 'insideBottomRight', offset: -2, fill: 'currentColor', fontSize: 11 }} />
                <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tick={{ fill: 'currentColor', fontSize: 12 }} />
                {CEFR.slice(2).map(l => <ReferenceLine key={l.id} y={l.min} stroke={HEX[l.id]} strokeDasharray="4 4" strokeOpacity={.7} label={{ value: l.id, position: 'right', fill: HEX[l.id], fontSize: 11, fontWeight: 700 }} />)}
                <Tooltip formatter={(v) => [`${v}%`, 'Natija']} labelFormatter={(n, p) => p?.[0] ? `${p[0].payload.title}, ${p[0].payload.date}` : n} />
                <Line type="monotone" dataKey="pct" stroke="#3350F2" strokeWidth={3} dot={{ r: 4, fill: '#3350F2', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>}
      </section>

      {list.map(r => <View key={r.id} r={r} />)}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/tests" className="btn">Yana mashq qilish</Link>
        <Link to="/ranking" className="btn-ghost">Reytingni ko'rish</Link>
      </div>

      <Modal open={cert} onClose={() => setCert(false)} labelledBy="cert-t" wide>
        <h2 id="cert-t" className="sr-only">Sertifikat</h2>
        {level && <Certificate name={user?.name} level={level} pct={pct} sections={sections} code={`CEFR-${list.map(r => r.id).join('-')}`} date={new Date().toLocaleDateString('uz-UZ')} />}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={() => setCert(false)}>Yopish</button>
          <button type="button" className="btn" data-autofocus onClick={() => window.print()}><Printer className="size-4" />Chop etish yoki PDF</button>
        </div>
      </Modal>
    </main>
  );
}
