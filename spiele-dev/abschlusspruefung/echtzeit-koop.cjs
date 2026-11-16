// Echte Spieluhr und WebRTC-DataChannels. Nur normale Lenkeingaben über den Debug-Eingabegriff;
// kein simulate(), kein Hit-/HP-Eingriff, kein Vorspulen der Kapitel.
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.NEON_TEST_URL || "http://127.0.0.1:8113";
const out = process.env.FINAL_REPORT_DIR || "/tmp/aban-abschluss";
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    args: [
      "--no-sandbox",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
    ],
  });
  const result = {
    base,
    mode: "Zwei Seiten im selben Chromium-Kontext, lokale Signalisierung, echte DataChannels, echte Laufzeit, geskriptete Lenkeingaben",
    checks: [],
    chapters: [],
    errors: [],
    pauses: 0,
  };
  let failure;
  const check = (name, ok) => {
    result.checks.push({ name, ok: !!ok });
    assert(ok, name);
  };
  try {
    const context = await browser.newContext({
      viewport: { width: 640, height: 360 },
    });
    const host = await context.newPage(),
      guest = await context.newPage();
    for (const p of [host, guest]) {
      p.setDefaultTimeout(20000);
      p.on("pageerror", (e) => result.errors.push(e.message));
      p.on("console", (m) => {
        if (m.type() === "error") result.errors.push(m.text());
      });
    }
    const url = base + "/neon-flug?mp=local&debug=1";
    await host.goto(url);
    await host.locator("#hostBtn").click();
    const code = await host.locator("#roomCode").innerText();
    await guest.goto(url);
    await guest.locator("#joinToggle").click();
    await guest.locator("#roomInput").fill(code);
    await guest.locator("#joinForm button").click();
    await host.waitForFunction(
      () => __flight.role().connected && __flight.role().hello,
    );
    await guest.waitForFunction(() => __flight.role().hello);
    await host.locator("#readyBtn").click();
    await guest.locator("#readyBtn").click();
    const { routeCache, LEVELS } = await import(
      path.resolve("js/neon-flug/core.mjs")
    );
    for (let chapter = 0; chapter < 3; chapter++) {
      await host.locator("#launchBtn").waitFor({ state: "visible" });
      await guest.locator("#launchBtn").waitFor({ state: "visible" });
      await host.locator("#launchBtn").click();
      await guest.locator("#launchBtn").click();
      await host.waitForFunction(() => __flight.state().phase === "playing");
      await host.keyboard.down("e");
      await guest.keyboard.down("e");
      const start = Date.now();
      let lastLog = -20,
        peakLag = 0,
        samples = 0;
      while (true) {
        const s = await host.evaluate(() => __flight.state());
        const other = await guest.evaluate(() => __flight.state());
        if (s.phase !== "playing" && s.phase !== "paused") break;
        assert.equal(s.level, chapter);
        assert.notEqual(s.phase, "failed");
        assert(
          Date.now() - start < 180000,
          "Kapitel überschreitet echte Drei-Minuten-Frist",
        );
        peakLag = Math.max(peakLag, Math.abs(s.t - other.t));
        samples++;
        if (s.phase === "paused") {
          result.pauses++;
          await host.locator("#resumeBtn").click();
          await guest.locator("#resumeBtn").click();
        } else {
          const fallen = s.players.find((p) => p.hp === 0);
          const next = routeCache[chapter].find((e) => e.t > s.t + 0.05);
          const target = (i) =>
            fallen
              ? fallen.x
              : !next
                ? s.players[i].x
                : next.type === "hazard"
                  ? next.x >= 0
                    ? -7
                    : 7
                  : next.type === "duet"
                    ? i
                      ? 7
                      : -7
                    : next.x;
          await host.evaluate(
            (x) => __flight.setInput({ target: x }),
            target(0),
          );
          await guest.evaluate(
            (x) => __flight.setInput({ target: x }),
            target(1),
          );
        }
        if (s.t - lastLog >= 20) {
          console.log(
            JSON.stringify({
              chapter: chapter + 1,
              seconds: +s.t.toFixed(1),
              hp: s.players.map((p) => p.hp),
              score: s.score,
            }),
          );
          lastLog = s.t;
        }
        await host.waitForTimeout(160);
      }
      await host.keyboard.up("e");
      await guest.keyboard.up("e");
      const s = await host.evaluate(() => __flight.state());
      check(
        `Kapitel ${chapter + 1} mit echter Uhr abgeschlossen`,
        s.phase === (chapter === 2 ? "victory" : "result") &&
          s.t === LEVELS[chapter].duration,
      );
      await guest.waitForFunction(
        (l) =>
          __flight.state().level === l &&
          ["result", "victory"].includes(__flight.state().phase),
        chapter,
      );
      const g = await guest.evaluate(() => __flight.state());
      check(
        `Kapitel ${chapter + 1}: gemeinsames Ergebnis`,
        g.score === s.score && g.players.every((p) => p.hp > 0),
      );
      const seconds = (Date.now() - start) / 1000;
      check(
        `Kapitel ${chapter + 1}: keine Zeitbeschleunigung`,
        seconds >= LEVELS[chapter].duration - 1,
      );
      result.chapters.push({
        chapter: chapter + 1,
        wallSeconds: seconds,
        simulationSeconds: s.t,
        score: s.score,
        rings: s.players.map((p) => p.rings),
        hp: s.players.map((p) => p.hp),
        syncLagMax: peakLag,
        samples,
      });
      await host.screenshot({
        path: path.join(out, `echtzeit-kapitel-${chapter + 1}.png`),
      });
      if (chapter < 2) {
        await host.locator("#nextBtn").click();
        await guest.locator("#nextBtn").click();
      }
    }
    check("Keine JavaScript-/Konsolenfehler", result.errors.length === 0);
    check("Keine unbeabsichtigte Pause im Dauerlauf", result.pauses === 0);
    check(
      "Verdiente Flug-XP vorhanden",
      await host.evaluate(
        () => JSON.parse(localStorage.getItem("aether-pilot")).xp >= 300,
      ),
    );
    result.passed = true;
  } catch (e) {
    failure = e;
    result.passed = false;
    result.failure = e.message;
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(out, "echtzeit-koop.json"),
      JSON.stringify(result, null, 2),
    );
  }
  console.log(JSON.stringify(result));
  if (failure) throw failure;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
