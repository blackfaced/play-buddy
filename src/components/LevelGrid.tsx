import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Lock, Star } from 'lucide-react';
import { LEVELS, TIER_NAMES, TIER_RANGES } from '@/game/levels';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

function Stars({ n, className }: { n: number; className?: string }) {
  return (
    <span className={cn('flex items-center justify-center gap-[1px]', className)}>
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          className={cn('h-3 w-3', i < n ? 'fill-amber-500 text-amber-500' : 'fill-sand-200 text-sand-200')}
        />
      ))}
    </span>
  );
}

/** Group levels into tiers (入门 1-10 … 大师 41-50 / 宗师 51-70 / 传说 71-100). */
const TIERS: { name: string; from: number; to: number }[] = TIER_NAMES.map((name, t) => {
  const [first, last] = TIER_RANGES[t];
  return { name, from: first - 1, to: Math.min(last, LEVELS.length) - 1 };
});

/** Level-select grid: tiered sections, lock state, earned stars, scrollable for 100 levels. */
export default function LevelGrid() {
  const levelIdx = useStore((s) => s.levelIdx);
  const progress = useStore((s) => s.progress);
  const selectLevel = useStore((s) => s.selectLevel);
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  // keep the selected/unlocked level visible inside the scrollable grid
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'center' });
  }, []);

  return (
    <div
      className="max-h-[300px] w-full overflow-y-auto overscroll-contain pr-1"
      role="radiogroup"
      aria-label="选择关卡"
    >
      {TIERS.map((tier) => (
        <div key={tier.name} className="mb-3 last:mb-0">
          <div className="mb-1.5 flex items-center justify-between px-0.5">
            <span className="text-caption-warm font-bold text-ink-600">
              {tier.name} {tier.from + 1}-{tier.to + 1}
            </span>
            <span className="text-caption-warm text-ink-400">
              已解锁 {Math.max(0, Math.min(progress.unlocked, tier.to + 1) - tier.from)}/{tier.to - tier.from + 1}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {LEVELS.slice(tier.from, tier.to + 1).map((lv, k) => {
              const i = tier.from + k;
              const locked = i >= progress.unlocked;
              const selected = i === levelIdx;
              const rec = progress.rec[i];
              return (
                <motion.button
                  key={lv.id}
                  ref={selected ? selectedRef : undefined}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={locked ? `第 ${lv.id} 关，未解锁` : `第 ${lv.id} 关${rec ? `，${rec.stars} 星` : ''}`}
                  disabled={locked}
                  onClick={() => selectLevel(i)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.03 * i, duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                  whileHover={locked ? undefined : { scale: 1.06, y: -2 }}
                  whileTap={locked ? undefined : { scale: 0.94 }}
                  title={locked ? '通关前一关解锁' : lv.feature}
                  className={cn(
                    'flex h-14 flex-col items-center justify-center gap-0.5 rounded-rmd border transition-colors',
                    locked
                      ? 'cursor-not-allowed border-sand-200 bg-cream-100 text-ink-400'
                      : selected
                        ? 'border-terracotta-500 bg-terracotta-100 text-ink-900 shadow-btn'
                        : 'border-sand-300 bg-paper text-ink-900 hover:bg-cream-100',
                  )}
                >
                  {locked ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <>
                      <span className="font-mono-num text-[16px] font-bold leading-none">{lv.id}</span>
                      <Stars n={rec?.stars ?? 0} />
                    </>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
