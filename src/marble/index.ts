/**
 * 弹珠轨道（Marble Track）— 对外接线口。
 *
 * 主应用接线（任选其一）：
 *   import { MarbleGame } from '@/marble';
 *   → 作为独立页面/标签页渲染：<MarbleGame />（可选 initialLevel 指定起始关）
 *
 * 无头验证：npm run verify:marble（scripts/verify-marble.ts，40 关全模拟）。
 */
export { default as MarbleGame } from './MarbleGame';
export {
  MARBLE_LEVELS,
  MARBLE_LEVEL_COUNT,
  getMarbleLevel,
  BOARD_W as MARBLE_BOARD_W,
  BOARD_H as MARBLE_BOARD_H,
  type MarbleLevel,
  type RampSpec,
} from './levels';
export { buildWorld, simulate, solutionAngles, initialAngles, type SimResult } from './physics';
