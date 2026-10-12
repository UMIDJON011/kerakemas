import { useEffect, useState } from 'react';
import { api, getUser } from '../utils/api.js';
import Bubble from './Bubble.jsx';

const SECTIONS = [['all', 'Jami'], ['listening', 'Listening'], ['reading', 'Reading']];
const Cell = ({ s }) => s ? <span>{s.score}/{s.total}</span> : <span className="none" aria-label="topshirilmagan">—</span>;

// Reyting: eng kam xato qilgan birinchi. mock berilsa — tanlagich yashiriladi (admin sahifasi uchun)
export default function Ranking({ mock: fixed }) {
  const [mock, setMock] = useState(fixed || ''), [section, setSection] = useState('all'), [d, setD] = useState(null), me = getUser();
  useEffect(() => { if (fixed !== undefined) setMock(fixed); }, [fixed]);
  useEffect(() => { api.get('/ranking', { params: { mock, section } }).then(r => setD(r.data)); }, [mock, section]);
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, marginBottom: 8 }}>
        {fixed === undefined && d && (
          <select className="field" aria-label="Mock" value={d.mock || ''} onChange={e => setMock(e.target.value)}>
            {d.mocks.map(m => <option key={m} value={m}>{m}</option>)}</select>)}
        <div className="tabs" style={{ margin: 0, border: 0 }} role="group" aria-label="Bo'lim">
          {SECTIONS.map(([k, l]) => <button key={k} type="button" onClick={() => setSection(k)} aria-current={section === k} className="tab"><span className="tab-l">{l}</span></button>)}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="board">
          <thead><tr>
            <th scope="col" style={{ width: 64 }}>O'rin</th><th scope="col">O'quvchi</th>
            <th scope="col" className="num">Listening</th><th scope="col" className="num">Reading</th>
            <th scope="col" className="num">Xato</th><th scope="col" className="num">Jami</th></tr></thead>
          <tbody>
            {d?.rows.map(r => (
              <tr key={`${r.user_id}-${r.name}`} className={me && r.user_id === me.id ? 'me' : ''}>
                <td><Bubble size="lg" done={r.rank === 1}>{r.rank}</Bubble><span className="sr-only">{r.rank}-o'rin</span></td>
                <td className="who">{r.name}</td>
                <td className="num"><Cell s={r.listening} /></td><td className="num"><Cell s={r.reading} /></td>
                <td className="num mist">{r.mistakes}</td><td className="num" style={{ fontWeight: 700 }}>{r.score}/{r.total}</td>
              </tr>))}
          </tbody>
        </table>
        {d && !d.rows.length && <p className="empty">Bu mock bo'yicha hali natija yo'q.</p>}
        {!d && <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>{[0, 1, 2, 3].map(i => <div key={i} className="skel" style={{ height: 52 }} />)}</div>}
      </div>
    </div>
  );
}

export const RankingPage = () => (
  <main className="page">
    <h1 className="h1">Reyting</h1>
    <p className="lede">Eng kam xato qilgan birinchi turadi. To'liq mock topshirganlar yuqorida.</p>
    <div className="glass" style={{ marginTop: 28, padding: '18px 18px 10px' }}><Ranking /></div>
  </main>
);
