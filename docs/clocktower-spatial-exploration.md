# Clocktower spatial exploration revision

The primary navigation is part of the illustrated scene. There is no three-tab location bar.

- The attic's left wooden doorway leads to the keeper's workshop; its matching doorway returns to the attic.
- Floor stairs in the attic lead down to the counterweight well. The stair flight at the well returns upstairs.
- Raising the loose shutter uncovers a low maintenance doorway. This leads behind the counterweight, with a matching return doorway.

The maintenance alcove has a purpose: the third gear can be seen trapped underneath the weight. The handle from the attic pendulum cabinet operates the hoist outside. Returning to the alcove after raising the weight visibly exposes the gear. The second missing mural strip is on the maintenance rack and can be collected independently. The original gear experiment, joined mural and simultaneous three-cam confirmation remain unchanged.

Fresh saves use exploration revision 3. Revision 2 saves retain collected gears, strips, mounted arrangements, tested readings, lifted gates and endings. Versionless legacy saves keep their previously available inventory and access. Existing campaign unlocks and rewards are not rewritten.

Challenge mode removes floating object labels and native SVG hover titles. Object artwork, deliberate close-up operating instructions, accessible names and keyboard focus remain. Easy mode retains a short scene-operation note.

## Verification

- `node scripts/verify-clockwork-spatial.mjs`: actual scene controls, physical routes, concealed passage, blocked extraction, tool use and return, independent pickups, no primary tabs or challenge tooltips, migration.
- `node scripts/verify-campaign-mechanical-ui.mjs`: original whole-board reasoning, wrong attempts, interrupted/reloaded collection, independent mural access, pointer cancellation and completion.
- `node scripts/verify-clockwork-gears-ui.mjs`: physical gear click/drag/swap/removal, cancel/Escape and repeated trials.
- The spatial test exports rendered scene SVGs to `/tmp/clockwork-spatial-qa` for raster inspection. These are actual React-rendered SVG states, not a browser screenshot or browser interaction test.

## Pendulum cabinet and direct discovery (October 2026 iteration)

The attic now has a glass-front pendulum cabinet between the gear cage and clock door. Its wooden door opens and closes; the pendulum can be hung aside and returned. The existing square-ended crank is occluded behind the pendulum and becomes a separate collectible only when both obstructions are moved. A worn square-socket and chain engraving links this tool to the existing hoist. Carrying the crank, rather than leaving the cabinet open, is what permits the hoist to work.

The drawer's gear and painted strip are now independent visible pickups. Opening or clicking the empty drawer does not collect either item. Lifting the window board clearly moves it up against the wall, exposing a separate large-gear target beside the maintenance hatch. The existing weight, mural, gear readings and three-bird puzzle retain their rules.

This remains exploration revision 3: `cabinetOpen` and `pendulumAside` are additive booleans that default false. Existing handle ownership, gears, strips, tested arrangements, hoist, upper gate and earned ending remain unchanged. Saves made after opening the cabinet or moving the pendulum restore that exact discovery state. Closing the cabinet or returning the pendulum cannot destroy the crank or block an owned tool.

The chapter has layered timber/brick/floor depth, warm overhead light in the attic/workshop, window light at the well and darker foreground framing in the service alcove. Dust and a very slight lamplight variation respect reduced motion. There is no new audio or network asset. Challenge mode keeps accessible names and keyboard focus; no text labels or native hover titles appear. A subtle material-brightness hover/press response replaces the previous completely inert challenge hover.

Desktop layout is scoped to clockwork and keeps the room, inventory and status together. Narrow or short/zoomed viewports retain scrolling rather than cropping the room. The new cabinet and loose-prop pickup hit rectangles are at least 155 by 155 scene units; the scene retains one shared SVG coordinate system for drawing and hit testing. Browser QA is required to confirm their rendered geometry and keyboard focus; source/React tests alone do not establish visual usability.

Additional verification: `node scripts/verify-clockwork-cabinet.mjs` covers reversible cabinet/pendulum occlusion, unavailable hidden pickup, interrupted discovery save/reload, single crank ownership, existing hoist operation, legacy tool retention, independently collected drawer props and window reveal/collection.

### Direct gear controls and final accessibility refinements

Gears, sockets and the return tray are now focusable artwork buttons. Enter/Space performs the same selection/placement as a tap, selecting the same prop cancels, and Escape cancels before it dismisses the close-up. Empty-socket and same-socket actions do not write progress. Physical dragging, swapping and dropping outside/cancellation retain their original behavior. The duplicate gear/socket/cancel menu is removed; the crank remains the one whole-machine test action. Challenge-mode operation text is available to assistive technology without a visible instruction wall. Necessary tooth counts, habitat engravings and trial readings remain on the actual mechanism.

The new keyboard suite is `scripts/verify-clockwork-gear-keyboard.mjs`. Existing pointer/trial suites now target the same artwork instead of deleted buttons. The cabinet door no longer carries a duplicate pendulum silhouette when open, and descriptions reflect collected props and persisted pendulum position. Passage and collectible targets were enlarged to at least 155 scene units, with a slightly narrower gear cage reserving a non-overlapping target beside the left door. Desktop fit mode begins at 761px width and 721px height; shorter viewports use ordinary document scrolling. The chapter completion panel is a compact row. The return-tray recesses, number plates and lettering are pointer-transparent decoration, so a pointer return lands on the actual tray surface even when clicking a visible empty recess.
