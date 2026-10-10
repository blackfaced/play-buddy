# 星光号：十幕航行故事设计

Design contract, 2026-10-08. This is ten independently selected episodes, not ten rooms inside Foglight. Episodes retain individual saves; progression unlocks new episodes but completed/replayed episodes remain selectable. Public preview/debug access is preserved. None of the seven additions consumes or rewrites the three old save keys.

## Non-negotiable play contract

- Explore and manipulate actual objects. Every new episode has two independently available reasoning sources, a cross-source inference, and a physical ending. A solved source must not merely dispense a generic key.
- No automatic recipe connecting sources. Repeated emblems, shared wear, asymmetric corners and physical placement establish correspondence. The relationship is part of the mystery.
- No correct-slot counts, hidden-object target totals, correctness colors, countdown, or answer oracle. Physical phenomena (meshing, light, water, balance, sound) may respond naturally to wrong arrangements.
- Standard hints only after request; discovery → local rule → explicit relation/answer. Challenge exposes none, even after switching from standard. Basic control labels remain accessible.
- Boards, found clues and working inputs persist. Completed sources stay fully opaque and legible and can be reopened. Frozen interactions must not dim the clue artwork. Controls live outside clue geometry, in a separate toolbar/footer; no overlay hides labels or puzzle marks.
- Touch/pointer direct movement plus keyboard equivalent; selectable piece + destination is a valid accessible fallback to dragging. Rotation must rotate the depicted piece, not only change a text label. Inputs reversible before committing, with undo/reset. Wrong attempts neither consume inventory nor erase work.
- Final validation should check the physical final state, not require an unrelated list of solved flags. Knowledgeable/replaying players may legitimately infer an ending without pressing a source's confirm button.

## Existing episodes: review and direction

1. `cabin`, 航海员的钥匙. Keep four-wall exploration, movable picture strips, cloth cleaning, magnet/string combination, retrieval and concentric rings. Review strips, cleaned chart, ring emblems and shared orientation marks for inferable connections; remove unsolicited relationship explanations. Preserve the tactile tool chain and earned completion. This pass does not introduce an unrelated new puzzle chain.
2. `expedition`, 海风里的星光. Keep navigation/storage/deck, safe code 527, projector assembly, anchor nonogram and crank/hook winch prerequisites. The approved redesign makes the projection and unlabelled anchor panel correspond through asymmetric frames, rather than text instructing the transfer. No new numerical winch setting is added. Physical dependencies for assembling projector/winch remain legitimate; the informational connection itself must be discovered. Completed physical clues remain full-contrast and inspectable.
3. `foglight`, 雾灯工坊. Existing revision 2 already embodies intended linked reasoning: reconstructed classification plate + local movable-lens fragments + tide Sudoku, then infer emblem-position transfer. Keep that structure and falling-shape prediction. Review every completed closeup for full opacity and every control panel for clue occlusion. Optical reveal must depend on actual lens position, not a global tab. Remove surplus answer narration; preserve revision migration and earned completion.

## Episode 04 — `clockwork` / 钟楼的迟到鸟

Amber clock tower above the harbor: large open gear cage left, bird-mural desk center, three bird cams and bell rope right. End: real cams release three carved birds and ring the harbor bell. Five interactions: lift the gear cloth; collect loose wheels; fit/turn gears; reconstruct mural; set/release cams. All substantive sources available from entry.

### Source A: gear cage (independent)

Fixed central motor has 12 teeth, all pointers start at twelve/top. Three visible sockets lie at center distances 18, 24, 30 diagram units; gears have radii teeth/2. Loose wheels have 24, 36, 48 teeth. Correct fit is inner=24, middle=36, outer=48, provable by tooth contact, with actual scalable geometry. The crank turns the motor exactly one clockwise revolution. Output wheels turn counterclockwise by respectively 180°, 120°, 90°; their pointers on twelve-mark rings land on 6, 8, 9. Render intermediate motion and meshing; a misplaced gear slips or physically fails to contact, without a correctness badge. Socket backplates bear reed, wave, pine engravings, respectively. Twelve tick marks need not be Arabic numerals; accessible descriptions can name positions.

### Source B: torn bird mural (independent)

Four draggable strips have ordered left/right edge seams: strip0=(start,a), strip1=(c,end), strip2=(b,c), strip3=(a,b). Each seam uses two offset colored contour crossings, not a printed letter. Unique order is [0,3,2,1]. Continuous scenery depicts owl nesting in pine, swallow above reeds, tern over waves. The natural mural composition gives bird-to-habitat relation, not a written lookup table. End-frame asymmetry prevents reversal. The habitats repeat on the gear socket backplates. This source can be reconstructed before touching gears.

