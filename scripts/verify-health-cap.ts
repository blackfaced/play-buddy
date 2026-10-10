/**
 * 健康时长上限验证（纯函数，不依赖浏览器）：
 *
 *  1. 每日总上限：上学日 90 分钟（2026-10 起由 30 放宽——大人也会玩，
 *     约束主要靠连续 25 分钟强制休息 + 学习奖励调节），假期 120 分钟
 *  2. 强制休息扣减：每次 -15 分钟，保底 30 分钟（与基数一半取小）
 *  3. 假期判定：周末 / 法定节假日 / 寒暑假
 *
 * Run:  ./node_modules/.bin/tsc -p tsconfig.verify.json && node -r ./scripts/alias-hook.cjs node_modules/.tmp-verify/scripts/verify-health-cap.js
 */
import { dailyCapMs, isHolidayKey, WEEKDAY_CAP_MS, DAILY_CAP_MS, MIN } from '../src/store/useStore';

let failures = 0;
function check(name: string, cond: boolean) {
  if (cond) console.log(`  ✅ ${name}`);
  else {
    console.log(`  ❌ ${name}`);
    failures++;
  }
}

console.log('健康时长上限验证');

// ---- 1. 每日总上限基数 ----
console.log('\n[1] 每日总上限基数');
check('上学日基数 = 90 分钟', WEEKDAY_CAP_MS === 90 * MIN);
check('假期基数 = 120 分钟', DAILY_CAP_MS === 120 * MIN);
check('dailyCapMs(0, 上学日) = 90 分钟', dailyCapMs(0, false) === 90 * MIN);
check('dailyCapMs(0, 假期) = 120 分钟', dailyCapMs(0, true) === 120 * MIN);

// ---- 2. 强制休息扣减与保底 ----
console.log('\n[2] 强制休息扣减（每次 -15 分钟，保底 30 分钟）');
check('上学日扣 1 次 = 75 分钟', dailyCapMs(1, false) === 75 * MIN);
check('上学日扣 2 次 = 60 分钟', dailyCapMs(2, false) === 60 * MIN);
check('上学日扣 4 次 = 保底 30 分钟（不再下降）', dailyCapMs(4, false) === 30 * MIN);
check('上学日扣 10 次 = 仍为保底 30 分钟', dailyCapMs(10, false) === 30 * MIN);
check('假期扣 10 次 = 保底 30 分钟', dailyCapMs(10, true) === 30 * MIN);

// ---- 3. 假期判定 ----
console.log('\n[3] 假期判定（周末 / 法定节假日 / 寒暑假）');
check('2026-03-04（周三，上学日）= 非假期', isHolidayKey('2026-03-04') === false);
check('2026-05-06（周三，上学日）= 非假期', isHolidayKey('2026-05-06') === false);
check('2026-10-10（周六）= 假期', isHolidayKey('2026-10-10') === true);
check('2026-10-11（周日）= 假期', isHolidayKey('2026-10-11') === true);
check('2026-07-15（周三，暑假）= 假期', isHolidayKey('2026-07-15') === true);
check('2026-10-01（周四，国庆）= 假期', isHolidayKey('2026-10-01') === true);

if (failures > 0) {
  console.error(`\n${failures} 项失败`);
  process.exit(1);
}
console.log('\n全部通过');
