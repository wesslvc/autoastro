import { useStatus, useActions, fmtRa, fmtDec, compass, fmtExp } from "../lib/observatory";
import { SlideConfirm } from "../ui/controls";
import { SkyDome } from "../ui/sky";
import { Frame } from "../ui/frame";

const stateKo: Record<string, string> = { idle: "대기 중", slewing: "이동 중", tracking: "추적 중", parking: "파킹 중", parked: "파킹됨", stopped: "정지됨" };
const solverKo: Record<string, string> = { idle: "대기", solving: "플레이트 솔빙 중", centered: "센터링 완료", failed: "솔빙 실패" };

export default function Status({ onGoto, onCapture }: { onGoto: () => void; onCapture: () => void }) {
  const { data: s, isError, isLoading, refetch } = useStatus();
  const { start, stop, park } = useActions();

  if (isLoading || !s) {
    return (
      <div className="pad">
        <div className="skel" style={{ height: 18, width: 90, marginTop: 28 }} />
        <div className="skel" style={{ height: 44, width: "70%", marginTop: 12 }} />
        <div className="skel round" style={{ width: 260, height: 260, margin: "36px auto 0" }} />
        {isError && <div className="notice"><span>서버에 연결할 수 없습니다</span><button type="button" onClick={() => refetch()}>재시도</button></div>}
      </div>
    );
  }

  const c = s.camera, m = s.mount, t = s.target;
  const busy = m.slewing || s.solver.state === "solving";
  const prog = Math.round((c.exposureProgress ?? 0) * 100);
  const logs = [...s.log].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 6);

  return (
    <div className="pad">
      <p className="kicker"><span className={`dot ${busy ? "busy" : m.tracking ? "ok" : "idle"}`} />{stateKo[m.state] ?? m.state}</p>
      {t ? (
        <>
          <h1 className="title">{t.name}</h1>
          <p className="meta">{[t.catalogId, t.type, t.constellation].filter(Boolean).join(" · ")}</p>
        </>
      ) : (
        <>
          <h1 className="title">관측 대상 없음</h1>
          <p className="meta">대상 화면에서 오늘 밤 볼 천체를 고르세요</p>
        </>
      )}

      {(isError || !s.connected) && (
        <div className="notice"><span>{isError ? "서버 상태를 가져올 수 없습니다" : "N.I.N.A.와 연결되어 있지 않습니다"}</span><button type="button" onClick={() => refetch()}>재시도</button></div>
      )}

      <SkyDome mount={m.parked ? null : { alt: m.altitude, az: m.azimuth }} target={t ? { alt: t.altitude, az: t.azimuth, name: t.name } : null} />
      <div className="legend">
        <span><i className="lg-mount" />망원경</span>
        {t && <span><i className="lg-target" />{t.aboveHorizon ? "대상" : "대상 (지평선 아래)"}</span>}
      </div>

      <div className="coords">
        <div><small>적경</small><b className="mono">{fmtRa(m.raHours)}</b></div>
        <div><small>적위</small><b className="mono">{fmtDec(m.decDegrees)}</b></div>
        <div><small>고도</small><b className="mono">{m.altitude.toFixed(1)}°</b></div>
        <div><small>방위</small><b className="mono">{m.azimuth.toFixed(0)}° <span className="dim">{compass(m.azimuth)}</span></b></div>
      </div>

      <p className={`solver${s.solver.state === "failed" ? " bad" : ""}`}>
        {solverKo[s.solver.state]}
        {s.solver.errorArcmin != null && <span className="mono"> · 오차 {s.solver.errorArcmin.toFixed(1)}′</span>}
        {s.solver.message && <span className="dim"> — {s.solver.message}</span>}
      </p>

      <div className="actions">
        {c.capturing ? (
          <button type="button" className="btn" onClick={() => stop.mutate()} disabled={stop.isPending}>촬영 멈춤 <span className="mono dim2">{prog}%</span></button>
        ) : (
          <button type="button" className="btn primary" disabled={start.isPending || !s.connected}
            onClick={() => start.mutate({ data: { exposureSec: c.exposureSec || 3, gain: c.gain, binning: c.binning } })}>촬영 시작</button>
        )}
        <button type="button" className="btn" onClick={onGoto}>대상 고르기</button>
      </div>

      <h2 className="section">마지막 프레임</h2>
      <Frame version={s.frameVersion} count={c.frameCount} progress={c.capturing ? prog : 0} />
      <button type="button" className="link-more" onClick={onCapture}>{fmtExp(c.exposureSec)} · 게인 {c.gain} · {c.binning}×{c.binning} — 촬영 설정 바꾸기</button>

      <h2 className="section">장비</h2>
      <dl className="kv">
        <div><dt>마운트</dt><dd><span className={`dot ${m.connected ? "ok" : "off"}`} />{m.connected ? stateKo[m.state] : "연결 안 됨"}</dd></div>
        <div><dt>카메라</dt><dd><span className={`dot ${c.connected ? "ok" : "off"}`} />{c.connected ? c.model || "연결됨" : "연결 안 됨"}</dd></div>
        <div><dt>센서 온도</dt><dd className="mono">{c.temperatureC.toFixed(1)}°C</dd></div>
        <div><dt>포커서</dt><dd><span className={`dot ${s.focuser.connected ? "ok" : "off"}`} /><span className="mono">{s.focuser.connected ? s.focuser.position.toLocaleString() : "연결 안 됨"}</span></dd></div>
      </dl>

      <h2 className="section">마운트 파킹</h2>
      <p className="fine" style={{ marginTop: 0, marginBottom: 12 }}>진행 중인 촬영을 멈추고 마운트를 파킹 위치로 돌려 놓습니다</p>
      <SlideConfirm label={m.parked ? "이미 파킹됨" : "밀어서 파킹"} busyLabel="파킹 요청함" disabled={m.parked || park.isPending} onConfirm={() => park.mutate()} />

      <h2 className="section">기록</h2>
      <ol className="log">
        {logs.length === 0 && <li><span className="dim">기록된 이벤트가 없습니다</span></li>}
        {logs.map((l, i) => (
          <li key={`${l.time}-${i}`}>
            <time className="mono">{new Date(l.time).toLocaleTimeString("en-GB")}</time>
            <span>{l.message}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
