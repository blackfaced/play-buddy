import assert from "node:assert/strict";
import { deriveLinkedAnswers, deriveDropAnswers } from "./verify-escape-chapter-reasoning.mjs";
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
    contents: `export {default as Chapter} from './src/escape/chapter/Chapter';export {default as PuzzleView} from './src/escape/chapter/PuzzleView';export * from './src/escape/chapter/content';export * from './src/escape/chapter/engine';export * from './src/escape/chapter/validators';export * from './src/escape/chapter/SceneArt';export * from './src/escape/chapter/lens';export {MODE_KEY} from './src/escape/guidancePolicy';`,
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
const linked = deriveLinkedAnswers(A.CHAPTER);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storage = new Map();
const storageWrites = [];
let storageFailureKey = null;
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => {
    storageWrites.push(key);
    if (key === storageFailureKey) throw new Error("Test storage quota failure");
    storage.set(key, value);
  },
};
let tree;
let modalShows = 0;
const focusCalls = [];
const text = (node) =>
  typeof node === "string" ? node : (node.children ?? []).map(text).join("");
const json = () => JSON.stringify(tree.toJSON());
const scope = () => tree.root.findAllByType("dialog")[0] ?? tree.root;
const hosts = (where, props) =>
  where.findAll(
    (node) =>
      typeof node.type === "string" &&
      Object.entries(props).every(([key, value]) => node.props[key] === value),
  );
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
      createNodeMock: (e) =>
        e.type === "dialog"
          ? { showModal() { modalShows++; } }
          : e.type === "button"
            ? { focus() { focusCalls.push(e.props); } }
            : null,
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
  assertTargets(id, tree.root.findAllByType("select")[0].props.value);
}
async function collect(id) {
  const point = A.SEARCH_HOTSPOTS[saved().scene].find((p) => p.id === id);
  await click(label(`检查${point.label}`));
}
function bagToggle() {
  const toggles = scope().findAllByType("button").filter(
    (node) =>
      text(node).includes("工具袋") &&
      typeof node.props["aria-expanded"] === "boolean",
  );
  assert.equal(toggles.length, 1, "Each closeup has one compact bag toggle");
  return toggles[0];
}
async function inventory() {
  if (tree.root.findAllByType("dialog").length && !bagToggle().props["aria-expanded"])
    await click(bagToggle());
  const bags = hosts(tree.root, { "aria-label": "工具袋" });
  assert.equal(bags.length, 1, "Only one inventory may be rendered globally");
  assert.equal(hosts(scope(), { "aria-label": "工具袋" }).length, 1);
  if (tree.root.findAllByType("dialog").length) {
    const controlled = bagToggle().props["aria-controls"];
    assert.ok(controlled, "The bag toggle identifies its expanded drawer");
    assert.equal(hosts(tree.root, { id: controlled }).length, 1);
  }
  return bags[0];
}
async function select(id) {
  const item = A.CHAPTER.items.find((candidate) => candidate.id === id);
  const bag = await inventory();
  const itemButton = bag.findAllByType("button").find((node) => text(node).includes(item.name));
  assert.ok(itemButton, `Missing inventory item: ${id}`);
  if (!itemButton.props["aria-pressed"]) {
    const previousFocusCalls = focusCalls.length;
    await click(itemButton);
    if (tree.root.findAllByType("dialog").length) {
      assert.equal(focusCalls.length, previousFocusCalls + 1, "Selection restores focus before hiding the inventory");
      assert.equal(focusCalls.at(-1)["aria-controls"], bagToggle().props["aria-controls"]);
    }
  }
  else if (tree.root.findAllByType("dialog").length) await click(bagToggle());
  if (tree.root.findAllByType("dialog").length) {
    assert.equal(bagToggle().props["aria-expanded"], false, "Selecting an item closes the drawer");
    assert.equal(hosts(tree.root, { "aria-label": "工具袋" }).length, 0);
  }
}
async function assertSelected(id) {
  const bag = await inventory();
  const item = A.CHAPTER.items.find((candidate) => candidate.id === id);
  const pressed = bag.findAllByType("button").filter((node) => node.props["aria-pressed"]);
  assert.equal(pressed.length, 1, "Only one shared item selection exists");
  assert.ok(text(pressed[0]).includes(item.name), `Selection must remain ${id}`);
  if (tree.root.findAllByType("dialog").length) await click(bagToggle());
}
function target(id) {
  const tool = A.CHAPTER.tools.find((candidate) => candidate.id === id);
  const matches = hosts(scope(), { "data-tool-target": id });
  assert.equal(matches.length, 1, `One physical target for ${id}`);
  const node = matches[0];
  assert.equal(node.type, "button");
  assert.equal(node.props["aria-label"], `检查${tool.target.label}`);
  assert.ok(!node.props.disabled, `${id} remains inspectable before and after use`);
  return node;
}
async function use(id, itemId) {
  await select(itemId);
  await click(target(id));
  assertTargets(
    A.CHAPTER.tools.find((candidate) => candidate.id === id).target.closeup,
    tree.root.findAllByType("select")[0].props.value,
  );
  assert.equal(hosts(tree.root, { "aria-label": "工具袋" }).length, 0);
  const tool = A.CHAPTER.tools.find((candidate) => candidate.id === id);
  if (tool.item === itemId && saved().usedTools.includes(id)) {
    const bag = await inventory();
    const item = A.CHAPTER.items.find((candidate) => candidate.id === itemId);
    const row = bag.findAllByType("button").find((node) => text(node).includes(item.name));
    if (tool.installsItem) {
      assert.equal(row.props.disabled, true, `${itemId} stays recorded but cannot be selected after installation`);
      assert.ok(text(row).includes("已装配"));
      assert.equal(row.props["aria-pressed"], false);
      assert.equal(bag.findAllByType("button").filter((node) => node.props["aria-pressed"]).length, 0);
    } else {
      assert.ok(!row.props.disabled, `${itemId} is reusable after use`);
      assert.equal(row.props["aria-pressed"], true);
      assert.ok(!text(row).includes("已装配"));
    }
    await click(bagToggle());
  }
}
function assertDialogStructure() {
  assert.equal(tree.root.findAllByType("dialog").length, 1);
  const dialog = scope();
  assert.ok(modalShows > 0, "The native dialog is opened modally");
  assert.equal(dialog.findAllByProps({ id: dialog.props["aria-labelledby"] }).length, 1);
  assert.equal(label("关闭近景").props.autoFocus, true);
  assert.equal(typeof dialog.props.onCancel, "function");
  assert.equal(typeof dialog.props.onClick, "function");
  const toggle = bagToggle();
  assert.equal(toggle.props["aria-expanded"], false);
  assert.equal(hosts(tree.root, { "aria-label": "工具袋" }).length, 0);
  const globalToggles = tree.root.findAllByType("button").filter(
    (node) => text(node).includes("工具袋") && typeof node.props["aria-expanded"] === "boolean",
  );
  assert.equal(globalToggles.length, 1, "No duplicate bag behind the modal");
  assert.equal(hosts(tree.root, { "aria-label": "使用道具的位置" }).length, 0);
}
function assertTargets(closeup, guidance) {
  const puzzle = A.CHAPTER.puzzles.find(candidate => candidate.id === closeup);
  const ready = puzzle && puzzle.kind !== "search" && A.puzzleAvailable(A.CHAPTER, saved(), puzzle);
  const tools = A.CHAPTER.tools.filter(
    (tool) => tool.scene === saved().scene && tool.target.closeup === closeup,
  );
  if (ready) {
    assert.ok(tools.every(tool => saved().usedTools.includes(tool.id)), "No unfinished setup target is hidden when the real puzzle opens");
    assert.equal(hosts(scope(), { "data-device": puzzle.id }).length, 0, "Ready and solved puzzles never repeat a generic device diagram");
    assert.equal(scope().findAllByType("details").length, 0, "No duplicate installation disclosure remains");
    assert.equal(scope().findAllByType("fieldset").length, 1, "The actual puzzle remains visible on reopen");
  }
  const expected = ready ? [] : tools;
  const actual = scope().findAllByType("button").filter((node) => node.props["data-tool-target"]);
  assert.deepEqual(
    actual.map((node) => node.props["data-tool-target"]).sort(),
    expected.map((tool) => tool.id).sort(),
    `${saved().scene}/${closeup} exposes only its own device targets in ${guidance}`,
  );
  assert.equal(
    tree.root.findAllByType("button").filter((node) => node.props["data-tool-target"]).length,
    actual.length,
    "No duplicate physical controls remain behind the current dialog",
  );
  for (const tool of expected) {
    const node = target(tool.id);
    assert.equal(typeof node.props.onClick, "function");
    assert.notEqual(node.props.tabIndex, -1, "Physical targets stay keyboard reachable");
    assert.equal(node.props.className?.includes("unmarked"), guidance === "challenge");
    assert.equal(text(node).includes("＋"), guidance !== "challenge");
    for (const [property, field] of [["left", "x"], ["top", "y"], ["width", "width"], ["height", "height"]])
      assert.equal(node.props.style[property], `${tool.target[field]}%`);
  }
}
async function code(id, value) {
  const puzzle = A.CHAPTER.puzzles.find((p) => p.id === id);
  await act(async () =>
    label(`${puzzle.title}密码`).props.onChange({ target: { value } }),
  );
}
async function confirm() {
  await click(button("确认整个机关"));
  if (tree.root.findAllByType("dialog").length) {
    assert.equal(scope().findAllByProps({ className: "chapter-device" }).length, 0, "Confirmation never brings back a generic device diagram");
    assert.equal(scope().findAllByType("details").length, 0, "Solved and wrong-answer boards remain the only device");
  }
}
async function mode(value) {
  await act(async () =>
    tree.root.findAllByType("select")[0].props.onChange({ target: { value } }),
  );
}
// No solution coaching in automatic copy or accessibility text. Physical data and
// operational rules remain available in every mode, even with saved hint history.
const coaching = ["只数足", "翅膀和触角不算", "观察足的数量", "每次顺时针", "（循环）", "藏着不同图层", "仍可回到观测窗查看", "同排点数相同，同列方向相同", "接好航路短图", "潮汐板同一位置的数字"];
for (const puzzle of A.CHAPTER.puzzles.filter(p => p.kind !== "search")) {
  for (const value of ["standard", "challenge", "easy"]) {
    for (const hintCount of [0, puzzle.hints.length]) {
      const progress = { ...A.initialChapter(A.CHAPTER).puzzles[puzzle.id], hints: hintCount };
      const markup = renderToStaticMarkup(React.createElement(A.PuzzleView, {
        puzzle, progress, mode: value, onAction() {},
      }));
      if (value === "challenge" || (value === "standard" && hintCount === 0)) {
        for (const phrase of coaching) assert.ok(!markup.includes(phrase), `${puzzle.id}/${value}: unsolicited coaching: ${phrase}`);
        assert.ok(!markup.includes(puzzle.easyHelp));
      }
      if (value === "challenge") {
        assert.ok(!markup.includes("可选提示"));
        for (const hint of puzzle.hints) assert.ok(!markup.includes(hint));
      }
      if (value === "easy") assert.ok(markup.includes(puzzle.easyHelp));
      if (value === "standard" && hintCount > 0)
        for (const hint of puzzle.hints) assert.ok(markup.includes(hint));
      if (puzzle.kind === "code" && puzzle.animals) {
        for (const animal of puzzle.animals) {
          assert.ok(markup.includes(`${animal.name}标本`));
          assert.ok(markup.includes(`${animal.legs}条腿`), "Accessible physical description retains the visible limbs");
        }
        assert.ok(markup.includes("鸟 → 蜘蛛 → 龟 → 蚂蚁"));
      }
      if (puzzle.kind === "drop") {
        assert.ok(markup.includes("不转向、不横移、不消行"));
        assert.ok(markup.includes("会拼成哪个数字"));
        assert.ok(!markup.includes("预测行"));
        assert.ok(!markup.includes("最低格"));
      }
      if (puzzle.kind === "sudoku") assert.ok(markup.includes("每一行、每一列、每一个粗框小宫"));
    }
  }
}
await mount();
assert.ok(json().includes("推开工作舱的门"));
await click(button("推开工作舱的门 →"));
assert.equal(saved().started, true);
assert.equal(tree.root.findAllByProps({ "data-guidance": "rule" }).length, 0);
await open("animal-cabinet");
assert.equal(
  tree.root.findAllByProps({ "aria-label": "工具袋" }).length,
  0,
  "A closed compact bag must not leave a second inventory outside the dialog",
);
assert.equal(
  scope().findAllByProps({ "data-tool-target": "brush-plaque" }).length,
  1,
  "The cabinet must expose its own painted plaque as an inspectable tool target",
);
await close();
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
const closeupByTool = {
  "brush-plaque": "animal-cabinet",
  "hook-grate": "search",
  "mount-arrow": "pattern-tray",
  "mount-sail": "pattern-tray",
  "mount-vane": "pattern-tray",
  "clean-window": "lens-chart",
  "mount-frame": "lens-chart",
  "mount-filter": "lens-chart",
  "mount-route": "gravity-lock",
  "wind-tide": "tide-sudoku",
  "oil-track": "foglight-console",
  "mount-prism": "foglight-console",
};
const installedParts = new Set([
  "mount-arrow", "mount-sail", "mount-vane", "mount-frame",
  "mount-filter", "mount-route", "wind-tide", "mount-prism",
]);
assert.equal(A.CHAPTER.tools.length, Object.keys(closeupByTool).length);
for (const tool of A.CHAPTER.tools) {
  assert.equal(Boolean(tool.installsItem), installedParts.has(tool.id), `${tool.id} has the correct installed/reusable lifecycle`);
  assert.equal(tool.target.closeup, closeupByTool[tool.id], `Explicit device ownership for ${tool.id}`);
  assert.ok(tool.target.label.trim());
  assert.ok(tool.target.description.trim());
  for (const field of ["x", "y", "width", "height"])
    assert.ok(Number.isFinite(tool.target[field]), `${tool.id} has physical ${field}`);
  assert.ok(tool.target.x >= 0 && tool.target.y >= 0);
  assert.ok(tool.target.width > 0 && tool.target.height > 0);
  assert.ok(tool.target.x + tool.target.width <= 100);
  assert.ok(tool.target.y + tool.target.height <= 100);
}
const hookTool = A.CHAPTER.tools.find((tool) => tool.id === "hook-grate");
const grate = A.SEARCH_HOTSPOTS.workshop.find((point) => point.id === hookTool.id);
for (const field of ["x", "y", "width", "height"])
  assert.equal(hookTool.target[field], grate[field], `The hook uses the painted search grate's ${field}`);
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
  assert.equal(json().includes("翻开遮挡的旧物"), value === "easy", "Search coaching is easy-only");
  await close();
  assert.equal(json().includes("摸摸旧船具"), value === "easy", "Empty inventory coaching is easy-only");
  // Every physical target is local to this exact closeup, in every guidance mode.
  // Inspecting unavailable equipment must still respond, without silently using anything.
  for (const scene of A.CHAPTER.scenes) {
    await room(scene.id);
    for (const point of A.SCENE_HOTSPOTS[scene.id]) {
      await open(point.id);
      assertDialogStructure();
      assertTargets(point.id, value);
      const puzzle = A.CHAPTER.puzzles.find((candidate) => candidate.id === point.id);
      if (puzzle && !A.puzzleAvailable(A.CHAPTER, saved(), puzzle)) {
        const device = hosts(scope(), { "data-device": puzzle.id });
        assert.equal(device.length, 1, `Locked ${puzzle.id} keeps its illustrated device`);
        assert.ok(device[0].findAllByType("svg").length > 0);
      }
      const targets = A.CHAPTER.tools.filter(
        (tool) => tool.scene === scene.id && tool.target.closeup === point.id,
      );
      for (const tool of targets) {
        const before = saved();
        await click(target(tool.id));
        assert.deepEqual(saved(), before, `Inspection cannot use unselected ${tool.id}`);
        assert.ok(
          hosts(scope(), { role: "status" }).some((node) => text(node).trim()),
          `${tool.id} inspection gives feedback inside the modal even with unmet prerequisites`,
        );
        assertTargets(point.id, value);
      }
      if (point.id === "search") {
        await click(button("查看检修清单"));
        assertDialogStructure();
        assertTargets("search-kit", value);
      }
      await close();
      assert.equal(hosts(tree.root, { "aria-label": "工具袋" }).length, 1);
    }
  }
  await room("gallery");
  // Exercise actual item selection and application in all three modes, not only static controls.
  await open("search");
  await collect("gallery-curtain");
  await collect("brush");
  await collect("shell-fan");
  await collect("arrow-tiles");
  await close();
  await open("animal-cabinet");
  const owned = saved();
  await click(target("brush-plaque"));
  assert.deepEqual(saved(), owned, `${value}: ownership cannot automatically use the brush`);
  await use("brush-plaque", "arrow-tiles");
  assert.deepEqual(saved(), owned, `${value}: a wrong tool changes no progress and consumes no item`);
  await assertSelected("arrow-tiles");
  await close();
  await open("pattern-tray");
  await assertSelected("arrow-tiles");
  await close();
  await open("animal-cabinet");
  await use("brush-plaque", "brush");
  assert.ok(saved().usedTools.includes("brush-plaque"));
  const used = saved();
  assertTargets("animal-cabinet", value);
  assert.deepEqual(saved(), used, `${value}: showing the actual board preserves used tools`);
  await close();
  await click(button("重玩这一章"));
  await click(button("确认重玩这一章"));
  assert.equal(saved().found.length, 0);
  assert.equal(saved().usedTools.length, 0);
}
await mode("standard");
await open("pattern-tray");
assert.ok(!json().includes("每次顺时针"));
await click(button("检查保养铭刻"));
assert.ok(!json().includes("每次顺时针"));
assert.ok(json().includes("左上角一道斜切口，右下角两颗并排铜铆钉"));
assert.ok(saved().revealed.includes("pattern-engraving"));
await close();
await click(button("随身手记"));
assert.ok(!json().includes("每次顺时针"));
assert.ok(json().includes("左上角一道斜切口，右下角两颗并排铜铆钉"));
assert.ok(!json().includes("原始抄录"));
await close();
for (const value of ["easy", "challenge", "standard"]) {
  const before = saved();
  await mode(value);
  await click(button("随身手记"));
  assert.deepEqual(saved(), before, "Mode changes preserve revealed clues and progress");
  assert.ok(json().includes("左上角一道斜切口，右下角两颗并排铜铆钉"));
  for (const phrase of coaching) assert.ok(!json().includes(phrase), `Journal remains raw physical evidence in ${value}`);
  await close();
}

