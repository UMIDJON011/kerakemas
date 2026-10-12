// Natija qalam bilan yozilgandek chiqadi: "23/35"
export default function PenScore({ sc, tt }) {
  return (
    <span className="pen" role="img" aria-label={`${tt} savoldan ${sc} tasi to'g'ri`}>
      <span className="pen-w" aria-hidden="true">{sc}/{tt}</span>
      <svg viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M2 7 C 22 2, 48 10, 98 4" /></svg>
    </span>
  );
}
