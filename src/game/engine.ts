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
  private unsupportedStreak = new Map<number, number>(); // consecutive motionless-unsupported audits per block (wedge-buster)
  private slickUntil = new Map<number, { until: number; friction: number }>(); // wedge-buster: temporary friction break + restore bookkeeping
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
  /** respawn 落在兜网地板上（竖井被掏空 25+ 层）后置位；下一段新塔送达时
   *  用来识别"该把 hero 抬上新段顶面"，而不救真正失控坠落到地板的人。
   *  hero 踩回积木（heroOnBlock）即清除。 */
  private floorRespawnPending = false;
  /** 复活后的短暂无敌（时间轴 ms）：坠落往往伴随连锁塌落，hero 复活时
   *  碎石还在砸，没无敌就会被立刻撞下去——"复活后立马就死了"。
   *  无敌到"站稳 0.5s"为止（respawnCalmMs），硬顶 5s 防极端。
   *  复活本来就扣了命，无敌期不存在续命漏洞。 */
  private respawnGraceUntil = 0;
  /** 无敌期内已连续"站稳在积木上"的时长；到 500ms 无敌提前结束 */
  private respawnCalmMs = 0;
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
    // 复活落网的 hero 搭"电梯"上新段：新段顶面恰好贴着旧 frontier（hero 正
    // 坐在那儿），地板随段下沉后若不抬，hero 会跌进新段顶部的缝隙里滚落
    // ——孩子看到的是"复活后没多久又死了"。只抬复活落网的（floorRespawn
    // Pending），真正失控坠落坐上地板的人不抬——兜网不是电梯（防续命漏洞，
    // 见 verify:endless 的清空井/疯狂点消用例）。
    if (this.floorRespawnPending && this.hero && !this.heroOnBlock()) {
      let top: Matter.Body | null = null;
      for (const b of this.blocks) {
        const t2 = b.bounds.min.y;
        if (t2 < oldFrontier - 2 || t2 > oldFrontier + 4 * CELL) continue;
        const cx = (b.bounds.min.x + b.bounds.max.x) / 2;
        if (!this.spawnClearAbove(cx, t2)) continue;
        const w = b.bounds.max.x - b.bounds.min.x;
        if (!top || w > top.bounds.max.x - top.bounds.min.x) top = b;
      }
      if (top) {
        const cx = (top.bounds.min.x + top.bounds.max.x) / 2;
        Matter.Body.setPosition(this.hero, { x: cx, y: top.bounds.min.y - HEX_HALF_H - 2 });
        Matter.Body.setVelocity(this.hero, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(this.hero, 0);
        Matter.Sleeping.set(this.hero, false);
        this.respawnY = top.bounds.min.y;
        this.perchMs = 0;
        this.heroAirMs = 0;
        this.heroCalmMs = 0;
        this.heroDeepMs = 0;
        this.camY = this.clampCamY(this.hero.position.y - this.viewH * 0.42);
      }
      this.floorRespawnPending = false;
    }
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
    this.respawnGraceUntil = t + 5000;
    this.respawnCalmMs = 0;
    this.addFloat(this.hero.position.x, this.hero.position.y - 56, `失误！还剩 ${this.lives} 条命`, CHECKPOINT_RED, 26, 1200);
    playHeartbeat();
    this.shakeMag = 6;
    this.shakeT0 = t;
    // snap the camera to the respawn point (can be far above the fall)
    this.camY = this.clampCamY(this.hero.position.y - this.viewH * 0.42);
    this.emitLive();
  }

  /**
   * hero 出生点净空检查：候选支撑顶面上方一格高度内不能有别的积木，
   * 否则把 hero 塞进重叠位置，物理解耦会把它横向弹飞
   * （"复活后莫名其妙被挤出去"）。判定窗止于支撑顶面之上 1px，
   * 支撑自身不算遮挡。
   */
  private spawnClearAbove(cx: number, top: number): boolean {
    const hx0 = cx - HEX_R;
    const hx1 = cx + HEX_R;
    const hy0 = top - 2 * HEX_HALF_H - 4;
    const hy1 = top - 1;
    for (const b of this.blocks) {
      if (b.bounds.max.x < hx0 || b.bounds.min.x > hx1) continue;
      if (b.bounds.max.y < hy0 || b.bounds.min.y > hy1) continue;
      return false;
    }
    return true;
  }

  /**
   * Respawn the hero at the last crossed checkpoint line: on the widest
   * surviving support right around the line (tower keeps its current
   * state); if the shaft there is stripped bare, the frontier floor catches
   * the hero and the next segment arrives immediately.
   */
  private respawnHero(): void {
    // 支撑必须是"安定的"：连锁塌落途中（块还在翻滚下滑）把 hero 放上去，
    // 等于放在一辆正在坠毁的车顶上——hero 跟着又掉下去，"复活后立马又死"。
    // 睡眠块 speed=0 天然通过；还在动的块等它自己停稳再当支撑。
    const settled = (b: Matter.Body): boolean => b.speed < 0.6 && Math.abs(b.angularVelocity) < 0.05;

    // widest surviving support right around the checkpoint line…
    let best: Matter.Body | null = null;
    for (const b of this.blocks) {
      const top = b.bounds.min.y;
      if (top < this.respawnY - 2 * CELL || top > this.respawnY + 6 * CELL) continue;
      if (!settled(b)) continue;
      const cx = (b.bounds.min.x + b.bounds.max.x) / 2;
      if (!this.spawnClearAbove(cx, top)) continue;
      const w = b.bounds.max.x - b.bounds.min.x;
      if (!best || w > best.bounds.max.x - best.bounds.min.x) best = b;
    }
    if (!best) {
      // …shaft stripped bare at the line: walk DOWNWARD to the first
      // surviving support. 不再限 25 层：井比 25 层深时旧代码会把 hero
      // 放去兜网地板——地板不是落脚位，新段送达时地板下沉、hero 跌进
      // 新段顶部缝隙滚落（"复活后立马又死"的深井路径）。塔身向下
      // 找支撑最坏也就是落到现存塔顶，一定比地板安全。
      // 真的全图掏空（极端）才由兜网地板接住 + floorRespawnPending 抬升。
      let lowestTop = Infinity;
      for (const b of this.blocks) {
        const top = b.bounds.min.y;
        if (top < this.respawnY) continue;
        if (!settled(b)) continue;
        const cx = (b.bounds.min.x + b.bounds.max.x) / 2;
        if (!this.spawnClearAbove(cx, top)) continue;
        if (top < lowestTop) {
          lowestTop = top;
          best = b;
        }
      }
    }
    let x = BEAM_X;
    let y = this.respawnY - HEX_HALF_H - 2;
    let standY = this.respawnY; // hero 实际落脚的面（支撑顶 / 兜网地板）
    if (best) {
      x = (best.bounds.min.x + best.bounds.max.x) / 2;
      y = best.bounds.min.y - HEX_HALF_H - 2;
      standY = best.bounds.min.y;
    } else {
      y = this.frontierY - HEX_HALF_H - 2; // bare world: the floor catches the hero
      standY = this.frontierY;
      // 标记"这次是复活落网"：下一段送达时把 hero 抬上新段顶面。
      // 真正失控坠落到地板的人不设这个标记（那是深潭滞留该管的）。
      this.floorRespawnPending = true;
    }
    // 锚点必须跟到实际落脚点：竖井被掏空的局里 hero 会在旧锚点下方
    // 10+ 层处落地，若锚点不动，"深潭滞留"计时（低于锚点 10 层累计
    // 2.5s）会把原地站着的 hero 再判死——死了又复活、复活又判死，
    // 正是"复活后立马就死了"。重生点是玩家站稳的地方，理应是新锚点。
    if (standY > this.respawnY) this.respawnY = standY;
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
    this.unsupportedStreak.clear();
    this.slickUntil.clear();
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
