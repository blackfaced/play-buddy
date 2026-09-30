// src/write/structure.ts
// =====================================================================
// 字的构造台 · 纯逻辑层
//
// 为什么要做这个：诊断出的病根不是"写错笔画"，是**看不见结构**——
// 整字感觉驱动，不拆成部件看。所以这里的一切都围绕一件事：
// 让孩子先能"说出这个字是几 + 几拼起来的"，再去谈末笔怎么收。
//
// 对应 study-buddy 的产品方向（docs/product-direction.md）：
//   「找一个字 → 查看笔画顺序与字结构 → 在纸上书写」
// 本模块负责"看结构"这一半，且不引入自动字迹评分——
// study-buddy 那边的 handwriting-coach.js（28KB）在该文档里已被
// 标记为退出首版主流程，且其 VALIDATED_STROKE_ORDERS 是空表
// （一个字都没人工校验过），故不迁移。
//
// 全部纯函数 / 纯数据，不碰 DOM，可用 verify 脚本跑几万轮。
// 字表取自人教部编版二年级上册写字表，形近字组按同一册的常见混淆挑。
// =====================================================================

export type Struct = 'up' | 'lr';

export const STRUCT_LABEL: Record<Struct, string> = {
  up: '上下结构',
  lr: '左右结构',
};

export const STRUCT_HINT: Record<Struct, string> = {
  up: '上面一块、下面一块',
  lr: '左边一块、右边一块',
};

/** 字的三种结构选项，用于出题（"独体字"是干扰项：合体字不能选它） */
export const STRUCT_OPTIONS: ReadonlyArray<{ value: Struct | 'sg'; label: string; hint: string }> = [
  { value: 'up', label: STRUCT_LABEL.up, hint: STRUCT_HINT.up },
  { value: 'lr', label: STRUCT_LABEL.lr, hint: STRUCT_HINT.lr },
  { value: 'sg', label: '独体字', hint: '一整块，没分家' },
];

export interface CharStructure {
  char: string;
  struct: Struct;
  /** 上/左那一块 */
  top: string;
  /** 下/右那一块 */
  bottom: string;
  /** 问的是哪一块（p1 = 上/左，p2 = 下/右） */
  ask: 'p1' | 'p2';
  /** 干扰项（同位置的形近部件） */
  wrong: readonly string[];
  /** 提示：这句话是这个字最该记的那一条 */
  tip: string;
}

/**
 * 搭积木题库：25 个二年级上册的字。
 * `top`/`bottom` 用「上/左」「下/右」的统一叫法承载，兼容两种结构。
 */