### Inference and final action

Bird cams are physically ordered owl, swallow, tern. Infer their matching gear sockets from habitats; rotate the actual cams to [9,6,8] twelve-tick positions, then pull the bell rope. The visual cam notches must line up with three release followers, producing bird release/bell animation. No code entry, no submit-digit keyboard. Wrong release makes the mechanism move and return gently; no partial correct count.

Proof: enumerate 3! gear placements using radius contact; enumerate 4! mural permutations using both seam boundaries; derive rotations from tooth ratio and motor motion independently. Enumerate 12^3 cam states; one final state passes. Verify source operation order A→B and B→A; both produce same physical answer.

## Episode 05 — `shadow` / 幕后的纸月亮

Indigo paper theater with amber lamp, counterweight rail, puppet chest, translucent screen and rear stage. End: three shadows form a moonlit harbor and the curtain opens onto the pier. Six interactions: open puppet chest; collect paper silhouettes; balance screen; rotate silhouettes on tracing table; position puppet rails; light the performance.

### Source A: silhouette tracing table (independent)

Three asymmetric paper pieces are fixed masks on a 3×3 local lattice (x right,y down). Moon points [(0,0),(1,0),(0,1),(0,2),(1,2)], boat [(0,1),(1,1),(2,1),(2,0)], bird [(0,0),(1,1),(2,0),(2,1)]. They rotate in 90° steps around their bounding frame, which is fixed to 3×3 even for boat. Rubbing-sheet target masks are respectively quarter-turns [1,3,2] clockwise of the authored base shapes. Player rotates and overlays each actual silhouette on its translucent target. Base artwork must depict cut paper with those occupied cells as the silhouette geometry; abstract lattice can appear only in closeup if needed. Asymmetric notch establishes top; target sheet bears embossed moon/boat/bird symbols. Matching is whole-mask equality; never flash correct cells.

### Source B: screen counterweights (independent)

Three hanging counterweights visibly shaped as 1,2,3 stacked brass disks must be placed on three left hooks at lever arms 1,2,3. Right side fixed torque is 10 disk-units. The screen raises level only when left torque also equals 10. Among permutations of [1,2,3], unique arrangement at arms [1,2,3] is [3,2,1]. Animate the actual tilt from torque difference, not a correct-answer light. Raised screen reveals a weathered harbor scene with three silhouette landing outlines left→right boat, moon, bird, whose apparent sizes are respectively 3×, 2×, 1× the cutouts. A separate open demonstration rail with a neutral square lets the player slide between three lamp-distance stops and directly observe scale 1×/2×/3×; it is a physical experiment, no written formula.

### Inference and final action

Main stage has three horizontal slots (left, middle, right), each with three depth stops and puppet rotation. Place [boat,moon,bird], choose projection scales [3,2,1], apply piece rotations boat=3,moon=1,bird=2 from source A. The screen's repaired harbor composition and rotated tracing masks must both be used. Pull light lever; render actual transformed projected masks at all times, with the wall outlines still visible. Success opens the curtain when entire composite matches; controls below stage, never over the projection. No separate three-digit depth code.

Proof: independently transform occupied cells (do not import answer rotations); enumerate 4 rotations per piece, 3! weight permutations and all 3!×3^3×4^3 final states. A solution must require both correct geometry and scale. Check portrait/mobile controls cannot cover the target or the screen weights.

## Episode 06 — `greenhouse` / 玻璃温室的雨

Mint glasshouse with condensation, old irrigation bed, seed cabinet and a three-pot rain bench. End: water runs through repaired pipes, selected flowers grow, archway leaves lift. Five interactions: wipe condensation locally; rotate irrigation elbows; reconstruct growth timelines; carry pots to bench outlets; crank rain pump.

### Source A: irrigation plate (independent)

2-row×3-column elbow grid, all six pieces rotatable (no swapping). Direction numbering N=0,E=1,S=2,W=3; orientation r connects (r,r+1 mod4). Inlet west of cell0, outlet east of cell5. Any other boundary exit leaks. Correct reciprocal connection at every joint plus inlet/outlet gives unique row-major rotations [2,1,2,0,3,0]. Derived path is cell0→3→4→1→2→5. Important: water simulation traces ports and reciprocal neighbors, not a hardcoded green solution. Pipe segments at cells3,1,5 have small beetle, bee, butterfly reliefs; follow water from inlet to infer insect order beetle→bee→butterfly. Empty joints, spills and reversible rotations remain visible. No path-arrow recipe is drawn.

