import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({entryPoints:['src/escape/acceptedMilestones.ts'],outfile:'node_modules/.tmp-completion-feedback.mjs',bundle:true,platform:'node',format:'esm'});
const { campaignMilestones, newlyAccepted, cabinMilestones, adventureMilestones }=await import('../node_modules/.tmp-completion-feedback.mjs');
const state=(values={},solved=[])=>({values,solved,inventory:[],inspected:[]});
for(const id of ['clockwork','shadow','greenhouse','radio','music','cargo','observatory']) {
 const derived=state({},['gears','mural','traces','pipes','growth','carrier','continuity','chimes','roll','bow-plate','star-disc','sightlines']);
 assert.deepEqual(campaignMilestones(id,derived),[],`${id}: arrangement flags are not acceptance`);
}
for(const [id,key] of [['clockwork','upperOpen'],['clockwork','released'],['shadow','curtainRaised'],['shadow','lit'],['greenhouse','floatRaised'],['greenhouse','pumped'],['radio','signalsHeard'],['radio','transmitted'],['music','played'],['cargo','gate'],['observatory','roof']]) {
 const before=campaignMilestones(id,state()), after=campaignMilestones(id,state({[key]:true}));
 assert.equal(newlyAccepted(before,after).length,1,`${id}/${key}`);
 assert.equal(newlyAccepted(after,after).length,0,'repeated accepted action');
 assert.equal(newlyAccepted(after,before).length,0,'undo/reset');
}
assert.equal(cabinMilestones({picture:true,drawer:true,cabinet:true,safe:true,escaped:true}).length,5);
assert.equal(adventureMilestones({storeroomOpen:true,safeOpen:true,projectorOn:true,panelOpen:true,gangwayDown:true}).length,5);
console.log('Completion mapping: all 10 scenes; physical arrangement flags excluded; repeated/undo transitions silent.');
