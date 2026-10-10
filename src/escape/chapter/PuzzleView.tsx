import DropPuzzleView from "./DropPuzzleView";
import { StampArt, FrameSeal } from "./PatternArt";
import LensMap from "./LensMap";
import { useState } from "react";
import type { GuidanceMode } from "../guidancePolicy";
import type {
  ChapterAction,
  PuzzleDefinition,
  PuzzleInput,
  PuzzleProgress,
} from "./types";
import { placePiece } from "./validators";

interface Props {
  puzzle: PuzzleDefinition;
  progress: PuzzleProgress;
  mode: GuidanceMode;
  onAction: (action: ChapterAction) => void;
}

export default function PuzzleView({
  puzzle,
  progress,
  mode,
  onAction,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [cell, setCell] = useState<number | null>(null);
  const input = progress.input;
  const change = (next: PuzzleInput) =>
    onAction({ type: "input", id: puzzle.id, input: next });
  return (
    <section className="chapter-puzzle" aria-label={puzzle.title}>
      <p className="chapter-inscription">{puzzle.inscription}</p>
      {mode === "easy" && (
        <p className="chapter-help" data-guidance="rule">
          {puzzle.easyHelp}
        </p>
      )}
      <fieldset disabled={progress.solved && puzzle.kind !== "filter"}>
        <legend className="chapter-sr-only">操作{puzzle.title}</legend>
        {puzzle.kind === "arrangement" && input.kind === "arrangement" && (
          <>
            {puzzle.rows && (
              <div
                className="chapter-pattern-sources"
                aria-label="刻在木盘上的图案"
              >
                {puzzle.rows.map((row) => (
                  <div key={row.label}>
                    <strong>{row.label}</strong>
                    <div>
                      {row.sequence.map((symbol, index) => (
                        <span
                          key={index}
                          className={symbol === null ? "blank" : ""}
                        >
                          {symbol ?? "?"}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!progress.solved && <div className="chapter-piece-tray" aria-label="可用图形">
              {[...puzzle.pieces]
                .sort(
                  (a, b) =>
                    ((puzzle.pieces.indexOf(a) * 5 + 3) %
                      puzzle.pieces.length) -
                    ((puzzle.pieces.indexOf(b) * 5 + 3) % puzzle.pieces.length),
                )
                .map((piece) => (
                  <button
                    key={piece.id}
                    aria-pressed={selected === piece.id}
                    onClick={() => { setSelected(piece.id); setSelectedSlot(null); }}
                    className="chapter-shape"
                  >
                    {piece.stamp ? <StampArt stamp={piece.stamp} /> : <span aria-hidden="true">{piece.symbol}</span>}
                    <small>{piece.label}</small>
                  </button>
                ))}
            </div>}
            {!progress.solved && <p className="chapter-controls-note chapter-sr-only">
              先选图形，再点位置。已放下的图形可以换位置；选中格子里的图形后，可用下方按钮移回托盘。
            </p>}
            {puzzle.grid ? <div className="chapter-maker-frame" aria-label="左上斜切角、右下双铆钉的纹片铜框"><div className="chapter-pattern-grid">
              {puzzle.grid.map((entry,index) => {
                if ('stamp' in entry) return <div className="chapter-pattern-fixed" key={index} aria-label={`第${Math.floor(index/4)+1}行第${index%4+1}列，固定纹片`}><StampArt stamp={entry.stamp} /></div>;
                const slot=entry.slot;
                const piece=puzzle.pieces.find(p=>p.id===input.slots[slot]);
                return <div className="chapter-pattern-cell" key={index}>
                  <button className="chapter-slot" aria-pressed={!progress.solved && selectedSlot === slot} aria-label={`${puzzle.slots[slot]}：${piece?.label ?? '空'}`} onClick={()=>{
                    setSelectedSlot(slot);
                    if(!selected || selected === piece?.id){setSelected(piece?.id ?? null);return;}
                    change(placePiece(input,selected,slot));
                    setSelected(null);
                  }}>{piece?.stamp ? <StampArt stamp={piece.stamp}/> : <span aria-hidden="true">·</span>}</button>
                </div>;
              })}
            </div></div> : (            <div className="chapter-arrangement">
              {puzzle.slots.map((slot, index) => {
                const piece = puzzle.pieces.find(
                  (p) => p.id === input.slots[index],
                );
                return (
                  <div key={slot}>
                    <button
                      className="chapter-slot"
                      aria-label={`${slot}：${piece?.label ?? "空"}`}
                      onClick={() => {
                        if (!selected) {
                          setSelected(piece?.id ?? null);
                          return;
                        }
                        change(placePiece(input, selected, index));
                      }}
                    >
                      <span aria-hidden="true">{piece?.symbol ?? "·"}</span>
                      <small>{slot}</small>
                    </button>
                    {piece && !progress.solved && (
                      <button
                        className="chapter-remove"
                        aria-label={`取回${slot}的${piece.label}`}
                        onClick={() =>
                          change({
                            kind: "arrangement",
                            slots: input.slots.map((v, i) =>
                              i === index ? null : v,
                            ),
                          })
                        }
                      >
                        取回
                      </button>
                    )}
                  </div>
                );
              })}
            </div>)}
            {puzzle.grid && !progress.solved && selectedSlot !== null && input.slots[selectedSlot] && (
              <div className="chapter-piece-actions" role="group" aria-label="纹片操作">
                <span>{puzzle.slots[selectedSlot]}已选中</span>
                <button className="chapter-remove" aria-label={`取回${puzzle.slots[selectedSlot]}的${puzzle.pieces.find(piece => piece.id === input.slots[selectedSlot])?.label}`} onClick={() => {
                  change({kind: 'arrangement', slots: input.slots.map((value, index) => index === selectedSlot ? null : value)});
                  setSelected(null);
                  setSelectedSlot(null);
                }}>取回选中纹片</button>
              </div>
            )}
          </>
        )}
        {puzzle.kind === "code" && input.kind === "code" && (
          <>
            {puzzle.frameSeal && <FrameSeal />}
            {puzzle.animals && (
              <div className="chapter-animal-scene" aria-label="动物观察图">
                {puzzle.animals.flatMap((animal) =>
                  Array.from({ length: animal.count }, (_, index) => (
                    <figure
                      className={`chapter-specimen animal-${animal.id}`}
                      key={`${animal.id}-${index}`}
                    >
                      <svg
                        viewBox="0 0 180 160"
                        role="img"
                        aria-label={`${animal.name}标本，${animal.legs}条腿${animal.id === "bird" ? "，一侧可见翅膀与喙" : animal.id === "ant" ? "，头上有两根触角" : animal.id === "turtle" ? "，背上有龟甲" : "，圆形躯干"}`}
                      >
                        <ellipse
                          cx="90"
                          cy="139"
                          rx="65"
                          ry="7"
                          fill="#967341"
                          opacity=".15"
                        />
                        {Array.from({ length: animal.legs / 2 }, (_, leg) => (
                          <g
                            key={leg}
                            fill="none"
                            stroke="#49392b"
                            strokeWidth="5"
                            strokeLinecap="round"
                          >
                            <path
                              d={`M${72 - leg * 2} ${65 + leg * 14} L${45 - leg * 4} ${68 + leg * 17} L${35 - leg * 4} ${86 + leg * 16}`}
                            />
                            <path
                              d={`M${108 + leg * 2} ${65 + leg * 14} L${135 + leg * 4} ${68 + leg * 17} L${145 + leg * 4} ${86 + leg * 16}`}
                            />
                          </g>
                        ))}
                        <ellipse
                          cx="90"
                          cy="91"
                          rx={animal.id === "ant" ? 15 : 28}
                          ry={animal.id === "bird" ? 37 : 29}
                          fill={animal.id === "turtle" ? "#788361" : "#77604a"}
                          stroke="#49392b"
                          strokeWidth="3"
                        />
                        <circle
                          cx="90"
                          cy="48"
                          r={animal.id === "ant" ? 15 : 19}
                          fill="#a89167"
                          stroke="#49392b"
                          strokeWidth="3"
                        />
                        <circle cx="84" cy="45" r="2.5" fill="#302c25" />
                        <circle cx="97" cy="45" r="2.5" fill="#302c25" />
                        {animal.id === "bird" && (
                          <>
                            <path d="M108 47L125 52L108 56" fill="#b98b3e" />
                            <path
                              d="M77 81Q54 67 64 104L86 107"
                              fill="#ad9875"
                              stroke="#49392b"
                              strokeWidth="2"
                            />
                          </>
                        )}
                        {animal.id === "ant" && (
                          <>
                            <path
                              d="M81 35L67 21M98 35L110 19"
                              stroke="#49392b"
                              strokeWidth="3"
                            />
                            <ellipse
                              cx="90"
                              cy="116"
                              rx="19"
                              ry="17"
                              fill="#65513e"
                            />
                          </>
                        )}
                        {animal.id === "turtle" && (
                          <path
                            d="M90 68L109 82L107 106L88 118L71 101L71 82Z"
                            fill="none"
                            stroke="#d1bd86"
                            strokeWidth="2"
                          />
                        )}
                      </svg>
                      <figcaption>{animal.name}</figcaption>
                    </figure>
                  )),
                )}
              </div>
            )}
            <label className="chapter-code-label">
              转动密码盘
              <input
                aria-label={`${puzzle.title}密码`}
                inputMode="numeric"
                autoComplete="off"
                maxLength={puzzle.length}
                value={input.value}
                onChange={(event) =>
                  change({
                    kind: "code",
                    value: event.target.value
                      .replace(/\D/g, "")
                      .slice(0, puzzle.length),
                  })
                }
              />
            </label>
          </>
        )}
        {puzzle.kind === "filter" && input.kind === "filter" && (
          <>
            <LensMap puzzle={puzzle} input={input} onChange={change} />
            <label className="chapter-code-label">
              检修盘
              <input
                aria-label={`${puzzle.title}密码`}
                disabled={progress.solved}
                inputMode="numeric"
                maxLength={puzzle.length}
                value={input.value}
                onChange={(event) =>
                  change({
                    ...input,
                    value: event.target.value
                      .replace(/\D/g, "")
                      .slice(0, puzzle.length),
                  })
                }
              />
            </label>
          </>
        )}
        {puzzle.kind === "drop" && input.kind === "drop" && (
          <DropPuzzleView puzzle={puzzle} input={input} solved={progress.solved} change={change}/>
        )}
        {puzzle.kind === "sudoku" && input.kind === "sudoku" && (
          <>
            <div className="chapter-maker-frame chapter-tide-frame" aria-label="左上斜切角、右下双铆钉的潮汐铜框"><div
              className="chapter-sudoku"
              role="group"
              aria-label="四乘四数独"
            >
              {input.cells.map((value, index) => (
                <button
                  key={index}
                  className={`${puzzle.givens[index] ? "given" : ""}${!progress.solved && cell === index ? " selected" : ""}`}
                  aria-label={`第${Math.floor(index / 4) + 1}行第${(index % 4) + 1}列，${value || "空"}${puzzle.givens[index] ? "，固定" : ""}`}
                  aria-pressed={!progress.solved && cell === index}
                  disabled={!!puzzle.givens[index]}
                  onClick={() => setCell(index)}
                  onKeyDown={(event) => {
                    if (
                      /^[1-4]$/.test(event.key) ||
                      event.key === "Backspace" ||
                      event.key === "Delete"
                    ) {
                      event.preventDefault();
                      change({
                        kind: "sudoku",
                        cells: input.cells.map((v, i) =>
                          i === index
                            ? /^[1-4]$/.test(event.key)
                              ? Number(event.key)
                              : 0
                            : v,
                        ),
                      });
                    }
                  }}
                >
                  {value || ""}
                </button>
              ))}
            </div>
            </div>{!progress.solved && <div className="chapter-number-pad" aria-label="填写或擦除">
              {[1, 2, 3, 4, 0].map((value) => (
                <button
                  key={value}
                  disabled={cell === null}
                  onClick={() =>
                    change({
                      kind: "sudoku",
                      cells: input.cells.map((v, i) =>
                        i === cell ? value : v,
                      ),
                    })
                  }
                >
                  {value || "擦除"}
                </button>
              ))}
            </div>}
            {!progress.solved && <p className="chapter-controls-note chapter-sr-only">
              选一个空格，再点数字。键盘也可输入 1–4，Delete
              擦除；整张棋盘一起检查。
            </p>}
          </>
        )}
        {puzzle.kind === "search" && (
          <p>在房间里找到检修清单上的物件，再回来检查收集结果。</p>
        )}
      </fieldset>
      <div className="chapter-actions chapter-confirmation">
        <button
          className="chapter-primary"
          disabled={progress.solved}
          onClick={() => onAction({ type: "confirm", id: puzzle.id })}
        >
          {progress.solved ? "机关已完成" : "确认整个机关"}
        </button>
        {!progress.solved && (
          <>
            <button
              disabled={!progress.undo.length}
              onClick={() => onAction({ type: "undo", id: puzzle.id })}
            >
              撤销
            </button>
            <button
              disabled={!progress.redo.length}
              onClick={() => onAction({ type: "redo", id: puzzle.id })}
            >
              重做
            </button>
            <button
              onClick={() => onAction({ type: "resetPuzzle", id: puzzle.id })}
            >
              重置这个机关
            </button>
          </>
        )}
      </div>
      {progress.solved && <p className="chapter-success">{puzzle.success}</p>}
      {mode !== "challenge" && (
        <section className="chapter-hints" aria-label="可选提示">
          {puzzle.hints.slice(0, progress.hints).map((hint, index) => (
            <p key={index}>{hint}</p>
          ))}
          {!progress.solved && (
            <button
              disabled={progress.hints >= puzzle.hints.length}
              onClick={() => onAction({ type: "hint", id: puzzle.id, mode })}
            >
              {progress.hints === 0
                ? "给我一点方向"
                : progress.hints >= puzzle.hints.length
                  ? "已显示全部提示"
                  : "再看一步提示"}
            </button>
          )}
        </section>
      )}
    </section>
  );
}
