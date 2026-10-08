/** Assistance is a separate preference: it never enters or resets the puzzle save. */
export type GuidanceMode = "easy" | "standard" | "challenge";
export const MODE_KEY = "play-buddy:escape:guidance:v1";
export function parseMode(raw: unknown): GuidanceMode {
  return raw === "easy" || raw === "challenge" ? raw : "standard";
}
export function guidancePolicy(mode: GuidanceMode) {
  return { automaticRules: mode === "easy", hints: mode !== "challenge", markers: mode !== "challenge" };
}
export function visibleDetail<T extends string>(mode: GuidanceMode, detail: T | null): T | null {
  return mode === "challenge" && detail === "hints" ? null : detail;
}
export function changeGuidance<T extends { mode: GuidanceMode; hintLevel: number; detail: string | null }>(state: T, mode: GuidanceMode): T {
  return { ...state, mode, hintLevel: 0, detail: state.detail === "hints" ? null : state.detail };
}
