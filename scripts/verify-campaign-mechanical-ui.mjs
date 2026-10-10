import assert from 'node:assert/strict';
import {build} from 'esbuild';
import React from 'react';
import {create,act} from 'react-test-renderer';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
await build({stdin:{contents:"export {clockworkEpisode} from './src/escape/campaign/episodes/clockwork'; export {shadowEpisode} from './src/escape/campaign/episodes/shadow'; export {greenhouseEpisode} from './src/escape/campaign/episodes/greenhouse'; export * from './src/escape/campaign/engine';",resolveDir:process.cwd()},outfile:'node_modules/.tmp-mechanical-ui.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});
const M=await import('../node_modules/.tmp-mechanical-ui.mjs');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let tree,state,def,mode='standard',completions=0;const messages=[];
const props=()=>({state,mode,update:patch=>{state=M.updateEpisode(def,state,patch);tree.update(React.createElement(def.Component,props()));},complete:()=>completions++,announce:m=>messages.push(m),openDetail(){},closeDetail(){}});
const text=n=>typeof n==='string'?n:(n.children??[]).map(text).join('');
const find=label=>{const b=tree.root.findAll(n=>n.type==='button'||n.props.role==='button').find(n=>text(n).trim()===label||n.props['aria-label']===label);assert.ok(b,`missing ${label}`);return b;};
const click=async label=>act(async()=>find(label).props.onClick());
const walk=async target=>{const place=()=>text(tree.root.findByProps({className:'cw-location'}));let current=place().includes('检修夹层')?'service':place().includes('工作台')?'bench':place().includes('配重井')?'shaft':'room';if(current===target)return;if(current==='service'){await click('从检修洞回配重井');current='shaft';}if(current!=='room'){await click(current==='bench'?'穿过木门回阁楼':'沿楼梯回到阁楼');}if(target!=='room')await click(target==='bench'?'穿过木门到工作间':'沿楼梯下到配重井');};
const choose=async (from,to)=>{const bs=()=>tree.root.findAllByType('button').filter(b=>/^拿起|^放到/.test(text(b)));await act(async()=>bs()[from].props.onClick());await act(async()=>bs()[to].props.onClick());};
const mount=async(d,s=d.initial())=>{def=d;state=s;await act(async()=>{tree=create(React.createElement(d.Component,props()));});};
const unmount=async()=>act(async()=>tree.unmount());
const roundtrip=()=>assert.deepEqual(M.parseEpisode(def,M.serializeEpisode(def,state)).state,state);
mkdirSync('/tmp/mechanical-qa',{recursive:true});
function snapshot(name){const node=n=>typeof n==='string'?n:React.createElement(n.type,n.props,...(n.children??[]).map(node));const markup=renderToStaticMarkup(node(tree.toJSON()));writeFileSync(`/tmp/mechanical-qa/${name}.html`,'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:20px;background:#22202a;font-family:sans-serif}'+['clockworkShared.css','clockworkExploration.css','clockworkGears.css'].map(f=>readFileSync('src/escape/campaign/episodes/'+f,'utf8')).join('')+'</style>'+markup);let level=0,end=0;for(const m of markup.matchAll(/<\/?svg\b[^>]*>/g)){level+=m[0].startsWith('</')?-1:1;if(level===0){end=m.index+m[0].length;break;}}const svg=markup.slice(markup.indexOf('<svg'),end);if(svg)writeFileSync(`/tmp/mechanical-qa/${name}.svg`,svg.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"'));}
for(const d of [M.clockworkEpisode,M.shadowEpisode,M.greenhouseEpisode]){await mount(d);snapshot(d.id);assert.equal(tree.root.findAllByType('input').filter(n=>n.props.type==='number').length,0);await unmount();}
await mount(M.clockworkEpisode);
await click('查看上层栅门');assert.equal(state.values.upperOpen,false);
await click('掀起齿轮笼的布');assert.equal(state.values.cloth,true);snapshot('clockwork-uncovered');
await click('查看齿轮笼');await click('摇动曲柄一圈 ↻');assert.deepEqual(state.solved,[]);snapshot('clockwork-empty-gears');
await click('← 环顾四周');await walk('shaft');await click('查看缺了摇柄的起重器');assert.equal(state.values.hoist,false);snapshot('clockwork-shaft-stalled');
await walk('bench');await click('拉开工作台抽屉');snapshot('clockwork-open-drawer');await click('查看拉开的抽屉');await click('拿起桌边的短摇柄');
assert.deepEqual(state.values.foundGears,[24]);assert.ok(state.inventory.includes('短摇柄'));roundtrip();
await walk('shaft');await click('扶起倒下的窗板');snapshot('clockwork-open-shutter');await click('查看窗板后的凹槽');await click('把短摇柄装上起重器并转动');snapshot('clockwork-hoist-crack');assert.equal(state.values.upperOpen,false);await click('钻进窗下的检修洞');await click('取出配重下面的齿轮');await click('拿起检修架上的画片');roundtrip();
// Interrupt after discovery; restored physical props and inventory remain usable.
const interrupted=M.parseEpisode(def,M.serializeEpisode(def,state)).state;await unmount();await mount(M.clockworkEpisode,interrupted);
await click('查看齿轮笼');for(const [t,axis] of [[24,'芦苇'],[36,'海浪'],[48,'松树']]){await click(`${t} 齿 · 托盘`);await click(`装到${axis}轴`);}
assert.ok(!state.solved.includes('gears'),'placing gears is not a completed trial');await click('摇动曲柄一圈 ↻');await click('摇动曲柄一圈 ↻');snapshot('clockwork-gears');assert.ok(state.solved.includes('gears'));roundtrip();
await click('← 环顾四周');snapshot('clockwork-raised-gate');await walk('shaft');snapshot('clockwork-raised-weight');await walk('bench');await click('查看工作台上的残画');await click('把拾回的画片放进画框');await choose(0,1);await choose(1,3);await choose(2,3);assert.deepEqual(state.values.mural,[0,3,2,1]);snapshot('clockwork-mural');
await click('← 环顾四周');await walk('room');await click('走进上层钟门');await click('拉下钟绳');assert.equal(def.isComplete(state),false);for(const [name,n] of [['猫头鹰',9],['燕子',6],['海燕',8]])for(let i=0;i<n;i++)await click(`${name} ↻`);snapshot('clockwork-cams');await click('拉下钟绳');assert.ok(def.isComplete(state));roundtrip();await unmount();
// Episodes 05/06 now walk through physical discovery/use before their original boards.
// Their focused suites exercise actual SVG, inventory, board and confirmation handlers.
await import('./verify-shadow-exploration.mjs');
await import('./verify-greenhouse-exploration.mjs');
assert.equal(completions,1); // Clockwork above; each focused suite verifies its own ending.
// Direct pointer dragging moves artwork; cancellation leaves the physical board intact.
await mount(M.clockworkEpisode);await walk('bench');await click('拉开工作台抽屉');await click('查看拉开的抽屉');await walk('shaft');await click('扶起倒下的窗板');await click('查看窗板后的凹槽');await click('钻进窗下的检修洞');await click('拿起检修架上的画片');await walk('bench');await click('查看工作台上的残画');await click('把拾回的画片放进画框');
const board=tree.root.findAllByType('svg').find(n=>n.props.onPointerUp);
const draggable=tree.root.findAllByType('g').find(n=>n.props.onPointerDown);
await act(async()=>draggable.props.onPointerDown({pointerId:1,clientX:75,clientY:75,currentTarget:{ownerSVGElement:{setPointerCapture(){}}}}));
await act(async()=>board.props.onPointerMove({clientX:225,clientY:75,currentTarget:{getBoundingClientRect:()=>({left:0,top:0,width:600,height:150})}}));
await act(async()=>board.props.onPointerUp({clientX:225,clientY:75,currentTarget:{getBoundingClientRect:()=>({left:0,top:0,width:600,height:150})}}));
assert.deepEqual(state.values.mural,[0,2,1,3]);
const beforeCancel=[...state.values.mural];await act(async()=>board.props.onPointerCancel());assert.deepEqual(state.values.mural,beforeCancel);
// Reopening a completed source keeps all clue artwork fully opaque and operable.
await choose(1,3);await choose(2,3);assert.ok(state.solved.includes('mural'));
await click('← 环顾四周');await click('查看工作台上的残画');assert.equal(tree.root.findAllByType('button').filter(n=>n.props.disabled).length,0);
assert.equal(tree.root.findAll(n=>n.props.style?.opacity!==undefined && n.props.style.opacity<1).length,0);
mode='easy';await act(async()=>tree.update(React.createElement(def.Component,props())));assert.ok(tree.root.findAllByProps({className:'mech-rules'}).length);
mode='challenge';await act(async()=>tree.update(React.createElement(def.Component,props())));assert.equal(tree.root.findAllByProps({className:'mech-rules'}).length,0);mode='standard';await unmount();
// Source B can be reconstructed without touching source A in Clockwork as well.
assert.ok(state.solved.includes('mural'));assert.ok(!state.solved.includes('gears'));

// Reload both completed and malformed saves, source flags cannot grant completion.
for(const d of [M.clockworkEpisode,M.shadowEpisode,M.greenhouseEpisode]){const forged={...d.initial(),solved:['gears','mural','balance','traces','pipes','growth'],inventory:['fake']};const n=d.normalize(forged);assert.equal(d.isComplete(n),false);assert.ok(!n.inventory.includes('fake'));const raw=JSON.stringify({version:1,episode:d.id,state:{...forged,values:{gears:[-1,99,NaN],pipes:[-1,99,2],cams:[99,99,99],weights:[9,9,9],released:true,lit:true,pumped:true}}});assert.equal(d.isComplete(M.parseEpisode(d,raw).state),false);}
console.log('Mechanical rendered journeys: all three whole-board endings, wrong attempts preserve input, independent source access, save roundtrips and forged-state rejection pass.');
