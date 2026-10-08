import type { Cell, DropPuzzle } from "./types";

/** Canonical 3×5 numeral stencils, compared to the complete settled silhouette. */
export const DROP_DIGIT_GLYPHS = [
  "111/101/101/101/111", "010/110/010/010/111", "111/001/111/100/111",
  "111/001/111/001/111", "101/101/111/001/001", "111/100/111/001/111",
  "111/100/111/101/111", "111/001/001/001/001", "111/101/111/101/111",
  "111/101/111/001/111",
];
export function recognizeDropDigit(cells: readonly Cell[], width: number, height: number): number {
  if (width !== 3 || height !== 5) return -1;
  const occupied = new Set(cells.map(String));
  if (occupied.size !== cells.length || cells.some(([x,y]) => x < 0 || x >= width || y < 0 || y >= height)) return -1;
  const mask = Array.from({length: height}, (_, y) => Array.from({length: width}, (_, x) => occupied.has(`${x},${y}`) ? "1" : "0").join("")).join("/");
  return DROP_DIGIT_GLYPHS.indexOf(mask);
}
const shapes: { column: number; cells: Cell[] }[][] = [
  [
    { column: 0, cells: [[0,0],[0,1],[0,2],[0,3]] },
    { column: 1, cells: [[0,2],[1,0],[1,1],[1,2]] },
    { column: 0, cells: [[0,0],[1,0],[2,0],[2,1]] },
  ],
  [
    { column: 0, cells: [[0,0],[0,1],[0,2],[1,2]] },
    { column: 1, cells: [[0,0],[1,0],[1,1],[1,2]] },
    { column: 0, cells: [[0,0],[0,1],[1,0],[2,0]] },
  ],
  [
    { column: 0, cells: [[0,1],[1,1],[2,0],[2,1]] },
    { column: 0, cells: [[0,1],[1,1],[2,0],[2,1]] },
    { column: 0, cells: [[0,0],[0,1],[1,0],[2,0]] },
  ],
];
export const dropBoards: DropPuzzle["boards"] = shapes.map((pieces, i) => ({
  id: `drop-${String.fromCharCode(97+i)}`,
  label: ["甲", "乙", "丙"][i],
  model: {width: 3, height: 5, fixed: [], pieces: pieces.map((piece, j) => ({id: String(j+1), label: `第 ${j+1} 块`, cells: piece.cells}))},
  placements: pieces.map((piece, j) => ({pieceId: String(j+1), rotation: 0, column: piece.column})),
}));
