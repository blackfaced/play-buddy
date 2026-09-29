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
  /**
   * 暂时不让孩子看到（代码在、路由可直达，但大厅不展示）。
   *
   * 用来装"已经写好但还没到学习进度"的游戏 —— 比如乘法大冒险：
   * 二年级还没学乘法表，先把代码落地，等到了那一课再去掉这个标记。
   * 路由仍然注册，方便自己进去验。
   */
  hidden?: boolean;
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
    id: 'write',
    path: '/write',
    title: '字的构造台',
    emoji: '🖌',
    tagline: '先看清字长什么样，再在纸上写',
    category: 'study',
    accent: '#5A7A4A',
    accentSoft: '#E9F0E2',
  },
  {
    id: 'mul',
    path: '/mul',
    title: '乘法大冒险',
    emoji: '✖️',
    tagline: '1-9 乘法表 · 60 秒挑战',
    category: 'study',
    accent: '#5B3FBF',
    accentSoft: '#F2EDFC',
    // 二年级还没学乘法表，先落地不展示
    hidden: true,
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

export const gamesByCategory = (cat: GameCategory) =>
  GAMES.filter((g) => g.category === cat && !g.hidden);

export const visibleGames = () => GAMES.filter((g) => !g.hidden);
