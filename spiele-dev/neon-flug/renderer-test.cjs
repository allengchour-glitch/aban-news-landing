const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  fs = require("fs"),
  path = require("path"),
  os = require("os");
(async () => {
  const b = await chromium.launch({
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const c = await b.newContext({ viewport: { width: 960, height: 540 } });
    c.setDefaultTimeout(20000);
    await c.addInitScript(() => {
      window.__glRequests = 0;
      window.__glDraws = 0;
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (/webgl/.test(type)) window.__glRequests++;
        return original.call(this, type, ...args);
      };
      for (const API of [
        window.WebGLRenderingContext,
        window.WebGL2RenderingContext,
      ])
        if (API)
          for (const name of [
            "drawArrays",
            "drawElements",
            "drawArraysInstanced",
            "drawElementsInstanced",
          ]) {
            const fn = API.prototype[name];
            if (fn)
              API.prototype[name] = function (...args) {
                window.__glDraws++;
                return fn.apply(this, args);
              };
          }
    });
    const p = await c.newPage(),
      checks = [];
    const check = (name, ok) => {
      checks.push({ name, ok: !!ok });
      if (!ok) throw Error(name);
    };
    const base =
      (process.env.NEON_TEST_URL || "http://127.0.0.1:8099") +
      "/neon-flug?debug=1";
    await p.goto(base);
    check(
      "Standarddarstellung benötigt keinen WebGL-Kontext",
      await p.evaluate(
        () =>
          __glRequests === 0 &&
          __flight.graphics().backend.startsWith("Canvas2D"),
      ),
    );
    await p.locator("#trainingBtn").click();
    await p.locator("#launchBtn").click();
    await p.waitForTimeout(300);
    check(
      "Training läuft ohne versteckte WebGL-Darstellung",
      await p.evaluate(
        () => __glRequests === 0 && __flight.state().phase === "playing",
      ),
    );
    await p.locator("#settingsBtn").click();
    await p.locator("#quality").selectOption("high");
    check(
      "3D bleibt bewusst anwählbar",
      await p.evaluate(
        () =>
          __glRequests > 0 &&
          !__flight.graphics().backend.startsWith("Canvas2D"),
      ),
    );
    await p.locator("#quality").selectOption("auto");
    const draws = await p.evaluate(() => __glDraws);
    await p.waitForTimeout(500);
    check(
      "Verdeckte 3D-Ansicht rendert im Schnellmodus nicht weiter",
      await p.evaluate(
        (n) =>
          __glDraws === n && __flight.graphics().backend.startsWith("Canvas2D"),
        draws,
      ),
    );
    await p.close();
    const f = await c.newPage();
    await f.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return /webgl/.test(type) ? null : original.call(this, type, ...args);
      };
      localStorage.setItem(
        "aether-settings",
        JSON.stringify({ quality: "high" }),
      );
    });
    await f.goto(base);
    check(
      "Alter schwerer Grafikmodus wird einmalig auf den neuen Standard migriert",
      await f.evaluate(() =>
        __flight.graphics().backend.startsWith("Canvas2D"),
      ),
    );
    await f.locator("#settingsBtn").click();
    await f.locator("#quality").selectOption("high");
    check(
      "Fehlendes WebGL lässt das Spiel im Schnellmodus bedienbar",
      (await f.locator("#quality").inputValue()) === "auto" &&
        (await f.evaluate(() =>
          __flight.graphics().backend.startsWith("Canvas2D"),
        )),
    );
    const out =
      process.env.NEON_REPORT_DIR || path.join(os.tmpdir(), "aether-qa");
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(
      path.join(out, "renderer-results.json"),
      JSON.stringify({ checks }, null, 2),
    );
    console.log(JSON.stringify({ checks }));
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
