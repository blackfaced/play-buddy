import Matter from 'matter-js';
import { getMarbleLevel } from '../src/marble/levels';
import { buildWorld, solutionAngles } from '../src/marble/physics';

const id = Number(process.argv[2] ?? 1);
const lv = getMarbleLevel(id);
console.log('spawn', lv.spawn, 'goal', lv.goal);
lv.ramps.forEach((r, i) => {
  const deg = r.options[r.solution];
  console.log(`ramp${i} c=(${r.cx.toFixed(0)},${r.cy.toFixed(0)}) len=${r.len.toFixed(0)} sol=${deg}° opts=[${r.options.join(',')}] kind=${r.kind}`);
});
lv.catchWalls.forEach((w, i) => console.log(`catch${i} x=${w.x.toFixed(0)} y=${w.y.toFixed(0)} h=${w.h.toFixed(0)}`));
console.log('cupWalls', lv.cupWalls.map((w) => `(${w.x.toFixed(0)},${w.y.toFixed(0)} ${w.w.toFixed(0)}x${w.h.toFixed(0)})`).join(' '));

const { engine, marble } = buildWorld(lv, solutionAngles(lv));
for (let s = 0; s <= 900; s++) {
  Matter.Engine.update(engine, 1000 / 60);
  if (s % 20 === 0) {
    const p = marble.position;
    const v = marble.velocity;
    console.log(`t=${(s / 60).toFixed(2)} p=(${p.x.toFixed(0)},${p.y.toFixed(0)}) v=(${v.x.toFixed(1)},${v.y.toFixed(1)})`);
  }
  const p = marble.position;
  if (Math.hypot(p.x - lv.goal.x, p.y - lv.goal.y) <= lv.goal.r) {
    console.log(`GOAL at t=${(s / 60).toFixed(2)}`);
    break;
  }
}
// 最终接触情况
const pairs = engine.pairs.list;
for (const pr of pairs) {
  const labels = [pr.bodyA.label, pr.bodyB.label];
  if (pr.isActive && labels.includes('marble')) {
    console.log('contact:', labels.filter((l) => l !== 'marble').join(','), 'at', pr.bodyA.label === 'marble' ? pr.bodyB.position : pr.bodyA.position);
  }
}
// 附近所有 body
for (const b of Matter.Composite.allBodies(engine.world)) {
  const d = Math.hypot(b.position.x - marble.position.x, b.position.y - marble.position.y);
  if (b !== marble && d < 60) console.log(`near: ${b.label} at (${b.position.x.toFixed(0)},${b.position.y.toFixed(0)}) angle=${(b.angle / Math.PI * 180).toFixed(1)} d=${d.toFixed(0)}`);
}
