import { useId } from 'react';

/** Painted layers are non-interactive. Keep light and dust behind the real props. */
export function ClockworkRoomArt({place='room'}:{place?:'room'|'bench'|'shaft'|'service'}) {
 const id=useId().replace(/:/g,'');
 const cool=place==='shaft', dark=place==='service';
 return <g aria-hidden="true" pointerEvents="none">
  <defs>
   <linearGradient id={`${id}-wall`} x2="1" y2="1"><stop stopColor={dark?'#101c23':'#353538'}/><stop offset="1" stopColor="#171c24"/></linearGradient>
   <linearGradient id={`${id}-floor`} x2="0" y2="1"><stop stopColor="#8b6441"/><stop offset="1" stopColor="#382c26"/></linearGradient>
   <radialGradient id={`${id}-light`}><stop stopColor={cool?'#dcecf3':'#ffd18a'} stopOpacity={dark?'.12':'.38'}/><stop offset="1" stopColor="#f5b46d" stopOpacity="0"/></radialGradient>
   <linearGradient id={`${id}-beam`} x2="0" y2="1"><stop stopColor="#ffdf9d" stopOpacity=".19"/><stop offset="1" stopColor="#ffda94" stopOpacity="0"/></linearGradient>
  </defs>
  <rect width="1000" height="580" fill={`url(#${id}-wall)`}/>
  {[0,1,2,3,4,5,6,7].map(i=><g key={i} opacity=".2"><path d={`M65 ${70+i*50}H935`} stroke="#ac9679"/><path d={`M${90+(i%2)*65} ${75+i*50}v36m160-36v36m190-36v36m220-36v36m170-36v36`} stroke="#b1a088"/></g>)}
  <path d="M0 465L1000 450V580H0Z" fill={`url(#${id}-floor)`}/>
  {[0,1,2,3,4,5].map(i=><g key={i}><path d={`M${i*240-180} 580L${i*170+10} 455`} stroke="#241f1d" strokeWidth="4"/><path d={`M${i*240-170} 580L${i*170+16} 459`} stroke="#c29762" opacity=".22" strokeWidth="2"/></g>)}
  <path d="M0 35H1000M45 0V485M950 0V475" fill="none" stroke="#241f1d" strokeWidth="46"/>
  <path d="M0 29H1000M41 0V480M946 0V470" fill="none" stroke="#765437" strokeWidth="29"/>
  <path d="M0 19H1000M29 0V476M934 0V470" fill="none" stroke="#bb8e5e" strokeWidth="3" opacity=".55"/>
  <path d="M70 70L260 460M930 70L730 455" stroke="#151b20" strokeWidth="28"/>
  <path d="M68 67L258 457M928 67L728 452" stroke="#604934" strokeWidth="17"/>
  <ellipse cx={cool?250:440} cy="260" rx="530" ry="380" fill={`url(#${id}-light)`}/>
  <path d={cool?'M150 65L400 65 780 565 120 565Z':'M462 40L509 40 740 530 170 530Z'} fill={`url(#${id}-beam)`}/>
  {!dark&&<g className="cw-dust">{[0,1,2,3,4,5,6,7].map(i=><circle key={i} cx={180+(i*83)%570} cy={100+(i*61)%370} r={i%3===0?2:1.2} fill="#ffe1a6" opacity=".42"/>)}</g>}
  {!cool&&!dark&&<g><path d="M485 0v48" stroke="#282724" strokeWidth="5"/><path d="M459 48h52l13 23h-78Z" fill="#342f28" stroke="#b48b55" strokeWidth="3"/><ellipse cx="485" cy="72" rx="24" ry="6" fill="#f7d18d"/><ellipse className="cw-lamp-glow" cx="485" cy="75" rx="45" ry="20" fill={`url(#${id}-light)`}/></g>}
  <path d="M10 558q90-25 177-5m603-10 160 12" stroke="#aa855b" opacity=".25" strokeWidth="3" fill="none"/>
 </g>;
}
