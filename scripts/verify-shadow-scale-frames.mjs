import assert from 'node:assert/strict';
import {build} from 'esbuild';
import React from 'react';
import {create,act} from 'react-test-renderer';
await build({stdin:{contents:"export {ShadowScaleFrame} from './src/escape/campaign/episodes/ShadowScaleFrame'; export {ShadowHarborSource} from './src/escape/campaign/episodes/ShadowJournal'; export {ShadowStage} from './src/escape/campaign/episodes/shadowStage'; export {STAGE_LANDINGS} from './src/escape/campaign/episodes/shadowLogic';",resolveDir:process.cwd()},outfile:'node_modules/.tmp-shadow-scale-frames.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});
const {ShadowScaleFrame,ShadowHarborSource,ShadowStage,STAGE_LANDINGS}=await import('../node_modules/.tmp-shadow-scale-frames.mjs');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
for(const size of [31,37,38,51,93,111,114,153]) {
 let tree;await act(async()=>{tree=create(React.createElement('svg',null,React.createElement(ShadowScaleFrame,{x:20,y:40,size,stroke:'#725c68',strokeWidth:2})));});
 const frame=tree.root.findByProps({'data-shadow-scale-frame':true});
 assert.equal(frame.findByType('rect').props.width,size);
 const lines=frame.findAllByType('line');assert.equal(lines.length,4,'two horizontal and two vertical registration lines');
 for(let index=0;index<2;index++) {
  const horizontal=lines[index*2],vertical=lines[index*2+1];
  assert.equal(horizontal.props.y1,size*(index+1)/3);assert.equal(horizontal.props.x2,size);
  assert.equal(vertical.props.x1,size*(index+1)/3);assert.equal(vertical.props.y2,size);
 }
 assert.equal(frame.findAllByType('text').length,0,'nonverbal scale reference');
 await act(async()=>tree.unmount());
}
let stage;await act(async()=>{stage=create(React.createElement(ShadowStage,{pieces:[0,1,2],depths:STAGE_LANDINGS.map(x=>x.scale),turns:[0,0,0],lamp:true,revealed:true,lit:false,mode:'challenge',onChange(){}}));});
for(let i=0;i<3;i++) {
 const column=stage.root.findByProps({'data-stage-slot':i});
 const frame=column.findByType(ShadowScaleFrame).props;
 const shadow=column.findByProps({'data-projected-shadow':true});
 assert.equal(frame.size,STAGE_LANDINGS[i].scale*17*3);
 assert.equal(shadow.props.transform,`translate(${frame.x} ${frame.y})`,'target frame and projected 3×3 extent share exact origin');
 assert.equal(shadow.findAllByType('rect')[0].props.width-.1,frame.size/3,'frame cell pitch equals projected cell pitch');
}
let source;await act(async()=>{source=create(React.createElement('svg',null,React.createElement(ShadowHarborSource)));});
assert.deepEqual(source.root.findAllByType(ShadowScaleFrame).map(n=>n.props.size/38),STAGE_LANDINGS.map(x=>x.scale),'original source preserves the same size ratios');
await act(async()=>{stage.unmount();source.unmount();});
console.log('Shadow scale frames: shared nonverbal 3×3 registration geometry, unchanged source size ratios and exact projected cell alignment pass.');
