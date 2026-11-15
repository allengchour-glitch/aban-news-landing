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
    const result = await p.evaluate(async () => {
      const { FastFlightView } = await import("/js/neon-flug/fast-view.mjs");
      const { createState, start } = await import("/js/neon-flug/core.mjs");
      const box = document.createElement("div"),
        view = new FastFlightView(box);
      await new Promise((resolve, reject) => {
        let n = 0;
        const wait = () =>
          view.texture
            ? resolve()
            : n++ > 100
              ? reject(Error("Felsmaterial fehlt"))
              : setTimeout(wait, 20);
        wait();
      });
      const s = createState();
      start(s);
      s.players.forEach((p) => (p.x = 0));
      view.positions = [0, 0];
      view.banks = [0, 0];
      view.cameraX = 0;
      const frame = (distance) => {
        s.t = distance / 22;
        view.update(s, 0, "game", 0);
        return view.ctx.getImageData(
          0,
          0,
          view.canvas.width,
          view.canvas.height,
        ).data;
      };
      const difference = (a, b) => {
        let sum = 0,
          count = 0;
        const w = view.canvas.width,
          h = view.canvas.height;
        for (let y = 0; y < h * 0.8; y++)
          for (let x = 0; x < w; x++)
            if (x < w * 0.28 || x > w * 0.72) {
              const at = (y * w + x) * 4;
              for (let k = 0; k < 3; k++) {
                sum += Math.abs(a[at + k] - b[at + k]);
                count++;
              }
            }
        return sum / count;
      };
      const boundaries = [20, 32, 40, 60, 80, 140],
        changes = boundaries.map((d) => ({
          distance: d,
          difference: difference(frame(d - 0.005), frame(d + 0.005)),
        }));
      const movement = difference(frame(80), frame(85.5));
      removeEventListener("resize", view.resize);
      view.canvas.remove();
      return {
        changes,
        maxBoundaryDifference: Math.max(...changes.map((x) => x.difference)),
        movement,
      };
    });
    const checks = [
      {
        name: "Keine grossen Bildsprünge an ehemaligen und neuen Recycling-Grenzen",
        ok: result.maxBoundaryDifference < 0.75,
      },
      {
        name: "Wände bewegen sich über eine normale Flugstrecke tatsächlich weiter",
        ok: result.movement > 0.25,
      },
    ];
    const out =
      process.env.NEON_REPORT_DIR || path.join(os.tmpdir(), "aether-qa");
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(
      path.join(out, "scenery-results.json"),
      JSON.stringify({ checks, ...result }, null, 2),
    );
    console.log(JSON.stringify({ checks, ...result }));
    if (checks.some((x) => !x.ok))
      throw Error("Optische Kontinuitätsprüfung fehlgeschlagen");
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
