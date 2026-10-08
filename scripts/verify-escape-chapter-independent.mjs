/** Independent review: run after `tsc -p tsconfig.verify.json`.
 * Enumerates all 4x4 Sudoku boards and all six-piece permutations independently;
 * checks known-state roundtrips across seeded action orders, not arbitrary fuzz.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const assert = require("node:assert/strict");
const {
  CHAPTER: D,
} = require("../node_modules/.tmp-verify/src/escape/chapter/content.js");
const E = require("../node_modules/.tmp-verify/src/escape/chapter/engine.js");
const V = require("../node_modules/.tmp-verify/src/escape/chapter/validators.js");
let checks = 0;
const eq = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const permutations = (a) =>
  a.length
    ? a.flatMap((v, i) =>
        permutations(a.filter((_, j) => j !== i)).map((p) => [v, ...p]),
      )
    : [[]];
const rows = permutations([1, 2, 3, 4]);
const sudokus = [];
for (const a of rows)
  for (const b of rows)
    for (const c of rows)
      for (const d of rows) {
        const board = [...a, ...b, ...c, ...d];
        if (
          [0, 1, 2, 3].every(
            (x) => new Set([a[x], b[x], c[x], d[x]]).size === 4,
          ) &&
          [0, 2].every((y) =>
            [0, 2].every(
              (x) =>
                new Set([
                  board[y * 4 + x],
                  board[y * 4 + x + 1],
                  board[(y + 1) * 4 + x],
                  board[(y + 1) * 4 + x + 1],
                ]).size === 4,
            ),
          )
        )
          sudokus.push(board);
      }
eq(sudokus.length, 288);
function landing(board) {
  const { model: m, placement: p } = board;
  let shape = m.pieces[0].cells.map((c) => [...c]);
  for (let k = 0; k < p.rotation; k++) shape = shape.map(([x, y]) => [-y, x]);
  const left = Math.min(...shape.map((c) => c[0])),
    top = Math.min(...shape.map((c) => c[1]));
  shape = shape.map(([x, y]) => [x - left + p.column, y - top]);
  const rocks = m.fixed.map((c) => c.join(","));
  while (
    shape.every(
      ([x, y]) => y + 1 < m.height && !rocks.includes([x, y + 1].join(",")),
    )
  )
    shape = shape.map(([x, y]) => [x, y + 1]);
  const bottom = Math.max(...shape.map((c) => c[1])) + 1;
  eq(V.simulateDrops(m, [p]).landed[0].cells, shape);
  return bottom;
}
function solution(p) {
  switch (p.kind) {
    case "arrangement":
      return { kind: p.kind, slots: p.solution };
    case "code":
      return { kind: p.kind, value: p.solution };
    case "filter":
      return { kind: p.kind, lens: null, value: p.solution };
    case "sudoku": {
      const solutions = sudokus.filter((s) =>
        p.givens.every((n, i) => !n || n === s[i]),
      );
      eq(solutions.length, 1);
      console.log("Sudoku unique", solutions[0].join(""));
      return { kind: p.kind, cells: solutions[0] };
    }
    case "drop":
      return { kind: p.kind, predictions: p.boards.map(landing) };
    case "search":
      return { kind: p.kind };
  }
}
const answers = Object.fromEntries(D.puzzles.map((p) => [p.id, solution(p)]));
console.log(
  "Independent drop",
  Object.values(answers).filter((a) => a.kind === "drop"),
);
eq(E.lintChapter(D), []);
let states = 0;
function roundtrip(s) {
  eq(E.parseChapter(D, E.serializeChapter(D, s)), s);
  states++;
}
let seed = 23;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
}
for (let run = 0; run < 64; run++) {
  let s = E.reduceChapter(D, E.initialChapter(D), { type: "begin" });
  roundtrip(s);
  function act(a) {
    s = E.reduceChapter(D, s, a);
    roundtrip(s);
  }
  for (let n = 0; n < 200 && !s.complete; n++) {
    const actions = [
      ...D.reveals.map((r) => ({
        scene: r.scene,
        action: { type: "reveal", id: r.id },
      })),
      ...D.pickups.map((p) => ({
        scene: p.scene,
        action: { type: "collect", item: p.item },
      })),
      ...D.tools.map((t) => ({
        scene: t.scene,
        action: { type: "use", id: t.id, item: t.item },
      })),
      ...D.puzzles
        .filter((p) => run % 2 === 0 || p.kind !== "search")
        .map((p) => ({
          scene: p.scene,
          action: { type: "confirm", id: p.id },
        })),
    ];
    for (let i = actions.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [actions[i], actions[j]] = [actions[j], actions[i]];
    }
    let changed = false;
    for (const { scene, action } of actions) {
      act({ type: "travel", scene });
      const before = JSON.stringify(s);
      if (action.type === "confirm" && !s.puzzles[action.id].solved) {
        const p = D.puzzles.find((p) => p.id === action.id);
        const saved = s.puzzles[p.id];
        act({ type: "input", id: p.id, input: answers[p.id] });
        if (s.puzzles[p.id] !== saved) {
          const input = s.puzzles[p.id].input;
          act({ type: "undo", id: p.id });
          eq(s.puzzles[p.id].input, saved.input);
          act({ type: "redo", id: p.id });
          eq(s.puzzles[p.id].input, input);
          act({ type: "resetPuzzle", id: p.id });
          act({ type: "undo", id: p.id });
          eq(s.puzzles[p.id].input, input);
        }
      }
      act(action);
      if (JSON.stringify(s) !== before) changed = true;
      if (action.type === "confirm" && s.puzzles[action.id].solved) {
        const solved = s;
        for (const a of [
          { type: "confirm", id: action.id },
          { type: "resetPuzzle", id: action.id },
          { type: "undo", id: action.id },
          { type: "redo", id: action.id },
        ]) {
          act(a);
          eq(s, solved);
        }
      }
    }
    assert(changed || s.complete, "No progress");
  }
  eq(s.complete, true);
  eq(s.puzzles["search-kit"].solved, true);
  eq(new Set(s.found).size, s.found.length);
  const filter = D.puzzles.find((p) => p.kind === "filter");
  act({ type: "travel", scene: filter.scene });
  const beforeLens = s;
  for (const lens of filter.lenses) {
    act({
      type: "input",
      id: filter.id,
      input: { ...s.puzzles[filter.id].input, lens: lens.id },
    });
    eq(s.puzzles[filter.id].input.lens, lens.id);
    eq(s.puzzles[filter.id].solved, true);
    eq(s.found, beforeLens.found);
    eq(s.puzzles[filter.id].attempts, beforeLens.puzzles[filter.id].attempts);
    assert(s.puzzles[filter.id].seenLenses.includes(lens.id));
  }
  const observed = s;
  act({
    type: "input",
    id: filter.id,
    input: { ...s.puzzles[filter.id].input, value: "000" },
  });
  eq(s, observed);
  const corrupted = JSON.parse(E.serializeChapter(D, s));
  corrupted.state.usedTools = [];
  corrupted.state.found = [];
  corrupted.state.revealed = [];
  const recovered = E.parseChapter(D, JSON.stringify(corrupted));
  eq(recovered.complete, false);
  eq(recovered.found, []);

  for (const p of D.puzzles) {
    const a = s.puzzles[p.id].input;
    for (const mode of ["easy", "standard", "challenge"]) {
      act({ type: "travel", scene: p.scene });
      act({ type: "hint", id: p.id, mode });
      eq(s.puzzles[p.id].input, a);
    }
  }
}
for (const raw of [
  null,
  "",
  "null",
  "[]",
  "{}",
  "NaN",
  JSON.stringify({ version: 100 }),
  "{",
  "x".repeat(240001),
])
  eq(E.parseChapter(D, raw), E.initialChapter(D));
console.log(JSON.stringify({ checks, roundtrips: states, verdict: "PASS" }));

const p = D.puzzles.find((p) => p.id === "pattern-tray");
const dirs = ["N", "E", "S", "W"];
const seeds = [
  ["arrow", 0, 1],
  ["sail", 1, 2],
  ["vane", 2, 3],
];
const constraints = seeds.flatMap(([type, dotsDir, dots]) =>
  [2, 3].map(
    (step) =>
      `${type}-${dirs[(dotsDir + step) % 4]}${((dots + step - 1) % 3) + 1}`,
  ),
);
const matches = permutations(p.pieces.map((p) => p.id)).filter((order) =>
  order.every((x, i) => x === constraints[i]),
);
assert.equal(matches.length, 1);
assert.deepEqual(matches[0], p.solution);
console.log(
  "Pattern: unique among720 assignments under clockwise/+1 modulo3 physical rule.",
);
const f = D.puzzles.find((p) => p.id === "foglight-console"),
  lens = D.puzzles.find((p) => p.kind === "filter");
const names = Object.fromEntries(f.pieces.map((p) => [p.label, p.id]));
const strips = lens.lenses.map((l) => l.marks.map((m) => names[m]));
const final = permutations(f.pieces.map((p) => p.id)).filter((order) =>
  strips.every((strip) =>
    strip.every(
      (x, i) => i === 0 || order.indexOf(x) === order.indexOf(strip[i - 1]) + 1,
    ),
  ),
);
assert.equal(final.length, 1);
assert.deepEqual(final[0], f.solution);
console.log(
  "Final signal: unique among720 assignments from shared lens route strips.",
);
const animal = D.puzzles.find((p) => p.id === "animal-cabinet");
assert.equal(
  animal.animals.map((a) => a.legs * a.count).join(""),
  animal.solution,
);
assert.equal(lens.lenses.map((l) => l.clue).join(""), lens.solution);
console.log("Animal/lens content agrees with codes2846/375.");
