import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({ entryPoints:['src/escape/campaign/engine.ts'],outfile:'node_modules/.tmp-campaign-engine.mjs',bundle:true,platform:'node',format:'esm' });
const E = await import('../node_modules/.tmp-campaign-engine.mjs');
const def={id:'clockwork',initial:()=>({values:{wheel:0},solved:[],inventory:[],inspected:[]}),normalize:s=>({...s,solved:s.values.wheel===3?['wheel']:[],inventory:[]}),isComplete:s=>s.solved.includes('wheel')};
assert.equal(E.parseEpisode(def,null).status,'fresh');
const future=JSON.stringify({version:99,episode:'clockwork',state:{}});
assert.equal(E.parseEpisode(def,future).status,'future');
assert.equal(E.parseEpisode(def,'{').status,'invalid');
assert.equal(E.parseEpisode(def,JSON.stringify({version:1,episode:'shadow',state:def.initial()})).status,'invalid');
const forged={...def.initial(),solved:['wheel']};
assert.deepEqual(E.parseEpisode(def,E.serializeEpisode(def,forged)).state.solved,[]);
const solved={...def.initial(),values:{wheel:3}};
assert.equal(E.parseEpisode(def,E.serializeEpisode(def,solved)).state.solved[0],'wheel');
console.log('Campaign save version, identity, normalization and provenance passed.');
await build({ entryPoints:['src/escape/scenes.ts'],outfile:'node_modules/.tmp-campaign-scenes.mjs',bundle:true,platform:'node',format:'esm' });
const S = await import('../node_modules/.tmp-campaign-scenes.mjs');
assert.equal(S.SCENE_IDS.length,10);
const fresh=S.sceneProgress(null,null,null,null);
for (const id of S.SCENE_IDS.slice(1)) assert.equal(S.sceneUnlocked(fresh,id),false,`fresh lock ${id}`);
let progress=S.sceneProgress(JSON.stringify({version:1,completed:['cabin','expedition','foglight']}),null,null,null);
assert.equal(S.sceneUnlocked(progress,'clockwork'),true);
for (const id of S.SCENE_IDS.slice(3)) { assert.equal(S.sceneUnlocked(progress,id),true); progress=S.completeScene(progress,id); }
const reloaded=S.sceneProgress(JSON.stringify(progress),null,null,null);
assert.deepEqual(reloaded.completed,S.SCENE_IDS);
assert.equal(S.sceneUnlocked(S.sceneProgress(null,null,null,null,[{id:'radio',started:true,complete:false}]),'radio'),true,'surviving episode record resumes if menu was lost');
console.log('Ten-scene migration, ordered locks, retained unlocks and resume passed.');

assert.equal(S.isFutureSceneProgress(JSON.stringify({version:7,completed:[]})),true);
assert.equal(S.isFutureSceneProgress('{'),false);
for (const version of [-1, 0, '1', null]) assert.equal(E.parseEpisode(def,JSON.stringify({version,episode:'clockwork',state:def.initial()})).status,'invalid');
for (const values of [null,[],{wheel:Infinity},{wheel:{nested:1}},{wheel:[1,'bad']}]) assert.equal(E.parseEpisode(def,JSON.stringify({version:1,episode:'clockwork',state:{...def.initial(),values}})).status,'invalid');
assert.equal(E.parseEpisode({...def,normalize:()=>null},E.serializeEpisode(def,def.initial())).status,'invalid');
console.log('Malformed value shapes and future menu protection passed.');

const recovered=S.sceneProgress(null,null,null,null,[{id:'radio',started:true,complete:false}]);
for (const id of S.SCENE_IDS.slice(0,7)) assert.equal(S.sceneUnlocked(recovered,id),true,'later valid save proves earlier access was earned');
assert.equal(S.sceneUnlocked(recovered,'music'),false,'unfinished later save does not unlock next scene');
