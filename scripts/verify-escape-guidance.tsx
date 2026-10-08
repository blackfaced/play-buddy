import assert from "node:assert/strict";
import { renderToStaticMarkup as render } from "react-dom/server";
import { GuidanceProvider, HintPanel, ModeControls, Hotspot } from "../src/escape/Guidance";
import { MODE_KEY, parseMode, guidancePolicy, changeGuidance, visibleDetail } from "../src/escape/guidancePolicy";
import { NavigationSumBoard, WoodenPicture } from "../src/escape/MathProps";
import { initialState, parseSave, serializeSave, SAVE_KEY, hints } from "../src/escape/logic";
for (const invalid of [null, "", "garbage", '"easy"', "null", "{}", "STANDARD"]) assert.equal(parseMode(invalid), "standard");
for (const mode of ["easy", "standard", "challenge"] as const) assert.equal(parseMode(mode), mode);
assert.notEqual(MODE_KEY, SAVE_KEY);
const progress = { ...initialState(), cloth: true, drawer: true, seen: ["flags"] };
const session = { mode: "standard" as const, hintLevel: 2, detail: "hints", progress, scratch: { "1-1": "3" }, code: "123", route: "↑", selected: "cloth" };
for (const mode of ["easy", "standard", "challenge"] as const) {
  const next = changeGuidance(session, mode);
  assert.strictEqual(next.progress, progress);
  assert.strictEqual(next.scratch, session.scratch);
  assert.equal(next.code, session.code);
  assert.equal(next.route, session.route);
  assert.equal(next.selected, session.selected);
  assert.equal(next.detail, null);
  assert.equal(next.hintLevel, 0);
  const html = render(<GuidanceProvider mode={mode}><NavigationSumBoard scratch={{}} onScratch={() => {}} /><WoodenPicture state={initialState()} selected={null} onSelect={() => {}} onPlace={() => {}} onRemove={() => {}} onConfirm={() => {}} /></GuidanceProvider>);
  assert.equal(html.includes('data-guidance="rule"'), mode === "easy");
  assert.equal(html.includes("左上方"), mode === "easy");
  assert.equal(html.includes("每次增加相同"), mode === "easy");
  assert.ok(!html.includes("375"));
  assert.ok(html.includes("44"));
  assert.ok(html.includes("Tab"));
  const hotspot = render(<Hotspot mode={mode} label="算图" onClick={() => {}} style={{}} />);
  assert.ok(hotspot.includes('aria-label="检查算图"'));
  assert.equal(hotspot.includes("＋"), mode !== "challenge");
  for (const level of [0, 1, 2]) {
    const hint = render(<HintPanel mode={mode} state={initialState()} level={level} onNext={() => {}} />);
    assert.equal(hint.includes("375"), mode !== "challenge" && level === 2);
    assert.equal(hint.includes(hints(initialState())[0]), mode !== "challenge");
    assert.equal(hint.includes("左上方"), mode !== "challenge" && level >= 1);
    if (mode === "challenge") assert.equal(hint, "");
    if (mode !== "challenge" && level === 1) assert.ok(hint.includes("揭晓答案"));
  }
}
assert.equal(guidancePolicy("standard").automaticRules, false);
assert.equal(visibleDetail("challenge", "hints"), null);
assert.equal(visibleDetail("standard", "hints"), "hints");
assert.ok(render(<ModeControls mode="standard" onChange={() => {}} />).includes('aria-describedby="escape-mode-description"'));
assert.deepEqual(parseSave(serializeSave(progress)), progress);
assert.equal(parseSave(JSON.stringify({ version: 1, state: progress })).drawer, true);
console.log("Escape guidance: preference fallback, non-destructive transitions, SSR rules/hints/hotspots, and legacy saves verified.");
