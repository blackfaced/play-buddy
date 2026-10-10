import { useEffect } from 'react';
import { Routes, Route } from 'react-router';
import Lobby from './pages/Lobby';
import Home from './pages/Home';
import Marble from './pages/Marble';
import MathIsland from './mathisland/MathIsland';
import MulDrill from './muldrill/MulDrill';
import WriteLab from './write/WriteLab';
import SceneSelect from './escape/SceneSelect';
import { BreakToast, ForcedRestOverlay, DailyCapOverlay } from '@/components/HealthOverlays';
import { useStore } from '@/store/useStore';
import { logDiag, setDiagSnapshotProvider } from '@/lib/diag';

/** 诊断：注册实时状态快照 + 记录阶段/锁定/模式变化（本地环形缓冲，不上传） */
function useDiagnostics() {
  useEffect(() => {
    setDiagSnapshotProvider(() => {
      const s = useStore.getState();
      return {
        phase: s.phase,
        mode: s.mode,
        level: s.levelIdx + 1,
        lives: s.lives,
        lock: s.lock,
        todayMin: Math.floor(s.todayMs / 60000),
        rewardMin: Math.floor(s.rewardMs / 60000),
      };
    });
    let prev = useStore.getState();
    logDiag('phase', `boot phase=${prev.phase} mode=${prev.mode}`);
    const unsub = useStore.subscribe((s) => {
      if (s.phase !== prev.phase) logDiag('phase', `${prev.phase} → ${s.phase} (mode=${s.mode})`);
      if (s.mode !== prev.mode) logDiag('mode', `${prev.mode} → ${s.mode}`);
      prev = s;
    });
    return () => {
      unsub();
      setDiagSnapshotProvider(() => ({}));
    };
  }, []);
}

/** Global anti-addiction clock: accrues wall-clock play time across ALL games
 *  on the site (blocks + marble + math island + future ones), only while the tab is visible. */
function useAntiAddictionClock() {
  useEffect(() => {
    const id = window.setInterval(() => useStore.getState().tick(), 1000);
    const onVis = () => useStore.getState().tick();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', onVis);
    useStore.getState().tick();
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', onVis);
    };
  }, []);
}

/** Health overlays are global so they cover every game on the site. */
function HealthGate() {
  useAntiAddictionClock();
  useDiagnostics();
  return (
    <>
      <ForcedRestOverlay />
      <DailyCapOverlay />
      <BreakToast />
    </>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/blocks" element={<Home />} />
        <Route path="/marble" element={<Marble />} />
        <Route path="/math" element={<MathIsland />} />
        <Route path="/mul" element={<MulDrill />} />
        <Route path="/write" element={<WriteLab />} />
        <Route path="/escape" element={<SceneSelect />} />
      </Routes>
      <HealthGate />
    </>
  );
}
