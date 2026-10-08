import assert from "node:assert/strict";
import {
  initialChapter,
  reduceChapter,
  parseChapter,
  serializeChapter,
  lintChapter,
  isFutureChapterSave,
} from "../src/escape/chapter/engine";
import { CHAPTER, CHAPTER_KEY } from "../src/escape/chapter/content";
import {
  countSudokuSolutions,
  simulateDrops,
  placePiece,
  validInput,
  validatePuzzle,
  rotateCells,
} from "../src/escape/chapter/validators";
import type {
  ChapterAction,
  ChapterDefinition,
  PuzzleInput,
  SudokuPuzzle,
} from "../src/escape/chapter/types";
import {
  SAVE_KEY,
  initialState,
  parseSave,
  serializeSave,
} from "../src/escape/logic";
import {
  ADVENTURE_KEY,
  initialAdventure,
  parseAdventure,
  serializeAdventure,
} from "../src/escape/adventure/logic";

assert.deepEqual(lintChapter(CHAPTER), []);
let state = initialChapter(CHAPTER);
const act = (action: ChapterAction) => {
  state = reduceChapter(CHAPTER, state, action);
};
const travel = (scene: string) => act({ type: "travel", scene });
const input = (id: string, value: PuzzleInput) =>
  act({ type: "input", id, input: value });
const confirm = (id: string) => act({ type: "confirm", id });
const applyTool = (id: string, item: string) => act({ type: "use", id, item });
const reveal = (id: string) => act({ type: "reveal", id });
const collect = (item: string) => act({ type: "collect", item });
const reload = () => {
  const before = structuredClone(state);
  state = parseChapter(CHAPTER, serializeChapter(CHAPTER, state));
  assert.deepEqual(state, before);
};
const puzzle = (id: string) => CHAPTER.puzzles.find((p) => p.id === id)!;
const untouched = state;
collect("cloth");
assert.equal(state, untouched, "No pre-start pickup");
act({ type: "begin" });
assert.equal(state.started, true);
travel("unknown");
assert.equal(state.scene, "gallery");
collect("brush");
assert.equal(state.found.length, 0, "Hidden items need their cover");
applyTool("brush-plaque", "brush");
assert.equal(state.usedTools.length, 0, "Cannot use missing tool");
input("animal-cabinet", { kind: "code", value: "2846" });
confirm("animal-cabinet");
assert.equal(
  state.puzzles["animal-cabinet"].solved,
  false,
  "Code cannot bypass dusty plaque",
);
confirm("search-kit");
assert.equal(state.puzzles["search-kit"].solved, false);
reveal("rolled-chart");
assert.equal(state.revealed.length, 0, "Cannot reveal another room");
reveal("gallery-curtain");
collect("brush");
collect("brush");
assert.equal(state.found.length, 1);
reveal("shell-fan");
collect("arrow-tiles");
applyTool("brush-plaque", "brush");
input("animal-cabinet", { kind: "code", value: "1111" });
assert.equal(
  state.puzzles["animal-cabinet"].attempts,
  0,
  "Editing never evaluates correctness",
);
confirm("animal-cabinet");
assert.equal(state.puzzles["animal-cabinet"].solved, false);
input("animal-cabinet", { kind: "code", value: "28" });
reload();
act({ type: "undo", id: "animal-cabinet" });
assert.deepEqual(state.puzzles["animal-cabinet"].input, {
  kind: "code",
  value: "1111",
});
act({ type: "redo", id: "animal-cabinet" });
assert.deepEqual(state.puzzles["animal-cabinet"].input, {
  kind: "code",
  value: "28",
});
act({ type: "resetPuzzle", id: "animal-cabinet" });
assert.deepEqual(state.puzzles["animal-cabinet"].input, {
  kind: "code",
  value: "",
});
act({ type: "undo", id: "animal-cabinet" });
assert.deepEqual(state.puzzles["animal-cabinet"].input, {
  kind: "code",
  value: "28",
});
const beforeMalformed = state;
input("animal-cabinet", { kind: "code", value: "28466" });
assert.equal(state, beforeMalformed);
input("animal-cabinet", { kind: "code", value: "2846" });
confirm("animal-cabinet");
assert(state.found.includes("lens-frame"));
const onceSolved = state;
confirm("animal-cabinet");
assert.equal(state, onceSolved, "Rewards are idempotent");
reload();
travel("optics");
reveal("rolled-chart");
collect("hook");
collect("cloth");
applyTool("clean-window", "cloth");
applyTool("mount-frame", "lens-frame");
travel("workshop");
collect("vane-tiles");
reveal("rope-coil");
collect("oil-can");
collect("sail-tiles");
assert(!state.found.includes("sail-tiles"));
applyTool("hook-grate", "cloth");
assert(
  !state.usedTools.includes("hook-grate"),
  "Wrong reusable tool is harmless",
);
applyTool("hook-grate", "hook");
collect("sail-tiles");
applyTool("oil-track", "oil-can");
assert(
  state.puzzles["search-kit"].solved,
  "Finding seventh pickup auto-completes the collection checklist without a return journey",
);
travel("gallery");
confirm("search-kit");
assert(state.puzzles["search-kit"].solved);
applyTool("mount-arrow", "arrow-tiles");
applyTool("mount-sail", "sail-tiles");
applyTool("mount-vane", "vane-tiles");
const arrangement = puzzle("pattern-tray");
assert(arrangement.kind === "arrangement");
let slots: Extract<PuzzleInput, { kind: "arrangement" }> = {
  kind: "arrangement",
  slots: Array<null>(6).fill(null),
};
slots = placePiece(slots, arrangement.pieces[0].id, 0);
slots = placePiece(slots, arrangement.pieces[1].id, 1);
slots = placePiece(slots, arrangement.pieces[0].id, 1);
assert.deepEqual(
  slots.slots.slice(0, 2),
  [arrangement.pieces[1].id, arrangement.pieces[0].id],
  "Occupied slots swap reversibly",
);
input(arrangement.id, slots);
confirm(arrangement.id);
assert(!state.puzzles[arrangement.id].solved);
input(arrangement.id, {
  kind: "arrangement",
  slots: [...arrangement.solution],
});
travel("optics");
travel("gallery");
reload();
assert(
  !state.puzzles[arrangement.id].solved,
  "Closing, travelling and reload never confirm",
);
confirm(arrangement.id);
assert(state.found.includes("filter-disc"));
travel("optics");
applyTool("mount-filter", "filter-disc");
for (const lens of ["sun", "moon", "leaf"])
  input("lens-chart", { kind: "filter", lens, value: "" });
