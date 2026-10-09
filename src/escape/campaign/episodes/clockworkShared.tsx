import { useRef, useState } from 'react';
import type { ReactNode, PointerEvent } from 'react';
import {swapAt} from './clockworkState';
import './clockworkShared.css';
/** The artwork and its keyboard controls share the same pick/place operation. */
export function ObjectRow({items,onChange,render,label,slotLabels,disabled=false}:{items:number[];onChange:(next:number[])=>void;render:(item:number,slot:number)=>ReactNode;label:string;slotLabels?:string[];disabled?:boolean}){
 const [selected,setSelected]=useState<number|null>(null);
 const [drag,setDrag]=useState<{index:number,x:number,y:number}|null>(null);
 const gesture=useRef<{index:number,pointerId:number,startX:number,startY:number,moved:boolean,cancelled:boolean,touch:boolean}|null>(null);
 const name=(i:number)=>slotLabels?.[i]??`第${i+1}格`;
 const pick=(i:number)=>{
  if(disabled)return;
  if(selected===null)setSelected(i);
  else {if(selected!==i)onChange(swapAt(items,selected,i));setSelected(null);}
 };
 const cancel=()=>{gesture.current=null;setDrag(null);};
 const move=(e:PointerEvent<SVGSVGElement>)=>{
  const g=gesture.current;if(!g||(e.pointerId!==undefined&&e.pointerId!==g.pointerId))return;
  const dx=e.clientX-g.startX,dy=e.clientY-g.startY;
  if(!g.moved&&Math.hypot(dx,dy)>8){
   g.moved=true;
   // Yield vertical touch gestures to page scrolling; never turn them into a tap.
   if(g.touch&&Math.abs(dy)>Math.abs(dx))g.cancelled=true;
  }
  if(g.cancelled||!g.moved)return;
  const b=e.currentTarget.getBoundingClientRect();
  setDrag({index:g.index,x:dx*items.length*150/b.width,y:dy*150/b.height});
 };
 const end=(e:PointerEvent<SVGSVGElement>)=>{
  const g=gesture.current;if(!g||(e.pointerId!==undefined&&e.pointerId!==g.pointerId))return;
  const b=e.currentTarget.getBoundingClientRect();
  const inside=e.clientX>=b.left&&e.clientX<b.left+b.width&&e.clientY>=b.top&&e.clientY<b.top+b.height;
  const moved=g.moved||Math.hypot(e.clientX-g.startX,e.clientY-g.startY)>8;
  gesture.current=null;setDrag(null);
  if(!disabled&&!g.cancelled&&inside){
   const to=Math.floor((e.clientX-b.left)/b.width*items.length);
   if(moved){if(to!==g.index)onChange(swapAt(items,g.index,to));setSelected(null);}
   else if(to===g.index)pick(g.index);
  }
  if(e.currentTarget.hasPointerCapture?.(g.pointerId))e.currentTarget.releasePointerCapture(g.pointerId);
 };
 return <div className="mech-object-row" onKeyDown={e=>{if(e.key==='Escape'){cancel();setSelected(null);}}}>
 <p className="mech-object-help">点一下拿起物件，再点另一格交换；也可横向拖动。再点原格或按 Esc 放回。</p>
 <svg role="group" aria-label={label} viewBox={`0 0 ${items.length*150} 150`} onPointerMove={move} onPointerUp={end} onPointerCancel={cancel} onLostPointerCapture={cancel}>
 {items.map((item,i)=><g key={i} role="button" tabIndex={disabled?-1:0} aria-disabled={disabled} aria-pressed={selected===i} aria-label={`${selected===null?'拿起':selected===i?'放回':'放到'}${name(i)}`} className="mech-object-slot" transform={`translate(${i*150},0)`}
 onPointerDown={e=>{
  if(disabled||e.isPrimary===false||(e.button!==undefined&&e.button!==0)||gesture.current)return;
  e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
  gesture.current={index:i,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false,cancelled:false,touch:e.pointerType==='touch'};
 }}
 onClick={e=>{if(e.detail===0)pick(i);}}
 onKeyDown={e=>{if(e.key==='Escape'){cancel();setSelected(null);}else if((e.key==='Enter'||e.key===' ')&&!e.repeat){e.preventDefault();pick(i);}}}>
 <rect x="5" y="5" width="140" height="140" rx="15" fill={selected===i?'#fff1bf':'#fff8e6'} stroke={selected===i?'#f7bd5b':'#907351'} strokeWidth={selected===i?5:3}/>
 <g className="mech-grabbable" transform={drag?.index===i?`translate(${drag.x},${drag.y})`:selected===i?'translate(0,-4)':undefined}>{render(item,i)}</g>
 </g>)}
 </svg><p className="mech-object-status" role="status">{selected===null?'尚未拿起物件':`已拿起${name(selected)}的物件，请点要放入的格子。`}</p>
 <div className="mech-slot-controls" style={{gridTemplateColumns:`repeat(${items.length},1fr)`}}>{items.map((item,i)=><button key={i} type="button" aria-pressed={selected===i} onClick={()=>pick(i)} disabled={disabled}>{selected===null||selected===i?`拿起${name(i)}`:`放到${name(i)}`}<span className="mech-sr">，物件 {item}{selected===i?'，已拿起，再按放回':''}</span></button>)}</div></div>;
}
export function Workbench({title,children,onBack}:{title:string;children:ReactNode;onBack:()=>void}){return <section className="mech-bench" aria-label={title}><header><h2>{title}</h2><button onClick={onBack}>← 环顾四周</button></header>{children}</section>;}
export function TickRing({cx=75,cy=75,r=52}:{cx?:number;cy?:number;r?:number}){return <g>{Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return <path key={i} d={`M${cx+Math.sin(a)*(r-6)} ${cy-Math.cos(a)*(r-6)}L${cx+Math.sin(a)*r} ${cy-Math.cos(a)*r}`} stroke="#5a432e" strokeWidth={i===0?4:2}/>;})}<path d={`M${cx-4} ${cy-r-10}h8l-4 5z`} fill="#8c392c"/></g>;}
export function Bird({kind,x=0,y=0,scale=1}:{kind:number;x?:number;y?:number;scale?:number}){return <g transform={`translate(${x} ${y}) scale(${scale})`} fill={['#785845','#304e69','#e5e3cf'][kind]} stroke="#332f32" strokeWidth="2">{kind===0?<><path d="M-22 25Q-30 1-19-26L-9-15Q0-23 9-15L19-26Q30 1 22 25Z"/><circle cx="-9" cy="-4" r="7" fill="#ffdc87"/><circle cx="9" cy="-4" r="7" fill="#ffdc87"/><circle cx="-9" cy="-4" r="2"/><circle cx="9" cy="-4" r="2"/><path d="M-4 5L0 12L4 5" fill="#b77230"/></>:<><path d={kind===1?'M-35-20Q-5-7 0 0Q10-14 35-20L15 7L1 12L-11 27L-8 9Z':'M-34-8Q-8-20 0-2Q12-17 35-8L15 9L1 12L-20 16L-8 4Z'}/><path d="M12 2l13 4-13 4" fill="#d99736"/><circle cx="10" cy="3" r="2" fill="#222"/></>}</g>;}
export function Habitat({kind,x=0,y=0,scale=1}:{kind:number;x?:number;y?:number;scale?:number}){return <g transform={`translate(${x} ${y}) scale(${scale})`} fill="none" stroke={['#527450','#3f8eab','#336e52'][kind]} strokeWidth="3">{kind===0?<><path d="M-14 20Q-24-7-10-28M0 20V-30M14 20Q26-10 14-25"/><path d="M-13-18v-13M0-24v-14M14-16v-15" strokeWidth="7"/></>:kind===1?<><path d="M-30-10q15-15 30 0t30 0M-30 4q15-15 30 0t30 0M-30 18q15-15 30 0t30 0"/></>:<><path d="M0-34L-26 0h12l-18 22h64L14 0h12Z" fill="#4c8356"/><path d="M0 22v15" stroke="#76533b"/></>}</g>;}
