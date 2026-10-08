import { recognizeDropDigit } from "./dropGeometry";
import { lensClues, observedClues } from "./lens";
import type {
  ChapterAction,
  ChapterDefinition,
  ChapterState,
  PuzzleDefinition,
  PuzzleProgress,
  PuzzleInput,
  Requirement,
} from "./types";
import {
  countSudokuSolutions,
  initialInput,
  simulateDrops,
  validInput,
  validatePuzzle,
} from "./validators";

export const CHAPTER_SAVE_VERSION = 1;
const HISTORY_LIMIT = 40;
const SAVE_LIMIT = 240_000;
function copy(value: PuzzleInput): PuzzleInput {
  // Copy only known fields: extra persisted properties cannot inflate history snapshots.
  switch (value.kind) {
    case "arrangement":
      return { kind: value.kind, slots: [...value.slots] };
    case "code":
      return { kind: value.kind, value: value.value };
    case "filter":
      return { kind: value.kind, value: value.value, lens: value.lens, ...(value.position ? { position: { ...value.position } } : {}) };
    case "drop":
      return { kind: value.kind, predictions: [...value.predictions] };
    case "sudoku":
      return { kind: value.kind, cells: [...value.cells] };
    case "search":
      return { kind: value.kind };
  }
}
function progress(puzzle: PuzzleDefinition): PuzzleProgress {
  return {
    input: initialInput(puzzle),
    undo: [],
    redo: [],
    solved: false,
    hints: 0,
    seenLenses: [],
    seenClues: [],
    attempts: 0,
  };
}
export function initialChapter(definition: ChapterDefinition): ChapterState {
  return {
    started: false,
    scene: definition.scenes[0].id,
    found: [],
    revealed: [],
    usedTools: [],
    puzzles: Object.fromEntries(
      definition.puzzles.map((puzzle) => [puzzle.id, progress(puzzle)]),
    ),
    complete: false,
  };
}
export function requirementsMet(
  state: ChapterState,
  requirements: readonly Requirement[],
): boolean {
  return requirements.every((requirement) => {
    switch (requirement.kind) {
      case "item":
        return state.found.includes(requirement.id);
      case "puzzle":
        return !!state.puzzles[requirement.id]?.solved;
      case "reveal":
        return state.revealed.includes(requirement.id);
      case "tool":
        return state.usedTools.includes(requirement.id);
    }
  });
}
export function puzzleAvailable(
  definition: ChapterDefinition,
  state: ChapterState,
  puzzle: PuzzleDefinition,
): boolean {
  const scene = definition.scenes.find(
    (candidate) => candidate.id === puzzle.scene,
  );
  return (
    state.started &&
    !!scene &&
    requirementsMet(state, scene.requires) &&
    requirementsMet(state, puzzle.requires)
  );
}
function updatePuzzle(
  state: ChapterState,
  id: string,
  value: PuzzleProgress,
): ChapterState {
  return { ...state, puzzles: { ...state.puzzles, [id]: value } };
}
/** All actions are local and immutable. Close/cancel belongs to UI and cannot submit a board. */
export function reduceChapter(
  definition: ChapterDefinition,
  state: ChapterState,
  action: ChapterAction,
): ChapterState {
  if (action.type === "resetChapter")
    return { ...initialChapter(definition), started: true };
  if (action.type === "begin") return { ...state, started: true };
  if (!state.started) return state;
  if (action.type === "travel") {
    const scene = definition.scenes.find(
      (candidate) => candidate.id === action.scene,
    );
    return scene && requirementsMet(state, scene.requires)
      ? { ...state, scene: scene.id }
      : state;
  }
  const currentScene = definition.scenes.find(
    (scene) => scene.id === state.scene,
  );
  if (!currentScene || !requirementsMet(state, currentScene.requires))
    return state;
  if (action.type === "reveal") {
    const reveal = definition.reveals.find(
      (candidate) => candidate.id === action.id,
    );
    return reveal &&
      reveal.scene === state.scene &&
      requirementsMet(state, reveal.requires) &&
      !state.revealed.includes(reveal.id)
      ? { ...state, revealed: [...state.revealed, reveal.id] }
      : state;
  }
  if (action.type === "collect") {
    const pickup = definition.pickups.find(
      (candidate) => candidate.item === action.item,
    );
    if (
      !pickup ||
      pickup.scene !== state.scene ||
      !requirementsMet(state, pickup.requires) ||
      state.found.includes(pickup.item)
    )
      return state;
    let next = { ...state, found: [...state.found, pickup.item] };
    // Collection has no answer board: finding the final object completes its checklist.
    for (const search of definition.puzzles)
      if (
        search.kind === "search" &&
        !next.puzzles[search.id].solved &&
        puzzleAvailable(definition, next, search) &&
        validatePuzzle(search, next.puzzles[search.id].input, next.found)
      ) {
        next = updatePuzzle(next, search.id, {
          ...next.puzzles[search.id],
          solved: true,
        });
        next = {
          ...next,
          found: [...new Set([...next.found, ...search.rewards])],
          complete: next.complete || search.id === definition.finish,
        };
      }
    return next;
  }
  if (action.type === "use") {
    const tool = definition.tools.find(
      (candidate) => candidate.id === action.id,
    );
    return tool &&
      tool.scene === state.scene &&
      tool.item === action.item &&
      state.found.includes(tool.item) &&
      requirementsMet(state, tool.requires) &&
      !state.usedTools.includes(tool.id)
      ? { ...state, usedTools: [...state.usedTools, tool.id] }
      : state;
  }
  const puzzle = definition.puzzles.find(
    (candidate) => candidate.id === action.id,
  );
  if (
    !puzzle ||
    puzzle.scene !== state.scene ||
    !puzzleAvailable(definition, state, puzzle)
  )
    return state;
  const current = state.puzzles[puzzle.id];
  if (action.type === "hint") {
    if (action.mode === "challenge") return state;
    return updatePuzzle(state, puzzle.id, {
      ...current,
      hints: Math.min(puzzle.hints.length, current.hints + 1),
    });
  }
  if (current.solved) {
    // Solved optical equipment stays inspectable; changing lenses cannot change the answer.
    if (
      action.type === "input" &&
      puzzle.kind === "filter" &&
      action.input.kind === "filter" &&
      current.input.kind === "filter" &&
      validInput(puzzle, action.input) &&
      action.input.value === current.input.value
    ) {
      return updatePuzzle(state, puzzle.id, {
        ...current,
        input: copy(action.input),
        ...discover(puzzle, current, action.input),
      });
    }
    return state;
  }
  if (action.type === "input" || action.type === "resetPuzzle") {
    const input = action.type === "input" ? action.input : initialInput(puzzle);
    if (
      !validInput(puzzle, input) ||
      JSON.stringify(input) === JSON.stringify(current.input)
    )
      return state;
    return updatePuzzle(state, puzzle.id, {
      ...current,
      input: copy(input),
      ...discover(puzzle, current, input),
      undo: input.kind === "filter" && current.input.kind === "filter" && input.value === current.input.value
        ? current.undo : [...current.undo, copy(current.input)].slice(-HISTORY_LIMIT),
      redo: [],
    });
  }
  if (action.type === "undo" || action.type === "redo") {
    const source = current[action.type];
    if (!source.length) return state;
    const reverse = action.type === "undo" ? "redo" : "undo";
    return updatePuzzle(state, puzzle.id, {
      ...current,
      input: copy(source[source.length - 1]),
      [action.type]: source.slice(0, -1),
      [reverse]: [...current[reverse], copy(current.input)].slice(
        -HISTORY_LIMIT,
      ),
    });
  }
  if (action.type === "confirm") {
    const solved = validatePuzzle(puzzle, current.input, state.found);
    const next = updatePuzzle(state, puzzle.id, {
      ...current,
      attempts: Math.min(9999, current.attempts + 1),
      solved,
      undo: solved ? [] : current.undo,
      redo: solved ? [] : current.redo,
    });
    return solved
      ? {
          ...next,
          found: [...new Set([...next.found, ...puzzle.rewards])],
          complete: puzzle.id === definition.finish || next.complete,
        }
      : next;
  }
  return state;
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function ids(value: unknown, allowed: string[]): string[] {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (id): id is string =>
              typeof id === "string" && allowed.includes(id),
          ),
        ),
      ].slice(0, allowed.length)
    : [];
}
function bounded(value: unknown, max: number): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? Math.min(value, max)
    : 0;
}
/** Future saves must remain untouched until the player explicitly chooses a scoped reset. */
export function isFutureChapterSave(
  definition: ChapterDefinition,
  raw: string | null,
): boolean {
  if (!raw || raw.length > SAVE_LIMIT) return false;
  try {
    const envelope: unknown = JSON.parse(raw);
    return (
      record(envelope) &&
      envelope.chapter === definition.id &&
      ((typeof envelope.version === "number" &&
        envelope.version > CHAPTER_SAVE_VERSION) ||
        (envelope.version === CHAPTER_SAVE_VERSION &&
          typeof envelope.revision === "number" &&
          envelope.revision > definition.revision))
    );
  } catch {
    return false;
  }
}
export function serializeChapter(
  definition: ChapterDefinition,
  state: ChapterState,
): string {
  return JSON.stringify({
    version: CHAPTER_SAVE_VERSION,
    chapter: definition.id,
    revision: definition.revision,
    state,
  });
}
/** Additive migration: earlier cabin/adventure saves live under untouched keys.
 * Unknown future chapter versions are not interpreted as today's format.
 * Provenance is rebuilt to reject impossible gates/rewards and forged completion.
 */
