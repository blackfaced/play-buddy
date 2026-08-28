import { useEffect } from 'react';
import { Routes, Route } from 'react-router';
import Home from './pages/Home';
import Marble from './pages/Marble';
import { BreakToast, ForcedRestOverlay, DailyCapOverlay } from '@/components/HealthOverlays';
import { useStore, dateKeyOf } from '@/store/useStore';
import { probeStudyBuddy, fetchStudyReward } from '@/game/studyBuddy';

/** Global anti-addiction clock: accrues wall-clock play time across ALL games
 *  on the site (balance blocks + marble track), only while the tab is visible. */
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
 *  在外（静态部署）探测失败，自动退回纯玩模式。 */
function useStudyBuddySync() {
  useEffect(() => {
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
      </Routes>
      <HealthGate />
    </>
  );
}
