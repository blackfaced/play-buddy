import assert from 'node:assert/strict';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
await build({stdin:{contents:`export * from './src/escape/campaign/registry';export * from './src/escape/campaign/types';export * from './src/escape/scenes';`,resolveDir:process.cwd()},outfile:'node_modules/.tmp-campaign-registry.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});
const A=await import('../node_modules/.tmp-campaign-registry.mjs');
assert.deepEqual(A.CAMPAIGN_EPISODES.map(e=>e.id),A.CAMPAIGN_IDS);
assert.deepEqual(A.SCENE_IDS,['cabin','expedition','foglight',...A.CAMPAIGN_IDS]);
assert.equal(new Set(A.CAMPAIGN_EPISODES.map(e=>e.id)).size,7);
for (const e of A.CAMPAIGN_EPISODES) {
  assert.equal(typeof e.Component,'function');
  const initial=e.normalize(e.initial());
  assert.equal(e.isComplete(initial),false,`${e.id} starts unsolved`);
  assert.deepEqual(e.normalize(initial),initial,`${e.id} normalization idempotent`);
  assert.equal(e.hints(initial).length,3);
  const html=renderToStaticMarkup(React.createElement(e.Component,{state:initial,update(){},complete(){},announce(){},mode:'standard',openDetail(){},closeDetail(){}}));
  assert.ok(html.includes('<svg'),`${e.id} must render a real physical scene`);
  assert.ok((html.match(/<button/g)??[]).length >= 2,`${e.id} has independent exploration targets`);
  assert.ok(!/coming soon|敬请期待|施工中/i.test(html));
}
console.log('All ten entries and seven actual independent physical episode components passed.');
