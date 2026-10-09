import type { EpisodeState } from '../types';
export const RADIO_BASE = [0,1,1,0,-1,0,-1,0] as const;
export const RADIO_TARGETS = [[-1,0,0,1,1,0,-1,0],[1,0,-1,0,-1,0,0,1],[-1,0,-1,0,0,1,1,0]] as const;
export const RADIO_STATIONS = ['贝壳','海浪','星星'] as const;
export const RADIO_DESTINATIONS = ['灯塔','帆船','海鸥'] as const;
export const RADIO_ENDS = [[0,2],[1,0],[2,1]] as const;
export const RADIO_SOCKET_ENDS = [1,2,0] as const;
export const radioWave = (phase: number) => RADIO_BASE.map((_,i)=>RADIO_BASE[(i-phase*2+8)%8]);
export const radioInitial = (): EpisodeState => ({values:{phases:[0,0,0],wires:[0,1,2],plugs:[0,1,2],transmitted:false},solved:[],inventory:[],inspected:[]});
export function signalArray(value: unknown, length: number, max: number, fallback: number[]): number[] {return Array.isArray(value)&&value.length===length&&value.every(x=>Number.isInteger(x)&&x>=0&&x<max)?[...value]:[...fallback];}
export function signalPermutation(value: unknown, fallback: number[]): number[] { const p=signalArray(value,fallback.length,fallback.length,fallback);return new Set(p).size===fallback.length?p:[...fallback]; }
export const radioTuned = (s: EpisodeState) => signalArray(s.values.phases,3,4,[0,0,0]).every((phase,i)=>radioWave(phase).every((n,j)=>n===RADIO_TARGETS[i][j]));
export const radioWired = (s: EpisodeState) => {const wires=signalArray(s.values.wires,3,3,[0,1,2]);return new Set(wires).size===3&&wires.every((w,i)=>RADIO_ENDS[w][1]===RADIO_SOCKET_ENDS[i]);};
export function radioReady(s: EpisodeState) {const plugs=signalArray(s.values.plugs,3,3,[0,1,2]);const wires=signalArray(s.values.wires,3,3,[0,1,2]);return radioTuned(s)&&radioWired(s)&&plugs.every((p,i)=>p===wires[i]);}
export function radioNormalize(s: EpisodeState): EpisodeState {const initial=radioInitial();const values={phases:signalArray(s.values.phases,3,4,initial.values.phases as number[]),wires:signalPermutation(s.values.wires,[0,1,2]),plugs:signalPermutation(s.values.plugs,[0,1,2]),transmitted:s.values.transmitted===true};const clean={...s,values,solved:[],inventory:[]} as EpisodeState;clean.solved=[...(radioTuned(clean)?['carrier']:[]),...(radioWired(clean)?['continuity']:[]),...(values.transmitted&&radioReady(clean)?['broadcast']:[])];clean.inventory=clean.solved.includes('broadcast')?['海港回信']:[];return clean;}
export function swapSignal(values: number[], selected: number, destination: number) {const next=[...values],previous=next.indexOf(selected);if(previous>=0)[next[previous],next[destination]]=[next[destination],next[previous]];return next;}
