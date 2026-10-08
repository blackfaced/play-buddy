import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useStore } from "../../store/useStore";
import { MODE_KEY, parseMode, type GuidanceMode } from "../guidancePolicy";
import { CHAPTER, CHAPTER_KEY } from "./content";
import {
  isFutureChapterSave,
  parseChapter,
  puzzleAvailable,
  reduceChapter,
  requirementsMet,
  serializeChapter,
} from "./engine";
import {
  SceneArt,
  SearchBackdrop,
  SCENE_HOTSPOTS,
  SEARCH_HOTSPOTS,
} from "./SceneArt";
import type { ChapterAction, ChapterState } from "./types";
import PuzzleView from "./PuzzleView";
import "./chapter.css";

function readSaved(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function Closeup({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="chapter-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header>
        <span className="chapter-eyebrow">
          THE FOGLIGHT WORKSHOP · 航海员手记
        </span>
        <button autoFocus onClick={onClose} aria-label="关闭近景">
          ×
        </button>
      </header>
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>
  );
}

interface Hotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
function Point({
  point,
  mode,
  onClick,
}: {
  point: Hotspot;
  mode: GuidanceMode;
  onClick: () => void;
}) {
  return (
    <button
      className={`chapter-point${mode === "challenge" ? " unmarked" : ""}${mode === "easy" ? " easy" : ""}`}
      style={{
        left: `${point.x}%`,
        top: `${point.y}%`,
        width: `${point.width}%`,
        height: `${point.height}%`,
      }}
      aria-label={`检查${point.label}`}
      onClick={onClick}
    >
      <span>{point.label}</span>
      {mode !== "challenge" && <i aria-hidden="true">＋</i>}
    </button>
  );
}

export default function Chapter({
  onBack,
  mode: controlledMode,
  onModeChange,
}: {
  onBack?: () => void;
  mode?: GuidanceMode;
  onModeChange?: (mode: GuidanceMode) => void;
}) {
  const lock = useStore((s) => s.lock);
  const [futureSave, setFutureSave] = useState(() =>
    isFutureChapterSave(CHAPTER, readSaved(CHAPTER_KEY)),
  );
  const [state, setState] = useState<ChapterState>(() =>
    parseChapter(CHAPTER, readSaved(CHAPTER_KEY)),
  );
  const [localMode, setMode] = useState<GuidanceMode>(() =>
    parseMode(readSaved(MODE_KEY)),
  );
  const mode = controlledMode ?? localMode;
  const [detail, setDetail] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [revisiting, setRevisiting] = useState(false);
  useEffect(() => {
    if (futureSave) return;
    try {
      localStorage.setItem(CHAPTER_KEY, serializeChapter(CHAPTER, state));
    } catch {
      /* Play can continue without storage. */
    }
  }, [state, futureSave]);
  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* Keep current-session assistance. */
    }
  }, [mode]);
  const scene = CHAPTER.scenes.find((s) => s.id === state.scene)!;
  const puzzle = CHAPTER.puzzles.find((p) => p.id === detail);
  const selectedItem =
    selected && state.found.includes(selected) ? selected : null;
  const inventory = CHAPTER.items.filter((item) =>
    state.found.includes(item.id),
  );
  const tools = CHAPTER.tools.filter(
    (tool) => tool.scene === state.scene && !state.usedTools.includes(tool.id),
  );
  const points = SCENE_HOTSPOTS[state.scene] ?? [];
  function act(action: ChapterAction) {
    if (lock !== null || (futureSave && action.type !== "resetChapter")) return;
    const next = reduceChapter(CHAPTER, state, action);
    setState(next);
    if (action.type === "confirm") {
      const definition = CHAPTER.puzzles.find((p) => p.id === action.id)!;
      setMessage(
        next.puzzles[action.id].solved
          ? definition.success
          : "机关还没有连通，再看看线索吧。",
      );
      if (next.complete && !state.complete) {
        setDetail(null);
        setRevisiting(false);
      }
    } else if (action.type === "use") {
      setMessage(
        next === state
          ? "这个位置暂时没有变化。道具还在你的工具袋里。"
          : "机关轻轻动了一下。物件的去向也记进了手记。",
      );
    } else if (action.type === "collect") {
      setMessage(
        next === state
          ? "这里暂时还够不到。"
          : `收好了：${CHAPTER.items.find((item) => item.id === action.item)?.name}。`,
      );
    } else if (action.type === "reveal") {
      setMessage(
        next === state
          ? "这里暂时没有变化。"
          : "挪开后，原来遮住的位置露出来了。",
      );
    } else if (action.type === "travel") {
      setDetail(null);
      setMessage("");
    } else if (action.type === "resetChapter") {
      setFutureSave(false);
      setDetail(null);
      setSelected(null);
      setMessage("工具和机关已经归位。再听听船舱里的故事吧。");
      setRevisiting(false);
    } else if (action.type !== "hint") setMessage("");
  }
  function open(id: string) {
    setDetail(id);
    setMessage("");
  }
  function toolControls() {
    return (
      tools.length > 0 && (
        <section className="chapter-tool-targets" aria-label="使用道具的位置">
          <h3>近处的装置</h3>
          {tools.map((tool) => (
            <div key={tool.id}>
              <span>{tool.label}</span>
              <button
                disabled={
                  !selectedItem || !requirementsMet(state, tool.requires)
                }
                onClick={() => {
                  if (selectedItem)
                    act({ type: "use", id: tool.id, item: selectedItem });
                }}
              >
                使用选中道具
              </button>
            </div>
          ))}
          <p className="chapter-controls-note">
            从工具袋选一件，再选择使用位置。尝试不会丢失道具。
          </p>
        </section>
      )
    );
  }
  function bag() {
    return (
      <section className="chapter-inventory" aria-label="工具袋">
        <h3>
          随身工具袋 <small>{inventory.length} 件</small>
        </h3>
        {inventory.length === 0 ? (
          <p>摸摸旧船具，也许有东西藏在下面。</p>
        ) : (
          <div className="chapter-inventory-items">
            {inventory.map((item) => (
              <button
                key={item.id}
                aria-pressed={selectedItem === item.id}
                title={item.description}
                onClick={() =>
                  setSelected(selectedItem === item.id ? null : item.id)
                }
              >
                <span aria-hidden="true">{item.symbol}</span>
                {item.name}
                {CHAPTER.tools.some(
                  (tool) =>
                    tool.item === item.id &&
                    tool.id.startsWith("mount-") &&
                    state.usedTools.includes(tool.id),
                )
                  ? " · 已装配"
                  : ""}
              </button>
            ))}
          </div>
        )}
        {selectedItem && (
          <p className="chapter-item-description">
            {
              CHAPTER.items.find((item) => item.id === selectedItem)
                ?.description
            }
          </p>
        )}
      </section>
    );
  }
  function search() {
    const searchPoints = SEARCH_HOTSPOTS[state.scene] ?? [];
    return (
      <>
        <p>翻开遮挡的旧物，看看下面。拿走的东西会留下空位。</p>
        <div className="chapter-search-scene">
          <SearchBackdrop scene={state.scene} state={state} />
          {searchPoints.map((point) => {
            const reveal = CHAPTER.reveals.find((r) => r.id === point.id);
            const pickup = CHAPTER.pickups.find((p) => p.item === point.id);
            const tool = CHAPTER.tools.find((t) => t.id === point.id);
            if (reveal)
              return !state.revealed.includes(reveal.id) &&
                requirementsMet(state, reveal.requires) ? (
                <Point
                  key={point.id}
                  point={point}
                  mode={mode}
                  onClick={() => act({ type: "reveal", id: reveal.id })}
                />
              ) : null;
            if (pickup)
              return !state.found.includes(pickup.item) &&
                requirementsMet(state, pickup.requires) ? (
                <Point
                  key={point.id}
                  point={point}
                  mode={mode}
                  onClick={() => act({ type: "collect", item: pickup.item })}
                />
              ) : null;
            if (tool)
              return !state.usedTools.includes(tool.id) ? (
                <Point
                  key={point.id}
                  point={point}
                  mode={mode}
                  onClick={() => {
                    if (selectedItem)
                      act({ type: "use", id: tool.id, item: selectedItem });
                    else setMessage("先从工具袋选一件道具。");
                  }}
                />
              ) : null;
            return null;
          })}
        </div>
        {toolControls()}
        {bag()}
        <button
          className="chapter-secondary"
          onClick={() => open("search-kit")}
        >
          查看检修清单
        </button>
      </>
    );
  }
  const back = onBack ? (
    <button className="chapter-back" onClick={onBack}>
      ← 回到观星甲板
    </button>
  ) : (
    <Link to="/escape">← 回到探险</Link>
  );
  return (
    <main
      className={`chapter-app chapter-room-${state.scene}`}
      inert={lock !== null}
    >
      <header className="chapter-top">
        {back}
        <div>
          <span className="chapter-eyebrow">
            CHAPTER Ⅱ · THE FOGLIGHT WORKSHOP
          </span>
          <h1>{CHAPTER.title}</h1>
        </div>
        <button className="chapter-secondary" onClick={() => open("journal")}>
          随身手记
        </button>
      </header>
      <section className="chapter-mode" aria-label="探索模式">
        <label>
          探索模式{" "}
          <select
            value={mode}
            onChange={(event) => {
              setMode(event.target.value as GuidanceMode);
              onModeChange?.(event.target.value as GuidanceMode);
              setDetail(null);
              setMessage("探索模式已切换，进度保留。");
            }}
          >
            <option value="easy">简单</option>
            <option value="standard">标准</option>
            <option value="challenge">挑战</option>
          </select>
        </label>
        <p>
          {mode === "easy"
            ? "物件标记与操作引导开启，提示仍由你决定何时查看。"
            : mode === "challenge"
              ? "不显示物件标记或提示。Tab 键仍能探索物件。"
              : "自己发现规律；需要时可以主动查看提示。"}
        </p>
      </section>
      {futureSave && (
        <section className="chapter-finale" role="alert">
          <h2>这份进度来自更新的版本</h2>
          <p>现有记录已保留。可以返回探险，或确认只重玩这一章。</p>
          <button className="chapter-secondary" onClick={() => open("reset")}>
            选择重玩这一章
          </button>
        </section>
      )}
      {!state.started ? (
        <section className="chapter-opening">
          <div className="chapter-opening-art">
            <SceneArt scene="workshop" state={state} complete={false} />
          </div>
          <div>
            <span className="chapter-eyebrow">下一段冒险</span>
            <h2>给归航的人，一束光。</h2>
            <p>
              星图的尽头，藏着一盏尚未点亮的雾灯。旧船长留下了三间工作舱。把散落的工具与线索连起来，让归航的小船看见灯光。
            </p>
            <p>
              三个房间可以自由往返。每次挪动、填写和发现都会保存在这台设备上。
            </p>
            <button
              className="chapter-primary"
              disabled={futureSave}
              onClick={() => act({ type: "begin" })}
            >
              推开工作舱的门 →
            </button>
          </div>
        </section>
      ) : (
        <>
          {state.complete && !revisiting && (
            <section className="chapter-finale" aria-label="章节完成">
              <span className="chapter-eyebrow">CHAPTER COMPLETE</span>
              <h2>归航之光</h2>
              <p>
                雾灯亮了。远处的小船轻轻鸣笛，向你们挥动一面小旗。今晚，归航的人都有了方向。
              </p>
              <div className="chapter-actions">
                <button
                  className="chapter-primary"
                  onClick={() => setRevisiting(true)}
                >
                  再逛逛这艘船
                </button>
                <button onClick={() => open("reset")}>重玩这一章</button>
              </div>
            </section>
          )}
          <nav className="chapter-rooms" aria-label="工作舱地图">
            {CHAPTER.scenes.map((room) => (
              <button
                key={room.id}
                aria-current={room.id === state.scene ? "location" : undefined}
                disabled={!requirementsMet(state, room.requires)}
                onClick={() => act({ type: "travel", scene: room.id })}
              >
                <span>
                  {room.id === "gallery"
                    ? "01"
                    : room.id === "optics"
                      ? "02"
                      : "03"}
                </span>
                {room.title}
              </button>
            ))}
          </nav>
          <div className="chapter-exploration">
            <section className="chapter-room">
              <header>
                <div>
                  <span className="chapter-eyebrow">
                    {state.complete
                      ? "雾灯已经点亮"
                      : "当前目标 · 修复船尾雾灯"}
                  </span>
                  <h2>{scene.title}</h2>
                </div>
                <span className="chapter-progress">
                  {
                    CHAPTER.puzzles.filter((p) => state.puzzles[p.id].solved)
                      .length
                  }{" "}
                  / {CHAPTER.puzzles.length} 机关完成
                </span>
              </header>
              <div className="chapter-room-scene">
                <SceneArt
                  scene={state.scene}
                  state={state}
                  complete={state.complete}
                />
                {points.map((point) => (
                  <Point
                    key={point.id}
                    point={point}
                    mode={mode}
                    onClick={() => open(point.id)}
                  />
                ))}
              </div>
              <p className="chapter-room-caption">{scene.description}</p>
            </section>
            {bag()}
          </div>
          <footer className="chapter-footer">
            <span>进度自动保存在本机 · 可随时离开近景</span>
            <button onClick={() => open("reset")}>重玩这一章</button>
          </footer>
        </>
      )}
      <p className="chapter-status" role="status" aria-live="polite">
        {message}
      </p>
      {lock === null && detail && (
        <Closeup
          title={
            detail === "search"
              ? `${scene.title} · 翻找旧物`
              : detail === "journal"
                ? "随身手记"
                : detail === "reset"
                  ? "重玩雾灯工坊？"
                  : (puzzle?.title ?? "船上的装置")
          }
          onClose={() => setDetail(null)}
        >
          {detail === "search" ? (
            search()
          ) : detail === "journal" ? (
            <div className="chapter-journal">
              <p>这里只记录你亲眼见过的东西。</p>
              {inventory.length === 0 && !state.revealed.length && (
                <p>手记还是空白的。</p>
              )}
              {inventory.map((item) => (
                <article key={item.id}>
                  <h3>
                    {item.symbol} {item.name}
                  </h3>
                  <p>{item.description}</p>
                </article>
              ))}
              {CHAPTER.reveals
                .filter(
                  (reveal) => reveal.clue && state.revealed.includes(reveal.id),
                )
                .map((reveal) => (
                  <article key={reveal.id}>
                    <h3>{reveal.label}</h3>
                    <p>{reveal.clue}</p>
                  </article>
                ))}
              {CHAPTER.puzzles
                .filter((p) => state.puzzles[p.id].solved)
                .map((p) => (
                  <article key={p.id}>
                    <h3>{p.title}</h3>
                    <p>{p.success}</p>
                  </article>
                ))}
              {CHAPTER.puzzles.flatMap((p) =>
                p.kind === "filter"
                  ? p.lenses
                      .filter((lens) =>
                        state.puzzles[p.id].seenLenses.includes(lens.id),
                      )
                      .map((lens) => (
                        <article key={lens.id}>
                          <h3>
                            {lens.symbol} {lens.name} · 原始抄录
                          </h3>
                          <p>{lens.marks.join("　")}</p>
                          <p>{lens.clue}</p>
                        </article>
                      ))
                  : [],
              )}
            </div>
          ) : detail === "reset" ? (
            <>
              <p>
                本章的工具、机关和手记会重新归位。之前船舱与观星甲板的进度不受影响。
              </p>
              <div className="chapter-actions">
                <button onClick={() => setDetail(null)}>继续这次探险</button>
                <button
                  className="chapter-primary"
                  onClick={() => act({ type: "resetChapter" })}
                >
                  确认重玩这一章
                </button>
              </div>
            </>
          ) : puzzle ? (
            <>
              {puzzle.id === "pattern-tray" &&
                (() => {
                  const engraving = CHAPTER.reveals.find(
                    (reveal) => reveal.id === "pattern-engraving",
                  );
                  return (
                    engraving && (
                      <section className="chapter-engraving">
                        {state.revealed.includes(engraving.id) ? (
                          <p>{engraving.clue}</p>
                        ) : (
                          <button
                            className="chapter-secondary"
                            onClick={() =>
                              act({ type: "reveal", id: engraving.id })
                            }
                          >
                            {engraving.label}
                          </button>
                        )}
                      </section>
                    )
                  );
                })()}
              {puzzle.kind === "search" ? (
                <p>{puzzle.inscription}</p>
              ) : puzzleAvailable(CHAPTER, state, puzzle) ? (
                <PuzzleView
                  key={puzzle.id}
                  puzzle={puzzle}
                  progress={state.puzzles[puzzle.id]}
                  mode={mode}
                  onAction={act}
                />
              ) : (
                <div className="chapter-locked">
                  <p>
                    这件装置还没有准备好。可以查看近处的接口，也可以先去另一间舱室。
                  </p>
                </div>
              )}
              {puzzle.kind === "search" && (
                <div className="chapter-search-checklist">
                  {puzzle.items.map((id) => (
                    <span key={id}>
                      {state.found.includes(id) ? "✓" : "○"}{" "}
                      {CHAPTER.items.find((item) => item.id === id)?.name}
                    </span>
                  ))}
                </div>
              )}
              {toolControls()}
              {bag()}
              <p className="chapter-status" role="status">
                {message}
              </p>
            </>
          ) : null}
        </Closeup>
      )}
    </main>
  );
}
