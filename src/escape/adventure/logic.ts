/** Independent expedition save. Cabin progress remains owned by its original reducer. */
export type Room = "cabin" | "navigation" | "storeroom" | "deck";
export const ITEMS = [
  "key",
  "battery",
  "crank",
  "brush",
  "lens",
  "hook",
  "card",
] as const;
export type ExpeditionItem = (typeof ITEMS)[number];
export type Target = "door" | "ledger" | "projector" | "winch";
export type Cover = "compassCase" | "manifest" | "canvas";
export const ROW_CLUES = [[1], [1], [5], [1, 1, 1], [3]] as const;
export const COL_CLUES = [[2], [1, 1], [5], [1, 1], [2]] as const;
export const ANCHOR = "0010000100111111010101110"
  .split("")
  .map((c) => c === "1");
export interface AdventureState {
  started: boolean;
  room: Room;
  compassCaseOpen: boolean;
  manifestMoved: boolean;
  canvasLifted: boolean;
  found: ExpeditionItem[];
  storeroomOpen: boolean;
  ledgerClean: boolean;
  safeOpen: boolean;
  batteryMounted: boolean;
  lensMounted: boolean;
  cardMounted: boolean;
  projectorOn: boolean;
  cells: boolean[];
  panelOpen: boolean;
  crankMounted: boolean;
  hookMounted: boolean;
  gangwayDown: boolean;
  complete: boolean;
}
export type AdventureAction =
  | { type: "begin" }
  | { type: "resetChapter" }
  | { type: "travel"; room: Room }
  | { type: "reveal"; cover: Cover }
  | { type: "collect"; item: ExpeditionItem }
  | { type: "use"; item: ExpeditionItem; target: Target }
  | { type: "safe"; code: string }
  | { type: "toggleCell"; index: number }
  | { type: "clearPanel" }
  | { type: "confirmPanel" }
  | { type: "operateWinch" }
  | { type: "finish" };
