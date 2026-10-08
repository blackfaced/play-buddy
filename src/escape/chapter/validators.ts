import type {
  Cell,
  DropModel,
  DropPlacement,
  PuzzleDefinition,
  PuzzleInput,
} from "./types";

export function rotateCells(cells: readonly Cell[], turns: number): Cell[] {
  let rotated: Cell[] = cells.map(([x, y]) => [x, y]);
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++)
    rotated = rotated.map(([x, y]) => [-y, x]);
  const minX = Math.min(...rotated.map(([x]) => x));
  const minY = Math.min(...rotated.map(([, y]) => y));
  return rotated.map(([x, y]) => [x - minX, y - minY]);
}
const key = ([x, y]: Cell) => `${x},${y}`;
export interface DropResult {
  valid: boolean;
  cells: Cell[];
  landed: { pieceId: string; cells: Cell[] }[];
}
/** Renderer and validator share this gravity model. No line clearing, sliding, or hidden physics. */
export function simulateDrops(
  model: DropModel,
  placements: readonly DropPlacement[],
): DropResult {
  const occupied = new Set(model.fixed.map(key));
  const cells: Cell[] = model.fixed.map(([x, y]) => [x, y]);
  const landed: DropResult["landed"] = [];
  const invalid = (): DropResult => ({ valid: false, cells, landed });
  if (placements.length > model.pieces.length) return invalid();
  for (let i = 0; i < placements.length; i++) {
    const placement = placements[i];
    const piece = model.pieces[i];
    if (
      !piece ||
      piece.id !== placement.pieceId ||
      !Number.isInteger(placement.rotation) ||
      placement.rotation < 0 ||
      placement.rotation > 3 ||
      !Number.isInteger(placement.column)
    )
      return invalid();
    const shape = rotateCells(piece.cells, placement.rotation);
    const at = (y: number): Cell[] =>
      shape.map(([x, dy]) => [x + placement.column, y + dy]);
    const fits = (candidate: Cell[]) =>
      candidate.every(
        ([x, y]) =>
          x >= 0 &&
          x < model.width &&
          y >= 0 &&
          y < model.height &&
          !occupied.has(`${x},${y}`),
      );
    if (!fits(at(0))) return invalid();
    let row = 0;
    while (fits(at(row + 1))) row++;
    const result = at(row);
    for (const cell of result) {
      occupied.add(key(cell));
      cells.push(cell);
    }
    landed.push({ pieceId: piece.id, cells: result });
  }
  return { valid: true, cells, landed };
}
export function initialInput(puzzle: PuzzleDefinition): PuzzleInput {
  switch (puzzle.kind) {
    case "arrangement":
      return { kind: puzzle.kind, slots: puzzle.slots.map(() => null) };
    case "code":
      return { kind: puzzle.kind, value: "" };
    case "filter":
      return { kind: puzzle.kind, lens: null, value: "" };
    case "drop":
      return { kind: puzzle.kind, predictions: puzzle.boards.map(() => 0) };
    case "sudoku":
      return { kind: puzzle.kind, cells: [...puzzle.givens] };
    case "search":
      return { kind: puzzle.kind };
  }
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
/** Structural checks bound persistence; they deliberately do not reveal answer correctness. */
export function validInput(
  puzzle: PuzzleDefinition,
  value: unknown,
): value is PuzzleInput {
  if (!object(value) || value.kind !== puzzle.kind) return false;
  switch (puzzle.kind) {
    case "arrangement": {
      if (
        !Array.isArray(value.slots) ||
        value.slots.length !== puzzle.slots.length
      )
        return false;
      const ids = puzzle.pieces.map((p) => p.id),
        filled = value.slots.filter((x) => x !== null);
      return (
        filled.every((x) => typeof x === "string" && ids.includes(x)) &&
        new Set(filled).size === filled.length
      );
    }
    case "code":
      return (
        typeof value.value === "string" &&
        /^\d*$/.test(value.value) &&
        value.value.length <= puzzle.length
      );
    case "filter":
      return (
        (value.lens === null ||
          puzzle.lenses.some((lens) => lens.id === value.lens)) &&
        typeof value.value === "string" &&
        /^\d*$/.test(value.value) &&
        value.value.length <= puzzle.length
      );
    case "drop":
      return (
        Array.isArray(value.predictions) &&
        value.predictions.length === puzzle.boards.length &&
        value.predictions.every(
          (row, i) =>
            Number.isInteger(row) &&
            row >= 0 &&
            row <= puzzle.boards[i].model.height,
        )
      );
    case "sudoku":
      return (
        Array.isArray(value.cells) &&
        value.cells.length === 16 &&
        value.cells.every(
          (n, i) =>
            Number.isInteger(n) &&
            n >= 0 &&
            n <= 4 &&
            (!puzzle.givens[i] || n === puzzle.givens[i]),
        )
      );
    case "search":
      return true;
  }
}
export function validSudoku(cells: readonly number[]): boolean {
  if (
    cells.length !== 16 ||
    cells.some((n) => !Number.isInteger(n) || n < 1 || n > 4)
  )
    return false;
  for (let i = 0; i < 4; i++) {
    if (new Set(cells.slice(i * 4, i * 4 + 4)).size !== 4) return false;
    if (new Set([0, 1, 2, 3].map((row) => cells[row * 4 + i])).size !== 4)
      return false;
    const x = (i % 2) * 2,
      y = Math.floor(i / 2) * 2;
    if (
      new Set([
        cells[y * 4 + x],
        cells[y * 4 + x + 1],
        cells[(y + 1) * 4 + x],
        cells[(y + 1) * 4 + x + 1],
      ]).size !== 4
    )
      return false;
  }
  return true;
}
/** Capped at two: distinguishes impossible, unique, and ambiguous content. */
export function countSudokuSolutions(
  givens: readonly number[],
  limit = 2,
): number {
  if (
    givens.length !== 16 ||
    givens.some((n) => !Number.isInteger(n) || n < 0 || n > 4)
  )
    return 0;
  const board = [...givens];
  let count = 0;
  function search(index: number) {
    if (count >= limit) return;
    if (index === 16) {
      if (validSudoku(board)) count++;
      return;
    }
    if (board[index]) {
      search(index + 1);
      return;
    }
    const row = Math.floor(index / 4),
      col = index % 4;
    for (let n = 1; n <= 4; n++) {
      let allowed = true;
      for (let j = 0; j < 16; j++)
        if (
          board[j] === n &&
          (Math.floor(j / 4) === row ||
            j % 4 === col ||
            (Math.floor(j / 8) === Math.floor(row / 2) &&
              Math.floor((j % 4) / 2) === Math.floor(col / 2)))
        )
          allowed = false;
      if (allowed) {
        board[index] = n;
        search(index + 1);
        board[index] = 0;
      }
    }
  }
  search(0);
  return count;
}
export function validatePuzzle(
  puzzle: PuzzleDefinition,
  input: PuzzleInput,
  found: readonly string[] = [],
): boolean {
  if (!validInput(puzzle, input)) return false;
  switch (puzzle.kind) {
    case "arrangement":
      return (
        input.kind === "arrangement" &&
        input.slots.every((id, i) => id === puzzle.solution[i])
      );
    case "code":
      return input.kind === "code" && input.value === puzzle.solution;
    case "filter":
      return input.kind === "filter" && input.value === puzzle.solution;
    case "drop": {
      if (input.kind !== "drop") return false;
      return puzzle.boards.every((board, i) => {
        const result = simulateDrops(board.model, [board.placement]);
        return (
          result.valid &&
          result.landed.length === 1 &&
          input.predictions[i] ===
            Math.max(...result.landed[0].cells.map(([, y]) => y)) + 1
        );
      });
    }
    case "sudoku":
      return input.kind === "sudoku" && validSudoku(input.cells);
    case "search":
      return puzzle.items.every((id) => found.includes(id));
  }
}
/** Placement is reversible and swaps occupied slots instead of discarding a piece. */
export function placePiece(
  input: Extract<PuzzleInput, { kind: "arrangement" }>,
  pieceId: string,
  slot: number,
): typeof input {
  if (!Number.isInteger(slot) || slot < 0 || slot >= input.slots.length)
    return input;
  const slots = [...input.slots],
    previous = slots.indexOf(pieceId),
    displaced = slots[slot];
  if (previous >= 0) slots[previous] = displaced;
  slots[slot] = pieceId;
  return { kind: "arrangement", slots };
}
