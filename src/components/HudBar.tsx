import { Trophy, Blocks, Timer, Heart, Route } from 'lucide-react';
import { useStore, fmtMs } from '@/store/useStore';
import { levelTimeLimitMs, extraRowsForClears } from '@/game/levels';
import StatChip from './StatChip';
import CoinIcon from './CoinIcon';

export default function HudBar() {
  const mode = useStore((s) => s.mode);
  const lives = useStore((s) => s.lives);
  const meters = useStore((s) => s.meters);
  const score = useStore((s) => s.score);
  const removed = useStore((s) => s.removed);
  const converted = useStore((s) => s.converted);
  const totalBlocks = useStore((s) => s.totalBlocks);
  const combo = useStore((s) => s.combo);
  const roundMs = useStore((s) => s.roundMs);
  const coins = useStore((s) => s.coins);
  const roundCoins = useStore((s) => s.roundCoins);
  const bonusMs = useStore((s) => s.bonusMs);
  const levelIdx = useStore((s) => s.levelIdx);
  const phase = useStore((s) => s.phase);
  const liveLimitMs = useStore((s) => s.limitMs);
  const clears = useStore((s) => s.progress.rec[s.levelIdx]?.clears ?? 0);

  const idle = phase === 'idle';
  // idle: preview the level's effective limit (incl. replay-growth time)
  const limitMs = idle ? levelTimeLimitMs(levelIdx, extraRowsForClears(clears)) : liveLimitMs;
  const secLeft = Math.max(0, Math.ceil((limitMs + bonusMs - roundMs) / 1000));
  const urgent = (phase === 'playing' || phase === 'ready') && secLeft <= 10;
  const remaining = Math.max(0, totalBlocks - removed - converted);

  // endless / daily challenge HUD: 深度 / 生命 / 已消除 / 金币 (no countdown)
  if (mode !== 'level') {
    return (
      <div className="mt-2 grid grid-cols-4 gap-2" role="status" aria-live="off">
        <StatChip
          icon={<Route />}
          label="深度"
          value={meters}
          format={(v) => `${v.toFixed(1)}m`}
          iconClass="text-slateblue-500"
          valueClass="text-ink-900"
          delay={0.1}
          dimmed={idle}
          pulseKey={Math.floor(meters)}
          ariaLabel={`下落深度 ${meters.toFixed(1)} 米`}
        />
        <StatChip
          icon={<Heart />}
          label="生命"
          value={lives}
          format={(v) => (v > 0 ? '❤️'.repeat(Math.round(v)) : '—')}
          iconClass="text-status-red"
          valueClass="text-status-red text-sm"
          delay={0.16}
          dimmed={idle}
          pulseKey={lives}
          ariaLabel={`剩余生命 ${lives} 条`}
        />
        <StatChip
          icon={<Blocks />}
          label="已消除"
          value={removed}
          format={(v) => String(Math.round(v))}
          iconClass="text-sage-600"
          valueClass="text-ink-900"
          delay={0.22}
          dimmed={idle}
          pulseKey={removed}
          flashKey={combo >= 2 ? removed : 0}
          ariaLabel={`已消除积木 ${removed} 块`}
        />
        <StatChip
          icon={<CoinIcon />}
          label={roundCoins > 0 ? `金币 +${roundCoins}` : '金币'}
          value={coins}
          format={(v) => String(Math.round(v))}
          iconClass="h-[18px] w-[18px]"
          valueClass="text-[#C98A12]"
          delay={0.28}
          dimmed={idle}
          pulseKey={coins}
          ariaLabel={`金币总数 ${coins}`}
        />
      </div>
    );
  }

  return (
    <div className="mt-2 grid grid-cols-4 gap-2" role="status" aria-live="off">
      <StatChip
        icon={<Timer />}
        label="倒计时"
        value={secLeft}
        format={(v) => fmtMs(v * 1000)}
        iconClass={urgent ? 'text-status-red' : 'text-slateblue-500'}
        valueClass={urgent ? 'text-status-red animate-pulse' : 'text-ink-900'}
        delay={0.1}
        dimmed={idle}
        pulseKey={urgent ? secLeft : undefined}
        ariaLabel={`剩余时间 ${fmtMs(secLeft * 1000)}，穿过红色虚线可加 3 秒`}
      />
      <StatChip
        icon={<Blocks />}
        label="剩余积木"
        value={remaining}
        format={(v) => `${Math.round(v)}/${totalBlocks || '—'}`}
        iconClass="text-sage-600"
        valueClass="text-ink-900"
        delay={0.16}
        dimmed={idle}
        pulseKey={remaining}
        ariaLabel={`剩余积木 ${remaining} 块，共 ${totalBlocks} 块`}
      />
      <StatChip
        icon={<Trophy />}
        label="得分"
        value={score}
        format={(v) => String(Math.round(v))}
        iconClass="text-amber-500"
        valueClass="text-amber-500"
        delay={0.22}
        dimmed={idle}
        pulseKey={score}
        flashKey={combo >= 2 ? removed : 0}
        ariaLabel={`得分 ${score} 分`}
      />
      <StatChip
        icon={<CoinIcon />}
        label={roundCoins > 0 ? `金币 +${roundCoins}` : '金币'}
        value={coins}
        format={(v) => String(Math.round(v))}
        iconClass="h-[18px] w-[18px]"
        valueClass="text-[#C98A12]"
        delay={0.28}
        dimmed={idle}
        pulseKey={coins}
        ariaLabel={`金币总数 ${coins}`}
      />
    </div>
  );
}
