import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import './music.css';

/** One focus scope keeps the moving apparatus beside its controls and result. */
export function MusicDialog({ kind, title, returnLabel, held = false, onClose, children }: {
  kind: 'chimes' | 'roll' | 'drum'; title: string; returnLabel: string;
  held?: boolean; onClose: () => void; children: ReactNode;
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
      queueMicrotask(() => {
        if (typeof document === 'undefined') return;
        const trigger = Array.from(document.querySelectorAll<HTMLButtonElement>('.music-room button'))
          .find(button => button.textContent === returnLabel);
        if (trigger && !trigger.closest('[inert]')) trigger.focus({ preventScroll: true });
      });
    };
  }, [returnLabel]);
  return <dialog ref={ref} className={`music-puzzle-dialog music-dialog-${kind}`} aria-label={title}
    onKeyDownCapture={event => {
      // Only a lifted copper tube consumes the first Escape. Installed pegs and
      // mute state are also pressed controls, but must never trap this dialog.
      if (event.key === 'Escape' && held) event.preventDefault();
    }}
    onCancel={event => { event.preventDefault(); onClose(); }}>{children}</dialog>;
}
