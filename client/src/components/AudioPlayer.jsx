import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Headphones, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import Bubble from './Bubble.jsx';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// plays — shu Part uchun ishlatilgan eshitishlar soni, onPlay — yangi eshitish boshlanganda chaqiriladi
export default function AudioPlayer({ src, plays, limit, onPlay, min = 0.5, max = 2, active = true }) {
  const ref = useRef(), started = useRef(false);
  const [playing, setPlaying] = useState(false), [t, setT] = useState(0), [dur, setDur] = useState(0), [rate, setRate] = useState(1);
  useEffect(() => { if (!active) ref.current?.pause(); }, [active]);
  const left = Math.max(limit - plays, 0);
  if (!src) return <div className="card small-note" style={{ marginBottom: 20, padding: 16 }}>Bu Part uchun audio yuklanmagan.</div>;

  const toggle = () => {
    const a = ref.current;
    if (playing) return a.pause();
    if (!started.current) {
      if (left <= 0) return toast.error(`Eshitish limiti tugadi (${limit} marta)`);
      started.current = true; onPlay();
    }
    a.play();
  };
  const setSpeed = (r) => { setRate(r); ref.current.playbackRate = r; };

  return (
    <div className="player">
      <audio ref={ref} src={src} preload="metadata"
        onLoadedMetadata={e => setDur(e.target.duration)} onTimeUpdate={e => setT(e.target.currentTime)}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); started.current = false; }} />
      <div className="p-row">
        <button type="button" onClick={toggle} className="p-play" aria-label={playing ? "To'xtatish" : 'Eshitish'}>
          {playing ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <input type="range" min={0} max={dur || 0} step={0.1} value={t} className="p-seek" aria-label="Audio holati"
            onChange={e => { ref.current.currentTime = +e.target.value; setT(+e.target.value); }} />
          <div className="p-times"><span>{fmt(t)}</span><span>{fmt(dur)}</span></div>
        </div>
        <button type="button" className="btn-ghost" style={{ padding: 8 }} title="Qayta boshidan" aria-label="Qayta boshidan" onClick={() => { ref.current.currentTime = 0; }}><RotateCcw className="size-4" /></button>
      </div>
      <div className="p-foot">
        <div className="p-left">
          <Headphones className="size-4" />
          <span>Qolgan eshitish: <b style={{ color: left === 0 ? 'var(--pen)' : 'var(--ink)' }}>{left}/{limit}</b></span>
          {limit <= 8 && <span className="bubbles" aria-hidden="true">{Array.from({ length: limit }, (_, i) => <Bubble key={i} size="sm" on={i < left} />)}</span>}
        </div>
        <div className="speeds" role="group" aria-label="Tezlik">
          {RATES.filter(r => r >= min && r <= max).map(r => (
            <button key={r} type="button" onClick={() => setSpeed(r)} aria-pressed={rate === r} className="sp">{r}x</button>))}
        </div>
      </div>
    </div>
  );
}
