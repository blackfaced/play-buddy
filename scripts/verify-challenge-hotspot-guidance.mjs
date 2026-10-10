/** Challenge suppresses unsolicited scene overlays, without removing scene art or accessible controls. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router';
import { renderToStaticMarkup as render } from 'react-dom/server';
await build({stdin:{contents:`export * from './src/escape/campaign/registry';export {ClockworkGears} from './src/escape/campaign/episodes/ClockworkGears';export {default as EscapeRoom} from './src/escape/EscapeRoom';export {default as Adventure} from './src/escape/adventure/Adventure';`,resolveDir:process.cwd()},outfile:'node_modules/.tmp-challenge-hotspots.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'},plugins:[{name:'health-double',setup(b){b.onResolve({filter:/store\/useStore$/},()=>({path:'store',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const useStore = selector => selector({lock:null});'}));}}]});
const {CAMPAIGN_EPISODES,ClockworkGears,EscapeRoom,Adventure}=await import('../node_modules/.tmp-challenge-hotspots.mjs');
const htmlFor=(episode,mode,state=episode.initial())=>render(React.createElement(episode.Component,{state,mode,update(){},complete(){},announce(){},openDetail(){},closeDetail(){}}));
for(const id of ['radio','music']) {
 const episode=CAMPAIGN_EPISODES.find(e=>e.id===id);
 for(const mode of ['easy','standard','challenge']) {
  const html=htmlFor(episode,mode);
  assert.equal(html.includes('radio-exploration-targets unmarked'),mode==='challenge',`${id}: challenge hides floating action labels`);
  assert.ok(html.includes('<svg'),`${id}: scene artwork remains`);
  assert.ok(html.includes('radio-exploration-targets'),`${id}: hit areas remain operable`);
 }
}
for(const id of ['shadow','greenhouse']) {
 const episode=CAMPAIGN_EPISODES.find(e=>e.id===id);
 for(const mode of ['easy','standard','challenge']) {
  const html=htmlFor(episode,mode);
  assert.equal(html.includes('<title>'),mode!=='challenge',`${id}: no unsolicited native tooltip in challenge`);
  assert.ok(html.includes('tabindex="0"')&&html.includes('aria-label='),`${id}: keyboard access and names remain`);
 }
}
const radioCss=fs.readFileSync('src/escape/campaign/episodes/radioMusicExploration.css','utf8');
assert.match(radioCss,/\.radio-exploration-targets\.unmarked button\s*\{[^}]*color:\s*transparent/);
assert.match(radioCss,/\.radio-exploration-targets button:focus-visible\s*\{[^}]*outline:/);
for(const [file,selector] of [['shadowExploration.css','shadow-spot'],['greenhouseExploration.css','gh-target']]) {
 const css=fs.readFileSync(`src/escape/campaign/episodes/${file}`,'utf8');
 assert.ok(css.includes(`.${selector}:not(.unmarked):hover`),`${selector}: hover assistance is mode scoped`);
 assert.ok(css.includes(`.${selector}:focus-visible`),`${selector}: focus remains visible`);
}
const cargo=CAMPAIGN_EPISODES.find(e=>e.id==='cargo');
for(const mode of ['easy','standard','challenge']) {
 const html=htmlFor(cargo,mode);
 assert.ok(html.includes('cargo-art-target'));
 const initial=cargo.initial();
 const deck=htmlFor(cargo,mode,{...initial,values:{...initial.values,view:'deck'}});
 assert.equal(deck.includes('码头的帆布还盖着货物'),mode!=='challenge');
 assert.ok(deck.includes('货舱第1格'),'cargo slot names remain accessible');
 assert.ok(deck.includes('>1</text>'),'in-world slot numbers remain visible');
}
// Existing 01–03 already hide their generic hotspot labels on pointer hover.
for(const [file,selector] of [['escape.css','escape-hotspot'],['adventure/adventure.css','adventure-point'],['chapter/chapter.css','chapter-point']]) {
 const css=fs.readFileSync(`src/escape/${file}`,'utf8');
 assert.ok(css.includes(`.${selector}.unmarked:hover > span`));
 assert.ok(css.includes(`.${selector}.unmarked:focus-visible`));
}
console.log('Challenge scene overlays, native tooltips, artwork and keyboard access verified.');

const cargoCss=fs.readFileSync('src/escape/campaign/episodes/cargoExploration.css','utf8');
assert.ok(cargoCss.includes('.cargo-art-target[aria-pressed="true"]'), 'selected-item feedback remains');
const observatory=CAMPAIGN_EPISODES.find(e=>e.id==='observatory');
assert.equal(htmlFor(observatory,'challenge'),htmlFor(observatory,'standard'),'observatory has only in-world clues and deliberate controls, which remain unchanged');

for(const mode of ['easy','standard','challenge']) {
 const html=render(React.createElement(ClockworkGears,{mode,gears:[24,36,48],testedGears:[24,36,48],foundGears:[24,36,48],crank:1,onChange(){},onCrank(){}}));
 assert.equal(html.includes('观察停稳的白色刻线'),mode!=='challenge','trial results must not coach challenge players');
 assert.equal(html.includes('记住它们相对起点的位置'),mode!=='challenge');
 assert.ok(html.includes('试转结束。'));
 assert.ok(html.includes('拖动齿轮到转轴'),'basic controls remain');
 assert.ok(html.includes('刻线停在：'),'accessible equivalent of visible readings remains');
}

// Real failure handlers must report consequences, without suggesting the solution source.
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const storage=new Map();
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
const nodeText=n=>typeof n==='string'?n:(n?.children??[]).map(nodeText).join('');
for(const mode of ['easy','standard','challenge']) {
 storage.clear();storage.set('play-buddy:escape:guidance:v1',mode);
 let tree;
 const mount=async Component=>{await act(async()=>{tree=create(React.createElement(MemoryRouter,null,React.createElement(Component,{mode,standalone:true})),{createNodeMock:el=>el.type==='dialog'?{showModal(){},close(){}}:null});});};
 const click=async node=>{await act(async()=>node.props.onClick());};
 await mount(EscapeRoom);
 await click(tree.root.findByProps({'aria-label':'检查小抽屉'}));
 await click(tree.root.findAllByType('button').find(n=>nodeText(n)==='试着打开'));
 assert.equal(nodeText(tree.toJSON()).includes('再看看递推算图'),mode!=='challenge');
 await act(async()=>tree.unmount());
 await mount(Adventure);
 await click(tree.root.findByProps({'aria-label':'检查保险柜'}));
 await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert.equal(nodeText(tree.toJSON()).includes('再检查记录中的线索'),mode!=='challenge');
 await act(async()=>tree.unmount());
}
console.log('Challenge failure handlers retain neutral feedback without solution coaching.');
