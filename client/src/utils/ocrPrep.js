// OCR oldidan rasmni tayyorlash: kattalashtirish + kulrang + qorong'i fonni oqqa aylantirish + kontrastni cho'zish.
// Kichik va past sifatli screenshotlarda aniqlikni keskin oshiradi (sinov: 0.34 -> 0.98).
export async function enhanceImage(file, { maxSide = 4200, watermark = 'auto' } = {}) {
  const bmp = await createImageBitmap(file);
  const scale = Math.max(0.3, Math.min(bmp.width >= 1100 ? 2 : 3, maxSide / Math.max(bmp.width, bmp.height)));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(bmp, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h), d = img.data, n = w * h, g = new Uint8Array(n);
  let sum = 0;
  for (let i = 0, j = 0; i < n; i++, j += 4) { const v = (d[j] * 299 + d[j + 1] * 587 + d[j + 2] * 114) / 1000 | 0; g[i] = v; sum += v; }
  const invert = sum / n < 115;                                   // qorong'i fon (dark mode) -> oq fon
  const hist = new Uint32Array(256);
  for (let i = 0; i < n; i++) { if (invert) g[i] = 255 - g[i]; hist[g[i]]++; }
  const at = (p) => { let acc = 0; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * p) return v; } return 255; };
  // Suv belgisi (watermark): matn qora, belgi esa bitta kulrang daraja (masalan ~160) — gistogrammada aniq "cho'qqi" beradi.
  // Oddiy matnda bunday cho'qqi bo'lmaydi; fon (eng ko'p daraja) esa cho'qqidan ancha och bo'ladi.
  let bgLevel = 255, wm = 0, spike = 0;
  for (let v = 0; v < 256; v++) if (hist[v] > hist[bgLevel]) bgLevel = v;
  for (let v = 100; v <= 195; v++) if (hist[v] > hist[spike]) spike = v;
  if (watermark === 'on' || (watermark === 'auto' && hist[spike] / n >= 0.012 && hist[spike] / n <= 0.15 && bgLevel >= spike + 30)) wm = Math.max(70, Math.min(105, spike - 50));
  const lo = wm ? 0 : at(0.01), span = wm || Math.max(at(0.99) - lo, 1);      // suv belgisi bo'lsa: 0..wm oralig'i oq-qora qilib cho'ziladi, kulrang belgi oqqa aylanadi
  const o = new Uint8Array(n);
  for (let i = 0; i < n; i++) o[i] = Math.max(0, Math.min(255, ((g[i] - lo) / span) * 255));
  // Uzun yupqa gorizontal chiziqlar (gap uchun "________", ajratgichlar) OCR'ni chalg'itadi — o'chiramiz; gap raqamidan topiladi.
  // Chiziq = uzun "oq emas" qator, uning tepasi va pastida esa bo'sh joy bor (matn, rasm foni yoki jadvalga tegmaydi)
  const T = 235, minRun = Math.round(36 * scale), off = Math.max(3, Math.round(2.5 * scale)), cut = [];
  const clean = (y, x0, x1) => { if (y < 0 || y >= h) return true; let bad = 0; for (let x = x0; x < x1; x++) if (o[y * w + x] < T) bad++; return bad <= (x1 - x0) * 0.08; };
  for (let y = 0; y < h; y++) {
    const row = y * w; let x = 0;
    while (x < w) {
      if (o[row + x] < T) { let e = x; while (e < w && o[row + e] < T) e++; if (e - x >= minRun && clean(y - off, x, e) && clean(y + off, x, e)) cut.push([row + x, row + e]); x = e; } else x++;
    }
  }
  for (const [p, q] of cut) o.fill(255, p, q);
  for (let i = 0, j = 0; i < n; i++, j += 4) { d[j] = d[j + 1] = d[j + 2] = o[i]; d[j + 3] = 255; }
  ctx.putImageData(img, 0, 0);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  return { blob, info: { from: `${bmp.width}×${bmp.height}`, to: `${w}×${h}`, scale: +scale.toFixed(1), invert, watermark: wm ? spike : 0, lines: cut.length } };
}
