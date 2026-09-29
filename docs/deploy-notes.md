# 部署踩坑记录（本项目）

## 1. 沙箱 deploy 工具不能用于本项目

`website_deploy` 每次生成新域名（`content_revision` 恒为 1 = 每次都是全新不可变产物），
本项目需要链接稳定（孩子会收藏、家长会外发），因此**不使用该工具**。

## 2. 构建产物纯静态

重构后（2026-09）项目与 study-buddy 完全解耦：没有任何运行时探测，`npm run build`
产物零请求，任何静态托管直接可用。学习奖励改成本机入账（localStorage），日封顶由
`VITE_REWARD_CAP_MIN` 控制。

## 3. `src/lib/reward.ts` 不能直接用 `import.meta` 或 `@` 别名

`verify:reward` 用 `tsconfig.verify.json` 编译成 CommonJS 跑，该模式下 `import.meta`
是 TS1343 语法错误，且没有 `@` 路径映射。

环境变量经 `vite.config.ts` 的 `define` 注入为 `globalThis` 上的常量
（`__REWARD_CAP_MIN__`），用 `typeof` 守卫读取。Node 单测下常量不存在 → 走默认值。

**改动这个文件时务必跑 `npm run verify:reward`。**

## 4. 本项目 lint 基线：18 个错误

`npm run lint` 在 main 上就有 18 个 `react-hooks/set-state-in-effect` 错误
（`Home.tsx`、`ControlBar.tsx`、`Overlays.tsx` 等既有代码）。

**判断标准是「有没有新增」，不是「有没有错」。**
新增代码应为 0 错误：

```bash
npx eslint src/mathisland/ src/lib/reward.ts src/pages/Lobby.tsx src/games.ts
```

## 5. 随机题目生成的两类撞车

`verify-math-island` 跑出来的问题（已修）：

- **L3 应用题被随机题挤掉**：应用题 `56-19` 也在随机池里。修正：随机题避开题库全集
  （`wpKeys.has(key)` 提前排除）
- **错题 id 撞车导致标记失败**：`find(x => x.id === mistakeId)` 两条同 id 时只命中一条。
  修正：用数组下标 `wrongList.indexOf(m)` 定位

**新增关卡/题库时记得**：`verify-math-island` 跑了 400 轮才抓到第一个，提到 3000 轮立刻见。

## 6. 新游戏接入约定

- 自包含模块（自带存档和音效），不侵入 `useStore`
- 在 `src/games.ts` 注册一行，标明 `study` / `play`，大厅自动展示
- 学习类游戏通关调 `addStudyBonus()`，结算界面展示**实际入账**而非名义奖励
