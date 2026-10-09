import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { hints, type EscapeState } from "./logic";
import { guidancePolicy, type GuidanceMode } from "./guidancePolicy";
const GuidanceContext = createContext<GuidanceMode>("standard");
export function GuidanceProvider({ mode, children }: { mode: GuidanceMode; children: ReactNode }) {
  return <GuidanceContext.Provider value={mode}>{children}</GuidanceContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useGuidance() { return guidancePolicy(useContext(GuidanceContext)); }
export function EasyGuidance({ children }: { children: ReactNode }) {
  return useGuidance().automaticRules ? <div data-guidance="rule">{children}</div> : null;
}
const descriptions: Record<GuidanceMode, string> = {
  easy: "简单：提供解题引导，可逐步查看提示。",
  standard: "标准：自己发现规律，需要时主动查看提示。",
  challenge: "挑战：不提供提示或物件标记，保留键盘操作。",
};
export function ModeControls({ mode, onChange }: { mode: GuidanceMode; onChange: (mode: GuidanceMode) => void }) {
  return <aside className="escape-mode-controls" aria-label="探索模式">
    <span className="escape-version">十场景版 · v4.0</span>
    <label>探索模式 <select value={mode} onChange={event => onChange(event.target.value as GuidanceMode)} aria-describedby="escape-mode-description">
      <option value="easy">简单</option><option value="standard">标准</option><option value="challenge">挑战</option>
    </select></label>
    <p id="escape-mode-description">{descriptions[mode]} 切换保留进度。</p>
  </aside>;
}
export function Hotspot({ mode, label, onClick, style }: { mode: GuidanceMode; label: string; onClick: () => void; style: CSSProperties }) {
  return <button className={`escape-hotspot${guidancePolicy(mode).markers ? "" : " unmarked"}`} aria-label={`检查${label}`} onClick={onClick} style={style}>
    <span>{label}</span>{guidancePolicy(mode).markers && <i aria-hidden="true">＋</i>}
  </button>;
}
export function HintPanel({ mode, state, level, onNext }: { mode: GuidanceMode; state: EscapeState; level: number; onNext: () => void }) {
  if (!guidancePolicy(mode).hints) return null;
  return <>
    <p>先给一点方向，再解释规律。最后一步会揭晓答案，可以随时合上。</p>
    <div className="escape-hint-lines">{hints(state).slice(0, Math.min(level, 2) + 1).map((hint, i) => <p key={hint}><span>0{i + 1}</span>{hint}</p>)}</div>
    <button className="escape-primary" disabled={level >= 2} onClick={onNext}>{level >= 2 ? "已显示答案" : level === 1 ? "揭晓答案（含完整解法）" : "解释规律"}</button>
  </>;
}
