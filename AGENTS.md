# play-buddy — Agent Configuration

## Project overview

孩子的游戏乐园。React 19 + TypeScript + Vite 7 + Tailwind 3 + zustand + matter-js。

与 [study-buddy](https://github.com/blackfaced/study-buddy) 配套：**学习找 study-buddy，玩耍找 play-buddy**。
分工边界：拍错题、写字、错题账本、家长看板属于 study-buddy；积木、弹珠、口算岛、乘法大冒险这类游戏属于本仓库。
**加新游戏前先看 `study-buddy/web/games/` 有没有同类实现，别重复造。**

## Repo layout

```
play-buddy/
├── src/
│   ├── components/    # 积木游戏的 UI（Canvas/HUD/覆盖层等）
│   ├── components/ui/ # shadcn 生成的组件，勿手改
│   ├── game/          # 积木游戏核心：engine/levels/tower/controller/sound
│   ├── marble/        # 弹珠轨道（自包含：自带 levels/physics）
│   ├── mathisland/    # 糖果口算岛（自包含：generate.ts 纯函数 + MathIsland.tsx）
│   ├── muldrill/      # 乘法大冒险（自包含：pick-gen.ts 纯函数 + MulDrill.tsx）
│   ├── store/useStore.ts  # 防沉迷时钟 + 时长 + 关卡进度
│   ├── game/studyBuddy.ts # study-buddy 融合层（环境变量开关控制）
│   └── pages/         # 路由页
├── scripts/verify-*.ts      # 无头回归脚本（node --test 风格）
├── e2e/                     # Playwright 端到端（跑 dist/，非 dev server）
├── e2e/                     # Playwright 端到端
└── docs/deploy.md           # 部署指南
```

## 部署

**先读 [docs/deploy.md](docs/deploy.md)。** 摘要：

构建产物是**纯静态**的（`dist/` = HTML + JS + CSS），**任何静态托管都能用**，不依赖后端。

| 通道 | 生产 | 测试 |
|---|---|---|
| **Kimi 部署（主通道）** | `main` | `staging` |

要部署时告诉对方：**仓库 `blackfaced/play-buddy` + 分支 + `npm run build:static` + 输出 `dist`**。

⚠️ **构建命令一律 `npm run build:static`**（不是 `build` —— 后者会探测 `/api/apps`，白等 2.5s 超时）。

家里 Mac mini 部署用 `npm run build`（保留学习换时长），构建 base 为 `/games/balance-blocks/`。

## 环境变量

构建期静态注入，**改完要重新 build**。详见 `.env.example`。

| 变量 | 默认 | 说明 |
|---|---|---|
| `VITE_STUDY_BUDDY_ENABLED` | `true` | `false` = 纯玩、零探测。外网部署必须设 |
| `VITE_SB_REWARD_CAP_MIN` | `10` | 学习奖励日封顶（分钟）。非法值回落默认 |

取值解析在 `src/game/studyBuddy.ts` 的 `isFusionEnabled()` / `resolveRewardCapMs()`，都是纯函数便于单测。

## Conventions

- **不改 `src/components/ui/`** —— shadcn 生成，需要时用 `npx shadcn add <组件>` 重新生成
- **新游戏做成自包含模块**（像 `marble/`、`mathisland/`、`muldrill/` 那样自带存档和音效），不侵入 `useStore`。主 store 只管全局防沉迷时钟和时长。
- **游戏内计时与防沉迷计时是两回事** —— 防沉迷是**限制总屏幕时间**，游戏内倒计时是**催促本轮**。两者同屏出现会互相打架（一个说"还剩 18 分钟能玩"，一个说"这轮还剩 4 分钟"，孩子大概率两个一起无视）。设计时先想清楚这条。
- **数字口径**：游戏内显示的速度星/分数是给孩子正反馈；家长看板的用时/正确率是给家长的。两者不要混用同一个组件。
- **改动不直接推 `main`** —— 开 `feat/xxx` 分支，验证后合。`main` 是孩子正在用的环境。

## Testing

无头验证脚本，跑的是真实逻辑（物理引擎用合成时钟）：

```bash
npm run verify:win          # 积木闯关胜负路径
npm run verify:endless      # 无尽模式门禁
npm run verify:studybuddy   # 融合层 + 环境变量开关
npm run verify:math-island  # 口算岛题目生成（3000 轮 × 3 关 ≈ 194 万项断言）
npm run verify:mul-drill    # 乘法大冒险题目/键盘/结算（5000 轮 ≈ 2 万项断言）
npm run verify:marble
```

端到端（无头 Chromium，跑真实构建产物 `dist/`）：

```bash
npm run test:e2e        # 全部 e2e
npm run test:e2e:mul    # 只跑乘法大冒险（先 build:static）
```

**TDD：先写 verify 脚本并确认它失败，再实现。**

新增纯逻辑模块（题目生成、计分、关卡）优先放进独立文件以便无头验证 —— 参考 `src/mathisland/generate.ts` 和 `src/muldrill/pick-gen.ts` 的做法：纯函数、不碰 DOM，可以跑几万轮。
   rng 必须由调用方注入，不许在纯函数里用 `Math.random` —— 否则无法确定性复现。

## Gotchas

- **`src/game/studyBuddy.ts` 不能用 `import.meta`** —— `verify:studybuddy` 用 CommonJS 编译（`tsconfig.verify.json`），那个模式下 `import.meta` 是 TS1343 语法错误。环境变量经 `vite.config.ts` 的 `define` 注入为 `globalThis` 常量。改这个文件必须跑 `npm run verify:studybuddy`。
- **lint 基线有 18 个错误** —— `npm run lint` 在 main 上就有 18 个 `react-hooks/set-state-in-effect`（`Home.tsx`、`ControlBar.tsx` 等既有代码）。判断标准是**有没有新增**，不是有没有错。检查自己的文件：`npx eslint src/<新目录>/`。
- **随机生成题库要防两类撞车** —— 有限题库 vs 随机池的交集（会导致题库项被挤掉、数量不足）、记录 id 撞车（`find(x => x.id === id)` 只命中第一条）。用数组下标而非 id 定位。测试轮数要 ≥1000，50 轮抓不到低频 bug。
- **纯函数层测不到 React 闭包** —— `setState` 是异步批处理的，"同一事件里 setX 再读 X"会拿到旧值。
  数字键盘的自动提交必须把值**显式传参**给判定函数，不能让判定函数去读 state
  （见 `MulDrill.tsx` 的 `submit(raw?)`）。这类问题无头 verify 抓不到，改完要在真机上手动过一遍。
- **迁移不等于逐字复制** —— 从 study-buddy 往这搬游戏时，显示层的问题要顺手修，但要在
  commit message 和代码注释里写清改了什么、为什么。`muldrill` 就改了一处：原乘法表
  单元格宽度不等（`1×1=1` 5 字符 / `9×9=81` 6 字符），等宽字体下**列是歪的**，
  而"扫一列找答案"正是那个提示的全部意义。改成定宽右对齐的口诀表版式。
- **e2e 跑构建产物，不跑 dev server** —— `npm run test:e2e:mul` 会先 `build:static`。
  原因：`build:static` 把融合层关掉，正好顺带断言"静态部署不发任何 `/api/` 请求"。
  测试用 `node --test`（对齐 study-buddy 的 e2e 写法），不引 @playwright/test。
- **`page.clock.install()` 必须在 `goto` 之前** —— 装晚了接管不到页面已创建的
  `setTimeout`；装完之后 `waitUntil:'networkidle'` 和 `waitForTimeout` 会挂死
  （它们按真实时间等，而真实时间已被冻结），要改用 `waitUntil:'load'` + `clock.runFor()`。
- **Playwright 浏览器下载要走国内镜像** —— 官方 CDN 的文件端点在部分网络下拉不动
  （根路径能返 200，文件是 0 字节，表现为 install 一直转、缓存目录只有几 KB）：
  `PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright npx playwright install chromium`
- **随机出题做 e2e 断言要防"输到一半就对了"** —— 答对与否只能靠"构造一个恒不等于
  答案的输入"（用 `answer + 1`），不能硬编码某个数字：3×3=9 时输 `9` 就直接对了。
- **`package-lock.json` 不入库** —— 依赖版本已在 `package.json` 钉死，故意不提交。
- **`.env` 不入库** —— 只提交 `.env.example`。

详细踩坑记录见 [docs/deploy-notes.md](docs/deploy-notes.md)。
