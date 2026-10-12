import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Moon, Sun, LogOut, Home, LayoutGrid, Trophy } from 'lucide-react';
import Landing from './pages/Landing.jsx';
import Tests from './pages/Tests.jsx';
import TakeTest from './pages/TakeTest.jsx';
import Result from './pages/Result.jsx';
import AdminApp from './admin/AdminApp.jsx';
import Login from './pages/Login.jsx';
import { RankingPage } from './components/Ranking.jsx';
import { getUser } from './utils/api.js';

const NAV = [['/', 'Bosh sahifa', Home], ['/tests', 'Testlar', LayoutGrid], ['/ranking', 'Reyting', Trophy]];

function Header({ user, onLogout }) {
  const { pathname } = useLocation();
  const toggle = () => { const d = document.documentElement.classList.toggle('dark'); localStorage.theme = d ? 'dark' : 'light'; };
  const on = (to) => (to === '/' ? pathname === '/' : pathname.startsWith(to));
  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <Link to="/" className="brand"><span className="logo"><i /></span>CEFR Multilevel</Link>
          <nav className="tb-nav" aria-label="Asosiy">
            {NAV.map(([to, label, Icon]) => <Link key={to} to={to} className={`tb-link ${on(to) ? 'is-active' : ''}`} aria-current={on(to) ? 'page' : undefined}><Icon className="size-4" />{label}</Link>)}
          </nav>
          <div className="tb-actions">
            <span className="avatar" aria-hidden="true">{user.first_name?.[0]?.toUpperCase()}</span>
            <span className="tb-name">{user.name}</span>
            <button onClick={onLogout} className="tb-btn" title="Boshqa ism bilan kirish" aria-label="Boshqa ism bilan kirish"><LogOut className="size-[18px]" /></button>
            <button onClick={toggle} className="tb-btn" aria-label="Qorong'i yoki yorug' mavzu"><Sun className="hidden size-[18px] dark:block" /><Moon className="size-[18px] dark:hidden" /></button>
          </div>
        </div>
      </header>
      <nav className="tabbar" aria-label="Pastki menyu">
        {NAV.map(([to, label, Icon]) => <Link key={to} to={to} className={on(to) ? 'is-active' : ''} aria-current={on(to) ? 'page' : undefined}><Icon className="size-5" />{label}</Link>)}
      </nav>
    </>
  );
}

export default function App() {
  const { pathname } = useLocation(), [user, setUser] = useState(getUser);
  const admin = pathname.startsWith('/admin'), exam = pathname.startsWith('/test/');
  const logout = () => { localStorage.removeItem('user'); localStorage.removeItem('name'); setUser(null); };
  return (
    <>
      <div className={`aurora ${exam ? 'calm' : ''}`} aria-hidden="true"><i /><i /><i /></div>
      {!user && !admin ? <Login onDone={setUser} /> : (    // sayt ism-familyasiz ochilmaydi
        <>
          {!exam && !admin && <Header user={user} onLogout={logout} />}
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/tests" element={<Tests />} />
            <Route path="/test/:id" element={<TakeTest />} />
            <Route path="/admin/*" element={<AdminApp />} />
            <Route path="/result" element={<Result />} />
            <Route path="/ranking" element={<RankingPage />} />
          </Routes>
        </>)}
    </>
  );
}
