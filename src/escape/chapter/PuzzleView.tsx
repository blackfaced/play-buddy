import { useId, useState } from "react";
import type { GuidanceMode } from "../guidancePolicy";
import type {
  ChapterAction,
  PuzzleDefinition,
  PuzzleInput,
  PuzzleProgress,
  Cell,
} from "./types";
import { simulateDrops, rotateCells, placePiece } from "./validators";

interface Props {
  puzzle: PuzzleDefinition;
  progress: PuzzleProgress;
  mode: GuidanceMode;
  onAction: (action: ChapterAction) => void;
}

function PieceDrawing({
  cells,
  label,
}: {
  cells: readonly Cell[];
  label: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={label}
      className="chapter-piece-art"
    >
      {cells.map(([x, y], index) => (
        <rect
          key={index}
          x={10 + x * 20}
          y={10 + y * 20}
          width="18"
          height="18"
          rx="3"
        />
      ))}
    </svg>
  );
}

export default function PuzzleView({
  puzzle,
  progress,
  mode,
  onAction,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [cell, setCell] = useState<number | null>(null);
  const lensClip = useId().replace(/:/g, "");
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
            <div className="chapter-piece-tray" aria-label="可用图形">
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
                    onClick={() => setSelected(piece.id)}
                    className="chapter-shape"
                  >
                    <span aria-hidden="true">{piece.symbol}</span>
                    <small>{piece.label}</small>
                  </button>
                ))}
            </div>
            <p className="chapter-controls-note">
              先选图形，再点位置。已放下的图形可以换位置；选中格子里的图形后，可移回托盘。
            </p>
            <div className="chapter-arrangement">
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
                    {piece && (
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
            </div>
          </>
        )}
        {puzzle.kind === "code" && input.kind === "code" && (
          <>
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
                        aria-label={`${animal.name}标本，观察足的数量`}
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
            <div className="chapter-lenses" aria-label="放大镜滤片">
              <button
                aria-pressed={input.lens === null}
                onClick={() => change({ ...input, lens: null })}
              >
                裸眼观察
              </button>
              {puzzle.lenses.map((lens) => (
                <button
                  key={lens.id}
                  aria-pressed={input.lens === lens.id}
                  onClick={() => change({ ...input, lens: lens.id })}
                >
                  <span style={{ color: lens.color }}>{lens.symbol}</span>{" "}
                  {lens.name}
                </button>
              ))}
            </div>
            <div
              className="chapter-lens-paper"
              data-lens={input.lens ?? "none"}
            >
              <span className="chapter-paper-label">雾灯检修纸 · 交叠墨迹</span>
              <svg
                className="chapter-lens-window"
                viewBox="0 0 600 300"
                role="img"
                aria-label={
                  input.lens
                    ? `${puzzle.lenses.find((lens) => lens.id === input.lens)?.name}下的检修纸`
                    : "裸眼看到交叠墨迹"
                }
              >
                <defs>
                  <clipPath id={lensClip}>
                    <circle cx="285" cy="135" r="116" />
                  </clipPath>
                </defs>
                <rect
                  x="6"
                  y="6"
                  width="588"
                  height="276"
                  rx="12"
                  fill="#ead9ad"
                />
                <g opacity=".4" aria-hidden="true">
                  {puzzle.lenses.map((lens, index) => (
                    <text
                      key={lens.id}
                      x="60"
                      y={90 + index * 50}
                      fill={lens.color}
                      fontSize="32"
                      transform={`rotate(${index * 5 - 5} 300 150)`}
                    >
                      {lens.symbol} ╱╲ ╳ ╱╲ ╳ ╱╲ {lens.symbol}
                    </text>
                  ))}
                </g>
                {input.lens && (
                  <g clipPath={`url(#${lensClip})`}>
                    <rect
                      x="150"
                      y="0"
                      width="280"
                      height="280"
                      fill="#fff4d7"
                    />
                    {puzzle.lenses.map((lens) => (
                      <g
                        key={lens.id}
                        data-layer={lens.id}
                        visibility={
                          input.lens === lens.id ? "visible" : "hidden"
                        }
                        aria-hidden={input.lens !== lens.id}
                        fill={lens.color}
                      >
                        <text x="285" y="95" textAnchor="middle" fontSize="34">
                          {lens.symbol}
                        </text>
                        <text x="285" y="152" textAnchor="middle" fontSize="48">
                          {lens.clue}
                        </text>
                        <text x="285" y="199" textAnchor="middle" fontSize="24">
                          {lens.marks.join(" → ")}
                        </text>
                      </g>
                    ))}
                  </g>
                )}
                <path
                  d="M370 219L421 278"
                  stroke="#75502e"
                  strokeWidth="24"
                  strokeLinecap="round"
                />
                <circle
                  cx="285"
                  cy="135"
                  r="118"
                  fill="none"
                  stroke={
                    puzzle.lenses.find((lens) => lens.id === input.lens)
                      ?.color ?? "#a38049"
                  }
                  strokeWidth="12"
                />
              </svg>
              {input.lens &&
                puzzle.lenses
                  .filter((lens) => lens.id === input.lens)
                  .map((lens) => (
                    <p className="chapter-source-strip" key={lens.id}>
                      {lens.symbol} {lens.name} · {lens.clue} ·{" "}
                      {lens.marks.join(" → ")}
                    </p>
                  ))}
            </div>
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
          <div className="chapter-prediction-boards">
            {puzzle.boards.map((board, boardIndex) => {
              const { model, placement } = board;
              const piece = model.pieces.find(
                (p) => p.id === placement.pieceId,
              )!;
              const shape = rotateCells(piece.cells, placement.rotation);
              const initial = shape.map(
                ([x, y]) => [x + placement.column, y] as Cell,
              );
              const landed = progress.solved
                ? (simulateDrops(model, [placement]).landed[0]?.cells ?? [])
                : [];
              return (
                <section className="chapter-prediction" key={board.id}>
                  <h3>{board.label}</h3>
                  <div className="chapter-drop-piece-label">
                    <PieceDrawing
                      cells={shape}
                      label={`${piece.id}：${piece.label}`}
                    />
                    <span>
                      {piece.id} · {piece.label}
                      <br />↓ 直落
                    </span>
                  </div>
                  <div className="chapter-numbered-board">
                    <div className="chapter-row-numbers" aria-hidden="true">
                      {Array.from({ length: model.height }, (_, y) => (
                        <span key={y}>{y + 1}</span>
                      ))}
                    </div>
                    <div
                      className="chapter-drop-board"
                      style={{
                        gridTemplateColumns: `repeat(${model.width}, 1fr)`,
                      }}
                      aria-label={`${board.label}落块图`}
                    >
                      {Array.from(
                        { length: model.width * model.height },
                        (_, index) => {
                          const x = index % model.width,
                            y = Math.floor(index / model.width);
                          const fixed = model.fixed.some(
                            (c) => c[0] === x && c[1] === y,
                          );
                          const falling =
                            !progress.solved &&
                            initial.some((c) => c[0] === x && c[1] === y);
                          const occupied = landed.some(
                            (c) => c[0] === x && c[1] === y,
                          );
                          return (
                            <span
                              key={index}
                              className={
                                fixed
                                  ? "fixed"
                                  : falling
                                    ? "falling"
                                    : occupied
                                      ? "occupied"
                                      : ""
                              }
                              aria-label={`第${y + 1}行第${x + 1}列，${fixed ? "固定块" : falling ? "起始积木" : occupied ? "落定积木" : "空格"}`}
                            >
                              {fixed
                                ? "▧"
                                : falling || occupied
                                  ? piece.id
                                  : ""}
                            </span>
                          );
                        },
                      )}
                    </div>
                  </div>
                  <label>
                    预测最下沿所在行
                    <select
                      aria-label={`${board.label}预测行`}
                      value={input.predictions[boardIndex]}
                      onChange={(event) =>
                        change({
                          kind: "drop",
                          predictions: input.predictions.map((v, i) =>
                            i === boardIndex ? Number(event.target.value) : v,
                          ),
                        })
                      }
                    >
                      <option value={0}>尚未选择</option>
                      {Array.from({ length: model.height }, (_, i) => (
                        <option key={i} value={i + 1}>
                          第 {i + 1} 行
                        </option>
                      ))}
                    </select>
                  </label>
                </section>
              );
            })}
            <p className="chapter-controls-note">
              三块积木分别直落，不旋转、不横移、不消行。选出各自最下沿最后所在的行，准备好后一起确认。
            </p>
          </div>
        )}
        {puzzle.kind === "sudoku" && input.kind === "sudoku" && (
          <>
            <div
              className="chapter-sudoku"
              role="group"
              aria-label="四乘四数独"
            >
              {input.cells.map((value, index) => (
                <button
                  key={index}
                  className={`${puzzle.givens[index] ? "given" : ""}${cell === index ? " selected" : ""}`}
                  aria-label={`第${Math.floor(index / 4) + 1}行第${(index % 4) + 1}列，${value || "空"}${puzzle.givens[index] ? "，固定" : ""}`}
                  aria-pressed={cell === index}
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
            <div className="chapter-number-pad" aria-label="填写或擦除">
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
            </div>
            <p className="chapter-controls-note">
              选一个空格，再点数字。键盘也可输入 1–4，Delete
              擦除；整张棋盘一起检查。
            </p>
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
