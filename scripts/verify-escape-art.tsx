import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NAVIGATION_GIVENS } from "../src/escape/puzzleVisuals";
import RoomArt from "../src/escape/RoomArt";
import { NavigationSumBoard } from "../src/escape/MathProps";

assert.deepEqual(NAVIGATION_GIVENS, [
  ["1"],
  ["2", "★"],
  ["3", "5", "8"],
  ["4", "☾", "?", "?"],
  ["?", "⚓", "?", "?", "44"],
]);
const art = renderToStaticMarkup(<RoomArt view={0} />);
assert.ok(
  art.includes('data-puzzle="number-triangle"'),
  "Overview must show one substantial number board",
);
assert.equal((art.match(/data-number-cell=/g) ?? []).length, 15);
for (const given of ["★", "☾", "⚓", "44"])
  assert.ok(art.includes(`data-given="${given}"`), `Overview shows ${given}`);
assert.ok(!art.includes("M276 100L393"), "Old flags must not remain");
const closeup = renderToStaticMarkup(
  <NavigationSumBoard scratch={{}} onScratch={() => {}} />,
);
assert.equal((closeup.match(/escape-number-cell/g) ?? []).length, 15);
for (const value of ["★", "☾", "⚓", "44"]) assert.ok(closeup.includes(value));
const picture = renderToStaticMarkup(<RoomArt view={2} />);
for (const slot of [12, 8, 16, 10, 14]) assert.ok(picture.includes(`>${slot}</text>`));
console.log("Escape overview art and matching numerical closeup verified.");
