const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  fs = require("fs");
(async () => {
  const b = await chromium.launch({
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  try {
    const p = await b.newPage({ viewport: { width: 960, height: 540 } });
    await p.goto(
      (process.env.TEMPEL_TEST_URL || "http://localhost:8120") +
        "/neon-zusammen.html",
    );
    await p.locator("#startBtn").click();
    await p.waitForTimeout(1000);
    await p.keyboard.down("w");
    setTimeout(() => p.keyboard.up("w"), 700);
    const r = await p.evaluate(
      () =>
        new Promise((resolve) => {
          let n = 0,
            last = performance.now(),
            frames = [];
          const start = last;
          let live = true;
          function tick(t) {
            if (!live) return;
            n++;
            frames.push(t - last);
            last = t;
            requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
          setTimeout(() => {
            live = false;
            frames.sort((a, b) => a - b);
            resolve({
              seconds: (performance.now() - start) / 1000,
              frames: n,
              fps: n / ((performance.now() - start) / 1000),
              p50: frames[Math.floor(frames.length * 0.5)],
              p95: frames[Math.floor(frames.length * 0.95)],
              state: __zs.state(),
              environment:
                "Headless Chromium, SwiftShader,960x540; kein Hardware-Handytest",
            });
          }, 8000);
        }),
    );
    fs.writeFileSync(
      process.env.TEMPEL_PERF_OUT ||
        require("path").join(__dirname, "active-performance-run.json"),
      JSON.stringify(r, null, 2),
    );
    console.log(r);
  } finally {
    await b.close();
  }
})();