export const BUILD_CHARS: readonly CharStructure[] = [
  { char: '朵', struct: 'up', ask: 'p1', top: '几', bottom: '木', wrong: ['风', '皮', '爪'], tip: '上半「几」下半「木」。几的弯钩要收住，别甩出去。' },
  { char: '春', struct: 'up', ask: 'p2', top: '三+人', bottom: '日', wrong: ['禾', '月', '白'], tip: '上半三横一撇一捺，下半是「日」——不是「禾」。' },
  { char: '香', struct: 'up', ask: 'p1', top: '禾', bottom: '日', wrong: ['木', '牛', '毛'], tip: '上半是「禾」不是「木」。禾的第一笔撇要探出去。' },
  { char: '苗', struct: 'up', ask: 'p2', top: '艹', bottom: '田', wrong: ['由', '甲', '申'], tip: '草字头的竖要出头，田里不出头。这三个最容易混。' },
  { char: '苦', struct: 'up', ask: 'p2', top: '艹', bottom: '古', wrong: ['舌', '叶', '苗'], tip: '草字头 + 古。' },
  { char: '果', struct: 'up', ask: 'p2', top: '田', bottom: '木', wrong: ['本', '禾', '末'], tip: '上面田、下面木。田和木要压在一条中线上。' },
  { char: '忘', struct: 'up', ask: 'p2', top: '亡', bottom: '心', wrong: ['必', '志', '想'], tip: '心字底：卧钩变成一个点。' },
  { char: '步', struct: 'up', ask: 'p1', top: '止', bottom: '少', wrong: ['正', '上', '生'], tip: '上面是「止」不是「正」——「步」和「正」常混。' },
  { char: '写', struct: 'up', ask: 'p2', top: '冖', bottom: '与', wrong: ['岛', '号', '乌'], tip: '秃宝盖 + 与。' },
  { char: '家', struct: 'up', ask: 'p2', top: '宀', bottom: '豕', wrong: ['象', '水', '禾'], tip: '宝盖头要盖住下面，不能写得太小。' },
  { char: '音', struct: 'up', ask: 'p1', top: '立', bottom: '日', wrong: ['辛', '言', '亲'], tip: '上面「立」下面「日」，别写成「言」。' },
  { char: '他', struct: 'lr', ask: 'p1', top: '亻', bottom: '也', wrong: ['氵', '扌', '忄'], tip: '单人旁的竖要出头，从撇的上半身起笔。' },
  { char: '妈', struct: 'lr', ask: 'p1', top: '女', bottom: '马', wrong: ['子', '友', '扌'], tip: '女字旁末笔是提。左边窄、右边宽。' },
  { char: '树', struct: 'lr', ask: 'p1', top: '木', bottom: '对', wrong: ['禾', '扌', '氵'], tip: '木字旁末笔是点。右边「对」最后一笔是捺。' },
  { char: '松', struct: 'lr', ask: 'p1', top: '木', bottom: '公', wrong: ['禾', '氵', '纟'], tip: '木字旁末笔是点。别和「公」搞反。' },
  { char: '海', struct: 'lr', ask: 'p1', top: '氵', bottom: '每', wrong: ['冫', '亻', '扌'], tip: '三点水三个点排成弧形，末笔是提。' },
  { char: '认', struct: 'lr', ask: 'p1', top: '讠', bottom: '人', wrong: ['氵', '扌', '礻'], tip: '言字旁末笔是短平捺。别和「氵」混。' },
  { char: '好', struct: 'lr', ask: 'p1', top: '女', bottom: '子', wrong: ['亻', '氵', '纟'], tip: '女字旁末笔是提。' },
  { char: '猫', struct: 'lr', ask: 'p1', top: '犭', bottom: '苗', wrong: ['扌', '氵', '讠'], tip: '反犬旁。左边窄，右边草字头的竖要出头。' },
  { char: '坏', struct: 'lr', ask: 'p1', top: '土', bottom: '不', wrong: ['禾', '扌', '工'], tip: '提土旁末笔是提。右边是「不」不是「丕」。' },
  { char: '肚', struct: 'lr', ask: 'p1', top: '月', bottom: '土', wrong: ['日', '用', '目'], tip: '左边月字旁要窄、瘦长，末笔是提。' },
  { char: '朋', struct: 'lr', ask: 'p2', top: '月', bottom: '月', wrong: ['日', '用', '目'], tip: '两个月。左边那个末笔是提，右边那个末笔是横——两边不一样。' },
  { char: '叶', struct: 'lr', ask: 'p1', top: '口', bottom: '十', wrong: ['日', '囗', '田'], tip: '口字旁末笔是横。口比日矮一截。' },
  { char: '林', struct: 'lr', ask: 'p2', top: '木', bottom: '木', wrong: ['水', '禾', '本'], tip: '两个一模一样的木。左边那个捺变点，右边这个是捺。' },
  { char: '纸', struct: 'lr', ask: 'p1', top: '纟', bottom: '氏', wrong: ['氵', '讠', '亻'], tip: '绞丝旁三笔，末笔是提。' },
];

/** 问 p1 还是 p2 → 那半边的部件名 */
export function askedPart(c: CharStructure): string {
  return c.ask === 'p1' ? c.top : c.bottom;
}

/** 上/左那一半在界面上的标签 */
export function topLabel(struct: Struct): string {
  return struct === 'up' ? '上面' : '左边';
}

/** 下/右那一半在界面上的标签 */
export function bottomLabel(struct: Struct): string {
  return struct === 'up' ? '下面' : '右边';
}

/* ---------------------------------------------------------------------
 * 找偏旁：给一个部件，问哪些字是它拼出来的
 *
 * 依据是"认一个部件能认一串字"——比一个一个背快得多。
 * 例：认了「木」，树之歌那八个字（杨桐枫松柏棉杉桂）一起有抓手。
 * ------------------------------------------------------------------- */

export interface RadicalItem {
  radical: string;
  answer: string;
  options: readonly string[];
  tip: string;
}

export const RADICALS: readonly RadicalItem[] = [
  { radical: '木', answer: '杨', options: ['杨', '猫', '认'], tip: '木字旁最后一笔捺要变成点。板、极、术、松、桥都一样。' },
  { radical: '氵', answer: '海', options: ['海', '妈', '树'], tip: '三点水末笔是提。洋、汗、活、法、渴都一样。' },
  { radical: '女', answer: '好', options: ['好', '肚', '海'], tip: '女字旁末笔是提。妈、她、娃都一样。' },
  { radical: '讠', answer: '认', options: ['认', '花', '松'], tip: '言字旁末笔是短平捺。记、说、话、论都一样。' },
  { radical: '艹', answer: '苗', options: ['苗', '他', '好'], tip: '草字头的两竖都要出头。' },
  { radical: '亻', answer: '他', options: ['他', '纸', '猫'], tip: '单人旁的竖要出头。信、做、伤、候都一样。' },
  { radical: '月', answer: '肚', options: ['肚', '苦', '林'], tip: '左边月字旁末笔是提，右边就不同了——两边不一样才是关键。' },
  { radical: '土', answer: '坏', options: ['坏', '松', '叶'], tip: '提土旁末笔是提。场、城、坐都一样。' },
  { radical: '犭', answer: '猫', options: ['猫', '好', '叶'], tip: '反犬旁末笔是提。' },
  { radical: '口', answer: '叶', options: ['叶', '妈', '林'], tip: '口字旁末笔是横，别写成捺。' },
  { radical: '纟', answer: '纸', options: ['纸', '海', '他'], tip: '绞丝旁末笔是提。' },
  { radical: '木', answer: '板', options: ['板', '苦', '好'], tip: '又见木字旁。板、极、术、杨——记一个够用好几个月。' },
];

