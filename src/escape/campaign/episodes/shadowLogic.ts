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
export const initialShadow=()=>fresh({weights:[1,2,3],traces:[0,0,0],pieces:[0,2,1],depths:[1,1,1],turns:[0,0,0],demo:1,chest:false,lit:false});
export function normalizeShadow(s:EpisodeState):EpisodeState{const weights=permutation(s.values.weights,[1,2,3],[1,2,3]),traces=rotations(s.values.traces,3,4),pieces=permutation(s.values.pieces,[0,1,2],[0,2,1]),turns=rotations(s.values.turns,3,4),depths=Array.isArray(s.values.depths)&&s.values.depths.length===3?s.values.depths.map(x=>integer(x,4,1)||1):[1,1,1];const solved=[...(weightTorque(weights)===10?['balance']:[]),...(traces.every((r,i)=>maskMatches(i,r))?['traces']:[])];return {values:{weights,traces,pieces,depths,turns,demo:integer(s.values.demo,4,1)||1,chest:s.values.chest===true,lit:s.values.lit===true&&projectionMatches(pieces,depths,turns)},solved,inventory:solved.map(x=>x==='balance'?'升起的港湾幕布':'重合的拓片'),inspected:s.inspected.filter(x=>['balance','traces','stage'].includes(x))};}
