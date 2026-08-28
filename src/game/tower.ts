/**
 * Shared physics-world construction for the balance-blocks tower.
 * Used by the game engine AND the headless stability verification script,
 * so both build byte-identical worlds.
 *
 * Blocks are tetromino-style compound bodies (Body.create with rectangle
 * parts — never fromVertices, so no concave decomposition is involved).
 * The hero is a hexagon (visual) with an octagon collider and Six!-style
 * tuning: rolling resistance (frictionAir), capped grip, and explicit
 * narrow-perch imbalance (perchWobbleTick) so single-point supports tip
 * over like real physics instead of freezing via sleep.
 */
import Matter from 'matter-js';
import { CELL, TILE_X, type BlockKind, type TowerSpec } from './levels';

export const WORLD_W = 720;
export const WORLD_H = 900;
/** default platform width; each level overrides with tower-width + margin */
export const BEAM_W = 312;
export const BEAM_H = 24;
export const BEAM_X = 360;
export const BEAM_Y = 800; // center
export const BEAM_TOP = BEAM_Y - BEAM_H / 2; // 788
export const BEAM_LEFT = BEAM_X - BEAM_W / 2; // 204
export const BEAM_RIGHT = BEAM_X + BEAM_W / 2; // 516
export const HEX_R = 26; // hexagon circumradius (corner to center)
/** half the hexagon height (flat edge to center) */
export const HEX_HALF_H = Math.round((HEX_R * Math.sqrt(3)) / 2); // ~23
/** collider side count (visual is the hexagon). Stays at 8 ON PURPOSE:
 *  rounder colliders (12/20-gon, circle) were tried for the narrow-perch
 *  fix and all broke the tuned difficulty curve — a roll-happier hero
 *  wanders off the careful center-chimney descent (measured: careful clear
 *  rate collapsed to 0-50% on L30-L91) — and a true circle even slow-creeps
 *  on the microscopic tilts of a settled 44-row tower top, failing idle
 *  stability. The perch fix below works with the octagon because the wobble
 *  supplies the initial imbalance the flat face lacks. */
export const HERO_SIDES = 8;
export const PX_PER_M = 32;
export const SENSOR_Y = 960;

/** Checkpoint dashed lines: every 3 tower rows, stopped short of the beam. */
export const CHECKPOINT_SPAN = 3;
export const CHECKPOINT_BONUS_SEC = 3;

/** World Y of the top of a `rows`-row tower whose BOTTOM sits at yBase
 *  (default: the level-mode beam top). Endless segments pass their own base. */
export function towerTopY(rows: number, yBase = BEAM_TOP): number {
  return yBase - rows * CELL;
}

export function heroSpawnY(rows: number, yBase = BEAM_TOP): number {
  return towerTopY(rows, yBase) - HEX_HALF_H - 2;
}

/** World Y of each checkpoint line for a tower of `rows` rows (bottom at yBase). */
export function checkpointYs(rows: number, yBase = BEAM_TOP): number[] {
  const ys: number[] = [];
  const top = towerTopY(rows, yBase);
  for (let k = 1; ; k++) {
    const y = top + k * CHECKPOINT_SPAN * CELL;
    if (y > yBase - 40) break;
    ys.push(y);
  }
  return ys;
}

/**
 * Physics timestep. The game and the verifier both advance the world in
 * SUBSTEP increments (2 per 60fps tick): tall towers (up to 32 rows) only
 * converge without sag / squeeze-out pops when dt stays small.
 */
export const PHYS_DT = 1000 / 60;
export const PHYS_SUBSTEPS = 2;

/**
 * Cloud landing assist (mutable so headless tuners can calibrate it).
 * Near the platform, a slowly-creeping hero gets its sideways drift bled
 * off plus a tiny centering pull — a careful descent ending a few px off
 * the beam edge shouldn't be a fall. maxSpeed is deliberately low (was 1.5
 * pre-realism): a genuinely rolling hero is left to honest physics.
 */
