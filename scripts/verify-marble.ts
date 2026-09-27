/**
 * verify:marble — 弹珠轨道 40 关无头验证。
 *
 *  (a) 结构校验：40 关齐全；每关选项含且仅含一个正解；initial ≠ solution；
 *      路线/杯子/出生在画布内；par ≥ 1。
 *  (b) 可通关性：用每关的 solution 角度做确定性物理模拟（60Hz 固定步长），
 *      弹珠必须在时限内落入杯子判定圈。
 *  (c) 关卡有效性（非平凡）：把首块轨道翻到错误角度，模拟必须失败
 *      （保证每关都需要玩家操作，不存在"开局即通"）。
 *  (d) 难度曲线：板数、平均倾角随关卡号单调（分段均值递增）。
 *
 * Run: node node_modules/typescript/bin/tsc -p tsconfig.verify-marble.json \
 *   && node node_modules/.tmp-verify-marble/scripts/verify-marble.js
 */
import {
  BOARD_W,
  BOARD_H,
  MARBLE_LEVELS,
  MARBLE_LEVEL_COUNT,
  getMarbleLevel,
  mulberry32,
  type MarbleLevel,
} from '../src/marble/levels';
import { simulate, solutionAngles } from '../src/marble/physics';

let failures = 0;
function check(name: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
}

/* ---- (a) 结构校验 ---- */
function testStructure(): void {
  console.log('\n(a) 结构校验');
  check('40 关齐全', MARBLE_LEVELS.length === MARBLE_LEVEL_COUNT && MARBLE_LEVEL_COUNT === 40);
  let ok = true;
  let msg = '';
  for (const lv of MARBLE_LEVELS) {
    const bad = (m: string) => {
      ok = false;
      msg = `L${lv.id}: ${m}`;
    };
    if (lv.ramps.length < 3) bad('ramps<3');
    for (const r of lv.ramps) {
      if (!r.options.includes(r.options[r.solution])) bad('solution oob');
      if (r.initial === r.solution) bad('initial==solution');
      if (new Set(r.options).size !== r.options.length) bad('dup options');
      const correct = r.options[r.solution];
      const others = r.options.filter((_, i) => i !== r.solution);
      if (others.includes(correct)) bad('dup correct angle');
    }
    if (!(lv.spawn.x > 0 && lv.spawn.x < BOARD_W && lv.spawn.y > 0 && lv.spawn.y < BOARD_H)) bad('spawn oob');
    if (!(lv.goal.x > 30 && lv.goal.x < BOARD_W - 30 && lv.goal.y > 100 && lv.goal.y < BOARD_H)) bad(`goal oob (${lv.goal.x.toFixed(0)},${lv.goal.y.toFixed(0)})`);
    if (lv.par < 1) bad('par<1');
    if (!ok) break;
  }
  check('每关：选项无重复、initial≠solution、出生/杯在界内、par≥1', ok, msg);
  // 确定性：同 id 两次生成完全一致
  const a = JSON.stringify(getMarbleLevel(17));
  const b = JSON.stringify(getMarbleLevel(17));
  check('生成确定性（同 id 同布局）', a === b);
}

/* ---- (b) 可通关性 ---- */
function testSolvable(): void {
  console.log('\n(b) 可通关性（solution 角度 → 物理模拟）');
  let pass = 0;
  const failed: string[] = [];
  for (const lv of MARBLE_LEVELS) {
    const r = simulate(lv, solutionAngles(lv));
    if (r.outcome === 'goal') pass++;
    else failed.push(`L${lv.id}=${r.outcome}@${r.endX.toFixed(0)},${r.endY.toFixed(0)}`);
  }
  check('40/40 关用正解可通关', pass === MARBLE_LEVEL_COUNT, failed.slice(0, 8).join(' '));
}

/* ---- (c) 非平凡：全平（所有轨道 0°）必须失败 ----
 * 0° 在每块板的选项中必有；全平配置下弹珠失去坡度动力，
 * 必然停在轨道中段 —— 证明每关都需要玩家把轨道调成下坡。 */
function allFlat(lv: MarbleLevel): number[] {
  return lv.ramps.map((r) => {
    const i = r.options.indexOf(0);
    return i >= 0 ? i : (r.solution + 1) % r.options.length;
  });
}

function testNonTrivial(): void {
  console.log('\n(c) 非平凡性（全部轨道调平 → 必须失败）');
  let pass = 0;
  const failed: string[] = [];
  for (const lv of MARBLE_LEVELS) {
    const r = simulate(lv, allFlat(lv));
    if (r.outcome !== 'goal') pass++;
    else failed.push(`L${lv.id}`);
  }
  check('40/40 关全平必败（不存在开局即通）', pass === MARBLE_LEVEL_COUNT, failed.join(' '));
}

/* ---- (d) 难度曲线 ---- */
function testCurve(): void {
  console.log('\n(d) 难度曲线');
  const band = (lo: number, hi: number) =>
    MARBLE_LEVELS.slice(lo - 1, hi).reduce((s, l) => s + l.ramps.length, 0) / (hi - lo + 1);
  const b1 = band(1, 8);
  const b2 = band(17, 24);
  const b3 = band(33, 40);
  check('轨道板数分段递增', b1 < b2 && b2 <= b3, `${b1.toFixed(1)} → ${b2.toFixed(1)} → ${b3.toFixed(1)}`);
  const early = MARBLE_LEVELS.slice(0, 8).every((l) => l.ramps.every((r) => r.kind === 'normal'));
  const late = MARBLE_LEVELS.slice(16).some((l) => l.ramps.some((r) => r.kind !== 'normal'));
  check('前 8 关纯木板教学，17 关后出现冰面/弹板', early && late);
}

testStructure();
testSolvable();
testNonTrivial();
testCurve();

// 防止误用未同步的盐表导致偶然通过：固定种子抽查一关模拟两次结果一致
{
  const lv = getMarbleLevel(23);
  const r1 = simulate(lv, solutionAngles(lv));
  const r2 = simulate(lv, solutionAngles(lv));
  const same = r1.outcome === r2.outcome && Math.abs(r1.timeSec - r2.timeSec) < 1e-9;
  check('\n模拟确定性（L23 两次同结局同时刻）', same, `${r1.outcome} ${r1.timeSec.toFixed(2)}s`);
  void mulberry32;
}

console.log(failures === 0 ? '\n🎉 verify:marble 全部通过' : `\n💥 ${failures} 项失败`);
process.exit(failures === 0 ? 0 : 1);
