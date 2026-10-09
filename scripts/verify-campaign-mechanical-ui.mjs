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
const find=label=>{const b=tree.root.findAllByType('button').find(n=>text(n).trim()===label||n.props['aria-label']===label);assert.ok(b,`missing ${label}`);return b;};
const click=async label=>act(async()=>find(label).props.onClick());
const choose=async (from,to)=>{const bs=()=>tree.root.findAllByType('button').filter(b=>/^拿起|^放到/.test(text(b)));await act(async()=>bs()[from].props.onClick());await act(async()=>bs()[to].props.onClick());};
const mount=async(d,s=d.initial())=>{def=d;state=s;await act(async()=>{tree=create(React.createElement(d.Component,props()));});};
const unmount=async()=>act(async()=>tree.unmount());
const roundtrip=()=>assert.deepEqual(M.parseEpisode(def,M.serializeEpisode(def,state)).state,state);
mkdirSync('/tmp/mechanical-qa',{recursive:true});
function snapshot(name){const node=n=>typeof n==='string'?n:React.createElement(n.type,n.props,...(n.children??[]).map(node));const markup=renderToStaticMarkup(node(tree.toJSON()));writeFileSync(`/tmp/mechanical-qa/${name}.html`,'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:20px;background:#22202a;font-family:sans-serif}'+readFileSync('src/escape/campaign/episodes/clockworkShared.css','utf8')+'</style>'+markup);let level=0,end=0;for(const m of markup.matchAll(/<\/?svg\b[^>]*>/g)){level+=m[0].startsWith('</')?-1:1;if(level===0){end=m.index+m[0].length;break;}}const svg=markup.slice(markup.indexOf('<svg'),end);if(svg)writeFileSync(`/tmp/mechanical-qa/${name}.svg`,svg.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"'));}
for(const d of [M.clockworkEpisode,M.shadowEpisode,M.greenhouseEpisode]){await mount(d);snapshot(d.id);assert.equal(tree.root.findAllByType('input').filter(n=>n.props.type==='number').length,0);await unmount();}
await mount(M.clockworkEpisode);await click('掀起齿轮笼的布');await click('摇动曲柄一圈 ↻');assert.deepEqual(state.solved,[]);await click('拿起 48 齿轮');await click('装到3号轴');await click('拿起 36 齿轮');await click('装到2号轴');await click('摇动曲柄一圈 ↻');await click('摇动曲柄一圈 ↻');snapshot('clockwork-gears');assert.ok(state.solved.includes('gears'));roundtrip();await click('← 环顾四周');await click('查看鸟画木条');await choose(0,1);await choose(1,3);await choose(2,3);assert.deepEqual(state.values.mural,[0,3,2,1]);snapshot('clockwork-mural');await click('← 环顾四周');await click('查看钟门和钟绳');await click('拉下钟绳');assert.equal(def.isComplete(state),false);for(const [name,n] of [['猫头鹰',9],['燕子',6],['海燕',8]])for(let i=0;i<n;i++)await click(`${name} ↻`);snapshot('clockwork-cams');await click('拉下钟绳');assert.ok(def.isComplete(state));roundtrip();await unmount();
await mount(M.shadowEpisode);await click('打开纸偶箱');for(const [label,n] of [['月亮',1],['小船',3],['飞鸟',2]])for(let i=0;i<n;i++)await click(`${label}纸偶 ↻`);assert.ok(state.solved.includes('traces'));snapshot('shadow-traces');await click('← 环顾四周');await click('查看幕布配重');await choose(0,2);assert.ok(state.solved.includes('balance'));snapshot('shadow-balance');await click('← 环顾四周');await click('走到灯后的舞台');await choose(0,2);await choose(1,2);assert.deepEqual(state.values.pieces,[1,0,2]);for(let i=0;i<3;i++){const sliders=tree.root.findAllByType('input').filter(n=>n.props.type==='range');await act(async()=>sliders[i].props.onChange({target:{value:String(3-i)}}));for(let k=0;k<[3,1,2][i];k++){const bs=tree.root.findAllByType('button').filter(n=>text(n)==='转动纸偶 ↻');await act(async()=>bs[i].props.onClick());}}snapshot('shadow-stage');await click('拉下演出灯杆');assert.ok(def.isComplete(state));roundtrip();await unmount();
await mount(M.greenhouseEpisode);await click('展开生长画片');for(let row=0;row<3;row++){let a=state.values[['sun','bell','fern'][row]];for(let dest=0;dest<3;dest++){const from=a.indexOf(dest);if(from!==dest){await choose(row*3+from,row*3+dest);a=state.values[['sun','bell','fern'][row]];}}}assert.ok(state.solved.includes('growth'));snapshot('greenhouse-growth');await click('← 环顾四周');await click('查看接雨花盆');await choose(0,2);await choose(1,2);assert.deepEqual(state.values.pots,[2,0,1]);await click('摇动雨水泵');assert.equal(def.isComplete(state),false);const pots=[...state.values.pots];await click('← 环顾四周');await click('擦开灌溉板的雾气');for(let i=0;i<6;i++)for(let n=0;n<[2,1,2,0,3,0][i];n++)await click(`${i<3?'上':'下'}排第${i%3+1}段 ↻`);await click('压下试水阀');assert.ok(state.solved.includes('pipes'));snapshot('greenhouse-pipes');await click('← 环顾四周');await click('查看接雨花盆');assert.deepEqual(state.values.pots,pots);await click('摇动雨水泵');assert.ok(def.isComplete(state));snapshot('greenhouse-bench');roundtrip();await unmount();
assert.equal(completions,3);
// Direct pointer dragging moves artwork; cancellation leaves the physical board intact.
await mount(M.clockworkEpisode);await click('查看鸟画木条');
const board=tree.root.findAllByType('svg').find(n=>n.props.onPointerUp);
const draggable=tree.root.findAllByType('g').find(n=>n.props.onPointerDown);
await act(async()=>draggable.props.onPointerDown({pointerId:1,clientX:75,clientY:75,currentTarget:{ownerSVGElement:{setPointerCapture(){}}}}));
await act(async()=>board.props.onPointerMove({clientX:225,clientY:75,currentTarget:{getBoundingClientRect:()=>({left:0,top:0,width:600,height:150})}}));
await act(async()=>board.props.onPointerUp({clientX:225,clientY:75,currentTarget:{getBoundingClientRect:()=>({left:0,top:0,width:600,height:150})}}));
assert.deepEqual(state.values.mural,[0,2,1,3]);
const beforeCancel=[...state.values.mural];await act(async()=>board.props.onPointerCancel());assert.deepEqual(state.values.mural,beforeCancel);
// Reopening a completed source keeps all clue artwork fully opaque and operable.
await choose(1,3);await choose(2,3);assert.ok(state.solved.includes('mural'));
await click('← 环顾四周');await click('查看鸟画木条');assert.equal(tree.root.findAllByType('button').filter(n=>n.props.disabled).length,0);
assert.equal(tree.root.findAll(n=>n.props.style?.opacity!==undefined && n.props.style.opacity<1).length,0);
mode='easy';await act(async()=>tree.update(React.createElement(def.Component,props())));assert.ok(tree.root.findAllByProps({className:'mech-rules'}).length);
mode='challenge';await act(async()=>tree.update(React.createElement(def.Component,props())));assert.equal(tree.root.findAllByProps({className:'mech-rules'}).length,0);mode='standard';await unmount();
// Source B can be reconstructed without touching source A in Clockwork as well.
assert.ok(state.solved.includes('mural'));assert.ok(!state.solved.includes('gears'));

// Reload both completed and malformed saves, source flags cannot grant completion.
for(const d of [M.clockworkEpisode,M.shadowEpisode,M.greenhouseEpisode]){const forged={...d.initial(),solved:['gears','mural','balance','traces','pipes','growth'],inventory:['fake']};const n=d.normalize(forged);assert.equal(d.isComplete(n),false);assert.ok(!n.inventory.includes('fake'));const raw=JSON.stringify({version:1,episode:d.id,state:{...forged,values:{gears:[-1,99,NaN],pipes:[-1,99,2],cams:[99,99,99],weights:[9,9,9],released:true,lit:true,pumped:true}}});assert.equal(d.isComplete(M.parseEpisode(d,raw).state),false);}
console.log('Mechanical rendered journeys: all three whole-board endings, wrong attempts preserve input, independent source access, save roundtrips and forged-state rejection pass.');
