import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetObservatoryStatus,
  getGetObservatoryStatusQueryKey,
  useStartGoto,
  useStartCapture,
  useStopCapture,
  useEmergencyStop,
  useParkMount,
  type ObservatoryStatus,
} from "./api";
import { buzz } from "./settings";

type Toast = { id: number; msg: string; err: boolean };
const ToastCtx = createContext<(msg: string, err?: boolean) => void>(() => {});
export const useToastMsg = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<Toast | null>(null);
  const push = useCallback((msg: string, err = false) => {
    const id = Date.now();
    setT({ id, msg, err });
    if (err) buzz(40);
    setTimeout(() => setT((x) => (x?.id === id ? null : x)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-slot" aria-live="polite">
        {t && <div key={t.id} className={`toast${t.err ? " err" : ""}`}>{t.msg}</div>}
      </div>
    </ToastCtx.Provider>
  );
}

function errMsg(e: unknown): string {
  const d = (e as { data?: { error?: string } } | null)?.data;
  return d?.error || (e as Error)?.message || "요청에 실패했습니다";
}

export function useStatus() {
  return useGetObservatoryStatus({ query: { refetchInterval: 1000, queryKey: getGetObservatoryStatusQueryKey() } });
}

export function useActions() {
  const qc = useQueryClient();
  const toast = useToastMsg();
  const ok = (m: string) => (data: ObservatoryStatus) => {
    qc.setQueryData(getGetObservatoryStatusQueryKey(), data);
    toast(m);
  };
  const onError = (e: unknown) => toast(errMsg(e), true);
  return {
    goto: useStartGoto({ mutation: { onSuccess: ok("GoTo를 시작했습니다"), onError } }),
    start: useStartCapture({ mutation: { onSuccess: ok("촬영을 시작했습니다"), onError } }),
    stop: useStopCapture({ mutation: { onSuccess: ok("촬영을 멈췄습니다"), onError } }),
    estop: useEmergencyStop({ mutation: { onSuccess: ok("모든 장비를 정지했습니다"), onError } }),
    park: useParkMount({ mutation: { onSuccess: ok("파킹을 시작했습니다"), onError } }),
  };
}

export const fmtRa = (h: number) => {
  let hh = Math.floor(h);
  let m = Math.floor((h - hh) * 60);
  let s = Math.round(((h - hh) * 60 - m) * 60);
  if (s === 60) { s = 0; m += 1; }
  if (m === 60) { m = 0; hh = (hh + 1) % 24; }
  return `${String(hh).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
};
export const fmtDec = (d: number) => {
  const a = Math.abs(d);
  const deg = Math.floor(a);
  const min = Math.floor((a - deg) * 60);
  const sec = Math.round(((a - deg) * 60 - min) * 60);
  return `${d < 0 ? "−" : "+"}${String(deg).padStart(2, "0")}° ${String(min).padStart(2, "0")}′ ${String(Math.min(sec, 59)).padStart(2, "0")}″`;
};
export const fmtExp = (s: number) => (s < 1 ? `${+(s * 1000).toFixed(1)}ms` : `${+s.toFixed(1)}s`);
export const compass = (az: number) => ["북", "북동", "동", "남동", "남", "남서", "서", "북서"][Math.round((((az % 360) + 360) % 360) / 45) % 8];
