/**
 * 弹珠轨道（Marble Track）— 关卡定义 + 确定性生成器。
 *
 * 玩法：每个关卡有一条从发射口到杯子的"隐形路线"，路线上的每块轨道板
 * （ramp）都可以点击循环切换角度。玩家把每块板调到正确的坡度后点击
 * 「放珠」，弹珠沿轨道滚落、之字形下行，最终落入杯子即过关。
 *
 * 纯模块（无 DOM / 无 matter-js），同时被游戏 UI 与
 * scripts/verify-marble.ts 无头验证脚本共用。
 *
 * 结构可靠性（verify-marble 逐关物理模拟背书）：
 *  - 每个衔接处有固定的「接球槽」（微倾 6° 的短平台），弹珠离开上一块板后
 *    必然落在槽内并滚上下一块板，水平方向无缺口；
 *  - 接球挡板只做防过冲保险，远离口袋；
 *  - 杯底明显高于地板，杜绝"掉地板上滚进杯"的假通关。
 *
 * 难度来自结构而非噪声：板数 3 → 8、倾角更陡、杯口更窄、
 * 冰面（低摩擦）/ 弹板（高回弹）/ 弹力桩逐档引入。
 */

/* ---------------- seeded rng ---------------- */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- constants ---------------- */

/** 逻辑画布宽（竖屏） */
export const BOARD_W = 420;
/** 逻辑画布高 */
export const BOARD_H = 840;
/** 弹珠半径 */
export const MARBLE_R = 11;
/** 轨道板厚度 */
export const RAMP_THICK = 12;

/* ---------------- types ---------------- */

export type RampKind = 'normal' | 'ice' | 'bounce';

export interface RampSpec {
  /** 0-based，从上到下 */
  idx: number;
  /** 枢轴中心 */
  cx: number;
  cy: number;
  /** 板长（沿坡向） */
  len: number;
  thick: number;
  kind: RampKind;
  /** 可选角度（度，屏幕坐标：正值 = 左高右低），含且仅含一个正解 */
  options: number[];
  /** options 中正解的下标 */
  solution: number;
  /** 初始角度下标（≠ solution，保证开局需要操作） */
  initial: number;
  /** 从初始调到正解的最少点击次数（循环步进） */
  parMoves: number;
}

export interface WallSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number;
}

export interface PegSpec {
  x: number;
  y: number;
  r: number;
  kind: 'peg' | 'bumper';
}

export interface MarbleLevel {
  /** 1-based 关卡号 */
  id: number;
  name: string;
  hint: string;
  tier: number;
  /** 弹珠出生点与初速度 */
  spawn: { x: number; y: number; vx: number; vy: number };
  /** 杯子判定圈（圆心 + 半径） */
  goal: { x: number; y: number; r: number };
  cupWalls: WallSpec[];
  /**
   * 接球漏斗：每个衔接处两根斜杠组成 V 形漏斗（底部留 26px 漏口），
   * 飞来的弹珠撞斜壁滑到漏口，垂直落到下一块板的高端 ——
   * 无墙角陷阱、容差大，儿童友好。
   */
  catchWalls: WallSpec[];
  /** 场地固定墙（边墙/地板） */
  walls: WallSpec[];
  ramps: RampSpec[];
  pegs: PegSpec[];
  /** 三星基准：全关卡最少点击总数 */
  par: number;
  timeLimitSec: number;
}

/* ---------------- difficulty curve ---------------- */

interface TierSpec {
  ramps: [number, number];
  angle: [number, number];
  span: [number, number];
  gapFall: [number, number];
  options: number;
  ice: number;
  bounce: number;
  bumpers: number;
  cupR: number;
}

/** 按关卡号取难度参数（1..40 线性插值） */
function tierSpec(id: number): TierSpec {
  const t = (id - 1) / 39; // 0..1
  const lerp = (a: number, b: number) => a + (b - a) * t;
  return {
    ramps: [Math.round(lerp(3, 6)), Math.round(lerp(4, 6))],
    angle: [lerp(17, 21), lerp(23, 31)],
    span: [lerp(190, 170), lerp(280, 250)],
    gapFall: [26, lerp(30, 34)],
    options: id <= 12 ? 3 : 4,
    ice: id >= 9 ? Math.min(3, Math.floor((id - 5) / 8)) : 0,
    bounce: id >= 17 ? Math.min(3, Math.floor((id - 13) / 9)) : 0,
    bumpers: id >= 25 ? Math.min(3, Math.floor((id - 21) / 7)) : 0,
    cupR: lerp(34, 26),
  };
}

