// src/game/studyBuddy.ts
// =====================================================================
// study-buddy 融合层（在家模式）
//
// 同一个构建产物跑两种环境：
//   在家 — 由 study-buddy 的 Express 托管在 /games/balance-blocks/，
//          /api/* 同源可达 → 开启"学习换时长"奖励 + 游玩会话上报
//   在外 — 静态托管（无 study-buddy API），所有调用静默失败 → 纯玩模式
//
// 开关（构建期环境变量，Vite 只暴露 VITE_ 前缀）：
//   VITE_STUDY_BUDDY_ENABLED=false → 彻底关闭融合层：不探测、不请求，
//     也不会在每次加载时白等 2.5s 超时。用于纯静态部署。
//   不设 / true（默认）→ 运行时探测，维持在家的现有行为。
//   npm run build:static 即以 false 构建。
//
// 奖励规则（家长拍板 2026-08-27，定位：学习辅助手段而非主渠道）：
//   - 每完成 1 局学习游戏 +5 分钟游戏时长
//   - 当日学习聚合正确率 <60% 不发奖（防止乱点刷时长）
//   - 奖励池每日封顶 +10 分钟（一天练一两套即达标，超出只记打卡）
//   - 奖励只放宽"每日总上限"，不免除 25 分钟连续强制休息（眼睛是底线）
//   - 排除本游戏自身的会话，防止"玩→记会话→换更多时长"自反馈
// =====================================================================

const MIN = 60_000;

/**
 * 融合层开关。抽出成纯函数以便单测（env 由调用方传入，浏览器侧传
 * import.meta.env）。未设置时视为启用，保持既有行为不变。
 */
export function isFusionEnabled(env: Record<string, unknown> = {}): boolean {
  const v = env.VITE_STUDY_BUDDY_ENABLED;
  if (v === undefined || v === null || v === '') return true;
  return !['false', '0', 'off', 'no'].includes(String(v).trim().toLowerCase());
}

/**
 * 浏览器侧实际生效的开关。
 *
 * 不直接读 import.meta —— verify 脚本以 CommonJS 编译运行，那里 import.meta
 * 非法（TS1343）。改为从 globalThis 上的注入点取值，vite.config.ts 用
 * `define` 把构建期 env 写进去。Node 单测下该点不存在 → 默认开启。
 */
declare const __STUDY_BUDDY_ENABLED__: string | undefined;
declare const __SB_REWARD_CAP_MIN__: string | undefined;

export const FUSION_ENABLED = ((): boolean => {
  try {
    if (typeof __STUDY_BUDDY_ENABLED__ !== 'undefined') {
      return isFusionEnabled({ VITE_STUDY_BUDDY_ENABLED: __STUDY_BUDDY_ENABLED__ });
    }
  } catch {
    /* 未注入（Node 单测）→ 按默认开启 */
  }
  return true;
})();

/** 本游戏在 study-buddy 侧的 appId（会话上报与奖励排除都用它） */
export const SB_APP_ID = 'balance-blocks';
/** study-buddy 的孩子档案 id（单孩子家庭部署固定为 default） */
export const SB_CHILD_ID = 'default';
export const SB_REWARD_PER_SESSION_MS = 5 * MIN;

/** 默认日封顶 10 分钟；可用 VITE_SB_REWARD_CAP_MIN 覆盖（家长可调到 15） */
export const SB_REWARD_CAP_DEFAULT_MIN = 10;

/**
 * 日封顶分钟数。抽出成纯函数便于单测；env 形如 { VITE_SB_REWARD_CAP_MIN: '15' }。
 * 取值非法（≤0 / 非数字）时回落到默认 10，不静默产生 0 上限把奖励全掐死。
 */
