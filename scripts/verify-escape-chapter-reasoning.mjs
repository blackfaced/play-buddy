/** Independent, test-only reasoning. Never reads an authored solution field or
 * calls a production solver: classification, overlapping routes and Sudoku are
 * reconstructed solely from their visible clues. */
import assert from "node:assert/strict";

export const permutations = (values) => values.length
  ? values.flatMap((value, index) => permutations(values.filter((_, i) => i !== index)).map(rest => [value, ...rest]))
  : [[]];

let allSudokus;
export function solveSudoku(givens) {
  if (!allSudokus) {
    allSudokus = [];
    const rows = permutations([1, 2, 3, 4]);
    for (const a of rows) for (const b of rows) for (const c of rows) for (const d of rows) {
      const board = [...a, ...b, ...c, ...d];
      if ([0, 1, 2, 3].every(col => new Set([a[col], b[col], c[col], d[col]]).size === 4)
        && [0, 2].every(row => [0, 2].every(col => new Set([
          board[row * 4 + col], board[row * 4 + col + 1],
          board[(row + 1) * 4 + col], board[(row + 1) * 4 + col + 1],
        ]).size === 4))) allSudokus.push(board);
    }
    assert.equal(allSudokus.length, 288, "Independent enumeration covers all valid 4×4 Sudoku boards");
  }
  const candidates = allSudokus.filter(board => givens.every((value, index) => !value || value === board[index]));
  assert.equal(candidates.length, 1, "Visible Sudoku givens determine exactly one board");
  return candidates[0];
}

