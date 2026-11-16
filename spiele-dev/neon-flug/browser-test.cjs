const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs"),
  path = require("path"),
  os = require("os");
const out = process.env.NEON_REPORT_DIR || path.join(os.tmpdir(), "aether-qa");
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
  c.setDefaultTimeout(20000);
  const a = await c.newPage(),
    d = await c.newPage();
  const errors = [];
  for (const p of [a, d]) {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
  }
  const url =
    (process.env.NEON_TEST_URL || "http://127.0.0.1:8099") +
    "/neon-flug.html?mp=local&debug=1";
  await a.goto(url);
  await a.waitForFunction(() => window.__flight);
  await a.screenshot({ path: path.join(out, "menu.png") });
  await a.locator("#hostBtn").click();
  const code = await a.locator("#roomCode").innerText();
  await d.goto(url);
  await d.locator("#joinToggle").click();
  await d.locator("#roomInput").fill(code);
  await d.locator("#joinForm button").click();
  await a.waitForFunction(
    () => window.__flight.role().connected && window.__flight.role().hello,
    null,
    { timeout: 20000 },
  );
  await d.waitForFunction(() => window.__flight.role().hello);
  await a.locator("#readyBtn").click();
  await d.locator("#readyBtn").click();
  await a.locator("#launchBtn").waitFor({ state: "visible" });
  await d.locator("#launchBtn").waitFor({ state: "visible" });
  await a.locator("#launchBtn").click();
  await d.locator("#launchBtn").click();
  await a.waitForFunction(() => window.__flight.state().phase === "playing");
  await a.waitForTimeout(1300);
  await a.screenshot({ path: path.join(out, "flight.png") });
  console.log("Flug gestartet");
  const checks = [];
  const check = (n, v) => {
    checks.push({ name: n, ok: !!v });
    if (!v) throw Error(n);
  };
  const oldX = await a.evaluate(() => window.__flight.state().players[1].x);
  await d.keyboard.down("ArrowRight");
  await d.waitForTimeout(250);
  await d.keyboard.up("ArrowRight");
  await a.waitForTimeout(150);
  check(
    "Gast-Eingabe am Host angekommen",
    (await a.evaluate(() => window.__flight.state().players[1].x)) > oldX + 0.2,
  );
  check(
    "Beide verbunden und im selben Level",
    await d.evaluate(() => window.__flight.state().phase === "playing"),
  );
  await d.locator("#pauseBtn").click();
  await a.waitForFunction(() => window.__flight.state().phase === "paused");
  check("Gast pausiert beide", true);
  await a.locator("#resumeBtn").click();
  await d.locator("#resumeBtn").click();
  await a.waitForFunction(() => window.__flight.state().phase === "playing");
  for (let level = 0; level < 3; level++) {
    await a.screenshot({ path: path.join(out, `kapitel-${level + 1}.png`) });
    await a.evaluate(() => window.__flight.simulate(110));
    await d.waitForFunction(
      (l) =>
        window.__flight.state().level === l &&
        ["result", "victory"].includes(window.__flight.state().phase),
      level,
    );
    check("Level " + (level + 1) + " synchron abgeschlossen", true);
    if (level < 2) {
      await a.locator("#nextBtn").click();
      await d.locator("#nextBtn").click();
      await a.waitForFunction(
        (l) =>
          window.__flight.state().level === l &&
          window.__flight.state().phase === "briefing",
        level + 1,
      );
      await d.locator("#launchBtn").waitFor({ state: "visible" });
      await a.locator("#launchBtn").click();
      await d.locator("#launchBtn").click();
      await a.waitForFunction(
        () => window.__flight.state().phase === "playing",
      );
    }
  }
  await a.screenshot({ path: path.join(out, "victory.png") });
  check(
    "Bestwerte auf Gast gespeichert",
    await d.evaluate(() =>
      JSON.parse(localStorage.getItem("aether-records")).medals.every(
        (x) => x > 0,
      ),
    ),
  );
  await d.goto("about:blank");
  await a.waitForFunction(() => !window.__flight.role().connected);
  check(
    "Ergebnis bleibt nach Abreise des Partners sichtbar",
    await a.locator("#resultScreen").isVisible(),
  );
  await a.locator("#nextBtn").click();
  check(
    "Nach Kampagnensieg ist die Rückkehr ohne Partner möglich",
    await a.locator("#menu").isVisible(),
  );
  check("Keine Konsolenfehler", errors.length === 0);
  fs.writeFileSync(
    path.join(out, "browser-results.json"),
    JSON.stringify({ checks, errors }, null, 2),
  );
  console.log(JSON.stringify({ checks, errors }));
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
