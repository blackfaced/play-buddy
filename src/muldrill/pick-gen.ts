// src/muldrill/pick-gen.ts
// =====================================================================
// 乘法大冒险 · 纯逻辑层
//
// 迁移自 study-buddy web/games/multiplication-drill/pick-gen.js +
// web/shared/numpad.js，行为保持一致（玩法不改动），另把原先内联在
// DOM 里的结算/上报逻辑抽成纯函数以便无头验证。
//
// 玩法：1-9 乘法表 60 秒挑战。屏幕数字键盘输入，位数齐自动提交；
// 答错显示完整 9×9 表，2.2 秒后自动进入下一题（给孩子查表的时间，
// 不打断节奏）。结算看正确率分四档。
//
// 全部为纯函数：不碰 DOM、不读时钟、不用 Math.random（rng 注入），
// 便于跑几万轮断言。DOM 接线与计时在 MulDrill.tsx。
// =====================================================================

/** 乘法表下界（含）。1×1 也要练，不从 0 起。 */
export const MUL_MIN = 1;
/** 乘法表上界（含）。9×9 = 81 恰好两位，键盘上限逻辑据此推导。 */
export const MUL_MAX = 9;
/** 展示用乘法表边长。 */
export const TABLE_SIZE = 9;

/** 60 秒一局。 */
export const ROUND_SECONDS = 60;
/** 答错后展示完整乘法表的停留时长（毫秒）。 */
export const TABLE_HINT_MS = 2200;
/** 屏幕数字键盘允许的最大输入位数（9×9=81 两位，留一位余量）。 */
export const MAX_INPUT_DIGITS = 3;

export interface MulQuestion {
  a: number;
  b: number;
  answer: number;
  problem: string;
}

/**
 * 随机抽一道 1-9 乘法题。
 *
 * a、b 各自独立从 [1,9] 采样 → 81 个格子等概率。**故意不排重**：
 * 这是原实现的语义（等概率复习整张表），连续重复的概率是 1/81，
 * 在 60 秒的节奏里属于可接受的噪声。若要改成"连出两题不重复"，
 * 需要连抽两次直到不同 —— 那是玩法变更，不是迁移。
 *
 * rng 由调用方注入，测试可确定性复现；UI 传 Math.random。
 * 契约是 rng ∈ [0,1)，但仍对 rng ≥ 1 做夹取：宁可少出一道题，
 * 也不能让 "10 × 10" 这种越界题漏到孩子屏幕上。
 */
export function pickMultiplicationQuestion(rng: () => number): MulQuestion {
  const draw = (): number => {
    const r = Math.min(Math.max(rng(), 0), 0.9999999);
    return Math.floor(r * MUL_MAX) + MUL_MIN;
  };
  const a = draw();
  const b = draw();
  return {
    a,
    b,
    answer: a * b,
    problem: `${a} × ${b} = ?`,
  };
}

/** 乘法表每格固定宽度（字符数），保证等宽字体下上下对齐。 */
const COL_W = 4;
/** 行首行号列宽度。 */
const LABEL_W = 4;

/**
 * 渲染完整 1-9 × 1-9 乘法表（口诀表版式），答错时原样展示给孩子查。
 *
 * ⚠️ 相对原实现是**唯一一处有意的行为改动**。原实现输出
 *   "1×1=1  1×2=2  ...  9×9=81"
 * 单元格宽度不等（5–6 字符），而 UI 用的是等宽字体 + white-space:pre，
 * 所以**每列的数字是歪的** —— 而"扫一列找答案"正是这个提示的全部意义。
 * 这里改成带表头的口诀表版式：每格定宽右对齐，每行长度严格一致，
 * 行号列在左、表头数字在上，42 字符宽（手机上放得下，不再横向滚动）。
 * 每个格子的内容仍是 a×b 的积，答案没有增减。
 */
export function makeMultiplicationTable(): string {
  const cols = Array.from({ length: MUL_MAX }, (_, i) => i + MUL_MIN);
  const head = '×'.padStart(LABEL_W) + cols.map((c) => String(c).padStart(COL_W)).join('');
  const lines = [head];
  for (const a of cols) {
    lines.push(
      String(a).padStart(LABEL_W) + cols.map((b) => String(a * b).padStart(COL_W)).join(''),
    );
  }
  return lines.join('\n');
}

/* ---------------------------------------------------------------------
 * 屏幕数字键盘（对齐 study-buddy web/shared/numpad.js）
 * 收进本模块是为了满足"自包含"约定 —— 不跨模块共享 UI 工具。
 * ------------------------------------------------------------------- */

/**
 * 答案应占几位数。非负整数返回位数；不是朴素整数时返回 null，
 * 调用方据此落回手动 ✓ 提交（不做静默猜测）。
 */
