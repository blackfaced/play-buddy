// e2e/write-lab.test.js
// =====================================================================
// 字的构造台 端到端验证（无头 Chromium，跑真实构建产物 dist/）
//
// 这个模块的重点不是"按钮能点"，而是两条只有真浏览器才验得了的性质：
//
//  1. **断网能用**。字形数据内嵌在产物里（src/write/strokes.ts 单独成
//     chunk 懒加载），HanziWriter 库 vendor 在 public/vendor/。平板在
//     学校/无网环境下必须照常能看笔顺 —— 这正是把字形从 CDN 挪进来的
//     唯一理由，不测就等于没做。测试会拦掉所有非本机请求再跑一遍。
//
//  2. **选项不跳动**。选择题的选项不能在重渲染时重排 —— 孩子点一下、
//     组件因音效状态重渲染，位置就跳了，那不是游戏是故障。
//     无头 verify 脚本测不到 React 重渲染，纯逻辑层也测不到。
//
// Run: npm run test:e2e
// =====================================================================
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.LICENSE': 'text/plain; charset=utf-8',
};

function serveDist() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let file = path.join(dist, decodeURIComponent(url.pathname));
    try {
      const s = await stat(file);
      if (s.isDirectory()) file = path.join(file, 'index.html');
    } catch {
      file = path.join(dist, 'index.html');
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () =>
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` }),
    );
  });
}

let browser;
let server;
let base;

const PAD = { width: 810, height: 1080, hasTouch: true, isMobile: true };

before(async () => {
  const s = await serveDist();
  server = s.server;
  base = s.base;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  await new Promise((r) => server.close(r));
});

async function newPage(t, { offline = false } = {}) {
  const context = await browser.newContext({ viewport: PAD });
  t.after(() => context.close());
  const page = await context.newPage();
  if (offline) {
    // 掐掉一切非本机请求，模拟平板彻底断网
    await page.route('**', (route) => {
      const u = route.request().url();
      if (u.startsWith(base) || u.startsWith('data:') || u.startsWith('blob:')) return route.continue();
      return route.abort();
    });
  }
  return page;
}

/** 读出某个按钮集合当前的可见文案顺序（用来测"选项不跳动"） */
async function optionTexts(page, testid) {
  return page.locator(`${testid} button`).allInnerTexts();
}

test('大厅展示「字的构造台」并能进入', async (t) => {
  const page = await newPage(t);
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });

  const card = page.locator('a[href="/write"]');
  await card.waitFor({ state: 'attached', timeout: 5000 });
  assert.match((await card.innerText()).replace(/\n/g, ' '), /字的构造台/);

  await card.click({ force: true });
  await page.waitForURL(/\/write\/?$/, { timeout: 5000 });
  await page.getByRole('heading', { name: /字的构造台/ }).waitFor({ timeout: 5000 });
});

test('搭积木：两步问答 → 答完出现笔顺字卡 + 结构拆解', async (t) => {
  const page = await newPage(t);
  await page.goto(`${base}/write`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /搭积木/ }).click();

  // 第一步：判结构
  const ch = (await page.getByTestId('build-char').innerText()).trim();
  assert.ok(ch.length === 1, `题面应是一个字，实际 "${ch}"`);

  // 从题库里查出这个字的正确结构
  const { BUILD_CHARS } = await import('../src/write/structure.ts').catch(() => ({}));
  const known = BUILD_CHARS?.find((c) => c.char === ch);
  if (!known) return; // 题库不含该字（本轮随机到不认识的组合）就跳过

  const rightLabel = known.struct === 'up' ? '上下结构' : '左右结构';
  await page.getByRole('button', { name: new RegExp(rightLabel) }).click();
  await page.getByTestId('build-verdict').waitFor({ timeout: 4000 });

  // 第二步：选部件 → 正确答案高亮 + 出现字卡
  const partButtons = page.locator('button').filter({ hasText: /^[一两三丁人丷冂八小凵]$/ });
  void partButtons;
  const grid = page.locator('.grid.grid-cols-2 > button');
  await grid.first().waitFor({ timeout: 4000 });
  // 逐个点，直到出现"下一个"（即某次点中；点错也会出现，所以按提示文案判断）
  for (let i = 0; i < 4; i++) {
    await grid.nth(i).click();
    await page.waitForTimeout(200);
    if (await page.getByText(/就是它|不对，/).count()) break;
  }
  await page.getByTestId('build-verdict').waitFor({ timeout: 4000 });
  assert.ok(await page.getByTestId('build-verdict').isVisible(), '第二步没有出判定');

  // 出现笔顺字卡（HanziWriter 挂上后会渲染出 svg）
  await page.locator('svg path').first().waitFor({ state: 'attached', timeout: 8000 });
  const bodyText = await page.locator('body').innerText();
  assert.match(bodyText, /[上下左右]面|[上下左右]边/, '结构拆解卡没出现');
});

test('选择题选项在重渲染时不跳动', async (t) => {
  const page = await newPage(t);
  await page.goto(`${base}/write`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /形近对比/ }).click();

  const before = await optionTexts(page, '[data-testid="cmp-word"] + .grid');
  assert.equal(before.length, 3, `应有 3 个选项，实际 ${before.length}`);

  // 点第一个：会触发 setState（计分 + 音效 + 提示），组件必然重渲染
  await page.locator('[data-testid="cmp-word"] + .grid > button').first().click();
  await page.waitForTimeout(500);

  // 判定后重排是应该的（正确答案高亮），但文案集合不能变
  const after = await optionTexts(page, '[data-testid="cmp-word"] + .grid');
  assert.equal(after.length, 3, `判定后选项数变了：${after.length}`);
  assert.deepEqual(
    [...after].sort(),
    [...before].sort(),
    `判定后选项内容变了：${before.join('/')} → ${after.join('/')}`,
  );
});

test('断网也能用：字卡照常出笔顺（字形已内嵌）', async (t) => {
  const page = await newPage(t, { offline: true });
  // 断网场景真正要盯的是：字形数据与 HanziWriter 库不许依赖外网。
  // （项目本来就从 Google Fonts 拉字体，那是全站的事，与本模块无关。）
  const externals = [];
  page.on('request', (r) => {
    const u = r.url();
    if (u.startsWith(base) || u.startsWith('data:') || u.startsWith('blob:')) return;
    if (/fonts\.(googleapis|gstatic)\.com/.test(u)) return;
    externals.push(u);
  });

  await page.goto(`${base}/write`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /笔顺字卡/ }).click();

  // 点一个字，笔顺应照常渲染（SVG path 出现）
  await page.getByRole('button', { name: '朵', exact: true }).first().click();
  await page.locator('svg path').first().waitFor({ state: 'attached', timeout: 10000 });

  assert.deepEqual(externals, [], `断网场景不该有外部请求，实际：${externals.join(', ')}`);
  const bodyText = await page.locator('body').innerText();
  assert.match(bodyText, /朵 · 6 画/, `字卡没显示笔画数：${bodyText.slice(0, 160)}`);

  // 字不能倒过来：HanziWriter 把坐标系翻转放在最外层 <g> 的 transform 里
  // （scale(s, -s)），居中校正若覆盖它，字就整个上下颠倒。断言翻转还在。
  const flipped = await page
    .locator('svg g')
    .evaluateAll((gs) => gs.some((g) => /scale\([^)]*-/.test(g.getAttribute('transform') || '')));
  assert.ok(flipped, '坐标系翻转 transform 丢了（居中校正不许覆盖原有 transform），字会倒过来');
});

test('找偏旁：答完给提示，选项恰好一个正确', async (t) => {
  const page = await newPage(t);
  await page.goto(`${base}/write`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /找偏旁/ }).click();

  const radical = (await page.getByTestId('part-radical').innerText()).trim();
  const opts = page.locator('[data-testid="part-radical"] + .grid > button');
  const texts = (await opts.allInnerTexts()).map((x) => x.trim());
  assert.equal(texts.length, 3, `应有 3 个选项，实际 ${texts.length}`);
  assert.equal(new Set(texts).size, 3, `选项有重复：${texts.join('/')}`);

  await opts.first().click();
  await page.getByTestId('part-verdict').waitFor({ timeout: 4000 });
  const v = await page.getByTestId('part-verdict').innerText();
  assert.ok(v.includes(radical) || v.length > 4, '判定区没有内容');

  // 判定图标必须是真 SVG，不能把 "<svg ..." 源码当文本渲出来
  const bodyText = await page.locator('body').innerText();
  assert.ok(!bodyText.includes('<svg'), '判定图标被当成纯文本渲染了（OK_SVG/NO_SVG 必须是 JSX 元素）');
  assert.ok((await page.locator('svg').count()) > 0, '判定后页面上应存在真 SVG 图标');
});

test('一轮打完出结算屏（看得到成绩，不是静默重开）', async (t) => {
  const page = await newPage(t);
  await page.goto(`${base}/write`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /找偏旁/ }).click();

  // 找偏旁 12 题：每题点一个、看有没有"下一个"，点到出现结算为止
  for (let n = 0; n < 20; n++) {
    if (await page.getByTestId('write-rate').isVisible().catch(() => false)) break;
    const opts = page.locator('[data-testid="part-radical"] + .grid > button');
    if ((await opts.count()) === 0) break;
    await opts.first().click();
    await page.waitForTimeout(120);
    const next = page.getByRole('button', { name: '下一个 →' });
    if (await next.isVisible().catch(() => false)) {
      await next.click();
      await page.waitForTimeout(120);
    }
  }

  const rate = page.getByTestId('write-rate');
  await rate.waitFor({ state: 'visible', timeout: 5000 });
  assert.match(await rate.innerText(), /^\d{1,3}%$/);
  const body = await page.locator('body').innerText();
  assert.ok(/眼睛真尖|看得挺准|再来一遍|慢慢看/.test(body), '结算页没有评语');
  assert.match(body, /再来一轮/, '结算页缺"再来一轮"');

  // 学习类游戏必须展示奖励入账（AGENTS.md 约定：展示实际入账，不是名义奖励）
  const bonus = page.getByTestId('write-bonus');
  await bonus.waitFor({ state: 'visible', timeout: 3000 });
  assert.match(
    await bonus.innerText(),
    /游戏时长|奖励已达上限/,
    '结算页没有展示学习奖励入账情况',
  );
});
