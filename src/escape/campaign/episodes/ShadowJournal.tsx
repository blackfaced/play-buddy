import { ShadowScaleFrame } from './ShadowScaleFrame';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { PAPER_MASKS, STAGE_LANDINGS, TRACE_MASKS } from './shadowLogic';
import type { Cell } from './shadowLogic';

function SourceMask({cells,x,y,size,fill}:{cells:readonly Cell[];x:number;y:number;size:number;fill:string}) {
 return <g transform={`translate(${x} ${y})`}>{cells.map(([a,b],i)=><rect key={i} x={a*size} y={b*size} width={size+.1} height={size+.1} rx="1.5" fill={fill} stroke="#75583f" strokeWidth=".4"/>)}</g>;
}
/** The notebook and the actual paper share their source artwork, never a solved overlay. */
export function ShadowPaperSource({index}:{index:number}) {
 return <g data-shadow-paper-source={true}>
  <path d="M0 0H148L168 20V205H0Z" fill="#f4e5c8" stroke="#b8a482" strokeWidth="3"/>
  <circle cx="140" cy="170" r="17" fill="#d5c19d"/>
  <SourceMask cells={PAPER_MASKS[index]} x={131} y={159} size={7} fill="#675a50"/>
  <SourceMask cells={TRACE_MASKS[index]} x={32} y={48} size={36} fill="#83766f"/>
  <path d="M18 185h53" stroke="#907b5b" strokeWidth="2" fill="none"/>
 </g>;
}
/** Original harbor marks, at the same positions and sizes as on the revealed curtain. */
export function ShadowHarborSource() {
 return <g data-shadow-harbor-source={true}>
  <path d="M320 365q120-32 270 0t305 0" stroke="#7a9698" strokeWidth="10" fill="none"/>
  {STAGE_LANDINGS.map((a,i)=><g key={i}>
   <ShadowScaleFrame x={362+i*175} y={223} size={a.scale*38} stroke="#7a647c" strokeWidth={4}/>
   <SourceMask cells={PAPER_MASKS[a.piece]} x={365+i*175} y={178} size={9} fill="#7a647c"/>
  </g>)}
 </g>;
}
function JournalDialog({paperSeen,harborSeen,onClose,trigger}:{paperSeen:boolean;harborSeen:boolean;onClose:()=>void;trigger:RefObject<HTMLButtonElement|null>}) {
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const node=dialog.current;const opener=trigger.current;node?.showModal?.();return()=>{node?.close?.();opener?.focus();};},[trigger]);
 return <dialog ref={dialog} className="shadow-journal-dialog" aria-label="航海手记" onCancel={e=>{e.preventDefault();onClose();}}>
  <header><h2>航海手记</h2><button autoFocus onClick={onClose}>收起手记</button></header>
  {!paperSeen&&!harborSeen&&<p>手记还是空白的。</p>}
  {paperSeen&&<section><h3>箱盖里的拓印纸</h3><svg viewBox="0 0 660 250" aria-label="原样抄下的三张拓印纸，保留缺角、灰影和右下角的图案"><rect width="660" height="250" rx="12" fill="#745747"/>{[0,1,2].map(i=><g key={i} transform={`translate(${i*220+25} 20)`}><ShadowPaperSource index={i}/></g>)}</svg></section>}
  {harborSeen&&<section><h3>幕布背面的旧港湾</h3><svg viewBox="300 140 620 270" aria-label="幕布背面的原始港湾图案"><rect x="300" y="140" width="620" height="270" fill="#e8d9ba"/><ShadowHarborSource/></svg></section>}
 </dialog>;
}
export function ShadowJournal({paperSeen,harborSeen}:{paperSeen:boolean;harborSeen:boolean}) {
 const [open,setOpen]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null);
 return <><button ref={trigger} className="shadow-journal-entry" onClick={()=>setOpen(true)}>航海手记</button>{open&&<JournalDialog paperSeen={paperSeen} harborSeen={harborSeen} onClose={()=>setOpen(false)} trigger={trigger}/>}</>;
}
