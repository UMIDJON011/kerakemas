// CEFR daraja belgisi: har daraja o'z rangiga ega (A1 kulrang ... C2 oltin), rang bilan birga matn ham bor
export default function LevelBadge({ level, xl = false }) {
  if (!level) return null;
  return <span className={`lvl lvl-${level.toLowerCase()} ${xl ? 'lvl-xl' : ''}`} aria-label={`CEFR daraja ${level}`}>{level}</span>;
}
