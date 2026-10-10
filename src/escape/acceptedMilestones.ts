import type { CampaignId, EpisodeState } from './campaign/types';

export interface CompletionMilestone { id: string; label: string }
type Flags = Record<string, unknown>;
function flags(values: Flags, labels: Record<string, string>): CompletionMilestone[] {
  return Object.entries(labels).filter(([id]) => values[id] === true).map(([id, label]) => ({ id, label }));
}
/** Accepted mechanical results only. Derived arrangement/solved flags are intentionally excluded. */
const campaignLabels: Record<CampaignId, Record<string, string>> = {
  clockwork: { upperOpen: '传动已接通 · 栅门已升起', released: '钟门已开启' },
  shadow: { curtainRaised: '幕布已升起', lit: '舞台灯光已接通' },
  greenhouse: { floatRaised: '水路已接通 · 浮子已升起', pumped: '灌溉已完成 · 藤门已打开' },
  radio: { signalsHeard: '整组讯号已收到', transmitted: '发报已完成 · 港门已开启' },
  music: { played: '旋律已奏完 · 木灯塔已展开' },
  cargo: { gate: '小船已通过 · 桥板已放下' },
  observatory: { roof: '观测已完成 · 穹顶已展开' },
};
export function campaignMilestones(id: CampaignId, state: EpisodeState): CompletionMilestone[] {
  return flags(state.values, campaignLabels[id]);
}
export function cabinMilestones(state: object): CompletionMilestone[] {
  return flags(state as Flags, { picture: '木画已拼合', drawer: '抽屉锁已打开', cabinet: '柜门已打开', safe: '保险箱已打开', escaped: '舱门已开启' });
}
export function adventureMilestones(state: object): CompletionMilestone[] {
  return flags(state as Flags, { storeroomOpen: '储物舱门已开启', safeOpen: '保险箱已打开', projectorOn: '投影装置已启动', panelOpen: '图板锁扣已松开', gangwayDown: '舷梯已放下' });
}
const chapterLabels: Record<string, string> = { 'search-kit': '工具匣已集齐', 'animal-cabinet': '标本柜已打开', 'pattern-tray': '纹片台已解开', 'lens-chart': '观测暗格已打开', 'gravity-lock': '落块锁已解开', 'tide-sudoku': '潮汐板已解开', 'foglight-console': '归航雾灯已点亮' };
export function chapterMilestones(state: { puzzles: Record<string, { solved: boolean }> }): CompletionMilestone[] {
  return Object.entries(state.puzzles).filter(([, puzzle]) => puzzle.solved).map(([id]) => ({ id, label: chapterLabels[id] ?? '机关已解开' }));
}
export function newlyAccepted(before: CompletionMilestone[], after: CompletionMilestone[]): CompletionMilestone[] {
  const previous = new Set(before.map(item => item.id));
  return after.filter(item => !previous.has(item.id));
}
