# Expedition 02: tools meet physical targets

## Interaction
- Keep the two-room search/revisit chain and all puzzle facts unchanged.
- Select a carried object, then activate the actual dusty paper, brass keyhole, square shaft or rope end. Projector installation uses its three existing physical slots.
- Use native buttons, visible focus rings and at least 44px targets; the same activation works with pointer, touch and keyboard. No drag precision or hover dependency.
- Show selected object and cancellation inside the modal. Escape cancels the selected tool and closes; ordinary close or travel may carry the visibly selected object. Wrong targets describe the mismatch without consuming objects. Empty-handed activation inspects the material; repeated activation on installed objects preserves progress.
- Remove generic use buttons. Solved ledger remains a readable table plus diagrams; installed parts visibly remain in position. Feedback lives inside the active dialog for assistive technology.

## Boundaries
No reducer, save version, room progression, clue values, challenge-mode policy, HealthGate or whole-board confirmation changes. Target labels describe visible materials, without matching the required inventory object or disclosing hidden counts.

## Verification
TDD: new `scripts/verify-adventure-tool-targets.mjs` first failed on the absent keyhole target. It exercises mounted React handlers, wrong object/no-loss, cancellation, repeated operations, room return, saved re-mount, readable solved ledger, board prerequisite and HealthGate. Existing adventure UI regression was migrated from the removed generic button to actual targets and still runs the full chapter path. Browser rendering is not claimed: executor Chromium startup is blocked in this environment.
