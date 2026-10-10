/** The log and chart deliberately share drawings, but neither gives a route. */
export const LANDMARKS = [
  { id: "port", name: "港口", x: 0, y: 0 },
  { id: "arch", name: "石拱", x: 0, y: 1 },
  { id: "buoy", name: "红浮标", x: 1, y: 1 },
  { id: "wreck", name: "沉船", x: 1, y: 0 },
  { id: "island", name: "双峰岛", x: 2, y: 0 },
  { id: "lighthouse", name: "灯塔", x: 2, y: 1 },
] as const;
export type Landmark = typeof LANDMARKS[number]["id"];
export const VOYAGE_LOG: readonly { time: string; landmark: Landmark; note: string }[] = [
  { time: "06:10", landmark: "port", note: "缆绳收妥。" },
  { time: "06:20", landmark: "arch", note: "石下传来浪声。" },
  { time: "06:30", landmark: "buoy", note: "红漆刚补过。" },
  { time: "06:40", landmark: "wreck", note: "旧桅杆仍露在水面。" },
  { time: "06:50", landmark: "island", note: "两座山峰钻出晨雾。" },
  { time: "07:00", landmark: "lighthouse", note: "守塔人点起了灯。" },
];
