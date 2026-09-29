# 部署指南 · EdgeOne Pages

两个环境：**生产**（`main`）和**测试**（`staging`），各自独立、链接永久稳定。

---

## 一、两站对照

| | 生产 | 测试 |
|---|---|---|
| 仓库 | `blackfaced/play-buddy` | 同一个仓库 |
| 生产分支 | `main` | `staging` |
| 项目域名 | `play-buddy-1hsirbvf.edgeone.cool` | `play-buddy-test-dzv7t2mx.zh-cn.edgeone.cool` |
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
npm run lint                    # 我的新文件应为 0 错（仓库原有 18 个 set-state-in-effect 错误在 main 上就有）
npm run dev                     # 本地看效果
git commit -am "xxx"
git push

# 验证通过后合到 main，生产站自动更新
git checkout main
git merge staging
git push
```

**不要直接往 main 推** —— 那是孩子正在用的环境。

---

## 三、构建配置（两个项目一致）

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

## 四、⚠️ 免费二级域名不能长期访问

**这是平台合规限制，不是配置问题。** 官方规则原文：

> 通过项目域名及部署域名访问 Pages 站点：
> 1. 加速区域为「中国大陆可用区」或「全球可用区（含中国大陆）」：
>    须使用系统生成的预览链接访问，**有效期 3 小时，超时返回 401**
> 2. 加速区域为「全球可用区（不含中国大陆）」：非中国大陆可直接访问，
>    **中国大陆网络环境将返回 401**
>
> 建议绑定自定义域名以建立稳定访问通道。

三个加速区域没有一个能让免费二级域名长期访问。**长期外网访问必须绑已备案的自定义域名。**

### 备案期间怎么测

控制台右上角 **Preview** 按钮，每次点会生成一个带 `?eo_token=...&eo_time=...` 的临时链接，**有效期 3 小时**。用它发到手机上测。

token 大约 1 分钟内就会被判过期（我们实测 `eo_time` 编码的时间戳只用了约 60 秒），所以：

- **别**把 preview 链接收藏
- **别**把它转发给别人（会立刻失效）
- 要用就重新点一次 Preview 刷新

### 备案流程

1. 买域名（`.com` / `.cn`，几十元/年，阿里云腾讯云均可）
2. 在域名所在平台提交 ICP 备案（需身份证，1-3 周）
3. 备案通过后：EdgeOne 控制台 → 项目 → 域名管理 → 添加自定义域名
4. 按提示加 CNAME 记录，平台自动配 HTTPS

备案期间不影响继续用 preview 链接测试，也不需要停掉现有部署。

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
| 访问 401 | 免费二级域名到期，或域名未备案 | 点 Preview 拿临时链接；长期解法是绑备案域名 |
| preview 链接打不开 | token 已过期（实测约 60 秒） | 重新点 Preview |
| EdgeOne 控制台找不到「域名管理」 | 未备案时部分能力隐藏 | 先备案；或用 preview 链接过渡 |
| 提交后站点没更新 | 分支不是该项目的生产分支 | 确认推的是 `main`（生产）或 `staging`（测试） |
| 构建失败 | 依赖或构建脚本问题 | 看 EdgeOne 控制台部署日志 |
| 正式站数据被测试覆盖 | 不会发生 | 两域名 localStorage 天然隔离 |

---

## 八、给 AI 协作者的部署检查清单

拿到本仓库的 EdgeOne 部署任务时，按此顺序确认：

1. **分支** — 生产改 `main`，测试改 `staging`，不要在生产分支直接开发
2. **构建命令** — 外网部署一律 `npm run build:static`，不要用 `build`
3. **环境变量** — 确认 `VITE_STUDY_BUDDY_ENABLED=false`（外网）或 `true`（家里）
4. **验证** — `npm run build` 成功 + `npm run verify:math-island` + `npm run verify:studybuddy` 全过
5. **不要**因为站点返回 401 就去改构建配置 —— 那是备案合规问题，不是代码问题
6. **不要**提交 `.env`（已在 `.gitignore`），只提交 `.env.example`

详细踩坑记录见 [deploy-notes.md](./deploy-notes.md)。
