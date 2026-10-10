import type { EpisodeState } from '../types';
export const integer = (v: unknown, max: number, fallback=0) => typeof v === 'number' && Number.isInteger(v) && v>=0 && v<max ? v : fallback;
export const permutation = (v: unknown, options:number[], fallback:number[]) => Array.isArray(v) && v.length===options.length && new Set(v).size===v.length && v.every(n=>options.includes(n)) ? v as number[] : [...fallback];
export const rotations = (v:unknown,n:number,mod:number) => Array.isArray(v)&&v.length===n ? v.map(x=>integer(x,mod)) : Array(n).fill(0) as number[];
export const fresh = (values:EpisodeState['values']):EpisodeState=>({values,solved:[],inventory:[],inspected:[]});
export function swapAt<T>(a:T[],from:number,to:number):T[]{const b=[...a];[b[from],b[to]]=[b[to],b[from]];return b;}