export function expectedAnswerLength(answer: unknown): number | null {
  if (typeof answer === 'string' && answer.trim() === '') return null;
  const n = typeof answer === 'string' ? Number(answer) : answer;
  if (typeof n !== 'number' || !Number.isInteger(n) || n < 0) return null;
  return String(n).length;
}

/** 已输入位数达到答案位数 → 自动提交，不用等孩子按 ✓。 */
export function shouldAutoSubmit(value: string, answer: unknown): boolean {
  const len = expectedAnswerLength(answer);
  return len !== null && /^\d+$/.test(value) && value.length === len;
}

/** 追加一位数字，超出 maxLen 截断（孩子连点不会把答案写飞）。 */
export function appendDigit(current: string, digit: string, maxLen: number): string {
  if (current.length >= maxLen) return current;
  return current + digit;
}

/** 退格。空串退格返回空串，不炸。 */
export function backspace(current: string): string {
  return current.slice(0, -1);
}

/* ---------------------------------------------------------------------
 * 结算
 * ------------------------------------------------------------------- */

export interface Verdict {
  emoji: string;
  title: string;
}

/** 正确率 0-100。0 题按 0% 处理，不产生 NaN。 */
export function rateOf(correct: number, total: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const c = Math.min(Math.max(correct, 0), total);
  return Math.round((c / total) * 100);
}

/**
 * 结算评语，四档（原实现阈值，未改动）：
 *   ≥90% 🏆 太厉害啦 / ≥70% 🎉 不错哟 / ≥50% 💪 继续加油 / 其余 🌱 慢慢来不急
 * 入参越界先夹到 [0,100]，避免出现 undefined 评语。
 */
export function verdictFor(rate: number): Verdict {
  const r = Math.min(100, Math.max(0, rate));
  if (r >= 90) return { emoji: '🏆', title: '太厉害啦！' };
  if (r >= 70) return { emoji: '🎉', title: '不错哟' };
  if (r >= 50) return { emoji: '💪', title: '继续加油' };
  return { emoji: '🌱', title: '慢慢来不急' };
}

/** 平均每题秒数，保留 1 位小数。0 题返回 0，不产生 NaN/Infinity。 */
export function avgSecondsPerQuestion(durationSec: number, total: number): number {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return 0;
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.round((durationSec / total) * 10) / 10;
}

/* ---------------------------------------------------------------------
 * 上报载荷（给 study-buddy 家长看板 / 错题账本）
 *
 * 迁移到 play-buddy 后，study-buddy 侧仍在 apps registry 里登记着
 * "multiplication-drill"（status: ready），而 play-buddy 的
 * fetchStudyReward() 会逐个查询各学习 app 的 /api/game/daily。
 * 所以在 play-buddy 上玩也必须能把会话与错题回传，否则这个 appId
 * 贡献恒为 0，等于从奖励池里悄悄消失了。
 * 载荷字段与原实现逐字一致，服务端契约不变。
 * ------------------------------------------------------------------- */

/** 与 study-buddy apps registry 中的 id 对齐，不要改名。 */
export const SB_APP_ID = 'multiplication-drill';
/** 单孩子家庭部署固定值，与 play-buddy src/game/studyBuddy.ts 保持一致。 */
export const SB_CHILD_ID = 'default';
/** 错因分类，对齐服务端 mistakes.errorType。 */
export const SB_ERROR_TYPE = 'multiply';

export interface RoundMistake {
  problem: string;
  userAnswer: string;
  correctAnswer: string;
}

export interface RoundStats {
  startedAt: number;
  endedAt: number;
  totalQuestions: number;
  correctCount: number;
  mistakes: RoundMistake[];
}

export interface SessionPayload {
  childId: string;
  appId: string;
  durationSec: number;
  totalQuestions: number;
  correctCount: number;
  startedAt: number;
  endedAt: number;
}

export interface MistakePayload {
  childId: string;
  problem: string;
  userAnswer: string;
  correctAnswer: string;
  errorType: string;
  source: string;
}

/** 一局结束 → POST /api/game/session 的载荷。时长至少 1 秒（服务端要求）。 */
export function buildSessionPayload(s: RoundStats): SessionPayload {
  const durationSec = Math.max(1, Math.round((s.endedAt - s.startedAt) / 1000));
  return {
    childId: SB_CHILD_ID,
    appId: SB_APP_ID,
    durationSec,
    totalQuestions: Math.max(0, Math.floor(s.totalQuestions)),
    correctCount: Math.max(0, Math.floor(s.correctCount)),
    startedAt: s.startedAt,
    endedAt: s.endedAt,
  };
}

/** 单道错题 → POST /api/game/mistake 的载荷。 */
export function buildMistakePayload(m: RoundMistake): MistakePayload {
  return {
    childId: SB_CHILD_ID,
    problem: m.problem,
    userAnswer: m.userAnswer,
    correctAnswer: m.correctAnswer,
    errorType: SB_ERROR_TYPE,
    source: SB_APP_ID,
  };
}
