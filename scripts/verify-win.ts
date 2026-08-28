/**
 * Headless win/lose-path verification — drives the REAL GameEngine
 * (headless mode, synthetic clock, no DOM) through every round outcome:
 *
 *  (a) remove every block by hand            → CLEAR via the all-clear path
 *  (b) tunnel down, land with blocks left    → CLEAR via landing; remaining
 *      blocks auto-convert: score += N×50, coins += N×1 (exact math checked)
 *  (c) shove the hero off the platform edge  → FAIL (fall), no conversion
 *  (d) never touch anything                  → FAIL (timeout)
 *  (e) knock the LAST block out of the world → still CLEARS (regression test
 *      for the stuck-round bug: escaped blocks must not block the win)
 *
 * Run:  npx tsc -p tsconfig.verify.json && node node_modules/.tmp-verify/scripts/verify-win.js
 */
import Matter from 'matter-js';
import { GameEngine, type RoundStats } from '../src/game/engine';
import { LEVELS, generateTower, mulberry32 } from '../src/game/levels';
import { createPhysicsEngine, createHero, stepPhysics, perchWobbleTick, HEX_R, PHYS_DT } from '../src/game/tower';

const TICK = 1000 / 60;

interface Harness {
  engine: GameEngine;
  over: RoundStats | null;
  liveCount: number;
}

function makeEngine(): Harness {
  const h: Harness = { engine: null as unknown as GameEngine, over: null, liveCount: 0 };
  const canvasStub = {} as HTMLCanvasElement; // headless: never touched
  h.engine = new GameEngine(
    canvasStub,
    {
      onLive: () => {
        h.liveCount++;
      },
      onGameOver: (s) => {
        h.over = s;
      },
      onReady: () => undefined,
    },
    { headless: true },
  );
  return h;
}

function run(h: Harness, ticks: number): void {
  for (let i = 0; i < ticks; i++) h.engine.advance(TICK);
}

function runUntilOver(h: Harness, maxTicks: number): boolean {
  for (let i = 0; i < maxTicks; i++) {
    if (h.over) return true;
    h.engine.advance(TICK);
  }
  return h.over !== null;
}

