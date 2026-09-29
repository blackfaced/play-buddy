import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  Play,
  RotateCcw,
  MousePointerClick,
  ArrowDownToLine,
  Hourglass,
  Share2,
  Check,
  Timer,
  Sparkles,
  LayoutGrid,
  ArrowRight,
  Star,
  CalendarDays,
  Infinity as InfinityIcon,
} from 'lucide-react';
import ModalShell from './ModalShell';
import GameButton from './GameButton';
import LevelGrid from './LevelGrid';
import CoinIcon from './CoinIcon';
import { useStore, fmtMs, MIN } from '@/store/useStore';
import { LEVELS, levelRows, levelTimeSec, extraRowsForClears, REPLAY_GROW_ROWS, REPLAY_GROW_MAX } from '@/game/levels';
import { startGame, startEndless, resumeGame, playAgain, nextLevel, goToMenu, continueGame } from '@/game/controller';
import { cn } from '@/lib/utils';

/* ---------------- Start overlay (level select) ---------------- */

const MICRO_RULES = [
  { icon: MousePointerClick, text: '点积木' },
  { icon: ArrowDownToLine, text: '落底即通关' },
  { icon: Hourglass, text: '过虚线+3秒' },
];

export function StartOverlay() {
  const phase = useStore((s) => s.phase);
  const lock = useStore((s) => s.lock);
  const levelIdx = useStore((s) => s.levelIdx);
  const coins = useStore((s) => s.coins);
  const unlocked = useStore((s) => s.progress.unlocked);
  const storageOk = useStore((s) => s.storageOk);
  const clears = useStore((s) => s.progress.rec[s.levelIdx]?.clears ?? 0);
  const lv = LEVELS[levelIdx];
  const extra = extraRowsForClears(clears);
  // "continue" target: the highest unlocked level (1-based count → 0-based index)
  const resumeIdx = Math.min(unlocked - 1, LEVELS.length - 1);
  const hasProgress = unlocked > 1;
  return (
    <ModalShell open={phase === 'idle' && lock === null} dismissible={false} titleId="start-title" maxWidth="max-w-[480px]">
      <div className="flex flex-col items-center text-center">
        <img src="/logo.svg" alt="" className="h-16 w-16" />
        <h2 id="start-title" className="mt-3 text-h1 text-ink-900">
          平衡积木
        </h2>
        <div className="mt-2 flex items-center gap-1.5 rounded-full bg-amber-100/80 px-3.5 py-1.5" aria-label={`我的金币 ${coins}`}>
          <CoinIcon className="h-5 w-5" />
          <span className="font-mono-num text-[17px] font-bold text-[#B97A12]">{coins}</span>
        </div>
        <p className="mt-2 text-body-warm text-ink-600">
          在倒计时结束前让六边形安全落到云朵平台即通关（消除全部积木也算）；通关时剩余积木自动折算积分和金币，滚出平台则失败！穿过红色虚线 +3 秒哦！
        </p>
        <div className="mt-4 flex gap-4">
          {MICRO_RULES.map((r, i) => (
            <motion.div
              key={r.text}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.08, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center gap-1"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-rmd bg-terracotta-100">
                <r.icon className="h-5 w-5 text-terracotta-600" />
              </span>
              <span className="text-caption-warm text-ink-600">{r.text}</span>
            </motion.div>
          ))}
        </div>

        <div className="mt-5 w-full">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-label-warm font-bold text-ink-600">
              选择关卡 <span className="ml-1 font-normal text-ink-400">已解锁 {unlocked}/{LEVELS.length}</span>
            </span>
            <span className="text-caption-warm text-ink-400">
              第 {lv.id} 关 · {levelRows(levelIdx, extra)} 层{extra > 0 ? `（通关奖励 +${extra}）` : ''} · 限时{' '}
              {fmtMs(levelTimeSec(levelIdx, extra) * 1000)} · {lv.feature}
            </span>
          </div>
          <LevelGrid />
          {clears > 0 && extra < REPLAY_GROW_MAX ? (
            <p className="mt-2 text-caption-warm text-amber-600">
              再通关 {Math.ceil((REPLAY_GROW_MAX - extra) / REPLAY_GROW_ROWS)} 次，塔还会再高 {REPLAY_GROW_MAX - extra} 层哦！
            </p>
          ) : null}
        </div>

        {hasProgress ? (
          <div className="mt-6 flex w-full flex-col items-center gap-2.5">
            <GameButton
              icon={<Play />}
              onClick={continueGame}
              className="h-14 w-full text-[17px] shadow-pop"
              aria-label={`继续游戏，第 ${resumeIdx + 1} 关`}
            >
              继续游戏 · 第 {resumeIdx + 1} 关
            </GameButton>
            {levelIdx !== resumeIdx ? (
              <GameButton variant="secondary" icon={<RotateCcw />} onClick={startGame}>
                开始第 {lv.id} 关
              </GameButton>
            ) : null}
          </div>
        ) : (
          <GameButton className="mt-6" icon={<Play />} onClick={startGame}>
            开始第 {lv.id} 关
          </GameButton>
        )}

        {/* 无尽模式入口：每日挑战（同种子·记成绩）+ 自由无尽（练习） */}
        <EndlessEntries />
        {/* 新游戏入口：弹珠轨道 */}
        <Link
          to="/marble"
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#7CC36A]/60 bg-[#F2F9EC] px-3 py-3 text-center transition-colors hover:border-[#7CC36A]"
          aria-label="新游戏：弹珠轨道，搭建轨道引导弹珠入杯"
        >
          <span className="text-[14px] font-extrabold text-[#4E8C3F]">🎯 新游戏 · 弹珠轨道</span>
          <span className="text-[11px] font-semibold text-ink-500">搭轨道 · 引弹珠 · 40 关</span>
        </Link>
        {/* 新游戏入口：糖果口算岛（学 · 换时长） */}
        <Link
          to="/math"
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#E8956B]/60 bg-[#FFF3E6] px-3 py-3 text-center transition-colors hover:border-[#E8956B]"
          aria-label="新游戏：糖果口算岛，100 以内加减法，答得快换游戏时长"
        >
          <span className="text-[14px] font-extrabold text-[#B85C38]">🍭 学习 · 糖果口算岛</span>
          <span className="text-[11px] font-semibold text-ink-500">100 以内加减 · 18 题一关</span>
        </Link>
        {/* 新游戏入口：乘法大冒险（学 · 60 秒换时长） */}
        <Link
          to="/mul"
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-[#9F7DFF]/60 bg-[#F2EDFC] px-3 py-3 text-center transition-colors hover:border-[#9F7DFF]"
          aria-label="新游戏：乘法大冒险，1-9 乘法表 60 秒挑战，答得快换游戏时长"
        >
          <span className="text-[14px] font-extrabold text-[#5B3FBF]">✖️ 学习 · 乘法大冒险</span>
          <span className="text-[11px] font-semibold text-ink-500">1-9 乘法表 · 60 秒 · 答错看全表</span>
        </Link>
        {!storageOk ? (
          <p className="mt-3 text-caption-warm font-bold text-status-yellow">
            当前浏览器无法保存游戏进度（可能处于隐私/无痕模式）
          </p>
        ) : null}
        <p className="mt-3 text-caption-warm text-ink-400">本站点有防沉迷限制，请合理安排时间</p>
      </div>
    </ModalShell>
  );
}

/* -------------------- Endless mode entry cards -------------------- */

function dateKeyOfToday(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function EndlessEntries() {
  const lock = useStore((s) => s.lock);
  const daily = useStore((s) => s.daily);
  const playedToday = daily.todayDate === dateKeyOfToday() && daily.todayBest > 0;
  return (
    <div className="mt-4 grid w-full grid-cols-2 gap-2.5">
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => startEndless(true)}
        disabled={lock !== null}
        className="flex flex-col items-center gap-1 rounded-2xl border-2 border-[#E8B04B]/60 bg-[#FFF7E8] px-3 py-3 text-center transition-colors hover:border-[#E8B04B] disabled:opacity-50"
        aria-label="每日挑战：今天所有人同一座塔"
      >
        <span className="flex items-center gap-1.5 text-[14px] font-extrabold text-[#C98A12]">
          <CalendarDays className="h-4 w-4" /> 每日挑战
        </span>
        <span className="text-[11px] font-semibold leading-tight text-ink-500">
          今日最佳 {playedToday ? `${daily.todayBest.toFixed(1)} 米` : '未挑战'}
        </span>
        <span className="text-[11px] font-semibold text-ink-500">
          连续 {daily.streak} 天 · 最佳 {daily.histBest > 0 ? `${daily.histBest.toFixed(1)} 米` : '—'}
        </span>
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => startEndless(false)}
        disabled={lock !== null}
        className="flex flex-col items-center gap-1 rounded-2xl border-2 border-slateblue-300/60 bg-slateblue-50 px-3 py-3 text-center transition-colors hover:border-slateblue-300 disabled:opacity-50"
        aria-label="自由无尽：随机塔练习，不计成绩"
      >
        <span className="flex items-center gap-1.5 text-[14px] font-extrabold text-slateblue-500">
          <InfinityIcon className="h-4 w-4" /> 自由无尽
        </span>
        <span className="text-[11px] font-semibold leading-tight text-ink-500">无限下潜 · 3 条命</span>
        <span className="text-[11px] font-semibold text-ink-500">随机新塔 · 练习不计成绩</span>
      </motion.button>
    </div>
  );
}

