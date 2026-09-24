import type { GameEngine } from './engine';
import { useStore, dateKeyOf } from '@/store/useStore';
import { unlockAudio } from './sound';
import { extraRowsForClears } from './levels';
import { dailySeedFor } from './endless';
import { logDiag } from '@/lib/diag';

/** Singleton bridge between React UI, the physics engine and the zustand store. */

let engine: GameEngine | null = null;

export function registerEngine(e: GameEngine | null): void {
  engine = e;
}

export function getEngine(): GameEngine | null {
  return engine;
}

let lastStartAt = 0;

/** Start a fresh round of the selected level (from start overlay / retry / confirmed restart). */
export function startGame(): void {
  if (!engine) return;
  const now = Date.now();
  if (now - lastStartAt < 500) return; // debounce duplicate triggers
  lastStartAt = now;
  const s = useStore.getState();
  if (s.lock !== null) return; // locked by anti-addiction
  logDiag('action', `startGame mode=${s.mode} level=${s.levelIdx} from=${s.phase}`);
  // retry from an endless/daily run keeps that mode (same day → same daily tower)
  if (s.mode !== 'level') {
    startEndless(s.mode === 'daily');
    return;
  }
  unlockAudio();
  // replay growth: each previous clear of this level adds +2 rows (max +6)
  const extraRows = extraRowsForClears(s.progress.rec[s.levelIdx]?.clears ?? 0);
  engine.newRound(s.levelIdx, extraRows);
  s.startRound(engine.totalBlocks(), s.levelIdx, engine.roundLimitMs());
  // brief 400ms "ready" settle, then physics on
  window.setTimeout(() => {
    const st = useStore.getState();
    if (st.phase !== 'ready') return;
    engine?.beginPlay();
    st.setPhase('playing');
  }, 400);
}

/**
 * Start an endless run. daily=true → 每日挑战 (today's date seeds the tower,
 * everyone gets the same one, results recorded); daily=false → 自由无尽
 * (random seed, practice, no records). No total time limit; anti-addiction
 * lock/timer is unaffected and keeps working.
 */
export function startEndless(daily: boolean): void {
  if (!engine) return;
  const now = Date.now();
  if (now - lastStartAt < 500) return;
  lastStartAt = now;
  const s = useStore.getState();
  if (s.lock !== null) return;
  unlockAudio();
  const seed = daily ? dailySeedFor(dateKeyOf(now)) : Math.floor(Math.random() * 2147483646) + 1;
  engine.newEndlessRound(seed, daily);
  s.startEndless(daily ? 'daily' : 'endless', 3);
  window.setTimeout(() => {
    const st = useStore.getState();
    if (st.phase !== 'ready') return;
    engine?.beginPlay();
    st.setPhase('playing');
  }, 400);
}

/** Retry the current level (fail overlay / replay after clear). */
export function retryLevel(): void {
  startGame();
}

/** Advance to the next level and start it. */
export function nextLevel(): void {
  const s = useStore.getState();
  s.selectLevel(s.levelIdx + 1);
  startGame();
}

/** Back to the level-select / start screen — default to the highest unlocked level. */
export function goToMenu(): void {
  const s = useStore.getState();
  logDiag('action', `goToMenu mode=${s.mode} from=${s.phase}`);
  // 中途退出不结算：每日挑战/无尽的连续打卡与成绩只在 endRound 记录，
  // 主动退出视为"没玩过这局"
  s.selectLevel(s.progress.unlocked - 1);
  s.setPhase('idle'); // GameCanvas 监听 phase='idle' → setStepping(false) 冻结物理
}

/** Start overlay primary action: jump to the highest unlocked level and play. */
export function continueGame(): void {
  const s = useStore.getState();
  s.selectLevel(s.progress.unlocked - 1);
  startGame();
}

export function pauseGame(): void {
  const s = useStore.getState();
  if (s.phase !== 'playing' && s.phase !== 'ready') return;
  logDiag('action', 'pause');
  engine?.freeze();
  s.setPhase('paused');
}

export function resumeGame(): void {
  const s = useStore.getState();
  if (s.phase !== 'paused' || s.lock !== null) return;
  logDiag('action', 'resume');
  s.setPhase('playing');
  engine?.unfreeze();
}

export function togglePause(): void {
  const s = useStore.getState();
  if (s.phase === 'paused') resumeGame();
  else if (s.phase === 'playing' || s.phase === 'ready') pauseGame();
}

/** After game over overlay → 再来一局 starts immediately. */
export function playAgain(): void {
  startGame();
}

export function cursorMove(dir: 'left' | 'right' | 'up' | 'down'): void {
  engine?.cursorMove(dir);
}

export function cursorRemove(): void {
  engine?.cursorRemove();
}
