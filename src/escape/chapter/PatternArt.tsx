import type { PatternStamp } from './types';
const emblemNames = {shell:'贝壳',star:'星',fish:'鱼',wave:'浪',anchor:'锚',sail:'帆'};
const directions = {N:'上',E:'右',S:'下',W:'左'};
/** One physical engraving vocabulary, shared by tiles, optical clues and raw records. */
export function EmblemArt({emblem}:{emblem:NonNullable<PatternStamp['emblem']>}) {
  return <g data-emblem={emblem}>
      {emblem==='shell' && <><path d="M2 18Q-3 5 13 1Q29 5 24 18L15 26H11Z"/><path d="M13 4V24M5 7L11 24M21 7L15 24"/></>}
      {emblem==='star' && <path d="M13 0L17 9L27 10L19 17L22 27L13 21L4 27L7 17L0 10L10 9Z"/>}
      {emblem==='fish' && <><path d="M0 14Q11-2 22 14Q11 30 0 14ZM22 14L29 6V22Z"/><circle cx="7" cy="12" r="1"/></>}
      {emblem==='wave' && <><path d="M0 8Q5 1 11 8T22 8M0 17Q5 10 11 17T22 17M0 26Q5 19 11 26T22 26"/></>}
      {emblem==='anchor' && <><circle cx="13" cy="3" r="3"/><path d="M13 6V27M6 12H20M1 18Q1 29 13 27Q25 29 25 18M0 21L1 17L5 20M21 20L25 17L26 21"/></>}
      {emblem==='sail' && <><path d="M13 0V22H1ZM16 5L27 22H16ZM0 25H28L23 30H5Z"/></>}
  </g>;
}
export function RouteArt({emblems}:{emblems:NonNullable<PatternStamp['emblem']>[]}) {
  const width=emblems.length*30-6;
  return <svg data-route-art="true" viewBox={`-2 -2 ${width+4} 28`} width={width+4} height="28" role="img" aria-label={emblems.map(emblem=>emblemNames[emblem]).join(' → ')}>
    <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {emblems.map((emblem,index)=><g key={index}>
        <g transform={`translate(${index*30} 0) scale(.8)`}><EmblemArt emblem={emblem}/></g>
        {index<emblems.length-1 && <path d={`M${index*30+25} 12h4m-3-3 3 3-3 3`} strokeWidth="1.4"/>}
      </g>)}
    </g>
  </svg>;
}
export function StampArt({ stamp }: { stamp: PatternStamp }) {
  const angle = {N:0,E:90,S:180,W:270}[stamp.direction];
  return <svg viewBox="0 0 100 100" role="img" aria-label={`朝${directions[stamp.direction]}的箭纹，${stamp.dots}个刻点${stamp.emblem ? `，角落有${emblemNames[stamp.emblem]}徽记` : ''}`} className="chapter-stamp-art">
    <path d="M42 58V29H29L50 9L71 29H58V58Z" transform={`rotate(${angle} 50 35)`} fill="#435e65" stroke="#283f48" strokeWidth="2"/>
    {Array.from({length:stamp.dots},(_,i)=><circle key={i} cx={19+i*16} cy="84" r="4" fill="#695336"/>)}
    {stamp.emblem && <g transform="translate(71 60) scale(.75)" fill="none" stroke="#915733" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <EmblemArt emblem={stamp.emblem}/>
    </g>}
  </svg>;
}
/** Physical maker's frame: same clipped corner and rivets on both old boards. */
export function FrameSeal() {
  return <svg className="chapter-frame-seal" viewBox="0 0 180 160" role="img" aria-label="铜印：左上斜切角的四乘四方框，右下两颗并排铆钉">
    <path d="M34 9H166V148H12V31Z" fill="#d7bb83" stroke="#715a3b" strokeWidth="6"/>
    <rect x="32" y="28" width="116" height="100" fill="#f0dfb8" stroke="#806440" strokeWidth="2"/>
    {[1,2,3].map(n=><g key={n} stroke="#967744" strokeWidth="1.5"><path d={`M${32+n*29} 28V128`}/><path d={`M32 ${28+n*25}H148`}/></g>)}
    <circle cx="140" cy="140" r="3" fill="#806440"/><circle cx="152" cy="140" r="3" fill="#806440"/>
  </svg>;
}
