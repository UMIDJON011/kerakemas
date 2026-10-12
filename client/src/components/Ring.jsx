import { useEffect, useId, useState } from 'react';

// Dumaloq progress: value 0..100. Sahifa ochilganda to'lib chiqadi (bir marta)
export default function Ring({ value, size = 190, children }) {
  const gid = 'rg' + useId().replace(/\W/g, ''), [v, setV] = useState(0);
  useEffect(() => { const t = setTimeout(() => setV(Math.max(0, Math.min(100, value))), 120); return () => clearTimeout(t); }, [value]);
  const r = 44;
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(value)} foiz`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3350F2" /><stop offset="1" stopColor="#12C9B3" /></linearGradient></defs>
        <circle className="trk" cx="50" cy="50" r={r} />
        <circle className="val" cx="50" cy="50" r={r} pathLength="1" stroke={`url(#${gid})`} style={{ strokeDashoffset: 1 - v / 100 }} />
      </svg>
      <div className="ring-c">{children}</div>
    </div>
  );
}
