# Foglight chapter verification

Date: 2026-10-08. Base: `origin/main` at `f2410b9`. Feature branch:
`feat/escape-observatory-chapter`.

## Result

The chapter implementation and its prior-chapter continuation pass the focused
logic, React interaction, TypeScript, production build, and changed-file lint
checks. No merge or production deployment is implied by these results.

## Automated evidence

- `npm run verify:escape` passes the existing cabin, arithmetic, art, guidance,
  expedition logic and React suites, plus the new chapter verification command.
- The original cabin suite retains its 2,432 v1 and 39,136 v2 migration checks.
  Old-save keys and both prior reducers are preserved. A completed expedition
  save exposes the Foglight continuation before deck art; opening the chapter,
  changing mode, and returning leaves both original save payloads unchanged.
- `npm run verify:escape:chapter` covers all seven mechanisms and their complete
  prerequisite/reward path; hidden objects and cross-room tools; reversible
  arrangement, Sudoku, reset, undo/redo and reload; neutral whole-board rejection;
  reward idempotence; hints in three modes; bounded history and malformed saves;
  gate provenance; declarative reachability and duplicate/reference checks.
- The independent reviewer script performs **58,374 assertions and 47,823
  saved-state round trips**, using 64 seeded action orders. Half the runs never
  manually confirm the search checklist. It independently enumerates all 288
  valid 4×4 Sudoku boards and confirms a unique match to the authored givens.
  It checks 720 permutations for each arrangement and derives landing rows with
  an independent collision routine. The core suite also tries all 512 complete
  drop predictions, accepting exactly one.
- The React harness operates real component actions for all three guidance modes,
  all seven mechanisms, covered pickups, wrong tools, source-journal discovery,
  switching actual SVG optical layers, no unsolved landing preview, editable
  Sudoku and arrangements, explicit board confirmation, final completion, health
  lock, scoped replay, and preserving a future save until explicit reset consent.
- `npm run build` succeeds. The focused ESLint command documented in the authoring
  guide succeeds. `git diff --check` succeeds.

## Limits and unchanged baselines

- Full-repository lint still reports the same **18 unrelated baseline errors**;
  no new chapter-file lint errors remain. Generated UI components are untouched.
- The build retains the existing warning about a JavaScript chunk above 500 kB.
- Real-browser pixel, focus-trap, animation and responsive-layout validation has
  **not** been completed. The environment previously blocked Chromium startup
  through Unix-socket restrictions; this task uses the existing React renderer,
  SVG/DOM and CSS-contract harness rather than claiming browser screenshots.
- Existing difficulty simulation failures are a known unrelated baseline; they
  were not repaired by this change. The chapter does not touch those mechanics.

See [the runtime authoring guide](escape-foglight-runtime.md) and the concrete
[chapter definition](../src/escape/chapter/content.ts) for the extension contract.
