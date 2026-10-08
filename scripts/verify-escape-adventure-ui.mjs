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
  outfile: process.cwd() + "/node_modules/.tmp-adventure-review.mjs",
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
  process.cwd() + "/node_modules/.tmp-adventure-review.mjs"
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
const completed = {
  ...A.initialState(),
  picture: true,
  slats: [0, 1, 2, 3, 4],
  cloth: true,
  chart: true,
  drawer: true,
  cabinet: true,
  combined: true,
  token2: true,
  tokensInserted: true,
  rings: [0, 0, 0],
  safe: true,
  escaped: true,
  seen: [],
};
// Use valid full cabin state from reducer-oriented legacy acceptance (booleans are sufficient).
storage.set(A.SAVE_KEY, A.serializeSave(completed));
storage.set(
  A.ADVENTURE_KEY,
  A.serializeAdventure({
    ...A.initialAdventure(),
    started: true,
    room: "navigation",
  }),
);
let tree;
const wrap = () =>
  React.createElement(MemoryRouter, null, React.createElement(A.Adventure));
async function mount() {
  await act(async () => {
    tree = create(wrap(), {
      createNodeMock: (e) => (e.type === "dialog" ? { showModal() {} } : null),
    });
  });
}
await mount();
const nt = (n) =>
  typeof n === "string" ? n : (n.children ?? []).map(nt).join("");
const txt = () => JSON.stringify(tree.toJSON());
const label = (s) => tree.root.findByProps({ "aria-label": s });
const btn = (s) => {
  let n = tree.root.findAllByType("button").find((x) => nt(x) === s);
  assert.ok(n, "missing " + s);
  return n;
};
const click = async (n) => {
  assert.ok(!n.props.disabled);
  await act(async () => n.props.onClick());
};
const close = () => click(label("关闭近景"));
const saved = () => A.parseAdventure(storage.get(A.ADVENTURE_KEY));
const mode = async (v) =>
  act(async () =>
    tree.root.findByType("select").props.onChange({ target: { value: v } }),
  );
// Source-backed CSS cascade contract: React's headless renderer cannot compute styles.
// Match the hotspot's simple class/pseudo-class selectors against its actual markup.
const pointCss = postcss.parse(readFileSync("src/escape/adventure/adventure.css", "utf8"));
function pointStyle(point, child, states) {
  const classes = point.props.className.split(/\s+/);
  const declarations = [];
  pointCss.walkRules((rule) => {
    for (const selector of rule.selectors) {
      if (!selector.startsWith(".adventure-point")) continue;
      const parts = selector.split(/\s*>\s*/);
      if ((parts.length === 2) !== child) continue;
      assert.ok(parts.length <= 2 && (!child || parts[1] === "span"));
      const tokens = parts[0].match(/[.:][\w-]+/g) ?? [];
      assert.equal(tokens.join(""), parts[0], "Extend hotspot CSS matcher for new selector syntax");
      if (!tokens.every((token) => token[0] === "."
        ? classes.includes(token.slice(1)) : states.includes(token.slice(1)))) continue;
      rule.walkDecls((decl) => declarations.push({
        property: decl.prop, value: decl.value,
        specificity: tokens.length * 10 + (child ? 1 : 0),
      }));
    }
  });
  return Object.fromEntries(declarations.sort((a, b) => a.specificity - b.specificity)
    .map(({ property, value }) => [property, value]));
}
async function verifyHotspots(count, target) {
  for (const value of ["easy", "standard", "challenge"]) {
    await mode(value);
    const points = tree.root.findAllByType("button")
      .filter((point) => point.props.className?.split(" ").includes("adventure-point"));
    assert.equal(points.length, count);
    for (const point of points) {
      assert.ok(point.props["aria-label"].startsWith("检查"));
      assert.equal(typeof point.props.onClick, "function");
      assert.ok(nt(point.findByType("span")).length > 0);
      assert.equal(nt(point).includes("＋"), value !== "challenge");
      for (const states of [[], ["hover"], ["focus-visible"], ["hover", "focus-visible"]]) {
        const button = pointStyle(point, false, states);
        const tooltip = pointStyle(point, true, states);
        const visible = value === "easy" || states.includes("focus-visible")
          || (value === "standard" && states.includes("hover"));
        assert.equal(tooltip.opacity, visible ? "1" : "0", `${value}: ${states} tooltip visibility`);
        if (visible) assert.equal(tooltip.color ?? button.color, "#fff0c9", `${value}: readable tooltip`);
        assert.equal(tooltip["pointer-events"], "none");
        if (value === "challenge") assert.equal(button.background, "transparent");
      }
    }
    // The unmarked target remains operable in every mode, without revealing a solution.
    await click(label(target));
    assert.equal(tree.root.findAllByType("dialog").length, 1);
    await close();
  }
  await mode("standard");
}
await verifyHotspots(5, "检查航海桌的物件堆");
console.log("Hotspot CSS/markup: all modes, idle/hover/focus, readable labels and accessible clicks passed.");
await click(label("检查航海桌的物件堆"));
assert.equal(
  tree.root.findAllByProps({ "aria-label": "检查黄铜小钥匙" }).length,
  0,
);
assert.equal(
  tree.root.findAllByProps({ "aria-label": "检查小电池组" }).length,
  0,
);
await click(label("检查罗盘盒"));
await click(label("检查黄铜小钥匙"));
await click(label("检查货物清单"));
await click(label("检查小电池组"));
await click(label("检查曲柄"));
await close();
await click(label("检查储物舱门"));
assert.equal(btn("使用选中的道具").props.disabled, true);
await click(btn("小电池组"));
await click(btn("使用选中的道具"));
assert.equal(saved().storeroomOpen, false);
assert.ok(A.availableItems(saved()).includes("battery"));
await click(btn("黄铜小钥匙"));
await click(btn("使用选中的道具"));
await click(btn("走进甲板储物舱 →"));
await verifyHotspots(3, "检查栈桥控制板");
await click(label("检查储物架的物件堆"));
assert.equal(
  tree.root.findAllByProps({ "aria-label": "检查圆镜片" }).length,
  0,
);
await click(label("检查卷起的帆布"));
for (const n of ["圆镜片", "软毛刷", "吊钩"]) await click(label("检查" + n));
await close();
await click(btn("导航室"));
await click(label("检查水深记录"));
await click(btn("软毛刷"));
await click(btn("使用选中的道具"));
await close();
await click(label("检查保险柜"));
await act(async () =>
  tree.root.findByType("input").props.onChange({ target: { value: "527" } }),
);
await act(async () =>
  tree.root.findByType("form").props.onSubmit({ preventDefault() {} }),
);
assert.equal(saved().safeOpen, true);
assert.ok(!saved().found.includes("card"));
await click(label("收取保险柜里的信号卡"));
await close();
await click(label("检查投影仪"));
for (const n of ["小电池组", "圆镜片", "信号卡"]) {
  await click(btn(n));
  await click(btn("使用选中的道具"));
}
assert.ok(saved().projectorOn);
await close();
// Revisit search after using battery: no resurrected target.
await click(label("检查航海桌的物件堆"));
for (const n of ["黄铜小钥匙", "小电池组", "曲柄"])
  assert.equal(
    tree.root.findAllByProps({ "aria-label": "检查" + n }).length,
    0,
  );
