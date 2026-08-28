/**
 * Level definitions + deterministic tower generation — tetromino edition.
 *
 * Towers are built from Russian-block style pieces (bars / squares /
 * L-trominoes / L+J tetrominoes). Every 2-row band is fully tiled inside its
 * column window so the tower silhouette stays clean. Physics cells are
 * perfectly flush (30×30 on a 30 grid): bands behave like wedged solids,
 * which is what lets every level pass the 15 s idle-stability gate.
 *
 * Difficulty comes from STRUCTURE, not noise:
 *  - waists:    narrowed bands (auto-tapered neighbours) — their pieces are
 *               load-bearing "key blocks";
 *  - bridges:   a band whose bottom row is two segments with a centered gap,
 *               spanned by lintel bars — removing a lintel or a pier-top bar
 *               drops everything above the gap;
 *  - overhangs: whole bands shifted by whole cells (cantilevers);
 *  - narrow base / ice shelves / top-heavy blocks.
 * Key blocks are flagged in the spec and rendered with a darker outline +
 * subtle jitter so kids learn to spot them.
 *
 * Pure module (no DOM / no matter-js) so it can be shared between the game,
 * the zustand store and the headless verification scripts.
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

/* ---------------- types ---------------- */

export type BlockKind = 'normal' | 'ice' | 'heavy';

/** per-level hero physics tuning (hexagon liveliness) */
export interface HeroTune {
  /** inertia multiplier (>1 = slower to tumble) */
  inertia: number;
  friction: number;
  frictionAir: number;
}

export interface LevelDef {
  /** 1-based level number */
  id: number;
  /** tower rows (bottom → top), one row = one tetromino cell */
  rows: number;
  /** time limit in seconds */
  timeSec: number;
  /** weighted stamp bag for normal 2-row bands */
  bag: string[];
  /** max whole-band horizontal stagger (px), 0 = perfectly aligned */
  maxShift: number;
  /** number of slippery "ice" shelf rows */
  iceRows: number;
  /** number of extra-dense "heavy" pieces */
  heavyBlocks: number;
  /** heavy pieces forced into the top 4 rows (top-heavy tower) */
  heavyTop?: number;
  /** tower footprint width in columns (default 12, centered over the beam) */
  winCols?: number;
  /** bottom band width in columns (tapers up to winCols over two bands) */
  baseCols?: number;
  /** narrowed bands: band index → columns (neighbours auto-tapered) */
  waists?: { b: number; cols: number }[];
  /** arch bands: band index → centered gap (columns) in the bottom row */
  bridges?: { b: number; gap: number }[];
  /** absolute whole-cell offset for specific bands (cantilevers) */
  shiftPlan?: { b: number; cells: number }[];
  /** hexagon tuning for this level (default = safe teaching feel) */
  hero?: HeroTune;
  /** deterministic seed offset — picked so every variant passes the stability
   * and careful-path gates (structure unchanged, tiling reshuffled) */
  salt?: number;
  /** short feature label for UI */
  feature: string;
}

/** One cell of a piece: grid coordinates plus pixel adjustments. */
export interface CellSpec {
  /** grid column (0..COLS-1) and row (0 = tower bottom) */
  col: number;
  row: number;
  /** px offset from the cell's grid center (band shift) */
  dx: number;
  dy: number;
  /** px size (always a full flush cell) */
  w: number;
  h: number;
}

export interface BlockSpec {
  cells: CellSpec[];
  /** lowest grid row of the piece (keyboard nav / intro stagger) */
  row: number;
  /** highest grid row of the piece (layer color) */
  topRow: number;
  kind: BlockKind;
  /** structural key block: removing it may collapse part of the tower */
  key?: boolean;
}

export interface TowerSpec {
  rows: number;
  blocks: BlockSpec[];
  ballX: number;
  /** landing beam width for this level (px) */
  beamW: number;
  /** hexagon tuning for this level */
  heroTune: HeroTune;
}

/** How many pre-generated (and stability-verified) variants exist per level. */
export const VARIANTS_PER_LEVEL = 2;

/** Tetromino cell size (px). */
export const CELL = 30;
/** Tower tiling grid: 12 columns × N rows. */
export const COLS = 12;
/** Left edge of the tiling region: x ∈ [180, 540] (beam is 480 wide). */
export const TILE_X = 180;

/** default hero feel (levels 1–2 teaching safety; realism-capped) */
export const DEFAULT_HERO: HeroTune = { inertia: 2.3, friction: 0.65, frictionAir: 0.03 };
/**
 * Cloud platform overhang on EACH side of the tower footprint, in cells
 * (1.0 cell = 30 px). The platform (cloud visual + physics beam + landing
 * zone, all identical) is exactly the tower's column width plus this margin
 * on both sides, so it visually hugs the tower instead of spanning the canvas.
 * 1.0 cell gives the hero a real landing apron on the narrow (6–7 col) endgame
 * towers: sliding off a side edge still lands on the cloud, which is what makes
 * the strong structures (waists / bridges / heavy crowns) fair again.
 */
export const PLATFORM_MARGIN_CELLS = 1.0;
/** wider apron for narrow (≤7 col) endgame towers — the rolly realistic
 *  hero needs the catch-net or no careful descent survives */
export const PLATFORM_MARGIN_NARROW = 1.5;

/** Cloud platform width for a tower of `cols` columns. */
export function platformWidth(cols: number): number {
  const margin = cols <= 7 ? PLATFORM_MARGIN_NARROW : PLATFORM_MARGIN_CELLS;
  return Math.round((cols + margin * 2) * CELL);
}

/* ---------------- level table (parameterized, 100 levels) ---------------- */

/** Total level count. */
export const LEVEL_COUNT = 100;

/** Stamp bags: piece variety grows with level (fewer flat slabs later). */
const BAG_TEACH = ['I4', 'I4', 'I3', 'OO', 'HH2'];
const BAG_FULL = ['I3', 'O', 'HH2', 'L3', 'LJ', 'JL', 'TU', 'TD'];
const BAG_HARD = ['L3', 'LJ', 'JL', 'O', 'HH2', 'L3', 'TU', 'TD'];

/**
 * Difficulty tier for a 1-based level number.
 * 入门 1-10 / 进阶 11-20 / 熟练 21-30 / 高手 31-40 / 大师 41-50 /
 * 宗师 51-70 / 传说 71-100.
 */
export function levelTier(l: number): number {
  if (l <= 50) return Math.min(4, Math.floor((l - 1) / 10));
  return l <= 70 ? 5 : 6;
}

export const TIER_NAMES = ['入门', '进阶', '熟练', '高手', '大师', '宗师', '传说'];
/** Tier index → [first level, last level] (1-based, inclusive). */
export const TIER_RANGES: [number, number][] = [
  [1, 10],
  [11, 20],
  [21, 30],
  [31, 40],
  [41, 50],
  [51, 70],
  [71, 100],
];

