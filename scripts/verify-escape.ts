import assert from "node:assert/strict";
import {
  initialState,
  reduceEscape,
  parseSave,
  serializeSave,
  inventory,
  hints,
  type EscapeState,
  type Action,
} from "../src/escape/logic";
let s = initialState();
const act = (a: Action) => {
  s = reduceEscape(s, a);
};
assert.equal(s.escaped, false);
for (const action of [
  { type: "cabinet", route: "↑→↓→↑" },
  { type: "insertTokens" },
  { type: "rotate", ring: 0 },
] as Action[])
  assert.deepEqual(reduceEscape(s, action), s);
assert.deepEqual(parseSave(serializeSave({ ...s, rings: [0, 0, 0] })), s);
assert.equal(hints(s).length, 3);
for (const action of [
  { type: "retrieve" },
  { type: "combine" },
  { type: "unlockDoor" },
  { type: "align" },
  { type: "cleanChart" },
] as Action[])
  assert.deepEqual(reduceEscape(s, action), s);
act({ type: "drawer", code: "123" });
assert.equal(s.drawer, false);
act({ type: "drawer", code: "375" });
assert.equal(s.drawer, true);
assert.deepEqual(inventory(s), ["magnet", "token1"]);
const once = s;
act({ type: "drawer", code: "375" });
assert.deepEqual(s, once);
act({ type: "takeCloth" });
act({ type: "cleanChart" });
assert.equal(s.chart, true);
assert.deepEqual(parseSave(serializeSave(s)), s);
act({ type: "cabinet", route: "↑→↓→↑" });
assert.equal(s.cabinet, true);
act({ type: "combine" });
assert.ok(inventory(s).includes("fishingTool"));
act({ type: "retrieve" });
assert.equal(s.token2, true);
act({ type: "insertTokens" });
assert.equal(s.tokensInserted, true);
for (let ring = 0; ring < 3; ring++)
  for (let i = 0; i < [3, 2, 1][ring]; i++)
    act({ type: "rotate", ring: ring as 0 | 1 | 2 });
act({ type: "align" });
assert.equal(s.safe, false, "The reconstructed reference is required");
for (const [slat, slot] of [12, 8, 16, 10, 14].entries())
  act({ type: "placeSlat", slat, slot });
act({ type: "align" });
assert.equal(s.safe, false, "Full board still needs explicit confirmation");
act({ type: "confirmPicture" });
act({ type: "align" });
assert.equal(s.safe, true);
act({ type: "unlockDoor" });
assert.equal(s.escaped, true);
assert.deepEqual(parseSave(serializeSave(s)), s);
assert.deepEqual(reduceEscape(s, { type: "reset" }), initialState());
for (const raw of [
  null,
  "bad",
  "{}",
  "null",
  "[]",
  '{"version":999}',
  '{"version":1,"state":{"escaped":true}}',
  JSON.stringify({ version: 1, state: { ...s, rings: [NaN, 0, 0] } }),
])
  assert.deepEqual(parseSave(raw), initialState());
const invalid = { ...initialState(), escaped: true } as EscapeState;
assert.deepEqual(parseSave(serializeSave(invalid)), initialState());
// Parallel path: chart/cabinet can be completed without the drawer.
s = initialState();
act({ type: "takeCloth" });
act({ type: "cleanChart" });
act({ type: "cabinet", route: "↑→↓→↑" });
assert.equal(s.cabinet, true);
assert.equal(s.drawer, false);
const before = s;
act({ type: "cabinet", route: "↑" });
act({ type: "retrieve" });
assert.deepEqual(s, before);
for (let i = 0; i < 100; i++) {
  act({ type: "takeCloth" });
  act({ type: "cleanChart" });
  act({ type: "rotate", ring: 0 });
}
assert.deepEqual(s, before);
console.log(
  "Escape verification passed: complete path, dependencies, parallel paths, repeated actions, reset, save validation.",
);
