import assert from 'node:assert/strict';
import { build } from 'esbuild';
import React from 'react';
import {create,act} from 'react-test-renderer';
import {MemoryRouter} from 'react-router';
await build({stdin:{contents:`export {default as SceneSelect} from './src/escape/SceneSelect';export * from './src/escape/campaign/registry';export * from './src/escape/campaign/engine';export * from './src/escape/scenes';`,resolveDir:process.cwd()},outfile:'node_modules/.tmp-campaign-selection.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'},plugins:[{name:'health-double',setup(b){b.onResolve({filter:/store\/useStore$/},()=>({path:'store',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const useStore=fn=>fn({lock:globalThis.__campaignLock??null});'}));}}]});
const A=await import('../node_modules/.tmp-campaign-selection.mjs');globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
const text=n=>typeof n==='string'?n:(n?.children??[]).map(text).join('');let tree;
const mount=async(route='/escape')=>act(async()=>{tree=create(React.createElement(MemoryRouter,{initialEntries:[route]},React.createElement(A.SceneSelect)),{createNodeMock:e=>e.type==='dialog'?{showModal(){},close(){}}:null});});
const unmount=async()=>act(async()=>tree.unmount());
const click=async label=>{const b=tree.root.findAllByType('button').find(n=>text(n)===label||n.props['aria-label']===label);assert.ok(b,label);assert.ok(!b.props.disabled);await act(async()=>b.props.onClick());};
await mount();assert.equal(tree.root.findAllByType('article').length,10);assert.equal(tree.root.findAllByType('button').filter(n=>n.props.disabled).length,9);await unmount();
for(const e of A.CAMPAIGN_EPISODES){await mount(`/escape?scene=${e.id}`);assert.ok(text(tree.toJSON()).includes('暂未解锁'));assert.equal(storage.has(A.episodeKey(e.id)),false);await unmount();}
storage.set(A.SCENES_KEY,JSON.stringify({version:1,completed:['cabin','expedition','foglight']}));await mount();await click('进入钟楼的迟到鸟');assert.ok(text(tree.toJSON()).includes('钟楼的迟到鸟'));assert.equal(storage.has(A.episodeKey('clockwork')),false);await click('← 场景选择');assert.equal(tree.root.findAllByType('article').length,10);await unmount();
// Every registered episode has an actual directly selectable route, independent of earlier episode saves.
for(const e of A.CAMPAIGN_EPISODES){storage.set(A.SCENES_KEY,JSON.stringify({version:1,completed:A.SCENE_IDS}));await mount(`/escape?scene=${e.id}`);assert.ok(tree.root.findAllByType('h1').some(n=>text(n)===e.title));assert.ok(tree.root.findAllByType('svg').length>0);await click('← 场景选择');assert.equal(tree.root.findAllByType('article').length,10);await unmount();}
storage.clear();const future=JSON.stringify({version:77,episode:'radio',state:{futureMarker:'untouched'}});storage.set(A.episodeKey('radio'),future);await mount('/escape?scene=radio');assert.ok(text(tree.toJSON()).includes('更新版本'));assert.equal(storage.get(A.episodeKey('radio')),future);await click('返回场景选择');assert.ok(tree.root.findAllByType('button').find(n=>n.props['aria-label']==='进入钟楼的迟到鸟'));await unmount();
storage.clear();const futureMenu=JSON.stringify({version:77,completed:['future-scene']});storage.set(A.SCENES_KEY,futureMenu);await mount();assert.equal(storage.get(A.SCENES_KEY),futureMenu);assert.ok(text(tree.toJSON()).includes('场景目录来自更新版本'));await unmount();
console.log('Ten-scene selector: real routes, all locked deep links, legacy migration, independent entries and future-record protection passed.');
