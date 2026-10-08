import type { FilterPuzzle, PatternStamp } from './types';
const emblemIds: Record<string, NonNullable<PatternStamp['emblem']>> = {贝壳:'shell',星:'star',鱼:'fish',浪:'wave',锚:'anchor',帆:'sail'};
export interface LensPoint { x: number; y: number }
export const LENS_RADIUS = 76;
export const LENS_START: LensPoint = { x: 360, y: 330 };
export function clampLens(point: LensPoint): LensPoint {
  return { x: Math.max(80, Math.min(640, point.x)), y: Math.max(80, Math.min(340, point.y)) };
}
/** SVG xMidYMid meet includes letterboxing: map client space through the same transform. */
export function lensPointFromClient(x: number, y: number, rect: {left:number;top:number;width:number;height:number}): LensPoint {
  const scale = Math.min(rect.width / 720, rect.height / 420);
  if (!Number.isFinite(scale) || scale <= 0) return LENS_START;
  return clampLens({x:(x-rect.left-(rect.width-720*scale)/2)/scale, y:(y-rect.top-(rect.height-420*scale)/2)/scale});
}
export function lensClues(puzzle: FilterPuzzle) {
  const locations = [
    [{x:145,y:115},{x:550,y:280}],
    [{x:560,y:105},{x:160,y:295}],
    [{x:355,y:220},{x:375,y:85}],
  ];
  return puzzle.lenses.flatMap((lens,index) => [
    {id:`${lens.id}-digit`,lens:lens.id,...locations[index%3][0],text:`${lens.symbol} ${lens.clue}`,emblems:undefined,label:'检修印记',width:54,height:34},
    {id:`${lens.id}-route`,lens:lens.id,...locations[index%3][1],text:lens.marks.join(' → '),emblems:lens.marks.map(mark=>emblemIds[mark]),label:'航路刻记',width:lens.marks.length*30-2,height:28},
  ]);
}
/** Only a fully legible inscription is copied; brushing its edge never reveals a whole layer. */
export function observedClues(puzzle: FilterPuzzle, lens: string|null, point: LensPoint) {
  return lensClues(puzzle).filter(clue => clue.lens === lens &&
    Math.hypot(Math.abs(point.x-clue.x)+clue.width/2,Math.abs(point.y-clue.y)+clue.height/2) <= (LENS_RADIUS-5)/1.12);
}
