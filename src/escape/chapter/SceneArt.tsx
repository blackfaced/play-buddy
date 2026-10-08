/* eslint-disable react-refresh/only-export-components -- Scene hotspot geometry is coupled to this artwork. */
import { useId } from 'react';
import type { ChapterState } from './types';
import { CHAPTER } from './content';

export interface ArtHotspot { id: string; label: string; x: number; y: number; width: number; height: number }
export const SCENE_HOTSPOTS: Record<string, ArtHotspot[]> = {
  gallery: [
    { id: 'animal-cabinet', label: '观察标本柜', x: 5, y: 22, width: 28, height: 49 },
    { id: 'pattern-tray', label: '查看纹样托盘', x: 35, y: 60, width: 28, height: 26 },
    { id: 'search', label: '搜寻收藏桌', x: 68, y: 38, width: 28, height: 45 },
  ],
  optics: [
    { id: 'search', label: '搜寻观测台', x: 4, y: 41, width: 28, height: 42 },
    { id: 'lens-chart', label: '查看滤光星图', x: 34, y: 24, width: 31, height: 52 },
    { id: 'tide-sudoku', label: '查看潮汐棋盘', x: 69, y: 29, width: 26, height: 42 },
  ],
  workshop: [
    { id: 'search', label: '搜寻工具台', x: 4, y: 43, width: 28, height: 43 },
    { id: 'gravity-lock', label: '查看落块机械锁', x: 35, y: 29, width: 28, height: 47 },
    { id: 'foglight-console', label: '查看雾灯控制台', x: 69, y: 24, width: 27, height: 61 },
  ],
};
const ink = '#283c3c';
const gold = '#d7b479';
function Defs({ id }: { id: string }) {
  return <defs>
    <linearGradient id={`${id}-wood`} x2="0" y2="1"><stop stopColor="#be8c58"/><stop offset="1" stopColor="#76513c"/></linearGradient>
    <linearGradient id={`${id}-wall`} x2="0" y2="1"><stop stopColor="#648775"/><stop offset="1" stopColor="#264b45"/></linearGradient>
    <linearGradient id={`${id}-night`} x2="0" y2="1"><stop stopColor="#192f4c"/><stop offset="1" stopColor="#386572"/></linearGradient>
    <linearGradient id={`${id}-copper`} x2="1" y2=".8"><stop stopColor="#e4b480"/><stop offset=".45" stopColor="#b66f48"/><stop offset="1" stopColor="#774b3b"/></linearGradient>
    <linearGradient id={`${id}-sea`} x2="0" y2="1"><stop stopColor="#a8c9c4"/><stop offset=".55" stopColor="#eadbb1"/><stop offset=".56" stopColor="#649c9d"/><stop offset="1" stopColor="#355f75"/></linearGradient>
    <radialGradient id={`${id}-glow`}><stop stopColor="#fff6c6" stopOpacity=".85"/><stop offset=".38" stopColor="#ffd991" stopOpacity=".3"/><stop offset="1" stopColor="#ffd991" stopOpacity="0"/></radialGradient>
    <pattern id={`${id}-grain`} width="150" height="46" patternUnits="userSpaceOnUse"><path d="M0 12Q25 2 68 12T150 12M32 32q34-9 86 0" fill="none" stroke="#302f2d" strokeWidth="1" opacity=".14"/></pattern>
    <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="175%"><feGaussianBlur in="SourceAlpha" stdDeviation="5" result="blur"/><feOffset in="blur" dx="0" dy="7" result="offset"/><feFlood floodColor="#152c31" floodOpacity=".28" result="color"/><feComposite in="color" in2="offset" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>;
}
function Rivets({ x, y, w, h }: {x:number;y:number;w:number;h:number}) {
  return <g fill="#644c35" stroke="#f4dba3" strokeWidth="1">{[[x+9,y+9],[x+w-9,y+9],[x+9,y+h-9],[x+w-9,y+h-9]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="3"/>)}</g>;
}
function Wood({id,x,y,w,h}:{id:string;x:number;y:number;w:number;h:number}) {
  return <g><rect x={x} y={y} width={w} height={h} rx="8" fill={`url(#${id}-wood)`} stroke={ink} strokeWidth="4"/><rect x={x} y={y} width={w} height={h} rx="8" fill={`url(#${id}-grain)`}/><path d={`M${x+8} ${y+8}H${x+w-8}`} stroke="#e5c392" strokeWidth="2" opacity=".65"/></g>;
}
function Shell({x,y,s=1}:{x:number;y:number;s?:number}) {
  return <g transform={`translate(${x} ${y}) scale(${s})`} stroke="#987454" strokeWidth="2"><path d="M0 29Q-37-4-24-20Q-12-33 0-24Q14-36 29-19Q43-4 0 29Z" fill="#edcfaa"/><path d="M0 25L-23-16M0 25L-10-25M0 25L4-26M0 25L18-23M0 25L29-11" fill="none"/></g>;
}
function Books({x,y,s=1}:{x:number;y:number;s?:number}) {
  return <g transform={`translate(${x} ${y}) scale(${s})`} stroke={ink} strokeWidth="2"><g transform="rotate(-8)"><rect width="24" height="84" y="-84" rx="3" fill="#a95f4b"/><path d="M4-72h16M4-12h16" stroke={gold}/></g><rect x="28" y="-96" width="26" height="96" rx="3" fill="#597b72"/><path d="M33-83h16M33-16h16" stroke={gold}/><rect x="58" y="-72" width="21" height="72" rx="2" fill="#e1b96d"/><path d="M63-61h11M63-12h11"/></g>;
}
function Bottle({x,y,color='#79a5a1',s=1}:{x:number;y:number;color?:string;s?:number}) {
  return <g transform={`translate(${x} ${y}) scale(${s})`} stroke={ink} strokeWidth="2.5"><path d="M-10-61v20q-23 12-23 35v24q0 10 33 10t33-10V-6q0-23-23-35v-20Z" fill={color}/><rect x="-14" y="-69" width="28" height="13" rx="3" fill="#be9864"/><path d="M-21-6v21" stroke="#d9eee1" strokeWidth="5" opacity=".6"/><rect x="-21" y="0" width="42" height="20" rx="4" fill="#e7d6ad"/><path d="M-10 10h20" stroke="#9d8e6b"/></g>;
}
function Gear({x,y,r=38,rotation=0}:{x:number;y:number;r?:number;rotation?:number}) {
  return <g transform={`translate(${x} ${y}) rotate(${rotation})`} stroke={ink} strokeWidth="3">{Array.from({length:10},(_,i)=><rect key={i} x="-8" y={-r-8} width="16" height="23" rx="2" fill={gold} transform={`rotate(${i*36})`}/>)}<circle r={r} fill="#bd985e"/><circle r={r*.59} fill="#4e6560"/><circle r="9" fill={gold}/>{[0,120,240].map(a=><path key={a} d={`M0-9V-${r*.65}`} stroke={gold} strokeWidth="8" transform={`rotate(${a})`}/>)}</g>;
}
function Lamp({id,x,y}:{id:string;x:number;y:number}) {
  return <g transform={`translate(${x} ${y})`}><circle cy="52" r="110" fill={`url(#${id}-glow)`}/><path d="M0-30V0" stroke={ink} strokeWidth="5"/><path d="M-28 14L-18 0H18L28 14Z" fill={gold} stroke={ink} strokeWidth="3"/><path d="M-23 15L-18 61H18L23 15" fill="#ffe0a0" stroke={ink} strokeWidth="3"/><path d="M-27 63H27M-16 15V62M16 15V62" stroke={ink} strokeWidth="4"/><path d="M-5 29L-3 49" stroke="#fff5ce" strokeWidth="5"/></g>;
}
function Port({id,x,y,r=64,night=false}:{id:string;x:number;y:number;r?:number;night?:boolean}) {
  return <g transform={`translate(${x} ${y})`}><circle r={r+17} fill="#4f5b51" stroke={ink} strokeWidth="4"/><circle r={r+11} fill={gold}/><circle r={r} fill={`url(#${id}-${night?'night':'sea'})`} stroke={ink} strokeWidth="4"/>{night?<g fill="#e5d9ac"><circle cx="-23" cy="-24" r="2"/><circle cx="32" cy="-18" r="2"/><circle cx="-9" cy="13" r="1.5"/><path d="M24-43a16 16 0 1 0 17 22 17 17 0 0 1-17-22"/></g>:<path d={`M${-r*.72} 27q23-8 46 0t45 0M${-r*.64} 41q30-7 66 0`} stroke="#bad9cb" fill="none" strokeWidth="3"/>}<path d={`M${-r*.7} -8L-8 ${-r*.7}M${-r*.6} 7L8 ${-r*.7}`} stroke="#fff8df" strokeWidth="7" opacity=".17"/>{Array.from({length:8},(_,i)=><circle key={i} cx={(r+9)*Math.cos(i*Math.PI/4)} cy={(r+9)*Math.sin(i*Math.PI/4)} r="3" fill="#746344"/>)}</g>;
}
function Floor({id}:{id:string}) {
  return <g><path d="M0 466H1000V620H0Z" fill={`url(#${id}-wood)`}/><path d="M0 466H1000" stroke={ink} strokeWidth="10"/>{[500,545,600].map(y=><path key={y} d={`M0 ${y}H1000`} stroke="#614c3a" strokeWidth="2"/>)}{[-200,0,200,400,600,800,1000,1200].map(x=><path key={x} d={`M500 466L${x} 620`} stroke="#5c4939" strokeWidth="2"/>)}<path d="M0 469H1000V620H0Z" fill={`url(#${id}-grain)`}/></g>;
}
function Plaque({x,y,text,w=150}:{x:number;y:number;text:string;w?:number}) {
  return <g><rect x={x-w/2} y={y-17} width={w} height="34" rx="6" fill="#f1dcac" stroke="#795e43" strokeWidth="2"/><text x={x} y={y+5} textAnchor="middle" fill="#4b5144" fontSize="17" fontWeight="700" fontFamily="sans-serif">{text}</text></g>;
}
function Status({x,y,on}:{x:number;y:number;on:boolean}) {return <g><circle cx={x} cy={y} r="12" fill={on?'#aee4ac':'#766b50'} stroke={ink} strokeWidth="3"/>{on&&<path d={`M${x-6} ${y}l4 4 8-9`} fill="none" stroke="#315749" strokeWidth="3"/>}</g>;}
/** Decorative specimens are silhouettes, never the puzzle's counted equation. */
function Gallery({id,state}:{id:string;state:ChapterState}) {
 const cabinet=!!state.puzzles['animal-cabinet']?.solved, tray=!!state.puzzles['pattern-tray']?.solved;
 const patternInput = state.puzzles['pattern-tray']?.input;
 const patternSlots = patternInput?.kind === 'arrangement' ? patternInput.slots : [];
 return <g><rect width="1000" height="490" fill={`url(#${id}-wall)`}/>{[40,345,660,970].map(x=><path key={x} d={`M${x} 0V467`} stroke="#a88a59" strokeWidth="14"/>)}<path d="M0 65Q500-30 1000 65" fill="none" stroke="#b28f5d" strokeWidth="25"/><Floor id={id}/><Port id={id} x={503} y={181} r={79}/><Lamp id={id} x={794} y={45}/>
 <g filter={`url(#${id}-shadow)`}><Wood id={id} x={50} y={135} w={282} h={319}/><path d="M67 153H315V385H67Z" fill="#173f3b" stroke="#d4b47b" strokeWidth="3"/>{[0,1].map(i=><g key={i}><path d={`M76 ${225+i*102}H306`} stroke="#af925f" strokeWidth="7"/><path d={`M187 ${158+i*102}V${220+i*102}`} stroke="#987750" strokeWidth="4"/></g>)}<Shell x={126} y={195} s={.8}/><g transform="translate(247 193)" fill="#b7c7a0" stroke="#799889" strokeWidth="2"><path d="M-39 0Q-15-26 12-7L36-22V22L12 7Q-15 26-39 0Z"/><circle cx="-23" cy="-3" r="3" fill={ink}/><path d="M-7-10V10M0-10V10"/></g><Bottle x={127} y={292} s={.7}/><g transform="translate(246 294)" fill="#d2b77b" stroke="#9e8859"><path d="M0-34L9-10L35-9L15 7L22 33L0 18L-22 33L-15 7L-35-9L-9-10Z"/></g><path d="M82 349q20-22 37 0t38 0M213 348q25-27 53 0" fill="none" stroke="#d3b57c" strokeWidth="5"/><Wood id={id} x={66} y={397} w={251} h={41}/><Status x={294} y={417} on={cabinet}/>{cabinet?<path d="M75 407H247V429H75Z" fill="#233f34"/>:<g fill={gold}>{[104,150,196,242].map(x=><rect key={x} x={x-13} y="406" width="26" height="20" rx="4"/>)}</g>}<Plaque x={191} y={119} text="万物收藏柜" w={170}/></g>
 <g filter={`url(#${id}-shadow)`}><path d="M347 418L628 418L666 492H319Z" fill="#bc935e" stroke={ink} strokeWidth="5"/><path d="M342 492V563M639 492V563" stroke="#73543b" strokeWidth="17"/><path d="M365 416L608 416L636 468H343Z" fill="#345d52" stroke={gold} strokeWidth="6"/>{[0,1,2,3,4,5].map(i=><g key={i} transform={`translate(${383+i*42} 442)`}><rect x="-17" y="-16" width="34" height="31" rx="5" fill={tray?'#c7d7a1':patternSlots[i]?'#dfc58f':'#244b44'} stroke="#cdb683" strokeWidth="2"/>{patternSlots[i]&&<path d="M-7 0H7M0-7V7" stroke="#568d82" strokeWidth="3"/>}</g>)}<Status x={626} y={483} on={tray}/><Plaque x={490} y={517} text="纹样托盘"/></g>
 <g filter={`url(#${id}-shadow)`}><Wood id={id} x={689} y={371} w={274} h={32}/><path d="M711 402V535M940 402V535" stroke="#6e523d" strokeWidth="16"/><Wood id={id} x={712} y={411} w={226} h={95}/><path d="M724 457H926" stroke="#604a38" strokeWidth="3"/><circle cx="826" cy="437" r="7" fill={gold}/><circle cx="826" cy="482" r="7" fill={gold}/><Books x={713} y={371} s={.85}/><Bottle x={836} y={339} s={.72}/><Shell x={906} y={355} s={.65}/><path d="M889 298V270q0-21 26-21t26 21v28Z" fill="#afd4bf" fillOpacity=".3" stroke="#c1d3ad" strokeWidth="3"/><path d="M885 300H946" stroke={gold} strokeWidth="7"/><path d="M913 289q-10-12 0-30q12 18 0 30" fill="#c5af77"/><Plaque x={823} y={553} text="收藏家的工作桌" w={190}/></g><path d="M42 554q90-39 175 0t147 4" fill="none" stroke="#c4aa74" strokeWidth="8"/><Shell x={218} y={540} s={.45}/></g>;
}
function Optics({id,state}:{id:string;state:ChapterState}) {
 const lens=!!state.puzzles['lens-chart']?.solved, tide=!!state.puzzles['tide-sudoku']?.solved;
 const tideDefinition = CHAPTER.puzzles.find(puzzle => puzzle.id === 'tide-sudoku');
 const tideGivens = tideDefinition?.kind === 'sudoku' ? tideDefinition.givens : [];
 const tideInput = state.puzzles['tide-sudoku']?.input;
 const tideCells = tideInput?.kind === 'sudoku' ? tideInput.cells : tideGivens;
 return <g><rect width="1000" height="490" fill={`url(#${id}-night)`}/><path d="M20 464V153Q500-170 980 153V464M80 464V185Q500-90 920 185V464M500 0V290" fill="none" stroke="#bd9d63" strokeWidth="11"/>{[[236,80],[687,79],[334,142],[780,184],[573,101],[874,101],[139,244]].map(([x,y],i)=><path key={i} d={`M${x-4} ${y}h8m-4-4v8`} stroke="#d7d8b3" strokeWidth="2"/>)}<Floor id={id}/><Port id={id} x={499} y={138} r={71} night/><Lamp id={id} x={90} y={62}/>
 <g filter={`url(#${id}-shadow)`}><Wood id={id} x={45} y={370} w={270} h={33}/><path d="M66 402V530M288 402V530" stroke="#65533c" strokeWidth="16"/><Books x={65} y={370} s={.9}/><Bottle x={221} y={346} color="#648aa0" s={.65}/><path d="M144 358L171 294L205 359Z" fill="#a9c1bb" fillOpacity=".55" stroke="#e0d9aa" strokeWidth="3"/><Wood id={id} x={58} y={421} w={245} h={78}/><path d="M74 446H284M74 469H284" stroke="#573f31" strokeWidth="3"/><circle cx="179" cy="460" r="7" fill={gold}/><Plaque x={181} y={549} text="观测员的桌子" w={180}/></g>
 <g filter={`url(#${id}-shadow)`}><path d="M500 368L429 534M500 368L568 534M500 368V551" stroke={ink} strokeWidth="17"/><path d="M500 371L431 532M500 371L566 532" stroke={gold} strokeWidth="8"/><g transform={`translate(499 299) rotate(${lens?-24:-12})`}><rect x="-127" y="-39" width="245" height="78" rx="12" fill="#bfa06a" stroke={ink} strokeWidth="5"/><rect x="-104" y="-35" width="25" height="70" fill="#687b76" stroke={ink} strokeWidth="3"/><rect x="56" y="-45" width="39" height="90" rx="4" fill={gold} stroke={ink} strokeWidth="4"/><ellipse cx="120" rx="16" ry="37" fill={lens?'#e5f1bd':'#89b7ba'} stroke={ink} strokeWidth="5"/><path d="M-137-19H-174V19H-137" fill="#6d7b73" stroke={ink} strokeWidth="4"/><path d="M-65-22H35" stroke="#e8d2a1" strokeWidth="5"/></g><circle cx="498" cy="368" r="36" fill={gold} stroke={ink} strokeWidth="4"/><circle cx="498" cy="368" r="23" fill="#536f6b"/><Status x={499} y={368} on={lens}/>{lens&&<path d="M627 265L692 214V313Z" fill="#e6dfae" opacity=".22"/>}<Plaque x={500} y={573} text="滤光观测仪" w={170}/></g>
 <g filter={`url(#${id}-shadow)`}><Wood id={id} x={699} y={192} w={246} h={244}/><rect x="716" y="209" width="212" height="210" rx="5" fill="#243c51" stroke={gold} strokeWidth="3"/>{[0,1,2,3].flatMap(row=>[0,1,2,3].map(col=><g key={`${row}-${col}`}><rect x={727+col*48} y={221+row*47} width="43" height="41" rx="5" fill={tide?'#a4c6b0':'#627e86'} stroke="#93a8a0"/>{!!(tideGivens[row*4+col] || tideCells[row*4+col])&&<text x={748.5+col*48} y={250+row*47} textAnchor="middle" fontFamily="sans-serif" fontSize="25" fontWeight={tideGivens[row*4+col]?800:500} fill={tideGivens[row*4+col]?'#172f38':tide?'#416965':'#fff2c5'}>{tideGivens[row*4+col] || tideCells[row*4+col]}</text>}</g>))}<path d="M820.5 217V406M723 312.5H918" stroke="#1c3540" strokeWidth="5"/><Status x={921} y={445} on={tide}/><Plaque x={821} y={174} text="潮汐棋盘" w={160}/></g><path d="M689 485Q742 465 807 484T958 480" stroke="#426375" strokeWidth="19" fill="none"/><Gear x={864} y={540} r={31}/></g>;
}
function Workshop({id,state,complete}:{id:string;state:ChapterState;complete:boolean}) {
 const gravity=!!state.puzzles['gravity-lock']?.solved, fog=complete||!!state.puzzles['foglight-console']?.solved;
 return <g><rect width="1000" height="490" fill="#576661"/><path d="M0 74H1000M0 176H1000M0 281H1000M0 386H1000" stroke="#3f504d" strokeWidth="3"/>{[80,319,659,962].map(x=><g key={x}><rect x={x} width="19" height="467" fill="#9d8b65"/>{[35,150,275,410].map(y=><circle key={y} cx={x+9} cy={y} r="3" fill={ink}/>)}</g>)}<Floor id={id}/><path d="M-25 123H326Q352 123 352 96V31H681V90" fill="none" stroke={ink} strokeWidth="27"/><path d="M-25 120H326Q350 120 350 93V29H681V90" fill="none" stroke={`url(#${id}-copper)`} strokeWidth="18"/><Lamp id={id} x={183} y={35}/><Port id={id} x={833} y={147} r={71}/>{fog&&<g><path d="M830 175L624 46H1000L883 178Z" fill="#ffdfa0" opacity=".2"/><circle cx="837" cy="235" r="217" fill={`url(#${id}-glow)`}/></g>}
 <g filter={`url(#${id}-shadow)`}><Wood id={id} x={43} y={389} w={276} h={34}/><path d="M65 423V553M298 423V553" stroke="#68513b" strokeWidth="17"/><Wood id={id} x={63} y={443} w={234} h={77}/><Gear x={118} y={353} r={30}/><Bottle x={237} y={366} s={.62} color="#b28556"/><path d="M167 378l27-61 17 7-26 59Z" fill="#a3b4a8" stroke={ink} strokeWidth="3"/><path d="M197 329l-7-18 13-16 4 15 12 5 10-10-3 22-15 8" fill="#a3b4a8" stroke={ink} strokeWidth="3"/><path d="M78 480H281" stroke="#634536" strokeWidth="3"/><circle cx="180" cy="463" r="6" fill={gold}/><circle cx="180" cy="501" r="6" fill={gold}/><Plaque x={180} y={572} text="灯塔工具台" w={170}/></g>
 <g filter={`url(#${id}-shadow)`}><rect x="359" y="179" width="269" height="300" rx="28" fill={`url(#${id}-copper)`} stroke={ink} strokeWidth="5"/><Rivets x={359} y={179} w={269} h={300}/><rect x="390" y="211" width="159" height="211" rx="8" fill="#243f42" stroke={gold} strokeWidth="5"/>{[0,1,2,3].map(i=><path key={i} d={`M${420+i*31} 218V415`} stroke="#46615c" strokeWidth="1"/>)}{[0,1,2,3,4,5].map(i=><path key={i} d={`M397 ${242+i*32}H543`} stroke="#46615c"/>)}<path d={gravity?'M397 379H539V414H397Z':'M397 379H435V343H470V414H397ZM506 381H540V414H506Z'} fill={gravity?'#a5ce9c':'#ce9c66'} stroke={ink} strokeWidth="3"/><path d={gravity?'M401 381H470V346H505V381H538':'M434 225H501V257H467V289H434Z'} fill="#87bdb1" stroke={ink} strokeWidth="3"/><Gear x={582} y={269} r={25} rotation={gravity?20:0}/><path d="M583 321V395" stroke={ink} strokeWidth="9"/><circle cx="583" cy={gravity?387:334} r="16" fill={gold} stroke={ink} strokeWidth="3"/><Status x={495} y={451} on={gravity}/><Plaque x={493} y={160} text="重力机械锁" w={175}/></g>
 <g filter={`url(#${id}-shadow)`}><path d="M738 346L767 250H903L933 346Z" fill={`url(#${id}-copper)`} stroke={ink} strokeWidth="5"/><rect x="774" y="214" width="122" height="76" rx="13" fill={fog?'#ffedac':'#779494'} stroke={ink} strokeWidth="5"/><path d="M780 225H890M780 243H890M780 263H890M800 216V287M834 216V287M868 216V287" stroke={fog?'#cdae64':'#a3b6a4'} strokeWidth="3"/><path d="M762 212L780 189H890L908 212Z" fill={gold} stroke={ink} strokeWidth="4"/><rect x="718" y="347" width="233" height="169" rx="18" fill={`url(#${id}-copper)`} stroke={ink} strokeWidth="5"/><Rivets x={718} y={347} w={233} h={169}/><rect x="740" y="368" width="188" height="72" rx="10" fill="#2c4541" stroke={gold} strokeWidth="3"/>{[0,1,2].map(i=><g key={i}><circle cx={776+i*58} cy="403" r="21" fill={fog?'#c7e2a3':'#576b58'} stroke={gold} strokeWidth="3"/><path d={`M${776+i*58} 416v-23`} stroke={fog?'#527757':'#b7b67d'} strokeWidth="3"/></g>)}<path d="M770 475H899" stroke={ink} strokeWidth="12"/><circle cx={fog?892:775} cy="475" r="20" fill={fog?'#e9e9a3':'#ceab71'} stroke={ink} strokeWidth="4"/><Plaque x={834} y={548} text={fog?'雾灯已点亮':'雾灯控制台'} w={180}/></g><path d="M314 546q48-33 96-12t116 5q55-12 89 12" fill="none" stroke="#3c4237" strokeWidth="12"/><path d="M314 543q48-33 96-12t116 5q55-12 89 12" fill="none" stroke="#b3945b" strokeWidth="5"/></g>;
}
export function SceneArt({scene,state,complete}:{scene:string;state:ChapterState;complete:boolean}) {
 const id=useId().replace(/:/g,'');
 return <svg viewBox="0 0 1000 620" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label={scene==='gallery'?'温暖的海洋收藏室，标本柜、纹样托盘和工作桌':scene==='optics'?'蓝色穹顶观测室，黄铜望远镜和潮汐棋盘':'铜管机械工坊，重力锁和雾灯'}><Defs id={id}/>{scene==='gallery'?<Gallery id={id} state={state}/>:scene==='optics'?<Optics id={id} state={state}/>:<Workshop id={id} state={state} complete={complete}/>}</svg>;
}

