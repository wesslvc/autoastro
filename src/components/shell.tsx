import { useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useActions } from "../lib/observatory";

const tabs = [
  { href: "/", label: "상태" },
  { href: "/targets", label: "대상" },
  { href: "/capture", label: "촬영" },
];

export function Shell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const { estop } = useActions();
  const [night, setNight] = useState(document.documentElement.dataset.theme === "night");
  const toggle = () => {
    const next = !night;
    setNight(next);
    if (next) document.documentElement.dataset.theme = "night";
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem("theme", next ? "night" : "day"); } catch {}
  };
  return (
    <div className="wrap">
      <header className="top">
        <span className="brand">원격 천문대</span>
        <button className="estop" disabled={estop.isPending} onClick={() => estop.mutate()}>비상 정지</button>
      </header>
      <nav className="nav">
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} className={(t.href === "/" ? loc === "/" : loc.startsWith(t.href)) ? "on" : ""}>
            {t.label}
          </Link>
        ))}
      </nav>
      <main>{children}</main>
      <footer className="foot">
        <span>N.I.N.A. Advanced API</span>
        <button onClick={toggle}>{night ? "주간 모드" : "야간 모드"}</button>
      </footer>
    </div>
  );
}
