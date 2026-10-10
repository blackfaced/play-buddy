import assert from 'node:assert/strict';import {build} from 'esbuild';import React from 'react';import {create,act} from 'react-test-renderer';
await build({stdin:{contents:`export {musicEpisode as def} from './src/escape/campaign/episodes/music';`,resolveDir:process.cwd()},outfile:'node_modules/.tmp-independent-music-runtime.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});
const {def}=await import('../node_modules/.tmp-independent-music-runtime.mjs');globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let state,tree,completed=0;const render=()=>React.createElement(def.Component,{state,mode:'challenge',update:p=>{state=def.normalize({...state,...p,values:{...state.values,...p.values}});tree.update(render());},announce(){},complete(){completed++;}});
const text=n=>typeof n==='string'?n:(n.children??[]).map(text).join('');const button=s=>{const n=tree.root.findAllByType('button').find(n=>text(n)===s);assert.ok(n,'Missing '+s);return n;};const click=async s=>act(async()=>button(s).props.onClick());
const oldValues={bars:[2,0,1],roll:2,pegs:[2,6,11,15],played:false,muted:true};
const mount=async()=>{state=def.normalize({values:oldValues,solved:[],inventory:[],inspected:[]});await act(async()=>{tree=create(render());});await click('走到八音盒工作台');await click('打开八音盒');};
const realSet=globalThis.setTimeout,realClear=globalThis.clearTimeout;let serial=0;const pending=new Map();globalThis.setTimeout=(f,delay,...args)=>{if(delay===450||delay===650){const id=++serial;pending.set(id,()=>f(...args));return id;}return realSet(f,delay,...args);};globalThis.clearTimeout=id=>{if(pending.has(id))pending.delete(id);else realClear(id);};
const drain=async()=>{for(let i=0;pending.size;i++){assert.ok(i<20,'timer is bounded');const [id,f]=pending.entries().next().value;pending.delete(id);await act(async()=>f());}};
try{
 await mount();await click('转动八音盒摇柄');const cancelled=pending.values().next().value;await click('停住摇柄');await act(async()=>cancelled());await drain();assert.equal(state.values.played,false);assert.equal(completed,0);
 await click('转动八音盒摇柄');await click('走到窗边凹室');await drain();assert.equal(state.values.played,false);assert.equal(completed,0);
 await click('走到八音盒工作台');await click('打开八音盒');await click('转动八音盒摇柄');state=def.normalize({...state,values:{...state.values,pegs:[2,6]}});await act(async()=>tree.update(render()));await drain();assert.equal(state.values.played,false,'changed snapshot cannot complete');assert.equal(completed,0);
 state=def.normalize({...state,values:{...state.values,pegs:[2,6,11,15]}});await act(async()=>tree.update(render()));await click('转动八音盒摇柄');await drain();assert.equal(state.values.played,true);assert.equal(completed,1);
 await click('转动八音盒摇柄');const abandoned=pending.values().next().value;await act(async()=>tree.unmount());await act(async()=>abandoned());await drain();assert.equal(completed,1,'abandoned animation cannot finish');
 await mount();await click('转动八音盒摇柄');await drain();assert.equal(completed,2,'fresh mount plays normally after abandoned instance');await act(async()=>tree.unmount());
 console.log('Independent music actual handler runtime with synthetic timers: stop/navigation/snapshot mutation/unmount prevent late completion; fresh mount and complete playback pass. Audio and real browser remain untested.');
}finally{globalThis.setTimeout=realSet;globalThis.clearTimeout=realClear;}
