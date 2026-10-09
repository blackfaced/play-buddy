import { parseSave } from './logic';
import { parseAdventure } from './adventure/logic';
import { CHAPTER } from './chapter/content';
import { parseChapter, isFutureChapterSave } from './chapter/engine';

export const SCENES_KEY = 'play-buddy:escape:scenes:v1';
export const SCENE_IDS = ['cabin', 'expedition', 'foglight', 'clockwork', 'shadow', 'greenhouse', 'radio', 'music', 'cargo', 'observatory'] as const;
export type SceneId = typeof SCENE_IDS[number];
export interface SceneProgress { version: 1; completed: SceneId[]; unlocked?: SceneId[] }
export function completeScene(progress: SceneProgress, scene: SceneId): SceneProgress {
  if (progress.completed.includes(scene)) return progress;
  return { ...progress, version: 1, completed: SCENE_IDS.filter(id => id === scene || progress.completed.includes(id)) };
}
/** Migrate using the existing validated parsers. Never rewrite an episode save. */
export function sceneProgress(raw: string | null, cabinRaw: string | null, adventureRaw: string | null, chapterRaw: string | null, episodes: readonly {id: SceneId; started: boolean; complete: boolean}[] = []): SceneProgress {
  let completed: SceneId[] = [];
  let unlocked: SceneId[] = [];
  try {
    const saved = JSON.parse(raw ?? 'null');
    if (saved?.version === 1 && Array.isArray(saved.completed)) { completed = SCENE_IDS.filter(id => saved.completed.includes(id)); if (Array.isArray(saved.unlocked)) unlocked = SCENE_IDS.filter(id => saved.unlocked.includes(id)); }
  } catch { /* Old or absent menu record: episode saves remain authoritative. */ }
  let result: SceneProgress = { version: 1, completed };
  const cabin = parseSave(cabinRaw), adventure = parseAdventure(adventureRaw);
  const chapter = parseChapter(CHAPTER, chapterRaw);
  // Later valid progress proves these episodes had already been unlocked in the old flow.
  if (cabin.escaped || adventure.started || chapter.started) result = completeScene(result, 'cabin');
  if (adventure.complete || chapter.started) result = completeScene(result, 'expedition');
  if (chapter.complete) result = completeScene(result, 'foglight');
  for (const episode of episodes) {
    if (episode.started && !unlocked.includes(episode.id)) unlocked.push(episode.id);
    if (episode.complete) result = completeScene(result, episode.id);
  }
  if (unlocked.length) result.unlocked = SCENE_IDS.filter(id => unlocked.includes(id));
  return result;
}
export function sceneUnlocked(progress: SceneProgress, scene: SceneId): boolean {
  const index = SCENE_IDS.indexOf(scene);
  return index === 0 || [...progress.completed, ...(progress.unlocked ?? [])].some(id => SCENE_IDS.indexOf(id) >= index) || progress.completed.includes(SCENE_IDS[index - 1]);
}
export function hasChapterRecord(raw: string | null): boolean {
  return parseChapter(CHAPTER, raw).started || isFutureChapterSave(CHAPTER, raw);
}

export function isFutureSceneProgress(raw: string | null): boolean {
  try { const saved = JSON.parse(raw ?? 'null'); return typeof saved?.version === 'number' && saved.version > 1; } catch { return false; }
}
