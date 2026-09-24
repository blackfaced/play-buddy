import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Info, AlertTriangle, Home } from 'lucide-react';
import GameButton from './GameButton';
import { useStore } from '@/store/useStore';
import { startGame, togglePause, goToMenu } from '@/game/controller';

export default function ControlBar() {
  const phase = useStore((s) => s.phase);
  const lock = useStore((s) => s.lock);
  const levelIdx = useStore((s) => s.levelIdx);
  const [confirming, setConfirming] = useState(false);
  const [exitConfirming, setExitConfirming] = useState(false);
  const timer = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (exitTimer.current) window.clearTimeout(exitTimer.current);
    };
  }, []);

  // cancel confirm when phase changes (e.g. game over)
  useEffect(() => setConfirming(false), [phase, lock]);
  useEffect(() => setExitConfirming(false), [phase, lock]);

  // keyboard "R" restart (same inline confirm flow)
  useEffect(() => {
    const h = () => onMainRef.current();
    window.addEventListener('bb:restart-request', h);
    return () => window.removeEventListener('bb:restart-request', h);
  }, []);

  const mode = useStore((s) => s.mode);
  const inRound = phase === 'playing' || phase === 'paused' || phase === 'ready';
  const mainLabel =
    phase === 'idle'
      ? mode === 'daily'
        ? '开始每日挑战'
        : mode === 'endless'
          ? '开始自由无尽'
          : `开始第 ${levelIdx + 1} 关`
      : '重新开始';
  const mainIcon = phase === 'idle' ? <Play /> : <RotateCcw />;

  const onMain = () => {
    if (lock !== null) return;
    if (inRound && !confirming) {
      setConfirming(true);
      timer.current = window.setTimeout(() => setConfirming(false), 3000);
      return;
    }
    if (timer.current) window.clearTimeout(timer.current);
    setConfirming(false);
    startGame();
  };
  const onMainRef = useRef(onMain);
  onMainRef.current = onMain;

  const pauseDisabled = phase === 'idle' || phase === 'over' || phase === 'clear' || lock !== null;

  // 对局中退出回主页：两段式确认防误触（每日挑战中途退出不记成绩、不断打卡）
  const onExit = () => {
    if (!exitConfirming) {
      setExitConfirming(true);
      exitTimer.current = window.setTimeout(() => setExitConfirming(false), 3000);
      return;
    }
    if (exitTimer.current) window.clearTimeout(exitTimer.current);
    setExitConfirming(false);
    goToMenu();
  };

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
      <GameButton
        onClick={onMain}
        icon={confirming ? <AlertTriangle /> : mainIcon}
        disabled={lock !== null}
        aria-keyshortcuts="r"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={confirming ? 'confirm' : mainLabel}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {confirming ? '确定重开？' : mainLabel}
          </motion.span>
        </AnimatePresence>
      </GameButton>
      <GameButton
        variant="secondary"
        onClick={togglePause}
        disabled={pauseDisabled}
        icon={
          <motion.span
            key={phase === 'paused' ? 'play' : 'pause'}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="inline-flex"
          >
            {phase === 'paused' ? <Play /> : <Pause />}
          </motion.span>
        }
        aria-keyshortcuts="p"
      >
        {phase === 'paused' ? '继续' : '暂停'}
      </GameButton>
      <GameButton
        variant="ghost"
        icon={<Info />}
        onClick={() => document.getElementById('rules')?.scrollIntoView({ behavior: 'smooth' })}
      >
        玩法
      </GameButton>
      {inRound && (
        <GameButton variant="ghost" icon={exitConfirming ? <AlertTriangle /> : <Home />} onClick={onExit}>
          {exitConfirming ? '确定退出？' : '退出'}
        </GameButton>
      )}
    </div>
  );
}
