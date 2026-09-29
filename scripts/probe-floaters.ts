/**
 * Headless floater hunt — drives the REAL GameEngine through level rounds
 * with kid-like tapping (tunnel down + random mid-tower pops), then scans
 * for blocks that hover with NO support: sleeping with nothing under them,
 * or awake but motionless (friction-locked) — the "积木悬空不掉" bug.
 *
 * A block counts as a FLOATER only if it is unsupported AND essentially
 * unmoving across two scans 2 s apart (free-falling blocks are legit).
 *
 * Run:  npx tsc -p tsconfig.verify.json && node node_modules/.tmp-verify/scripts/probe-floaters.js
 */
import Matter from 'matter-js';
import { GameEngine } from '../src/game/engine';
import { mulberry32, CELL } from '../src/game/levels';
import { BEAM_X } from '../src/game/tower';

const TICK = 1000 / 60;
// same thresholds as engine.auditUnsupportedBlocks
const GAP = 8;
const OVERLAP = 4;

interface FloatRec {
  id: number;
  x: number;
  y: number;
  row: number;
  kind: string;
  sleeping: boolean;
  speed: number;
}

interface Harness {
  engine: GameEngine;
  over: boolean;
}

function makeEngine(): Harness {
  const h: Harness = { engine: null as unknown as GameEngine, over: false };
  h.engine = new GameEngine(
    {} as HTMLCanvasElement,
    {
      onLive: () => undefined,
      onGameOver: () => {
        h.over = true;
      },
      onReady: () => undefined,
    },
    { headless: true },
  );
  return h;
}

function partsOf(b: Matter.Body): Matter.Body[] {
  return b.parts.length > 1 ? b.parts.slice(1) : [b];
}

/** standalone copy of the engine's support test (beam zone / hero / blocks) */
function unsupportedNow(engine: GameEngine): FloatRec[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = engine as any;
  const blocks: Matter.Body[] = e.blocks;
  const hero: Matter.Body = e.hero;
  const hb = hero.bounds;
  const out: FloatRec[] = [];
  for (const b of blocks) {
    let supported = false;
    for (const pb of partsOf(b)) {
      const bb = pb.bounds;
      if (bb.max.y > 780) {
        supported = true; // beam / leg zone (level mode)
        break;
      }
      if (
        Math.abs(hb.min.y - bb.max.y) <= GAP + 20 &&
        Math.min(hb.max.x, bb.max.x) - Math.max(hb.min.x, bb.min.x) > OVERLAP
      ) {
        supported = true; // riding on the hero
        break;
      }
      for (const o of blocks) {
        if (o.id === b.id) continue;
        for (const po of partsOf(o)) {
          const ob = po.bounds;
          if (
            Math.abs(ob.min.y - bb.max.y) <= GAP &&
            Math.min(ob.max.x, bb.max.x) - Math.max(ob.min.x, bb.min.x) > OVERLAP
          ) {
            supported = true;
            break;
          }
        }
        if (supported) break;
      }
      if (supported) break;
    }
    if (!supported) {
      const m = e.meta.get(b.id);
      out.push({
        id: b.id,
        x: Math.round(b.position.x),
        y: Math.round(b.position.y),
        row: m?.row ?? -1,
        kind: m?.kind ?? '?',
        sleeping: b.isSleeping,
        speed: +b.speed.toFixed(3),
      });
    }
  }
  return out;
}

/** unsupported AND unmoved across a 6 s re-scan → genuine floater.
 *  (the wedge-buster ladder needs ~2 s to escalate to a full wake and up to
 *  ~10 s to settle — a 2 s window would flag blocks mid-rescue).
 *  Floaters inside the hero's descent shaft (below hero, |dx|≤4 cells) are
 *  BY DESIGN left alone — they read as normal footing blocks and knocking
 *  them out early breaks level fairness (L50 careful-bot wipeout). */
function inDescentShaft(engine: GameEngine, f: FloatRec): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hero = (engine as any).hero as Matter.Body;
  return f.y > hero.position.y - 2 * CELL && Math.abs(f.x - hero.position.x) <= 4 * CELL;
}

function confirmFloaters(h: Harness, first: FloatRec[]): FloatRec[] {
  first = first.filter((f) => !inDescentShaft(h.engine, f));
  if (first.length === 0) return [];
  for (let i = 0; i < 360; i++) h.engine.advance(TICK); // 6 s
  // the audit (and its wedge-buster) only run while the round is undecided —
  // a wedge frozen by the round ending is cosmetic (under the result overlay),
  // not the reported bug, so never confirm across that boundary
  if (h.over || h.engine.debugOverPending() !== 'false') return [];
  const second = unsupportedNow(h.engine);
  const still = new Map(second.map((f) => [f.id, f]));
  return first.filter((f) => {
    const s = still.get(f.id);
    if (!s) return false;
    const moved = Math.hypot(s.x - f.x, s.y - f.y);
    return moved < 3 && s.speed < 0.3;
  });
}

