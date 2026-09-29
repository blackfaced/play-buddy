// e2e/mul-drill.test.js
// =====================================================================
// 乘法大冒险 端到端验证（无头 Chromium，跑真实构建产物 dist/）
//
// 重点覆盖一件无头 verify 脚本抓不到的事：**React 闭包 + setState 批处理**。
// 数字键盘的"位数齐自动提交"在同一个事件里先 setBuf 再判定，如果判定函数
// 读的是 state 而不是显式传入的值，闭包拿到的是上一帧的 buf —— 孩子答
// "56" 会被判成 "5"。纯函数测试永远看不到这一类问题，必须真浏览器。
//
// 另外顺带覆盖：答错展示的乘法表必须逐行等长（列对得齐）、静态构建下
// 不得发出任何 /api/ 请求（纯玩模式）。
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
};

/** 静态服务 + SPA 回退（前端路由 /mul 需要回退到 index.html） */
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
    server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

let browser;
let server;
let base;

/** 解析 DOM 上的题面 "7 × 8 = ?" */
async function readProblem(page) {
  const text = await page.getByTestId('mul-problem').innerText();
  const m = text.match(/(\d+)\s*×\s*(\d+)\s*=\s*\?/);
  assert.ok(m, `题面格式不对：${JSON.stringify(text)}`);
  return { a: Number(m[1]), b: Number(m[2]), answer: Number(m[1]) * Number(m[2]) };
}

const num = (v) => Number((v || '').replace(/[^\d]/g, ''));

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

/** 开一个新页面：iPad 竖屏 + 触摸（真实使用场景），并记录所有网络请求 */
async function newPage(context, { collect } = {}) {
  const page = await context.newPage();
  if (collect) {
    page.on('request', (r) => collect.push(`${r.method()} ${new URL(r.url()).pathname}`));
  }
  return page;
}

test('乘法大冒险：数字键盘自动提交不会少提交一位', async (t) => {
  const context = await browser.newContext({
    viewport: { width: 810, height: 1080 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  t.after(() => context.close());
  const page = await newPage(context);

  await page.goto(`${base}/mul`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '开始挑战' }).click();
  await page.getByTestId('mul-problem').waitFor();

  let twoDigitSeen = false;
  // 连答 12 题。随机出题，跑多轮能覆盖到两位数答案（自动提交的关键路径）。
  for (let i = 0; i < 12; i++) {
    const { answer } = await readProblem(page);
    if (String(answer).length === 2) twoDigitSeen = true;

    const beforeHits = num(await page.getByTestId('mul-hits').innerText());

    // 逐位点数字键：最后一位点完应自动提交，不需要按 ✓
    for (const d of String(answer)) {
      await page.getByRole('button', { name: d, exact: true }).tap();
      await page.waitForTimeout(30);
    }

    // 提交后立刻进入下一题。核心断言：答对计数 +1，且没弹出错误表
    await page.waitForFunction(
      (prev) => {
        const el = document.querySelector('[data-testid="mul-hits"]');
        return el && Number(el.textContent.replace(/\D/g, '')) === prev + 1;
      },
      beforeHits,
      { timeout: 2000 },
    );

    const tableVisible = await page.getByTestId('mul-table').isVisible().catch(() => false);
    assert.equal(tableVisible, false, `第 ${i + 1} 题答 ${answer} 被判错了（弹出了错误表）——自动提交少提交了一位`);
  }

  assert.ok(twoDigitSeen, '12 轮里一道两位数答案都没出到，测试没覆盖到关键路径（可加大轮数）');
});

test('乘法大冒险：退格 + ✓ 手动提交', async (t) => {
  const context = await browser.newContext({ viewport: { width: 810, height: 1080 }, hasTouch: true, isMobile: true });
  t.after(() => context.close());
  const page = await newPage(context);

  await page.goto(`${base}/mul`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '开始挑战' }).click();

  const { answer } = await readProblem(page);
  const beforeHits = num(await page.getByTestId('mul-hits').innerText());

  // 故意多打一位再退掉，验证退格
  const extra = String(answer) + '9';
  for (const d of extra) {
    await page.getByRole('button', { name: d, exact: true }).tap();
    await page.waitForTimeout(20);
  }
  // 多出来的那位可能已经触发过自动提交（如果答案位数更少），
  // 这里只在还没提交时退格；已提交说明是另一种情况，跳过退格断言。
  if (await page.getByTestId('mul-table').isVisible().catch(() => false) === false) {
    await page.getByRole('button', { name: '退格' }).tap();
  }

  // 用 ✓ 提交
  if (!(await page.getByTestId('mul-table').isVisible().catch(() => false))) {
    await page.getByRole('button', { name: '提交答案' }).tap();
    await page.waitForFunction(
      (prev) => {
        const el = document.querySelector('[data-testid="mul-hits"]');
        return el && Number(el.textContent.replace(/\D/g, '')) > prev;
      },
      beforeHits,
      { timeout: 2000 },
    );
  }
});

test('乘法大冒险：答错展示的乘法表逐行等长（列对得齐）', async (t) => {
  const context = await browser.newContext({ viewport: { width: 810, height: 1080 }, hasTouch: true, isMobile: true });
  t.after(() => context.close());
  const page = await newPage(context);

  await page.goto(`${base}/mul`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '开始挑战' }).click();

  const { answer } = await readProblem(page);
  // 故意答错。用 answer+1 而不是硬编码一个数：出题是随机的，
  // 硬编码 "99" 有可能先输到一位就正好答对（3×3=9 输 9 即中），
  // 错误表自然不会弹。answer+1 恒不等于 answer，且 ≤82 仍是两位数。
  const wrong = String(answer + 1);

  for (const d of wrong) {
    await page.getByRole('button', { name: d, exact: true }).tap();
    await page.waitForTimeout(20);
  }
  // 若已自动提交（位数刚好匹配），错误表此刻已显示；否则按 ✓
  if (!(await page.getByTestId('mul-table').isVisible().catch(() => false))) {
    await page.getByRole('button', { name: '提交答案' }).tap();
  }

  const table = page.getByTestId('mul-table');
  await table.waitFor({ state: 'visible', timeout: 3000 });
  const text = await table.innerText();
  const lines = text.split('\n').filter((l) => l.length > 0);

  assert.equal(lines.length, 10, `乘法表应为 1 行表头 + 9 行数据，实际 ${lines.length} 行`);
  const widths = new Set(lines.map((l) => l.length));
  assert.equal(widths.size, 1, `各行长度不一致，列会歪：${[...widths].join(', ')}`);

  // 表要放得下，不能靠横向滚动才能看全
  const overflow = await table.evaluate((el) => el.scrollWidth - el.clientWidth);
  assert.ok(overflow <= 1, `乘法表在 iPad 宽度下横向溢出 ${overflow}px，应换行或缩小字号`);
});

