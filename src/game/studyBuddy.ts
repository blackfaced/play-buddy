// src/game/studyBuddy.ts
// =====================================================================
// study-buddy 融合层（在家模式）
//
// 同一个构建产物跑两种环境：
//   在家 — 由 study-buddy 的 Express 托管在 /games/balance-blocks/，
//          /api/* 同源可达 → 开启"学习换时长"奖励 + 游玩会话上报
//   在外 — 静态部署（无 API），所有调用静默失败 → 纯玩模式
//
// 奖励规则（家长拍板 2026-08-27，定位：学习辅助手段而非主渠道）：
//   - 每完成 1 局学习游戏 +5 分钟游戏时长
//   - 当日学习聚合正确率 <60% 不发奖（防止乱点刷时长）
//   - 奖励池每日封顶 +10 分钟（一天练一两套即达标，超出只记打卡）
//   - 奖励只放宽"每日总上限"，不免除 25 分钟连续强制休息（眼睛是底线）
//   - 排除本游戏自身的会话，防止"玩→记会话→换更多时长"自反馈
// =====================================================================

const MIN = 60_000;

/** 本游戏在 study-buddy 侧的 appId（会话上报与奖励排除都用它） */
export const SB_APP_ID = 'balance-blocks';
/** study-buddy 的孩子档案 id（单孩子家庭部署固定为 default） */
export const SB_CHILD_ID = 'default';
export const SB_REWARD_PER_SESSION_MS = 5 * MIN;
export const SB_REWARD_CAP_MS = 10 * MIN;
export const SB_MIN_ACCURACY = 0.6;
const PROBE_TIMEOUT_MS = 2500;

/** 最小化 fetch 结构签名：浏览器 fetch 与 Node 单测 mock 都能满足 */
export interface SBResponse {
  ok: boolean;
  json(): Promise<unknown>;
}
export type SBFetch = (
  url: string,
  init?: { signal?: AbortSignal; method?: string; headers?: Record<string, string>; body?: string },
) => Promise<SBResponse>;

const defaultFetch: SBFetch = (url, init) =>
  (fetch as unknown as (u: string, i?: unknown) => Promise<SBResponse>)(url, init);

/** 探测结果缓存：true = 在家模式（study-buddy API 可达） */
let reachable = false;
export function isHomeMode(): boolean {
  return reachable;
}

/** 探测 study-buddy API 是否同源可达（2.5s 超时，失败即纯玩模式） */
export async function probeStudyBuddy(f: SBFetch = defaultFetch): Promise<boolean> {
  const j = await getJson('/api/apps', f);
  reachable = j !== null;
  return reachable;
}

async function getJson(url: string, f: SBFetch, timeoutMs = PROBE_TIMEOUT_MS): Promise<unknown | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    let res: SBResponse;
    try {
      res = await f(url, { signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export interface StudyReward {
  /** 今日应得奖励毫秒数（已按规则封顶） */
  rewardMs: number;
  /** 今日已完成的学习局数（全部学习应用合计） */
  sessions: number;
  /** 当日学习聚合正确率 0–1；null = 今日尚无答题数据 */
  accuracy: number | null;
  /** 计入统计的学习应用 id */
  studyApps: string[];
}

interface AppsJson {
  apps?: Array<{ id?: unknown; status?: unknown }>;
}
interface DailyJson {
  daily?: Array<{
    date?: unknown;
    sessionCount?: unknown;
    totalQuestions?: unknown;
    correctCount?: unknown;
  }>;
}

/**
 * 计算今日学习奖励。返回 null 表示 API 不可达或数据异常（按纯玩处理）。
 * todayKey 格式 YYYY-MM-DD（与服务器 localtime 口径一致，单时区家庭部署够用）。
 */
export async function fetchStudyReward(
  todayKey: string,
  f: SBFetch = defaultFetch,
): Promise<StudyReward | null> {
  const appsJson = (await getJson('/api/apps', f)) as AppsJson | null;
  if (!appsJson || !Array.isArray(appsJson.apps)) return null;
  const studyApps = appsJson.apps
    .filter(
      (a): a is { id: string; status?: unknown } =>
        !!a && typeof a.id === 'string' && a.id !== SB_APP_ID && a.status !== 'draft',
    )
    .map((a) => a.id);
  if (studyApps.length === 0) return null;

  // /api/game/daily 不带 appId 时按天聚合所有应用（无法排除本游戏），
  // 所以逐个学习应用查询再汇总，天然防自反馈
  let sessions = 0;
  let questions = 0;
  let correct = 0;
  for (const id of studyApps) {
    const j = (await getJson(`/api/game/daily?days=1&appId=${encodeURIComponent(id)}`, f)) as DailyJson | null;
    if (!j || !Array.isArray(j.daily)) return null; // 任一学习应用查询失败 → 视为异常，不猜
    const today = j.daily.find((d) => d && d.date === todayKey);
    if (!today) continue;
    sessions += Math.max(0, Math.floor(Number(today.sessionCount) || 0));
    questions += Math.max(0, Number(today.totalQuestions) || 0);
    correct += Math.max(0, Number(today.correctCount) || 0);
  }

  const accuracy = questions > 0 ? correct / questions : null;
  const eligible = accuracy === null || accuracy >= SB_MIN_ACCURACY;
  const rewardMs = eligible
    ? Math.min(SB_REWARD_CAP_MS, sessions * SB_REWARD_PER_SESSION_MS)
    : 0;
  return { rewardMs, sessions, accuracy, studyApps };
}

export interface SessionReport {
  /** 本局时长（毫秒） */
  durationMs: number;
}

/**
 * 上报一局游戏到 study-buddy 家长看板（POST /api/game/session，幂等去重
 * 由服务端 digest 保证）。仅在家模式发送；任何时候都静默失败。
 * 物理游戏没有题数概念：totalQuestions/correctCount 记 1/1（服务端要求
 * totalQuestions > 0），看板以 durationSec 为准。
 */
export function reportGameSession(r: SessionReport, f: SBFetch = defaultFetch): void {
  if (!reachable) return;
  try {
    const now = Date.now();
    const durationSec = Math.max(1, Math.round(r.durationMs / 1000));
    void f('/api/game/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: SB_CHILD_ID,
        appId: SB_APP_ID,
        durationSec,
        totalQuestions: 1,
        correctCount: 1,
        startedAt: now - Math.max(0, Math.round(r.durationMs)),
        endedAt: now,
      }),
    }).catch(() => {
      /* 静默失败：上报只是看板锦上添花 */
    });
  } catch {
    /* 静默失败 */
  }
}
