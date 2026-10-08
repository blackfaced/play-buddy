import assert from "node:assert/strict";
import {
  initialState,
  reduceEscape,
  parseSave,
  serializeSave,
  SLATS,
  SLOT_NUMBERS,
  nextSlatNumber,
  triangleCode,
  triangleRows,
  inventory,
  CLUES,
  SAVE_KEY,
  type EscapeState,
  type Action,
} from "../src/escape/logic";

assert.equal(
  SAVE_KEY,
  "play-buddy:escape:starlight:v1",
  "Upgrade reads the original storage key",
);
assert.equal(JSON.parse(serializeSave(initialState())).version, 2);
assert.equal(triangleCode(), "375");
assert.deepEqual(triangleRows([1, 2, 3, 4, 1]), [
  [1],
  [2, 3],
  [3, 5, 8],
  [4, 7, 12, 20],
  [1, 5, 12, 24, 44],
]);
// The unknown bottom-left cell contributes exactly x + 43 to the final cell.
// This also checks subtraction backwards rather than only one lucky solution.
for (let x = -100; x <= 100; x++) {
  const rows = triangleRows([1, 2, 3, 4, x]);
  assert.equal(rows[4][4], x + 43);
  assert.equal(rows[4][4] === 44, x === 1);
  for (let r = 1; r < rows.length; r++)
    for (let c = 1; c <= r; c++)
      assert.equal(rows[r][c] - rows[r - 1][c - 1], rows[r][c - 1]);
}
assert.deepEqual(SLATS.map(nextSlatNumber), SLOT_NUMBERS);
assert.equal(new Set(SLOT_NUMBERS).size, 5);
for (const sequence of SLATS)
  assert.equal(sequence[1] - sequence[0], sequence[2] - sequence[1]);
for (let code = 0; code <= 999; code++)
  assert.equal(
    reduceEscape(initialState(), {
      type: "drawer",
      code: String(code).padStart(3, "0"),
    }).drawer,
    code === 375,
  );

function* permutations(values: number[]): Generator<number[]> {
  if (!values.length) {
    yield [];
    return;
  }
  for (const [index, value] of values.entries())
    for (const rest of permutations(values.filter((_, i) => i !== index)))
      yield [value, ...rest];
}
let orders = 0;
for (const order of permutations([0, 1, 2, 3, 4])) {
  let state = initialState();
  for (const [step, slat] of order.entries()) {
    assert.deepEqual(
      reduceEscape(state, { type: "observe", clue: "postcard" }),
      state,
      "Unfinished picture cannot enter notes",
    );
    for (const wrong of SLOT_NUMBERS.filter(
      (slot) => slot !== SLOT_NUMBERS[slat],
    )) {
      const failed = reduceEscape(state, {
        type: "placeSlat",
        slat,
        slot: wrong,
      });
      assert.deepEqual(
        failed,
        state,
        "Wrong placements preserve every prop and previous placement",
      );
      assert.deepEqual(inventory(failed), inventory(state));
    }
    state = reduceEscape(state, {
      type: "placeSlat",
      slat,
      slot: SLOT_NUMBERS[slat],
    });
    assert.equal(state.picture, step === 4);
    assert.equal(state.seen.includes("postcard"), step === 4);
    assert.deepEqual(parseSave(serializeSave(state)), state);
    assert.deepEqual(
      reduceEscape(state, {
        type: "placeSlat",
        slat,
        slot: SLOT_NUMBERS[slat],
      }),
      state,
    );
  }
  assert.deepEqual(reduceEscape(state, { type: "reset" }), initialState());
  orders++;
}
assert.equal(orders, 120);
for (const slat of [-1, 5, 0.5, NaN, Infinity])
  assert.deepEqual(
    reduceEscape(initialState(), { type: "placeSlat", slat, slot: 12 }),
    initialState(),
  );
for (const slot of [-1, 0, 12.5, NaN, Infinity])
  assert.deepEqual(
    reduceEscape(initialState(), { type: "placeSlat", slat: 0, slot }),
    initialState(),
  );

