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
  target(id);
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
  const expected = A.CHAPTER.tools.filter(
    (tool) => tool.scene === saved().scene && tool.target.closeup === closeup,
  );
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
  await close();
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
  await click(target("brush-plaque"));
  assert.deepEqual(saved(), used, `${value}: a used target remains safely inspectable`);
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
await click(target("brush-plaque"));
assert.deepEqual(saved(), afterBrushing, "An already-used physical target remains safely inspectable");
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
const beforeFilter = saved();
await use("mount-filter", "filter-disc");
assert.deepEqual(saved(), beforeFilter, "The owned filter cannot bypass the unmounted-frame prerequisite");
assert.ok(hosts(scope(), { role: "status" }).some((node) => text(node).trim()));
await assertSelected("filter-disc");
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
const beforePrism = saved();
await use("mount-prism", "beacon-prism");
assert.deepEqual(saved(), beforePrism, "The owned prism cannot bypass the unlubricated track");
assert.ok(hosts(scope(), { role: "status" }).some((node) => text(node).trim()));
await assertSelected("beacon-prism");
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
  "Chapter UI actions passed: all closeups and contextual targets in three modes, one compact bag with retained focus/selection, explicit no-loss tool use and prerequisite feedback, persistent used devices, hidden finds, source journal, seven mechanisms, real SVG lens layers, exact gravity, reversible arrangement/Sudoku, completion, health lock, replay, future-save protection and SSR/CSS contracts.",
);
