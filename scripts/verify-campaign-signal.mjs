import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({stdin:{contents:"export * from './src/escape/campaign/episodes/radioModel'; export * from './src/escape/campaign/episodes/musicModel';",resolveDir:process.cwd()},outfile:'node_modules/.tmp-campaign-signal.mjs',bundle:true,platform:'node',format:'esm'});
const A=await import('../node_modules/.tmp-campaign-signal.mjs');
const permutations=a=>a.length?a.flatMap((x,i)=>permutations(a.filter((_,j)=>j!==i)).map(b=>[x,...b])):[[]];
const base=[0,1,1,0,-1,0,-1,0];
const targets=[[ -1,0,0,1,1,0,-1,0],[1,0,-1,0,-1,0,0,1],[-1,0,-1,0,0,1,1,0]];
const phases=targets.map(t=>Array.from({length:4},(_,r)=>r).filter(r=>base.every((_,i)=>base[(i-r*2+8)%8]===t[i])));
assert.deepEqual(phases,[[1],[3],[2]]);
assert.deepEqual(A.RADIO_TARGETS,targets);
for(let r=0;r<4;r++)assert.deepEqual(A.radioWave(r),base.map((_,i)=>base[(i-r*2+8)%8]));
const wireEnds=[[0,2],[1,0],[2,1]], lower=[1,2,0];
const routings=permutations([0,1,2]).filter(p=>p.every((wire,socket)=>wireEnds[wire][1]===lower[socket]));
assert.deepEqual(routings,[[2,0,1]]);
const stations=[0,1,2], plugs=routings[0].map(w=>stations[w]);
let s=A.radioInitial();s.values={...s.values,phases:phases.map(x=>x[0]),wires:routings[0],plugs,transmitted:true};
assert.equal(A.radioReady(s),true);assert.equal(A.radioNormalize(s).solved.includes('broadcast'),true);
for(const k of ['phases','wires','plugs']){const bad=structuredClone(s);bad.values[k]=[0,0,0];assert.equal(A.radioReady(bad),false);assert.equal(A.radioNormalize(bad).solved.includes('broadcast'),false);}
assert.deepEqual(A.radioNormalize({...A.radioInitial(),solved:['broadcast'],inventory:['anything']}).solved,[]);
const birds=[1,-1,0,2,-1,1], holes=birds.map(x=>x>=0);
const offsets=Array.from({length:6},(_,r)=>r).filter(r=>holes.every((v,i)=>v===holes[(i-r+6)%6]));assert.deepEqual(offsets,[0,3]);assert.deepEqual(offsets.filter(r=>r===0),[0]);
const lengths=[9,6,4], order=permutations([0,1,2]).filter(p=>p.every((b,i)=>lengths[b]===[9,6,4][i]));assert.deepEqual(order,[[0,1,2]]);
const pegs=birds.flatMap((bird,beat)=>bird<0?[]:[bird*6+beat]);
assert.deepEqual(pegs,[6,2,15,11]);assert.deepEqual(A.MUSIC_ROLL,birds);
let m=A.musicInitial();m.values={...m.values,pegs,played:true};assert.equal(A.musicReady(m),true);
for(let i=0;i<18;i++){let p=pegs.includes(i)?pegs.filter(x=>x!==i):[...pegs,i];assert.equal(A.musicReady({...m,values:{...m.values,pegs:p}}),false);}
let matches=0;for(let mask=0;mask<2**18;mask++){let p=[];for(let i=0;i<18;i++)if(mask&(1<<i))p.push(i);if(A.musicReady({...m,values:{...m.values,pegs:p}}))matches++;}assert.equal(matches,1);
assert.deepEqual(A.musicNormalize({...A.musicInitial(),solved:['melody'],inventory:['fake']}).solved,[]);
assert.deepEqual(A.musicNormalize({...m,values:{...m.values,pegs:[...pegs,6]}}).values.pegs,[2,6,11,15]);
console.log('Signal/music: independent waveform, terminal, rhythm and exhaustive 262144 pegboard proofs passed.');

assert.deepEqual(A.radioNormalize({...A.radioInitial(),values:{phases:[0,0,0],wires:[0,0,0],plugs:[1,1,1]}}).values.wires,[0,1,2]);
assert.deepEqual(A.musicNormalize({...A.musicInitial(),values:{bars:[2,2,2]}}).values.bars,[2,0,1]);
