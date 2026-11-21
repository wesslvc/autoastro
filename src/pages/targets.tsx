import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useSearchTargets, getSearchTargetsQueryKey, useGetTarget, getGetTargetQueryKey } from "../lib/api";
import { useActions } from "../lib/observatory";
import { Row } from "../components/parts";

function Curve({ pts }: { pts: { hoursFromNow: number; altitude: number }[] }) {
  if (!pts.length) return null;
  const W = 520, H = 160, L = 30, R = 6, T = 8, B = 22;
  const maxH = Math.max(12, ...pts.map((x) => x.hoursFromNow));
  const X = (h: number) => L + (h / maxH) * (W - L - R);
  const Y = (a: number) => T + ((90 - a) / 120) * (H - T - B);
  const d = pts.map((q, i) => `${i ? "L" : "M"}${X(q.hoursFromNow).toFixed(1)},${Y(q.altitude).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", marginTop: 14, overflow: "visible" }} role="img" aria-label="향후 12시간 고도">
      {[0, 30, 60, 90].map((a) => (
        <g key={a}>
          <line x1={L} x2={W - R} y1={Y(a)} y2={Y(a)} stroke="var(--line)" strokeWidth={a === 0 ? 1.5 : 1} />
          <text x={0} y={Y(a) + 4} fontSize="11" fill="var(--faint)">{a}°</text>
        </g>
      ))}
      {[0, 3, 6, 9, 12].map((h) => (
        <text key={h} x={X(h)} y={H - 4} fontSize="11" textAnchor="middle" fill="var(--faint)">{h === 0 ? "지금" : `+${h}h`}</text>
      ))}
      <path d={d} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function Targets() {
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [, nav] = useLocation();
  const { goto } = useActions();
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 250); return () => clearTimeout(t); }, [q]);
  const params = dq ? { q: dq } : undefined;
  const list = useSearchTargets(params, { query: { queryKey: getSearchTargetsQueryKey(params) } });
  const detail = useGetTarget(sel ?? "", { query: { enabled: !!sel, queryKey: getGetTargetQueryKey(sel ?? "") } });

  if (sel) {
    const t = detail.data;
    return (
      <>
        <button className="back" onClick={() => setSel(null)}>← 목록</button>
        {detail.isLoading && <div className="skel" style={{ height: 160, marginTop: 24 }} />}
        {detail.isError && <div className="banner"><span>대상 정보를 불러오지 못했습니다</span><button onClick={() => detail.refetch()}>재시도</button></div>}
        {t && (
          <>
            <h1 className="hero" style={{ marginTop: 20 }}>{t.name}</h1>
            <p className="lede">{t.catalogId} · {t.type}{t.constellation ? ` · ${t.constellation}` : ""}</p>
            {!t.aboveHorizon && <div className="banner">지금은 지평선 아래에 있어 GoTo가 거부될 수 있습니다.</div>}
            <div className="btns">
              <button className="btn block" disabled={goto.isPending}
                onClick={() => goto.mutate({ data: { targetId: t.id } }, { onSuccess: () => nav("/") })}>
                {goto.isPending ? "요청 중" : "GoTo + 센터링"}
              </button>
            </div>
            <ul className="rows" style={{ marginTop: 32 }}>
              <Row label="고도">{t.altitude.toFixed(1)}°</Row>
              <Row label="방위">{t.azimuth.toFixed(1)}°</Row>
              <Row label="등급">{t.magnitude != null ? t.magnitude.toFixed(1) : "-"}</Row>
            </ul>
            <h2 className="h2">향후 12시간 고도</h2>
            <Curve pts={t.altitudeCurve ?? []} />
          </>
        )}
      </>
    );
  }

  return (
    <>
      <h1 className="hero">무엇을<br />볼까요.</h1>
      <input className="input" style={{ marginTop: 28 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="M31, NGC 7000, 목성" />
      <h2 className="h2">{dq ? "검색 결과" : "인기 대상"}</h2>
      {list.isLoading && <div className="skel" style={{ height: 180, marginTop: 14 }} />}
      {list.isError && <div className="banner"><span>목록을 불러오지 못했습니다</span><button onClick={() => list.refetch()}>재시도</button></div>}
      {list.data && list.data.length === 0 && <p className="note" style={{ marginTop: 14 }}>일치하는 대상이 없습니다.</p>}
      <ul className="rows">
        {list.data?.map((t) => (
          <li key={t.id}>
            <button className="row link" onClick={() => setSel(t.id)}>
              <b>{t.name} <span style={{ fontWeight: 400, color: "var(--faint)", fontSize: 13 }}>{t.catalogId} · {t.type}</span></b>
              <span className="tnum" style={t.aboveHorizon ? undefined : { color: "var(--faint)" }}>{t.aboveHorizon ? `${t.altitude.toFixed(0)}°` : "지평선 아래"}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
