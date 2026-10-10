import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({stdin:{contents:`export * from './src/escape/campaign/registry'; export * from './src/escape/campaign/engine';`,resolveDir:process.cwd()},outfile:'node_modules/.tmp-independent-exploration-migration.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});
const A=await import('../node_modules/.tmp-independent-exploration-migration.mjs');
// Independently specified pre-exploration-schema records, including completed and unsolved arrangements.
const records={
shadow:{base:{weights:[1,2,3],traces:[0,0,0],pieces:[0,2,1],depths:[1,1,1],turns:[0,0,0],demo:1,lit:false},done:{weights:[3,2,1],traces:[1,3,2],pieces:[1,0,2],depths:[3,2,1],turns:[3,1,2],lit:true},preserve:['weights','traces','pieces','depths','turns','demo','lit']},
greenhouse:{base:{pipes:[0,0,0,0,0,0],sun:[2,0,1],bell:[1,2,0],fern:[2,1,0],pots:[0,1,2],wiped:false,pumped:false},done:{pipes:[2,1,2,0,3,0],sun:[0,1,2],bell:[0,1,2],fern:[0,1,2],pots:[2,0,1],wiped:true,pumped:true},preserve:['pipes','sun','bell','fern','pots','wiped','pumped']},
radio:{base:{phases:[0,0,0],wires:[0,1,2],plugs:[0,1,2],transmitted:false},done:{phases:[1,3,2],wires:[2,0,1],plugs:[2,0,1],transmitted:true},preserve:['phases','wires','plugs','transmitted']},
music:{base:{bars:[2,0,1],roll:2,pegs:[],played:false,muted:false},done:{bars:[0,1,2],roll:0,pegs:[2,6,11,15],played:true,muted:true},preserve:['bars','roll','pegs','played','muted']},
cargo:{base:{cover:false,selected:0,scale:0,cubes:1,plate:[0,0,0],slots:[-1,-1,-1,-1],gate:false},done:{cover:true,scale:3,cubes:4,plate:[2,1,3],slots:[1,3,0,2],gate:true},preserve:['cover','scale','cubes','plate','slots','gate']},
observatory:{base:{shutters:false,lens:false,lensX:150,lensY:190,disc:0,strips:[-1,1],flips:[0,0],azimuth:0,elevation:1,roof:false},done:{shutters:true,lens:true,lensX:320,lensY:170,disc:3,strips:[0,0],flips:[0,0],azimuth:4,elevation:0,roof:true},preserve:['shutters','lens','lensX','lensY','disc','strips','flips','azimuth','elevation','roof']},
};
for(const [id,f] of Object.entries(records)){
 const def=A.CAMPAIGN_EPISODES.find(d=>d.id===id); assert.ok(def);
 const initial=def.initial();assert.equal(def.isComplete(initial),false,id+' starts unsolved');assert.deepEqual(def.normalize(initial),initial,id+' initial is canonical');
 for(const complete of [false,true]){
  const values={...f.base,...(complete?f.done:{})};const raw=JSON.stringify({version:1,episode:id,state:{values,solved:[],inventory:[],inspected:[]}});
  const loaded=A.parseEpisode(def,raw);assert.equal(loaded.status,'valid',id+' legacy record valid');
  for(const key of f.preserve)assert.deepEqual(loaded.state.values[key],values[key],`${id} preserves legacy ${key} (${complete?'complete':'unfinished'})`);
  assert.equal(def.isComplete(loaded.state),complete,id+' preserves completion');
  assert.deepEqual(def.normalize(loaded.state),loaded.state,id+' migration idempotent');
  assert.deepEqual(A.parseEpisode(def,A.serializeEpisode(def,loaded.state)).state,loaded.state,id+' repeat revisit round trip');
 }
 const future=JSON.stringify({version:2,episode:id,state:initial});assert.equal(A.parseEpisode(def,future).status,'future');
}
console.log('Independent migration: six legacy unfinished and six completed records preserve every puzzle value, completion, normalization and repeat-save identity.');
