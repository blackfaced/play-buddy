import { parseSave } from './logic';
import { parseAdventure } from './adventure/logic';
import { CHAPTER } from './chapter/content';
import { parseChapter, isFutureChapterSave } from './chapter/engine';

export const SCENES_KEY = 'play-buddy:escape:scenes:v1';
export const SCENE_IDS = ['cabin', 'expedition', 'foglight'] as const;
export type SceneId = typeof SCENE_IDS[number];
export interface SceneProgress { version: 1; completed: SceneId[] }
export function completeScene(progress: SceneProgress, scene: SceneId): SceneProgress {
  if (progress.completed.includes(scene)) return progress;
  return { version: 1, completed: SCENE_IDS.filter(id => id === scene || progress.completed.includes(id)) };
}
/** Migrate using the existing validated parsers. Never rewrite an episode save. */
export function sceneProgress(raw: string | null, cabinRaw: string | null, adventureRaw: string | null, chapterRaw: string | null): SceneProgress {
  let completed: SceneId[] = [];
  try {
    const saved = JSON.parse(raw ?? 'null');
    if (saved?.version === 1 && Array.isArray(saved.completed)) completed = SCENE_IDS.filter(id => saved.completed.includes(id));
  } catch { /* Old or absent menu record: episode saves remain authoritative. */ }
  let result: SceneProgress = { version: 1, completed };
  const cabin = parseSave(cabinRaw), adventure = parseAdventure(adventureRaw);
  const chapter = parseChapter(CHAPTER, chapterRaw);
  // Later valid progress proves these episodes had already been unlocked in the old flow.
  if (cabin.escaped || adventure.started || chapter.started) result = completeScene(result, 'cabin');
  if (adventure.complete || chapter.started) result = completeScene(result, 'expedition');
  if (chapter.complete) result = completeScene(result, 'foglight');
  return result;
}
export function sceneUnlocked(progress: SceneProgress, scene: SceneId): boolean {
  return scene === 'cabin' || progress.completed.includes(scene) || progress.completed.includes(SCENE_IDS[SCENE_IDS.indexOf(scene) - 1]);
}
export function hasChapterRecord(raw: string | null): boolean {
  return parseChapter(CHAPTER, raw).started || isFutureChapterSave(CHAPTER, raw);
}
