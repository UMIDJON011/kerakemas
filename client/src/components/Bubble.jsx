// Javoblar varag'idagi doiracha. on = tanlangan (qora to'ldirilgan), done = javob berilgan (sariq marker bilan chizilgan)
export default function Bubble({ on = false, done = false, size = 'md', children, className = '' }) {
  const sz = size === 'sm' ? 'bubble-sm' : size === 'lg' ? 'bubble-lg' : '';
  return <span aria-hidden="true" className={`bubble ${sz} ${on ? 'is-on' : ''} ${done ? 'is-done' : ''} ${className}`}>{children}</span>;
}