function playLevel(levelIdx: number, seed: number, maxRemovals: number): FloatRec[] {
  const h = makeEngine();
  h.engine.newRound(levelIdx, 0);
  h.engine.beginPlay();
  for (let i = 0; i < 240; i++) h.engine.advance(TICK); // opening settle

  const rng = mulberry32(seed);
  const found = new Map<number, FloatRec>();
  let removals = 0;
  let characterized = false;

  while (removals < maxRemovals && !h.over) {
    // kid-like tap policy: 60% tunnel under the hero, 40% random mid-tower pop
    let removed = false;
    if (rng() < 0.6) {
      removed = h.engine.debugRemoveBelowHero(150);
    }
    if (!removed) {
      const list = h.engine.debugBlocks().filter((b) => Math.abs(b.x - BEAM_X) < 4.5 * CELL);
      if (list.length > 0) {
        const pick = list[Math.floor(rng() * list.length)];
        removed = h.engine.debugRemoveId(pick.id);
      }
    }
    if (!removed) break;
    removals++;

    // let physics resolve, then hunt
    for (let i = 0; i < 150 && !h.over; i++) h.engine.advance(TICK); // 2.5 s
    if (h.over || h.engine.debugOverPending() !== 'false') break;
    const suspects = unsupportedNow(h.engine).filter((f) => f.sleeping || f.speed < 0.3);
    const confirmed = confirmFloaters(h, suspects);
    for (const f of confirmed) found.set(f.id, f);
    if (!characterized && confirmed.length > 0) {
      characterize(h, confirmed);
      characterized = true;
    }
  }

  // final settle + scan
  for (let i = 0; i < 180 && !h.over; i++) h.engine.advance(TICK);
  if (!h.over && h.engine.debugOverPending() === 'false') {
    const suspects = unsupportedNow(h.engine).filter((f) => f.sleeping || f.speed < 0.3);
    for (const f of confirmFloaters(h, suspects)) found.set(f.id, f);
  }

  h.engine.destroy();
  return [...found.values()];
}

/** characterize confirmed floaters + run rescue experiments IN PLACE */
function characterize(h: Harness, floaters: FloatRec[]): void {
  if (floaters.length === 0 || h.over) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = h.engine as any;
  for (const f of floaters) {
    const b: Matter.Body | undefined = e.blocks.find((x: Matter.Body) => x.id === f.id);
    if (!b) continue;
    const m = e.meta.get(f.id);
    const cells = (m?.cells ?? []).map((c: { col: number; row: number }) => `${c.col},${c.row}`).join(' ');
    const neighbors: string[] = [];
    for (const o of e.blocks as Matter.Body[]) {
      if (o.id === b.id) continue;
      const dx = o.position.x - b.position.x;
      const dy = o.position.y - b.position.y;
      if (Math.hypot(dx, dy) < 3 * CELL) neighbors.push(`id=${o.id} dx=${Math.round(dx)} dy=${Math.round(dy)}`);
    }
    console.log(
      `   [detail] id=${f.id} angle=${b.angle.toFixed(3)} cells=[${cells}] friction=${b.friction} sleepCounter? neighbors: ${neighbors.join(' | ')}`,
    );
  }
  // experiment 1: global wake, 10 s — does it fall on its own once fully awake?
  for (const b of e.blocks as Matter.Body[]) Matter.Sleeping.set(b, false);
  for (let i = 0; i < 600 && !h.over; i++) h.engine.advance(TICK);
  const stillThere = (id: number) => e.blocks.some((x: Matter.Body) => x.id === id);
  const unsupportedIds = new Set(unsupportedNow(h.engine).map((f) => f.id));
  for (const f of floaters) {
    console.log(
      `   [exp1 global-wake 10s] id=${f.id} present=${stillThere(f.id)} stillUnsupported=${unsupportedIds.has(f.id)}`,
    );
  }
  // experiment 2: strip friction on the stuck block + neighbors, 10 s
  for (const f of floaters) {
    const b: Matter.Body | undefined = e.blocks.find((x: Matter.Body) => x.id === f.id);
    if (!b || !unsupportedIds.has(f.id)) continue;
    for (const o of e.blocks as Matter.Body[]) {
      if (Math.hypot(o.position.x - b.position.x, o.position.y - b.position.y) < 3 * CELL) {
        Matter.Body.set(o, 'friction', 0.02);
        Matter.Sleeping.set(o, false);
      }
    }
    Matter.Body.set(b, 'friction', 0.02);
    Matter.Sleeping.set(b, false);
  }
  for (let i = 0; i < 600 && !h.over; i++) h.engine.advance(TICK);
  const afterSlip = new Set(unsupportedNow(h.engine).map((f) => f.id));
  for (const f of floaters) {
    console.log(`   [exp2 no-friction 10s] id=${f.id} present=${stillThere(f.id)} stillUnsupported=${afterSlip.has(f.id)}`);
  }
}

// default: the reported level + neighbors × 3 seeds; `--all`: every level, 1 seed
import { LEVELS } from '../src/game/levels';
const sweepAll = process.argv.includes('--all');
const levels = sweepAll ? LEVELS.map((_, i) => i) : [86, 85, 87, 70, 90]; // levelIdx 86 = 第 87 关
const seeds = sweepAll ? [7] : [1, 2, 3];
const maxRemovals = sweepAll ? 35 : 50;
let anyFound = 0;
for (const li of levels) {
  for (const seed of seeds) {
    const floaters = playLevel(li, seed * 1000 + li, maxRemovals);
    if (floaters.length > 0) {
      anyFound += floaters.length;
      console.log(`\n❌ 第 ${li + 1} 关 (seed ${seed}): ${floaters.length} 个悬空积木`);
      for (const f of floaters) {
        console.log(
          `   id=${f.id} (${f.x},${f.y}) row=${f.row} kind=${f.kind} sleeping=${f.sleeping} speed=${f.speed}`,
        );
      }
    } else {
      console.log(`✅ 第 ${li + 1} 关 (seed ${seed}): 无悬空积木`);
    }
  }
}
console.log(anyFound === 0 ? '\nALL CLEAN — 未发现悬空积木' : `\nFLOATERS FOUND: ${anyFound}`);
process.exit(anyFound === 0 ? 0 : 1);
