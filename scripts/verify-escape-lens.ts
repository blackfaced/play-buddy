import assert from 'node:assert/strict';
import { clampLens, lensPointFromClient, lensClues, observedClues, LENS_START } from '../src/escape/chapter/lens';
import { CHAPTER } from '../src/escape/chapter/content';
const puzzle = CHAPTER.puzzles.find(p => p.kind === 'filter')!;
assert(puzzle.kind === 'filter');
assert.deepEqual(clampLens({x:-500,y:900}), {x:80,y:340});
assert.deepEqual(lensPointFromClient(400,250,{left:0,top:0,width:800,height:500}),{x:360,y:210});
assert.equal(observedClues(puzzle,'sun',LENS_START).length,0);
const clues=lensClues(puzzle);
assert.equal(clues.length,6);
for(const clue of clues){
 assert.deepEqual(observedClues(puzzle,clue.lens,clue).map(c=>c.id),[clue.id]);
 assert.equal(observedClues(puzzle,clue.lens,{x:clue.x+100,y:clue.y}).length,0);
 assert.equal(observedClues(puzzle,clue.lens,{x:clue.x+17,y:clue.y}).length,1, 'A broad 34-unit horizontal tolerance avoids pixel hunting');
 assert.equal(observedClues(puzzle,null,clue).length,0);
}
console.log('Movable lens geometry/local observation passed');
