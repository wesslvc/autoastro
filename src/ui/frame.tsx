import { useEffect, useRef, useState } from "react";

const src = (v: number) => `/api/image/latest?v=${v}`;

export function Frame({ version, count, progress }: { version: number; count?: number; progress?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="frame" onClick={() => version > 0 && setOpen(true)} aria-label={version > 0 ? "프레임 크게 보기" : "프레임 없음"}>
        {version > 0 ? <img src={src(version)} alt="" /> : <span className="frame-empty">아직 촬영된 프레임이 없습니다</span>}
        {count != null && version > 0 && <span className="frame-tag">#{count}</span>}
        {version > 0 && <span className="frame-tag right">눌러서 크게</span>}
        {!!progress && <span className="frame-bar" style={{ width: `${progress}%` }} />}
      </button>
      {open && <Viewer version={version} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Full-screen frame. Double-tap zooms, drag pans when zoomed, drag down closes. */
function Viewer({ version, onClose }: { version: number; onClose: () => void }) {
  const [z, setZ] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dy, setDy] = useState(0);
  const [shown, setShown] = useState(false);
  const g = useRef<{ x: number; y: number; px: number; py: number; t: number } | null>(null);
  const lastTap = useRef(0);

  useEffect(() => {
    requestAnimationFrame(() => setShown(true));
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);
  const close = () => { setShown(false); setTimeout(onClose, 220); };

  return (
    <div className="viewer" style={{ opacity: shown ? 1 - Math.min(0.6, dy / 400) : 0 }}
      onPointerDown={(e) => {
        const now = performance.now();
        if (now - lastTap.current < 280) {
          if (z > 1) { setZ(1); setPan({ x: 0, y: 0 }); }
          else {
            const r = e.currentTarget.getBoundingClientRect();
            setZ(2.5);
            setPan({ x: (r.width / 2 - e.clientX) * 1.5, y: (r.height / 2 - e.clientY) * 1.5 });
          }
          lastTap.current = 0;
          return;
        }
        lastTap.current = now;
        e.currentTarget.setPointerCapture(e.pointerId);
        g.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, t: now };
      }}
      onPointerMove={(e) => {
        if (!g.current) return;
        if (z > 1) setPan({ x: g.current.px + e.clientX - g.current.x, y: g.current.py + e.clientY - g.current.y });
        else setDy(Math.max(0, e.clientY - g.current.y));
      }}
      onPointerUp={() => {
        if (!g.current) return;
        const v = dy / Math.max(1, performance.now() - g.current.t);
        g.current = null;
        if (z === 1 && (dy > 120 || v > 0.6)) close();
        else setDy(0);
      }}
    >
      <img src={src(version)} alt="최근 촬영 프레임" draggable={false}
        style={{ transform: `translate(${pan.x}px, ${pan.y + dy}px) scale(${z * (1 - Math.min(0.15, dy / 1500))})`, transition: g.current ? "none" : undefined }} />
      <button type="button" className="viewer-close" onPointerDown={(e) => e.stopPropagation()} onClick={close}>닫기</button>
      <span className="viewer-hint">두 번 눌러 확대 · 아래로 밀어 닫기</span>
    </div>
  );
}
