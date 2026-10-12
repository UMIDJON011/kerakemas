import LevelBadge from './LevelBadge.jsx';

// Mock imtihon natijasi sertifikati (ko'rinish uchun). window.print() faqat shu blokni chop etadi
export default function Certificate({ name, level, pct, sections, code, date }) {
  return (
    <div className="cert cert-print">
      <div className="cert-k">CEFR MULTILEVEL MOCK</div>
      <h2>Imtihon natijasi sertifikati</h2>
      <p style={{ marginTop: 14, color: 'var(--fg-2)' }}>Ushbu hujjat quyidagi ishtirokchining natijasini tasdiqlaydi</p>
      <div className="cert-name">{name}</div>
      <div className="cert-lv"><LevelBadge level={level.id} xl /></div>
      <p style={{ color: 'var(--fg-2)' }}>{level.name}, umumiy natija <b style={{ color: 'var(--fg)' }}>{pct}%</b></p>
      <div className="cert-rows" style={{ marginTop: 18 }}>
        {sections.map(s => <span key={s.label}>{s.label}: <b>{s.score}/{s.total}</b></span>)}
      </div>
      <div className="cert-foot">
        <span>Sana: {date}</span><span>Raqam: {code}</span>
        <span style={{ flexBasis: '100%' }}>Bu mock imtihon natijasi. Rasmiy CEFR sertifikati emas.</span>
      </div>
    </div>
  );
}
