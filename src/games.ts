/**
 * 游戏注册表 —— 新游戏在这里登记一行，大厅自动展示。
 *
 * 分类约定：
 * - study：学习类游戏（通关可赚游戏时长，每日上限见 src/lib/reward.ts）
 * - play：娱乐类游戏
 */
export type GameCategory = 'study' | 'play';

export interface GameEntry {
  id: string;
  path: string;
  title: string;
  emoji: string;
  tagline: string;
  category: GameCategory;
  /** 卡片强调色（边框/标题），取 tailwind 调色板里的色值 */
  accent: string;
  accentSoft: string;
}

export const GAMES: GameEntry[] = [
  {
    id: 'math',
    path: '/math',
    title: '糖果口算岛',
    emoji: '🍭',
    tagline: '100 以内加减 · 答得快赢时长',
    category: 'study',
    accent: '#B85C38',
    accentSoft: '#FFF3E6',
  },
  {
    id: 'blocks',
    path: '/blocks',
    title: '平衡积木',
    emoji: '🧱',
    tagline: '抽积木 · 别让塔倒掉',
    category: 'play',
    accent: '#C9714A',
    accentSoft: '#F3E0D3',
  },
  {
    id: 'marble',
    path: '/marble',
    title: '弹珠轨道',
    emoji: '🎯',
    tagline: '搭轨道 · 引弹珠 · 40 关',
    category: 'play',
    accent: '#4E8C3F',
    accentSoft: '#F2F9EC',
  },
];

export const gamesByCategory = (cat: GameCategory) => GAMES.filter((g) => g.category === cat);
