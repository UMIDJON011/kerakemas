import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, Headphones, Layers, Maximize, Timer, Highlighter, ArrowRight, Clock } from 'lucide-react';
import LevelBadge from '../components/LevelBadge.jsx';
import Bubble from '../components/Bubble.jsx';
import { api, getUser, CEFR } from '../utils/api.js';

const box = { hidden: {}, show: { transition: { staggerChildren: .09 } } };
const rise = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: .55, ease: [.2, .8, .2, 1] } } };

const TYPES = [
  ['reading', BookOpen, 'Only Reading', "5 ta Part: bo'sh joylar, e'lonlar, sarlavhalar, True/False va xulosa. Matnni belgilab o'qing.", ['5 part', '35 savol', '60 daqiqa']],
  ['listening', Headphones, 'Only Listening', "6 ta Part. Audio tezligini sozlang, eshitish soni cheklangan, xuddi real imtihondagidek.", ['6 part', '35 savol', '60 daqiqa']],
  ['mock', Layers, 'Full Mock', "Listening va Reading ketma-ket, tasodifiy testlar bilan. Natija umumiy reytingga qo'shiladi.", ['2 bo\'lim', '70 savol', '2 soat']],
];
const FEATS = [
  [Maximize, "To'liq ekran nazorati", "Test to'liq ekranda ochiladi. Chiqib ketsangiz, ustoz kodisiz davom etib bo'lmaydi."],
  [Timer, 'Aniq vaqt hisobi', "Taymer sahifa yangilansa ham to'xtamaydi. Vaqt tugasa test o'zi topshiriladi."],
  [Headphones, 'Audio limiti', "Har Part uchun eshitishlar soni sanaladi, tezlikni 0.5x dan 2x gacha o'zgartirish mumkin."],
  [Highlighter, 'Matnni belgilash', "Kerakli joyni belgilab, o'ng tugma bilan sariq highlight qo'ying, yana bossangiz o'chadi."],
];

export function StatsStrip({ stats }) {
  const items = stats && [[stats.tests, 'Tayyor testlar'], [stats.students, "O'quvchilar"], [stats.attempts, 'Topshirilgan urinishlar'], [`${stats.avg}%`, "O'rtacha natija"]];
  return (
    <div className="glass stats-row" aria-busy={!stats}>
      {(items || [0, 1, 2, 3]).map((it, i) => (
        <div key={i} className="stat-tile">
          {items ? <><div className="stat-n">{it[0]}</div><div className="stat-l">{it[1]}</div></>
            : <><div className="skel" style={{ height: 38, width: '55%' }} /><div className="skel" style={{ height: 14, width: '80%', marginTop: 12 }} /></>}
        </div>))}
    </div>
  );
}

export default function Landing() {
  const user = getUser(), [stats, setStats] = useState(null), [failed, setFailed] = useState(false);
  useEffect(() => { api.get('/stats').then(r => setStats(r.data)).catch(() => setFailed(true)); }, []);
  return (
    <main className="wrap">
      <motion.section className="hero2" variants={box} initial="hidden" animate="show">
        <div>
          <motion.div variants={rise} className="hello"><span className="avatar" aria-hidden="true">{user?.first_name?.[0]?.toUpperCase()}</span>Salom, {user?.first_name}</motion.div>
          <motion.h1 variants={rise}>Real imtihon formatida <span className="gtext">mashq qiling</span></motion.h1>
          <motion.p variants={rise} className="hero2-lead">CEFR Multilevel uchun Reading va Listening mocklar. Natijangiz darajaga aylanadi: qaysi Part zaifligini va keyingi darajaga nima yetishmasligini ko'rasiz.</motion.p>
          <motion.div variants={rise} className="hero2-cta">
            <Link to="/tests" className="btn">Testni boshlash <ArrowRight className="size-4" /></Link>
            <Link to="/ranking" className="btn-ghost">Reytingni ko'rish</Link>
          </motion.div>
        </div>
        <motion.div variants={rise} className="glass demo" aria-hidden="true">
          <div className="demo-top">
            <div><div className="demo-title">Reading, Part 4</div><div className="demo-sub">Imtihon muhiti namunasi</div></div>
            <span className="timer"><Clock className="size-[18px]" />42:18</span>
          </div>
          <div className="demo-bar"><i /></div>
          <p className="demo-q">What is the main idea of the second paragraph?</p>
          {['It describes how the habit began', 'It explains why people stopped', 'It compares two different cities'].map((t, i) => (
            <div key={t} className={`demo-o ${i === 1 ? 'is-on' : ''}`}><Bubble on={i === 1}>{'ABC'[i]}</Bubble>{t}</div>))}
        </motion.div>
      </motion.section>

      {!failed && <section className="sect" style={{ paddingTop: 8 }} aria-label="Platforma statistikasi"><StatsStrip stats={stats} /></section>}

      <section className="sect">
        <div className="sect-h"><h2>Qaysi formatda mashq qilmoqchisiz?</h2><p>Har bir bo'lim real imtihon tuzilmasiga mos: bir xil Part'lar, bir xil vaqt.</p></div>
        <div className="types">
          {TYPES.map(([type, Icon, title, text, meta]) => (
            <motion.div key={type} whileHover={{ y: -4 }} transition={{ duration: .2 }}>
              <Link to={`/tests?type=${type}`} className="glass tcard">
                <span className="ticon"><Icon className="size-6" /></span>
                <h3>{title}</h3><p>{text}</p>
                <div className="tmeta">{meta.map(m => <span key={m}>{m}</span>)}</div>
                <span className="tgo">Boshlash <ArrowRight className="size-4" /></span>
              </Link>
            </motion.div>))}
        </div>
      </section>

      <section className="sect">
        <div className="sect-h"><h2>Natijangiz CEFR darajasiga aylanadi</h2><p>To'liq mock natijasi to'g'ri javoblar foiziga qarab A1 dan C2 gacha baholanadi.</p></div>
        <div className="lvl-strip">
          {CEFR.map(l => (
            <div key={l.id} className="glass lvl-cell"><LevelBadge level={l.id} /><b>{l.name}</b><small className="lvl-r">{l.id === 'C2' ? `${l.min}% va yuqori` : `${l.min}–${l.max}%`}</small></div>))}
        </div>
      </section>

      <section className="sect">
        <div className="sect-h"><h2>Diqqatni chalg'itmaydigan imtihon muhiti</h2><p>Test paytida ortiqcha bezak yo'q. Faqat savollar, taymer va javoblar paneli.</p></div>
        <div className="feat">
          {FEATS.map(([Icon, t, d]) => (
            <div key={t} className="glass feat-i"><span className="ticon" style={{ width: 48, height: 48, borderRadius: 16 }}><Icon className="size-5" /></span><h3>{t}</h3><p>{d}</p></div>))}
        </div>
      </section>

      <section className="glass cta">
        <h2>Birinchi mock testingizni hoziroq boshlang</h2>
        <Link to="/tests" className="btn">Testlarga o'tish <ArrowRight className="size-4" /></Link>
      </section>
    </main>
  );
}