/* ---------------- Pause overlay ---------------- */

export function PauseOverlay() {
  const phase = useStore((s) => s.phase);
  const lock = useStore((s) => s.lock);
  const sessionMs = useStore((s) => s.sessionMs);
  const open = phase === 'paused' && lock === null;
  return (
    <ModalShell open={open} dismissible onClose={resumeGame} titleId="pause-title">
      <div className="flex flex-col items-center text-center">
        <motion.h2
          id="pause-title"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="text-h2 text-ink-900"
        >
          已暂停
        </motion.h2>
        <p className="mt-2 text-caption-warm text-ink-400">本次已经玩了 {fmtMs(sessionMs)}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <GameButton icon={<Play />} onClick={resumeGame}>
            继续游戏
          </GameButton>
          <GameButton variant="secondary" icon={<RotateCcw />} onClick={startGame}>
            重新开始
          </GameButton>
          <GameButton variant="ghost" icon={<LayoutGrid />} onClick={goToMenu}>
            回主页
          </GameButton>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------------- shared bits ---------------- */

function CountUp({ value, className }: { value: number; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const obj = { v: 0 };
    const tw = gsap.to(obj, {
      v: value,
      duration: 0.7,
      ease: 'power2.out',
      onUpdate: () => setN(Math.round(obj.v)),
    });
    return () => {
      tw.kill();
    };
  }, [value]);
  return <span className={className}>{n}</span>;
}

/** Green hexagon mascot with the same face language as the in-game hero. */
function HexFace({ happy }: { happy: boolean }) {
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden>
      <defs>
        <linearGradient id="hf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93E554" />
          <stop offset="100%" stopColor="#4FB02B" />
        </linearGradient>
      </defs>
      <polygon
        points="38,4 67.4,21 67.4,55 38,72 8.6,55 8.6,21"
        fill="url(#hf)"
        stroke="#3E9622"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <polygon points="38,16.5 56.6,27.2 56.6,48.8 38,59.5 19.4,48.8 19.4,27.2" fill="#EAF9AD" />
      {happy ? (
        <>
          <path d="M24 34 q4 -6 8 0" stroke="#3B332A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M44 34 q4 -6 8 0" stroke="#3B332A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M30 42 q8 8 16 0" stroke="#3B332A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <circle cx="22" cy="41" r="3" fill="rgba(255,150,130,.55)" />
          <circle cx="54" cy="41" r="3" fill="rgba(255,150,130,.55)" />
        </>
      ) : (
        <>
          <path d="M24 30 l8 8 M32 30 l-8 8" stroke="#3B332A" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M44 30 l8 8 M52 30 l-8 8" stroke="#3B332A" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M32 49 q6 -5 12 0" stroke="#3B332A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function StatCells({ stats }: { stats: [string, string][] }) {
  return (
    <div className="mt-4 grid w-full grid-cols-2 gap-2">
      {stats.map(([k, v], i) => (
        <motion.div
          key={k}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + i * 0.07, duration: 0.3 }}
          className="rounded-rmd bg-cream-100 px-3 py-2.5"
        >
          <div className="text-caption-warm text-ink-400">{k}</div>
          <div className="font-mono-num text-[18px] font-bold text-ink-900">{v}</div>
        </motion.div>
      ))}
    </div>
  );
}

/* ---------------- Fail overlay (ball fell / time out) ---------------- */

export function FailOverlay() {
  const phase = useStore((s) => s.phase);
  const failReason = useStore((s) => s.failReason);
  const levelIdx = useStore((s) => s.levelIdx);
  const score = useStore((s) => s.score);
  const removed = useStore((s) => s.removed);
  const totalBlocks = useStore((s) => s.totalBlocks);
  const maxCombo = useStore((s) => s.maxCombo);
  const roundMs = useStore((s) => s.roundMs);
  const todayMs = useStore((s) => s.todayMs);
  const lastCoinsEarned = useStore((s) => s.lastCoinsEarned);

  const mode = useStore((s) => s.mode);
  const lastEndless = useStore((s) => s.lastEndless);

  const open = phase === 'over';
  const timeout = failReason === 'timeout';

  // ---- endless / daily challenge settlement ----
  if (mode !== 'level' && lastEndless) {
    const r = lastEndless;
    const endlessStats: [string, string][] = [
      ['今日最佳', r.daily ? `${r.todayBest.toFixed(1)} 米` : '练习局不计成绩'],
      ['历史最佳', r.daily ? `${r.histBest.toFixed(1)} 米` : '—'],
      ...(r.daily ? ([['连续参与', `${r.streak} 天`]] as [string, string][]) : []),
      ['消除积木', `${r.removed} 块`],
      ['最高连消', `×${r.maxCombo}`],
    ];
    return (
      <ModalShell open={open} dismissible={false} titleId="fail-title" maxWidth="max-w-[460px]">
        <div className="flex flex-col items-center text-center">
          <HexFace happy={false} />
          <h2 id="fail-title" className="mt-3 text-h2 text-ink-900">
            无尽结束！
          </h2>
          <p className="mt-1 text-body-warm text-ink-600">
            {r.daily ? '每日挑战 · 今日深度' : '自由无尽 · 本局深度'}
            {r.newHistBest && r.daily ? ' · 新纪录！' : r.newTodayBest && r.daily ? ' · 今日最佳！' : ''}
          </p>
          <div className="mt-2 flex items-end gap-2">
            <CountUp value={r.depth} className="text-score-lg text-amber-500" />
            <span className="pb-1 text-body-warm text-ink-600">米</span>
          </div>
          {r.coins > 0 ? (
            <div className="mt-2 flex items-center gap-1.5 rounded-full bg-amber-100/80 px-3.5 py-1.5">
              <CoinIcon className="h-5 w-5" />
              <span className="text-caption-warm font-bold text-[#B97A12]">本次获得金币 +{r.coins}</span>
            </div>
          ) : null}
          <StatCells stats={endlessStats} />
          <div className="mt-5 flex gap-3">
            <GameButton icon={<RotateCcw />} onClick={playAgain}>
              再来一局
            </GameButton>
            <GameButton variant="secondary" icon={<LayoutGrid />} onClick={goToMenu}>
              返回
            </GameButton>
          </div>
        </div>
      </ModalShell>
    );
  }

  const stats: [string, string][] = [
    ['关卡进度', `第 ${levelIdx + 1} 关`],
    ['消除积木', `${removed} / ${totalBlocks}`],
    ['最高连消', `×${maxCombo}`],
    ['本局用时', fmtMs(roundMs)],
  ];

  return (
    <ModalShell open={open} dismissible={false} titleId="fail-title" maxWidth="max-w-[460px]">
      <div className="flex flex-col items-center text-center">
        <HexFace happy={false} />
        <h2 id="fail-title" className="mt-3 text-h2 text-ink-900">
          {timeout ? '时间到啦！' : '哎呀，滚下去了！'}
        </h2>
        <p className="mt-1 text-body-warm text-ink-600">
          {timeout
            ? `第 ${levelIdx + 1} 关还剩 ${totalBlocks - removed} 块积木没消完`
            : '观察一下哪块是关键积木（深色描边、微微发抖的积木要小心），再试一次吧'}
        </p>
        <div className="mt-2 flex items-end gap-2">
          <CountUp value={score} className="text-score-lg text-amber-500" />
          <span className="pb-1 text-body-warm text-ink-600">分</span>
        </div>
        {lastCoinsEarned > 0 ? (
          <div className="mt-2 flex items-center gap-1.5 rounded-full bg-amber-100/80 px-3.5 py-1.5">
            <CoinIcon className="h-5 w-5" />
            <span className="text-caption-warm font-bold text-[#B97A12]">本次获得金币 +{lastCoinsEarned}</span>
          </div>
        ) : null}
        <StatCells stats={stats} />
        <div className="mt-5 flex gap-3">
          <GameButton icon={<RotateCcw />} onClick={playAgain}>
            重试本关
          </GameButton>
          <GameButton variant="secondary" icon={<LayoutGrid />} onClick={goToMenu}>
            选关
          </GameButton>
        </div>
        {todayMs > 60 * MIN ? (
          <p className="mt-3 text-caption-warm text-status-red">
            今天已玩 {Math.floor(todayMs / MIN)} 分钟，注意休息哦
          </p>
        ) : null}
      </div>
    </ModalShell>
  );
}

/* ---------------- Level-clear overlay (stars / next level / all-clear party) ---------------- */

function BigStars({ n }: { n: number }) {
  return (
    <div className="mt-2 flex items-center gap-2" aria-label={`${n} 星评价`}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={{ scale: 0, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ delay: 0.35 + i * 0.22, type: 'spring', stiffness: 300, damping: 14 }}
        >
          <Star
            className={cn(
              'h-9 w-9',
              i < n ? 'fill-amber-500 text-amber-500 drop-shadow-[0_2px_4px_rgba(217,160,91,.5)]' : 'fill-sand-200 text-sand-300',
            )}
          />
        </motion.span>
      ))}
    </div>
  );
}

