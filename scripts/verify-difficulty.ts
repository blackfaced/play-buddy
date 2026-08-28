/**
 * Headless difficulty measurement — drives the REAL GameEngine (headless
 * mode, synthetic clock) with two auto-players per (level, variant):
 *
 *  - random:  removes a uniformly random block every ~0.75 s ("乱消").
 *             Output: hero fall-off rate per level (the difficulty signal).
 *  - careful: waits for the tower to go calm, avoids key blocks, digs out
 *             blocks under the hero shallowest-first ("谨慎玩家").
 *             Output: clear rate per level (the fairness signal — a
 *             careful path must exist for every variant).
 *
 * Usage:
 *   npx tsc -p tsconfig.verify.json && node node_modules/.tmp-verify/scripts/verify-difficulty.js
 *   flags: --levels 5,6   --random 12   --careful 2   --seed 1
 */
import { GameEngine, type RoundStats } from '../src/game/engine';
import { LEVELS, VARIANTS_PER_LEVEL, mulberry32 } from '../src/game/levels';

const TICK = 1000 / 60;

/* ---------------- CLI ---------------- */
function arg(name: string, dflt: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const ONLY_LEVELS = new Set(
  arg('levels', '')
    .split(',')
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= LEVELS.length),
);
const RANDOM_RUNS = parseInt(arg('random', '12'), 10); // per variant
const CAREFUL_RUNS = parseInt(arg('careful', '2'), 10); // per variant
const BASE_SEED = parseInt(arg('seed', '7'), 10);

/* ---------------- harness ---------------- */
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

/** fresh round on a fresh engine at an exact variant index */
function freshRound(h: Harness, levelIdx: number, variant: number): void {
  // newRound() advances the attempt counter → cycle until we hit the variant
  for (let i = 0; i <= VARIANTS_PER_LEVEL; i++) {
    h.engine.newRound(levelIdx, 0);
    if (h.engine.debugVariant() === variant) break;
  }
  h.engine.beginPlay();
  for (let i = 0; i < 30; i++) h.engine.advance(TICK); // 0.5 s ready settle
}

interface RunResult {
  outcome: RoundStats['outcome'];
  removed: number;
  simMs: number;
}

/* ---------------- random-mash player ---------------- */
function playRandom(levelIdx: number, variant: number, seed: number): RunResult {
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
    if (blocks.length > 0) {
      const pick = blocks[Math.floor(rng() * blocks.length)];
      h.engine.debugRemoveId(pick.id);
    }
    advance(45); // ~0.75 s between pops
  }
  advance(400); // let any pending celebration finish
  const over = h.over ?? { outcome: 'timeout' as const, removed: 0 };
  const res = { outcome: over.outcome, removed: over.removed ?? 0, simMs };
  h.engine.destroy();
  return res;
}

/* ---------------- careful player ---------------- */
const CALM_SPEED = 0.45;

function playCareful(levelIdx: number, variant: number, seed: number): RunResult {
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
  const waitCalm = () => {
    // a careful kid waits until the tower AND the hero are both calm before
    // popping the next block (never digs while the hero is still rolling)
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
    // center-chimney strategy: carve a vertical shaft under the hero toward
    // the tower centerline (x=360) so the hero descends in the middle of the
    // tower and never wanders near a side edge; key blocks only when forced.
    const CENTER = 360;
    const belowNonKey = blocks
      .filter((b) => !b.key && b.y > hero.y + 8)
      .sort(
        (a, b) =>
          (a.y - hero.y) * 0.8 + Math.abs(a.x - CENTER) - ((b.y - hero.y) * 0.8 + Math.abs(b.x - CENTER)),
      );
    const under = blocks
      .filter((b) => b.y > hero.y + 8)
      .sort((a, b) => {
        const ka = a.key ? 1 : 0;
        const kb = b.key ? 1 : 0;
        if (ka !== kb) return ka - kb;
        const da = Math.abs(a.x - hero.x) + (a.y - hero.y) * 0.8;
        const db = Math.abs(b.x - hero.x) + (b.y - hero.y) * 0.8;
        return da - db;
      });
    // nothing below: finish the all-clear by peeling topmost non-key blocks
    const rest = [...blocks].sort((a, b) => (a.key ? 1 : 0) - (b.key ? 1 : 0) || a.y - b.y);
    const pick = belowNonKey[0] ?? under[0] ?? rest[0];
    if (!pick) {
      advance(60);
      continue;
    }
    if (process.env.DEBUG_CAREFUL) {
      console.log(
        `  t=${(simMs / 1000).toFixed(1)} hero=(${hero.x.toFixed(0)},${hero.y.toFixed(0)}) ` +
          `pop id=${pick.id} key=${!!pick.key} at=(${pick.x.toFixed(0)},${pick.y.toFixed(0)}) left=${blocks.length}`,
      );
    }
    h.engine.debugRemoveId(pick.id);
    advance(24); // ~0.4 s, then re-check calm
    void rng;
  }
  advance(400);
  const over = h.over ?? { outcome: 'timeout' as const, removed: 0 };
  const res = { outcome: over.outcome, removed: over.removed ?? 0, simMs };
  h.engine.destroy();
  return res;
}

