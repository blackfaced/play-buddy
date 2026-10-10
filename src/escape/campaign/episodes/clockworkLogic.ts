import type { EpisodeState } from '../types';
import { fresh, integer, permutation, rotations } from './clockworkState';
export const GEAR_TEETH=[24,36,48];
export const SOCKET_DISTANCES=[18,24,30];
export const MURAL_SEAMS=[[0,1],[3,4],[2,3],[1,2]];
export const BIRD_HABITATS=[2,0,1];
export const gearsMesh=(gears:number[])=>gears.length===3&&gears.every((t,i)=>6+t/2===SOCKET_DISTANCES[i]);
export const gearReadings=(gears:number[])=>gears.map(t=>t?(12-144/t)%12:0);
export const muralJoined=(pieces:number[])=>pieces.length===4&&MURAL_SEAMS[pieces[0]]?.[0]===0&&MURAL_SEAMS[pieces[3]]?.[1]===4&&pieces.slice(1).every((p,i)=>MURAL_SEAMS[pieces[i]]?.[1]===MURAL_SEAMS[p]?.[0]);
export const camRelease=(cams:number[])=>cams.length===3&&cams.every((r,b)=>r===gearReadings(GEAR_TEETH)[BIRD_HABITATS[b]]);
/** Zero denotes an empty axle. A loose gear displaces its occupant to the tray. */
export function placeClockworkGear(gears:number[],teeth:number,destination:number):number[]{
 const next=[...gears],source=next.indexOf(teeth);
 if(!GEAR_TEETH.includes(teeth)||destination < -1||destination>2)return next;
 if(destination===-1){if(source>=0)next[source]=0;return next;}
 if(source>=0)next[source]=next[destination];
 next[destination]=teeth;return next;
}
export const initialClockwork=()=>fresh({explorationVersion:3,gears:[0,0,0],testedGears:[0,0,0],foundGears:[],mural:[2,0,1,3],foundStrips:[0,2],cams:[0,0,0],crank:0,cloth:false,released:false,drawer:false,shutter:false,cabinetOpen:false,pendulumAside:false,handle:false,hoist:false,upperOpen:false,stripMounted:false});
export function normalizeClockwork(s:EpisodeState):EpisodeState{
 const v=s.values,legacy=v.explorationVersion!==2&&v.explorationVersion!==3;
 const rawGears:unknown[]=Array.isArray(v.foundGears)?v.foundGears:[],rawStrips:unknown[]=Array.isArray(v.foundStrips)?v.foundStrips:[];
 const foundGears=legacy?[...GEAR_TEETH]:GEAR_TEETH.filter(t=>rawGears.includes(t));
 const foundStrips=legacy?[0,1,2,3]:[0,1,2,3].filter(p=>p===0||p===2||rawStrips.includes(p));
 const used=new Set<number>();
 const gears=legacy?permutation(v.gears,GEAR_TEETH,[48,24,36]):Array.from({length:3},(_,i)=>{const t=Array.isArray(v.gears)?v.gears[i]:0;if(typeof t==='number'&&foundGears.includes(t)&&!used.has(t)){used.add(t);return t;}return 0;});
 const mural=permutation(v.mural,[0,1,2,3],[2,0,1,3]),cams=rotations(v.cams,3,12),crank=integer(v.crank,10001);
 const stripMounted=legacy||v.stripMounted===true&&foundStrips.length===4;
 const testedGears=legacy?[...gears]:Array.from({length:3},(_,i)=>Array.isArray(v.testedGears)&&typeof v.testedGears[i]==='number'&&GEAR_TEETH.includes(v.testedGears[i] as number)?v.testedGears[i] as number:0);
 const solved=[...(gearsMesh(gears)&&crank>0&&testedGears.join()===gears.join()?['gears']:[]),...(stripMounted&&muralJoined(mural)?['mural']:[])];
 // Old players keep their access and earned ending. New exploration never rewrites campaign unlocks.
 const upperOpen=legacy||v.upperOpen===true;
 const released=v.released===true&&camRelease(cams)&&upperOpen;
 return {values:{explorationVersion:3,gears,testedGears,foundGears,mural,foundStrips,cams,crank,cloth:v.cloth===true,released,drawer:legacy||v.drawer===true,shutter:legacy||v.shutter===true,cabinetOpen:v.cabinetOpen===true,pendulumAside:v.pendulumAside===true,handle:legacy||v.handle===true,hoist:legacy||v.hoist===true,upperOpen,stripMounted},solved,inventory:[...foundGears.filter(t=>!gears.includes(t)).map(t=>`${t} 齿轮`),...(v.handle===true||legacy?['短摇柄']:[]),...(!stripMounted?foundStrips.filter(p=>p===1||p===3).map(p=>p===1?'赭红画片':'海色画片'):[]),...(solved.includes('mural')?['完整的鸟画']:[])],inspected:s.inspected.filter(x=>['room','bench','shaft','service','gears','mural','cams','drawer','shutter','hoist'].includes(x))};
}
