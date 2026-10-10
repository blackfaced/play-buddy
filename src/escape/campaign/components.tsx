import { useEffect, useRef, type ReactNode } from 'react';
/** Native modal supplies focus trapping, Escape dismissal and a real inert backdrop. */
export function DetailModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = typeof document !== 'undefined' ? document.activeElement as HTMLElement | null : null;
    dialog?.showModal?.();
    return () => { dialog?.close?.(); previous?.focus?.(); };
  }, []);
  return <dialog ref={ref} className="campaign-modal" aria-label={title} onCancel={e => { e.preventDefault(); onClose(); }} onClick={e => { if (e.target === ref.current) onClose(); }}>
    <header><h2>{title}</h2><button onClick={onClose} aria-label="关闭近景">关闭 ×</button></header>
    {children}
  </dialog>;
}
export function PhysicalDial({ label, value, count, onChange, labels }: { label: string; value: number; count: number; onChange: (value: number) => void; labels?: readonly string[] }) {
  return <div className="campaign-dial" role="group" aria-label={label}>
    <span>{label}</span><div><button aria-label={`${label}逆时针`} onClick={() => onChange((value + count - 1) % count)}>↶</button><output aria-live="polite">{labels?.[value] ?? value}</output><button aria-label={`${label}顺时针`} onClick={() => onChange((value + 1) % count)}>↷</button></div>
  </div>;
}
export function SceneObject({ label, children, onClick, className = '' }: { label: string; children: ReactNode; onClick: () => void; className?: string }) {
  return <button className={`campaign-object ${className}`} aria-label={`检查${label}`} onClick={onClick}>{children}<span>{label}</span></button>;
}
