// src/mathisland/generate.ts
// =====================================================================
// 糖果口算岛 · 100 以内加减法题目生成
//
// 纯函数，无副作用，便于单测（对齐 game/levels.ts 的写法）。
//
// 关卡设计（老师要求：每天 15 分钟 ≈ 50 题）：
//   L1 基础 — 100 以内 · 不进位不退位
//   L2 进阶 — 100 以内 · 含进位/退位（核心难点）
//   L3 挑战 — 100 以内混合 + 6 道应用题
//   每关 18 题，分 3 组 × 6 题；每组结束生命回满。
// =====================================================================

export const Q_PER_LEVEL = 18;
export const SEGMENT_SIZE = 6;

export interface WordProblem {
  a: number;
  b: number;
  op: '+' | '-';
  scenario: string;
}

/** 应用题题库（答案全部落在 100 以内，题干数字与 a/b 一致） */
export const WORD_PROBLEMS: readonly WordProblem[] = [
  { a: 35, b: 18, op: '+', scenario: '小红有 35 颗糖，妈妈又给她 18 颗，现在一共有多少颗？' },
  { a: 81, b: 46, op: '-', scenario: '花园里有 81 只蝴蝶，飞走了 46 只，还剩多少只？' },
  { a: 23, b: 45, op: '+', scenario: '小明有 23 本书，妈妈又买了 45 本，现在一共有多少本？' },
  { a: 78, b: 25, op: '-', scenario: '商店有 78 个铅笔盒，卖出 25 个，还剩多少个？' },
  { a: 56, b: 19, op: '-', scenario: '停车场有 56 辆车，开走了 19 辆，还剩多少辆？' },
  { a: 47, b: 38, op: '+', scenario: '书架上有 47 本书，又放上 38 本，现在一共有多少本？' },
  { a: 92, b: 58, op: '-', scenario: '果园里有 92 个苹果，摘走 58 个，还剩多少个？' },
  { a: 64, b: 18, op: '+', scenario: '小红做了 64 道题，妈妈又奖励她 18 道，她一共做了多少道？' },
  { a: 73, b: 27, op: '-', scenario: '商店有 73 个气球，卖出 27 个，还剩多少个？' },
  { a: 28, b: 45, op: '+', scenario: '小明有 28 块饼干，妈妈又给他 45 块，现在一共有多少块？' },
];

export interface Question {
  a: number;
  b: number;
  op: '+' | '-';
  scenario: string | null;
}

export type Level = 1 | 2 | 3;

/** 题目是否含进位（加法：个位和 ≥ 10） */
export function hasCarry(q: Question): boolean {
  return q.op === '+' && q.a % 10 + q.b % 10 >= 10;
}

/** 题目是否含退位（减法：被减数个位 < 减数个位） */
export function hasBorrow(q: Question): boolean {
  return q.op === '-' && q.a % 10 < q.b % 10;
}

export function answerOf(q: Question): number {
  return q.op === '+' ? q.a + q.b : q.a - q.b;
}

