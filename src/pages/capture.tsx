import { useEffect, useRef, useState } from "react";
import { useGetImageHistogram, getGetImageHistogramQueryKey, useListPresets, getListPresetsQueryKey } from "../lib/api";
import { useStatus, useActions } from "../lib/observatory";
import { Frame } from "../components/parts";

function Field({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (n: number) => void }) {
  return (
    <div className="field">
      <div className="head">
        <b>{label}</b>
        <input type="number" inputMode="decimal" value={value} min={min} max={max} step={step}
          onChange={(e) => { const n = Number(e.target.value); if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n))); }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export default function Capture() {
  const { data: s } = useStatus();
  const { start, stop } = useActions();
  const capturing = !!s?.camera.capturing;
  const presets = useListPresets({ query: { queryKey: getListPresetsQueryKey() } });
  const hist = useGetImageHistogram({ query: { queryKey: getGetImageHistogramQueryKey(), refetchInterval: capturing ? 2000 : false } });
  const [exp, setExp] = useState(3);
  const [gain, setGain] = useState(150);
  const [bin, setBin] = useState(1);
  const init = useRef(false);
  useEffect(() => {
    if (s && !init.current) { init.current = true; setExp(s.camera.exposureSec || 3); setGain(s.camera.gain); setBin(s.camera.binning || 1); }
  }, [s]);
  const bins = hist.data?.bins ?? [];
  const mx = Math.max(1, ...bins);

  return (
    <>
      <h1 className="hero">{capturing ? "촬영 중." : "촬영 설정."}</h1>
      <div className="btns">
        {capturing ? (
          <button className="btn block danger" onClick={() => stop.mutate()} disabled={stop.isPending}>촬영 정지</button>
        ) : (
          <button className="btn block" disabled={start.isPending} onClick={() => start.mutate({ data: { exposureSec: exp, gain, binning: bin } })}>
            {start.isPending ? "시작 중" : "촬영 시작"}
          </button>
        )}
      </div>
      <Frame version={s?.frameVersion ?? 0} count={s?.camera.frameCount} progress={capturing ? Math.round((s?.camera.exposureProgress ?? 0) * 100) : 0} />

      <h2 className="h2">히스토그램</h2>
      {hist.isError ? (
        <p className="note" style={{ marginTop: 14 }}>불러오지 못했습니다. <button style={{ background: "none", border: 0, textDecoration: "underline", padding: 0 }} onClick={() => hist.refetch()}>재시도</button></p>
      ) : bins.length === 0 ? (
        <p className="note" style={{ marginTop: 14 }}>프레임이 없습니다.</p>
      ) : (
        <svg viewBox="0 0 128 48" preserveAspectRatio="none" style={{ width: "100%", height: 96, marginTop: 14, borderBottom: "1px solid var(--line)" }}>
          {bins.map((b, i) => {
            const h = Math.max(0.5, (Math.sqrt(b) / Math.sqrt(mx)) * 46);
            return <rect key={i} x={i + 0.15} y={48 - h} width="0.7" height={h} fill="var(--ink)" />;
          })}
        </svg>
      )}

      <h2 className="h2">프리셋</h2>
      <ul className="rows">
        {presets.data?.map((p) => (
          <li key={p.id}>
            <button className="row link" onClick={() => { setExp(p.exposureSec); setGain(p.gain); setBin(p.binning); }}>
              <b>{p.name.split(" / ")[0]}</b>
              <span className="tnum">{p.exposureSec}s · 게인 {p.gain}</span>
            </button>
          </li>
        ))}
      </ul>

      <h2 className="h2">값</h2>
      <Field label="노출 (초)" value={exp} min={0.001} max={600} step={exp < 10 ? 0.5 : 1} onChange={setExp} />
      <Field label="게인" value={gain} min={0} max={600} step={1} onChange={setGain} />
      <div className="field">
        <div className="head"><b>비닝</b></div>
        <div className="seg">
          {[1, 2, 3, 4].map((b) => (
            <button key={b} className={bin === b ? "on" : ""} onClick={() => setBin(b)}>{b}x{b}</button>
          ))}
        </div>
      </div>
    </>
  );
}
