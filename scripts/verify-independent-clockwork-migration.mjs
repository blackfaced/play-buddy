import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({stdin:{contents:`export * from './src/escape/campaign/episodes/clockwork'; export * from './src/escape/campaign/engine';`,resolveDir:process.cwd()},outfile:'node_modules/.tmp-independent-clockwork-migration.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});
const A=await import('../node_modules/.tmp-independent-clockwork-migration.mjs');
const def=A.clockworkEpisode;
const base={explorationVersion:2,gears:[0,0,0],testedGears:[0,0,0],foundGears:[],mural:[2,0,1,3],foundStrips:[0,2],cams:[0,0,0],crank:0,cloth:false,released:false,drawer:false,shutter:false,handle:false,hoist:false,upperOpen:false,stripMounted:false};
const cases=[base,
 {...base,foundGears:[36],handle:true,hoist:true},
 {...base,foundGears:[48],foundStrips:[0,2,3],shutter:true},
 {...base,foundGears:[24,36,48],foundStrips:[0,1,2,3],gears:[36,24,48],testedGears:[24,36,48],crank:2,upperOpen:true,handle:true,hoist:true,shutter:true,drawer:true,stripMounted:true,mural:[0,3,2,1]},
 {...base,foundGears:[24,36,48],foundStrips:[0,1,2,3],gears:[24,36,48],testedGears:[24,36,48],crank:2,upperOpen:true,handle:true,hoist:true,shutter:true,drawer:true,stripMounted:true,mural:[0,3,2,1],cams:[9,6,8],released:true}];
assert.equal(def.initial().values.explorationVersion,3,'new spatial schema');
for(const [i,values] of cases.entries()){
 const raw={values,solved:[],inventory:[],inspected:['room','shaft','bench']};
 const loaded=A.parseEpisode(def,JSON.stringify({version:1,episode:'clockwork',state:raw}));
 assert.equal(loaded.status,'valid');
 for(const [key,value] of Object.entries(values))if(key!=='explorationVersion')assert.deepEqual(loaded.state.values[key],value,`v2 case ${i} preserves ${key}`);
 assert.equal(def.isComplete(loaded.state),i===4);
 assert.deepEqual(def.normalize(loaded.state),loaded.state,'idempotent');
 assert.deepEqual(A.parseEpisode(def,A.serializeEpisode(def,loaded.state)).state,loaded.state,'save round trip');
}
for(const done of [false,true]){
 const values={gears:done?[24,36,48]:[48,24,36],mural:done?[0,3,2,1]:[2,0,1,3],cams:done?[9,6,8]:[0,0,0],crank:done?2:0,cloth:done,released:done};
 const state=def.normalize({values,solved:[],inventory:[],inspected:[]});
 for(const [key,value] of Object.entries(values))assert.deepEqual(state.values[key],value,`original save preserves ${key}`);
 assert.equal(state.values.upperOpen,true);assert.equal(state.values.shutter,true);assert.equal(state.values.hoist,true);
 assert.equal(def.isComplete(state),done);assert.deepEqual(def.normalize(state),state);
}
console.log('Independent clockwork migration passes: fresh v3; five v2 progress combinations; original unfinished/completed access; completion; idempotence and save round trips.');
