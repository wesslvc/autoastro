import { useEffect, useRef, useState, type ReactNode } from "react";
import { buzz } from "../lib/settings";

export function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="toggle-row">
      <span>
        <b>{label}</b>
        {hint && <small>{hint}</small>}
      </span>
      <button type="button" role="switch" aria-checked={on} aria-label={label} className="switch"
        onClick={() => { buzz(8); onChange(!on); }} />
    </label>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange, label }: { value: T; options: { v: T; l: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  const i = Math.max(0, options.findIndex((o) => o.v === value));
  return (
    <div className="seg" role="radiogroup" aria-label={label} style={{ "--n": options.length } as React.CSSProperties}>
      <i style={{ transform: `translateX(${i * 100}%)` }} />
      {options.map((o) => (
        <button key={String(o.v)} type="button" role="radio" aria-checked={o.v === value} onClick={() => { if (o.v !== value) buzz(6); onChange(o.v); }}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

/** Drag the knob to the end to confirm. Enter/Space on the knob also confirms. */
export function SlideConfirm({ label, onConfirm, disabled, busyLabel }: { label: string; onConfirm: () => void; disabled?: boolean; busyLabel?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [x, setX] = useState(0);
  const [done, setDone] = useState(false);
  const start = useRef<{ px: number; x: number } | null>(null);
  const max = () => (track.current ? track.current.clientWidth - 56 : 200);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => { setDone(false); setX(0); }, 900);
    return () => clearTimeout(t);
  }, [done]);

  const fire = () => {
    setX(max());
    setDone(true);
    buzz(24);
    onConfirm();
  };
  const p = Math.min(1, x / max());
  return (
    <div className={`slide${disabled ? " off" : ""}${done ? " done" : ""}`} ref={track}>
      <div className="slide-fill" style={{ width: `${x + 56}px`, transition: start.current ? "none" : undefined }} />
      <span className="slide-label" style={{ opacity: done ? 1 : 1 - p * 1.4 }}>{done ? busyLabel ?? "요청함" : label}</span>
      <button
        type="button"
        className="slide-knob"
        aria-label={label}
        disabled={disabled}
        style={{ transform: `translateX(${x}px)`, transition: start.current ? "none" : undefined }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fire(); } }}
        onPointerDown={(e) => { if (done) return; e.currentTarget.setPointerCapture(e.pointerId); start.current = { px: e.clientX, x }; }}
        onPointerMove={(e) => { if (!start.current) return; setX(Math.max(0, Math.min(max(), start.current.x + e.clientX - start.current.px))); }}
        onPointerUp={() => { if (!start.current) return; start.current = null; if (x > max() * 0.86) fire(); else setX(0); }}
        onPointerCancel={() => { start.current = null; setX(0); }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4l6 6-6 6" /></svg>
      </button>
    </div>
  );
}

/** Range that snaps to a fixed list of values (detents). */
export function DetentSlider({ values, value, onChange, format, label }: { values: number[]; value: number; onChange: (v: number) => void; format: (v: number) => string; label: string }) {
  let idx = 0;
  values.forEach((v, i) => { if (Math.abs(v - value) < Math.abs(values[idx] - value)) idx = i; });
  return (
    <input className="range" type="range" min={0} max={values.length - 1} step={1} value={idx} aria-label={label} aria-valuetext={format(values[idx])}
      style={{ "--p": `${(idx / (values.length - 1)) * 100}%` } as React.CSSProperties}
      onChange={(e) => { const v = values[Number(e.target.value)]; if (v !== value) { buzz(4); onChange(v); } }} />
  );
}

export function Range({ min, max, step, value, onChange, label }: { min: number; max: number; step: number; value: number; onChange: (v: number) => void; label: string }) {
  return (
    <input className="range" type="range" min={min} max={max} step={step} value={value} aria-label={label}
      style={{ "--p": `${((value - min) / (max - min)) * 100}%` } as React.CSSProperties}
      onChange={(e) => onChange(Number(e.target.value))} />
  );
}
