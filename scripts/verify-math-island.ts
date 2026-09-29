/**
 * Headless verification for 糖果口算岛 question generation.
 *
 * Runs N rounds per level and asserts the hard constraints the game relies on:
 *   - 恒定题量 Q_PER_LEVEL
 *   - 答案落在 0–100（不出现负数、不超三位数上限）
 *   - 减法被减数 > 减数
 *   - 同关内不重复
 *   - L1 全部无进位/无退位
 *   - L2 全部含进位或退位
 *   - L3 恰好 6 道应用题，且应用题数字与题面一致
 *   - 选项恒为 4 个、含正确答案、无重复、非负
 *   - 速度星分档正确
 *   - 错因分类正确
 *
 * Run: npx tsc -p tsconfig.verify.json && node node_modules/.tmp-verify/scripts/verify-math-island.js
 */
import {
  generateLevel,
  generateOptions,
  answerOf,
  hasCarry,
  hasBorrow,
  detectErrorType,
  speedStars,
  starsToBonusMs,
  WORD_PROBLEMS,
  Q_PER_LEVEL,
  SEGMENT_SIZE,
  type Level,
  type Question,
} from '../src/mathisland/generate';

const ROUNDS = 3000;
const LEVELS: Level[] = [1, 2, 3];

let failures = 0;
let checks = 0;

function check(cond: boolean, msg: string, ctx?: unknown): void {
  checks++;
  if (!cond) {
    failures++;
    if (failures <= 25) console.error(`  ✗ ${msg}`, ctx === undefined ? '' : JSON.stringify(ctx));
  }
}

function checkQuestion(q: Question, level: Level, round: number, idx: number): void {
  const where = { level, round, idx, q: `${q.a}${q.op}${q.b}` };
  const ans = answerOf(q);
  check(q.a >= 0 && q.b >= 0, '操作数为非负整数', where);
  check(q.a >= 10, '操作数至少两位', where);
  check(ans >= 0, `答案非负 (实际 ${ans})`, where);
  check(ans <= 100, `答案不超过 100 (实际 ${ans})`, where);
  if (q.op === '-') check(q.a > q.b, `减法被减数 > 减数 (${q.a}-${q.b})`, where);

  if (level === 1) {
    check(!hasCarry(q), 'L1 不应出现进位', where);
    check(!hasBorrow(q), 'L1 不应出现退位', where);
  }
  if (level === 2) {
    check(hasCarry(q) || hasBorrow(q), 'L2 必须含进位或退位', where);
  }
}

console.log(`糖果口算岛 · 题目生成验证 (${ROUNDS} 轮 × ${LEVELS.length} 关)\n`);

for (const level of LEVELS) {
  for (let r = 0; r < ROUNDS; r++) {
    const qs = generateLevel(level);
    check(
      qs.length === Q_PER_LEVEL,
      `${level} 关题量应为 ${Q_PER_LEVEL}（实际 ${qs.length}）`,
      { level, round: r },
    );

    const keys = new Set<string>();
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      checkQuestion(q, level, r, i);
      const k = `${q.a}${q.op}${q.b}`;
      check(!keys.has(k), `${level} 关内题目重复: ${k}`, { level, round: r });
      keys.add(k);

      // 选项
      const opts = generateOptions(q);
      check(opts.length === 4, `选项应为 4 个（实际 ${opts.length}）`, { q: k });
      check(new Set(opts).size === opts.length, `选项不得重复: ${opts.join(',')}`, { q: k });
      check(opts.includes(answerOf(q)), `选项必须含正确答案 ${answerOf(q)}`, { q: k, opts });
      check(opts.every((o) => o >= 0), '选项不得为负', { q: k, opts });
      check(opts.every((o) => Number.isInteger(o)), '选项必须为整数', { q: k, opts });
    }

    // L3 应用题
    if (level === 3) {
      const wp = qs.filter((q) => q.scenario !== null);
      check(wp.length === 6, `L3 应有 6 道应用题（实际 ${wp.length}）`, { round: r });
      for (const q of wp) {
        const src = WORD_PROBLEMS.find((w) => w.a === q.a && w.b === q.b && w.op === q.op);
        check(!!src, `应用题 (${q.a}${q.op}${q.b}) 应来自题库`, { round: r });
        check(q.scenario === src?.scenario, '应用题题干应与题库一致', { q: `${q.a}${q.op}${q.b}` });
        // 题干里出现的数字必须和 a/b 对得上，孩子才不会算错
        const nums = (q.scenario ?? '').match(/\d+/g)?.map(Number) ?? [];
        check(nums.includes(q.a), `题干应包含被加/被减数 ${q.a}`, { s: q.scenario });
        check(nums.includes(q.b), `题干应包含加/减数 ${q.b}`, { s: q.scenario });
      }
    }
  }
  console.log(`  ✓ L${level} ${ROUNDS} 轮通过`);
}

// 分段：18 题 = 3 组 × 6
check(Q_PER_LEVEL % SEGMENT_SIZE === 0, '题量应能被分段大小整除');
check(Q_PER_LEVEL / SEGMENT_SIZE === 3, '应为 3 组');
console.log(`  ✓ 分段 ${Q_PER_LEVEL} 题 = ${Q_PER_LEVEL / SEGMENT_SIZE} 组 × ${SEGMENT_SIZE}`);

// 速度星分档
const starCases: Array<[number, number]> = [
  [1, 3], [0.7, 3], [0.69, 2], [0.4, 2], [0.39, 1], [0.01, 1], [0, 0],
];
for (const [ratio, expect] of starCases) {
  const got = speedStars(ratio);
  check(got === expect, `speedStars(${ratio}) 应为 ${expect}（实际 ${got}）`);
}
console.log('  ✓ 速度星分档');

// 星 → 时长奖励
check(starsToBonusMs(0) === 0, '0 星应得 0 奖励');
check(starsToBonusMs(3) === 30_000, '3 星应得 30 秒');
check(starsToBonusMs(6) === 60_000, '6 星应得 60 秒（未封顶）');
check(starsToBonusMs(30) === 5 * 60_000, '30 星正好到 5 分钟上限');
check(starsToBonusMs(54) === 5 * 60_000, '54 星应封顶 5 分钟');
check(starsToBonusMs(999) === 5 * 60_000, '超大量星仍封顶 5 分钟');
console.log('  ✓ 速度星 → 时长奖励');

// 错因分类
const errCases: Array<[Question, number, string]> = [
  [{ a: 7, b: 8, op: '+', scenario: null }, 14, 'carry'], // 7+8=15，写成 14 → 进位错
  [{ a: 13, b: 7, op: '-', scenario: null }, 16, 'borrow'], // 13-7=6，写成 16 → 退位错
  [{ a: 5, b: 3, op: '+', scenario: null }, 2, 'sign'], // 5+3=8，写成 2（当减法算）→ 符号错
  [{ a: 23, b: 45, op: '+', scenario: null }, 67, 'compute'], // 23+45=68，无进位差 1 → 算错
];
for (const [q, ua, expect] of errCases) {
  const got = detectErrorType(q, ua);
  check(got === expect, `${q.a}${q.op}${q.b} 用户答 ${ua} 应判为 ${expect}（实际 ${got}）`);
}
console.log('  ✓ 错因分类');

console.log(`\n共 ${checks} 项检查，失败 ${failures} 项`);
if (failures > 0) {
  console.error('\n验证失败');
  process.exit(1);
}
console.log('全部通过 ✅');
