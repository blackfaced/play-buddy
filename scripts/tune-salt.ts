/**
 * Salt-search tuner: for each requested level, try def.salt = 0..N and report
 *  - idle stability (same routine as verify-towers, both variants, +0/+6 rows)
 *  - random-mash fall rate and careful clear rate (same players as
 *    verify-difficulty, fewer runs for speed)
 *
 * Usage: npx tsc -p tsconfig.verify.json &&
 *   node node_modules/.tmp-verify/scripts/tune-salt.js --levels 31,32 --salts 8 --random 6 --careful 1
 */
import Matter from 'matter-js';
import { GameEngine, type RoundStats } from '../src/game/engine';
import { LEVELS, VARIANTS_PER_LEVEL, generateTower, mulberry32 } from '../src/game/levels';
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

const TICK = 1000 / 60;

function arg(name: string, dflt: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const ONLY_LEVELS = arg('levels', '')
  .split(',')
  .map((s) => parseInt(s, 10))
  .filter((n) => Number.isFinite(n) && n >= 1 && n <= LEVELS.length);
const MAX_SALT = parseInt(arg('salts', '8'), 10);
const SALT0 = parseInt(arg('salt0', '0'), 10);
const RANDOM_RUNS = parseInt(arg('random', '6'), 10);
const CAREFUL_RUNS = parseInt(arg('careful', '1'), 10);
const BASE_SEED = parseInt(arg('seed', '7'), 10);
const SKIP_DIFF = process.argv.includes('--stab-only');

/* -------- stability (verify-towers routine) -------- */
function stable(levelIdx: number, variant: number, extraRows: number): boolean {
  const spec = generateTower(levelIdx, variant, extraRows);
  const engine = createPhysicsEngine();
  const bodies = createBlocks(spec).map((c) => c.body);
  const hero = createHero(spec);
  Matter.Composite.add(engine.world, [...createStatics(spec.beamW), ...bodies, hero]);
  const beamLeft = BEAM_X - spec.beamW / 2;
  const beamRight = BEAM_X + spec.beamW / 2;
  preSettle(engine, bodies, hero, spec.rows);
  for (const b of bodies) Matter.Sleeping.set(b, false);
  Matter.Sleeping.set(hero, false);
  const spawn = bodies.map((b) => ({ x: b.position.x, y: b.position.y }));
  for (let i = 0; i < Math.round(15000 / PHYS_DT); i++) stepPhysics(engine);
  let maxDisp = 0;
  let maxAngle = 0;
  let endSpeed = 0;
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    maxDisp = Math.max(maxDisp, Math.hypot(b.position.x - spawn[i].x, b.position.y - spawn[i].y));
    maxAngle = Math.max(maxAngle, Math.abs(b.angle));
    endSpeed = Math.max(endSpeed, b.speed);
  }
  const heroOk = hero.position.x > beamLeft - 2 && hero.position.x < beamRight + 2 && hero.position.y < SENSOR_Y;
  return maxDisp < 20 && maxAngle < 0.11 && endSpeed < 0.8 && heroOk && hero.speed < 1.0;
}

