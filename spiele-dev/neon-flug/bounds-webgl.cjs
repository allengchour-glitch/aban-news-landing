const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright"),
  fs = require("fs"),
  path = require("path");
const out = process.env.NEON_REPORT_DIR || "/tmp/neon-flug-v4-qa";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.NEON_CHROME,
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const checks = [],
    errors = [];
  const check = (name, ok, details) => {
    checks.push({ name, ok, ...(details ? { details } : {}) });
    if (!ok) throw Error(name);
  };
  try {
    const p = await browser.newPage({ viewport: { width: 960, height: 540 } });
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      (process.env.NEON_TEST_URL || "http://127.0.0.1:8186") +
        "/neon-flug?debug=1",
    );
    await p.evaluate(async () => {
      const core = await import("/js/neon-flug/core.mjs"),
        { FastFlightView } = await import("/js/neon-flug/fast-view.mjs"),
        { FlightView } = await import("/js/neon-flug/view.mjs");
      const box = document.createElement("div");
      document.body.append(box);
      const fast = new FastFlightView(box),
        high = new FlightView(box);
      fast.reduced = high.reduced = true;
      document
        .querySelectorAll(".screen,.masthead,#vignette,.grain,#hud")
        .forEach((e) => (e.hidden = true));
      window.bounds = {
        core,
        fast,
        high,
        cameraOffset: (await import("/js/neon-flug/motion.mjs")).cameraOffset,
      };
    });
    for (const size of [
      { width: 960, height: 540 },
      { width: 844, height: 390 },
      { width: 1280, height: 800 },
    ]) {
      await p.setViewportSize(size);
      for (const y of [-3, 3]) {
        const result = await p.evaluate(
          ({ y, size }) => {
            const { core, fast, high } = bounds,
              T = window.THREE,
              s = core.createState();
            core.start(s);
            s.t = core.routeCache[0][0].t;
            Object.assign(s.players[0], { x: -9, y });
            Object.assign(s.players[1], { x: 9, y });
            const e = core.routeCache[0][0],
              oldY = e.y;
            e.y = y;
            fast.cameraX = bounds.cameraOffset(-9, size.width, size.height);
            fast.update(s, 0, "game", 0);
            const canvasBounds = s.players.map((p) => {
              const a = fast.project(p.x, p.y + 0.7, 0),
                size = a.k * 4.8;
              return {
                left: a.x - size * 0.5,
                right: a.x + size * 0.5,
                top: a.y - size * 0.305,
                bottom: a.y + size * (2 / 3 - 0.305),
              };
            });
            const ring = fast.project(e.x, e.y + 0.7, 0);
            const ring2d = {
              top: ring.y - 2.11 * ring.k,
              bottom: ring.y + 2.11 * ring.k,
            };
            high.camera.position.x = bounds.cameraOffset(
              -9,
              size.width,
              size.height,
            );
            high.update(s, 0, "game", 0);
            high.scene.updateMatrixWorld(true);
            high.camera.updateMatrixWorld(true);
            const projectedBox = (object) => {
              const box = new T.Box3();
              object.traverse((o) => {
                if (o.isMesh && o.visible && o.name !== "guard") {
                  o.geometry.computeBoundingBox();
                  box.union(
                    o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld),
                  );
                }
              });
              const pts = [];
              for (const x of [box.min.x, box.max.x])
                for (const y of [box.min.y, box.max.y])
                  for (const z of [box.min.z, box.max.z])
                    pts.push(new T.Vector3(x, y, z).project(high.camera));
              return {
                left: Math.min(...pts.map((p) => ((p.x + 1) / 2) * size.width)),
                right: Math.max(
                  ...pts.map((p) => ((p.x + 1) / 2) * size.width),
                ),
                top: Math.min(...pts.map((p) => ((1 - p.y) / 2) * size.height)),
                bottom: Math.max(
                  ...pts.map((p) => ((1 - p.y) / 2) * size.height),
                ),
                worldBottom: box.min.y,
              };
            };
            const ships3d = high.ships.map(projectedBox),
              ring3d = projectedBox(
                high.events.find((g) => g.userData.event.id === e.id),
              );
            e.y = oldY;
            const inside = (b) =>
              b.top >= 0 &&
              b.bottom <= size.height &&
              b.left >= 0 &&
              b.right <= size.width;
            return {
              canvasBounds,
              ring2d,
              ships3d,
              ring3d,
              canvasVisible:
                canvasBounds.every(inside) &&
                ring2d.top >= 0 &&
                ring2d.bottom <= size.height,
              webglVisible:
                ships3d.every(inside) &&
                ring3d.top >= 0 &&
                ring3d.bottom <= size.height,
              clearWater:
                ships3d.every((b) => b.worldBottom > -4.6) &&
                ring3d.worldBottom > -4.6,
            };
          },
          { y, size },
        );
        check(
          `Höhenrand ${y}, ${size.width}×${size.height}: Canvas sichtbar`,
          result.canvasVisible,
          result.canvasBounds,
        );
        check(
          `Höhenrand ${y}, ${size.width}×${size.height}: WebGL sichtbar und über Wasser`,
          result.webglVisible && result.clearWater,
          { ships: result.ships3d, ring: result.ring3d },
        );
        if (size.width === 960) {
          await p.evaluate(() => {
            bounds.high.renderer.domElement.hidden = true;
            bounds.fast.canvas.hidden = false;
          });
          await p.screenshot({ path: path.join(out, `bounds-2d-${y}.png`) });
          await p.evaluate(() => {
            bounds.high.renderer.domElement.hidden = false;
            bounds.fast.canvas.hidden = true;
          });
          await p.screenshot({ path: path.join(out, `bounds-3d-${y}.png`) });
        }
      }
    }
    const details = await p.evaluate(() => {
      const { core, high } = bounds;
      const checks = [];
      for (const type of ["normal", "bonus", "duet"]) {
        const e = core.routeCache[0].find((e) =>
          type === "duet"
            ? e.type === "duet"
            : e.type === "ring" && e.bonus === (type === "bonus"),
        );
        const s = core.createState();
        core.start(s);
        s.t = e.t - 0.01;
        Object.assign(s.players[0], {
          x: e.type === "duet" ? -7 : e.x,
          y: e.y,
        });
        Object.assign(s.players[1], { x: e.type === "duet" ? 7 : e.x, y: e.y });
        high.update(s, 0, "game", 0);
        const before = high.events.find(
          (g) => g.userData.event.id === e.id,
        ).visible;
        core.step(s, [{}, {}], 0.02);
        high.update(JSON.parse(JSON.stringify(core.snapshot(s))), 0, "game", 0);
        checks.push({
          type,
          before,
          after: high.events.find((g) => g.userData.event.id === e.id).visible,
        });
      }
      const s = core.createState(0, [], { mode: "shoot" });
      core.start(s);
      s.t = 3;
      s.players[0].x = 0;
      core.fire(s, 0);
      high.update(s, 0, "game", 0.016);
      const drone = high.events.find((g) => g.userData.event.id === 0),
        droneVisible = drone.visible,
        shotVisible = high.shots.some((m) => m.visible);
      s.destroyed.push(0);
      high.update(s, 0, "game", 0);
      high.quality("low");
      high.reduced = false;
      high.update(s, 0, "game", 0);
      const lowDust = high.dust.visible;
      high.reduced = true;
      high.update(s, 0, "game", 0);
      return {
        checks,
        droneVisible,
        shotVisible,
        destroyedHidden: !drone.visible,
        lowDust,
        reducedTrails: high.trails.every((t) => !t.visible),
        y: high.ships[0].position.y,
      };
    });
    for (const r of details.checks)
      check(
        "WebGL entfernt " + r.type + "-Ring aus Replica",
        r.before && !r.after,
        r,
      );
    check(
      "WebGL zeigt Drohne/Projektil und entfernt zerstörte Drohne",
      details.droneVisible && details.shotVisible && details.destroyedHidden,
    );
    check(
      "WebGL erhält Sparmodus-Dustsperre und reduced-motion-Trailsperre",
      !details.lowDust && details.reducedTrails,
    );
    check("Keine WebGL-JavaScript-Fehler", errors.length === 0, errors);
    console.log(JSON.stringify({ checks, errors }, null, 2));
  } finally {
    fs.writeFileSync(
      path.join(out, "bounds-webgl.json"),
      JSON.stringify({ checks, errors }, null, 2),
    );
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
