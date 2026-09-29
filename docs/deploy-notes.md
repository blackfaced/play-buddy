# 部署踩坑记录

按时间顺序记录实际遇到的问题和结论。**下次遇到同类问题先查这里。**

---

## 1. 沙箱 deploy 工具每次生成新域名（不可用）

**现象**
用 `website_deploy` 部署同一个站，链接每次都变：
`zffso8qon7rrr` → `u2ywbbxmid1sp` → `q6fz4xu7pyb8y` → …… 攒了 18 个废弃链接。

**根因**
翻 drive 里 33 条部署记录的 metadata：

```json
"deploy_domain": "kkmf5xbt6k9xa",   ← 每个部署一个随机子域名
"content_revision": 1,                ← 永远是 1
"is_custom_domain": false
```

`content_revision` 永远是 1，说明这个部署模型里**没有「更新已有部署」这个操作** —— 每次发布都是创建一个全新的、不可变的产物。域名绑在「发布事件」上，不是绑在「项目」上。

工具参数只接受 `path`，不接受「更新到哪个站点」。平台虽有 `is_custom_domain` 字段，但该工具没暴露出来。

**结论**：这个沙箱的 deploy 工具**无法用于需要 URL 稳定的场景**。换托管方式。

> 对比：Kimi 的 agent 部署链接不变，推测是绑在持久化 project ID 上，更新时覆盖同一地址。

---

## 2. Supabase Storage 不能托管交互式网页

**现象**
上传 `index.html` 到公开桶，文件能取到（87884 字节一字不差），但浏览器打不开。

**响应头**
```
content-type: text/plain
content-security-policy: default-src 'none'; sandbox
```

第二条是致命的 —— 禁止一切内联脚本和样式，页面直接白屏。

**根因**
Supabase 对 HTML 文件的服务端硬编码：强制 `text/plain` + sandbox CSP。这是防存储型 XSS 的设计，不是配置问题。

**试过的绕法（全部无效）**
- 认证接口 `/storage/v1/object/authenticated/...` → 同样被改写
- 加 `Accept: text/html` 请求头 → 无效
- 加 `?download=false` → 无效

**结论**：Supabase **可以**当数据库（数据读写、RLS 都正常），**不能**当网页托管。

---

## 3. 阿里云 OSS / 火山引擎 TOS 同样不行

**官方文档原文**

阿里云 OSS：
> 出于安全考虑，中国区域自 2018 年 8 月 13 日起……使用 OSS **默认域名**访问时，Response Header 中会自动加上 `Content-Disposition: attachment`，即不会显示文件内容，而是以附件形式进行下载

火山引擎 TOS：
> 设置静态网站后，**必须绑定自定义域名才能生效**……使用存储桶的**默认域名**访问网页类型文件时，将不会直接预览网站

**根因**：这两家是**对象存储**（设计目标是存文件供下载），内置了防下载机制。它们的默认域名就是不让渲染 HTML 的。

**正解**：用**网页托管平台**（Pages 类），不是对象存储。EdgeOne Pages 专门托管前端应用，不会加防下载头。

---

## 4. EdgeOne Pages 免费二级域名不能长期访问

**现象**
部署成功，控制台能预览，但 `https://xxx.edgeone.cool` 裸访问返回 401。

**平台返回**
```
401 UNAUTHORIZED
Access Restricted or Authentication Expired
Site Owner: Click "Preview" in the console for a new link.
```

**官方规则**（文档「域名管理」章节）
| 加速区域 | 项目域名访问规则 |
|---|---|
| 中国大陆可用区 | 仅预览链接，**3 小时**有效，超时 401 |
| 全球可用区（含中国大陆） | 同上 |
| 全球可用区（不含中国大陆） | 非中国大陆可访问，**中国大陆 401** |
| 绑定已备案自定义域名 | 稳定访问 |

**三个区域没有一个能让免费二级域名长期访问。这是合规要求，不是 bug。**

**长期解法**：绑定已 ICP 备案的自定义域名。

**备案期间**：用控制台 **Preview** 按钮的临时链接测试。注意 token 有效期比文档说的 3 小时短得多 —— 实测 `eo_time` 时间戳只给了约 60 秒，所以链接基本点开即废，每次用都要重新点 Preview。

**排查提示**：控制台里可能**根本找不到「域名管理」入口**（未备案时部分能力隐藏），别以为是版本问题。

---

## 5. 构建配置三处容易填错

| 项 | 错误填法 | 正确填法 | 后果 |
|---|---|---|---|
| 构建命令 | `npm run build` | `npm run build:static` | 外网每次加载白等 2.5s 探测超时 |
| 安装命令 | `npm install` | 留空 | 本项目无运行时依赖，多余安装拖慢构建 |
| 输出目录 | `dist` | `dist` ✅ | 这个没错，但 `root` 必须是 `./` |

---

## 6. `import.meta` 在 CommonJS 编译下非法

