import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import React from 'react';
import { act, create } from 'react-test-renderer';
await build({stdin:{contents:"export {default as Radio} from './src/escape/campaign/episodes/radioScene'; export {radioInitial,radioNormalize} from './src/escape/campaign/episodes/radioModel'; export {default as Music} from './src/escape/campaign/episodes/musicScene'; export {musicInitial,musicNormalize} from './src/escape/campaign/episodes/musicModel';",resolveDir:process.cwd()},outfile:'node_modules/.tmp-signal-direct.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});
const A=await import('../node_modules/.tmp-signal-direct.mjs');globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const text=n=>typeof n==='string'?n:(n.children??[]).map(text).join('');
for(const kind of ['radio','music']){
 let state=A[kind+'Normalize']({...A[kind+'Initial'](),values:{...A[kind+'Initial']().values,curtainOpen:true,wiringOpen:true,crankInstalled:true,crankFound:true,transmitted:true,played:true}}),tree;
 const render=()=>React.createElement(A[kind==='radio'?'Radio':'Music'],{state,mode:'challenge',complete(){},announce(){},update(p){state=A[kind+'Normalize']({...state,...p,values:{...state.values,...p.values}});tree.update(render());}});
 await act(async()=>{tree=create(render());});
 const click=async label=>act(async()=>tree.root.findAllByType('button').find(n=>text(n)===label).props.onClick());
 const key=async(node,k='Enter')=>act(async()=>node.props.onKeyDown({key:k,preventDefault(){}}));
 await click(kind==='radio'?'拉开接线台':'掀开风铃帘');
 assert.equal(tree.root.findAllByProps({className:'signal-piece-row'}).length,0,'art replaces duplicate pickup rows');
 assert.equal(tree.root.findAllByType('button').filter(n=>/^(拿起导线|拿起插头|拿起.*铜管|放到插座|挂到)/.test(text(n))).length,0);
 const panel=()=>tree.root.findByType('section');
 assert.doesNotMatch(text(panel()),/先拿起|按 Escape|键盘可以|下面的放置/,'challenge omits automatic operation prose');
 assert.equal(tree.root.findAllByType('button').filter(n=>/^(放下接头|放下铜管)$/.test(text(n))).length,0,'no redundant cancel controls');
 if(kind==='radio'){
  const source=i=>tree.root.findAllByProps({'data-radio-pickup':'source'})[i].parent;
  const socket=i=>tree.root.findAllByProps({'data-radio-pickup':'connector'})[i];
  for(let i=0;i<3;i++){assert.equal(source(i).props.role,'button');assert.equal(source(i).props.tabIndex,0);assert.equal(socket(i).props.role,'button');assert.equal(socket(i).props.tabIndex,0);}
  const before=structuredClone(state.values);
  const event={pointerId:1,preventDefault(){},currentTarget:{setPointerCapture(){}}};await act(async()=>source(2).props.onPointerDown(event));await act(async()=>source(2).props.onPointerDown(event));assert.deepEqual(state.values,before,'source pointer toggle retains transmission');await key(source(2));await key(source(2));assert.equal(source(2).props['aria-pressed'],false);assert.deepEqual(state.values,before,'source toggle does not invalidate transmission');
  await key(socket(0));await key(socket(0));assert.deepEqual(state.values,before,'same-socket cancel does not invalidate transmission');
  await key(source(2));assert.equal(source(2).props['aria-pressed'],true);
  await key(socket(0),' ');assert.deepEqual(state.values.wires,[2,1,0]);assert.equal(state.values.transmitted,false,'real placement still invalidates transmission');
  await key(socket(0));assert.equal(source(2).props['aria-pressed'],true,'lower connector keyboard pickup');
  await key(socket(1));assert.deepEqual(state.values.wires,[1,2,0]);
  await key(source(0));await act(async()=>panel().props.onKeyDown({key:'Escape'}));assert.equal(source(0).props['aria-pressed'],false);
  await key(socket(2));await act(async()=>tree.root.findByProps({className:'radio-circuit'}).props.onPointerCancel());assert.equal(source(0).props['aria-pressed'],false);
  await click('回到接收机房');await click('走到发报机');await key(source(2));await key(socket(0));assert.deepEqual(state.values.plugs,[2,1,0]);
 }else{
  const board=()=>tree.root.findAllByType('svg').find(n=>n.props['aria-label']?.startsWith('三根'));
  const tube=i=>board().findAll(n=>n.type==='g'&&n.props.onPointerDown)[i];
  const before=structuredClone(state.values);
  await key(tube(0));await key(tube(0));assert.deepEqual(state.values,before,'same-bar keyboard cancellation retains playback');
  const event=x=>({clientX:x,clientY:100,pointerId:1,currentTarget:{getBoundingClientRect:()=>({left:0,top:0,width:720,height:390}),setPointerCapture(){}}});
  for(let i=0;i<2;i++){await act(async()=>tube(0).props.onPointerDown(event(110)));await act(async()=>board().props.onPointerUp(event(110)));}
  assert.equal(tube(0).props['aria-pressed'],false);assert.deepEqual(state.values,before,'same-bar two-tap cancellation retains playback');
  await key(tube(0));await act(async()=>panel().props.onKeyDown({key:'Escape'}));assert.deepEqual(state.values,before,'Escape retains playback');
  await key(tube(0));await key(tube(1));assert.equal(state.values.played,false,'real bar swap invalidates playback');
 }
 await act(async()=>tree.unmount());
}
const css=readFileSync('src/escape/campaign/episodes/radio.css','utf8');
assert.match(css,/\.radio-circuit[^{}]*focus-visible/);assert.match(css,/min-width:\s*330px/);
console.log('Signal direct controls: no duplicate rows, keyboard sources and sockets, swap, Escape, cancel and challenge prose pass.');
