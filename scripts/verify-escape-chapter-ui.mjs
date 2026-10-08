import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import postcss from "postcss";
const require = createRequire(process.cwd() + "/package.json");
const { build } = require("esbuild");
const React = require("react");
const { create, act } = require("react-test-renderer");
const { renderToStaticMarkup } = require("react-dom/server");
const { MemoryRouter } = require("react-router");
await build({
  stdin: {
    contents: `export {default as Chapter} from './src/escape/chapter/Chapter';export {default as PuzzleView} from './src/escape/chapter/PuzzleView';export * from './src/escape/chapter/content';export * from './src/escape/chapter/engine';export * from './src/escape/chapter/validators';export * from './src/escape/chapter/SceneArt';`,
    resolveDir: process.cwd(),
  },
  outfile: "node_modules/.tmp-chapter-ui.mjs",
  bundle: true,
  platform: "node",
  jsx: "automatic",
  format: "esm",
  packages: "external",
  loader: { ".css": "empty" },
  plugins: [
    {
      name: "health-test-double",
      setup(b) {
        b.onResolve({ filter: /store\/useStore$/ }, () => ({
          path: "store",
          namespace: "test",
        }));
        b.onLoad({ filter: /.*/, namespace: "test" }, () => ({
          contents:
            "export const useStore = selector => selector({lock:globalThis.__chapterLock??null});",
        }));
      },
    },
  ],
});
const A = await import(process.cwd() + "/node_modules/.tmp-chapter-ui.mjs");
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};
let tree;
const text = (node) =>
  typeof node === "string" ? node : (node.children ?? []).map(text).join("");
const json = () => JSON.stringify(tree.toJSON());
const scope = () => tree.root.findAllByType("dialog")[0] ?? tree.root;
const button = (name, where = scope()) => {
  const found = where
    .findAllByType("button")
    .find((node) => text(node) === name);
  assert.ok(found, `Missing button: ${name}`);
  return found;
};
const label = (value) => scope().findByProps({ "aria-label": value });
async function click(node) {
  assert.ok(!node.props.disabled, `Disabled: ${text(node)}`);
  await act(async () => node.props.onClick());
}
const saved = () => A.parseChapter(A.CHAPTER, storage.get(A.CHAPTER_KEY));
const wrap = () =>
  React.createElement(MemoryRouter, null, React.createElement(A.Chapter));
