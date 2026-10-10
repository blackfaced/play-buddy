# Clocktower spatial exploration revision

The primary navigation is part of the illustrated scene. There is no three-tab location bar.

- The attic's left wooden doorway leads to the keeper's workshop; its matching doorway returns to the attic.
- Floor stairs in the attic lead down to the counterweight well. The stair flight at the well returns upstairs.
- Raising the loose shutter uncovers a low maintenance doorway. This leads behind the counterweight, with a matching return doorway.

The maintenance alcove has a purpose: the third gear can be seen trapped underneath the weight. The handle from the workshop operates the hoist outside. Returning to the alcove after raising the weight visibly exposes the gear. The second missing mural strip is on the maintenance rack and can be collected independently. The original gear experiment, joined mural and simultaneous three-cam confirmation remain unchanged.

Fresh saves use exploration revision 3. Revision 2 saves retain collected gears, strips, mounted arrangements, tested readings, lifted gates and endings. Versionless legacy saves keep their previously available inventory and access. Existing campaign unlocks and rewards are not rewritten.

Challenge mode removes floating object labels, native SVG hover titles and pointer-hover highlighting. Object artwork, deliberate close-up operating instructions, accessible names and keyboard focus remain. Easy mode retains a short scene-operation note.

## Verification

- `node scripts/verify-clockwork-spatial.mjs`: actual scene controls, physical routes, concealed passage, blocked extraction, tool use and return, independent pickups, no primary tabs or challenge tooltips, migration.
- `node scripts/verify-campaign-mechanical-ui.mjs`: original whole-board reasoning, wrong attempts, interrupted/reloaded collection, independent mural access, pointer cancellation and completion.
- `node scripts/verify-clockwork-gears-ui.mjs`: physical gear click/drag/swap/removal, cancel/Escape and repeated trials.
- The spatial test exports rendered scene SVGs to `/tmp/clockwork-spatial-qa` for raster inspection. These are actual React-rendered SVG states, not a browser screenshot or browser interaction test.
