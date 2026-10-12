import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../utils/api.js';

// Saytga kirishdan oldin ism va familya so'raladi (parolsiz)
export default function Login({ onDone }) {
  const [f, setF] = useState({ first_name: '', last_name: '' }), [busy, setBusy] = useState(false);
  const go = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const { data } = await api.post('/users/register', f);
      localStorage.user = JSON.stringify(data); localStorage.name = data.name; onDone(data);
    } catch (err) { toast.error(err.response?.data?.error || 'Xatolik'); }
    setBusy(false);
  };
  return (
    <main className="auth">
      <form onSubmit={go} className="sheet auth-card">
        <div className="brand"><span className="logo"><i /></span>CEFR Multilevel</div>
        <div>
          <h1 className="q-title">Imtihonga kirish</h1>
          <p className="lede">Parol shart emas. Natijalaringiz shu ism bilan saqlanadi va ustozga ko'rinadi.</p>
        </div>
        <div>
          <label className="lbl" htmlFor="fn">Ism</label>
          <input id="fn" className="input" autoComplete="given-name" autoFocus value={f.first_name} onChange={e => setF({ ...f, first_name: e.target.value })} />
        </div>
        <div>
          <label className="lbl" htmlFor="ln">Familya</label>
          <input id="ln" className="input" autoComplete="family-name" value={f.last_name} onChange={e => setF({ ...f, last_name: e.target.value })} />
        </div>
        <button className="btn" style={{ width: '100%', padding: '.9rem' }} disabled={busy || !f.first_name.trim() || !f.last_name.trim()}>Davom etish</button>
      </form>
    </main>
  );
}