let failures = 0;
function check(label: string, cond: boolean, detail = ''): void {
  if (cond) {
    console.log(`  ✔ ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures++;
    console.log(`  ✘ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function freshRound(h: Harness, levelIdx: number): void {
  h.engine.newRound(levelIdx, 0);
  h.engine.beginPlay();
  run(h, 36); // ~0.6s ready settle
}

/* ---------------- (a) full clear → clear ---------------- */
function testFullClear(): void {
  console.log('\n(a) 消除所有积木 → 应通关（全消路径）');
  const h = makeEngine();
  freshRound(h, 0); // level 1
  const total = h.engine.totalBlocks();
  let guard = 0;
  while (h.engine.debugBlockCount() > 0 && !h.over && guard++ < total + 5) {
    h.engine.debugRemoveTop();
    run(h, 6); // ~100ms between clicks
  }
  check('所有积木被手动消除', h.engine.debugBlockCount() === 0, `total=${total}`);
  check('回合结束', runUntilOver(h, 300));
  check('结果 = clear', h.over?.outcome === 'clear', `outcome=${h.over?.outcome}`);
  check('非落地通关', h.over?.landed === false);
  check('消除数 = 总积木数', h.over?.removed === total, `${h.over?.removed}/${total}`);
  check('无折算积木', h.over?.converted === 0 && h.over?.convertBonus === 0);
  check(
    '金币 = 消除数 + 检查点×5',
    h.over?.coins === total + 5 * h.engine.debugCheckpointsHit(),
    `coins=${h.over?.coins}`,
  );
  check('有时间奖励分', (h.over?.timeBonus ?? 0) > 0, `+${h.over?.timeBonus}`);
  h.engine.destroy();
}

/* ------------- (b) landing with blocks left → clear + convert ------------- */
function testLandingConvert(): void {
  console.log('\n(b) 只消一半、六边形安全落底 → 应通关且剩余折分正确入账');
  const h = makeEngine();
  freshRound(h, 1); // level 2 (the level from the bug report)
  const total = h.engine.totalBlocks();
  // tunnel straight down: keep removing the block nearest below the hero
  let guard = 0;
  while (!h.over && h.engine.debugOverPending() === 'false' && guard++ < 120) {
    const removed = h.engine.debugRemoveBelowHero(96);
    // settle up to ~400 ms after each pop, but STOP the tick the clear
    // triggers so the snapshot below lands before any auto-convert pop
    for (let i = 0; i < (removed ? 24 : 6) && h.engine.debugOverPending() === 'false'; i++) {
      h.engine.advance(TICK);
    }
  }
  check('触发通关判定', h.engine.debugOverPending() !== 'false', `overPending=${h.engine.debugOverPending()}`);
  check('落地时仍有剩余积木', h.engine.debugBlockCount() > 0, `left=${h.engine.debugBlockCount()}`);
  const expectConverted = h.engine.debugBlockCount();
  check('回合结束', runUntilOver(h, 400));
  check('结果 = clear', h.over?.outcome === 'clear', `outcome=${h.over?.outcome}`);
  check('落地通关标记', h.over?.landed === true);
  check(
    '折算积木数 = 落地瞬间剩余数',
    h.over?.converted === expectConverted,
    `${h.over?.converted} == ${expectConverted}`,
  );
  check('折算分 = 剩余块数 × 50', h.over?.convertBonus === expectConverted * 50, `+${h.over?.convertBonus}`);
  check(
    '金币 = 消除 + 折算 + 检查点×5',
    h.over?.coins === (h.over?.removed ?? 0) + expectConverted + 5 * h.engine.debugCheckpointsHit(),
    `coins=${h.over?.coins}`,
  );
  check(
    '积木守恒：消除 + 折算 + 掉出世界 = 总数',
    (h.over?.removed ?? 0) + (h.over?.converted ?? 0) + h.engine.debugCulledCount() === total,
    `${h.over?.removed} + ${h.over?.converted} + ${h.engine.debugCulledCount()} == ${total}`,
  );
  check('通关后积木清零', h.engine.debugBlockCount() === 0);
  check('有时间奖励分', (h.over?.timeBonus ?? 0) > 0, `+${h.over?.timeBonus}`);
  h.engine.destroy();
}

/* ------------- (c) hero rolls off the platform → fall, no conversion ------------- */
function testFallOff(): void {
  console.log('\n(c) 六边形滚出平台 → 应失败且不折分');
  const h = makeEngine();
  freshRound(h, 0);
  for (let i = 0; i < 50 && !h.over; i++) {
    h.engine.debugShoveHero(14); // sustained push → rolls off the right edge
    h.engine.advance(TICK);
  }
  check('回合结束', runUntilOver(h, 600));
  check('结果 = fall', h.over?.outcome === 'fall', `outcome=${h.over?.outcome}`);
  check('无折算', h.over?.converted === 0 && h.over?.convertBonus === 0);
  check('非落地通关', h.over?.landed === false);
  check('无时间奖励分', h.over?.timeBonus === 0);
  h.engine.destroy();
}

/* ------------- (d) no input → timeout ------------- */
function testTimeout(): void {
  console.log('\n(d) 什么都不做 → 应超时失败');
  const h = makeEngine();
  freshRound(h, 0); // level 1
  check('回合结束', runUntilOver(h, (LEVELS[0].timeSec + 20) * 60));
  check('结果 = timeout', h.over?.outcome === 'timeout', `outcome=${h.over?.outcome}`);
  check('无折算', h.over?.converted === 0 && h.over?.convertBonus === 0);
  h.engine.destroy();
}

/* ------------- (e) last block knocked out of the world → still clears ------------- */
function testEscapedLastBlock(): void {
  console.log('\n(e) 最后一块积木掉出世界 → 仍应通关（卡关 BUG 回归）');
  const h = makeEngine();
  freshRound(h, 0);
  const total = h.engine.totalBlocks();
  let guard = 0;
  while (h.engine.debugBlockCount() > 1 && !h.over && guard++ < total + 5) {
    h.engine.debugRemoveTop();
    run(h, 6);
  }
  check('只剩 1 块', h.engine.debugBlockCount() === 1, `left=${h.engine.debugBlockCount()}`);
  // knock the last block out of the world AND pop the hero up so the landing
  // check can't win the race — the escaped-block cull must trigger the clear.
  // (hero airborne first so the shoved block can't clip it; 40 px/tick so the
  // block can't friction-stop on the beam before escaping)
  h.engine.debugShoveHero(0, -14);
  h.engine.debugShoveBlock(40);
  check('回合结束', runUntilOver(h, 600));
  check('结果 = clear', h.over?.outcome === 'clear', `outcome=${h.over?.outcome}`);
  check('掉出世界的积木已注销', h.engine.debugCulledCount() >= 1, `culled=${h.engine.debugCulledCount()}`);
  check(
    '积木守恒：消除 + 折算 + 掉出世界 = 总数',
    (h.over?.removed ?? 0) + (h.over?.converted ?? 0) + h.engine.debugCulledCount() === total,
    `${h.over?.removed} + ${h.over?.converted} + ${h.engine.debugCulledCount()} == ${total}`,
  );
  h.engine.destroy();
}

/* ------------- (f) 15° slope → hero must measurably roll/slide ------------- */
function testSlopeRoll(): void {
  console.log('\n(f) 15° 斜面 → 英雄 1.5 秒内必须滚动/滑落（真实物理回归）');
  const spec = generateTower(29, 0, 0); // mid-curve hero tune (realism-capped)
  const tune = spec.heroTune;
  const engine = createPhysicsEngine();
  const slope = Matter.Bodies.rectangle(360, 500, 320, 24, {
    isStatic: true,
    angle: (15 * Math.PI) / 180,
    friction: 0.7, // same cap as tower top-band faces
    label: 'beam',
  });
  const hero = createHero(spec); // the real factory (12-gon body, capped tune)
  Matter.Body.setPosition(hero, { x: 360, y: 436 });
  Matter.Composite.add(engine.world, [slope, hero]);
  for (let i = 0; i < 40; i++) stepPhysics(engine); // land + touch the slope
  const x0 = hero.position.x;
  const y0 = hero.position.y;
  for (let i = 0; i < 90; i++) stepPhysics(engine); // 1.5 s
  const dx = hero.position.x - x0;
  const disp = Math.hypot(dx, hero.position.y - y0);
  check(
    '1.5 秒内发生可测滚动/滑落位移',
    disp > 12,
    `Δx=${dx.toFixed(1)}px 位移=${disp.toFixed(1)}px (tune inertia=${tune.inertia} friction=${tune.friction})`,
  );
  Matter.Engine.clear(engine);
}

/* ------------- (g) support removed → hero must start falling in 0.5 s ------------- */
function testSupportVanish(): void {
  console.log('\n(g) 消掉正下方积木 → 英雄 0.5 秒内必须开始下落');
  const spec = generateTower(29, 0, 0);
  const engine = createPhysicsEngine();
  const floor = Matter.Bodies.rectangle(360, 640, 500, 40, { isStatic: true, label: 'beam' });
  const block = Matter.Bodies.rectangle(360, 590, 90, 60, {
    density: 0.001,
    friction: 0.7,
    label: 'block',
    sleepThreshold: 30,
  });
  const hero = createHero(spec);
  Matter.Body.setPosition(hero, { x: 360, y: 590 - 30 - 23 });
  Matter.Composite.add(engine.world, [floor, block, hero]);
  for (let i = 0; i < 90; i++) stepPhysics(engine); // fully settle (may sleep)
  const y0 = hero.position.y;
  // mimic removeBlock(): pop the support + wake the hero
  Matter.Composite.remove(engine.world, block);
  Matter.Sleeping.set(hero, false);
  for (let i = 0; i < 30; i++) stepPhysics(engine); // 0.5 s
  const dy = hero.position.y - y0;
  check('0.5 秒内开始下落', dy > 8, `Δy=${dy.toFixed(1)}px speed=${hero.speed.toFixed(2)}`);
  Matter.Engine.clear(engine);
}

/* ---- (h) narrow perch must tip within 2 s; wide support must stay put ---- */
function testNarrowPerch(): void {
  console.log('\n(h) 单点/窄边支撑 → 2 秒内必须倾倒/滑落；宽支撑对照必须保持静止');
  // Tip threshold 20 px: rolling off a 40 px-tall perch block necessarily
  // produces ≥40 px of displacement (the drop alone), so 20 px has margin
  // while still being ~20× above numerical noise (<1 px on wide supports).
  const TIP_DISP = 20;
  const STAY_DISP = 2;

  /**
   * Build a raw world (same factories as the game), perch the REAL hero on
   * the given support blocks, settle, then run 2 s calling perchWobble()
   * every tick — exactly what GameEngine.tick does while playing.
   */
  function perchRun(levelIdx: number, supportBlocks: Matter.Body[], surfY: number): number {
    const spec = generateTower(levelIdx, 0, 0);
    const engine = createPhysicsEngine();
    const floor = Matter.Bodies.rectangle(360, 740, 600, 40, { isStatic: true, label: 'beam' });
    const hero = createHero(spec);
    Matter.Body.setPosition(hero, { x: 360, y: surfY - HEX_R });
    Matter.Composite.add(engine.world, [floor, ...supportBlocks, hero]);
    for (let i = 0; i < 90; i++) stepPhysics(engine); // fully settle (may sleep)
    const x0 = hero.position.x;
    const y0 = hero.position.y;
    const rng = mulberry32(42); // deterministic, like the engine's per-round stream
    const beamLeft = 60; // the test floor as the (wide) landing beam stand-in
    const beamRight = 660;
    let perchMs = 0; // same accumulator GameEngine keeps per round
    for (let i = 0; i < 120; i++) {
      stepPhysics(engine);
      // exactly what GameEngine.tick does each frame while playing
      perchMs = perchWobbleTick(hero, supportBlocks, beamLeft, beamRight, 600, rng, perchMs, PHYS_DT);
    }
    const disp = Math.hypot(hero.position.x - x0, hero.position.y - y0);
    Matter.Engine.clear(engine);
    return disp;
  }

  const mkBlock = (cx: number, w: number, topY: number) =>
    Matter.Bodies.rectangle(cx, topY + 20, w, 40, {
      density: 0.001,
      friction: 0.55, // honest mid-tower face (blockOptions)
      label: 'block',
      sleepThreshold: 30,
    });

  // 1-cell-wide (30 px) single block top, hero dead-center — mid-curve tune
  const d1 = perchRun(29, [mkBlock(360, 30, 640)], 640);
  check('1格宽(30px)单块顶面中心：2秒内倾倒/滑落', d1 > TIP_DISP, `位移=${d1.toFixed(1)}px (L30 tune)`);

  // sub-cell (15 px) narrow edge — the "单点立着" extreme
  const d2 = perchRun(29, [mkBlock(360, 15, 640)], 640);
  check('半格(15px)窄边中心：2秒内倾倒/滑落', d2 > TIP_DISP, `位移=${d2.toFixed(1)}px (L30 tune)`);

  // hardest-to-tip tune: L1 teaching band (max friction + max frictionAir)
  const d3 = perchRun(0, [mkBlock(360, 30, 640)], 640);
  check('1格宽单块 + L1教学档（最重阻尼）：2秒内倾倒/滑落', d3 > TIP_DISP, `位移=${d3.toFixed(1)}px (L1 tune)`);

  // control: wide 8-cell block → must stay perfectly still
  const d4 = perchRun(29, [mkBlock(360, 240, 640)], 640);
  check('对照·宽支撑(8格)：保持静止', d4 < STAY_DISP, `位移=${d4.toFixed(2)}px`);

  // control: hero straddling the SEAM of two adjacent 1-cell blocks → wide
  const d5 = perchRun(29, [mkBlock(345, 30, 640), mkBlock(375, 30, 640)], 640);
  check('对照·骑缝(两块1格并排)：保持静止', d5 < STAY_DISP, `位移=${d5.toFixed(2)}px`);
}

console.log('Headless win/lose path verification (real GameEngine, synthetic clock)');
testFullClear();
testLandingConvert();
testFallOff();
testTimeout();
testEscapedLastBlock();
testSlopeRoll();
testSupportVanish();
testNarrowPerch();

console.log(failures === 0 ? '\nALL WIN/LOSE PATHS PASS ✔' : `\n${failures} CHECK(S) FAILED ✘`);
process.exit(failures === 0 ? 0 : 1);
