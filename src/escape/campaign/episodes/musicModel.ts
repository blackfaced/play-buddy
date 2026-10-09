import type { EpisodeState } from '../types';
import { signalPermutation } from './radioModel';
export const MUSIC_BIRDS=['燕鸥','猫头鹰','燕子'] as const;
export const MUSIC_LENGTHS=[9,6,4] as const;
export const MUSIC_ROLL=[1,-1,0,2,-1,1] as const;
export const musicRoll = (offset: number) => MUSIC_ROLL.map((_,i)=>MUSIC_ROLL[(i-offset+6)%6]);
export const musicInitial=():EpisodeState=>({values:{bars:[2,0,1],roll:2,pegs:[],played:false,muted:false},solved:[],inventory:[],inspected:[]});
export function musicReady(s:EpisodeState) {const pegs=s.values.pegs;if(!Array.isArray(pegs)||!pegs.every(x=>typeof x==='number'))return false;const expected=MUSIC_ROLL.flatMap((bird,beat)=>bird<0?[]:[bird*6+beat]);return pegs.length===expected.length&&new Set(pegs).size===pegs.length&&pegs.every(p=>expected.includes(p as number));}
export function musicNormalize(s:EpisodeState):EpisodeState {const bars=signalPermutation(s.values.bars,[2,0,1]);const roll=typeof s.values.roll==='number'&&Number.isInteger(s.values.roll)&&s.values.roll>=0&&s.values.roll<6?s.values.roll:2;const pegs=Array.isArray(s.values.pegs)?[...new Set(s.values.pegs.filter((x):x is number=>typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<18))].sort((a,b)=>a-b):[];const clean:EpisodeState={...s,values:{bars,roll,pegs,played:s.values.played===true,muted:s.values.muted===true},solved:[],inventory:[]};clean.solved=[...(bars.every((b,i)=>b===i)?['chimes']:[]),...(roll===0?['roll']:[]),...(clean.values.played&&musicReady(clean)?['melody']:[])];clean.inventory=clean.solved.includes('melody')?['灯塔旋律']:[];return clean;}
