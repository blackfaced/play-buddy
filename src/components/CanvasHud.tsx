import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { togglePause } from '@/game/controller';
import CoinIcon from './CoinIcon';

/**
 * In-game HUD drawn over the canvas (reference-game layout):
 * big centered 「第 N 关」, round red pause button top-left, coin pill
 * top-right, red vertical descent-progress rail on the right edge.
 * Everything is pointer-events-none except the pause button.
 */

function useVisible() {
  const phase = useStore((s) => s.phase);
  return phase === 'ready' || phase === 'playing' || phase === 'paused';
}

export function LevelBanner() {
  const levelIdx = useStore((s) => s.levelIdx);
  const mode = useStore((s) => s.mode);
  const visible = useVisible();
  const text = mode === 'daily' ? '每日挑战' : mode === 'endless' ? '无尽模式' : `第 ${levelIdx + 1} 关`;
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key={`banner-${mode}-${levelIdx}`}
          initial={{ y: -18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          className="pointer-events-none absolute left-1/2 top-2.5 -translate-x-1/2 select-none whitespace-nowrap font-display text-[clamp(21px,5.6vw,30px)] leading-none text-white [text-shadow:0_2px_0_rgba(30,90,140,.45),0_3px_10px_rgba(30,90,140,.35)]"
          aria-hidden="true"
        >
          {text}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function PauseFab() {
  const phase = useStore((s) => s.phase);
  const lock = useStore((s) => s.lock);
  const visible = useVisible();
  const paused = phase === 'paused';
  return (
    <motion.button
      type="button"
      initial={false}
      animate={{ scale: visible ? 1 : 0, opacity: visible ? 1 : 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      whileTap={{ scale: 0.88 }}
      onClick={togglePause}
      disabled={!visible || lock !== null}
      aria-label={paused ? '继续游戏' : '暂停游戏'}
      className="absolute left-2.5 top-2.5 flex h-[52px] w-[52px] items-center justify-center rounded-full border-2 border-white/70 bg-gradient-to-b from-[#FF7A5C] to-[#E8432F] text-white shadow-[0_3px_0_rgba(150,30,20,.4),0_6px_14px_rgba(200,60,40,.35)] disabled:pointer-events-none"
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      {paused ? (
        <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6" fill="currentColor" aria-hidden="true">
          <path d="M7 4.8c0-1.1 1.2-1.8 2.2-1.2l11 6.4c.9.6.9 1.9 0 2.5l-11 6.4c-1 .6-2.2-.1-2.2-1.2V4.8z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden="true">
          <rect x="5.5" y="4" width="4.6" height="16" rx="1.6" />
          <rect x="13.9" y="4" width="4.6" height="16" rx="1.6" />
        </svg>
      )}
    </motion.button>
  );
}

export function CoinPill() {
  const coins = useStore((s) => s.coins);
  const visible = useVisible();
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ y: -14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.28 }}
          className="pointer-events-none absolute right-2.5 top-3 flex h-9 select-none items-center gap-1.5 rounded-full bg-white/30 pl-2 pr-3 backdrop-blur-[2px]"
          aria-label={`金币 ${coins}`}
        >
          <CoinIcon className="h-5 w-5" />
          <motion.span
            key={coins}
            initial={{ scale: 1.25 }}
            animate={{ scale: 1 }}
            className="font-mono-num text-[16px] font-bold text-[#B97A12] [text-shadow:0_1px_0_rgba(255,255,255,.7)]"
          >
            {coins}
          </motion.span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function ProgressRail() {
  const progress = useStore((s) => s.heroProgress);
  const visible = useVisible();
  const pct = Math.round(progress * 100);
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 8 }}
          transition={{ duration: 0.3 }}
          className="pointer-events-none absolute bottom-[24%] right-2 top-[24%] w-3.5"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={`下落进度 ${pct}%`}
        >
          {/* track */}
          <div className="absolute inset-0 rounded-full border border-white/60 bg-white/30 shadow-[inset_0_1px_3px_rgba(30,90,140,.25)]" />
          {/* red fill grows downward as the hero descends */}
          <div
            className="absolute left-0 right-0 top-0 rounded-full bg-gradient-to-b from-[#FF8A66] to-[#E8432F] transition-[height] duration-300 ease-out"
            style={{ height: `${Math.max(4, pct)}%` }}
          />
          {/* sparkles on the rail */}
          <div className="absolute inset-x-0 top-2 text-center text-[8px] leading-none text-white/90 [text-shadow:0_1px_2px_rgba(200,60,40,.6)]">
            ✦
          </div>
          {/* hexagon marker riding the fill */}
          <div
            className="absolute left-1/2 h-3.5 w-3.5 -translate-x-1/2 transition-[top] duration-300 ease-out"
            style={{ top: `calc(${Math.max(4, pct)}% - 7px)` }}
          >
            <svg viewBox="0 0 24 24" className="h-full w-full drop-shadow-[0_1px_1px_rgba(150,30,20,.5)]">
              <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="#fff" stroke="#E8432F" strokeWidth="2" />
            </svg>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function CanvasHud() {
  return (
    <>
      <LevelBanner />
      <PauseFab />
      <CoinPill />
      <ProgressRail />
    </>
  );
}
