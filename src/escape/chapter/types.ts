/** Small, concrete chapter format. Stable IDs are persisted; display text is not. */
export type Requirement = {
  kind: "item" | "puzzle" | "reveal" | "tool";
  id: string;
};
export interface SceneDefinition {
  id: string;
  title: string;
  description: string;
  requires: Requirement[];
}
export interface ItemDefinition {
  id: string;
  name: string;
  symbol: string;
  description: string;
}
export interface RevealDefinition {
  id: string;
  scene: string;
  label: string;
  /** Raw observed symbols/text only; explanations belong in puzzle assistance. */
  clue?: string;
  requires: Requirement[];
}
export interface PickupDefinition {
  item: string;
  scene: string;
  label: string;
  requires: Requirement[];
}
export interface ToolDefinition {
  /** Installed parts remain in saved discovery history but cannot be carried again. */
  installsItem?: boolean;
  /** Physical interface in one exact closeup; geometry is percent of its artwork. */
  target: { closeup: string; label: string; description: string; x: number; y: number; width: number; height: number };
  id: string;
  scene: string;
  item: string;
  label: string;
  requires: Requirement[];
}
export interface PuzzleBase {
  id: string;
  scene: string;
  title: string;
  /** A physical inscription/rule, never an unsolicited answer recipe. */
  inscription: string;
  /** Automatic coaching in easy mode only; never copied to the source journal. */
  easyHelp: string;
  /** Player-requested coaching, hidden in challenge even when previously requested. */
  hints: string[];
  requires: Requirement[];
  rewards: string[];
  success: string;
}
export interface PatternStamp {
  direction: "N" | "E" | "S" | "W";
  dots: number;
  emblem?: "shell" | "star" | "fish" | "wave" | "anchor" | "sail";
}
export interface ArrangementPuzzle extends PuzzleBase {
  kind: "arrangement";
  slots: string[];
  pieces: { id: string; label: string; symbol: string; stamp?: PatternStamp }[];
  grid?: ({ stamp: PatternStamp } | { slot: number })[];
  solution: string[];
  rows?: { label: string; sequence: (string | null)[] }[];
}
export interface CodePuzzle extends PuzzleBase {
  kind: "code";
  length: number;
  solution: string;
  frameSeal?: boolean;
  animals?: { id: string; name: string; legs: number; count: number }[];
}
export interface FilterPuzzle extends PuzzleBase {
  kind: "filter";
  lenses: {
    id: string;
    name: string;
    symbol: string;
    color: string;
    clue: string;
    marks: string[];
  }[];
  solution: string;
  length: number;
}
export type Cell = readonly [number, number];
export interface DropModel {
  width: number;
  height: number;
  fixed: Cell[];
  pieces: { id: string; label: string; cells: Cell[] }[];
}
export interface DropPuzzle extends PuzzleBase {
  kind: "drop";
  boards: {
    id: string;
    label: string;
    model: DropModel;
    placements: DropPlacement[];
  }[];
}
export interface SudokuPuzzle extends PuzzleBase {
  kind: "sudoku";
  givens: number[];
}
export interface SearchPuzzle extends PuzzleBase {
  kind: "search";
  items: string[];
}
export type PuzzleDefinition =
  | ArrangementPuzzle
  | CodePuzzle
  | FilterPuzzle
  | DropPuzzle
  | SudokuPuzzle
  | SearchPuzzle;
export interface ChapterDefinition {
  id: string;
  revision: number;
  title: string;
  scenes: SceneDefinition[];
  items: ItemDefinition[];
  reveals: RevealDefinition[];
  pickups: PickupDefinition[];
  tools: ToolDefinition[];
  puzzles: PuzzleDefinition[];
  finish: string;
}
export interface DropPlacement {
  pieceId: string;
  rotation: number;
  column: number;
}
export type PuzzleInput =
  | { kind: "arrangement"; slots: (string | null)[] }
  | { kind: "code"; value: string }
  | { kind: "filter"; lens: string | null; value: string; position?: { x: number; y: number } }
  | { kind: "drop"; predictions: number[] }
  | { kind: "sudoku"; cells: number[] }
  | { kind: "search" };
export interface PuzzleProgress {
  input: PuzzleInput;
  undo: PuzzleInput[];
  redo: PuzzleInput[];
  solved: boolean;
  hints: number;
  seenLenses: string[];
  seenClues: string[];
  /** Whole-board attempts only; never per-piece correctness. */
  attempts: number;
}
export interface ChapterState {
  started: boolean;
  scene: string;
  found: string[];
  revealed: string[];
  usedTools: string[];
  puzzles: Record<string, PuzzleProgress>;
  complete: boolean;
}
export type ChapterAction =
  | { type: "begin" }
  | { type: "travel"; scene: string }
  | { type: "reveal"; id: string }
  | { type: "collect"; item: string }
  | { type: "use"; id: string; item: string }
  | { type: "input"; id: string; input: PuzzleInput }
  | { type: "undo" | "redo" | "resetPuzzle" | "confirm"; id: string }
  | { type: "hint"; id: string; mode: "easy" | "standard" | "challenge" }
  | { type: "resetChapter" };