assert.deepEqual(state.puzzles["lens-chart"].seenLenses, [
  "sun",
  "moon",
  "leaf",
]);
act({ type: "undo", id: "lens-chart" });
act({ type: "resetPuzzle", id: "lens-chart" });
assert.deepEqual(
  state.puzzles["lens-chart"].seenLenses,
  ["sun", "moon", "leaf"],
  "Reset does not erase observed raw clues",
);
input("lens-chart", { kind: "filter", lens: "sun", value: "357" });
confirm("lens-chart");
assert(!state.puzzles["lens-chart"].solved);
act({ type: "hint", id: "lens-chart", mode: "challenge" });
assert.equal(state.puzzles["lens-chart"].hints, 0);
act({ type: "hint", id: "lens-chart", mode: "standard" });
assert.equal(state.puzzles["lens-chart"].hints, 1);
input("lens-chart", { kind: "filter", lens: "leaf", value: "375" });
confirm("lens-chart");
reload();
input("lens-chart", { kind: "filter", lens: "sun", value: "375" });
assert.deepEqual(
  state.puzzles["lens-chart"].input,
  { kind: "filter", lens: "sun", value: "375" },
  "Solved lenses remain inspectable",
);
input("lens-chart", { kind: "filter", lens: "moon", value: "000" });
assert.deepEqual(
  state.puzzles["lens-chart"].input,
  { kind: "filter", lens: "sun", value: "375" },
  "Solved answer stays immutable",
);
travel("workshop");
applyTool("mount-route", "route-plate");
const drop = puzzle("gravity-lock");
assert(drop.kind === "drop");
const answers = drop.boards.map((board) => {
  const result = simulateDrops(board.model, [board.placement]);
  assert(result.valid);
  return Math.max(...result.landed[0].cells.map(([, y]) => y)) + 1;
});
assert.deepEqual(answers, [6, 5, 8], "Independent geometry cross-check");
for (let a = 1; a <= 8; a++)
  for (let b = 1; b <= 8; b++)
    for (let c = 1; c <= 8; c++) {
      assert.equal(
        validatePuzzle(drop, { kind: "drop", predictions: [a, b, c] }),
        a === 6 && b === 5 && c === 8,
        "Every wrong whole-board prediction rejected",
      );
    }
