// Ism/familya normalizatsiyasi: "ali  VALIYEV" -> "Ali Valiyev" (bir xil o'quvchi har safar bitta yozuvga tushadi)
export const canonName = (s) => String(s ?? '').trim().replace(/\s+/g, ' ')
  .split(' ').map(w => w.split('-').map(p => p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p).join('-')).join(' ');
export const validName = (s) => s.length >= 2 && s.length <= 40 && /^[\p{L}][\p{L}\p{M}'‘’`ʻʼ\-. ]*$/u.test(s);