export function parseChapter(
  definition: ChapterDefinition,
  raw: string | null,
): ChapterState {
  const initial = initialChapter(definition);
  if (!raw || raw.length > SAVE_LIMIT) return initial;
  try {
    const envelope: unknown = JSON.parse(raw);
    if (
      !record(envelope) ||
      envelope.version !== CHAPTER_SAVE_VERSION ||
      envelope.chapter !== definition.id ||
      (envelope.revision !== definition.revision &&
        !(definition.id === "foglight" && definition.revision === 2 && envelope.revision === 1)) ||
      !record(envelope.state)
    )
      return initial;
    const saved = envelope.state;
    const state = { ...initial, started: saved.started === true };
    if (!state.started) return initial;
    const savedPuzzles: Record<string, unknown> = record(saved.puzzles) ? { ...saved.puzzles } : {};
    // Revision 1's solved boards earned real unlocks. Only exact valid old answers
    // are upgraded; pending replacement boards reset, never granting progress.
    if (definition.id === "foglight" && definition.revision === 2 && envelope.revision === 1) {
      const replacements = [
        { id: "pattern-tray", old: ["arrow-S3", "arrow-W1", "sail-W1", "sail-N2", "vane-N2", "vane-E3"] },
        { id: "foglight-console", old: ["shell", "star", "fish", "wave", "anchor", "sail"] },
      ];
      for (const replacement of replacements) {
        const prior = savedPuzzles[replacement.id];
        const puzzle = definition.puzzles.find(p => p.id === replacement.id);
        if (!puzzle || !record(prior)) continue;
        const input = prior.input;
        const earned = prior.solved === true && record(input) && input.kind === "arrangement" &&
          Array.isArray(input.slots) && input.slots.length === replacement.old.length &&
          input.slots.every((value, index) => value === replacement.old[index]);
        const upgraded: PuzzleInput = earned && puzzle.kind === "arrangement"
          ? { kind: "arrangement", slots: [...puzzle.solution] }
          : earned && puzzle.kind === "code"
            ? { kind: "code", value: puzzle.solution }
            : initialInput(puzzle);
        savedPuzzles[replacement.id] = { ...prior, input: upgraded, solved: earned, hints: 0, undo: [], redo: [] };
      }
    }
    if (definition.id === "foglight" && envelope.revision === 1) {
      const prior = savedPuzzles["gravity-lock"];
      const puzzle = definition.puzzles.find(p => p.id === "gravity-lock");
      if (puzzle?.kind === "drop" && record(prior)) {
        const input = prior.input;
        const earned = prior.solved === true && record(input) && input.kind === "drop" &&
          Array.isArray(input.predictions) && input.predictions.length === 3 &&
          input.predictions.every((value, index) => value === [6,5,8][index]);
        savedPuzzles[puzzle.id] = { ...prior, hints: 0, solved: earned, undo: [], redo: [], input: earned
          ? { kind: "drop", predictions: puzzle.boards.map(board => recognizeDropDigit(simulateDrops(board.model, board.placements).cells, board.model.width, board.model.height)) }
          : initialInput(puzzle) };
      }
    }
    const wantItems = ids(
      saved.found,
      definition.items.map((item) => item.id),
    );
    const wantReveals = ids(
      saved.revealed,
      definition.reveals.map((reveal) => reveal.id),
    );
    const wantTools = ids(
      saved.usedTools,
      definition.tools.map((tool) => tool.id),
    );
    for (const puzzle of definition.puzzles) {
      const stored = savedPuzzles[puzzle.id];
      if (!record(stored)) continue;
      const target = state.puzzles[puzzle.id];
      if (validInput(puzzle, stored.input)) target.input = copy(stored.input);
      target.undo = Array.isArray(stored.undo)
        ? stored.undo
            .slice(-HISTORY_LIMIT)
            .filter((input) => validInput(puzzle, input))
            .map(copy)
        : [];
      target.redo = Array.isArray(stored.redo)
        ? stored.redo
            .slice(-HISTORY_LIMIT)
            .filter((input) => validInput(puzzle, input))
            .map(copy)
        : [];
      target.hints = bounded(stored.hints, puzzle.hints.length);
      if (puzzle.kind === "filter") {
        target.seenLenses = ids(
          stored.seenLenses,
          puzzle.lenses.map((lens) => lens.id),
        );
        const clues = lensClues(puzzle);
        // Legacy saves really displayed the whole selected layer. Keep those earned notes.
        target.seenClues = Array.isArray(stored.seenClues)
          ? ids(stored.seenClues, clues.map(clue => clue.id))
          : clues.filter(clue => target.seenLenses.includes(clue.lens)).map(clue => clue.id);
      }
      target.attempts = bounded(stored.attempts, 9999);
    }
    // Every productive pass adds at least one finite gate, item or solved puzzle.
    let changed = true;
    while (changed) {
      changed = false;
      const add = (array: string[], id: string) => {
        if (!array.includes(id)) {
          array.push(id);
          changed = true;
        }
      };
      const reachableScene = (id: string) =>
        requirementsMet(
          state,
          definition.scenes.find((scene) => scene.id === id)?.requires ?? [],
        );
      for (const reveal of definition.reveals)
        if (
          wantReveals.includes(reveal.id) &&
          reachableScene(reveal.scene) &&
          requirementsMet(state, reveal.requires)
        )
          add(state.revealed, reveal.id);
      for (const pickup of definition.pickups)
        if (
          wantItems.includes(pickup.item) &&
          reachableScene(pickup.scene) &&
          requirementsMet(state, pickup.requires)
        )
          add(state.found, pickup.item);
      for (const tool of definition.tools)
        if (
          wantTools.includes(tool.id) &&
          state.found.includes(tool.item) &&
          reachableScene(tool.scene) &&
          requirementsMet(state, tool.requires)
        )
          add(state.usedTools, tool.id);
      for (const puzzle of definition.puzzles) {
        const stored = savedPuzzles[puzzle.id],
          target = state.puzzles[puzzle.id];
        if (
          !target.solved &&
          record(stored) &&
          stored.solved === true &&
          puzzleAvailable(definition, state, puzzle) &&
          validatePuzzle(puzzle, target.input, state.found)
        ) {
          target.solved = true;
          target.undo = [];
          target.redo = [];
          changed = true;
          for (const reward of puzzle.rewards) add(state.found, reward);
        }
      }
    }
    // Preserve inventory ordering across clean round trips without trusting new IDs.
    state.found.sort((a, b) => wantItems.indexOf(a) - wantItems.indexOf(b));
    state.revealed.sort(
      (a, b) => wantReveals.indexOf(a) - wantReveals.indexOf(b),
    );
    state.usedTools.sort((a, b) => wantTools.indexOf(a) - wantTools.indexOf(b));
    const scene = definition.scenes.find(
      (candidate) => candidate.id === saved.scene,
    );
    if (scene && requirementsMet(state, scene.requires)) state.scene = scene.id;
    state.complete = state.puzzles[definition.finish]?.solved === true;
    return state;
  } catch {
    return initial;
  }
}

