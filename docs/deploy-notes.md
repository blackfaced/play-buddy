# 部署踩坑记录（本项目）

> 通用部署方法论见 Mavis skill `static-site-deploy`。这里只记跟本项目直接相关的。

## 1. 沙箱 deploy 工具不能用于本项目

`website_deploy` 每次生成新域名（`content_revision` 恒为 1 = 每次都是全新不可变产物），
本项目需要链接稳定（孩子会收藏、家长会外发），因此**不使用该工具**。
详见 skill 的「沙箱 deploy 的坑」。

## 2. 免费二级域名 401

`play-buddy-1hsirbvf.edgeone.cool` / `play-buddy-test-dzv7t2mx.zh-cn.edgeone.cool` 裸访问返回 401。

平台合规要求，三个加速区域都不允许免费二级域名长期访问。**这是预期行为，不是部署失败。**

- 备案期间：控制台 **Preview** 按钮生成临时链接
- ⚠️ 实测 preview token 有效期约 **60 秒**（远短于文档说的 3 小时），点开即废，不要转发
- 长期解法：绑已备案自定义域名

## 3. 构建命令必须区分

| 场景 | 命令 | 原因 |
|---|---|---|
| EdgeOne（外网） | `npm run build:static` | 无 study-buddy API，零探测 |
| study-buddy 托管（家里） | `npm run build` | 需要「学习换时长」和错题同步 |

用错 `build` → 每次加载白等 2.5s 探测超时 + 每 5 分钟轮询。

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
