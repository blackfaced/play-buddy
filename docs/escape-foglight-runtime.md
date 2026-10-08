# Foglight chapter runtime

The new three-room chapter is isolated under `src/escape/chapter/`. It does not
replace the cabin reducer, expedition reducer, router, or global play-time store.
All art and game data are bundled locally. No backend, editor, plugin loader, or
new account is involved.

## Authoring another puzzle

`types.ts` defines a small discriminated union: arrangement, code, optical filter,
fixed-track drop prediction, 4×4 sudoku, and search collection. `content.ts` is the
authored chapter: stable IDs, room descriptions, physical tool targets, covers,
pickups, prerequisites, rewards, puzzle rules, and separately requested hints.

Add a concrete definition of an existing kind to use the same renderer and
validator. A genuinely new mechanic requires an explicit type, renderer branch,
validator, and verification case. There is intentionally no general-purpose DSL.

`lintChapter` checks unique IDs, references, item producers, legal puzzle inputs,
unique sudoku solutions, connected integer tetrominoes, and finite reachability.
The starting scene must be accessible. Authored circular or unobtainable gates
fail verification instead of producing a dead-end room.

## Interactions and fairness

The reducer accepts reversible whole input boards; it never checks a single tile
or reports a correct-piece count. Up to 40 undo and redo snapshots survive
reloads. Resetting a working board is undoable. Closing or cancelling a detail
view does not submit it. Every actual answer board requires an explicit confirm.
The search checklist is completed when its seventh object is collected; it has
no answer board. Invalid tool usage and wrong answers do not consume anything.

Arrangement placement swaps occupied slots. Fixed sudoku givens cannot change.
Drop predictions use the same deterministic collision model as their solved
animation. All three boards are independent; there is no rotation, lateral move,
line clearing, or collision preview that reveals the answer before confirmation.
The optical puzzle switches distinct visible clue layers and identifies lenses
by name and symbol as well as color. Solved lenses remain inspectable without
letting players edit the committed answer. Previously seen lens layers are saved
separately from undoable working input.

Requested hint counts are separate from board state. Challenge mode ignores
hint actions. Guidance is a shared preference, not chapter progress, so changing
mode never restarts a puzzle.

## Saves and migration

Foglight uses its own `play-buddy:escape:foglight:v1` key and a versioned envelope
with chapter ID and content revision. This is an additive migration: existing
cabin and expedition keys remain unchanged, including completed expedition
saves. The old observation-deck ending gains a continuation entry, not a forced
new game. Resetting Foglight affects only this chapter.

The parser bounds total input size, history length, numbers, board dimensions,
known IDs, and clue observations. It reconstructs prerequisite provenance before
accepting solved flags or rewards, and derives completion from the final puzzle.
Unknown versions are not interpreted as the current format. Malformed working
boards fall back to their initial state; impossible solved flags cannot unlock
later rewards.

## Verification

Run `npm run verify:escape:chapter` for the full solve path, all 512 possible
three-board drop predictions, Sudoku uniqueness, wrong whole-board attempts,
reversible placements, undo/redo/reset/travel/reload, requested hints, reward
idempotence, malformed saves, reachability lint, and old-save key isolation.

The React interaction harness and existing escape verification scripts cover the
UI integration. A cloud browser launch has been blocked by the environment's
Unix-socket policy in earlier work; do not equate React-renderer checks with a
real browser visual/accessibility pass. Report that remaining distinction.

### Checks for a change

```sh
npm run verify:escape:chapter
npm run verify:escape
npm run build
npx eslint src/escape/chapter src/escape/adventure/Adventure.tsx scripts/verify-escape-chapter.ts
```

The chapter command also runs the React interaction harness and an independent reviewer script: 64 seeded action
orders (half never explicitly confirm the collection checklist), independent
Sudoku enumeration and shape collision, all 720 permutations of both
arrangements, and tens of thousands of saved-state round trips. It reads the
compiled definition rather than maintaining a second answer implementation in
the shipped UI.

Full-repository `npm run lint` retains 18 pre-existing errors in unrelated legacy
components and generated UI files (effect-driven state, fast-refresh exports and
render-time randomness). The focused files must have zero errors. The production
build also retains its existing large-chunk warning. Neither baseline is silently
"fixed" as part of the chapter.
