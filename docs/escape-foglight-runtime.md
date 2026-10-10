# Foglight chapter runtime

The new three-room chapter is isolated under `src/escape/chapter/`. It does not
replace the cabin reducer, expedition reducer, router, or global play-time store.
All art and game data are bundled locally. No backend, editor, plugin loader, or
new account is involved.

## Authoring another puzzle

`types.ts` defines a small discriminated union: arrangement, code, optical filter,
fixed-track falling-shape recognition, 4×4 sudoku, and search collection. `content.ts` is the
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
Each chute stacks three ordered tetrominoes under the same deterministic
collision model used for its solved silhouette. The player predicts the final
numeral. All three chutes are independent; there is no rotation, lateral move,
line clearing, or collision preview before confirmation.
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

Run `npm run verify:escape:chapter` for the full solve path, all 1,000 possible
three-chute numeral predictions, Sudoku uniqueness, wrong whole-board attempts,
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
Sudoku enumeration and shape collision, all 720 stamp placements and 720 route orders, and tens of thousands of saved-state round trips. It reads the
compiled definition rather than maintaining a second answer implementation in
the shipped UI.

Full-repository `npm run lint` retains 18 pre-existing errors in unrelated legacy
components and generated UI files (effect-driven state, fast-refresh exports and
render-time randomness). The focused files must have zero errors. The production
build also retains its existing large-chunk warning. Neither baseline is silently
"fixed" as part of the chapter.

## Linked evidence redesign (content revision 2)

The pattern tray is now an unlabeled 4×4 classification plate. Ten fixed stamps
show an independently inferable combination of arrow direction and dot count;
six movable stamps also carry small nautical emblems. No row or column labels
explain the classification. The plate, tide board and final lock impression
share a clipped upper-left corner and paired lower-right rivets. These are
physical clues, not automatic cross-links or answer highlighting.

The three local optical route fragments still have to be discovered by moving
the correct lens over each actual region. Their overlaps determine an emblem
order. The player must independently realize that the emblem positions on the
completed pattern plate correspond to positions on the completed tide board.
The final device is a six-digit lock. All six referenced tide positions were
originally blank. Completed boards remain inspectable; success text and journal
entries do not explain this relation. The explicit explanation is only in the
last player-requested hint, which challenge mode never exposes.

The original animal lock and redesigned falling-shape mechanism are separate intermediate
mechanisms; the linked chain is the pattern plate, optical fragments, tide board,
and final lock. This deliberately avoids replacing the chapter with a collection
of additional mini-games.

Content revision 1 saves are normalized for the three replaced boards. An
exact, correct legacy solution with its solved flag can become the new solved
layout/code; the exact old gravity answer is converted to the new numeral answer.
Other old inputs for those boards reset, and old hint counts are cleared so that
previously requested hints cannot expose the new reasoning. All other saved inputs,
histories, discoveries and lens observations remain under the existing bounds
and provenance reconstruction. Therefore earlier earned unlocks and completion
survive, but malformed or fabricated old answers cannot acquire rewards. Newer
unrecognized revisions remain protected. To experience the redesign from an
already completed save, explicitly replay the chapter.

`verify-escape-chapter-reasoning.mjs` derives the classification, optical overlap
route and Sudoku independently from clue data, rather than assuming the shipped
solution constants. The UI harness reopens both completed boards before entering
the derived final code. Static SVG renderings check the stamp and frame artwork;
a live browser interaction/visual pass is still a separate verification step.

## Storage failures

Chapter writes are verified separately from the scene-selector registry. A failed
chapter write shows a warning on the active room or closeup surface and offers
Retry Save. Current in-memory play can continue, but the warning explicitly says
that refresh or leaving the chapter can lose unsaved changes. A successful retry
saves the current board and clears the warning; failed retries never claim
success. Protected future-version saves are not overwritten by retry behavior.
