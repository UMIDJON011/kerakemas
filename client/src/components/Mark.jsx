// Ishlatilgan variant harfi: ustiga chiziladi, tepasida qaysi savolga qo'yilgani (raqam) qizil qalamda chiqadi
export default function Mark({ id, n, className = '', gap = 'mr' }) {
  return (
    <span className={`mk ${n ? 'is-struck' : ''} ${gap === '' ? 'mr-0' : ''}`}>
      {n && <span className="mk-n">{n}</span>}
      <b className={className}>{id}</b>
    </span>
  );
}
