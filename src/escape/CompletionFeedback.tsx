import { useEffect, useRef } from 'react';
import type { CompletionMilestone } from './acceptedMilestones';
import type { CompletionEvent } from './useCompletionFeedback';
import './completion-feedback.css';

export function CompletionFeedback({ event, completed }: { event: CompletionEvent | null; completed: CompletionMilestone[] }) {
  const popup = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = popup.current;
    // A nonmodal popover remains visible above native close-up dialogs without stealing focus.
    if (event && element?.showPopover) element.showPopover();
    return () => { if (element?.matches?.(':popover-open')) element.hidePopover(); };
  }, [event]);
  return <>
    <div className="completion-announcement" aria-live="polite" aria-atomic="true">{event?.items.map(item => item.label).join('。') ?? ''}</div>
    {event && <div key={event.sequence} ref={popup} popover="manual" className="completion-cue" data-completion-event={event.sequence} aria-hidden="true">
      <svg viewBox="0 0 48 48" className="completion-seal"><circle cx="24" cy="24" r="20"/><path d="m14 24 7 7 14-15"/></svg>
      <span>{event.items.map(item => item.label).join(' · ')}</span>
    </div>}
    {completed.length > 0 && <aside className="completion-record" aria-label="已完成的机关">
      {completed.map(item => <span key={item.id} data-completion-milestone={item.id}><span aria-hidden="true">✓ </span>{item.label}</span>)}
    </aside>}
  </>;
}
