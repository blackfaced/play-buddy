import assert from "node:assert/strict";
import {
  initialAdventure,
  reduceAdventure,
  serializeAdventure,
  parseAdventure,
  availableItems,
  ANCHOR,
  ADVENTURE_KEY,
  ROW_CLUES,
  COL_CLUES,
} from "../src/escape/adventure/logic";
const reduce: typeof reduceAdventure = (state, action) => {
  const next = reduceAdventure(state, action);
  assert.deepEqual(
    parseAdventure(serializeAdventure(next)),
    next,
    "every action state roundtrips",
  );
  return next;
};
let s = initialAdventure();
assert.equal(reduce(s, { type: "travel", room: "navigation" }), s);
s = reduce(s, { type: "begin" });
assert.equal(s.room, "navigation");
for (const item of ["key", "battery"] as const)
  assert.equal(
    reduce(s, { type: "collect", item }),
    s,
    "covered item inaccessible",
  );
s = reduce(s, { type: "reveal", cover: "compassCase" });
s = reduce(s, { type: "collect", item: "key" });
assert.equal(
  reduce(s, { type: "collect", item: "key" }),
  s,
  "duplicate collection rejected",
);
assert.equal(reduce(s, { type: "use", item: "brush", target: "door" }), s);
s = reduce(s, { type: "use", item: "key", target: "door" });
s = reduce(s, { type: "travel", room: "storeroom" });
assert.equal(
  reduce(s, { type: "collect", item: "lens" }),
  s,
  "canvas covers lens",
);
s = reduce(s, { type: "reveal", cover: "canvas" });
for (const item of ["brush", "lens", "hook"] as const)
  s = reduce(s, { type: "collect", item });
s = reduce(s, { type: "travel", room: "navigation" });
s = reduce(s, { type: "use", item: "brush", target: "ledger" });
assert.equal(reduce(s, { type: "safe", code: "000" }), s);
s = reduce(s, { type: "safe", code: "527" });
assert.equal(s.safeOpen, true);
assert.ok(!s.found.includes("card"), "opening safe does not auto collect card");
s = reduce(s, { type: "collect", item: "card" });
for (const item of ["lens", "card"] as const)
  s = reduce(s, { type: "use", item, target: "projector" });
assert.equal(s.projectorOn, false, "missed battery requires return to pile");
s = reduce(s, { type: "reveal", cover: "manifest" });
s = reduce(s, { type: "collect", item: "battery" });
s = reduce(s, { type: "use", item: "battery", target: "projector" });
assert.equal(s.projectorOn, true);
s = reduce(s, { type: "travel", room: "storeroom" });
s = reduce(s, { type: "toggleCell", index: 0 });
assert.equal(s.cells[0], true, "wrong cells can be placed");
assert.equal(
  reduce(s, { type: "confirmPanel" }),
  s,
  "wholeboard rejects wrong answer without cell oracle",
);
s = reduce(s, { type: "toggleCell", index: 0 });
ANCHOR.forEach((filled, index) => {
  if (filled) s = reduce(s, { type: "toggleCell", index });
});
assert.equal(s.panelOpen, false, "correct arrangement awaits confirm");
s = reduce(s, { type: "confirmPanel" });
assert.equal(s.panelOpen, true);
s = reduce(s, { type: "use", item: "hook", target: "winch" });
assert.equal(
  reduce(s, { type: "operateWinch" }),
  s,
  "missing crank cannot finish",
);
s = reduce(s, { type: "travel", room: "navigation" });
s = reduce(s, { type: "collect", item: "crank" });
s = reduce(s, { type: "travel", room: "storeroom" });
s = reduce(s, { type: "use", item: "crank", target: "winch" });
s = reduce(s, { type: "operateWinch" });
assert.equal(s.gangwayDown, true);
assert.equal(s.complete, false, "walkout is explicit");
s = reduce(s, { type: "finish" });
assert.equal(s.complete, true);
assert.equal(s.room, "deck");
assert.deepEqual(
  availableItems(s),
  [],
  "all six searched tools and safe card used",
);
assert.deepEqual(parseAdventure(serializeAdventure(s)), s);
for (const raw of [
  "{bad",
  "null",
  "{}",
  JSON.stringify({ version: 99, state: s }),
  JSON.stringify({ version: 1, state: { ...s, found: ["key", "key"] } }),
  JSON.stringify({ version: 1, state: { ...s, batteryMounted: false } }),
  JSON.stringify({ version: 1, state: { ...s, cells: [true] } }),
])
  assert.deepEqual(parseAdventure(raw), initialAdventure());
assert.equal(ADVENTURE_KEY, "play-buddy:escape:expedition:v1");
// Revisit every room after completion; mode is a separate preference.
for (const room of ["navigation", "storeroom", "cabin", "deck"] as const) {
  const next = reduce(s, { type: "travel", room });
  assert.deepEqual(parseAdventure(serializeAdventure(next)), next);
}
assert.equal(reduce(s, { type: "toggleCell", index: NaN }), s);
console.log(
  "Adventure: full progression, backtracking, missed items, explicit tools, wrong inputs, duplicate collection, and save validation passed",
);

// The printed row/column clues have exactly one solution, matching the reducer.
const runs = (bits: boolean[]): number[] => {
  const result: number[] = [];
  let length = 0;
  for (const bit of [...bits, false]) {
    if (bit) length++;
    else if (length) {
      result.push(length);
      length = 0;
    }
  }
  return result;
};
const allRows = Array.from({ length: 32 }, (_, n) =>
  Array.from({ length: 5 }, (_, i) => Boolean(n & (1 << i))),
);
const rowCandidates = ROW_CLUES.map((clue) =>
  allRows.filter((row) => JSON.stringify(runs(row)) === JSON.stringify(clue)),
);
let solutions = 0;
const explore = (rows: boolean[][]): void => {
  if (rows.length < 5) {
    for (const row of rowCandidates[rows.length]) explore([...rows, row]);
    return;
  }
  if (
    COL_CLUES.every(
      (clue, col) =>
        JSON.stringify(runs(rows.map((row) => row[col]))) ===
        JSON.stringify(clue),
    )
  ) {
    solutions++;
    assert.deepEqual(rows.flat(), ANCHOR);
  }
};
explore([]);
assert.equal(solutions, 1, "nonogram has exactly one solution");
const reset = reduce(s, { type: "resetChapter" });
assert.deepEqual(reset, {
  ...initialAdventure(),
  started: true,
  room: "navigation",
});
assert.deepEqual(parseAdventure(serializeAdventure(reset)), reset);
console.log(
  "Adventure: nonogram clue uniqueness and scoped chapter reset passed",
);
