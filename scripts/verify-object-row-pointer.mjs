import assert from 'node:assert/strict';
import {build} from 'esbuild';
import React from 'react';
import {create,act} from 'react-test-renderer';
import {readFileSync} from 'node:fs';
await build({stdin:{contents:"export {updateEpisode} from './src/escape/campaign/engine'; export {ObjectRow,Bird} from './src/escape/campaign/episodes/clockworkShared'; export {greenhouseEpisode} from './src/escape/campaign/episodes/greenhouse'; export {shadowEpisode} from './src/escape/campaign/episodes/shadow';",resolveDir:process.cwd()},outfile:'node_modules/.tmp-object-row-pointer.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});
const M=await import('../node_modules/.tmp-object-row-pointer.mjs');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let tree,items=[0,1,2],changes=0;
const props=()=>({items,label:'Bird artwork',render:n=>React.createElement(M.Bird,{kind:n,x:75,y:75}),onChange:next=>{items=next;changes++;tree.update(React.createElement(M.ObjectRow,props()));}});
await act(async()=>{tree=create(React.createElement(M.ObjectRow,props()));});
const board=()=>tree.root.findByType('svg');
const slots=()=>tree.root.findAllByType('g').filter(n=>n.props.onPointerDown);
const bounds={left:0,top:0,width:450,height:150};
const svg={getBoundingClientRect:()=>bounds,setPointerCapture(){},releasePointerCapture(){},hasPointerCapture:()=>true};
const evt=(x,y,extra={})=>({pointerId:1,pointerType:'mouse',button:0,isPrimary:true,clientX:x,clientY:y,currentTarget:svg,preventDefault(){},...extra});
const down=async(i,x=i*150+75,y=75,extra={})=>act(async()=>slots()[i].props.onPointerDown(evt(x,y,{currentTarget:{ownerSVGElement:svg},...extra})));
const move=async(x,y,extra={})=>act(async()=>board().props.onPointerMove(evt(x,y,extra)));
const up=async(x,y,extra={})=>act(async()=>board().props.onPointerUp(evt(x,y,extra)));
const click=async(i)=>act(async()=>slots()[i].props.onClick?.({detail:1}));
const tap=async i=>{await down(i);await up(i*150+75,75);await click(i);};
await tap(0);assert.equal(slots()[0].props['aria-pressed'],true,'actual SVG tap selects artwork');assert.equal(changes,0);assert.equal(slots()[0].props['data-drop-target'],false);assert.equal(slots()[1].props['data-drop-target'],true,'other slots show a non-answer drop affordance');
await tap(2);assert.deepEqual(items,[2,1,0]);assert.equal(changes,1,'pointerup + click swaps exactly once');assert.equal(slots()[2].props['aria-pressed'],false);
await down(0);await move(230,75);await up(230,75);await click(0);assert.deepEqual(items,[1,2,0]);assert.equal(changes,2);
await down(0);await move(230,75);await move(75,75);await up(75,75);await click(0);assert.equal(changes,2,'drag returning to origin is not tap');assert.equal(slots()[0].props['aria-pressed'],false);
for(const [x,y] of [[-20,75],[500,75],[230,-20],[230,200]]){await down(0);await move(x,y);await up(x,y);await click(0);assert.equal(changes,2,'outside drop must not clamp into a slot');}
await down(0);await move(230,75);await act(async()=>board().props.onPointerCancel(evt(230,75)));await up(230,75);await click(0);assert.equal(changes,2,'cancel never swaps');
await down(0);await move(230,75);await act(async()=>board().props.onLostPointerCapture(evt(230,75)));await up(230,75);assert.equal(changes,2);
await down(0,75,75,{pointerType:'touch'});await move(78,115,{pointerType:'touch'});await up(78,115,{pointerType:'touch'});await click(0);assert.equal(changes,2);assert.equal(slots()[0].props['aria-pressed'],false,'vertical scrolling is not selection');
await down(0,75,75,{pointerType:'touch'});await move(230,78,{pointerType:'touch'});await up(230,78,{pointerType:'touch'});await click(0);assert.equal(changes,3,'horizontal touch drag works');
const key=async(i,key)=>act(async()=>slots()[i].props.onKeyDown({key,repeat:false,preventDefault(){}}));
await key(0,'Enter');assert.equal(slots()[0].props['aria-pressed'],true);await key(2,' ');assert.equal(changes,4);await key(1,'Enter');await key(1,'Escape');assert.equal(slots()[1].props['aria-pressed'],false);
await tap(0);await tap(0);assert.equal(changes,4,'same-slot second tap puts back without change');
assert.equal(tree.root.findAllByType('button').length,0,'artwork is the sole pickup/drop control');
assert.equal(tree.root.findAllByProps({className:'mech-slot-controls'}).length,0);
assert.ok(tree.root.findByProps({className:'mech-object-help mech-sr'}).children.length,'keyboard instructions remain screen-reader accessible');
assert.equal(tree.root.findByProps({role:'status'}).props.className,'mech-sr','idle and pickup narration must not duplicate the artwork');
assert.equal(tree.root.findAllByProps({'data-object-hit':true}).length,items.length,'each complete slot has a transparent hit area');
for(const slot of slots()) { assert.equal(slot.props.tabIndex,0); assert.ok(slot.props['aria-describedby']); }
assert.ok(tree.root.findAllByType('path').length>0,'source bird artwork is rendered');
await act(async()=>tree.update(React.createElement(M.ObjectRow,{...props(),disabled:true})));await tap(0);assert.equal(changes,4);
await act(async()=>tree.unmount());
// Stage 05 now owns its unified SVG/rail workarea; equivalent real-art pointer,
// cancellation, primary ownership and keyboard coverage lives in verify-shadow-stage-workarea.mjs.
// Exercise each actual shared scene in every difficulty; help is independent of answer hints.
for(const [def,label] of [[M.shadowEpisode,'查看幕布配重'],[M.greenhouseEpisode,'展开生长画片'],[M.greenhouseEpisode,'查看接雨花盆']])for(const mode of ['easy','standard','challenge']){
 // Focus this test on mounted ObjectRow event behavior; full discovery is covered separately.
 let state=M.updateEpisode(def,def.initial(),{values:def.id==='shadow'?{chest:true,puppetsFound:true,puppetsMounted:true,lampHandle:true,lampOpen:true}:{cloth:true,wiped:true,floatRaised:true,cabinet:true,cards:true}}); const p=()=>({state,mode,update:patch=>{state=M.updateEpisode(def,state,patch);tree.update(React.createElement(def.Component,p()));},announce(){},complete(){},openDetail(){},closeDetail(){}});
 await act(async()=>{tree=create(React.createElement(def.Component,p()));});
 const text=n=>typeof n==='string'?n:(n.children??[]).map(text).join('');
 const activate=async name=>act(async()=>{const target=tree.root.findAll(n=>(n.type==='button'||n.type==='g')&&typeof n.props.onClick==='function'&&(n.props['aria-label']===name||text(n)===name))[0];assert.ok(target,`missing scene target ${name}`);target.props.onClick();});
 if(label==='查看灯后的舞台')await activate('走到放映廊');
 if(label==='展开生长画片')await activate('走进工具间');
 if(label==='查看接雨花盆')await activate('沿小径走到雨棚');
 await activate(label);
 assert.ok(tree.root.findAllByProps({className:'mech-object-help mech-sr'}).length);
 assert.equal(tree.root.findAllByProps({className:'mech-slot-controls'}).length,0);
 assert.equal(tree.root.findAll(n=>n.props.style?.opacity<1).length,0);
 const row=()=>tree.root.findAllByType(M.ObjectRow)[0];
 const initial=[...row().props.items];
 const rowSvg=()=>row().findAllByType('svg').find(n=>n.props.onPointerUp);
 const rowSlots=()=>row().findAllByType('g').filter(n=>n.props.onPointerDown);
 const rowNode={...svg,getBoundingClientRect:()=>({...bounds,width:initial.length*150})};
 for(const index of [0,initial.length-1]){
  await act(async()=>rowSlots()[index].props.onPointerDown(evt(index*150+75,75,{currentTarget:{ownerSVGElement:rowNode}})));
  await act(async()=>rowSvg().props.onPointerUp(evt(index*150+75,75,{currentTarget:rowNode})));
  await act(async()=>rowSlots()[index].props.onClick({detail:1}));
 }
 const swapped=[...initial];[swapped[0],swapped[swapped.length-1]]=[swapped[swapped.length-1],swapped[0]];
 assert.deepEqual(row().props.items,swapped,`${def.id} ${label} ${mode}: actual scene art swaps`);
 await act(async()=>tree.unmount());
}
const css=readFileSync('src/escape/campaign/episodes/clockworkShared.css','utf8');
assert.match(css,/touch-action:\s*pan-y pinch-zoom/);assert.match(css,/\.mech-object-row>svg[^}]*overflow:\s*hidden/);
console.log('ObjectRow real artwork event sequences: two taps, click suppression, drag, outside/cancel/capture loss, touch scroll, keyboard, disabled and accessible artwork-only controls in all modes pass.');