function validTetromino(
  cells: readonly (readonly [number, number])[],
): boolean {
  if (
    cells.length !== 4 ||
    new Set(cells.map(String)).size !== 4 ||
    cells.some(
      ([x, y]) =>
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        x < 0 ||
        y < 0 ||
        x > 3 ||
        y > 3,
    )
  )
    return false;
  const reached = new Set([0]);
  for (let pass = 0; pass < 4; pass++)
    for (let i = 0; i < 4; i++)
      if (
        [...reached].some(
          (j) =>
            Math.abs(cells[i][0] - cells[j][0]) +
              Math.abs(cells[i][1] - cells[j][1]) ===
            1,
        )
      )
        reached.add(i);
  return reached.size === 4;
}
/** Finite reachability validation, not a general graph/quest language. */
export function lintChapter(definition: ChapterDefinition): string[] {
  const errors: string[] = [];
  const namespaces = {
    item: definition.items.map((item) => item.id),
    puzzle: definition.puzzles.map((puzzle) => puzzle.id),
    reveal: definition.reveals.map((reveal) => reveal.id),
    tool: definition.tools.map((tool) => tool.id),
  };
  for (const [kind, list] of Object.entries({
    ...namespaces,
    scene: definition.scenes.map((scene) => scene.id),
  })) {
    if (new Set(list).size !== list.length) errors.push(`Duplicate ${kind} ID`);
    if (list.some((id) => !/^[a-z][a-z0-9-]*$/.test(id)))
      errors.push(`Invalid ${kind} ID`);
  }
  if (!definition.scenes.length) return [...errors, "Chapter has no scenes"];
  if (definition.scenes[0].requires.length)
    errors.push("Initial scene must be accessible");
  const owners = [
    ...definition.pickups.map((pickup) => pickup.item),
    ...definition.puzzles.flatMap((puzzle) => puzzle.rewards),
  ];
  if (new Set(owners).size !== owners.length)
    errors.push("Item has multiple producers");
  for (const id of owners)
    if (!namespaces.item.includes(id)) errors.push(`Unknown item ${id}`);
  for (const item of namespaces.item)
    if (!owners.includes(item)) errors.push(`Item has no producer: ${item}`);
  const entries = [
    ...definition.scenes,
    ...definition.reveals,
    ...definition.pickups,
    ...definition.tools,
    ...definition.puzzles,
  ];
  for (const entry of entries) {
    for (const requirement of entry.requires)
      if (!namespaces[requirement.kind]?.includes(requirement.id))
        errors.push(`Unknown ${requirement.kind}: ${requirement.id}`);
    if (
      "scene" in entry &&
      !definition.scenes.some((scene) => scene.id === entry.scene)
    )
      errors.push(`Unknown scene ${entry.scene}`);
  }
  for (const tool of definition.tools) {
    if (!namespaces.item.includes(tool.item))
      errors.push(`Unknown tool item ${tool.item}`);
    const target = tool.target;
    const boundPuzzle = definition.puzzles.find(puzzle => puzzle.id === target?.closeup);
    if ((tool.installsItem !== undefined && typeof tool.installsItem !== "boolean") ||
      !target || !target.label?.trim() || !target.description?.trim() ||
      (target.closeup !== "search" && (!boundPuzzle || boundPuzzle.kind === "search" || boundPuzzle.scene !== tool.scene)) ||
      ![target.x, target.y, target.width, target.height].every(Number.isFinite) ||
      target.x < 0 || target.y < 0 || target.width <= 0 || target.height <= 0 ||
      target.x + target.width > 100 || target.y + target.height > 100)
      errors.push(`Invalid tool target: ${tool.id}`);
  }
  if (!namespaces.puzzle.includes(definition.finish))
    errors.push("Unknown finish puzzle");
  for (const puzzle of definition.puzzles) {
    if (!validInput(puzzle, initialInput(puzzle)))
      errors.push(`Invalid initial input: ${puzzle.id}`);
    switch (puzzle.kind) {
      case "arrangement":
        if (
          puzzle.solution.length !== puzzle.slots.length ||
          puzzle.pieces.length !== puzzle.slots.length ||
          new Set(puzzle.pieces.map((piece) => piece.id)).size !==
            puzzle.pieces.length ||
          !validInput(puzzle, { kind: puzzle.kind, slots: puzzle.solution })
        )
          errors.push(`Invalid arrangement: ${puzzle.id}`);
        if (puzzle.grid) {
          const slots = puzzle.grid.flatMap(cell => "slot" in cell ? [cell.slot] : []);
          const stamps = [...puzzle.grid.flatMap(cell => "stamp" in cell ? [cell.stamp] : []), ...puzzle.pieces.map(piece => piece.stamp)];
          if (puzzle.grid.length !== 16 || slots.length !== puzzle.slots.length ||
            new Set(slots).size !== slots.length || slots.some(slot => !Number.isInteger(slot) || slot < 0 || slot >= puzzle.slots.length) ||
            stamps.some(stamp => !stamp || !["N", "E", "S", "W"].includes(stamp.direction) || !Number.isInteger(stamp.dots) || stamp.dots < 1 || stamp.dots > 4))
            errors.push(`Invalid classification grid: ${puzzle.id}`);
        }
        break;
      case "code":
      case "filter":
        if (
          !Number.isInteger(puzzle.length) ||
          puzzle.length < 1 ||
          puzzle.length > 12 ||
          !new RegExp(`^\\d{${puzzle.length}}$`).test(puzzle.solution)
        )
          errors.push(`Invalid code: ${puzzle.id}`);
        if (
          puzzle.kind === "filter" &&
          (puzzle.lenses.length < 2 ||
            new Set(puzzle.lenses.map((lens) => lens.id)).size !==
              puzzle.lenses.length)
        )
          errors.push(`Invalid lenses: ${puzzle.id}`);
        break;
      case "sudoku":
        if (countSudokuSolutions(puzzle.givens) !== 1)
          errors.push(`Sudoku is not unique: ${puzzle.id}`);
        break;
      case "search":
        for (const item of puzzle.items)
          if (!namespaces.item.includes(item))
            errors.push(`Unknown search item ${item}`);
        break;
      case "drop":
        if (!puzzle.boards.length) errors.push(`Empty drop: ${puzzle.id}`);
        for (const board of puzzle.boards) {
          const { model } = board;
          if (
            !Number.isInteger(model.width) ||
            model.width < 1 ||
            model.width > 12 ||
            !Number.isInteger(model.height) ||
            model.height < 1 ||
            model.height > 16 ||
            model.pieces.length !== 3 ||
            board.placements.length !== model.pieces.length ||
            model.pieces.some((piece) => !validTetromino(piece.cells)) ||
            model.fixed.some(
              ([x, y]) =>
                !Number.isInteger(x) ||
                !Number.isInteger(y) ||
                x < 0 ||
                x >= model.width ||
                y < 0 ||
                y >= model.height,
            ) ||
            new Set(model.fixed.map(String)).size !== model.fixed.length ||
            !simulateDrops(model, board.placements).valid ||
            recognizeDropDigit(simulateDrops(model, board.placements).cells, model.width, model.height) < 0
          )
            errors.push(`Invalid drop board: ${board.id}`);
        }
        break;
      default:
        errors.push(`Missing validator: ${(puzzle as PuzzleDefinition).id}`);
    }
  }
  const reachable = initialChapter(definition);
  reachable.started = true;
  let changed = true;
  while (changed) {
    changed = false;
    const add = (array: string[], id: string) => {
      if (!array.includes(id)) {
        array.push(id);
        changed = true;
      }
    };
    const sceneReady = (id: string) => {
      const scene = definition.scenes.find((scene) => scene.id === id);
      return !!scene && requirementsMet(reachable, scene.requires);
    };
    for (const reveal of definition.reveals)
      if (
        sceneReady(reveal.scene) &&
        requirementsMet(reachable, reveal.requires)
      )
        add(reachable.revealed, reveal.id);
    for (const pickup of definition.pickups)
      if (
        sceneReady(pickup.scene) &&
        requirementsMet(reachable, pickup.requires)
      )
        add(reachable.found, pickup.item);
    for (const tool of definition.tools)
      if (
        sceneReady(tool.scene) &&
        reachable.found.includes(tool.item) &&
        requirementsMet(reachable, tool.requires)
      )
        add(reachable.usedTools, tool.id);
    for (const puzzle of definition.puzzles)
      if (
        !reachable.puzzles[puzzle.id].solved &&
        sceneReady(puzzle.scene) &&
        requirementsMet(reachable, puzzle.requires) &&
        (puzzle.kind !== "search" ||
          puzzle.items.every((item) => reachable.found.includes(item)))
      ) {
        reachable.puzzles[puzzle.id].solved = true;
        changed = true;
        for (const item of puzzle.rewards) add(reachable.found, item);
      }
  }
  for (const scene of definition.scenes)
    if (!requirementsMet(reachable, scene.requires))
      errors.push(`Unreachable scene: ${scene.id}`);
  for (const puzzle of definition.puzzles)
    if (!reachable.puzzles[puzzle.id].solved)
      errors.push(`Unreachable puzzle: ${puzzle.id}`);
  for (const item of definition.items)
    if (!reachable.found.includes(item.id))
      errors.push(`Unreachable item: ${item.id}`);
  for (const tool of definition.tools)
    if (!reachable.usedTools.includes(tool.id))
      errors.push(`Unreachable tool: ${tool.id}`);
  for (const reveal of definition.reveals)
    if (!reachable.revealed.includes(reveal.id))
      errors.push(`Unreachable reveal: ${reveal.id}`);
  return errors;
}

function discover(puzzle: PuzzleDefinition, current: PuzzleProgress, input: PuzzleInput) {
  if (puzzle.kind !== "filter" || input.kind !== "filter" || !input.position) return {};
  const seenClues = [...new Set([...current.seenClues, ...observedClues(puzzle, input.lens, input.position).map(clue => clue.id)])];
  const seenLenses = puzzle.lenses.filter(lens => lensClues(puzzle).filter(clue => clue.lens === lens.id).every(clue => seenClues.includes(clue.id))).map(lens => lens.id);
  return { seenClues, seenLenses };
}
