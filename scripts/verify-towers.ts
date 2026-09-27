/**
 * Headless stability verification for every level tower.
 *
 * For each (level, variant) it builds the exact world the game builds,
 * pre-settles it, wakes all bodies (like beginPlay) and simulates 15 s
 * with zero input. A tower FAILS if it self-topples: block displacement /
 * rotation beyond tolerance, or the hexagon hero tumbling off the beam.
 *
 * Run:  npx tsc -p tsconfig.verify.json && node node_modules/.tmp-verify/scripts/verify-towers.js
 */
import Matter from 'matter-js';
import { LEVELS, VARIANTS_PER_LEVEL, REPLAY_GROW_ROWS, REPLAY_GROW_MAX, generateTower } from '../src/game/levels';
import {
  createPhysicsEngine,
  createStatics,
  createBlocks,
  createHero,
  preSettle,
  stepPhysics,
  PHYS_DT,
  BEAM_X,
  SENSOR_Y,
} from '../src/game/tower';

const SIM_SECONDS = 15;
const DT = PHYS_DT; // one 60fps tick (stepPhysics substeps internally, like the game)

// tolerances — a tower FAILS when it self-topples (blocks scatter thousands
// of px, residual speed > 0, hero leaves the beam). On tall (35–47 row) ice /
// cantilever towers, interface SETTLE creep accumulates per interface and can
// reach ~20 px with zero residual speed and the hero safe; that is benign
// bedding-in, not toppling, so the drift/rotation budget is 20 px / ~5.7°
// (calibrated for the 13–42 row, 50-level curve; collapses exceed it by 100×).
const MAX_DISP = 20; // px a block may drift from spawn
const MAX_ANGLE = 0.11; // rad (~6.3°)
const MAX_END_SPEED = 0.8;
const MAX_BALL_SPEED = 1.0;

interface Result {
  level: number;
  variant: number;
  extraRows: number;
  rows: number;
  blocks: number;
  maxDisp: number;
  maxAngle: number;
  endSpeed: number;
  ballDrift: number;
  ballSpeed: number;
  ballOk: boolean;
  pass: boolean;
}

function simulate(levelIdx: number, variant: number, extraRows: number): Result {
  const spec = generateTower(levelIdx, variant, extraRows);
  const engine = createPhysicsEngine();
  const created = createBlocks(spec);
  const bodies = created.map((c) => c.body);
  const hero = createHero(spec);
  Matter.Composite.add(engine.world, [...createStatics(spec.beamW), ...bodies, hero]);
  const beamLeft = BEAM_X - spec.beamW / 2;
  const beamRight = BEAM_X + spec.beamW / 2;

  preSettle(engine, bodies, hero, spec.rows);
  // beginPlay(): wake the whole tower, physics live, no player input
  for (const b of bodies) Matter.Sleeping.set(b, false);
  Matter.Sleeping.set(hero, false);

  const spawn = bodies.map((b) => ({ x: b.position.x, y: b.position.y }));
  const heroStart = { x: hero.position.x, y: hero.position.y };

  const steps = Math.round((SIM_SECONDS * 1000) / DT);
  for (let i = 0; i < steps; i++) stepPhysics(engine);

  let maxDisp = 0;
  let maxAngle = 0;
  let endSpeed = 0;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const disp = Math.hypot(b.position.x - spawn[i].x, b.position.y - spawn[i].y);
    maxDisp = Math.max(maxDisp, disp);
    maxAngle = Math.max(maxAngle, Math.abs(b.angle));
    endSpeed = Math.max(endSpeed, b.speed);
  }
  const heroDrift = Math.hypot(hero.position.x - heroStart.x, hero.position.y - heroStart.y);
  const heroOk =
    hero.position.x > beamLeft - 2 && hero.position.x < beamRight + 2 && hero.position.y < SENSOR_Y;
  const pass =
    maxDisp < MAX_DISP &&
    maxAngle < MAX_ANGLE &&
    endSpeed < MAX_END_SPEED &&
    heroOk &&
    hero.speed < MAX_BALL_SPEED;

  return {
    level: levelIdx + 1,
    variant,
    extraRows,
    rows: spec.rows,
    blocks: bodies.length,
    maxDisp,
    maxAngle,
    endSpeed,
    ballDrift: heroDrift,
    ballSpeed: hero.speed,
    ballOk: heroOk,
    pass,
  };
}

// replay-growth heights: base tower plus every reachable +2-step bonus
const EXTRA_ROWS: number[] = [];
for (let e = 0; e <= REPLAY_GROW_MAX; e += REPLAY_GROW_ROWS) EXTRA_ROWS.push(e);

/* optional --levels 1,2,3 sampling (default: all 50 levels) */
const argIdx = process.argv.indexOf('--levels');
const ONLY_LEVELS = new Set(
  (argIdx >= 0 ? process.argv[argIdx + 1] || '' : '')
    .split(',')
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= LEVELS.length),
);

let allPass = true;
console.log(
  `Simulating ${LEVELS.length} levels × ${VARIANTS_PER_LEVEL} variants × ${EXTRA_ROWS.length} heights (replay growth), ${SIM_SECONDS}s idle each\n`,
);
console.log(
  'lv  var  +rows  rows  blocks  maxDisp(px)  maxAngle(°)  endSpeed  heroDrift  heroSpeed  heroOnBeam  result',
);
for (let i = 0; i < LEVELS.length; i++) {
  if (ONLY_LEVELS.size > 0 && !ONLY_LEVELS.has(i + 1)) continue;
  for (let v = 0; v < VARIANTS_PER_LEVEL; v++) {
    for (const e of EXTRA_ROWS) {
      const r = simulate(i, v, e);
      if (!r.pass) allPass = false;
      console.log(
        [
          String(r.level).padEnd(3),
          String(r.variant).padEnd(4),
          String(r.extraRows).padEnd(6),
          String(r.rows).padEnd(5),
          String(r.blocks).padEnd(7),
          r.maxDisp.toFixed(2).padEnd(12),
          ((r.maxAngle * 180) / Math.PI).toFixed(2).padEnd(12),
          r.endSpeed.toFixed(3).padEnd(9),
          r.ballDrift.toFixed(2).padEnd(10),
          r.ballSpeed.toFixed(3).padEnd(10),
          String(r.ballOk).padEnd(11),
          r.pass ? 'PASS' : 'FAIL',
        ].join(' '),
      );
    }
  }
}
console.log(allPass ? '\nALL TOWERS STABLE ✔' : '\nSOME TOWERS UNSTABLE ✘');
process.exit(allPass ? 0 : 1);
