# 部署踩坑记录（本项目）

> 本文件只记跟本项目直接相关的部署坑。通用方法论（选托管平台、备案判断、
> 环境变量开关、git 凭证处理）属于通用知识，不在本仓库沉淀。

## 1. 需要链接稳定，不能用「每次新建部署」的工具

本项目需要链接稳定（孩子会收藏、家长会外发）。任何「每次部署生成新域名 / 新地址」
的工具都不适用 —— 那类工具的部署模型里没有「更新已有站点」这个操作，每次发布都是
创建一个全新且不可变的产物，域名绑在「发布事件」上而不是「项目」上。

判断方法：看部署记录里的 `content_revision`（或等价字段）。**永远是 1 = 不可更新**。

当前用的 Kimi 部署是绑在持久化项目上的，更新时覆盖同一地址。

## 2. 构建命令必须区分

| 场景 | 命令 | 原因 |
|---|---|---|
| 外网托管 | `npm run build:static` | 无 study-buddy API，零探测 |
| study-buddy 托管（家里） | `npm run build` | 需要「学习换时长」和错题同步 |

用错 `build` → 每次加载白等 2.5s 探测超时 + 每 5 分钟轮询。

## 3. 免费二级域名普遍有访问限制

大多数托管平台赠送的二级域名（`*.pages.dev` / `*.vercel.app` / `*.netlify.app` 等）
**不能长期稳定访问** —— 要么需要 ICP 备案，要么有访问频次/地域限制，表现为 401 或
间歇性打不开。

**这是平台合规与成本策略，不是部署失败。** 遇到时的正确做法：

- 短期：用平台提供的临时预览链接
- 长期：绑定已备案的自定义域名，或用本身提供稳定地址的部署通道

**不要**为了绕开 401 去反复调整构建配置 —— 那是浪费时间，构建本来就是对的。

## 4. `src/game/studyBuddy.ts` 不能直接用 `import.meta`

本项目 `verify:studybuddy` 用 `tsconfig.verify.json` 编译成 CommonJS 跑
（`module: ES2020` + `moduleResolution: bundler`），该模式下 `import.meta` 是 TS1343 语法错误。

环境变量开关经 `vite.config.ts` 的 `define` 注入为 `globalThis` 上的常量
（`__STUDY_BUDDY_ENABLED__` / `__SB_REWARD_CAP_MIN__`），用 `typeof` 守卫读取。
Node 单测下常量不存在 → 走默认值。

**改动这个文件时务必跑 `npm run verify:studybuddy`。**

## 5. 本项目 lint 基线：18 个错误

`npm run lint` 在 main 上就有 18 个 `react-hooks/set-state-in-effect` 错误
（`Home.tsx`、`ControlBar.tsx`、`Overlays.tsx` 等既有代码）。

**判断标准是「有没有新增」，不是「有没有错」。**
新增代码应为 0 错误：

```bash
npx eslint src/mathisland/ src/game/studyBuddy.ts src/App.tsx
```

## 6. 随机题目生成的两类撞车

`verify-math-island` 跑出来的问题（已修）：

- **L3 应用题被随机题挤掉**：应用题 `56-19` 也在随机池里。修正：随机题避开题库全集
  （`wpKeys.has(key)` 提前排除）
- **错题 id 撞车导致标记失败**：`find(x => x.id === mistakeId)` 两条同 id 时只命中一条。
  修正：用数组下标 `wrongList.indexOf(m)` 定位

**新增关卡/题库时记得**：`verify-math-island` 跑了 400 轮才抓到第一个，提到 3000 轮立刻见。

## 7. 已有模块不要重复造

本项目 `play-buddy` 与 `study-buddy` 是配套的：
- **学习类**（拍错题、写字、口算、乘法）→ `study-buddy` 的 `web/games/`
- **玩耍类**（积木、弹珠、口算岛）→ `play-buddy` 的 `src/`

加新游戏前先看 `study-buddy/web/games/` 下有没有同类实现。
