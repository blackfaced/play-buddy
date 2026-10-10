// Original nautical escape room: browser regression on real production build.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = path.join(root, "dist");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".LICENSE": "text/plain; charset=utf-8",
};

function serveDist() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    let file = path.join(dist, decodeURIComponent(url.pathname));
    try {
      const s = await stat(file);
      if (s.isDirectory()) file = path.join(file, "index.html");
    } catch {
      file = path.join(dist, "index.html");
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream",
      });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () =>
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` }),
    );
  });
}

let browser, server, base;
before(async () => {
  const hosted = await serveDist();
  server = hosted.server;
  base = hosted.base;
  browser = await chromium.launch(
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
          args: ["--no-sandbox"],
        }
      : {},
  );
});
after(async () => {
  await browser?.close();
  await new Promise((resolve) => server?.close(resolve));
});
const close = (page) =>
  page.getByRole("button", { name: "关闭近景", exact: true }).click();
const turn = (page, name) =>
  page
    .getByRole("navigation", { name: "船舱视角" })
    .getByRole("button", { name: new RegExp(name) })
    .click();
const bag = (page, name) =>
  page
    .locator(".escape-items")
    .getByRole("button", { name, exact: true })
    .click();
test("complete room: exploration, errors, inventory combination, reload, notes, picture rings, door, onward navigation and scoped reset", async () => {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) =>
    route.request().url().startsWith(base) ? route.continue() : route.abort(),
  );
  await page.goto(base + "/escape?scene=cabin");
  await page.getByRole("button", { name: "开始探索" }).click();
  await page.getByRole("button", { name: "检查递推算图", exact: true }).click();
  assert.equal(
    await page.getByRole("dialog", { name: "航海员的递推算图" }).count(),
    1,
  );
  await page.getByLabel("第2行第2格，星", { exact: true }).fill("3");
  await close(page);
  await page.getByRole("button", { name: "检查递推算图", exact: true }).click();
  assert.equal(
    await page.getByLabel("第2行第2格，星", { exact: true }).inputValue(),
    "3",
  );
  await close(page);
  await page.getByRole("button", { name: "检查小抽屉" }).click();
  await page.getByLabel("抽屉三位密码").fill("000");
  await page.getByRole("button", { name: "试着打开" }).click();
  assert.ok(
    (await page.locator(".escape-modal-status").textContent()).includes(
      "没有转动",
    ),
  );
  await page.getByLabel("抽屉三位密码").fill("375");
  await page.getByRole("button", { name: "试着打开" }).click();
  await close(page);
  await page.getByRole("button", { name: "检查搪瓷杯" }).click();
  await page.getByRole("button", { name: "移开搪瓷杯" }).click();
  await page.getByRole("button", { name: "拿起软布" }).click();
  await close(page);
  await page.getByRole("button", { name: "检查航海日志" }).click();
  assert.equal(await page.locator('.escape-log-entry').count(), 6);
  await close(page);
  await turn(page, "海图墙");
  await page.getByRole("button", { name: "检查海图", exact: true }).click();
  // Tools remain selectable inside the open native dialog.
  await page.getByRole("button", { name: "选用软布", exact: true }).click();
  await page.getByRole("button", { name: "擦去盐霜" }).click();
  assert.equal(await page.locator('.escape-dirty-chart').count(), 1);
  await page.getByRole("button", { name: "选用软布", exact: true }).click();
  await page.getByRole("button", { name: "擦去盐霜" }).click();
  await close(page);
  await page.reload();
  assert.equal(
    await page
      .locator(".escape-items")
      .getByRole("button", { name: "软布", exact: true })
      .count(),
    1,
  );
  await page.getByRole("button", { name: "航海手记", exact: true }).click();
  assert.equal(await page.getByText("擦净的海图", { exact: true }).count(), 1);
  await close(page);
  await turn(page, "海图墙");
  await page.getByRole("button", { name: "检查方向锁" }).click();
  for (const direction of ["↑", "→", "↓", "→", "↑"])
    await page
      .getByRole("button", { name: "航向" + direction, exact: true })
      .click();
  await page.getByRole("button", { name: "确认航线" }).click();
  await close(page);
  await bag(page, "马蹄磁铁");
  await bag(page, "细绳");
  assert.equal(
    await page
      .locator(".escape-items")
      .getByRole("button", { name: "系绳磁铁", exact: true })
      .count(),
    1,
  );
  await turn(page, "船模角");
  await page.getByRole("button", { name: "检查木条画" }).click();
  assert.equal(
    await page.getByRole("img", { name: "海边灯塔参考图" }).count(),
    0,
  );
  await page
    .getByRole("button", { name: "木条 3、6、9、？", exact: true })
    .click();
  await page.getByRole("button", { name: "槽位 8，空槽", exact: true }).click();
  assert.ok(!(await page.locator(".escape-modal-status").textContent()).includes("没有嵌合"));
  await page.getByRole("button", { name: "槽位 8，木条 3、6、9，点击拿下", exact: true }).click();
  await page.getByRole("button", { name: "木条 3、6、9、？", exact: true }).click();
  await page.getByRole("button", { name: "槽位 12，空槽", exact: true }).click();
  await close(page);
  await page.reload();
  await turn(page, "船模角");
  await page.getByRole("button", { name: "检查木条画" }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "槽位 12，木条 3、6、9，点击拿下", exact: true })
      .isDisabled(),
    false,
  );
  for (const [sequence, slot] of [
    ["2、4、6", 8],
    ["1、6、11", 16],
    ["1、4、7", 10],
    ["2、6、10", 14],
  ]) {
    const strip = page.getByRole("button", {
      name: `木条 ${sequence}、？`,
      exact: true,
    });
    await strip.focus();
    await page.keyboard.press("Enter");
    await page
      .getByRole("button", { name: `槽位 ${slot}，空槽`, exact: true })
      .click();
  }
  await page.getByRole("button", { name: "确认整幅画", exact: true }).click();
  assert.equal(
    await page.getByRole("img", { name: "海边灯塔参考图" }).count(),
    1,
  );
  await close(page);
  await page.getByRole("button", { name: "检查船模细缝" }).click();
  const fishingTool = page.getByRole("button", { name: "选用系绳磁铁", exact: true });
  if (await fishingTool.getAttribute("aria-pressed") !== "true") await fishingTool.click();
  await page.getByRole("button", { name: "探入船模细缝" }).click();
  await close(page);
  await bag(page, "日光徽章");
  await turn(page, "甲板舱门");
  await page.getByRole("button", { name: "检查圆环匣" }).click();
  await page.getByRole("button", { name: "嵌入两枚徽章" }).click();
  assert.ok(
    !(await page.locator(".escape-bag-label").textContent()).includes(
      "已选：日光",
    ),
  );
  await page.getByRole("button", { name: "按下中央锁扣" }).click();
  assert.ok(
    (await page.locator(".escape-modal-status").textContent()).includes(
      "还没有复原",
    ),
  );
  for (const [i, name] of ["外环", "中环", "内环"].entries())
    for (let count = 0; count < [3, 2, 1][i]; count++)
      await page.getByRole("button", { name, exact: true }).click();
  await page.getByRole("button", { name: "按下中央锁扣" }).click();
  await close(page);
  await bag(page, "黄铜钥匙");
  await page.getByRole("button", { name: "检查甲板舱门" }).click();
  await page.getByRole("button", { name: "转动钥匙" }).click();
  assert.equal(
    await page.getByText("星光，是给好奇心的礼物。", { exact: true }).count(),
    1,
  );
  await page.reload();
  assert.equal(
    await page.getByText("星光，是给好奇心的礼物。", { exact: true }).count(),
    1,
  );
  await page.getByRole("button", { name: "本场景已完成 · 选择下一场景 →" }).click();
  await page.locator('.scene-library').waitFor();
  assert.equal(await page.locator('.scene-library').count(), 1);
  await page.getByRole("button", { name: "进入航海员的钥匙", exact: true }).click();
  await page.locator('.escape-finale').waitFor();
  assert.equal(await page.locator('.escape-finale').count(), 1);
  await page.getByRole("button", { name: "回船舱看看", exact: true }).click();
  await turn(page, "甲板舱门");
  await page.getByRole("button", { name: "检查圆环匣", exact: true }).click();
  await page.getByText("圆环匣打开了", { exact: false }).waitFor();
  assert.equal(await page.getByText("圆环匣打开了", { exact: false }).count(), 1);
  await close(page);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("play-buddy:escape:starlight:v1")).state.escaped), true);
  assert.deepEqual(errors, []);
  await page.close();
});
test("mobile layout, Escape dismissal, gradual hints, corrupted saves recover", async () => {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await page.goto(base);
  await page.evaluate(() =>
    localStorage.setItem(
      "play-buddy:escape:starlight:v1",
      '{"version":1,"state":{"escaped":true}}',
    ),
  );
  await page.goto(base + "/escape?scene=cabin");
  assert.equal(await page.locator(".escape-scene").count(), 1);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.getByRole("button", { name: "来点提示" }).click();
  assert.equal(await page.locator(".escape-hint-lines p").count(), 1);
  await page.getByRole("button", { name: "解释规律" }).click();
  assert.equal(await page.locator(".escape-hint-lines p").count(), 2);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog").count(), 0);
  await page.getByRole("button", { name: "检查小抽屉" }).click();
  await page.getByLabel("抽屉三位密码").fill("375");
  await close(page);
  await page.getByRole("button", { name: "检查小抽屉" }).click();
  assert.equal(await page.getByLabel("抽屉三位密码").inputValue(), "375");
  await close(page);
  await turn(page, "船模角");
  await page.getByRole("button", { name: "检查木条画" }).click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page
    .getByRole("button", { name: "木条 3、6、9、？", exact: true })
    .tap();
  await page.getByRole("button", { name: "槽位 12，空槽", exact: true }).tap();
  assert.equal(
    await page
      .getByRole("button", { name: "槽位 12，木条 3、6、9，点击拿下", exact: true })
      .isDisabled(),
    false,
  );
  await page.screenshot({ path: "/tmp/escape-mobile.png", fullPage: true });
  await page.close();
});

test("global health lock interrupts a native puzzle dialog without losing progress", async () => {
  const page = await browser.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("bb.streakMs", String(25 * 60000 - 5000));
    localStorage.setItem("bb.lastVisibleAt", String(Date.now()));
    localStorage.setItem("bb.sound", "off");
  });
  await page.goto(base + "/escape?scene=cabin");
  await page.getByRole("button", { name: "开始探索" }).click();
  await page.getByRole("button", { name: "检查递推算图" }).click();
  await page
    .getByRole("heading", { name: "该休息啦", exact: true })
    .waitFor({ timeout: 12000 });
  assert.equal(await page.locator("dialog.escape-modal").count(), 0);
  assert.equal(
    await page.locator("main.escape-app").evaluate((element) => element.inert),
    true,
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("play-buddy:escape:starlight:v1")),
  );
  assert.equal(saved.state.drawer, false);
  assert.ok(saved.state.seen.includes("letter"));
  await page.close();
});

test("legacy cabin migration preserves solved puzzles across guidance changes", async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(base);
  await page.evaluate(() => localStorage.setItem(
    "play-buddy:escape:starlight:v1",
    JSON.stringify({ version: 1, state: {
      cloth: false, chart: false, drawer: true, cabinet: false,
      combined: false, token2: false, tokensInserted: false,
      safe: false, escaped: false, rings: [1, 2, 3],
      seen: ["letter", "postcard"],
    } }),
  ));
  await page.goto(base + "/escape?scene=cabin");
  assert.equal(await page.locator('[data-puzzle="number-triangle"]').count(), 1);
  assert.equal(await page.locator('[data-number-cell]').count(), 15);
  await page.getByRole("button", { name: "检查递推算图", exact: true }).click();
  assert.equal(await page.getByLabel("五行直角三角算图").count(), 1);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog").count(), 0);
  await page.getByRole("button", { name: "检查递推算图", exact: true }).click();
  await close(page);
  await page.reload();
  const readSave = () => page.evaluate(() => JSON.parse(
    localStorage.getItem("play-buddy:escape:starlight:v1"),
  ).state);
  assert.equal((await readSave()).drawer, true);
  assert.equal((await readSave()).picture, true);
  await page.getByLabel("探索模式", { exact: true }).selectOption("challenge");
  await page.reload();
  assert.equal(await page.getByLabel("探索模式", { exact: true }).inputValue(), "challenge");
  assert.equal((await readSave()).drawer, true);
  assert.equal((await readSave()).picture, true);
  await page.getByLabel("探索模式", { exact: true }).selectOption("standard");
  assert.equal((await readSave()).drawer, true);
  assert.equal((await readSave()).picture, true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.close();
});
