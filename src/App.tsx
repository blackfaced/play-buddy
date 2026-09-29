import { useEffect } from 'react';
import { Routes, Route } from 'react-router';
import Home from './pages/Home';
import Marble from './pages/Marble';
import MathIsland from './mathisland/MathIsland';
import MulDrill from './muldrill/MulDrill';
import { BreakToast, ForcedRestOverlay, DailyCapOverlay } from '@/components/HealthOverlays';
import { useStore, dateKeyOf } from '@/store/useStore';
import { probeStudyBuddy, fetchStudyReward, FUSION_ENABLED } from '@/game/studyBuddy';
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
        homeMode: s.homeMode,
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
 *  on the site (balance blocks / marble / math island / multiplication drill),
 *  only while the tab is visible. */
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

/** study-buddy 融合：在家（API 可达）时同步"学习换时长"奖励；
 *  在外（静态部署）探测失败，自动退回纯玩模式。
 *  构建期用 VITE_STUDY_BUDDY_ENABLED=false 可彻底关闭（连探测都不发）。 */
function useStudyBuddySync() {
  useEffect(() => {
    if (!FUSION_ENABLED) {
      useStore.getState().setStudyStatus(false, 0);
      return;
    }
    let disposed = false;
    let syncing = false;
    const sync = async () => {
      if (syncing) return;
      syncing = true;
      try {
        const home = await probeStudyBuddy();
        if (disposed) return;
        if (!home) {
          useStore.getState().setStudyStatus(false, 0);
          return;
        }
        const r = await fetchStudyReward(dateKeyOf(Date.now()));
        if (disposed) return;
        // 奖励拉取异常按 0 处理（仍是在家模式，会话上报保持可用）
        useStore.getState().setStudyStatus(true, r ? r.rewardMs : 0);
      } finally {
        syncing = false;
      }
    };
    void sync();
    const id = window.setInterval(() => void sync(), 5 * 60_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      disposed = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
}

/** Health overlays are global so they also cover the marble game. */
function HealthGate() {
  useAntiAddictionClock();
  useStudyBuddySync();
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
        <Route path="/" element={<Home />} />
        <Route path="/marble" element={<Marble />} />
        <Route path="/math" element={<MathIsland />} />
        <Route path="/mul" element={<MulDrill />} />
      </Routes>
      <HealthGate />
    </>
  );
}
