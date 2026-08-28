import { motion } from 'framer-motion';
import { Trophy, Volume2, VolumeX } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { setSoundEnabled, unlockAudio } from '@/game/sound';
import { cn } from '@/lib/utils';

function SoundToggle() {
  const soundOn = useStore((s) => s.soundOn);
  const toggleSound = useStore((s) => s.toggleSound);
  return (
    <div className="flex items-center gap-2" title={soundOn ? '关闭音效' : '打开音效'}>
      <span className="text-ink-600">
        {soundOn ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={soundOn}
        aria-label="音效开关"
        onClick={() => {
          unlockAudio();
          toggleSound();
          setSoundEnabled(!soundOn);
        }}
        className={cn(
          'relative h-6 w-10 rounded-full transition-colors duration-200',
          soundOn ? 'bg-sage-600' : 'bg-sand-300',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          className={cn(
            'absolute top-[3px] h-[18px] w-[18px] rounded-full bg-paper shadow-card',
            soundOn ? 'right-[3px]' : 'left-[3px]',
          )}
        />
      </button>
    </div>
  );
}

export default function Header() {
  const best = useStore((s) => s.best);
  const isNewBest = useStore((s) => s.isNewBest);

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="sticky top-0 z-40 h-12 border-b border-sand-200 bg-paper/95 backdrop-blur-[8px]"
    >
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-4 md:px-6">
        <button
          type="button"
          className="flex items-center gap-2 rounded-rsm"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="回到顶部"
        >
          <img src="/logo.svg" alt="平衡积木 logo" className="h-8 w-8" />
          <span className="flex items-baseline gap-2 leading-none">
            <span className="text-logo text-[22px] text-ink-900">平衡积木</span>
            <span className="text-caption-warm text-ink-400 max-md:hidden">物理平衡小游戏</span>
          </span>
        </button>
        <div className="flex items-center gap-4">
          <motion.div
            key={isNewBest ? best.score : 'static'}
            initial={isNewBest ? { scale: 1.06 } : false}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5"
            title="历史最高分（本机保存）"
          >
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-label-warm text-ink-600">
              最高 <span className="font-mono-num font-bold">{best.score}</span>分
            </span>
          </motion.div>
          <SoundToggle />
        </div>
      </div>
    </motion.header>
  );
}