await open("search");
assert.equal(scope().findAllByProps({ "aria-label": "检查软刷" }).length, 0);
await collect("gallery-curtain");
await collect("brush");
await collect("shell-fan");
await collect("arrow-tiles");
assert.deepEqual(saved().usedTools, [], "Picking up a matching item never applies it automatically");
await close();
await open("animal-cabinet");
const beforeOwnedInspection = saved();
await click(target("brush-plaque"));
assert.deepEqual(saved(), beforeOwnedInspection, "Owning the brush does not auto-select or auto-use it");
assert.ok(hosts(scope(), { role: "status" }).some((node) => text(node).trim()));
await use("brush-plaque", "arrow-tiles");
assert.deepEqual(saved(), beforeOwnedInspection, "Wrong-tool feedback must not alter chapter progress");
assert.equal(saved().usedTools.includes("brush-plaque"), false);
assert.ok(saved().found.includes("arrow-tiles"));
await assertSelected("arrow-tiles");
// Cancel is the native Escape-key path; preserve one shared selection through it.
let cancelPrevented = false;
await act(async () => scope().props.onCancel({ preventDefault() { cancelPrevented = true; } }));
assert.equal(cancelPrevented, true);
assert.equal(tree.root.findAllByType("dialog").length, 0);
await assertSelected("arrow-tiles");
await open("pattern-tray");
await assertSelected("arrow-tiles");
await close();
await open("animal-cabinet");
await assertSelected("arrow-tiles");
await use("brush-plaque", "brush");
const afterBrushing = saved();
assertTargets("animal-cabinet", "standard");
assert.deepEqual(saved(), afterBrushing, "Switching to the actual board preserves installation progress");
assert.equal(scope().findAllByType("figure").length, 4);
assert.ok(!json().includes("只数足"));
await click(button("给我一点方向"));
assert.ok(!json().includes("只数足"));
await click(button("再看一步提示"));
assert.ok(json().includes("只数足"), "Standard only reveals the counting method after requested hints");
const beforeGuidanceSwitch = saved();
for (const value of ["easy", "challenge"]) {
  await mode(value);
  await open("animal-cabinet");
  assert.deepEqual(saved(), beforeGuidanceSwitch, "Switching guidance preserves input, inventory, reveals and hint history");
  assert.equal(json().includes("只数足"), value === "easy");
  assert.ok(json().includes("鸟 → 蜘蛛 → 龟 → 蚂蚁"));
  assert.equal(scope().findAllByType("figure").length, 4);
}
await close();
await act(async () => tree.unmount());
await mount();
await open("animal-cabinet");
assert.equal(tree.root.findAllByType("select")[0].props.value, "challenge");
assert.ok(!json().includes("只数足"), "Reloading a challenge save cannot reveal prior standard hints");
assert.deepEqual(saved(), beforeGuidanceSwitch);
await mode("standard");
await open("animal-cabinet");

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
await close();
await open("lens-chart");
const beforeFrame = saved();
await use("mount-frame", "lens-frame");
assert.deepEqual(saved(), beforeFrame, "An owned frame cannot bypass the dirty-window prerequisite");
assert.ok(hosts(scope(), { role: "status" }).some((node) => text(node).trim()));
await assertSelected("lens-frame");
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
  pattern.pieces.map((p) => p.label),
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
await place(pattern, linked.pattern[0], 0);
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
assert.equal(saved().puzzles[pattern.id].input.slots[0], linked.pattern[0]);
await place(pattern, linked.pattern[1], 1);
await place(pattern, linked.pattern[0], 1);
assert.deepEqual(saved().puzzles[pattern.id].input.slots.slice(0, 2), [
  linked.pattern[1],
  linked.pattern[0],
]);
const movedPiece = pattern.pieces.find((p) => p.id === linked.pattern[0]);
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
for (let i = 0; i < 6; i++) await place(pattern, linked.pattern[i], i);
assert.equal(saved().puzzles[pattern.id].solved, false);
await confirm();
await room("optics");
await open("lens-chart");
const beforeFilter = saved();
await use("mount-filter", "filter-disc");
assert.deepEqual(saved(), beforeFilter, "The owned filter cannot bypass the unmounted-frame prerequisite");
assert.ok(hosts(scope(), { role: "status" }).some((node) => text(node).trim()));
await assertSelected("filter-disc");
await use("clean-window", "cloth");
await use("mount-frame", "lens-frame");
await use("mount-filter", "filter-disc");
const lensPuzzle = A.CHAPTER.puzzles.find((p) => p.id === "lens-chart");
await click(button("拿起放大镜"));
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
  assert.ok(!saved().puzzles[lensPuzzle.id].seenLenses.includes(lens.id), "Color alone reveals nothing");
  for (const clue of A.lensClues(lensPuzzle).filter(c=>c.lens===lens.id)) {
    const canvas = label("雾港检修图：可移动放大镜");
    const event = {clientX:clue.x,clientY:clue.y,pointerId:1,button:0,preventDefault(){},currentTarget:{getBoundingClientRect:()=>({left:0,top:0,width:720,height:420}),setPointerCapture(){},focus(){},hasPointerCapture:()=>false}};
    await act(async()=>canvas.props.onPointerDown(event));
    await act(async()=>label("雾港检修图：可移动放大镜").props.onPointerUp(event));
  }
  assert.ok(saved().puzzles[lensPuzzle.id].seenLenses.includes(lens.id));
}
// Dragging the physical rim preserves grab offset; cancellation ends movement.
const mapLabel = "雾港检修图：可移动放大镜";
const pointerTarget = {getBoundingClientRect:()=>({left:10,top:20,width:360,height:210}),setPointerCapture(){},focus(){},hasPointerCapture:()=>false};
const pointEvent = (x,y) => ({clientX:10+x/2,clientY:20+y/2,pointerId:8,button:0,preventDefault(){},currentTarget:pointerTarget});
const beforeDrag = saved().puzzles[lensPuzzle.id].input.position;
await act(async()=>label(mapLabel).props.onPointerDown(pointEvent(beforeDrag.x+10,beforeDrag.y)));
await act(async()=>label(mapLabel).props.onPointerMove(pointEvent(beforeDrag.x+30,beforeDrag.y+20)));
assert.deepEqual(saved().puzzles[lensPuzzle.id].input.position,{x:beforeDrag.x+20,y:beforeDrag.y+20});
await act(async()=>label(mapLabel).props.onPointerCancel());
const canceledPosition = saved().puzzles[lensPuzzle.id].input.position;
await act(async()=>label(mapLabel).props.onPointerMove(pointEvent(100,100)));
assert.deepEqual(saved().puzzles[lensPuzzle.id].input.position,canceledPosition);
await act(async()=>label(mapLabel).props.onKeyDown({key:"ArrowRight",preventDefault(){}}));
assert.equal(saved().puzzles[lensPuzzle.id].input.position.x,canceledPosition.x+12);
const reopenedPosition = saved().puzzles[lensPuzzle.id].input.position;
await close(); await open(lensPuzzle.id);
assert.deepEqual(saved().puzzles[lensPuzzle.id].input.position,reopenedPosition,"Reopen retains lens position");
const beforeLock = saved();
globalThis.__chapterLock = "rest";
await act(async()=>tree.update(wrap()));
assert.equal(tree.root.findAllByProps({"aria-label":mapLabel}).length,0,"Health lock unmounts captured lens");
globalThis.__chapterLock = null;
await act(async()=>tree.update(wrap()));
assert.deepEqual(saved(),beforeLock,"Health interruption never changes clues or answers");
if (!tree.root.findAllByProps({"aria-label":mapLabel}).length) await open(lensPuzzle.id);
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
  6,
);
await room("workshop");
await open("gravity-lock");
await use("mount-route", "route-plate");
const drop = A.CHAPTER.puzzles.find((p) => p.id === "gravity-lock");
const dropAnswers = deriveDropAnswers(drop);
assert.equal(
  scope()
    .findAllByType("rect")
    .filter((n) => n.props["data-settled-cell"]).length,
  0,
);
assert.equal(scope().findAllByType("g").filter(node => node.props["data-hanging-piece"]).length,
  drop.boards.reduce((total, board) => total + board.placements.length, 0),
  "All queued tetrominoes are visible before mental simulation");
