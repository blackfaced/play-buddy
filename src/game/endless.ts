/**
 * Endless mode ("每日挑战" / "自由无尽"): the tower extends downward
 * forever. This module owns the SEEDED segment sequence — which campaign
 * level's (stability-verified) tower spec is stamped as the next segment,
 * and how difficulty ramps with depth.
 *
 * Design:
 *  - Segments are full generateTower() specs, stacked flush: segment k+1's
 *    bottom row rests on segment k's top row. Reusing the campaign
 *    generator means every endless segment inherits its verified tiling,
 *    waist / ice / cantilever / heavy vocabulary and salt-tuned stability.
 *  - Difficulty: starts at campaign level 20 (0-based 19) and climbs one
 *    level per ~10 rows descended, capped at level 80 (0-based 79) so the
 *    column window stays within the requested 7~9 columns.
 *  - Daily challenge: the seed derives from the date (YYYYMMDD), so every
 *    player gets the same tower that day. Free practice uses a random seed
 *    and records nothing.
 *  - Narrow-perch note: campaign towers CAN produce 1-cell-wide bar tops;
 *    the engine's perchWobbleTick tips a hero parked on those (intended —
 *    a point support is unstable). The careful-descent verifier proves a
 *    100-row nonstop descent still works with that interaction live.
 */
import { generateTower, mulberry32, VARIANTS_PER_LEVEL, CELL, type TowerSpec } from './levels';

/** 0-based campaign level the endless descent starts at (L20). */
export const ENDLESS_START_LEVEL = 19;
/** 0-based cap (L80): keeps the tower window at 7 columns (never the brutal 6). */
export const ENDLESS_MAX_LEVEL = 79;
/** rows of depth per +1 difficulty level */
export const ENDLESS_ROWS_PER_LEVEL = 10;

/** World Y of the endless tower's top edge (matches a typical mid tower top). */
export const ENDLESS_TOP_Y = 200;
/** Generate the next segment while the hero is still this far above the frontier. */
export const ENDLESS_GEN_AHEAD_PX = 34 * CELL;
/** Lives per endless run. */
export const ENDLESS_LIVES = 3;

/** YYYYMMDD date key (from dateKeyOf) → deterministic daily seed. */
export function dailySeedFor(dateKey: string): number {
  const n = Number(dateKey.replace(/-/g, ''));
  // fold the date into a 31-bit seed (mulberry32-friendly)
  return (n * 2654435761) % 2147483647 || 1;
}

export interface EndlessSegment {
  /** stability-verified campaign tower spec for this segment */
  spec: TowerSpec;
  /** 0-based campaign level it was drawn from (difficulty readout) */
  levelIdx: number;
  /** world Y of this segment's bottom edge (= next segment's top edge) */
  baseY: number;
  /** rows in this segment */
  rows: number;
}

/**
 * Deterministic segment iterator for one endless run. The level ladder is
 * driven by CUMULATIVE rows descended; the seed picks each segment's
 * verified variant (and the starting level offset stays fixed).
 */
export class EndlessTower {
  readonly seed: number;
  private rng: () => number;
  private cumRows = 0;
  private nextBaseY = ENDLESS_TOP_Y;

  constructor(seed: number) {
    this.seed = seed;
    this.rng = mulberry32(seed);
  }

  /** rows descended so far (drives the difficulty ladder) */
  get depthRows(): number {
    return this.cumRows;
  }

  /** world Y where the next segment's bottom edge will sit */
  get frontierY(): number {
    return this.nextBaseY;
  }

  levelIdxFor(cumRows: number): number {
    const lvl = ENDLESS_START_LEVEL + Math.floor(cumRows / ENDLESS_ROWS_PER_LEVEL);
    return Math.min(lvl, ENDLESS_MAX_LEVEL);
  }

  next(): EndlessSegment {
    const levelIdx = this.levelIdxFor(this.cumRows);
    const variant = Math.floor(this.rng() * VARIANTS_PER_LEVEL);
    const spec = generateTower(levelIdx, variant, 0);
    const rows = spec.rows;
    const baseY = this.nextBaseY + rows * CELL;
    const seg: EndlessSegment = { spec, levelIdx, baseY, rows };
    this.cumRows += rows;
    this.nextBaseY = baseY;
    return seg;
  }
}
