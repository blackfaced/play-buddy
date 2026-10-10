import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import React from 'react';
import {act,create} from 'react-test-renderer';
await build({stdin:{contents:`export {radioEpisode} from './src/escape/campaign/episodes/radio';export {musicEpisode} from './src/escape/campaign/episodes/music';export {cargoEpisode} from './src/escape/campaign/episodes/cargo';export {observatoryEpisode} from './src/escape/campaign/episodes/observatory';`,resolveDir:process.cwd()},outfile:'node_modules/.tmp-late-chapter-coaching.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});
const M=await import('../node_modules/.tmp-late-chapter-coaching.mjs');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const text=n=>typeof n==='string'?n:(n.children??[]).map(text).join('');
const visible=n=>typeof n==='string'?n:/(^|\s)sr-only(\s|$)/.test(n.props?.className??'')?'':(n.children??[]).map(visible).join('');
const coaching=/先从工具袋|先拿起|再触碰|触碰要安装|选择船格放下|选择要勾取|选择要放置|拖动它查看|用箭头旋转|拖动镜框|上下移动、翻面|木板可以自由旋转|把木箱放到左盘/;
for(const mode of ['easy','standard','challenge'])for(const name of ['radio','music','cargo','observatory']){
 const def=M[`${name}Episode`];let state=def.initial(),tree,message='',currentMode=mode;
 const render=()=>React.createElement(def.Component,{state,mode:currentMode,update:p=>{state=def.normalize({...state,...p,values:{...state.values,...p.values}});tree.update(render());},announce:m=>{message=m;},complete(){}});
 await act(async()=>{tree=create(render(),{createNodeMock:n=>n.type==='dialog'?{showModal(){},close(){}}:null});});
 const check=()=>{assert.ok(!visible(tree.root).includes('收回手中物件'),'inventory toggle needs no separate return button');assert.equal(tree.root.findAll(n=>n.type==='button'&&n.props['aria-label']==='取消拿取').length,0,'inventory toggle needs no duplicate cancel button');if(mode==='challenge')assert.doesNotMatch(message,coaching,`${name} ${mode}: runtime feedback`);if(mode==='challenge')assert.doesNotMatch(visible(tree.root),coaching,`${name}: visible challenge copy`);};
 const click=async label=>{await act(async()=>{const n=tree.root.findAll(n=>typeof n.type==='string'&&(n.props['aria-label']===label||(n.type==='button'&&text(n)===label)))[0];assert.ok(n,`${name}: ${label}`);n.props.onClick();});check();};
 if(name==='radio'){
  await click('检查接收机空保险座');assert.equal(state.values.fuseInstalled,false);assert.match(message,/空/);
  await click('检查发报机空摇柄轴');await click('走到临海检修平台');assert.equal(message,'','navigation clears stale target feedback');await click('翻开防雨罩');await click('取下玻璃保险管');await click('取下黄铜摇柄');await click('拿起保险管');await click('拿起保险管');assert.equal(tree.root.findAll(n=>n.type==='button'&&n.props['aria-pressed']===true).length,0,'same item toggles off');await click('拿起保险管');await act(async()=>tree.root.findByProps({className:'signal-exploration'}).props.onKeyDown({key:'Escape'}));assert.equal(tree.root.findAll(n=>n.type==='button'&&n.props['aria-pressed']===true).length,0,'Escape clears held tool');await click('拿起保险管');await click('回到接收机房');await click('检查发报机空摇柄轴');assert.equal(state.values.crankInstalled,false);await click('检查接收机空保险座');assert.equal(state.values.fuseInstalled,true);await click('拿起黄铜摇柄');await click('检查发报机空摇柄轴');assert.equal(state.values.crankInstalled,true);
 }else if(name==='music'){
  await click('走到八音盒工作台');await click('检查空铜套');assert.match(message,/空/);await click('检查八音盒空转轴');await click('走到窗边凹室');await click('掀开风铃帘');await click('取下木摇柄');await click('抬起长凳盖');await click('取出鸟形纸卷');await click('拿起鸟形纸卷');await click('拿起鸟形纸卷');assert.equal(tree.root.findAll(n=>n.type==='button'&&n.props['aria-pressed']===true).length,0,'music item toggles off');await click('拿起鸟形纸卷');await click('走到八音盒工作台');await click('检查八音盒空转轴');assert.equal(state.values.handleInstalled,false);await click('检查空铜套');assert.equal(state.values.paperInstalled,true);await click('拿起木摇柄');await click('检查八音盒空转轴');assert.equal(state.values.handleInstalled,true);
 }else if(name==='cargo'){
  await click('掀开货物帆布');await click('检查两盘天平');await click('关闭近景');await click('拿起长柄船钩');await click('前往下游水闸');await click('使用长柄船钩');await click('钩取漂浮船板');await click('检查旧船首拼板');await click('关闭近景');await click('前往小船甲板');await click('货舱第1格');assert.match(message,/空/);await click('拿起贝壳箱');if(mode==='challenge')assert.equal(message,'','selection highlight replaces pickup coaching');await click('货舱第1格');assert.equal(state.values.slots[0],0);
 }else{
  await click('检查海港观测图');assert.match(message,/空/);await click('掀开桌边遮布');await click('拿起黄铜放大镜');await click('使用黄铜放大镜');await click('检查海港观测图');assert.equal(state.values.lensMounted,true);await click('前往观测窗廊');await click('滑开百叶窗');await click('取下蓝铜观测带');await click('取下红铜观测带');await click('前往制图桌');await click('使用蓝铜观测带');if(mode==='challenge')assert.equal(message,'','pressed tool replaces pickup coaching');await click('检查海港观测图');await click('使用红铜观测带');await click('检查海港观测图');await click('检查海港观测图');assert.ok(visible(tree.root).includes('铆钉'),'chart source evidence remains');await click('关闭近景');await click('前往圆顶平台');await click('检查穿孔星盘');await click('星盘顺时针');assert.equal(state.values.disc,1);
 }
 if(mode==='standard'&&(name==='cargo'||name==='observatory')){
  await click(name==='cargo'?'拿起树叶箱':'使用黄铜放大镜');
  assert.match(visible(tree.root),coaching,'guided feedback exists before mode switch');
  const before=structuredClone(state);currentMode='challenge';await act(async()=>tree.update(render()));
  assert.doesNotMatch(visible(tree.root),coaching,'mode switch clears previous visible coaching');assert.deepEqual(state,before,'mode switch preserves puzzle progress');
 }
 await act(async()=>tree.unmount());
}
assert.doesNotMatch(readFileSync('src/escape/campaign/CampaignEpisode.tsx','utf8'),/所有机关都可用点击或键盘操作/);
console.log('Late chapters: empty/wrong installs, held items, cargo and observatory runtime feedback, source evidence, accessible controls and shared footer pass.');
