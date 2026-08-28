import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { Panel } from './Panel';
import AnimatedNumber from './AnimatedNumber';
import { useStore, fmtMs } from '@/store/useStore';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-sand-200 py-2.5 last:border-b-0">
      <span className="text-label-warm text-ink-400">{label}</span>
      <span className="text-stat text-ink-900 max-md:text-[18px]">{children}</span>
    </div>
  );
}

/** Mobile 3-cell strip: 得分 / 高度 / 最佳 */
export function ScoreStrip() {
  const score = useStore((s) => s.score);
  const meters = useStore((s) => s.meters);
  const best = useStore((s) => s.best);
  const cells: [string, string][] = [
    ['得分', `${score}`],
    ['高度', `${meters.toFixed(1)}m`],
    ['最佳', `${best.score}`],
  ];
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay: 0.35 }}
      className="grid grid-cols-3 gap-2 rounded-rlg bg-paper p-3 shadow-card"
      aria-label="本局成绩"
    >
      {cells.map(([k, v]) => (
        <div key={k} className="text-center">
          <div className="text-caption-warm text-ink-400">{k}</div>
          <div className="font-mono-num text-[18px] font-bold text-ink-900">{v}</div>
        </div>
      ))}
    </motion.section>
  );
}

export default function ScorePanel() {
  const score = useStore((s) => s.score);
  const meters = useStore((s) => s.meters);
  const removed = useStore((s) => s.removed);
  const totalBlocks = useStore((s) => s.totalBlocks);
  const maxCombo = useStore((s) => s.maxCombo);
  const best = useStore((s) => s.best);
  const isNewBest = useStore((s) => s.isNewBest);
  const roundMs = useStore((s) => s.roundMs);
  const levelIdx = useStore((s) => s.levelIdx);
  const limitMs = useStore((s) => s.limitMs);
  const secLeft = Math.max(0, Math.ceil((limitMs - roundMs) / 1000));
  const urgent = secLeft <= 10;

  return (
    <Panel
      delay={0.35}
      icon={<Trophy className="h-5 w-5 text-amber-500" />}
      title="本局成绩"
      right={
        <AnimatePresence>
          {isNewBest ? (
            <motion.span
              initial={{ scale: 0.5, opacity: 0, rotate: -3 }}
              animate={{ scale: 1, opacity: 1, rotate: [0, 3, -3, 0] }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className="rounded-full bg-brick-100 px-2.5 py-0.5 text-caption-warm font-bold text-brick-600"
            >
              新纪录！
            </motion.span>
          ) : null}
        </AnimatePresence>
      }
    >
      <div className="mb-2 flex items-end justify-between">
        <span className="text-label-warm text-ink-400">当前得分</span>
        <AnimatedNumber
          value={score}
          format={(v) => String(Math.round(v))}
          className="text-score-lg text-amber-500"
        />
      </div>
      <Row label="当前关卡">第 {levelIdx + 1} 关</Row>
      <Row label="剩余时间">
        <span className={urgent ? 'text-status-red' : undefined}>{fmtMs(secLeft * 1000)}</span>
      </Row>
      <Row label="下落高度">
        <AnimatedNumber value={meters} format={(v) => `${v.toFixed(1)} m`} duration={0.1} />
      </Row>
      <Row label="消除积木">
        {removed} <span className="text-ink-400 text-[15px]">/ {totalBlocks || '—'}</span>
      </Row>
      <Row label="最高连消">×{maxCombo}</Row>
      <Row label="历史最佳">
        {best.score}分
      </Row>
      <Row label="本局时长">{fmtMs(roundMs)}</Row>
    </Panel>
  );
}
