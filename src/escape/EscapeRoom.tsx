import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Compass,
  HelpCircle,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { RouteChart, VoyageLog } from "./NavigationClues";
import RoomArt, { LighthouseArt } from "./RoomArt";
import {
  SAVE_KEY,
  initialState,
  inventory,
  parseSave,
  reduceEscape,
  serializeSave,
  type Action,
  type Item,
} from "./logic";
import { NavigationSumBoard, WoodenPicture } from "./MathProps";
import { GuidanceProvider, HintPanel, Hotspot, ModeControls } from "./Guidance";
import { MODE_KEY, parseMode, guidancePolicy, changeGuidance, visibleDetail, type GuidanceMode } from "./guidancePolicy";
import "./escape.css";

type View = 0 | 1 | 2 | 3;
type Detail =
  | "log"
  | "intro"
  | "flags"
  | "cloth"
  | "drawer"
  | "chart"
  | "cabinet"
  | "ship"
  | "postcard"
  | "safe"
  | "door"
  | "notes"
  | "hints"
  | "reset"
  | null;
const rooms = ["航海桌", "海图墙", "船模角", "甲板舱门"];
const props: Record<Item, { name: string; icon: string; description: string }> =
  {
    cloth: {
      name: "软布",
      icon: "▱",
      description: "柔软的棉布，可以擦去盐霜。",
    },
    magnet: {
      name: "马蹄磁铁",
      icon: "∩",
      description: "磁力很足。或许能与另一件物品组合。",
    },
    string: {
      name: "细绳",
      icon: "〰",
      description: "一段结实的细绳，可以系住什么。",
    },
    fishingTool: {
      name: "系绳磁铁",
      icon: "♧",
      description: "能垂进狭窄缝隙的自制打捞工具。",
    },
    token1: {
      name: "日光徽章",
      icon: "☼",
      description: "边缘磨得光亮，背面写着「双光引航」。",
    },
    token2: {
      name: "月光徽章",
      icon: "☾",
      description: "带铁环的徽章，与日光徽章正好成对。",
    },
    key: {
      name: "黄铜钥匙",
      icon: "⚿",
      description: "小小的钥匙，挂着「甲板」字样的木牌。",
    },
  };