input(drop.id, { kind: "drop", predictions: [6, 5, 7] });
confirm(drop.id);
assert(!state.puzzles[drop.id].solved);
input(drop.id, { kind: "drop", predictions: answers });
confirm(drop.id);
assert(state.found.includes("winding-crank"));
travel("optics");
applyTool("wind-tide", "winding-crank");
const sudoku = puzzle("tide-sudoku") as SudokuPuzzle;
assert.equal(countSudokuSolutions(sudoku.givens), 1);
assert.equal(countSudokuSolutions(Array<number>(16).fill(0)), 2);
assert.equal(countSudokuSolutions(Array<number>(16).fill(1)), 0);
const solution = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
assert(
  !validInput(sudoku, { kind: "sudoku", cells: Array<number>(16).fill(1) }),
  "Givens cannot be rewritten",
);
const wrong = [...solution];
wrong[1] = 3;
input(sudoku.id, { kind: "sudoku", cells: wrong });
confirm(sudoku.id);
assert(!state.puzzles[sudoku.id].solved);
input(sudoku.id, { kind: "sudoku", cells: solution });
reload();
confirm(sudoku.id);
travel("workshop");
applyTool("mount-prism", "beacon-prism");
const final = puzzle("foglight-console");
assert(final.kind === "arrangement");
input(final.id, { kind: "arrangement", slots: [...final.solution].reverse() });
confirm(final.id);
assert(!state.complete);
input(final.id, { kind: "arrangement", slots: [...final.solution] });
confirm(final.id);
assert(state.complete);
reload();
assert.equal(state.found.length, CHAPTER.items.length);
travel("gallery");
assert(state.complete, "Revisit preserves ending");
reload();
const completed = serializeChapter(CHAPTER, state);
const replay = reduceChapter(CHAPTER, state, { type: "resetChapter" });
assert(replay.started);
assert(!replay.complete);
assert.equal(replay.found.length, 0);
assert.equal(
  parseChapter(CHAPTER, completed).complete,
  true,
  "Replay leaves saved snapshot immutable",
);

// Persistence accepts bounded working boards, but reconstructs actual gate provenance.
for (const raw of [null, "{", "{}", "[]", "null", "x".repeat(240001)])
  assert.deepEqual(parseChapter(CHAPTER, raw), initialChapter(CHAPTER));
const envelope = JSON.parse(completed);
for (const version of [0, 2, -1, "1"])
  assert.deepEqual(
    parseChapter(CHAPTER, JSON.stringify({ ...envelope, version })),
    initialChapter(CHAPTER),
  );
assert(
  isFutureChapterSave(CHAPTER, JSON.stringify({ ...envelope, version: 2 })),
);
assert(
  isFutureChapterSave(CHAPTER, JSON.stringify({ ...envelope, revision: 2 })),
);
assert(!isFutureChapterSave(CHAPTER, completed));
const tampered = structuredClone(envelope);
tampered.state.revealed = [];
tampered.state.usedTools = [];
assert.equal(
  parseChapter(CHAPTER, JSON.stringify(tampered)).complete,
  false,
  "Forged solved bits cannot bypass dependencies",
);
const invalid = structuredClone(envelope);
invalid.state.puzzles["tide-sudoku"].input.cells[0] = 4;
assert.equal(
  parseChapter(CHAPTER, JSON.stringify(invalid)).puzzles["tide-sudoku"].solved,
  false,
);
const injected = structuredClone(envelope);
injected.state.found.push("admin-key");
injected.state.puzzles["lens-chart"].hints = Infinity;
injected.state.puzzles["animal-cabinet"].attempts = 999999;
const cleaned = parseChapter(CHAPTER, JSON.stringify(injected));
assert(!cleaned.found.includes("admin-key"));
assert.equal(cleaned.puzzles["lens-chart"].hints, 0);
assert.equal(cleaned.puzzles["animal-cabinet"].attempts, 9999);

