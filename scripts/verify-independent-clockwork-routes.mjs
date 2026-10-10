import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import React from 'react';
import {create,act} from 'react-test-renderer';
await build({stdin:{contents:`export {clockworkEpisode as def} from './src/escape/campaign/episodes/clockwork';`,resolveDir:process.cwd()},outfile:'node_modules/.tmp-independent-clockwork-routes.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});
const {def}=await import('../node_modules/.tmp-independent-clockwork-routes.mjs');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const text=n=>typeof n==='string'?n:(n.children??[]).map(text).join('');
for(const mode of ['easy','standard','challenge']){
 let state=def.initial(),tree,completed=0,currentMode=mode;
 const render=()=>React.createElement(def.Component,{state,mode:currentMode,update:p=>{state=def.normalize({...state,...p,values:{...state.values,...p.values}});tree.update(render());},announce(){},complete(){completed++;},openDetail(){},closeDetail(){}});
 await act(async()=>{tree=create(render());});
 const spot=label=>{const n=tree.root.findAll(n=>n.type==='g'&&n.props['aria-label']===label)[0];assert.ok(n,label);assert.equal(n.props.tabIndex,0);assert.equal(n.props.role,'button');return n;};
 const click=async label=>act(async()=>spot(label).props.onClick());
 const key=async label=>act(async()=>{let prevented=false;spot(label).props.onKeyDown({key:'Enter',repeat:false,preventDefault(){prevented=true;}});assert.ok(prevented);});
 const button=async label=>act(async()=>{const n=tree.root.findAllByType('button').find(n=>text(n)===label||text(n).startsWith(label+'，物件'));assert.ok(n,label);assert.notEqual(n.props.disabled,true);n.props.onClick();});
 const sceneCheck=()=>{assert.equal(tree.root.findAllByProps({className:'cw-walk'}).length,0);if(mode==='challenge'){assert.equal(tree.root.findAllByType('title').length,0);assert.ok(!tree.root.findAllByType('text').some(n=>/残画|抽屉可以拉动|起重器/.test(text(n))));}};
 sceneCheck();await click('查看上层栅门');assert.equal(state.values.upperOpen,false);
 await key('沿楼梯下到配重井');sceneCheck();await click('查看缺了摇柄的起重器');assert.equal(state.values.hoist,false);
 await click('扶起倒下的窗板');await click('查看窗板后的凹槽');await click('钻进窗下的检修洞');sceneCheck();
 await click('查看配重背面的铜齿轮');assert.ok(!state.values.foundGears.includes(36));
 await click('拿起检修架上的画片');assert.ok(state.values.foundStrips.includes(3));
 await click('从检修洞回配重井');await click('沿楼梯回到阁楼');await click('穿过木门到工作间');sceneCheck();
 await click('拉开工作台抽屉');await click('查看拉开的抽屉');await click('查看拉开的抽屉');assert.equal(state.values.foundGears.filter(n=>n===24).length,1);
 await click('拿起桌边的短摇柄');await click('查看工作台上的残画');await button('把拾回的画片放进画框');
 // Operate the actual SVG slots with keyboard, including Escape cancellation.
 await key('拿起第1格');await act(async()=>tree.root.findByProps({className:'mech-object-row'}).props.onKeyDown({key:'Escape'}));assert.deepEqual(state.values.mural,[2,0,1,3]);
 await key('拿起第1格');await key('放到第2格');await key('拿起第2格');await key('放到第4格');await key('拿起第3格');await key('放到第4格');assert.deepEqual(state.values.mural,[0,3,2,1]);
 await button('← 环顾四周');await click('穿过木门回阁楼');await click('沿楼梯下到配重井');await click('把短摇柄装上起重器并转动');await click('钻进窗下的检修洞');await click('取出配重下面的齿轮');assert.deepEqual(state.values.foundGears,[24,36,48]);
 await click('从检修洞回配重井');await click('沿楼梯回到阁楼');await click('掀起齿轮笼的布');await click('查看齿轮笼');if(mode==='challenge')assert.equal(text(tree.root.findByProps({className:'cw-gear-status'})),'','fresh challenge hides solving instructions');await button('摇动曲柄一圈 ↻');assert.equal(state.values.upperOpen,false);
 for(const [t,axis] of [[24,'芦苇'],[36,'海浪'],[48,'松树']]){await button(`${t} 齿 · 托盘`);await button(`装到${axis}轴`);}
 await button('摇动曲柄一圈 ↻');await button('摇动曲柄一圈 ↻');assert.equal(state.values.upperOpen,true);
 const persisted=JSON.stringify(state);
 for(const nextMode of ['challenge','standard','easy',mode]){currentMode=nextMode;await act(async()=>tree.update(render()));const status=text(tree.root.findByProps({className:'cw-gear-status'}));assert.equal(/观察|记住/.test(status),nextMode!=='challenge');assert.equal(JSON.stringify(state),persisted,'mode switch preserves puzzle state');assert.equal(tree.root.findAllByProps({className:'cw-gear-rotation'}).length,4,'actual trial art survives mode switch');}

 await button('← 环顾四周');await click('走进上层钟门');await button('拉下钟绳');assert.equal(completed,0);assert.equal(state.values.released,false);
 for(const [bird,times] of [['猫头鹰',9],['燕子',6],['海燕',8]])for(let i=0;i<times;i++)await button(`${bird} ↻`);
 await button('拉下钟绳');assert.ok(def.isComplete(state));assert.equal(completed,1);
 await button('← 环顾四周');await click('走进上层钟门');assert.ok(def.isComplete(state),'return preserves completion');
 await act(async()=>tree.unmount());
}
const css=fs.readFileSync('src/escape/campaign/episodes/clockworkExploration.css','utf8');assert.match(css,/focus-visible/);assert.match(css,/cw-world:not\(\.cw-challenge\)/);
console.log('Independent clockwork routes pass in all three modes: physical/keyboard exits, missing tools, blocked weight, cross-room carry, repeated pickup/trial, mural Escape, real gear/cam controls, wrong answer, completion and revisits. Browser geometry/focus remains separately unverified.');
