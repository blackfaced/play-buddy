import type { EpisodeDefinition, EpisodeState, EpisodeValue } from './types';
export const episodeKey = (id: string) => `play-buddy:escape:episode:${id}:v1`;
type Definition = Pick<EpisodeDefinition, 'id' | 'initial' | 'normalize' | 'isComplete'>;
export type EpisodeLoad = { state: EpisodeState; status: 'fresh' | 'valid' | 'invalid' | 'future' };
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 200 && v.every(x => typeof x === 'string' && x.length <= 200);
const value = (v: unknown): v is EpisodeValue => typeof v === 'boolean' || typeof v === 'string' && v.length <= 1000 || typeof v === 'number' && Number.isFinite(v) || Array.isArray(v) && v.length <= 200 && (v.every(x => typeof x === 'number' && Number.isFinite(x)) || strings(v));
function validState(s: unknown): s is EpisodeState {
  if (!s || typeof s !== 'object') return false;
  const x = s as EpisodeState;
  return !!x.values && typeof x.values === 'object' && !Array.isArray(x.values) && Object.keys(x.values).length <= 200 && Object.values(x.values).every(value) && strings(x.solved) && strings(x.inventory) && strings(x.inspected);
}
export function parseEpisode(def: Definition, raw: string | null): EpisodeLoad {
  const fallback = def.initial();
  if (raw === null) return {state:fallback,status:'fresh'};
  try {
    const save = JSON.parse(raw);
    if (save && typeof save.version === 'number' && save.version > 1) return {state:fallback,status:'future'};
    if (save?.version !== 1 || save.episode !== def.id || !validState(save.state)) return {state:fallback,status:'invalid'};
    const normalized = def.normalize(save.state);
    return validState(normalized) ? {state:normalized,status:'valid'} : {state:fallback,status:'invalid'};
  } catch { return {state:fallback,status:'invalid'}; }
}
export function serializeEpisode(def: Definition, state: EpisodeState): string {
  return JSON.stringify({version:1,episode:def.id,state:def.normalize(state)});
}
export function updateEpisode(def: Definition, state: EpisodeState, patch: Partial<EpisodeState>): EpisodeState {
  const next = {...state,...patch,values:{...state.values,...patch.values}};
  return validState(next) ? def.normalize(next) : state;
}