function ri(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffled<T>(xs: readonly T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = ri(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 生成一关的题目。
 * L1 全部无进位/无退位；L2 全部含进位或退位；L3 混合 + 6 道应用题。
 * 保证：题量恒为 Q_PER_LEVEL、答案落在 0–100、被减数 ≥ 减数、同关不重复。
 */
export function generateLevel(level: Level): Question[] {
  if (level === 1) return genL1();
  if (level === 2) return genL2();
  return genL3();
}

/** L1 — 100 以内，不进位不退位 */
function genL1(): Question[] {
  const out: Question[] = [];
  const seen = new Set<string>();
  for (let guard = 0; out.length < Q_PER_LEVEL && guard < 4000; guard++) {
    const plus = out.length % 2 === 0;
    let a: number;
    let b: number;
    let op: '+' | '-';
    if (plus) {
      // 个位、十位都不越界 → 和必 < 100
      const a1 = ri(1, 8);
      const b1 = ri(1, 9 - a1);
      const a10 = ri(1, 8);
      const b10 = ri(1, 9 - a10);
      a = a10 * 10 + a1;
      b = b10 * 10 + b1;
      op = '+';
    } else {
      const a1 = ri(0, 9);
      const b1 = ri(0, a1);
      const a10 = ri(2, 9);
      const b10 = ri(1, a10);
      a = a10 * 10 + a1;
      b = b10 * 10 + b1;
      op = '-';
      if (a <= b || b < 10) continue;
    }
    const key = `${a}${op}${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ a, b, op, scenario: null });
  }
  return out;
}

/** L2 — 100 以内，全部含进位或退位 */
function genL2(): Question[] {
  const out: Question[] = [];
  const seen = new Set<string>();
  for (let guard = 0; out.length < Q_PER_LEVEL && guard < 4000; guard++) {
    const plus = out.length % 2 === 0;
    let a: number;
    let b: number;
    let op: '+' | '-';
    if (plus) {
      // 个位和 ≥ 10（进位）；十位和 ≤ 8 → 结果 ≤ 98
      const a1 = ri(2, 9);
      const b1 = ri(Math.max(1, 10 - a1), 9);
      if (a1 + b1 < 10) continue;
      const a10 = ri(1, 7);
      const b10 = ri(1, 8 - a10);
      a = a10 * 10 + a1;
      b = b10 * 10 + b1;
      op = '+';
    } else {
      // 个位退位；十位 a10 > b10 保证 a > b
      const b1 = ri(1, 9);
      const a1 = ri(0, b1 - 1);
      const a10 = ri(2, 9);
      const b10 = ri(1, a10 - 1);
      a = a10 * 10 + a1;
      b = b10 * 10 + b1;
      op = '-';
      if (a <= b) continue;
    }
    const key = `${a}${op}${b}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ a, b, op, scenario: null });
  }
  return out;
}

/** L3 — 混合运算 + 6 道应用题 */
function genL3(): Question[] {
  const out: Question[] = [];
  const seen = new Set<string>();
  // 应用题先占位：随机题不得与题库重复，否则应用题会被挤掉导致题量不足
  const wpKeys = new Set(WORD_PROBLEMS.map((w) => `${w.a}${w.op}${w.b}`));
  for (let guard = 0; out.length < 12 && guard < 4000; guard++) {
    const plus = Math.random() < 0.5;
    const needCarry = Math.random() < 0.6;
    let a: number;
    let b: number;
    let op: '+' | '-';
    if (plus) {
      op = '+';
      if (needCarry) {
        const a1 = ri(2, 9);
        const b1 = ri(Math.max(1, 10 - a1), 9);
        if (a1 + b1 < 10) continue;
        const a10 = ri(1, 7);
        const b10 = ri(1, 8 - a10);
        a = a10 * 10 + a1;
        b = b10 * 10 + b1;
      } else {
        const a1 = ri(1, 8);
        const b1 = ri(1, 9 - a1);
        const a10 = ri(1, 8);
        const b10 = ri(1, 9 - a10);
        a = a10 * 10 + a1;
        b = b10 * 10 + b1;
      }
      if (a + b > 99) continue;
    } else {
      op = '-';
      if (needCarry) {
        const b1 = ri(1, 9);
        const a1 = ri(0, b1 - 1);
        const a10 = ri(2, 9);
        const b10 = ri(1, a10 - 1);
        a = a10 * 10 + a1;
        b = b10 * 10 + b1;
      } else {
        const a1 = ri(0, 9);
        const b1 = ri(0, a1);
        const a10 = ri(2, 9);
        const b10 = ri(1, a10);
        a = a10 * 10 + a1;
        b = b10 * 10 + b1;
        if (b < 10) continue;
      }
      if (a <= b) continue;
    }
    const key = `${a}${op}${b}`;
    if (seen.has(key) || wpKeys.has(key)) continue;
    seen.add(key);
    out.push({ a, b, op, scenario: null });
  }
  for (const wp of shuffled(WORD_PROBLEMS)) {
    if (out.length >= Q_PER_LEVEL) break;
    out.push({ a: wp.a, b: wp.b, op: wp.op, scenario: wp.scenario });
  }
  return out;
}

/**
 * 生成 4 个选项：1 个正确答案 + 3 个干扰项。
 * 干扰项取自常见错法（±1 / ±2 / 符号弄反 / 进退位差 1），过滤负数与重复。
 */
export function generateOptions(q: Question): number[] {
  const correct = answerOf(q);
  const set = new Set<number>([correct]);
  const pool = [
    correct + 1,
    correct - 1,
    correct + 2,
    correct - 2,
    correct + 5,
    correct - 5,
    correct + 10,
    correct - 10,
    q.op === '+' ? q.a - q.b : q.a + q.b,
  ].filter((x) => x >= 0 && x !== correct);
  for (const x of shuffled(pool)) {
    if (set.size >= 4) break;
    set.add(x);
  }
  let guard = 0;
  while (set.size < 4 && guard < 30) {
    const r = correct + ri(-10, 10);
    if (r >= 0) set.add(r);
    guard++;
  }
  return shuffled([...set]);
}

export type ErrorType = 'carry' | 'borrow' | 'sign' | 'compute';

/** 判定错题类型：进位错 / 退位错 / 符号错 / 其它算错 */
export function detectErrorType(q: Question, userAnswer: number): ErrorType {
  if (q.op === '+') {
    if (hasCarry(q) && Math.abs(userAnswer - answerOf(q)) === 1) return 'carry';
    if (userAnswer === q.a - q.b) return 'sign';
    return 'compute';
  }
  if (hasBorrow(q) && userAnswer !== answerOf(q)) return 'borrow';
  if (userAnswer === q.a + q.b) return 'sign';
  return 'compute';
}

export const ERROR_TYPE_LABEL: Record<ErrorType, string> = {
  carry: '进位错',
  borrow: '退位错',
  sign: '符号错',
  compute: '算错',
};

/**
 * 速度星：按答题剩余时间比例给 0–3 星。
 * ratio ≥ 0.7 → 3 星；≥ 0.4 → 2 星；> 0 → 1 星；答错/超时 → 0 星。
 */
export function speedStars(ratio: number): number {
  if (ratio >= 0.7) return 3;
  if (ratio >= 0.4) return 2;
  if (ratio > 0) return 1;
  return 0;
}

/**
 * 换算本关速度星总分 → 游戏时长奖励毫秒。
 * 每颗星 10 秒，本关上限 5 分钟（对齐「一轮换 5 分钟」的节奏）。
 */
export function starsToBonusMs(totalStars: number): number {
  const SEC_PER_STAR = 10_000;
  const CAP = 5 * 60_000;
  return Math.min(CAP, totalStars * SEC_PER_STAR);
}
