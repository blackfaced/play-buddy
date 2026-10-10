import assert from 'node:assert/strict';
import {build} from 'esbuild';
import React from 'react';
import {create,act} from 'react-test-renderer';
import {renderToStaticMarkup} from 'react-dom/server';
await build({stdin:{contents:"export {ShadowStage} from './src/escape/campaign/episodes/shadowStage'; export {initialShadow,normalizeShadow} from './src/escape/campaign/episodes/shadowLogic';",resolveDir:process.cwd()},outfile:'node_modules/.tmp-shadow-stage-workarea.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});
const {ShadowStage,initialShadow,normalizeShadow}=await import('../node_modules/.tmp-shadow-stage-workarea.mjs');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let value={pieces:[0,2,1],depths:[1,1,1],turns:[0,0,0],lit:false,lamp:true,revealed:true,mode:'challenge'};
let tree;
const props=()=>({...value,onChange:(key,next)=>{value={...value,[key]:next};tree.update(React.createElement(ShadowStage,props()));}});
await act(async()=>{tree=create(React.createElement(ShadowStage,props()),{createNodeMock:()=>({getBoundingClientRect:()=>({left:0,right:300,top:0,bottom:500,width:300})})});});
const slot=i=>tree.root.findByProps({'data-stage-slot':i});
const shadow=i=>slot(i).findByProps({'data-projected-shadow':true});
const puppet=i=>slot(i).findByProps({'data-physical-puppet':true});
const serial=n=>JSON.stringify(n.children.map(c=>({type:c.type,props:c.props})));
const beforeShadow=serial(shadow(0)),beforePuppet=serial(puppet(0));
await act(async()=>slot(0).findAllByType('button').find(n=>n.props['aria-label']==='左轨纸偶顺时针旋转').props.onClick());
assert.notEqual(serial(shadow(0)),beforeShadow,'rotation changes projected geometry');
assert.notEqual(serial(puppet(0)),beforePuppet,'rotation changes physical puppet geometry');
const beforePosition=puppet(0).props.transform;
await act(async()=>slot(0).findByType('input').props.onChange({target:{value:'3'}}));
assert.notEqual(puppet(0).props.transform,beforePosition,'distance visibly moves actual puppet toward lamp');
assert.equal(shadow(0).props['data-scale'],3);
for(let track=0;track<3;track++)for(const endpoint of [1,2,3,1]){
 await act(async()=>slot(track).findByType('input').props.onChange({target:{value:String(endpoint)}}));
 assert.equal(value.depths[track],endpoint);
 assert.equal(shadow(track).props['data-scale'],endpoint);
 assert.equal(puppet(track).props.transform,`translate(${50+endpoint*32} 229)`,'slider direction matches real lamp rail direction at all three stops');
 const saved=initialShadow();saved.values.depths=[...value.depths];
 assert.equal(normalizeShadow(saved).values.depths[track],endpoint,'both slider endpoints survive normalization');
}
assert.equal(tree.root.findAllByType('input').length,3,'only actual puppet sliders remain; no separate demo slider');
const select=i=>slot(i).findAllByType('button').find(n=>n.props['data-pickup']===true);
await act(async()=>select(0).props.onClick());assert.equal(select(0).props['aria-pressed'],true);
await act(async()=>select(0).props.onClick());assert.equal(select(0).props['aria-pressed'],false);
await act(async()=>select(0).props.onClick());
await act(async()=>tree.root.findByProps({'data-shadow-workarea':true}).props.onKeyDown({key:'Escape'}));
assert.equal(select(0).props['aria-pressed'],false);
await act(async()=>select(0).props.onClick());await act(async()=>select(2).props.onClick());
assert.deepEqual(value.pieces,[1,2,0]);
await act(async()=>select(1).props.onClick());
await act(async()=>select(1).props.onPointerDown({clientX:100,clientY:100,pointerId:1,currentTarget:{setPointerCapture(){}}}));
await act(async()=>select(1).props.onPointerCancel({pointerId:1}));assert.equal(select(1).props['aria-pressed'],false,'touch scrolling/cancel clears pickup');
const beforeCancel=[...value.pieces];
await act(async()=>select(1).props.onPointerUp({clientX:200,clientY:100,pointerId:1}));assert.deepEqual(value.pieces,beforeCancel,'cancelled pointer release must not exchange');

const visual=i=>slot(i).findByProps({className:'shadow-puppet-target'});
await act(async()=>visual(0).props.onKeyDown({key:'Enter',preventDefault(){}}));
assert.equal(select(0).props['aria-pressed'],true,'SVG puppet is keyboard selectable');
await act(async()=>visual(0).props.onClick());assert.equal(select(0).props['aria-pressed'],false,'SVG puppet re-click cancels');
await act(async()=>visual(0).props.onPointerDown({clientX:50,clientY:200,pointerId:2,isPrimary:false,currentTarget:{}}));
await act(async()=>visual(0).props.onPointerUp({clientX:250,clientY:200,pointerId:2}));
assert.equal(select(0).props['aria-pressed'],false,'secondary pointer does not pick up puppet');
const beforeDrag=[...value.pieces];
await act(async()=>select(0).props.onPointerDown({clientX:50,clientY:200,pointerId:1,currentTarget:{setPointerCapture(){}}}));
await act(async()=>select(0).props.onPointerUp({clientX:250,clientY:200,pointerId:1}));
assert.deepEqual(value.pieces,[beforeDrag[2],beforeDrag[1],beforeDrag[0]],'horizontal pointer drop swaps physical tracks');
await act(async()=>select(0).props.onClick());assert.equal(select(0).props['aria-pressed'],false,'synthetic click after drag is suppressed');
const pointer=(x,y,extra={})=>({clientX:x,clientY:y,pointerId:1,button:0,isPrimary:true,currentTarget:{setPointerCapture(){}},...extra});
for(const [x,y] of [[-20,200],[320,200],[150,-20],[150,600],[55,260]]){
 const before=[...value.pieces];
 await act(async()=>visual(0).props.onPointerDown(pointer(50,200)));
 await act(async()=>visual(0).props.onPointerMove(pointer(x,y)));
 await act(async()=>visual(0).props.onPointerUp(pointer(x,y)));
 await act(async()=>visual(0).props.onClick());
 assert.deepEqual(value.pieces,before,'outside drop and vertical scrolling cannot swap');
 assert.equal(select(0).props['aria-pressed'],false);
}
for(const cancel of ['onPointerCancel','onLostPointerCapture']){
 const before=[...value.pieces];
 await act(async()=>visual(0).props.onPointerDown(pointer(50,200)));
 await act(async()=>visual(0).props.onPointerMove(pointer(250,200)));
 await act(async()=>visual(0).props[cancel](pointer(250,200)));
 await act(async()=>visual(0).props.onPointerUp(pointer(250,200)));
 await act(async()=>visual(0).props.onClick());assert.deepEqual(value.pieces,before);
}
await act(async()=>visual(0).props.onPointerDown(pointer(50,200)));
await act(async()=>visual(0).props.onPointerMove(pointer(250,200)));
await act(async()=>visual(0).props.onPointerUp(pointer(50,200)));
await act(async()=>visual(0).props.onClick());assert.equal(select(0).props['aria-pressed'],false,'drag returning to origin does not pick up');
for(const mode of ['easy','standard','challenge']){
 value={...value,mode};await act(async()=>tree.update(React.createElement(ShadowStage,props())));
 const before=[...value.pieces];
 await act(async()=>visual(0).props.onKeyDown({key:'Enter',preventDefault(){}}));
 await act(async()=>visual(2).props.onKeyDown({key:' ',preventDefault(){}}));
 assert.deepEqual(value.pieces,[before[2],before[1],before[0]],`${mode}: actual SVG artwork exchanges`);
}
assert.equal(tree.root.findAllByProps({'data-success-animation':true}).length,0);
value={...value,lit:true};await act(async()=>tree.update(React.createElement(ShadowStage,props())));
assert.equal(tree.root.findAllByProps({'data-success-animation':true}).length,1);
assert.ok(renderToStaticMarkup(React.createElement(ShadowStage,props())).includes('港湾已亮起'));
await act(async()=>tree.root.findByProps({'data-success-animation':true}).props.onAnimationEnd());
value={...value,lit:false};await act(async()=>tree.update(React.createElement(ShadowStage,props())));
value={...value,lit:true};await act(async()=>tree.update(React.createElement(ShadowStage,props())));
assert.equal(tree.root.findAllByProps({'data-success-animation':true}).length,0,'undo and solve again is not a new completion');

await act(async()=>tree.unmount());await act(async()=>{tree=create(React.createElement(ShadowStage,props()),{createNodeMock:()=>({getBoundingClientRect:()=>({left:0,right:300,top:0,bottom:500,width:300})})});});
assert.equal(tree.root.findAllByProps({'data-success-animation':true}).length,0,'restored success must not replay');
await act(async()=>tree.unmount());
console.log('Shadow workarea: real rotation/projection/depth, exchange/cancel, fresh-only completion animation and restored completion pass.');
