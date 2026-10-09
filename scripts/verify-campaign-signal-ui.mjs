import assert from 'node:assert/strict';
import { build } from 'esbuild';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { renderToStaticMarkup } from 'react-dom/server';
await build({stdin:{contents:"export {radioEpisode} from './src/escape/campaign/episodes/radio';export {musicEpisode} from './src/escape/campaign/episodes/music';export {default as Shell} from './src/escape/campaign/CampaignEpisode';export {episodeKey,parseEpisode,serializeEpisode} from './src/escape/campaign/engine';",resolveDir:process.cwd()},outfile:'node_modules/.tmp-campaign-signal-ui.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',loader:{'.css':'empty'},plugins:[{name:'health-state',setup(b){b.onResolve({filter:/store\/useStore$/},()=>({path:'store',namespace:'health'}));b.onLoad({filter:/.*/,namespace:'health'},()=>({contents:'export const useStore=f=>f({lock:null})'}));}}]});
const A=await import('../node_modules/.tmp-campaign-signal-ui.mjs');
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let externalReset;
let tree,state,announcements=[],completed=0,definition;
const text=n=>typeof n==='string'?n:(n.children??[]).map(text).join('');
const button=name=>{const b=tree.root.findAllByType('button').find(n=>text(n)===name||n.props['aria-label']===name);assert.ok(b,`button ${name}`);return b;};
async function click(name){const b=button(name);assert.ok(!b.props.disabled);await act(async()=>b.props.onClick());}
function Harness(){const [s,set]=React.useState(state);state=s;externalReset=set;return React.createElement(definition.Component,{state:s,mode:'standard',update:patch=>set(old=>definition.normalize({...old,...patch,values:{...old.values,...patch.values}})),complete:()=>completed++,announce:m=>announcements.push(m),openDetail:()=>{},closeDetail:()=>{}});}
async function mount(def,s=def.initial()){definition=def;state=s;await act(async()=>{tree=create(React.createElement(Harness));});}
async function unmount(){await act(async()=>tree.unmount());}
function roundtrip(){const loaded=A.parseEpisode(definition,A.serializeEpisode(definition,state));assert.equal(loaded.status,'valid');assert.deepEqual(loaded.state,state);return loaded.state;}
for(const def of [A.radioEpisode,A.musicEpisode]){const markup=renderToStaticMarkup(React.createElement(def.Component,{state:def.initial(),mode:'challenge',update:()=>{},complete:()=>{},announce:()=>{},openDetail:()=>{},closeDetail:()=>{}}));assert.match(markup,/viewBox="0 0 1000 /);assert.ok((markup.match(/<path/g)??[]).length>=20);assert.doesNotMatch(markup,/下一步|正确.{0,4}[0-9]/);}
await mount(A.radioEpisode);
await click('掀开示波器罩');let dial=tree.root.findByProps({'aria-label':'贝壳调谐',role:'slider'});await act(async()=>dial.props.onPointerDown({clientY:80,pointerId:1,currentTarget:{setPointerCapture(){}}}));await act(async()=>dial.props.onPointerMove({clientY:66}));assert.equal(state.values.phases[0],1);await act(async()=>dial.props.onPointerUp());await click('复位调谐旋钮');
await click('走到发报机');await click('转动发报摇柄');assert.equal(completed,0);assert.equal(state.solved.includes('broadcast'),false);
await click('拉开接线台');await click('拿起导线：星星');const board=tree.root.findByProps({'aria-label':'可见交叉线路与不同形状的端子'});await act(async()=>board.props.onPointerUp({clientX:130,clientY:300,currentTarget:{getBoundingClientRect(){return{left:0,top:0,width:660,height:360};}}}));assert.deepEqual(state.values.wires,[2,1,0]);await click('放回原位');await click('拿起导线：星星');await click('放到插座 A');await click('拿起导线：贝壳');await click('放到插座 B');assert.deepEqual(state.values.wires,[2,0,1]);
await click('掀开示波器罩');
for(const [label,n] of [['贝壳',1],['海浪',3],['星星',2]]){const slider=tree.root.findByProps({'aria-label':label+'调谐',role:'slider'});for(let i=0;i<n;i++)await act(async()=>tree.root.findByProps({'aria-label':label+'调谐',role:'slider'}).props.onKeyDown({key:'ArrowUp',preventDefault(){}}));assert.equal(slider.props['aria-valuenow'],n);}
let saved=roundtrip();await unmount();await mount(A.radioEpisode,saved);await click('走到发报机');const before=structuredClone(state.values);await click('转动发报摇柄');assert.deepEqual(state.values,before);assert.equal(state.solved.includes('broadcast'),false);await click('拿起插头：海鸥');await click('放到插座 A');await click('拿起插头：灯塔');await click('放到插座 B');await click('转动发报摇柄');assert.ok(state.solved.includes('broadcast'));assert.equal(completed,1);
await click('掀开示波器罩');assert.equal(tree.root.findAllByProps({role:'slider'}).length,3);assert.equal(tree.root.findAllByProps({'aria-label':'贝壳台：参考波形与当前波形，收到灯塔图像'}).length,1);saved=roundtrip();await unmount();await mount(A.radioEpisode,saved);assert.ok(JSON.stringify(tree.toJSON()).includes('远方的灯依次亮起'));await unmount();
// Audio is never constructed on render; all sound originates in an explicit gesture.
let audioCreations=0,starts=0;class AudioStub{constructor(){audioCreations++;this.state='running';this.currentTime=0;this.destination={};}createOscillator(){return{frequency:{value:0},connect(){},disconnect(){},start(){starts++;},stop(){}};}createGain(){return{gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}close(){return Promise.resolve();}}
globalThis.AudioContext=AudioStub;
const nativeTimeout=globalThis.setTimeout,nativeClear=globalThis.clearTimeout;let tasks=new Map(),taskId=0;globalThis.setTimeout=fn=>{tasks.set(++taskId,fn);return taskId;};globalThis.clearTimeout=id=>tasks.delete(id);
async function tickAll(){while(tasks.size){const [id,fn]=tasks.entries().next().value;tasks.delete(id);await act(async()=>fn());}}
completed=0;await mount(A.musicEpisode);assert.equal(audioCreations,0);await click('查看打孔纸卷');await click('纸卷转轴逆时针');await click('纸卷转轴逆时针');assert.equal(state.values.roll,0);await click('掀开风铃帘');await click('拿起燕鸥铜管');await click('挂到左钩');await click('拿起猫头鹰铜管');await click('挂到中钩');assert.deepEqual(state.values.bars,[0,1,2]);await click('轻敲猫头鹰');assert.equal(audioCreations,1);assert.equal(starts,1);await tickAll();
await click('打开八音盒');await click('转动八音盒摇柄');assert.equal(button('转动八音盒摇柄').props.disabled,true);await click('停住摇柄');assert.equal(tasks.size,0);assert.equal(completed,0);
const peg=async(row,beat,remove=false)=>{const n=tree.root.findByProps({'aria-label':`${row}音第${beat}拍${remove?'取出':'放入'}铜钉`});await act(async()=>n.props.onKeyDown({key:' ',preventDefault(){}}));};
await peg('中',1);await peg('低',3);await peg('高',4);await peg('中',6);await peg('低',1);await click('转动八音盒摇柄');await tickAll();assert.equal(completed,0);assert.equal(state.values.pegs.length,5);assert.ok(announcements.at(-1).includes('仍合着'));await peg('低',1,true);const solvedInputs=structuredClone(state);await click('转动八音盒摇柄');await act(async()=>externalReset(A.musicEpisode.initial()));await tickAll();assert.equal(completed,0);assert.deepEqual(state.values.pegs,[]);await act(async()=>externalReset(solvedInputs));saved=roundtrip();await unmount();await mount(A.musicEpisode,saved);await click('打开八音盒');await click('静音');const priorStarts=starts;await click('转动八音盒摇柄');await tickAll();assert.equal(starts,priorStarts);assert.equal(completed,1);assert.ok(state.solved.includes('melody'));await click('查看打孔纸卷');assert.equal(state.values.roll,0);assert.ok(JSON.stringify(tree.toJSON()).includes('纸卷展开后的孔与接缝'));saved=roundtrip();await unmount();await mount(A.musicEpisode,saved);assert.ok(state.solved.includes('melody'));await unmount();globalThis.setTimeout=nativeTimeout;globalThis.clearTimeout=nativeClear;delete globalThis.AudioContext;
console.log('Signal/music UI: actual keyboard journeys, wrong attempts, independent sources, saved revisit, SSR art, gesture audio, mute and interrupted playback passed.');

// Exercise actual shell controls while the final physical action is still running.
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
globalThis.setTimeout=fn=>{tasks.set(++taskId,fn);return taskId;};globalThis.clearTimeout=id=>tasks.delete(id);
for(const operation of ['replay','undo']){
 const initial=A.musicEpisode.initial();initial.values.pegs=[2,6,11,15];initial.values.muted=true;
 storage.set(A.episodeKey('music'),A.serializeEpisode(A.musicEpisode,initial));let reports=0;
 await act(async()=>{tree=create(React.createElement(A.Shell,{episode:A.musicEpisode,onBack(){},onComplete(){reports++;}}),{createNodeMock:n=>n.type==='dialog'?{showModal(){},close(){}}:null});});
 await click('打开八音盒');
 if(operation==='undo'){for(const label of ['低音第1拍放入铜钉','低音第1拍取出铜钉'])await act(async()=>tree.root.findByProps({'aria-label':label}).props.onClick());}
 await click('转动八音盒摇柄');
 if(operation==='replay'){await click('重新探索');await click('确认重新探索这一幕');}else await click('撤回一步');
 await tickAll();const final=A.parseEpisode(A.musicEpisode,storage.get(A.episodeKey('music'))).state;
 assert.deepEqual(final.values.pegs,operation==='replay'?[]:[0,2,6,11,15]);assert.equal(A.musicEpisode.isComplete(final),false);assert.equal(reports,0);await unmount();
}
globalThis.setTimeout=nativeTimeout;globalThis.clearTimeout=nativeClear;
console.log('Actual campaign shell: music replay and undo cancel old playback without resurrecting completion.');
