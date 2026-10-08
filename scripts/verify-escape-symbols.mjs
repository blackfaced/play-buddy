import assert from 'node:assert/strict';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
await build({stdin:{contents:`export * from './src/escape/chapter/PatternArt';export * from './src/escape/chapter/lens';export * from './src/escape/chapter/content';export {default as LensMap} from './src/escape/chapter/LensMap';`,resolveDir:process.cwd()},outfile:'node_modules/.tmp-symbols.mjs',bundle:true,platform:'node',format:'esm',jsx:'automatic',packages:'external'});
const A=await import(process.cwd()+'/node_modules/.tmp-symbols.mjs');
const puzzle=A.CHAPTER.puzzles.find(p=>p.kind==='filter');
const pattern=A.CHAPTER.puzzles.find(p=>p.id==='pattern-tray');
const render=(component,props)=>renderToStaticMarkup(React.createElement(component,props));
for(const clue of A.lensClues(puzzle).filter(c=>c.id.endsWith('route'))){
 assert.ok(clue.emblems?.length, 'Route clues must carry the same physical emblem identities as tiles');
 const route=render(A.RouteArt,{emblems:clue.emblems});
 assert.ok(!/<text/.test(route),'Routes use physical drawings, not translated words or font glyphs');
 for(const emblem of clue.emblems){
  const glyph=render(A.EmblemArt,{emblem});
  assert.ok(route.includes(glyph),'Route uses shared exact SVG paths');
  const tile=pattern.pieces.find(p=>p.stamp.emblem===emblem);
  assert.ok(render(A.StampArt,{stamp:tile.stamp}).includes(glyph),'Tile uses identical shared SVG paths');
 }
 assert.ok(Math.hypot(clue.width/2+17,clue.height/2)*1.12<=A.LENS_RADIUS-5,'Complete symbols and arrows fit aperture at discovery tolerance');
 const map=render(A.LensMap,{puzzle,input:{kind:'filter',lens:clue.lens,position:clue},onChange(){}});
 assert.ok(map.includes('data-route-art'));
 assert.ok(map.includes(clue.text),'Accessible raw names remain available when observed');
}
const bare=render(A.LensMap,{puzzle,input:{kind:'filter',lens:null,position:A.LENS_START},onChange(){}});
assert.ok(!bare.includes('data-route-art'),'No inscription rendered when lens put away');
const away=render(A.LensMap,{puzzle,input:{kind:'filter',lens:'sun',position:A.LENS_START},onChange(){}});
assert.ok(away.includes('镜下没有清晰刻记'),'Unobserved routes never leak into live accessibility text');
console.log('Shared nautical symbol identity, render, aperture and discovery checks passed');