export function deriveLinkedAnswers(chapter) {
  const pattern = chapter.puzzles.find(p => p.id === "pattern-tray");
  const lens = chapter.puzzles.find(p => p.id === "lens-chart");
  const sudoku = chapter.puzzles.find(p => p.id === "tide-sudoku");
  const final = chapter.puzzles.find(p => p.id === "foglight-console");
  assert.equal(pattern.kind, "arrangement");
  assert.equal(pattern.grid?.length, 16, "Classification has the same 4×4 footprint as the numeric board");
  assert.equal(pattern.slots.length, 6);
  assert.equal(pattern.pieces.length, 6);
  assert.equal(final.kind, "code", "The last lock requires numeric cross-puzzle lookup");
  assert.equal(final.length, 6);
  const slots = pattern.grid.filter(cell => "slot" in cell).map(cell => cell.slot);
  assert.deepEqual([...slots].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
  assert.equal(new Set(pattern.pieces.map(piece => piece.stamp.emblem)).size, 6, "Every stamp carries a distinct route emblem");
  for (const piece of pattern.pieces) {
    assert.ok(["N", "E", "S", "W"].includes(piece.stamp?.direction));
    assert.ok([1, 2, 3, 4].includes(piece.stamp?.dots));
    assert.ok(piece.symbol && piece.label);
  }

  // Discover row/column rules from ten fixed stamps; neither axis order is known.
  const axes = [];
  for (const dots of permutations([1, 2, 3, 4])) {
    for (const directions of permutations(["N", "E", "S", "W"])) {
      if (pattern.grid.every((cell, index) => "slot" in cell || (
        cell.stamp.dots === dots[Math.floor(index / 4)]
        && cell.stamp.direction === directions[index % 4]
      ))) axes.push({ dots, directions });
    }
  }
  assert.equal(axes.length, 1, "Fixed stamps identify one axis assignment among 576 permutations");
  const [axis] = axes;
  const assignments = permutations(pattern.pieces).filter(order => pattern.grid.every((cell, index) => {
    if (!("slot" in cell)) return true;
    const { stamp } = order[cell.slot];
    return stamp.dots === axis.dots[Math.floor(index / 4)] && stamp.direction === axis.directions[index % 4];
  }));
  assert.equal(assignments.length, 1, "Exactly one of 720 six-stamp assignments satisfies both classification axes");
  const assignment = assignments[0];

  // Stitch the three observed short paths by their shared emblem endpoints.
  const strips = lens.lenses.map(layer => layer.marks.map(mark => {
    const candidates = pattern.pieces.filter(piece => piece.label.startsWith(mark));
    assert.equal(candidates.length, 1, `Observed emblem ${mark} maps to one visible stamp`);
    return candidates[0].stamp.emblem;
  }));
  const routes = permutations(pattern.pieces.map(piece => piece.stamp.emblem)).filter(route => strips.every(strip =>
    strip.every((emblem, index) => index === 0 || route.indexOf(emblem) === route.indexOf(strip[index - 1]) + 1)));
  assert.equal(routes.length, 1, "Exactly one of 720 routes contains all observed contiguous short paths");
  const [route] = routes;
  const cells = solveSudoku(sudoku.givens);
  const lookups = route.map(emblem => {
    const slot = assignment.findIndex(piece => piece.stamp.emblem === emblem);
    const index = pattern.grid.findIndex(cell => "slot" in cell && cell.slot === slot);
    assert.ok(index >= 0);
    return { emblem, slot, index, row: Math.floor(index / 4) + 1, column: index % 4 + 1, digit: cells[index] };
  });
  const code = lookups.map(lookup => lookup.digit).join("");
  assert.equal(code.length, final.length);
  return { pattern: assignment.map(piece => piece.id), axis, route, sudoku: cells, lookups, code };
}

// Test-owned pixel alphabet, not a production recognition table or answer key.
const digitPixels = {
  0: ["111", "101", "101", "101", "111"],
  1: ["010", "110", "010", "010", "111"],
  2: ["111", "001", "111", "100", "111"],
  3: ["111", "001", "111", "001", "111"],
  4: ["101", "101", "111", "001", "001"],
  5: ["111", "100", "111", "001", "111"],
  6: ["111", "100", "111", "101", "111"],
  7: ["111", "001", "010", "010", "010"],
  8: ["111", "101", "111", "101", "111"],
  9: ["111", "101", "111", "001", "111"],
};
export function deriveDropAnswers(puzzle) {
  const results = puzzle.boards.map(board => {
    const model = board.model;
    const filled = new Set(model.fixed.map(cell => cell.join(",")));
    const landed = [];
    for (const placement of board.placements) {
      const piece = model.pieces.find(candidate => candidate.id === placement.pieceId);
      assert.ok(piece, "Each queued placement has a physical tetromino");
      let cells = piece.cells.map(cell => [...cell]);
      for (let turn = 0; turn < placement.rotation; turn++) cells = cells.map(([x, y]) => [-y, x]);
      const left = Math.min(...cells.map(([x]) => x));
      const top = Math.min(...cells.map(([, y]) => y));
      cells = cells.map(([x, y]) => [x - left + placement.column, y - top]);
      const fits = cells => cells.every(([x, y]) => x >= 0 && x < model.width && y >= 0 && y < model.height && !filled.has(`${x},${y}`));
      assert.ok(fits(cells), "Every queued piece can enter without overlapping previous settled pieces");
      while (fits(cells.map(([x, y]) => [x, y + 1]))) cells = cells.map(([x, y]) => [x, y + 1]);
      landed.push({ pieceId: piece.id, cells });
      for (const cell of cells) filled.add(cell.join(","));
    }
    const pixels = Array.from({ length: model.height }, (_, y) => Array.from(
      { length: model.width }, (_, x) => filled.has(`${x},${y}`) ? "1" : "0",
    ).join(""));
    const recognized = Object.entries(digitPixels).filter(([, glyph]) => glyph.join("/") === pixels.join("/"));
    assert.equal(recognized.length, 1, "All independently landed pieces form exactly one recognizable digit");
    return { digit: Number(recognized[0][0]), pixels, landed };
  });
  return { predictions: results.map(result => result.digit), boards: results };
}
