import { create } from 'zustand';
import { getItem, setItem, listKeys, removeItem, storageAvailable } from '@/lib/storage';
import { playBell } from '@/game/sound';
import { LEVELS, starsFor } from '@/game/levels';
import { creditBonus, REWARD_CAP_MS } from '@/lib/reward';
import { logDiag } from '@/lib/diag';

export const MIN = 60_000;
export const BREAK_EVERY_MS = 20 * MIN;
export const REST_AFTER_MS = 25 * MIN;
export const REST_LEN_MS = 10 * MIN;
export const DAILY_CAP_MS = 120 * MIN;
/** 主动休息奖励：离开（页面不可见）≥10 分钟，连续计时清零（与完成强制休息等效） */
export const BREAK_RESET_MS = 10 * MIN;
/** 每触发一次强制休息，当日总上限扣减 15 分钟（鼓励主动休息，别等被强制） */
export const CAP_CUT_MS = 15 * MIN;
/** 扣减后的当日上限下限（再与非假期基数的一半取小，即上学日保底 15 分钟） */
const CAP_FLOOR_MS = 30 * MIN;
/** 非假期（上学日）每日累计上限：30 分钟 */
export const WEEKDAY_CAP_MS = 30 * MIN;
/**
 * 法定节假日（落在工作日的部分；周末本来就放假）。按国务院办公厅 2026 年
 * 放假安排整理，跨年使用时按需增补下一年日期。
 */
const STATUTORY_HOLIDAYS = new Set([
  // 2026 元旦
  '2026-01-01',
  '2026-01-02',
  // 2026 春节
  '2026-02-16',
  '2026-02-17',
  '2026-02-18',
  '2026-02-19',
  '2026-02-20',
  // 2026 清明
  '2026-04-06',
  // 2026 劳动节
  '2026-05-01',
  '2026-05-04',
  '2026-05-05',
  // 2026 端午
  '2026-06-19',
  // 2026 中秋
  '2026-09-25',
  // 2026 国庆
  '2026-10-01',
  '2026-10-02',
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
]);
/**
 * 寒暑假（按常见校历近似，跨年份通用，格式 MM-DD 闭区间）：
 * 寒假 1/15–2/15（春节长假已含其中），暑假 7/1–8/31。
 * 各地校历略有出入，需要精确时按孩子学校实际放假日期调整这里即可。
 */
const VACATION_RANGES: [string, string][] = [
  ['01-15', '02-15'], // 寒假
  ['07-01', '08-31'], // 暑假
];
/** 假期 = 周末（周六/周日）、法定节假日或寒暑假。dateKey 格式 YYYY-MM-DD（本地时区） */
export function isHolidayKey(dk: string): boolean {
  const dow = new Date(`${dk}T12:00:00`).getDay();
  if (dow === 0 || dow === 6 || STATUTORY_HOLIDAYS.has(dk)) return true;
  const md = dk.slice(5); // MM-DD
  return VACATION_RANGES.some(([a, b]) => md >= a && md <= b);
}
export const dailyCapMs = (cuts: number, holiday: boolean): number => {
  const base = holiday ? DAILY_CAP_MS : WEEKDAY_CAP_MS;
  return Math.max(Math.min(CAP_FLOOR_MS, base / 2), base - cuts * CAP_CUT_MS);
};

export type GamePhase = 'idle' | 'ready' | 'playing' | 'paused' | 'over' | 'clear';
/** level = 闯关; daily = 每日挑战 (seeded by date, records kept); endless = 自由无尽 (practice, no records) */
export type GameMode = 'level' | 'daily' | 'endless';
export type LockReason = 'rest' | 'cap' | null;
const DAY_MS = 24 * 60 * 60 * 1000;
export type StatusTier = 'green' | 'yellow' | 'red';
export type FailReason = 'fall' | 'timeout';

export interface Best {
  score: number;
  meters: number;
}

/* ---------------- level progress (persisted) ---------------- */

export interface LevelRecord {
  stars: number; // 1–3
  score: number;
  ms: number; // fastest clear time
  /** times this level has been cleared — drives the +2-row replay growth */
  clears?: number;
}