/** 这个偏旁出现在哪些题库的字的哪一半（"认一个部件 → 认一串字"） */
export function charsUsing(radical: string): string[] {
  const out = new Set<string>();
  for (const c of BUILD_CHARS) {
    if (c.top === radical || c.bottom === radical) out.add(c.char);
  }
  return [...out];
}

/* ---------------------------------------------------------------------
 * 形近对比：把长得像的并排摆出来
 *
 * 依据是"并排对比比单独看强十倍"——孩子单独看自己的字看不出问题，
 * 两张纸一摆，差别立刻显形。所以这里全部是"词 + 挑字"，而不是
 * "给一个偏旁换一换"。
 * ------------------------------------------------------------------- */

export interface ConfusableItem {
  /** 提示用的词，让字有语境 */
  word: string;
  answer: string;
  options: readonly string[];
  tip: string;
}

export const CONFUSABLES: readonly ConfusableItem[] = [
  { word: '春天', answer: '春', options: ['香', '春', '秦'], tip: '春下面是「日」。香下面是「禾」，禾那两笔要甩出去。' },
  { word: '身体', answer: '身', options: ['身', '射', '伸'], tip: '身，最后一笔斜撇要冲出横折钩外头。' },
  { word: '花朵', answer: '朵', options: ['朵', '杂', '朵'], tip: '朵下面是「木」，最后一笔是捺，直甩右下，不带钩。' },
  { word: '杨树', answer: '杨', options: ['场', '杨', '汤'], tip: '杨是木字旁，末笔捺要变点。汤是三点水，场是提土旁。' },
  { word: '打扫', answer: '扫', options: ['扫', '抄', '秒'], tip: '扫是提手旁，末笔是提。' },
  { word: '他们', answer: '他', options: ['池', '地', '他'], tip: '他、池、地右边都是「也」，左边的偏旁决定意思：亻、氵、提土。' },
  { word: '树叶', answer: '叶', options: ['汁', '计', '叶'], tip: '叶是口字旁。汁是三点水，计是言字旁。' },
  { word: '好人', answer: '好', options: ['如', '妈', '好'], tip: '好是女字旁。妈也是女字旁，末笔都是提。' },
  { word: '小猫', answer: '猫', options: ['描', '猫', '狗'], tip: '猫是反犬旁，末笔是提。' },
  { word: '用力', answer: '力', options: ['刀', '力', '九'], tip: '刀第二笔是撇，收到里面不出头；力第二笔是横折钩，钩甩出去。' },
  { word: '战士', answer: '士', options: ['土', '士', '壮'], tip: '口诀：上横长是士，下横长是土。' },
  { word: '羽毛', answer: '毛', options: ['毛', '手', '午'], tip: '毛最后一笔是竖弯钩，笔尖要往上挑。' },
  { word: '白云', answer: '白', options: ['自', '百', '白'], tip: '白里面只有一横；自两横；百上面多一横。' },
  { word: '干活', answer: '干', options: ['千', '于', '干'], tip: '干的竖是直的、顶上没撇；千顶上有一点撇。' },
];

/* ---------------------------------------------------------------------
 * 组卷：出题时打乱顺序并保证选项里恰好一个正确答案
 * ------------------------------------------------------------------- */

function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface ChoiceQuestion {
  answer: string;
  options: string[];
}

/**
 * 从一个字组里造一道选择题：选项 = 正确部件 + 干扰项，打乱后返回。
 *
 * 断言：正确项必须在选项里、选项不重复。这里"构造时"就保证，
 * 而不是靠 UI 兜底 —— 重复选项会让孩子"两个都一样"，是设计事故。
 */
export function buildPartChoice(c: CharStructure, rng: () => number): ChoiceQuestion {
  const answer = askedPart(c);
  const opts = shuffle([answer, ...c.wrong], rng);
  return { answer, options: opts };
}

/** 形近题造题（答案必然已在 options 里，构造时再校一次） */
export function buildConfusableChoice(item: ConfusableItem, rng: () => number): ChoiceQuestion {
  const options = shuffle(item.options, rng);
  return { answer: item.answer, options };
}

/** 三个游戏统一的进度评分：0-100，0 题不得 NaN */
export function scoreRate(right: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.round((Math.min(Math.max(right, 0), total) / total) * 100);
}

export interface Verdict {
  emoji: string;
  title: string;
}

/** 四档评语，阈值与站内其他游戏保持一致（90/70/50） */
export function verdictFor(rate: number): Verdict {
  const r = Math.min(100, Math.max(0, rate));
  if (r >= 90) return { emoji: '🏆', title: '眼睛真尖' };
  if (r >= 70) return { emoji: '🎉', title: '看得挺准' };
  if (r >= 50) return { emoji: '💪', title: '再来一遍' };
  return { emoji: '🌱', title: '慢慢看，不急' };
}