await close();
await click(btn("一点提示"));
await click(btn("解释规律"));
await click(btn("揭晓答案（含完整解法）"));
const before = storage.get(A.ADVENTURE_KEY);
await mode("challenge");
assert.equal(tree.root.findAllByType("dialog").length, 0);
assert.equal(storage.get(A.ADVENTURE_KEY), before);
assert.equal(
  tree.root.findAllByType("button").filter((n) => nt(n) === "一点提示").length,
  0,
);
await mode("standard");
await click(btn("甲板储物舱"));
await click(label("检查栈桥控制板"));
for (let i = 0; i < 25; i++)
  if (A.ANCHOR[i])
    await click(label(`第${Math.floor(i / 5) + 1}行第${(i % 5) + 1}列，暗格`));
assert.equal(saved().panelOpen, false);
await click(btn("确认整张图"));
await close();
await click(label("检查绞盘与栈桥"));
for (const n of ["曲柄", "吊钩"]) {
  await click(btn(n));
  await click(btn("使用选中的道具"));
}
await click(btn("转动绞盘"));
assert.equal(saved().complete, false);
await click(btn("走向观星甲板 →"));
assert.equal(saved().complete, true);
assert.ok(txt().includes("星光，就在前面。"));
assert.ok(txt().includes("本章已完成"));
const completedExpedition = storage.get(A.ADVENTURE_KEY);
const originalCabin = storage.get(A.SAVE_KEY);
await mode("challenge");
await act(async () => tree.unmount());
await mount();
assert.ok(txt().includes("继续探索：雾灯工坊"), "Old completed save exposes onward chapter immediately");
const completionSection = tree.root.findByProps({className:"adventure-complete"});
const onwardIndex = completionSection.children.findIndex(node => node.type === "button");
const artIndex = completionSection.children.findIndex(node => typeof node.type === "function" && node.type.name === "DeckScene");
assert.ok(onwardIndex >= 0 && artIndex > onwardIndex, "Completion and continuation precede the deck art");
await click(btn("继续探索：雾灯工坊 →"));
assert.equal(tree.root.findByType("select").props.value,"challenge");
assert.ok(txt().includes("归航之光"));
assert.equal(storage.get(A.ADVENTURE_KEY), completedExpedition);
assert.equal(storage.get(A.SAVE_KEY), originalCabin);
await mode("standard");
await click(btn("← 回到观星甲板"));
assert.equal(tree.root.findByType("select").props.value,"standard", "Shared guidance survives chapter return");
assert.equal(storage.get(A.ADVENTURE_KEY), completedExpedition);
assert.equal(storage.get(A.SAVE_KEY), originalCabin);
console.log("Completed expedition save: above-art onward entry, new chapter and return, shared mode and untouched old saves passed.");

await click(btn("随身手记"));
globalThis.__reviewLock = "rest";
await act(async () => tree.update(wrap()));
assert.equal(tree.root.findByType("main").props.inert, true);
assert.equal(tree.root.findAllByType("dialog").length, 0);
globalThis.__reviewLock = null;
await act(async () => tree.update(wrap()));
if (tree.root.findAllByType("dialog").length) await close();
const cabinBefore = storage.get(A.SAVE_KEY);
await click(btn("重新探索"));
await click(btn("确认重新探索后两间房"));
assert.equal(reloads, 0);
assert.deepEqual(saved(), {
  ...A.initialAdventure(),
  started: true,
  room: "navigation",
});
assert.equal(storage.get(A.SAVE_KEY), cabinBefore);
await act(async () => tree.unmount());
console.log(
  "Independent UI: explicit tools, no-loss wrong use, all collectibles, no resurrection, clues, panel, deck, mode state, lock unmount, reset preservation passed.",
);
storage.delete(A.ADVENTURE_KEY);
await mount();
assert.ok(txt().includes("继续探索 · 导航室"));
await click(btn("继续探索 · 导航室 →"));
assert.equal(saved().room, "navigation");
assert.equal(saved().started, true);
assert.equal(storage.get(A.SAVE_KEY), cabinBefore);
await act(async () => tree.unmount());
console.log(
  "Existing completed cabin save bootstraps onward with original save unchanged.",
);
