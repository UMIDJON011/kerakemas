// Part matnini (partN.txt) savol / variant / ko'rsatma tuzilmasiga aylantiradi. Tashqi kutubxonasiz — alohida test qilinadi.
const L = (i) => String.fromCharCode(65 + i);
const flat = (s) => s.replace(/\s+/g, ' ').trim();
const clean = (s) => s.split('\n').map(l => l.trim()).filter(Boolean).join('\n');

// ── Matnni tozalash: PDF'dan ko'chirilgan sahifa sarlavhalari, raqamlari, egri tirnoqlar ──
const JUNK = [/^\s*practice\s*test\s*\d*\s*$/i, /^\s*mock\s*book\s*$/i, /^\s*(listening\s*reading|reading\s*listening)\s*$/i, /^\s*page\s*\d+(\s*(of|\/)\s*\d+)?\s*$/i, /^\s*\d{1,2}\s*$/];
const fixNoise = (s) => s.replace(/\r/g, '').replace(/\f/g, '\n').replace(/[\u00a0\u200b]/g, ' ')
  .replace(/[‘’`´]/g, "'").replace(/[“”]/g, '"').replace(/GOOD LUCK!/g, ' ')
  .replace(/[ \t]+/g, ' ').replace(/(^|\s)\|(?=\s|$)/g, '$1I')
  .replace(/^(\W{0,2}[A-D]\s*[)\]]\s*)1(?=\s+[a-z])/gm, '$1I')
  .split('\n').filter(l => !JUNK.some(r => r.test(l))).join('\n');

// ── Ko'rsatma (instructions) ajratish ──
const INSTR = /^(part\s*\d|you will|you are|you have|you hear|you must|you can|choose|mark|read|listen|answer|write|complete|look at|tick|circle|match|for each|for questions?|fill|decide|questions?\s*\d|there are|there is|use the|select|each|do not|please|note|all |both )/i;
const PART_TITLE = /^part\s*\d+\s*[:.-]?\s*$/i;
const ITEM_START = /^(\d{1,2}\s*[.)]\s*\S|\d{1,2}\s+\W{0,2}[A-D]\s*[)\]}.:]|\W{0,2}[A-J]\s*[)\]}.:]\s|list of)/i;   // "1. ", "4 A)", "A) ", "List of ..."
function takeInstructions(text) {
  const lines = text.split('\n').map(l => l.trim());
  let i = 0; while (i < lines.length && !lines[i]) i++;
  if (i >= lines.length || !INSTR.test(lines[i])) return { instructions: '', rest: text };
  const ins = [];
  while (i < lines.length) {
    const l = lines[i];
    if (l) {
      if (ITEM_START.test(l) || /_{3,}|\.{4,}|…{2,}/.test(l)) break;
      ins.push(l); i++;
      const nx = lines.slice(i).find(Boolean);
      if (nx && (!/[.!?:)]$/.test(l) || INSTR.test(nx))) continue;      // gap tugamagan yoki keyingi qator ham ko'rsatma
      break;
    }
    i++;
  }
  return { instructions: flat(ins.filter(l => !PART_TITLE.test(l)).join(' ')), rest: lines.slice(i).join('\n') };
}

// ── Raqamlangan bandlar ──
const NUM_A = /^(\d{1,2})\s*[.)]?\s+(?=\W{0,2}[A-D]\s*[)\]}.:])/;       // "4 A) ..." (nuqta tushib qolgan)
const NUM = /^(\d{1,2})\s*[.)]\s*(?=[A-Za-z(“"'])(\S.*)$/;             // "1. text", "19.hotel ..."
const NUM_ONLY = /^(\d{1,2})\s*[.)]\s*$/;
const MARK = /^\W{0,2}([A-D])\s*[)\]}.:]\s*(.*)$/;
const items = (text) => { const p = text.split(/^\s*(\d{1,2})\s*[.)]\s*(?=[A-Za-z("'])/m), o = []; for (let i = 1; i < p.length; i += 2) o.push(p[i + 1]); return o; };
function bank(text) {                       // A) ... B) ... ketma-ket variantlar banki
  const out = []; let next = 0;
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-J])\s*[.)]?\s+(\S.*)$/);
    if (m && m[1] === L(next)) { out.push({ id: m[1], text: m[2].trim() }); next++; }
    else if (out.length && line.trim()) out[out.length - 1].text += ' ' + line.trim();
  }
  return out;
}
const SKIP = /^(extract\s+(one|two|three|four|\d)\b|you hear\b)/i;       // Listening Part 5: "Extract One / You hear ..."

// A) B) C) variantli savollar. Raqamsiz yoki raqami o'qilmagan savollar ham: "A)" qayta boshlansa — yangi savol
function parseChoices(text) {
  const head = [], list = []; let cur = null, last = 0;
  const open = (n, stem) => { cur = { n, stem: stem ? [stem] : [], opts: [] }; list.push(cur); last = n; };
  const okNum = (n) => (last ? n === last + 1 : n >= 1 && n <= 45);
  const src = text.replace(/(\S)[ ]+(?=[B-D][)\]]\s)/g, '$1\n');      // bir qatordagi "A) yes B) no C) maybe"
  for (const raw of src.split('\n')) {
    let line = raw.trim(), m;
    if (!line) { if (!cur) head.push(''); continue; }
    if (SKIP.test(line)) continue;
    if ((m = line.match(NUM_A)) && okNum(+m[1])) { open(+m[1]); line = line.slice(m[0].length); }
    else if ((m = line.match(NUM)) && okNum(+m[1])) { open(+m[1], m[2]); continue; }
    else if ((m = line.match(NUM_ONLY)) && okNum(+m[1])) { open(+m[1]); continue; }
    if ((m = line.match(MARK))) {
      if (m[1] === 'A' && (!cur || cur.opts.length)) open(last + 1);
      if (cur && m[1] === L(cur.opts.length)) { cur.opts.push(m[2]); continue; }
    }
    if (!cur) head.push(line);
    else if (cur.opts.length) cur.opts[cur.opts.length - 1] += ' ' + line;
    else cur.stem.push(line);
  }
  return { head: head.join('\n'), list };
}
const TF = /^(true|false|no information|not given)$/i;

// "For questions 21-24, ..." bo'yicha: [maqola, guruh1, guruh2...]
const FOR_Q = /^\s*for\s+questions?\s*\d+/i;
function splitGroups(text) {
  const lines = text.split('\n'), idx = lines.map((l, i) => FOR_Q.test(l) ? i : -1).filter(i => i >= 0);
  if (!idx.length) return { head: text, groups: [] };
  return { head: lines.slice(0, idx[0]).join('\n'), groups: idx.map((s, k) => lines.slice(s, idx[k + 1] ?? lines.length).join('\n')) };
}
const GAP = /\(?\b(\d{1,2})\)?\s*[.)]?\s*(?:_+|\.{4,}|…+|[-–—]{3,})/g;     // (9) ……… | 30.______ | (1)_____
// OCR ba'zan chiziqchalarni o'qimaydi yoki yarmini o'qiydi: "both 1. and", "(2) _ are", "(5) a _ to". Ketma-ket raqamlar (1,2,3…) = gaplar,
// raqamdan keyingi chiziqcha/nuqta qoldiqlari ham gapga kiradi
const GAP_NUM = /\((\d{1,2})\)((?:\s*(?:_+|…+|\.{3,}|[-–—]{2,}))*)|(?<![\w.(])(\d{1,2})[.)](?:(?=\s|[,;:!?'"]|$)|(?=[_…-]))((?:\s*(?:_+|…+|\.{3,}|[-–—]{2,}))*)/g;
function markGaps(t, n0 = 0) {
  if ((t.match(/^\s*[A-D]\s*[)\]]\s/gm) || []).length >= 2) return { s: t, n: n0 };      // variantli (A) B)) matnda raqamlar savol raqami — gap emas
  let want = null, k = n0;
  const s2 = t.replace(GAP_NUM, (m, a, ta, b, tb) => {
    const num = +(a ?? b); want ??= num;
    if (num !== want) return m; want++; return `[[${++k}]]`;
  });
  if (k - n0 >= 2) return { s: s2, n: k };
  let n = n0; const s = t.replace(GAP, () => `[[${++n}]]`);        // raqamsiz yoki bitta gap: oddiy chiziqcha belgilari bo'yicha
  return { s, n };
}

// Part matnini turiga qarab tuzilmaga aylantiradi (javoblarsiz)
export function parsePart(kind, raw) {
  const lead = takeInstructions(fixNoise(raw)), text = lead.rest, content = {}, qs = [], ins = [lead.instructions];
  const push = (data, answer = '') => qs.push({ data, answer });
  const addChoices = (t) => {
    const { head, list } = parseChoices(t);
    for (const it of list) {
      const stem = flat(it.stem.join(' ')), opts = it.opts.map(flat).filter(Boolean);
      if (opts.length === 3 && opts.every(o => TF.test(o))) push({ text: stem });                 // True / False / No Information
      else if (opts.length >= 2) push({ text: stem, options: opts });
      else if (kind === 'mc_tfng' && stem) push({ text: stem });
    }
    return head;
  };
  if (kind === 'gap_fill') {
    const { s, n } = markGaps(text); if (n) content.text = clean(s);
    for (let i = 0; i < n; i++) push({ text: '' }, []);
  } else if (kind === 'mc') {
    addChoices(text);
  } else if (kind === 'mc_tfng' || kind === 'summary_gap') {
    const { head, groups } = splitGroups(text);
    if (!groups.length) { const h = addChoices(text); if (clean(h)) content.text = clean(h); }
    else {
      content.text = clean(head);
      for (const g of groups) {
        const t = takeInstructions(g); ins.push(t.instructions);
        const { s, n } = markGaps(t.rest, 0);
        if (n && kind === 'summary_gap') { content.summary = clean(s); for (let i = 0; i < n; i++) push({ text: '' }, []); }
        else addChoices(t.rest);
      }
    }
  } else if (kind === 'matching_ads') {
    const first = text.search(/^\s*\d{1,2}\s*[.)]\s*\S/m);
    let opts = bank(first > 0 ? text.slice(0, first) : text); if (opts.length < 2) opts = bank(text);
    content.options = opts;
    items(first >= 0 ? text.slice(first) : '').forEach(c => { const [t, ...b] = c.split('\n'); push({ text: flat([t.trim(), flat(b.join(' '))].filter(Boolean).join(' — ')) }); });
  } else if (kind === 'heading_matching') {
    const lines = text.split('\n'), isNum = (l) => /^\s*\d{1,2}\s*[.)]\s*\S/.test(l);
    const s = lines.findIndex(isNum); let e = s;
    if (s >= 0) { for (let i = s; i < lines.length; i++) { if (isNum(lines[i])) e = i; else if (lines[i].trim()) break; } }
    const before = s >= 0 ? lines.slice(0, s).join('\n') : text, after = s >= 0 ? lines.slice(e + 1).join('\n') : '';
    content.options = bank(before);
    if (s >= 0) lines.slice(s, e + 1).filter(isNum).forEach(l => push({ text: flat(l.replace(/^\s*\d{1,2}\s*[.)]\s*/, '')) }));
    if (clean(after)) content.text = clean(after);
  } else if (kind === 'multi_matching' || kind === 'map_label') {
    const first = text.search(/^\s*\d{1,2}\s*[.)]\s*\S/m);
    content.options = bank(text);
    items(text).forEach(c => push({ text: flat(c.split('\n')[0]) }));
    if (kind === 'map_label' && content.options.length < 2) content.options = [...'ABCDEFGH'].map(id => ({ id, text: '' }));
    if (kind === 'multi_matching' && first < 0) content.options = [];
  }
  return { content, questions: qs, instructions: flat(ins.filter(Boolean).join(' ')) };
}

// "1. B  2. B ... 9. sign up" -> { 1:'B', ... } (har raqamning birinchi uchrashi)
export function parseKey(text) {
  const m = {};
  for (const [, n, a] of fixNoise(text).matchAll(/(?:^|\s)(\d{1,2})\s*[.)]\s*(\S.*?)(?=\s+\d{1,2}\s*[.)]\s|\n|$)/g)) if (!(n in m)) m[n] = a.trim();
  return m;
}
export const variants = (a) => {
  const s = new Set([a]); a.split('/').forEach(x => s.add(x.trim()));
  [...s].forEach(x => { if (x.includes('(s)')) { s.add(x.replace('(s)', '')); s.add(x.replace('(s)', 's')); } });
  return [...s].filter(Boolean);
};
