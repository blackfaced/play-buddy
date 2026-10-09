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
  isPictureFull,
  isPictureCorrect,
  SAVE_KEY,
  type EscapeState,
  type Action,
} from "../src/escape/logic";

assert.equal(
  SAVE_KEY,
  "play-buddy:escape:starlight:v1",
  "Upgrade reads the original storage key",
);
assert.equal(JSON.parse(serializeSave(initialState())).version, 3);
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
function checked(state: EscapeState, action: Action): EscapeState {
  const snapshot = JSON.stringify(state);
  Object.freeze(state.slats);
  Object.freeze(state.seen);
  Object.freeze(state.rings);
  Object.freeze(state);
  const next = reduceEscape(state, action);
  assert.equal(JSON.stringify(state), snapshot, "Reducer never mutates input");
  const placed = next.slats.filter((id) => id !== null);
  assert.equal(new Set(placed).size, placed.length, "Pieces never duplicate");
  assert.ok(placed.every((id) => Number.isInteger(id) && id >= 0 && id < 5));
  assert.deepEqual(parseSave(serializeSave(next)), next, "Every arrangement reloads");
  assert.deepEqual(inventory(next), inventory(state), "Strips do not consume other props");
  return next;
}
let orders = 0;
let arrangements = 0;
for (const layout of permutations([0, 1, 2, 3, 4])) {
  for (const order of permutations([0, 1, 2, 3, 4])) {
    let state = initialState();
    for (const [step, slotIndex] of order.entries()) {
      assert.strictEqual(reduceEscape(state, { type: "observe", clue: "postcard" }), state);
      assert.strictEqual(reduceEscape(state, { type: "confirmPicture" }), state);
      state = checked(state, { type: "placeSlat", slat: layout[slotIndex], slot: SLOT_NUMBERS[slotIndex] });
      assert.equal(state.slats[slotIndex], layout[slotIndex], "Wrong positions are accepted too");
      assert.equal(state.picture, false, "Placement never completes the picture");
      assert.equal(state.seen.includes("postcard"), false);
      assert.equal(isPictureFull(state.slats), step === 4);
      assert.strictEqual(checked(state, { type: "placeSlat", slat: layout[slotIndex], slot: SLOT_NUMBERS[slotIndex] }), state);
    }
    const confirmed = checked(state, { type: "confirmPicture" });
    const correct = layout.every((id, index) => id === index);
    assert.equal(isPictureCorrect(state.slats), correct);
    assert.equal(confirmed.picture, correct);
    assert.equal(confirmed.seen.includes("postcard"), correct);
    if (!correct) assert.strictEqual(confirmed, state, "Failure reveals no per-piece metadata and preserves arrangement");
    else {
      assert.strictEqual(checked(confirmed, { type: "confirmPicture" }), confirmed);
      assert.strictEqual(checked(confirmed, { type: "removeSlat", slot: 12 }), confirmed);
      assert.strictEqual(checked(confirmed, { type: "placeSlat", slat: 0, slot: 8 }), confirmed);
    }
    // Every piece can be removed in every order before confirmation.
    for (const slotIndex of order) {
      state = checked(state, { type: "removeSlat", slot: SLOT_NUMBERS[slotIndex] });
      assert.equal(state.slats[slotIndex], null);
      assert.strictEqual(checked(state, { type: "removeSlat", slot: SLOT_NUMBERS[slotIndex] }), state);
      assert.strictEqual(checked(state, { type: "confirmPicture" }), state);
    }
    assert.deepEqual(state, initialState());
    orders++;
  }
  arrangements++;
}
assert.equal(orders, 14400);
assert.equal(arrangements, 120);
// Every source/destination combination: moving clears the source, and occupied
// targets return their previous piece to the implicit tray (never swap/lose it).
for (let source = 0; source < 5; source++) {
  for (let target = 0; target < 5; target++) {
    for (let piece = 0; piece < 5; piece++) {
      let state = checked(initialState(), { type: "placeSlat", slat: piece, slot: SLOT_NUMBERS[source] });
      state = checked(state, { type: "placeSlat", slat: piece, slot: SLOT_NUMBERS[target] });
      assert.equal(state.slats[target], piece);
      assert.equal(state.slats.filter((id) => id !== null).length, 1);
      for (let displaced = 0; displaced < 5; displaced++) {
        if (displaced === piece) continue;
        const next = checked(state, { type: "placeSlat", slat: displaced, slot: SLOT_NUMBERS[target] });
        assert.equal(next.slats[target], displaced);
        assert.equal(next.slats.includes(piece), false);
      }
    }
    const full = { ...initialState(), slats: [0, 1, 2, 3, 4] } as EscapeState;
    const moved = checked(full, { type: "placeSlat", slat: source, slot: SLOT_NUMBERS[target] });
    assert.equal(moved.slats[target], source);
    if (source !== target) {
      assert.equal(moved.slats[source], null);
      assert.equal(moved.slats.includes(target), false);
    }
  }
}
for (const slat of [-1, 5, 0.5, NaN, Infinity])
  assert.deepEqual(reduceEscape(initialState(), { type: "placeSlat", slat, slot: 12 }), initialState());