export const LANDING_ASSIST = {
  /** first 1-based level the assist applies to (1 = everywhere: with the
   *  realistic roll-happy hero, the cloud catch-net is what keeps the
   *  teaching levels fair — it only ever touches a slow creep, never a roll) */
  minLevel: 1,
  /** activation zone: this many px above the beam */
  zonePx: 330,
  /** only steer heroes slower than this */
  maxSpeed: 1.2,
  /** max centering pull per tick (px/tick) */
  pull: 0.5,
  /** sideways velocity kept per tick */
  damp: 0.95,
};

/** Engine options shared by game + verifier. */
export function createPhysicsEngine(): Matter.Engine {
  return Matter.Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 });
}

/** Advance the world one 60fps tick (with substeps). */
export function stepPhysics(engine: Matter.Engine): void {
  for (let i = 0; i < PHYS_SUBSTEPS; i++) Matter.Engine.update(engine, PHYS_DT / PHYS_SUBSTEPS);
}

/** Platform beam + two legs. Beam width is level-dependent (tower footprint + a small side margin). */
export function createStatics(beamW = BEAM_W): Matter.Body[] {
  const beam = Matter.Bodies.rectangle(BEAM_X, BEAM_Y, beamW, BEAM_H, {
    isStatic: true,
    chamfer: { radius: 6 },
    // grippy cloud: a hero touching down with sideways speed must bleed it
    // off instead of rolling off the end of the (narrower) platform.
    // Capped at 1.5 (was 2.2): beyond that the beam glued the hexagon in
    // place even when it overhung the edge — "该滚不滚" fake stability.
    friction: 1.5,
    label: 'beam',
  });
  // support legs tucked under the beam ends (narrow platforms: legs move inward)
  const legW = Math.min(100, beamW * 0.45);
  const legOff = Math.max(legW / 2, beamW / 2 - 45);
  const legL = Matter.Bodies.rectangle(BEAM_X - legOff, 847, legW, 70, {
    isStatic: true,
    chamfer: { radius: 6 },
    label: 'leg',
  });
  const legR = Matter.Bodies.rectangle(BEAM_X + legOff, 847, legW, 70, {
    isStatic: true,
    chamfer: { radius: 6 },
    label: 'leg',
  });
  return [beam, legL, legR];
}

