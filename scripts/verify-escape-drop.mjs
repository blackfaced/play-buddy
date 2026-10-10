import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { CHAPTER } = require('../node_modules/.tmp-verify/src/escape/chapter/content.js');
const { simulateDrops, validatePuzzle, initialInput } = require('../node_modules/.tmp-verify/src/escape/chapter/validators.js');
const puzzle = CHAPTER.puzzles.find(p => p.kind === 'drop');
const glyphs = ['111\n101\n101\n101\n111', '111\n100\n111\n101\n111', '111\n101\n111\n001\n111'];
assert.equal(puzzle.boards.length,3);
for (const [i,board] of puzzle.boards.entries()) {
 assert.equal(board.placements?.length,3,'Each chute combines three tetrominoes');
 assert.equal(board.model.fixed.length,0);
 const occupied=new Set();
 for(const [j,piece] of board.model.pieces.entries()){
  assert.equal(piece.cells.length,4);
  const seen=new Set([String(piece.cells[0])]);let grew=true;
  while(grew){grew=false;for(const [x,y] of piece.cells)if(!seen.has(`${x},${y}`)&&[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(p=>seen.has(String(p)))){seen.add(`${x},${y}`);grew=true;}}
  assert.equal(seen.size,4,'Actual connected tetromino');
  const placement=board.placements[j];assert.equal(placement.rotation,0);
  let y=-Math.max(...piece.cells.map(p=>p[1]))-1;
  while(piece.cells.every(([dx,dy])=>y+dy+1<5&&!occupied.has(`${placement.column+dx},${y+dy+1}`)))y++;
  for(const [dx,dy] of piece.cells){assert.ok(y+dy>=0);occupied.add(`${placement.column+dx},${y+dy}`);}
 }
 const mask=Array.from({length:5},(_,y)=>Array.from({length:3},(_,x)=>occupied.has(`${x},${y}`)?'1':'0').join('')).join('\n');
 assert.equal(mask,glyphs[i],'Independent unit-step gravity matches recognizable numeral');
 const result=simulateDrops(board.model,board.placements);assert.equal(result.valid,true);assert.equal(result.cells.length,12);
 assert.deepEqual(new Set(result.cells.map(String)),occupied);
}
assert.deepEqual(initialInput(puzzle).predictions,[-1,-1,-1]);
assert.equal(validatePuzzle(puzzle,{kind:'drop',predictions:[0,6,9]}),true);
for(let n=0;n<1000;n++){
 const predictions=[Math.floor(n/100),Math.floor(n/10)%10,n%10];
 assert.equal(validatePuzzle(puzzle,{kind:'drop',predictions}),n===69,'Exactly one of 1,000 complete codes works');
}
console.log('Drop geometry: independent gravity, connected tetrominoes, exact 0/6/9 masks, unique full answer passed.');
