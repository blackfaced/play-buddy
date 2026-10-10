import { useCallback, useEffect, useRef, useState } from 'react';
import { newlyAccepted, type CompletionMilestone } from './acceptedMilestones';

export interface CompletionEvent { sequence: number; items: CompletionMilestone[] }
/** Explicit event API: mounting, loading, navigating and normalization never emit a cue. */
export function useCompletionFeedback(initial: CompletionMilestone[], scope: string) {
  const seen = useRef(new Set(initial.map(item => item.id)));
  const sequence = useRef(0);
  const [current, setCurrent] = useState<{ scope: string; event: CompletionEvent | null }>({ scope, event: null });
  if (current.scope !== scope) setCurrent({ scope, event: null });
  const accept = useCallback((before: CompletionMilestone[], after: CompletionMilestone[]) => {
    const items = newlyAccepted(before, after).filter(item => !seen.current.has(item.id));
    if (!items.length) return;
    items.forEach(item => seen.current.add(item.id));
    setCurrent({ scope, event: { sequence: ++sequence.current, items } });
  }, [scope]);
  const clear = () => setCurrent({ scope, event: null });
  const reset = () => { seen.current.clear(); clear(); };
  const event = current.scope === scope ? current.event : null;
  useEffect(() => {
    if (!event) return;
    const timer = setTimeout(() => setCurrent(value => value.event === event ? { ...value, event: null } : value), 4200);
    return () => clearTimeout(timer);
  }, [event]);
  return { event, accept, clear, reset };
}

