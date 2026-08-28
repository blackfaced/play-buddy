import Matter from 'matter-js';
import { playPop, playPopCrisp, playTok, playChime, playJingle, playBoop, playTick, playTimeout, playWindChime, playCoin, playHeartbeat, playSaved, playRumble, setRolling, setWind } from './sound';
import { generateTower, VARIANTS_PER_LEVEL, LEVELS, CELL, COLS, TILE_X, levelTimeLimitMs, layerColor, ICE_COLOR, mulberry32, type BlockKind } from './levels';
import {
  WORLD_W,
  WORLD_H,
  BEAM_W,
  BEAM_H,
  BEAM_X,
  BEAM_Y,
  BEAM_TOP,
  HEX_R,
  HEX_HALF_H,
  PX_PER_M,
  SENSOR_Y,
  CHECKPOINT_BONUS_SEC,
  heroSpawnY,
  checkpointYs,
  createPhysicsEngine,
  createStatics,
  createBlocks,
  createHero,
  preSettle,
  stepPhysics,
  PHYS_DT,
  LANDING_ASSIST,
  perchWobbleTick,
  type CreatedBlock,
  type LocalCell,
} from './tower';
import { EndlessTower, ENDLESS_GEN_AHEAD_PX, ENDLESS_LIVES, type EndlessSegment } from './endless';

export { WORLD_W, WORLD_H };

export type RoundOutcome = 'clear' | 'fall' | 'timeout';

const REMOVE_COOLDOWN = 40; // just a double-fire guard — rapid combos must not be eaten
const COMBO_WINDOW = 1500;
const CLICK_TOL = 8; // px of forgiveness around a block (covers chamfer + wobble)
const HOVER_TOL = 2;

/** Hero center y that counts as "at the bottom" (resting on the cloud beam, minus chamfer slack).
 *  The HUD progress rail reaches 100% on exactly this line. */
const LAND_LINE_Y = BEAM_TOP - HEX_HALF_H - 8;
const LAND_CALM_SPEED = 1.5; // hero must be slower than this…
const LAND_HOLD_MS = 300; // …for this long (no grazing/bounce false positives)
const CONVERT_SCORE = 50; // points per remaining block auto-converted on a landing clear
const CONVERT_COINS = 1; // coins per converted block (same as a manual removal)

const CONFETTI_COLORS = ['#7ED957', '#F5D64B', '#F0A83C', '#E05545', '#A6D6EF'];
const CHECKPOINT_RED = '#E05545';
const COIN_GOLD = '#E8A93D';

/* ================= seamless scenery =================
 * The whole descent is ONE continuous picture: every backdrop element is a
 * pure function of world altitude (never of screen position), so scrolling
 * the camera can never break, repeat or reset the pattern.
 *
 *  - sky gradient: color stops indexed by ABSOLUTE world y — the canvas is
 *    filled by sampling the world altitude at the current view top/bottom;
 *  - far ridge + far clouds: parallax layer (0.45×) in "layer space"
 *    (yLayer = yWorld mapped through camY·f) whose content spans the entire
 *    camera travel of the current tower;
 *  - near clouds: a second, closer parallax layer (0.72×) with bigger puffs;
 *  - hills + cloud-sea mist: world-space (1×), hugging the platform zone so
 *    the bottom of the descent never shows empty/out-of-canvas sky.
 */

/** world y of the "ground" (just below the cloud-platform legs) */
const GROUND_Y = 916;
const FAR_F = 0.45;
const NEAR_F = 0.72;

/** sky gradient stops: world y → rgb (deeper blue up high → pale haze near ground) */
const SKY_STOPS: [number, [number, number, number]][] = [
  [-900, [108, 188, 236]],
  [-350, [140, 210, 244]],
  [80, [171, 224, 248]],
  [450, [201, 235, 251]],
  [800, [228, 244, 246]],
  [916, [238, 247, 239]],
];

