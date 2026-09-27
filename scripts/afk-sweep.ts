/**
 * afk-sweep — broad AFK spawn-stability sweep for endless mode.
 * 40 pseudo-random seeds: enter a run, touch nothing for 8 s,
 * the hero must stay parked with 3 lives (the "进去就滚" regression).
 */
import { GameEngine } from '../src/game/engine';
import { ENDLESS_LIVES } from '../src/game/endless';
import { CELL } from '../src/game/levels';

const TICK = 1000 / 60;

function afkTest(seed: number): { ok: boolean; drift: number; lives: number } {
  const h: { engine: GameEngine; over: unknown } = { engine: null as unknown as GameEngine, over: null };
  h.engine = new GameEngine({} as HTMLCanvasElement, {
    onLive: () => undefined,
    onGameOver: (s) => { h.over = s; },
    onReady: () => undefined,
  }, { headless: true });
  h.engine.newEndlessRound(seed, false);
  h.engine.beginPlay();
  const h0 = h.engine.debugHero();
  for (let i = 0; i < 8 * 60 && !h.over; i++) h.engine.advance(TICK);
  const h1 = h.engine.debugHero();
  const drift = Math.hypot(h1.x - h0.x, h1.y - h0.y) / CELL;
  const lives = h.engine.debugLives();
  const ok = lives === ENDLESS_LIVES && h.over === null && drift < 1.5;
  h.engine.destroy();
  return { ok, drift, lives };
}

let bad = 0;
for (let i = 0; i < 40; i++) {
  const seed = i * 7919 + 13;
  const r = afkTest(seed);
  if (!r.ok) {
    bad++;
    console.log(`❌ seed=${seed} 漂移=${r.drift.toFixed(2)}格 命=${r.lives}`);
  } else {
    console.log(`✅ seed=${seed} 漂移=${r.drift.toFixed(2)}格`);
  }
}
console.log(bad === 0 ? `\nALL 40 PASS` : `\n${bad}/40 FAILURES`);
process.exit(bad === 0 ? 0 : 1);
