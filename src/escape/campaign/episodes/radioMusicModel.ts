import type { EpisodeState } from '../types';
export const radioExplorationDefaults={exploration:1,coverOpen:false,fuseFound:false,fuseInstalled:false,crankFound:false,crankInstalled:false,wiringOpen:false,signalsHeard:false};
export const musicExplorationDefaults={exploration:1,seatOpen:false,paperFound:false,paperInstalled:false,curtainOpen:false,handleFound:false,handleInstalled:false};
export function explorationValues(values:EpisodeState['values'],kind:'radio'|'music') {
 const defaults=kind==='radio'?radioExplorationDefaults:musicExplorationDefaults;
 const legacy=values.exploration!==1;
 return Object.fromEntries(Object.entries(defaults).map(([key,value])=>[key,key==='exploration'?1:legacy?true:typeof value==='boolean'?values[key]===true:value]));
}
