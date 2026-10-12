import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Clock, ChevronLeft, ChevronRight, Send, Maximize, Lock } from 'lucide-react';
import Bubble from '../components/Bubble.jsx';
import Modal from '../components/Modal.jsx';
import toast from 'react-hot-toast';
import { api } from '../utils/api.js';
import { toggleHighlight } from '../utils/highlight.js';
import ReadingPart from '../components/ReadingParts.jsx';
import ListeningPart from '../components/ListeningParts.jsx';
import AudioPlayer from '../components/AudioPlayer.jsx';

// Har bir test uchun alohida holat (Listening -> Reading o'tishida eski holat qolib ketmasin)
export default function TakeTestPage() { const { id } = useParams(); return <Exam key={id} id={id} />; }

const fsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const fsEnter = () => { const el = document.documentElement; return (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el); };
const fsExit = () => { if (fsOn()) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document); };

function Exam({ id }) {
  const nav = useNavigate(), st = useLocation().state || {}, queue = st.queue || [], prev = st.results || [], session = st.session || null, only = st.part || null;    // only = faqat shu Part (mashq)
  const saved = useMemo(() => { try { return JSON.parse(sessionStorage.getItem(`exam:${id}`)); } catch { return null; } }, [id]);   // sahifa yangilansa — test davom etadi, lekin bloklanadi
  const [test, setTest] = useState(null), [answers, setAns] = useState(() => { try { return saved ? JSON.parse(sessionStorage.getItem(`ans:${id}`)) || {} : {}; } catch { return {}; } }), [pi, setPi] = useState(0), [left, setLeft] = useState(1), [busy, setBusy] = useState(false);
  const [dur, setDur] = useState(0), [t0, setT0] = useState(saved?.t0 || 0), [locked, setLocked] = useState(!!saved), [code, setCode] = useState(''), [codeErr, setCodeErr] = useState(''), [chk, setChk] = useState(false);
  const started = !!t0, done$ = useRef(false), [askOpen, setAskOpen] = useState(false);
  const [plays, setPlays] = useState(() => { try { return JSON.parse(localStorage.getItem(`plays:${id}`)) || {}; } catch { return {}; } });
  const [cfg, setCfg] = useState({ listening_limit: 2, speed_min: 0.5, speed_max: 2 });
  useEffect(() => { api.get('/settings').then(r => setCfg(r.data)); }, []);
  useEffect(() => { api.get(`/tests/${id}`).then(r => {
    const ps = r.data.parts, all = ps.reduce((n, p) => n + p.questions.length, 0), mine = only ? ps.filter(p => p.part_no === only).reduce((n, p) => n + p.questions.length, 0) : all;
    setTest(r.data); setPi(Math.max(0, only ? ps.findIndex(p => p.part_no === only) : 0));
    const d = saved?.dur || (only && all ? Math.max(300, Math.round(r.data.duration * 60 * mine / all)) : r.data.duration * 60);       // bitta Part uchun vaqt ulushi
    setDur(d); setLeft(saved ? Math.max(0, d - Math.floor((Date.now() - saved.t0) / 1000)) : d);
  }).catch(() => toast.error('Test topilmadi')); }, [id]);
  // vaqt boshlanish payti bo'yicha hisoblanadi (sahifani yangilash bilan to'xtatib bo'lmaydi)
  useEffect(() => { if (!started || !dur) return; const tick = () => setLeft(Math.max(0, dur - Math.floor((Date.now() - t0) / 1000))); tick(); const t = setInterval(tick, 1000); return () => clearInterval(t); }, [started, dur, t0]);
  useEffect(() => { if (started) sessionStorage.setItem(`ans:${id}`, JSON.stringify(answers)); }, [answers, started]);
  // to'liq ekrandan chiqib ketsa — bloklanadi, audio to'xtatiladi
  useEffect(() => {
    if (!started) return;
    const onFs = () => { if (!fsOn() && !done$.current) { setLocked(true); document.querySelectorAll('audio').forEach(a => a.pause()); } };
    document.addEventListener('fullscreenchange', onFs); document.addEventListener('webkitfullscreenchange', onFs);
    return () => { document.removeEventListener('fullscreenchange', onFs); document.removeEventListener('webkitfullscreenchange', onFs); };
  }, [started]);
  useEffect(() => () => fsExit(), []);
  const begin = async () => {        // "Boshlash" bosilganda (foydalanuvchi harakati) to'liq ekranga o'tadi
    try { await fsEnter(); } catch { return toast.error("To'liq ekranga o'tib bo'lmadi. Brauzer ruxsatini tekshiring"); }
    const now = Date.now(); sessionStorage.setItem(`exam:${id}`, JSON.stringify({ t0: now, dur })); setT0(now);
  };
  const unlock = async (e) => {
    e.preventDefault(); setChk(true); setCodeErr('');
    try { await api.post('/unlock', { code }); setLocked(false); setCode(''); try { await fsEnter(); } catch { /* ruxsat berilmasa ham davom etadi */ } }
    catch (err) { setCodeErr(err.response?.data?.error || 'Xatolik'); setCode(''); }
    setChk(false);
  };
  useEffect(() => { localStorage.setItem(`plays:${id}`, JSON.stringify(plays)); }, [plays]);
  useEffect(() => { if (test && started && left === 0) submit(); }, [left]);
  const starts = useMemo(() => { let n = 1; return (test?.parts || []).map(p => { const s = n; n += p.questions.length; return s; }); }, [test]);
  if (!test) return <div className="p-10"><div className="card mx-auto h-64 max-w-4xl animate-pulse" /></div>;

  const shown = test.parts.filter(p => !only || p.part_no === only), total = shown.reduce((s, p) => s + p.questions.length, 0), done = Object.values(answers).filter(v => String(v).trim()).length;
  const setAnswer = (qid, v) => setAns(a => ({ ...a, [qid]: v }));
  const submit = async () => {
    if (busy) return; setBusy(true); done$.current = true;
    let data;
    try { ({ data } = await api.post(`/tests/${id}/submit`, { name: localStorage.name || 'Mehmon', userId: JSON.parse(localStorage.user || 'null')?.id ?? null, answers, sessionId: session, parts: only ? [only] : undefined })); }
    catch (e) { setBusy(false); done$.current = false; return toast.error(e.response?.data?.error || "Topshirib bo'lmadi. Internetni tekshirib, qayta urinib ko'ring"); }
    localStorage.removeItem(`plays:${id}`); sessionStorage.removeItem(`exam:${id}`); sessionStorage.removeItem(`ans:${id}`); fsExit();
    const results = [...prev, { ...data, test: { title: test.title, type: test.type }, part: only }];
    if (queue.length) { toast.success('Listening topshirildi — endi Reading boshlanadi'); nav(`/test/${queue[0]}`, { state: { queue: queue.slice(1), results, session } }); }
    else nav('/result', { state: { results } });
  };
  const total$ = total;
  const mm = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
  const ask = () => setAskOpen(true);

if (!started) return (
    <main className="auth">
      <div className="sheet auth-card" style={{ maxWidth: 480 }}>
        <div>
          <h1 className="q-title">{test.title}</h1>
          {only && <p className="lede" style={{ marginTop: 4 }}>Faqat Part {only}</p>}
        </div>
        <dl className="facts" style={{ margin: 0 }}>
          <div className="fact"><dt>Savollar</dt><dd>{total$}</dd></div>
          <div className="fact"><dt>Vaqt</dt><dd>{Math.round(dur / 60)} daqiqa</dd></div>
        </dl>
        <p className="rules"><Lock className="mt-0.5 size-4 shrink-0" /><span><b>Diqqat.</b> Test to'liq ekranda ochiladi. To'liq ekrandan chiqsangiz (Esc yoki boshqa usul bilan) bloklanasiz va davom etish uchun ustozdan 6 xonali kod so'rashingiz kerak bo'ladi.</span></p>
        <button type="button" className="btn" style={{ width: '100%', padding: '.9rem' }} onClick={begin}><Maximize className="size-5" />Boshlash (to'liq ekran)</button>
      </div>
    </main>);

  return (
    <div className="min-h-screen">
      {locked && (
        <div className="lock">
          <form onSubmit={unlock} className="lock-card">
            <Lock className="mx-auto size-10" style={{ color: '#FFB4BF' }} />
            <h2>Siz bloklandingiz</h2>
            <p>Test to'liq ekrandan chiqdi. Davom etish uchun ustozdan olgan 6 xonali kodni kiriting.</p>
            <input autoFocus inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" aria-label="6 xonali kod" className="code" />
            {codeErr && <p style={{ color: '#FFB4BF' }}>{codeErr}</p>}
            <button className="btn btn-hl" disabled={code.length !== 6 || chk}>Davom etish</button>
          </form>
        </div>)}
      <Modal open={askOpen} onClose={() => setAskOpen(false)} labelledBy="ask-t">
        <h2 id="ask-t">Testni topshirasizmi?</h2>
        <p>{total - done > 0 ? `${total - done} ta savol javobsiz qoldi.` : 'Barcha savollarga javob berdingiz.'} Topshirgandan keyin javoblarni o'zgartirib bo'lmaydi.</p>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" data-autofocus onClick={() => setAskOpen(false)}>Testga qaytish</button>
          <button type="button" className="btn" disabled={busy} onClick={() => { setAskOpen(false); submit(); }}><Send className="size-4" />Topshirish</button>
        </div>
      </Modal>
      <div className="xbar">
        <div className="xbar-in">
          <div className="xbar-title">{test.title}{only ? `, Part ${only}` : ''}</div>
          <span className="xbar-count" aria-label={`${total} savoldan ${done} tasiga javob berildi`}>{done}/{total}</span>
          <span className={`timer ${left < 300 ? 'is-low' : ''}`} role="timer" aria-label="Qolgan vaqt"><Clock className="size-[18px]" />{mm}</span>
          <button type="button" className="btn" style={{ padding: '.55rem 1rem' }} disabled={busy} onClick={ask}><Send className="size-4" />Topshirish</button>
        </div>
        <div className="xprog" role="progressbar" aria-label="Javob berilgan savollar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}><i style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
      </div>
      <main className="xmain" onContextMenu={toggleHighlight}>
        {test.parts.map((p, i) => (
          <div key={p.id} className={i === pi ? '' : 'hidden'}>
            {test.type === 'reading'
              ? <ReadingPart part={p} answers={answers} setAnswer={setAnswer} start={starts[i]} />
              : <>
                  <AudioPlayer active={i === pi} src={p.audio_url} plays={plays[p.id] || 0} limit={cfg.listening_limit} min={cfg.speed_min} max={cfg.speed_max}
                    onPlay={() => setPlays(s => ({ ...s, [p.id]: (s[p.id] || 0) + 1 }))} />
                  <ListeningPart part={p} answers={answers} setAnswer={setAnswer} start={starts[i]} />
                </>}
          </div>))}
        <p className="hint">Matnni belgilab, sichqonchaning o'ng tugmasini bosing: sariq highlight qo'yiladi. Highlight ustida yana o'ng tugmani bossangiz, u o'chadi.</p>
        {!only && <div className="nav-row">
          <button type="button" className="btn-ghost" disabled={pi === 0} onClick={() => setPi(pi - 1)}><ChevronLeft className="size-4" />Oldingi part</button>
          <button type="button" className="btn" disabled={pi === test.parts.length - 1} onClick={() => setPi(pi + 1)}>Keyingi part <ChevronRight className="size-4" /></button>
        </div>}
      </main>
      <nav className="dock" aria-label="Javoblar varag'i">
        <div className="dock-in">
          {test.parts.map((p, i) => (!only || p.part_no === only) && (
            <button key={p.id} type="button" className={`dgrp ${i === pi ? 'is-cur' : ''}`} onClick={() => setPi(i)} aria-current={i === pi ? 'true' : undefined}
              aria-label={`Part ${p.part_no}, ${p.questions.filter(q => String(answers[q.id] ?? '').trim()).length} / ${p.questions.length} javob berilgan`}>
              <span className="dgrp-b">Part {p.part_no}</span>
              <span className="dots" aria-hidden="true">
                {p.questions.map((q, k) => <Bubble key={q.id} size="sm" done={!!String(answers[q.id] ?? '').trim()}>{starts[i] + k}</Bubble>)}
              </span>
            </button>))}
        </div>
      </nav>
    </div>
  );
}
