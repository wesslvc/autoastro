import { useEffect, useRef } from "react";

/** Full-screen star field that turns slowly around an off-screen pole. */
export function Starfield({ night }: { night: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let seed = 20261121;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const stars = Array.from({ length: 260 }, () => ({ r: Math.sqrt(rnd()), a: rnd() * Math.PI * 2, s: rnd() ** 3 * 1.4 + 0.35, o: 0.18 + rnd() * 0.6 }));
    const color = night ? "255,90,76" : "236,233,225";
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    const draw = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      const w = innerWidth, h = innerHeight;
      if (c.width !== w * dpr || c.height !== h * dpr) { c.width = w * dpr; c.height = h * dpr; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const R = Math.hypot(w, h) * 1.1;
      const px = w * 0.82, py = -h * 0.12;
      const rot = still ? 0 : ((performance.now() - t0) / 1000) * 0.0035;
      for (const st of stars) {
        const a = st.a + rot;
        const x = px + Math.cos(a) * st.r * R, y = py + Math.sin(a) * st.r * R;
        if (x < -2 || y < -2 || x > w + 2 || y > h + 2) continue;
        ctx.fillStyle = `rgba(${color},${st.o})`;
        ctx.beginPath();
        ctx.arc(x, y, st.s, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    draw();
    const id = still ? 0 : window.setInterval(draw, 120);
    addEventListener("resize", draw);
    return () => { clearInterval(id); removeEventListener("resize", draw); };
  }, [night]);
  return <canvas ref={ref} className="starfield" aria-hidden="true" />;
}

/**
 * Sky as seen looking straight up: zenith in the middle, horizon at the rim,
 * north at the top and east on the left.
 */
export function SkyDome({ mount, target }: { mount: { alt: number; az: number } | null; target: { alt: number; az: number; name: string } | null }) {
  const S = 300, c = S / 2, R = 128;
  const pt = (alt: number, az: number) => {
    const r = (R * (90 - Math.max(0, alt))) / 90;
    const t = (az * Math.PI) / 180;
    return { x: c - r * Math.sin(t), y: c - r * Math.cos(t) };
  };
  const m = mount && pt(mount.alt, mount.az);
  const tg = target && target.alt > 0 ? pt(target.alt, target.az) : null;
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="dome" role="img"
      aria-label={`하늘 반구${mount ? `, 마운트 고도 ${mount.alt.toFixed(0)}도` : ""}${target ? `, ${target.name} 고도 ${target.alt.toFixed(0)}도` : ""}`}>
      <circle cx={c} cy={c} r={R} className="dome-sky" />
      {[30, 60].map((a) => <circle key={a} cx={c} cy={c} r={(R * (90 - a)) / 90} className="dome-ring" />)}
      <line x1={c - R} x2={c + R} y1={c} y2={c} className="dome-ring" />
      <line y1={c - R} y2={c + R} x1={c} x2={c} className="dome-ring" />
      <circle cx={c} cy={c} r={R} className="dome-horizon" />
      {[["북", c, c - R - 10], ["남", c, c + R + 19], ["동", c - R - 14, c + 4], ["서", c + R + 14, c + 4]].map(([l, x, y]) => (
        <text key={l as string} x={x as number} y={y as number} className="dome-label" textAnchor="middle">{l}</text>
      ))}
      <text x={c + 4} y={c - (R * 60) / 90 + 12} className="dome-tick">30°</text>
      <text x={c + 4} y={c - (R * 30) / 90 + 12} className="dome-tick">60°</text>
      {tg && m && <line x1={m.x} y1={m.y} x2={tg.x} y2={tg.y} className="dome-path" />}
      {tg && (
        <g>
          <circle cx={tg.x} cy={tg.y} r={11} className="dome-target" />
          <line x1={tg.x - 17} x2={tg.x - 13} y1={tg.y} y2={tg.y} className="dome-target" />
          <line x1={tg.x + 13} x2={tg.x + 17} y1={tg.y} y2={tg.y} className="dome-target" />
          <line y1={tg.y - 17} y2={tg.y - 13} x1={tg.x} x2={tg.x} className="dome-target" />
          <line y1={tg.y + 13} y2={tg.y + 17} x1={tg.x} x2={tg.x} className="dome-target" />
        </g>
      )}
      {m && <circle cx={m.x} cy={m.y} r={4.5} className="dome-mount" />}
    </svg>
  );
}
