/**
 * 学习奖励入账验证（纯函数，不依赖浏览器）：
 *
 *  1. 封顶解析：默认 15 分钟；env 覆盖；非法值回落默认
 *  2. 入账：累加、封顶截断、已封顶时入账为 0、负数/垃圾输入安全
 *
 * Run:  ./node_modules/.bin/tsc -p tsconfig.verify.json && node node_modules/.tmp-verify/scripts/verify-reward.js
 */
import {
  resolveRewardCapMs,
  creditBonus,
  REWARD_CAP_MS,
  REWARD_CAP_DEFAULT_MIN,
} from '../src/lib/reward';

const MIN = 60_000;

let failures = 0;
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${name}`);
  else {
    console.log(`  ❌ ${name}`);
    failures++;
  }
}

console.log('学习奖励入账验证');

// ---- 1. 封顶解析 ----
console.log('\n[1] 日封顶环境变量解析');
const cap = (v: unknown, expectMin: number, label: string) =>
  check(label, resolveRewardCapMs(v === undefined ? {} : { VITE_REWARD_CAP_MIN: v }) === expectMin * MIN);
cap(undefined, 15, '未设置 → 默认 15 分钟');
cap('', 15, '空字符串 → 默认 15 分钟');
cap('10', 10, '"10" → 10 分钟');
cap('15', 15, '"15" → 15 分钟');
cap(' 20 ', 20, '带空格的 "20" → 20 分钟');
cap(20, 20, '数字 20 → 20 分钟');
cap('0', 15, '"0" → 回落默认（不能把奖励全掐死）');
cap('-5', 15, '负数 → 回落默认');
cap('abc', 15, '非数字 → 回落默认');
cap('NaN', 15, '"NaN" → 回落默认');
cap('Infinity', 15, '"Infinity" → 回落默认');
cap('1.5', 1.5, '"1.5" → 保留 1.5 分钟（90 秒）');
check('浏览器注入缺省时 REWARD_CAP_MS = 默认 15 分钟', REWARD_CAP_MS === REWARD_CAP_DEFAULT_MIN * MIN);

// ---- 2. 入账 ----
console.log('\n[2] 入账计算');
const CAP = 15 * MIN;
const c1 = creditBonus(0, 5 * MIN, CAP);
check('0 + 5min → 总额 5min，入账 5min', c1.totalMs === 5 * MIN && c1.creditedMs === 5 * MIN);
const c2 = creditBonus(c1.totalMs, 5 * MIN, CAP);
check('5 + 5min → 总额 10min', c2.totalMs === 10 * MIN && c2.creditedMs === 5 * MIN);
const c3 = creditBonus(c2.totalMs, 5 * MIN, CAP);
check('10 + 5min → 正好到 15min 封顶', c3.totalMs === CAP && c3.creditedMs === 5 * MIN);
const c4 = creditBonus(c3.totalMs, 5 * MIN, CAP);
check('已封顶再入账 → 总额不变，入账 0', c4.totalMs === CAP && c4.creditedMs === 0);
const c5 = creditBonus(14 * MIN, 5 * MIN, CAP);
check('14 + 5min → 只入账 1min（截断到封顶）', c5.totalMs === CAP && c5.creditedMs === 1 * MIN);
const c6 = creditBonus(0, 0, CAP);
check('delta 0 → 入账 0', c6.creditedMs === 0 && c6.totalMs === 0);
const c7 = creditBonus(-100, -50, CAP);
check('负数输入安全（按 0 处理）', c7.totalMs === 0 && c7.creditedMs === 0);
const c8 = creditBonus(NaN, NaN, CAP);
check('NaN 输入安全（按 0 处理）', c8.totalMs === 0 && c8.creditedMs === 0);
const c9 = creditBonus(0, 999 * MIN, CAP);
check('超大 delta → 截断到封顶', c9.totalMs === CAP && c9.creditedMs === CAP);
// 口算岛节奏：一关最多 5 分钟（54 星 × 10 秒封顶），3 关正好到 15 分钟日封顶
const round = creditBonus(0, 5 * MIN, CAP);
const twice = creditBonus(round.totalMs, 5 * MIN, CAP);
const thrice = creditBonus(twice.totalMs, 5 * MIN, CAP);
check('3 关 × 5min = 15min 正好达标', thrice.totalMs === CAP);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
