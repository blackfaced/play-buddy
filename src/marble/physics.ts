/**
 * 弹珠轨道 — 物理世界构建 + 确定性无头模拟。
 *
 * buildWorld() 同时被游戏 UI（逐帧渲染）与 scripts/verify-marble.ts
 * （无头验证全部 40 关可通关）使用，保证「玩到的」与「验证的」完全一致。
 *
 * 模拟采用固定步长（60Hz），结果确定性：同关卡 + 同角度组合 → 同一结局。
 */
import Matter from 'matter-js';
import {
  BOARD_H,
  MARBLE_R,
  type MarbleLevel,
  type RampKind,
} from './levels';

const DEG = Math.PI / 180;

/** 表面材质手感（与 UI 配色一一对应） */
export const SURFACE: Record<RampKind, { friction: number; restitution: number }> = {
  normal: { friction: 0.02, restitution: 0.05 },
  ice: { friction: 0.001, restitution: 0.02 },
  bounce: { friction: 0.02, restitution: 0.9 },
};

export interface MarbleWorld {
  engine: Matter.Engine;
  marble: Matter.Body;
  ramps: Matter.Body[];
  level: MarbleLevel;
}

/** 按给定角度下标数组搭建世界（未发射，弹珠悬在出生点） */
export function buildWorld(level: MarbleLevel, angles: number[]): MarbleWorld {
  const engine = Matter.Engine.create({ enableSleeping: false });
  engine.gravity.y = 1;

  const statics: Matter.Body[] = [];
  for (const w of [...level.walls, ...level.cupWalls, ...level.catchWalls]) {
    statics.push(
      Matter.Bodies.rectangle(w.x, w.y, w.w, w.h, {
        isStatic: true,
        angle: (w.angle ?? 0) * DEG,
        friction: 0.05,
        restitution: 0,
        label: 'wall',
      }),
    );
  }
  for (const p of level.pegs) {
    statics.push(
      Matter.Bodies.circle(p.x, p.y, p.r, {
        isStatic: true,
        friction: 0.02,
        restitution: p.kind === 'bumper' ? 1.1 : 0.3,
        label: p.kind,
      }),
    );
  }

  const ramps = level.ramps.map((r, i) => {
    const surf = SURFACE[r.kind];
    const deg = r.options[angles[i] ?? r.initial] ?? r.options[r.solution];
    return Matter.Bodies.rectangle(r.cx, r.cy, r.len, r.thick, {
      isStatic: true,
      angle: deg * DEG,
      friction: surf.friction,
      restitution: surf.restitution,
      label: `ramp:${i}`,
      chamfer: { radius: 4 },
    });
  });

  const marble = Matter.Bodies.circle(level.spawn.x, level.spawn.y, MARBLE_R, {
    friction: 0.01,
    frictionAir: 0.0008,
    restitution: 0.1,
    density: 0.0012,
    label: 'marble',
  });
  Matter.Body.setVelocity(marble, { x: level.spawn.vx, y: level.spawn.vy });

  Matter.Composite.add(engine.world, [...statics, ...ramps, marble]);
  return { engine, marble, ramps, level };
}

export type SimOutcome = 'goal' | 'timeout' | 'stuck' | 'lost';

export interface SimResult {
  outcome: SimOutcome;
  /** 用时（秒，模拟时间） */
  timeSec: number;
  /** 弹珠最终位置（调试用） */
  endX: number;
  endY: number;
}

const STEP_MS = 1000 / 60;

/**
 * 无头模拟一次滚珠。成功 = 弹珠中心进入杯子判定圈；
 * 失败 = 超时 / 卡住（低速持续 2.5s）/ 掉出世界。
 */
export function simulate(
  level: MarbleLevel,
  angles: number[],
  opts: { maxSec?: number } = {},
): SimResult {
  const { engine, marble } = buildWorld(level, angles);
  const maxSteps = Math.round((opts.maxSec ?? level.timeLimitSec) * 60);
  let still = 0;
  for (let step = 0; step < maxSteps; step++) {
    Matter.Engine.update(engine, STEP_MS);
    const { x, y } = marble.position;
    if (Math.hypot(x - level.goal.x, y - level.goal.y) <= level.goal.r) {
      return { outcome: 'goal', timeSec: step / 60, endX: x, endY: y };
    }
    if (y > BOARD_H + 80) {
      return { outcome: 'lost', timeSec: step / 60, endX: x, endY: y };
    }
    const sp = Math.hypot(marble.velocity.x, marble.velocity.y);
    still = sp < 0.25 ? still + 1 : 0;
    if (still >= 150) {
      return { outcome: 'stuck', timeSec: step / 60, endX: x, endY: y };
    }
  }
  return {
    outcome: 'timeout',
    timeSec: maxSteps / 60,
    endX: marble.position.x,
    endY: marble.position.y,
  };
}

/** 正解角度下标数组 */
export function solutionAngles(level: MarbleLevel): number[] {
  return level.ramps.map((r) => r.solution);
}

/** 初始（打乱）角度下标数组 */
export function initialAngles(level: MarbleLevel): number[] {
  return level.ramps.map((r) => r.initial);
}
