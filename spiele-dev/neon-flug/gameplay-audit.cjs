const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  fs = require("fs"),
  path = require("path"),
  os = require("os");
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.NEON_CHROME,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const c = await b.newContext({ viewport: { width: 960, height: 540 } }),
      p = await c.newPage();
    c.setDefaultTimeout(15000);
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    const checks = [],
      check = (name, ok) => {
        checks.push({ name, ok: !!ok });
        if (!ok) throw Error(name);
      };
    await p.goto(
      (process.env.NEON_TEST_URL || "http://127.0.0.1:8099") +
        "/neon-flug?debug=1",
    );
    await p.locator("#trainingBtn").click();
    await p.locator("#launchBtn").click();
    await p.waitForFunction(() => __flight.state().phase === "playing");
    await p.waitForFunction(() => __flight.state().t > 1.2);
    await p.keyboard.press("Space");
    await p.waitForTimeout(250);
    check(
      "Trainingshinweis überschreibt keine Rückmeldung zum Team-Manöver",
      await p.evaluate(
        () =>
          __flight.state().notice === "ZWILLINGSSCHUB" &&
          document.querySelector("#notice").textContent === "ZWILLINGSSCHUB",
      ),
    );
    await p.evaluate(() =>
      __flight.simulate(Math.max(0, 90 - __flight.state().t - 1)),
    );
    for (let i = 0; i < 3; i++) await p.evaluate(() => __flight.hit(1));
    const before = await p.evaluate(() => __flight.state().players[1].down);
    await p.waitForTimeout(550);
    check(
      "Auch der Autopilot hat im Training eine echte ablaufende Rettungsfrist",
      await p.evaluate(
        (old) => __flight.state().players[1].down < old - 0.2,
        before,
      ),
    );
    await p.waitForFunction(() => __flight.state().t === 90);
    check(
      "Zielankunft schenkt keinen Sieg mit ausgefallenem Partner",
      await p.evaluate(
        () =>
          __flight.state().phase === "playing" &&
          __flight.state().players[1].hp === 0,
      ),
    );
    await p.evaluate(() =>
      __flight.setInput({ target: __flight.state().players[1].x }),
    );
    await p.waitForTimeout(800);
    await p.keyboard.down("e");
    await p.waitForFunction(() => __flight.state().phase === "result");
    await p.keyboard.up("e");
    check(
      "Partner lässt sich am Ziel mit echter Rettungseingabe zurückholen",
      await p.evaluate(() => __flight.state().players.every((p) => p.hp > 0)),
    );
    check(
      "Trainingsrettung und Trainingsabschluss geben keine Kampagnen-XP",
      await p.evaluate(
        () =>
          !JSON.parse(localStorage.getItem("aether-pilot"))?.xp &&
          localStorage.getItem("aether-records") === null,
      ),
    );
    check("Keine JavaScript-Fehler im Rettungsablauf", errors.length === 0);
    const out =
      process.env.NEON_REPORT_DIR || path.join(os.tmpdir(), "aether-qa");
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(
      path.join(out, "gameplay-audit-results.json"),
      JSON.stringify({ checks, errors }, null, 2),
    );
    console.log(JSON.stringify({ checks, errors }));
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
