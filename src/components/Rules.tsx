import { useState } from 'react';
import { motion } from 'framer-motion';
import { MousePointerClick, Scale, ArrowDownToLine, ShieldCheck, ClipboardCopy, Check } from 'lucide-react';
import { copyDiagReport } from '@/lib/diag';

/** 「复制诊断信息」——孩子遇到 bug 时家长点一下，把本地操作轨迹粘贴给开发者。
 *  数据只在设备 localStorage，不上传任何服务器。 */
function DiagCopyButton() {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  const onCopy = async () => {
    const ok = await copyDiagReport();
    setState(ok ? 'ok' : 'fail');
    window.setTimeout(() => setState('idle'), 2500);
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      className="mx-auto mt-3 flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-1.5 text-caption-warm text-ink-400 transition-colors hover:bg-sand-200 hover:text-ink-600"
    >
      {state === 'ok' ? <Check className="h-3.5 w-3.5 text-sage-600" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
      {state === 'ok' ? '已复制，发给爸爸/妈妈吧' : state === 'fail' ? '复制失败，请再试一次' : '遇到问题？点我复制诊断信息（给家长）'}
    </button>
  );
}

const STEPS = [
  {
    icon: MousePointerClick,
    title: '点击消除',
    copy: '点击任意一块积木把它抽走，积木消失，上面的塔会塌下来。',
  },
  {
    icon: Scale,
    title: '保持平衡',
    copy: '六边形会随着塔身翻滚，千万别让它滚出两边的平台！',
  },
  {
    icon: ArrowDownToLine,
    title: '落底通关',
    copy: '在倒计时结束前让六边形安全落到云朵平台即通关；消完全部积木也算！剩余积木自动折算积分金币，剩余时间越多，星级越高！',
  },
];

const SCORE_ROWS: [string, string][] = [
  ['每下落 1 米', '10 分'],
  ['连消奖励', '+5 / +10 / +15'],
  ['穿过红色虚线', '+3 秒 · +5 金币'],
  ['消除积木', '+1 金币'],
  ['通关剩余积木折算', '+50 分 · +1 金币 / 块'],
  ['通关时间奖励', '每秒 +10 分'],
  ['通关星级金币', '★20 / ★★30 / ★★★50'],
];

export default function Rules() {
  return (
    <section id="rules" className="mt-12 border-y border-sand-200 bg-cream-100 py-16">
      <div className="mx-auto max-w-[1280px] px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.4 }}
          className="text-center"
        >
          <h2 className="text-h1 text-ink-900">怎么玩？</h2>
          <p className="mt-2 text-body-warm text-ink-600">三步上手，一层一层往下消</p>
        </motion.div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.48, delay: i * 0.12 }}
              className="rounded-rlg bg-paper p-6 shadow-card"
            >
              <motion.div
                initial={{ scale: 0.6 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.12 + 0.1, ease: [0.34, 1.56, 0.64, 1] }}
                className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-rmd bg-terracotta-100"
              >
                <s.icon className="h-5 w-5 text-terracotta-600" />
              </motion.div>
              <h3 className="text-h2 text-ink-900">{s.title}</h3>
              <p className="mt-2 text-body-warm text-ink-600">{s.copy}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.42, delay: 0.1 }}
          className="mx-auto mt-8 max-w-[640px] rounded-rlg bg-paper p-6 shadow-card"
        >
          <h3 className="text-h2 text-ink-900">计分表</h3>
          <div className="mt-3 space-y-2">
            {SCORE_ROWS.map(([k, v], i) => (
              <motion.div
                key={k}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + i * 0.06 }}
                className="flex items-baseline text-body-warm"
              >
                <span className="text-ink-600">{k}</span>
                <span className="mx-2 flex-1 border-b border-dotted border-sand-300" />
                <span className="font-mono-num font-bold text-amber-500">{v}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.42 }}
          className="mx-auto mt-6 flex max-w-[640px] items-start gap-3 rounded-rlg bg-sage-100 p-6"
        >
          <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-sage-600" />
          <p className="text-body-warm text-ink-600">
            <strong className="text-ink-900">健康游戏公约：</strong>
            本站内置防沉迷系统：每 20 分钟提醒休息，连续 25 分钟强制休息 10
            分钟；上学日每日最多 90 分钟，假期（周末、法定节假日和寒暑假）每日最多 2
            小时；被强制休息一次当日上限减少 15 分钟，自己主动休息 10 分钟以上则不受罚。
            在家连接 study-buddy 时，完成学习游戏可赚游戏时长（每局 +5 分钟，每日最多 +15
            分钟，正确率太低不算哦）。适度游戏益脑，沉迷游戏伤身。
          </p>
        </motion.div>
        <DiagCopyButton />
      </div>
    </section>
  );
}