/**
 * Parameterized 100-level curve. Difficulty rises through STRUCTURE:
 *  - 1–5    teaching: full flat towers, extra-grippy hero
 *  - 6–10   waist necks (first key blocks)
 *  - 11–15  ice shelves
 *  - 16–20  cantilever overhangs
 *  - 21–30  arch bridges / double bridges
 *  - 31–40  thin waist + ice + overhang combos, narrow base
 *  - 41–50  high-risk combos: big overhangs, ice, top-heavy, many key blocks
 *  - 51–60  double waists / waist+bridge combos
 *  - 61–70  multi-ice towers / double cantilevers
 *  - 71–80  heavy crown + thin waist, bridge+waist combos
 *  - 81–90  narrow (6-col) combo towers
 *  - 91–100 grandmaster: hardest structure stacks on the tallest towers
 * L1–50 are byte-identical to the shipped 50-level curve (rows / columns /
 * time / hero / structures). L51+ keeps climbing: rows 34 → 44, columns
 * 7 → 6, ~4.5 s/row time limit, and a slightly livelier (still
 * realism-capped) hero.
 */
function makeLevel(l: number): LevelDef {
  const t = (l - 1) / 49; // 0 → 1 across the ORIGINAL 50-level game (L1-50 unchanged)
  const rows =
    l <= 50
      ? Math.min(34, Math.round(13 + t * 29)) // 13 → 34 (+6 replay ≈ 40)
      : Math.min(44, 34 + Math.round((l - 50) * 0.2)); // 35 (L55) → 44 (L100), +6 replay capped at 44
  const bandCount = Math.ceil(rows / 2);
  const winCols = l <= 2 ? 8 : l <= 15 ? 9 : l <= 40 ? 8 : l <= 80 ? 7 : 6;
  const timeSec =
    l <= 50
      ? Math.round(rows * 5) + (l <= 5 ? 5 : 0) // ~5 s/row, teaching bonus
      : Math.round(rows * 4.5); // endgame: tighter clock
  const dir = l % 2 === 0 ? 1 : -1; // deterministic cantilever direction

  // hero liveliness: teaching-safe → playful, in 5-level bands.
  // Realism caps: inertia ≤ 2.5, friction ≤ 0.7 — the old 5.0/0.92 hexagon
  // held itself on tilted supports it should roll off ("假稳"). The hero
  // collider is an octagon (visual still hexagon); controllability
  // comes from frictionAir (rolling-resistance stand-in, like a soft
  // beanbag) plus the cloud landing assist, not from grip glue.
  // Endgame floor: inertia ≥ 1.7, friction ≥ 0.5 — below that the hero
  // scoots off any slope and NO careful descent survives (unfair, not hard).
  const band = Math.floor((l - 1) / 5); // 0..19
  const HERO_BANDS: HeroTune[] = [
    { inertia: 2.5, friction: 0.7, frictionAir: 0.08 }, // L1-5
    { inertia: 2.5, friction: 0.7, frictionAir: 0.06 }, // L6-10
    { inertia: 2.5, friction: 0.68, frictionAir: 0.06 }, // L11-15
    { inertia: 2.5, friction: 0.65, frictionAir: 0.055 }, // L16-20
    { inertia: 2.5, friction: 0.62, frictionAir: 0.06 }, // L21-25
    { inertia: 2.2, friction: 0.62, frictionAir: 0.055 }, // L26-30
    { inertia: 2.5, friction: 0.68, frictionAir: 0.055 }, // L31-35
    { inertia: 2.4, friction: 0.66, frictionAir: 0.055 }, // L36-40
    { inertia: 2.2, friction: 0.62, frictionAir: 0.04 }, // L41-45
    { inertia: 1.9, friction: 0.56, frictionAir: 0.03 }, // L46-50
    { inertia: 1.9, friction: 0.56, frictionAir: 0.03 }, // L51-55
    { inertia: 1.9, friction: 0.55, frictionAir: 0.03 }, // L56-60
    { inertia: 1.8, friction: 0.55, frictionAir: 0.03 }, // L61-65
    { inertia: 1.8, friction: 0.54, frictionAir: 0.028 }, // L66-70
    { inertia: 1.8, friction: 0.53, frictionAir: 0.028 }, // L71-75
    { inertia: 1.7, friction: 0.52, frictionAir: 0.028 }, // L76-80
    { inertia: 1.7, friction: 0.52, frictionAir: 0.026 }, // L81-85
    { inertia: 1.7, friction: 0.5, frictionAir: 0.026 }, // L86-90
    { inertia: 1.7, friction: 0.5, frictionAir: 0.024 }, // L91-95
    { inertia: 1.7, friction: 0.5, frictionAir: 0.024 }, // L96-100
  ];
  const hero: HeroTune = { ...HERO_BANDS[band] };

  const def: LevelDef = {
    id: l,
    rows,
    timeSec,
    bag: l <= 5 ? BAG_TEACH : l <= 10 ? BAG_FULL : BAG_HARD,
    maxShift: l <= 5 ? 0 : l >= 41 ? 8 : Math.min(8, Math.round(1 + t * 7)),
    iceRows: 0,
    heavyBlocks: 0,
    winCols,
    hero,
    feature: '',
  };

  const waist = (frac: number, drop = 2) => ({
    b: Math.max(3, Math.min(bandCount - 3, Math.floor(bandCount * frac))),
    cols: Math.max(4, winCols - drop),
  });
  const bridge = (frac: number, gap = 2) => ({
    b: Math.max(2, Math.min(bandCount - 4, Math.floor(bandCount * frac))),
    gap,
  });
  const shift = (frac: number, cells: number, sign = dir) => ({
    b: Math.max(2, Math.min(bandCount - 3, Math.floor(bandCount * frac))),
    cells: cells * sign,
  });

  if (l <= 5) {
    // teaching: full flat towers; L5 gets a first ice shelf
    def.iceRows = l === 5 ? 1 : 0;
    def.feature = l <= 2 ? '宽积木·入门' : l <= 4 ? '方块拼塔' : '冰块层·初见';
  } else if (l <= 10) {
    // waist necks — first key blocks
    def.waists = [waist(0.5)];
    def.iceRows = 0;
    def.heavyBlocks = l === 8 ? 1 : 0;
    def.feature = l <= 7 ? '收腰塔·关键块' : '收腰高塔';
  } else if (l <= 15) {
    // ice shelves
    def.iceRows = 2;
    def.heavyBlocks = 1;
    def.feature = '冰层塔·打滑';
  } else if (l <= 20) {
    // cantilever overhangs
    def.shiftPlan = [shift(0.6, 1)];
    def.iceRows = l >= 18 ? 2 : 1;
    def.heavyBlocks = 1;
    def.feature = '悬挑塔·失衡';
  } else if (l <= 25) {
    // arch bridge
    def.bridges = [bridge(0.35)];
    def.shiftPlan = [shift(0.65, 1)];
    def.iceRows = 2;
    def.heavyBlocks = 3;
    def.feature = '拱桥·承重梁';
  } else if (l <= 30) {
    // double bridge + top-heavy crown
    def.bridges = [bridge(0.3), bridge(0.58)];
    def.iceRows = 1;
    def.heavyBlocks = 1;
    def.heavyTop = 1;
    def.feature = '双拱桥·连环';
  } else if (l <= 35) {
    // waist neck (narrow upper tower) + ice + heavy pieces
    def.waists = [waist(0.5)];
    def.shiftPlan = [shift(0.6, 1)];
    def.iceRows = 1;
    def.heavyBlocks = 2;
    def.heavyTop = 0;
    def.feature = '收腰冰塔·重冠';
  } else if (l <= 40) {
    // deep waist + ice + heavy pieces
    def.waists = [waist(0.5, 3)];
    def.shiftPlan = [shift(0.65, 1)];
    def.iceRows = 1;
    def.heavyBlocks = 2;
    def.heavyTop = 0;
    def.feature = '收腰冰塔·重冠';
  } else if (l <= 45) {
    // high risk: waist neck + ice + heavy pieces (7 cols)
    def.waists = [waist(0.5)];
    def.shiftPlan = [shift(0.65, 1)];
    def.iceRows = 1;
    def.heavyBlocks = 2;
    def.heavyTop = 0;
    def.feature = '收腰冰塔·高危';
  } else if (l <= 50) {
    // master: waist + ice + heavy crown + lively hero (7 cols)
    def.waists = [waist(0.5)];
    def.shiftPlan = [shift(0.65, 1)];
    def.iceRows = 1;
    def.heavyBlocks = 2;
    def.heavyTop = 1;
    def.feature = '冰面斜塔·大师';
  } else if (l <= 55) {
    // 宗师 opener: double waist — two stepped necks stacked (7 cols)
    def.waists = [waist(0.35), waist(0.68, 3)];
    def.shiftPlan = [shift(0.55, 1)];
    def.iceRows = 1;
    def.heavyBlocks = 2;
    def.heavyTop = 0;
    def.feature = '双收腰·连环扣';
  } else if (l <= 60) {
    // waist + double ice (arch bridges self-topple under 17+ bands of load —
    // probed unstable at every salt — so the bridge combo lives at L21-30)
    def.waists = [waist(0.64)];
    def.shiftPlan = [shift(0.4, 1)];
    def.iceRows = 2;
    def.heavyBlocks = 2;
    def.heavyTop = 1;
    def.feature = '双冰收腰·组合';
  } else if (l <= 65) {
    // multi-ice tower: 2–3 shear planes
    def.iceRows = l <= 62 ? 2 : 3;
    def.shiftPlan = [shift(0.6, 1)];
    def.heavyBlocks = 3;
    def.heavyTop = 1;
    def.feature = '多层冰塔·打滑';
  } else if (l <= 70) {
    // double cantilever: two whole-band overhangs in opposite directions
    def.shiftPlan = [shift(0.42, 1), shift(0.7, 1, -dir)];
    def.iceRows = 2;
    def.heavyBlocks = 2;
    def.heavyTop = 1;
    def.feature = '双排悬挑·失衡';
  } else if (l <= 75) {
    // heavy crown + thin waist
    def.waists = [waist(0.5, 3)];
    def.shiftPlan = [shift(0.68, 1)];
    def.iceRows = 1;
    def.heavyBlocks = 2;
    def.heavyTop = 2;
    def.feature = '重冠细腰·高危';
  } else if (l <= 80) {
    // double waist + ice stack (bridge variant probed unstable → dropped)
    def.waists = [waist(0.4), waist(0.62, 3)];
    def.shiftPlan = [shift(0.72, 1)];
    def.iceRows = 2;
    def.heavyBlocks = 2;
    def.heavyTop = 1;
    def.feature = '双腰冰塔·险峰';
  } else if (l <= 85) {
    // narrow (6-col) double waist + ice
    def.waists = [waist(0.38), waist(0.66, 2)];
    def.shiftPlan = [shift(0.55, 1)];
    def.iceRows = 2;
    def.heavyBlocks = 2;
    def.heavyTop = 1;
    def.feature = '窄塔双腰·冰刃';
  } else if (l <= 90) {
    // narrow double cantilever pair
    def.shiftPlan = [shift(0.5, 1), shift(0.74, 1, -dir)];
    def.iceRows = 2;
    def.heavyBlocks = 3;
    def.heavyTop = 1;
    def.feature = '窄塔双挑·惊魂';
  } else if (l <= 95) {
    // grandmaster: thin waist + double ice + cantilever
    def.waists = [waist(0.55, 2)];
    def.shiftPlan = [shift(0.74, 1)];
    def.iceRows = 2;
    def.heavyBlocks = 2;
    def.heavyTop = 1;
    def.feature = '细腰冰塔·宗师';
  } else {
    // legend finale: double waist + ice + heavy crown on the tallest tower
    def.waists = [waist(0.36), waist(0.66, 2)];
    def.shiftPlan = [shift(0.52, 1), shift(0.78, 1, -dir)];
    def.iceRows = 2;
    def.heavyBlocks = 3;
    def.heavyTop = 1;
    def.feature = '双腰重冠·传说';
  }
  // per-level difficulty fine-tuning (fall-rate bands from headless sims)
  if (l === 26 || l === 33) def.iceRows = 2; // tame tiers need extra shear planes
  if (l === 26) def.heavyTop = 2; // top-heavy double-bridge opener
  if (l === 28) def.heavyTop = 0; // double bridge is already collapse-prone
  // per-level hero fine-tuning (headless difficulty sims)
  if (l === 42) { def.waists = [waist(0.5, 1)]; def.iceRows = 0; } // L42: deep waist had no careful path at any salt; shallow it and drop the ice shelf
  if (l === 46) { def.heavyTop = 0; def.iceRows = 0; def.waists = [waist(0.5, 1)]; def.hero = { inertia: 2.2, friction: 0.62, frictionAir: 0.035 }; } // L46: same treatment as L48 — crown+ice+deep waist unwinnable at every salt
  if (l === 48) def.hero = { inertia: 1.9, friction: 0.56, frictionAir: 0.024 };
  if (l === 41) def.hero = { inertia: 2.0, friction: 0.58, frictionAir: 0.03 }; // L41: livelier hero to lift random-fall into band
  if (l === 48) def.hero = { inertia: 2.2, friction: 0.62, frictionAir: 0.035 }; // L48: calmer hero so careful descent survives the waist
  if (l === 49) { def.heavyTop = 0; def.iceRows = 0; def.waists = [waist(0.5, 1)]; def.hero = { inertia: 2.2, friction: 0.62, frictionAir: 0.035 }; } // L49: same treatment as L48
  if (l === 26) def.hero = { inertia: 2.0, friction: 0.56, frictionAir: 0.035 }; // livelier opener
  if (l === 32 || l === 33) def.waists = [waist(0.5, 3)]; // deeper neck: 8→5 cols
  if (l === 41) def.waists = [waist(0.5, 3)]; // deeper neck: 7→4 cols
  if (l === 48) { def.heavyTop = 0; def.iceRows = 0; def.waists = [waist(0.5, 1)]; } // L48: crown+ice+deep waist made every salt unwinnable; soften to shallow waist
  if (l === 50) def.heavyTop = 0; // finale: crown removed — with it, no salt had a careful path
  if (l === 50) { def.iceRows = 0; def.waists = [waist(0.5, 1)]; def.hero = { inertia: 2.2, friction: 0.62, frictionAir: 0.035 }; } // L50: same treatment as L48 — must come AFTER the liveliest-hero line above
  if (l === 50) def.hero = { inertia: 2.2, friction: 0.62, frictionAir: 0.035 }; // final word on L50 hero
  // --- L51+ fine-tuning (headless salt searches, all stable salts 0-17 tried first) ---
  // L55: calm the hero a notch — the double 5/4-col waist only had a careful
  // path at 75% fall (over its 45-60% band); a calmer hero lowers both.
  if (l === 55) def.hero = { inertia: 2.0, friction: 0.58, frictionAir: 0.032 };
  // L56/58/60: drop the heavy crown — waist + double ice + crown had no
  // careful path at salts 0-29 (L57/59 passed with the crown, keep theirs).
  if (l === 56 || l === 58 || l === 60) def.heavyTop = 0;
  // L81-85 failures: second waist one step shallower (5 cols) — the double
  // 4-col waist on 6-col towers had no in-band careful path at salts 0-29.
  if (l === 81 || l === 82 || l === 84 || l === 85) def.waists = [waist(0.38), waist(0.66, 1)];
  // L87: calm hero a notch (no careful path at salts 0-29).
  if (l === 87) def.hero = { inertia: 1.8, friction: 0.52, frictionAir: 0.028 };
  // L91-100: calm the hero a notch instead of softening structures — the
  // shallower-waist / single-cantilever variants went UNSTABLE at every salt
  // (the deep waist is load-bearing on 42-44 row towers), while the deadly
  // part was the hero, not the tower. Still realism-capped (≥1.7 / ≥0.5).
  if (l >= 91 && l <= 95) def.hero = { inertia: 1.8, friction: 0.53, frictionAir: 0.028 };
  if (l >= 96) def.hero = { inertia: 1.8, friction: 0.52, frictionAir: 0.028 };
  // round-5 per-level fixes (still no in-band careful path after salts 0-29):
  // L58: calm hero (its only 2/2 salt was at 100% fall — way over band).
  if (l === 58) def.hero = { inertia: 2.0, friction: 0.58, frictionAir: 0.035 };
  // L81-87 failures: calm hero on the 6-col towers (deep double waist /
  // double cantilever killed every careful descent even with the apron).
  if (l === 81 || l === 82 || l === 84 || l === 85 || l === 87) def.hero = { inertia: 2.0, friction: 0.58, frictionAir: 0.035 };
  // L91-95 failures: drop the cantilever — deep waist + double ice + crown
  // on a 43-row 6-col tower is deadly enough without the sideways shove.
  if (l >= 91 && l <= 95 && l !== 94) def.shiftPlan = [];
  // L96-100 failures: calm hero a further notch (kept the hardest structure).
  if (l === 96 || l === 97 || l === 99 || l === 100) def.hero = { inertia: 1.9, friction: 0.55, frictionAir: 0.03 };
  // round-6 per-level fixes:
  // L58/60: shallow the waist (6 cols) — the 5-col waist + double ice had no
  // careful path at salts 0-41.
  if (l === 58 || l === 60) def.waists = [waist(0.64, 1)];
  // L81: calm hero + restore the deep second waist (calmer hero alone dropped
  // the random fall rate below the band floor).
  if (l === 81) def.waists = [waist(0.38), waist(0.66, 2)];
  // L82/85: hero halfway between band and round-5 calm.
  if (l === 82 || l === 85) def.hero = { inertia: 1.9, friction: 0.56, frictionAir: 0.032 };
  // round-7 per-level fixes:
  // L58: fall rate sits nicely in-band (50-63%) but one variant always kills
  // the careful descent — drop to a single ice shelf.
  if (l === 58) def.iceRows = 1;
  // L82: calmest allowed hero — no careful path at any salt/structure tried.
  if (l === 82) def.hero = { inertia: 2.2, friction: 0.6, frictionAir: 0.04 };
  // L91/92: calm hero a further notch.
  if (l === 91 || l === 92) def.hero = { inertia: 1.9, friction: 0.55, frictionAir: 0.03 };
  // L96/99/100: calm hero a further notch (structure stays the hardest).
  if (l === 96 || l === 99 || l === 100) def.hero = { inertia: 2.0, friction: 0.56, frictionAir: 0.032 };
  // round-8 per-level fixes (last stubborn levels):
  // L58: calmest hero — one variant's careful descent kept dying at salts 0-23.
  if (l === 58) def.hero = { inertia: 2.2, friction: 0.62, frictionAir: 0.04 };
  // L81: keep the shallow (5-col) second waist but revert to the band hero —
  // the only configuration with a careful path (salt 16, 50% fall).
  if (l === 81) {
    def.waists = [waist(0.38), waist(0.66, 1)];
    def.hero = { ...HERO_BANDS[band] };
  }
  // L96/99/100: drop the heavy crown — double waist + double cantilever +
  // double ice on 44 rows is already the hardest structure in the game.
  if (l === 96 || l === 99 || l === 100) def.heavyTop = 0;
  // L99: no salt 0-35 gave a careful path with the double cantilever even at
  // the calmest hero — drop to a single cantilever + calmest hero.
  if (l === 99) {
    def.shiftPlan = [shift(0.52, 1)];
    def.hero = { inertia: 2.2, friction: 0.62, frictionAir: 0.04 };
  }
  // seed salts: picked by headless search (scripts/tune-salt.ts) so every
  // variant is idle-stable AND has a careful-player path, with the random-mash
  // fall rate inside the level's difficulty band
  const SALTS: Record<number, number> = {
    2: 2, 3: 1, 8: 4, 9: 2, 25: 3,
    26: 6, 27: 5, 28: 8, 29: 7, 31: 6, 32: 1, 33: 12, 34: 4, 35: 4,
    36: 1, 37: 3, 38: 7, 39: 1, 40: 29, 41: 9, 42: 15, 43: 19, 44: 13, 45: 9,
    46: 24, 47: 7, 48: 5, 49: 20, 50: 13,
    // L51-100: same headless search over the extended curve
    51: 4, 52: 1, 53: 9, 54: 16, 55: 8, 57: 7, 58: 7, 59: 23, 60: 18,
    61: 1, 62: 3, 63: 5, 64: 10, 65: 6, 66: 9, 67: 1, 68: 6, 70: 15,
    71: 12, 72: 9, 73: 5, 74: 5, 75: 14, 76: 8, 77: 14, 78: 6, 79: 1, 80: 1,
    81: 16, 82: 29, 83: 6, 84: 4, 85: 5, 86: 23, 87: 11, 88: 18, 89: 7, 90: 27,
    91: 8, 93: 13, 94: 2, 95: 8, 96: 5, 97: 9, 98: 17, 99: 19, 100: 41,
    // L100: salt 29 had no reliable careful path (2/4, variant-dependent — a
    // fairness hole). Re-screened salts 0-70: only salt 41 is idle-stable on
    // both variants AND gives careful 4/4 across two confirmation rounds
    // (tune-salt --levels 100 --careful 2), with the random-mash fall rate at
    // 75% — inside the 55-80% endgame band.
  };
  if (SALTS[l] !== undefined) def.salt = SALTS[l];
  def.feature = `${TIER_NAMES[levelTier(l)]}·${def.feature}`;
  return def;
}

