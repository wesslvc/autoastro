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

type Toast = { id: number; msg: string; err: boolean };
const ToastCtx = createContext<(msg: string, err?: boolean) => void>(() => {});
export const useToastMsg = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<Toast | null>(null);
  const push = useCallback((msg: string, err = false) => {
    const id = Date.now();
    setT({ id, msg, err });
    setTimeout(() => setT((x) => (x?.id === id ? null : x)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {t && <div className={`toast${t.err ? " err" : ""}`} role="status">{t.msg}</div>}
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
    stop: useStopCapture({ mutation: { onSuccess: ok("촬영을 정지했습니다"), onError } }),
    estop: useEmergencyStop({ mutation: { onSuccess: ok("비상 정지를 실행했습니다"), onError } }),
    park: useParkMount({ mutation: { onSuccess: ok("파킹을 시작했습니다"), onError } }),
  };
}

export const fmtRa = (h: number) => {
  const hh = Math.floor(h);
  const m = Math.floor((h - hh) * 60);
  const s = Math.round(((h - hh) * 60 - m) * 60);
  return `${hh}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
};
export const fmtDeg = (d: number) => `${d >= 0 ? "+" : "-"}${Math.abs(d).toFixed(2)}°`;