### Source B: botanical flip cards (independent)

Three plant timelines each have three independently reorderable image cards: seed→sprout→flower, identifiable through growing leaf morphology retained between frames. Sunflower has two pointed leaves then broad gold disk; bellflower has paired round leaves then drooping bell; fern has curled tip→partly unfurled→open frond (fern intentionally does not flower). Final cards naturally show visitor insects: sunflower=bee, bellflower=butterfly, fern=beetle. Cards carry split plant-stem contour registration on adjacent edges, making order uniquely inferable from both growth and seam geometry rather than specialist botany. Three pots have recognizable leaf shapes, not plant-name trivia. This source is freely available without solving pipes.

### Inference and final action

Three bench outlets bear the same asymmetric rectangular frame as the pipe's ordered relief inspection strip; tiny inlet-side notch establishes direction, but no prose tells player to transfer the insect order. Carry pots to bench left→right [fern,sunflower,bellflower], inferred by water-trace insects and the reconstructed growth visitors. Pump handle sends actual water through the restored pipe then into the occupied pots; success triggers growth/leaf arch. Source A is physically in the pump circuit, so broken plumbing prevents delivery naturally. Source B completion flag is not a gate. Wrong pot order waters harmlessly, with no “two right” message; never kill plants. Pot-placement puzzle and pipe puzzle stay manipulable until final whole pump action.

Proof: enumerate all 4^6 pipe rotations using independent graph consistency (unique [2,1,2,0,3,0], independently enumerated during design); verify path and relief order; 3! possibilities per growth row; 3! pot arrangements, one final combination. Test pumping broken circuits, wrong pots, fixed pots then broken pipes, source-order reversal, interrupted water animation and reload.

## Episode 07 — `radio` / 海风电台

Teal radio cabin, rounded oscilloscope, three tuning coils, switchboard drawer, harbor window. End: connected radio illuminates three distant buoy lanterns and swings the harbor gate aside. Five interactions: open radio cover; tune three actual waveforms; trace/reconnect switchboard wires; put destination plugs in sockets; turn transmission crank.

### Source A: waveform tuning (independent)

Each coil has a four-step phase dial. Base pulse signal is the asymmetric eight-sample vector [0,1,1,0,-1,0,-1,0]. One phase step circularly shifts by two samples. Three faded reference traces on their own scopes use phases [1,3,2] respectively. Render both traces as visible paths, update shifted signal immediately, and let player align by geometry; do not show percent match. The three coil cases bear shell, wave, star. Beside each target trace is a recovered monochrome pictogram received on that station: shell→lighthouse, wave→sailboat, star→gull. These pictograms are source observations, not “put lighthouse in socket2” instructions. All three scopes freely tunable from entry.

### Source B: open continuity switchboard (independent)

Three removable wire bridges connect upper symbols to lower physical sockets. Internal tracks are visible and cross WITHOUT junctions using raised bridges. Upper pins physically ordered shell,wave,star; lower sockets A,B,C, positions left→right. Correct bridge insertion follows exact noninterchangeable jigsaw terminals: shell wire has circle/triangle ends, wave has square/circle, star has triangle/square. Top terminal shapes are [circle,square,triangle]; destination terminal shapes [square,triangle,circle]. Only inserting both matching ends permits [star,shell,wave] at A,B,C. Wires are actual selectable cable pieces with two endpoints; wrong placement remains laid across the board but is disconnected. The game displays continuity via a traveling pulse when manually cranked, never a green correctness count. This puzzle can be solved without touching tuning.

### Inference and final action

Three outgoing harbor-destination plugs depict lighthouse,sailboat,gull. Infer from independent scope pictograms and reconstructed circuit which belongs to sockets A,B,C: [gull,lighthouse,sailboat]. Place physical plugs, then turn transmitter crank. Current flows through correctly seated cables and aligned carriers into remote lanterns. Correct final physical state requires phases [1,3,2], wire routing [star,shell,wave] and destinations [gull,lighthouse,sailboat]. Wrong states yield neutral static/broken pulse, no slot oracle. Treat destination sockets as actual patchboard, not dropdown/code inputs.

Proof: enumerate four phase candidates against each target sampled trace (all shifts distinct), 3! wire orders using two terminal constraints, and 3! destination arrangements. Independently compose station→socket and station→pictogram maps. Test wrong plug with correct frequency and vice versa; source-order independence; keyboard endpoint selection; reduced-motion pulse/static view.

## Episode 08 — `music` / 风铃与八音盒

