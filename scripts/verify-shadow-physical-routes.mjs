import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import React from 'react';
import {create,act} from 'react-test-renderer';
await build({stdin:{contents:"export {shadowEpisode as def} from './src/escape/campaign/episodes/shadow';",resolveDir:process.cwd()},outfile:'node_modules/.tmp-shadow-physical-routes.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});
const {def}=await import('../node_modules/.tmp-shadow-physical-routes.mjs');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const text=n=>typeof n==='string'?n:(n?.children??[]).map(text).join('');
for(const mode of ['easy','standard','challenge']){
 let state=def.initial(),tree;
 const render=()=>React.createElement(def.Component,{state,mode,update:p=>{state=def.normalize({...state,...p,values:{...state.values,...p.values}});tree.update(render());},announce(){},complete(){}});
 await act(async()=>{tree=create(render());});
 const target=label=>{const n=tree.root.findAll(n=>typeof n.type==='string'&&(n.props.role==='button'||n.type==='button')).find(n=>n.props['aria-label']===label||text(n)===label);assert.ok(n,label);return n;};
 const click=async label=>act(async()=>target(label).props.onClick());
 const check=()=>{
  assert.equal(tree.root.findAllByType('nav').length,0,'no out-of-scene room tabs');
  const routes=tree.root.findAll(n=>n.type==='g'&&n.props['data-shadow-route']);assert.equal(routes.length,2,'each room has two physical exits');
  for(const route of routes){assert.equal(route.props.role,'button');assert.equal(route.props.tabIndex,0);assert.ok(route.findAllByType('path').length>=3,'door frame, threshold and passage are drawn');assert.equal(route.findAll(n=>n.props.fill==='transparent').length,0,'route hit area is its visible architecture');}
  assert.equal(tree.root.findAllByType('title').length===0,mode==='challenge');
  assert.equal(tree.root.findAllByProps({className:'shadow-operation'}).length,mode==='challenge'?0:1);
 };
 check();
 for(const destination of ['道具侧翼','放映廊','观众席','放映廊','道具侧翼','观众席']){await act(async()=>{let prevented=false;target(`走到${destination}`).props.onKeyDown({key:' ',preventDefault(){prevented=true;}});assert.ok(prevented);});check();assert.equal(text(tree.root.findByType('h2')),destination);}
 await click('查看幕布配重');assert.equal(tree.root.findAllByProps({className:'shadow-challenge-controls'}).length,mode==='challenge'?1:0);assert.equal(tree.root.findAllByProps({className:'shadow-operation'}).length,mode==='challenge'?0:1);assert.ok(text(tree.toJSON()).includes('右侧挂着十片铜盘'));
 await click('← 环顾四周');await click('走到道具侧翼');await click('打开纸偶箱');await click('拿起箱中的纸偶托盘');await click('选择纸偶托盘');
 assert.equal(text(tree.toJSON()).includes('再次点物件放下'),mode!=='challenge');
 await click('查看箱盖里的拓印');assert.equal(tree.root.findAllByProps({className:'shadow-operation'}).length,0);assert.equal(tree.root.findAllByProps({className:'shadow-trace-turns'}).length,3);for(const name of ['月亮','小船','飞鸟']){assert.equal(text(target(`${name}纸偶 ↻`)),'↻');assert.equal(text(target(`${name}纸偶 ↺`)),'↺');}assert.ok(!text(tree.toJSON()).includes('用左右箭头转动纸偶'));assert.ok(text(tree.toJSON()).includes('纸张右上角缺了一小块'));
 await act(async()=>tree.unmount());
}
assert.match(fs.readFileSync('src/escape/campaign/episodes/shadowExploration.css','utf8'),/\.shadow-challenge-controls \.mech-object-help\{display:none\}/);
console.log('Shadow physical room roundtrips, visible route art, keyboard navigation and mode-scoped coaching pass.');
