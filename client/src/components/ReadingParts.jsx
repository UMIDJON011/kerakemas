import Mark from './Mark.jsx';
import Bubble from './Bubble.jsx';
import Split from './Split.jsx';
// Reading: 5 xil Part interfeysi. props: part, answers, setAnswer(qid, value)
const TFNG = ['TRUE', 'FALSE', 'NOT GIVEN'], TF_SHORT = { TRUE: 'T', FALSE: 'F', 'NOT GIVEN': 'NG' };
const has = (answers, q) => !!String(answers[q.id] ?? '').trim();
const Num = ({ n, done }) => <Bubble done={done}>{n}</Bubble>;

function Passage({ text }) {
  return text ? <div className="card passage scroll pin">{text}</div> : null;
}
function Select({ options, value, onChange, taken = [], label }) {
  // boshqa savollarda tanlangan variantlar ro'yxatdan chiqib ketadi (o'zinikini ko'rsatamiz)
  const free = options.filter(o => o.id === value || !taken.includes(o.id));
  return (
    <select className="field" aria-label={label} value={value || ''} onChange={e => onChange(e.target.value)}>
      <option value="">Tanlang</option>
      {free.map(o => <option key={o.id} value={o.id}>{o.id}</option>)}
    </select>
  );
}

// PART 1 va 5: gap fill — gap gap ichida inline input
export function GapFill({ part, answers, setAnswer, start }) {
  if (part.content?.text?.includes('[[')) return <div className="card passage is-gaps"><Inline text={part.content.text} {...{ part, answers, setAnswer, start }} /></div>;
  return (
    <div className="card qlist">
      {part.questions.map((q, i) => {
        const [a, b = ''] = (q.data.text || '___').split('___');
        return (
          <div key={q.id} className="q">
            <div className="q-t"><Num n={start + i} done={has(answers, q)} />
              <span>{a}<input className="blank" aria-label={`${start + i}-savol javobi`} value={answers[q.id] || ''} onChange={e => setAnswer(q.id, e.target.value)} />{b}</span></div>
          </div>);
      })}
    </div>
  );
}

// PART 2: savollar chapda, e'lonlar (A-J) o'ngda
function MatchingAds({ part, answers, setAnswer, start }) {
  const opts = part.content.options || [];
  // variant -> qaysi savol (tartib raqami) olgan
  const takenBy = (oid) => { const i = part.questions.findIndex(q => answers[q.id] === oid); return i < 0 ? null : start + i; };
  return (
    <Split name="r-ads" def={50}>
      <div className="card scroll">
        {part.questions.map((q, i) => (
          <div key={q.id} className="mrow">
            <span className="mrow-t"><Num n={start + i} done={has(answers, q)} /><span>{q.data.text}</span></span>
            <Select options={opts} value={answers[q.id]} onChange={v => setAnswer(q.id, v)} label={`${start + i}-savol uchun e'lon`}
              taken={part.questions.filter(x => x.id !== q.id).map(x => answers[x.id]).filter(Boolean)} />
          </div>))}
      </div>
      <div className="card scroll">
        {opts.map(o => {
          const n = takenBy(o.id);
          return <div key={o.id} className={`ad ${n ? 'is-used' : ''}`}><Mark id={o.id} n={n} /><span>{o.text}</span></div>;
        })}
      </div>
    </Split>
  );
}

// PART 3: maqola + sarlavhalar ro'yxati + paragraflarga moslash
function HeadingMatching({ part, answers, setAnswer, start }) {
  const opts = part.content.options || [], article = part.content.text;
  const takenIds = (qid) => part.questions.filter(x => x.id !== qid).map(x => answers[x.id]).filter(Boolean);
  const headings = (
    <div className="card" style={{ height: 'fit-content' }}>
      <h4 className="ad-h">Sarlavhalar</h4>
      {opts.map(o => {
        const k = part.questions.findIndex(q => answers[q.id] === o.id), n = k < 0 ? null : start + k;   // qaysi savolga qo'yilgan
        return <div key={o.id} className={`ad ${n ? 'is-used' : ''}`}><Mark id={o.id} n={n} /><span>{o.text}</span></div>;
      })}
    </div>
  );
  const rows = (
    <div className="card qlist">
      {part.questions.map((q, i) => (
        <div key={q.id} className="q">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
            <span className="q-t"><Num n={start + i} done={has(answers, q)} /><b>{q.data.label || (article && q.data.text) || `Paragraph ${i + 1}`}</b></span>
            <Select options={opts} value={answers[q.id]} onChange={v => setAnswer(q.id, v)} taken={takenIds(q.id)} label={`${start + i}-savol uchun sarlavha`} />
          </div>
          {!article && q.data.text && <p className="small-note" style={{ marginTop: 8, lineHeight: 1.6 }}>{q.data.text}</p>}
        </div>))}
    </div>
  );
  // maqola (paragraflar) faylda bo'lsa — chapda ko'rsatiladi; yo'q bo'lsa eski ko'rinish
  if (article) return <Split name="r-article" def={56}><Passage text={article} /><div className="stack">{headings}{rows}</div></Split>;
  return <Split name="r-headings" def={42}>{headings}{rows}</Split>;
}

