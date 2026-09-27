import { useEffect, useRef, useState } from 'react';
import { fmtMs } from '@/store/useStore';

/**
 * SVG progress ring with rAF-driven stroke-dashoffset and center countdown.
 * `endAt` is a wall-clock timestamp; `total` the full duration ms.
 */
export default function ProgressRing({
  endAt,
  total,
  done,
}: {
  endAt: number;
  total: number;
  done: boolean;
}) {
  const circleRef = useRef<SVGCircleElement>(null);
  const [label, setLabel] = useState('10:00');
  const R = 52;
  const C = 2 * Math.PI * R;

  useEffect(() => {
    let raf = 0;
    const step = () => {
      const remain = Math.max(0, endAt - Date.now());
      const frac = total > 0 ? remain / total : 0;
      if (circleRef.current) {
        circleRef.current.style.strokeDashoffset = String(C * frac);
      }
      setLabel(fmtMs(remain));
      if (remain > 0) raf = requestAnimationFrame(step);
    };
    if (!done) {
      raf = requestAnimationFrame(step);
    } else {
      if (circleRef.current) circleRef.current.style.strokeDashoffset = '0';
      setLabel('00:00');
    }
    return () => cancelAnimationFrame(raf);
  }, [endAt, total, done, C]);

  return (
    <div className="relative inline-flex h-[120px] w-[120px] items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="#E8DCC5" strokeWidth="8" />
        <circle
          ref={circleRef}
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke={done ? '#7A9267' : '#C9714A'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={0}
        />
      </svg>
      <span className="absolute text-timer text-ink-900">{done ? '完成' : label}</span>
    </div>
  );
}
