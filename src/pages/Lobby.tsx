import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { gamesByCategory, type GameEntry } from '@/games';
import { useStore, useDailyCap, fmtMinutes } from '@/store/useStore';

function GameCard({ game, index }: { game: GameEntry; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * index, duration: 0.35, ease: 'easeOut' }}
    >
      <Link
        to={game.path}
        className="flex items-center gap-4 rounded-rlg border-2 bg-paper px-5 py-4 shadow-card transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-pop"
        style={{ borderColor: `${game.accent}55` }}
        aria-label={`进入游戏：${game.title}，${game.tagline}`}
      >
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-rmd text-[30px]"
          style={{ backgroundColor: game.accentSoft }}
        >
          {game.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[18px] font-bold" style={{ color: game.accent }}>
            {game.title}
          </span>
          <span className="mt-0.5 block text-caption-warm text-ink-400">{game.tagline}</span>
        </span>
        <span className="text-[20px] text-ink-400">›</span>
      </Link>
    </motion.div>
  );
}

function Section({ title, hint, games, startIndex }: { title: string; hint: string; games: GameEntry[]; startIndex: number }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="font-display text-[17px] font-bold text-ink-900">{title}</h2>
        <span className="text-caption-warm text-ink-400">{hint}</span>
      </div>
      <div className="space-y-3">
        {games.map((g, i) => (
          <GameCard key={g.id} game={g} index={startIndex + i} />
        ))}
      </div>
    </section>
  );
}

export default function Lobby() {
  const todayMs = useStore((s) => s.todayMs);
  const { capMs, rewardMs, rewardCapMs } = useDailyCap();

  const study = gamesByCategory('study');
  const play = gamesByCategory('play');

  return (
    <div className="min-h-screen bg-cream-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md space-y-8">
        {/* 标题 */}
        <motion.header
          className="text-center"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <h1 className="font-display text-[34px] font-bold text-ink-900">🎡 游戏乐园</h1>
          <p className="mt-1 text-caption-warm text-ink-400">挑一个喜欢的游戏开始吧</p>
        </motion.header>

        {/* 今日状态 */}
        <div className="rounded-rlg border border-sand-200 bg-paper px-5 py-4 shadow-card">
          <div className="flex items-baseline justify-between">
            <span className="text-label-warm text-ink-400">今日已玩</span>
            <span className="font-mono-num text-[16px] font-medium text-ink-900">
              {fmtMinutes(todayMs)} / {fmtMinutes(capMs)} 分钟
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand-200">
            <div
              className="h-full rounded-full bg-sage-600 transition-[width] duration-300"
              style={{ width: `${Math.min(100, (todayMs / capMs) * 100)}%` }}
            />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-label-warm text-ink-400">学习奖励</span>
            <span className="font-mono-num text-[14px] font-medium text-terracotta-600">
              +{fmtMinutes(rewardMs)} / {fmtMinutes(rewardCapMs)} 分钟
            </span>
          </div>
          <p className="mt-2 text-caption-warm text-ink-400">
            玩学习类游戏可赚游戏时长，每日最多 +{fmtMinutes(rewardCapMs)} 分钟
          </p>
        </div>

        {/* 学习区 */}
        <Section title="📚 学习岛" hint="玩完还能赚时长" games={study} startIndex={0} />

        {/* 娱乐区 */}
        <Section title="🎪 游乐园" hint="放松心情" games={play} startIndex={study.length} />

        <p className="pt-2 text-center text-caption-warm text-ink-400">
          本站点有防沉迷限制，请合理安排时间
        </p>
      </div>
    </div>
  );
}
