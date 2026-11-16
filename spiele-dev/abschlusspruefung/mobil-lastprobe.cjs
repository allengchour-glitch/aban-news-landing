// Chromium-Handyemulation mit DPR3 und kontrollierter CPU-Drosselung; kein Hardware-Handytest.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
(async () => {
  const out = process.env.FINAL_REPORT_DIR || "/tmp/aban-abschluss";
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ["--no-sandbox"] });
  const results = [];
  try {
    for (const preset of [
      { quality: "auto", cpu: 1 },
      { quality: "low", cpu: 4 },
    ]) {
      const c = await b.newContext({
        viewport: { width: 844, height: 390 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      });
      try {
        const p = await c.newPage();
        p.setDefaultTimeout(20000);
        const errors = [];
        p.on("pageerror", (e) => errors.push(e.message));
        const cdp = await c.newCDPSession(p);
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: preset.cpu });
        await p.goto(
          (process.env.NEON_TEST_URL || "http://127.0.0.1:8113") +
            "/neon-flug?debug=1",
        );
        await p.locator("#settingsBtn").click();
        await p.locator("#quality").selectOption(preset.quality);
        await p
          .locator('#settings [data-close="settings"]')
          .filter({ hasText: "Zurück" })
          .click();
        await p.locator("#trainingBtn").click();
        await p.locator("#launchBtn").click();
        await p.waitForTimeout(1000);
        const sample = await p.evaluate(
          () =>
            new Promise((resolve) => {
              const start = performance.now(),
                sim = __flight.state().t,
                frames = [];
              let previous = start,
                running = true;
              function tick(now) {
                if (!running) return;
                frames.push(now - previous);
                previous = now;
                requestAnimationFrame(tick);
              }
              requestAnimationFrame(tick);
              setTimeout(() => {
                running = false;
                frames.sort((a, b) => a - b);
                const wall = (performance.now() - start) / 1000;
                resolve({
                  wallSeconds: wall,
                  simulationSeconds: __flight.state().t - sim,
                  fps: frames.length / wall,
                  p50: frames[Math.floor(frames.length * 0.5)],
                  p95: frames[Math.floor(frames.length * 0.95)],
                  phase: __flight.state().phase,
                  graphics: __flight.graphics(),
                });
              }, 8000);
            }),
        );
        assert.equal(sample.phase, "playing");
        assert(
          sample.simulationSeconds >= sample.wallSeconds * 0.95,
          "Spieluhr verliert unter Last Zeit",
        );
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: 400, y: 180, id: 1 }],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: 650, y: 180, id: 1 }],
        });
        await p.waitForTimeout(650);
        assert(
          (await p.evaluate(() => __flight.state().players[0].x)) > 0,
          "Gehaltene Touch-Lenkung reagiert nicht",
        );
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await p.locator("#pauseBtn").tap();
        const t = await p.evaluate(() => __flight.state().t);
        await p.waitForTimeout(350);
        assert.equal(await p.evaluate(() => __flight.state().t), t);
        assert.equal(errors.length, 0);
        const item = {
          ...preset,
          viewport: "844x390",
          deviceScaleFactor: 3,
          checksPassed: true,
          ...sample,
          errors,
        };
        results.push(item);
        console.log(JSON.stringify(item));
      } finally {
        await c.close();
      }
    }
  } finally {
    await b.close();
    fs.writeFileSync(
      path.join(out, "mobil-lastprobe.json"),
      JSON.stringify(
        {
          environment:
            "Chromium-Emulation; CPU-Drosselung ist kein echtes Handy",
          complete: results.length === 2,
          results,
        },
        null,
        2,
      ),
    );
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
