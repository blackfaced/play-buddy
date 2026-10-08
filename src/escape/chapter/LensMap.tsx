import { useId, useRef } from 'react';
import type { FilterPuzzle, PuzzleInput } from './types';
import { clampLens, lensClues, lensPointFromClient, LENS_RADIUS, LENS_START, observedClues } from './lens';
type Input = Extract<PuzzleInput,{kind:'filter'}>;
export default function LensMap({puzzle,input,onChange}:{puzzle:FilterPuzzle;input:Input;onChange:(input:Input)=>void}) {
  const clip = useId().replace(/:/g,'');
  const drag = useRef<{id:number;dx:number;dy:number}|null>(null);
  const position = input.position ?? LENS_START;
  const active = puzzle.lenses.find(lens=>lens.id===input.lens);
  const move = (x:number,y:number) => onChange({...input,position:clampLens({x,y})});
  const visible = active ? observedClues(puzzle,active.id,position) : [];
  return <div className="chapter-optical-bench">
    <div className="chapter-lens-paper" data-lens={input.lens??'none'}>
      <svg className="chapter-lens-map" viewBox="0 0 720 420" role="group" tabIndex={0}
        aria-label="雾港检修图：可移动放大镜" aria-describedby={`${clip}-instructions`}
        onKeyDown={event=>{
          const deltas:Record<string,[number,number]>={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]};
          if(event.key==='Enter'||event.key===' '){event.preventDefault();onChange({...input,lens:active?null:puzzle.lenses[0].id,position});}
          else if(active && deltas[event.key]){event.preventDefault();const [dx,dy]=deltas[event.key];move(position.x+dx*(event.shiftKey?3:1),position.y+dy*(event.shiftKey?3:1));}
        }}
        onPointerDown={event=>{
          if(!active||event.button!==0)return;
          const point=lensPointFromClient(event.clientX,event.clientY,event.currentTarget.getBoundingClientRect());
          const onLens=Math.hypot(point.x-position.x,point.y-position.y)<LENS_RADIUS+18;
          drag.current={id:event.pointerId,dx:onLens?position.x-point.x:0,dy:onLens?position.y-point.y:0};
          event.currentTarget.setPointerCapture(event.pointerId);event.currentTarget.focus();event.preventDefault();
          if(!onLens)move(point.x,point.y);
        }}
        onPointerMove={event=>{
          const held=drag.current;if(!held||held.id!==event.pointerId||!active)return;
          const point=lensPointFromClient(event.clientX,event.clientY,event.currentTarget.getBoundingClientRect());
          move(point.x+held.dx,point.y+held.dy);
        }}
        onPointerUp={event=>{if(drag.current?.id===event.pointerId){drag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}}
        onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}} onBlur={()=>{drag.current=null;}}>
        <defs>
          <clipPath id={clip}><circle cx={position.x} cy={position.y} r={LENS_RADIUS}/></clipPath>
          <pattern id={`${clip}-grid`} width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="#95845d" strokeWidth=".5" opacity=".25"/></pattern>
        </defs>
        <rect x="2" y="2" width="716" height="416" rx="12" fill="#e8d8ae" stroke="#826840" strokeWidth="4"/>
        <rect x="20" y="20" width="680" height="380" fill={`url(#${clip}-grid)`}/>
        <g id={`${clip}-map`} aria-hidden="true">
          <text x="30" y="39" fontSize="13" fill="#675639" letterSpacing="3">雾港 · 灯塔检修图</text>
          <text x="537" y="389" fontSize="11" fill="#766347">潮位线 / 旧航道 / 检修印</text>
          <path d="M20 230Q100 180 165 205T260 170Q300 105 355 145T480 160Q575 215 700 175V400H20Z" fill="#9eb4a7" opacity=".55"/>
          <path d="M20 230Q100 180 165 205T260 170Q300 105 355 145T480 160Q575 215 700 175" stroke="#627b6d" strokeWidth="3" fill="none"/>
          <path d="M35 259Q140 219 220 252T399 225T690 230M30 332Q155 353 240 320T430 325T690 303" stroke="#7a9485" fill="none" strokeDasharray="8 6"/>
          <path d="M133 138L214 163L302 104L411 102L560 132M355 167L357 258L512 282L550 339" stroke="#a48a58" strokeWidth="9" fill="none"/>
          <path d="M133 138L214 163L302 104L411 102L560 132M355 167L357 258L512 282L550 339" stroke="#f4e7c8" strokeWidth="3" strokeDasharray="5 4" fill="none"/>
          <g fill="#bcac83" stroke="#746645" strokeWidth="2"><path d="M99 130V81L142 64L181 83V135Z"/><path d="M510 135V67H606V137Z"/><path d="M328 256L343 168H369L384 256Z"/><path d="M318 169H394L378 149H337Z"/><rect x="113" y="273" width="94" height="54" rx="5"/><path d="M504 313L555 253L604 313Z"/></g>
          <g fill="#f4e7c8" stroke="#746645"><rect x="342" y="183" width="28" height="20"/><path d="M131 144V173M153 144V174M532 146V176M573 146V176"/></g>
          <g fontSize="13" fill="#514f3a"><text x="111" y="158">旧仓库</text><text x="531" y="154">信号房</text><text x="395" y="207">主灯塔</text><text x="131" y="348">西浮标</text><text x="527" y="338">干船坞</text><text x="337" y="62">北岬</text></g>
          <g transform="translate(654 77)" stroke="#766347" fill="none"><circle r="25"/><path d="M0-32V32M-32 0H32M0-25L7 0L0 25L-7 0Z"/><text x="-4" y="-37" fill="#766347" stroke="none" fontSize="12">北</text></g>
          {/* Ink scars hint at real locations without exposing their inscriptions. */}
          {lensClues(puzzle).map(clue=><g key={clue.id} transform={`translate(${clue.x} ${clue.y})`} opacity=".6"><ellipse rx="40" ry="21" fill="#c2ae80"/><path d="M-32 3Q-20-18-7 1T28-4M-25 9Q-5-8 12 7T34 2" fill="none" stroke="#9b7659" strokeWidth="2"/></g>)}
        </g>
        {active && <g clipPath={`url(#${clip})`} aria-hidden="true">
          <circle cx={position.x} cy={position.y} r={LENS_RADIUS} fill="#fff6d9"/>
          <g transform={`translate(${position.x} ${position.y}) scale(1.12) translate(${-position.x} ${-position.y})`}>
          <use href={`#${clip}-map`} opacity=".22"/>
          {puzzle.lenses.map(lens=><g key={lens.id} data-layer={lens.id} visibility={lens.id===active.id?'visible':'hidden'} fill={lens.color}>
            {lensClues(puzzle).filter(clue=>clue.lens===lens.id).map(clue=><g key={clue.id} data-inscription={clue.id}>
              <text x={clue.x} y={clue.y} dominantBaseline="central" textAnchor="middle" fontSize={clue.id.endsWith('digit')?28:17} textLength={clue.width} lengthAdjust="spacingAndGlyphs" fontWeight="700">{clue.text}</text>
            </g>)}
          </g>)}
          </g>
        </g>}
        {active && <g aria-hidden="true" className="chapter-portable-lens" transform={`translate(${position.x} ${position.y})`}>
          <path d="M56 56L88 88" stroke="#58452d" strokeWidth="19" strokeLinecap="round"/>
          <path d="M60 60L86 86" stroke="#927247" strokeWidth="10" strokeLinecap="round"/>
          <circle r={LENS_RADIUS+4} fill="none" stroke="#665435" strokeWidth="10"/>
          <circle r={LENS_RADIUS-1} fill="none" stroke={active.color} strokeWidth="5"/>
          <path d="M-45-20A49 49 0 0 1-15-46" fill="none" stroke="#fff9e8" strokeWidth="3"/>
          <text x="0" y={-LENS_RADIUS-8} textAnchor="middle" fill="#53452e" fontSize="16">{active.symbol}</text>
        </g>}
      </svg>
    </div>
    <div className="chapter-lens-cradle" aria-label="放大镜镜盘">
      <button onClick={()=>{drag.current=null;onChange({...input,lens:active?null:puzzle.lenses[0].id,position});}}>{active?'放回镜架':'拿起放大镜'}</button>
      <div className="chapter-lenses" aria-label="转动镜盘">
        {puzzle.lenses.map(lens=><button key={lens.id} disabled={!active} aria-label={`转到${lens.name}镜片`} aria-pressed={input.lens===lens.id} onClick={()=>onChange({...input,lens:lens.id,position})}><span style={{color:lens.color}}>{lens.symbol}</span> {lens.name}</button>)}
      </div>
      <p id={`${clip}-instructions`}>拖动镜框，或点纸面移动。键盘：方向键移动，空格拿起／放回。</p>
    </div>
    <p className="chapter-sr-only" aria-live="polite">{visible.map(clue=>`${clue.label}：${clue.text}`).join('；') || '镜下没有清晰刻记'}</p>
  </div>;
}
