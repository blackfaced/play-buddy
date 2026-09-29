# 部署指南

两个环境：**生产**（`main`）和**测试**（`staging`），各自独立、链接永久稳定。

---

## 一、两分支对照

| | 生产 | 测试 |
|---|---|---|
| 仓库 | `blackfaced/play-buddy` | 同一个仓库 |
| 分支 | `main` | `staging` |
| 用途 | 给孩子正式用 | 开发验证，随便造 |
| 学习奖励 | 开启（家里部署时） | 关闭 |

**两站存档天然隔离** —— localStorage 按域名分。测试站改难度、清进度，都不会碰到正式站那份。

---

## 二、日常流程

```bash
# 开发：改完推 staging，测试站自动更新
git checkout staging
# ...改代码...
npm run verify:math-island      # 跑测试
npm run lint                    # 新增文件应为 0 错（仓库原有 18 个 set-state-in-effect 错误在 main 上就有）
npm run dev                     # 本地看效果
git commit -am "xxx"
git push

# 验证通过后合到 main，生产站更新
git checkout main
git merge staging
git push
```

**不要直接往 main 推** —— 那是孩子正在用的环境。

---

## 三、构建配置

| 配置项 | 值 |
|---|---|
| 框架预设 | Vite |
| 根目录 | `./` |
| 输出目录 | `dist` |
| 构建命令 | `npm run build:static` |
| 安装命令 | 留空 |
| 环境变量 | `VITE_STUDY_BUDDY_ENABLED=false` |

**为什么用 `build:static` 而不是 `build`？**

外网没有 study-buddy API。`build` 出来的产物会在每次加载时探测 `/api/apps`，白等 2.5 秒超时，还有每 5 分钟一次的轮询。`build:static` 把 `VITE_STUDY_BUDDY_ENABLED` 编译成 `false`，直接不探测、零请求。

家里由 study-buddy 托管的构建才用 `npm run build`。

---

## 四、部署通道

本项目**构建产物是纯静态的**（`dist/` = 一个 HTML + 一个 JS + 一个 CSS），**任何静态托管服务都能直接用**，不依赖任何后端、数据库或服务器。

### 通用三步

```bash
git clone https://github.com/blackfaced/play-buddy.git
cd play-buddy
npm install
npm run build:static          # 产物在 dist/，直接可托管
```

然后把 `dist/` 交给任意静态托管平台即可。**首次部署后务必认领（claim）到固定账号** —— 未认领的临时项目每次部署可能新建，链接就会变。

### 当前通道

| 通道 | 分支 | 说明 |
|---|---|---|
| Kimi 部署 | `main` / `staging` | 主通道，域名稳定 |

要部署时告诉对方：

> 部署 `blackfaced/play-buddy` 仓库的 `staging` 分支，构建命令 `npm run build:static`，输出目录 `dist`。

---

## 五、环境变量

见 `.env.example`。构建期静态注入，**改完要重新 build 才生效**。

| 变量 | 默认 | 说明 |
|---|---|---|
| `VITE_STUDY_BUDDY_ENABLED` | `true` | `false` = 纯玩，零探测。外网部署必须设 |
| `VITE_SB_REWARD_CAP_MIN` | `10` | 学习奖励日封顶（分钟）。设 `15` 则练 3 局达标。非法值回落默认 |

---

## 六、本地部署到 study-buddy（Mac mini）

仅在「在家」模式需要 —— 保留学习换时长和错题同步。

```bash
npm run build   # 默认构建，融合层开启
npx vite build --base=/games/balance-blocks/ --outDir dist-sb
tar -czf play-buddy.tar.gz -C dist-sb .
# 在 Mac mini 上解压到 study-buddy/web/games/play-buddy/ 并重启服务
```

---

## 七、常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| 提交后站点没更新 | 分支不是该部署通道的生产分支 | 确认推的是 `main`（生产）或 `staging`（测试） |
| 站点 401 / 打不开 | 托管平台的免费域名访问限制 | 绑已备案的自定义域名；长期访问不要依赖平台赠送的二级域名 |
| 构建失败 | 依赖或构建脚本问题 | 看部署平台日志 |
| 页面加载很慢、白等几秒 | 用了 `build` 而不是 `build:static` | 改构建命令，确认没在探测 study-buddy |
| 正式站数据被测试覆盖 | 不会发生 | 两域名 localStorage 天然隔离 |
| 改了代码线上没变化 | 浏览器缓存 | 强制刷新；或在托管平台配缓存策略 |

---

## 八、给 AI 协作者的部署检查清单

拿到本仓库的部署任务时，按此顺序确认：

1. **分支** — 生产改 `main`，测试改 `staging`，不要在生产分支直接开发
2. **构建命令** — 外网部署一律 `npm run build:static`，不要用 `build`
3. **环境变量** — 确认 `VITE_STUDY_BUDDY_ENABLED=false`（外网）或 `true`（家里）
4. **验证** — `npm run build` 成功 + `npm run verify:math-island` + `npm run verify:studybuddy` 全过
5. **不要**因为站点返回 401 就去改构建配置 —— 那是托管平台的访问限制，不是代码问题
6. **不要**提交 `.env`（已在 `.gitignore`），只提交 `.env.example`

详细踩坑记录见 [deploy-notes.md](./deploy-notes.md)。
