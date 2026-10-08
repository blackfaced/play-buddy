/** Pure, monotonic puzzle state. Wrong actions never consume or destroy props. */
export interface EscapeState {
  picture: boolean;
  slats: [boolean, boolean, boolean, boolean, boolean];
  cloth: boolean;
  chart: boolean;
  drawer: boolean;
  cabinet: boolean;
  combined: boolean;
  token2: boolean;
  tokensInserted: boolean;
  rings: [number, number, number];
  safe: boolean;
  escaped: boolean;
  seen: string[];
}
export type Item =
  "cloth" | "magnet" | "string" | "fishingTool" | "token1" | "token2" | "key";
export type Action =
  | {
      type:
        | "takeCloth"
        | "cleanChart"
        | "combine"
        | "retrieve"
        | "insertTokens"
        | "align"
        | "unlockDoor"
        | "reset";
    }
  | { type: "placeSlat"; slat: number; slot: number }
  | { type: "drawer"; code: string }
  | { type: "cabinet"; route: string }
  | { type: "rotate"; ring: 0 | 1 | 2 }
  | { type: "observe"; clue: string };
export const SAVE_KEY = "play-buddy:escape:starlight:v1";
export const CLUES = ["letter", "flags", "chart", "postcard", "slot"] as const;
// Each wooden strip has a constant positive step; its next number is its slot.
export const SLATS = [
  [3, 6, 9],
  [2, 4, 6],
  [1, 6, 11],
  [1, 4, 7],
  [2, 6, 10],
] as const;
export const SLOT_NUMBERS = [12, 8, 16, 10, 14] as const;
export function nextSlatNumber(sequence: readonly number[]): number {
  return sequence[2] + sequence[1] - sequence[0];
}
export function triangleRows(firstColumn: readonly number[]): number[][] {
  return firstColumn.reduce<number[][]>((rows, first, row) => {
    const cells = [first];
    for (let column = 1; column <= row; column++) {
      cells.push(cells[column - 1] + rows[row - 1][column - 1]);
    }
    return [...rows, cells];
  }, []);
}
export function triangleCode(): string {
  const rows = triangleRows([1, 2, 3, 4, 1]);
  return `${rows[1][1]}${rows[3][1]}${rows[4][1]}`;
}
export function initialState(): EscapeState {
  return {
    picture: false,
    slats: [false, false, false, false, false],
    cloth: false,
    chart: false,
    drawer: false,
    cabinet: false,
    combined: false,
    token2: false,
    tokensInserted: false,
    rings: [1, 2, 3],
    safe: false,
    escaped: false,
    seen: [],
  };
}
export function reduceEscape(s: EscapeState, a: Action): EscapeState {
  switch (a.type) {
    case "reset":
      return initialState();
    case "observe":
      return (a.clue !== "postcard" || s.picture) &&
        CLUES.includes(a.clue as (typeof CLUES)[number]) &&
        !s.seen.includes(a.clue)
        ? { ...s, seen: [...s.seen, a.clue] }
        : s;
    case "placeSlat": {
      if (
        !Number.isInteger(a.slat) ||
        a.slat < 0 ||
        a.slat >= SLATS.length ||
        s.picture ||
        s.slats[a.slat] ||
        nextSlatNumber(SLATS[a.slat]) !== a.slot
      )
        return s;
      const slats = [...s.slats] as EscapeState["slats"];
      slats[a.slat] = true;
      const picture = slats.every(Boolean);
      return {
        ...s,
        slats,
        picture,
        seen: picture ? [...new Set([...s.seen, "postcard"])] : s.seen,
      };
    }
    case "takeCloth":
      return s.cloth ? s : { ...s, cloth: true };
    case "cleanChart":
      return s.cloth && !s.chart ? { ...s, chart: true } : s;
    case "drawer":
      return a.code === triangleCode() && !s.drawer
        ? { ...s, drawer: true }
        : s;
    case "cabinet":
      return s.chart && a.route === "↑→↓→↑" && !s.cabinet
        ? { ...s, cabinet: true }
        : s;
    case "combine":
      return s.drawer && s.cabinet && !s.combined
        ? { ...s, combined: true }
        : s;
    case "retrieve":
      return s.combined && !s.token2 ? { ...s, token2: true } : s;
    case "insertTokens":
      return s.drawer && s.token2 && !s.tokensInserted
        ? { ...s, tokensInserted: true }
        : s;
    case "rotate": {
      if (!s.tokensInserted || s.safe || ![0, 1, 2].includes(a.ring)) return s;
      const rings = [...s.rings] as EscapeState["rings"];
      rings[a.ring] = (rings[a.ring] + 1) % 4;
      return { ...s, rings };
    }
    case "align":
      return s.picture &&
        s.tokensInserted &&
        s.rings.every((x) => x === 0) &&
        !s.safe
        ? { ...s, safe: true }
        : s;
    case "unlockDoor":
      return s.safe && !s.escaped ? { ...s, escaped: true } : s;
  }
}
export function inventory(s: EscapeState): Item[] {
  const items: Item[] = [];
  if (s.cloth) items.push("cloth");
  if (s.combined) items.push("fishingTool");
  else {
    if (s.drawer) items.push("magnet");
    if (s.cabinet) items.push("string");
  }
  if (s.drawer && !s.tokensInserted) items.push("token1");
  if (s.token2 && !s.tokensInserted) items.push("token2");
  if (s.safe) items.push("key");
  return items;
}
export function serializeSave(state: EscapeState): string {
  return JSON.stringify({ version: 2, state });
}
export function parseSave(raw: string | null): EscapeState {
  try {
    if (!raw) return initialState();
    const data = JSON.parse(raw);
    if (
      ![1, 2].includes(data?.version) ||
      !data.state ||
      typeof data.state !== "object"
    )
      return initialState();
    const s = data.state as EscapeState;
    const keys = [
      "cloth",
      "chart",
      "drawer",
      "cabinet",
      "combined",
      "token2",
      "tokensInserted",
      "safe",
      "escaped",
    ] as const;
    if (
      keys.some((k) => typeof s[k] !== "boolean") ||
      !Array.isArray(s.rings) ||
      s.rings.length !== 3 ||
      s.rings.some((n) => !Number.isInteger(n) || n < 0 || n > 3) ||
      !Array.isArray(s.seen) ||
      s.seen.some((c) => !CLUES.includes(c as (typeof CLUES)[number]))
    )
      return initialState();
    if (
      (!s.tokensInserted && s.rings.some((n, i) => n !== [1, 2, 3][i])) ||
      (s.chart && !s.cloth) ||
      (s.cabinet && !s.chart) ||
      (s.combined && (!s.drawer || !s.cabinet)) ||
      (s.token2 && !s.combined) ||
      (s.tokensInserted && (!s.drawer || !s.token2)) ||
      (s.safe && (!s.tokensInserted || s.rings.some((n) => n !== 0))) ||
      (s.escaped && !s.safe)
    )
      return initialState();
    const clean = initialState();
    for (const k of keys) clean[k] = s[k];
    // Keep already-earned reference/finished progress from the original room.
    if (data.version === 1) {
      clean.picture = s.seen.includes("postcard") || s.safe;
      clean.slats = clean.picture
        ? [true, true, true, true, true]
        : clean.slats;
    } else {
      if (
        typeof s.picture !== "boolean" ||
        !Array.isArray(s.slats) ||
        s.slats.length !== 5 ||
        s.slats.some((value) => typeof value !== "boolean") ||
        s.picture !== s.slats.every(Boolean) ||
        (s.safe && !s.picture) ||
        (s.seen.includes("postcard") && !s.picture)
      )
        return initialState();
      clean.picture = s.picture;
      clean.slats = [...s.slats];
    }
    clean.rings = [...s.rings];
    clean.seen = [...new Set(s.seen)];
    return clean;
  } catch {
    return initialState();
  }
}
export function hints(s: EscapeState): string[] {
  if (!s.drawer)
    return [
      "桌上的小抽屉，似乎与墙上的航海算图有关。",
      "每格等于左边与左上方两格之和。先向右补齐上四行，再从最后的 44 倒推底行。",
      "上四行为 1；2、3；3、5、8；4、7、12、20。底行为 1、5、12、24、44。星、月、锚依次是 3、7、5，密码 375。",
    ];
  if (!s.cloth)
    return [
      "航海桌上还留着一块可带走的东西。",
      "检查桌布旁那块折叠的小布。",
      "取走桌上的软布，到海图前选中它，再擦拭海图。",
    ];
  if (!s.chart)
    return [
      "海图上的盐霜掩住了航线。",
      "从背包选中软布，再检查海图。",
      "选中软布，在海图近景里按「擦去盐霜」。",
    ];
  if (!s.cabinet)
    return [
      "航线与旁边的方向锁有关。",
      "从红色起点开始，按编号走到灯塔。记下每段移动的方向。",
      "路线为：上、右、下、右、上。输入 ↑→↓→↑。",
    ];
  if (!s.combined)
    return [
      "船模里有东西，可是手够不到。",
      "铁环可以被磁铁吸住，但需要让磁铁伸得更远。",
      "在背包先选磁铁，再点细绳，将它们组合。",
    ];
  if (!s.token2)
    return [
      "你做好的小工具正好能伸进狭窄的地方。",
      "选中系绳磁铁，再检查船模的细缝。",
      "在船模近景里按「放下系绳磁铁」。",
    ];
  if (!s.tokensInserted)
    return [
      "门旁的圆形机关缺了两枚航海徽章。",
      "带着两枚徽章检查圆环匣。",
      "在圆环匣里按「嵌入两枚徽章」。",
    ];
  if (!s.picture)
    return [
      "船模旁的木条画框，藏着圆环匣需要的旧景。",
      "同一根木条每次增加相同的数。补出的下一个数，就是该插入的槽位编号。",
      "3、6、9 放进 12；2、4、6 放进 8；1、6、11 放进 16；1、4、7 放进 10；2、6、10 放进 14。",
    ];
  if (!s.safe)
    return [
      "拼好的木条画记录了灯塔原来的样子。",
      "旋转三道图环，让灯塔直立，海平面相接。图环可分别转动。",
      `按当前画面，外环再转 ${(4 - s.rings[0]) % 4} 次、中环 ${(4 - s.rings[1]) % 4} 次、内环 ${(4 - s.rings[2]) % 4} 次，然后按下中央锁扣。`,
    ];
  return [
    "钥匙已经在背包里了。",
    "选中黄铜钥匙，再去检查通向甲板的舱门。",
    "在舱门近景里按「转动钥匙」，去看海上的星光。",
  ];
}
