import axios from 'axios';
export const api = axios.create({ baseURL: '/api' });
// CEFR darajalari: chegaralar serverdagi cefrOf() bilan bir xil (foiz bo'yicha)
export const CEFR = [
  { id: 'A1', min: 0, max: 25, name: 'Beginner' }, { id: 'A2', min: 25, max: 40, name: 'Elementary' }, { id: 'B1', min: 40, max: 55, name: 'Intermediate' },
  { id: 'B2', min: 55, max: 70, name: 'Upper-Intermediate' }, { id: 'C1', min: 70, max: 85, name: 'Advanced' }, { id: 'C2', min: 85, max: 100, name: 'Proficient' },
];
export const levelOf = (p) => CEFR.find(l => p < l.max) || CEFR[5];
export const nextLevel = (p) => { const i = CEFR.indexOf(levelOf(p)); return i < 5 ? { ...CEFR[i + 1], need: +(CEFR[i].max - p).toFixed(1) } : null; };

// Admin so'rovlari: JWT avtomatik qo'shiladi, 401 bo'lsa chiqib ketadi
export const adm = axios.create({ baseURL: '/api/admin' });
adm.interceptors.request.use(c => { c.headers.Authorization = `Bearer ${localStorage.adminToken}`; return c; });
adm.interceptors.response.use(r => r, e => { if (e.response?.status === 401) { localStorage.removeItem('adminToken'); location.href = '/admin'; } return Promise.reject(e); });

// "2026-10-03 15:03:42" (UTC) -> mahalliy vaqt
export const fmtDate = (s) => { const d = new Date(String(s || '').replace(' ', 'T') + 'Z'); return isNaN(d) ? s : d.toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }); };
export const getUser = () => { try { const u = JSON.parse(localStorage.user || 'null'); return u?.first_name ? u : null; } catch { return null; } };
