const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  fs = require("fs"),
  path = require("path"),
  os = require("os");
(async () => {
  const b = await chromium.launch({
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const p = await b.newPage({ viewport: { width: 960, height: 540 } });
    await p.goto(
      (process.env.NEON_TEST_URL || "http://127.0.0.1:8099") +
        "/neon-flug?debug=1",
    );
    await p.locator("#trainingBtn").click();
    await p.locator("#launchBtn").click();
    await p.waitForTimeout(1800);
    const result = await p.evaluate(
      () =>
        new Promise((resolve) => {
          const start = performance.now(),
            sim = __flight.state().t;
          let prev = start,
            active = true,
            frames = [];
          function tick(t) {
            if (!active) return;
            frames.push(t - prev);
            prev = t;
            requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
          setTimeout(() => {
            active = false;
            frames.sort((a, b) => a - b);
            const wall = (performance.now() - start) / 1000;
            resolve({
              environment:
                "Chromium; Renderer, Auflösung und rAF-Bildtakt beachten",
              seconds: wall,
              frames: frames.length,
              fps: frames.length / wall,
              p50: frames[Math.floor(frames.length * 0.5)],
              p95: frames[Math.floor(frames.length * 0.95)],
              simulationSeconds: __flight.state().t - sim,
              phase: __flight.state().phase,
              graphics: __flight.graphics(),
            });
          }, 4500);
        }),
    );
    fs.writeFileSync(
      process.env.PERF_OUT || path.join(os.tmpdir(), "aether-performance.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result));
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
