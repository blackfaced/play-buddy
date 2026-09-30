# play-buddy — Agent Configuration

## Project overview

孩子的游戏乐园。React 19 + TypeScript + Vite 7 + Tailwind 3 + zustand + matter-js。

**纯静态、零后端**：所有数据（防沉迷时钟、关卡进度、学习奖励）都在孩子设备的
localStorage 里，不上传、不联任何服务。游戏分两类：学习类（`study`，通关赚时长）
和娱乐类（`play`）。

## Repo layout

```
play-buddy/
├── src/
│   ├── games.ts           # 游戏注册表：新游戏在这里登记，大厅自动展示
│   ├── pages/Lobby.tsx    # 首页游戏大厅（学习 / 娱乐分区）
│   ├── components/    # 积木游戏的 UI（Canvas/HUD/覆盖层等）
│   ├── components/ui/ # shadcn 生成的组件，勿手改
│   ├── game/          # 积木游戏核心：engine/levels/tower/controller/sound
│   ├── marble/        # 弹珠轨道（自包含：自带 levels/physics）
│   ├── mathisland/    # 糖果口算岛（自包含：generate.ts 纯函数 + MathIsland.tsx）
│   ├── lib/reward.ts  # 学习奖励：入账 + 日封顶（纯函数，供无头验证）
│   ├── store/useStore.ts  # 防沉迷时钟 + 时长 + 关卡进度 + addStudyBonus
│   └── pages/         # 路由页
├── scripts/verify-*.ts      # 无头回归脚本（node --test 风格）
├── e2e/                     # Playwright 端到端
└── docs/deploy.md           # 部署指南
```

## 路由

| 路径 | 页面 |
|---|---|
| `/` | 游戏大厅 |
| `/blocks` | 平衡积木 |
| `/marble` | 弹珠轨道 |
| `/math` | 糖果口算岛 |

## 部署

**先读 [docs/deploy.md](docs/deploy.md)。** 摘要：

构建产物是**纯静态**的（`dist/` = HTML + JS + CSS），**任何静态托管都能用**，零运行时请求。

| 通道 | 生产 | 测试 |
|---|---|---|
| **Kimi 部署（主通道）** | `main` | `staging` |

要部署时告诉对方：**仓库 `blackfaced/play-buddy` + 分支 + `npm run build` + 输出 `dist`**。

| | 生产 | 测试 |
|---|---|---|
| 分支 | `main` | `staging` |
| 用途 | 给孩子正式用 | 开发验证 |

两分支各对应一个稳定链接。**Kimi 那边首次部署后务必 claim 到固定账号**，之后是覆盖更新而非新建。

家里 Mac mini 部署：`npx vite build --base=/games/balance-blocks/ --outDir dist-sb`。

## 环境变量

构建期静态注入，**改完要重新 build**。详见 `.env.example`。

| 变量 | 默认 | 说明 |
|---|---|---|
| `VITE_REWARD_CAP_MIN` | `15` | 学习奖励日封顶（分钟）。非法值回落默认 |

取值解析与入账逻辑在 `src/lib/reward.ts`（`resolveRewardCapMs()` / `creditBonus()`），
都是纯函数便于单测。

## Conventions

- **不改 `src/components/ui/`** —— shadcn 生成，需要时用 `npx shadcn add <组件>` 重新生成
- **写字模块不做屏幕书写、不做自动字迹评分** —— 孩子在纸上写，屏幕上只做示范。
  这是 study-buddy `docs/product-direction.md` 的既定方向（「网页默写、必须在屏幕上
  书写、自动字迹评分退出首版主流程」），其 `handwriting-coach.js`（28KB 评分引擎）
  也因 `VALIDATED_STROKE_ORDERS` 是空表（一个字都没人工校验过）而不可用，
  **不要把它搬过来**。要迁移的是"找一个字 → 看笔顺与结构"这一半。
- **字形数据必须内嵌，不能走 CDN** —— `src/write/strokes.ts`（约 142KB，82 字，
  来源 hanzi-writer-data@2.0 / Make Me a Hanzi，MIT）直接打进产物，
  Vite 自动把它切成独立 chunk 懒加载。平板在学校/无网环境下要照常能看笔顺，
  这是内嵌的唯一理由。e2e 里有断网用例专门守这条。
