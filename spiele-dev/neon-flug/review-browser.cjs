// Gezielte Gegenproben zu Parent-Review: HUD-Überlagerung und verspätete Speicherung.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  fs = require("fs"),
  path = require("path");
const out = process.env.NEON_REPORT_DIR || "/tmp/neon-flug-v4-qa";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEON_CHROME,
    args: ["--no-sandbox"],
  });
  const checks = [],
    errors = [];
  const check = (name, ok, details) => {
    checks.push({ name, ok, ...(details ? { details } : {}) });
    if (!ok) throw Error(name);
  };
  try {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 640, height: 360 },
      { width: 960, height: 540 },
    ]) {
      const c = await browser.newContext({
          viewport,
          hasTouch: true,
          isMobile: true,
        }),
        p = await c.newPage();
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(
        (process.env.NEON_TEST_URL || "http://127.0.0.1:8186") +
          "/neon-flug?debug=1",
      );
      await p.locator("#flightMode").selectOption("shoot");
      await p.locator("#trainingBtn").click();
      if (viewport.width < viewport.height)
        await p.locator("#portraitBtn").click();
      await p.locator("#launchBtn").click();
      await p.waitForFunction(() => __flight.state().t > 0.2);
      const geometry = await p.evaluate(() => {
        const rect = (s) => {
          const r = document.querySelector(s).getBoundingClientRect();
          return {
            x: r.x,
            y: r.y,
            right: r.right,
            bottom: r.bottom,
            width: r.width,
            height: r.height,
          };
        };
        const f = rect(".flight-feedback"),
          team = rect(".team-hud"),
          actions = rect(".flight-actions"),
          fire = rect("#fireBtn"),
          r = rect(".resonance-hud");
        const overlap = (a, b) =>
          a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y;
        const hit = document.elementFromPoint(
          fire.x + fire.width / 2,
          fire.y + fire.height / 2,
        );
        return {
          f,
          team,
          actions,
          fire,
          resonance: r,
          noOverlap:
            !overlap(f, team) && !overlap(f, actions) && !overlap(r, team),
          fireReachable:
            fire.x >= 0 &&
            fire.right <= innerWidth &&
            fire.bottom <= innerHeight &&
            hit?.closest("#fireBtn") !== null,
        };
      });
      check(
        `${viewport.width}×${viewport.height}: HUD getrennt, Feuer erreichbar`,
        geometry.noOverlap && geometry.fireReachable,
        geometry,
      );
      // Echte Touch-Schnittstelle (kein direkter Zustand): Knopf halten und lösen.
      const cd = await c.newCDPSession(p),
        box = geometry.fire;
      await cd.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }],
      });
      await p.waitForTimeout(280);
      await cd.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      check(
        `${viewport.width}×${viewport.height}: Touch-Feuer funktioniert`,
        await p.evaluate(() => __flight.state().shotSerial >= 1),
      );
      await p.screenshot({
        path: path.join(out, `hud-${viewport.width}x${viewport.height}.png`),
      });
      await c.close();
    }
    const c = await browser.newContext(),
      p = await c.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      (process.env.NEON_TEST_URL || "http://127.0.0.1:8186") +
        "/neon-flug?debug=1",
    );
    const result = await p.evaluate(async () => {
      const { createState } = await import("/js/neon-flug/core.mjs");
      const s = createState(0, [], { mode: "shoot" });
      s.phase = "victory";
      s.t = 60;
      s.kills = 2;
      return s;
    });
    await p.evaluate((s) => {
      Object.defineProperty(navigator, "locks", {
        configurable: true,
        value: {
          request: (_name, fn) =>
            new Promise((resolve) => {
              window.finishReward = () => resolve(fn());
            }),
        },
      });
      __flight.replayResult(s);
    }, result);
    await p.locator("#resultScreen .exitBtn").click();
    await p.locator("#hangarBtn").click();
    await p.locator("#pilotRole").selectOption("medic");
    await p.locator("#pilotName").fill("Neue Wahl");
    await p.locator("#pilotName").dispatchEvent("change");
    await p.locator('#hangar .primary[data-close="hangar"]').click();
    await p.locator("#trainingBtn").click();
    const newRun = await p.evaluate(() => __flight.state().runId);
    await p.evaluate(() => finishReward());
    await p.waitForTimeout(150);
    check(
      "Spätes WebLock überschreibt weder neuen Run noch Rolle/Name",
      await p.evaluate(
        (id) =>
          __flight.state().runId === id &&
          __flight.role().screen === "briefing" &&
          JSON.parse(localStorage.getItem("aether-pilot")).role === "medic" &&
          JSON.parse(localStorage.getItem("aether-pilot")).name === "Neue Wahl",
        newRun,
      ),
    );
    await p.evaluate((s) => {
      Object.defineProperty(navigator, "locks", {
        configurable: true,
        value: { request: () => Promise.reject(Error("Lock gesperrt")) },
      });
      __flight.replayResult(s);
    }, result);
    await p.waitForFunction(() =>
      document
        .querySelector("#xpResult")
        .textContent.includes("bereits gespeichert"),
    );
    check(
      "Abgelehnter Lock bleibt idempotent und ohne Rejection",
      await p.evaluate(
        () => JSON.parse(localStorage.getItem("aether-pilot")).xp === 110,
      ),
    );
    const denied = { ...result, runId: "quota-review" };
    await p.evaluate((s) => {
      Storage.prototype.setItem = function () {
        throw new DOMException("Quota", "QuotaExceededError");
      };
      __flight.replayResult(s);
    }, denied);
    await p.waitForFunction(() =>
      document
        .querySelector("#xpResult")
        .textContent.includes("Nur für diese Sitzung"),
    );
    await p.evaluate((s) => __flight.replayResult(s), denied);
    await p.waitForFunction(() =>
      document
        .querySelector("#xpResult")
        .textContent.includes("bereits gespeichert"),
    );
    check(
      "Quota-Fallback behält RAM-XP/Claims trotz lesbarem altem Profil",
      await p.evaluate(
        () =>
          __flight.pilot().xp === 220 &&
          JSON.parse(localStorage.getItem("aether-pilot")).xp === 110 &&
          document
            .querySelector("#xpResult")
            .textContent.includes("Nur für diese Sitzung"),
      ),
    );
    await p.evaluate((s) => __flight.replayResult(s), {
      ...denied,
      runId: "quota-second",
    });
    await p.waitForFunction(() =>
      document.querySelector("#xpResult").textContent.includes("+110 Flug-XP"),
    );
    check(
      "Zweiter Run nach Quota erhält ersten RAM-Fortschritt ohne Doppel-XP",
      await p.evaluate(
        () =>
          __flight.pilot().xp === 330 &&
          __flight.pilot().claimed.length === 3 &&
          JSON.parse(localStorage.getItem("aether-pilot")).xp === 110,
      ),
    );
    check(
      "Keine JavaScript-Fehler bei Reviewgegenproben",
      errors.length === 0,
      errors,
    );
    console.log(JSON.stringify({ checks, errors }, null, 2));
  } finally {
    fs.writeFileSync(
      path.join(out, "review-browser.json"),
      JSON.stringify({ checks, errors }, null, 2),
    );
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