export const ADVENTURE_KEY = "play-buddy:escape:expedition:v1";
export const SAFE_CODE = "527";
export function initialAdventure(): AdventureState {
  return {
    started: false,
    room: "cabin",
    compassCaseOpen: false,
    manifestMoved: false,
    canvasLifted: false,
    found: [],
    storeroomOpen: false,
    ledgerClean: false,
    safeOpen: false,
    batteryMounted: false,
    lensMounted: false,
    cardMounted: false,
    projectorOn: false,
    cells: Array<boolean>(25).fill(false),
    panelOpen: false,
    crankMounted: false,
    hookMounted: false,
    gangwayDown: false,
    complete: false,
  };
}
export function availableItems(s: AdventureState): ExpeditionItem[] {
  return s.found.filter(
    (item) =>
      !(
        (item === "key" && s.storeroomOpen) ||
        (item === "brush" && s.ledgerClean) ||
        (item === "battery" && s.batteryMounted) ||
        (item === "lens" && s.lensMounted) ||
        (item === "card" && s.cardMounted) ||
        (item === "crank" && s.crankMounted) ||
        (item === "hook" && s.hookMounted)
      ),
  );
}
export function reduceAdventure(
  s: AdventureState,
  a: AdventureAction,
): AdventureState {
  if (a.type === "resetChapter")
    return { ...initialAdventure(), started: true, room: "navigation" };
  if (a.type === "begin") return { ...s, started: true, room: "navigation" };
  if (!s.started) return s;
  switch (a.type) {
    case "travel":
      return (a.room === "deck" && !s.complete) ||
        (a.room === "storeroom" && !s.storeroomOpen)
        ? s
        : { ...s, room: a.room };
    case "reveal": {
      if (
        a.cover === "compassCase" &&
        s.room === "navigation" &&
        !s.compassCaseOpen
      )
        return { ...s, compassCaseOpen: true };
      if (a.cover === "manifest" && s.room === "navigation" && !s.manifestMoved)
        return { ...s, manifestMoved: true };
      if (a.cover === "canvas" && s.room === "storeroom" && !s.canvasLifted)
        return { ...s, canvasLifted: true };
      return s;
    }
    case "collect": {
      if (s.found.includes(a.item)) return s;
      const legal =
        (s.room === "navigation" &&
          (a.item === "crank" ||
            (a.item === "key" && s.compassCaseOpen) ||
            (a.item === "battery" && s.manifestMoved) ||
            (a.item === "card" && s.safeOpen))) ||
        (s.room === "storeroom" &&
          s.storeroomOpen &&
          (a.item === "brush" ||
            a.item === "hook" ||
            (a.item === "lens" && s.canvasLifted)));
      return legal ? { ...s, found: [...s.found, a.item] } : s;
    }
    case "use": {
      if (!availableItems(s).includes(a.item)) return s;
      if (s.room === "navigation") {
        if (a.item === "key" && a.target === "door")
          return { ...s, storeroomOpen: true };
        if (a.item === "brush" && a.target === "ledger")
          return { ...s, ledgerClean: true };
        if (
          a.target === "projector" &&
          ["battery", "lens", "card"].includes(a.item)
        ) {
          const n = { ...s, [`${a.item}Mounted`]: true };
          return {
            ...n,
            projectorOn: n.batteryMounted && n.lensMounted && n.cardMounted,
          };
        }
      }
      if (s.room === "storeroom" && a.target === "winch") {
        if (a.item === "crank") return { ...s, crankMounted: true };
        if (a.item === "hook") return { ...s, hookMounted: true };
      }
      return s;
    }
    case "safe":
      return s.room === "navigation" &&
        s.ledgerClean &&
        !s.safeOpen &&
        a.code === SAFE_CODE
        ? { ...s, safeOpen: true }
        : s;
    case "toggleCell":
      return s.room === "storeroom" &&
        !s.panelOpen &&
        Number.isInteger(a.index) &&
        a.index >= 0 &&
        a.index < 25
        ? { ...s, cells: s.cells.map((v, i) => (i === a.index ? !v : v)) }
        : s;
    case "clearPanel":
      return s.room === "storeroom" && !s.panelOpen
        ? { ...s, cells: Array<boolean>(25).fill(false) }
        : s;
    case "confirmPanel":
      return s.room === "storeroom" &&
        s.projectorOn &&
        !s.panelOpen &&
        s.cells.every((v, i) => v === ANCHOR[i])
        ? { ...s, panelOpen: true }
        : s;
    case "operateWinch":
      return s.room === "storeroom" &&
        s.panelOpen &&
        s.crankMounted &&
        s.hookMounted &&
        !s.gangwayDown
        ? { ...s, gangwayDown: true }
        : s;
    case "finish":
      return s.room === "storeroom" && s.gangwayDown
        ? { ...s, complete: true, room: "deck" }
        : s;
  }
}
export function serializeAdventure(s: AdventureState): string {
  return JSON.stringify({ version: 1, state: s });
}
export function parseAdventure(raw: string | null): AdventureState {
  try {
    const data: unknown = JSON.parse(raw ?? "null");
    if (
      !data ||
      typeof data !== "object" ||
      !("version" in data) ||
      data.version !== 1 ||
      !("state" in data) ||
      !data.state ||
      typeof data.state !== "object"
    )
      return initialAdventure();
    const s = data.state as AdventureState;
    const bools = [
      "started",
      "compassCaseOpen",
      "manifestMoved",
      "canvasLifted",
      "storeroomOpen",
      "ledgerClean",
      "safeOpen",
      "batteryMounted",
      "lensMounted",
      "cardMounted",
      "projectorOn",
      "panelOpen",
      "crankMounted",
      "hookMounted",
      "gangwayDown",
      "complete",
    ] as const;
    if (
      bools.some((k) => typeof s[k] !== "boolean") ||
      !["cabin", "navigation", "storeroom", "deck"].includes(s.room) ||
      !Array.isArray(s.found) ||
      s.found.some((i) => !ITEMS.includes(i)) ||
      new Set(s.found).size !== s.found.length ||
      !Array.isArray(s.cells) ||
      s.cells.length !== 25 ||
      s.cells.some((v) => typeof v !== "boolean")
    )
      return initialAdventure();
    const has = (i: ExpeditionItem) => s.found.includes(i);
    if (
      (!s.started &&
        (s.room !== "cabin" ||
          s.found.length > 0 ||
          s.cells.some(Boolean) ||
          bools.filter((k) => k !== "started").some((k) => s[k]))) ||
      (has("key") && !s.compassCaseOpen) ||
      (has("battery") && !s.manifestMoved) ||
      (s.storeroomOpen && !has("key")) ||
      (["brush", "lens", "hook"].some((i) => has(i as ExpeditionItem)) &&
        !s.storeroomOpen) ||
      (s.canvasLifted && !s.storeroomOpen) ||
      (s.cells.some(Boolean) && !s.storeroomOpen) ||
      (has("lens") && !s.canvasLifted) ||
      (s.ledgerClean && !has("brush")) ||
      (s.safeOpen && !s.ledgerClean) ||
      (has("card") && !s.safeOpen) ||
      (s.batteryMounted && !has("battery")) ||
      (s.lensMounted && !has("lens")) ||
      (s.cardMounted && !has("card")) ||
      s.projectorOn !== (s.batteryMounted && s.lensMounted && s.cardMounted) ||
      (s.panelOpen &&
        (!s.projectorOn || !s.cells.every((v, i) => v === ANCHOR[i]))) ||
      (s.crankMounted && !has("crank")) ||
      (s.hookMounted && !has("hook")) ||
      (s.gangwayDown && (!s.panelOpen || !s.crankMounted || !s.hookMounted)) ||
      (s.complete && !s.gangwayDown) ||
      (s.room === "deck" && !s.complete) ||
      (s.room === "storeroom" && !s.storeroomOpen)
    )
      return initialAdventure();
    const clean = initialAdventure();
    for (const k of bools) clean[k] = s[k];
    return { ...clean, room: s.room, found: [...s.found], cells: [...s.cells] };
  } catch {
    return initialAdventure();
  }
}
/** Tiered clues are opt-in in standard, completely absent in challenge. */
export function adventureHints(s: AdventureState): string[] {
  if (!s.storeroomOpen)
    return [
      "航海桌上不只有摆着的东西。",
      "有盒盖，也有盖住东西的纸张。找到工具后在背包选中，再检查要使用的位置。",
      "打开罗盘盒，点击里面的小钥匙。选中钥匙，在右侧储物舱门使用。",
    ];
  if (!s.ledgerClean)
    return [
      "另一个房间的工具也许能让旧记录重新清晰。",
      "储物舱里的软毛刷适合清理纸面。",
      "在储物舱找到软毛刷，回导航室，选中刷子并用于水深记录。",
    ];
  if (!s.safeOpen)
    return [
      "保险柜只关心船底还剩多少水。",
      "按早、午、晚排列，把水深减去吃水深度。",
      "早晨 8−3＝5，中午 6−4＝2，傍晚 9−2＝7，密码是 527。",
    ];
  if (!s.projectorOn)
    return [
      "信号卡上的小孔需要借助光来看。",
      "投影仪有电池仓、镜片座和卡槽。三个部件缺一不可。",
      "取出保险柜里的信号卡；清单下面有电池，储物舱帆布下有镜片。逐个选中，安装到投影仪。",
    ];
  if (!s.panelOpen)
    return [
      "储物舱的方格控制板与投影中的数字有关。",
      "每个数字表示连续填色的格数；同一行或列的不同色块之间至少留一个空格。",
      "五行从左到右依次填第 3 格；第 3 格；全部；第 1、3、5 格；第 2、3、4 格。然后确认整张图。",
    ];
  return [
    "控制板解锁后，还需要把绞盘装完整。",
    "绞盘缺一只手柄和一个能扣住栈桥拉环的吊钩。",
    "找回航海桌的曲柄和储物舱的吊钩，逐个选中装到绞盘，转动绞盘后走上观星甲板。",
  ];
}
