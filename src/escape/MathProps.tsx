import { EasyGuidance } from "./Guidance";
import { NAVIGATION_GIVENS } from "./puzzleVisuals";
import { LighthouseArt, LighthouseSlice } from "./RoomArt";
import { SLATS, SLOT_NUMBERS, isPictureFull, type EscapeState } from "./logic";

/** The hanging navigation board is also reproduced in the discovered notes. */
export function NavigationSumBoard({
  scratch,
  onScratch,
}: {
  scratch: Record<string, string>;
  onScratch: (cell: string, value: string) => void;
}) {
  return (
    <div className="escape-sum-board">
      <p className="escape-eyebrow">航海员的递推记录</p>
      <div className="escape-number-triangle" aria-label="五行直角三角算图">
        {NAVIGATION_GIVENS.map((row, r) =>
          row.map((value, c) => {
            const cell = `${r}-${c}`;
            const editable = value === "?" || /[★☾⚓]/.test(value);
            const symbol = (
              { "★": "星", "☾": "月", "⚓": "锚" } as Record<string, string>
            )[value];
            return (
              <div
                key={cell}
                className={`escape-number-cell ${symbol ? "symbol" : ""}`}
                style={{ gridColumn: c + 1, gridRow: r + 1 }}
              >
                {editable ? (
                  <label>
                    <span aria-hidden="true">{symbol ? value : "·"}</span>
                    <input
                      aria-label={`第${r + 1}行第${c + 1}格${symbol ? `，${symbol}` : "，草稿"}`}
                      inputMode="numeric"
                      maxLength={2}
                      placeholder="?"
                      value={scratch[cell] ?? ""}
                      onChange={(event) =>
                        onScratch(
                          cell,
                          event.target.value.replace(/\D/g, "").slice(0, 2),
                        )
                      }
                    />
                  </label>
                ) : (
                  <span aria-label={`第${r + 1}行第${c + 1}格，${value}`}>
                    {value}
                  </span>
                )}
              </div>
            );
          }),
        )}
      </div>
      <p className="escape-instruction">
        可以在空格里记草稿，合上近景也会保留。符号代表缺失的数字；草稿不会自动判对错。
      </p>
      <EasyGuidance>
      <p>航海员的规则：第一列是起始数；其余每格 = 左边一格 + 左上方一格。</p>
      <p className="escape-instruction">
        例如图中第三行的 5 = 左边的 3 + 左上方的
        2。先补上方的空格，再从底行最右的 44 向左倒推。符号也代表缺失的数字。
      </p>
      <div
        className="escape-parent-example"
        aria-label="示例：左上方2，加左边3，得到5"
      >
        <span>2 ↘</span>
        <span>3 → 5</span>
      </div>
      </EasyGuidance>
    </div>
  );
}

export function WoodenPicture({
  state,
  selected,
  onSelect,
  onPlace,
  onRemove,
  onConfirm,
}: {
  state: EscapeState;
  selected: number | null;
  onSelect: (index: number | null) => void;
  onPlace: (slot: number) => void;
  onRemove: (slot: number) => void;
  onConfirm: () => void;
}) {
  if (state.picture)
    return (
      <>
        <div className="escape-postcard">
          <LighthouseArt />
        </div>
        <p>
          木条严丝合缝。褪色的画里，灯塔映着月光，海平线伸向远方。图画已收入手记。
        </p>
      </>
    );
  return (
    <>
      <p>
        海风打散了这幅木条画。航海员在每根木条上刻下数字，框边的小铜牌标着槽位编号。
      </p>
      <p className="sr-only">
        先选木条，再点槽位放入；空手点已放的木条可以拿下。有木条在手时点击已占槽位，会把原木条放回下方。放满五格后按「确认整幅画」。也可以用 Tab 和回车操作。
      </p>
      <EasyGuidance><p>同一根木条上的数字，每次增加相同的数；补出的下一个数就是槽位编号。</p></EasyGuidance>
      <div className="escape-wood-frame" aria-label="五个带编号的木条槽位">
        {SLOT_NUMBERS.map((slot, index) => {
          const piece = state.slats[index];
          return <button
            key={slot}
            className={`escape-wood-slot ${piece !== null ? "filled" : ""}`}
            aria-label={`槽位 ${slot}${piece !== null ? `，木条 ${SLATS[piece].join("、")}，${selected === null ? "点击拿下" : "点击替换"}` : "，空槽"}`}
            disabled={piece === null && selected === null}
            onClick={() => selected === null ? onRemove(slot) : onPlace(slot)}
          >
            <span className="escape-slot-number">{slot}</span>
            <span className="escape-strip-image">
              {piece !== null ? <LighthouseSlice index={piece} /> : <span>木条凹槽</span>}
            </span>
          </button>;
        })}
      </div>
      <p className="escape-selected-slat sr-only" role="status">
        {selected === null
          ? "先从下面拿起一根木条。"
          : `手中的木条：${SLATS[selected].join("、")}、？ 它应该放在哪个槽位？`}
      </p>
      <div className="escape-loose-slats" aria-label="散落的木条">
        {[3, 0, 4, 1, 2]
          .filter((index) => !state.slats.includes(index))
          .map((index) => (
            <button
              key={index}
              className="escape-wood-piece"
              aria-label={`木条 ${SLATS[index].join("、")}、？`}
              aria-pressed={selected === index}
              onClick={() => onSelect(selected === index ? null : index)}
            >
              <span className="escape-piece-image">
                <LighthouseSlice index={index} />
              </span>
              <span className="escape-piece-sequence">
                {SLATS[index].join(" · ")} · ?
              </span>
            </button>
          ))}
      </div>
      <button className="escape-primary" disabled={!isPictureFull(state.slats)} onClick={onConfirm}>确认整幅画</button>
    </>
  );
}
