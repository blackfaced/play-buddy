import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { StatusTier } from '@/store/useStore';

export function Panel({
  icon,
  title,
  right,
  children,
  className,
  delay = 0,
}: {
  icon?: ReactNode;
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.42, delay, ease: [0.4, 0, 0.2, 1] }}
      className={cn('rounded-rlg bg-paper p-5 shadow-card md:p-6', className)}
    >
      {(title || right) && (
        <header className="mb-4 flex items-center gap-2">
          {icon}
          {title ? <h2 className="text-h2 text-ink-900">{title}</h2> : null}
          {right ? <div className="ml-auto">{right}</div> : null}
        </header>
      )}
      {children}
    </motion.section>
  );
}

const TIER_STYLE: Record<StatusTier, { bg: string; text: string; dot: string }> = {
  green: { bg: 'bg-sage-100', text: 'text-sage-600', dot: 'bg-status-green' },
  yellow: { bg: 'bg-amber-100', text: 'text-status-yellow', dot: 'bg-status-yellow' },
  red: { bg: 'bg-brick-100', text: 'text-brick-600', dot: 'bg-status-red' },
};

export function StatusPill({ tier, label, pulsing }: { tier: StatusTier; label: string; pulsing?: boolean }) {
  const st = TIER_STYLE[tier];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-warm transition-colors duration-300',
        st.bg,
        st.text,
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', st.dot, (pulsing ?? tier === 'red') && 'animate-pulse-dot')} />
      {label}
    </span>
  );
}
