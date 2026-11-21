import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Settings = { night: boolean; wake: boolean; haptics: boolean; aboveOnly: boolean };
const DEFAULTS: Settings = { night: false, wake: false, haptics: true, aboveOnly: false };

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("settings") || "{}") };
  } catch {
    return DEFAULTS;
  }
}

type Ctx = { s: Settings; set: <K extends keyof Settings>(k: K, v: Settings[K]) => void };
const SettingsCtx = createContext<Ctx>({ s: DEFAULTS, set: () => {} });
export const useSettings = () => useContext(SettingsCtx);

let hapticsOn = DEFAULTS.haptics;
export const buzz = (ms = 12) => {
  if (hapticsOn && "vibrate" in navigator) navigator.vibrate(ms);
};
export const wakeLockSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState(load);
  const set: Ctx["set"] = (k, v) => setS((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    try { localStorage.setItem("settings", JSON.stringify(s)); } catch {}
    hapticsOn = s.haptics;
    const root = document.documentElement;
    if (s.night) root.dataset.theme = "night";
    else delete root.dataset.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", s.night ? "#070202" : "#0a0e1a");
  }, [s]);

  // Keep the screen on while at the telescope. The lock drops when the tab is
  // hidden, so re-acquire it on return.
  useEffect(() => {
    if (!s.wake || !wakeLockSupported) return;
    let lock: WakeLockSentinel | null = null;
    const acquire = () => {
      if (document.visibilityState === "visible")
        navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    };
    acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, [s.wake]);

  return <SettingsCtx.Provider value={{ s, set }}>{children}</SettingsCtx.Provider>;
}
