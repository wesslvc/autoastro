/**
 * Sky as seen looking straight up: zenith in the middle, horizon at the rim,
 * north at the top and east on the left.
 */
export function SkyDome({ mount, target }: { mount: { alt: number; az: number } | null; target: { alt: number; az: number; name: string } | null }) {
  const S = 300, c = S / 2, R = 124;
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
      {tg && <circle cx={tg.x} cy={tg.y} r={8} className="dome-target" />}
      {m && <path d={`M${m.x - 6},${m.y}h12M${m.x},${m.y - 6}v12`} className="dome-mount" />}
    </svg>
  );
}
