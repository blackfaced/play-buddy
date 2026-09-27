import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, MoonStar, X } from 'lucide-react';
import ModalShell from './ModalShell';
import ProgressRing from './ProgressRing';
import GameButton from './GameButton';
import { useStore, fmtMs, fmtMinutes, REST_LEN_MS, useDailyCap } from '@/store/useStore';
import { playBell } from '@/game/sound';

/* ---------------- Break reminder toast (every 20 min) ---------------- */

export function BreakToast() {
  const breakToastMin = useStore((s) => s.breakToastMin);
  const lock = useStore((s) => s.lock);
  const dismiss = useStore((s) => s.dismissBreakToast);
  const visible = breakToastMin !== null && lock === null;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="break-toast"
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.26 }}
          className="fixed left-1/2 top-20 z-40 w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 overflow-hidden rounded-rmd bg-paper py-3 pl-4 pr-3 shadow-pop">
            <span className="absolute left-0 top-0 h-full w-1 bg-amber-500" />
            <motion.span
              initial={{ scaleY: 1 }}
              animate={{ scaleY: [1, 0.1, 0.1, 1] }}
              transition={{ duration: 1.2, times: [0, 0.25, 0.75, 1], delay: 0.3 }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100"
            >
              <Eye className="h-5 w-5 text-amber-500" />
            </motion.span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold text-ink-900">已经玩了 {breakToastMin} 分钟啦</p>
              <p className="text-caption-warm text-ink-600">
                看看 6 米外的远处 20 秒，让眼睛休息一下 👀
              </p>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 rounded-full p-1.5 text-ink-400 hover:bg-cream-100 hover:text-ink-600"
              aria-label="我知道了"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/* ---------------- Forced rest overlay (25 min streak) ---------------- */

const TIPS = ['看看窗外 20 秒', '眨眨眼，喝口水', '站起来伸个懒腰'];

export function ForcedRestOverlay() {
  const lock = useStore((s) => s.lock);
  const restUntil = useStore((s) => s.restUntil);
  const restDone = useStore((s) => s.restDone);
  const closeRest = useStore((s) => s.closeRest);
  const [breathIn, setBreathIn] = useState(true);
  const [tipIdx, setTipIdx] = useState(0);

  const open = lock === 'rest';

  useEffect(() => {
    if (!open) return;
    playBell();
    const b = window.setInterval(() => setBreathIn((v) => !v), 4000);
    const t = window.setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 8000);
    return () => {
      window.clearInterval(b);
      window.clearInterval(t);
    };
  }, [open]);

  return (
    <ModalShell open={open} dismissible={false} titleId="rest-title" centerOnMobile>
      <div className="flex flex-col items-center text-center" aria-live="polite">
        {restDone ? (
          <>
            <h2 id="rest-title" className="text-h1 text-sage-600">
              休息结束
            </h2>
            <p className="mt-2 text-body-warm text-ink-600">眼睛舒服多了吧？继续挑战新纪录！</p>
            <div className="mt-4">
              <ProgressRing endAt={0} total={REST_LEN_MS} done />
            </div>
            <GameButton className="mt-5" onClick={closeRest}>
              继续游戏
            </GameButton>
          </>
        ) : (
          <>
            <h2 id="rest-title" className="text-h1 text-ink-900">
              该休息啦
            </h2>
            <p className="mt-2 text-body-warm text-ink-600">
              小六边形也累啦～ 连续玩了 25 分钟，休息 10 分钟再回来吧
            </p>
            <p className="mt-1 text-caption-warm text-ink-400">
              被强制休息，今天上限 -15 分钟；自己主动休息 10 分钟以上就不会扣哦
            </p>
            <motion.div
              className="mt-4"
              animate={{ scale: breathIn ? 1.08 : 1 }}
              transition={{ duration: 4, ease: 'easeInOut' }}
            >
              <ProgressRing endAt={restUntil} total={REST_LEN_MS} done={false} />
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.p
                key={breathIn ? 'in' : 'out'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="mt-2 text-label-warm text-ink-400"
              >
                {breathIn ? '吸气……' : '呼气……'}
              </motion.p>
            </AnimatePresence>
            <AnimatePresence mode="wait">
              <motion.p
                key={tipIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4 }}
                className="mt-1 text-body-warm text-ink-600"
              >
                {TIPS[tipIdx]}
              </motion.p>
            </AnimatePresence>
          </>
        )}
      </div>
    </ModalShell>
  );
}

/* ---------------- Daily cap overlay (120 min) ---------------- */

export function DailyCapOverlay() {
  const lock = useStore((s) => s.lock);
  const todayMs = useStore((s) => s.todayMs);
  const best = useStore((s) => s.best);
  const roundsToday = useStore((s) => s.roundsToday);
  const { capMs } = useDailyCap();

  const stats: [string, string][] = [
    ['今日时长', fmtMs(Math.min(todayMs, capMs), true)],
    ['历史最佳', `${best.score}分`],
    ['今日局数', `${roundsToday}局`],
  ];

  return (
    <ModalShell open={lock === 'cap'} dismissible={false} titleId="cap-title" centerOnMobile>
      <div className="flex flex-col items-center text-center">
        <motion.div
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-cream-100"
        >
          <MoonStar className="h-12 w-12 text-slateblue-500" />
        </motion.div>
        <h2 id="cap-title" className="mt-3 text-h2 text-ink-900">
          今日游戏时间已用完
        </h2>
        <p className="mt-2 text-body-warm text-ink-600">
          今天的时间（{fmtMinutes(capMs)} 分钟）已经用完啦，明天再来挑战新纪录吧！
        </p>
        <div className="mt-4 grid w-full grid-cols-3 gap-2">
          {stats.map(([k, v]) => (
            <div key={k} className="rounded-rmd bg-cream-100 px-2 py-2.5">
              <div className="text-caption-warm text-ink-400">{k}</div>
              <div className="font-mono-num text-[15px] font-bold text-ink-900">{v}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-caption-warm text-ink-400">每天 0 点重置 · 已玩 {fmtMinutes(todayMs)} 分钟</p>
      </div>
    </ModalShell>
  );
}
