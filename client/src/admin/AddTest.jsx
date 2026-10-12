import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, BookOpen, Headphones, Layers, ScanText, Music, Map as MapIcon, Save, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { adm } from '../utils/api.js';
import { enhanceImage } from '../utils/ocrPrep.js';

const MAX = { reading: 5, listening: 6 };
const KINDS = [
  ['reading', 'Reading', BookOpen, 'Faqat Reading testi (Part 1–5)'],
  ['listening', 'Listening', Headphones, 'Faqat Listening testi (Part 1–6, audio bilan)'],
  ['full', 'Full Mock', Layers, 'Reading + Listening birga'],
];
const LABEL = { reading: 'Reading nomini yozing', listening: 'Listening nomini yozing', full: 'Full mock nomini yozing' };
const blank = () => ({ parts: {}, answers: '', audio: {}, map: null });
const stamp = () => new Date().toLocaleTimeString('uz-UZ', { hour12: false });

// Screenshot -> server OCR; jarayon loglari satrma-satr keladi
async function streamOcr(files, psm, onEvent) {
  const fd = new FormData(); fd.append('psm', psm); files.forEach(f => fd.append('images', f));
  const res = await fetch('/api/admin/ocr', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.adminToken}` }, body: fd });
  if (!res.ok || !res.body) throw new Error(`Server javobi: ${res.status}`);
  const reader = res.body.getReader(), dec = new TextDecoder(); let buf = '';
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (line) onEvent(JSON.parse(line)); }
  }
}

export default function AddTest({ onClose, onSaved }) {
  const [step, setStep] = useState(1), [kind, setKind] = useState('reading'), [name, setName] = useState('');
  const [data, setData] = useState({ reading: blank(), listening: blank() });
  const [sec, setSec] = useState('reading'), [tab, setTab] = useState(1);
  const [pv, setPv] = useState({}), [log, setLog] = useState([]), [ocrBusy, setOcrBusy] = useState(false), [enhance, setEnhance] = useState(true), [psm, setPsm] = useState('6'), [wmMode, setWmMode] = useState('auto'), [saving, setSaving] = useState(false), [result, setResult] = useState(null);
  const logRef = useRef(null);
  const sections = kind === 'full' ? ['reading', 'listening'] : [kind];

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [log]);
  const addLog = (msg, cls = '') => setLog(l => [...l, { t: stamp(), msg, cls }]);

  const pickKind = (k) => { setKind(k); setSec(k === 'full' ? 'reading' : k); };
  const next = async () => {            // "Davom etish": mavjud fayllar bo'lsa yuklab olinadi
    try {
      const { data: r } = await adm.get('/data/test', { params: { kind, name } });
      if (r.exists) { setData(d => ({ ...d, ...Object.fromEntries(Object.entries(r.sections).map(([k, v]) => [k, { ...blank(), ...v }])) })); toast('Bu nomda test bor — fayllari yuklandi. Saqlasangiz ustiga yoziladi', { icon: 'ℹ️' }); }
    } catch (e) { return toast.error(e.response?.data?.error || 'Xatolik'); }
    setSec(sections[0]); setTab(1); setStep(3);
  };

  const text = (s, n) => data[s].parts[n] || '';
  const setText = (s, n, v) => setData(d => ({ ...d, [s]: { ...d[s], parts: { ...d[s].parts, [n]: v } } }));
  const cur = tab === 'answers' ? null : text(sec, tab);

  // platforma matnni qanday qabul qilganini ko'rsatadi
  useEffect(() => {
    if (step !== 3 || tab === 'answers') return;
    const t = setTimeout(async () => {
      if (!cur.trim()) return setPv(p => ({ ...p, [`${sec}:${tab}`]: null }));
      try { const { data: r } = await adm.post('/parse-preview', { type: sec, part: tab, text: cur }); setPv(p => ({ ...p, [`${sec}:${tab}`]: r })); } catch { /* ko'rsatilmaydi */ }
    }, 500);
    return () => clearTimeout(t);
  }, [cur, sec, tab, step]);

  const runOcr = async (files) => {
    files = [...files].filter(f => f.type.startsWith('image/'));
    if (!files.length || ocrBusy || tab === 'answers') return;
    const s = sec, n = tab; setOcrBusy(true);
    addLog(`── ${s === 'reading' ? 'Reading' : 'Listening'} Part ${n}: ${files.length} ta rasm yuborildi`, 'text-indigo-300');
    try {
      if (enhance) {          // brauzerda: kattalashtirish + kontrast (aniqlikni oshiradi)
        const out = [];
        for (const [i, f] of files.entries()) {
          try { const { blob, info } = await enhanceImage(f, { watermark: wmMode }); out.push(new File([blob], `rasm${i + 1}.png`, { type: 'image/png' }));
            addLog(`Rasm ${i + 1} tayyorlandi: ${info.from} → ${info.to} (×${info.scale})${info.invert ? ", qorong'i fon oqqa aylantirildi" : ''}${info.watermark ? `, suv belgisi (kulrang ~${info.watermark}) tozalandi` : ''}, kontrast tuzatildi`); }
          catch { out.push(f); addLog(`Rasm ${i + 1}: tayyorlab bo'lmadi, asl holida yuborildi`, 'text-amber-300'); }
        }
        files = out;
      }
      await streamOcr(files, psm, (e) => {
        if (e.t === 'log') addLog(e.msg);
        else if (e.t === 'error') addLog(`XATO: ${e.msg}`, 'text-rose-400');
        else if (e.t === 'done') {
          setData(d => { const old = d[s].parts[n] || ''; return { ...d, [s]: { ...d[s], parts: { ...d[s].parts, [n]: (old.trim() ? old.trimEnd() + '\n' : '') + e.text } } }; });
          addLog(`Tayyor: matn Part ${n} ga qo'shildi — tekshirib chiqing`, 'text-green-400');
        }
      });
    } catch (e) { addLog(`XATO: ${e.message}`, 'text-rose-400'); toast.error('OCR ishlamadi — logga qarang'); }
    setOcrBusy(false);
  };

  const upload = async (s, target, n, file) => {
    if (!file) return;
    const fd = new FormData(); Object.entries({ kind, name, section: s, target, part: n }).forEach(([k, v]) => fd.append(k, v)); fd.append('file', file);
    const t = toast.loading('Yuklanmoqda...');
    try {
      const { data: r } = await adm.post('/data/file', fd);
      setData(d => ({ ...d, [s]: target === 'audio' ? { ...d[s], audio: { ...d[s].audio, [n]: r.url } } : { ...d[s], map: r.url } }));
      toast.success('Saqlandi', { id: t });
    } catch (e) { toast.error(e.response?.data?.error || 'Yuklanmadi', { id: t }); }
  };

  const save = async () => {
    setSaving(true);
    try { const { data: r } = await adm.post('/data/save', { kind, name, sections: Object.fromEntries(sections.map(s => [s, { parts: data[s].parts, answers: data[s].answers }])) }); setResult(r); setStep(4); onSaved(); }
    catch (e) { toast.error(e.response?.data?.error || 'Saqlab bo\'lmadi'); }
    setSaving(false);
  };

  const filled = (s, n) => (data[s].parts[n] || '').trim().length > 0;
  const p = pv[`${sec}:${tab}`];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="card my-4 w-full max-w-4xl space-y-4 bg-white p-6 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Test qo'shish{step >= 3 && ` — ${KINDS.find(k => k[0] === kind)[1]}: ${name}`}</h2>
          <button className="btn-ghost p-2" onClick={onClose}><X className="size-4" /></button>
        </div>

        {step === 1 && <>
          <div className="grid gap-3 sm:grid-cols-3">
            {KINDS.map(([k, l, Icon, d]) => (
              <button key={k} onClick={() => { pickKind(k); setStep(2); }} className="rounded-2xl border border-slate-300 p-5 text-left transition hover:border-indigo-500 hover:bg-indigo-50 dark:border-slate-700 dark:hover:bg-indigo-950/40">
                <Icon className="mb-2 size-7 text-indigo-600" /><div className="font-bold">{l}</div><div className="text-xs text-slate-500">{d}</div></button>))}
          </div>
        </>}

        {step === 2 && <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (name.trim()) next(); }}>
          <label className="block font-medium">{LABEL[kind]}</label>
          <input autoFocus className="field w-full" placeholder="masalan: Mock 18" value={name} onChange={e => setName(e.target.value)} />
          <p className="text-xs text-slate-500">Fayllar <code>data/{kind === 'full' ? `full mock/${name || 'nom'}/reading va listening` : `${kind}/${name || 'nom'}`}</code> papkaga yoziladi.</p>
          <div className="flex gap-2"><button type="button" className="btn-ghost" onClick={() => setStep(1)}>Orqaga</button><button className="btn" disabled={!name.trim()}>Davom etish</button></div>
        </form>}

        {step === 3 && <>
          {kind === 'full' && <div className="flex gap-2">{sections.map(s => (
            <button key={s} onClick={() => { setSec(s); setTab(1); }} className={sec === s ? 'btn px-4 py-1.5' : 'btn-ghost px-4 py-1.5'}>{s === 'reading' ? 'Reading' : 'Listening'}</button>))}</div>}
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: MAX[sec] }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setTab(n)} className={`${tab === n ? 'btn' : 'btn-ghost'} px-3 py-1.5 text-sm`}>Part {n}{filled(sec, n) && <CheckCircle2 className="size-3.5 text-green-500" />}</button>))}
            <button onClick={() => setTab('answers')} className={`${tab === 'answers' ? 'btn' : 'btn-ghost'} px-3 py-1.5 text-sm`}>Javoblar{data[sec].answers.trim() && <CheckCircle2 className="size-3.5 text-green-500" />}</button>
          </div>

          {tab === 'answers' ? <>
            <p className="text-sm text-slate-500"><b>answers.txt</b> — har qatorda bitta javob, bo'lim ichidagi tartib raqami bilan (1–35). True/False/No Information uchun: A = True, B = False, C = No Information.</p>
            <textarea className="field h-72 w-full font-mono text-sm" placeholder={'1. B\n2. A\n9. sign up\n14. 105\n15. E'} value={data[sec].answers} onChange={e => setData(d => ({ ...d, [sec]: { ...d[sec], answers: e.target.value } }))} />
          </> : <>
            <p className="text-sm text-slate-500"><b>part{tab}.txt</b> — savollarni matn qilib tashlang (Ctrl+V). <b>Screenshot</b>ni Ctrl+V qilsangiz yoki shu maydonga tashlasangiz, OCR o'zi o'qiydi.</p>
            <div onDragOver={e => e.preventDefault()} onDrop={e => { if (e.dataTransfer.files.length) { e.preventDefault(); runOcr(e.dataTransfer.files); } }}>
              <textarea className="field h-80 w-full font-mono text-sm" placeholder={`Part ${tab} matni…`} value={cur}
                onChange={e => setText(sec, tab, e.target.value)}
                onPaste={e => { if (e.clipboardData.files.length) { e.preventDefault(); runOcr(e.clipboardData.files); } }} />
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="btn-ghost cursor-pointer"><ScanText className="size-4" />Rasm tanlash (OCR)
                <input type="file" accept="image/*" multiple hidden onChange={e => { runOcr(e.target.files); e.target.value = ''; }} /></label>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={enhance} onChange={e => setEnhance(e.target.checked)} />Rasmni yaxshilash</label>
              <select className="field py-1 text-xs" value={wmMode} onChange={e => setWmMode(e.target.value)} title="Rasm ustidagi kulrang yozuv (watermark)">
                <option value="auto">Suv belgisi: avto</option><option value="on">Suv belgisini o'chirish</option><option value="off">Tegilmasin</option></select>
              <select className="field py-1 text-xs" value={psm} onChange={e => setPsm(e.target.value)} title="Sahifa tuzilmasi">
                <option value="6">Bitta ustun</option><option value="3">Ko'p ustun / avtomatik</option></select>
              {p && <span className={p.count ? 'font-medium text-green-600' : 'font-medium text-amber-600'}>
                {p.count ? <>✓ Platforma qabul qildi: <b>{p.count}</b> ta savol{p.options ? `, ${p.options} ta variant` : ''}</> : <><AlertTriangle className="mr-1 inline size-4" />Savol topilmadi — formatni tekshiring</>}</span>}
            </div>
            {p?.instructions && <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500 dark:bg-slate-800"><b>Ko'rsatma:</b> {p.instructions}</p>}

            {sec === 'listening' && (
              <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="btn cursor-pointer"><Music className="size-4" />{data.listening.audio[tab] ? 'Audioni almashtirish' : "Audio qo'shish"}
                    <input type="file" accept="audio/*" hidden onChange={e => { upload('listening', 'audio', tab, e.target.files[0]); e.target.value = ''; }} /></label>
                  {data.listening.audio[tab] ? <audio controls preload="none" src={data.listening.audio[tab]} className="h-9 max-w-full" /> : <span className="text-sm text-slate-500">music/part{tab}.mp3 — hali yo'q</span>}
                </div>
                {tab === 4 && <div className="flex flex-wrap items-center gap-3">
                  <label className="btn-ghost cursor-pointer"><MapIcon className="size-4" />{data.listening.map ? 'Xaritani almashtirish' : "Xarita rasmini qo'shish"}
                    <input type="file" accept="image/*" hidden onChange={e => { upload('listening', 'map', 4, e.target.files[0]); e.target.value = ''; }} /></label>
                  {data.listening.map ? <img src={data.listening.map} alt="map" className="h-20 rounded border" /> : <span className="text-sm text-slate-500">map/ papka — hali yo'q (savol so'zlari part4.txt da)</span>}
                </div>}
              </div>)}
          </>}

          <div>
            <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-500"><span>OCR LOG</span>{log.length > 0 && <button className="flex items-center gap-1 hover:text-rose-500" onClick={() => setLog([])}><Trash2 className="size-3" />tozalash</button>}</div>
            <div ref={logRef} className="h-32 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-xs text-slate-300">
              {log.length ? log.map((l, i) => <div key={i} className={l.cls}><span className="text-slate-500">[{l.t}]</span> {l.msg}</div>) : <span className="text-slate-600">Screenshot tashlansa, OCR jarayoni shu yerda ko'rinadi…</span>}
              {ocrBusy && <div className="animate-pulse text-amber-300">… ishlayapti</div>}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
            <button className="btn-ghost" onClick={() => setStep(2)}>Orqaga</button>
            <button className="btn" onClick={save} disabled={saving}><Save className="size-4" />{saving ? 'Saqlanmoqda…' : 'Saqlash'}</button>
          </div>
        </>}

        {step === 4 && result && <>
          <p className="text-sm text-slate-500">{result.written.length} ta fayl data/ papkaga yozildi:</p>
          {result.tests.map(t => (
            <div key={t.source} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
              <div className="flex items-center justify-between gap-2"><b>{t.title}</b>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{t.status}</span></div>
              <div className="mt-1 text-slate-500">{t.parts.map(x => `Part ${x.no}: ${x.count} savol`).join(' · ')}</div>
              {t.warnings.map(w => <p key={w} className="mt-1 text-xs text-amber-600">⚠ {w}</p>)}
              {t.id && <Link className="mt-2 inline-block text-xs font-medium text-indigo-600" to={`/admin/tests/${t.id}`} onClick={onClose}>Tahrirlash →</Link>}
            </div>))}
          <div className="flex gap-2"><button className="btn-ghost" onClick={() => setStep(3)}>Yana tahrirlash</button><button className="btn" onClick={onClose}>Yopish</button></div>
        </>}
      </div>
    </div>
  );
}
