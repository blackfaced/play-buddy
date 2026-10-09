# 09 / 10 physical exploration redesign

## Concrete design before implementation

09: move between the cargo quay, the boat deck and the downstream sluice. Lift the actual tarpaulin to expose the cargo. A boat hook rests against the quay; take it and use it on a waterlogged bow plate caught beyond the sluice. The recovered plate remains available to revisit and rotate. Keep the real beam balance and torque simulation. On the boat artwork, selecting a crate lifts it without committing; selecting a berth places or swaps it, selecting the quay removes it, and Escape/cancel drops selection without changing cargo. Pointer, touch and keyboard use the same interaction. The sluice is a physical global test, never an individual crate oracle. Launch changes the downstream scene and preserves the loaded boat and reconstructed evidence.

10: explore the worktable, observation windows and upper dome separately. A cloth physically conceals a magnifying lens. Open the shutters and remove their transparent sighting strips, then carry and install those on the chart. Strips cease appearing at their original mounts but their scratches remain inspectable. Retain the actual star-size matching, localized moving lens, strip registration/intersection and shell-to-star-disc-to-bearing inference. The open roof changes the revisitable view. Navigation and operation instructions are available in every mode; no automatic correctness clues or required-total checklist.

Persistence: additive exploration version distinguishes new initial saves from legacy saves. Legacy cargo with cover/plate work retains recovered plate access, legacy observatory retains mounted chart strips and every existing dial/lens value. Completion remains tied to physical state and legacy completed saves remain completed. Selections are transient and cancel on exit/reload.

Verification: first fail an artwork-handler regression, then implement; test pure transition invalid input, wrong cargo layouts, direct SVG activation, pick/place/swap/remove/cancel, both physical exploration journeys, repeated actions, reload and migration. Run focused Node React-renderer suites, TypeScript and ESLint. Browser launch is unavailable in this task; no browser verification is claimed.

## Verification outcome

Implemented direct artwork controls, three distinct viewpoints per episode, persistent physical object removal/installation, reversible cargo moves with transient hand selection, and unchanged mathematical puzzle domains. Added robust owner-pointer capture handling and aspect-fit lens coordinates. The small chart overview shows three candidates and mounted frame rails rather than a fabricated solved intersection. Initial covered cargo leaves the scale pan empty.

Passing commands:
- `node scripts/verify-escape-cargo-observatory-physical.mjs` (all three modes; actual React/SVG handlers; both full journeys; incorrect mirror/flipped layouts; cancel, repeat, reload, legacy migrations)
- `node scripts/verify-campaign-navigation-ui.mjs` (prior journey regression updated to physical discovery routes, including real balance observation and source revisit)
- `node scripts/verify-campaign-navigation.mjs` (unchanged exhaustive uniqueness/math checks)
- `node scripts/verify-independent-observatory-events.mjs` (independent review regression for multi-touch ownership and aspect-fit lens handling)
- `npx tsc --noEmit -p tsconfig.app.json`
- `npx eslint src/escape/campaign/episodes/cargo.tsx src/escape/campaign/episodes/cargoLogic.ts src/escape/campaign/episodes/observatory.tsx src/escape/campaign/episodes/observatoryLogic.ts`

No real browser or touch-device QA was performed. No deployment, package changes, shared stylesheet changes, or shared HarborEmblem changes were made.
