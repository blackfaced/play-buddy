import type { EpisodeState } from '../types';
import { fresh, integer, permutation, rotations } from './clockworkState';
export const GEAR_TEETH=[24,36,48];
export const SOCKET_DISTANCES=[18,24,30];
export const MURAL_SEAMS=[[0,1],[3,4],[2,3],[1,2]];
export const BIRD_HABITATS=[2,0,1];
export const gearsMesh=(gears:number[])=>gears.length===3&&gears.every((t,i)=>6+t/2===SOCKET_DISTANCES[i]);
export const gearReadings=(gears:number[])=>gears.map(t=>(12-144/t)%12);
export const muralJoined=(pieces:number[])=>pieces.length===4&&MURAL_SEAMS[pieces[0]]?.[0]===0&&MURAL_SEAMS[pieces[3]]?.[1]===4&&pieces.slice(1).every((p,i)=>MURAL_SEAMS[pieces[i]]?.[1]===MURAL_SEAMS[p]?.[0]);
export const camRelease=(cams:number[])=>cams.length===3&&cams.every((r,b)=>r===gearReadings(GEAR_TEETH)[BIRD_HABITATS[b]]);
export const initialClockwork=()=>fresh({gears:[48,24,36],mural:[2,0,1,3],cams:[0,0,0],crank:0,cloth:false,released:false});
export function normalizeClockwork(s:EpisodeState):EpisodeState{const gears=permutation(s.values.gears,GEAR_TEETH,[48,24,36]),mural=permutation(s.values.mural,[0,1,2,3],[2,0,1,3]),cams=rotations(s.values.cams,3,12),crank=integer(s.values.crank,10001);const solved=[...(gearsMesh(gears)&&crank>0?['gears']:[]),...(muralJoined(mural)?['mural']:[])];return {values:{gears,mural,cams,crank,cloth:s.values.cloth===true,released:s.values.released===true&&camRelease(cams)},solved,inventory:solved.map(x=>x==='gears'?'转动的齿轮':'完整的鸟画'),inspected:s.inspected.filter(x=>['gears','mural','cams'].includes(x))};}