/** These boxes describe painted objects; the caller supplies accessible HTML buttons. */
export const SEARCH_HOTSPOTS: Record<string, ArtHotspot[]> = {
 gallery: [
  {id:'gallery-curtain',label:'掀开布帘',x:6,y:30,width:25,height:31},
  {id:'brush',label:'软刷',x:12,y:30,width:13,height:24},
  {id:'shell-fan',label:'抬起贝壳扇',x:57,y:51,width:24,height:33},
  {id:'arrow-tiles',label:'箭纹片',x:61,y:58,width:16,height:22},
 ],
 optics: [
  {id:'rolled-chart',label:'展开卷图',x:8,y:47,width:43,height:29},
  {id:'hook',label:'长柄钩',x:15,y:54,width:30,height:18},
  {id:'cloth',label:'镜布',x:65,y:54,width:20,height:26},
 ],
 workshop: [
  {id:'rope-coil',label:'移开盘绳',x:8,y:43,width:25,height:35},
  {id:'oil-can',label:'小油壶',x:13,y:49,width:17,height:24},
  {id:'vane-tiles',label:'风标纹片',x:42,y:47,width:17,height:22},
  {id:'hook-grate',label:'格栅后有纹片',x:67,y:28,width:27,height:32},
  {id:'sail-tiles',label:'帆纹片',x:73,y:60,width:16,height:22},
 ],
};
function Brush({x,y}:{x:number;y:number}) {
 return <g transform={`translate(${x} ${y}) rotate(16)`} stroke={ink} strokeWidth="3"><path d="M-10 22V-51Q0-66 10-51V22Z" fill="#b9804c"/><rect x="-20" y="20" width="40" height="18" rx="3" fill={gold}/><path d="M-20 38H20L26 73Q0 83-26 73Z" fill="#ede0bd"/>{[-15,-6,5,15].map(x=><path key={x} d={`M${x} 42l${x*.25} 31`} stroke="#b8a37a" strokeWidth="2"/>)}</g>;
}
function Tiles({x,y,kind}:{x:number;y:number;kind:'arrow'|'vane'|'sail'}) {
 return <g transform={`translate(${x} ${y})`}>{[0,1].map(i=><g key={i} transform={`translate(${i*68} ${i?9:0}) rotate(${i?10:-8})`} stroke={ink} strokeWidth="3"><rect x="-26" y="-32" width="54" height="68" rx="7" fill="#ead3a2"/><path d={kind==='arrow'?'M0 16V-15M-12-4L0-16 12-4':kind==='sail'?'M-16 15H16M-7 10V-16L14 10Z':'M0 19V-17M-15-9H18M0-17L18-9 0-1Z'} fill={kind==='arrow'?'none':'#5e8c82'} stroke="#426f66" strokeWidth="4"/></g>)}</g>;
}
function Cup({x,y}:{x:number;y:number}) {return <g transform={`translate(${x} ${y})`} stroke={ink} strokeWidth="3"><path d="M25-25q27-5 24 16T27 5" fill="none" stroke="#adc1b0" strokeWidth="10"/><path d="M-30-36H31L23 15Q0 25-24 15Z" fill="#b9cdbc"/><ellipse cy="-35" rx="30" ry="8" fill="#607d71"/><path d="M-21-19L-16 7" stroke="#e2ead5" strokeWidth="5"/></g>;}
function Compass({x,y}:{x:number;y:number}) {return <g transform={`translate(${x} ${y})`}><circle r="43" fill={gold} stroke={ink} strokeWidth="4"/><circle r="34" fill="#e5d7aa" stroke="#907c51" strokeWidth="2"/>{[0,45,90,135].map(a=><path key={a} d="M0-27V27" stroke="#b0a079" transform={`rotate(${a})`}/>)}<path d="M0-29L9 0 0 25-9 0Z" fill="#457876" stroke={ink} strokeWidth="2"/><path d="M0-29L9 0H-9Z" fill="#bd7656"/><circle r="4" fill={gold}/></g>;}
function Rope({x,y}:{x:number;y:number}) {return <g transform={`translate(${x} ${y})`} fill="none">{[0,1,2,3,4].map(i=><ellipse key={i} cx={i*2} cy={i*3} rx={108-i*15} ry={79-i*11} stroke="#705137" strokeWidth="15"/>)}{[0,1,2,3,4].map(i=><ellipse key={i} cx={i*2} cy={i*3-2} rx={108-i*15} ry={79-i*11} stroke="#d1b07c" strokeWidth="9" strokeDasharray="6 3"/>)}<path d="M87 42q61 58 104 26" stroke="#c8a574" strokeWidth="11"/></g>;}
function Oil({x,y}:{x:number;y:number}) {return <g transform={`translate(${x} ${y})`} stroke={ink} strokeWidth="3"><path d="M-30-30q-39 6-25 41l28 4" fill="none" stroke="#c0a46b" strokeWidth="11"/><path d="M-34-18Q-30-40 14-27L32 32Q-8 53-42 31Z" fill="#b4a264"/><path d="M13-23L72-48 77-41 26 3" fill="#c0ae78"/><path d="M-23-27V-42H6V-30" fill={gold}/><path d="M-25 0L-30 24" stroke="#e7d397" strokeWidth="5"/></g>;}
function SearchScenery({id,scene}:{id:string;scene:string}) {
 return <g><rect width="1000" height="620" fill={scene==='optics'?'#253e53':scene==='gallery'?'#3c6254':'#4b5c58'}/><Wood id={id} x={24} y={93} w={952} h={91}/><path d="M35 184H965" stroke={ink} strokeWidth="13"/><Wood id={id} x={0} y={279} w={1000} h={341}/><path d="M0 288H1000" stroke="#dcc092" strokeWidth="6"/><path d="M0 482H1000M0 584H1000" stroke="#6c4f38" strokeWidth="3"/>
 {/* A deliberately irregular shelf of keepsakes, never a row of answer icons. */}
 <Books x={51} y={162} s={.65}/><Bottle x={193} y={140} s={.58} color={scene==='optics'?'#7697aa':'#82a69a'}/><Shell x={293} y={144} s={.7}/><Cup x={407} y={145}/><g transform="translate(539 137) rotate(-8)"><rect x="-45" y="-15" width="92" height="32" rx="5" fill="#a6674c" stroke={ink} strokeWidth="3"/><path d="M-36-6H37M-36 4H37" stroke="#d8c390" strokeWidth="4"/></g><Bottle x={673} y={138} s={.62}/><Books x={784} y={168} s={.68}/><Shell x={922} y={150} s={.65}/>
 <path d="M4 595q125-33 240-10" fill="none" stroke="#604a36" strokeWidth="6"/><path d="M324 572q35-8 65 0m-37 7h21M831 557q49-11 98 0" fill="none" stroke="#d8b381" strokeWidth="2" opacity=".5"/></g>;
}
export function SearchBackdrop({scene,state}:{scene:string;state:ChapterState}) {
 const id=useId().replace(/:/g,'');
 const found=(item:string)=>state.found.includes(item), revealed=(name:string)=>state.revealed.includes(name);
 return <svg viewBox="0 0 1000 620" width="100%" height="100%" role="img" aria-label="放大的收藏工作台；移动遮挡物，寻找可以带走的工具"><Defs id={id}/><SearchScenery id={id} scene={scene}/>
 {scene==='gallery'?<g>
  <Wood id={id} x={62} y={194} w={242} h={177}/><rect x="79" y="206" width="208" height="148" rx="5" fill="#28463d"/>{revealed('gallery-curtain')&&!found('brush')&&<Brush x={181} y={261}/>}
  {revealed('gallery-curtain')?<path d="M62 187H110L96 349 63 370Z" fill="#ab6857" stroke={ink} strokeWidth="3"/>:<g><path d="M59 188H308L294 356Q275 385 242 363Q213 384 181 365Q146 384 115 362Q80 381 60 358Z" fill="#b4715c" stroke={ink} strokeWidth="4"/><path d="M101 195Q122 274 103 360M154 197Q173 290 157 368M209 196Q228 287 211 369M265 196Q281 271 264 366" fill="none" stroke="#d49577" strokeWidth="9"/><path d="M64 193H302" stroke={gold} strokeWidth="9"/></g>}
  <g transform="translate(432 315) rotate(9)"><rect x="-75" y="-69" width="149" height="115" rx="6" fill="#e3c994" stroke="#836a49" strokeWidth="3"/><path d="M-50-43q30 23 64-9t38 44M-42 25l15-17 31 17 28-12" fill="none" stroke="#809d85" strokeWidth="3"/><circle cx="-39" cy="-18" r="13" fill="none" stroke="#a3835f" strokeWidth="2"/></g><Compass x={424} y={450}/><Bottle x={882} y={304} color="#829f91" s={.85}/><Cup x={864} y={456}/><Books x={326} y={562} s={.6}/>
  <ellipse cx="693" cy="429" rx="132" ry="100" fill="#715340" stroke={gold} strokeWidth="5"/>{revealed('shell-fan')&&!found('arrow-tiles')&&<Tiles x={657} y={427} kind="arrow"/>}{!revealed('shell-fan')&&<Shell x={691} y={413} s={3.6}/>}{revealed('shell-fan')&&<Shell x={557} y={534} s={1.3}/>}
  <path d="M53 445q36-26 56 0t38 0" fill="none" stroke="#b69458" strokeWidth="12"/><circle cx="85" cy="484" r="24" fill="none" stroke="#bfa971" strokeWidth="8"/><path d="M890 561l21-48 16 3-6 52Z" fill="#987355" stroke={ink} strokeWidth="3"/>
 </g>:scene==='optics'?<g>
  <Port id={id} x={511} y={243} r={61} night/><path d="M71 463L496 456L466 306H108Z" fill="#6e523b" stroke="#c2a570" strokeWidth="3"/>{revealed('rolled-chart')&&!found('hook')&&<g transform="translate(173 405) rotate(-5)" fill="none" stroke={ink} strokeWidth="18"><path d="M0 0H209q46 0 39-38q-5-18-22-9"/><path d="M0 0H209q46 0 39-38q-5-18-22-9" stroke="#b8c4b0" strokeWidth="11"/><path d="M0 0H80" stroke="#af7850" strokeWidth="18"/></g>}
  {!revealed('rolled-chart')?<g transform="rotate(-5 296 381)"><path d="M102 300H471L486 461H117Z" fill="#e2c997" stroke="#836749" strokeWidth="4"/><path d="M139 330q88 59 170-2t143 21M155 385q59-33 115 10t173 4" stroke="#769588" strokeWidth="4" fill="none"/><path d="M104 301q-28 66 11 154M470 302q-29 64 14 153" stroke="#c5a778" strokeWidth="23"/><path d="M104 306q-14 51 4 99M470 307q-11 52 7 100" stroke="#f6dfad" strokeWidth="6"/></g>:<g transform="translate(265 523) rotate(4)"><rect x="-159" y="-24" width="318" height="48" rx="22" fill="#ddc496" stroke="#8e6c48" strokeWidth="3"/><ellipse cx="-145" rx="12" ry="21" fill="#a88758"/><path d="M-100-16H109" stroke="#f1dbb1" strokeWidth="5"/></g>}
  <g transform="translate(785 272) rotate(-15)"><rect x="-111" y="-28" width="218" height="56" rx="8" fill={gold} stroke={ink} strokeWidth="4"/><ellipse cx="106" rx="15" ry="29" fill="#88afb0" stroke={ink} strokeWidth="4"/><rect x="-81" y="-28" width="21" height="56" fill="#6f8277"/><path d="M-38-15H64" stroke="#f1d9a0" strokeWidth="4"/></g><path d="M769 302L720 363M769 302L823 351" stroke={gold} strokeWidth="10"/>
  {!found('cloth')&&<g><path d="M673 350L807 335L851 441L710 478L651 405Z" fill="#91b7b0" stroke={ink} strokeWidth="3"/><path d="M690 363L802 351L830 430L716 457L670 402Z" fill="none" stroke="#d2e1ca" strokeWidth="4"/><path d="M696 360L734 445M811 357L775 456" stroke="#719b99" strokeWidth="4"/></g>}
  <Compass x={570} y={477}/><Bottle x={898} y={525} s={.62} color="#6e8ba7"/><Shell x={490} y={576} s={.55}/><path d="M72 235L127 225M92 215L101 253" stroke={gold} strokeWidth="8"/><circle cx="601" cy="557" r="20" fill="none" stroke="#bc9f69" strokeWidth="7"/>
 </g>:<g>
  <ellipse cx="214" cy="392" rx="122" ry="95" fill="#70523b"/>{revealed('rope-coil')&&!found('oil-can')&&<Oil x={212} y={391}/>}{!revealed('rope-coil')&&<Rope x={212} y={382}/>} {revealed('rope-coil')&&<g transform="translate(179 534) scale(.5)"><Rope x={0} y={0}/></g>}
  <path d="M409 294L584 289L609 429L399 445Z" fill="#728b80" stroke={ink} strokeWidth="4"/><path d="M420 308L572 303L591 415L413 428Z" fill="#435f55" stroke="#b2b49a" strokeWidth="3"/>{!found('vane-tiles')&&<Tiles x={467} y={357} kind="vane"/>}
  <rect x="683" y="185" width="258" height="174" rx="14" fill="#1f3637" stroke="#c39762" strokeWidth="10"/>{[0,1,2,3,4,5].map(i=><path key={i} d={`M${707+i*42} 193V351`} stroke="#85938a" strokeWidth="11"/>)}<path d="M692 224H931M692 304H931" stroke="#899289" strokeWidth="9"/>
  {state.usedTools.includes('hook-grate')?<g><path d="M705 354l26 26 153-12 33-17" stroke={gold} strokeWidth="6" fill="none"/>{!found('sail-tiles')&&<Tiles x={774} y={433} kind="sail"/>}</g>:<g><path d="M917 253q-21 7-24 33" stroke={gold} strokeWidth="5" fill="none"/><circle cx="917" cy="252" r="7" fill="#cdb37d"/></g>}
  <Gear x={402} y={517} r={39}/><Gear x={517} y={529} r={25} rotation={18}/><Cup x={653} y={504}/><Bottle x={77} y={264} s={.58} color="#9b9667"/><path d="M521 225l104 9 9 21-121-10Z" fill="#c6b077" stroke={ink} strokeWidth="3"/><path d="M540 229l-2 13M562 233l-2 12M584 235l-2 13M606 238l-2 12" stroke="#6d684e" strokeWidth="2"/><path d="M916 566L891 465L906 461L933 561Z" fill="#a4aaa0" stroke={ink} strokeWidth="3"/><rect x="895" y="527" width="32" height="57" rx="8" transform="rotate(-14 912 551)" fill="#b46f4e" stroke={ink} strokeWidth="3"/>
 </g>}
 </svg>;
}
export const SearchArt = SearchBackdrop;
