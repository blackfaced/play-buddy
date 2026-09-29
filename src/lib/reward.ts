// src/lib/reward.ts
// =====================================================================
// 学习奖励（纯本机，无任何服务器依赖）
//
// 规则（家长拍板 2026-09-29，由此前的 +10 分钟放宽）：
//   - 学习类游戏通关后按成绩换算游戏时长，直接写入本机防沉迷账户
//   - 每日封顶 +15 分钟（可用构建期环境变量 VITE_REWARD_CAP_MIN 调整）
//   - 奖励只放宽"每日总上限"，不免除 25 分钟连续强制休息（眼睛是底线）
//   - 存档在 localStorage（bb.reward.YYYY-MM-DD），不上传、不联网
//
// 构建期注入：vite.config.ts 用 define 把 VITE_REWARD_CAP_MIN 写成
// globalThis 常量 __REWARD_CAP_MIN__。verify 脚本以 CommonJS 运行，
// 注入点不存在 → 走默认值 15。
// =====================================================================

const MIN = 60_000;

/** 默认日封顶 15 分钟（练 3 局达标）；可用 VITE_REWARD_CAP_MIN 覆盖 */
export const REWARD_CAP_DEFAULT_MIN = 15;

/**
 * 日封顶分钟数 → 毫秒。纯函数便于单测；env 形如 { VITE_REWARD_CAP_MIN: '20' }。
 * 取值非法（≤0 / 非数字）时回落到默认 15，不静默产生 0 上限把奖励全掐死。
 */
export function resolveRewardCapMs(env: Record<string, unknown> = {}): number {
  const raw = env.VITE_REWARD_CAP_MIN;
  if (raw === undefined || raw === null || raw === '') return REWARD_CAP_DEFAULT_MIN * MIN;
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return REWARD_CAP_DEFAULT_MIN * MIN;
  return Math.round(n * MIN);
}

declare const __REWARD_CAP_MIN__: string | undefined;

/** 日封顶毫秒数（浏览器侧经 define 注入；Node 单测下取默认 15 分钟） */
export const REWARD_CAP_MS = ((): number => {
  try {
    if (typeof __REWARD_CAP_MIN__ !== 'undefined') {
      return resolveRewardCapMs({ VITE_REWARD_CAP_MIN: __REWARD_CAP_MIN__ });
    }
  } catch {
    /* 未注入 → 默认值 */
  }
  return resolveRewardCapMs();
})();

/**
 * 入账计算：在现有今日奖励基础上累加 delta，按日封顶截断。
 * 返回累加后的总额与实际入账部分（可能为 0 = 今日已封顶）。
 */
export function creditBonus(
  currentMs: number,
  deltaMs: number,
  capMs: number = REWARD_CAP_MS,
): { totalMs: number; creditedMs: number } {
  const cur = Math.max(0, Math.floor(currentMs) || 0);
  const d = Math.max(0, Math.floor(deltaMs) || 0);
  const totalMs = Math.min(capMs, cur + d);
  return { totalMs, creditedMs: totalMs - cur };
}
