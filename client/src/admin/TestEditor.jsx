import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Save, Trash2, Upload, GripVertical, FileJson, Music } from 'lucide-react';
import toast from 'react-hot-toast';
import { adm } from '../utils/api.js';

const HAS_OPTS = ['mc', 'mc_tfng', 'summary_gap'], LISTS = ['matching_ads', 'heading_matching', 'multi_matching', 'map_label'];
const toLines = (arr = []) => arr.map(o => `${o.id}|${o.text}`).join('\n');
const fromLines = (s) => s.split('\n').filter(Boolean).map(l => { const [id, ...t] = l.split('|'); return { id: id.trim(), text: t.join('|').trim() }; });

function FileInput({ label, accept, value, onChange }) {
  const up = async (e) => { const fd = new FormData(); fd.append('file', e.target.files[0]); const { data } = await adm.post('/upload', fd); onChange(data.url); toast.success('Yuklandi'); };
  return (
    <label className="block text-sm"><span className="mb-1 flex items-center gap-1 font-medium"><Upload className="size-4" />{label}</span>
      <input className="field mb-1 w-full" placeholder="URL yoki fayl yuklang" value={value || ''} onChange={e => onChange(e.target.value)} />
      <input type="file" accept={accept} onChange={up} className="text-xs" /></label>);
}

function QuestionRow({ q, kind, onSave, onDelete, drag }) {
  const [d, setD] = useState({ ...q.data, optionsText: (q.data.options || []).join('\n') });
  const [ans, setAns] = useState([].concat(q.answer).join(', ')), [ex, setEx] = useState(q.explanation || '');
  const save = () => {
    const { optionsText, ...rest } = d;
    if (HAS_OPTS.includes(kind)) rest.options = optionsText.split('\n').filter(Boolean);
    const answer = (kind === 'gap_fill' || (kind === 'summary_gap' && !d.optionsText?.trim())) ? ans.split(',').map(s => s.trim()).filter(Boolean) : ans.trim();
    onSave(q.id, { data: rest, answer, explanation: ex });
  };
  return (
    <div className="card space-y-2 p-3" {...drag}>
      <div className="flex items-start gap-2">
        <GripVertical className="mt-2 size-4 shrink-0 cursor-grab text-slate-400" />
        <div className="grid flex-1 gap-2 md:grid-cols-2">
          <input className="field md:col-span-2" placeholder={kind === 'gap_fill' ? 'Gap: matn ichida ___ yozing' : kind === 'mc' ? "Savol (bo'sh bo'lishi mumkin)" : 'Savol / matn'} value={d.text || ''} onChange={e => setD({ ...d, text: e.target.value })} />
          {HAS_OPTS.includes(kind) && <textarea className="field md:col-span-2" placeholder="Variantlar (har biri yangi qatorda; mc_tfng da bo'sh = TRUE/FALSE/NOT GIVEN)" value={d.optionsText} onChange={e => setD({ ...d, optionsText: e.target.value })} />}
          {kind === 'map_label' && <><input className="field" type="number" placeholder="x %" value={d.x ?? ''} onChange={e => setD({ ...d, x: +e.target.value })} /><input className="field" type="number" placeholder="y %" value={d.y ?? ''} onChange={e => setD({ ...d, y: +e.target.value })} /></>}
          <input className="field" placeholder={kind === 'gap_fill' ? "To'g'ri javoblar (vergul bilan)" : "To'g'ri javob (A / TRUE ...)"} value={ans} onChange={e => setAns(e.target.value)} />
          <input className="field" placeholder="Izoh (explanation)" value={ex} onChange={e => setEx(e.target.value)} />
        </div>
        <button className="btn-ghost p-2" onClick={save}><Save className="size-4" /></button>
        <button className="btn-ghost p-2 text-rose-600" onClick={() => onDelete(q.id)}><Trash2 className="size-4" /></button>
      </div>
    </div>
  );
}

