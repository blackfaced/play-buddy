import assert from 'node:assert/strict';
import {build} from 'esbuild';
await build({stdin:{contents:"export * from './src/escape/campaign/episodes/clockworkLogic'; export * from './src/escape/campaign/episodes/shadowLogic'; export * from './src/escape/campaign/episodes/greenhouseLogic';",resolveDir:process.cwd()},outfile:'node_modules/.tmp-mechanical.mjs',bundle:true,platform:'node',format:'esm'});
const M=await import('../node_modules/.tmp-mechanical.mjs');
const perms=a=>a.length?a.flatMap((x,i)=>perms(a.filter((_,j)=>j!==i)).map(p=>[x,...p])):[[]];
assert.deepEqual(perms([24,36,48]).filter(M.gearsMesh),[[24,36,48]]);
assert.deepEqual(perms([0,1,2,3]).filter(M.muralJoined),[[0,3,2,1]]);
assert.deepEqual(M.gearReadings([24,36,48]),[6,8,9]);
assert.deepEqual(perms([1,2,3]).filter(a=>M.weightTorque(a)===10),[[3,2,1]]);
for(let p=0;p<3;p++) assert.equal([0,1,2,3].filter(r=>M.maskMatches(p,r)).length,1);
const pipes=[];for(let n=0;n<4096;n++){let v=n;const a=Array.from({length:6},()=>{const x=v%4;v=Math.floor(v/4);return x;});if(M.waterCircuit(a).connected)pipes.push(a);}
assert.deepEqual(pipes,[[2,1,2,0,3,0]]);
assert.deepEqual(M.waterCircuit(pipes[0]).path,[0,3,4,1,2,5]);
console.log('mechanical episode independent domains pass');
// Independent physical final enumerations, without consuming production answer arrays.
const clock=[];for(let a=0;a<12;a++)for(let b=0;b<12;b++)for(let c=0;c<12;c++)if(M.camRelease([a,b,c]))clock.push([a,b,c]);
assert.deepEqual(clock,[[9,6,8]]);
const shadow=[];for(const order of perms([0,1,2]))for(let a=1;a<=3;a++)for(let b=1;b<=3;b++)for(let c=1;c<=3;c++)for(let x=0;x<4;x++)for(let y=0;y<4;y++)for(let z=0;z<4;z++)if(M.projectionMatches(order,[a,b,c],[x,y,z]))shadow.push({order,depths:[a,b,c],turns:[x,y,z]});
assert.deepEqual(shadow,[{order:[1,0,2],depths:[3,2,1],turns:[3,1,2]}]);
assert.deepEqual(perms([0,1,2]).filter(p=>M.potsWatered(pipes[0],p)),[[2,0,1]]);
const masks=[[[0,0],[1,0],[0,1],[0,2],[1,2]],[[0,1],[1,1],[2,1],[2,0]],[[0,0],[1,1],[2,0],[2,1]]];
for(let p=0;p<3;p++){let expected=masks[p];for(let r=0;r<4;r++){assert.deepEqual(M.rotateMask(masks[p],r),expected);expected=expected.map(([x,y])=>[2-y,x]);}}
for(const row of perms([0,1,2]))assert.equal(M.growthJoined(row),row.join()==='0,1,2');
for(let i=0;i<6;i++){const broken=[...pipes[0]];broken[i]=(broken[i]+1)%4;assert.equal(M.potsWatered(broken,[2,0,1]),false);}
// Raw hostile or old state cannot create earned results; normalization is idempotent.
for(const [initial,normalize] of [[M.initialClockwork,M.normalizeClockwork],[M.initialShadow,M.normalizeShadow],[M.initialGreenhouse,M.normalizeGreenhouse]]){for(const values of [{},{gears:[24,24,48],cams:[-1,Infinity,9],released:true},{pipes:[2,1,2,0,3],pumped:true},{weights:[0,3,7],lit:true},initial().values]){const s=normalize({...initial(),values,inventory:['invented'],solved:['forged']});assert.deepEqual(normalize(s),s);assert.ok(!s.inventory.includes('invented'));assert.ok(!s.solved.includes('forged'));}}
console.log('Exhaustive final uniqueness: 1,728 cams, 10,368 projected stages, 4,096 water circuits; masks, broken circuits and normalization verified.');