async function mount() {
  await act(async () => {
    tree = create(wrap(), {
      createNodeMock: (e) => (e.type === "dialog" ? { showModal() {} } : null),
    });
  });
}
async function close() {
  await click(label("关闭近景"));
}
async function room(id) {
  if (tree.root.findAllByType("dialog").length) await close();
  const definition = A.CHAPTER.scenes.find((scene) => scene.id === id);
  await click(
    tree.root
      .findAllByType("button")
      .find((node) => text(node).endsWith(definition.title)),
  );
}
async function open(id) {
  const point = A.SCENE_HOTSPOTS[saved().scene].find((p) => p.id === id);
  await click(tree.root.findByProps({ "aria-label": `检查${point.label}` }));
}
async function collect(id) {
  const point = A.SEARCH_HOTSPOTS[saved().scene].find((p) => p.id === id);
  await click(label(`检查${point.label}`));
}
async function select(id) {
  const item = A.CHAPTER.items.find((candidate) => candidate.id === id);
  const bag = scope().findByProps({ "aria-label": "工具袋" });
  await click(
    bag.findAllByType("button").find((node) => text(node).includes(item.name)),
  );
}
async function use(id, itemId) {
  await select(itemId);
  const tool = A.CHAPTER.tools.find((candidate) => candidate.id === id);
  const section = scope().findByProps({ "aria-label": "使用道具的位置" });
  const row = section
    .findAllByType("div")
    .find((node) =>
      node.children.some(
        (child) =>
          typeof child !== "string" &&
          child.type === "span" &&
          text(child) === tool.label,
      ),
    );
  await click(row.findByType("button"));
}
async function code(id, value) {
  const puzzle = A.CHAPTER.puzzles.find((p) => p.id === id);
  await act(async () =>
    label(`${puzzle.title}密码`).props.onChange({ target: { value } }),
  );
}
async function confirm() {
  await click(button("确认整个机关"));
}
async function mode(value) {
  await act(async () =>
    tree.root.findAllByType("select")[0].props.onChange({ target: { value } }),
  );
}
await mount();
assert.ok(json().includes("推开工作舱的门"));
await click(button("推开工作舱的门 →"));
assert.equal(saved().started, true);
assert.equal(tree.root.findAllByProps({ "data-guidance": "rule" }).length, 0);
// Source-backed CSS checks supplement renderer actions; they do not claim browser layout.
const css = postcss.parse(
  readFileSync("src/escape/chapter/chapter.css", "utf8"),
);
const declarations = (selector) => {
  const result = {};
  css.walkRules((rule) => {
    if (rule.selectors.includes(selector))
      rule.walkDecls((d) => {
        result[d.prop] = d.value;
      });
  });
  return result;
};
assert.equal(declarations(".chapter-point")["min-width"], "44px");
assert.equal(declarations(".chapter-point")["min-height"], "44px");
assert.equal(declarations(".chapter-point.unmarked").background, "transparent");
assert.equal(declarations(".chapter-point.unmarked:hover > span").opacity, "0");
assert.equal(
  declarations(".chapter-point.unmarked:focus-visible > span").opacity,
  "1",
);
assert.equal(declarations(".chapter-point > span")["pointer-events"], "none");
for (const value of ["easy", "standard", "challenge"]) {
  await mode(value);
  const points = tree.root
    .findAllByType("button")
    .filter((n) => n.props.className?.includes("chapter-point"));
  assert.equal(points.length, 3);
  assert.ok(
    points.every(
      (n) => n.props["aria-label"] && typeof n.props.onClick === "function",
    ),
  );
  assert.equal(
    points.some((n) => text(n).includes("＋")),
    value !== "challenge",
  );
  await open("search");
  await close();
}
await mode("standard");
await open("pattern-tray");
assert.ok(!json().includes("每次顺时针"));
await click(button("检查保养铭刻"));
assert.ok(json().includes("每次顺时针"));
assert.ok(saved().revealed.includes("pattern-engraving"));
await close();
await click(button("随身手记"));
assert.ok(json().includes("每次顺时针"));
assert.ok(!json().includes("原始抄录"));
await close();
await open("search");
assert.equal(scope().findAllByProps({ "aria-label": "检查软刷" }).length, 0);
await collect("gallery-curtain");
await collect("brush");
await collect("shell-fan");
await collect("arrow-tiles");
await close();
await open("animal-cabinet");
await use("brush-plaque", "arrow-tiles");
assert.equal(saved().usedTools.includes("brush-plaque"), false);
assert.ok(saved().found.includes("arrow-tiles"));
await use("brush-plaque", "brush");
assert.equal(scope().findAllByType("figure").length, 4);
await code("animal-cabinet", "0000");
await confirm();
assert.equal(saved().puzzles["animal-cabinet"].solved, false);
assert.ok(json().includes("机关还没有连通，再看看线索吧。"));
await code("animal-cabinet", "2846");
assert.equal(saved().puzzles["animal-cabinet"].solved, false);
await confirm();
assert.ok(saved().found.includes("lens-frame"));
await room("optics");
await open("search");
await collect("rolled-chart");
await collect("hook");
await collect("cloth");
await room("workshop");
await open("search");
await collect("rope-coil");
await collect("oil-can");
await collect("vane-tiles");
await use("hook-grate", "hook");
await collect("sail-tiles");
assert.equal(saved().puzzles["search-kit"].solved, true);
await click(button("查看检修清单"));
assert.equal(
  scope()
    .findAllByType("button")
    .filter((n) => text(n) === "确认整个机关").length,
  0,
);
await room("gallery");
await open("pattern-tray");
await use("mount-arrow", "arrow-tiles");
await use("mount-sail", "sail-tiles");
await use("mount-vane", "vane-tiles");
const pattern = A.CHAPTER.puzzles.find((p) => p.id === "pattern-tray");
const trayIds = scope()
  .findByProps({ "aria-label": "可用图形" })
  .findAllByType("button")
  .map((n) => text(n));
