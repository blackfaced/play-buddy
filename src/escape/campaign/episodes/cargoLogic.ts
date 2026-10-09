export const CRATES = [{name:'贝壳箱',symbol:'◔',mass:1},{name:'树叶箱',symbol:'❧',mass:2},{name:'星星箱',symbol:'☆',mass:3},{name:'小鱼箱',symbol:'⋊',mass:4}] as const;
export const ARMS = [-3,-1,1,3] as const;
export const PLATE_BASE_ANGLES = [180,270,90] as const;
export function cargoTorque(slots: readonly number[]): number { return slots.reduce((sum,id,i)=>sum+(CRATES[id]?.mass??0)*(ARMS[i]??0),0); }
export function cargoReady(slots: readonly number[]): boolean { return slots.length===4&&new Set(slots).size===4&&slots.every(id=>Number.isInteger(id)&&id>=0&&id<4)&&cargoTorque(slots)===0&&slots[3]===2; }
export function plateJoined(rotations: readonly number[]): boolean {return rotations.length===3&&rotations.every((r,i)=>Number.isInteger(r)&&r>=0&&r<4&&(r*90+PLATE_BASE_ANGLES[i])%360===0);}
export function boundedArray(value:unknown,length:number,min:number,max:number,fallback:readonly number[]):number[]{return Array.isArray(value)&&value.length===length&&value.every(v=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max)?[...value]:[...fallback];}
export function uniqueSlots(value:unknown):number[]{const slots=boundedArray(value,4,-1,3,[-1,-1,-1,-1]);return new Set(slots.filter(x=>x>=0)).size===slots.filter(x=>x>=0).length?slots:[-1,-1,-1,-1];}
export function putCrate(slots:readonly number[],crate:number,slot:number):number[]{if(slots.length!==4||!Number.isInteger(crate)||crate<0||crate>=CRATES.length||!Number.isInteger(slot)||slot<0||slot>=4)return [...slots];const next=[...slots];const old=next.indexOf(crate);if(old>=0)next[old]=next[slot];next[slot]=crate;return next;}