export const LEVELS: LevelDef[] = Array.from({ length: LEVEL_COUNT }, (_, i) => makeLevel(i + 1));

/* ---------------- replay growth ("每次要高一些") ---------------- */

/** Extra tower rows added per previous clear of the same level. */
export const REPLAY_GROW_ROWS = 2;
/** Cap on replay bonus rows. */
export const REPLAY_GROW_MAX = 6;
/** Extra time limit per bonus row (keeps the ~5 s/row pace). */
export const REPLAY_GROW_SEC = 5;

/** Bonus rows for a level the kid has already cleared `clears` times. */
export function extraRowsForClears(clears: number): number {
  return Math.min(Math.max(0, Math.floor(clears)) * REPLAY_GROW_ROWS, REPLAY_GROW_MAX);
}

/** Effective tower rows for a play-through of level `idx`. */
export function levelRows(idx: number, extraRows = 0): number {
  return LEVELS[idx].rows + extraRows;
}

/** Effective time limit (seconds) for a play-through of level `idx`. */
export function levelTimeSec(idx: number, extraRows = 0): number {
  return LEVELS[idx].timeSec + extraRows * REPLAY_GROW_SEC;
}

export function levelTimeLimitMs(idx: number, extraRows = 0): number {
  return levelTimeSec(idx, extraRows) * 1000;
}

