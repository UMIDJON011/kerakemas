// Sichqonchaning o'ng tugmasi: matn belgilangan bo'lsa — sariq highlight; highlight ustida bosilsa — o'chiriladi
const SKIP = 'input,textarea,select,button,option';
const unwrap = (m) => m.replaceWith(...m.childNodes);
export function toggleHighlight(e) {
  const sel = window.getSelection(), root = e.currentTarget, hit = e.target.closest?.('mark.hl');
  if (!sel || sel.isCollapsed || !root.contains(sel.anchorNode)) { if (hit) { e.preventDefault(); unwrap(hit); } return; }
  const r = sel.getRangeAt(0), c = r.commonAncestorContainer, nodes = [];
  if (c.nodeType === 3) nodes.push(c);
  else { const w = document.createTreeWalker(c, NodeFilter.SHOW_TEXT); while (w.nextNode()) if (r.intersectsNode(w.currentNode)) nodes.push(w.currentNode); }
  e.preventDefault();
  const marks = new Set(nodes.map(n => n.parentElement.closest('mark.hl')).filter(Boolean));
  if (hit) marks.add(hit);
  if (marks.size) { marks.forEach(unwrap); sel.removeAllRanges(); return; }
  nodes.forEach(n => {
    if (n.parentElement.closest(SKIP)) return;
    const s = n === r.startContainer ? r.startOffset : 0, en = n === r.endContainer ? r.endOffset : n.length;
    if (en <= s || !n.data.slice(s, en).trim()) return;
    const g = document.createRange(); g.setStart(n, s); g.setEnd(n, en);
    const m = document.createElement('mark'); m.className = 'hl'; g.surroundContents(m);
  });
  sel.removeAllRanges();
}
