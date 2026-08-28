import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import HudBar from '@/components/HudBar';
import GameCanvas from '@/components/GameCanvas';
import ControlBar from '@/components/ControlBar';
import { ScoreStrip } from '@/components/ScorePanel';
import HealthPanel from '@/components/HealthPanel';
import SideRail from '@/components/SideRail';
import Rules from '@/components/Rules';
import Footer from '@/components/Footer';
import { StartOverlay, PauseOverlay, FailOverlay, ClearOverlay } from '@/components/Overlays';
import { useStore } from '@/store/useStore';
import { togglePause, cursorMove, cursorRemove } from '@/game/controller';
import { setSoundEnabled } from '@/game/sound';

function useKeyboard() {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const { phase, lock } = useStore.getState();
      const key = e.key.toLowerCase();
      if (key === 'r') {
        window.dispatchEvent(new CustomEvent('bb:restart-request'));
      } else if (key === 'p' || (e.key === 'Escape' && (phase === 'playing' || phase === 'ready'))) {
        if (lock === null) togglePause();
      } else if (phase === 'playing' && lock === null) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); cursorMove('left'); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); cursorMove('right'); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); cursorMove('up'); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); cursorMove('down'); }
        else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); cursorRemove(); }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
}

/** one-time touch hint after first game start */
function TouchHint() {
  const phase = useStore((s) => s.phase);
  const [shown, setShown] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (shown || phase !== 'playing') return;
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
      setShown(true);
      setVisible(true);
      const id = window.setTimeout(() => setVisible(false), 4000);
      return () => window.clearTimeout(id);
    }
    setShown(true);
    return undefined;
  }, [phase, shown]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.26 }}
          className="fixed left-1/2 top-20 z-40 -translate-x-1/2 rounded-rmd bg-paper px-4 py-2.5 text-[14px] font-bold text-ink-900 shadow-pop"
        >
          点一下积木就能消除哦
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default function Home() {
  useKeyboard();

  // sync persisted sound preference into the audio engine once
  useEffect(() => {
    setSoundEnabled(useStore.getState().soundOn);
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      {/* ---- full-viewport game stage: header + HUD + canvas fill 100dvh ----
          sky-tinted so the page around the canvas shares the game's palette */}
      <div
        className="flex h-[100dvh] flex-col"
        style={{ background: 'linear-gradient(to bottom, #D9EFFB 0%, #E9F6FD 55%, #F1F8F0 100%)' }}
      >
        <Header />
        <main className="flex w-full min-h-0 flex-1">
          <section className="flex min-w-0 flex-1 flex-col px-2 md:px-4">
            <HudBar />
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.48, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="mt-2 min-h-0 flex-1"
            >
              <GameCanvas />
            </motion.div>
            {/* desktop / tablet controls */}
            <div className="max-md:hidden">
              <ControlBar />
            </div>
            {/* mobile: keep the canvas clear of the fixed bottom control bar */}
            <div className="shrink-0 md:hidden" style={{ height: 'calc(66px + env(safe-area-inset-bottom))' }} />
          </section>
          <SideRail />
        </main>
      </div>

      {/* ---- below the fold: mobile stats/health, rules, footer ---- */}
      <div className="mx-auto w-full max-w-[1280px] px-4 pb-24 md:px-6 md:pb-10">
        <div className="grid content-start gap-5 pt-6 md:hidden">
          <ScoreStrip />
          <HealthPanel />
        </div>
        <Rules />
        <Footer />
      </div>

      {/* mobile sticky bottom control bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-sand-200 bg-paper px-4 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 md:hidden">
        <div className="flex items-center justify-center gap-2 [&>div]:mt-0 [&_button]:h-12">
          <ControlBar />
        </div>
      </div>

      {/* overlays */}
      <StartOverlay />
      <PauseOverlay />
      <FailOverlay />
      <ClearOverlay />
      <TouchHint />
    </div>
  );
}
