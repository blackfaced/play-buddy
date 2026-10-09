# Ten-episode campaign runtime

The existing cabin, expedition and foglight remain separate original runtimes. Their save keys and parsers are unchanged. The selector delegates episodes 4–10 through an explicit typed registry, with each episode owning its physical scene, apparatus and inference rules.

## Shared boundary

- `types.ts`: bounded JSON-compatible state and component contract.
- `engine.ts`: save identity/version checks, structural validation and episode normalization. Episode normalization reconstructs derived solved/inventory state from physical apparatus values.
- `CampaignEpisode.tsx`: save/revisit, per-episode confirmed replay, 40-step undo, mode/hints, inventory and live-region feedback.
- `components.tsx`: native focus-trapped detail modal, keyboard-native dial and inspection buttons.
- `registry.ts`: seven explicit episode imports, not placeholder descriptors.

`update({values: ...})` merges physical values. Whole-apparatus test/commit feedback belongs to the episode; the shell does not reveal partial correctness. The `complete` callback checks the definition's actual completion predicate. Completion also persists when restoring a valid completed save.

For a live apparatus closeup, pass `openDetail(title, latestProps => JSX)` and read state from `latestProps`, or keep a local camera target and render a normal `DetailModal`. A static React node is suitable only for immutable clue closeups.

## Persistence and access

New episode key: `play-buddy:escape:episode:<id>:v1`; payload `{version:1, episode:<id>, state}`. A future version is protected read-only, with no reset path in this older runtime. Merely entering a scene does not initialize or overwrite a save. Malformed records remain unchanged until the player acts.

The menu retains its existing v1 key and completed array. An optional unlocked array recovers access from surviving validated episode saves. Later valid records prove earlier access was already earned. Replaying or undoing does not revoke the earned completion ledger. Future menu versions are not overwritten.

HealthGate is still outside the route. While locked, the shell is inert and unmounts apparatus/detail modals so native top-layer dialogs cannot escape the health overlay. Puzzle state remains retained and reappears after the break. Undo, confirmed replay and health interruption invalidate the apparatus epoch; departed scenes also reject callbacks after unmount. Delayed timers cannot restore a stale board after the player resumes. Shared disabled controls keep full clue contrast.

## Checks

`npm run verify:escape:campaign` covers save validation, ten-entry ordering/migration, real registry components, shell replay/revisit/undo/hints/live-modal/health behavior, and each content team's domain and rendered interaction journeys. `npm run verify:escape` also runs the unchanged original three episode suites and selector continuation regression.
