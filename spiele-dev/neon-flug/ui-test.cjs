const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  AxeBuilder = require(
    process.env.AXE_MODULE || "@axe-core/playwright",
  ).default,
  fs = require("fs");
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.NEON_CHROME,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const c = await b.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const p = await c.newPage();
  let errors = [],
    checks = [];
  p.on("pageerror", (e) => errors.push(e.message));
  const check = (name, ok) => {
    checks.push({ name, ok: !!ok });
    if (!ok) throw Error(name);
  };
  await p.goto(
    (process.env.NEON_TEST_URL || "http://127.0.0.1:8099") +
      "/neon-flug?debug=1",
  );
  await p.waitForFunction(() => window.__flight);
  check(
    "Handymenü ohne horizontalen Überlauf",
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await p.screenshot({ path: "/tmp/aether-menu-mobile.png" });
  await p.locator("#trainingBtn").click();
  check(
    "Drehhinweis im Hochformat",
    await p.locator("#rotateHint").isVisible(),
  );
  await p.setViewportSize({ width: 844, height: 390 });
  await p.locator("#launchBtn").click();
  await p.waitForTimeout(200);
  await p.mouse.move(400, 200);
  await p.mouse.down();
  await p.mouse.move(650, 200);
  await p.waitForTimeout(300);
  await p.mouse.up();
  check(
    "Ziehen lenkt eigenen Gleiter",
    await p.evaluate(() => window.__flight.state().players[0].x > -1),
  );
  await p.locator("#dashBtn").click();
  check(
    "Touch-Dash lädt nach",
    await p.evaluate(() => window.__flight.state().players[0].cooldown > 5),
  );
  await p.screenshot({ path: "/tmp/aether-flight-mobile.png" });
  await p.locator("#pauseBtn").click();
  let t = await p.evaluate(() => window.__flight.state().t);
  await p.waitForTimeout(300);
  check(
    "Pause stoppt Simulation",
    await p.evaluate((old) => window.__flight.state().t === old, t),
  );
  await p.locator("#pauseScreen .exitBtn").click();
  check(
    "Training vergibt keinen Kampagnenfortschritt",
    await p.evaluate(() => localStorage.getItem("aether-records") === null),
  );
  await p.locator("#settingsBtn").click();
  await p.locator("#reduceMotion").check();
  await p.locator("#quality").selectOption("low");
  await p
    .locator("#settings [data-close]")
    .filter({ hasText: "Zurück" })
    .click();
  await p.reload();
  await p.locator("#settingsBtn").click();
  check(
    "Grafikeinstellungen bleiben gespeichert",
    (await p.locator("#reduceMotion").isChecked()) &&
      (await p.locator("#quality").inputValue()) === "low",
  );
  await p
    .locator("#settings [data-close]")
    .filter({ hasText: "Zurück" })
    .click();
  const axe = await new AxeBuilder({ page: p })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  check("Keine WCAG-Meldung im Menü", axe.violations.length === 0);
  check("Keine unerwarteten JavaScript-Fehler", errors.length === 0);
  fs.writeFileSync(
    "/tmp/aether-ui-results.json",
    JSON.stringify({ checks, violations: axe.violations, errors }, null, 2),
  );
  console.log(JSON.stringify({ checks, errors }));
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
