import type { EpisodeState } from '../types';
import { fresh, integer, permutation, rotations } from './clockworkState';
export type Cell=readonly[number,number];
export const PAPER_MASKS:readonly (readonly Cell[])[]=[[[0,0],[1,0],[0,1],[0,2],[1,2]],[[0,1],[1,1],[2,1],[2,0]],[[0,0],[1,1],[2,0],[2,1]]];
export function rotateMask(cells:readonly Cell[],r:number):Cell[]{return cells.map(([x,y])=>{for(let k=0;k<r%4;k++){[x,y]=[2-y,x];}return [x,y];});}
export const TRACE_MASKS:readonly (readonly Cell[])[]=[[[2,0],[2,1],[1,0],[0,0],[0,1]],[[1,2],[1,1],[1,0],[0,0]],[[2,2],[1,1],[0,2],[0,1]]];
const sameMask=(a:readonly Cell[],b:readonly Cell[])=>a.length===b.length&&a.every(([x,y])=>b.some(([u,v])=>x===u&&y===v));
export const maskMatches=(piece:number,r:number)=>sameMask(rotateMask(PAPER_MASKS[piece],r),TRACE_MASKS[piece]);
export const weightTorque=(weights:number[])=>weights.reduce((s,w,i)=>s+w*(i+1),0);
export const STAGE_LANDINGS=[{piece:1,scale:3},{piece:0,scale:2},{piece:2,scale:1}];
export const projectionMatches=(pieces:number[],depths:number[],turns:number[])=>pieces.length===3&&depths.length===3&&turns.length===3&&pieces.every((p,i)=>p===STAGE_LANDINGS[i].piece&&depths[i]===STAGE_LANDINGS[i].scale&&maskMatches(p,turns[i]));
export const initialShadow=()=>fresh({explorationVersion:2,weights:[1,2,3],traces:[0,0,0],pieces:[0,2,1],depths:[1,1,1],turns:[0,0,0],demo:1,chest:false,puppetsFound:false,puppetsMounted:false,lampHandle:false,lampOpen:false,curtainRaised:false,lit:false});
export function normalizeShadow(s:EpisodeState):EpisodeState{
 const v=s.values,legacy=v.explorationVersion!==2;
 const weights=permutation(v.weights,[1,2,3],[1,2,3]),traces=rotations(v.traces,3,4),pieces=permutation(v.pieces,[0,1,2],[0,2,1]),turns=rotations(v.turns,3,4),depths=Array.isArray(v.depths)&&v.depths.length===3?v.depths.map(x=>integer(x,4,1)||1):[1,1,1];
 // Old episodes already supplied these props at every station. Keep that access on migration.
 const puppetsFound=legacy||v.puppetsFound===true,puppetsMounted=puppetsFound&&(legacy||v.puppetsMounted===true),lampHandle=legacy||v.lampHandle===true,lampOpen=lampHandle&&(legacy||v.lampOpen===true);
 const curtainRaised=v.curtainRaised===true||legacy&&weightTorque(weights)===10;
 const solved=[...(curtainRaised?['balance']:[]),...(puppetsFound&&traces.every((r,i)=>maskMatches(i,r))?['traces']:[])];
 const lit=v.lit===true&&puppetsMounted&&lampOpen&&projectionMatches(pieces,depths,turns);
 return {values:{explorationVersion:2,weights,traces,pieces,depths,turns,demo:integer(v.demo,4,1)||1,chest:legacy||v.chest===true||puppetsFound,puppetsFound,puppetsMounted,lampHandle,lampOpen,curtainRaised,lit},solved,inventory:[...(puppetsFound&&!puppetsMounted?['纸偶托盘']:[]),...(lampHandle&&!lampOpen?['灯闸柄']:[]),...(solved.includes('traces')?['重合的拓片']:[])],inspected:s.inspected.filter(x=>['room','wing','gallery','balance','traces','stage'].includes(x))};
}
