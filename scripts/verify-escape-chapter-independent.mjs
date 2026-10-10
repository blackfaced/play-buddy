/** Independent review: run after `tsc -p tsconfig.verify.json`.
 * Enumerates all 4x4 Sudoku boards and all six-piece permutations independently;
 * checks known-state roundtrips across seeded action orders, not arbitrary fuzz.
 */
import { createRequire } from "node:module";
import { deriveLinkedAnswers, deriveDropAnswers } from "./verify-escape-chapter-reasoning.mjs";
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
const linked = deriveLinkedAnswers(D);
const pattern = D.puzzles.find(p => p.id === "pattern-tray");
const final = D.puzzles.find(p => p.id === "foglight-console");
eq(linked.pattern, pattern.solution);
eq(linked.code, final.solution);
const withoutAnswerKeys = structuredClone(D);
for (const puzzle of withoutAnswerKeys.puzzles) delete puzzle.solution;
eq(deriveLinkedAnswers(withoutAnswerKeys), linked);
console.log("Independent linked clues:", JSON.stringify({ axes: linked.axis, route: linked.route, lookups: linked.lookups, code: linked.code }));
const dropPuzzle = D.puzzles.find(p => p.kind === "drop");
const drops = deriveDropAnswers(dropPuzzle);
for (let index = 0; index < dropPuzzle.boards.length; index++) {
  const board = dropPuzzle.boards[index];
  const actual = V.simulateDrops(board.model, board.placements);
  eq(actual.valid, true);
  eq(actual.landed, drops.boards[index].landed);
}
function solution(p) {
  switch (p.kind) {
    case "arrangement":
      return { kind: p.kind, slots: linked.pattern };
    case "code":
      return { kind: p.kind, value: p.id === "foglight-console" ? linked.code : p.animals.map(animal => animal.legs * animal.count).join("") };
    case "filter":
      return { kind: p.kind, lens: null, value: p.lenses.map(lens => lens.clue).join("") };
    case "sudoku":
      return { kind: p.kind, cells: linked.sudoku };
    case "drop":
      return { kind: p.kind, predictions: drops.predictions };
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
    eq(s.puzzles[filter.id].seenLenses, beforeLens.puzzles[filter.id].seenLenses);
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

// The final keypad admits exactly the code independently obtained from the
// stitched route, stamp locations and Sudoku, across all 4^6 possible digit strings.
for (let value = 0; value < 4 ** 6; value++) {
  const code = value.toString(4).padStart(6, "0").replace(/[0-3]/g, digit => String(Number(digit) + 1));
  eq(V.validatePuzzle(final, { kind: "code", value: code }), code === linked.code);
}
console.log("Classification: one axis pair among 576, one stamp layout among 720; route: one among 720; final: one numeric code among 4096.");
const lens = D.puzzles.find(p => p.kind === "filter");
const animal = D.puzzles.find((p) => p.id === "animal-cabinet");
assert.equal(
  animal.animals.map((a) => a.legs * a.count).join(""),
  animal.solution,
);
assert.equal(lens.lenses.map((l) => l.clue).join(""), lens.solution);
console.log("Animal/lens content agrees with codes2846/375.");
