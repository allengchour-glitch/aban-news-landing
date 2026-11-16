/* Gerenderte Browser-Prüfung von Solo, Menüs, Karte, Station und vier HUD-Größen.
   Freigeschaltete Aktionsknöpfe sind ausdrücklich Layoutfixtures; keine ganze Kampagne. */
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const uiOnly = process.env.NW_UI_ONLY === "1";
const base = process.env.NW_BASE || "http://localhost:8170",
  out = process.env.NW_OUT || "/tmp/wildnis-grafik";
const hook = `NET_FORCE_SEED=317151129;window.__nwQA={state:function(){return {running:running,paused:paused,map:mapOpen,dodge:dodgeT,frame:renderer.info.render.frame,pos:player.position.toArray(),graphics:__nw.gfx()};},layout:function(){document.querySelectorAll('#emoteBar button').forEach(function(b,i){b.id='qaEmote'+i;});level=4;_skillShown=true;_boltShown=true;['bDodge','bBolt','bSkill','bThrow'].forEach(function(id){document.getElementById(id).classList.remove('hide');});_onlineState='connected';updOnline();},fixtures:function(){return {resources:resources.map(function(r){return [r.type,r.x,r.z];}),colliders:colliders.map(function(c){return [c.x,c.z,c.r];})};}};`;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const report = {
    uiOnly,
    kind: uiOnly
      ? "Echter Solo-Start mit deaktiviertem 3D-Zeichenpfad, HUD- und Rezeptfixtures; kein FPS- oder Kampagnentest"
      : "Echter Solo-Start, gerenderte Welt und explizite HUD-/Stationsfixtures; keine Kampagne/Handy-FPS-Messung",
    checks: [],
    views: [],
    errors: [],
    csp: [],
  };
  function check(name, value, data) {
    report.checks.push({ name, passed: !!value, data });
    assert(value, name);
  }
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    await context.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem("nw_intro", "1");
      document.addEventListener("securitypolicyviolation", (e) => {
        window.__cspQA = window.__cspQA || [];
        __cspQA.push({ directive: e.violatedDirective, uri: e.blockedURI });
      });
    });
    const p = await context.newPage();
    p.setDefaultTimeout(30000);
    p.on("pageerror", (e) => report.errors.push(e.message));
    await p.route("**/neon-wildnis.html*", async (r) => {
      const response = await r.fetch(),
        h = await response.text();
      await r.fulfill({
        response,
        body: h.replace(
          "window.__nw={",
          (uiOnly ? "renderScene=function(){};" : "") + hook + "window.__nw={",
        ),
      });
    });
    await p.goto(base + "/neon-wildnis.html", {
      waitUntil: "domcontentloaded",
    });
    await p.waitForFunction(() => window.__nwQA);
    await p.locator("#startBtn").click({ timeout: 60000 });
    await p.waitForFunction(() => window._nwSceneryReady, null, {
      timeout: 150000,
    });
    check(
      "Solo-Welt tatsächlich gestartet",
      (await p.evaluate(() => __nwQA.state())).running,
    );
    if (!uiOnly) {
      await p.locator("#bMenu").click();
      await p.waitForFunction(() => __nwQA.state().paused);
      let a = await p.evaluate(() => __nwQA.state());
      await p.waitForTimeout(350);
      let b = await p.evaluate(() => __nwQA.state());
      check("Pause stoppt schwere Render-Aufrufe", a.frame === b.frame, {
        before: a.frame,
        after: b.frame,
      });
      await p.locator("#nwGraphics").selectOption("light");
      check(
        "Grafikprofil gespeichert und Schatten aus",
        await p.evaluate(
          () =>
            localStorage.getItem("nw_gfx") === "light" &&
            __nwQA.state().graphics.ratio === 0.7 &&
            !__nwQA.state().graphics.shadows,
        ),
      );
      a = await p.evaluate(() => __nwQA.state());
      await p.waitForTimeout(300);
      b = await p.evaluate(() => __nwQA.state());
      check("Profilwechsel zeichnet in Pause nur einmal", a.frame === b.frame);
      await p.locator("#startBtn").click();
      await p.waitForFunction(() => !__nwQA.state().paused);
      await p.waitForFunction((f) => __nwQA.state().frame > f, a.frame);
      check("Fortsetzen zeichnet wieder", true);
      await p.locator("#minimap").click();
      await p.waitForFunction(() => __nwQA.state().map);
      a = await p.evaluate(() => __nwQA.state());
      await p.keyboard.press("Shift");
      await p.waitForTimeout(300);
      b = await p.evaluate(() => __nwQA.state());
      check(
        "Weltkarte hält Renderer an und speichert keine Rolle",
        a.frame === b.frame && b.dodge === 0,
        { before: a, after: b },
      );
      await p.keyboard.press("Escape");
      await p.waitForFunction(() => !__nwQA.state().map);
      await p.waitForTimeout(350);
      b = await p.evaluate(() => __nwQA.state());
      check(
        "Nach Kartenschliessen keine vorgemerkte Bewegung",
        b.dodge === 0 && b.pos.every((v, i) => Math.abs(v - a.pos[i]) < 1e-5),
      );
    }
    await p.evaluate(() => __nwQA.layout());
    for (const size of [
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
      { width: 360, height: 640 },
      { width: 640, height: 360 },
    ]) {
      await p.setViewportSize(size);
      await p.evaluate(() => __nwQA.layout());
      await p.waitForTimeout(150);
      const controls = await p.evaluate(() =>
        [
          "bMenu",
          "bSound",
          "bAct",
          "bBuild",
          "bThrow",
          "bSkill",
          "bDodge",
          "bBolt",
          "zoomIn",
          "zoomOut",
          "qaEmote0",
          "qaEmote1",
          "qaEmote2",
          "qaEmote3",
          "qaEmote4",
        ].map((id) => {
          const e = document.getElementById(id),
            r = e.getBoundingClientRect(),
            x = r.x + r.width / 2,
            y = r.y + r.height / 2,
            hit = document.elementFromPoint(x, y);
          return {
            id,
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            hit: hit ? hit.closest("[id]")?.id || hit.tagName : null,
            reachable: !!hit && (hit === e || e.contains(hit)),
            inside:
              r.x >= 0 &&
              r.y >= 0 &&
              r.right <= innerWidth &&
              r.bottom <= innerHeight,
          };
        }),
      );
      check(
        "Aktionsknöpfe erreichbar " + size.width + "×" + size.height,
        controls.every(
          (c) => c.inside && c.reachable && c.width >= 44 && c.height >= 44,
        ),
        controls,
      );
      const ui = await p.evaluate(() => {
        const ids = [
            "topLeft",
            "invBar",
            "onlineBadge",
            "quest",
            "minimap",
            "zoomBtns",
            "sysRow",
            "emoteBar",
          ],
          items = ids.map((id) => {
            const e = document.getElementById(id),
              r = e.getBoundingClientRect();
            return {
              id,
              x: r.x,
              y: r.y,
              right: r.right,
              bottom: r.bottom,
              visible: getComputedStyle(e).display !== "none",
            };
          });
        const overlap = [];
        for (let i = 0; i < items.length; i++)
          for (let j = i + 1; j < items.length; j++) {
            const a = items[i],
              b = items[j];
            if (
              document
                .getElementById(a.id)
                .contains(document.getElementById(b.id)) ||
              document
                .getElementById(b.id)
                .contains(document.getElementById(a.id))
            )
              continue;
            if (
              a.visible &&
              b.visible &&
              Math.min(a.right, b.right) - Math.max(a.x, b.x) > 1 &&
              Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 1
            )
              overlap.push([a.id, b.id]);
          }
        return { items, overlap };
      });
      check(
        "Anzeigen ohne Überschneidung " + size.width + "×" + size.height,
        ui.overlap.length === 0,
        ui,
      );
      report.views.push({ size, controls, ui });
      await p.screenshot({
        path: path.join(out, size.width + "x" + size.height + ".png"),
        timeout: 60000,
      });
    }
    await p.setViewportSize({ width: 960, height: 640 });
    await p.evaluate(() => __nw.give("wood", 20));
    await p.locator("#bBuild").click();
    const card = p
      .locator("#buildMenu .bcard")
      .filter({ has: p.locator(".bn", { hasText: "Holz-Mauer" }) });
    await card.scrollIntoViewIfNeeded();
    const r = await card.boundingBox();
    check(
      "Erste Baurezepte im Fenster erreichbar",
      r && r.y >= 0 && r.y + r.height <= 640,
    );
    for (const menuCard of await p.locator("#buildMenu .bcard").all()) {
      await menuCard.scrollIntoViewIfNeeded();
      check(
        "Baurezept im Scrollmenü erreichbar",
        await menuCard.evaluate((e) => {
          const r = e.getBoundingClientRect(),
            hit = document.elementFromPoint(
              r.x + r.width / 2,
              r.y + r.height / 2,
            );
          return (
            r.y >= 0 &&
            r.bottom <= innerHeight &&
            !!hit &&
            (hit === e || e.contains(hit))
          );
        }),
      );
    }
    await p.locator("#buildMenu .menuX").click();
    if (!uiOnly) {
      const jump = await p.evaluate(() =>
        __nw.stations().find((s) => s.url.includes("neon-jump")),
      );
      assert(jump);
      await p.evaluate((i) => __nw.openStation(i), jump.i);
      await p.waitForFunction(() => __nw.stationOpen());
      await p.frameLocator("#stFrame").locator("body").waitFor();
      await p.waitForTimeout(300);
      const frame = p.frames().find((f) => f.url().includes("neon-jump"));
      check(
        "Echte eigene Parcours-Station geladen",
        !!frame && (await frame.evaluate(() => !!window.THREE)),
      );
      a = await p.evaluate(() => __nwQA.state());
      await p.waitForTimeout(300);
      b = await p.evaluate(() => __nwQA.state());
      check("Welt zeichnet nicht hinter Station", a.frame === b.frame);
      await p.locator("#stExit").click();
      await p.waitForFunction(() => !__nw.stationOpen());
      check("Stationsrückkehr bedienbar", true);
    }
    report.csp = await p.evaluate(() => window.__cspQA || []);
    check(
      "Keine Script-/CSP-Fehler",
      report.errors.length === 0 && report.csp.length === 0,
      { errors: report.errors, csp: report.csp },
    );
    report.status = "passed";
  } catch (e) {
    report.status = "failed";
    report.failure = e.stack;
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(
      path.join(out, "ergebnis.json"),
      JSON.stringify(report, null, 2),
    );
    console.log({
      status: report.status,
      checks: report.checks.length,
      failure: report.failure,
    });
    await browser.close();
  }
})();
