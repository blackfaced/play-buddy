# play-buddy · 孩子的游戏乐园

给孩子的小游戏合集：首页是游戏大厅，学习类与娱乐类分区展示。
学习类游戏通关可赚游戏时长（本机入账，每日封顶见下）。

> 📦 部署（Kimi 主通道 / 家里 Mac mini）见 **[docs/deploy.md](docs/deploy.md)**；
> 实际踩过的坑与排查记录见 **[docs/deploy-notes.md](docs/deploy-notes.md)**。
>
> 🤖 **AI 协作者请先读 [AGENTS.md](AGENTS.md)** —— 项目结构、部署约定、测试命令、已知陷阱都在里面。

## 游戏

| 分类 | 游戏 | 说明 |
|---|---|---|
| 📚 学习 | 🍭 糖果口算岛 | 100 以内加减法，3 关 × 18 题。整关 5 分钟倒计时，一半四选一半数字键盘输入，答得快换游戏时长 |
| 🎪 娱乐 | 🧱 平衡积木 | 物理消除：抽掉积木让小六边形安全下塔。闯关 / 每日挑战 / 无尽三种模式 |
| 🎪 娱乐 | 🔮 弹珠轨道 | 搭轨道送弹珠回家 |

新游戏在 `src/games.ts` 注册一行（标记 `study` / `play`），大厅自动展示。

## 学习奖励（本机入账，无后端）

- 学习类游戏通关得星 → 换算成游戏时长，直接入账本机防沉迷额度
- 每日奖励封顶由构建期环境变量 `VITE_REWARD_CAP_MIN` 控制（默认 15 分钟）
- 数据只存在孩子设备的 localStorage 里，不上传、不联任何后端

## 防沉迷（设计上限：上学日总屏幕约 1 小时）

- 每 20 分钟提醒休息；连续 25 分钟强制休息 10 分钟（奖励不免除）
- 上学日每日 30 分钟；假期（周末/法定节假日/寒暑假）每日 2 小时
- 被强制休息一次 → 当日上限 -15 分钟；主动休息 ≥10 分钟 → 不受罚且连击清零
- 学习奖励只放宽每日上限，每日封顶由 `VITE_REWARD_CAP_MIN` 控制（默认 15 分钟）

## 开发

```bash
npm install
npm run dev

# 无头回归（真实物理引擎，合成时钟）
npm run verify:win         # 闯关胜负路径
npm run verify:endless     # 无尽模式（坠落兜底/检查点/谨慎下潜聚合门禁）
npm run verify:reward      # 学习奖励入账 + 环境变量解析
npm run verify:math-island # 糖果口算岛题目生成（3000 轮 × 3 关 ≈ 194 万项断言）
npm run verify:write       # 字的构造台题库/造题/字形库（2000 轮 = 1 万项断言）

# 构建
npm run build                                              # 平台版（base='./'，纯静态零请求）
npx vite build --base=/games/balance-blocks/ --outDir dist-sb   # 家里 Mac mini 版
```

## 部署到家里 Mac mini

```bash
npx vite build --base=/games/balance-blocks/ --outDir dist-sb
tar -czf balance-blocks.tar.gz -C dist-sb .
# 在 Mac mini 上解压到对应静态目录即可（纯静态，无后端依赖）
```

技术栈：React 19 + TypeScript + Vite 7 + Tailwind 3 + matter-js + zustand。

> 说明：`package-lock.json` 未入库（依赖版本已在 package.json 钉死，首次 `npm install` 会重新生成）；
> `public/og-cover.png`（社交分享封面）因二进制传输限制未入库，不影响构建与运行。
