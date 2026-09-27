import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ShieldCheck, X } from 'lucide-react';
import ScorePanel from './ScorePanel';
import HealthPanel from './HealthPanel';
import { useStore, statusTierOf, STATUS_LABEL, useDailyCap } from '@/store/useStore';
import { cn } from '@/lib/utils';

/**
 * Desktop collapsible side rail: the game stage gets the full viewport width,
 * while the score / anti-addiction panels live behind two icon buttons as
 * floating cards. Collapsed (just the narrow rail) by default.
 */
export default function SideRail() {
  const [open, setOpen] = useState<'score' | 'health' | null>(null);
  const todayMs = useStore((s) => s.todayMs);
  const lock = useStore((s) => s.lock);
  const { capMs } = useDailyCap();
  const tier = statusTierOf(todayMs, lock, capMs);

  const dot =
    tier === 'green' ? 'bg-status-green' : tier === 'yellow' ? 'bg-status-yellow' : 'bg-status-red animate-pulse-dot';

  const toggle = (which: 'score' | 'health') => setOpen((o) => (o === which ? null : which));

  return (
    <div className="relative w-12 shrink-0 border-l border-sand-200 bg-paper/70 max-md:hidden">
      <div className="flex flex-col items-center gap-2 py-3">
        <button
          type="button"
          onClick={() => toggle('score')}
          aria-expanded={open === 'score'}
          aria-label="本局成绩面板"
          title="本局成绩"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-rmd transition-colors',
            open === 'score' ? 'bg-amber-100 text-amber-600' : 'text-ink-600 hover:bg-cream-100',
          )}
        >
          <Trophy className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => toggle('health')}
          aria-expanded={open === 'health'}
          aria-label={`健康游戏面板，${STATUS_LABEL[tier]}`}
          title="健康游戏"
          className={cn(
            'relative flex h-10 w-10 items-center justify-center rounded-rmd transition-colors',
            open === 'health' ? 'bg-sage-100 text-sage-600' : 'text-ink-600 hover:bg-cream-100',
          )}
        >
          <ShieldCheck className="h-5 w-5" />
          <span className={cn('absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full', dot)} aria-hidden="true" />
        </button>
      </div>

      <AnimatePresence>
        {open ? (
          <>
            {/* click-outside backdrop */}
            <motion.div
              key="rail-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setOpen(null)}
            />
            <motion.div
              key={`rail-card-${open}`}
              initial={{ opacity: 0, x: 16, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="absolute right-14 top-2 z-40 max-h-[calc(100dvh-16px)] w-[320px] overflow-y-auto"
            >
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  aria-label="收起面板"
                  className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-ink-400 hover:bg-cream-100"
                >
                  <X className="h-4 w-4" />
                </button>
                {open === 'score' ? <ScorePanel /> : <HealthPanel />}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