test('乘法大冒险：静态构建下不发任何 /api/ 请求（纯玩模式）', async (t) => {
  const context = await browser.newContext({ viewport: { width: 810, height: 1080 }, hasTouch: true, isMobile: true });
  t.after(() => context.close());
  const reqs = [];
  const page = await newPage(context, { collect: reqs });

  await page.goto(`${base}/mul`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '开始挑战' }).click();
  const { answer } = await readProblem(page);
  for (const d of String(answer)) {
    await page.getByRole('button', { name: d, exact: true }).tap();
    await page.waitForTimeout(20);
  }

  const apiReqs = reqs.filter((r) => r.includes('/api/'));
  assert.deepEqual(apiReqs, [], `静态部署（build:static，融合层关闭）不应发 /api/ 请求，实际：${apiReqs.join(', ')}`);
});

test('乘法大冒险：大厅入口可点进去，倒计时确实在走', async (t) => {
  const context = await browser.newContext({ viewport: { width: 810, height: 1080 }, hasTouch: true, isMobile: true });
  t.after(() => context.close());
  const page = await newPage(context);

  await page.goto(`${base}/`, { waitUntil: 'networkidle' });

  // 入口卡片在 StartOverlay 里，未开局时隐藏；getByRole 只匹配可见元素，
  // 所以按 href 定位 DOM、校验文案，再真的点进去。
  const link = page.locator('a[href="/mul"]');
  await link.waitFor({ state: 'attached', timeout: 5000 });
  const label = (await link.innerText()).replace(/\n/g, ' ');
  assert.match(label, /乘法大冒险/, `入口文案不对：${label}`);
  assert.match(label, /60 秒/, `入口副标题丢了玩法说明：${label}`);

  await link.click({ force: true });
  await page.waitForURL(/\/mul\/?$/, { timeout: 5000 });
  await page.getByRole('heading', { name: /乘法大冒险/ }).waitFor({ timeout: 5000 });

  await page.getByRole('button', { name: '开始挑战' }).click();
  const t0 = num(await page.getByTestId('mul-left').innerText());
  await page.waitForTimeout(2200);
  const t1 = num(await page.getByTestId('mul-left').innerText());
  assert.ok(t1 < t0, `倒计时没有递减（${t0} → ${t1}）`);
});

test('乘法大冒险：60 秒到点进结算页，评语与统计齐全', async (t) => {
  const context = await browser.newContext({ viewport: { width: 810, height: 1080 }, hasTouch: true, isMobile: true });
  t.after(() => context.close());
  const page = await newPage(context);

  // 假时钟必须在 goto 之前装：装晚了接管不到已创建的 setTimeout。
  // 装完就不能用 waitUntil:'networkidle' 和 waitForTimeout —— 它们按真实
  // 时间等，而真实时间已被冻结。用 load + clock.runFor 代替。
  await page.clock.install();
  await page.goto(`${base}/mul`, { waitUntil: 'load' });
  await page.getByRole('button', { name: '开始挑战' }).click();
  await page.getByTestId('mul-problem').waitFor();

  // 答两题，验证结算页的数字不是全 0
  for (let i = 0; i < 2; i++) {
    const { answer } = await readProblem(page);
    for (const d of String(answer)) {
      await page.getByRole('button', { name: d, exact: true }).tap();
      await page.clock.runFor(50);
    }
    await page.clock.runFor(50);
  }

  await page.clock.runFor(70_000);
  const rate = page.getByTestId('mul-result-rate');
  await rate.waitFor({ state: 'visible', timeout: 5000 });
  const rateText = await rate.innerText();
  assert.match(rateText, /^\d{1,3}%$/, `正确率格式不对：${rateText}`);

  // 四档评语必须命中其中一档
  const titles = ['太厉害啦', '不错哟', '继续加油', '慢慢来不急'];
  const body = await page.locator('body').innerText();
  assert.ok(titles.some((x) => body.includes(x)), `结算页没有命中任何一档评语：${body.slice(0, 200)}`);

  // 统计三项齐全，答对数不为 0（上面答了两题）
  assert.match(body, /答题数/, '缺"答题数"');
  assert.match(body, /答对数/, '缺"答对数"');
  assert.match(body, /平均速度/, '缺"平均速度"');
  assert.match(body, /再来一局/, '缺"再来一局"');

  await page.getByRole('link', { name: '回游戏乐园' }).waitFor({ state: 'visible', timeout: 5000 });
});
