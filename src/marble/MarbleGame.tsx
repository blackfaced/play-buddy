/**
 * 弹珠轨道（Marble Track）— 游戏 UI 组件。
 *
 * 自包含：自带 canvas 渲染、固定步长物理循环、localStorage 进度存档。
 * 不依赖主游戏的 store/controller；主应用只需渲染 <MarbleGame /> 即可完成接线。
 *
 * 玩法：点击轨道板循环切换角度 →「放珠！」→ 弹珠滚入杯子即过关。
 * 三星 = 点击次数 ≤ par（最少调整次数）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import Matter from 'matter-js';
import {
  BOARD_H,
  BOARD_W,
  MARBLE_LEVEL_COUNT,
  MARBLE_R,
  getMarbleLevel,
  type MarbleLevel,
  type RampKind,
} from './levels';
import { buildWorld, initialAngles, type MarbleWorld } from './physics';

/* ---------------- 存档 ---------------- */

interface MarbleSave {
  unlocked: number;
  stars: number[];
}

const SAVE_KEY = 'marble-save-v1';

function loadSave(): MarbleSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as MarbleSave;
      if (Array.isArray(s.stars) && typeof s.unlocked === 'number') return s;
    }
  } catch {
    /* ignore */
  }
  return { unlocked: 1, stars: [] };
}

/* ---------------- 音效（自包含 WebAudio 小提示音） ---------------- */

function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback((kind: 'click' | 'launch' | 'win' | 'fail' | 'tick') => {
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext();
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const t = ctx.currentTime;
      const conf = {
        click: { f: 520, t: 0.06, v: 0.05, type: 'triangle' as OscillatorType },
        tick: { f: 700, t: 0.05, v: 0.04, type: 'sine' as OscillatorType },
        launch: { f: 300, t: 0.18, v: 0.07, type: 'sawtooth' as OscillatorType },
        win: { f: 880, t: 0.3, v: 0.08, type: 'triangle' as OscillatorType },
        fail: { f: 180, t: 0.3, v: 0.07, type: 'sine' as OscillatorType },
      }[kind];
      osc.type = conf.type;
      osc.frequency.setValueAtTime(conf.f, t);
      if (kind === 'win') osc.frequency.exponentialRampToValueAtTime(1320, t + conf.t);
      if (kind === 'fail') osc.frequency.exponentialRampToValueAtTime(110, t + conf.t);
      gain.gain.setValueAtTime(conf.v, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + conf.t);
      osc.start(t);
      osc.stop(t + conf.t + 0.02);
    } catch {
      /* audio unavailable */
    }
  }, []);
}

/* ---------------- 颜色 ---------------- */

const RAMP_COLORS: Record<RampKind, { top: string; side: string }> = {
  normal: { top: '#f4a950', side: '#b06f1f' },
  ice: { top: '#7cd4fc', side: '#2f9fd8' },
  bounce: { top: '#f472b6', side: '#be3d8a' },
};

type Phase = 'aim' | 'rolling' | 'won' | 'lost';

/* ---------------- 组件 ---------------- */