// PART 4: matn + MC (options bo'lsa) yoki True/False/Not Given
function McTfng({ part, answers, setAnswer, start, solo }) {
  const list = (
    <div className={`card qlist ${solo ? '' : 'scroll'}`}>
      {part.questions.map((q, i) => {
        const hasOpts = !!q.data.options?.length;
        const opts = hasOpts ? q.data.options.map((t, k) => ({ v: String.fromCharCode(65 + k), t, b: String.fromCharCode(65 + k) })) : TFNG.map(t => ({ v: t, t, b: TF_SHORT[t] }));
        return (
          <div key={q.id} className="q">
            <p className="q-t"><Num n={start + i} done={has(answers, q)} /><span>{q.data.text}</span></p>
            <div className={`choices ${hasOpts ? '' : 'is-row'}`} role="radiogroup" aria-label={`${start + i}-savol`}>
              {opts.map(o => { const on = answers[q.id] === o.v; return (
                <label key={o.v} className={`choice ${on ? 'is-on' : ''}`}>
                  <input type="radio" className="sr-only" name={`q${q.id}`} checked={on} onChange={() => setAnswer(q.id, o.v)} />
                  <Bubble on={on}>{o.b}</Bubble><span className="choice-t">{o.t}</span>
                </label>); })}
            </div>
          </div>);
      })}
    </div>
  );
  return solo ? list : <Split name="r-text" def={50}><Passage text={part.content.text} />{list}</Split>;
}

// Matn ichidagi [[n]] belgilari o'rniga input qo'yadi (n — Part ichidagi savol tartibi)
export function Inline({ text, part, answers, setAnswer, start }) {
  return (
    <>
      {text.split(/\[\[(\d+)\]\]/).map((seg, i) => {
        if (i % 2 === 0) return seg;
        const k = +seg - 1, q = part.questions[k]; if (!q) return null;
        return <span key={i} style={{ whiteSpace: 'nowrap' }}><span className="gapn">{start + k}</span>
          <input className="blank is-sm" aria-label={`${start + k}-bo'sh joy`} value={answers[q.id] || ''} onChange={e => setAnswer(q.id, e.target.value)} /></span>;
      })}
    </>
  );
}

// PART 5: maqola + (summary gap) + MC
function SummaryGap({ part, answers, setAnswer, start }) {
  const gaps = part.questions.filter(q => !q.data.options?.length), mcs = part.questions.slice(gaps.length);
  return (
    <Split name="r-summary" def={50}>
      <Passage text={part.content.text} />
      <div className="stack scroll">
        {part.content.summary && <div className="card passage is-gaps" style={{ padding: '18px 22px' }}><Inline text={part.content.summary} {...{ part, answers, setAnswer, start }} /></div>}
        <McTfng solo part={{ ...part, questions: mcs }} answers={answers} setAnswer={setAnswer} start={start + gaps.length} />
      </div>
    </Split>
  );
}

export default function ReadingPart({ part, answers, setAnswer, start }) {
  const C = { gap_fill: GapFill, matching_ads: MatchingAds, heading_matching: HeadingMatching, mc_tfng: McTfng, summary_gap: SummaryGap }[part.kind] || GapFill;
  return (
    <>
      {part.instructions && <p className="instr">{part.instructions}</p>}
      <C {...{ part, answers, setAnswer, start }} />
    </>
  );
}