export function resolveRewardCapMs(env: Record<string, unknown> = {}): number {
  const raw = env.VITE_SB_REWARD_CAP_MIN;
  if (raw === undefined || raw === null || raw === '') return SB_REWARD_CAP_DEFAULT_MIN * MIN;
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return SB_REWARD_CAP_DEFAULT_MIN * MIN;
  return Math.round(n * MIN);
}
/** 日封顶毫秒数，同样经 define 注入（Node 单测下不存在 → 取默认 10 分钟） */
export const SB_REWARD_CAP_MS = ((): number => {
  try {
    if (typeof __STUDY_BUDDY_ENABLED__ !== 'undefined' || typeof __SB_REWARD_CAP_MIN__ !== 'undefined') {
      return resolveRewardCapMs({
        VITE_SB_REWARD_CAP_MIN: typeof __SB_REWARD_CAP_MIN__ === 'undefined' ? '' : __SB_REWARD_CAP_MIN__,
      });
    }
  } catch {
    /* 未注入 → 默认值 */
  }
  return resolveRewardCapMs();
})();

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

/** 探测 study-buddy API 是否同源可达（2.5s 超时，失败即纯玩模式）。
 *  融合层被环境变量关闭时直接返回 false，一个请求都不发。 */
export async function probeStudyBuddy(f: SBFetch = defaultFetch): Promise<boolean> {
  if (!FUSION_ENABLED) {
    reachable = false;
    return false;
  }
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
  if (!FUSION_ENABLED) return null;
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

export interface StudySessionReport {
  /** study-buddy apps registry 里的 id（如 "multiplication-drill"） */
  appId: string;
  durationMs: number;
  totalQuestions: number;
  correctCount: number;
}

/**
 * 上报一局**学习类**游戏的会话（乘法大冒险等），POST /api/game/session。
 *
 * 为什么需要单独一个函数：fetchStudyReward() 遍历 /api/apps 拿到全部
 * 学习 app，逐个查 /api/game/daily?appId=<id> 累加局数与正确率。
 * study-buddy 侧已把 "multiplication-drill" 登记为 ready，play-buddy
 * 的 fetchStudyReward 也会去查它 —— 但若迁入 play-buddy 的这局不回传，
 * 该 appId 的日统计恒为 0，这个学习源就等于从奖励池里消失了。
 * （同类问题也影响 candy-math-island：它迁入后没有回传。）
 *
 * 与 reportGameSession 的区别只在 appId 和题数口径：物理游戏没有题数
 * 概念记 1/1；学习游戏如实上报 totalQuestions / correctCount，
 * 正确率要参与"正确率 <60% 不发奖"的判定，填 1/1 会虚高。
 *
 * 仅在家模式发送，任何时候静默失败。
 */
export function reportStudySession(r: StudySessionReport, f: SBFetch = defaultFetch): void {
  if (!reachable) return;
  if (!r.appId || r.appId === SB_APP_ID) return; // 防自反馈，与奖励排除口径一致
  try {
    const now = Date.now();
    const durationSec = Math.max(1, Math.round(r.durationMs / 1000));
    const totalQuestions = Math.max(1, Math.floor(r.totalQuestions));
    const correctCount = Math.min(
      totalQuestions,
      Math.max(0, Math.floor(r.correctCount)),
    );
    void f('/api/game/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: SB_CHILD_ID,
        appId: r.appId,
        durationSec,
        totalQuestions,
        correctCount,
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

export interface StudyMistakeReport {
  appId: string;
  problem: string;
  userAnswer: string;
  correctAnswer: string;
  errorType: string;
}

/**
 * 上报一道错题到共享错题账本，POST /api/game/mistake。
 * 乘法大冒险的错因分类固定为 "multiply"，与 study-buddy 服务端约定一致。
 * 同样只在在家模式发送、静默失败。
 */
export function reportStudyMistake(r: StudyMistakeReport, f: SBFetch = defaultFetch): void {
  if (!reachable) return;
  if (!r.appId || r.appId === SB_APP_ID) return;
  try {
    void f('/api/game/mistake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId: SB_CHILD_ID,
        appId: r.appId,
        problem: r.problem,
        userAnswer: r.userAnswer,
        correctAnswer: r.correctAnswer,
        errorType: r.errorType,
        source: r.appId,
      }),
    }).catch(() => {
      /* 静默失败 */
    });
  } catch {
    /* 静默失败 */
  }
}
