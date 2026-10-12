// Screenshot -> matn (tesseract.js). Jarayon loglari emit() orqali admin panelga oqib boradi.
import path from 'path';
import { fileURLToPath } from 'url';
import { createWorker } from 'tesseract.js';

const cachePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '.tessdata');   // til fayli bir marta yuklanib, shu yerda saqlanadi
const STATUS = {
  'loading tesseract core': 'OCR dvigateli yuklanmoqda',
  'initializing tesseract': 'OCR ishga tushmoqda',
  'loading language traineddata': 'Ingliz tili ma\'lumotlari yuklanmoqda (birinchi marta internet kerak)',
  'initializing api': 'OCR tayyorlanmoqda',
  'recognizing text': 'Matn taniyapman' };
let worker, sink = null, chain = Promise.resolve();

const run = async (buffers, emit, psm = 6) => {
  let lastS = '', lastP = -1;
  sink = (m) => {                         // tesseract jarayoni: status + foiz (har 10% da bir marta)
    const p = Math.round((m.progress || 0) * 100);
    if (m.status !== lastS || p >= lastP + 10 || p === 100) { lastS = m.status; lastP = p; emit({ msg: `${STATUS[m.status] || m.status}${m.progress != null ? ` ${p}%` : ''}` }); }
  };
  try {
    if (!worker) { emit({ msg: 'OCR dvigateli yuklanmoqda…' }); worker = await createWorker('eng', 1, { logger: (m) => sink?.(m), cachePath }); }
    // 6 = bitta bir xil matn bloki (ko'pchilik testlar uchun eng aniq), 3 = avtomatik (ko'p ustunli sahifa)
    await worker.setParameters({ tessedit_pageseg_mode: String(psm), preserve_interword_spaces: '1', user_defined_dpi: '300' });
    const texts = [];
    for (let i = 0; i < buffers.length; i++) {
      emit({ msg: `Rasm ${i + 1}/${buffers.length} o'qilmoqda (${Math.round(buffers[i].length / 1024)} KB)` });
      lastS = ''; lastP = -1;
      const { data } = await worker.recognize(buffers[i]);
      const text = (data.text || '').trim();
      emit({ msg: `Rasm ${i + 1}: ${text.length} belgi, ${text.split('\n').filter(l => l.trim()).length} qator, ishonchlilik ${Math.round(data.confidence)}%` });
      if (data.confidence < 80) emit({ msg: `⚠ Ishonchlilik past (${Math.round(data.confidence)}%). Rasmni kattaroq/aniqroq oling yoki "Ko'p ustun" rejimini sinang. Natijani tekshiring` });
      texts.push(text);
    }
    return texts.join('\n\n');
  } catch (e) {
    worker = null;                          // keyingi urinishda qayta yaratiladi
    throw e;
  } finally { sink = null; }
};
// So'rovlar navbat bilan ishlanadi (bitta OCR dvigateli)
export const ocrImages = (buffers, emit, psm) => (chain = chain.then(() => run(buffers, emit, psm), () => run(buffers, emit, psm)));
