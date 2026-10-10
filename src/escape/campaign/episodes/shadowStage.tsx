import { useEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import type { GuidanceMode } from '../../guidancePolicy';
import { PAPER_MASKS, STAGE_LANDINGS, rotateMask } from './shadowLogic';
import './shadowExploration.css';
const TRACKS = ['左轨', '中轨', '右轨'];
const NAMES = ['月亮', '小船', '飞鸟'];
type Props = {
  pieces: number[]; depths: number[]; turns: number[];
  lamp: boolean; revealed: boolean; lit: boolean; mode: GuidanceMode;
  onChange: (key: 'pieces' | 'depths' | 'turns', value: number[]) => void;
};
export function ShadowStageDialog({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal?.();
    return () => {
      dialog?.close?.();
      queueMicrotask(() => { if (typeof document !== 'undefined') document.querySelector<HTMLElement>('[aria-label="查看灯后的舞台"]')?.focus(); });
    };
  }, []);
  return <dialog ref={ref} className="shadow-stage-dialog" aria-label="灯后的纸偶舞台" onCancel={e=>{e.preventDefault();onClose();}}>{children}</dialog>;
}
/** A single compact projection surface with the light paths directly below it. */
export function ShadowStage({ pieces, depths, turns, lamp, revealed, lit, mode, onChange }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [previousLit, setPreviousLit] = useState(lit);
  const [celebrate, setCelebrate] = useState(false);
  const [celebrated, setCelebrated] = useState(lit);
  if (previousLit !== lit) { setPreviousLit(lit); setCelebrate(lit && !celebrated); if (lit) setCelebrated(true); }
  const drag = useRef<{ slot: number; x: number; y: number; pointerId: number; moved: boolean; scrolling: boolean } | null>(null);
  const suppressClick = useRef(false);
  const group = useRef<HTMLDivElement>(null);
  const exchange = (from: number, to: number) => {
    if (from !== to) { const next = [...pieces]; [next[from], next[to]] = [next[to], next[from]]; onChange('pieces', next); }
    setSelected(null);
  };
  const pick = (slot: number) => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (selected === null) setSelected(slot); else exchange(selected, slot);
  };
  const startDrag = (e: PointerEvent<Element>, slot: number) => {
    if (e.isPrimary === false || (e.button ?? 0) !== 0 || drag.current) return;
    suppressClick.current = false;
    drag.current = { slot, x: e.clientX, y: e.clientY, pointerId: e.pointerId, moved: false, scrolling: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const cancelDrag = (e: PointerEvent<Element>) => {
    if (drag.current && e.pointerId !== drag.current.pointerId) return;
    drag.current = null; suppressClick.current = true; setSelected(null);
  };
  const moveDrag = (e: PointerEvent<Element>) => {
    const start = drag.current;
    if (!start || start.pointerId !== e.pointerId) return;
    const dx = Math.abs(e.clientX - start.x), dy = Math.abs(e.clientY - start.y);
    if (Math.hypot(dx, dy) >= 12) { start.moved = true; if (dy > dx) start.scrolling = true; }
  };
  const finishDrag = (e: PointerEvent<Element>) => {
    const start = drag.current;
    if (start && e.pointerId !== start.pointerId) return;
    drag.current = null;
    if (!start || (!start.moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 12)) return;
    suppressClick.current = true;
    if (start.scrolling || Math.abs(e.clientY-start.y) > Math.abs(e.clientX-start.x)) { setSelected(null); return; }
    const box = group.current?.getBoundingClientRect();
    if (box && e.clientX >= box.left && e.clientX < box.right && e.clientY >= box.top && e.clientY <= box.bottom) {
      exchange(start.slot, Math.min(2, Math.floor((e.clientX - box.left) / (box.width / 3))));
    } else setSelected(null);
  };
  return <section className={`shadow-workarea${lit ? ' is-lit' : ''}`} data-shadow-workarea={true} onKeyDown={e => { if (e.key === 'Escape') { if(selected!==null || drag.current) { e.preventDefault?.(); e.stopPropagation?.(); } suppressClick.current = drag.current !== null; drag.current = null; setSelected(null); } }}>
    <div className="shadow-stage-heading"><span>港湾幕布</span><span>{lamp ? '灯已亮' : '灯闸关闭'}</span></div>
    <div ref={group} className="shadow-stage-columns" role="group" aria-label="可移动到三条轨道的纸偶">
      {pieces.map((piece, i) => {
        const cells = rotateMask(PAPER_MASKS[piece], turns[i]);
        const size = depths[i] * 17;
        const land = STAGE_LANDINGS[i];
        const puppetX = 50 + depths[i] * 32;
        return <div className={`shadow-stage-column${selected === i ? ' is-selected' : ''}`} data-stage-slot={i} key={i}>
          <svg viewBox="0 0 210 292" aria-label={`${TRACKS[i]}：${NAMES[piece]}纸偶与实时影子`}>
            <rect width="210" height="190" fill={lamp ? '#e7d4b0' : '#625a6b'} />
            <path d="M0 169q53-17 105 0t105 0" stroke={lit ? '#edcf87' : '#728b91'} strokeWidth="5" fill="none" />
            {revealed && <g><rect x={105-land.scale*25.5} y={104-land.scale*25.5} width={land.scale*51} height={land.scale*51} fill="none" stroke="#725c68" strokeWidth="2" strokeDasharray="5 5" />
              {PAPER_MASKS[land.piece].map(([x,y],n)=><rect key={n} x={95+x*7} y={9+y*7} width="7" height="7" fill="#725c68" />)}</g>}
            <g data-projected-shadow={true} data-scale={depths[i]} opacity={lamp ? 1 : 0} transform={`translate(${105-size*1.5} ${104-size*1.5})`}>
              {cells.map(([x,y],n)=><rect key={n} x={x*size} y={y*size} width={size+.1} height={size+.1} rx="1" fill="#302a44" fillOpacity=".8" stroke="#302a44" strokeWidth=".5" />)}
            </g>
            <path d="M0 189H210" stroke="#a98558" strokeWidth="5" />
            <path d="M185 239L23 205V272Z" fill={lamp ? '#ffe3a5' : '#ffffff'} fillOpacity={lamp ? .27 : .02} />
            <path d="M25 203V273" stroke="#e7d4b0" strokeWidth="7" />
            <path d="M38 264H177" stroke="#bc9365" strokeWidth="4" />
            {[1,2,3].map(n=><path key={n} d={`M${50+n*32} 258v12`} stroke="#dfc6a0" strokeWidth="2" />)}
            <g data-physical-puppet={true} transform={`translate(${puppetX} 229)`}>
              <path d="M0 8V36" stroke="#eac88d" strokeWidth="4" />
              {cells.map(([x,y],n)=><rect key={n} x={(x-1.5)*7} y={(y-1.5)*7} width="7.1" height="7.1" fill="#efc47c" stroke="#75583f" strokeWidth=".4" />)}
              <rect x="-7" y="31" width="14" height="9" rx="2" fill={selected===i?'#fff3ac':'#ba925f'} />
            </g>
            <circle cx="188" cy="239" r="10" fill={lamp ? '#ffdc7f' : '#837056'} stroke="#ccaa6c" strokeWidth="3" />
            <path d="M194 249v23h-13" stroke="#ccaa6c" strokeWidth="4" fill="none" />
            <g role="button" tabIndex={0} aria-label={`${selected!==null&&selected!==i?'放到':'拿起'}${TRACKS[i]}的纸偶`} aria-pressed={selected===i} className="shadow-puppet-target" onClick={e=>{if(e?.detail===0)suppressClick.current=false;pick(i);}} onKeyDown={e=>{if(!e.repeat&&(e.key==='Enter'||e.key===' ')){e.preventDefault();suppressClick.current=false;pick(i);}}} onPointerDown={e=>startDrag(e,i)} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={cancelDrag} onLostPointerCapture={e=>{if(drag.current?.pointerId===e.pointerId)cancelDrag(e);}}><rect x="1" y="191" width="208" height="100" rx="5" fill="transparent" /></g>
            {mode !== 'challenge' && <g fill="#d8c9ad" fontSize="11"><text x="13" y="288">幕</text><text x="181" y="288">灯</text></g>}
          </svg>
          <button data-pickup={true} aria-pressed={selected===i} className="shadow-pickup" onClick={e=>{if(e?.detail===0)suppressClick.current=false;pick(i);}} onPointerDown={e=>startDrag(e,i)} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={cancelDrag} onLostPointerCapture={e=>{if(drag.current?.pointerId===e.pointerId)cancelDrag(e);}}>{selected!==null&&selected!==i?'放到':'拿起'}{TRACKS[i]}</button>
          <span className="shadow-puppet-name">{NAMES[piece]}</span>
          <input type="range" min="1" max="3" step="1" value={depths[i]} aria-label={`${['左','中','右'][i]}轨纸偶离灯距离`} onChange={e=>onChange('depths',depths.map((n,j)=>i===j?Number(e.target.value):n))} />
          <div className="shadow-turns"><button aria-label={`${TRACKS[i]}纸偶逆时针旋转`} onClick={()=>onChange('turns',turns.map((r,j)=>j===i?(r+3)%4:r))}><span className="mech-sr">转动纸偶 </span>↺</button><button aria-label={`${TRACKS[i]}纸偶顺时针旋转`} onClick={()=>onChange('turns',turns.map((r,j)=>j===i?(r+1)%4:r))}><span className="mech-sr">转动纸偶 </span>↻</button></div>
        </div>;
      })}
      {celebrate && <div className="shadow-opening" data-success-animation={true} aria-hidden="true" onAnimationEnd={()=>setCelebrate(false)}><i /><i /></div>}
    </div>
    <div className="shadow-stage-status" role="status">{lit ? '港湾已亮起 · 演出完成' : selected===null ? (mode==='challenge'?'': '点纸偶交换轨道；滑杆沿灯束移动，箭头旋转。') : `已拿起${TRACKS[selected]}纸偶。点另一轨交换，再点原轨或按 Esc 放下。`}</div>
  </section>;
}