const bloated = structuredClone(envelope);
bloated.state.puzzles["animal-cabinet"].solved = false;
bloated.state.puzzles["animal-cabinet"].input.value = "2";
bloated.state.puzzles["animal-cabinet"].input.extra = "x".repeat(1000);
bloated.state.puzzles["animal-cabinet"].undo = Array.from(
  { length: 100 },
  () => ({ kind: "code", value: "2", extra: "x".repeat(100) }),
);
const trimmed = parseChapter(CHAPTER, JSON.stringify(bloated));
assert(!("extra" in trimmed.puzzles["animal-cabinet"].input));
assert.equal(trimmed.puzzles["animal-cabinet"].undo.length, 40);
assert(trimmed.puzzles["animal-cabinet"].undo.every(input => !("extra" in input)));

// Declarative-level lint rejects bad references, circular gates and broken puzzle content.
const copy = (): ChapterDefinition => structuredClone(CHAPTER);
let bad = copy();
bad.items.push(bad.items[0]);
assert(lintChapter(bad).some((e) => e.includes("Duplicate item")));
bad = copy();
bad.puzzles[0].requires = [{ kind: "item", id: "missing" }];
assert(lintChapter(bad).some((e) => e.includes("Unknown item")));
bad = copy();
bad.puzzles.find((p) => p.id === "animal-cabinet")!.requires = [
  { kind: "item", id: "lens-frame" },
];
assert(
  lintChapter(bad).some((e) =>
    e.includes("Unreachable puzzle: animal-cabinet"),
  ),
);
bad = copy();
bad.scenes[0].requires = [{ kind: "puzzle", id: "foglight-console" }];
assert(lintChapter(bad).includes("Initial scene must be accessible"));
bad = copy();
(bad.puzzles.find((p) => p.kind === "sudoku") as SudokuPuzzle).givens =
  Array<number>(16).fill(0);
assert(lintChapter(bad).some((e) => e.includes("not unique")));
bad = copy();
const badDrop = bad.puzzles.find((p) => p.kind === "drop");
assert(badDrop?.kind === "drop");
badDrop.boards[0].model.pieces[0].cells = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2.5, 1],
];
assert(lintChapter(bad).some((e) => e.includes("Invalid drop")));
assert.deepEqual(
  rotateCells(
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ],
    4,
  ),
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ],
);
assert(
  !simulateDrops(drop.boards[0].model, [
    { pieceId: "t", rotation: 0, column: 5 },
  ]).valid,
);

// Additive chapter migration never rewrites cabin v3 or expedition v1.
assert.equal(new Set([SAVE_KEY, ADVENTURE_KEY, CHAPTER_KEY]).size, 3);
const cabin = initialState(),
  expedition = initialAdventure();
assert.deepEqual(parseSave(serializeSave(cabin)), cabin);
assert.deepEqual(parseAdventure(serializeAdventure(expedition)), expedition);
assert.deepEqual(
  parseChapter(CHAPTER, serializeSave(cabin)),
  initialChapter(CHAPTER),
);
assert.deepEqual(
  parseChapter(CHAPTER, serializeAdventure(expedition)),
  initialChapter(CHAPTER),
);
console.log(
  "Chapter: complete solve path; 512 drop boards; unique sudoku; gates, undo/redo/reset/reload, hints, save provenance and lint passed",
);

// Physical tool targets must bind to the same scene's closeup and finite geometry.
for (const target of [undefined, { closeup: "missing", label: "孔", description: "孔", x: 0, y: 0, width: 10, height: 10 }, { closeup: "search", label: "孔", description: "孔", x: 99, y: 0, width: 10, height: 10 }]) {
  const broken = structuredClone(CHAPTER);
  Object.assign(broken.tools[0], { target });
  assert.ok(lintChapter(broken).some(error => error.includes("tool target")));
}