export default function MarbleGame(props: { initialLevel?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<MarbleWorld | null>(null);
  const [levelId, setLevelId] = useState(() =>
    Math.min(Math.max(props.initialLevel ?? 1, 1), MARBLE_LEVEL_COUNT),
  );
  const [, setAngles] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>('aim');
  const [moves, setMoves] = useState(0);
  const [save, setSave] = useState<MarbleSave>(loadSave);
  const phaseRef = useRef<Phase>('aim');
  const anglesRef = useRef<number[]>([]);
  const stillRef = useRef(0);
  const timeRef = useRef(0);
  const play = useSound();

  const level: MarbleLevel = useMemo(() => getMarbleLevel(levelId), [levelId]);

  const persist = useCallback((s: MarbleSave) => {
    setSave(s);
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, []);

  /* ---- 重置/加载关卡 ---- */
  const resetLevel = useCallback(
    (lv: MarbleLevel) => {
      anglesRef.current = initialAngles(lv);
      setAngles([...anglesRef.current]);
      setMoves(0);
      stillRef.current = 0;
      timeRef.current = 0;
      phaseRef.current = 'aim';
      setPhase('aim');
      if (worldRef.current) {
        Matter.Engine.clear(worldRef.current.engine);
        worldRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    resetLevel(level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId]);

  /* ---- 物理 + 渲染循环 ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = BOARD_W * dpr;
    canvas.height = BOARD_H * dpr;

    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(now - last, 100);
      last = now;

      // 物理（仅 rolling 阶段推进）
      if (phaseRef.current === 'rolling' && worldRef.current) {
        acc += dt;
        const w = worldRef.current;
        while (acc >= 1000 / 60) {
          acc -= 1000 / 60;
          Matter.Engine.update(w.engine, 1000 / 60);
          timeRef.current += 1 / 60;
          const m = w.marble;
          const p = m.position;
          if (Math.hypot(p.x - level.goal.x, p.y - level.goal.y) <= level.goal.r) {
            phaseRef.current = 'won';
            setPhase('won');
            play('win');
            const stars = moves <= level.par ? 3 : moves <= level.par + level.ramps.length ? 2 : 1;
            const ns: MarbleSave = {
              unlocked: Math.max(save.unlocked, Math.min(level.id + 1, MARBLE_LEVEL_COUNT)),
              stars: [...save.stars],
            };
            ns.stars[level.id - 1] = Math.max(ns.stars[level.id - 1] ?? 0, stars);
            persist(ns);
            break;
          }
          const sp = Math.hypot(m.velocity.x, m.velocity.y);
          stillRef.current = sp < 0.25 ? stillRef.current + 1 : 0;
          if (p.y > BOARD_H + 80 || stillRef.current >= 150 || timeRef.current > level.timeLimitSec) {
            phaseRef.current = 'lost';
            setPhase('lost');
            play('fail');
            break;
          }
        }
      }

      draw(ctx, dpr, level, worldRef.current, anglesRef.current, phaseRef.current);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, moves, save]);

  /* ---- 交互 ---- */
  const launch = useCallback(() => {
    if (phaseRef.current !== 'aim') return;
    worldRef.current = buildWorld(level, anglesRef.current);
    stillRef.current = 0;
    timeRef.current = 0;
    phaseRef.current = 'rolling';
    setPhase('rolling');
    play('launch');
  }, [level, play]);

  const onCanvasClick = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (phaseRef.current !== 'aim') return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * BOARD_W;
      const py = ((e.clientY - rect.top) / rect.height) * BOARD_H;
      // 命中检测：点到旋转矩形（轨道板）的局部坐标
      for (let i = level.ramps.length - 1; i >= 0; i--) {
        const r = level.ramps[i];
        const deg = r.options[anglesRef.current[i] ?? r.initial];
        const a = (deg * Math.PI) / 180;
        const dx = px - r.cx;
        const dy = py - r.cy;
        const lx = dx * Math.cos(a) + dy * Math.sin(a);
        const ly = -dx * Math.sin(a) + dy * Math.cos(a);
        if (Math.abs(lx) <= r.len / 2 + 14 && Math.abs(ly) <= r.thick / 2 + 16) {
          anglesRef.current[i] = ((anglesRef.current[i] ?? r.initial) + 1) % r.options.length;
          setAngles([...anglesRef.current]);
          setMoves((m) => m + 1);
          play('click');
          return;
        }
      }
    },
    [level, play],
  );

  const stars = save.stars[levelId - 1] ?? 0;

  return (
    <div className="flex min-h-dvh flex-col items-center gap-3 bg-gradient-to-b from-indigo-950 via-slate-900 to-emerald-950 p-3 text-white select-none">
      {/* 头部 */}
      <div className="flex w-full max-w-[430px] items-center gap-2">
        <Link
          to="/"
          aria-label="返回平衡积木主页"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-base font-black text-white/90 transition active:scale-90"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-black tracking-wide text-amber-300 drop-shadow">
            弹珠轨道 <span className="text-xs text-white/70">Marble Track</span>
          </h1>
          <p className="truncate text-xs text-white/80">
            第 {levelId}/{MARBLE_LEVEL_COUNT} 关 · {level.name}
            {stars > 0 && <span className="ml-1 text-amber-400">{'★'.repeat(stars)}</span>}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            className="rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold disabled:opacity-30"
            disabled={levelId <= 1 || phase === 'rolling'}
            onClick={() => setLevelId((v) => Math.max(1, v - 1))}
          >
            上一关
          </button>
          <button
            className="rounded-xl bg-white/10 px-2.5 py-1.5 text-xs font-bold disabled:opacity-30"
            disabled={levelId >= save.unlocked || phase === 'rolling'}
            onClick={() => setLevelId((v) => Math.min(MARBLE_LEVEL_COUNT, v + 1))}
          >
            下一关
          </button>
        </div>
      </div>

      {/* 控制条（放珠按钮放上面，不用往下找）：小巧居中，不抢戏 */}
      <div className="flex w-full max-w-[430px] items-center justify-center gap-2">
        <button
          className="rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600 px-8 py-2 text-base font-black shadow-md transition active:scale-95 disabled:opacity-40"
          disabled={phase !== 'aim'}
          onClick={launch}
        >
          {phase === 'aim' ? '放珠！' : phase === 'rolling' ? '滚动中…' : '再来'}
        </button>
        <button
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold active:scale-95"
          onClick={() => resetLevel(level)}
        >
          重置
        </button>
      </div>

      {/* 画布 */}
      <div className="relative w-full max-w-[430px]" style={{ aspectRatio: `${BOARD_W} / ${BOARD_H}` }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onCanvasClick}
          className="h-full w-full cursor-pointer rounded-2xl shadow-2xl ring-2 ring-white/15"
          style={{ touchAction: 'manipulation' }}
        />
        {phase === 'won' && (
          <Overlay>
            <div className="text-4xl">🎉</div>
            <p className="text-2xl font-black text-amber-300">进球啦！</p>
            <p className="text-lg text-amber-400">
              {'★'.repeat(moves <= level.par ? 3 : moves <= level.par + level.ramps.length ? 2 : 1)}
              <span className="ml-2 text-sm text-white/70">
                调整 {moves} 次 / 三星 {level.par} 次
              </span>
            </p>
            {levelId < MARBLE_LEVEL_COUNT ? (
              <button
                className="rounded-2xl bg-emerald-500 px-6 py-3 text-lg font-black shadow-lg active:scale-95"
                onClick={() => setLevelId(levelId + 1)}
              >
                下一关 ▶
              </button>
            ) : (
              <p className="font-bold text-emerald-300">你已通关全部 40 关，轨道大师！🏆</p>
            )}
          </Overlay>
        )}
        {phase === 'lost' && (
          <Overlay>
            <div className="text-4xl">🫠</div>
            <p className="text-2xl font-black text-rose-300">弹珠迷路了…</p>
            <p className="text-sm text-white/70">调调轨道角度，再试一次！</p>
            <button
              className="rounded-2xl bg-amber-500 px-6 py-3 text-lg font-black text-slate-900 shadow-lg active:scale-95"
              onClick={() => resetLevel(level)}
            >
              再来一次
            </button>
          </Overlay>
        )}
      </div>

      <p className="max-w-[430px] text-center text-xs leading-5 text-white/60">
        {level.hint}（点轨道板换角度：橙=木板 · 蓝=冰面 · 粉=弹板）已调整 {moves} 次，三星 ≤ {level.par} 次
      </p>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-slate-900/85 backdrop-blur-sm">
      {children}
    </div>
  );
}

/* ---------------- 渲染 ---------------- */

function draw(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  level: MarbleLevel,
  world: MarbleWorld | null,
  angles: number[],
  phase: Phase,
): void {
  ctx.save();
  ctx.scale(dpr, dpr);

  // 背景
  const bg = ctx.createLinearGradient(0, 0, 0, BOARD_H);
  bg.addColorStop(0, '#1e1b4b');
  bg.addColorStop(0.6, '#0f172a');
  bg.addColorStop(1, '#052e1b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);

  // 星星点缀（确定性）
  const rnd = mulberryLite(42);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 40; i++) {
    ctx.beginPath();
    ctx.arc(rnd() * BOARD_W, rnd() * BOARD_H, rnd() * 1.6 + 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 杯（先画，轨道可能搭在上方）
  drawCup(ctx, level);

  // 漏斗与挡板
  for (const w of level.catchWalls) {
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(((w.angle ?? 0) * Math.PI) / 180);
    ctx.fillStyle = '#94a3b8';
    roundRect(ctx, -w.w / 2, -w.h / 2, w.w, w.h, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    roundRect(ctx, -w.w / 2, -w.h / 2, w.w, 5, 2);
    ctx.fill();
    ctx.restore();
  }

  // 弹力桩
  for (const p of level.pegs) {
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.arc(p.x - 3, p.y - 3, p.r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // 轨道板
  level.ramps.forEach((r, i) => {
    const deg = r.options[angles[i] ?? r.initial];
    const a = (deg * Math.PI) / 180;
    const col = RAMP_COLORS[r.kind];
    ctx.save();
    ctx.translate(r.cx, r.cy);
    ctx.rotate(a);
    // 板体
    ctx.fillStyle = col.side;
    roundRect(ctx, -r.len / 2, -r.thick / 2 + 3, r.len, r.thick, 5);
    ctx.fill();
    ctx.fillStyle = col.top;
    roundRect(ctx, -r.len / 2, -r.thick / 2, r.len, r.thick - 2, 5);
    ctx.fill();
    // 方向箭头（指示下坡方向）
    if (deg !== 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const dir = deg > 0 ? 1 : -1;
      for (const ox of [-r.len / 4, 0, r.len / 4]) {
        ctx.beginPath();
        ctx.moveTo(ox + 6 * dir, 0);
        ctx.lineTo(ox - 2 * dir, -4);
        ctx.lineTo(ox - 2 * dir, 4);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
    // 角度标签
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${deg > 0 ? '' : ''}${deg}°`, r.cx, r.cy - r.thick - 6);
  });

  // 发射口
  ctx.fillStyle = '#34d399';
  ctx.beginPath();
  ctx.arc(level.spawn.x, level.spawn.y - 16, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 10px sans-serif';
  ctx.fillText('START', level.spawn.x, level.spawn.y - 30);

  // 弹珠
  if (phase !== 'aim') {
    const m = world?.marble;
    if (m) drawMarble(ctx, m.position.x, m.position.y);
  } else {
    // 待命：弹珠悬在发射口轻轻浮动
    const bob = Math.sin(performance.now() / 300) * 2;
    drawMarble(ctx, level.spawn.x, level.spawn.y + bob);
  }

  ctx.restore();
}

function drawMarble(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const g = ctx.createRadialGradient(x - 4, y - 5, 1, x, y, MARBLE_R);
  g.addColorStop(0, '#fecdd3');
  g.addColorStop(0.4, '#f43f5e');
  g.addColorStop(1, '#9f1239');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, MARBLE_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(x - 3.5, y - 4.5, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawCup(ctx: CanvasRenderingContext2D, level: MarbleLevel): void {
  const { goal } = level;
  // 目标光晕
  const g = ctx.createRadialGradient(goal.x, goal.y, 2, goal.x, goal.y, goal.r + 14);
  g.addColorStop(0, 'rgba(52,211,153,0.5)');
  g.addColorStop(1, 'rgba(52,211,153,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(goal.x, goal.y, goal.r + 14, 0, Math.PI * 2);
  ctx.fill();
  // 杯体
  for (const w of level.cupWalls) {
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(((w.angle ?? 0) * Math.PI) / 180);
    ctx.fillStyle = '#fbbf24';
    roundRect(ctx, -w.w / 2, -w.h / 2, w.w, w.h, 4);
    ctx.fill();
    ctx.restore();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** 渲染用轻量 rng（星星背景） */
function mulberryLite(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
