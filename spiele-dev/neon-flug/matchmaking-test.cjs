const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs"),
  os = require("os"),
  path = require("path");
(async () => {
  const b = await chromium.launch({
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
    c.setDefaultTimeout(20000);
    const a = await c.newPage(),
      d = await c.newPage(),
      spectator = await c.newPage();
    const errors = [],
      checks = [];
    for (const p of [a, d, spectator])
      p.on("pageerror", (e) => errors.push(e.message));
    const check = (name, ok) => {
      checks.push({ name, ok: !!ok });
      if (!ok) throw Error(name);
    };
    for (const p of [a, d, spectator])
      p.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
    const base =
      (process.env.NEON_TEST_URL || "http://127.0.0.1:8099") +
      "/neon-flug?mp=local&debug=1";
    await a.goto(base);
    await a.locator("#hangarBtn").click();
    await a.locator("#pilotName").fill("Ada");
    await a.locator("#pilotName").dispatchEvent("change");
    await a.locator("#pilotRole").selectOption("medic");
    await a
      .locator("#hangar button[data-close]")
      .filter({ hasText: "Ausrüstung" })
      .click();
    await a.locator("#findBtn").click();
    await a.locator("#publicHostBtn").click();
    await d.goto(base);
    await d.locator("#hangarBtn").click();
    await d.locator("#pilotName").fill("Ben");
    await d.locator("#pilotName").dispatchEvent("change");
    await d
      .locator("#hangar button[data-close]")
      .filter({ hasText: "Ausrüstung" })
      .click();
    await d.locator("#findBtn").click();
    await d.locator(".room-item button").first().waitFor();
    check(
      "Suchliste zeigt den tatsächlichen Gastgeber",
      (await d.locator(".room-item strong").first().innerText()) === "Ada",
    );
    await d.screenshot({
      path: path.join(os.tmpdir(), "aether-matchmaking.png"),
    });
    await d.locator(".room-item button").first().click();
    await a.waitForFunction(
      () => window.__flight.role().connected && window.__flight.role().hello,
    );
    check(
      "Mitfliegen verbindet per WebRTC",
      await d.evaluate(() => window.__flight.role().connected),
    );
    await spectator.goto(base);
    await spectator.locator("#findBtn").click();
    await spectator.locator(".room-item button").first().waitFor();
    check(
      "Belegter Raum wird nicht als freier Platz angeboten",
      await spectator.locator(".room-item button").first().isDisabled(),
    );
    await spectator.locator("#matchScreen .exitBtn").click();
    await spectator.waitForTimeout(1700);
    check(
      "Abgebrochene Suche öffnet keine alte Ansicht",
      await spectator.locator("#menu").isVisible(),
    );
    await spectator.close();
    await a.locator("#readyBtn").click();
    await d.locator("#readyBtn").click();
    await a.locator("#launchBtn").waitFor();
    await d.locator("#launchBtn").waitFor();
    check(
      "Gewählte Rolle bleibt in der gemeinsamen Simulation",
      await d.evaluate(
        () => window.__flight.state().players[0].role === "medic",
      ),
    );
    await a.locator("#launchBtn").click();
    await d.locator("#launchBtn").click();
    await a.waitForFunction(() => window.__flight.state().phase === "playing");
    await d.waitForFunction(() => window.__flight.state().phase === "playing");
    await Promise.all([
      a.evaluate(() => document.getElementById("dashBtn").click()),
      d.evaluate(() => document.getElementById("dashBtn").click()),
    ]);
    await a.waitForFunction(() => window.__flight.state().syncs > 0);
    await d.waitForFunction(() => window.__flight.state().syncs > 0);
    check("Zwillingsschub wird bei beiden Piloten synchron angezeigt", true);
    await a.evaluate(() => window.__flight.simulate(110));
    await d.waitForFunction(() => window.__flight.state().phase === "result");
    await d.locator("#upgradeBtn").click();
    check(
      "Kapitelabschluss verbessert das lokale Pilotenprofil",
      (await d.locator("#profileProgress").innerText()).includes("100 XP"),
    );
    check(
      "Erstes Modul nach verdienter Erfahrung verfügbar",
      await d.locator("#pilotModule option[value=capacitor]").isEnabled(),
    );
    check(
      "Noch gesperrtes Modul bleibt gesperrt",
      await d.locator("#pilotModule option[value=anchor]").isDisabled(),
    );
    await d.locator("#pilotModule").selectOption("capacitor");
    await d
      .locator("#hangar button[data-close]")
      .filter({ hasText: "Ausrüstung" })
      .click();
    await a.locator("#nextBtn").click();
    await d.locator("#nextBtn").click();
    await d.waitForFunction(
      () =>
        __flight.state().level === 1 && __flight.state().phase === "briefing",
    );
    check(
      "Verdientes Modul wird im nächsten Kapitel wirksam",
      await d.evaluate(() => __flight.state().players[1].mod === "capacitor"),
    );
    await d.goto(base);
    await d.locator("#hangarBtn").click();
    check(
      "Verdientes Profil und gewähltes Modul überstehen Neuladen",
      (await d.locator("#profileProgress").innerText()).includes("100 XP") &&
        (await d.locator("#pilotModule").inputValue()) === "capacitor",
    );
    check("Keine JavaScript-Fehler", errors.length === 0);
    const out =
      process.env.NEON_REPORT_DIR || path.join(os.tmpdir(), "aether-qa");
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(
      path.join(out, "matchmaking-results.json"),
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
