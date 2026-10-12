import { useState } from 'react';
import { NavLink, Route, Routes, Link } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Settings, LogOut, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../utils/api.js';
import Dashboard from './Dashboard.jsx';
import TestsManager from './TestsManager.jsx';
import TestEditor from './TestEditor.jsx';
import { UsersPage, SettingsPage } from './UsersSettings.jsx';
import { ResultsPage } from './Results.jsx';

function Login({ onOk }) {
  const [f, setF] = useState({ username: '', password: '' });
  const go = async (e) => {
    e.preventDefault();
    try { const { data } = await api.post('/auth/login', f); localStorage.adminToken = data.token; onOk(); }
    catch (err) { toast.error(err.response?.data?.error || 'Xatolik'); }
  };
  return (
    <main className="auth">
      <div style={{ width: '100%', display: 'grid', placeItems: 'center' }}>
        <form onSubmit={go} className="sheet auth-card">
          <div className="brand"><span className="logo"><i /></span>CEFR Admin</div>
          <h2 className="q-title">Admin kirish</h2>
          <div><label className="lbl" htmlFor="au">Login</label><input id="au" className="input" autoComplete="username" autoFocus value={f.username} onChange={e => setF({ ...f, username: e.target.value })} /></div>
          <div><label className="lbl" htmlFor="ap">Parol</label><input id="ap" className="input" type="password" autoComplete="current-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></div>
          <button className="btn" style={{ width: '100%', padding: '.85rem' }}>Kirish</button>
        </form>
      </div>
    </main>
  );
}

const NAV = [['', 'Dashboard', LayoutDashboard], ['tests', 'Testlar', FileText], ['results', 'Natijalar', ClipboardList], ['users', "O'quvchilar", Users], ['settings', 'Sozlamalar', Settings]];

export default function AdminApp() {
  const [authed, setAuthed] = useState(!!localStorage.adminToken);
  if (!authed) return <Login onOk={() => setAuthed(true)} />;
  const out = () => { localStorage.removeItem('adminToken'); setAuthed(false); };
  const link = ({ isActive }) => `anav ${isActive ? 'is-active' : ''}`;
  return (
    <div className="flex min-h-screen">
      <aside className="aside sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-1 p-4 md:flex">
        <Link to="/admin" className="brand mb-5"><span className="logo"><i /></span>CEFR Admin</Link>
        {NAV.map(([to, label, Icon]) => (
          <NavLink key={to} to={`/admin/${to}`} end={to === ''} className={link}><Icon className="size-5" />{label}</NavLink>))}
        <button type="button" className="anav mt-auto" onClick={out}><LogOut className="size-5" />Chiqish</button>
      </aside>
      <div className="min-w-0 flex-1">
        <nav className="amobile md:hidden" aria-label="Admin bo'limlari">
          {NAV.map(([to, label, Icon]) => <NavLink key={to} to={`/admin/${to}`} end={to === ''} className={link}><Icon className="size-5" />{label}</NavLink>)}
          <button type="button" className="anav" style={{ width: 'auto' }} onClick={out}><LogOut className="size-5" />Chiqish</button>
        </nav>
        <main className="p-6">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="tests" element={<TestsManager />} />
            <Route path="tests/:id" element={<TestEditor />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
