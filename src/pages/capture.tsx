import { useEffect, useRef, useState } from "react";
import { useGetImageHistogram, getGetImageHistogramQueryKey, useListPresets, getListPresetsQueryKey } from "../lib/api";
import { useStatus, useActions, fmtExp } from "../lib/observatory";
import { Frame } from "../ui/frame";
import { DetentSlider, Range, Segmented } from "../ui/controls";

const EXPOSURES = [0.001, 0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 3, 4, 5, 8, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 600];

export default function Capture() {
  const { data: s } = useStatus();
  const { start, stop } = useActions();
  const capturing = !!s?.camera.capturing;
  const presets = useListPresets({ query: { queryKey: getListPresetsQueryKey() } });
  const hist = useGetImageHistogram({ query: { queryKey: [...getGetImageHistogramQueryKey(), s?.frameVersion ?? 0] } });
  const [exp, setExp] = useState(3);
  const [gain, setGain] = useState(150);
  const [bin, setBin] = useState(1);
  const init = useRef(false);
  useEffect(() => {
    if (s && !init.current) { init.current = true; setExp(s.camera.exposureSec || 3); setGain(s.camera.gain); setBin(s.camera.binning || 1); }
  }, [s]);
  const bins = hist.data?.bins ?? [];
  const mx = Math.max(1, ...bins);
  const prog = Math.round((s?.camera.exposureProgress ?? 0) * 100);
  const activePreset = presets.data?.find((p) => p.exposureSec === exp && p.gain === gain && p.binning === bin)?.id;

  return (
    <div className="pad with-dock">
      <header className="head">
        <p className={`eyebrow${capturing ? " tone-busy" : ""}`}>{capturing ? <>노출 중 · <span className="num">{prog}%</span></> : "카메라"}</p>
        <h1 className="title" tabIndex={-1}>{capturing ? `프레임 ${(s?.camera.frameCount ?? 0) + 1}` : "촬영 준비"}</h1>
        <p className="meta">{s?.camera.model ?? "카메라"} · 센서 <span className="num">{s?.camera.temperatureC.toFixed(1) ?? "-"}°C</span></p>
      </header>

      <Frame version={s?.frameVersion ?? 0} count={s?.camera.frameCount} progress={capturing ? prog : 0} />

      <h2 className="section">히스토그램</h2>
      {hist.isError ? (
        <div className="notice"><span>히스토그램을 불러오지 못했습니다</span><button type="button" onClick={() => hist.refetch()}>재시도</button></div>
      ) : bins.length === 0 ? (
        <p className="empty">프레임이 들어오면 표시됩니다</p>
      ) : (
        <svg viewBox="0 0 128 40" preserveAspectRatio="none" className="hist" role="img" aria-label="밝기 분포">
          <path className="hist-area" d={`M0,40 ${bins.map((b, i) => `L${i + 0.5},${(40 - Math.max(0.4, (Math.sqrt(b) / Math.sqrt(mx)) * 38)).toFixed(2)}`).join(" ")} L128,40 Z`} />
        </svg>
      )}

      <h2 className="section">프리셋</h2>
      <div className="chips wrap">
        {presets.data?.map((p) => (
          <button key={p.id} type="button" aria-pressed={activePreset === p.id} onClick={() => { setExp(p.exposureSec); setGain(p.gain); setBin(p.binning); }}>
            {p.name.split(" / ")[0].replace(/\s*\d+초$/, "")}
            <span className="num dim">{fmtExp(p.exposureSec)}</span>
          </button>
        ))}
      </div>

      <div className="ctl">
        <div className="ctl-head"><span>노출</span><b className="num">{fmtExp(exp)}</b></div>
        <DetentSlider label="노출 시간" values={EXPOSURES} value={exp} onChange={setExp} format={fmtExp} />
        <div className="ctl-scale num"><span>1ms</span><span>1s</span><span>10min</span></div>
      </div>
      <div className="ctl">
        <div className="ctl-head"><span>게인</span><b className="num">{gain}</b></div>
        <Range label="게인" min={0} max={600} step={1} value={gain} onChange={setGain} />
        <div className="ctl-scale num"><span>0</span><span>300</span><span>600</span></div>
      </div>
      <div className="ctl">
        <div className="ctl-head"><span>비닝</span></div>
        <Segmented<number> label="비닝" value={bin} onChange={setBin} options={[1, 2, 3, 4].map((b) => ({ v: b, l: `${b}×${b}` }))} />
      </div>

      <div className="dock">
        {capturing ? (
          <button type="button" className="btn danger wide" onClick={() => stop.mutate()} disabled={stop.isPending}>촬영 멈춤</button>
        ) : (
          <button type="button" className="btn primary wide" disabled={start.isPending} onClick={() => start.mutate({ data: { exposureSec: exp, gain, binning: bin } })}>
            {start.isPending ? "시작하는 중" : `${fmtExp(exp)} · 게인 ${gain}로 촬영`}
          </button>
        )}
      </div>
    </div>
  );
}
