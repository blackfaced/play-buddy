# Accepted puzzle feedback

Completion is emitted by accepted action handlers, never by watching rendered arrangements. No save shape, reward rules, answer validation or campaign unlock logic was changed. There is no auto-navigation or per-piece correctness indicator.

## Coverage

| Scene | Accepted events | Visible treatment |
| --- | --- | --- |
| 01 Cabin | Confirmed picture, drawer, cabinet, safe, door | Persistent local latch/light in the open closeup; bolt withdrawal or light activation; short neutral cue |
| 02 Expedition | Storage door, safe, fully installed projector, confirmed image panel, operated winch | Closeup latch/light; existing actual winch/bridge motion preserved; short neutral cue |
| 03 Workshop | Final search pickup and confirmed whole puzzles | Per-device local latch/light in closeup; permanent named accepted record; short cue |
| 04 Clockwork | Tested transmission opens upper gate; final release | Existing physical weight/gate movement, plus neutral accepted cue and record |
| 05 Shadow | Curtain pull accepted; whole stage lighting accepted | Separate physical stage/curtain work; shared small cue and record |
| 06 Greenhouse | Whole pipe test raises float; completed irrigation | New local tank fill/float lift on pipe board; vine opening; existing flowing water; cue and record |
| 07 Radio | Whole signal received; final broadcast | Harbor lights fade on and gate lifts; cue and record |
| 08 Music | Complete successful playback | Wooden lighthouse unfolds in panorama and beside the active player; cue and record |
| 09 Cargo | Actual successful sluice trial | Gate lifts and loaded boat moves through; cue and record |
| 10 Observatory | Accepted roof handle | Dome motion and telescope-closeup illumination; cue and record |

Derived solved flags are deliberately excluded: mural, shadow traces, pipes, growth, carrier, continuity, chimes, roll, bow plate, star disc and sightlines. Merely arranging the answer therefore creates no additional success oracle.

## Lifecycle and accessibility

- A fresh accepted milestone is reported once per exploration; loaded milestones initialize the seen set. Undo/redo, revisits, mode changes and repeated successful buttons do not replay the shared cue. Explicit replay permits a newly earned cue, but reset itself is silent.
- Physical SVG motion wrappers must remain mounted outside their conditional final artwork. On mount they remember the current event sequence, preventing restored/revisited art from animating.
- Campaign callbacks are guarded by mounted status, HealthGate, reset/undo epoch, a monotonically increasing mode epoch, and protected saves. Both state updates and announcements are guarded, including a mode A→B→A round trip.
- Cue timers only dismiss presentation; they cannot mutate puzzle progress.
- The cue is a nonmodal, pointer-transparent popover so native closeup dialogs do not obscure it. It does not move focus. A neutral polite live region announces the accepted result. Persistent SVG state and text remain available after the cue expires.
- Reduced-motion removes new animations; persistent final poses and labels remain. Source puzzle art is not dimmed or replaced.

## Verification

TDD: `scripts/verify-completion-feedback.mjs` failed on missing implementation first, then passed the accepted mapping and excluded-arrangement checks.

- `node scripts/verify-completion-feedback.mjs`
- `node scripts/verify-completion-motion.mjs`
- `node scripts/verify-independent-success-lifecycle.mjs`
- `node scripts/verify-independent-success-motion.mjs`
- Full `npm run verify:escape`
- Scoped ESLint and TypeScript build

Tests execute real React components and handlers with synthetic timers/native popover mocks. They verify emitted events and actual SVG final/moving groups. Browser geometry, actual CSS timing, native focus and screen-reader speech still require browser QA; headless checks do not claim those results. No publication performed.