function skyColorAt(wy: number): string {
  let i = 0;
  while (i < SKY_STOPS.length - 2 && wy > SKY_STOPS[i + 1][0]) i++;
  const [y0, c0] = SKY_STOPS[i];
  const [y1, c1] = SKY_STOPS[i + 1];
  const t = Math.max(0, Math.min(1, (wy - y0) / (y1 - y0)));
  const c = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

interface SceneryCloud {
  /** horizontal seed (fraction of the wrap span) */
  fx: number;
  /** vertical seed (fraction of the layer's camera-travel range) */
  fy: number;
  s: number;
  speed: number;
}

interface Scenery {
  farClouds: SceneryCloud[];
  nearClouds: SceneryCloud[];
  ridgePhase: [number, number, number];
  sparkles: { x: number; fy: number; r: number; ph: number }[];
}

/** fixed seeded layout — identical every session, so the world is consistent */
const SCENERY: Scenery = (() => {
  const rng = mulberry32(20250721);
  const farClouds: SceneryCloud[] = [];
  for (let i = 0; i < 9; i++) farClouds.push({ fx: rng(), fy: rng(), s: 0.45 + rng() * 0.6, speed: 2 + rng() * 3 });
  const nearClouds: SceneryCloud[] = [];
  for (let i = 0; i < 6; i++) nearClouds.push({ fx: rng(), fy: rng(), s: 0.8 + rng() * 0.75, speed: 3 + rng() * 4 });
  const ridgePhase: [number, number, number] = [rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2];
  const sparkles: Scenery['sparkles'] = [];
  for (let i = 0; i < 14; i++) sparkles.push({ x: 30 + rng() * (WORLD_W - 60), fy: rng(), r: 1.1 + rng() * 1.7, ph: rng() * Math.PI * 2 });
  return { farClouds, nearClouds, ridgePhase, sparkles };
})();

export interface RoundStats {
  outcome: RoundOutcome;
  score: number;
  meters: number;
  removed: number;
  /** remaining blocks auto-converted to score/coins on a landing clear */
  converted: number;
  /** score bonus granted by conversion (+50 per block) */
  convertBonus: number;
  /** true when the clear came from the hero landing on the beam (vs full clear) */
  landed: boolean;
  maxCombo: number;
  roundMs: number;
  timeLeftMs: number;
  timeBonus: number;
  /** coins earned this round (blocks +1, checkpoints +5) — star bonus added by the store */
  coins: number;
}

export interface LiveStats {
  score: number;
  meters: number;
  removed: number;
  /** blocks auto-converted so far during a landing-clear celebration */
  converted: number;
  combo: number;
  maxCombo: number;
  roundMs: number;
  coins: number;
  /** hero descent progress 0 (tower top) → 1 (beam) */
  progress: number;
  /** checkpoint bonus seconds accrued (ms) */
  bonusMs: number;
  /** endless mode: lives left (always 3 in level mode — HUD reads it only in endless) */
  lives: number;
}

export interface EngineCallbacks {
  onLive: (s: LiveStats) => void;
  onGameOver: (s: RoundStats) => void;
  onReady: () => void;
}

interface BlockMeta {
  color: string;
  row: number;
  topRow: number;
  cells: LocalCell[];
  kind: BlockKind;
  /** structural "key" block — removing it may collapse the tower (visual warning) */
  key: boolean;
  speckles: { x: number; y: number; r: number }[];
}

interface Ghost {
  x: number;
  y: number;
  angle: number;
  cells: LocalCell[];
  color: string;
  kind: BlockKind;
  t0: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  t0: number;
  life: number;
  kind: 'dust' | 'confetti';
  rot: number;
  vr: number;
  gravity: number;
}

interface FloatText {
  x: number;
  y: number;
  text: string;
  t0: number;
  life: number;
  color: string;
  size: number;
}

interface Checkpoint {
  y: number;
  hit: boolean;
  hitAt: number;
}

/* ---------- color helpers ---------- */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function shade(color: string, pct: number): string {
  let rgb: [number, number, number];
  if (color.startsWith('rgb(')) {
    rgb = color.slice(4, -1).split(',').map(Number) as [number, number, number];
  } else {
    rgb = hexToRgb(color);
  }
  const t = pct > 0 ? 255 : 0;
  const p = Math.abs(pct) / 100;
  const f = (c: number) => Math.round(c + (t - c) * p);
  return `rgb(${f(rgb[0])},${f(rgb[1])},${f(rgb[2])})`;
}
function seededRand(seed: number): () => number {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

type EngineState = 'idle' | 'playing' | 'over';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private headless: boolean;
  private cb: EngineCallbacks;
  private engine: Matter.Engine;
  private blocks: Matter.Body[] = [];
  private meta = new Map<number, BlockMeta>();
  private hero!: Matter.Body;
  private raf = 0;
  private lastFrame = 0;
  private acc = 0;
  private state: EngineState = 'idle';
  private stepping = false;
  private inputOn = false;
  private destroyed = false;

  private camY = 0;
  private camX = 0; // world x at the left edge of the view (tower stays centered)
  private camMin = 0;
  private camMax = 0;
  private zoom = 1; // world unit → css px scale
  private viewW = WORLD_W; // world units visible
  private viewH = WORLD_H;
  private cssW = WORLD_W;
  private cssH = WORLD_H;
  private extraRows = 0; // replay-growth bonus rows for the current round
  private introT0 = 0;
  private ghosts: Ghost[] = [];
  private particles: Particle[] = [];
  private floats: FloatText[] = [];
  private checkpoints: Checkpoint[] = [];
  private hovered: Matter.Body | null = null;
  private cursorId: number | null = null;
  private pointerFine = true;

  private maxMeters = 0;
  private bonus = 0;
  private removed = 0;
  private combo = 0;
  private maxCombo = 0;
  private lastRemoveAt = 0;
  private comboActive = false;
  private lastComboAt = 0;
  private lastEmitAt = 0;
  private lastMilestone = 0;
  private roundMs = 0;
  /** ms since the hero last touched anything (endless runaway-fall gate) */
  private heroAirMs = 0;  /** ms since the hero last had CALM contact (touching & speed<2) — endless
   *  world extension only happens while the hero is "in control" */
  private heroCalmMs = 0;
  /** which endless fall rule fired (headless debugging) */
  private lastFallRule = '';
  /** sustained ms spent >10 rows below the banked anchor (endless deep-stall
   *  terminator: a hero stuck far below its checkpoint — e.g. riding the floor
   *  net without ever climbing back onto blocks — is a failed run, end it) */
  private heroDeepMs = 0;
  /** per-death diagnostics, headless only */
  readonly debugDeaths: string[] = [];
  private overAt = 0;
  private overWaitMs = 0; // celebration / slow-mo length before onGameOver fires
  private overPending: false | 'over' | 'clear' = false;
  private overReason: 'fall' | 'timeout' = 'fall';
  private landed = false; // current round cleared by landing on the beam
  private converted = 0; // remaining blocks auto-converted on a landing clear
  private convertBonus = 0; // score granted by conversion (+50/block)
  private convertQueue: { body: Matter.Body; at: number }[] = [];
  private lastConvertPopSnd = 0;
  private culled = 0; // blocks that escaped the world (fell off) this round
  private auditAt = 0; // last unsupported-block audit timestamp
  private landMs = 0; // sustained "calm at the bottom" timer
  private lastDt = 16.666; // frame dt of the latest tick
  private simT = 0; // latest update() timestamp (single clock for game logic)
  private platformBounceT0 = -10000;
  private bounceDone = false; // one happy cloud bounce per round
  private levelIdx = 0;
  private attempt = -1; // first newRound(0) → attempt 0 (variant 0)
  private beamW = BEAM_W; // level-dependent landing beam width
  private beamLeft = BEAM_X - BEAM_W / 2;
  private beamRight = BEAM_X + BEAM_W / 2;
  // ---- endless mode (每日挑战 / 自由无尽) ----
  private mode: 'level' | 'endless' = 'level';
  private endTower: EndlessTower | null = null; // seeded segment iterator
  private endSeed = 0;
  private endDaily = false; // daily challenge (records) vs free practice
  private endFloor: Matter.Body | null = null; // moving static floor holding the tower base
  private frontierY = BEAM_TOP; // world y of the generated world's bottom edge
  private lives = ENDLESS_LIVES;
  private respawnY = 0; // last checkpoint line crossed (respawn anchor)
  private nextCheckpointY = 0; // endless: next line to append as the frontier descends
  private timeLimitMs = 0;
  private bonusTimeMs = 0; // +3s per checkpoint crossed
  private roundCoins = 0; // +1 per block, +5 per checkpoint
  private lastSecLeft = -1;
  private timeBonus = 0;
  private heroY0 = heroSpawnY(LEVELS[0].rows);
  private lastProgress = 0;
  private squashT = -1000;
  private blinkT0 = 0;
  private nextBlink = 2500;
  private reducedMotion = false;
  private dpr = 1;
  /* ---- thrill FX state ---- */
  private shakeMag = 0; // screen-shake amplitude (world px), decays in render
  private shakeT0 = -10000;
  private slowmoUntil = 0; // simT when the near-miss slow-mo ends
  private lastSlowmoAt = -10000; // rate limit: ≤1 slow-mo per second
  private slowmoActive = false;
  private zoomFx = 1; // camera drama zoom (slow-mo push-in / edge warning)
  private zoomFxTarget = 1;
  private edgeWarn = false; // hero parked near the platform edge
  private cascadeCount = 0; // unclicked blocks dropped within the chain window
  private lastCascadeAt = -10000;
  /** deterministic per-round RNG for the narrow-perch wobble (keeps headless
   *  difficulty runs reproducible; seeded in newRound from level/attempt) */
  private wobbleRng: () => number = mulberry32(1);
  /** continuous calm-on-narrow-perch time (ms); drives the wobble ramp so a
   *  hero briefly pausing mid-descent is never nudged */
  private perchMs = 0;

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks, opts?: { headless?: boolean }) {
    this.canvas = canvas;
    this.headless = opts?.headless ?? false;
    if (!this.headless) {
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      this.ctx = ctx;
    }
    this.cb = cb;
    this.engine = createPhysicsEngine();
    this.reducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.pointerFine =
      typeof window !== 'undefined' && window.matchMedia('(pointer: fine)').matches;
    Matter.Events.on(this.engine, 'collisionStart', (e) => this.onCollisions(e));
    Matter.Events.on(this.engine, 'collisionActive', (e) => this.onHeroContact(e));
    this.buildWorld();
    if (!this.headless) this.raf = requestAnimationFrame(this.loop);
  }

  /* ================= world building ================= */

  private buildWorld(): void {
    if (this.mode === 'endless') {
      this.buildEndlessWorld();
      return;
    }
    this.clearWorldBodies();

    // tower from the deterministic, stability-verified level spec
    const spec = generateTower(this.levelIdx, this.attempt % VARIANTS_PER_LEVEL, this.extraRows);
    this.beamW = spec.beamW;
    this.beamLeft = BEAM_X - spec.beamW / 2;
    this.beamRight = BEAM_X + spec.beamW / 2;
    Matter.Composite.add(this.engine.world, createStatics(spec.beamW));

    this.heroY0 = heroSpawnY(spec.rows);
    this.checkpoints = checkpointYs(spec.rows).map((y) => ({ y, hit: false, hitAt: 0 }));
    for (const c of createBlocks(spec)) this.registerBlock(c, spec.rows);

    // hexagon hero
    this.hero = createHero(spec);
    Matter.Composite.add(this.engine.world, this.hero);

    // pre-settle the tower so it starts stable (no sag on wake)
    preSettle(this.engine, this.blocks, this.hero, spec.rows);
    this.introT0 = performance.now();
    this.updateCamBounds();
  }

  private clearWorldBodies(): void {
    Matter.Composite.clear(this.engine.world, false, true);
    this.blocks = [];
    this.meta.clear();
    this.ghosts = [];
    this.particles = [];
    this.floats = [];
    this.hovered = null;
    this.cursorId = null;
    this.endFloor = null;
    this.endTower = null;
  }

  /** Register one created block body (visual meta + world insert). */
  private registerBlock(c: CreatedBlock, rows: number): void {
    const base = layerColor(c.topRow, rows);
    const color = c.kind === 'ice' ? ICE_COLOR : c.kind === 'heavy' ? shade(base, -22) : base;
    const rand = seededRand(c.body.id);
    const speckles: { x: number; y: number; r: number }[] = [];
    for (const cell of c.cells) {
      for (let i = 0; i < 2; i++) {
        speckles.push({
          x: cell.x + (rand() - 0.5) * (cell.w - 14),
          y: cell.y + (rand() - 0.5) * (cell.h - 14),
          r: 1 + rand() * 1.4,
        });
      }
    }
    this.meta.set(c.body.id, { color, row: c.row, topRow: c.topRow, cells: c.cells, kind: c.kind, key: c.key === true, speckles });
    this.blocks.push(c.body);
    Matter.Composite.add(this.engine.world, c.body);
  }

  /* ================= endless world ================= */

  /**
   * Endless world: two stacked segments up front (so the hero always has
   * tower below it), a moving static floor holding the base, checkpoint
   * lines every 3 rows forever, and NO landing beam / countdown.
   */
  private buildEndlessWorld(): void {
    // 开局两段塔稳定性筛选。无尽模式用的是随机变体（关卡模式的塔全部经过
    // 盐值筛选，无尽没有），个别种子的开局顶部区域不稳：玩家还没点就塌方
    // 滚球（"无尽进去就滚了然后失败"）。这里按与实玩一致的方式实测开局：
    // 只唤醒 hero 附近（beginPlay 在无尽模式同样是局部唤醒），静置 3 秒，
    // 顶部区域稳才接受，否则换一组种子序列重掷。每个 attempt 的种子由
    // endSeed 确定性派生 → 每日挑战依旧全员同塔。
    let seg0!: EndlessSegment;
    let seg1!: EndlessSegment;
    for (let attempt = 0; ; attempt++) {
      this.clearWorldBodies();
      const tower = new EndlessTower(((this.endSeed * 2654435761 + attempt * 974711) % 2147483647) || 1);
      this.endTower = tower; // clearWorldBodies() 会把它置空
      seg0 = tower.next();
      seg1 = tower.next();
      for (const c of createBlocks(seg0.spec, seg0.baseY)) this.registerBlock(c, seg0.rows);
      for (const c of createBlocks(seg1.spec, seg1.baseY)) this.registerBlock(c, seg1.rows);
      this.frontierY = tower.frontierY;

      // frontier floor: wide static slab the generated world stands on. It
      // descends one segment whenever the tower extends (extendEndless).
      // friction/chamfer mirror the level-mode beam EXACTLY — a 0.55-friction
      // floor lets a ~50-row stack micro-slip laterally until it popcorns
      // (measured: full collapse during preSettle). 必须保持 560 通宽：窄地板
      // 会让 100+ 层拼接塔的基座积木从边缘滑落自塌（验证过）。塔侧坠落的
      // "死区骑行"由 endlessFallCheck 的偏出塔身规则负责，不靠地板宽度。
      this.endFloor = Matter.Bodies.rectangle(BEAM_X, this.frontierY + 12, 560, 24, {
        isStatic: true,
        chamfer: { radius: 6 },
        friction: 1.5,
        label: 'beam',
      });
      Matter.Composite.add(this.engine.world, this.endFloor);

      // no landing beam in endless: park the beam window far away so
      // heroSupport / perchWobble / edge-warn never mistake it for a perch
      this.beamW = 0;
      this.beamLeft = Number.MAX_SAFE_INTEGER / 4;
      this.beamRight = Number.MAX_SAFE_INTEGER / 4 + 1;

      // hero on the tower top, tune frozen at the starting level (the hero
      // FEEL doesn't change mid-run; only the tower gets harder)
      this.hero = createHero(seg0.spec, seg0.baseY);
      Matter.Composite.add(this.engine.world, this.hero);

      preSettle(this.engine, this.blocks, this.hero, seg0.rows + seg1.rows);
      if (this.endlessOpeningStable() || attempt >= 8) break;
    }

    this.heroY0 = this.hero.position.y;
    this.respawnY = seg0.baseY - seg0.rows * CELL; // tower top edge
    this.lives = ENDLESS_LIVES;

    this.checkpoints = [];
    this.nextCheckpointY = this.respawnY + 3 * CELL;
    this.extendCheckpoints();

    this.introT0 = performance.now();
    this.updateCamBounds();
  }

  /**
   * 开局塔自检：唤醒 hero 附近 12 层（与 beginPlay 的局部唤醒范围一致），
   * 静置 3 秒，顶部区域必须稳住。检测结束后复位 hero、重新冻结被唤醒的
   * 邻里（更深的积木从未被唤醒），玩家无感知。
   */
  private endlessOpeningStable(): boolean {
    const hero = this.hero;
    if (!hero) return false;
    const hx = hero.position.x;
    const hy = hero.position.y;
    const near = this.blocks.filter((b) => Math.abs(b.position.y - hy) <= 12 * CELL);
    const snap = near.map((b) => ({ x: b.position.x, y: b.position.y }));
    for (const b of near) Matter.Sleeping.set(b, false);
    Matter.Sleeping.set(hero, false);
    for (let i = 0; i < 180; i++) stepPhysics(this.engine); // 3 s idle
    let maxDisp = 0;
    let maxSpeed = 0;
    near.forEach((b, i) => {
      maxDisp = Math.max(maxDisp, Math.hypot(b.position.x - snap[i].x, b.position.y - snap[i].y));
      maxSpeed = Math.max(maxSpeed, b.speed);
    });
    const heroDrift = Math.hypot(hero.position.x - hx, hero.position.y - hy);
    const heroSpeed = hero.speed;
    // 复位 hero + 重新冻结被唤醒的邻里（同 preSettle 的收尾）
    Matter.Body.setPosition(hero, { x: hx, y: hy });
    Matter.Body.setVelocity(hero, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(hero, 0);
    Matter.Sleeping.set(hero, true);
    for (const b of near) {
      Matter.Body.setVelocity(b, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(b, 0);
      Matter.Sleeping.set(b, true);
    }
    return maxDisp < 20 && maxSpeed < 1.0 && heroDrift < 24 && heroSpeed < 0.5;
  }

  /**
   * 延展段离线自检：候选段单独落在 frontier 地板上（摩擦 1.5，同正式地板）
   * 是否自稳。个别随机变体段自身会在静置中垮塌，拼接后会牵连正在下潜的
   * 玩家；在 scratch 引擎里预先实测，不达标就换下一个变体，live 世界里的
   * hero / 旧塔完全不受影响。
   */
  private segmentSelfStable(seg: EndlessSegment): boolean {
    const eng = createPhysicsEngine();
    const blocks = createBlocks(seg.spec, seg.baseY).map((c) => c.body);
    const floor = Matter.Bodies.rectangle(BEAM_X, seg.baseY + 12, 560, 24, {
      isStatic: true,
      chamfer: { radius: 6 },
      friction: 1.5,
      label: 'beam',
    });
    Matter.Composite.add(eng.world, [floor, ...blocks]);
    const snap = blocks.map((b) => ({ x: b.position.x, y: b.position.y }));
    preSettle(eng, blocks, floor, seg.rows);
    for (const b of blocks) Matter.Sleeping.set(b, false);
    for (let i = 0; i < 120; i++) stepPhysics(eng); // 2 s idle
    let maxDisp = 0;
    let maxSpeed = 0;
    blocks.forEach((b, i) => {
      maxDisp = Math.max(maxDisp, Math.hypot(b.position.x - snap[i].x, b.position.y - snap[i].y));
      maxSpeed = Math.max(maxSpeed, b.speed);
    });
    Matter.Engine.clear(eng);
    return maxDisp < 20 && maxSpeed < 1.0;
  }

  /** Append the next seeded segment below the frontier and drop the floor. */
  private extendEndless(): void {
    const tower = this.endTower;
    if (!tower || !this.endFloor) return;
    const oldFrontier = this.frontierY;
    // 延展段离线筛选：个别随机变体段自身不稳，拼上去会垮塌牵连玩家
    let seg = tower.next();
    for (let tries = 0; tries < 6 && !this.segmentSelfStable(seg); tries++) seg = tower.next();
    for (const c of createBlocks(seg.spec, seg.baseY)) this.registerBlock(c, seg.rows);
    this.frontierY = seg.baseY;
    Matter.Body.setPosition(this.endFloor, { x: BEAM_X, y: this.frontierY + 12 });
    this.extendCheckpoints();
    // wake the seam neighborhood: blocks that slept on the floor now rest
    // on the new segment's flush top — let them re-bed gently (new blocks
    // spawn awake on their own)
    for (const b of this.blocks) {
      if (b.position.y > oldFrontier - 5 * CELL) Matter.Sleeping.set(b, false);
    }
    this.updateCamBounds();
  }

  /** checkpoint lines every 3 rows, appended as the frontier descends */
  private extendCheckpoints(): void {
    while (this.nextCheckpointY <= this.frontierY - 20) {
      this.checkpoints.push({ y: this.nextCheckpointY, hit: false, hitAt: 0 });
      this.nextCheckpointY += 3 * CELL;
    }
  }

  /**
   * Endless fall check: the hero is lost when it fell below EVERY remaining
   * block (off the tower's side/bottom edge) or escaped far off the sides.
   * Resting on the frontier floor after a fully-cleared shaft is SAFE — the
   * next segment arrives and the descent continues.
   */
  private endlessFallCheck(bx: number, by: number): boolean {
    if (bx < TILE_X - 130 || bx > TILE_X + COLS * CELL + 130) return true;
    // 偏出塔身且已落到地板高度 = 坠落。地板兜底只救"中线清空井"的下潜；
    // 没有这条，滚出塔侧的 hero 会被每段新塔循环"接住-又落空"永远往下带
    // （"失败后一直往下掉结束不了"）。
    if (by > this.frontierY - CELL && Math.abs(bx - BEAM_X) > (COLS * CELL) / 2 + 6) return true;
    let lowest = this.frontierY - CELL; // hero on the floor sits above this line
    for (const b of this.blocks) {
      const m = b.bounds.max.y;
      if (m > lowest) lowest = m;
    }
    return by > lowest + CELL * 1.5;
  }

  /**
   * Endless: is the hero currently resting on a tower block (vs airborne or
   * sitting on the frontier floor net)? Geometric check — independent of
   * collision events, so it stays true even when the hero fell asleep.
   */
  private heroOnBlock(): boolean {
    const h = this.hero;
    const hb = h.position.y + HEX_HALF_H;
    for (const b of this.blocks) {
      if (Math.abs(b.bounds.min.y - hb) > 8) continue;
      if (h.position.x < b.bounds.min.x - HEX_R || h.position.x > b.bounds.max.x + HEX_R) continue;
      return true;
    }
    return false;
  }

  /** Lose one life; respawn at the last checkpoint, or end the run at 0. */
  private loseLife(t: number): void {
    // headless debugging: remember the state that killed the hero
    if (this.headless && this.hero) {
      this.debugDeaths.push(
        `rule=${this.lastFallRule} y=${this.hero.position.y.toFixed(0)} x=${this.hero.position.x.toFixed(0)} ` +
          `speed=${this.hero.speed.toFixed(1)} airMs=${this.heroAirMs.toFixed(0)} respawnY=${this.respawnY.toFixed(0)} ` +
          `depthRows=${((this.hero.position.y - this.heroY0) / CELL).toFixed(1)} blocks=${this.blocks.length}`,
      );
    }
    this.lives -= 1;
    if (this.lives <= 0) {
      this.overPending = 'over';
      this.overReason = 'fall';
      this.overAt = t;
      this.overWaitMs = 500;
      this.engine.timing.timeScale = 0.35;
      playBoop();
      setRolling(0);
      setWind(0);
      this.emitLive();
      return;
    }
    this.respawnHero();
    this.addFloat(this.hero.position.x, this.hero.position.y - 56, `失误！还剩 ${this.lives} 条命`, CHECKPOINT_RED, 26, 1200);
    playHeartbeat();
    this.shakeMag = 6;
    this.shakeT0 = t;
    // snap the camera to the respawn point (can be far above the fall)
    this.camY = this.clampCamY(this.hero.position.y - this.viewH * 0.42);
    this.emitLive();
  }

  /**
   * Respawn the hero at the last crossed checkpoint line: on the widest
   * surviving support right around the line (tower keeps its current
   * state); if the shaft there is stripped bare, the frontier floor catches
   * the hero and the next segment arrives immediately.
   */
  private respawnHero(): void {
    // widest surviving support right around the checkpoint line…
    let best: Matter.Body | null = null;
    for (const b of this.blocks) {
      const top = b.bounds.min.y;
      if (top < this.respawnY - 2 * CELL || top > this.respawnY + 6 * CELL) continue;
      const w = b.bounds.max.x - b.bounds.min.x;
      if (!best || w > best.bounds.max.x - best.bounds.min.x) best = b;
    }
    if (!best) {
      // …shaft stripped bare at the line: walk DOWNWARD to the first
      // surviving support (bounded), else the frontier floor catches the hero
      let lowestTop = Infinity;
      for (const b of this.blocks) {
        const top = b.bounds.min.y;
        if (top < this.respawnY || top > this.respawnY + 25 * CELL) continue;
        if (top < lowestTop) {
          lowestTop = top;
          best = b;
        }
      }
    }
    let x = BEAM_X;
    let y = this.respawnY - HEX_HALF_H - 2;
    if (best) {
      x = (best.bounds.min.x + best.bounds.max.x) / 2;
      y = best.bounds.min.y - HEX_HALF_H - 2;
    } else {
      y = this.frontierY - HEX_HALF_H - 2; // bare world: the floor catches the hero
    }
    Matter.Body.setPosition(this.hero, { x, y });
    Matter.Body.setVelocity(this.hero, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(this.hero, 0);
    Matter.Body.setAngle(this.hero, 0);
    Matter.Sleeping.set(this.hero, false);
    this.perchMs = 0;
    this.heroAirMs = 0;
    this.heroCalmMs = 0;
    this.heroDeepMs = 0;
  }

  /* ================= public control ================= */

  totalBlocks(): number {
    return this.blocks.length + this.removed + this.converted + this.culled;
  }

  /** effective time limit for the current round (base + replay-growth rows) */
  roundLimitMs(): number {
    return this.timeLimitMs;
  }

  newRound(levelIdx?: number, extraRows = 0): void {
    if (levelIdx !== undefined) {
      if (levelIdx !== this.levelIdx) this.attempt = 0;
      else this.attempt += 1; // next retry plays the next verified variant
      this.levelIdx = levelIdx;
    }
    this.mode = 'level';
    this.extraRows = extraRows;
    this.resetRoundState();
    this.timeLimitMs = levelTimeLimitMs(this.levelIdx, this.extraRows);
    // deterministic per-round wobble stream (level, variant attempt, growth)
    this.wobbleRng = mulberry32(0x9e3779 + (this.levelIdx + 1) * 131 + (this.attempt + 1) * 17 + this.extraRows * 7);
    this.buildWorld();
    // camera starts at the tower top where the hero spawns (no lerp)
    this.camY = this.clampCamY(this.heroY0 - this.viewH * 0.3);
    setRolling(0);
    setWind(0);
  }

  /**
   * Endless mode ("每日挑战"/"自由无尽"): infinite downward tower, no time
   * limit, 3 lives, checkpoint respawn. Same physics/feel as campaign —
   * only the world shape and the end conditions differ.
   */
  newEndlessRound(seed: number, daily: boolean): void {
    this.mode = 'endless';
    this.endSeed = seed;
    this.endDaily = daily;
    this.lives = ENDLESS_LIVES;
    this.extraRows = 0;
    this.resetRoundState();
    this.timeLimitMs = Number.POSITIVE_INFINITY; // endless has NO total timer
    this.wobbleRng = mulberry32((seed ^ 0x51ab77) >>> 0);
    this.buildWorld();
    this.camY = this.clampCamY(this.heroY0 - this.viewH * 0.3);
    setRolling(0);
    setWind(0);
  }

  /** every per-round field reset shared by level + endless rounds */
  private resetRoundState(): void {
    this.state = 'idle';
    this.stepping = false;
    this.inputOn = false;
    this.maxMeters = 0;
    this.bonus = 0;
    this.removed = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.lastRemoveAt = 0;
    this.lastMilestone = 0;
    this.roundMs = 0;
    this.overPending = false;
    this.overReason = 'fall';
    this.overWaitMs = 0;
    this.landed = false;
    this.converted = 0;
    this.convertBonus = 0;
    this.convertQueue = [];
    this.culled = 0;
    this.landMs = 0;
    this.platformBounceT0 = -10000;
    this.bounceDone = false;
    this.bonusTimeMs = 0;
    this.roundCoins = 0;
    this.lastSecLeft = -1;
    this.timeBonus = 0;
    this.lastProgress = 0;
    this.lastClearWin = false;
    this.engine.timing.timeScale = 1;
    this.shakeMag = 0;
    this.slowmoActive = false;
    this.slowmoUntil = 0;
    this.lastSlowmoAt = -10000;
    this.zoomFx = 1;
    this.zoomFxTarget = 1;
    this.edgeWarn = false;
    this.cascadeCount = 0;
    this.lastCascadeAt = -10000;
    this.perchMs = 0;
    this.heroAirMs = 0;
    this.heroCalmMs = 0;
    this.heroDeepMs = 0;
  }

  beginPlay(): void {
    if (this.state === 'playing') return;
    this.state = 'playing';
    this.stepping = true;
    this.inputOn = true;
    // wake the tower gently so physics is live. ENDLESS: never wake the whole
    // stack at once — a fully-awake ~90-row stack exceeds the solver's contact
    // budget and popcorns (the "无尽进去就滚了" collapse: preSettle force-slept
    // an unconverged stack, the global wake released it). Wake only the hero's
    // neighborhood; deeper sleepers wake on contact / via auditUnsupportedBlocks
    // as the hero descends — the same seam-local contract extendEndless uses.
    if (this.mode === 'endless' && this.hero) {
      const hy = this.hero.position.y;
      for (const b of this.blocks) {
        if (Math.abs(b.position.y - hy) <= 12 * CELL) Matter.Sleeping.set(b, false);
      }
    } else {
      for (const b of this.blocks) Matter.Sleeping.set(b, false);
    }
    Matter.Sleeping.set(this.hero, false);
    this.cb.onReady();
  }

  freeze(): void {
    this.stepping = false;
    this.inputOn = false;
    setRolling(0);
    setWind(0);
  }

  unfreeze(): void {
    if (this.state === 'playing' && this.overPending === false) {
      this.stepping = true;
      this.inputOn = true;
    }
  }

  isPlaying(): boolean {
    return this.state === 'playing' && this.overPending === false;
  }

  isHovering(): boolean {
    return this.hovered !== null;
  }

  setStepping(on: boolean): void {
    this.stepping = on;
    if (!on) { setRolling(0); setWind(0); }
  }

  setInput(on: boolean): void {
    this.inputOn = on;
    if (!on) this.hovered = null;
  }

  /**
   * The canvas now fills its container exactly (any aspect), with the backing
   * store scaled by devicePixelRatio. A camera zoom keeps blocks big on every
   * screen: cell size targets ~44 css px on desktop, ~30 css px on mobile,
   * clamped so the tower always fits horizontally.
   */
  resize(cssWidth: number, cssHeight: number): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cssW = Math.max(1, cssWidth);
    this.cssH = Math.max(1, cssHeight);
    const w = Math.max(1, Math.round(this.cssW * this.dpr));
    const h = Math.max(1, Math.round(this.cssH * this.dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    const mobile = this.cssW < 768;
    const targetCell = mobile ? 30 : 44; // css px per 30px cell (≥28 / ≥36 required)
    const minViewW = mobile ? 400 : 560; // world px that must fit horizontally
    const maxViewW = 1040; // world px beyond which we stop zooming out
    let z = targetCell / CELL;
    z = Math.min(z, this.cssW / minViewW);
    z = Math.max(z, this.cssW / maxViewW);
    this.zoom = z;
    this.viewW = this.cssW / z;
    this.viewH = this.cssH / z;
    this.camX = WORLD_W / 2 - this.viewW / 2; // keep the tower horizontally centered
    this.updateCamBounds();
  }

  private updateCamBounds(): void {
    const top = this.heroY0 - HEX_R - 64; // hero + sky headroom at the tower top
    // endless: the world grows downward forever — the camera may follow to
    // just below the current frontier (and scroll back up to the start)
    this.camMax = (this.mode === 'endless' ? this.frontierY + 140 : GROUND_Y) - this.viewH;
    this.camMin = Math.min(top, this.camMax);
    this.camY = this.clampCamY(this.camY);
  }

  private clampCamY(y: number): number {
    const lo = Math.min(this.camMin, this.camMax);
    const hi = Math.max(this.camMin, this.camMax);
    return Math.max(lo, Math.min(hi, y));
  }

  destroy(): void {
    this.destroyed = true;
    if (!this.headless) cancelAnimationFrame(this.raf);
    setRolling(0);
    setWind(0);
    Matter.Events.off(this.engine, 'collisionStart');
    Matter.Events.off(this.engine, 'collisionActive');
    Matter.Engine.clear(this.engine);
  }

  /* ================= input ================= */

  /**
   * Input handlers receive CSS-pixel coordinates relative to the canvas
   * (0..cssW × 0..cssH). The engine maps them through the camera:
   *   world = css / zoom + (camX, camY)
   * and converts the click tolerance the same way, so picking stays exact
   * under every zoom level and camera offset.
   */
  /** CSS px → world, matching the render transform (drama zoom included). */
  private toWorld(x: number, y: number): { x: number; y: number } {
    const z = this.zoom * this.zoomFx;
    return {
      x: (x - this.cssW / 2) / z + this.camX + this.viewW / 2,
      y: (y - this.cssH / 2) / z + this.camY + this.viewH / 2,
    };
  }

  pointerDown(x: number, y: number): void {
    if (!this.inputOn || this.state !== 'playing' || this.overPending) return;
    const now = performance.now();
    if (now - this.lastRemoveAt < REMOVE_COOLDOWN) return;
    const w = this.toWorld(x, y);
    const body = this.pickAt(w.x, w.y, (this.pointerFine ? CLICK_TOL : CLICK_TOL * 1.5) / (this.zoom * this.zoomFx));
    if (body) this.removeBlock(body, now);
  }

  pointerMove(x: number, y: number): void {
    if (!this.pointerFine || !this.inputOn || this.state !== 'playing') {
      this.hovered = null;
      return;
    }
    const w = this.toWorld(x, y);
    this.hovered = this.pickAt(w.x, w.y, HOVER_TOL / (this.zoom * this.zoomFx));
  }

  pointerLeave(): void {
    this.hovered = null;
  }

  private pickAt(x: number, y: number, tol: number): Matter.Body | null {
    // Manual hit-test in body-local space against every cell of the piece.
    // Works for sleeping bodies too (we scan this.blocks, not a world query).
    let best: Matter.Body | null = null;
    let bestScore = Infinity;
    for (const b of this.blocks) {
      const m = this.meta.get(b.id);
      if (!m) continue;
      const dx = x - b.position.x;
      const dy = y - b.position.y;
      const c = Math.cos(-b.angle);
      const s = Math.sin(-b.angle);
      const lx = dx * c - dy * s;
      const ly = dx * s + dy * c;
      let d2 = Infinity;
      for (const cell of m.cells) {
        const ox = Math.max(Math.abs(lx - cell.x) - cell.w / 2, 0);
        const oy = Math.max(Math.abs(ly - cell.y) - cell.h / 2, 0);
        const dd = ox * ox + oy * oy;
        if (dd < d2) d2 = dd;
      }
      if (d2 > tol * tol) continue;
      const score = d2 * 100 + Math.hypot(lx, ly) * 0.01;
      if (score < bestScore) {
        bestScore = score;
        best = b;
      }
    }
    return best;
  }

  private removeBlock(body: Matter.Body, now: number): void {
    const m = this.meta.get(body.id);
    if (!m) return;
    // combo chain (check against previous removal time)
    if (this.comboActive && now - this.lastComboAt <= COMBO_WINDOW) {
      this.combo += 1;
    } else {
      this.combo = 1;
    }
    this.comboActive = true;
    this.lastComboAt = now;
    this.lastRemoveAt = now;
    if (this.combo >= 2) {
      const gain = this.combo === 2 ? 5 : this.combo === 3 ? 10 : 15;
      this.bonus += gain;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.addFloat(body.position.x, body.position.y - 22, `连消 ×${this.combo} +${gain}`, '#E8A93D', 27, 1100);
      this.addShake(1.2);
    }
    this.removed += 1;
    this.roundCoins += 1; // +1 coin per block
    // ghost pop animation
    this.ghosts.push({
      x: body.position.x,
      y: body.position.y,
      angle: body.angle,
      cells: m.cells,
      color: m.color,
      kind: m.kind,
      t0: now,
    });
    this.spawnDust(body.position.x, body.position.y, m.color, 14);
    Matter.Composite.remove(this.engine.world, body);
    // Wake the hero and exactly the blocks whose support chain runs through
    // the removed piece (transitive dependents). A full-tower wake lets
    // deep-stack sag resolve everywhere at once — 30 pops per round then
    // re-settle the whole tower 30 times, accumulating creep into topples.
    // Waking nothing would freeze now-unsupported blocks mid-air (matter
    // only re-wakes sleepers while their collision pair stays active).
    // Disturbances still spread sideways honestly: a falling block that
    // crashes into a sleeper wakes it via collision.
    Matter.Sleeping.set(this.hero, false);
    this.wakeDependents(body);
    this.blocks = this.blocks.filter((b) => b.id !== body.id);
    this.meta.delete(body.id);
    if (this.hovered?.id === body.id) this.hovered = null;
    if (this.cursorId === body.id) this.cursorId = null;
    if (this.combo >= 2) playPopCrisp();
    else playPop();
    // level clear: every block eliminated while the hero is still in play.
    // ENDLESS must NOT clear — a stripped shaft is a normal mid-run state
    // (the frontier floor catches the hero and the next segment arrives).
    if (this.mode === 'level' && this.blocks.length === 0) this.triggerAllClear(body.position.x, body.position.y);
    this.emitLive();
  }

  /**
   * Wake every block that (transitively) rests on `removed` — the only
   * bodies whose support can change when it vanishes. Support = top edge
   * within a few px below the other's bottom edge with horizontal overlap
   * (the tower grid is flush, resting gaps stay ≤ a few px).
   */
  private wakeDependents(removed: Matter.Body): void {
    const GAP = 8;
    const OVERLAP = 4;
    // part-level bounds: the parent AABB of an L/T piece is one cell bigger
    // than its real silhouette, which would corrupt the support graph
    const partsOf = (b: Matter.Body) => (b.parts.length > 1 ? b.parts.slice(1) : [b]);
    // support chains are vertically contiguous — in ENDLESS mode (towers of
    // 100s of rows) scope the O(n²) graph to the neighborhood of the
    // removal; anything further away cannot be resting on the removed block,
    // and the 4 Hz unsupported-audit picks up any straggler a long chain
    // missed. Level-mode towers (≤50 rows) keep the exact full scan.
    const near =
      this.mode === 'endless'
        ? this.blocks.filter((b) => Math.abs(b.position.y - removed.position.y) <= 520)
        : this.blocks;
    const tops = new Map<number, Matter.Bounds[]>(); // body id → part bounds
    for (const b of near) tops.set(b.id, partsOf(b).map((p) => p.bounds));
    const dependentsOf = new Map<number, number[]>();
    for (const a of near) {
      if (a.id === removed.id) continue;
      for (const b of near) {
        if (b.id === removed.id || b.id === a.id) continue;
        // any part of a directly below any part of b (flush rest) → a supports b
        let supports = false;
        for (const pa of tops.get(a.id)!) {
          for (const pb of tops.get(b.id)!) {
            if (Math.abs(pa.min.y - pb.max.y) > GAP) continue;
            if (Math.min(pa.max.x, pb.max.x) - Math.max(pa.min.x, pb.min.x) > OVERLAP) {
              supports = true;
              break;
            }
          }
          if (supports) break;
        }
        if (!supports) continue;
        let list = dependentsOf.get(a.id);
        if (!list) dependentsOf.set(a.id, (list = []));
        list.push(b.id);
      }
    }
    const queue = [removed.id];
    const seen = new Set<number>(queue);
    for (let qi = 0; qi < queue.length; qi++) {
      for (const dep of dependentsOf.get(queue[qi]) ?? []) {
        if (seen.has(dep)) continue;
        seen.add(dep);
        queue.push(dep);
        const b = this.blocks.find((x) => x.id === dep);
        if (b) Matter.Sleeping.set(b, false);
      }
    }
  }

  /**
   * Safety net for the dependent wake: matter only re-wakes a sleeper while
   * its collision pair stays active, so a block whose support CRUMBLES away
   * (instead of being popped) could freeze mid-air. Every few ticks, wake
   * any sleeping block that currently has no support (beam / hero / another
   * block directly under any of its parts). Cheap: part-pair scan at ~4 Hz.
   */
  private auditUnsupportedBlocks(): void {
    const GAP = 8;
    const OVERLAP = 4;
    const partsOf = (b: Matter.Body) => (b.parts.length > 1 ? b.parts.slice(1) : [b]);
    const heroBounds = this.hero.bounds;
    // in ENDLESS mode (towers of 100s of rows) only the hero's neighborhood
    // can lose support (removals happen there) — scope the O(n²) scan.
    // Level-mode towers (≤50 rows) keep the exact full scan.
    const near =
      this.mode === 'endless'
        ? this.blocks.filter((b) => Math.abs(b.position.y - this.hero.position.y) <= 900)
        : this.blocks;
    for (const b of near) {
      if (!b.isSleeping) continue;
      let supported = false;
      // level mode: beam/leg zone is y>780 (beam top 788); endless: the
      // (descending) frontier floor plays that role
      const groundLine = this.mode === 'endless' ? this.frontierY - 4 : 780;
      for (const pb of partsOf(b)) {
        const bb = pb.bounds;
        if (bb.max.y > groundLine) {
          supported = true; // beam / leg zone (or frontier floor in endless)
          break;
        }
        if (Math.abs(heroBounds.min.y - bb.max.y) <= GAP + 20 && Math.min(heroBounds.max.x, bb.max.x) - Math.max(heroBounds.min.x, bb.min.x) > OVERLAP) {
          supported = true; // riding on the hero
          break;
        }
        for (const o of near) {
          if (o.id === b.id) continue;
          for (const po of partsOf(o)) {
            const ob = po.bounds;
            if (Math.abs(ob.min.y - bb.max.y) <= GAP && Math.min(ob.max.x, bb.max.x) - Math.max(ob.min.x, bb.min.x) > OVERLAP) {
              supported = true;
              break;
            }
          }
          if (supported) break;
        }
        if (supported) break;
      }
      if (!supported) Matter.Sleeping.set(b, false);
    }
  }

  /**
   * All blocks are gone (clicked away OR knocked out of the world) → instant
   * clear. Safe to call from any path; no-op once the round is decided.
   */
  private triggerAllClear(fx: number, fy: number): void {
    if (this.overPending !== false || this.state !== 'playing') return;
    const leftMs = Math.max(0, this.timeLimitMs + this.bonusTimeMs - this.roundMs);
    this.timeBonus = Math.ceil(leftMs / 1000) * 10;
    this.bonus += this.timeBonus;
    this.overPending = 'clear';
    this.overAt = this.simT;
    this.overWaitMs = 900;
    this.landed = false;
    this.addFloat(fx, fy - 56, `时间奖励 +${this.timeBonus}`, '#57B832', 24, 1400);
    this.spawnConfetti();
    playJingle();
    setRolling(0);
    setWind(0);
  }

  /** the "out of the world" line — fixed sensor in level mode, the
   *  (descending) frontier in endless */
  private worldBottomY(): number {
    return this.mode === 'endless' ? this.frontierY + 4 * CELL : SENSOR_Y;
  }

  /** Deregister blocks that escaped the play area (fell off / out of the world). */
  private cullEscapedBlocks(): void {
    if (this.blocks.length === 0) return;
    const bottomY = this.worldBottomY();
    let escaped: Matter.Body[] | null = null;
    for (const b of this.blocks) {
      if (b.position.y > bottomY + 60 || b.position.x < -80 || b.position.x > WORLD_W + 80) {
        (escaped ??= []).push(b);
      }
    }
    if (!escaped) return;
    for (const b of escaped) {
      Matter.Composite.remove(this.engine.world, b);
      this.meta.delete(b.id);
      if (this.hovered?.id === b.id) this.hovered = null;
      if (this.cursorId === b.id) this.cursorId = null;
      this.culled += 1;
    }
    const gone = new Set(escaped.map((b) => b.id));
    this.blocks = this.blocks.filter((b) => !gone.has(b.id));

    // ---- collapse cascade: blocks knocked off WITHOUT being clicked ----
    // 2+ unclicked drops inside a 2 s window = chain collapse: score bonus,
    // floating combo text, momentum-scaled shake, dust and a low rumble.
    if (this.overPending === false) {
      const now = this.simT;
      if (now - this.lastCascadeAt > 2000) this.cascadeCount = 0;
      this.lastCascadeAt = now;
      this.cascadeCount += escaped.length;
      // impact dust where the tower lost the piece (clamped into view)
      for (const b of escaped) {
        this.spawnDust(b.position.x, Math.min(b.position.y, BEAM_TOP + 20), '#D8C9B4', 6);
      }
      this.addShake(Math.min(9, 2 + this.cascadeCount * 1.6 + escaped.length));
      playRumble(Math.min(1, 0.35 + this.cascadeCount * 0.12));
      if (this.cascadeCount >= 2) {
        const gain = this.cascadeCount * 10;
        this.bonus += gain;
        this.addFloat(
          this.hero.position.x,
          this.hero.position.y - 92,
          `连锁坍塌 ×${this.cascadeCount} +${gain}`,
          '#E05545',
          27,
          1300,
        );
      }
    }
    this.emitLive();
  }

  /** Screen shake: amplitude in world px, decays over ~420 ms in render. */
  private addShake(mag: number): void {
    if (this.reducedMotion) return;
    if (mag > this.shakeMag) {
      this.shakeMag = mag;
      this.shakeT0 = this.simT;
    }
  }

  /**
   * Landing win: hero center is at/below the landing line (the HUD progress
   * rail reads 100% on exactly this line), horizontally inside the beam, and
   * moving slowly — sustained for LAND_HOLD_MS so a graze or bounce never
   * triggers it. On trigger, all remaining blocks auto-convert to score/coins.
   */
  private checkLanding(): void {
    const h = this.hero;
    const inBeam = h.position.x > this.beamLeft - 2 && h.position.x < this.beamRight + 2;
    const lowEnough = h.position.y >= LAND_LINE_Y;
    const calm = h.speed < LAND_CALM_SPEED;
    if (inBeam && lowEnough && calm) {
      this.landMs += this.lastDt;
      if (this.landMs >= LAND_HOLD_MS) this.triggerLandedClear();
    } else {
      this.landMs = 0;
    }
  }

  /** Hero reached the cloud platform with blocks still standing → clear + convert. */
  private triggerLandedClear(): void {
    if (this.overPending !== false || this.state !== 'playing') return;
    const now = this.simT;
    const leftMs = Math.max(0, this.timeLimitMs + this.bonusTimeMs - this.roundMs);
    this.timeBonus = Math.ceil(leftMs / 1000) * 10;
    this.bonus += this.timeBonus;
    this.overPending = 'clear';
    this.overAt = now;
    this.landed = true;
    // remaining blocks auto-pop bottom → top, each worth +50 pts / +1 coin
    const rest = [...this.blocks].sort(
      (a, b) => b.position.y - a.position.y || a.position.x - b.position.x,
    );
    const n = rest.length;
    const interval = n > 1 ? Math.min(80, 1150 / (n - 1)) : 0;
    this.convertQueue = rest.map((body, i) => ({ body, at: now + 220 + i * interval }));
    this.overWaitMs = n > 0 ? 220 + (n - 1) * interval + 460 : 900;
    this.engine.timing.timeScale = 0.55; // celebratory slow-mo while blocks pop
    this.platformBounceT0 = now;
    this.bounceDone = true;
    this.addFloat(this.hero.position.x, this.hero.position.y - 64, '安全落地！', '#57B832', 30, 1500);
    if (n > 0) {
      this.addFloat(
        this.hero.position.x,
        this.hero.position.y - 100,
        `剩余 ${n} 块 +${n * CONVERT_SCORE}分`,
        '#E8A93D',
        24,
        1700,
      );
    }
    this.spawnConfetti();
    playJingle();
    setRolling(0);
    setWind(0);
    this.emitLive();
  }

  /** Auto-conversion pop for one remaining block during a landing-clear celebration. */
  private convertBlock(body: Matter.Body, now: number): void {
    const m = this.meta.get(body.id);
    if (!m) return;
    this.ghosts.push({
      x: body.position.x,
      y: body.position.y,
      angle: body.angle,
      cells: m.cells,
      color: m.color,
      kind: m.kind,
      t0: now,
    });
    this.spawnDust(body.position.x, body.position.y, m.color, 6);
    Matter.Composite.remove(this.engine.world, body);
    this.meta.delete(body.id);
    this.blocks = this.blocks.filter((b) => b.id !== body.id);
    if (this.hovered?.id === body.id) this.hovered = null;
    if (this.cursorId === body.id) this.cursorId = null;
    this.converted += 1;
    this.convertBonus += CONVERT_SCORE;
    this.bonus += CONVERT_SCORE;
    this.roundCoins += CONVERT_COINS;
    this.addFloat(body.position.x, body.position.y - 18, `+${CONVERT_SCORE}`, '#E8A93D', 17, 700);
    if (now - this.lastConvertPopSnd > 70) {
      this.lastConvertPopSnd = now;
      playPop();
    }
    this.emitLive();
  }

  /* keyboard cursor */
  cursorMove(dir: 'left' | 'right' | 'up' | 'down'): void {
    if (!this.inputOn || this.blocks.length === 0) return;
    const sorted = [...this.blocks].sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x);
    if (this.cursorId === null || !this.blocks.some((b) => b.id === this.cursorId)) {
      this.cursorId = sorted[sorted.length - 1].id; // bottom-most first
      return;
    }
    const cur = this.blocks.find((b) => b.id === this.cursorId)!;
    const curRow = this.meta.get(cur.id)?.row ?? 0;
    let candidates: Matter.Body[] = [];
    if (dir === 'up') candidates = this.blocks.filter((b) => (this.meta.get(b.id)?.row ?? 0) > curRow);
    if (dir === 'down') candidates = this.blocks.filter((b) => (this.meta.get(b.id)?.row ?? 0) < curRow);
    if (dir === 'left' || dir === 'right')
      candidates = this.blocks.filter(
        (b) =>
          (this.meta.get(b.id)?.row ?? 0) === curRow &&
          (dir === 'left' ? b.position.x < cur.position.x - 1 : b.position.x > cur.position.x + 1),
      );
    if (candidates.length === 0) return;
    candidates.sort((a, b) => {
      const da = Math.abs(a.position.x - cur.position.x) + Math.abs(a.position.y - cur.position.y) * 0.6;
      const db = Math.abs(b.position.x - cur.position.x) + Math.abs(b.position.y - cur.position.y) * 0.6;
      return da - db;
    });
    this.cursorId = candidates[0].id;
  }

  cursorRemove(): void {
    if (!this.inputOn || this.state !== 'playing' || this.overPending) return;
    const now = performance.now();
    if (now - this.lastRemoveAt < REMOVE_COOLDOWN) return;
    const b = this.blocks.find((x) => x.id === this.cursorId);
    if (b) this.removeBlock(b, now);
  }

  /* ================= scoring ================= */

  private currentScore(): number {
    return Math.floor(this.maxMeters * 10) + this.bonus;
  }

  private heroProgress(): number {
    // 100% == hero center on the landing line == the landing-win trigger line
    const denom = LAND_LINE_Y - this.heroY0;
    if (denom <= 0) return 0;
    return Math.max(0, Math.min(1, (this.hero.position.y - this.heroY0) / denom));
  }

  private emitLive(): void {
    this.cb.onLive({
      score: this.currentScore(),
      meters: this.maxMeters,
      removed: this.removed,
      converted: this.converted,
      combo: this.combo,
      maxCombo: this.maxCombo,
      roundMs: this.roundMs,
      coins: this.roundCoins,
      progress: this.heroProgress(),
      bonusMs: this.bonusTimeMs,
      lives: this.lives,
    });
  }

  /* ================= collisions ================= */

  private onCollisions(e: Matter.IEventCollision<Matter.Engine>): void {
    if (this.state !== 'playing') return;
    this.onHeroContact(e);
    for (const pair of e.pairs) {
      const va = pair.bodyA.velocity;
      const vb = pair.bodyB.velocity;
      const rel = Math.hypot(va.x - vb.x, va.y - vb.y);
      if (rel > 1.2) playTok(rel);
      if ((pair.bodyA.label === 'hero' || pair.bodyB.label === 'hero') && rel > 4) {
        this.squashT = performance.now();
        if (rel > 7) this.spawnDust(this.hero.position.x, this.hero.position.y + HEX_HALF_H, '#FFF3D6', 5);
      } else if (rel > 7) {
        // heavy block-on-block crash: dust at the contact + a small jolt
        const mx = (pair.bodyA.position.x + pair.bodyB.position.x) / 2;
        const my = (pair.bodyA.position.y + pair.bodyB.position.y) / 2;
        this.spawnDust(mx, my, '#D8C9B4', 5);
        this.addShake(Math.min(5, (rel - 7) * 0.8));
      }
    }
  }

  /** hero is touching something → not in free fall (endless extension gate) */
  private onHeroContact(e: Matter.IEventCollision<Matter.Engine>): void {
    for (const pair of e.pairs) {
      if (pair.bodyA.label === 'hero' || pair.bodyB.label === 'hero') {
        this.heroAirMs = 0;
        if (this.hero && this.hero.speed < 2) this.heroCalmMs = 0;
        return;
      }
    }
  }

  /* ================= particles & floats ================= */

  private spawnDust(x: number, y: number, color: string, count = 8): void {
    const cap = this.reducedMotion ? 40 : 80;
    for (let i = 0; i < count && this.particles.length < cap; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1,
        size: 3 + Math.random() * 3,
        color: Math.random() < 0.5 ? color : '#FFF3D6',
        t0: performance.now(),
        life: 420,
        kind: 'dust',
        rot: 0,
        vr: 0,
        gravity: 0.05,
      });
    }
  }

  private spawnConfetti(): void {
    const cap = this.reducedMotion ? 40 : 80;
    const count = this.reducedMotion ? 20 : 40;
    for (let i = 0; i < count && this.particles.length < cap; i++) {
      this.particles.push({
        x: this.hero.position.x + (Math.random() - 0.5) * 120,
        y: this.hero.position.y - 40 - Math.random() * 60,
        vx: (Math.random() - 0.5) * 3,
        vy: -2 - Math.random() * 3,
        size: 6,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        t0: performance.now(),
        life: 1600,
        kind: 'confetti',
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        gravity: 0.12,
      });
    }
  }

  /** celebratory burst when the hero crosses a checkpoint line */
  private spawnCheckpointBurst(x: number, y: number): void {
    const cap = this.reducedMotion ? 40 : 80;
    const colors = [CHECKPOINT_RED, '#FFFFFF', COIN_GOLD];
    for (let i = 0; i < 14 && this.particles.length < cap; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1.5 + Math.random() * 2.5;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 2,
        size: 5,
        color: colors[i % colors.length],
        t0: performance.now(),
        life: 900,
        kind: 'confetti',
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.35,
        gravity: 0.1,
      });
    }
  }

  private addFloat(x: number, y: number, text: string, color: string, size: number, life = 900): void {
    this.floats.push({ x, y, text, t0: performance.now(), life, color, size });
  }

  /* ================= main loop ================= */

  private loop = (t: number): void => {
    if (this.destroyed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = this.lastFrame ? Math.min(50, t - this.lastFrame) : 16.666;
    this.lastFrame = t;
    this.tick(dt);
    this.render(t);
  };

  /** One simulation tick: fixed-step physics + game logic (no rendering). */
  private tick(dt: number): void {
    if (!this.stepping) return;
    this.lastDt = dt;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= PHYS_DT && steps < 2) {
      stepPhysics(this.engine); // substeps internally — tall towers stay sag-free
      this.acc -= PHYS_DT;
      steps++;
      if (this.state === 'playing' && this.overPending === false) {
        this.roundMs += PHYS_DT;
        this.heroAirMs += PHYS_DT;
        this.heroCalmMs += PHYS_DT;
        if (this.mode === 'level') this.landingAssist(); // endless has no cloud platform
        // narrow-perch imbalance: a hero parked on a sub-cell support must
        // eventually tip over (real physics) instead of freezing there via
        // sleep. The wobble ramps in over PERCH_WOBBLE.rampMs of CONTINUOUS
        // calm perching, so a hero briefly pausing mid-descent feels nothing.
        this.perchMs = perchWobbleTick(
          this.hero,
          this.blocks,
          this.beamLeft,
          this.beamRight,
          this.beamW,
          this.wobbleRng,
          this.perchMs,
          PHYS_DT,
          this.mode === 'endless' ? this.frontierY + 4 * CELL : SENSOR_Y,
        );
      }
    }
    if (steps === 2) this.acc = 0;
    this.update(this.lastFrame);
  }

  /**
   * Cloud landing assist: when the hero is inside the platform approach zone
   * (last ~11 rows above the beam) and moving slowly, bleed off sideways
   * drift and add a tiny centering pull. This keeps a careful descent that
   * ends a few px off the beam edge from being a fall, without touching
   * honest tower physics higher up (fast tumbles are unaffected).
   */
  private landingAssist(): void {
    const A = LANDING_ASSIST;
    // endgame only: early towers are wide and their (intended) occasional
    // slow roll-offs are part of the teaching difficulty curve
    if (this.levelIdx + 1 < A.minLevel) return;
    const h = this.hero;
    if (!h || h.isSleeping) return;
    if (h.position.y < BEAM_TOP - A.zonePx || h.position.y > SENSOR_Y) return;
    // only steer a genuinely creeping hero — a rolling one must be left to
    // honest physics (was 1.5 pre-realism: the assist visibly fought rolls)
    if (h.speed > A.maxSpeed) return;
    const dx = BEAM_X - h.position.x;
    if (Math.abs(dx) < 6) return;
    const pull = Math.max(-A.pull, Math.min(A.pull, dx * 0.01));
    Matter.Body.setVelocity(h, { x: h.velocity.x * A.damp + pull, y: h.velocity.y });
  }

  /**
   * How close is the hero center to the nearest edge of whatever it is
   * standing on (a block's top face or the cloud beam)? Returns null while
   * airborne. dir = horizontal sign toward the nearer edge.
   */
  private heroEdgeInfo(): { dist: number; dir: number } | null {
    const h = this.hero;
    const bottom = h.position.y + HEX_HALF_H;
    let left = NaN;
    let right = NaN;
    // the beam counts as support when the hero is on it / grazing it
    if (Math.abs(bottom - BEAM_TOP) < 16 && h.position.x > this.beamLeft - HEX_R && h.position.x < this.beamRight + HEX_R) {
      left = this.beamLeft;
      right = this.beamRight;
    }
    let bestTop = Number.isNaN(left) ? -Infinity : BEAM_TOP;
    for (const b of this.blocks) {
      const top = b.bounds.min.y;
      if (Math.abs(top - bottom) > 12 || top <= bestTop) continue;
      if (h.position.x < b.bounds.min.x - HEX_R || h.position.x > b.bounds.max.x + HEX_R) continue;
      bestTop = top;
      left = b.bounds.min.x;
      right = b.bounds.max.x;
    }
    if (Number.isNaN(left)) return null;
    const dl = h.position.x - left;
    const dr = right - h.position.x;
    return dl < dr ? { dist: dl, dir: -1 } : { dist: dr, dir: 1 };
  }

  /**
   * Near-miss drama: the hero is rolling/tipping toward the nearer edge of
   * its support → a short slow-mo window (timeScale 0.3, 0.8 s real time),
   * a camera push-in and a heartbeat. Surviving it plays the "saved!" chime.
   * Rate-limited to one slow-mo per second; the anti-addiction countdown
   * (roundMs) accrues per real tick and is NOT slowed.
   */
  private nearMissCheck(t: number): void {
    if (this.slowmoActive || t - this.lastSlowmoAt < 1200) return;
    const h = this.hero;
    if (h.isSleeping) return;
    const edge = this.heroEdgeInfo();
    if (!edge || edge.dist > CELL * 1.5) return;
    const rollingOff = Math.sign(h.velocity.x) === edge.dir && Math.abs(h.velocity.x) > 0.7;
    const tipping = edge.dist < CELL && Math.sign(h.angularVelocity) === edge.dir && Math.abs(h.angularVelocity) > 1.4;
    if (!rollingOff && !tipping) return;
    this.slowmoActive = true;
    this.slowmoUntil = t + 800;
    this.lastSlowmoAt = t;
    this.engine.timing.timeScale = 0.3;
    this.zoomFxTarget = 1.12;
    playHeartbeat();
  }

  /** Platform-edge tension: hero parked within 1.5 cells of a beam edge →
   *  gentle camera push + nervous face (pure presentation, physics untouched). */
  private edgeWarnCheck(): void {
    const h = this.hero;
    let warn = false;
    if (h.position.y > BEAM_TOP - 130 && h.position.y < SENSOR_Y && h.speed < 1.5) {
      const edge = this.heroEdgeInfo();
      if (edge && edge.dist < CELL * 1.5) warn = true;
    }
    if (warn !== this.edgeWarn) {
      this.edgeWarn = warn;
      if (!this.slowmoActive) this.zoomFxTarget = warn ? 1.06 : 1;
    }
  }

  /**
   * Headless driver (used by scripts/verify-win.ts): advance the simulation
   * manually on an internal synthetic clock. No rAF / rendering involved.
   */
  advance(dtMs = 1000 / 60): void {
    if (this.destroyed) return;
    const dt = Math.min(50, dtMs);
    this.lastFrame += dt;
    this.tick(dt);
  }

  private update(t: number): void {
    this.simT = t;
    const hero = this.hero;

    // combo chain expiry
    if (this.comboActive && t - this.lastComboAt > COMBO_WINDOW) {
      this.comboActive = false;
      this.combo = 0;
      this.emitLive();
    }

    if (this.state === 'playing') {
      // periodic live emit so timers/stats tick even when idle on the tower
      if (t - this.lastEmitAt > 500) {
        this.lastEmitAt = t;
        this.emitLive();
      }

      // descent tracking
      const m = Math.max(0, (hero.position.y - this.heroY0) / PX_PER_M);
      if (m > this.maxMeters) {
        this.maxMeters = m;
        const ms = Math.floor(m);
        if (ms >= this.lastMilestone + 5) {
          this.lastMilestone = Math.floor(ms / 5) * 5;
          this.addFloat(hero.position.x, hero.position.y - 46, `+${this.lastMilestone}米！`, '#E8A93D', 28);
          playChime();
        }
        this.emitLive();
      }

      // progress bar smooth updates
      const p = this.heroProgress();
      if (Math.abs(p - this.lastProgress) > 0.004) {
        this.lastProgress = p;
        this.emitLive();
      }

      // ---- endless: keep the world growing below the descending hero ----
      // 失控门控：hero 持续 1.5s 没有"平静接触"（接触且速度<2）时停止向下
      // 延展。判据用"平静"而非"接触"：滚落的 hero 会不断撞到新生成的积木，
      // 任何接触都算的话世界会永远追着它长（"一直往下掉"）。门控一关，
      // frontier 停长，hero 自然落到所有积木之下 → 扣命/重生。正常下潜时
      // hero 频繁平静停靠，延展不受影响。
      if (
        this.mode === 'endless' &&
        this.overPending === false &&
        this.heroCalmMs < 1500 &&
        hero.position.y > this.frontierY - ENDLESS_GEN_AHEAD_PX
      ) {
        this.extendEndless();
      }

      if (this.overPending === false) {
        // ---- checkpoint dashed lines: +3s (level mode only) + 5 coins, once
        // per line; in endless a crossed line becomes the respawn anchor ----
        // (speed-guarded: a hero FREE-FALLING past a line must not set the
        // anchor — respawning mid-air in a stripped shaft would chain deaths)
        // ENDLESS 还必须"站在积木上"才记账：掉到底部兜网地板上坐着的 hero 是
        // 平静的（speed<4），若不限制，锚点会追着它一路下移，坠落永远不会结
        // 束（"一直往下掉结束不了"）。地板是安全网，不是电梯——只有踩回塔身
        // 积木才算真正的下潜进度。
        const anchored = this.mode === 'level' || this.heroOnBlock();
        for (const cp of this.checkpoints) {
          if (!cp.hit && hero.position.y > cp.y && (this.mode === 'level' || (hero.speed < 4 && anchored))) {
            cp.hit = true;
            cp.hitAt = t;
            this.respawnY = cp.y;
            this.roundCoins += 5;
            if (this.mode === 'level') {
              this.bonusTimeMs += CHECKPOINT_BONUS_SEC * 1000;
              this.addFloat(hero.position.x, cp.y - 34, `+${CHECKPOINT_BONUS_SEC}s`, CHECKPOINT_RED, 30, 1200);
            } else {
              this.addFloat(hero.position.x, cp.y - 34, '✓ 检查点', CHECKPOINT_RED, 26, 1200);
            }
            this.addFloat(hero.position.x, cp.y - 66, '+5', COIN_GOLD, 22, 1100);
            this.spawnCheckpointBurst(hero.position.x, cp.y);
            playWindChime();
            playCoin();
            this.emitLive();
          }
        }

        if (this.mode === 'level') {
          // ---- countdown (roundMs only accrues while stepping, so pause/lock freeze it) ----
          const leftMs = this.timeLimitMs + this.bonusTimeMs - this.roundMs;
          const secLeft = Math.ceil(leftMs / 1000);
          if (secLeft !== this.lastSecLeft) {
            this.lastSecLeft = secLeft;
            if (secLeft <= 10 && secLeft > 0) playTick();
          }
          if (leftMs <= 0) {
            this.overPending = 'over';
            this.overReason = 'timeout';
            this.overAt = t;
            this.overWaitMs = 600;
            playTimeout();
            setRolling(0);
            setWind(0);
            this.emitLive();
          }
        }
      }

      // ---- blocks that fell out of the world can never be clicked again:
      // deregister them so they don't silently block the all-clear check.
      // (only while undecided — during a landing celebration the convert
      // queue owns every remaining block, culled or not)
      if (this.overPending === false) this.cullEscapedBlocks();

      // ---- sleeping blocks whose support crumbled away must not float
      if (this.overPending === false && t - this.auditAt > 250) {
        this.auditAt = t;
        this.auditUnsupportedBlocks();
      }

      // ---- all-clear can also happen OUTSIDE the click path (last block
      // knocked off the beam / shaken out of the world) — check every tick ----
      // (level mode only: in endless a stripped shaft just means the hero
      // free-falls to the frontier floor and the next segment arrives)
      if (this.mode === 'level' && this.overPending === false && this.blocks.length === 0) {
        this.triggerAllClear(hero.position.x, hero.position.y);
      }

      // ---- landing win: hero calmly at the bottom → clear, rest converts ----
      if (this.mode === 'level' && this.overPending === false) this.checkLanding();

      // ---- near-miss slow-mo + platform-edge tension ----
      if (this.overPending === false) {
        this.nearMissCheck(t);
        this.edgeWarnCheck();
      }
      if (this.slowmoActive && t >= this.slowmoUntil) {
        this.slowmoActive = false;
        if (this.overPending === false) {
          this.engine.timing.timeScale = 1;
          this.zoomFxTarget = this.edgeWarn ? 1.06 : 1;
          // saved! the hero pulled back from the brink
          if (this.hero.speed < 2 && this.hero.position.y < this.worldBottomY()) {
            playSaved();
            this.addFloat(this.hero.position.x, this.hero.position.y - 62, '好险！救回来了', '#57B832', 24, 1100);
          }
        }
      }
      // drama zoom easing (slow-mo push-in / edge warning push)
      this.zoomFx += (this.zoomFxTarget - this.zoomFx) * 0.12;

      if (this.overPending === false) {
        // fall-off condition
        const bx = hero.position.x;
        const by = hero.position.y;
        if (this.mode === 'endless') {
          // rolling off / falling out costs one of 3 lives, then respawn at
          // the last checkpoint; at 0 lives the run ends
          //
          // 失控坠落兜底（两条，取先触发者）：
          // 1) 悬空：低于锚点 10 层以上且持续 0.8s 无任何接触 → 约 13 层以上
          //    的无着落自由下坠，途中就会判坠落，等不到落地。
          // 2) 深潭滞留：低于锚点 10 层以上累计 2.5s（无论有无接触）→ 坐在
          //    兜网地板上上不来也算失败。判据用"悬空/滞留"而非"速度"：在积木
          //    上快速滚动是可控的。锚点只在"低速且站在积木上"时记账（见上方
          //    检查点循环），谨慎玩家锚点永远贴在 3 层以内，两条都碰不到；
          //    落回积木上（低速+接触→记账跟进）立即安全。
          const tooDeep = by > this.respawnY + 10 * CELL;
          if (tooDeep) this.heroDeepMs += this.lastDt;
          else if (by <= this.respawnY + 5 * CELL) this.heroDeepMs = 0;
          if ((tooDeep && this.heroAirMs > 800) || this.heroDeepMs > 2500 || this.endlessFallCheck(bx, by)) {
            this.lastFallRule =
              tooDeep && this.heroAirMs > 800 ? 'airborne-backstop' : this.heroDeepMs > 2500 ? 'deep-stall' : 'fall-check';
            this.loseLife(t);
          }
        } else if ((by > BEAM_TOP + 2 && (bx < this.beamLeft - 2 || bx > this.beamRight + 2)) || by > SENSOR_Y) {
          this.overPending = 'over';
          this.overReason = 'fall';
          this.overAt = t;
          this.overWaitMs = 500;
          this.engine.timing.timeScale = 0.35;
          playBoop();
          setRolling(0);
          setWind(0);
        }
      } else {
        // happy cloud bounce + confetti when the hero touches down on any clear
        if (this.overPending === 'clear' && !this.bounceDone && hero.position.y >= LAND_LINE_Y) {
          this.bounceDone = true;
          this.platformBounceT0 = t;
          this.spawnConfetti();
        }
        // landing-clear celebration: auto-pop the remaining blocks one by one
        let pops = 0;
        while (this.convertQueue.length > 0 && t >= this.convertQueue[0].at && pops < 3) {
          const { body } = this.convertQueue.shift()!;
          this.convertBlock(body, t);
          pops++;
        }
        // finalize after slow-mo / celebration
        if (t - this.overAt > this.overWaitMs) {
          const outcome: RoundOutcome =
            this.overPending === 'clear' ? 'clear' : this.overReason;
          this.state = 'over';
          this.lastClearWin = outcome === 'clear';
          this.stepping = false;
          this.inputOn = false;
          this.engine.timing.timeScale = 1;
          this.overPending = false;
          this.convertQueue = [];
          this.cb.onGameOver({
            outcome,
            score: this.currentScore(),
            meters: this.maxMeters,
            removed: this.removed,
            converted: this.converted,
            convertBonus: this.convertBonus,
            landed: this.landed && outcome === 'clear',
            maxCombo: this.maxCombo,
            roundMs: this.roundMs,
            timeLeftMs: Math.max(0, this.timeLimitMs + this.bonusTimeMs - this.roundMs),
            timeBonus: this.timeBonus,
            coins: this.roundCoins,
          });
        }
      }

      // rolling + wind sound (wind follows fall speed)
      if (this.overPending === false) {
        const sp = hero.speed;
        setRolling(sp > 1 && hero.position.y < this.worldBottomY() ? Math.min(1, hero.angularSpeed / 6) : 0);
        setWind(sp > 6 && hero.position.y < this.worldBottomY() ? Math.min(1, (sp - 6) / 9) : 0);
      } else {
        setWind(0);
      }

      // camera follow: hero rides at ~42% from the top of the view;
      // a fast fall tightens the follow so the speed reads on screen
      const target = hero.position.y - this.viewH * 0.42;
      const clamped = this.clampCamY(target);
      const follow = hero.speed > 6 ? 0.22 : 0.08;
      this.camY = this.reducedMotion ? clamped : this.camY + (clamped - this.camY) * follow;

      // blink scheduling
      if (t - this.blinkT0 > this.nextBlink) {
        this.blinkT0 = t;
        this.nextBlink = 3000 + Math.random() * 1000;
      }
    }
  }

  /* ================= rendering ================= */

  private render(t: number): void {
    const ctx = this.ctx;
    if (this.headless || !ctx) return;
    const dpr = this.dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    // ---- backdrop scenery (screen space: clouds stay in the sky) ----
    this.drawScenery(ctx, t);

    // ---- world space: camera zoom + pan, drama zoom (slow-mo push-in /
    // edge warning) zoomed around the view center, plus screen shake ----
    const s = dpr * this.zoom * this.zoomFx;
    let shX = 0;
    let shY = 0;
    const shakeAge = t - this.shakeT0;
    if (this.shakeMag > 0 && shakeAge < 420) {
      const k = this.shakeMag * (1 - shakeAge / 420);
      shX = Math.sin(t / 13) * k;
      shY = Math.cos(t / 17) * k * 0.7;
    } else {
      this.shakeMag = 0;
    }
    const cxw = this.camX + this.viewW / 2 + shX;
    const cyw = this.camY + this.viewH / 2 + shY;
    ctx.save();
    ctx.setTransform(s, 0, 0, s, (dpr * this.cssW) / 2 - cxw * s, (dpr * this.cssH) / 2 - cyw * s);

    // ---- ground dressing (hills / cloud-sea / sparkles, behind everything) ----
    // (level mode only — endless descends past the ground band forever)
    if (this.mode === 'level') this.drawGround(ctx);

    // ---- checkpoint dashed lines (behind the tower) ----
    this.drawCheckpoints(ctx, t);

    // ---- platform ----
    if (this.mode === 'level') this.drawPlatform(ctx, t);

    // ---- blocks (culled to the visible window for 60fps with tall towers) ----
    const cullTop = this.camY - 90;
    const cullBot = this.camY + this.viewH + 90;
    for (const b of this.blocks) {
      if (b.position.y < cullTop || b.position.y > cullBot) continue;
      this.drawBlock(ctx, b, t);
    }

    // ---- ghosts (removal pop) ----
    this.ghosts = this.ghosts.filter((g) => t - g.t0 < 150);
    for (const g of this.ghosts) {
      const p = (t - g.t0) / 150;
      const s = p < 0.4 ? 1 + 0.12 * (p / 0.4) : 1.12 * (1 - (p - 0.4) / 0.6);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p);
      ctx.translate(g.x, g.y);
      ctx.rotate(g.angle);
      ctx.scale(Math.max(0.01, s), Math.max(0.01, s));
      this.paintPiece(ctx, g.cells, g.color, g.kind, [], 1);
      ctx.restore();
    }

    // ---- hexagon hero ----
    this.drawHero(ctx, t);

    // ---- particles ----
    this.drawParticles(ctx, t);

    // ---- floating texts ----
    this.drawFloats(ctx, t);

    ctx.restore();
  }

  /**
   * Backdrop: sky gradient (screen space, sampled by world altitude) plus two
   * continuous parallax layers. Every element's position derives from camY
   * through a fixed affine map — no modulo on y, no resets, no pattern tiles.
   */
  private drawScenery(ctx: CanvasRenderingContext2D, t: number): void {
    const W = this.cssW;
    const H = this.cssH;
    const dpr = this.dpr;

    // ---- 1. sky: one continuous altitude gradient over the whole descent ----
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    const SKY_SAMPLES = 8;
    for (let i = 0; i <= SKY_SAMPLES; i++) {
      const f = i / SKY_SAMPLES;
      grad.addColorStop(f, skyColorAt(this.camY + f * this.viewH));
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const camTop = Math.min(this.camMin, this.camMax);
    const camBot = Math.max(this.camMin, this.camMax);

    // ---- 2. far layer (0.45×): snowy ridge + small slow clouds ----
    this.drawFarLayer(ctx, t, dpr, camBot);

    // ---- 3. near layer (0.72×): bigger fluffy clouds drifting by ----
    this.drawCloudLayer(ctx, t, dpr, NEAR_F, camTop, camBot, SCENERY.nearClouds, 0.92);
  }

  /** camera transform for a parallax layer: layer y = world y mapped via camY·f */
  private layerTransform(ctx: CanvasRenderingContext2D, dpr: number, f: number): void {
    const s = dpr * this.zoom;
    ctx.setTransform(s, 0, 0, s, -this.camX * s, -this.camY * f * s);
  }

  /** snow-capped ridge spanning the whole world width (non-periodic sines) */
  private ridgeHeight(x: number): number {
    const [p1, p2, p3] = SCENERY.ridgePhase;
    return (
      (Math.sin(x * 0.011 + p1) * 0.5 + Math.sin(x * 0.023 + p2) * 0.3 + Math.sin(x * 0.041 + p3) * 0.2 + 1) / 2
    );
  }

  private drawFarLayer(
    ctx: CanvasRenderingContext2D,
    t: number,
    dpr: number,
    camBot: number,
  ): void {
    ctx.save();
    this.layerTransform(ctx, dpr, FAR_F);
    const f = FAR_F;
    // ridge base sits just below the view bottom when the camera is all the
    // way down; it rises into view continuously during the last stretch
    const baseY = f * camBot + this.viewH * 1.04;
    const amp = Math.min(340, this.viewH * 0.62);

    // far clouds first (ridge overlaps them)
    this.drawClouds(ctx, t, f, Math.min(this.camMin, this.camMax), camBot, SCENERY.farClouds, 0.66);

    // ridge silhouette
    const x0 = -100;
    const x1 = WORLD_W + 100;
    const step = 14;
    const peakY = (x: number) => baseY - amp * (0.22 + 0.78 * this.ridgeHeight(x));
    ctx.fillStyle = 'rgba(219,238,248,0.62)';
    ctx.beginPath();
    ctx.moveTo(x0, baseY + 60);
    for (let x = x0; x <= x1; x += step) ctx.lineTo(x, peakY(x));
    ctx.lineTo(x1, baseY + 60);
    ctx.closePath();
    ctx.fill();

    // snow caps on the local maxima
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    let prevH = this.ridgeHeight(x0);
    let curH = this.ridgeHeight(x0 + step);
    for (let x = x0 + step; x < x1 - step; x += step) {
      const nextH = this.ridgeHeight(x + step);
      if (curH > 0.62 && curH >= prevH && curH >= nextH) {
        const px = x;
        const py = peakY(x);
        const s = amp * 0.16 * (0.7 + curH * 0.5);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + s * 0.5, py + s * 0.95);
        ctx.lineTo(px + s * 0.17, py + s * 0.8);
        ctx.lineTo(px - s * 0.02, py + s);
        ctx.lineTo(px - s * 0.24, py + s * 0.78);
        ctx.lineTo(px - s * 0.5, py + s * 0.92);
        ctx.closePath();
        ctx.fill();
      }
      prevH = curH;
      curH = nextH;
    }
    ctx.restore();
  }

  /** one parallax cloud layer (shared by far + near) */
  private drawCloudLayer(
    ctx: CanvasRenderingContext2D,
    t: number,
    dpr: number,
    f: number,
    camTop: number,
    camBot: number,
    clouds: SceneryCloud[],
    alpha: number,
  ): void {
    ctx.save();
    this.layerTransform(ctx, dpr, f);
    this.drawClouds(ctx, t, f, camTop, camBot, clouds, alpha);
    ctx.restore();
  }

  /**
   * Clouds scattered through the layer's camera-travel range. Vertical
   * positions are fixed in layer space (continuous scroll); only the slow
   * horizontal drift wraps — and only while fully off-screen.
   */
  private drawClouds(
    ctx: CanvasRenderingContext2D,
    t: number,
    f: number,
    camTop: number,
    camBot: number,
    clouds: SceneryCloud[],
    alpha: number,
  ): void {
    const spanX = WORLD_W + 260;
    const top = f * camTop - 60;
    const range = f * camBot + this.viewH - 60 - top;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    for (const c of clouds) {
      const drift = this.reducedMotion ? 0 : ((t / 1000) * c.speed * 4) % spanX;
      const x = ((c.fx * spanX + drift + 130) % spanX) - 130;
      const y = top + c.fy * range;
      ctx.beginPath();
      ctx.ellipse(x, y, 36 * c.s, 15 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 26 * c.s, y + 4 * c.s, 24 * c.s, 12 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 28 * c.s, y + 5 * c.s, 22 * c.s, 11 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 2 * c.s, y - 9 * c.s, 20 * c.s, 11 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * World-space ground dressing (1× with the tower): pale rolling hills and a
   * cloud-sea mist tucked around the platform legs, so the bottom of the
   * descent continues the picture instead of fading to empty sky.
   */
  private drawGround(ctx: CanvasRenderingContext2D): void {
    const x0 = this.camX - 90;
    const x1 = this.camX + this.viewW + 90;
    // pale distant hills (fixed world sines — static, seamless)
    ctx.fillStyle = 'rgba(209,234,206,0.85)';
    ctx.beginPath();
    ctx.moveTo(x0, GROUND_Y + 40);
    for (let x = x0; x <= x1; x += 22) {
      ctx.lineTo(x, 896 - 10 * Math.sin(x * 0.013 + 1.7) - 6 * Math.sin(x * 0.031 + 0.4));
    }
    ctx.lineTo(x1, GROUND_Y + 40);
    ctx.closePath();
    ctx.fill();
    // nearer soft green bank
    ctx.fillStyle = 'rgba(190,224,190,0.9)';
    ctx.beginPath();
    ctx.moveTo(x0, GROUND_Y + 40);
    for (let x = x0; x <= x1; x += 22) {
      ctx.lineTo(x, 912 - 7 * Math.sin(x * 0.021 + 3.1) - 4 * Math.sin(x * 0.043 + 0.9));
    }
    ctx.lineTo(x1, GROUND_Y + 40);
    ctx.closePath();
    ctx.fill();
    // cloud-sea mist drifting around the platform legs
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let x = Math.floor(x0 / 64) * 64; x <= x1; x += 64) {
      const mx = x + 18 * Math.sin(x * 0.05);
      const my = 910 + 4 * Math.sin(x * 0.021);
      ctx.beginPath();
      ctx.ellipse(mx, my, 52, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // twinkling sparkles anchored along the descent (world space)
    const camTop = Math.min(this.camMin, this.camMax);
    for (const sp of SCENERY.sparkles) {
      const y = camTop - 40 + sp.fy * (GROUND_Y - 140 - camTop);
      if (y < this.camY - 20 || y > this.camY + this.viewH + 20) continue;
      const tw = this.reducedMotion ? 1 : 0.5 + 0.5 * Math.sin(this.simT / 700 + sp.ph);
      ctx.globalAlpha = 0.12 + 0.3 * tw;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(sp.x, y, sp.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** red dashed checkpoint lines with an hourglass "+3s" badge at the right edge */
  private drawCheckpoints(ctx: CanvasRenderingContext2D, t: number): void {
    for (const cp of this.checkpoints) {
      let alpha = 1;
      if (cp.hit) {
        const p = (t - cp.hitAt) / 900;
        if (p >= 1) continue;
        alpha = 1 - p;
      }
      const pulse = cp.hit ? 1 : 0.8 + 0.2 * Math.sin(t / 320);
      ctx.save();
      ctx.globalAlpha = alpha * pulse;

      // dashed line across the visible window
      ctx.strokeStyle = CHECKPOINT_RED;
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 12]);
      ctx.beginPath();
      ctx.moveTo(this.camX, cp.y);
      ctx.lineTo(this.camX + this.viewW, cp.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // hourglass "+3s" badge (level mode only — endless lines are respawn
      // anchors, no time bonus to advertise)
      if (this.mode === 'level') {
      const bx = Math.min(this.camX + this.viewW - 46, TILE_X + COLS * CELL + 40);
      const by = cp.y;
      ctx.beginPath();
      ctx.arc(bx, by, 16, 0, Math.PI * 2);
      ctx.fillStyle = CHECKPOINT_RED;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.stroke();
      // hourglass glyph
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(bx - 6, by - 9, 12, 2);
      ctx.fillRect(bx - 6, by + 7, 12, 2);
      ctx.beginPath();
      ctx.moveTo(bx - 5, by - 7);
      ctx.lineTo(bx + 5, by - 7);
      ctx.lineTo(bx, by);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - 5, by + 7);
      ctx.lineTo(bx + 5, by + 7);
      ctx.closePath();
      ctx.fill();

      // "+3s" label
      ctx.font = 'bold 17px "ZCOOL KuaiLe", "Baloo 2", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.strokeText(`+${CHECKPOINT_BONUS_SEC}s`, bx - 22, by);
      ctx.fillStyle = CHECKPOINT_RED;
      ctx.fillText(`+${CHECKPOINT_BONUS_SEC}s`, bx - 22, by);
      }
      ctx.restore();
    }
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  /** Trace the exposed outline of a polyomino piece (in body-local coords). */
  private outlinePath(ctx: CanvasRenderingContext2D, cells: LocalCell[], inset: number): void {
    const has = (c: LocalCell, dx: number, dy: number) =>
      cells.some((o) => Math.abs(o.x - (c.x + dx)) < 2 && Math.abs(o.y - (c.y + dy)) < 2);
    ctx.beginPath();
    for (const c of cells) {
      const l = c.x - c.w / 2 + inset;
      const r = c.x + c.w / 2 - inset;
      const tp = c.y - c.h / 2 + inset;
      const bt = c.y + c.h / 2 - inset;
      if (!has(c, 0, -CELL)) {
        ctx.moveTo(l, tp);
        ctx.lineTo(r, tp);
      }
      if (!has(c, 0, CELL)) {
        ctx.moveTo(l, bt);
        ctx.lineTo(r, bt);
      }
      if (!has(c, -CELL, 0)) {
        ctx.moveTo(l, tp);
        ctx.lineTo(l, bt);
      }
      if (!has(c, CELL, 0)) {
        ctx.moveTo(r, tp);
        ctx.lineTo(r, bt);
      }
    }
  }

  /** Fill a tetromino piece: flat cartoon color, light outline, top-lit edges.
   *  Key blocks get a dark warning outline instead of the usual white one. */
  private paintPiece(
    ctx: CanvasRenderingContext2D,
    cells: LocalCell[],
    color: string,
    kind: BlockKind,
    speckles: { x: number; y: number; r: number }[],
    alpha: number,
    keyBlock = false,
  ): void {
    ctx.save();
    ctx.globalAlpha *= alpha;
    const light = shade(color, 14);
    const dark = shade(color, -12);

    // per-cell flat fill (slightly oversized to hide hairline seams)
    ctx.fillStyle = color;
    for (const c of cells) {
      ctx.fillRect(c.x - c.w / 2 - 0.6, c.y - c.h / 2 - 0.6, c.w + 1.2, c.h + 1.2);
    }

    // edge lighting: light on exposed tops, soft shade on exposed bottoms
    const has = (c: LocalCell, dx: number, dy: number) =>
      cells.some((o) => Math.abs(o.x - (c.x + dx)) < 2 && Math.abs(o.y - (c.y + dy)) < 2);
    for (const c of cells) {
      const l = c.x - c.w / 2;
      const tp = c.y - c.h / 2;
      if (!has(c, 0, -CELL)) {
        ctx.fillStyle = light;
        ctx.fillRect(l, tp, c.w, 5);
      }
      if (!has(c, 0, CELL)) {
        ctx.fillStyle = dark;
        ctx.globalAlpha *= 0.35;
        ctx.fillRect(l, tp + c.h - 4, c.w, 4);
        ctx.globalAlpha /= 0.35;
      }
    }

    // kind decorations
    if (kind === 'ice') {
      // aligned frosty gloss across the whole piece
      ctx.save();
      ctx.beginPath();
      for (const c of cells) ctx.rect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h);
      ctx.clip();
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const c of cells) {
        minX = Math.min(minX, c.x - c.w / 2);
        maxX = Math.max(maxX, c.x + c.w / 2);
        minY = Math.min(minY, c.y - c.h / 2);
        maxY = Math.max(maxY, c.y + c.h / 2);
      }
      ctx.globalAlpha *= 0.4;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(minX + 8, maxY);
      ctx.lineTo(minX + 26, minY);
      ctx.lineTo(minX + 40, minY);
      ctx.lineTo(minX + 22, maxY);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else if (kind === 'heavy') {
      // rivets on every cell
      ctx.fillStyle = 'rgba(59,51,42,0.35)';
      for (const c of cells) {
        for (const rx of [c.x - c.w / 2 + 6, c.x + c.w / 2 - 6]) {
          ctx.beginPath();
          ctx.arc(rx, c.y, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // speckles
    ctx.fillStyle = 'rgba(59,51,42,0.08)';
    for (const s of speckles) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // light cartoon outline around the piece silhouette
    this.outlinePath(ctx, cells, 1);
    ctx.strokeStyle = keyBlock ? 'rgba(59,51,42,0.62)' : 'rgba(255,255,255,0.7)';
    ctx.lineWidth = keyBlock ? 3 : 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
  }

  private drawBlock(ctx: CanvasRenderingContext2D, b: Matter.Body, t: number): void {
    const m = this.meta.get(b.id);
    if (!m) return;
    // intro build-up: pieces rise from 8px below, stagger 25ms bottom→top
    const delay = m.row * 25;
    const p = Math.min(1, Math.max(0, (t - this.introT0 - delay) / 300));
    if (p <= 0) return;
    const ease = 1 - Math.pow(1 - p, 3);
    const introDy = (1 - ease) * 8;

    const isHover = this.hovered?.id === b.id;
    const isCursor = this.cursorId === b.id;

    ctx.save();
    ctx.translate(b.position.x, b.position.y + introDy);
    ctx.rotate(b.angle);
    // key blocks shiver ever so slightly (visual warning only — physics untouched)
    if (m.key && !this.reducedMotion) {
      ctx.translate(Math.sin(t / 120 + b.id * 1.7) * 0.9, 0);
    }
    ctx.globalAlpha = 0.35 + 0.65 * ease;

    // soft bbox shadow
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const c of m.cells) {
      minX = Math.min(minX, c.x - c.w / 2);
      maxX = Math.max(maxX, c.x + c.w / 2);
      minY = Math.min(minY, c.y - c.h / 2);
      maxY = Math.max(maxY, c.y + c.h / 2);
    }
    // soft bbox shadow — plain alpha fill (ctx.filter blur ×100+ blocks kills 60fps)
    ctx.save();
    ctx.translate(1.5, 4);
    ctx.globalAlpha *= 0.1;
    this.roundRect(ctx, minX, minY, maxX - minX, maxY - minY, 6);
    ctx.fillStyle = '#3B332A';
    ctx.fill();
    ctx.restore();

    this.paintPiece(ctx, m.cells, isHover ? shade(m.color, 7) : m.color, m.kind, m.speckles, 1);

    if (isHover || isCursor) {
      ctx.save();
      ctx.setLineDash([6, 5]);
      this.outlinePath(ctx, m.cells, -2.5);
      ctx.strokeStyle = isCursor ? '#3B332A' : 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  /** cloud-style platform: puffy white beam + two cloud columns + coral flags */
  private drawPlatform(ctx: CanvasRenderingContext2D, t: number): void {
    // happy bounce when the hero lands safely (landing-clear celebration)
    const bp = (t - this.platformBounceT0) / 750;
    const bounce =
      bp >= 0 && bp < 1 && !this.reducedMotion ? Math.abs(Math.sin(bp * Math.PI * 2.2)) * (1 - bp) * 7 : 0;
    ctx.save();
    ctx.translate(0, -bounce);
    const puff = (x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    // legs as stacked cloud columns tucked under the beam ends (match physics)
    const legOff = Math.max(Math.min(100, this.beamW * 0.45) / 2, this.beamW / 2 - 45);
    for (const lx of [BEAM_X - legOff, BEAM_X + legOff]) {
      ctx.save();
      ctx.fillStyle = '#F4FBFE';
      puff(lx, 838, 30);
      puff(lx, 862, 34);
      puff(lx, 888, 38);
      puff(lx - 18, 856, 22);
      puff(lx + 18, 856, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      puff(lx - 8, 830, 16);
      ctx.restore();
    }
    // beam shadow
    ctx.save();
    ctx.translate(BEAM_X + 2, BEAM_Y + 8);
    ctx.globalAlpha = 0.12;
    this.roundRect(ctx, -this.beamW / 2, -BEAM_H / 2, this.beamW, BEAM_H, 10);
    ctx.fillStyle = '#3B332A';
    ctx.fill();
    ctx.restore();
    // puffy beam: rounded cloud caps at both ends + scalloped puffs along the
    // top edge, count proportional to the (tower-width) platform
    ctx.save();
    ctx.translate(BEAM_X, BEAM_Y);
    ctx.fillStyle = '#F8FDFF';
    this.roundRect(ctx, -this.beamW / 2, -BEAM_H / 2, this.beamW, BEAM_H, 12);
    ctx.fill();
    const puffs = Math.max(6, Math.round(this.beamW / 26));
    for (let i = 0; i <= puffs; i++) {
      const px = -this.beamW / 2 + (this.beamW / puffs) * i;
      puff(px, -BEAM_H / 2 + 2, 13);
      puff(px + 10, -BEAM_H / 2 + 5, 9);
    }
    // big rounded cloud caps hugging both ends
    puff(-this.beamW / 2 + 4, -2, 17);
    puff(this.beamW / 2 - 4, -2, 17);
    ctx.fillStyle = '#DCEFF7';
    ctx.fillRect(-this.beamW / 2, BEAM_H / 2 - 5, this.beamW, 5);
    ctx.restore();
    // little coral flags at both ends (fall-off boundary markers)
    for (const dir of [-1, 1]) {
      const fx = BEAM_X + dir * (this.beamW / 2 - 16);
      ctx.save();
      ctx.translate(fx, BEAM_TOP - 14);
      ctx.strokeStyle = '#8A7A68';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 14);
      ctx.lineTo(0, -6);
      ctx.stroke();
      ctx.fillStyle = CHECKPOINT_RED;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(dir * 12, -2);
      ctx.lineTo(0, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore(); // platform bounce wrap
  }

  /** flat-top hexagon path (circumradius r), centered at origin */
  private hexPath(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i; // vertices left/right, flat top & bottom edges
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  private drawHero(ctx: CanvasRenderingContext2D, t: number): void {
    const b = this.hero;
    const x = b.position.x;
    const y = b.position.y;
    const speed = b.speed;
    const spin = Math.abs(b.angularSpeed);
    const dead = this.overPending === 'over' || (this.state === 'over' && !this.lastClearWin);
    const happy = this.lastClearWin || this.overPending === 'clear';
    const falling = speed > 6;
    const dizzy = !dead && !happy && !falling && spin > 1.8;
    const nervous = !dead && !happy && !falling && !dizzy && this.edgeWarn;

    // intro drop-in
    const introP = Math.min(1, Math.max(0, (t - this.introT0 - 300) / 450));
    const dropDy = (1 - this.easeOutBack(introP)) * -30;

    ctx.save();
    ctx.translate(x, y + dropDy);
    if (introP <= 0) {
      ctx.restore();
      return;
    }
    ctx.globalAlpha = introP;

    // breathing squash (idle) / impact squash
    let sx = 1;
    let sy = 1;
    const sinceSquash = t - this.squashT;
    if (sinceSquash < 160) {
      const p = sinceSquash / 160;
      const k = Math.sin(p * Math.PI);
      sy = 1 - 0.18 * k * (1 - p);
      sx = 1 + 0.15 * k * (1 - p);
    } else if (speed < 0.5 && !this.reducedMotion) {
      sy = 1 + Math.sin((t / 2400) * Math.PI * 2) * 0.015;
    }
    ctx.rotate(b.angle);
    ctx.scale(sx, sy);

    // outer hexagon: fresh green with a soft vertical gradient
    const grad = ctx.createLinearGradient(0, -HEX_R, 0, HEX_R);
    grad.addColorStop(0, '#93E554');
    grad.addColorStop(0.55, '#6ECF3F');
    grad.addColorStop(1, '#4FB02B');
    this.hexPath(ctx, HEX_R);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#3E9622';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // inner hexagon: pale yellow-green face plate (like the reference)
    this.hexPath(ctx, HEX_R * 0.66);
    ctx.fillStyle = '#EAF9AD';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // specular highlight
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(-8, -11, 6.5, 4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ---- face state machine ----
    const blinkP = (t - this.blinkT0) / 140;
    const blink = blinkP < 1 ? Math.abs(blinkP - 0.5) * 2 : 1; // 1 open, 0 closed
    const wide = falling ? 1.3 : nervous ? 1.22 : 1;
    const lookX = speed >= 0.5 && !falling ? Math.max(-2, Math.min(2, b.velocity.x * 0.4)) : 0;
    const ink = '#3B332A';

    if (dead) {
      // >< squeezed eyes
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      for (const ex of [-8, 8]) {
        ctx.beginPath();
        ctx.moveTo(ex - 3.5, -8);
        ctx.lineTo(ex + 3.5, -3);
        ctx.moveTo(ex + 3.5, -8);
        ctx.lineTo(ex - 3.5, -3);
        ctx.stroke();
      }
    } else if (happy) {
      // ^^ happy eyes + blush
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      for (const ex of [-8, 8]) {
        ctx.beginPath();
        ctx.arc(ex, -3, 4.2, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,150,130,0.55)';
      ctx.beginPath();
      ctx.arc(-13, 2, 3, 0, Math.PI * 2);
      ctx.arc(13, 2, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (dizzy) {
      // @@ spiral eyes
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.6;
      for (const ex of [-8, 8]) {
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 3.2; a += 0.25) {
          const rr = 0.5 + (a / (Math.PI * 3.2)) * 3.6;
          const px = ex + Math.cos(a) * rr;
          const py = -5 + Math.sin(a) * rr;
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    } else {
      const eyeOpen = Math.max(0.1, blink);
      ctx.fillStyle = ink;
      for (const ex of [-8, 8]) {
        ctx.save();
        ctx.translate(ex + lookX, -5);
        ctx.scale(wide, wide * eyeOpen);
        ctx.beginPath();
        ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // mouth
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (dead) {
      ctx.arc(0, 9, 3.5, Math.PI * 1.15, Math.PI * 1.85, true);
    } else if (happy) {
      ctx.arc(0, 3, 5.5, Math.PI * 0.15, Math.PI * 0.85);
    } else if (falling) {
      ctx.arc(0, 6, 3, 0, Math.PI * 2);
    } else if (nervous) {
      // worried little "o" mouth
      ctx.arc(0, 7, 2.2, 0, Math.PI * 2);
    } else if (dizzy) {
      // wavy mouth
      ctx.moveTo(-5, 6);
      ctx.quadraticCurveTo(-2.5, 3.5, 0, 6);
      ctx.quadraticCurveTo(2.5, 8.5, 5, 6);
    } else {
      ctx.moveTo(-3.5, 6);
      ctx.lineTo(3.5, 6);
    }
    ctx.stroke();

    // nervous sweat drop
    if (nervous && !this.reducedMotion) {
      const sy2 = -16 + Math.sin(t / 260) * 1.5;
      ctx.fillStyle = 'rgba(120,190,240,0.95)';
      ctx.beginPath();
      ctx.moveTo(15, sy2 - 5);
      ctx.quadraticCurveTo(18.5, sy2, 15, sy2 + 4);
      ctx.quadraticCurveTo(11.5, sy2, 15, sy2 - 5);
      ctx.fill();
    }

    ctx.restore();

    // wind lines when falling fast — denser & longer the faster the fall
    if (falling && !this.reducedMotion) {
      const n = speed > 10 ? 5 : 3;
      const len = 8 + Math.min(10, (speed - 6) * 1.2);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.8;
      for (let i = 0; i < n; i++) {
        const lx = x - 28 + i * 14;
        const ly = y - HEX_R - 14 - ((t / 45 + i * 7) % 18);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx, ly + len);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private lastClearWin = false;

  private easeOutBack(p: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
  }

  private drawParticles(ctx: CanvasRenderingContext2D, t: number): void {
    this.particles = this.particles.filter((p) => t - p.t0 < p.life);
    for (const p of this.particles) {
      const age = (t - p.t0) / 16.666;
      const life = (t - p.t0) / p.life;
      const x = p.x + p.vx * age;
      const y = p.y + p.vy * age + 0.5 * p.gravity * age * age;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - life);
      if (p.kind === 'confetti') {
        ctx.translate(x, y);
        ctx.rotate(p.rot + p.vr * age);
        ctx.fillStyle = p.color;
        ctx.fillRect(-3, -5, 6, 10);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, p.size * (1 - life * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawFloats(ctx: CanvasRenderingContext2D, t: number): void {
    this.floats = this.floats.filter((f) => t - f.t0 < f.life);
    for (const f of this.floats) {
      const p = (t - f.t0) / f.life;
      const rise = this.easeOutCubic(p) * 60;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - p * p);
      ctx.font = `${f.size}px "ZCOOL KuaiLe", "Baloo 2", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.strokeText(f.text, f.x, f.y - rise);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - rise);
      ctx.restore();
    }
  }

  private easeOutCubic(p: number): number {
    return 1 - Math.pow(1 - p, 3);
  }

  /* ============ headless test hooks (scripts/verify-win.ts) ============ */

  debugBlockCount(): number {
    return this.blocks.length;
  }

  debugCulledCount(): number {
    return this.culled;
  }

  debugCheckpointsHit(): number {
    return this.checkpoints.filter((c) => c.hit).length;
  }

  debugHero(): { x: number; y: number; speed: number } {
    return { x: this.hero.position.x, y: this.hero.position.y, speed: this.hero.speed };
  }

  debugOverPending(): string {
    return String(this.overPending);
  }

  /** Remove the highest remaining block (full-clear test path). */
  debugRemoveTop(): boolean {
    if (this.state !== 'playing' || this.overPending !== false || this.blocks.length === 0) return false;
    const top = [...this.blocks].sort((a, b) => a.position.y - b.position.y)[0];
    this.removeBlock(top, this.simT);
    return true;
  }

  /** Remove the block nearest below the hero within maxDx (tunnel-down landing test path). */
  debugRemoveBelowHero(maxDx = 96): boolean {
    if (this.state !== 'playing' || this.overPending !== false) return false;
    const h = this.hero;
    let best: Matter.Body | null = null;
    let bestDy = Infinity;
    for (const b of this.blocks) {
      const dy = b.position.y - h.position.y;
      if (dy <= 0 || Math.abs(b.position.x - h.position.x) > maxDx) continue;
      if (dy < bestDy) {
        bestDy = dy;
        best = b;
      }
    }
    if (!best) return false;
    this.removeBlock(best, this.simT);
    return true;
  }

  /** Push the hero (fall-off test path). */
  debugShoveHero(vx: number, vy?: number): void {
    Matter.Sleeping.set(this.hero, false);
    Matter.Body.setVelocity(this.hero, { x: vx, y: vy ?? this.hero.velocity.y });
  }

  /** Knock the first remaining block out of the world (cull-path test). */
  debugShoveBlock(vx: number): boolean {
    const b = this.blocks[0];
    if (!b || this.state !== 'playing') return false;
    Matter.Sleeping.set(b, false);
    Matter.Body.setVelocity(b, { x: vx, y: -6 });
    return true;
  }

  /** Snapshot of every removable block (auto-player verification). */
  debugBlocks(): { id: number; x: number; y: number; row: number; key: boolean; kind: BlockKind }[] {
    return this.blocks.map((b) => {
      const m = this.meta.get(b.id);
      return {
        id: b.id,
        x: b.position.x,
        y: b.position.y,
        row: m?.row ?? 0,
        key: m?.key ?? false,
        kind: m?.kind ?? 'normal',
      };
    });
  }

  /** Remove a block by id (auto-player verification). */
  debugRemoveId(id: number): boolean {
    if (this.state !== 'playing' || this.overPending !== false) return false;
    const b = this.blocks.find((x) => x.id === id);
    if (!b) return false;
    this.removeBlock(b, this.simT);
    return true;
  }

  /** Max speed across blocks and the hero — "is the tower calm?" (auto-player verification). */
  debugMaxSpeed(): number {
    let v = this.hero.speed;
    for (const b of this.blocks) v = Math.max(v, b.speed);
    return v;
  }

  /** Current variant (attempt) index of the live round. */
  debugVariant(): number {
    return ((this.attempt % VARIANTS_PER_LEVEL) + VARIANTS_PER_LEVEL) % VARIANTS_PER_LEVEL;
  }

  /** endless-mode introspection (headless verifier) */
  debugMode(): 'level' | 'endless' {
    return this.mode;
  }
  debugEndlessDaily(): boolean {
    return this.endDaily;
  }
  debugLives(): number {
    return this.lives;
  }
  debugFrontierY(): number {
    return this.frontierY;
  }
  debugDepthPx(): number {
    return this.maxMeters * PX_PER_M;
  }
  /** force the hero somewhere (verifier: trigger a fall/respawn on demand) */
  debugTeleportHero(x: number, y: number): void {
    Matter.Body.setPosition(this.hero, { x, y });
    Matter.Body.setVelocity(this.hero, { x: 0, y: 0 });
    Matter.Sleeping.set(this.hero, false);
  }
}