/* ---------------- driver ---------------- */
interface LevelReport {
  level: number;
  randomRuns: number;
  fall: number;
  clear: number;
  timeout: number;
  carefulRuns: number;
  carefulClear: number;
  carefulFall: number;
  carefulTimeout: number;
  variantsWithoutCarefulPath: number[];
}

const reports: LevelReport[] = [];
console.log(
  `Difficulty sim: ${ONLY_LEVELS.size || LEVELS.length} levels × ${VARIANTS_PER_LEVEL} variants, ` +
    `${RANDOM_RUNS} random + ${CAREFUL_RUNS} careful runs per variant\n`,
);

for (let i = 0; i < LEVELS.length; i++) {
  const lv = LEVELS[i];
  if (ONLY_LEVELS.size > 0 && !ONLY_LEVELS.has(lv.id)) continue;
  const rep: LevelReport = {
    level: lv.id,
    randomRuns: 0,
    fall: 0,
    clear: 0,
    timeout: 0,
    carefulRuns: 0,
    carefulClear: 0,
    carefulFall: 0,
    carefulTimeout: 0,
    variantsWithoutCarefulPath: [],
  };
  for (let v = 0; v < VARIANTS_PER_LEVEL; v++) {
    for (let r = 0; r < RANDOM_RUNS; r++) {
      const res = playRandom(i, v, BASE_SEED * 1000 + lv.id * 100 + v * 10 + r);
      rep.randomRuns++;
      if (res.outcome === 'fall') rep.fall++;
      else if (res.outcome === 'clear') rep.clear++;
      else rep.timeout++;
    }
    let variantClears = 0;
    for (let r = 0; r < CAREFUL_RUNS; r++) {
      const res = playCareful(i, v, BASE_SEED * 1000 + 5555 + lv.id * 100 + v * 10 + r);
      rep.carefulRuns++;
      if (res.outcome === 'clear') {
        rep.carefulClear++;
        variantClears++;
      } else if (res.outcome === 'fall') rep.carefulFall++;
      else rep.carefulTimeout++;
    }
    if (variantClears === 0) rep.variantsWithoutCarefulPath.push(v);
  }
  reports.push(rep);
  const fallPct = ((100 * rep.fall) / rep.randomRuns).toFixed(0);
  const carefulPct = ((100 * rep.carefulClear) / rep.carefulRuns).toFixed(0);
  console.log(
    `L${String(lv.id).padEnd(2)} random: fall ${String(rep.fall).padStart(2)}/${rep.randomRuns} (${fallPct}%), ` +
      `clear ${rep.clear}, timeout ${rep.timeout}  |  careful: clear ${rep.carefulClear}/${rep.carefulRuns} (${carefulPct}%)` +
      ` [fall ${rep.carefulFall}, timeout ${rep.carefulTimeout}]` +
      (rep.variantsWithoutCarefulPath.length
        ? `  ⚠ variants without careful path: ${rep.variantsWithoutCarefulPath.join(',')}`
        : ''),
  );
}

console.log('\nlevel  randomFall%  randomClear%  randomTimeout%  carefulClear%  carefulPathAllVariants');
let ok = true;
for (const r of reports) {
  const f = (100 * r.fall) / r.randomRuns;
  const c = (100 * rep2clear(r)) / r.randomRuns;
  const t = (100 * r.timeout) / r.randomRuns;
  const cc = (100 * r.carefulClear) / r.carefulRuns;
  const pathAll = r.variantsWithoutCarefulPath.length === 0;
  if (!pathAll) ok = false;
  console.log(
    `L${String(r.level).padEnd(6)}${f.toFixed(0).padStart(11)}${c.toFixed(0).padStart(14)}${t
      .toFixed(0)
      .padStart(15)}${cc.toFixed(0).padStart(15)}  ${pathAll ? 'YES' : 'NO ✘'}`,
  );
}
function rep2clear(r: LevelReport): number {
  return r.clear;
}
console.log(ok ? '\nCAREFUL PATH EXISTS FOR ALL VARIANTS ✔' : '\nSOME VARIANTS HAVE NO CAREFUL PATH ✘');
process.exit(ok ? 0 : 1);
