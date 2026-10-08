import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import EscapeRoom from "../EscapeRoom";
import Chapter from "../chapter/Chapter";
import { ModeControls } from "../Guidance";
import {
  MODE_KEY,
  parseMode,
  guidancePolicy,
  type GuidanceMode,
} from "../guidancePolicy";
import { useStore } from "../../store/useStore";
import { RoomScene, DeckScene } from "./SceneArt";
import { SearchObject } from "./SearchArt";
import { chartProps, storageProps } from "./search";
import {
  ADVENTURE_KEY,
  parseAdventure,
  serializeAdventure,
  reduceAdventure,
  availableItems,
  adventureHints,
  ROW_CLUES,
  COL_CLUES,
  type AdventureState,
  type AdventureAction,
  type ExpeditionItem,
  type Target,
  type Room,
  type Cover,
} from "./logic";
import "./adventure.css";

type Detail =
  | "search"
  | "ledger"
  | "safe"
  | "projector"
  | "door"
  | "panel"
  | "winch"
  | "notes"
  | "hints"
  | "reset"
  | null;
const itemNames: Record<ExpeditionItem, string> = {
  key: "黄铜小钥匙",
  battery: "小电池组",
  crank: "曲柄",
  brush: "软毛刷",
  lens: "圆镜片",
  hook: "吊钩",
  card: "信号卡",
};
const itemDescriptions: Record<ExpeditionItem, string> = {
  key: "齿形细小，钥匙柄上刻着储物舱。",
  battery: "两节装在一起的小电池，接头完好。",
  crank: "一只方头手柄，可以嵌进方形轴孔。",
  brush: "很软的刷毛，适合刷去纸面浮尘。",
  lens: "一枚圆形光学镜片，边缘有卡口。",
  hook: "结实的吊钩，可连接绞索与拉环。",
  card: "薄卡片上有细小的透光孔。",
};
const roomNames: Record<Room, string> = {
  cabin: "原来的船舱",
  navigation: "导航室",
  storeroom: "甲板储物舱",
  deck: "观星甲板",
};
const titles: Record<Exclude<Detail, null>, string> = {
  search: "翻找物件",
  ledger: "水深记录",
  safe: "航海员的保险柜",
  projector: "小型投影仪",
  door: "储物舱门",
  panel: "栈桥控制板",
  winch: "甲板绞盘",
  notes: "随身手记",
  hints: "一点提示",
  reset: "重新探索后两间房？",
};
function readSaved(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="adventure-dialog"
      aria-labelledby="adventure-dialog-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <span className="adventure-eyebrow">STARLIGHT · 航海员手记</span>
        <button onClick={onClose} aria-label="关闭近景">
          ×
        </button>
      </header>
      <h2 id="adventure-dialog-title">{title}</h2>
      {children}
    </dialog>
  );
}
function Point({
  mode,
  label,
  x,
  y,
  onClick,
}: {
  mode: GuidanceMode;
  label: string;
  x: number;
  y: number;
  onClick: () => void;
}) {
  return (
    <button
      className={`adventure-point${mode === "challenge" ? " unmarked" : ""}${mode === "easy" ? " easy" : ""}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-label={`检查${label}`}
      onClick={onClick}
    >
      <span>{label}</span>
      {mode === "challenge" ? "" : "＋"}
    </button>
  );
}
export function SearchPile({
  state,
  mode,
  onAction,
  onMessage,
}: {
  state: AdventureState;
  mode: GuidanceMode;
  onAction: (a: AdventureAction, message: string) => void;
  onMessage: (message: string) => void;
}) {
  const navigation = state.room === "navigation";
  const objects = navigation ? chartProps : storageProps;
  const targets: ExpeditionItem[] = navigation
    ? ["key", "battery", "crank"]
    : ["brush", "lens", "hook"];
  const revealed = (cover: Cover) =>
    cover === "compassCase"
      ? state.compassCaseOpen
      : cover === "manifest"
        ? state.manifestMoved
        : state.canvasLifted;
  const covered = (item: ExpeditionItem) =>
    (item === "key" && !state.compassCaseOpen) ||
    (item === "battery" && !state.manifestMoved) ||
    (item === "lens" && !state.canvasLifted);
  return (
    <>
      <p>
        {navigation
          ? "航海桌上叠着海图、旧书和船具。"
          : "储物架上挤着缆绳、帆布和用过的船具。"}
        点击想检查的物件，可以随时离开再回来。
      </p>
      <ul className="adventure-find-list" aria-label="本处待寻物件">
        {targets.map((item) => (
          <li key={item} className={state.found.includes(item) ? "found" : ""}>
            {state.found.includes(item) ? "✓ " : ""}
            {itemNames[item]}
          </li>
        ))}
      </ul>
      <div
        className="adventure-search-scroll"
        tabIndex={0}
        aria-label="物件近景；窄屏可横向滚动"
      >
        <div
          className={`adventure-search${navigation ? "" : " storage"}`}
          aria-label={navigation ? "放大的航海桌物品堆" : "放大的储物架物品堆"}
        >
          {objects.map((object) => {
            const cover = (
              ["compassCase", "manifest", "canvas"].includes(object.id)
                ? object.id
                : null
            ) as Cover | null;
            if (
              (object.item &&
                (state.found.includes(object.item) || covered(object.item))) ||
              (cover && revealed(cover))
            )
              return null;
            return (
              <button
                key={object.id}
                className={`adventure-search-prop${mode === "easy" ? " easy" : ""}`}
                style={{
                  left: `${object.x}%`,
                  top: `${object.y}%`,
                  width: `${object.w}%`,
                  height: `${object.h}%`,
                  transform: `rotate(${object.rotate}deg)`,
                }}
                aria-label={`检查${object.name}`}
                onClick={() => {
                  if (cover)
                    onAction(
                      { type: "reveal", cover },
                      cover === "compassCase"
                        ? "盒盖打开，里面还有一样东西。"
                        : cover === "manifest"
                          ? "移开清单，纸下面露出了一件小东西。"
                          : "掀起帆布，下面有什么在反光。",
                    );
                  else if (object.item)
                    onAction(
                      { type: "collect", item: object.item },
                      `收好了${object.name}。`,
                    );
                  else onMessage(`仔细看了看${object.name}，把它留在了原处。`);
                }}
              >
                <SearchObject kind={object.kind} />
                <span>{object.name}</span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="adventure-scroll-tip">
        近景可横向滑动，查看物件堆的另一侧。
      </p>
      {mode === "easy" && (
        <p data-guidance="rule">
          一些物件在纸张、盒盖或帆布下面。先移动遮挡，再点击露出来的物件。
        </p>
      )}
    </>
  );
}
function Ledger({ clean }: { clean: boolean }) {
  return (
    <div
      className={`adventure-ledger${clean ? " clean" : ""}`}
      aria-label={
        clean
          ? "水深记录：早晨水深8米、吃水3米；中午水深6米、吃水4米；傍晚水深9米、吃水2米。"
          : "水深记录表面覆着厚厚的浮尘，数字无法辨认。"
      }
    >
      <h3>航海日志 · 水深记录</h3>
      {clean ? (
        <table>
          <thead>
            <tr>
              <th>时刻</th>
              <th>水深</th>
              <th>吃水</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>早晨</th>
              <td>8 米</td>
              <td>3 米</td>
            </tr>
            <tr>
              <th>中午</th>
              <td>6 米</td>
              <td>4 米</td>
            </tr>
            <tr>
              <th>傍晚</th>
              <td>9 米</td>
              <td>2 米</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <div className="adventure-dust" aria-hidden="true">
          ··· ░░ ···
          <br />
          ░░ ··· ░░
          <br />
          ··· ░░ ···
        </div>
      )}
      <p>页边小注：吃水，是水面到船底的距离。</p>
    </div>
  );
}
export function Nonogram({
  state,
  onAction,
}: {
  state: AdventureState;
  onAction: (a: AdventureAction, message: string) => void;
}) {
  return (
    <>
      <p>铜牌刻着：「数字记下连续亮格的长度；两段之间，至少留一格暗格。」</p>
      {!state.projectorOn && (
        <p>控制板的记录架是空的。需要找到它的行列记录。</p>
      )}
      <table className="adventure-nonogram" aria-label="五行五列栈桥控制板">
        <thead>
          <tr>
            <td />
            {COL_CLUES.map((clue, i) => (
              <th key={i} scope="col">
                <span className="adventure-sr-only">第{i + 1}列：</span>
                {state.projectorOn ? clue.join(" · ") : "?"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROW_CLUES.map((clue, row) => (
            <tr key={row}>
              <th scope="row">
                <span className="adventure-sr-only">第{row + 1}行：</span>
                {state.projectorOn ? clue.join(" · ") : "?"}
              </th>
              {Array.from({ length: 5 }, (_, col) => {
                const index = row * 5 + col;
                return (
                  <td key={col}>
                    <button
                      disabled={state.panelOpen}
                      aria-label={`第${row + 1}行第${col + 1}列，${state.cells[index] ? "亮格" : "暗格"}`}
                      aria-pressed={state.cells[index]}
                      className={state.cells[index] ? "filled" : ""}
                      onClick={() =>
                        onAction(
                          { type: "toggleCell", index },
                          "可以反复调整，准备好后确认整张图。",
                        )
                      }
                    >
                      {state.cells[index] ? "◆" : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="adventure-actions">
        <button
          className="adventure-primary"
          disabled={state.panelOpen}
          onClick={() =>
            onAction(
              { type: "confirmPanel" },
              "控制板亮起暖光，绞盘的锁扣松开了。",
            )
          }
        >
          {state.panelOpen ? "控制板已解锁" : "确认整张图"}
        </button>
        {!state.panelOpen && (
          <button
            className="adventure-secondary"
            onClick={() =>
              onAction({ type: "clearPanel" }, "已熄灭所有方格，可以重新排列。")
            }
          >
            清空方格
          </button>
        )}
      </div>
    </>
  );
}
function ProjectionClues() {
  return (
    <div className="adventure-clue">
      <h3>投影抄录 · 方格信号</h3>
      <p>行（从上到下）：{ROW_CLUES.map((c) => c.join("、")).join(" / ")}</p>
      <p>列（从左到右）：{COL_CLUES.map((c) => c.join("、")).join(" / ")}</p>
      <p>卡片底部刻着：连续亮格的长度；段与段之间留空。</p>
    </div>
  );
}
export default function Adventure({ onSceneSelect, onNextScene, onComplete, standalone = false }: { onSceneSelect?: () => void; onNextScene?: () => void; onComplete?: () => void; standalone?: boolean } = {}) {
  const lock = useStore((s) => s.lock);
  const [state, dispatch] = useReducer(reduceAdventure, undefined, () =>
    {
      const saved = parseAdventure(readSaved(ADVENTURE_KEY));
      return standalone && (!saved.started || saved.room === "cabin")
        ? reduceAdventure(saved, { type: "begin" }) : saved;
    },
  );
  useEffect(() => { if (state.complete) onComplete?.(); }, [state.complete, onComplete]);
  const [mode, setMode] = useState<GuidanceMode>(() =>
    parseMode(readSaved(MODE_KEY)),
  );
  const [detail, setDetail] = useState<Detail>(null);
  const [showFoglight, setShowFoglight] = useState(false);
  const [selected, setSelected] = useState<ExpeditionItem | null>(null);
  const [message, setMessage] = useState(
    "夜风轻轻吹过甲板。导航室与储物舱里，还藏着通往观星甲板的线索。",
  );
  const [hintLevel, setHintLevel] = useState(0);
  const [safeCode, setSafeCode] = useState("");
  useEffect(() => {
    try {
      localStorage.setItem(ADVENTURE_KEY, serializeAdventure(state));
    } catch {
      /* Continue playing without storage. */
    }
  }, [state]);
  useEffect(() => {
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      /* Assistance still works for this visit. */
    }
  }, [mode]);
  const items = availableItems(state);
  const selectedItem = selected && items.includes(selected) ? selected : null;
  function changeMode(next: GuidanceMode) {
    setMode(next);
    setDetail(null);
    setHintLevel(0);
    setMessage("已切换探索模式，所有探索进度都会保留。");
  }
  function open(next: Detail) {
    setDetail(next);
    setMessage("");
    if (next === "hints") setHintLevel(0);
  }
  function act(action: AdventureAction, success: string) {
    const next = reduceAdventure(state, action);
    if (next === state) {
      setMessage(
        action.type === "safe"
          ? "锁芯没有转动，再检查记录中的线索。"
          : action.type === "confirmPanel"
            ? "整张图还没有让锁扣松开。可以继续调整。"
            : action.type === "operateWinch"
              ? "绞盘还不能转动，检查轴孔、吊索和控制锁扣。"
              : "这件东西放在这里暂时没有作用。",
      );
      return;
    }
    dispatch(action);
    setMessage(success);
  }
  function travel(room: Room) {
    dispatch({ type: "travel", room });
    setDetail(null);
    setMessage(`来到${roomNames[room]}。`);
  }
  function renderTools(target: Target) {
    return (
      <div className="adventure-use">
        <p>
          {selectedItem
            ? `已选：${itemNames[selectedItem]}`
            : "从背包选择一件道具，再试着使用。"}
        </p>
        <div className="adventure-tool-row">
          {items.map((item) => (
            <button
              key={item}
              className={`adventure-tool-chip${selectedItem === item ? " selected" : ""}`}
              aria-pressed={selectedItem === item}
              onClick={() => setSelected(item)}
            >
              {itemNames[item]}
            </button>
          ))}
        </div>
        <button
          className="adventure-primary"
          disabled={!selectedItem}
          onClick={() => {
            if (selectedItem)
              act(
                { type: "use", item: selectedItem, target },
                `已使用${itemNames[selectedItem]}。`,
              );
          }}
        >
          使用选中的道具
        </button>
      </div>
    );
  }
  const onward = (
    <button
      className="escape-primary"
      onClick={() => {
        dispatch({ type: "begin" });
        setDetail(null);
        setMessage("推开导航室的门，新的航海故事开始了。");
      }}
    >
      继续探索 · 导航室 →
    </button>
  );
  if (showFoglight && state.complete)
    return (
      <Chapter
        mode={mode}
        onModeChange={changeMode}
        onBack={() => {
          setShowFoglight(false);
          travel("deck");
        }}
      />
    );
  if (state.room === "cabin")
    return (
      <EscapeRoom
        mode={mode}
        onModeChange={changeMode}
        renderCompletion={onward}
        onSceneSelect={onSceneSelect}
      />
    );
  return (
    <main className="adventure-app" inert={lock !== null}>
      <header className="adventure-top">
        <div>
          {onSceneSelect ? <button onClick={onSceneSelect}>← 场景选择</button> : <Link to="/">← 回游戏大厅</Link>}
          <div className="adventure-eyebrow">STARLIGHT · 海风里的星光</div>
          <h1>{roomNames[state.room]}</h1>
        </div>
        <div className="adventure-actions">
          <button onClick={() => open("notes")}>随身手记</button>
          {guidancePolicy(mode).hints && (
            <button onClick={() => open("hints")}>一点提示</button>
          )}
          <button onClick={() => open("reset")}>重新探索</button>
        </div>
      </header>
      <div className="adventure-mode-wrap">
        <ModeControls mode={mode} onChange={changeMode} />
      </div>
      <nav className="adventure-tabs" aria-label="船上房间">
        {!standalone && <button onClick={() => travel("cabin")}>← 船舱</button>}
        <button
          aria-current={state.room === "navigation" ? "location" : undefined}
          onClick={() => travel("navigation")}
        >
          导航室
        </button>
        <button
          disabled={!state.storeroomOpen}
          aria-current={state.room === "storeroom" ? "location" : undefined}
          onClick={() => travel("storeroom")}
        >
          甲板储物舱{!state.storeroomOpen ? " · 未打开" : ""}
        </button>
        {state.complete && (
          <button
            aria-current={state.room === "deck" ? "location" : undefined}
            onClick={() => travel("deck")}
          >
            观星甲板
          </button>
        )}
        {state.complete && state.room !== "deck" && (
          <button
            onClick={() => {
              setDetail(null);
              if (onNextScene) onNextScene(); else setShowFoglight(true);
            }}
          >
            {onNextScene ? "本场景已完成 · 选择下一场景 →" : "继续探索：雾灯工坊 →"}
          </button>
        )}
      </nav>
      {state.room === "deck" ? (
        <section className="adventure-complete">
          <div className="adventure-eyebrow">海风里的星光 · 本章已完成</div>
          <h2>你已抵达观星甲板！</h2>
          <p>这段航海探险已经完成。船尾的三间舱室，还有一盏等待点亮的雾灯。</p>
          <button
            className="adventure-primary"
            onClick={() => {
              setDetail(null);
              if (onNextScene) onNextScene(); else setShowFoglight(true);
            }}
          >
            {onNextScene ? "本场景已完成 · 选择下一场景 →" : "继续探索：雾灯工坊 →"}
          </button>
          <DeckScene />
          <div className="adventure-eyebrow">航海员的夜晚</div>
          <h2>星光，就在前面。</h2>
          <p>
            你整理了旧船具，读懂了航海记录，也让沉睡的栈桥重新转动。
            <br />
            海面很平静，今晚的星星，留给慢慢发现它们的人。
          </p>
          <button
            className="adventure-secondary"
            onClick={() => travel("storeroom")}
          >
            回船上看看
          </button>
        </section>
      ) : (
        <div className="adventure-main">
          <section
            className="adventure-scene"
            aria-label={`${roomNames[state.room]}全景`}
          >
            <RoomScene room={state.room} />
            {state.room === "navigation" ? (
              <>
                <Point
                  mode={mode}
                  label="航海桌的物件堆"
                  x={25}
                  y={62}
                  onClick={() => open("search")}
                />
                <Point
                  mode={mode}
                  label="水深记录"
                  x={43}
                  y={33}
                  onClick={() => open("ledger")}
                />
                <Point
                  mode={mode}
                  label="保险柜"
                  x={64}
                  y={72}
                  onClick={() => open("safe")}
                />
                <Point
                  mode={mode}
                  label="投影仪"
                  x={65}
                  y={37}
                  onClick={() => open("projector")}
                />
                <Point
                  mode={mode}
                  label="储物舱门"
                  x={88}
                  y={50}
                  onClick={() => open("door")}
                />
              </>
            ) : (
              <>
                <Point
                  mode={mode}
                  label="储物架的物件堆"
                  x={23}
                  y={72}
                  onClick={() => open("search")}
                />
                <Point
                  mode={mode}
                  label="栈桥控制板"
                  x={61}
                  y={52}
                  onClick={() => open("panel")}
                />
                <Point
                  mode={mode}
                  label="绞盘与栈桥"
                  x={84}
                  y={76}
                  onClick={() => open("winch")}
                />
              </>
            )}
          </section>
          <aside className="adventure-sidebar">
            <h2>随身背包</h2>
            <p>
              选中物件，再检查场景中的使用位置。用完的工具会留在它的新位置。
            </p>
            <div className="adventure-inventory">
              {items.map((item) => (
                <button
                  className="adventure-item"
                  key={item}
                  aria-pressed={selectedItem === item}
                  onClick={() => {
                    setSelected(selectedItem === item ? null : item);
                    setMessage(
                      mode === "easy"
                        ? itemDescriptions[item]
                        : `已选中${itemNames[item]}。`,
                    );
                  }}
                >
                  <SearchObject kind={item} />
                  <span>{itemNames[item]}</span>
                </button>
              ))}
              {items.length === 0 && (
                <div className="adventure-empty">
                  背包暂时是空的。放大的近景里可以翻找物件。
                </div>
              )}
            </div>
            {selectedItem && <p>{itemNames[selectedItem]} · 已选中</p>}
          </aside>
        </div>
      )}
      <div className="adventure-message" role="status" aria-live="polite">
        {message || "慢慢看，线索就在船上的物件与记录里。"}
      </div>
      {detail && lock === null && (
        <Dialog title={titles[detail]} onClose={() => setDetail(null)}>
          {detail === "search" && (
            <SearchPile
              state={state}
              mode={mode}
              onAction={act}
              onMessage={setMessage}
            />
          )}
          {detail === "ledger" && (
            <>
              <Ledger clean={state.ledgerClean} />
              {!state.ledgerClean && (
                <>
                  <p>浮尘盖住了几行数字，纸页已经很脆。</p>
                  {renderTools("ledger")}
                </>
              )}
              {mode === "easy" && state.ledgerClean && (
                <p data-guidance="rule">
                  水深包含吃水部分，也包含船底到海底的距离。保险柜需要的是哪一段？
                </p>
              )}
            </>
          )}
          {detail === "safe" && (
            <>
              <div className="adventure-safe-art" aria-hidden="true">
                <span>{state.safeOpen ? "▧" : "◉"}</span>
                <i>早 午 晚</i>
              </div>
              <p>门上刻着：「船底余水，早 · 午 · 晚。」</p>
              {state.safeOpen ? (
                <>
                  {!state.found.includes("card") ? (
                    <button
                      className="adventure-card"
                      aria-label="收取保险柜里的信号卡"
                      onClick={() =>
                        act(
                          { type: "collect", item: "card" },
                          "把信号卡放进了背包。",
                        )
                      }
                    >
                      <SearchObject kind="card" />
                      <span>拿起信号卡</span>
                    </button>
                  ) : (
                    <p>保险柜里已经空了，信号卡已收好。</p>
                  )}
                </>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(
                      { type: "safe", code: safeCode },
                      "保险柜轻轻打开了，里面放着一张薄卡片。",
                    );
                  }}
                >
                  <label htmlFor="adventure-safe-code">三位密码</label>
                  <div className="adventure-code">
                    <input
                      id="adventure-safe-code"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={3}
                      value={safeCode}
                      onChange={(e) =>
                        setSafeCode(e.target.value.replace(/\D/g, ""))
                      }
                    />
                    <button className="adventure-primary" type="submit">
                      转动锁芯
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
          {detail === "projector" && (
            <>
              <div className="adventure-projector" aria-label="投影仪安装位置">
                <span className={state.batteryMounted ? "installed" : ""}>
                  电池仓
                  <br />
                  {state.batteryMounted ? "已接通" : "空着"}
                </span>
                <span className={state.lensMounted ? "installed" : ""}>
                  镜片座
                  <br />
                  {state.lensMounted ? "已安装" : "空着"}
                </span>
                <span className={state.cardMounted ? "installed" : ""}>
                  卡片槽
                  <br />
                  {state.cardMounted ? "已放入" : "空着"}
                </span>
              </div>
              <p>机身刻着：「接上电源，装好镜片，把信号留在光里。」</p>
              {state.projectorOn ? (
                <>
                  <ProjectionClues />
                  <p>已抄进随身手记，去别的房间也可以查看。</p>
                </>
              ) : (
                renderTools("projector")
              )}
            </>
          )}
          {detail === "door" && (
            <>
              {state.storeroomOpen ? (
                <>
                  <p>钥匙留在锁孔里。门后是一间暖色的船具储物舱。</p>
                  <button
                    className="adventure-primary"
                    onClick={() => travel("storeroom")}
                  >
                    走进甲板储物舱 →
                  </button>
                </>
              ) : (
                <>
                  <p>门牌写着「甲板储物舱」。锁孔很小，边缘透出黄铜的光泽。</p>
                  {renderTools("door")}
                </>
              )}
            </>
          )}
          {detail === "panel" && <Nonogram state={state} onAction={act} />}
          {detail === "winch" && (
            <>
              <div className="adventure-winch-slots">
                <span>
                  方形轴孔：{state.crankMounted ? "曲柄已装好" : "空着"}
                </span>
                <span>
                  吊索末端：{state.hookMounted ? "吊钩已装好" : "缺连接件"}
                </span>
                <span>控制锁扣：{state.panelOpen ? "已松开" : "锁着"}</span>
              </div>
              <p>
                绞盘旁的铜牌：「挂稳栈桥拉环，转动手柄，观星的路就在前面。」
              </p>
              {!state.gangwayDown ? (
                <>
                  {(!state.crankMounted || !state.hookMounted) &&
                    renderTools("winch")}
                  <button
                    className="adventure-primary"
                    onClick={() =>
                      act(
                        { type: "operateWinch" },
                        "栈桥缓缓放下，星光铺在木板上。",
                      )
                    }
                  >
                    转动绞盘
                  </button>
                </>
              ) : (
                <>
                  <p>栈桥已经放稳，另一端是安静的观星甲板。</p>
                  <button
                    className="adventure-primary"
                    onClick={() => {
                      act({ type: "finish" }, "走过栈桥，来到星光下。");
                      setDetail(null);
                    }}
                  >
                    走向观星甲板 →
                  </button>
                </>
              )}
            </>
          )}
          {detail === "notes" && (
            <>
              <p>
                航海员在旧日记的扉页写下：「船上的每件小东西，都有它该去的地方。观星甲板的路，留给好奇的人。」
              </p>
              <ul className="adventure-notes">
                <li>导航室连着甲板储物舱。观星甲板在栈桥的另一端。</li>
                {state.storeroomOpen && (
                  <li>储物舱门已经打开，可以自由往返。</li>
                )}
                {state.ledgerClean && (
                  <li>
                    水深记录：早晨水深 8 米、吃水 3 米；中午水深 6 米、吃水 4
                    米；傍晚水深 9 米、吃水 2 米。
                  </li>
                )}
                {state.safeOpen && <li>保险柜已打开。</li>}
                {state.panelOpen && <li>栈桥控制板已解锁。</li>}
                {state.gangwayDown && (
                  <li>绞盘已经放下栈桥，可以走向观星甲板。</li>
                )}
              </ul>
              {state.projectorOn && <ProjectionClues />}
              <p>已发现的记录会保存在这里，不会自动写下解题答案。</p>
            </>
          )}
          {detail === "hints" && guidancePolicy(mode).hints && (
            <div className="adventure-hints">
              <p>
                先给一点方向，再解释规律。最后一步会揭晓答案，可以随时合上。
              </p>
              {adventureHints(state)
                .slice(0, hintLevel + 1)
                .map((hint, index) => (
                  <p key={index}>
                    {index + 1}. {hint}
                  </p>
                ))}
              <button
                className="adventure-primary"
                disabled={hintLevel >= 2}
                onClick={() => setHintLevel((v) => Math.min(v + 1, 2))}
              >
                {hintLevel === 0
                  ? "解释规律"
                  : hintLevel === 1
                    ? "揭晓答案（含完整解法）"
                    : "已显示答案"}
              </button>
            </div>
          )}
          {detail === "reset" && (
            <>
              <p>
                只重新开始导航室和甲板储物舱：这些房间的物件、记录与机关会复原。原来船舱的存档和探索模式会保留。
              </p>
              <div className="adventure-actions">
                <button
                  className="adventure-secondary"
                  onClick={() => setDetail(null)}
                >
                  继续现在的进度
                </button>
                <button
                  className="adventure-primary"
                  onClick={() => {
                    dispatch({ type: "resetChapter" });
                    setDetail(null);
                    setSelected(null);
                    setSafeCode("");
                    setHintLevel(0);
                    setMessage("后两间房已复原，原来船舱的进度已保留。");
                  }}
                >
                  确认重新探索后两间房
                </button>
              </div>
            </>
          )}
          {detail !== "hints" && detail !== "reset" && (
            <div className="adventure-status" role="status" aria-live="polite">
              {message}
            </div>
          )}
        </Dialog>
      )}
    </main>
  );
}
