import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postcss from "postcss";
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/package.json");
const { build } = require("esbuild"),
  React = require("react"),
  { create, act } = require("react-test-renderer"),
  { MemoryRouter } = require("react-router");
await build({
  stdin: {
    contents: `export {default as Adventure} from './src/escape/adventure/Adventure';export * from './src/escape/adventure/logic';export * from './src/escape/logic';`,
    resolveDir: process.cwd(),
  },
  outfile: process.cwd() + "/node_modules/.tmp-adventure-targets.mjs",
  bundle: true,
  platform: "node",
  jsx: "automatic",
  format: "esm",
  packages: "external",
  loader: { ".css": "empty" },
  plugins: [
    {
      name: "health-double",
      setup(b) {
        b.onResolve({ filter: /store\/useStore$/ }, () => ({
          path: "store",
          namespace: "test",
        }));
        b.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents:
            "export const useStore = selector => selector({lock:globalThis.__reviewLock??null});",
        }));
      },
    },
  ],
});
const A = await import(
  process.cwd() + "/node_modules/.tmp-adventure-targets.mjs"
);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => storage.set(k, v),
};
let reloads = 0;
globalThis.window = {
  location: {
    reload() {
      reloads++;
    },
  },
};

const start = { ...A.initialAdventure(), started:true, room:"navigation", compassCaseOpen:true, manifestMoved:true, found:["key","battery","crank"] };
const text = n => typeof n === "string" ? n : (n.children ?? []).map(text).join("");
let tree;
const wrap = () => React.createElement(MemoryRouter, null, React.createElement(A.Adventure, {standalone:true}));
const mount = async state => {
  storage.set(A.ADVENTURE_KEY, A.serializeAdventure(state));
  await act(async () => { tree = create(wrap(), {createNodeMock:e => e.type === "dialog" ? {showModal(){}} : null}); });
};
const label = name => tree.root.findByProps({"aria-label":name});
const btn = name => {
  const result = tree.root.findAllByType("button").find(n => text(n) === name);
  assert.ok(result, "Missing button: " + name); return result;
};
const click = async node => { assert.ok(!node.props.disabled); await act(async () => node.props.onClick()); };
const saved = () => A.parseAdventure(storage.get(A.ADVENTURE_KEY));
const close = () => click(label("关闭近景"));
const snapshot = () => storage.get(A.ADVENTURE_KEY);
await mount(start);
await act(async () => tree.root.findByType("select").props.onChange({target:{value:"challenge"}}));
assert.equal(tree.root.findAllByProps({"data-guidance":"rule"}).length, 0);
assert.ok(!tree.root.findAllByType("button").some(n => text(n) === "一点提示"));
assert.ok(!tree.root.findAllByType("button").some(n => text(n) === "使用选中的道具"));
await click(label("检查储物舱门"));
const untouched = snapshot();
await click(label("检查储物舱门锁孔"));
assert.equal(snapshot(), untouched, "Empty-handed inspection never unlocks");
await click(btn("小电池组"));
await click(label("检查储物舱门锁孔"));
assert.equal(snapshot(), untouched, "Wrong item stays in inventory");
assert.ok(text(tree.root.findByType("dialog")).includes("放不进锁孔"));
await click(btn("黄铜小钥匙"));
await click(btn("取消选择"));
await click(label("检查储物舱门锁孔"));
assert.equal(snapshot(), untouched, "Cancel clears pending use");
await act(async () => { const dialog = tree.root.findByType("dialog"); dialog.props.onClick({target:dialog, currentTarget:dialog}); });
assert.equal(tree.root.findAllByType("dialog").length, 0, "Backdrop dismisses without consuming an item");
await click(label("检查储物舱门"));
await click(btn("黄铜小钥匙"));
await close();
await click(label("检查储物舱门"));
await click(label("检查储物舱门锁孔"));
assert.ok(saved().storeroomOpen);
await click(label("检查储物舱门锁孔"));
assert.ok(saved().storeroomOpen, "Repeated target clicks keep solved state");
await click(btn("走进甲板储物舱 →"));
await click(label("检查储物架的物件堆"));
await click(label("检查软毛刷")); await click(label("检查吊钩")); await close();
await click(btn("导航室")); await click(label("检查水深记录"));
await click(btn("曲柄")); const dirty = snapshot();
await click(label("检查记录纸面")); assert.equal(snapshot(), dirty);
await click(btn("软毛刷")); await click(label("检查记录纸面"));
assert.ok(saved().ledgerClean);
assert.ok(text(tree.root.findByType("dialog")).includes("8 米"));
await close(); await click(label("检查水深记录"));
assert.equal(tree.root.findAllByProps({"aria-label":"检查记录纸面"}).length, 0);
assert.ok(text(tree.root.findByType("dialog")).includes("吃水"));
await close(); await click(btn("甲板储物舱")); await click(label("检查绞盘与栈桥"));
await click(btn("吊钩")); const unmounted = snapshot();
await click(label("检查绞盘方形轴孔")); assert.equal(snapshot(), unmounted, "Hook cannot go into shaft");
await click(label("检查吊索末端")); assert.ok(saved().hookMounted); assert.ok(!saved().crankMounted);
await click(btn("曲柄")); const onlyHook = snapshot();
await click(label("检查吊索末端")); assert.equal(snapshot(), onlyHook);
await click(label("检查绞盘方形轴孔")); assert.ok(saved().crankMounted);
await click(label("检查绞盘方形轴孔")); assert.ok(saved().crankMounted);
await click(btn("转动绞盘")); assert.ok(!saved().gangwayDown, "Installation never bypasses board confirmation");
await act(async () => tree.root.findByType("dialog").props.onCancel());
assert.equal(tree.root.findAllByType("dialog").length, 0);
const progress = snapshot(); await act(async () => tree.unmount()); await mount(A.parseAdventure(progress));
assert.equal(snapshot(), progress, "Mount/navigation preserves physical installations");
await click(label("检查绞盘与栈桥"));
for (const name of ["检查绞盘方形轴孔","检查吊索末端"]) {
  assert.equal(label(name).type, "button", "Native button supports keyboard and touch activation");
}
globalThis.__reviewLock = "rest"; await act(async () => tree.update(wrap()));
assert.equal(tree.root.findAllByType("dialog").length, 0);
assert.equal(snapshot(), progress);
await act(async () => tree.unmount());
console.log("Adventure direct tool targets: wrong items, cancel, repeat, paper clues, return/save, board prerequisite and HealthGate passed.");

// Source-level CSS contract complements handler tests; it is not browser geometry QA.
const css = postcss.parse(readFileSync("src/escape/adventure/adventure.css", "utf8"));
const declarations = selector => {
  const result = {}; css.walkRules(rule => { if (rule.selector === selector) rule.walkDecls(d => result[d.prop] = d.value); }); return result;
};
assert.equal(declarations(".adventure-surface-target")["min-height"], "44px");
assert.equal(declarations(".adventure-surface-target")["min-width"], "44px");
assert.ok(declarations(".adventure-surface-target:focus-visible").outline);
console.log("Native targets: focus styling, 44px minimum, challenge no hints, backdrop and Escape cancellation passed.");
