import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import React from 'react';
import {create,act} from 'react-test-renderer';
await build({stdin:{contents:"export {greenhouseEpisode} from './src/escape/campaign/episodes/greenhouse';export {cargoEpisode} from './src/escape/campaign/episodes/cargo';export {ObjectRow} from './src/escape/campaign/episodes/clockworkShared';",resolveDir:process.cwd()},outfile:'node_modules/.tmp-puzzle-control-economy.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});
const M=await import('../node_modules/.tmp-puzzle-control-economy.mjs');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const text=n=>typeof n==='string'?n:(n.children??[]).map(text).join('');
for(const mode of ['easy','standard','challenge']){
 const def=M.greenhouseEpisode;let state=def.normalize({...def.initial(),values:{...def.initial().values,wiped:true,cloth:true,floatRaised:true,cabinet:true,cards:true}}),tree;
 const render=()=>React.createElement(def.Component,{state,mode,update:p=>{state=def.normalize({...state,...p,values:{...state.values,...p.values}});tree.update(render());},announce(){},complete(){}});
 await act(async()=>{tree=create(render());});
 const click=async label=>act(async()=>{const n=tree.root.findAll(n=>n.type==='g'&&n.props['aria-label']===label||n.type==='button'&&text(n)===label)[0];assert.ok(n,label);n.props.onClick();});
 await click('查看清晰的灌溉板');
 assert.equal(tree.root.findAllByType('button').filter(n=>/[上下]排第.*段/.test(text(n))).length,0,'pipe art has no duplicate rotation row');
 const pipe=()=>tree.root.findByProps({'aria-label':'转动第1段弯管'});
 const initial=state.values.pipes[0];assert.equal(pipe().props.role,'button');assert.equal(pipe().props.tabIndex,0);
 await act(async()=>pipe().props.onKeyDown({key:' ',repeat:false,preventDefault(){}}));assert.equal(state.values.pipes[0],(initial+1)%4);
 await act(async()=>pipe().props.onClick());assert.equal(state.values.pipes[0],(initial+2)%4);
 assert.ok(tree.root.findAllByType('button').some(n=>text(n)==='压下试水阀'),'whole-circuit water test remains');
 assert.ok(text(tree.root).includes('昆虫浮雕'),'physical source description retained');
 await click('← 环顾四周');await click('走进工具间');await click('展开生长画片');
 assert.equal(tree.root.findAllByProps({className:'gh-card-help'}).length,0);
 assert.ok(!text(tree.root).includes('画片嵌入边框时'),'no narrated latch explanation');
 assert.equal(tree.root.findAllByType(M.ObjectRow).length,3);
 assert.equal(tree.root.findAllByType('button').length,1,'only close action remains beside the card artwork');
 for(const row of tree.root.findAllByType(M.ObjectRow)){
  assert.equal(row.findAllByProps({className:'mech-object-slot'}).length,3);
  assert.equal(row.findAllByProps({'data-object-hit':true}).length,3);
 }
 await act(async()=>tree.unmount());
}
const source=path=>readFileSync(`src/escape/${path}`,'utf8');
assert.doesNotMatch(source('campaign/episodes/cargo.tsx'),/木箱操作按钮|放入货舱第/,'cargo artwork does not duplicate its operation controls');
assert.match(source('campaign/episodes/cargo.tsx'),/称\{c.name\}/,'scale controls remain because scale art has no equivalent');
assert.match(source('campaign/episodes/cargo.tsx'),/转动第\$\{i\+1\}块船板/,'plate rotations remain functional');
assert.match(source('campaign/episodes/observatory.tsx'),/aria-label=\{`翻转观测带/);
assert.match(source('campaign/episodes/observatory.tsx'),/aria-label="星盘顺时针"/);
assert.match(source('campaign/episodes/observatory.tsx'),/aria-label="望远镜顺时针"/);
assert.doesNotMatch(source('campaign/episodes/clockworkScene.tsx'),/拖动木条交换位置/);
assert.match(source('MathProps.tsx'),/className="escape-selected-slat sr-only"/);
assert.match(source('MathProps.tsx'),/确认整幅画<\/button>/);
assert.doesNotMatch(source('adventure/Adventure.tsx'),/点击想检查的物件，可以随时离开再回来|可以移动、翻开或拿起近景里的物件/);
assert.match(source('chapter/PuzzleView.tsx'),/className="chapter-controls-note chapter-sr-only"/);
assert.match(source('chapter/PuzzleView.tsx'),/取回选中纹片<\/button>/,'return-to-tray action is not duplicated by slot selection');
assert.match(source('chapter/LensMap.tsx'),/className="chapter-sr-only" id=\{`\$\{clip\}-instructions`\}/);
assert.match(source('chapter/LensMap.tsx'),/拿起放大镜/,'lens pickup remains available to touch users');
console.log('Puzzle control economy: card/pipe artwork only, actual keyboard rotation, retained source evidence and essential 01/03/09/10 controls pass.');
