import { useRef, useState } from 'react';
import type { CSSProperties, PointerEvent } from 'react';
import { GEAR_TEETH, SOCKET_DISTANCES, gearReadings, gearsMesh, placeClockworkGear } from './clockworkLogic';
import { Habitat, TickRing } from './clockworkShared';
import './clockworkGears.css';
import { guidancePolicy, type GuidanceMode } from '../../guidancePolicy';

type Props = { mode?: GuidanceMode; gears: number[]; testedGears: number[]; foundGears: number[]; crank: number; onChange: (gears: number[]) => void; onCrank: () => void };
type Drag = { tooth: number; pointer: number; startX: number; startY: number; x: number; y: number; moved: boolean };
const HUB = { x: 300, y: 157 };
const MOUNTS = SOCKET_DISTANCES.map((d, i) => { const a = (-90 + i * 120) * Math.PI / 180; return { x: HUB.x + Math.cos(a) * d * 3, y: HUB.y + Math.sin(a) * d * 3 }; });
const HABITATS = ['芦苇', '海浪', '松树'];
const trayX = (teeth: number) => 100 + GEAR_TEETH.indexOf(teeth) * 200;
function Wheel({ teeth, angle = 0, animate = false }: { teeth: number; angle?: number; animate?: boolean }) {
 const r = teeth * 1.5;
 const points = Array.from({ length: teeth * 4 }, (_, i) => { const a = i * Math.PI * 2 / (teeth * 4); const d = r + (i % 4 === 1 || i % 4 === 2 ? 2 : -2); return `${Math.sin(a) * d},${Math.cos(a) * d}`; }).join(' ');
 return <g className={animate ? 'cw-gear-rotation' : undefined} style={{ '--cw-turn': `${angle}deg`, transform: `rotate(${angle}deg)` } as CSSProperties}>
  <polygon points={points} fill="#c79a53" stroke="#624521" strokeWidth="1.6" />
  <circle r={r * .67} fill="#544634" stroke="#f2cc86" strokeWidth="2" />
  {[0, 120, 240].map(a => <path key={a} d={`M0 0V${-r * .71}`} transform={`rotate(${a})`} stroke="#b8853f" strokeWidth={Math.max(6, r * .18)} />)}
  <path d={`M0 -10V${-r + 6}`} stroke="#fff5c9" strokeWidth="3" />
  <circle r="7" fill="#d8bc7b" stroke="#55412e" strokeWidth="2" />
 </g>;
}
export function ClockworkGears({ mode = 'standard', gears, testedGears, foundGears, crank, onChange, onCrank }: Props) {
 const [selected, setSelected] = useState<number | null>(null);
 const [drag, setDrag] = useState<Drag | null>(null);
 const signature = gears.join(',');
 const testedSignature = testedGears.join(',');
 const suppressClick = useRef(false);
 const svg = useRef<SVGSVGElement>(null);
 const experiment = crank > 0 && testedSignature === signature;
 const connected = experiment && gearsMesh(gears);
 const readings = connected ? gearReadings(gears) : [];
 const point = (clientX: number, clientY: number) => {
  const matrix = svg.current?.getScreenCTM();
  if (!matrix) return { x: -1000, y: -1000 };
  const p = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
  return { x: p.x, y: p.y };
 };
 const destination = (x: number, y: number) => {
  if (x < 0 || x > 600 || y < 0 || y > 490) return null;
  if (y >= 320 && y <= 485 && x >= 12 && x <= 588) return -1;
  const nearest = MOUNTS.map((p, i) => ({ i, distance: Math.hypot(x - p.x, y - p.y) })).sort((a, b) => a.distance - b.distance)[0];
  return nearest.distance <= 50 ? nearest.i : null;
 };
 const hover = drag?.moved ? destination(drag.x, drag.y) : null;
 const place = (to: number, tooth = selected) => {
  if (tooth === null) return;
  const next = placeClockworkGear(gears, tooth, to);
  if (next.join(',') !== signature) onChange(next);
  setSelected(null);
 };
 const choose = (tooth: number) => setSelected(selected === tooth ? null : tooth);
 const mountClick = (i: number) => { if (selected !== null) place(i); else if (gears[i] > 0) choose(gears[i]); };
 const click = (action: () => void) => { if (suppressClick.current) { suppressClick.current = false; return; } action(); };
 const start = (e: PointerEvent<SVGGElement>, tooth: number) => {
  if (e.button !== 0 || e.isPrimary === false || drag !== null) return;
  suppressClick.current = false;
  e.currentTarget.setPointerCapture(e.pointerId);
  const p = point(e.clientX, e.clientY);
  setDrag({ tooth, pointer: e.pointerId, startX: e.clientX, startY: e.clientY, ...p, moved: false });
 };
 const cancel = (pointerId?: number) => { if (pointerId !== undefined && drag?.pointer !== pointerId) return; if (drag !== null) suppressClick.current = true; setDrag(null); };
 const end = (e: PointerEvent<SVGSVGElement>) => {
  if (!drag || drag.pointer !== e.pointerId) return;
  if (drag.moved) {
   suppressClick.current = true;
   const p = point(e.clientX, e.clientY), to = destination(p.x, p.y);
   if (to !== null) place(to, drag.tooth);
  }
  setDrag(null);
 };
 return <div className="cw-gears" onPointerDownCapture={e => {
  // A suppressed click belongs only to the previous gesture. A removed tray
  // source may never receive its click, so every new primary press clears it.
  if (e.isPrimary !== false && drag === null) suppressClick.current = false;
 }} onClickCapture={e => {
  if (suppressClick.current) { suppressClick.current = false; e.preventDefault(); e.stopPropagation(); }
 }} onKeyDown={e => { if (e.key === 'Escape') { if (drag !== null || selected !== null) e.preventDefault?.(); cancel(); setSelected(null); } else if (e.key === 'Enter' || e.key === ' ') suppressClick.current = false; }}>
  <p className="cw-gear-instructions">拖动齿轮到转轴；也可以先点齿轮，再点转轴。装好的轮子可以交换，或放回托盘。摇动曲柄试转。Esc 取消拿取。</p>
  <svg ref={svg} className="cw-gear-board" viewBox="0 0 600 490" aria-label="齿轮工作台：十二齿主动轮、三个转轴和下方的零件托盘" onPointerMove={e => {
   if (!drag || drag.pointer !== e.pointerId) return;
   const p = point(e.clientX, e.clientY);
   setDrag({ ...drag, ...p, moved: drag.moved || Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 7 });
  }} onPointerUp={end} onPointerCancel={e => cancel(e.pointerId)} onLostPointerCapture={e => cancel(e.pointerId)}>
   <rect x="2" y="2" width="596" height="303" rx="22" fill="#332f27" stroke="#917449" strokeWidth="3" />
   <path d="M20 37H580M20 285H580" stroke="#5d513c" fill="none" />
   <text x="26" y="26" className="cw-art-heading">传动架</text>
   {MOUNTS.map((p, i) => <g key={i}>
    <path d={`M${HUB.x} ${HUB.y}L${p.x} ${p.y}`} stroke="#86714e" strokeWidth="8" />
    <circle cx={p.x} cy={p.y} r="20" fill="#564a35" stroke="#aa9060" strokeWidth="2" />
    <path d={`M${p.x - 8} ${p.y}h16M${p.x} ${p.y - 8}v16`} stroke="#d5bc80" strokeWidth="3" />
    {hover === i && <circle className="cw-drop-target" cx={p.x} cy={p.y} r={Math.max(28, (gears[i] || 24) * 1.5 + 9)} />}
    <g transform={`translate(${[300, 470, 98][i]} ${[45, 188, 183][i]})`}><Habitat kind={i} scale={.4} /><text y={i === 0 ? -25 : 27} className="cw-art-label">{HABITATS[i]}轴</text></g>
   </g>)}
   {MOUNTS.map((p, i) => <g key={i} transform={`translate(${p.x} ${p.y})`} className="cw-physical-control" onPointerDown={e => { if (gears[i] > 0) start(e, gears[i]); }} onClick={() => click(() => mountClick(i))}>
    <circle r={Math.max(54, (gears[i] || 0) * 1.5 + 5)} fill="transparent" />
    {gears[i] > 0 && <g opacity={drag?.moved && drag.tooth === gears[i] ? .18 : 1}>
     <Wheel key={`${crank}-${signature}-${i}`} teeth={gears[i]} angle={connected ? -360 * 12 / gears[i] : 0} animate={connected} />
     <g className="cw-gear-ticks"><TickRing cx={0} cy={0} r={gears[i] * 1.5 + 8} /></g>
     {selected === gears[i] && <circle r={gears[i] * 1.5 + 12} className="cw-selected-ring" />}
    </g>}
   </g>)}
   <g transform={`translate(${HUB.x} ${HUB.y})`}><Wheel key={`hub-${crank}-${signature}`} teeth={12} angle={experiment ? 360 : 0} animate={experiment} /></g>
   <text x="415" y="265" className="cw-art-label">中心轮 · 12 齿</text>
   <path d="M388 258L326 170" stroke="#ba9a61" fill="none" />
   <rect x="12" y="321" width="576" height="164" rx="17" fill="#675039" stroke={hover === -1 ? '#8ce5df' : '#ad8859'} strokeWidth={hover === -1 ? 4 : 2} />
   <text x="28" y="345" className="cw-art-heading">零件托盘</text>
   {GEAR_TEETH.map(t => {
    const found = foundGears.includes(t), mounted = gears.includes(t), available = found && !mounted;
    return <g key={t} transform={`translate(${trayX(t)} 402)`}>
     <ellipse cy="3" rx={t * 1.5 + 8} ry={t * 1.5 + 5} fill="#493c2f" stroke="#997a51" strokeDasharray="3 5" />
     {available && <g className="cw-physical-control" onPointerDown={e => start(e, t)} onClick={() => click(() => choose(t))} opacity={drag?.moved && drag.tooth === t ? .18 : 1}>
      <circle r={Math.max(54, t * 1.5 + 5)} fill="transparent" /><Wheel teeth={t} />{selected === t && <circle r={t * 1.5 + 7} className="cw-selected-ring" />}
     </g>}
     {!available && <text y="4" className="cw-art-label">{mounted ? '已装上' : '尚未找到'}</text>}
     <rect x="-29" y="58" width="58" height="21" rx="5" fill="#322c25" /><text y="73" className="cw-art-label">{t} 齿</text>
    </g>;
   })}
   {drag?.moved && <g transform={`translate(${drag.x} ${drag.y})`} pointerEvents="none" opacity=".93"><Wheel teeth={drag.tooth} /><circle r={drag.tooth * 1.5 + 7} className="cw-selected-ring" /></g>}
  </svg>
  <div className="cw-gear-controls" aria-label="键盘和点按装配控制">
   <div className="cw-control-row">{GEAR_TEETH.map(t => <button key={t} type="button" disabled={!foundGears.includes(t)} aria-pressed={selected === t} onClick={() => choose(t)}>{t} 齿{!foundGears.includes(t) ? ' · 未找到' : selected === t ? ' · 已拿起' : gears.includes(t) ? ' · 在轴上' : ' · 托盘'}</button>)}</div>
   <div className="cw-control-row">{MOUNTS.map((_, i) => <button key={i} type="button" onClick={() => mountClick(i)} disabled={selected === null && !(gears[i] > 0)}>{selected === null ? `${HABITATS[i]}轴：${gears[i] > 0 ? `${gears[i]} 齿` : '空'}` : `装到${HABITATS[i]}轴`}</button>)}</div>
   <div className="cw-gear-actions"><button type="button" disabled={selected === null || !gears.includes(selected)} onClick={() => place(-1)}>放回托盘</button><button type="button" disabled={selected === null} onClick={() => setSelected(null)}>取消拿取</button><button className="cw-crank-button" type="button" onClick={() => { setSelected(null); onCrank(); }}>摇动曲柄一圈 ↻</button></div>
  </div>
  <p className="cw-gear-status" aria-live="polite">{selected !== null ? `拿起了 ${selected} 齿轮。请选择转轴；点同一齿轮可放下。` : connected ? (guidancePolicy(mode).hints ? '试转结束。观察停稳的白色刻线，记住它们相对起点的位置。' : '试转结束。') : experiment ? '曲柄转了一圈，传动架没有带起整组轮子。' : (guidancePolicy(mode).hints ? '齿轮顶端的白色刻线随轮子转动。最上方的短刻线是起点。' : '')}{connected && <span className="cw-gear-sr">刻线停在：{HABITATS.map((name, i) => `${name} ${readings[i]} 格`).join('，')}。</span>}</p>
 </div>;
}
