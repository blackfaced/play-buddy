import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '../../store/useStore';
import { guidancePolicy, MODE_KEY, parseMode, type GuidanceMode } from '../guidancePolicy';
import { episodeKey, parseEpisode, serializeEpisode, updateEpisode } from './engine';
import type { EpisodeDefinition, EpisodeState, EpisodeProps } from './types';
import { DetailModal } from './components';
import './campaign.css';
function read(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
export default function CampaignEpisode({ episode, onBack, onComplete }: { episode: EpisodeDefinition; onBack: () => void; onComplete: () => void }) {
  const lock = useStore(s => s.lock);
  const [loaded] = useState(() => parseEpisode(episode, read(episodeKey(episode.id))));
  const [state, setState] = useState(loaded.state);
  const stateRef = useRef(state);
  const [history, setHistory] = useState<EpisodeState[]>([]);
  const [generation, setGeneration] = useState(0);
  const epochRef = useRef(0);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const lockRef = useRef(lock);
  useEffect(() => {
    lockRef.current = lock;
    if (lock !== null) {
      epochRef.current += 1;
      queueMicrotask(() => { if (mountedRef.current) setGeneration(epochRef.current); });
    }
  }, [lock]);
  const [mode, setMode] = useState<GuidanceMode>(() => parseMode(read(MODE_KEY)));
  const [detail, setDetail] = useState<{title:string;content:ReactNode | ((props: EpisodeProps) => ReactNode)} | null>(null);
  const [hints, setHints] = useState(-1);
  const [replay, setReplay] = useState(false);
  const [message, setMessage] = useState('');
  const [warning, setWarning] = useState(false);
  const protectedSave = loaded.status === 'future';
  const completed = episode.isComplete(state);
  const save = useCallback((next: EpisodeState) => {
    if (protectedSave) return;
    try { localStorage.setItem(episodeKey(episode.id), serializeEpisode(episode, next)); } catch { setWarning(true); }
  }, [episode, protectedSave]);
  const update = useCallback((patch: Partial<EpisodeState>) => {
    if (!mountedRef.current || lockRef.current !== null || protectedSave || generation !== epochRef.current) return;
    const previous = stateRef.current;
    const next = updateEpisode(episode, previous, patch);
    if (JSON.stringify(next) === JSON.stringify(previous)) return;
    setHistory(items => [...items.slice(-39), previous]);
    stateRef.current = next; setState(next); save(next);
  }, [episode, generation, protectedSave, save]);
  useEffect(() => { if (completed && !protectedSave) onComplete(); }, [completed, onComplete, protectedSave]);
  const complete = () => {
    if (!mountedRef.current || lockRef.current !== null || protectedSave || generation !== epochRef.current) return;
    if (episode.isComplete(stateRef.current)) { onComplete(); setMessage('出口已开启，这一幕的通行记录已保存。'); }
    else setMessage('机关还没有形成完整的通路。再看看房间里留下的线索。');
  };
  const changeMode = (next: GuidanceMode) => {
    if (lock !== null) return;
    setMode(next); setHints(-1);
    try { localStorage.setItem(MODE_KEY, next); } catch { setWarning(true); }
  };
  const goBack = () => { if (lock === null) onBack(); };
  const Content = episode.Component;
  const DetailContent = typeof detail?.content === 'function' ? detail.content : null;
  const episodeProps: EpisodeProps = { state, update, complete, announce: setMessage, mode,
    openDetail: (title, content) => { if (lock === null) setDetail({title, content}); },
    closeDetail: () => setDetail(null),
  };
  return <main className={`campaign campaign-${episode.id} campaign-mode-${mode}`} inert={lock !== null}>
    <header className="campaign-top"><button onClick={goBack}>← 场景选择</button><span>THE STARLIGHT · 十幕航行</span><button onClick={() => { if (lock === null) setReplay(true); }} disabled={protectedSave}>重新探索</button></header>
    <div className="campaign-heading"><div><p>{episode.place}</p><h1>{episode.title}</h1></div><label>探索模式 <select value={mode} onChange={e => changeMode(e.target.value as GuidanceMode)}><option value="easy">简单</option><option value="standard">标准</option><option value="challenge">挑战</option></select></label></div>
    {protectedSave ? <section className="campaign-protected" role="status"><h2>这份进度来自更新版本</h2><p>为保护已保存的探索，本版本不会覆盖它。请更新游戏后继续。</p><button onClick={goBack}>返回场景选择</button></section> : <>
      {lock === null ? <Content key={generation} {...episodeProps} /> : <p role="status">休息一下，探索进度已保留。</p>}
      <aside className="campaign-inventory" aria-label="随身物品"><span>随身物品</span>{state.inventory.length ? state.inventory.map(item => <span className="campaign-item" key={item}>{item}</span>) : <small>暂时没有带走的物件</small>}</aside>
      <footer className="campaign-tools"><button disabled={!history.length} onClick={() => { if (lock !== null) return; const previous = history[history.length - 1]; if (!previous) return; stateRef.current = previous; setState(previous); epochRef.current += 1; setGeneration(epochRef.current); setDetail(null); setHistory(items => items.slice(0,-1)); save(previous); setMessage('已撤回刚才的操作。已获得的场景通行记录保留。'); }}>撤回一步</button>{guidancePolicy(mode).hints && <button onClick={() => { if (lock === null) setHints(0); }}>需要一点提示</button>}<span>所有机关都可用点击或键盘操作 · 自动保存</span></footer>
      {completed && <section className="campaign-success" role="status"><h2>这条航路已经打开</h2><p>你可以继续留在房间看看，也可以开始下一幕。</p><button onClick={goBack}>本场景已完成 · 选择下一场景 →</button></section>}
    </>}
    <p className="campaign-status" aria-live="polite">{message}</p>
    {warning && <p role="alert">浏览器无法保存，请保持此页打开；关闭后本次进度可能丢失。</p>}
    {loaded.status === 'invalid' && <p role="status">旧记录无法读取。原记录保留到你开始操作为止。</p>}
    {lock === null && detail && <DetailModal title={detail.title} onClose={() => setDetail(null)}>{DetailContent ? <DetailContent {...episodeProps} /> : typeof detail.content === 'function' ? null : detail.content}</DetailModal>}
    {lock === null && hints >= 0 && guidancePolicy(mode).hints && <DetailModal title="航行提示" onClose={() => setHints(-1)}><p>先给方向，再解释规律。最后一步会明确揭晓答案。</p>{episode.hints(state).slice(0, hints + 1).map((line, index) => <p key={index}>{index + 1}. {line}</p>)}<button disabled={hints >= 2} onClick={() => setHints(x => x + 1)}>{hints === 0 ? '解释规律' : hints === 1 ? '揭晓答案（含完整解法）' : '已显示答案'}</button></DetailModal>}
    {lock === null && replay && <DetailModal title="重新探索这一幕？" onClose={() => setReplay(false)}><p>只清空这一幕的机关和物品。已经解锁的后续场景仍然保留。</p><button onClick={() => { if (lock !== null || protectedSave) return; const fresh = episode.initial(); stateRef.current = fresh; setState(fresh); epochRef.current += 1; setGeneration(epochRef.current); setHistory([]); save(fresh); setReplay(false); setDetail(null); setMessage('这一幕已重新开始。'); }}>确认重新探索这一幕</button><button onClick={() => setReplay(false)}>保留进度</button></DetailModal>}
  </main>;
}