function PartEditor({ part, reload, testType }) {
  const [p, setP] = useState({ ...part, optText: toLines(part.content.options) }), [qs, setQs] = useState(part.questions), [dragId, setDragId] = useState(null);
  const savePart = async () => {
    const content = { ...p.content }; if (LISTS.includes(p.kind)) content.options = fromLines(p.optText);
    await adm.put(`/parts/${p.id}`, { instructions: p.instructions, audio_url: p.audio_url, image_url: p.image_url, content }); toast.success(`Part ${p.part_no} saqlandi`);
  };
  const partBody = (over = {}) => ({ instructions: p.instructions, audio_url: p.audio_url, image_url: p.image_url,
    content: { ...p.content, ...(LISTS.includes(p.kind) ? { options: fromLines(p.optText) } : {}) }, ...over });
  const uploadAudio = async (e) => {            // yuklangach darrov saqlanadi
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const fd = new FormData(); fd.append('file', f); const t = toast.loading('Audio yuklanmoqda...');
    try { const { data } = await adm.post('/upload', fd); setP(x => ({ ...x, audio_url: data.url })); await adm.put(`/parts/${p.id}`, partBody({ audio_url: data.url })); toast.success(`Part ${p.part_no}: audio qo'shildi`, { id: t }); }
    catch { toast.error('Audio yuklanmadi', { id: t }); }
  };
  const removeAudio = async () => { setP(x => ({ ...x, audio_url: '' })); await adm.put(`/parts/${p.id}`, partBody({ audio_url: '' })); toast.success("Audio o'chirildi"); };
  const add = async () => { await adm.post(`/parts/${p.id}/questions`, { data: {}, answer: p.kind === 'gap_fill' ? [] : '' }); reload(); };
  const saveQ = async (id, b) => { await adm.put(`/questions/${id}`, b); toast.success('Saqlandi'); };
  const delQ = async (id) => { await adm.delete(`/questions/${id}`); reload(); };
  const drop = async (overId) => {
    const a = [...qs], from = a.findIndex(x => x.id === dragId), to = a.findIndex(x => x.id === overId);
    a.splice(to, 0, a.splice(from, 1)[0]); setQs(a); await adm.put(`/parts/${p.id}/reorder`, { ids: a.map(x => x.id) });
  };
  const bulk = async () => {
    const raw = prompt('JSON: [{"data":{"text":"..."},"answer":"A","explanation":"..."}]'); if (!raw) return;
    try { const r = await adm.post(`/parts/${p.id}/import`, { questions: JSON.parse(raw) }); toast.success(`${r.data.imported} ta import`); reload(); } catch { toast.error("JSON noto'g'ri"); }
  };
  return (
    <div className="card space-y-3 p-5">
      <h3 className="font-bold">Part {p.part_no} <span className="text-sm font-normal text-slate-500">({p.kind})</span></h3>
      <textarea className="field w-full" placeholder="Ko'rsatma (instructions)" value={p.instructions || ''} onChange={e => setP({ ...p, instructions: e.target.value })} />
      {p.kind === 'summary_gap' && <textarea rows={4} className="field w-full" placeholder="Summary matni (gap: [[1]], [[2]]...)" value={p.content.summary || ''} onChange={e => setP({ ...p, content: { ...p.content, summary: e.target.value } })} />}
      {['mc_tfng', 'gap_fill', 'summary_gap', 'heading_matching'].includes(p.kind) && <textarea rows={5} className="field w-full" placeholder="Matn (passage)" value={p.content.text || ''} onChange={e => setP({ ...p, content: { ...p.content, text: e.target.value } })} />}
      {LISTS.includes(p.kind) && <textarea rows={4} className="field w-full" placeholder="Variantlar bankasi — har qatorda: A|matn" value={p.optText} onChange={e => setP({ ...p, optText: e.target.value })} />}
      <div className="grid gap-3 md:grid-cols-2">
        {p.kind === 'map_label' && <FileInput label="Xarita rasmi" accept="image/*" value={p.image_url} onChange={v => setP({ ...p, image_url: v })} />}
      </div>
      {testType === 'listening' && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-900 dark:bg-indigo-950/30">
          <label className="btn cursor-pointer"><Music className="size-4" />{p.audio_url ? 'Audioni almashtirish' : "Audio qo'shish"}
            <input type="file" accept="audio/*" hidden onChange={uploadAudio} /></label>
          {p.audio_url ? <><audio controls preload="none" src={p.audio_url} className="h-9 max-w-full" />
            <button className="btn-ghost p-2 text-rose-600" title="Audioni o'chirish" onClick={removeAudio}><Trash2 className="size-4" /></button></>
            : <span className="text-sm text-slate-500">Bu Part uchun audio hali yo'q (mp3 / wav)</span>}
        </div>)}
      <button className="btn ml-2" onClick={savePart}><Save className="size-4" />Part sozlamalarini saqlash</button>
      <div className="space-y-2">
        {qs.map((q, i) => <QuestionRow key={q.id + '-' + i} q={q} kind={p.kind} onSave={saveQ} onDelete={delQ}
          drag={{ draggable: true, onDragStart: () => setDragId(q.id), onDragOver: e => e.preventDefault(), onDrop: () => drop(q.id) }} />)}
      </div>
      <div className="flex gap-2"><button className="btn-ghost flex items-center gap-1" onClick={add}><Plus className="size-4" />Savol qo'shish</button>
        <button className="btn-ghost flex items-center gap-1" onClick={bulk}><FileJson className="size-4" />JSON import</button></div>
    </div>
  );
}

export default function TestEditor() {
  const { id } = useParams(); const [t, setT] = useState(null);
  const [ver, setVer] = useState(0);
  const load = () => adm.get(`/tests/${id}`).then(r => { setT(r.data); setVer(v => v + 1); });
  useEffect(() => { load(); }, [id]);
  if (!t) return <div className="card h-64 animate-pulse" />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t.title} <span className="text-sm font-normal text-slate-500">{t.type}</span></h1>
        {t.source && <p className="max-w-xl text-xs text-slate-500">Bu test <b>data/{t.source}</b> papkasidan olingan. Savol va javoblarni o'sha fayllarda (partN.txt, answers.txt) o'zgartiring — fayl o'zgarsa, shu Part qayta o'qiladi va bu yerdagi qo'lda o'zgarishlar almashtiriladi.</p>}
      </div>
      {t.parts.map(p => <PartEditor key={p.id + '-' + ver} part={p} reload={load} testType={t.type} />)}
    </div>
  );
}