Peach/copper music loft with suspended wind chimes, punched rhythm roll, open pin drum and hand crank. End: music box plays a short four-note phrase while a carved lighthouse unfolds. Five interactions: uncover chimes; move/tap bars; rotate rhythm roll; place drum pegs; crank the music box.

### Source A: wind-chime ordering (independent)

Three loose metal chime bars have lengths 9,6,4 visual units and emblems tern,owl,swallow. Three hanger sockets have matching visible end heights 9,6,4 and equal top height; reconstruct descending length order [tern,owl,swallow]. Bars audibly and visibly vibrate at pitches C4,E4,G4 respectively, independent of where hung; no hearing is required because a small mechanical follower shows low/middle/high vertical deflection and the bar silhouettes stay visible. A three-line music-box comb has the same long→short tooth geometry, so players can infer bar emblem→comb row: tern=bottom/low, owl=middle, swallow=top/high. No written letter-note knowledge required. Bars remain tappable after alignment.

### Source B: punched rhythm roll (independent)

Six-beat cylinder rotates in six discrete positions; its seam/alignment mark is asymmetric. Authored base beat slots have [owl,empty,tern,swallow,empty,owl]. The initial cylinder is offset by two. Four physical holes should align to a fixed translucent sleeve with holes at beats [0,2,3,5]; the hole pattern alone also aligns at offset3, but the asymmetric seam notch and unequal rivet pair reject that half-turn, so only offset0 aligns. At the aligned roll, the four holes carry the four bird silhouettes above. Turn cylinder, see real holes move, compare to sleeve. The roll can be solved without interacting with the chimes. A notch and brass rivets on sleeve and pin drum establish beat orientation without a prose instruction.

### Inference and final action

Open drum has three horizontal comb rows and six beat columns; place/remove actual brass pegs in individual holes. Required peg set (row indices low=0,middle=1,high=2) is [(1,0),(0,2),(2,3),(1,5)]. This combines roll timing/bird sequence with chime-emblem pitch correspondence. Turn crank to physically sweep the comb across all six columns; render peg-triggered teeth/notes and then lighthouse unfolding on exact whole pattern. Extraneous pegs cause extra notes; missing ones make rests. Never indicate how many pegs are correct or a target peg count. Audio optional/mute; every note has a visible corresponding tooth vibration. No worksheet or note-name text input.

Proof: enumerate 3! bar placements, six cylinder rotations by hole-vector equality plus notch/rivet registration, all 2^18 pegboards if inexpensive (262,144), or exact set equality plus every single-toggle mutation and randomized boards. Derive expected notes by composing roll emblems with physical bar ordering, not from final peg constant. Test playback interrupt/replay, rapid clicks, mute, reduced motion and no-audio availability.

## Episode 09 — `cargo` / 小船的平衡货舱

Ochre dock, two-pan balance, open cargo boat, low lock tunnel and hinged bow gangway. End: balanced loaded boat floats level through lock and lowers gangway. Five interactions: reveal crates under tarpaulin; weigh using reusable brass cubes; reconstruct bow plate; move crates into boat slots; open water gate.

### Source A: weigh crates (independent)

Four visually equal-size crates carry shell,leaf,star,fish, with hidden physical masses [1,2,3,4] cube units. Reusable standard brass cubes can be placed on the other scale pan, from one to four. Player places a crate and varies cube count, sees real tilt/level; no “weight=3” automatic journal solution. Scale automatically returns old crate to dock when swapped, no consumption. Relevant observations can be saved as raw pan contents and tilt. Distinct crate mass is discovered through experiment, not printed numbers or arithmetic questions.

### Source B: bow plate assembly (independent)

Three rotating square tiles depict the same boat from above and one star crate under its bow canopy. Base tiles have edge rivet pairs and a continuous keel: left rotation2, center rotation1, right rotation3 uniquely complete the picture and outer corner cuts. Implement geometry as asymmetric polygons/line endpoints and independently match edges; the completed image places the star crate nearest the visible pointed bow. This reveals orientation/constraint, not the full cargo answer. Art includes rear round stern and pointed bow, repeated on actual boat; no “fish must go in rightmost slot” prose.

### Inference and final action

Four boat slots have lever arms [-3,-1,+1,+3] around visible central axle; pointed bow is right, with canopy over its outer slot. Place all four crates. Vessel trim equals sum(mass×arm), rendered as tilt; this is honest physics, not an answer oracle. Exactly two permutations balance: masses [2,4,1,3] and [3,1,4,2]. Source B places the star crate (mass3) at the outer bow, selecting [leaf,fish,shell,star] / [2,4,1,3] and eliminating mirrored [star,shell,fish,leaf]. Open gate only when boat is level AND canopy cargo matches observed star silhouette; the canopy physically accommodates star-marked crate lid profile. Wrong mass trim leaves boat safely at dock; wrong bow profile catches on canopy stop. No “3/4 correct” count. The scale is unnecessary as a solved flag: a player may infer weights experimentally using the boat itself.

