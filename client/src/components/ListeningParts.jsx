import { useState } from 'react';
import Mark from './Mark.jsx';
import Bubble from './Bubble.jsx';
import Split from './Split.jsx';
import { X } from 'lucide-react';
import { GapFill } from './ReadingParts.jsx';

const has = (answers, q) => !!String(answers[q.id] ?? '').trim();
const Num = ({ n, done }) => <Bubble done={done}>{n}</Bubble>;

// PART 1 va 5: Multiple choice (A/B/C...)
function MC({ part, answers, setAnswer, start }) {
  return (
    <div className="card qlist">
      {part.questions.map((q, i) => (
        <div key={q.id} className="q">
          {q.data.heading && <p className="q-head">{q.data.heading}</p>}
          <p className="q-t"><Num n={start + i} done={has(answers, q)} /><span>{q.data.text}</span></p>
          <div className="choices" role="radiogroup" aria-label={`${start + i}-savol`}>
            {(q.data.options || []).map((o, k) => { const v = String.fromCharCode(65 + k), on = answers[q.id] === v; return (
              <label key={v} className={`choice ${on ? 'is-on' : ''}`}>
                <input type="radio" className="sr-only" name={`q${q.id}`} checked={on} onChange={() => setAnswer(q.id, v)} />
                <Bubble on={on}>{v}</Bubble><span className="choice-t">{o}</span>
              </label>); })}
          </div>
        </div>))}
    </div>
  );
}

// PART 3: drag & drop (sichqoncha) + tap-to-assign (telefon)
function MultiMatching({ part, answers, setAnswer, start }) {
  const opts = part.content.options || [], [sel, setSel] = useState(null);
  const text = (id) => opts.find(o => o.id === id)?.text;
  const assign = (qid, oid) => { if (!oid) return; setAnswer(qid, oid); setSel(null); };
  const key = (fn) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };
  return (
    <Split name="l-match" def={50}>
      <div className="card">
        {part.questions.map((q, i) => (
          <div key={q.id} onDragOver={e => e.preventDefault()} onDrop={e => assign(q.id, e.dataTransfer.getData('id'))}
            onClick={() => sel && assign(q.id, sel)}
            className={`drop ${sel ? 'is-armed' : ''}`}>
            <Num n={start + i} done={has(answers, q)} /><span style={{ fontWeight: 500 }}>{q.data.text || `Speaker ${i + 1}`}</span>
            <div className="slot">
              {answers[q.id] ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}><span><b>{answers[q.id]}.</b> {text(answers[q.id])}</span>
                <button type="button" className="slot-x" aria-label="Javobni o'chirish" onClick={e => { e.stopPropagation(); setAnswer(q.id, ''); }}><X className="size-4" /></button></span>
                : <span className="none">Bu yerga tashlang</span>}
            </div>
          </div>))}
      </div>
      <div className="card" style={{ height: 'fit-content' }}>
        <h4 className="ad-h">Variantlar</h4>
        <div style={{ display: 'grid', gap: 8, padding: '4px 16px 16px' }}>
          {opts.map(o => {
            const k = part.questions.findIndex(q => answers[q.id] === o.id), n = k < 0 ? null : start + k;   // ishlatilgan variant: chizilgan + savol raqami
            return n ? (
              <div key={o.id} className="chip is-used"><Mark id={o.id} n={n} />{o.text}</div>
            ) : (
              <div key={o.id} draggable role="button" tabIndex={0} aria-pressed={sel === o.id} onDragStart={e => e.dataTransfer.setData('id', o.id)}
                onClick={() => setSel(sel === o.id ? null : o.id)} onKeyDown={key(() => setSel(sel === o.id ? null : o.id))}
                className={`chip ${sel === o.id ? 'is-sel' : ''}`}>
                <b style={{ marginRight: 8 }}>{o.id}</b>{o.text}</div>);
          })}
        </div>
      </div>
    </Split>
  );
}

// PART 4: xarita rasmi (harflar rasmning o'zida) + har savol uchun harf tanlash
function MapLabel({ part, answers, setAnswer, start }) {
  const letters = (part.content.options || []).map(o => o.id);
  // harf boshqa savolga qo'yilgan bo'lsa — qaysi raqamga ekanini qaytaradi
  const takenBy = (qid, l) => { const k = part.questions.findIndex(q => q.id !== qid && answers[q.id] === l); return k < 0 ? null : start + k; };
  return (
    <Split name="l-map" def={57}>
      <div className="card pin" style={{ padding: 8 }}>{part.image_url ? <img src={part.image_url} alt="Xarita" style={{ width: '100%', borderRadius: 2 }} /> : <div className="empty">Xarita rasmi yuklanmagan</div>}</div>
      <div className="card qlist">
        {part.questions.map((q, i) => (
          <div key={q.id} className="q">
            <p className="q-t"><Num n={start + i} done={has(answers, q)} /><span>{q.data.text}</span></p>
            <div className="letters" role="group" aria-label={`${start + i}-savol harfi`}>
              {letters.map(l => { const n = takenBy(q.id, l);
                return <button key={l} type="button" disabled={!!n} aria-pressed={answers[q.id] === l} onClick={() => setAnswer(q.id, answers[q.id] === l ? '' : l)}
                  className={`lt ${answers[q.id] === l ? 'is-on' : ''}`}>
                  <Mark id={l} n={n} gap="" /></button>; })}
            </div>
          </div>))}
      </div>
    </Split>
  );
}

export default function ListeningPart(props) {
  const { part } = props;
  const C = { mc: MC, gap_fill: GapFill, multi_matching: MultiMatching, map_label: MapLabel }[part.kind] || MC;
  return (
    <>
      {part.instructions && <p className="instr">{part.instructions}</p>}
      <C {...props} />
    </>
  );
}
