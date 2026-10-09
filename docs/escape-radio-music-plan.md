# Radio and music exploration

Radio: move between the receiver room and seaward maintenance landing. Lift the landing's weather cover and collect the fuse; fit it into the receiver's empty holder. The receiver exposes the old reference traces, but destination pictures appear only after an explicit whole-receiver listening attempt with all signals aligned. The same landing contains the removable crank: carry it back to the transmitter. Open the desk's hinged wiring cover to access the cable board. The illuminated receiver remains readable on revisits; the missing fuse/crank positions and mounted parts remain visible.

Music: move between the window alcove and workbench. Lift the window-seat lid to find the bird paper roll; carry it to the empty brass sleeve. Pull the curtain aside to discover the chime outlines and the removable winding handle. Carry that handle to the music box. Revisit the window chimes to relate lengths, pitch, and bird motifs to the workbench comb. The opened curtain and seat, absent roll, installed sleeve, and installed handle persist. Sound and visual teeth carry equivalent information, including rests and asymmetric seam marks.

All direct pick/place operations are reversible. The first tap picks a tube, the next tap places or swaps; dragging performs the same swap without a pointer-down overwriting an already selected source. Escape, pointer cancellation, and an explicit put-down control clear selection without altering the board. Keyboard controls use the same pick/place path. Neither scene reports individual puzzle correctness. Listening and cranking are whole-board attempts. Challenge mode keeps operational instructions, but offers no solution/count overlay. Legacy saves migrate with apparatus accessible; existing completion and campaign unlock behavior remain intact.

Validation uses React's actual event handlers, state normalization, mounted scene navigation, all guidance modes, wrong attempts, cancellation, repeated actions, reload, and legacy migration. No real-browser pass is claimed in this environment.

## Verification result

- The music SVG two-tap regression was reproduced before implementation: `[2,0,1]` incorrectly stayed unchanged. The same real-handler test now produces `[0,2,1]`.
- `node scripts/verify-escape-music-pointer.mjs`: two-tap swap, drag ghost, capture-compatible movement, pointer cancellation, outside drop, fallback-button Escape, direct keyboard swapping, navigation cancellation, normalized reload.
- `node scripts/verify-escape-radio-music-exploration.mjs`: full discovery/use paths in easy/standard/challenge, wrong tool no-op, all-signal receive attempt, persistent observation, existing radio two-tap and cancel, revisits, fresh versus legacy migration.
- `node scripts/verify-campaign-signal-ui.mjs`: original gesture sound, mute, wrong attempts, saved revisits, interrupted playback and actual campaign replay/undo checks retained; journeys now acquire and install equipment.
- `node scripts/verify-campaign-signal.mjs`: original waveform/terminal/rhythm proof and exhaustive 262,144 pegboards retained.
- TypeScript and scoped ESLint pass. No Chromium or touchscreen browser pass is claimed.
