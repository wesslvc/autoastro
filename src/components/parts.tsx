import type { ReactNode } from "react";

export function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <li className="row">
      <b>{label}</b>
      <span className="tnum">{children}</span>
      {hint && <em>{hint}</em>}
    </li>
  );
}

export function Frame({ version, count, progress }: { version: number; count?: number; progress?: number }) {
  return (
    <div className="frame">
      {version > 0 ? (
        <img src={`/api/image/latest?v=${version}`} alt="최근 촬영 프레임" />
      ) : (
        <div className="empty">아직 촬영된 프레임이 없습니다</div>
      )}
      {count != null && version > 0 && <div className="tag tnum">프레임 {count}</div>}
      {progress != null && progress > 0 && <div className="bar" style={{ width: `${progress}%` }} />}
    </div>
  );
}

export function Confirm({ open, title, body, onYes, onNo }: { open: boolean; title: string; body: string; onYes: () => void; onNo: () => void }) {
  if (!open) return null;
  return (
    <div className="sheet" onClick={onNo}>
      <div onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{body}</p>
        <div className="btns">
          <button className="btn ghost" onClick={onNo}>취소</button>
          <button className="btn" onClick={onYes}>확인</button>
        </div>
      </div>
    </div>
  );
}
