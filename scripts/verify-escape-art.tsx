import { RouteChart, VoyageLog } from "../src/escape/NavigationClues";
import { LANDMARKS, VOYAGE_LOG } from "../src/escape/voyageData";
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

// Independently reconstruct the voyage using observed times and map coordinates.
const byLandmark = new Map(LANDMARKS.map(point => [point.id, point]));
const ordered = [...VOYAGE_LOG].sort((a, b) => a.time.localeCompare(b.time));
const route = ordered.slice(1).map((entry, index) => {
  const from = byLandmark.get(ordered[index].landmark)!;
  const to = byLandmark.get(entry.landmark)!;
  const dx = to.x - from.x, dy = to.y - from.y;
  assert.equal(Math.abs(dx) + Math.abs(dy), 1);
  return dx === 1 ? "→" : dx === -1 ? "←" : dy === 1 ? "↑" : "↓";
}).join("");
assert.equal(route, "↑→↓→↑");
assert.equal(new Set(ordered.map(entry => entry.landmark)).size, 6);
assert.deepEqual(ordered.map(entry => [entry.landmark, byLandmark.get(entry.landmark)!.x, byLandmark.get(entry.landmark)!.y]), [
  ["port", 0, 0], ["arch", 0, 1], ["buoy", 1, 1], ["wreck", 1, 0], ["island", 2, 0], ["lighthouse", 2, 1],
]);
assert.deepEqual(ordered.map(entry => entry.time), ["06:10", "06:20", "06:30", "06:40", "06:50", "07:00"]);
const chart = renderToStaticMarkup(<RouteChart />);
const log = renderToStaticMarkup(<VoyageLog />);
assert.ok(!/编号|起点|stroke-dasharray|按时间|五段/.test(chart + log));
for (const point of LANDMARKS) {
  assert.ok(chart.includes(`data-landmark="${point.id}"`));
  assert.ok(log.includes(`data-landmark="${point.id}"`));
}
console.log("Cabin time-log and unnumbered map independently imply a unique five-move route.");
