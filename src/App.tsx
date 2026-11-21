import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useActions, useStatus } from "./lib/observatory";
import { useSettings, wakeLockSupported, buzz } from "./lib/settings";
import { Starfield } from "./ui/sky";
import { Sheet } from "./ui/sheet";
import { Toggle } from "./ui/controls";
import Status from "./pages/status";
import Targets from "./pages/targets";
import Capture from "./pages/capture";

const TABS = [
  { path: "/", label: "관측" },
  { path: "/targets", label: "대상" },
  { path: "/capture", label: "촬영" },
];

export default function App() {
  const { s, set } = useSettings();
  const { data: st, isError } = useStatus();
  const { estop } = useActions();
  const pager = useRef<HTMLDivElement>(null);
  const initial = Math.max(0, TABS.findIndex((t) => t.path === location.pathname));
  const [pos, setPos] = useState(initial);
  const [settings, setSettings] = useState(false);
  const idx = Math.round(pos);

  useLayoutEffect(() => {
    const el = pager.current!;
    el.scrollLeft = initial * el.clientWidth;
    // Keep the current page aligned when the viewport is resized or rotated.
    const ro = new ResizeObserver(() => { el.scrollLeft = Math.round(el.scrollLeft / el.clientWidth) * el.clientWidth; });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onScroll = () => {
    const el = pager.current!;
    const p = el.scrollLeft / el.clientWidth;
    setPos(p);
    const i = Math.round(p);
    if (Math.abs(p - i) < 0.02 && location.pathname !== TABS[i].path) {
      history.replaceState(null, "", TABS[i].path);
      buzz(5);
    }
  };
  const go = useCallback((i: number) => {
    const el = pager.current!;
    el.scrollTo({ left: i * el.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);

  const link = isError ? "err" : !st ? "wait" : st.connected ? "ok" : "err";
  return (
    <>
      <Starfield night={s.night} />
      <div className="app">
        <header className="bar">
          <button type="button" className="brand" onClick={() => setSettings(true)} aria-label="설정 열기">
            <span className={`dot ${link}`} />
            <span>
              <b>원격 천문대</b>
              <small>{link === "ok" ? (st?.mock ? "시뮬레이터" : "N.I.N.A. 연결됨") : link === "wait" ? "연결 중" : "연결 끊김"}</small>
            </span>
          </button>
          <div className="bar-right">
            <button type="button" className="icon-btn" onClick={() => setSettings(true)} aria-label="설정">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M3 6h9M15 6h2M3 14h2M8 14h9" /><circle cx="13.5" cy="6" r="1.8" /><circle cx="6.5" cy="14" r="1.8" /></svg>
            </button>
            <button type="button" className="estop" disabled={estop.isPending} onClick={() => { buzz(60); estop.mutate(); }}>비상 정지</button>
          </div>
        </header>

        <nav className="tabs" role="tablist" aria-label="화면">
          <i style={{ transform: `translateX(${pos * 100}%)` }} />
          {TABS.map((t, i) => (
            <button key={t.path} type="button" role="tab" aria-selected={idx === i} onClick={() => go(i)}>{t.label}</button>
          ))}
        </nav>

        <div className="pager" ref={pager} onScroll={onScroll}>
          <section className="page" aria-hidden={idx !== 0} inert={idx !== 0 && Math.abs(pos - idx) < 0.01 ? true : undefined}><Status onGoto={() => go(1)} onCapture={() => go(2)} /></section>
          <section className="page" aria-hidden={idx !== 1} inert={idx !== 1 && Math.abs(pos - idx) < 0.01 ? true : undefined}><Targets onSent={() => go(0)} /></section>
          <section className="page" aria-hidden={idx !== 2} inert={idx !== 2 && Math.abs(pos - idx) < 0.01 ? true : undefined}><Capture /></section>
        </div>
      </div>

      <Sheet open={settings} onClose={() => setSettings(false)} label="설정">
        <h2 className="sheet-title">설정</h2>
        <div className="toggles">
          <Toggle label="적색 야간 모드" hint="암적응을 지키도록 화면을 붉게 바꿉니다" on={s.night} onChange={(v) => set("night", v)} />
          {wakeLockSupported && <Toggle label="화면 켜짐 유지" hint="관측하는 동안 화면이 꺼지지 않습니다" on={s.wake} onChange={(v) => set("wake", v)} />}
          <Toggle label="진동 피드백" hint="밀어서 실행하거나 탭을 넘길 때 짧게 울립니다" on={s.haptics} onChange={(v) => set("haptics", v)} />
        </div>
        <dl className="kv" style={{ marginTop: 24 }}>
          <div><dt>연결</dt><dd>{st?.mock ? "내장 시뮬레이터" : st?.connected ? "N.I.N.A. Advanced API" : "연결 안 됨"}</dd></div>
          <div><dt>카메라</dt><dd>{st?.camera.model || "-"}</dd></div>
        </dl>
        <p className="fine">좌우로 밀어 화면을 넘기고, 시트는 아래로 끌어 닫을 수 있습니다.</p>
      </Sheet>
    </>
  );
}