assert.notDeepEqual(
  trayIds,
  pattern.pieces.map((p) => p.symbol + p.label),
);
async function place(puzzle, pieceId, index) {
  const piece = puzzle.pieces.find((p) => p.id === pieceId);
  const tray = scope().findByProps({ "aria-label": "可用图形" });
  await click(
    tray.findAllByType("button").find((n) => text(n).includes(piece.label)),
  );
  await click(
    scope()
      .findAllByType("button")
      .find((n) =>
        n.props["aria-label"]?.startsWith(`${puzzle.slots[index]}：`),
      ),
  );
}
await place(pattern, pattern.solution[0], 0);
const inputBeforeClose = saved().puzzles[pattern.id].input;
await close();
await open("pattern-tray");
assert.deepEqual(saved().puzzles[pattern.id].input, inputBeforeClose);
await close();
await act(async () => tree.unmount());
await mount();
await open("pattern-tray");
assert.deepEqual(saved().puzzles[pattern.id].input, inputBeforeClose);
await click(button("撤销"));
assert.equal(saved().puzzles[pattern.id].input.slots[0], null);
await click(button("重做"));
assert.equal(saved().puzzles[pattern.id].input.slots[0], pattern.solution[0]);
await place(pattern, pattern.solution[1], 1);
await place(pattern, pattern.solution[0], 1);
assert.deepEqual(saved().puzzles[pattern.id].input.slots.slice(0, 2), [
  pattern.solution[1],
  pattern.solution[0],
]);
const movedPiece = pattern.pieces.find((p) => p.id === pattern.solution[0]);
await click(label(`取回${pattern.slots[1]}的${movedPiece.label}`));
assert.equal(saved().puzzles[pattern.id].input.slots[1], null);
await confirm();
assert.equal(saved().puzzles[pattern.id].solved, false);
assert.ok(json().includes("机关还没有连通，再看看线索吧。"));
await click(button("给我一点方向"));
const kept = saved().puzzles[pattern.id].input;
await mode("challenge");
await open("pattern-tray");
assert.equal(scope().findAllByProps({ "aria-label": "可选提示" }).length, 0);
assert.deepEqual(saved().puzzles[pattern.id].input, kept);
await mode("standard");
await open("pattern-tray");
for (let i = 0; i < 6; i++) await place(pattern, pattern.solution[i], i);
assert.equal(saved().puzzles[pattern.id].solved, false);
await confirm();
await room("optics");
await open("lens-chart");
await use("clean-window", "cloth");
await use("mount-frame", "lens-frame");
await use("mount-filter", "filter-disc");
const lensPuzzle = A.CHAPTER.puzzles.find((p) => p.id === "lens-chart");
for (const lens of lensPuzzle.lenses) {
  await click(button(`${lens.symbol} ${lens.name}`));
  const layers = scope().findAll(
    (node) => node.type === "g" && node.props["data-layer"],
  );
  assert.equal(
    layers.filter((n) => n.props.visibility === "visible").length,
    1,
  );
  assert.equal(
    layers.find((n) => n.props.visibility === "visible").props["data-layer"],
    lens.id,
  );
  assert.ok(saved().puzzles[lensPuzzle.id].seenLenses.includes(lens.id));
}
await code("lens-chart", "375");
await confirm();
await click(button("☀ 日"));
assert.equal(saved().puzzles["lens-chart"].input.lens, "sun");
assert.equal(label("变色放大镜密码").props.disabled, true);
await close();
await click(button("随身手记"));
assert.equal(
  scope()
    .findAllByType("h3")
    .filter((n) => text(n).includes("原始抄录")).length,
  3,
);
await room("workshop");
await open("gravity-lock");
await use("mount-route", "route-plate");
const drop = A.CHAPTER.puzzles.find((p) => p.id === "gravity-lock");
assert.equal(
  scope()
    .findAllByType("span")
    .filter((n) => n.props.className === "occupied").length,
  0,
);
for (let i = 0; i < drop.boards.length; i++) {
  const board = drop.boards[i];
  const result = A.simulateDrops(board.model, [board.placement]);
  const row = Math.max(...result.landed[0].cells.map((c) => c[1])) + 1;
  await act(async () =>
    label(`${board.label}预测行`).props.onChange({
      target: { value: String(row) },
    }),
  );
}
assert.equal(saved().puzzles[drop.id].solved, false);
await confirm();
assert.equal(
  scope()
    .findAllByType("span")
    .filter((n) => n.props.className === "occupied").length,
  12,
);
await room("optics");
await open("tide-sudoku");
await use("wind-tide", "winding-crank");
const sudoku = A.CHAPTER.puzzles.find((p) => p.id === "tide-sudoku");
const solution = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
await click(label("第1行第2列，空"));
await click(button("1", scope().findByProps({ "aria-label": "填写或擦除" })));
await confirm();
assert.equal(saved().puzzles[sudoku.id].solved, false);
assert.ok(json().includes("机关还没有连通，再看看线索吧。"));
await click(button("重置这个机关"));
assert.deepEqual(saved().puzzles[sudoku.id].input.cells, sudoku.givens);
for (let i = 0; i < 16; i++) {
  if (sudoku.givens[i]) continue;
  const row = Math.floor(i / 4) + 1,
    col = (i % 4) + 1;
  await click(label(`第${row}行第${col}列，空`));
  await click(
    button(
      String(solution[i]),
      scope().findByProps({ "aria-label": "填写或擦除" }),
    ),
  );
}
assert.equal(saved().puzzles[sudoku.id].solved, false);
await click(label("第1行第2列，2"));
await click(button("擦除"));
assert.equal(saved().puzzles[sudoku.id].input.cells[1], 0);
await act(async () =>
  label("第1行第2列，空").props.onKeyDown({ key: "2", preventDefault() {} }),
);
await confirm();
await room("workshop");
await open("foglight-console");
await use("oil-track", "oil-can");
await use("mount-prism", "beacon-prism");
const final = A.CHAPTER.puzzles.find((p) => p.id === "foglight-console");
for (let i = 0; i < final.solution.length; i++)
  await place(final, final.solution[i], i);
