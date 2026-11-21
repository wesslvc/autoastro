import { useState } from "react";
import { Link } from "wouter";
import { useStatus, useActions, fmtRa, fmtDeg } from "../lib/observatory";
import { Row, Frame, Confirm } from "../components/parts";

const stateKo: Record<string, string> = { idle: "대기 중", slewing: "이동 중", tracking: "추적 중", parking: "파킹 중", parked: "파킹됨", stopped: "정지됨" };
const solverKo: Record<string, string> = { idle: "대기", solving: "플레이트 솔빙", centered: "센터링 완료", failed: "실패" };

export default function Home() {
  const { data: s, isError, isLoading, refetch } = useStatus();
  const { start, stop, park } = useActions();
  const [confirmPark, setConfirmPark] = useState(false);

  if (isLoading || !s) {
    return (
      <>
        <div className="skel" style={{ height: 120, marginTop: 56 }} />
        <div className="skel" style={{ height: 200, marginTop: 28 }} />
        {isError && <div className="banner"><span>서버 상태를 가져올 수 없습니다</span><button onClick={() => refetch()}>재시도</button></div>}
      </>
    );
  }
  const c = s.camera;
  const down = isError || !s.connected;
  const prog = Math.round((c.exposureProgress ?? 0) * 100);
  const state = stateKo[s.mount.state] ?? s.mount.state;
  const on = (ok: boolean) => (ok ? "연결됨" : "연결 안 됨");

  return (
    <>
      <h1 className="hero">
        {s.target ? s.target.name : "대상 없음"},<br />
        {state}.
      </h1>
      <p className="lede">
        {s.target ? `${s.target.catalogId} · 고도 ${s.target.altitude.toFixed(1)}°` : "대상 탭에서 관측할 천체를 고르세요."}
        {s.mock && " · 시뮬레이터 모드"}
      </p>

      {down && (
        <div className="banner">
          <span>{isError ? "서버 상태를 가져올 수 없습니다" : "N.I.N.A.와 연결되어 있지 않습니다"}</span>
          <button onClick={() => refetch()}>재시도</button>
        </div>
      )}

      <div className="btns">
        {c.capturing ? (
          <button className="btn" onClick={() => stop.mutate()} disabled={stop.isPending}>촬영 정지</button>
        ) : (
          <button className="btn" disabled={start.isPending || !s.connected}
            onClick={() => start.mutate({ data: { exposureSec: c.exposureSec || 3, gain: c.gain, binning: c.binning } })}>촬영 시작</button>
        )}
        <Link href="/targets" className="btn ghost">GoTo</Link>
        <button className="btn ghost" disabled={park.isPending || s.mount.parked} onClick={() => setConfirmPark(true)}>파킹</button>
      </div>

      <Frame version={s.frameVersion} count={c.frameCount} progress={c.capturing ? prog : 0} />

      <h2 className="h2">마운트</h2>
      <ul className="rows">
        <Row label="적경">{fmtRa(s.mount.raHours)}</Row>
        <Row label="적위">{fmtDeg(s.mount.decDegrees)}</Row>
        <Row label="고도">{s.mount.altitude.toFixed(1)}°</Row>
        <Row label="솔버">
          {solverKo[s.solver.state]}
          {s.solver.errorArcmin != null ? ` · ${s.solver.errorArcmin.toFixed(1)}′` : ""}
        </Row>
      </ul>
      {s.solver.message && <p className="note" style={{ marginTop: 10 }}>{s.solver.message}</p>}

      <h2 className="h2">장비</h2>
      <ul className="rows">
        <Row label="N.I.N.A.">{on(s.connected && !isError)}</Row>
        <Row label="마운트">{on(s.mount.connected)}</Row>
        <Row label="카메라" >{c.connected ? (c.model || "연결됨") : "연결 안 됨"}</Row>
        <Row label="센서 온도">{c.temperatureC.toFixed(1)}°C</Row>
        <Row label="노출">{c.capturing ? `${prog}%` : "-"} <span style={{ color: "var(--faint)" }}>· {c.exposureSec}s · 게인 {c.gain} · {c.binning}x{c.binning}</span></Row>
        <Row label="포커서">{s.focuser.connected ? s.focuser.position.toLocaleString() : "연결 안 됨"}</Row>
      </ul>

      <h2 className="h2">최근 이벤트</h2>
      <ul className="rows">
        {s.log.length === 0 && <Row label="-">기록된 이벤트가 없습니다</Row>}
        {s.log.slice(-5).reverse().map((l, i) => (
          <li className="row" key={i}>
            <b className="tnum" style={{ fontWeight: 500, color: "var(--faint)", whiteSpace: "nowrap" }}>{new Date(l.time).toLocaleTimeString("en-GB")}</b>
            <span>{l.message}</span>
          </li>
        ))}
      </ul>

      <Confirm open={confirmPark} title="마운트를 파킹할까요?" body="진행 중인 촬영이 먼저 정지되고 마운트가 파킹 위치로 이동합니다."
        onNo={() => setConfirmPark(false)} onYes={() => { setConfirmPark(false); park.mutate(); }} />
    </>
  );
}