assert.deepEqual(saved().puzzles[drop.id].input.predictions, [-1, -1, -1]);
await click(label(`${drop.boards[0].label}数字减一`));
assert.equal(label(`${drop.boards[0].label}最终数字`).props.value, "9");
await click(label(`${drop.boards[0].label}数字加一`));
assert.equal(label(`${drop.boards[0].label}最终数字`).props.value, "0", "Dial wraps to an intentional zero");
await act(async () => label(`${drop.boards[0].label}最终数字`).props.onChange({ target: { value: "" } }));
assert.equal(saved().puzzles[drop.id].input.predictions[0], -1, "Erasing zero restores unset rather than another guess");
for (let i = 0; i < drop.boards.length; i++) {
  const board = drop.boards[i];
  const digit = dropAnswers.predictions[i];
  await act(async () =>
    label(`${board.label}最终数字`).props.onChange({
      target: { value: String(digit) },
    }),
  );
}
assert.equal(saved().puzzles[drop.id].solved, false);
assert.equal(scope().findAllByType("rect").filter(node => node.props["data-settled-cell"]).length, 0,
  "Even a complete correct draft cannot reveal the fallen outlines before confirmation");
const lastDrop = drop.boards.at(-1);
await act(async () => label(`${lastDrop.label}最终数字`).props.onChange({ target: { value: String((dropAnswers.predictions.at(-1) + 1) % 10) } }));
await confirm();
assert.equal(saved().puzzles[drop.id].solved, false);
assert.equal(scope().findAllByType("rect").filter(node => node.props["data-settled-cell"]).length, 0,
  "A wrong whole prediction never reveals which numeral was wrong");
