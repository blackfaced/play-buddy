import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ChevronDown } from 'lucide-react';
import { Panel, StatusPill } from './Panel';
import { cn } from '@/lib/utils';
import {
  useStore,
  fmtMs,
  fmtMinutes,
  statusTierOf,
  STATUS_LABEL,
  DAILY_CAP_MS,
  REST_AFTER_MS,
  useDailyCap,
  MIN,
} from '@/store/useStore';

const DAY_CHARS = ['日', '一', '二', '三', '四', '五', '六'];

function WeekChart() {
  const week = useStore((s) => s.week);
  const curDate = useStore((s) => s.curDate);
  const max = DAILY_CAP_MS;
  return (
    <div>
      <div className="flex h-14 items-end gap-2">
        {week.map((d, i) => {
          const isToday = d.date === curDate;
          const h = Math.max(3, Math.min(56, (d.ms / max) * 56));
          const dt = new Date(`${d.date}T12:00:00`);
          const label = `${dt.getMonth() + 1}月${dt.getDate()}日 · ${fmtMinutes(d.ms)}分钟`;
          return (
            <motion.div
              key={d.date}
              title={label}
              aria-label={label}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1, height: h }}
              transition={{ delay: 0.06 * i, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ originY: 1, width: 18 }}
              className={cn('rounded-t-rsm', isToday ? 'bg-terracotta-500' : 'bg-sage-600')}
            />
          );
        })}
      </div>
      <div className="mt-1 flex gap-2">
        {week.map((d) => {
          const dt = new Date(`${d.date}T12:00:00`);
          return (
            <span key={d.date} style={{ width: 18 }} className="text-center text-[10px] text-ink-400">
              {DAY_CHARS[dt.getDay()]}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function HealthContent() {
  const todayMs = useStore((s) => s.todayMs);
  const sessionMs = useStore((s) => s.sessionMs);
  const streakMs = useStore((s) => s.streakMs);
  const lock = useStore((s) => s.lock);
  const restUntil = useStore((s) => s.restUntil);
  const nowMs = useStore((s) => s.nowMs);

  const { capMs, holiday, rewardMs, rewardCapMs } = useDailyCap();
  const tier = statusTierOf(todayMs, lock, capMs);
  const capCuts = useStore((s) => s.capCuts);
  const capFrac = Math.min(1, todayMs / capMs);
  const restRemain = Math.max(0, REST_AFTER_MS - streakMs);
  const resting = lock === 'rest';
  const restLeft = resting && restUntil > 0 ? Math.max(0, restUntil - nowMs) : 0;
  const capped = lock === 'cap';
  const soon = !resting && !capped && restRemain < 5 * MIN;

  const tierBar = tier === 'green' ? 'bg-status-green' : tier === 'yellow' ? 'bg-status-yellow' : 'bg-status-red';

  const capNote = [
    holiday ? '假期' : '上学日',
    capCuts > 0 ? `已扣减 ${capCuts} 次` : null,
    rewardMs > 0 ? `学习奖励 +${fmtMinutes(rewardMs)} 分钟` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="space-y-4">
      {/* today total + cap progress */}
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-label-warm text-ink-400">今日累计</span>
          <span className="font-mono-num text-[20px] font-medium text-ink-900">{fmtMs(todayMs, true)}</span>
        </div>
        <div className="mt-1 text-caption-warm text-ink-400">
          {capped ? '今日已达上限，明天再来吧' : `今日上限 ${fmtMinutes(capMs)} 分钟（${capNote}）`}
        </div>
        <div className="mt-1 text-caption-warm text-ink-400">
          🍬 玩学习类游戏可赚游戏时长：今日已得 +{fmtMinutes(rewardMs)} / {fmtMinutes(rewardCapMs)} 分钟
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-sand-200">
          <div
            className={cn('h-full rounded-full transition-[width] duration-300', tierBar)}
            style={{ width: `${capFrac * 100}%` }}
          />
        </div>
      </div>

      {/* session */}
      <div className="flex items-baseline justify-between">
        <span className="text-label-warm text-ink-400">本次游玩</span>
        <span className="font-mono-num text-timer text-ink-900">{fmtMs(sessionMs)}</span>
      </div>
      <div className="-mt-2 text-caption-warm text-ink-400">连续游玩 25 分钟将强制休息 · 自己主动休息 10 分钟以上可重置</div>

      {/* rest countdown */}
      <div
        className={cn(
          'flex items-baseline justify-between rounded-rsm px-2 py-1.5 -mx-2 transition-colors duration-200',
          soon && 'bg-amber-100',
          resting && 'bg-brick-100',
        )}
      >
        <span className="text-label-warm text-ink-400">{resting ? '休息剩余' : '距离下次休息'}</span>
        <span
          className={cn(
            'font-mono-num text-timer',
            resting ? 'text-brick-600' : soon ? 'text-status-yellow' : 'text-ink-900',
          )}
        >
          {resting ? (restUntil > 0 ? fmtMs(restLeft) : '已完成') : fmtMs(restRemain)}
        </span>
      </div>

      {/* status inline (窄屏 duplicated) */}
      <div className="flex items-center justify-between">
        <span className="text-label-warm text-ink-400">状态</span>
        <StatusPill tier={tier} label={resting ? '休息中' : STATUS_LABEL[tier]} />
      </div>

      {/* week chart */}
      <div>
        <div className="mb-2 text-label-warm text-ink-400">最近 7 天</div>
        <WeekChart />
      </div>
    </div>
  );
}

export default function HealthPanel() {
  const todayMs = useStore((s) => s.todayMs);
  const lock = useStore((s) => s.lock);
  const { capMs } = useDailyCap();
  const tier = statusTierOf(todayMs, lock, capMs);
  const [open, setOpen] = useState(false);

  const dot =
    tier === 'green' ? 'bg-status-green' : tier === 'yellow' ? 'bg-status-yellow' : 'bg-status-red animate-pulse-dot';

  return (
    <>
      {/* desktop / tablet */}
      <div className="max-md:hidden">
        <Panel
          delay={0.45}
          icon={<ShieldCheck className="h-5 w-5 text-sage-600" />}
          title="健康游戏"
          right={<StatusPill tier={tier} label={lock === 'rest' ? '休息中' : STATUS_LABEL[tier]} />}
          className={cn(lock === 'rest' && 'ring-1 ring-brick-100')}
        >
          <HealthContent />
        </Panel>
      </div>

      {/* mobile accordion */}
      <div className="md:hidden rounded-rlg bg-paper shadow-card">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-4 py-3.5"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <ShieldCheck className="h-5 w-5 text-sage-600" />
          <span className="text-h2 text-ink-900">健康游戏</span>
          <span className={cn('ml-auto h-2.5 w-2.5 rounded-full', dot)} aria-label={STATUS_LABEL[tier]} />
          <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.26 }}>
            <ChevronDown className="h-4 w-4 text-ink-400" />
          </motion.span>
        </button>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                <HealthContent />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </>
  );
}