/** A cell rect in body-local coordinates (origin = body center of mass). */
export interface LocalCell {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CreatedBlock {
  body: Matter.Body;
  row: number;
  topRow: number;
  kind: BlockKind;
  /** structural key block (visual warning + auto-player hint) */
  key?: boolean;
  cells: LocalCell[];
}

function blockOptions(kind: BlockKind, isTop: boolean): Matter.IChamferableBodyDefinition {
  const base: Matter.IChamferableBodyDefinition = {
    chamfer: { radius: 3 },
    restitution: 0.05,
    label: 'block',
    // re-sleep quickly once settled: tall towers otherwise accumulate
    // numerical creep (blocks "walk" off the stack over several seconds)
    sleepThreshold: 30,
  };
  // top-band faces form the hero's STARTING PAD: extra grip there (blocks
  // aren't hero/platform — the 0.7 / 1.6 realism caps don't apply) so the
  // hero gets a fair, sure-footed start before each descent; mid-tower
  // faces stay at honest friction so tilted supports still let go
  if (kind === 'ice') {
    return { ...base, density: 0.0009, friction: isTop ? 1.3 : 0.12, frictionAir: 0.008 };
  }
  if (kind === 'heavy') {
    return { ...base, density: 0.0028, friction: isTop ? 1.3 : 0.6, frictionAir: 0.012, restitution: 0.04 };
  }
  return { ...base, density: 0.001, friction: isTop ? 1.3 : 0.55, frictionAir: 0.01 };
}

export function createBlocks(spec: TowerSpec, yBase = BEAM_TOP): CreatedBlock[] {
  const top = spec.rows - 1;
  return spec.blocks.map((b) => {
    const opts = blockOptions(b.kind, b.topRow === top);
    const parts = b.cells.map((cell) => {
      const cx = TILE_X + cell.col * CELL + CELL / 2 + cell.dx;
      const cy = yBase - CELL / 2 - cell.row * CELL + cell.dy;
      return Matter.Bodies.rectangle(cx, cy, cell.w, cell.h, opts);
    });
    const body = parts.length === 1 ? parts[0] : Matter.Body.create({ parts, ...opts });
    const partList = body.parts.length > 1 ? body.parts.slice(1) : [body];
    const cells: LocalCell[] = partList.map((p, i) => ({
      x: p.position.x - body.position.x,
      y: p.position.y - body.position.y,
      w: b.cells[i].w,
      h: b.cells[i].h,
    }));
    return { body, row: b.row, topRow: b.topRow, kind: b.kind, key: b.key, cells };
  });
}

/**
 * The hexagon hero (visual) with an octagon physics body. Tuning is
 * per-level (higher levels get a livelier hero), but hard-capped for
 * realism: inertia ≤ ~2.5× and friction ≤ 0.7.
 *
 * sleepThreshold 90 (default 60): the hero must not doze off while a slow
 * roll is still resolving — a sleeping body freezes mid-slope. Known limit:
 * the octagon's flat bottom face is a stable base, so a perfectly-centered
 * perch on a narrow (≤1-cell) support never tips on its own — Matter's
 * solver finds the exact equilibrium, then sleep freezes it (the
 * "珠子立着不倒" complaint). perchWobbleTick() below simulates the ambient
 * imbalance that tips a real body. (Rounder colliders were tried and
 * rejected — see HERO_SIDES.)
 */
export function createHero(spec: TowerSpec, yBase = BEAM_TOP): Matter.Body {
  const tune = spec.heroTune;
  const hero = Matter.Bodies.polygon(spec.ballX, heroSpawnY(spec.rows, yBase), HERO_SIDES, HEX_R, {
    density: 0.0012,
    friction: tune.friction,
    frictionAir: tune.frictionAir, // rolling-resistance stand-in (soft beanbag), keeps a settled hero put
    restitution: 0.1,
    label: 'hero',
    sleepThreshold: 90,
  });
  Matter.Body.setInertia(hero, hero.inertia * tune.inertia);
  return hero;
}

/**
 * Narrow-perch instability (mutable so headless verifiers can calibrate it).
 * Real physics: a body parked on a support narrower than ~its own footprint
 * cannot balance forever — ambient asymmetries always tip it. Matter's
 * solver, though, finds the PERFECT equilibrium (then sleep freezes it), so
 * the imbalance is simulated explicitly: a hero that has been sitting calmly
 * on a sub-cell perch for a moment is woken and given a tiny nudge + spin
 * BIASED away from the perch midline (that is what gravity's torque does to
 * a real body whose center of mass is off the contact point; a pure random
 * walk was measured to NOT reliably tip the heavily-damped teaching tunes).
 * The push RAMPS IN over ~rampMs of continuous
 * calm perching: a hero briefly pausing mid-descent (a careful player
 * lining up the next pop) feels nothing, while a hero parked indefinitely
 * on a point (the "立着不倒" complaint) accumulates wobble until honest
 * gravity/rolling tips it off. Amplitude is deliberately small: the nudge
 * alone cannot shove the hero off anything, it only walks the center of
 * mass off the perch midline. Supports ≥ 1 cell wide (every fair landing:
 * the cloud beam, normal stacks) are never touched.
 */
export const PERCH_WOBBLE = {
  /** perches narrower than this (px) are unstable; CELL+1 so exactly-1-cell counts */
  maxSupportW: CELL + 1,
  /** only a near-stationary hero is nudged (a moving one is honest physics) */
  maxSpeed: 0.7,
  /** max horizontal nudge per tick at full strength (px/tick) */
  push: 0.5,
  /** matching micro spin per tick at full strength, same sign as the nudge */
  spin: 0.04,
  /** off-midline gain (1/px): push saturates once the hero is 1/gain off center */
  biasGain: 0.3,
  /** continuous calm-perch time (ms) before the wobble reaches full strength */
  rampMs: 1500,
};

export interface HeroSupport {
  /** width (px) of the supporting surface under the hero */
  w: number;
  /** horizontal midline (world x) of that surface */
  mid: number;
}

/**
 * The surface directly supporting the hero, or null while airborne.
 * Sums every block whose top face is level with the support surface and
 * under the hero's footprint, so a hero straddling a SEAM between two
 * adjacent blocks correctly reads as one wide support.
 */
export function heroSupport(
  hero: Matter.Body,
  blocks: Matter.Body[],
  beamLeft: number,
  beamRight: number,
  beamW: number,
): HeroSupport | null {
  const bottom = hero.position.y + HEX_HALF_H;
  // the cloud beam is always a wide, honest support (never a perch)
  if (
    Math.abs(bottom - BEAM_TOP) < 16 &&
    hero.position.x > beamLeft - HEX_R &&
    hero.position.x < beamRight + HEX_R
  ) {
    return { w: beamW, mid: (beamLeft + beamRight) / 2 };
  }
  let bestTop = -Infinity;
  for (const b of blocks) {
    const top = b.bounds.min.y;
    if (Math.abs(top - bottom) > 12) continue;
    if (hero.position.x < b.bounds.min.x - HEX_R || hero.position.x > b.bounds.max.x + HEX_R) continue;
    if (top > bestTop) bestTop = top;
  }
  if (bestTop === -Infinity) return null;
  let left = Infinity;
  let right = -Infinity;
  for (const b of blocks) {
    if (Math.abs(b.bounds.min.y - bestTop) > 4) continue;
    if (b.bounds.max.x < hero.position.x - HEX_R || b.bounds.min.x > hero.position.x + HEX_R) continue;
    left = Math.min(left, b.bounds.min.x);
    right = Math.max(right, b.bounds.max.x);
  }
  return { w: right - left, mid: (left + right) / 2 };
}

/**
 * One tick of narrow-perch imbalance, including the ramp bookkeeping.
 * `perchMs` is the caller's persistent accumulator (ms of continuous calm
 * perching, 0 to start); the updated value is returned. While the hero is
 * calm AND on a sub-cell support the accumulator grows and a ramped
 * (perchMs/rampMs) random nudge is applied; otherwise it resets to 0.
 * Called by the game engine every physics tick (and by the headless
 * verifier, same as the world builders). `rng` is caller-supplied so
 * headless difficulty runs stay deterministic.
 */
export function perchWobbleTick(
  hero: Matter.Body,
  blocks: Matter.Body[],
  beamLeft: number,
  beamRight: number,
  beamW: number,
  rng: () => number,
  perchMs: number,
  dtMs: number,
  sensorY = SENSOR_Y, // endless passes its (descending) frontier instead
): number {
  if (hero.position.y > sensorY || hero.speed > PERCH_WOBBLE.maxSpeed) return 0;
  const sup = heroSupport(hero, blocks, beamLeft, beamRight, beamW);
  if (sup === null || sup.w >= PERCH_WOBBLE.maxSupportW) return 0;
  const next = Math.min(PERCH_WOBBLE.rampMs, perchMs + dtMs);
  const strength = next / PERCH_WOBBLE.rampMs;
  Matter.Sleeping.set(hero, false); // a perched sleeper must feel the nudge
  // imbalance amplification: push AWAY from the perch midline, proportional
  // to the off-center distance (this is what gravity's torque does to a
  // real body whose center of mass is off the contact point), plus a small
  // random term to break the exactly-centered symmetry. A pure random walk
  // was measured to NOT reliably tip heavily-damped (teaching-tune) heroes.
  const dx = hero.position.x - sup.mid;
  const bias = Math.max(-1, Math.min(1, dx * PERCH_WOBBLE.biasGain));
  const n = (bias + (rng() - 0.5) * 2 * 0.35) * PERCH_WOBBLE.push * strength;
  Matter.Body.setVelocity(hero, { x: hero.velocity.x + n, y: hero.velocity.y });
  Matter.Body.setAngularVelocity(hero, hero.angularVelocity + n * PERCH_WOBBLE.spin);
  return next;
}

/** Pre-settle the freshly built tower (same routine engine uses). */
export function preSettle(engine: Matter.Engine, blocks: Matter.Body[], hero: Matter.Body, rows = 12): void {
  // tall stacks need a longer gravity pass to fully converge before sleep
  const steps = 120 + rows * 8;
  for (let i = 0; i < steps; i++) stepPhysics(engine);
  for (const b of blocks) {
    Matter.Sleeping.set(b, true);
    Matter.Body.setVelocity(b, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(b, 0);
  }
  Matter.Sleeping.set(hero, true);
  Matter.Body.setVelocity(hero, { x: 0, y: 0 });
  Matter.Body.setAngularVelocity(hero, 0);
}