await act(async () => label(`${lastDrop.label}最终数字`).props.onChange({ target: { value: String(dropAnswers.predictions.at(-1)) } }));
await confirm();
assert.equal(
  scope()
    .findAllByType("rect")
    .filter((n) => n.props["data-settled-cell"]).length,
  dropAnswers.boards.flatMap(board => board.landed.flatMap(piece => piece.cells)).length,
);
await room("optics");
await open("tide-sudoku");
await use("wind-tide", "winding-crank");
const sudoku = A.CHAPTER.puzzles.find((p) => p.id === "tide-sudoku");
const solution = linked.sudoku;
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
const beforePrism = saved();
await use("mount-prism", "beacon-prism");
assert.deepEqual(saved(), beforePrism, "The owned prism cannot bypass the unlubricated track");
assert.ok(hosts(scope(), { role: "status" }).some((node) => text(node).trim()));
await assertSelected("beacon-prism");
await use("oil-track", "oil-can");
await use("mount-prism", "beacon-prism");
const final = A.CHAPTER.puzzles.find((p) => p.id === "foglight-console");
assert.equal(final.kind, "code");
assert.equal(scope().findAllByProps({ "aria-label": "可用图形" }).length, 0, "The last lock no longer offers an emblem ordering tray");
assert.ok(!json().includes(linked.code), "The unfilled lock never exposes its joined answer");
const beforeRevisit = saved();
await room("gallery");
await open(pattern.id);
assert.equal(scope().findByType("fieldset").props.disabled, true, "Solved classification remains visible and immutable");
const renderedGrid = scope().findByProps({ className: "chapter-pattern-grid" });
assert.equal(renderedGrid.children.length, 16, "All sixteen classification positions remain visible on revisit");
const emblemNames = Object.fromEntries(pattern.pieces.map(piece => [piece.stamp.emblem, piece.label.replace("徽纹片", "")]));
const positionsFromRevisitedGrid = linked.route.map(emblem => {
  const matches = renderedGrid.children.map((cell, index) => ({ cell, index })).filter(({ cell }) =>
    cell.findAllByType("svg").some(svg => svg.props["aria-label"]?.includes(`角落有${emblemNames[emblem]}徽记`)));
  assert.equal(matches.length, 1, `Solved board visibly locates the ${emblem} route emblem once`);
  return matches[0].index;
});
assert.deepEqual(positionsFromRevisitedGrid, linked.lookups.map(lookup => lookup.index));
await room("optics");
await open(sudoku.id);
assert.equal(scope().findByType("fieldset").props.disabled, true, "Solved Sudoku remains available to read");
const numberCells = scope().findByProps({ "aria-label": "四乘四数独" }).findAllByType("button");
assert.equal(numberCells.length, 16);
assert.deepEqual(numberCells.map(cell => Number(text(cell))), linked.sudoku, "Every solved numeric cell is preserved and visible");
const revisitedCode = positionsFromRevisitedGrid.map(index => text(numberCells[index])).join("");
assert.equal(revisitedCode, linked.code, "The entered final answer is read from both reopened boards in the independently stitched route order");
assert.deepEqual(saved().puzzles, beforeRevisit.puzzles, "Revisiting sources changes no solved answers or progress");
await room("workshop");
await open(final.id);
assert.equal(label(`${final.title}密码`).props.maxLength, 6);
await code(final.id, linked.code.split("").reverse().join(""));
await confirm();
assert.equal(saved().complete, false, "A wrong joined code cannot finish the chapter");
await code(final.id, revisitedCode);
await confirm();
assert.equal(saved().complete, true);
assert.equal(tree.root.findAllByType("dialog").length, 0);
assert.ok(tree.root.findByProps({ "aria-label": "章节完成" }));
assert.ok(json().includes("向你们挥动一面小旗"));
await click(button("再逛逛这艘船"));
assert.equal(tree.root.findAllByProps({ "aria-label": "章节完成" }).length, 0);
// All solved mechanisms remain the actual, immutable board on revisit in every mode.
const completedPuzzles = saved().puzzles;
for (const value of ["standard", "challenge", "easy"]) {
  await mode(value);
  for (const puzzle of A.CHAPTER.puzzles.filter(p => p.kind !== "search")) {
    await room(puzzle.scene);
    await open(puzzle.id);
    assertTargets(puzzle.id, value);
    assert.equal(scope().findByType("fieldset").props.disabled, puzzle.kind !== "filter", "Solved lens stays movable for reading; other solved boards are immutable");
    assert.deepEqual(saved().puzzles, completedPuzzles, "Revisits preserve the actual solved answers");
    await close();
  }
}
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
// Chapter storage failure must be visible on the active surface and must never
// discard the current session while allowing unrelated preferences to persist.
storage.delete(A.CHAPTER_KEY);
storageFailureKey = A.CHAPTER_KEY;
await mount();
assert.ok(json().includes("本次更改暂未保存"));
await click(button("推开工作舱的门 →"));
assert.equal(storage.has(A.CHAPTER_KEY), false);
await open("search");
await collect("gallery-curtain");
await collect("brush");
assert.ok(text(scope()).includes("本次更改暂未保存"), "The modal itself announces failed saves");
assert.ok(!json().includes("进度已保存在本机"), "No success claim can coexist with a failed chapter write");
await click(button("重试保存"));
assert.ok(text(scope()).includes("本次更改暂未保存"), "An unsuccessful retry must not clear the warning");
assert.equal(storage.has(A.CHAPTER_KEY), false);
await collect("shell-fan");
await collect("arrow-tiles");
const inMemoryBag = await inventory();
assert.ok(text(inMemoryBag).includes(A.CHAPTER.items.find(item => item.id === "brush").name));
assert.ok(text(inMemoryBag).includes(A.CHAPTER.items.find(item => item.id === "arrow-tiles").name), "Further discoveries remain editable in memory during failure");
await click(bagToggle());
storageFailureKey = null;
await click(button("重试保存"));
assert.ok(!json().includes("本次更改暂未保存"));
assert.equal(saved().started, true);
assert.deepEqual(saved().found, ["brush", "arrow-tiles"], "Retry saves the newest in-memory discoveries rather than a stale failed snapshot");
assert.deepEqual(saved().revealed, ["gallery-curtain", "shell-fan"]);
const recoveredSave = saved();
await close();
await act(async () => tree.unmount());
await mount();
assert.deepEqual(saved(), recoveredSave, "A successful retry survives a real component remount");
await act(async () => tree.unmount());
storageFailureKey = A.MODE_KEY;
await mount();
await mode("easy");
assert.ok(!json().includes("本次更改暂未保存"), "A guidance-only failure cannot be reported as lost chapter progress");
assert.deepEqual(saved(), recoveredSave);
storageFailureKey = null;
await act(async () => tree.unmount());

// Preserve future save until explicit, scoped reset consent.
const future = JSON.stringify({
  version: 999,
  chapter: A.CHAPTER.id,
  revision: 999,
  state: {},
});
storage.set(A.CHAPTER_KEY, future);
const writesBeforeFuture = storageWrites.filter(key => key === A.CHAPTER_KEY).length;
await mount();
assert.equal(storageWrites.filter(key => key === A.CHAPTER_KEY).length, writesBeforeFuture, "Future-version protection blocks even automatic save attempts");
assert.equal(tree.root.findAllByType("button").filter(node => text(node) === "重试保存").length, 0, "No retry control can overwrite a protected future save");
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
  "Chapter UI actions passed: all closeups and contextual targets in three modes, one compact bag with retained focus/selection, explicit no-loss tool use and prerequisite feedback, locked installation surfaces and single ready/solved boards, hidden finds, source journal, seven mechanisms, real SVG lens layers, exact gravity, reversible classification/Sudoku, visible solved-board revisits and independently joined numeric completion, health lock, replay, failed-save recovery with current-state retry, future-save protection and SSR/CSS contracts.",
);
