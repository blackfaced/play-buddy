import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

/**
 * GSAP count-up number. Formats with `format`. Duration 300ms power1.out.
 */
export default function AnimatedNumber({
  value,
  format = (v: number) => String(Math.round(v)),
  duration = 0.3,
  className,
}: {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(value);
  const ref = useRef({ v: value });
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      ref.current.v = value;
      setDisplay(value);
      return;
    }
    const from = ref.current.v;
    if (from === value) return;
    const obj = { v: from };
    const tween = gsap.to(obj, {
      v: value,
      duration,
      ease: 'power1.out',
      onUpdate: () => setDisplay(obj.v),
      onComplete: () => {
        ref.current.v = value;
      },
    });
    ref.current.v = value;
    return () => {
      tween.kill();
    };
  }, [value, duration]);

  return <span className={className}>{format(display)}</span>;
}
