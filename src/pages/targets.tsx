import { useEffect, useMemo, useState } from "react";
import { useSearchTargets, getSearchTargetsQueryKey, useGetTarget, getGetTargetQueryKey, type Target } from "../lib/api";
import { useActions, fmtRa, fmtDec, compass } from "../lib/observatory";
import { useSettings } from "../lib/settings";
import { Sheet } from "../ui/sheet";
import { SlideConfirm, Toggle } from "../ui/controls";

function Curve({ pts }: { pts: { hoursFromNow: number; altitude: number }[] }) {
  if (!pts.length) return null;
  const W = 340, H = 150, L = 28, R = 4, T = 10, B = 22;
  const maxH = Math.max(12, ...pts.map((x) => x.hoursFromNow));
  const X = (h: number) => L + (h / maxH) * (W - L - R);
  const Y = (a: number) => T + ((90 - Math.max(-20, a)) / 110) * (H - T - B);
  const d = pts.map((q, i) => `${i ? "L" : "M"}${X(q.hoursFromNow).toFixed(1)},${Y(q.altitude).toFixed(1)}`).join(" ");
  const peak = pts.reduce((a, b) => (b.altitude > a.altitude ? b : a), pts[0]);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="curve" role="img" aria-label={`앞으로 12시간 고도. 최고 ${peak.altitude.toFixed(0)}도`}>
      <rect x={L} y={Y(0)} width={W - L - R} height={Y(-20) - Y(0)} className="curve-ground" />
      {[0, 30, 60, 90].map((a) => (
        <g key={a}>
          <line x1={L} x2={W - R} y1={Y(a)} y2={Y(a)} className={a === 0 ? "curve-horizon" : "curve-grid"} />
          <text x={L - 6} y={Y(a) + 3.5} textAnchor="end" className="curve-label">{a}°</text>
        </g>
      ))}
      {[0, 3, 6, 9, 12].map((h) => (
        <text key={h} x={X(h)} y={H - 5} textAnchor="middle" className="curve-label">{h === 0 ? "지금" : `+${h}h`}</text>
      ))}
      <path d={d} className="curve-line" />
      <circle cx={X(peak.hoursFromNow)} cy={Y(peak.altitude)} r={3.5} className="curve-peak" />
      <circle cx={X(pts[0].hoursFromNow)} cy={Y(pts[0].altitude)} r={4} className="curve-now" />
    </svg>
  );
}

function AltBar({ alt }: { alt: number }) {
  return <span className="altbar" aria-hidden="true"><i style={{ height: `${Math.max(0, Math.min(1, alt / 90)) * 100}%` }} /></span>;
}

export default function Targets({ onSent }: { onSent: () => void }) {
  const { s, set } = useSettings();
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [lastSel, setLastSel] = useState<string | null>(null);
  const { goto } = useActions();
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 220); return () => clearTimeout(t); }, [q]);
  useEffect(() => { if (sel) setLastSel(sel); }, [sel]);

  const params = dq ? { q: dq } : undefined;
  const list = useSearchTargets(params, { query: { queryKey: getSearchTargetsQueryKey(params), placeholderData: (p) => p } });
  const shownId = sel ?? lastSel;
  const detail = useGetTarget(shownId ?? "", { query: { enabled: !!shownId, queryKey: getGetTargetQueryKey(shownId ?? "") } });

  const types = useMemo(() => [...new Set((list.data ?? []).map((t) => t.type))], [list.data]);
  const rows = (list.data ?? []).filter((t) => (!s.aboveOnly || t.aboveHorizon) && (!type || t.type === type));
  const t: Target | undefined = detail.data;

  return (
    <div className="pad">
      <header className="head">
        <p className="eyebrow">카탈로그</p>
        <h1 className="title">오늘 밤 볼 대상</h1>
      </header>

      <div className="search">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="5.5" /><path d="M12.2 12.2L16 16" strokeLinecap="round" /></svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="M31, NGC 7000, 목성" aria-label="대상 검색" enterKeyHint="search" />
        {q && <button type="button" onClick={() => setQ("")} aria-label="지우기">지우기</button>}
      </div>

      {types.length > 1 && (
        <div className="chips" role="group" aria-label="종류">
          <button type="button" aria-pressed={!type} onClick={() => setType(null)}>전체</button>
          {types.map((ty) => <button key={ty} type="button" aria-pressed={type === ty} onClick={() => setType(type === ty ? null : ty)}>{ty}</button>)}
        </div>
      )}

      <div className="toggles compact">
        <Toggle label="지평선 위 대상만" on={s.aboveOnly} onChange={(v) => set("aboveOnly", v)} />
      </div>

      <h2 className="section">{dq ? `‘${dq}’ 검색 결과` : "추천 대상"}<span className="count">{list.data ? rows.length : ""}</span></h2>
      {list.isLoading && <div className="skel" style={{ height: 240 }} />}
      {list.isError && <div className="notice"><span>목록을 불러오지 못했습니다</span><button type="button" onClick={() => list.refetch()}>재시도</button></div>}
      {list.data && rows.length === 0 && <p className="empty">조건에 맞는 대상이 없습니다</p>}
      <ul className="targets">
        {rows.map((it) => (
          <li key={it.id}>
            <button type="button" onClick={() => setSel(it.id)} className={it.aboveHorizon ? "" : "below"}>
              <span className="t-main">
                <b>{it.name}</b>
                <small>{it.catalogId} · {it.type}{it.magnitude != null ? ` · ${it.magnitude.toFixed(1)}등급` : ""}</small>
              </span>
              <span className="t-alt">
                <span className="num">{it.aboveHorizon ? `${it.altitude.toFixed(0)}°` : "아래"}</span>
                <AltBar alt={it.altitude} />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Sheet open={!!sel} onClose={() => setSel(null)} label={t?.name ?? "대상"}>
        {detail.isLoading && <div className="skel" style={{ height: 280 }} />}
        {detail.isError && <div className="notice"><span>대상 정보를 불러오지 못했습니다</span><button type="button" onClick={() => detail.refetch()}>재시도</button></div>}
        {t && (
          <>
            <p className="eyebrow">{t.catalogId}</p>
            <h2 className="sheet-title big">{t.name}</h2>
            <p className="meta">{[t.type, t.constellation, t.magnitude != null ? `${t.magnitude.toFixed(1)}등급` : null].filter(Boolean).join(" · ")}</p>

            <div className="coords" style={{ marginTop: 20 }}>
              <div><small>고도</small><b className="num">{t.altitude.toFixed(1)}°</b></div>
              <div><small>방위</small><b className="num">{t.azimuth.toFixed(0)}° <span className="dim">{compass(t.azimuth)}</span></b></div>
              <div><small>적경</small><b className="mono">{fmtRa(t.raHours)}</b></div>
              <div><small>적위</small><b className="mono">{fmtDec(t.decDegrees)}</b></div>
            </div>

            <h3 className="section">앞으로 12시간 고도</h3>
            <Curve pts={t.altitudeCurve ?? []} />

            {!t.aboveHorizon && <div className="notice warn"><span>지금은 지평선 아래에 있어 GoTo가 거부될 수 있습니다</span></div>}
            <div style={{ marginTop: 24 }}>
              <SlideConfirm label="밀어서 GoTo + 센터링" busyLabel="GoTo 요청함" disabled={goto.isPending}
                onConfirm={() => goto.mutate({ data: { targetId: t.id } }, { onSuccess: () => { setSel(null); setTimeout(onSent, 250); } })} />
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
