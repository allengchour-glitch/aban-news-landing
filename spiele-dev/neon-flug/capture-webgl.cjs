// Drei gezielte Bildbelege. Capture im selben Task wie render(), bevor WebGL den Backbuffer freigibt.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs"), path = require("path");
(async () => {
  const out = process.env.NEON_REPORT_DIR || "/tmp/neon-flug-v4-qa";
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.NEON_CHROME,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"] });
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
    await page.goto((process.env.NEON_TEST_URL || "http://127.0.0.1:8186") + "/neon-flug?debug=1");
    const images = await page.evaluate(async () => {
      const { FlightView } = await import("/js/neon-flug/view.mjs");
      const core = await import("/js/neon-flug/core.mjs");
      const box = document.createElement("div"); document.body.append(box);
      const high = new FlightView(box); high.quality("high"); high.reduced = true;
      const images = [];
      for (const y of [-3, 3]) {
        const s = core.createState(); core.start(s);
        const ring = core.routeCache[0][0], oldY = ring.y;
        s.t = ring.t; ring.y = y;
        Object.assign(s.players[0], { x: -9, y });
        Object.assign(s.players[1], { x: 9, y });
        high.update(s, 0, "game", 0);
        images.push({ name: `webgl-height-${y}`, data: high.renderer.domElement.toDataURL("image/png") });
        ring.y = oldY;
      }
      const s = core.createState(0, [], { mode: "shoot" }); core.start(s);
      s.t = 4.6; Object.assign(s.players[0], { x: 0, y: 0 });
      Object.assign(s.players[1], { x: 5, y: 1 });
      core.fire(s, 0); core.step(s, [{}, {}], .05);
      high.update(s, 0, "game", 0);
      images.push({ name: "webgl-drones", data: high.renderer.domElement.toDataURL("image/png") });
      high.renderer.dispose();
      return images;
    });
    for (const item of images) fs.writeFileSync(path.join(out, item.name + ".png"), Buffer.from(item.data.split(",")[1], "base64"));
    console.log(JSON.stringify(images.map(i => i.name)));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