const TIER_NAMES = ['新手坡道', '进阶滑道', '冰面飞驰', '弹跳乐园', '大师轨道', '宗师天梯'];
const HINTS: Record<number, string> = {
  1: '点一点轨道板切换角度，让弹珠一路滚进杯子！',
  9: '蓝色是冰面轨道，弹珠会滑得飞快！',
  17: '粉色弹板会把弹珠弹出去，注意方向！',
  25: '小心弹力桩，别让弹珠被弹飞！',
  33: '宗师关卡：每一步都要算准落点。',
};

function tierOf(id: number): number {
  if (id <= 8) return 0;
  if (id <= 16) return 1;
  if (id <= 24) return 2;
  if (id <= 32) return 3;
  if (id <= 36) return 4;
  return 5;
}

/* ---------------- generator ---------------- */

const DEG = Math.PI / 180;

/** 种子盐：个别关卡如物理验证不稳定，可在此微调（改盐重 roll 布局，结构参数不变） */
const SALTS: Record<number, number> = {};

const TOP_Y = 76;
/** 底部预留：杯底明显高于地板（防假通关） */
const BOTTOM_RESERVE = 72;

export function getMarbleLevel(id: number): MarbleLevel {
  if (id < 1 || id > MARBLE_LEVEL_COUNT) throw new RangeError(`no marble level ${id}`);
  const spec = tierSpec(id);
  const rnd = mulberry32((0x9e3779b9 ^ Math.imul(id, 2654435761) ^ (SALTS[id] ?? 0)) >>> 0);
  const pick = (a: number, b: number) => a + rnd() * (b - a);
  const pickInt = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

  const rampCount = pickInt(spec.ramps[0], spec.ramps[1]);
  const tier = tierOf(id);

  /* ---- 之字形路线 ---- */
  const margin = 52;
  const d0 = rnd() < 0.5 ? 1 : -1;
  const startX = d0 === 1 ? margin + pick(0, 24) : BOARD_W - margin - pick(0, 24);

  interface Raw {
    dir: number;
    slopeDeg: number;
    span: number;
    gapFall: number;
    flight: number;
  }
  const raw: Raw[] = [];
  let x = startX;
  for (let i = 0; i < rampCount; i++) {
    const dir = i % 2 === 0 ? d0 : -d0;
    const slopeDeg = pick(spec.angle[0], spec.angle[1]);
    // 低端之后还要容纳漏斗（13+flight+远杠75），预留 140px
    const limit = dir === 1 ? BOARD_W - 140 : 140;
    const maxSpan = dir === 1 ? limit - x : x - limit;
    const span = Math.max(80, Math.min(pick(spec.span[0], spec.span[1]), maxSpan));
    raw.push({
      dir,
      slopeDeg,
      span,
      gapFall: i < rampCount - 1 ? pick(spec.gapFall[0], spec.gapFall[1]) : pick(44, 58),
      flight: pick(30, 48),
    });
    x += dir * (span + 13 + raw[i].flight);
    x = Math.max(95, Math.min(BOARD_W - 95, x));
  }

  // 纵向预算：Σ(坡降) + Σ(段间落差) ≤ BOARD_H - 顶 - 底。
  // 超支时按 s 压缩水平跨度（坡降 ∝ 跨度），段间落差不压缩，保证走廊高度。
  const sumDrop = raw.reduce((a, s) => a + s.span * Math.tan(s.slopeDeg * DEG), 0);
  // 每个衔接：漏口下落 + 漏口→下一段高端 40px；末段为落杯距离
  const sumGap = raw.reduce((a, s, i) => a + s.gapFall + (i < raw.length - 1 ? 40 : 0), 0);
  const avail = BOARD_H - TOP_Y - BOTTOM_RESERVE;
  const s = sumDrop + sumGap > avail ? Math.max(0.45, (avail - sumGap) / sumDrop) : 1;

  interface Seg {
    hx: number;
    hy: number;
    lx: number;
    ly: number;
    dir: number;
    angle: number;
  }
  const segs: Seg[] = [];
  const catchWalls: WallSpec[] = [];
  let cx = startX;
  let cy = TOP_Y;
  for (let i = 0; i < raw.length; i++) {
    const r = raw[i];
    const span = r.span * s;
    const drop = span * Math.tan(r.slopeDeg * DEG);
    const lx = cx + r.dir * span;
    const ly = cy + drop;
    segs.push({ hx: cx, hy: cy, lx, ly, dir: r.dir, angle: r.slopeDeg * r.dir });

    // 衔接漏斗：漏口中心在出唇飞行落点处，两根斜杠组成 V 形（漏口 30px）
    const fx = Math.max(95, Math.min(BOARD_W - 95, lx + r.dir * (13 + r.flight)));
    const fy = ly + r.gapFall; // 漏口底部高度
    const jy = i < raw.length - 1 ? fy + 40 : fy; // 下一段高端（末段为杯口）
    if (i < raw.length - 1) {
      // 近侧斜杠（矮）：底端在漏口来向侧，顶向外倾
      const nearLen = 58;
      catchWalls.push({
        x: fx - r.dir * (15 + 0.788 * (nearLen / 2)),
        y: fy + 8 - 0.616 * (nearLen / 2),
        w: 8,
        h: nearLen,
        angle: -52 * r.dir,
      });
      // 远侧斜杠（高）：拦截飞来的弹珠
      const farLen = 76;
      catchWalls.push({
        x: fx + r.dir * (15 + 0.788 * (farLen / 2)),
        y: fy + 8 - 0.616 * (farLen / 2),
        w: 8,
        h: farLen,
        angle: 52 * r.dir,
      });
      // 高端唇边挡板：漏口落下的弹珠带残余水平速度，挡板拦住唇边防冲出
      catchWalls.push({
        x: fx + r.dir * 19,
        y: jy - 16,
        w: 8,
        h: 44,
      });
    }
    cx = fx;
    cy = jy;
  }

  /* ---- 轨道板 ---- */
  const iceIdx = new Set<number>();
  const bounceIdx = new Set<number>();
  const iceMax = Math.min(spec.ice, rampCount - 2);
  while (iceIdx.size < iceMax) iceIdx.add(pickInt(1, rampCount - 1));
  const bounceMax = Math.min(spec.bounce, rampCount - 1 - iceIdx.size);
  while (bounceIdx.size < bounceMax) {
    const i = pickInt(1, rampCount - 1);
    if (!iceIdx.has(i)) bounceIdx.add(i);
  }

  const ramps: RampSpec[] = segs.map((seg, i) => {
    const len = Math.hypot(seg.lx - seg.hx, seg.ly - seg.hy) + 26; // 两端各 13px 唇边
    const correct = Math.round(seg.angle * 2) / 2;
    // 干扰项：反向 + 水平 + 过陡/过缓（相对行进方向）
    const decoys = new Set<number>();
    decoys.add(-correct);
    decoys.add(0);
    let guard = 0;
    while (decoys.size < spec.options - 1 && guard++ < 24) {
      const cand = Math.round((correct + seg.dir * pick(9, 16) * (rnd() < 0.5 ? 1 : -1)) * 2) / 2;
      if (Math.abs(cand) <= 40 && cand !== correct && cand !== 0) decoys.add(cand);
    }
    // 兜底候选扫描（保证终止）
    for (let dlt = 6; decoys.size < spec.options - 1 && dlt <= 44; dlt += 2) {
      const c1 = Math.round((correct + seg.dir * dlt) * 2) / 2;
      const c2 = Math.round((correct - seg.dir * dlt) * 2) / 2;
      if (Math.abs(c1) <= 42 && c1 !== correct && c1 !== 0) decoys.add(c1);
      if (decoys.size < spec.options - 1 && Math.abs(c2) <= 42 && c2 !== correct && c2 !== 0) decoys.add(c2);
    }
    const options = [correct, ...decoys].slice(0, spec.options);
    for (let j = options.length - 1; j > 0; j--) {
      const j2 = Math.floor(rnd() * (j + 1));
      [options[j], options[j2]] = [options[j2], options[j]];
    }
    const solution = options.indexOf(correct);
    let initial = Math.floor(rnd() * options.length);
    if (initial === solution) initial = (initial + 1) % options.length;
    const fwd = (solution - initial + options.length) % options.length;
    const bwd = (initial - solution + options.length) % options.length;
    return {
      idx: i,
      cx: (seg.hx + seg.lx) / 2,
      cy: (seg.hy + seg.ly) / 2,
      len,
      thick: RAMP_THICK,
      kind: iceIdx.has(i) ? 'ice' : bounceIdx.has(i) ? 'bounce' : 'normal',
      options,
      solution,
      initial,
      parMoves: Math.min(fwd, bwd),
    };
  });

  /* ---- 杯子：末段低端顺出珠方向的前下方（cy 已含末段落差） ---- */
  const last = segs[segs.length - 1];
  const cupX = Math.max(56, Math.min(BOARD_W - 56, last.lx + last.dir * pick(28, 42)));
  const cupTopY = cy;
  const cupR = spec.cupR;
  const cupWalls: WallSpec[] = [
    { x: cupX, y: cupTopY + 34, w: cupR * 2 + 20, h: 10 }, // 杯底
    { x: cupX + last.dir * (cupR + 9), y: cupTopY - 2, w: 10, h: 96 }, // 来向远侧（高，拦截飞珠）
    { x: cupX - last.dir * (cupR + 9), y: cupTopY + 20, w: 10, h: 38 }, // 来向近侧（矮）
  ];

  /* ---- 固定墙：左右边墙 + 地板 ---- */
  const walls: WallSpec[] = [
    { x: -20, y: BOARD_H / 2, w: 40, h: BOARD_H * 2 },
    { x: BOARD_W + 20, y: BOARD_H / 2, w: 40, h: BOARD_H * 2 },
    { x: BOARD_W / 2, y: BOARD_H + 30, w: BOARD_W * 2, h: 60 },
  ];

  /* ---- 弹力桩（高阶关卡的障碍/干扰，自动避开路线走廊与漏斗） ---- */
  const pegs: PegSpec[] = [];
  const distToSeg = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  };
  let pegGuard = 0;
  while (pegs.length < spec.bumpers && pegGuard++ < 40) {
    const px = pick(70, BOARD_W - 70);
    const py = pick(180, BOARD_H - 160);
    const nearRamp = segs.some((seg) => distToSeg(px, py, seg.hx, seg.hy, seg.lx, seg.ly) < 52);
    // 漏斗斜杠/挡板也视为障碍走廊（沿轴线两端点）
    const nearFunnel = catchWalls.some((w) => {
      const a = (w.angle ?? 0) * DEG;
      const ux = Math.sin(a);
      const uy = -Math.cos(a);
      return distToSeg(px, py, w.x - ux * w.h * 0.6, w.y - uy * w.h * 0.6, w.x + ux * w.h * 0.6, w.y + uy * w.h * 0.6) < 50;
    });
    const nearCup = Math.hypot(px - cupX, py - cupTopY) < 90;
    if (!nearRamp && !nearFunnel && !nearCup) pegs.push({ x: px, y: py, r: 14, kind: 'bumper' });
  }

  /* ---- 出生点：第一段高端上方 ---- */
  const first = segs[0];
  const spawn = {
    x: first.hx + first.dir * 6,
    y: first.hy - MARBLE_R - 24,
    vx: first.dir * 1.6,
    vy: 0,
  };

  return {
    id,
    name: `${TIER_NAMES[tier]} ${String(id).padStart(2, '0')}`,
    hint: HINTS[id] ?? (id <= 8 ? '把每块轨道调成下坡，弹珠就能滚进杯子。' : '观察落点，调好每一块轨道的角度！'),
    tier,
    spawn,
    goal: { x: cupX, y: cupTopY + 22, r: cupR },
    cupWalls,
    catchWalls,
    walls,
    ramps,
    pegs,
    par: ramps.reduce((sum, r) => sum + r.parMoves, 0),
    timeLimitSec: 15,
  };
}

export const MARBLE_LEVEL_COUNT = 40;

/** 全部 40 关（确定性生成，可安全缓存） */
export const MARBLE_LEVELS: MarbleLevel[] = Array.from({ length: MARBLE_LEVEL_COUNT }, (_, i) =>
  getMarbleLevel(i + 1),
);
