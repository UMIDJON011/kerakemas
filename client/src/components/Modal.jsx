import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select, textarea, [tabindex]:not([tabindex="-1"])';

// Dialog: ochilganda fokus ichiga o'tadi, Tab ichida aylanadi, Esc yoki fon bosilsa yopiladi, yopilganda fokus joyiga qaytadi
export default function Modal({ open, onClose, labelledBy, wide = false, children }) {
  const box = useRef(null);
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement;
    const t = setTimeout(() => (box.current?.querySelector('[data-autofocus]') || box.current?.querySelector(FOCUSABLE))?.focus(), 30);
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose();
      if (e.key !== 'Tab') return;
      const els = [...box.current.querySelectorAll(FOCUSABLE)]; if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); back?.focus?.(); };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .18 }}
          onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
          <motion.div ref={box} role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={`modal ${wide ? 'modal-wide' : ''}`}
            initial={{ opacity: 0, y: 18, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: .98 }} transition={{ duration: .24, ease: [.2, .8, .2, 1] }}>
            {children}
          </motion.div>
        </motion.div>)}
    </AnimatePresence>
  );
}
