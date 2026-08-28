import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  dismissible?: boolean;
  onClose?: () => void;
  titleId: string;
  children: ReactNode;
  maxWidth?: string;
  centerOnMobile?: boolean; // forced-rest / daily-cap stay centered
  labelledBy?: string;
}

export default function ModalShell({
  open,
  dismissible = true,
  onClose,
  titleId,
  children,
  maxWidth = 'max-w-[440px]',
  centerOnMobile = false,
}: Props) {
  useEffect(() => {
    if (!open || !dismissible || !onClose) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, dismissible, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'fixed inset-0 z-50 flex bg-[rgba(59,51,42,0.45)] backdrop-blur-[6px]',
            centerOnMobile ? 'items-center justify-center p-4' : 'items-end justify-center p-4 sm:items-center',
          )}
          onClick={dismissible ? onClose : undefined}
        >
          <motion.div
            key="card"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ scale: 0.92, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 10, opacity: 0, transition: { duration: 0.18 } }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className={cn('w-full rounded-rxl bg-paper p-6 shadow-pop md:p-7', maxWidth)}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