/* -------- difficulty players (verify-difficulty routines) -------- */
interface Harness {
  engine: GameEngine;
  over: RoundStats | null;
}
function makeEngine(): Harness {
  const h: Harness = { engine: null as unknown as GameEngine, over: null };
  h.engine = new GameEngine(
    {} as HTMLCanvasElement,
    { onLive: () => undefined, onGameOver: (s) => { h.over = s; }, onReady: () => undefined },
    { headless: true },
  );
  return h;
}
function freshRound(h: Harness, levelIdx: number, variant: number): void {
  for (let i = 0; i <= VARIANTS_PER_LEVEL; i++) {
    h.engine.newRound(levelIdx, 0);
    if (h.engine.debugVariant() === variant) break;
  }
  h.engine.beginPlay();
  for (let i = 0; i < 30; i++) h.engine.advance(TICK);
}
function playRandom(levelIdx: number, variant: number, seed: number): RoundStats['outcome'] {
  const h = makeEngine();
  freshRound(h, levelIdx, variant);
  const rng = mulberry32(seed);
  let simMs = 0;
  const advance = (ticks: number) => {
    for (let i = 0; i < ticks && !h.over; i++) {
      h.engine.advance(TICK);
      simMs += TICK;
    }
  };
  while (!h.over && simMs < 240_000) {
    const blocks = h.engine.debugBlocks();
    if (blocks.length > 0) h.engine.debugRemoveId(blocks[Math.floor(rng() * blocks.length)].id);
    advance(45);
  }
  advance(400);
  const out = h.over?.outcome ?? 'timeout';
  h.engine.destroy();
  return out;
}
const CALM_SPEED = 0.45;
function playCareful(levelIdx: number, variant: number, seed: number): RoundStats['outcome'] {
  const h = makeEngine();
  freshRound(h, levelIdx, variant);
  let simMs = 0;
  const advance = (ticks: number) => {
    for (let i = 0; i < ticks && !h.over; i++) {
      h.engine.advance(TICK);
      simMs += TICK;
    }
  };
  const waitCalm = () => {
    for (let i = 0; i < 200 && !h.over; i++) {
      if (h.engine.debugMaxSpeed() < CALM_SPEED && h.engine.debugHero().speed < 0.4) break;
      h.engine.advance(TICK);
      simMs += TICK;
    }
  };
  while (!h.over && simMs < 200_000) {
    waitCalm();
    if (h.over) break;
    const blocks = h.engine.debugBlocks();
    if (blocks.length === 0) {
      advance(30);
      continue;
    }
    const hero = h.engine.debugHero();
    const CENTER = 360;
    const belowNonKey = blocks
      .filter((b) => !b.key && b.y > hero.y + 8)
      .sort((a, b) => (a.y - hero.y) * 0.8 + Math.abs(a.x - CENTER) - ((b.y - hero.y) * 0.8 + Math.abs(b.x - CENTER)));
    const under = blocks
      .filter((b) => b.y > hero.y + 8)
      .sort((a, b) => {
        const ka = a.key ? 1 : 0;
        const kb = b.key ? 1 : 0;
        if (ka !== kb) return ka - kb;
        return Math.abs(a.x - hero.x) + (a.y - hero.y) * 0.8 - (Math.abs(b.x - hero.x) + (b.y - hero.y) * 0.8);
      });
    const rest = [...blocks].sort((a, b) => (a.key ? 1 : 0) - (b.key ? 1 : 0) || a.y - b.y);
    const pick = belowNonKey[0] ?? under[0] ?? rest[0];
    if (!pick) {
      advance(60);
      continue;
    }
    h.engine.debugRemoveId(pick.id);
    advance(24);
  }
  advance(400);
  const out = h.over?.outcome ?? 'timeout';
  h.engine.destroy();
  return out;
}

/* -------- driver -------- */
for (const lv of ONLY_LEVELS) {
  const i = lv - 1;
  console.log(`\n== L${lv} ==`);
  for (let salt = SALT0; salt <= MAX_SALT; salt++) {
    LEVELS[i].salt = salt === 0 ? undefined : salt;
    let stabOk = true;
    for (let v = 0; v < VARIANTS_PER_LEVEL && stabOk; v++) {
      for (const e of [0, 2, 4, 6]) {
        if (!stable(i, v, e)) {
          stabOk = false;
          break;
        }
      }
    }
    if (!stabOk) {
      console.log(`  salt ${salt}: UNSTABLE`);
      continue;
    }
    if (SKIP_DIFF) {
      console.log(`  salt ${salt}: stable`);
      continue;
    }
    let fall = 0;
    let cclear = 0;
    let ctot = 0;
    const noPath: number[] = [];
    for (let v = 0; v < VARIANTS_PER_LEVEL; v++) {
      for (let r = 0; r < RANDOM_RUNS; r++) {
        if (playRandom(i, v, BASE_SEED * 1000 + lv * 100 + v * 10 + r) === 'fall') fall++;
      }
      let vc = 0;
      for (let r = 0; r < CAREFUL_RUNS; r++) {
        ctot++;
        if (playCareful(i, v, BASE_SEED * 1000 + 5555 + lv * 100 + v * 10 + r) === 'clear') {
          cclear++;
          vc++;
        }
      }
      if (vc === 0) noPath.push(v);
    }
    const tot = RANDOM_RUNS * VARIANTS_PER_LEVEL;
    console.log(
      `  salt ${salt}: fall ${fall}/${tot} (${((100 * fall) / tot).toFixed(0)}%)  careful ${cclear}/${ctot}` +
        (noPath.length ? `  NO-PATH v${noPath.join(',')}` : ''),
    );
  }
}