- **`setState` 不要写在 effect 开头** —— 换组件/换参数时的状态重置用 React 官方的
  "渲染期调整 state"写法（`if (prev !== next) { setPrev(next); setX() }`），
  同步 setState 写在 effect 开头会触发级联渲染，`react-hooks/set-state-in-effect`
  会报错（基线里那 18 个就是历史包袱，别新增）。
- **副作用不要写在 `setState` 的 updater 里** —— updater 必须是纯函数，StrictMode 下
  会双跑，"一局结束上报成绩"这类副作用会记两遍。先算 next 索引，在 updater 外发。
- **选择题的选项不能在 render 里 shuffle** —— 会随重渲染跳动，孩子点一下位置就变了。
  用 `useMemo` 绑定到关卡对象上。纯逻辑层和 e2e 都测得到这条。
- **新游戏一律在 `src/games.ts` 登记** —— 不要再去 `Overlays.tsx` 手写推广卡，
  那边只有回大厅链接，登记表是唯一入口。还没到学习进度的游戏加 `hidden: true`：
  代码落地、路由可直达（`/games.ts` 注释里写了 `visibleGames()` 过滤），
  大厅不展示。e2e 要同时断言"大厅看不到"和"路由仍可达"。
- **新游戏做成自包含模块**（像 `marble/` 和 `mathisland/` 那样自带存档和音效），不侵入 `useStore`。主 store 只管全局防沉迷时钟和时长。加完在 `src/games.ts` 注册一行，标明 `study` / `play`。
- **学习类游戏通关调 `useStore.getState().addStudyBonus(bonusMs)`** —— 返回实际入账毫秒数（受日封顶截断），结算界面要展示实际入账，而不是只展示名义奖励。
- **游戏内计时与防沉迷计时是两回事** —— 防沉迷是**限制总屏幕时间**，游戏内倒计时是**催促本轮**。两者同屏出现会互相打架（一个说"还剩 18 分钟能玩"，一个说"这轮还剩 4 分钟"，孩子大概率两个一起无视）。设计时先想清楚这条。
- **数字口径**：游戏内显示的速度星/分数是给孩子正反馈；用时/正确率是给家长的。两者不要混用同一个组件。
- **改动不直接推 `main`** —— 开 `feat/xxx` 分支，验证后合。`main` 是孩子正在用的环境。

## Testing

无头验证脚本，跑的是真实逻辑（物理引擎用合成时钟）：

```bash
npm run verify:win          # 积木闯关胜负路径
npm run verify:endless      # 无尽模式门禁
npm run verify:reward       # 学习奖励入账 + 环境变量解析
npm run verify:math-island  # 口算岛题目生成（3000 轮 × 3 关 ≈ 194 万项断言）
npm run verify:marble
npm run verify:write       # 字的构造台题库 / 造题 / 内嵌字形库
```

**TDD：先写 verify 脚本并确认它失败，再实现。**

新增纯逻辑模块（题目生成、计分、关卡）优先放进独立文件以便无头验证 —— 参考
`src/mathisland/generate.ts` 和 `src/lib/reward.ts` 的做法：纯函数、不碰 DOM、
不依赖 `@` 别名（`tsconfig.verify.json` 是 CommonJS 且无路径映射），可以跑几万轮。

## Gotchas

- **进 verify 体系的文件不能用 `import.meta` 或 `@` 别名** —— `tsconfig.verify.json` 用 CommonJS 编译且无路径映射。环境变量经 `vite.config.ts` 的 `define` 注入为 `globalThis` 常量（如 `__REWARD_CAP_MIN__`）。改 `src/lib/reward.ts` 必须跑 `npm run verify:reward`。
- **lint 基线有 18 个错误** —— `npm run lint` 在 main 上就有 18 个 `react-hooks/set-state-in-effect`（`Home.tsx`、`ControlBar.tsx` 等既有代码）。判断标准是**有没有新增**，不是有没有错。检查自己的文件：`npx eslint src/<新目录>/`。
- **随机生成题库要防两类撞车** —— 有限题库 vs 随机池的交集（会导致题库项被挤掉、数量不足）、记录 id 撞车（`find(x => x.id === id)` 只命中第一条）。用数组下标而非 id 定位。测试轮数要 ≥1000，50 轮抓不到低频 bug。
- **`package-lock.json` 不入库** —— 依赖版本已在 `package.json` 钉死，故意不提交。
- **`.env` 不入库** —— 只提交 `.env.example`。

详细踩坑记录见 [docs/deploy-notes.md](docs/deploy-notes.md)。
