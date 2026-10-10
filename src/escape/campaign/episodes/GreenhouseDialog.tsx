import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import './greenhouseExploration.css';

/** Keep the apparatus, its controls and its result in one native focus scope. */
export function GreenhouseDialog({ kind, title, returnLabel, onClose, children }: {
  kind: 'pipes' | 'growth' | 'bench'; title: string; returnLabel: string;
  onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const roots = typeof document === 'undefined' ? [] :
      [document.documentElement, document.body].filter(element => element?.style);
    const overflow = roots.map(element => element.style.overflow);
    roots.forEach(element => { element.style.overflow = 'hidden'; });
    dialog?.showModal?.();
    return () => {
      dialog?.close?.();
      roots.forEach((element, index) => { element.style.overflow = overflow[index]; });
      // The room hotspot is remounted when this close-up closes. Wait for that
      // commit, and never move focus into an inert room during a health lock.
      queueMicrotask(() => {
        if (typeof document === 'undefined') return;
        const trigger = document.querySelector<HTMLElement>(`[aria-label="${returnLabel}"]`);
        if (trigger && !trigger.closest?.('[inert]')) trigger.focus({ preventScroll: true });
      });
    };
  }, [returnLabel]);
  return <dialog ref={ref} className={`gh-puzzle-dialog gh-dialog-${kind}`} aria-label={title}
    onKeyDownCapture={event => {
      // ObjectRow already puts a picked-up card or pot down on Escape. Reserve that
      // first Escape for the reversible operation; a second closes the view.
      if (event.key === 'Escape' && ref.current?.querySelector('[aria-pressed="true"]')) event.preventDefault();
    }}
    onCancel={event => { event.preventDefault(); onClose(); }}>{children}</dialog>;
}
