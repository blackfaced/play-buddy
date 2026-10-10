import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import React from 'react';
import { create, act } from 'react-test-renderer';
await build({ stdin: { contents: `export {default as CampaignEpisode} from './src/escape/campaign/CampaignEpisode';`, resolveDir: process.cwd() }, outfile: 'node_modules/.tmp-campaign-play-viewport.mjs', bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic', loader: { '.css': 'empty' }, plugins: [{name:'store',setup(b){b.onResolve({filter:/store\/useStore$/},()=>({path:'store',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const useStore = f => f({lock:null});'}));}}] });
const { CampaignEpisode } = await import('../node_modules/.tmp-campaign-play-viewport.mjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.localStorage = { getItem: () => null, setItem() {} };
const episode = {id:'shadow',title:'剧场',place:'海边',initial:()=>({values:{},inventory:[],solved:[],inspected:[]}),normalize:s=>s,isComplete:()=>false,hints:()=>[],Component:({openDetail})=>React.createElement('button',{onClick:()=>openDetail('近景','线索')},'打开')};
let tree;
await act(async()=>{tree=create(React.createElement(CampaignEpisode,{episode,onBack(){},onComplete(){}}),{createNodeMock:e=>e.type==='dialog'?{showModal(){},close(){}}:null});});
assert.match(tree.root.findByType('main').props.className,/campaign-viewport/,'theater opts into viewport shell');
assert.equal(tree.root.findByProps({className:'campaign-playfield'}).findAllByType('button').length,1);
assert.equal(tree.root.findAllByProps({className:'campaign-inventory'}).length,0,'theater does not duplicate its usable inventory with a read-only strip');
assert.equal(tree.root.findAllByProps({className:'campaign-feedback'}).length,1,'reserved feedback area exists before completion');
await act(async()=>tree.root.findByProps({className:'campaign-playfield'}).findByType('button').props.onClick());
assert.equal(tree.root.findAllByType('dialog').length,1);
await act(async()=>tree.root.findByProps({'aria-label':'关闭近景'}).props.onClick());
assert.equal(tree.root.findAllByType('dialog').length,0);
assert.match(tree.root.findByType('main').props.className,/campaign-viewport/,'closing a detail preserves viewport shell');
await act(async()=>tree.update(React.createElement(CampaignEpisode,{episode:{...episode,isComplete:()=>true},onBack(){},onComplete(){}})));
assert.equal(tree.root.findByProps({className:'campaign-feedback'}).findAllByProps({className:'campaign-next'}).length,1,'completion uses the reserved row');
assert.equal(tree.root.findAllByProps({className:'campaign-success'}).length,0,'completion adds no below-scene block');
await act(async()=>tree.unmount());
await act(async()=>{tree=create(React.createElement(CampaignEpisode,{episode:{...episode,id:'clockwork'},onBack(){},onComplete(){}}));});
assert.doesNotMatch(tree.root.findByType('main').props.className,/campaign-viewport/,'other episodes retain their existing flow');
await act(async()=>tree.unmount());
const css=readFileSync('src/escape/campaign/campaign.css','utf8');
assert.match(css,/\.campaign-viewport\s*\{[^}]*height:\s*100dvh/s);
assert.match(css,/\.campaign-viewport\s+\.campaign-playfield\s*\{[^}]*min-height:\s*0[^}]*overflow:\s*auto/s);
assert.match(css,/\.campaign-viewport\s+\.shadow-world\s*>\s*svg\s*\{[^}]*height:\s*100%[^}]*min-height:\s*250px/s,'art respects remaining height without collapsing hit targets');
assert.match(css,/@media\s*\(max-height:\s*620px\)[\s\S]*height:\s*auto/s,'short and zoomed screens keep accessible scrolling');
assert.match(css,/\.campaign-viewport\s+\.campaign-feedback\s*\{[^}]*height:\s*48px/s,'completion cannot add vertical space');
console.log('Theater viewport structure, reserved success area, modal return, height-constrained art and short-screen fallback pass. Browser pixel checks required.');
assert.match(css,/\.campaign-viewport \.campaign-playfield > \.mech-bench\s*\{[^}]*grid-template-columns:\s*minmax\(0,1fr\) minmax\(0,1fr\)/s,'desktop close-ups use side-by-side art and controls');
assert.match(css,/\.campaign-viewport \.shadow-trace-workarea\s*\{[^}]*100dvh - 550px/s,'trace artwork is bounded by viewport height with rotation controls outside the art');
assert.match(css,/\.campaign-viewport \.campaign-playfield > \.mech-bench \.mech-object-row > svg\s*\{[^}]*height:\s*100px/s,'balance objects fit alongside the main art');

assert.match(css,/\.mech-object-row > svg\s*\{[^}]*width:\s*300px[^}]*height:\s*100px/s,'balance pointer math retains its 450:150 viewBox ratio without letterboxing');

for(const id of ['radio','music','cargo','observatory']){
 await act(async()=>{tree=create(React.createElement(CampaignEpisode,{episode:{...episode,id},onBack(){},onComplete(){}}));});
 assert.match(tree.root.findByType('main').props.className,/campaign-viewport/,`${id} uses bounded shell`);
 assert.equal(tree.root.findAllByProps({className:'campaign-inventory'}).length,0,'no duplicate read-only inventory');
 await act(async()=>tree.update(React.createElement(CampaignEpisode,{episode:{...episode,id,isComplete:()=>true},onBack(){},onComplete(){}})));
 assert.equal(tree.root.findAllByProps({className:'campaign-success'}).length,0,'success stays in reserved row');
 await act(async()=>tree.unmount());
}
assert.match(css,/\.campaign-late-viewport \.radio-exploration-stage[^{]*\{[^}]*100dvh - 470px/s,'overlay and scene retain the same aspect-ratio box');
assert.match(css,/@media \(max-height:700px\), \(max-width:900px\)/,'narrow or short screens retain readable scrolling fallback');

const messageEpisode={...episode,id:'cargo',Component:({announce})=>React.createElement('button',{onClick:()=>announce('先拿起物件，再触碰这里。')},'测试反馈')};
await act(async()=>{tree=create(React.createElement(CampaignEpisode,{episode:messageEpisode,onBack(){},onComplete(){}}));});
await act(async()=>tree.root.findByProps({className:'campaign-playfield'}).findByType('button').props.onClick());
assert.ok(tree.root.findByProps({className:'campaign-status'}).children.length);
await act(async()=>tree.root.findByType('select').props.onChange({target:{value:'challenge'}}));
assert.equal(tree.root.findByProps({className:'campaign-status'}).children.length,0,'switching mode clears stale global feedback');
await act(async()=>tree.unmount());