export interface Progress {
  /** number of unlocked levels (1-based count; level indexes 0..unlocked-1 playable) */
  unlocked: number;
  rec: Record<number, LevelRecord>;
}

export interface ClearInfo {
  stars: number;
  timeBonus: number;
  timeLeftMs: number;
  allClear: boolean;
  newBestStars: boolean;
  /** remaining blocks auto-converted on a landing clear (+50 pts each) */
  converted: number;
  /** score bonus granted by the conversion */
  convertBonus: number;
  /** true when the clear came from landing on the beam (vs full clear) */
  landed: boolean;
  /** coins earned this round (blocks + checkpoints + star bonus) */
  coinsEarned: number;
}

/** Coins awarded on level clear, by star rating. */
export const STAR_COINS: Record<number, number> = { 1: 20, 2: 30, 3: 50 };

function loadCoins(): number {
  const v = Number(getItem('bb.coins'));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

function loadProgress(): Progress {
  try {
    const raw = getItem('bb.progress');
    if (raw) {
      const p = JSON.parse(raw) as Partial<Progress>;
      // clamp to the real level range — a corrupt/legacy blob must never
      // unlock phantom levels or clamp the selector to a bogus index
      const unlocked = Math.min(
        LEVELS.length,
        Math.max(1, Math.floor(Number(p.unlocked) || 1)),
      );
      // validate every per-level record defensively (stars 0–3, numeric fields)
      const rec: Record<number, LevelRecord> = {};
      if (p.rec && typeof p.rec === 'object') {
        for (const [k, v] of Object.entries(p.rec)) {
          const idx = Number(k);
          if (!Number.isInteger(idx) || idx < 0 || idx >= LEVELS.length) continue;
          if (!v || typeof v !== 'object') continue;
          const r = v as Partial<LevelRecord>;
          rec[idx] = {
            stars: Math.max(0, Math.min(3, Math.floor(Number(r.stars) || 0))),
            score: Math.max(0, Math.floor(Number(r.score) || 0)),
            ms: Math.max(0, Number(r.ms) || 0),
            clears: Math.max(0, Math.floor(Number(r.clears) || 0)),
          };
        }
      }
      return { unlocked, rec };
    }
  } catch {
    /* ignore */
  }
  return { unlocked: 1, rec: {} };
}

function saveProgress(p: Progress): void {
  setItem('bb.progress', JSON.stringify(p));
}

export interface DayEntry {
  date: string; // YYYY-MM-DD
  ms: number;
}

export function dateKeyOf(t: number): string {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function loadBest(): Best {
  try {
    const raw = getItem('bb.best');
    if (raw) {
      const p = JSON.parse(raw) as Partial<Best>;
      return { score: Number(p.score) || 0, meters: Number(p.meters) || 0 };
    }
  } catch {
    /* ignore */
  }
  return { score: 0, meters: 0 };
}

/* ---------------- daily challenge (persisted) ---------------- */

export interface DailyState {
  /** today's date key this `todayBest` belongs to ("" = not played today) */
  todayDate: string;
  /** best depth today (meters, daily-challenge runs only) */
  todayBest: number;
  /** all-time best daily-challenge depth (meters) */
  histBest: number;
  /** consecutive participation days */
  streak: number;
  /** last date a daily run finished (drives the streak) */
  lastPlayed: string;
}

export function loadDaily(): DailyState {
  const num = (k: string): number => {
    const v = Number(getItem(k));
    return Number.isFinite(v) && v > 0 ? v : 0;
  };
  const today = getItem('bb.daily.today');
  let todayDate = '';
  let todayBest = 0;
  try {
    if (today) {
      const p = JSON.parse(today) as Partial<{ date: string; best: number }>;
      if (typeof p.date === 'string') todayDate = p.date;
      todayBest = Number(p.best) || 0;
    }
  } catch {
    /* ignore */
  }
  return {
    todayDate,
    todayBest,
    histBest: num('bb.daily.hist'),
    streak: Math.floor(num('bb.daily.streak')),
    lastPlayed: getItem('bb.daily.last') ?? '',
  };
}

/** Result panel data for a finished endless/daily run. */
export interface EndlessResult {
  depth: number; // meters this run
  removed: number;
  maxCombo: number;
  coins: number;
  daily: boolean;
  todayBest: number;
  histBest: number;
  streak: number;
  newTodayBest: boolean;
  newHistBest: boolean;
}

function loadDayMs(date: string): number {
  const v = Number(getItem(`bb.day.${date}`));
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function loadRounds(date: string): number {
  const v = Number(getItem(`bb.rounds.${date}`));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

/** Last 7 calendar days (oldest → today). */
function buildWeek(): DayEntry[] {
  const out: DayEntry[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = dateKeyOf(d.getTime());
    out.push({ date: key, ms: loadDayMs(key) });
  }
  return out;
}

function pruneOldDays(): void {
  const keep = new Set(buildWeek().map((e) => `bb.day.${e.date}`));
  for (const k of listKeys('bb.day.')) {
    if (!keep.has(k)) removeItem(k);
  }
}

export function statusTierOf(todayMs: number, lock: LockReason, capMs: number): StatusTier {
  if (lock !== null || todayMs >= capMs * 0.9) return 'red';
  if (todayMs >= capMs * 0.5) return 'yellow';
  return 'green';
}

export const STATUS_LABEL: Record<StatusTier, string> = {
  green: '状态良好',
  yellow: '注意休息',
  red: '疲劳·该休息了',
};

interface StoreState {
  // ---- anti-addiction ----
  curDate: string;
  todayMs: number;
  streakMs: number;
  sessionMs: number;
  restUntil: number;
  lock: LockReason;
  restDone: boolean; // rest countdown finished, waiting for user to dismiss
  breakToastMin: number | null;
  lastBreakMin: number;
  week: DayEntry[];
  roundsToday: number;
  nowMs: number;
  lastTick: number;
  capCuts: number; // 今日强制休息触发次数（每次当日上限 -15 分钟）
  lastVisibleAt: number; // 最近一次页面可见的时间（主动休息判定）
  rewardMs: number; // 今日学习奖励时长（本机入账，学习类游戏通关获得；只放宽每日上限）
  storageOk: boolean;

  // ---- settings ----
  soundOn: boolean;

  // ---- records ----
  best: Best;
  isNewBest: boolean;

  // ---- coins ----
  coins: number; // lifetime total (persisted)
  roundCoins: number; // earned so far in the live round
  lastCoinsEarned: number; // total earned in the last finished round (incl. star bonus)

  // ---- levels ----
  levelIdx: number;
  progress: Progress;
  failReason: FailReason | null;
  lastClear: ClearInfo | null;

  // ---- endless / daily challenge ----
  mode: GameMode;
  /** lives left in the live endless round (ENDLESS_LIVES at start) */
  lives: number;
  daily: DailyState;
  lastEndless: EndlessResult | null;

  // ---- round / game ----
  phase: GamePhase;
  score: number;
  meters: number;
  removed: number;
  /** blocks auto-converted so far during a landing-clear celebration */
  converted: number;
  totalBlocks: number;
  combo: number;
  maxCombo: number;
  roundMs: number;
  /** effective time limit for the live round (base + replay-growth rows) */
  limitMs: number;
  /** hero descent progress 0 (tower top) → 1 (beam) */
  heroProgress: number;
  /** checkpoint bonus seconds accrued this round (ms) */
  bonusMs: number;

  // ---- actions ----
  tick: () => void;
  /** 学习类游戏通关后入账奖励时长（本机，日封顶 REWARD_CAP_MS）。
   *  返回实际入账毫秒数（今日已封顶时为 0），供结算界面如实展示。 */
  addStudyBonus: (deltaMs: number) => number;
  dismissBreakToast: () => void;
  closeRest: () => void;
  toggleSound: () => void;
  setPhase: (p: GamePhase) => void;
  selectLevel: (idx: number) => void;
  startRound: (totalBlocks: number, levelIdx?: number, limitMs?: number) => void;
  /** enter an endless round: mode 'daily' (seeded by date, records kept) or 'endless' (practice) */
  startEndless: (mode: 'daily' | 'endless', lives: number) => void;
  liveUpdate: (u: {
    score: number;
    meters: number;
    removed: number;
    converted: number;
    combo: number;
    maxCombo: number;
    roundMs: number;
    coins: number;
    progress: number;
    bonusMs: number;
    lives: number;
  }) => void;
  endRound: (u: {
    outcome: 'clear' | 'fall' | 'timeout';
    score: number;
    meters: number;
    removed: number;
    converted: number;
    convertBonus: number;
    landed: boolean;
    maxCombo: number;
    roundMs: number;
    timeLeftMs: number;
    timeBonus: number;
    coins: number;
  }) => void;
}

const now0 = Date.now();
const today0 = dateKeyOf(now0);
pruneOldDays();

// restore forced rest across refresh
let restUntil0 = Number(getItem('bb.restUntil')) || 0;
let lock0: LockReason = null;
let streak0 = Number(getItem('bb.streakMs')) || 0;
const capCuts0 = Number(getItem(`bb.capcuts.${today0}`)) || 0;
// returning from a voluntary break of ≥10 min (page closed/hidden) resets the
// streak — a self-initiated rest counts the same as the forced one
const lastVisible0 = Number(getItem('bb.lastVisibleAt')) || now0;
if (now0 - lastVisible0 >= BREAK_RESET_MS) streak0 = 0;
if (restUntil0 > now0) {
  lock0 = 'rest';
} else if (restUntil0 > 0) {
  // rest already finished while page was closed
  restUntil0 = 0;
  streak0 = 0;
  setItem('bb.restUntil', '0');
  setItem('bb.streakMs', '0');
}
const todayMs0 = loadDayMs(today0);
const reward0 = Math.max(0, Number(getItem(`bb.reward.${today0}`)) || 0);
if (todayMs0 >= dailyCapMs(capCuts0, isHolidayKey(today0)) + reward0) lock0 = 'cap';

export const useStore = create<StoreState>((set, get) => ({
  curDate: today0,
  todayMs: todayMs0,
  streakMs: streak0,
  sessionMs: 0,
  restUntil: restUntil0,
  lock: lock0,
  restDone: false,
  breakToastMin: null,
  lastBreakMin: -1,
  week: buildWeek(),
  roundsToday: loadRounds(today0),
  nowMs: now0,
  lastTick: now0,
  capCuts: capCuts0,
  lastVisibleAt: now0,
  rewardMs: reward0,
  storageOk: storageAvailable,

  soundOn: getItem('bb.sound') !== 'off',

  best: loadBest(),
  isNewBest: false,

  coins: loadCoins(),
  roundCoins: 0,
  lastCoinsEarned: 0,

  levelIdx: Math.min(loadProgress().unlocked - 1, LEVELS.length - 1),
  progress: loadProgress(),
  failReason: null,
  lastClear: null,

  mode: 'level',
  lives: 3,
  daily: loadDaily(),
  lastEndless: null,

  phase: 'idle',
  score: 0,
  meters: 0,
  removed: 0,
  converted: 0,
  totalBlocks: 0,
  combo: 0,
  maxCombo: 0,
  roundMs: 0,
  limitMs: LEVELS[0].timeSec * 1000,
  heroProgress: 0,
  bonusMs: 0,

  tick: () => {
    const s = get();
    const now = Date.now();
    const dk = dateKeyOf(now);

    let { todayMs, streakMs, sessionMs, restUntil, lock, week, curDate, roundsToday } = s;
    let { restDone, breakToastMin, lastBreakMin, capCuts, rewardMs } = s;
    let lastVisibleAt = s.lastVisibleAt;

    // --- date rollover ---
    if (dk !== curDate) {
      curDate = dk;
      todayMs = 0;
      streakMs = 0;
      roundsToday = 0;
      lastBreakMin = -1;
      capCuts = 0;
      rewardMs = 0; // 学习奖励按日重算（本机入账，跨天清零）
      if (lock === 'cap') lock = null;
      if (lock === 'rest' && restUntil <= now) {
        lock = null;
        restUntil = 0;
        restDone = false;
      }
      pruneOldDays();
      week = buildWeek();
    }

    // --- accrual (visible only, wall-clock delta clamped) ---
    const delta = Math.min(Math.max(now - s.lastTick, 0), 10_000);
    const visible = typeof document === 'undefined' || document.visibilityState === 'visible';
    // 主动休息奖励：连续离开 ≥10 分钟（页面不可见），连续游玩计时清零——
    // 孩子自己放下设备休息，和完成强制休息等效，且不扣当日上限
    if (now - lastVisibleAt >= BREAK_RESET_MS) streakMs = 0;
    if (visible) {
      lastVisibleAt = now;
      todayMs += delta;
      streakMs += delta;
      sessionMs += delta;
    }

    // --- forced rest end ---
    if (lock === 'rest' && restUntil > 0 && now >= restUntil) {
      restUntil = 0;
      streakMs = 0;
      restDone = true;
      playBell();
    }

    // --- thresholds ---
    if (lock === null) {
      // 有效上限 = 基础上限（假期/上学日 × 强制休息扣减）+ 学习奖励
      if (todayMs >= dailyCapMs(capCuts, isHolidayKey(dk)) + rewardMs) {
        lock = 'cap';
        breakToastMin = null;
        logDiag('lock', 'cap（今日上限）');
      } else if (streakMs >= REST_AFTER_MS) {
        lock = 'rest';
        restUntil = now + REST_LEN_MS;
        restDone = false;
        breakToastMin = null;
        logDiag('lock', 'rest（连续25分钟强制休息）');
        // 被系统强制休息一次 → 当日总上限 -15 分钟（主动休息不受罚）
        capCuts += 1;
        setItem(`bb.capcuts.${dk}`, String(capCuts));
        playBell();
      } else {
        const m = Math.floor(todayMs / MIN);
        if (m > 0 && m % 20 === 0 && m !== lastBreakMin) {
          breakToastMin = m;
          lastBreakMin = m;
        }
      }
    }

    // --- persist (cheap, once per second) ---
    setItem(`bb.day.${dk}`, String(Math.floor(todayMs)));
    setItem('bb.streakMs', String(Math.floor(streakMs)));
    setItem('bb.restUntil', String(restUntil));
    setItem('bb.lastVisibleAt', String(lastVisibleAt));

    // --- week chart update on minute boundary or rollover ---
    const minuteIdx = Math.floor(todayMs / MIN);
    if (minuteIdx !== Math.floor(s.todayMs / MIN) || dk !== s.curDate) {
      week = buildWeek();
      const t = week[week.length - 1];
      if (t) t.ms = todayMs;
    }

    set({
      curDate,
      todayMs,
      streakMs,
      sessionMs,
      restUntil,
      lock,
      restDone,
      breakToastMin,
      lastBreakMin,
      week,
      roundsToday,
      capCuts,
      rewardMs,
      lastVisibleAt,
      nowMs: now,
      lastTick: now,
    });
  },

  addStudyBonus: (deltaMs) => {
    const s = get();
    const { totalMs, creditedMs } = creditBonus(s.rewardMs, deltaMs, REWARD_CAP_MS);
    if (creditedMs <= 0) return 0;
    setItem(`bb.reward.${s.curDate}`, String(totalMs));
    // 奖励提高有效上限后，可能把"今日上限已用完"的孩子解锁回来
    const unlock =
      s.lock === 'cap' && s.todayMs < dailyCapMs(s.capCuts, isHolidayKey(s.curDate)) + totalMs;
    logDiag('reward', `学习奖励入账 +${Math.round(creditedMs / 1000)}s（今日累计 ${Math.round(totalMs / 60000)}min）`);
    set({ rewardMs: totalMs, ...(unlock ? { lock: null } : {}) });
    return creditedMs;
  },

  dismissBreakToast: () => set({ breakToastMin: null }),

  closeRest: () => set({ lock: null, restDone: false, streakMs: 0 }),

  toggleSound: () => {
    const next = !get().soundOn;
    setItem('bb.sound', next ? 'on' : 'off');
    set({ soundOn: next });
  },

  setPhase: (p) => set({ phase: p }),

  selectLevel: (idx) => {
    const s = get();
    const clamped = Math.max(0, Math.min(idx, s.progress.unlocked - 1, LEVELS.length - 1));
    // picking a level (menu / level grid) returns to campaign mode
    set({ levelIdx: clamped, mode: 'level' });
  },

  startRound: (totalBlocks, levelIdx, limitMs) =>
    set({
      phase: 'ready',
      mode: 'level',
      score: 0,
      meters: 0,
      removed: 0,
      converted: 0,
      totalBlocks,
      combo: 0,
      maxCombo: 0,
      roundMs: 0,
      heroProgress: 0,
      bonusMs: 0,
      roundCoins: 0,
      isNewBest: false,
      failReason: null,
      lastClear: null,
      lastEndless: null,
      ...(levelIdx !== undefined ? { levelIdx } : {}),
      ...(limitMs !== undefined ? { limitMs } : {}),
    }),

  startEndless: (mode, lives) =>
    set({
      phase: 'ready',
      mode,
      lives,
      score: 0,
      meters: 0,
      removed: 0,
      converted: 0,
      totalBlocks: 0, // endless: unbounded; the HUD shows 已消除 instead
      combo: 0,
      maxCombo: 0,
      roundMs: 0,
      heroProgress: 0,
      bonusMs: 0,
      roundCoins: 0,
      isNewBest: false,
      failReason: null,
      lastClear: null,
      lastEndless: null,
    }),

  liveUpdate: (u) => {
    const s = get();
    let { best, isNewBest } = s;
    // campaign records only — endless scores are depth-driven and would
    // dwarf the level-mode 历史最佳
    if (s.mode === 'level' && u.score > best.score) {
      best = { score: u.score, meters: Math.max(best.meters, u.meters) };
      isNewBest = true;
      setItem('bb.best', JSON.stringify(best));
    }
    set({
      score: u.score,
      meters: u.meters,
      removed: u.removed,
      converted: u.converted,
      combo: u.combo,
      maxCombo: u.maxCombo,
      roundMs: u.roundMs,
      roundCoins: u.coins,
      heroProgress: u.progress,
      bonusMs: u.bonusMs,
      lives: u.lives,
      best,
      isNewBest,
    });
  },

  endRound: (u) => {
    const s = get();
    logDiag(
      'end',
      `${s.mode} ${u.outcome} score=${u.score} depth=${Math.round(u.meters * 10) / 10}m roundMs=${Math.round(u.roundMs / 1000)}s`,
    );

    // ---- endless / daily challenge: score = depth; no stars/unlocks ----
    if (s.mode !== 'level') {
      const depth = Math.round(u.meters * 10) / 10;
      const d = { ...s.daily };
      let newTodayBest = false;
      let newHistBest = false;
      if (s.mode === 'daily') {
        const today = dateKeyOf(Date.now());
        if (d.todayDate !== today) {
          d.todayDate = today;
          d.todayBest = 0;
        }
        if (depth > d.todayBest) {
          d.todayBest = depth;
          newTodayBest = true;
        }
        if (depth > d.histBest) {
          d.histBest = depth;
          newHistBest = true;
        }
        // participation streak: first finished daily run of the day advances it
        if (d.lastPlayed !== today) {
          d.streak = d.lastPlayed === dateKeyOf(Date.now() - DAY_MS) ? d.streak + 1 : 1;
          d.lastPlayed = today;
        }
        setItem('bb.daily.today', JSON.stringify({ date: d.todayDate, best: d.todayBest }));
        setItem('bb.daily.hist', String(d.histBest));
        setItem('bb.daily.streak', String(d.streak));
        setItem('bb.daily.last', d.lastPlayed);
      }
      set({
        phase: 'over',
        failReason: 'fall',
        score: Math.floor(u.meters * 10),
        meters: u.meters,
        coins: s.coins + u.coins, // blocks +1 / checkpoints +5, earned along the way
        roundMs: u.roundMs,
        roundCoins: u.coins,
        maxCombo: u.maxCombo,
        daily: d,
        lastEndless: {
          depth,
          removed: u.removed,
          maxCombo: u.maxCombo,
          coins: u.coins,
          daily: s.mode === 'daily',
          todayBest: d.todayBest,
          histBest: d.histBest,
          streak: d.streak,
          newTodayBest,
          newHistBest,
        },
      });
      return;
    }

    let { best } = s;
    const isNewBest = u.score > best.score || s.isNewBest;
    if (u.score > best.score || u.meters > best.meters) {
      best = { score: Math.max(best.score, u.score), meters: Math.max(best.meters, u.meters) };
      setItem('bb.best', JSON.stringify(best));
    }
    const rounds = s.roundsToday + 1;
    setItem(`bb.rounds.${s.curDate}`, String(rounds));

    let { progress, lastClear, failReason } = s;
    let phase: GamePhase = 'over';
    let coinsEarned = u.coins; // blocks +1 / checkpoints +5, earned either way
    if (u.outcome === 'clear') {
      phase = 'clear';
      failReason = null;
      const limitMs = s.limitMs > 0 ? s.limitMs : LEVELS[s.levelIdx].timeSec * 1000;
      const stars = starsFor(u.timeLeftMs, limitMs);
      coinsEarned += STAR_COINS[stars] ?? 20; // star bonus: ★20 / ★★30 / ★★★50
      const prev = s.progress.rec[s.levelIdx];
      const newBestStars = !prev || stars > prev.stars;
      const rec = {
        ...s.progress.rec,
        [s.levelIdx]: {
          stars: Math.max(prev?.stars ?? 0, stars),
          score: Math.max(prev?.score ?? 0, u.score),
          ms: prev ? Math.min(prev.ms, u.roundMs) : u.roundMs,
          clears: (prev?.clears ?? 0) + 1, // replay growth: tower +2 rows next time
        },
      };
      const unlocked = Math.min(Math.max(s.progress.unlocked, s.levelIdx + 2), LEVELS.length);
      progress = { unlocked, rec };
      saveProgress(progress);
      lastClear = {
        stars,
        timeBonus: u.timeBonus,
        timeLeftMs: u.timeLeftMs,
        allClear: s.levelIdx >= LEVELS.length - 1,
        newBestStars,
        converted: u.converted,
        convertBonus: u.convertBonus,
        landed: u.landed,
        coinsEarned,
      };
    } else {
      failReason = u.outcome;
      lastClear = null;
    }

    const coins = s.coins + coinsEarned;
    setItem('bb.coins', String(coins));

    set({
      phase,
      failReason,
      lastClear,
      progress,
      score: u.score,
      meters: u.meters,
      removed: u.removed,
      converted: u.converted,
      maxCombo: u.maxCombo,
      roundMs: u.roundMs,
      combo: 0,
      best,
      isNewBest,
      roundsToday: rounds,
      coins,
      roundCoins: u.coins,
      lastCoinsEarned: coinsEarned,
    });
  },
}));

/** mm:ss or hh:mm:ss formatting for timers */
export function fmtMs(ms: number, forceH = false): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  if (h > 0 || forceH) return `${String(h).padStart(2, '0')}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

export function fmtMinutes(ms: number): number {
  return Math.floor(ms / MIN);
}

/** 当日实际上限（假期/非假期基数 + 强制休息扣减 + 学习奖励）与"今天是否假期" */
export function useDailyCap(): {
  capMs: number;
  holiday: boolean;
  rewardMs: number;
  rewardCapMs: number;
} {
  const capCuts = useStore((s) => s.capCuts);
  const curDate = useStore((s) => s.curDate);
  const rewardMs = useStore((s) => s.rewardMs);
  const holiday = isHolidayKey(curDate);
  return { capMs: dailyCapMs(capCuts, holiday) + rewardMs, holiday, rewardMs, rewardCapMs: REWARD_CAP_MS };
}