function Modal({
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
      className="escape-modal"
      aria-labelledby="escape-dialog-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <span className="escape-eyebrow">STARLIGHT · 航海员手记</span>
        <button onClick={onClose} aria-label="关闭近景">
          <X size={22} />
        </button>
      </header>
      <h2 id="escape-dialog-title">{title}</h2>
      {children}
    </dialog>
  );
}
function PictureRings({ rings }: { rings: number[] }) {
  return (
    <div className="escape-rings" aria-label="三道可旋转的灯塔图环">
      {rings.map((n, i) => (
        <div key={i} className={`escape-ring ring-${i}`}>
          <div style={{ transform: `rotate(${n * 90}deg)` }}>
            <LighthouseArt />
          </div>
        </div>
      ))}
    </div>
  );
}
export default function EscapeRoom({ renderCompletion, mode: controlledMode, onModeChange, onSceneSelect, onComplete }: { onSceneSelect?: () => void; onComplete?: () => void; renderCompletion?: ReactNode; mode?: GuidanceMode; onModeChange?: (mode: GuidanceMode) => void } = {}) {
  const lock = useStore((state) => state.lock);
  const [s, dispatch] = useReducer(reduceEscape, undefined, () => {
    try {
      return parseSave(localStorage.getItem(SAVE_KEY));
    } catch {
      return initialState();
    }
  });
  useEffect(() => { if (s.escaped) onComplete?.(); }, [s.escaped, onComplete]);
  const [revisiting, setRevisiting] = useState(false);
  const [view, setView] = useState<View>(0);
  const [guidance, setGuidance] = useState<{ mode: GuidanceMode; detail: Detail; hintLevel: number }>(() => {
    try {
      return { mode: parseMode(localStorage.getItem(MODE_KEY)), detail: localStorage.getItem(SAVE_KEY) ? null : "intro", hintLevel: 0 };
    } catch {
      return { mode: "standard", detail: "intro", hintLevel: 0 };
    }
  });
  if (controlledMode && controlledMode !== guidance.mode) {
    setGuidance(changeGuidance(guidance, controlledMode));
  }
  const mode = controlledMode ?? guidance.mode;
  const { hintLevel } = guidance;
  const detail = visibleDetail(mode, guidance.detail);
  const assistance = guidancePolicy(mode);
  const setDetail = (detail: Detail) => setGuidance(current => ({ ...current, detail }));
  const setHintLevel = (hintLevel: number) => setGuidance(current => ({ ...current, hintLevel }));
  const changeMode = (next: GuidanceMode) => {
    setGuidance(current => changeGuidance(current, next));
    onModeChange?.(next);
    setMessage("探索模式已切换，解谜进度保持不变。");
    try { localStorage.setItem(MODE_KEY, next); } catch { /* Preference persistence is optional. */ }
  };
  const [cupMoved, setCupMoved] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);
  const [message, setMessage] = useState(
    "海风轻轻吹进舱室。四处看看，航海员留下了什么？",
  );
  const [scratch, setScratch] = useState<Record<string, string>>({});
  const [selectedSlat, setSelectedSlat] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [route, setRoute] = useState("");
  const [sound, setSound] = useState(false);
  const [saveStatus, setSaveStatus] = useState("进度自动保存");
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, serializeSave(s));
    } catch {
      queueMicrotask(() => setSaveStatus("浏览器无法保存，请保持此页打开"));
    }
  }, [s]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  const playTone = () => {
    if (!sound) return;
    try {
      const ctx = audio.current ?? new AudioContext();
      audio.current = ctx;
      void ctx.resume();
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = "sine";
      o.frequency.setValueAtTime(523, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.14);
      g.gain.setValueAtTime(0.035, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      o.start();
      o.stop(ctx.currentTime + 0.3);
    } catch {
      /* Audio is optional. */
    }
  };
  const act = (action: Action, success: string, failure?: string) => {
    const next = reduceEscape(s, action);
    dispatch(action);
    if (next !== s) {
      if (selected && !inventory(next).includes(selected)) setSelected(null);
      setMessage(success);
      setHintLevel(0);
      playTone();
    } else if (failure) setMessage(failure);
  };
  const open = (d: Detail) => {
    if (d === "hints" && !assistance.hints) return;
    if (d === "hints") setHintLevel(0);
    setDetail(d);
    setMessage("仔细观察，线索就在舱室里。");
    if (d === "flags" || (d === "postcard" && s.picture))
      dispatch({ type: "observe", clue: d });
    if (d === "chart" && s.chart) dispatch({ type: "observe", clue: "chart" });
    if (d === "log") dispatch({ type: "observe", clue: "log" });
    if (d === "ship") dispatch({ type: "observe", clue: "slot" });
  };
  const pick = (item: Item) => {
    if (
      (selected === "magnet" && item === "string") ||
      (selected === "string" && item === "magnet")
    ) {
      act({ type: "combine" }, "你把细绳牢牢系在磁铁上。系绳磁铁做好了！");
      setSelected("fishingTool");
      return;
    }
    setSelected(selected === item ? null : item);
    setMessage(!assistance.automaticRules && ["cloth", "magnet", "string", "fishingTool"].includes(item) ? `${props[item].name}已选中。可以在场景中使用，也可以再点一件背包物品。` : props[item].description);
  };
  const move = (delta: number) => {
    setView(((view + delta + 4) % 4) as View);
    setMessage("换个角度，也许会有新的发现。");
  };
  const hotspot = (
    d: Detail,
    label: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => (
    <Hotspot mode={mode} label={label} onClick={() => open(d)}
      style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }} />
  );
  const close = () => setDetail(null);
  const titles: Record<Exclude<Detail, null>, string> = {
    log: "航海员的日志",
    intro: "欢迎登上星光号",
    flags: "航海员的递推算图",
    cloth: "桌角的搪瓷杯",
    drawer: "航海员的抽屉",
    chart: "蒙着盐霜的海图",
    cabinet: "方向锁",
    ship: "一艘袖珍帆船",
    postcard: "风化的木条画",
    safe: "双光圆环匣",
    door: "通向星光的门",
    notes: "我的航海手记",
    hints: "让海风捎来一点提示",
    reset: "重新开始这次航行？",
  };
  const held = (item: Item) => selected === item;
  return (
    <GuidanceProvider mode={mode}>
    <main className="escape-app" inert={lock !== null}>
      <header className="escape-topbar">
        {onSceneSelect ? <button className="escape-back" onClick={onSceneSelect}><ArrowLeft size={17} /> 场景选择</button> : <Link to="/" className="escape-back"><ArrowLeft size={17} /> 游戏大厅</Link>}
        <span>THE STARLIGHT</span>
        <button
          onClick={() => setSound(!sound)}
          aria-label={sound ? "关闭音效" : "开启音效"}
        >
          {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          <span>{sound ? "音效开" : "音效关"}</span>
        </button>
      </header>
      <section className="escape-heading">
        <div>
          <p className="escape-eyebrow">一间船舱 · 一封邀请 · 一场小小的远航</p>
          <h1>
            星光号<span>航海员的钥匙</span>
          </h1>
        </div>
        {assistance.hints && <button className="escape-hint" onClick={() => open("hints")}>
          <HelpCircle size={19} /> 来点提示
        </button>}
      </section>
      <ModeControls mode={mode} onChange={changeMode} />
      {s.escaped && !revisiting ? (
        <section className="escape-finale">
          <div className="escape-stars">✧ · ✦ · ✧</div>
          <Compass size={66} />
          <p className="escape-eyebrow">甲板已打开</p>
          <h2>星光，是给好奇心的礼物。</h2>
          <p>
            门外没有紧迫的倒计时，只有海风、灯塔，
            <br />
            还有你亲手找到的下一段旅程。
          </p>
          <div className="escape-seal">星光号 · 荣誉航海员</div>
          <button
            className="escape-primary"
            onClick={() => {
              setView(3);
              setDetail("notes");
            }}
          >
            翻看航海手记
          </button>
          {(!renderCompletion || onSceneSelect) && <button className="escape-quiet" onClick={() => open("reset")}>
            再航行一次
          </button>}
          {onSceneSelect && <button className="escape-quiet" onClick={() => setRevisiting(true)}>回船舱看看</button>}
          {renderCompletion}
        </section>
      ) : (
        <>
          <section
            className="escape-scene-wrap"
            aria-label={`${rooms[view]}探索场景`}
          >
            <div className="escape-scene-caption">
              <span>舱室 {String(view + 1).padStart(2, "0")} / 04</span>
              <strong>{rooms[view]}</strong>
              <span>点击物件，靠近看看</span>
            </div>
            <div className="escape-scene">
              <RoomArt view={view} chartClean={s.chart} />
              {view === 0 && (
                <>
                  {hotspot("flags", "递推算图", 33, 6, 35, 43)}
                  {!s.cloth && hotspot("cloth", "搪瓷杯", 15, 54, 19, 18)}
                  {hotspot("drawer", "小抽屉", 38, 65, 29, 22)}
                  {hotspot("log", "航海日志", 40, 50, 19, 14)}
                </>
              )}
              {view === 1 && (
                <>
                  {hotspot("chart", "海图", 16, 15, 53, 56)}
                  {hotspot("cabinet", "方向锁", 68, 48, 25, 37)}
                </>
              )}
              {view === 2 && (
                <>
                  {hotspot("postcard", "木条画", 7, 18, 25, 35)}
                  {hotspot("ship", "船模细缝", 34, 44, 44, 39)}
                </>
              )}
              {view === 3 && (
                <>
                  {hotspot("safe", "圆环匣", 13, 32, 32, 42)}
                  {hotspot("door", "甲板舱门", 51, 13, 31, 75)}
                </>
              )}
              <button
                className="escape-scene-arrow prev"
                onClick={() => move(-1)}
                aria-label="向左转"
              >
                <ArrowLeft />
              </button>
              <button
                className="escape-scene-arrow next"
                onClick={() => move(1)}
                aria-label="向右转"
              >
                <ArrowRight />
              </button>
            </div>
            <nav className="escape-views" aria-label="船舱视角">
              {rooms.map((r, i) => (
                <button
                  key={r}
                  aria-current={view === i ? "page" : undefined}
                  onClick={() => setView(i as View)}
                >
                  <span>0{i + 1}</span>
                  {r}
                </button>
              ))}
            </nav>
          </section>
          <div className="escape-status" role="status" aria-live="polite">
            <Compass size={19} />
            {message}
          </div>
          <section className="escape-bag">
            <div className="escape-bag-label">
              <span className="escape-eyebrow">随身物品</span>
              <small>
                {selected
                  ? `已选：${props[selected].name}`
                  : "点击选中 · 再到场景使用"}
              </small>
            </div>
            <div className="escape-items">
              {inventory(s).length === 0 ? (
                <p>背包还空着。值得留意的东西，不一定很起眼。</p>
              ) : (
                inventory(s).map((item) => (
                  <button
                    className={selected === item ? "selected" : ""}
                    aria-pressed={selected === item}
                    onClick={() => pick(item)}
                    key={item}
                  >
                    <span
                      className={`escape-item-icon item-${item}`}
                      aria-hidden="true"
                    >
                      {props[item].icon}
                    </span>
                    {props[item].name}
                  </button>
                ))
              )}
            </div>
            <button className="escape-notebook" onClick={() => open("notes")}>
              <BookOpen size={24} />
              <span>航海手记</span>
            </button>
          </section>
        </>
      )}
      <footer className="escape-footer">
        <span>{saveStatus} · 随时离开，下次继续</span>
        {(!renderCompletion || onSceneSelect) && <button onClick={() => open("reset")}>
          <RotateCcw size={13} /> 重新开始
        </button>}
      </footer>
      {detail && lock === null && (
        <Modal key={detail} title={titles[detail]} onClose={close}>
          {!["intro", "notes", "hints", "reset"].includes(detail) && inventory(s).length > 0 && <nav className="escape-modal-inventory" aria-label="近景随身物品">{inventory(s).map(item => <button key={item} aria-label={`选用${props[item].name}`} aria-pressed={selected === item} onClick={() => pick(item)}><span aria-hidden="true">{props[item].icon}</span>{props[item].name}</button>)}</nav>}
          {detail === "intro" && (
            <>
              <div className="escape-letter">
                <p>亲爱的旅人：</p>
                <p>
                  今晚的灯塔格外明亮。我把甲板钥匙收进了圆环匣，留下一点小小的考验。
                </p>
                <p>
                  记得那次晨航吗？石下的浪声，雾里的山峰，还有守塔人的灯。我把它们留在了这间温暖的船舱里。
                </p>
                <p className="signature">—— 航海员 林</p>
              </div>
              <p className="escape-instruction">
                点击物件探索；在背包选中道具后使用。两件合适的道具也能组合。没有倒计时。
                {assistance.hints && "需要时可主动查看提示。"}
              </p>
              <button
                className="escape-primary"
                onClick={() => {
                  dispatch({ type: "observe", clue: "letter" });
                  close();
                }}
              >
                开始探索 <ArrowRight size={17} />
              </button>
            </>
          )}
          {detail === "flags" && (
            <>
              <NavigationSumBoard
                scratch={scratch}
                onScratch={(cell, value) =>
                  setScratch({ ...scratch, [cell]: value })
                }
              />
              <p className="escape-instruction">
                算图已收入手记。
              </p>
            </>
          )}
          {detail === "log" && <VoyageLog />}
          {detail === "cloth" && <>
            <div className="escape-cup-discovery">
              {!cupMoved && !s.cloth ? <button className="escape-cup-target" aria-label="移开搪瓷杯" onClick={() => { setCupMoved(true); setMessage("杯底露出了一块折好的棉布。"); }}><svg viewBox="0 0 200 140" aria-hidden="true"><path d="M40 100L145 98L163 122L51 129Z" fill="#a5b9a1" /><path d="M61 29H126V87Q93 117 61 87Z" fill="#f1e3bd" stroke="#36575a" strokeWidth="4" /><path d="M127 40Q163 38 156 65Q150 83 129 77" fill="none" stroke="#36575a" strokeWidth="6" /><ellipse cx="94" cy="29" rx="32" ry="9" fill="#81654a" /></svg></button> : <button className="escape-cloth-target" aria-label="拿起软布" disabled={s.cloth} onClick={() => { act({ type: "takeCloth" }, "软布收进了背包。"); setSelected("cloth"); }}><span aria-hidden="true">▱</span>{s.cloth ? "软布已收好" : "折叠的棉布"}</button>}
            </div>
            <p>{cupMoved || s.cloth ? "棉布上留着一个浅浅的杯印。" : "杯子压着一角褪色的织物。"}</p>
          </>}
          {detail === "drawer" && (
            <>
              {s.drawer ? (
                <>
                  <div className="escape-found">
                    <Check /> 抽屉已经打开
                  </div>
                  <p>
                    里面的磁铁和日光徽章已经收进背包。徽章背面刻着：双光引航。
                  </p>
                </>
              ) : (
                <>
                  <p>黄铜锁下刻着三个图案。每个位置，只接受一个数字。</p>
                  <div className="escape-lock-order">
                    ★ <span>·</span> ☾ <span>·</span> ⚓
                  </div>
                  <label className="escape-field">
                    按「星、月、锚」的顺序输入
                    <input
                      aria-label="抽屉三位密码"
                      inputMode="numeric"
                      maxLength={3}
                      placeholder="···"
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.replace(/\D/g, "").slice(0, 3))
                      }
                    />
                  </label>
                  <button
                    className="escape-primary"
                    onClick={() =>
                      act(
                        { type: "drawer", code },
                        "咔哒！获得马蹄磁铁和日光徽章。",
                        "锁芯没有转动。再看看递推算图与锁上的符号顺序。",
                      )
                    }
                  >
                    试着打开
                  </button>
                </>
              )}
            </>
          )}
          {detail === "chart" && (
            <>
              {s.chart ? (
                <>
                  <RouteChart />
                  <p>盐霜下面，是航海员画下的近海地貌。</p>
                  {assistance.automaticRules && <p>看看航海日志的时间和小画，在海图上找到同样的地方。</p>}
                  <p className="escape-instruction">
                    海图已保留在手记中，可以随时查看。
                  </p>
                </>
              ) : (
                <>
                  <button className="escape-dirty-chart escape-physical-target" aria-label="擦去盐霜" onClick={() => {
                    if (!held("cloth")) { setMessage("盐霜粘在纸面上，指尖只留下浅浅的痕迹。"); return; }
                    act({ type: "cleanChart" }, "盐霜擦干净了，地貌显露出来。");
                    dispatch({ type: "observe", clue: "chart" });
                  }}>
                    <Compass size={76} />
                    <span>盐霜覆盖的纸面</span>
                  </button>
                  <p>纸张完好，白色盐霜却让人看不清地貌。</p>
                  {assistance.automaticRules && <p className="escape-instruction">选中软布，再点纸面擦拭。</p>}
                </>
              )}
            </>
          )}
          {detail === "cabinet" && (
            <>
              {s.cabinet ? (
                <>
                  <div className="escape-found">
                    <Check /> 柜门已经打开
                  </div>
                  <p>一卷细绳已放入背包。绳子很结实，也足够细。</p>
                </>
              ) : (
                <>
                  <p>
                    锁面上磨出了几道手指的痕迹，铜牌刻着「晨航」。
                  </p>
                  <output
                    className="escape-route-output"
                    aria-label="已输入航向"
                  >
                    {route || "· · · · ·"}
                  </output>
                  <div className="escape-direction-pad">
                    {["↑", "→", "↓", "←"].map((d) => (
                      <button
                        key={d}
                        aria-label={`航向${d}`}
                        disabled={route.length >= 5}
                        onClick={() => setRoute(route + d)}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <div className="escape-actions">
                    <button onClick={() => setRoute("")}>清空航向</button>
                    <button
                      className="escape-primary"
                      onClick={() =>
                        act(
                          { type: "cabinet", route },
                          "柜门打开了。获得一卷细绳。",
                          "锁舌轻响了一声，又弹回了原处。",
                        )
                      }
                    >
                      确认航线
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          {detail === "ship" && (
            <>
              <button className="escape-slot escape-physical-target" aria-label="探入船模细缝" onClick={() => {
                if (s.token2) { setMessage("船模内已经空了。"); return; }
                if (!held("fishingTool")) { setMessage("缝隙太深，碰不到里面的铁环。"); return; }
                act({ type: "retrieve" }, "磁铁吸住铁环，你稳稳提起了月光徽章！");
              }}>
                <span>细窄的船舱缝隙</span><i>{s.token2 ? "" : "☾"}</i>
              </button>
              <p>{s.token2 ? "船模里的徽章已经取出。" : "缝隙深处闪着一点银光：一枚挂着铁环的徽章。手指够不到，硬拉会碰坏船模。"}</p>
              {assistance.automaticRules && !s.token2 && <p className="escape-instruction">可在随身物品里组合工具，选中它再点船模的缝隙。</p>}
            </>
          )}
          {detail === "postcard" && (
            <WoodenPicture
              state={s}
              selected={selectedSlat}
              onSelect={setSelectedSlat}
              onPlace={(slot) => {
                if (selectedSlat === null) return;
                const action: Action = {
                  type: "placeSlat",
                  slat: selectedSlat,
                  slot,
                };
                const next = reduceEscape(s, action);
                dispatch(action);
                if (next !== s) {
                  setSelectedSlat(null);
                  setMessage("木条已放入，可继续调整整幅画。");
                }
              }}
              onRemove={(slot) => {
                dispatch({ type: "removeSlat", slot });
                setMessage("木条已放回下方，可以重新摆放。");
              }}
              onConfirm={() => {
                act({ type: "confirmPicture" }, "灯塔旧景重现！图画已收入手记。", "整幅画还没有吻合，可以拿下木条重新调整。");
              }}
            />
          )}
          {detail === "safe" && (
            <>
              {s.safe ? (
                <>
                  <div className="escape-prop-large">⚿</div>
                  <div className="escape-found">
                    <Check /> 圆环匣打开了
                  </div>
                  <p>你找到了一把黄铜钥匙。小木牌上写着「甲板」。</p>
                </>
              ) : !s.tokensInserted ? (
                <>
                  <button className="escape-token-slots escape-physical-target" aria-label="嵌入两枚徽章" onClick={() => {
                    if (!held("token1") && !held("token2")) { setMessage("铜面上留着一明一暗两个圆形凹槽。"); return; }
                    act({ type: "insertTokens" }, "两枚徽章嵌合，三道图环松动了。", "另一处凹槽还空着。");
                  }}><span>☼</span><span>☾</span></button>
                  <p>两个凹槽围住一幅错乱的灯塔画。刻字写着：「双光齐至，旧景重现。」</p>
                </>
              ) : (
                <>
                  <p>三道图环可以分别转动。匣上刻着：「双光齐至，旧景重现。」</p>
                  <PictureRings rings={s.rings} />
                  <div className="escape-ring-buttons">
                    {["外环", "中环", "内环"].map((r, i) => (
                      <button
                        key={r}
                        onClick={() =>
                          dispatch({ type: "rotate", ring: i as 0 | 1 | 2 })
                        }
                      >
                        <RotateCw size={15} />
                        {r}
                      </button>
                    ))}
                  </div>
                  <button
                    className="escape-primary"
                    onClick={() =>
                      act(
                        { type: "align" },
                        "灯塔的光连成一线。圆环匣打开，获得甲板钥匙！",
                        s.picture
                          ? (assistance.automaticRules ? "还有画面没有接上。看看灯塔、海平面与右上方的月亮。" : "锁扣没有松开，图画还没有复原。")
                          : "锁扣没有松开。刻字写着：旧景重现。",
                      )
                    }
                  >
                    按下中央锁扣
                  </button>
                  {s.seen.includes("postcard") && (
                    <details className="escape-reference">
                      <summary>展开手记里的木条画</summary>
                      <LighthouseArt />
                    </details>
                  )}
                </>
              )}
            </>
          )}
          {detail === "door" && (
            <>
              <button className="escape-door-lock escape-physical-target" aria-label="转动钥匙" onClick={() => {
                if (!held("key")) { setMessage("钥匙孔被海风磨得光亮。"); return; }
                act({ type: "unlockDoor" }, "甲板舱门打开了！");
                if (s.safe) close();
              }}><svg viewBox="0 0 180 170" aria-hidden="true"><rect x="39" y="12" width="102" height="146" rx="48" fill="#bc9753" stroke="#664b2a" strokeWidth="5" /><circle cx="90" cy="73" r="18" fill="#253c3c" /><path d="M83 80L76 115H104L97 80" fill="#253c3c" /><circle cx="90" cy="30" r="4" fill="#775c36" /><circle cx="90" cy="140" r="4" fill="#775c36" /></svg></button>
              <p>门缝里透进海风。门上的木牌写着：「把好奇心带上甲板。」</p>
            </>
          )}
          {detail === "notes" && (
            <div className="escape-notes">
              <p>发现的线索会留在这里。没有看过的地方，仍值得探索。</p>
              {s.seen.includes("letter") && (
                <article>
                  <h3>航海员的邀请</h3>
                  <p>
                    甲板钥匙在圆环匣里。航海员还记着晨航时的浪声、山峰和灯光。
                  </p>
                </article>
              )}
              {s.seen.includes("flags") && (
                <article>
                  <h3>递推算图</h3>
                  <NavigationSumBoard
                    scratch={scratch}
                    onScratch={(cell, value) =>
                      setScratch({ ...scratch, [cell]: value })
                    }
                  />

                </article>
              )}
              {s.seen.includes("log") && <article><h3>晨航日志</h3><VoyageLog /></article>}
              {s.chart && (
                <article>
                  <h3>擦净的海图</h3>
                  <RouteChart />

                </article>
              )}
              {s.seen.includes("slot") && (
                <article>
                  <h3>船模里的银光</h3>
                  <p>狭窄缝隙深处，有一枚带铁环的徽章。</p>
                </article>
              )}
              {s.seen.includes("postcard") && (
                <article>
                  <h3>灯塔木条画</h3>
                  <div className="escape-postcard">
                    <LighthouseArt />
                  </div>
                </article>
              )}
              {!s.seen.length && !s.chart && (
                <p>第一条线索，正等着你去发现。</p>
              )}
            </div>
          )}
          {detail === "hints" && assistance.hints && (
            <HintPanel mode={mode} state={s} level={hintLevel} onNext={() => setHintLevel(hintLevel + 1)} />
          )}
          {detail === "reset" && (
            <>
              <p>这会清除本关的道具和解谜进度。其他游戏的记录不会改变。</p>
              <div className="escape-actions">
                <button onClick={close}>保留这次航行</button>
                <button
                  className="escape-primary"
                  onClick={() => {
                    dispatch({ type: "reset" });
                    setRevisiting(false);
                    setCupMoved(false);
                    setSelected(null);
                    setScratch({});
                    setSelectedSlat(null);
                    setCode("");
                    setRoute("");
                    setHintLevel(0);
                    setView(0);
                    setDetail("intro");
                    setMessage("新的航行开始了。");
                  }}
                >
                  确认重新开始
                </button>
              </div>
            </>
          )}
          {!["intro", "notes", "hints", "reset"].includes(detail) && (
            <p className="escape-modal-status" role="status">
              {message}
            </p>
          )}
        </Modal>
      )}
    </main>
    </GuidanceProvider>
  );
}