for (const slot of [-1, 0, 12.5, NaN, Infinity]) {
  assert.deepEqual(reduceEscape(initialState(), { type: "placeSlat", slat: 0, slot }), initialState());
  assert.deepEqual(reduceEscape(initialState(), { type: "removeSlat", slot }), initialState());
}

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
  ...(["letter", "flags", "chart", "postcard", "slot"] as const).map((clue) => ({ type: "observe" as const, clue })),
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
  assert.equal(isPictureFull(migrated.slats), migrated.picture);
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
    { type: "confirmPicture" },
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

// Every original v2 reachable progress state and all 32 partial boolean
// combinations survive. V2 auto-confirmed the only all-filled arrangement.
let v2Migrations = 0;
for (const legacy of queue) {
  for (let mask = 0; mask < 32; mask++) {
    const picture = mask === 31;
    if ((legacy.safe || legacy.seen.includes("postcard")) && !picture) continue;
    const slats = Array.from({ length: 5 }, (_, id) => Boolean(mask & (1 << id)));
    const old = { ...legacy, picture, slats };
    const migrated = parseSave(JSON.stringify({ version: 2, state: old }));
    for (const key of Object.keys(legacy) as (keyof LegacyState)[])
      assert.deepEqual(migrated[key], legacy[key]);
    assert.equal(migrated.picture, picture);
    assert.deepEqual(migrated.slats, slats.map((present, id) => present ? id : null));
    assert.deepEqual(parseSave(serializeSave(migrated)), migrated);
    v2Migrations++;
  }
}
for (const malformed of [
  { ...initialState(), picture: true },
  { ...initialState(), picture: true, slats: [1, 0, 2, 3, 4] },
  { ...initialState(), seen: ["postcard"] },
  { ...initialState(), slats: [null, null, null, null] },
  { ...initialState(), slats: [0, 0, null, null, null] },
  { ...initialState(), slats: [0, 1, 2, 3, 5] },
  { ...initialState(), slats: [0, 1, 2, 3, -1] },
  { ...initialState(), slats: [0, 1, 2, 3, 0.5] },
  { ...initialState(), slats: [false, false, false, false, false] },
  { ...initialState(), rings: [0, 0, 0] },
  { ...initialState(), escaped: true },
])
  assert.deepEqual(parseSave(JSON.stringify({ version: 3, state: malformed })), initialState());
for (const malformed of [
  { ...initialState(), picture: true, slats: [false, false, false, false, false] },
  { ...initialState(), slats: [true, true, true, true, true] },
  { ...initialState(), slats: [true, false, false, false, 1] },
])
  assert.deepEqual(parseSave(JSON.stringify({ version: 2, state: malformed })), initialState());
console.log(
  `Mathematical puzzle checks passed: triangle uniqueness, all 1000 drawer codes, ${arrangements} arrangements × 120 orders with removal/reloads, displacement/immutability, ${queue.length} v1 and ${v2Migrations} v2 save migrations.`,
);
