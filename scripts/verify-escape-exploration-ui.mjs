import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/package.json');
const { build } = require('esbuild');
const React = require('react');
const { create, act } = require('react-test-renderer');
const { renderToStaticMarkup } = require('react-dom/server');
const { MemoryRouter } = require('react-router');
await build({stdin:{contents:`export {default as Chapter} from './src/escape/chapter/Chapter'; export * from './src/escape/chapter/content'; export * from './src/escape/chapter/engine'; export * from './src/escape/chapter/SceneArt';`,resolveDir:process.cwd()},outfile:'node_modules/.tmp-exploration-ui.mjs',bundle:true,platform:'node',jsx:'automatic',format:'esm',packages:'external',loader:{'.css':'empty'},plugins:[{name:'store-double',setup(b){b.onResolve({filter:/store\/useStore$/},()=>({path:'store',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},()=>({contents:'export const useStore = selector => selector({lock:null});'}));}}]});
const A = await import(process.cwd() + '/node_modules/.tmp-exploration-ui.mjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storage = new Map();
globalThis.localStorage = {getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
const text = node => typeof node === 'string' ? node : (node.children??[]).map(text).join('');
let tree;
const scope = () => tree.root.findAllByType('dialog')[0] ?? tree.root;
const label = name => scope().findByProps({'aria-label':name});
const click = async node => act(async()=>node.props.onClick());
const close = async () => click(label('关闭近景'));
for (const mode of ['standard','challenge','easy']) {
 storage.clear(); storage.set('play-buddy:escape:mode',mode);
 let state = A.reduceChapter(A.CHAPTER,A.initialChapter(A.CHAPTER),{type:'begin'});
 storage.set(A.CHAPTER_KEY,A.serializeChapter(A.CHAPTER,state));
 await act(async()=>{tree=create(React.createElement(MemoryRouter,null,React.createElement(A.Chapter,{mode})),{createNodeMock:e=>e.type==='dialog'?{showModal(){},close(){}}:null});});
 for (const [room,prop,description] of [['gallery','收藏桌上的罗盘','指针'],['optics','桌边望远镜','镜筒'],['workshop','散放的齿轮','齿轮']]) {
  if (scope().type==='dialog') await close();
  await click(tree.root.findAllByType('button').find(b=>text(b).endsWith(A.CHAPTER.scenes.find(s=>s.id===room).title)));
  await click(label(`检查${{gallery:'搜寻收藏桌',optics:'搜寻观测台',workshop:'搜寻工具台'}[room]}`));
  if (mode !== 'easy') assert.ok(!text(scope()).includes('机关完成'));
  const before=storage.get(A.CHAPTER_KEY);
  await click(label(`检查${prop}`));
  assert.ok(text(scope()).includes(description),'Inspection gives object-specific feedback');
  assert.equal(storage.get(A.CHAPTER_KEY),before,'Decorative inspection does not gate progress or consume tools');
  assert.equal(label(`检查${prop}`).props.className.includes('unmarked'),mode==='challenge');
 }
 await close();
 await click(tree.root.findAllByType('button').find(b=>text(b).endsWith('珍奇标本舱')));
 await click(label('检查观察标本柜'));
 assert.equal(scope().findAllByType('details').length,0,'Locked installation stays visible');
 await close(); await click(label('检查搜寻收藏桌'));
 await click(label('检查掀开布帘'));
 assert.ok(text(scope()).includes('布帘'),'Reveal feedback names the moved object');
 await click(label('检查软刷'));
 await click(scope().findAllByType('button').find(b=>text(b)==='查看检修清单'));
 if (mode !== 'easy') {
  assert.ok(!text(scope()).includes('七件'));
  assert.ok(!text(scope()).includes('长柄钩'),'Unknown item names stay undisclosed');
  assert.ok(!text(scope()).includes(' 件'),'No inventory total in regular play');
 }
 await close(); await click(label('检查搜寻收藏桌'));
 await close(); await click(label('检查搜寻收藏桌'));
 await click(label('检查软刷原来的位置'));
 assert.ok(text(scope()).includes('已经收进工具袋'),'Empty pickup position stays inspectable on revisit');
 await close(); await click(label('检查观察标本柜'));
 await click(scope().findAllByType('button').find(b=>text(b)==='工具袋'));
 await click(scope().findAllByType('button').find(b=>text(b).includes('软刷')));
 await click(label('检查积灰铭牌'));
 assert.ok(text(scope()).includes('灰尘'),'Tool response describes physical change');
 assert.equal(scope().findAllByType('details').length,0,'Ready devices have no second installation panel');
 assert.equal(scope().findAllByProps({'data-device':'animal-cabinet'}).length,0,'Ready devices show only their actual puzzle');
 assert.ok(label('动物标本柜密码'),'Playable controls replace the installation');
 assert.ok(text(scope()).includes('鸟 → 蜘蛛 → 龟 → 蚂蚁'),'The cleaned inscription stays on the actual puzzle');
 await close(); await click(label('检查观察标本柜'));
 assert.ok(label('动物标本柜密码'),'Reopening keeps the actual device');
 assert.equal(scope().findAllByProps({'data-tool-target':'brush-plaque'}).length,0,'Finished setup no longer competes with the puzzle');
 await act(async()=>tree.unmount());
}
console.log('Exploration UI passed: neutral inspect props, unchanged progress, physical action feedback, persistent empty locations, visible locked installations and single-board ready devices in all modes.');

for (const [room,landmark] of [['gallery','标本收藏架'],['optics','星空观测窗'],['workshop','铜管工具架']]) {
 const markup=renderToStaticMarkup(React.createElement(A.SearchBackdrop,{scene:room,state:A.initialChapter(A.CHAPTER)}));
 assert.ok(markup.includes(landmark),`${room} has distinct search scenery`);
}
