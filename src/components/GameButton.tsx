import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger-ghost';

const base =
  'inline-flex h-12 items-center justify-center gap-2 rounded-rmd px-[22px] text-[15px] font-bold font-body transition-colors duration-100 select-none disabled:opacity-45 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary: 'bg-terracotta-600 text-paper shadow-btn hover:bg-terracotta-500',
  secondary: 'bg-paper text-ink-900 border border-sand-300 shadow-btn hover:bg-cream-100',
  ghost: 'bg-transparent text-ink-600 hover:bg-cream-100',
  'danger-ghost': 'bg-transparent text-brick-600 hover:bg-brick-100',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

export default function GameButton({ variant = 'primary', icon, className, children, ...rest }: Props) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.95, y: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={cn(base, variants[variant], className)}
      {...(rest as object)}
    >
      {icon ? <span className="inline-flex h-[18px] w-[18px] items-center [&>svg]:h-[18px] [&>svg]:w-[18px]">{icon}</span> : null}
      {children}
    </motion.button>
  );
}