await confirm();
assert.equal(saved().complete, true);
assert.equal(tree.root.findAllByType("dialog").length, 0);
assert.ok(tree.root.findByProps({ "aria-label": "章节完成" }));
assert.ok(json().includes("向你们挥动一面小旗"));
await click(button("再逛逛这艘船"));
assert.equal(tree.root.findAllByProps({ "aria-label": "章节完成" }).length, 0);
await click(button("随身手记"));
globalThis.__chapterLock = "rest";
await act(async () => tree.update(wrap()));
assert.equal(tree.root.findByType("main").props.inert, true);
assert.equal(tree.root.findAllByType("dialog").length, 0);
globalThis.__chapterLock = null;
await act(async () => tree.update(wrap()));
if (tree.root.findAllByType("dialog").length) await close();
const oldKey = "play-buddy:escape:legacy-test";
storage.set(oldKey, "untouched");
await click(button("重玩这一章"));
await click(button("确认重玩这一章"));
assert.equal(saved().complete, false);
assert.equal(saved().found.length, 0);
assert.equal(storage.get(oldKey), "untouched");
await act(async () => tree.unmount());
// Preserve future save until explicit, scoped reset consent.
const future = JSON.stringify({
  version: 999,
  chapter: A.CHAPTER.id,
  revision: 999,
  state: {},
});
storage.set(A.CHAPTER_KEY, future);
await mount();
assert.equal(storage.get(A.CHAPTER_KEY), future);
assert.ok(json().includes("这份进度来自更新的版本"));
assert.equal(button("推开工作舱的门 →").props.disabled, true);
await click(button("选择重玩这一章"));
await click(button("继续这次探险"));
assert.equal(storage.get(A.CHAPTER_KEY), future);
await click(button("选择重玩这一章"));
await click(button("确认重玩这一章"));
assert.equal(saved().started, true);
assert.notEqual(storage.get(A.CHAPTER_KEY), future);
await act(async () => tree.unmount());
let parentMode = "standard",
  returned = false;
function ControlledHost() {
  const [value, setValue] = React.useState("standard");
  return React.createElement(A.Chapter, {
    mode: value,
    onModeChange(next) {
      parentMode = next;
      setValue(next);
    },
    onBack() {
      returned = true;
    },
  });
}
await act(async () => {
  tree = create(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(ControlledHost),
    ),
  );
});
await mode("challenge");
assert.equal(parentMode, "challenge");
assert.equal(tree.root.findAllByType("select")[0].props.value, "challenge");
await click(button("← 回到观星甲板"));
assert.equal(returned, true);
await act(async () => tree.unmount());
// Actual SSR render contains all graphical board cells, never correctness-per-cell classes.
for (const puzzle of A.CHAPTER.puzzles) {
  const state = A.initialChapter(A.CHAPTER);
  const markup = renderToStaticMarkup(
    React.createElement(A.PuzzleView, {
      puzzle,
      progress: state.puzzles[puzzle.id],
      mode: "standard",
      onAction() {},
    }),
  );
  assert.ok(!markup.includes('data-guidance="rule"'));
  assert.ok(!/class="[^\"]*(?:correct|incorrect)/.test(markup));
}
console.log(
  "Chapter UI actions passed: three modes, hidden finds, no-loss tools, source journal, seven mechanisms, real SVG lens layers, exact gravity, reversible arrangement/Sudoku, completion, health lock, replay, future-save protection and SSR/CSS contracts.",
);
