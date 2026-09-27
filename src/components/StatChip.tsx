import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import AnimatedNumber from './AnimatedNumber';

interface Props {
  icon: ReactNode;
  label: string;
  value: number;
  format?: (v: number) => string;
  iconClass?: string;
  valueClass?: string;
  delay?: number;
  dimmed?: boolean;
  pulseKey?: number | string; // chip scale-pulse on change
  ariaLabel?: string;
  flashKey?: number | string; // amber flash on change
}

export default function StatChip({
  icon,
  label,
  value,
  format,
  iconClass,
  valueClass,
  delay = 0,
  dimmed = false,
  pulseKey,
  ariaLabel,
  flashKey,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: dimmed ? 0.6 : 1, y: 0 }}
      transition={{ duration: 0.38, delay, ease: [0.4, 0, 0.2, 1] }}
      className="min-w-0 flex-1"
      aria-label={ariaLabel}
    >
      <motion.div
        key={pulseKey}
        initial={pulseKey !== undefined ? { scale: 1.04 } : false}
        animate={{ scale: 1 }}
        transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative flex items-center gap-2.5 rounded-rmd bg-paper px-3 py-1.5 shadow-card overflow-hidden max-md:px-2 max-md:gap-1.5"
      >
        {flashKey !== undefined && flashKey !== 0 ? (
          <motion.span
            key={`f-${String(flashKey)}`}
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 bg-amber-100 pointer-events-none"
          />
        ) : null}
        <span className={cn('relative inline-flex h-4 w-4 shrink-0 items-center [&>svg]:h-4 [&>svg]:w-4', iconClass)}>
          {icon}
        </span>
        <span className="relative min-w-0">
          <span className="block text-label-warm text-ink-400">{label}</span>
          <AnimatedNumber
            value={value}
            format={format}
            className={cn('text-stat block truncate max-md:text-[18px]', valueClass)}
          />
        </span>
      </motion.div>
    </motion.div>
  );
}