/** Star rating from remaining time fraction: ≥40% → ★★★, ≥15% → ★★, else ★. */
export function starsFor(timeLeftMs: number, limitMs: number): number {
  if (limitMs <= 0) return 1;
  const f = timeLeftMs / limitMs;
  if (f >= 0.4) return 3;
  if (f >= 0.15) return 2;
  return 1;
}

/* ---------------- layer colors (top green → bottom yellow/orange) ---------------- */

const STOPS: [number, [number, number, number]][] = [
  [0, [238, 166, 58]], // bottom: warm yellow-orange
  [0.42, [243, 209, 72]], // bright yellow
  [0.72, [174, 215, 74]], // yellow-green
  [1, [103, 199, 75]], // top: fresh green
];

/** Piece color by its top row: fresh green at the tower top → yellow/orange at the bottom. */
export function layerColor(topRow: number, rows: number): string {
  const f = rows <= 1 ? 1 : Math.max(0, Math.min(1, topRow / (rows - 1)));
  let i = 0;
  while (i < STOPS.length - 2 && f > STOPS[i + 1][0]) i++;
  const [f0, c0] = STOPS[i];
  const [f1, c1] = STOPS[i + 1];
  const t = (f - f0) / (f1 - f0);
  const c = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Pale frosty blue for slippery ice pieces. */
export const ICE_COLOR = '#A6D6EF';

/* ---------------- tetromino stamps ---------------- */

type Pt = [number, number]; // [col offset, row above band bottom]

interface Stamp {
  /** width in columns */
  w: number;
  pieces: Pt[][];
}

/**
 * Stamps that exactly tile a 2-row strip segment (no holes, flat top).
 * Every piece has a ≥2-wide footprint — 1-wide pillars (vertical dominoes /
 * stacked monominoes) are structurally tippy and banned from the tower.
 */
const S2: Record<string, Stamp> = {
  O: { w: 2, pieces: [[[0, 0], [1, 0], [0, 1], [1, 1]]] }, // 2×2 square
  HH2: { w: 2, pieces: [[[0, 0], [1, 0]], [[0, 1], [1, 1]]] }, // two horizontal dominoes
  I3: { w: 3, pieces: [[[0, 0], [1, 0], [2, 0]], [[0, 1], [1, 1], [2, 1]]] }, // two stacked bars
  L3: { w: 3, pieces: [[[0, 0], [1, 0], [0, 1]], [[2, 0], [1, 1], [2, 1]]] }, // L-tromino pair
  I4: { w: 4, pieces: [[[0, 0], [1, 0], [2, 0], [3, 0]], [[0, 1], [1, 1], [2, 1], [3, 1]]] }, // two stacked long bars
  LJ: { w: 4, pieces: [[[0, 0], [1, 0], [2, 0], [0, 1]], [[3, 0], [1, 1], [2, 1], [3, 1]]] }, // L + J tetrominoes
  JL: { w: 4, pieces: [[[1, 0], [2, 0], [3, 0], [3, 1]], [[0, 0], [0, 1], [1, 1], [2, 1]]] }, // J + L (mirror)
  TU: { w: 3, pieces: [[[0, 0], [1, 0], [2, 0], [1, 1]], [[0, 1]], [[2, 1]]] }, // T tetromino + gap squares
  TD: { w: 3, pieces: [[[0, 1], [1, 1], [2, 1], [1, 0]], [[0, 0]], [[2, 0]]] }, // upside-down T + gap squares
  OO: { w: 4, pieces: [[[0, 0], [1, 0], [0, 1], [1, 1]], [[2, 0], [3, 0], [2, 1], [3, 1]]] }, // two squares
};

/** Stamps for a single-row strip (top band of odd-row towers + bridge rows). */
const S1: Record<string, Stamp> = {
  D2: { w: 2, pieces: [[[0, 0], [1, 0]]] },
  T3: { w: 3, pieces: [[[0, 0], [1, 0], [2, 0]]] },
  Q4: { w: 4, pieces: [[[0, 0], [1, 0], [2, 0], [3, 0]]] },
  W5: { w: 5, pieces: [[[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]]] }, // lintel bar (bridges)
};

const TOP_BAND_BAG = ['Q4', 'Q4', 'T3', 'D2', 'T3', 'Q4'];
const ICE_BAG = ['I4', 'I3', 'HH2', 'I4', 'I3'];
const BAR_BAG = ['Q4', 'T3', 'Q4', 'D2', 'T3'];

/** Does any piece span column boundary β (between col β and β+1)? */
function spansBoundary(pieces: Pt[][], beta: number): boolean {
  for (const piece of pieces) {
    for (let r = 0; r <= 1; r++) {
      const hasL = piece.some(([c, dr]) => c === beta && dr === r);
      const hasR = piece.some(([c, dr]) => c === beta + 1 && dr === r);
      if (hasL && hasR) return true;
    }
  }
  return false;
}

/* ---------------- support analysis ----------------
 * A piece is statically sound when enough of its bottom-row cells rest on
 * the band below (its "support window"), and the support is not one-sided:
 * either the centroid column is supported, or support straddles it (lintel).
 */
interface SupportWin {
  c0: number;
  c1: number;
  /** optional gap [g0..g1] of unsupported columns inside the window (bridge piers) */
  gap?: [number, number];
}

function supportCheck(piece: Pt[], sw: SupportWin, minFrac: number): { ok: boolean; frac: number; bothSides: boolean } {
  const bottom = piece.filter(([, dr]) => dr === 0);
  const cells = bottom.length > 0 ? bottom : piece;
  const inWin = (c: number) =>
    c >= sw.c0 && c <= sw.c1 && (!sw.gap || c < sw.gap[0] || c > sw.gap[1]);
  const sup = cells.filter(([c]) => inWin(c)).map(([c]) => c);
  const frac = sup.length / cells.length;
  const cx = cells.reduce((s, [c]) => s + c, 0) / cells.length;
  const centroidOk = inWin(Math.round(cx)) || inWin(Math.floor(cx)) || inWin(Math.ceil(cx));
  const leftOk = sup.some((c) => c < cx);
  const rightOk = sup.some((c) => c > cx);
  const bothSides = leftOk && rightOk;
  const ok = frac >= minFrac && (centroidOk || bothSides);
  return { ok, frac, bothSides };
}

/**
 * Guaranteed bar-only tiling of [c0..c1]: only ≥3-wide bars at the edges
 * (2-wide bars land in the interior where support is full). Used as the
 * deterministic fallback when random tiling dead-ends.
 */
function forcedBarStrip(table: Record<string, Stamp>, c0: number, c1: number): Pt[][] {
  const widths = (w: number): number[] => {
    if (w <= 0) return [];
    if (w === 1) return []; // a lone column can never be tiled flush — leave it empty
    if (w === 2) return [2];
    if (w === 3) return [3];
    if (w === 4) return [4];
    if (w === 5) return [2, 3];
    if (w === 6) return [3, 3];
    if (w === 7) return [4, 3];
    return [4, ...widths(w - 4)];
  };
  const barName = (w: number) => (table === S1 ? (w === 4 ? 'Q4' : w === 3 ? 'T3' : 'D2') : w === 4 ? 'I4' : w === 3 ? 'I3' : 'HH2');
  const pieces: Pt[][] = [];
  let c = c0;
  for (const w of widths(c1 - c0 + 1)) {
    const st = table[barName(w)];
    for (const piece of st.pieces) pieces.push(piece.map(([dc, dr]) => [c + dc, dr] as Pt));
    c += w;
  }
  return pieces;
}

/**
 * Tile a strip left→right with bag stamps inside [c0..c1]; every placed piece
 * must pass the support rule. Returns null when random tiling dead-ends
 * (caller retries with fresh rng draws, then falls back to forcedBarStrip).
 */
function tileStrip(
  rng: () => number,
  bag: string[],
  table: Record<string, Stamp>,
  c0: number,
  c1: number,
  sw: SupportWin,
  minFrac: number,
): Pt[][] | null {
  const pieces: Pt[][] = [];
  let c = c0;
  while (c <= c1) {
    const rem = c1 - c + 1;
    let placed = false;
    for (let tries = 0; tries < 24 && !placed; tries++) {
      const st = table[bag[Math.floor(rng() * bag.length)]];
      if (st && st.w <= rem && rem - st.w !== 1) {
        const cand = st.pieces.map((piece) => piece.map(([dc, dr]) => [c + dc, dr] as Pt));
        if (cand.every((p) => supportCheck(p, sw, minFrac).ok)) {
          pieces.push(...cand);
          c += st.w;
          placed = true;
        }
      }
    }
    if (!placed) {
      // deterministic fill: widest stamp that fits AND passes the support rule
      for (const w of [4, 3, 2]) {
        if (w > rem || rem - w === 1) continue;
        for (const st of Object.values(table)) {
          if (st.w !== w) continue;
          const cand = st.pieces.map((piece) => piece.map(([dc, dr]) => [c + dc, dr] as Pt));
          if (cand.every((p) => supportCheck(p, sw, minFrac).ok)) {
            pieces.push(...cand);
            c += w;
            placed = true;
            break;
          }
        }
        if (placed) break;
      }
    }
    if (!placed) return null; // dead-end (unsupported edge parity) — retry whole strip
  }
  return pieces;
}

/**
 * Tile the TOP band: always a wide bar across the center columns of the
 * window, so the hexagon hero spawns on a solid landing pad instead of a
 * seam between two pieces. Side segments are tiled randomly.
 */
function tileTopBand(rng: () => number, single: boolean, crackRun: number[], c0: number, c1: number, sw: SupportWin): Pt[][] {
  const table = single ? S1 : S2;
  const sideBag = single ? ['D2', 'D2', 'T3', 'Q4'] : ['O', 'HH2', 'I3', 'L3', 'OO', 'I4'];
  const center = single ? S1.Q4 : S2.I4;
  const win = c1 - c0 + 1;
  // narrow (6–7 col) top windows: centering the 4-wide pad would leave
  // 1-col side segments, which no stamp can tile — hug the pad one column
  // left so both sides stay stamp-able (or empty)
  let padC0 = c0 + Math.floor((win - 4) / 2);
  if (padC0 - c0 === 1) padC0--;
  for (let attempt = 0; ; attempt++) {
    const pieces: Pt[][] = [
      ...(tileStrip(rng, sideBag, table, c0, padC0 - 1, sw, 0.62) ?? forcedBarStrip(table, c0, padC0 - 1)),
      ...center.pieces.map((piece) => piece.map(([dc, dr]) => [padC0 + dc, dr] as Pt)),
      ...(tileStrip(rng, sideBag, table, padC0 + 4, c1, sw, 0.62) ?? forcedBarStrip(table, padC0 + 4, c1)),
    ];
    // never let a through-crack reach 3 bands at the tower top
    let ok = true;
    for (let beta = c0; beta < c1; beta++) {
      if ((crackRun[beta] ?? 0) >= 2 && !spansBoundary(pieces, beta)) {
        ok = false;
        break;
      }
    }
    if (ok || attempt >= 24) return pieces;
  }
}

/* ---------------- tower generation ---------------- */

interface DraftPiece {
  cells: Pt[]; // absolute [col, row]
  kind: BlockKind;
  key: boolean;
}

/** per-band stagger, module-level scratch (generation is synchronous) */
const bandShift = new Map<number, number>();

/** geometry resolved for one band */
interface BandGeom {
  c0: number;
  c1: number;
  /** whole-cell cantilever offset */
  shiftCells: number;
  /** bridge gap width (0 = solid band) */
  gap: number;
  ice: boolean;
  waist: boolean;
}

/**
 * Deterministically generate a tower for `levelIdx` (0-based) + `variant`.
 * `extraRows` is the replay-growth bonus (cleared levels replay taller).
 * Same (levelIdx, variant, extraRows) always yields the same tower, so the
 * headless stability script verifies exactly what players get.
 */
export function generateTower(levelIdx: number, variant: number, extraRows = 0): TowerSpec {
  const def = LEVELS[levelIdx];
  const seed = (levelIdx + 1) * 7919 + variant * 104729 + 17 + (def.salt ?? 0) * 971;
  const rng = mulberry32(seed);
  const N = def.rows + extraRows;
  bandShift.clear();

  const winCols = def.winCols ?? COLS;
  const wc0 = Math.floor((COLS - winCols) / 2);
  const wc1 = wc0 + winCols - 1;

  const bandCount = Math.ceil(N / 2);
  const baseBandCount = Math.ceil(def.rows / 2);
  const bandIsSingle = (b: number) => b === bandCount - 1 && N % 2 === 1;

  /* ---- resolve special bands from the level profile ---- */
  const waistCols = new Map<number, number>();
  const waistKeyBands = new Set<number>();
  for (const w of def.waists ?? []) {
    // stepped-pyramid neck: once narrowed, the tower STAYS narrow above
    // (expansion steps leave edge pieces carrying tip loads → unstable)
    const W = Math.max(4, Math.min(w.cols, winCols));
    for (let b = w.b; b < bandCount; b++) {
      waistCols.set(b, Math.min(waistCols.get(b) ?? W, W));
    }
    if (w.b - 1 >= 1) {
      waistCols.set(w.b - 1, Math.min(waistCols.get(w.b - 1) ?? winCols, Math.min(winCols, W + 2)));
    }
    waistKeyBands.add(w.b);
    if (w.b + 1 < bandCount) waistKeyBands.add(w.b + 1);
  }
  const bridgeGap = new Map<number, number>();
  for (const br of def.bridges ?? []) bridgeGap.set(br.b, Math.max(2, br.gap));
  // cantilever offset per band (absolute half-cell units for that band only;
  // entries apply below the original top band so growth bands stay aligned)
  const shiftCellsOf = (b: number): number => {
    if (b >= baseBandCount - 1) return 0;
    const s = (def.shiftPlan ?? []).find((x) => x.b === b);
    return s ? s.cells : 0;
  };

  /** window (columns, inclusive) for band b */
  const windowOf = (b: number): [number, number] => {
    let w = winCols;
    if (b === 0 && def.baseCols) w = def.baseCols;
    else if (b === 1 && def.baseCols) w = Math.min(winCols, def.baseCols + 2);
    if (waistCols.has(b)) w = Math.min(w, waistCols.get(b)!);
    w = Math.max(4, Math.min(COLS, w));
    const c0 = wc0 + Math.floor((winCols - w) / 2);
    return [c0, c0 + w - 1];
  };

  const geoms: BandGeom[] = [];
  for (let b = 0; b < baseBandCount; b++) {
    const [c0, c1] = windowOf(b);
    const gap = bridgeGap.get(b) ?? 0;
    geoms.push({
      c0,
      c1,
      shiftCells: shiftCellsOf(b),
      gap,
      ice: false,
      waist: waistCols.has(b) && (waistCols.get(b) ?? winCols) < winCols,
    });
  }
  // replay-growth bands are plain full bands inserted LOW in the tower
  // (above the base taper) — extra height must not add leverage above the
  // fragile sections near the top
  for (let k = 0; k < bandCount - baseBandCount; k++) {
    geoms.splice(2, 0, { c0: wc0, c1: wc1, shiftCells: 0, gap: 0, ice: false, waist: false });
  }

  const isSpecial = (b: number) =>
    b >= 0 &&
    b < bandCount &&
    (geoms[b].gap > 0 ||
      geoms[b].shiftCells !== 0 ||
      geoms[b].c0 !== wc0 ||
      geoms[b].c1 !== wc1);

  /* ---- ice shelves: full bands only, mid-tower (near the top they let the
   * whole crown shear off; near the base they slide the entire tower) ---- */
  {
    const minIceRow = Math.max(2, Math.floor(N * 0.3));
    const maxIceRow = Math.max(minIceRow, Math.floor(N * 0.6));
    const candBands: number[] = [];
    for (let b = 1; b < bandCount; b++) {
      const r = b * 2;
      if (r < minIceRow || r > maxIceRow || bandIsSingle(b)) continue;
      if (isSpecial(b) || isSpecial(b - 1) || isSpecial(b + 1)) continue;
      candBands.push(b);
    }
    for (let i = candBands.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [candBands[i], candBands[j]] = [candBands[j], candBands[i]];
    }
    const picked: number[] = [];
    for (const b of candBands) {
      if (picked.length >= def.iceRows) break;
      if (picked.some((o) => Math.abs(o - b) < 2)) continue;
      picked.push(b);
      geoms[b].ice = true;
    }
  }

  /* ---- pixel stagger: mean-reverting random walk on plain full bands ---- */
  const shiftScale = Math.min(1, 13 / N);
  const effMaxShift = Math.round(def.maxShift * shiftScale);
  const maxStep = Math.min(effMaxShift / 2, 7);
  const shifts: number[] = new Array(bandCount).fill(0);
  {
    let prev = 0;
    for (let b = 0; b < bandCount; b++) {
      const frozen =
        b === bandCount - 1 ||
        effMaxShift === 0 ||
        isSpecial(b) ||
        isSpecial(b - 1) ||
        isSpecial(b + 1) ||
        geoms[b].ice ||
        (b - 1 >= 0 && geoms[b - 1].ice) ||
        (b + 1 < bandCount && geoms[b + 1].ice);
      let s = frozen ? 0 : prev * 0.66 + (rng() * 2 - 1) * maxStep;
      s = Math.max(-effMaxShift, Math.min(effMaxShift, s));
      shifts[b] = Math.round(s);
      prev = shifts[b];
    }
  }

  /* ---- tile every band ---- */
  const crackRun = new Array<number>(COLS - 1).fill(0);
  const drafts: DraftPiece[] = [];

  /** support window = band below's top-row footprint (world columns; cantilevers are half-cell) */
  const supportWinOf = (b: number): SupportWin => {
    if (b === 0) {
      // bottom band rests directly on the beam: its whole window is supported
      const g = geoms[0];
      return { c0: g.c0 + g.shiftCells / 2, c1: g.c1 + g.shiftCells / 2 };
    }
    const below = geoms[b - 1];
    // (above a bridge band the top row is fully tiled → full window)
    return { c0: below.c0 + below.shiftCells / 2, c1: below.c1 + below.shiftCells / 2 };
  };

  for (let b = 0; b < bandCount; b++) {
    const r0 = b * 2;
    const g = geoms[b];
    const single = bandIsSingle(b);
    // cantilever steps are HALF cells (15 px): big enough to see, small
    // enough that the interface holds without creep
    bandShift.set(b, shifts[b] + g.shiftCells * (CELL / 2));
    const swWorld = supportWinOf(b);
    // pieces are placed in the band's own (unshifted) grid frame, then drawn
    // shifted — so the support window is mapped back (fractional columns)
    const half = g.shiftCells / 2;
    const sw: SupportWin = { c0: swWorld.c0 - half, c1: swWorld.c1 - half, gap: swWorld.gap };
    const minFrac = 0.62;

    if (g.gap > 0) {
      /* ---- bridge band: pier bars + a deterministic lintel over the gap ---- */
      const w = g.c1 - g.c0 + 1;
      const g0 = g.c0 + Math.floor((w - g.gap) / 2);
      const g1 = g0 + g.gap - 1;
      // bottom row: two pier segments of single-row bars (fully supported)
      const bottomPieces: Pt[][] = [
        ...(tileStrip(rng, BAR_BAG, S1, g.c0, g0 - 1, sw, 0.99) ?? forcedBarStrip(S1, g.c0, g0 - 1)),
        ...(tileStrip(rng, BAR_BAG, S1, g1 + 1, g.c1, sw, 0.99) ?? forcedBarStrip(S1, g1 + 1, g.c1)),
      ];
      // pier-top bars adjacent to the gap are key blocks
      for (const p of bottomPieces) {
        const key = p.some(([c]) => c === g0 - 1 || c === g1 + 1);
        drafts.push({ cells: p.map(([c, dr]) => [c, r0 + dr] as Pt), kind: 'normal', key });
      }
      // top row: one lintel bar straddling the gap (rests on both pier tops),
      // then ordinary bars on both sides
      const lintelW = g.gap + 2;
      const lintelSt = lintelW <= 4 ? S1.Q4 : S1.W5;
      const lintelC0 = g0 - 1;
      const lintel = lintelSt.pieces[0].map(([dc]) => [lintelC0 + dc, 0] as Pt);
      const pierSw: SupportWin = { c0: g.c0, c1: g.c1, gap: [g0, g1] };
      const topPieces: Pt[][] = [
        ...(tileStrip(rng, BAR_BAG, S1, g.c0, lintelC0 - 1, pierSw, 0.9) ?? forcedBarStrip(S1, g.c0, lintelC0 - 1)),
        lintel,
        ...(tileStrip(rng, BAR_BAG, S1, lintelC0 + lintelW, g.c1, pierSw, 0.9) ?? forcedBarStrip(S1, lintelC0 + lintelW, g.c1)),
      ];
      for (const p of topPieces) {
        const minC = Math.min(...p.map(([c]) => c));
        const maxC = Math.max(...p.map(([c]) => c));
        const isLintel = minC <= g0 - 1 && maxC >= g1 + 1;
        drafts.push({ cells: p.map(([c, dr]) => [c, r0 + 1 + dr] as Pt), kind: 'normal', key: isLintel });
      }
      for (let beta = 0; beta < COLS - 1; beta++) crackRun[beta] = 0;
      continue;
    }

    /* ---- normal / waist / shifted / ice / top bands ---- */
    const table = single ? S1 : S2;
    // band directly below a bridge: long interlocking bars only, so the pier
    // point-loads spread sideways instead of shoving one small piece out
    const belowBridge = !single && b + 1 < bandCount && geoms[b + 1].gap > 0;
    const bag = single ? TOP_BAND_BAG : belowBridge ? ['I4', 'I3', 'I4', 'I3', 'HH2'] : g.ice ? ICE_BAG : def.bag;
    let cells: Pt[][];
    if (b === bandCount - 1) {
      cells = tileTopBand(rng, single, crackRun, g.c0, g.c1, sw);
    } else {
      let tiled: Pt[][] | null = null;
      for (let attempt = 0; attempt < 36 && !tiled; attempt++) {
        const t = tileStrip(rng, bag, table, g.c0, g.c1, sw, minFrac);
        if (!t) continue;
        let ok = true;
        if (g.c1 - g.c0 + 1 >= winCols) {
          for (let beta = g.c0; beta < g.c1; beta++) {
            if (crackRun[beta] >= 2 && !spansBoundary(t, beta)) {
              ok = false;
              break;
            }
          }
        }
        if (ok) tiled = t;
      }
      cells = tiled ?? forcedBarStrip(table, g.c0, g.c1);
    }
    for (let beta = 0; beta < COLS - 1; beta++) {
      crackRun[beta] = spansBoundary(cells, beta) ? 0 : crackRun[beta] + 1;
    }

    for (const piece of cells) {
      const isIcePiece = g.ice && piece.every(([, dr]) => dr === 0);
      // key-block flags: waist-neck pieces, or pieces with marginal support
      let key = false;
      if (waistKeyBands.has(b) && (waistCols.get(b) ?? winCols) < winCols) key = true;
      if (!key && b > 0) {
        const chk = supportCheck(piece, sw, 0.99);
        if (chk.frac < 0.8) key = true;
      }
      drafts.push({
        cells: piece.map(([c, dr]) => [c, r0 + dr] as Pt),
        kind: isIcePiece ? 'ice' : 'normal',
        key,
      });
    }
  }

  /* ---- pixel conversion (flush cells; renderer draws the seams) ---- */
  const blocks: BlockSpec[] = drafts.map((d) => {
    let minRow = Infinity;
    let maxRow = -Infinity;
    const cells: CellSpec[] = d.cells.map(([col, row]) => {
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      return {
        col,
        row,
        dx: bandShift.get(Math.floor(row / 2)) ?? 0,
        dy: 0,
        w: CELL,
        h: CELL,
      };
    });
    return { cells, row: minRow, topRow: maxRow, kind: d.kind, key: d.key || undefined };
  });

  /* ---- heavy pieces: some forced high (top-heavy), rest scattered ---- */
  const heaviableTop = blocks.filter((b) => b.kind === 'normal' && b.row >= N - 5 && b.topRow < N - 1 && !b.key);
  const heaviableAny = blocks.filter((b) => b.kind === 'normal' && b.topRow < N - 1 && !b.key && !heaviableTop.includes(b));
  const shuffle = <T,>(arr: T[]): T[] => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  shuffle(heaviableTop);
  shuffle(heaviableAny);
  let heavyLeft = def.heavyBlocks;
  for (const b of heaviableTop.slice(0, Math.min(def.heavyTop ?? 0, heavyLeft))) {
    b.kind = 'heavy';
    heavyLeft--;
  }
  for (const b of heaviableAny.slice(0, heavyLeft)) b.kind = 'heavy';

  /* ---- hero spawn: center of the top band window ---- */
  const topGeom = geoms[bandCount - 1];
  const ballX = TILE_X + ((topGeom.c0 + topGeom.c1 + 1) / 2) * CELL + (bandShift.get(bandCount - 1) ?? 0);

  return {
    rows: N,
    blocks,
    ballX,
    beamW: platformWidth(winCols),
    heroTune: def.hero ?? DEFAULT_HERO,
  };
}
