# 部署指南

两个环境：**生产**（`main`）和**测试**（`staging`），各自独立、链接永久稳定。
构建产物是**纯静态**的（`dist/` = HTML + JS + CSS），零运行时请求，任何静态托管都能用。

---

## 一、两站对照

| | 生产 | 测试 |
|---|---|---|
| 仓库 | `blackfaced/play-buddy` | 同一个仓库 |
| 分支 | `main` | `staging` |
| 用途 | 给孩子正式用 | 开发验证，随便造 |

**两站存档天然隔离** —— localStorage 按域名分。测试站改难度、清进度，都不会碰到正式站那份。

---

## 二、日常流程

```bash
# 开发：开 feat/xxx 分支，验证后合
npm run verify:math-island      # 跑测试
npm run verify:reward           # 学习奖励入账
npm run lint                    # 我的新文件应为 0 错（仓库原有 18 个 set-state-in-effect 错误在 main 上就有）
npm run dev                     # 本地看效果
git commit -am "xxx"
git push origin feat/xxx        # 开 PR 合 main
```

**不要直接往 main 推** —— 那是孩子正在用的环境。

---

## 三、构建配置

| 配置项 | 值 |
|---|---|
| 框架预设 | Vite |
| 根目录 | `./` |
| 输出目录 | `dist` |
| 构建命令 | `npm run build` |
| 安装命令 | 留空 |

重构后没有任何运行时探测，`npm run build` 就是纯静态产物，不需要区分构建变体。

---

## 四、环境变量

见 `.env.example`。构建期静态注入，**改完要重新 build 才生效**。

| 变量 | 默认 | 说明 |
|---|---|---|
| `VITE_REWARD_CAP_MIN` | `15` | 学习奖励日封顶（分钟）。非法值回落默认 |

---

## 五、部署通道

### 通用三步

```bash
git clone https://github.com/blackfaced/play-buddy.git
cd play-buddy
npm install
npm run build          # 产物在 dist/，直接可托管
```

然后把 `dist/` 丢给任意静态托管平台即可。**不需要**后端、数据库、VPS。

### 当前使用的通道

| 通道 | 生产 | 测试 | 备注 |
|---|---|---|---|
| Kimi 部署（主通道） | `main` | `staging` | 域名稳定，认领固定项目后每次覆盖更新 |

**用 Kimi 部署时，只需告诉它：**
> 部署 `blackfaced/play-buddy` 仓库的 `main` 分支，构建命令 `npm run build`，输出目录 `dist`。

首次部署后**务必让它认领（claim）到固定账号** —— 未认领的匿名项目每次部署可能新建，导致链接变化。认领后即为覆盖更新，链接永久不变。

---

## 六、本地部署到家里 Mac mini

```bash
npx vite build --base=/games/balance-blocks/ --outDir dist-sb
tar -czf play-buddy.tar.gz -C dist-sb .
# 在 Mac mini 上解压到对应静态目录即可（纯静态，无后端依赖）
```

---

## 七、给 AI 协作者的部署检查清单

拿到本仓库的部署任务时，按此顺序确认：

1. **分支** — 生产改 `main`，测试改 `staging`，不要在生产分支直接开发
2. **构建命令** — `npm run build`（纯静态，没有变体）
3. **验证** — `npm run build` 成功 + `npm run verify:reward` + `npm run verify:math-island` 全过
4. **不要**提交 `.env`（已在 `.gitignore`），只提交 `.env.example`

详细踩坑记录见 [deploy-notes.md](./deploy-notes.md)。
