import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CompletionEvent } from './useCompletionFeedback';

const AcceptedMotion = createContext<CompletionEvent | null>(null);
export function CompletionMotionScope({ event, children }: { event: CompletionEvent | null; children: ReactNode }) {
  return <AcceptedMotion.Provider value={event}>{children}</AcceptedMotion.Provider>;
}
/** Restored/revisited art starts in its final pose. Only a newly accepted event animates it. */
export function CompletionMotion({ milestone, motion, children }: { milestone: string; motion: 'lift' | 'unfold' | 'light' | 'water' | 'sail' | 'unlock'; children: ReactNode }) {
  const event = useContext(AcceptedMotion);
  const [mountedSequence] = useState(event?.sequence ?? 0);
  const fresh = event && event.sequence > mountedSequence && event.items.some(item => item.id === milestone);
  return <g className={fresh ? `completion-motion completion-motion-${motion}` : undefined} data-mechanism={milestone} data-mechanism-moving={fresh ? 'true' : undefined}>{children}</g>;
}