Proof: enumerate all 24 mass permutations against zero torque, assert exactly two; apply star-at-bow geometric clue to assert unique [2,4,1,3]. Enumerate 4^3 bow plate rotations via actual seam constraints. Test equal-torque mirror failure, empty/duplicate crates, scale pan swap, repeated gate press and reload at unbalanced states.

## Episode 10 — `observatory` / 星图之外的归途

Navy/copper observatory atop the ship, two observation windows, star disc table, brass map and rotating telescope. End: telescope aligns with home light, roof petals open and ship follows a visible star path home. Six interactions: slide roof shutters; rotate star disc; move transparent observation strips; inspect map using movable lens; position telescope; pull roof lever.

### Source A: star disc (independent)

Eight-sector disc bears asymmetric star brightness sequence [1,3,1,2,4,1,2,2] clockwise starting from its clipped rim notch. Fixed sky ring shows that exact sequence rotated clockwise by3 sectors. Rotate disc until all star sizes align. At that orientation, disc's three punched windows expose three constellation emblems at rim positions: gull at sector1, shell at sector4, crown at sector6. Author the underlying stationary emblem ring so these result from the actual transform; do not reveal them through a success-text table. Holes and star overlay update at every rotation, with no correctness highlight. Emblem ring can be recorded as raw observations but not a final angle answer.

### Source B: two-window navigation strips (independent)

A fixed 4×4 harbor chart, north up, has candidate home beacons at coordinates (column,row), 0-based: gull=(0,1),shell=(2,2),crown=(3,0). Two transparent sightline strips slide over it. One shows an ascending diagonal through (0,0),(1,1),(2,2),(3,3); the other a descending diagonal through (0,4),(1,3),(2,2),(3,1), clipped to the chart. Strips have asymmetric registration rivets that align only in their authored offsets; movable integer offsets range -2…2 and 180° flip is allowed, but rivet/corner geometry rejects reversed registration. At aligned strips, unique intersection is shell=(2,2). Render every line at every position; no “intersection found” overlay. Actual old observation-window scratches have the same two diagonal shapes, giving the strips in-world purpose.

### Inference and final action

The navigation chart picks the home emblem shell; the aligned star disc supplies its bearing sector4. A physical telescope has eight azimuth detents. Its elevation rocker has low/mid/high stops; chart altitude is represented by the beacon's vertical row projected onto three horizon bands (row0=high, row1=mid, rows2–3=low), matching the window horizon trim. Set azimuth4 and elevation low (0), then pull roof lever. End-state validation also requires correctly aligned disc and strips because those are in the actual sighting mechanism; source flags are not required. Telescope beam drawn through roof aperture makes relation physical. Do not label a destination “correct” or offer a target icon picker.

Proof: eight rotations of the brightness vector are distinct, so unique disc alignment3; independently transform holes to derive emblem positions. Enumerate strip offsets and flips using rivet alignment and compute line intersections; only shared coordinate (2,2) maps to shell. Enumerate 8×3 telescope orientations and all single-source wrong states. Verify actual movable magnifier reveals only local tiny chart rivets in its footprint, and the full map never appears by merely equipping it. This episode's lens is an inspection tool, not a repeat of Foglight color classification.

## Runtime and verification implementation boundaries

The campaign shell may share versioned save envelopes, inventory tray, tooltips, reversible snapshots, requested hints, focus-safe detail modal and scene navigation. Concrete mechanics require separate visual/interaction components; do not abstract all seven into a generic token list and confirm button. Physical validators must be pure and separately testable. Proposed stable IDs: clockwork, shadow, greenhouse, radio, music, cargo, observatory. Existing selectors maintain old IDs and keys.

Order of work: 04–06 first (gears/shadow/pipes), 07–09 next (waves/music/balance), 10 last (two-source spatial navigation), then full ten-episode traversal. Parallel art/mechanic work is safe only with shared typed state/episode contract frozen first. TDD requirement: independent verifier derives outcomes from clue geometry/data before runtime implementations. Verify normal and public preview, earned unlock preservation, non-destructive replay, future-version save protection, malformed-save reconstruction, pause/inert timer behavior, all control access modes, mobile layout, full-opacity reopened solved clues, and actual browser screenshots. Headless React tests must not be described as a browser visual pass.
