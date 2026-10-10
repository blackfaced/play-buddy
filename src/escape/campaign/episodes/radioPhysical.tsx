import { useRef, type ReactNode } from 'react';
/** A physical rotary knob: drag vertically, or use arrows/Home/End. */
export function Rotary({ label, value, count, onChange, children }: { label: string; value: number; count: number; onChange: (n: number) => void; children?: ReactNode }) {
  const drag = useRef<{ y: number; value: number } | null>(null);
  const change = (n: number) => onChange((n % count + count) % count);
  return <div className="signal-rotary"><div role="slider" tabIndex={0} aria-label={label} aria-valuemin={0} aria-valuemax={count - 1} aria-valuenow={value} onKeyDown={e => {
    if (['ArrowRight','ArrowUp','ArrowLeft','ArrowDown','Home','End'].includes(e.key)) { e.preventDefault(); change(e.key === 'Home' ? 0 : e.key === 'End' ? count - 1 : value + (['ArrowRight','ArrowUp'].includes(e.key) ? 1 : -1)); }
  }} onPointerDown={e => { drag.current = {y:e.clientY,value}; e.currentTarget.setPointerCapture?.(e.pointerId); }} onPointerMove={e => { if(drag.current) change(drag.current.value + Math.round((drag.current.y-e.clientY)/14)); }} onPointerUp={() => {drag.current=null;}} onPointerCancel={() => {drag.current=null;}}>
    <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="#122c36" stroke="#d6ae67" strokeWidth="3"/>{Array.from({length:count},(_,i)=><path key={i} d="M50 7v7" stroke="#d6ae67" transform={`rotate(${i*360/count} 50 50)`}/>)}<g transform={`rotate(${value*360/count} 50 50)`}><circle cx="50" cy="50" r="31" fill="#a9814e" stroke="#efd4a0" strokeWidth="2"/><path d="M50 47V23" stroke="#fff5d7" strokeWidth="5" strokeLinecap="round"/></g></svg>
  </div><span>{label}</span><div className="signal-knob-buttons"><button aria-label={`${label}逆时针`} onClick={()=>change(value-1)}>↶</button><output>{children ?? value}</output><button aria-label={`${label}顺时针`} onClick={()=>change(value+1)}>↷</button></div></div>;
}