// Frozen original-v1 contract, deliberately independent of the v2 reducer.
// It models the original freely observable postcard and original drawer code.
type LegacyState = Omit<EscapeState, "picture" | "slats">;
const legacyInitial: LegacyState = {
  cloth: false,
  chart: false,
  drawer: false,
  cabinet: false,
  combined: false,
  token2: false,
  tokensInserted: false,
  rings: [1, 2, 3],
  safe: false,
  escaped: false,
  seen: [],
};
function legacyReduce(s: LegacyState, a: Action): LegacyState {
  switch (a.type) {
    case "observe":
      return !s.seen.includes(a.clue) ? { ...s, seen: [...s.seen, a.clue] } : s;
    case "takeCloth":
      return { ...s, cloth: true };
    case "cleanChart":
      return s.cloth ? { ...s, chart: true } : s;
    case "drawer":
      return a.code === "423" ? { ...s, drawer: true } : s;
    case "cabinet":
      return s.chart && a.route === "↑→↓→↑" ? { ...s, cabinet: true } : s;
    case "combine":
      return s.drawer && s.cabinet ? { ...s, combined: true } : s;
    case "retrieve":
      return s.combined ? { ...s, token2: true } : s;
    case "insertTokens":
      return s.drawer && s.token2 ? { ...s, tokensInserted: true } : s;
    case "rotate": {
      if (!s.tokensInserted || s.safe) return s;
      const rings = [...s.rings] as LegacyState["rings"];
      rings[a.ring] = (rings[a.ring] + 1) % 4;
      return { ...s, rings };
    }
    case "align":
      return s.tokensInserted && s.rings.every((value) => value === 0)
        ? { ...s, safe: true }
        : s;
    case "unlockDoor":
      return s.safe ? { ...s, escaped: true } : s;
    default:
      return s;
  }
}
const legacyActions: Action[] = [
  ...(
    [
      "takeCloth",
      "cleanChart",
      "combine",
      "retrieve",
      "insertTokens",
      "align",
      "unlockDoor",
    ] as const
  ).map((type) => ({ type })),
  { type: "drawer", code: "423" },
  { type: "cabinet", route: "↑→↓→↑" },
  ...([0, 1, 2] as const).map((ring) => ({ type: "rotate" as const, ring })),
  ...CLUES.map((clue) => ({ type: "observe" as const, clue })),
];
const canonical = (s: LegacyState) =>
  JSON.stringify({ ...s, seen: [...s.seen].sort() });
const queue: LegacyState[] = [legacyInitial];
const visited = new Set([canonical(legacyInitial)]);
for (let index = 0; index < queue.length; index++) {
  for (const action of legacyActions) {
    const next = legacyReduce(queue[index], action);
    const key = canonical(next);
    if (!visited.has(key)) {
      visited.add(key);
      queue.push(next);
    }
  }
}
assert.equal(
  queue.length,
  2432,
  "Exhaustive original reachable state space excluding irrelevant seen ordering",
);
for (const legacy of queue) {
  let migrated = parseSave(JSON.stringify({ version: 1, state: legacy }));
  for (const key of Object.keys(legacy) as (keyof LegacyState)[])
    assert.deepEqual(
      migrated[key],
      legacy[key],
      `Original progress preserved: ${key}`,
    );
  assert.equal(
    migrated.picture,
    legacy.seen.includes("postcard") || legacy.safe,
  );
  assert.equal(migrated.slats.every(Boolean), migrated.picture);
  assert.deepEqual(parseSave(serializeSave(migrated)), migrated);
  for (const action of [
    { type: "drawer", code: "375" },
    { type: "takeCloth" },
    { type: "cleanChart" },
    { type: "cabinet", route: "↑→↓→↑" },
    { type: "combine" },
    { type: "retrieve" },
    { type: "insertTokens" },
    ...SLOT_NUMBERS.map((slot, slat) => ({ type: "placeSlat", slot, slat })),
  ] as Action[])
    migrated = reduceEscape(migrated, action);
  for (const ring of [0, 1, 2] as const) {
    const rotations = (4 - migrated.rings[ring]) % 4;
    for (let turn = 0; turn < rotations; turn++)
      migrated = reduceEscape(migrated, { type: "rotate", ring });
  }
  migrated = reduceEscape(migrated, { type: "align" });
  migrated = reduceEscape(migrated, { type: "unlockDoor" });
  assert.equal(
    migrated.escaped,
    true,
    "Every original save remains finishable, including completed runs",
  );
}

for (const malformed of [
  { ...initialState(), picture: true },
  { ...initialState(), slats: [true, true, true, true, true] },
  { ...initialState(), seen: ["postcard"] },
  { ...initialState(), slats: [false, false, false, false] },
  { ...initialState(), slats: [false, false, false, false, 1] },
  { ...initialState(), rings: [0, 0, 0] },
  { ...initialState(), escaped: true },
])
  assert.deepEqual(
    parseSave(JSON.stringify({ version: 2, state: malformed })),
    initialState(),
  );
console.log(
  `Mathematical puzzle checks passed: triangle uniqueness/backwards subtraction, all 1000 drawer codes, ${orders} strip orders with wrong placements/reloads, ${queue.length} original save migrations and finishability.`,
);
