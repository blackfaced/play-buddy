import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useStore } from '../store/useStore';
import EscapeRoom from './EscapeRoom';
import Adventure from './adventure/Adventure';
import Chapter from './chapter/Chapter';
import { SAVE_KEY, parseSave } from './logic';
import { ADVENTURE_KEY, parseAdventure } from './adventure/logic';
import { CHAPTER, CHAPTER_KEY } from './chapter/content';
import { parseChapter } from './chapter/engine';
import { SCENES_KEY, SCENE_IDS, completeScene, sceneProgress, sceneUnlocked, hasChapterRecord, isFutureSceneProgress, type SceneId } from './scenes';
import { CAMPAIGN_EPISODES } from './campaign/registry';
import CampaignEpisode from './campaign/CampaignEpisode';
import { episodeKey, parseEpisode } from './campaign/engine';
import './scene-select.css';

function read(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function loadProgress() {
  return sceneProgress(read(SCENES_KEY), read(SAVE_KEY), read(ADVENTURE_KEY), read(CHAPTER_KEY), CAMPAIGN_EPISODES.map(episode => {
    const saved = parseEpisode(episode, read(episodeKey(episode.id)));
    return { id: episode.id, started: saved.status === 'valid' || saved.status === 'future', complete: saved.status === 'valid' && episode.isComplete(saved.state) };
  }));
}
const episodes = [
  { id: 'cabin', title: '航海员的钥匙', place: '星光号 · 船舱', description: '一封邀请留在桌上。转过船舱的四面，找出通向海风的钥匙。', motif: 'key' },
  { id: 'expedition', title: '海风里的星光', place: '导航室 · 储物舱 · 观星甲板', description: '翻找旧船具，唤醒投影仪，让沉睡的栈桥再次转动。', motif: 'star' },
  { id: 'foglight', title: '雾灯工坊', place: '陈列舱 · 光学室 · 工坊', description: '循着有色镜片里的秘密，把归航的灯重新点亮。', motif: 'lamp' },
  ...CAMPAIGN_EPISODES,
] as const;
function Cover({ motif, id }: { motif: string; id: string }) {
  const icons = {
    clockwork: <g><circle cx="200" cy="107" r="61" /><circle cx="200" cy="107" r="46" /><path d="M200 71V107L228 123M200 46V60M200 154V169M139 107H154M246 107H261" /></g>,
    shadow: <g><path d="M109 168 145 72 181 168ZM193 168 226 94 259 168ZM273 168 293 118 313 168" /><path d="M69 170H331M84 64 318 148" strokeDasharray="7 6" /><circle cx="84" cy="64" r="13" /></g>,
    greenhouse: <g><path d="M105 174V80L200 36 295 80V174ZM105 80H295M153 59V174M247 59V174M105 125H295" /><path d="M201 172V116Q164 115 169 89Q200 87 201 116Q208 89 233 98Q235 119 201 129" /></g>,
    radio: <g><rect x="108" y="81" width="184" height="94" rx="10" /><path d="M130 81 175 37M128 107H272M128 123H209M128 137H209M128 151H209" /><circle cx="252" cy="145" r="17" /><path d="M225 48Q248 58 242 80M245 32Q275 48 266 79" /></g>,
    music: <g><path d="M108 64H292M127 65V126M165 65V154M203 65V107M241 65V140M279 65V93M117 127H137M155 155H175M193 108H213M231 141H251M269 94H289M115 179H290" /><rect x="174" y="164" width="55" height="26" /></g>,
    cargo: <g><path d="M81 130H319L286 170H114ZM200 63V130M138 79H262M151 80 130 115H172ZM249 80 228 115H270Z" /><rect x="158" y="104" width="31" height="26" /><rect x="207" y="98" width="34" height="32" /></g>,
    observatory: <g><path d="M128 174V105A72 72 0 0 1 272 105V174ZM113 175H287M128 105H272M200 34V105M158 47 200 105 245 48" /><path d="m232 68 7 14 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2Z" fill="#e8cf8d" /><path d="M181 170 197 136 228 119 235 132 205 148 221 170" /></g>,
  };
  const icon = icons[id as keyof typeof icons];
  if (icon) return <svg viewBox="0 0 400 220" aria-hidden="true" focusable="false"><rect width="400" height="220" fill="#213f48" /><circle cx="313" cy="48" r="24" fill="#d4be89" opacity=".3" /><path d="M0 192Q120 172 210 193T400 185V220H0Z" fill="#112e35" /><g stroke="#e0c58c" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round">{icon}</g><rect x="14" y="14" width="372" height="192" rx="2" fill="none" stroke="#f2dbad" opacity=".25" /></svg>;
  return <svg viewBox="0 0 400 220" aria-hidden="true" focusable="false">
    <rect width="400" height="220" fill={motif === 'key' ? '#354846' : motif === 'star' ? '#20394b' : '#3c3949'} />
    <circle cx="310" cy="55" r="30" fill="#f5dca0" opacity=".65" />
    <path d="M0 181Q70 158 142 183T285 177T420 178V220H0Z" fill="#122e38" />
    <path d="M0 200Q70 177 142 202T285 196T420 197" fill="none" stroke="#a6c1be" opacity=".25" />
    {motif === 'key' ? <g stroke="#e3b777" strokeWidth="10" fill="none" transform="rotate(-30 190 110)"><circle cx="151" cy="108" r="29" /><path d="M180 108H254M225 108V129M249 108V129" /><path d="M74 158H319" stroke="#caa982" strokeWidth="4" /></g> : motif === 'star' ? <g stroke="#e5cc8b" fill="none"><path d="m199 46 15 46 49 1-39 29 14 47-39-28-40 28 15-47-39-29 49-1Z" strokeWidth="3" /><path d="M70 174V114M70 128H132M290 175V114M290 128H345" stroke="#a3aaa0" strokeWidth="5" /><path d="M72 128Q191 210 289 128" strokeWidth="2" /></g> : <g><path d="M195 75 65 119V149L195 119ZM215 75 345 119V149L215 119Z" fill="#edc67b" opacity=".2" /><path d="M174 171 184 94H224L235 171Z" fill="#869b99" /><path d="M180 96V68H228V96Z" fill="#f0d48f" /><path d="m173 68 31-24 31 24Z" fill="#b9896a" /><path d="M204 69V94M183 82H227" stroke="#465552" strokeWidth="4" /><path d="M163 175H244" stroke="#cabca1" strokeWidth="7" /></g>}
    <rect x="14" y="14" width="372" height="192" rx="2" fill="none" stroke="#f2dbad" opacity=".25" />
  </svg>;
}
export default function SceneSelect() {
  const lock = useStore(s => s.lock);
  const [params, setParams] = useSearchParams();
  const [progress, setProgress] = useState(loadProgress);
  const [protectedMenu] = useState(() => isFutureSceneProgress(read(SCENES_KEY)));
  const [saveWarning, setSaveWarning] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.title; document.title = '密室逃脱 · 十幕航行 · Play Buddy';
    return () => { document.title = previous; };
  }, []);
  const record = useCallback((id: SceneId) => setProgress(current => completeScene(current, id)), []);
  const cabinComplete = useCallback(() => record('cabin'), [record]);
  const expeditionComplete = useCallback(() => record('expedition'), [record]);
  const foglightComplete = useCallback(() => record('foglight'), [record]);
  useEffect(() => { if (protectedMenu) return; try { localStorage.setItem(SCENES_KEY, JSON.stringify(progress)); } catch { queueMicrotask(() => setSaveWarning(true)); } }, [progress, protectedMenu]);
  const returnToScenes = () => { setParams({}); };
  const enter = (id: SceneId) => { if (lock === null && sceneUnlocked(progress, id)) setParams({ scene: id }); };
  const requested = params.get('scene');
  const campaignComplete = useCallback(() => { if (requested && SCENE_IDS.includes(requested as SceneId)) record(requested as SceneId); }, [record, requested]);
  const active = SCENE_IDS.find(id => id === requested && sceneUnlocked(progress, id));
  if (active === 'cabin') return <EscapeRoom onSceneSelect={returnToScenes} onComplete={cabinComplete} renderCompletion={<button className="escape-primary" onClick={returnToScenes}>本场景已完成 · 选择下一场景 →</button>} />;
  if (active === 'expedition') return <Adventure standalone onSceneSelect={returnToScenes} onNextScene={returnToScenes} onComplete={expeditionComplete} />;
  if (active === 'foglight') return <Chapter onBack={returnToScenes} backLabel="← 场景选择" onComplete={foglightComplete} />;
  const campaign = CAMPAIGN_EPISODES.find(episode => episode.id === active);
  if (campaign) return <CampaignEpisode key={campaign.id} episode={campaign} onBack={returnToScenes} onComplete={campaignComplete} />;
  const cabin = parseSave(read(SAVE_KEY)), adventure = parseAdventure(read(ADVENTURE_KEY));
  const chapter = parseChapter(CHAPTER, read(CHAPTER_KEY));
  const newStarted = Object.fromEntries(CAMPAIGN_EPISODES.map(episode => [episode.id, read(episodeKey(episode.id)) !== null]));
  const started: Partial<Record<SceneId, boolean>> = { ...newStarted, cabin: !!read(SAVE_KEY), expedition: adventure.started, foglight: hasChapterRecord(read(CHAPTER_KEY)) };
  const recommended = SCENE_IDS.find(id => sceneUnlocked(progress, id) && !progress.completed.includes(id));
  // A completed episode being explicitly replayed remains selectable, with its current save intact.
  const replaying: Partial<Record<SceneId, boolean>> = { ...Object.fromEntries(CAMPAIGN_EPISODES.map(episode => [episode.id, newStarted[episode.id] && !episode.isComplete(parseEpisode(episode, read(episodeKey(episode.id))).state)])), cabin: started.cabin && !cabin.escaped, expedition: adventure.started && !adventure.complete, foglight: chapter.started && !chapter.complete };
  return <main className="scene-library" inert={lock !== null}>
    <header className="scene-library-top"><Link to="/">← 游戏大厅</Link><span>THE STARLIGHT · 航行故事集</span></header>
    <section className="scene-library-heading"><p>一次出发，一个新的秘密</p><h1>选择你的下一幕</h1><div>按顺序解锁新的故事。完成的场景可以随时回来看看。</div></section>
    {requested && <p className="scene-library-notice" role="status">这个场景暂未解锁，请先完成前一幕。</p>}
    <div className="scene-library-grid">
      {episodes.map((episode, index) => {
        const unlocked = sceneUnlocked(progress, episode.id), completed = progress.completed.includes(episode.id);
        const current = recommended === episode.id;
        return <article className={`scene-card${current ? ' current' : ''}${!unlocked ? ' locked' : ''}`} key={episode.id}>
          <div className="scene-card-cover"><Cover motif={episode.motif} id={episode.id} /><span>第 {String(index + 1).padStart(2, '0')} 幕</span></div>
          <div className="scene-card-body"><div className="scene-card-status">{completed ? '✓ 已完成 · 可重访' : !unlocked ? '尚未解锁' : started[episode.id] ? '正在探索' : '已解锁 · 新的旅程'}</div>
            <h2>{episode.title}</h2><small>{episode.place}</small><p>{episode.description}</p>
            <button disabled={!unlocked} onClick={() => enter(episode.id)} aria-label={`${unlocked ? '进入' : '未解锁'}${episode.title}`}>
              {!unlocked ? `完成第 ${index} 幕后解锁` : completed ? replaying[episode.id] ? '继续这次重玩 →' : '重访场景 →' : started[episode.id] ? '继续探索 →' : '开始探索 →'}
            </button>
          </div>
        </article>;
      })}
    </div>
    <p className="scene-library-footnote">每一幕单独保存。返回选择、切换场景都不会清空道具和解谜进度。</p>
    {protectedMenu && <p className="scene-library-notice" role="status">场景目录来自更新版本；本次浏览不会覆盖原目录。请更新游戏以恢复完整记录。</p>}
    {saveWarning && <p className="scene-library-notice" role="status">浏览器无法保存，请保持此页打开；关闭后本次进度可能丢失。</p>}
  </main>;
}
