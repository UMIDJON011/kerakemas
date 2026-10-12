import { useRef, useState } from 'react';

const MIN = 25, MAX = 75;
// Ikki ustunli imtihon maketi: o'rtadagi tutqichni chapga yoki o'ngga surish mumkin.
// Sichqoncha/barmoq bilan tortiladi, klaviaturada ← → (Home = asl holat), qo'sh bosish ham asl holatga qaytaradi.
// Tanlangan kenglik har bir maket uchun eslab qolinadi. Tor ekranda (<=1000px) ustunlar ustma-ust turadi.
export default function Split({ name, def = 50, children }) {
  const [a, b] = children, box = useRef(null), [drag, setDrag] = useState(false);
  const [pct, setPct] = useState(() => { let v = NaN; try { v = parseFloat(localStorage.getItem(`split:${name}`)); } catch { /* ruxsat yo'q */ } return v >= MIN && v <= MAX ? v : def; });
  const save = (v) => { const c = Math.round(Math.min(MAX, Math.max(MIN, v)) * 10) / 10; setPct(c); try { localStorage.setItem(`split:${name}`, String(c)); } catch { /* ruxsat yo'q */ } };
  const move = (e) => { const r = box.current.getBoundingClientRect(); save(((e.clientX - r.left) / r.width) * 100); };
  const key = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); save(pct - 2); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); save(pct + 2); }
    else if (e.key === 'Home') { e.preventDefault(); save(def); }
  };
  return (
    <div ref={box} className={`split ${drag ? 'is-drag' : ''}`} style={{ '--l': `${pct}%` }}>
      <div className="split-a">{a}</div>
      <div className="split-h" role="separator" aria-orientation="vertical" aria-label="Oynalar kengligini o'zgartirish: chap va o'ng o'q tugmalari"
        aria-valuemin={MIN} aria-valuemax={MAX} aria-valuenow={Math.round(pct)} tabIndex={0}
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setDrag(true); }}
        onPointerMove={e => { if (drag) move(e); }}
        onPointerUp={() => setDrag(false)} onPointerCancel={() => setDrag(false)}
        onDoubleClick={() => save(def)} onKeyDown={key}><i /></div>
      <div className="split-b">{b}</div>
    </div>
  );
}
