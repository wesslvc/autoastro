import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Bottom sheet. Drag the top area down to dismiss; a quick flick also closes.
 * Stays mounted through the exit animation.
 */
export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);
  const [dy, setDy] = useState(0);
  const drag = useRef<{ y: number; t: number } | null>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(r);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), 320);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);

  if (!mounted) return null;

  const down = (e: React.PointerEvent) => {
    // Let the content scroll; only start a drag from the top of it.
    if (body.current && body.current.scrollTop > 0 && !(e.target as HTMLElement).closest(".sheet-grip")) return;
    if ((e.target as HTMLElement).closest("button, input, a, .slide")) return;
    drag.current = { y: e.clientY, t: performance.now() };
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const d = e.clientY - drag.current.y;
    if (d > 4 && !(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDy(d > 0 ? d : d / 6);
  };
  const up = () => {
    if (!drag.current) return;
    const v = dy / Math.max(1, performance.now() - drag.current.t);
    drag.current = null;
    if (dy > 110 || v > 0.55) onClose();
    setDy(0);
  };

  const dragging = drag.current !== null;
  return (
    <div className="sheet-layer" role="dialog" aria-modal="true" aria-label={label}>
      <div className="sheet-scrim" style={{ opacity: shown ? Math.max(0, 1 - dy / 500) : 0 }} onClick={onClose} />
      <div
        className="sheet"
        style={{ transform: `translateY(${shown ? Math.max(dy, -20) : 0}px)`, ...(shown ? {} : { transform: "translateY(100%)" }), transition: dragging ? "none" : undefined }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <div className="sheet-grip"><span /></div>
        <div className="sheet-body" ref={body}>{children}</div>
      </div>
    </div>
  );
}
