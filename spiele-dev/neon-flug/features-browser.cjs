const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs"),
  path = require("path");
const root = process.env.NEON_TEST_URL || "http://127.0.0.1:8186";
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
    checks.push({
      name,
      ok: !!ok,
      ...(details === undefined ? {} : { details }),
    });
    if (!ok) throw Error(name);
  };
  const context = async (options = {}) => {
    const c = await browser.newContext({
      viewport: { width: 960, height: 540 },
      ...options,
    });
    c.setDefaultTimeout(15000);
    await c.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      window.webglRequests = 0;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (type.includes("webgl")) window.webglRequests++;
        return original.call(this, type, ...args);
      };
    });
    c.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
    return c;
  };
  try {
    const c = await context(),
      p = await c.newPage();
    await p.goto(root + "/neon-flug?debug=1");
    // Realer Canvas: selbe Simulation, selbes Bild-Zeitfenster vor/nach Sammlung.
    const visuals = await p.evaluate(async () => {
      const { FastFlightView } = await import("/js/neon-flug/fast-view.mjs");
      const { createState, start, step, routeCache, snapshot } =
        await import("/js/neon-flug/core.mjs");
      const view = new FastFlightView(document.createElement("div"));
      view.reduced = true;
      const results = [];
      for (const type of ["normal", "bonus", "duet"]) {
        const e = routeCache[0].find((e) =>
          type === "duet"
            ? e.type === "duet"
            : e.type === "ring" && e.bonus === (type === "bonus"),
        );
        const s = createState();
        start(s);
        s.t = e.t - 0.01;
        Object.assign(s.players[0], {
          x: e.type === "duet" ? -7 : e.x,
          y: e.y,
        });
        Object.assign(s.players[1], { x: e.type === "duet" ? 7 : e.x, y: e.y });
        step(s, [{}, {}], 0.02);
        const replica = JSON.parse(JSON.stringify(snapshot(s)));
        // Beide Bilder verwenden denselben abgeschlossenen Zustand; nur die Sammelmarkierung unterscheidet sich.
        const uncollected = { ...replica, collected: [] };
        let rings = [];
        const ring = view.ring.bind(view);
        view.ring = (x, z, color, y) => {
          if (Math.abs(z) < 0.5) rings.push(x);
          ring(x, z, color, y);
        };
        view.update(uncollected, 0, "game", 0);
        const before = view.ctx.getImageData(0, 0, 960, 540).data;
        const drawnBefore = rings.length;
        rings = [];
        view.update(replica, 0, "game", 0);
        const after = view.ctx.getImageData(0, 0, 960, 540).data;
        let changed = 0;
        for (let i = 0; i < before.length; i += 4)
          if (
            before[i] !== after[i] ||
            before[i + 1] !== after[i + 1] ||
            before[i + 2] !== after[i + 2]
          )
            changed++;
        results.push({
          type,
          drawnBefore,
          drawnAfter: rings.length,
          changedPixels: changed,
          collected: replica.collected.includes(e.id),
        });
        view.ring = ring;
      }
      // Bursts auch bei missbräuchlich häufigem Aufruf begrenzt.
      view.reduced = false;
      for (let i = 0; i < 50; i++) view.burst(0, 0xffffff);
      const pool = view.effects.length;
      view.reduced = true;
      view.update(createState(), 0, "game", 0.016);
      return { results, pool, reducedEffects: view.effects.length };
    });
    for (const r of visuals.results)
      check(
        "Canvas entfernt " + r.type + "-Ring auf repliziertem Zustand",
        r.drawnBefore === (r.type === "duet" ? 2 : 1) &&
          r.drawnAfter === 0 &&
          r.changedPixels > 30 &&
          r.collected,
        r,
      );
    check(
      "Partikelpool maximal 96; reduced-motion leert Zusatzeffekte",
      visuals.pool === 96 && visuals.reducedEffects === 0,
    );
    await p.locator("#trainingBtn").click();
    await p.locator("#launchBtn").click();
    const initial = await p.evaluate(() => __flight.state());
    await p.keyboard.down("ArrowUp");
    await p.waitForTimeout(170);
    await p.keyboard.up("ArrowUp");
    const up = await p.evaluate(() => __flight.state());
    check(
      "Pfeil hoch bewegt echte Höhe und löst keinen Dash aus",
      up.players[0].y > initial.players[0].y + 1 &&
        up.players[0].cooldown === 0,
      { before: initial.players[0].y, after: up.players[0].y },
    );
    await p.keyboard.down("s");
    await p.waitForTimeout(340);
    await p.keyboard.up("s");
    const down = await p.evaluate(() => __flight.state().players[0].y);
    check("S bewegt echte Höhe abwärts", down < -0.7, { y: down });
    await p.keyboard.down("d");
    await p.waitForTimeout(140);
    await p.keyboard.up("d");
    check(
      "D bewegt horizontal",
      await p.evaluate(
        (x) => __flight.state().players[0].x > x + 0.7,
        initial.players[0].x,
      ),
    );
    await p.evaluate(() => __flight.simulate(100));
    await p.locator("#resultScreen").waitFor({ state: "visible" });
    check(
      "Training ohne XP und ohne Kampagnenfreischaltung",
      await p.evaluate(
        () =>
          !JSON.parse(localStorage.getItem("aether-pilot"))?.xp &&
          !localStorage.getItem("aether-records"),
      ),
    );
    await p.reload();
    await p.locator("#resultScreen").waitFor({ state: "visible" });
    check(
      "Trainingsergebnis bleibt nach Reload ohne XP",
      (await p.locator("#xpResult").innerText()).includes("keine Flug-XP"),
    );
    check(
      "Standard erstellt keinen WebGL-Kontext",
      await p.evaluate(() => webglRequests === 0),
    );
    await c.close();

    // Touch-Eingaben via Chromes Touch-Protokoll, keine direkte Zustandsänderung.
    const touch = await context({ hasTouch: true, isMobile: true }),
      t = await touch.newPage();
    await t.goto(root + "/neon-flug?debug=1");
    await t.locator("#flightMode").selectOption("shoot");
    await t.locator("#trainingBtn").click();
    await t.locator("#launchBtn").click();
    const cd = await touch.newCDPSession(t),
      before = await t.evaluate(() => __flight.state().players[0]);
    const send = (type, points) =>
      cd.send("Input.dispatchTouchEvent", { type, touchPoints: points });
    await send("touchStart", [{ x: 400, y: 330 }]);
    await send("touchMove", [{ x: 455, y: 275 }]);
    await t.waitForTimeout(200);
    await send("touchEnd", []);
    const moved = await t.evaluate(() => __flight.state().players[0]);
    check(
      "Touchstick steuert beide Achsen mit realen Touch-Events",
      moved.x > before.x + 1 && moved.y > before.y + 1,
      {
        before: { x: before.x, y: before.y },
        after: { x: moved.x, y: moved.y },
      },
    );
    await t.waitForTimeout(150);
    const released = await t.evaluate(() => __flight.state().players[0]);
    check(
      "Touch-Ende stoppt beide Achsen",
      Math.abs(released.x - moved.x) < 0.3 &&
        Math.abs(released.y - moved.y) < 0.3,
    );
    const box = await t.locator("#fireBtn").boundingBox();
    await send("touchStart", [
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    ]);
    await t.waitForTimeout(350);
    await send("touchEnd", []);
    check(
      "Feuerknopf schiesst per Touch",
      await t.evaluate(() => __flight.state().shotSerial >= 2),
    );
    await t.screenshot({ path: path.join(out, "touch-shoot.png") });
    await touch.close();

    // Zwei Seiten im lokalen BroadcastChannel + echter WebRTC-Kanal; ein gemeinsames Geräteprofil.
    const ca = await context(),
      a = await ca.newPage(),
      b = await require("./browser-window.cjs")(browser, ca, a);
    await a.goto(root + "/neon-flug?mp=local&debug=1");
    await a.locator("#flightMode").selectOption("shoot");
    await a.locator("#hostBtn").click();
    const code = await a.locator("#roomCode").innerText();
    await b.goto(root + "/neon-flug?mp=local&debug=1");
    await b.locator("#joinToggle").click();
    await b.locator("#roomInput").fill(code);
    await b.locator("#joinForm button").click();
    await a.waitForFunction(() => __flight.role().hello);
    await b.waitForFunction(() => __flight.role().hello);
    await a.locator("#readyBtn").click();
    await b.locator("#readyBtn").click();
    await a.locator("#launchBtn").waitFor();
    await b.locator("#launchBtn").waitFor();
    check(
      "Host wählt denselben optionalen Modus für beide",
      await b.evaluate(() => __flight.state().mode === "shoot"),
    );
    await a.locator("#launchBtn").click();
    await b.locator("#launchBtn").click();
    await a.waitForFunction(() => __flight.state().phase === "playing");
    await b.waitForFunction(() => __flight.state().phase === "playing");
    await b.keyboard.down("w");
    await b.waitForTimeout(120);
    await b.keyboard.up("w");
    await b.waitForTimeout(100);
    const hostY = await a.evaluate(() => __flight.state().players[1].y);
    check("Gast-W-Eingabe verändert Höhe am autoritativen Host", hostY > 0.8, {
      hostY,
    });
    await b.keyboard.down("s");
    await b.waitForTimeout(120);
    await b.keyboard.up("s");
    await b.keyboard.down("a");
    await b.waitForTimeout(200);
    await b.keyboard.up("a");
    await b.keyboard.down("f");
    await a.waitForFunction(() => __flight.state().shotSerial >= 2);
    check(
      "Gastfeuer wird vom Host simuliert und repliziert",
      await b.evaluate(() => __flight.state().shotSerial >= 1),
    );
    await a.waitForFunction(() => __flight.state().kills >= 1, null, {
      timeout: 8000,
    });
    await b.keyboard.up("f");
    await b.waitForFunction(() => __flight.state().kills >= 1);
    check(
      "Drohnenabschuss und Trefferfeedback synchron",
      await b.evaluate(
        () =>
          __flight.state().destroyed.includes(0) &&
          __flight.state().feedback.some((f) => f.kind === "destroy"),
      ),
    );
    await a.screenshot({ path: path.join(out, "koop-shoot.png") });
    await a.evaluate(() => __flight.simulate(70));
    await b.waitForFunction(() => __flight.state().phase === "victory");
    await a.waitForFunction(
      () => JSON.parse(localStorage.getItem("aether-pilot"))?.xp > 0,
    );
    await b.waitForFunction(
      () => JSON.parse(localStorage.getItem("aether-pilot"))?.xp > 0,
    );
    const result = await b.evaluate(() => __flight.state()),
      xp = await b.evaluate(
        () => JSON.parse(localStorage.getItem("aether-pilot")).xp,
      );
    check(
      "Schießabschluss vergibt XP ohne klassische Kapitel freizuschalten",
      await b.evaluate(
        () =>
          JSON.parse(localStorage.getItem("aether-records")).unlocked ===
          undefined,
      ),
      { xp, kills: result.kills },
    );
    // Wiederholte Ergebnispakete, neues Hello (Neuverbinden) und Seitenreload.
    await b.evaluate((s) => __flight.replayResult(s), result);
    await b.waitForFunction(() =>
      document
        .querySelector("#xpResult")
        .textContent.includes("bereits gespeichert"),
    );
    check(
      "Wiederholtes Ergebnis vergibt kein zweites XP",
      await b.evaluate(
        (x) => JSON.parse(localStorage.getItem("aether-pilot")).xp === x,
        xp,
      ),
    );
    await a.evaluate(() => __flight.disconnect());
    await b.waitForTimeout(150);
    await b.reload();
    await b.locator("#resultScreen").waitFor({ state: "visible" });
    await b.waitForFunction(() =>
      document
        .querySelector("#xpResult")
        .textContent.includes("bereits gespeichert"),
    );
    check(
      "Ergebnisreload nach Verbindungsende vergibt kein zweites XP",
      await b.evaluate(
        (x) => JSON.parse(localStorage.getItem("aether-pilot")).xp === x,
        xp,
      ),
    );
    await b.screenshot({ path: path.join(out, "result-reload.png") });
    check("Keine JavaScript-Fehler", errors.length === 0, errors);
    check("Auch Koop ohne WebGL", await b.evaluate(() => webglRequests === 0));
    console.log(JSON.stringify({ checks, errors }, null, 2));
  } finally {
    fs.writeFileSync(
      path.join(out, "features-browser.json"),
      JSON.stringify({ checks, errors }, null, 2),
    );
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