**现象**
把环境变量开关值写成：
```ts
export const FUSION_ENABLED = isFusionEnabled(import.meta.env);
```
`verify:studybuddy` 脚本立刻编译失败：
```
error TS1343: The 'import.meta' meta-property is only allowed when
the '--module' option is 'es2020'...
```

**根因**
项目的 verify 脚本用 `tsconfig.verify.json` 编译成 CommonJS 跑（`module: ES2020` + `moduleResolution: bundler`），那个模式下 `import.meta` 是语法错误。

**正解**：用 vite `define` 把值注入到 `globalThis` 上的常量，用 `typeof` 守卫读取。

```ts
// vite.config.ts
define: {
  __STUDY_BUDDY_ENABLED__: JSON.stringify(studyBuddyFlag),
}

// 使用侧
declare const __STUDY_BUDDY_ENABLED__: string | undefined;
export const FUSION_ENABLED = ((): boolean => {
  try {
    if (typeof __STUDY_BUDDY_ENABLED__ !== 'undefined') { /* ... */ }
  } catch { /* Node 单测下取不到 */ }
  return true;
})();
```

**泛化**：任何需要「既能在 vite 浏览器构建、又能被 CommonJS 单测引用」的模块，都不能直接用 `import.meta`。

---

## 7. 随机生成题目的两类撞车

写 `verify-math-island` 时跑出来的：

**a. L3 应用题被随机题挤掉**
应用题 `56-19` 也在随机生成池里。随机题先生成占了坑，应用题被跳过 → 题量不足 18。

```ts
// 修正：随机题避开题库全集
const wpKeys = new Set(WORD_PROBLEMS.map((w) => `${w.a}${w.op}${w.b}`));
if (seen.has(key) || wpKeys.has(key)) continue;
```

**b. 错题 id 撞车导致标记失败**
`find(x => x.id === mistakeId)` 遇到两条同 id 记录时只命中第一条，另一条永远标不上「已掌握」。

```ts
// 修正：用数组下标而非 id 定位
mIdx: wrongList.indexOf(m)
const m = wrongList[q.mIdx];
```

**泛化**：随机数据生成器必须考虑「有限题库」和「随机池」的交集，不能只判重。

---

## 8. 测试断言写错被误判成代码 bug

三次，都是我自己的测试写错：

| 我断言的 | 实际应该是 | 真相 |
|---|---|---|
| `starsToBonusMs(54) === 54*10000` | `=== 5*60000` | 54 星已超 5 分钟封顶 |
| `resolveRewardCapMs('1.5') === 2*MIN` | `=== 1.5*MIN` | 1.5 分钟就是 90000ms |
| mock 路由少包一层 `{daily:[...]}` | — | 路由未命中，`fetchStudyReward` 返回 null |

**教训**：断言失败时先怀疑测试，再怀疑实现。把实现改到「符合错误断言」是在制造技术债。

---

## 9. git 在沙箱里证书校验失败

**现象**
`git clone https://github.com/...` 报 `server certificate verification failed`。

**正解**
```bash
git -c http.sslVerify=false clone ...
```

**推送时 token 带冒号会被当 refspec**
```bash
# ❌ 失败：error: src refspec https://<user> does not match any
#    （remote URL 里的 user:token@ 被 git 当成 refspec 的一部分）
git push https://<user>:<PAT>@github.com/<user>/<repo>.git <branch>

# ✅ 用 credential helper，token 不会进 .git/config 明文
git -c credential.helper='!f() { echo username=<user>; echo password=<PAT>; }; f' push
```

**建议**：让用户提供 PAT 走 credential helper，不把 token 写进 remote URL
（写进去会长期明文留在 `.git/config` 里，删了 remote 也还在）。

---

## 10. 存在两个仓库时，先问清楚

**教训**
`study-buddy` 里早已有糖果口算岛（16 个文件、10 个测试、46.9KB），我却在 `/workspace` 从零又造了一个 81KB 的单文件版，还差点推错仓库。

**AGENTS.md 里其实写着**：
> study-buddy is a **hub**: one shared backend + multiple hung apps under `web/<app-dir>/`.
> v0.5b+ turns it into an application platform, first hung app is 糖果口算岛.

**该做的**：接到「加个游戏」的需求时，先 `gh` / GitHub API 看一眼用户有哪些仓库、里面已有什么。30 秒的事，能省几小时返工。

---

## 附：完整验证清单

改动后跑这些，全绿再推：

```bash
npm run build                              # 编译 + 打包
npm run lint                               # 注意：我新增的文件应为 0 错
npm run verify:math-island                 # 口算岛题目生成（194 万项断言）
npm run verify:studybuddy                  # 融合层 + 环境变量开关
node -e "/* 检查 dist 产物里 define 是否替换 */"
```

`npm run build:static` 后额外确认产物里 `__STUDY_BUDDY_ENABLED__` 字面量已被替换（minify 后会变成 `"false"` 这样的字面量）。
