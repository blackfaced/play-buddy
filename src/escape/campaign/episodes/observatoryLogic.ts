export const STARS = [1,3,1,2,4,1,2,2] as const;
export const HOLES = [6,1,3] as const;
export const BEACONS = [{id:'gull',symbol:'⌁',x:0,y:1},{id:'shell',symbol:'◔',x:2,y:2},{id:'crown',symbol:'♜',x:3,y:0}] as const;
export function rotatedStars(rotation:number):number[]{return STARS.map((_,i)=>STARS[(i-rotation+8)%8]);}
export function discAligned(rotation:number):boolean{return Number.isInteger(rotation)&&rotation>=0&&rotation<8&&rotatedStars(rotation).every((s,i)=>s===STARS[(i-3+8)%8]);}
export function visibleConstellations(rotation:number):string[]{const ring:Record<number,string>={1:'gull',4:'shell',6:'crown'};return HOLES.map(h=>ring[(h+rotation)%8]??'');}
export function stripsRegistered(offsets:readonly number[],flips:readonly number[]):boolean{return offsets.length===2&&flips.length===2&&offsets.every(x=>x===0)&&flips.every(x=>x===0);}
export function sightIntersection(offsets:readonly number[]):[number,number]{const x=(4+offsets[1]-offsets[0])/2;return[x,x+offsets[0]];}
export function telescopeAligned(azimuth:number,elevation:number):boolean{const [x,y]=sightIntersection([0,0]);const beacon=BEACONS.find(b=>b.x===x&&b.y===y);const slots=visibleConstellations(3);const index=slots.indexOf(beacon?.id??'');return index>=0&&azimuth===(HOLES[index]+3)%8&&elevation===(y>=2?0:y===1?1:2);}
