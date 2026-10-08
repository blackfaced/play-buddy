# Starlight v2.2: assistance and reversible picture

The standard mode is the default. Simple mode supplies automatic explanation; standard
mode offers discovery, rule, and explicitly labelled answer steps only on request;
challenge removes the hint entry and visual hotspot markers. Keyboard focus labels
remain available. Changing mode keeps puzzle progress, scratch work and current inputs.
The mode preference uses `play-buddy:escape:guidance:v1`, separate from puzzle saves.
Invalid/missing preferences fall back to standard. The diagnostic shortcut has been
replaced with a small version and mode selector.

Triangle explanations are gated in both closeup and notebook. Wood rules and route
explanations are gated too. Natural in-world clues, actual symbol order, map geometry,
and interaction instructions remain present. Challenge changes assistance, not answers.

Wood strips can be placed freely, removed, and replaced. All five must be placed before
“确认整幅画” is enabled. Only that action checks the complete arrangement; a failed
check does not reveal a correct slot/count and leaves the arrangement intact. Version
1/2 puzzle saves migrate to version 3, keeping earned progress.

## Verification

- `npm run verify:escape`: pure puzzle/save/migration regressions, SSR assistance
  rendering, and full React interaction tests for notebook/scratch, hint escalation,
  controlled-mode stale-dialog dismissal, free wood placement/removal/confirmation,
  progress preservation, and health-lock gating.
- `npm run build` and focused ESLint on changed escape files/scripts.
- The interaction harness uses a test-only health-store double and real EscapeRoom
  components. It does not replace a browser visual/accessibility audit. Browser launch
  was unavailable in this execution environment; no visual-browser pass is claimed.

The standalone cabin accepts optional `mode`, `onModeChange`, and `renderCompletion`
props to integrate an outer adventure without changing its own save/state lifecycle.