export function ClearOverlay() {
  const phase = useStore((s) => s.phase);
  const levelIdx = useStore((s) => s.levelIdx);
  const lastClear = useStore((s) => s.lastClear);
  const score = useStore((s) => s.score);
  const removed = useStore((s) => s.removed);
  const totalBlocks = useStore((s) => s.totalBlocks);
  const roundMs = useStore((s) => s.roundMs);
  const isNewBest = useStore((s) => s.isNewBest);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  const open = phase === 'clear' && lastClear !== null;

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open || !lastClear) return <ModalShell open={false} titleId="clear-title">{null}</ModalShell>;

  const allClear = lastClear.allClear;

  const share = async () => {
    const text = `我在平衡积木第 ${levelIdx + 1} 关拿到 ${lastClear.stars} 星、${score} 分！你能超过我吗？`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const stats: [string, string][] = [
    ['消除积木', `${removed} / ${totalBlocks} 块`],
    ...(lastClear.converted > 0
      ? ([['剩余折算', `${lastClear.converted} 块 · +${lastClear.convertBonus} 分`]] as [string, string][])
      : []),
    ['通关用时', fmtMs(roundMs)],
    ['剩余时间', fmtMs(lastClear.timeLeftMs)],
    ['时间奖励分', `+${lastClear.timeBonus}`],
    ['历史最佳', `${useStore.getState().best.score}分`],
  ];

  return (
    <ModalShell open={open} dismissible={false} titleId="clear-title" maxWidth="max-w-[460px]">
      <div className="flex flex-col items-center text-center">
        <HexFace happy />
        {allClear ? (
          <>
            <h2 id="clear-title" className="mt-3 text-h2 text-sage-600">
              🎉 全部通关！
            </h2>
            <p className="mt-1 text-body-warm text-ink-600">
              你征服了全部 {LEVELS.length} 关，是真正的平衡大师！
            </p>
          </>
        ) : (
          <>
            <h2 id="clear-title" className="mt-3 text-h2 text-sage-600">
              {lastClear.landed ? '安全落地！' : `第 ${levelIdx + 1} 关 通关！`}
            </h2>
            {lastClear.landed ? (
              <p className="mt-1 text-body-warm text-ink-600">
                第 {levelIdx + 1} 关 · 剩余 {lastClear.converted} 块积木已自动折算成积分和金币
              </p>
            ) : null}
          </>
        )}
        <BigStars n={lastClear.stars} />
        <div className="mt-2 flex items-end gap-2">
          <CountUp value={score} className="text-score-lg text-amber-500" />
          <span className="pb-1 text-body-warm text-ink-600">分</span>
          {isNewBest ? (
            <motion.span
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              className="mb-1.5 rounded-full bg-brick-100 px-2.5 py-0.5 text-caption-warm font-bold text-brick-600"
            >
              新纪录！
            </motion.span>
          ) : null}
        </div>
        {lastClear.newBestStars ? (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-1 flex items-center gap-1 text-caption-warm font-bold text-amber-500"
          >
            <Sparkles className="h-3.5 w-3.5" /> 本关星级新纪录
          </motion.p>
        ) : null}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.0, type: 'spring', stiffness: 260, damping: 16 }}
          className="mt-3 flex items-center gap-2 rounded-full border border-amber-300/70 bg-gradient-to-b from-amber-100 to-amber-200/80 px-5 py-2 shadow-sm"
        >
          <CoinIcon className="h-6 w-6" />
          <span className="text-body-warm font-bold text-[#9C6808]">
            本次获得金币 <CountUp value={lastClear.coinsEarned} className="font-mono-num text-[18px]" />
          </span>
        </motion.div>
        <StatCells stats={stats} />
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {allClear ? (
            <>
              <GameButton icon={<RotateCcw />} onClick={playAgain}>
                再玩一次
              </GameButton>
              <GameButton variant="secondary" icon={<LayoutGrid />} onClick={goToMenu}>
                选关
              </GameButton>
            </>
          ) : (
            <>
              <GameButton icon={<ArrowRight />} onClick={nextLevel}>
                下一关
              </GameButton>
              <GameButton variant="secondary" icon={<RotateCcw />} onClick={playAgain}>
                重玩本关
              </GameButton>
              <GameButton variant="ghost" icon={<LayoutGrid />} onClick={goToMenu}>
                选关
              </GameButton>
            </>
          )}
          <GameButton variant="ghost" icon={copied ? <Check /> : <Share2 />} onClick={share}>
            {copied ? '已复制 ✓' : '分享'}
          </GameButton>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-caption-warm text-ink-400">
          <Timer className="h-3.5 w-3.5" />
          剩余时间越多，星级越高（≥40% 剩时 = ★★★）
        </p>
      </div>
    </ModalShell>
  );
}

/** @deprecated kept for import compatibility — replaced by FailOverlay/ClearOverlay */
export function GameOverOverlay() {
  return (
    <>
      <FailOverlay />
      <ClearOverlay />
    </>
  );
}
