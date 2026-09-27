import { motion } from 'framer-motion';
import { useStore } from '@/store/useStore';

export default function Footer() {
  const storageOk = useStore((s) => s.storageOk);
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.3 }}
      className="bg-cream-100 py-8 text-center"
    >
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="mx-auto mb-3 flex items-center gap-1.5 rounded-rsm"
        aria-label="回到顶部"
      >
        <img src="/logo.svg" alt="" className="h-5 w-5" />
        <span className="font-display text-[15px] text-ink-600">平衡积木</span>
      </button>
      <p className="text-caption-warm text-ink-600">适度游戏益脑，沉迷游戏伤身。合理安排时间，享受健康生活。</p>
      <p className="mt-1 text-caption-warm text-ink-400">© 2025 平衡积木 · 健康游戏，快乐生活</p>
      {!storageOk ? (
        <p className="mt-2 text-caption-warm text-status-yellow">当前浏览器无法保存纪录与时长统计</p>
      ) : null}
    </motion.footer>
  );
}
