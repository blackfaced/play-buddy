import assert from 'node:assert/strict';
import {build} from 'esbuild';
import React from 'react';
import {create,act} from 'react-test-renderer';
await build({stdin:{contents:`export {cargoEpisode} from './src/escape/campaign/episodes/cargo'; export {observatoryEpisode} from './src/escape/campaign/episodes/observatory'; export * from './src/escape/campaign/episodes/cargoLogic'; export * from './src/escape/campaign/engine';`,resolveDir:process.cwd()},outfile:'node_modules/.tmp-cargo-observatory-physical.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});
const A=await import('../node_modules/.tmp-cargo-observatory-physical.mjs');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let tree,state,def,mode,announcements=[],completed=0;
const render=()=>React.createElement(def.Component,{state,mode,update:p=>{state=def.normalize({...state,...p,values:{...state.values,...p.values}});tree.update(render());},announce:s=>announcements.push(s),complete:()=>completed++,openDetail(){},closeDetail(){}});
const mount=async(d,s=d.initial())=>{def=d;state=d.normalize(s);completed=0;await act(async()=>{tree=create(render(),{createNodeMock:e=>e.type==='dialog'?{showModal(){},close(){}}:null});});};
const node=label=>{const a=tree.root.findAll(n=>n.props['aria-label']===label||(n.type==='button'&&n.children.join('')===label));assert.ok(a.length,`Missing artwork/control: ${label}`);return a[0];};
const click=async label=>act(async()=>node(label).props.onClick());
const key=async(label,k='Enter')=>act(async()=>node(label).props.onKeyDown({key:k,preventDefault(){}}));
const stop=async()=>act(async()=>tree.unmount());
const close=()=>click('关闭近景');
const save=()=>A.parseEpisode(def,A.serializeEpisode(def,state)).state;
const snapshot=()=>JSON.stringify(state.values);
for(mode of ['challenge','standard','easy']){
 await mount(A.cargoEpisode);
 await click('检查两盘天平');assert.ok(tree.root.findAllByType('svg').some(n=>n.props['aria-label']==='左盘空着，货物尚未露出'));await close();
 await key('掀开货物帆布',' ');await click('拿起长柄船钩');await click('拿起长柄船钩'.replace('拿起长柄船钩','检查船钩原处'));
 await click('前往下游水闸');await click('钩取漂浮船板');assert.equal(state.values.plateRecovered,false,'no reach without selected hook');
 await click('使用长柄船钩');await click('取消拿取');await click('钩取漂浮船板');assert.equal(state.values.plateRecovered,false);
 await click('使用长柄船钩');await key('钩取漂浮船板');assert.equal(state.values.plateRecovered,true);await click('检查船板原处');
 await click('检查旧船首拼板');for(const [i,times] of [2,1,3].entries())for(let n=0;n<times;n++)await click(`转动第${i+1}块船板`);await close();
 await click('前往货物码头');await key('拿起贝壳箱');assert.equal(state.values.view,'deck');assert.equal(node('货舱第1格').type,'g','Artwork owns handlers');
 await key('货舱第1格',' ');assert.deepEqual(state.values.slots,[0,-1,-1,-1]);
 await click('拿起树叶箱');await click('货舱第2格');await click('货舱第1格');await click('货舱第2格');assert.deepEqual(state.values.slots,[1,0,-1,-1],'occupied berths swap');
 await click('货舱第2格');await click('取消拿取');assert.deepEqual(state.values.slots,[1,0,-1,-1]);
 await click('货舱第2格');await key('码头放回区');assert.deepEqual(state.values.slots,[1,-1,-1,-1]);
 await click('拿起贝壳箱');await click('前往货物码头');await click('前往小船甲板');await click('货舱第2格');assert.deepEqual(state.values.slots,[1,-1,-1,-1],'navigation cancels uncommitted cargo');
 for(const [i,name] of ['星星箱','贝壳箱','小鱼箱','树叶箱'].entries()){await click(`拿起${name}`);await click(`货舱第${i+1}格`);}
 const wrong=[...state.values.slots];await click('前往下游水闸');await click('扳动水闸把手');assert.equal(completed,0);assert.deepEqual(state.values.slots,wrong);assert.equal(A.cargoReady(wrong),false);
 const wrongSave=save();await stop();await mount(A.cargoEpisode,wrongSave);assert.deepEqual(state.values.slots,wrong);await click('前往小船甲板');
 for(const [i,name] of ['树叶箱','小鱼箱','贝壳箱','星星箱'].entries()){await click(`拿起${name}`);await click(`货舱第${i+1}格`);}
 await click('前往下游水闸');await key('扳动水闸把手');assert.equal(completed,1);await click('扳动水闸把手');assert.equal(completed,1,'repeat gate does not duplicate completion');assert.equal(def.isComplete(state),true);
 await click('检查旧船首拼板');assert.deepEqual(state.values.plate,[2,1,3]);await close();const done=save();await stop();await mount(A.cargoEpisode,done);assert.equal(def.isComplete(state),true);await stop();
 await mount(A.observatoryEpisode);
 await click('检查海港观测图');assert.equal(tree.root.findAllByType('dialog').length,0,'empty chart has visible physical installation');
 await key('掀开桌边遮布');await key('拿起黄铜放大镜');await click('检查放大镜原处');
 await click('前往观测窗廊');await key('滑开百叶窗');await key('取下蓝铜观测带');await key('取下红铜观测带');await click('检查蓝带原处');
 await click('前往制图桌');await click('使用蓝铜观测带');await click('取消拿取');await click('检查海港观测图');assert.equal(state.values.blueMounted,false);
 for(const color of ['蓝','红']){await click(`使用${color}铜观测带`);await key('检查海港观测图');}
 assert.equal(state.inventory.includes('蓝铜观测带'),false,'mounted strip leaves inventory');
 await click('使用黄铜放大镜');await click('检查海港观测图');
 const chart=()=>tree.root.findByProps({className:'navigation-chart'});
 const target={getBoundingClientRect:()=>({left:10,top:20,width:1000,height:420}),setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){}};
 await act(async()=>chart().props.onPointerDown({pointerId:7,clientX:10+250+91,clientY:101,currentTarget:target}));assert.equal(state.values.lensX,91);assert.equal(state.values.lensY,81,'letterboxed coordinates stay under physical lens');
 await act(async()=>chart().props.onPointerMove({pointerId:8,clientX:900,clientY:300,currentTarget:target}));assert.equal(state.values.lensX,91,'other finger cannot move captured lens');
 await act(async()=>chart().props.onPointerCancel({pointerId:7}));await act(async()=>chart().props.onPointerMove({pointerId:7,clientX:900,clientY:300,currentTarget:target}));assert.equal(state.values.lensX,91,'cancel ends drag');
 await act(async()=>chart().props.onPointerDown({pointerId:9,clientX:600,clientY:190,currentTarget:target}));await act(async()=>chart().props.onPointerUp({pointerId:9,currentTarget:target}));const stopped=state.values.lensX;await act(async()=>chart().props.onPointerMove({pointerId:9,clientX:900,clientY:300,currentTarget:target}));assert.equal(state.values.lensX,stopped);
 await click('镜向右');assert.equal(state.values.lensX,stopped+20);assert.ok(chart().findAllByProps({clipPath:'url(#observatory-lens-clip)'}).length,'lens detail uses local clip');
 await click('下移观测带1');await click('上移观测带2');await click('翻转观测带1');await close();
 await click('前往圆顶平台');await click('检查穿孔星盘');for(let i=0;i<3;i++)await click('星盘顺时针');await close();
 await click('检查铜制望远镜');for(let i=0;i<4;i++)await click('望远镜顺时针');await click('低仰角');await click('拉动穹顶把手');assert.equal(completed,0,'wrong flipped strip fails');await close();
 const interim=save();await stop();await mount(A.observatoryEpisode,interim);assert.deepEqual(state.values.flips,[1,0]);await click('前往制图桌');await click('检查海港观测图');await click('翻转观测带1');await close();await click('前往圆顶平台');await click('检查铜制望远镜');await click('拉动穹顶把手');assert.equal(completed,1);await click('拉动穹顶把手');assert.equal(completed,1);await close();await click('检查穿孔星盘');assert.equal(node('星盘顺时针').props.disabled,undefined);await close();const obsDone=save();await stop();await mount(A.observatoryEpisode,obsDone);assert.equal(def.isComplete(state),true);await stop();
}
// Legacy normalization preserves all physical puzzle work and completed exits.
for(const [d,values] of [[A.cargoEpisode,{cover:true,selected:3,scale:2,cubes:3,plate:[2,1,3],slots:[1,3,0,2],gate:true}],[A.observatoryEpisode,{shutters:true,lens:true,lensX:340,lensY:170,disc:3,strips:[0,0],flips:[0,0],azimuth:4,elevation:0,roof:true}]]){
 const migrated=d.normalize({values,solved:[],inventory:[],inspected:[]});for(const [k,v] of Object.entries(values))assert.deepEqual(migrated.values[k],v,`${d.id} preserves legacy ${k}`);assert.equal(d.isComplete(migrated),true);assert.deepEqual(d.normalize(migrated),migrated);
 const forged=d.normalize({...d.initial(),values:{...d.initial().values,gate:true,roof:true},solved:['all'],inventory:['key']});assert.equal(d.isComplete(forged),false);
}
for(const bad of [[9,0],[0,9],[-1,2],[2,-1],[1.5,1]])assert.deepEqual(A.putCrate([0,-1,-1,-1],...bad),[0,-1,-1,-1]);
console.log('Cargo/observatory physical exploration passed in all modes: direct SVG keyboard/click, pick/place/swap/remove/cancel, physical find/use journeys, wrong states, lens capture/coordinates/cancel, repeated actions, completion and lossless legacy/reload.');
