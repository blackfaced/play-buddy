# play-buddy · 孩子的游戏乐园

给孩子的小游戏合集，与 [study-buddy](https://github.com/blackfaced/study-buddy) 配套：
学习找 study-buddy，玩耍找 play-buddy。

## 游戏

| 游戏 | 说明 |
|---|---|
| 🧱 平衡积木 | 物理消除：抽掉积木让小六边形安全下塔。闯关 / 每日挑战 / 无尽三种模式 |
| 🔮 弹珠轨道 | 搭轨道送弹珠回家 |

## 一份代码，两种形态

运行时探测 study-buddy API（`/api/apps`，2.5s 超时）自动切换：

- **在家**（由 study-buddy 托管在 `/games/balance-blocks/`）：开启"学习换时长"——
  每完成 1 局学习游戏 +5 分钟游戏时长（当日聚合正确率 ≥60% 生效，每日封顶 +10 分钟），
  每局结束上报 `/api/game/session` 进家长看板
- **在外**（静态托管）：纯玩模式，内置防沉迷照旧

## 防沉迷（设计上限：上学日总屏幕约 1 小时）

- 每 20 分钟提醒休息；连续 25 分钟强制休息 10 分钟（奖励不免除）
- 上学日每日 30 分钟；假期（周末/法定节假日/寒暑假）每日 2 小时
- 被强制休息一次 → 当日上限 -15 分钟；主动休息 ≥10 分钟 → 不受罚且连击清零
- 学习奖励只放宽每日上限，每日封顶 +10 分钟（一天练一两套即达标）

## 开发

```bash
npm install
npm run dev

# 无头回归（真实物理引擎，合成时钟）
npm run verify:win         # 闯关胜负路径
npm run verify:endless     # 无尽模式（坠落兜底/检查点/谨慎下潜聚合门禁）
npm run verify:studybuddy  # study-buddy 融合层（mock fetch 单测）

# 构建
npm run build                                          # 平台版（base='./'）
npx vite build --base=/games/balance-blocks/ --outDir dist-sb   # study-buddy 版
```

## 部署到 study-buddy（Mac mini）

```bash
npx vite build --base=/games/balance-blocks/ --outDir dist-sb
tar -czf balance-blocks.tar.gz -C dist-sb .
# 在 Mac mini 上解压到 study-buddy/web/games/balance-blocks/ 并重启服务
```

技术栈：React 19 + TypeScript + Vite 7 + Tailwind 3 + matter-js + zustand。

> 说明：`package-lock.json` 未入库（依赖版本已在 package.json 钉死，首次 `npm install` 会重新生成）；
> `public/og-cover.png`（社交分享封面）因二进制传输限制未入库，不影响构建与运行。
