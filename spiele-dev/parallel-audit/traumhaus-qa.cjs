/* Kleine Browserpruefung mit IIFE-Sonde nach th-lib.mjs. Keine CSP-/TLS-Ausnahme.
 * PLAYWRIGHT_BROWSERS_PATH=/tmp/aban-browsers node spiele-dev/parallel-audit/traumhaus-qa.cjs
 * TH_SOURCE=/tmp/traumhaus-parallel-before.html TH_LABEL=before zum Gegenvergleich.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(
  process.env.TH_PLAYWRIGHT || process.env.PLAYWRIGHT_MODULE || "playwright",
);
const root = path.resolve(__dirname, "../..");
const label = process.env.TH_LABEL || "after";
const origin = process.env.TH_ORIGIN || "http://127.0.0.1:8112";
const results = { label, checks: [], errors: [], blocked: [] };
const source = fs.readFileSync(
  process.env.TH_SOURCE || path.join(root, "traumhaus.html"),
  "utf8",
);
const probe = `
  auditState:function(){return {walls:Object.keys(walls).length,floors:Object.keys(floors).length,
    geld:geld,undo:BAU_UNDO.length,redo:BAU_REDO.length,camA:camA,camRT:camRT,
    dragging:dragging,zug:!!_zug,steer:{x:steer.x,z:steer.z},joyEdge:joyEdge};},
  auditBuild:function(){if(!buildMode)document.getElementById('modeBtn').click();
    waehleTeil('wand');geld=10000;camTx=0;camTz=0;camA=0;camAT=null;camB=1.2;camR=40;camRT=40;
    followSim=null;window._bauKamZiel=null;updCam();return true;},
  auditSelect:function(id){waehleTeil(id);},
  auditProject:function(x,z){camera.updateMatrixWorld();var v=new THREE.Vector3(x,0,z).project(camera);
    return {x:(v.x+1)*W/2,y:(1-v.y)*H/2};},
  auditLight:function(){window._auditFullRender=false;renderer.setPixelRatio(1);renderer.setSize(280,170,false);},
  auditFull:function(){window._auditFullRender=true;renderer.setPixelRatio(1);renderer.setSize(W,H,false);renderer.render(scene,camera);},
  auditCamera:function(){camAT=null;window._bauKamZiel=null;},
  auditSim:function(){var s=sims[meinSi()]||sims[0];return {x:s.x,z:s.z};},
`;
const instrumented = source
  .replace("  bahnProfil:function(typ){", probe + "  bahnProfil:function(typ){")
  .replace(
    "window.__th={",
    `
// Nur der Zeichenpuffer wird fuer die Interaktionsprobe verkleinert, nicht Kamera/Welt/HUD.
var auditRender=renderer.render.bind(renderer);
renderer.render=function(s,c){if(!window._auditFullRender&&!renderer.getRenderTarget())renderer.setSize(280,170,false);return auditRender(s,c);};
renderer.setSize(280,170,false);
window.__th={`,
  );
if (instrumented === source) throw Error("Sonden-Anker fehlt");
function check(name, ok, detail) {
  results.checks.push({ name, ok, detail });
  console.log(JSON.stringify(results.checks.at(-1)));
}
(async () => {
  const browser = await chromium.launch({
    args: ["--enable-unsafe-swiftshader"],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 844, height: 390 },
      screen: { width: 844, height: 390 },
      hasTouch: true,
    });
    context.setDefaultTimeout(120000);
    const page = await context.newPage();
    page.on("pageerror", (e) => results.errors.push(e.message));
    page.on("console", (m) => {
      if (/Content Security Policy|violates.*directive/i.test(m.text()))
        results.blocked.push(m.text());
    });
    await page.route("**/traumhaus.html*", async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: instrumented });
    });
    const response = await page.goto(origin + "/traumhaus.html", {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    results.headers = await response.allHeaders();
    await page.waitForFunction(() => !!window.__th, null, { timeout: 120000 });
    await page.locator("#soloBtn").click({ timeout: 120000 });
    const choice = page.locator('button[data-m="klassisch"]');
    const choiceRect = await choice.boundingBox();
    check(
      "Moduswahl im Handy-Querformat erreichbar",
      !!choiceRect &&
        choiceRect.y >= 0 &&
        choiceRect.y + choiceRect.height <= 390,
      choiceRect,
    );
    await choice.click();
    await page.locator("#introOk").waitFor({ state: "visible" });
    const intro = await page.locator("#introOk").boundingBox();
    check(
      "Begruessung: Los gehts im Bild",
      intro.y >= 0 && intro.y + intro.height <= 390,
      intro,
    );
    await page.locator("#introOk").click();
    check("Solo startet", await page.evaluate(() => window.__th.laeuft()));
    await page.evaluate(() => window.__th.auditFull());
    await page.screenshot({
      path: path.join(__dirname, `traumhaus-${label}-mobile.png`),
      timeout: 120000,
    });
    await page.evaluate(() => {
      window.__th.auditLight();
      window.__th.auditBuild();
    });
    const state = () => page.evaluate(() => window.__th.auditState());
    const point = (x, z) =>
      page.evaluate(([x, z]) => window.__th.auditProject(x, z), [x, z]);
    const a = await point(-9, -9.1);
    const hit = await page.evaluate(
      (p) => document.elementFromPoint(p.x, p.y)?.tagName,
      a,
    );
    check("Gegenprobe: Baupunkt liegt auf Leinwand", hit === "CANVAS", {
      a,
      hit,
    });
    let before = await state();
    await page.mouse.click(a.x, a.y);
    let after = await state();
    check(
      "Linksklick baut eine Wand und kostet 25",
      after.walls === before.walls + 1 && after.geld === before.geld - 25,
      { before, after },
    );
    await page.keyboard.press("Control+z");
    after = await state();
    check(
      "Rueckgaengig erstattet voll",
      after.walls === before.walls && after.geld === before.geld,
      after,
    );
    await page.keyboard.press("Control+y");
    after = await state();
    check(
      "Wiederholen baut und berechnet dieselbe Wand",
      after.walls === before.walls + 1 && after.geld === before.geld - 25,
      after,
    );
    await page.keyboard.press("Control+z");
    before = await state();
    await page.mouse.click(a.x, a.y, { button: "right" });
    after = await state();
    check(
      "Rechtsklick baut nichts und kostet nichts",
      after.walls === before.walls && after.geld === before.geld,
      { before, after },
    );
    if (after.walls !== before.walls) await page.keyboard.press("Control+z");
    before = await state();
    await page.mouse.move(a.x, a.y);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(a.x + 20, a.y);
    await page.mouse.up({ button: "right" });
    after = await state();
    check(
      "Rechtsziehen verschiebt Kamera ohne Baukosten",
      after.walls === before.walls && after.geld === before.geld,
      after,
    );
    before = await state();
    await page
      .locator("#palItems")
      .dispatchEvent("wheel", { deltaY: 100, bubbles: true });
    after = await state();
    check(
      "Palette scrollen zoomt die Welt nicht",
      after.camRT === before.camRT,
      { before: before.camRT, after: after.camRT },
    );
    before = await state();
    await page
      .locator("#wrap canvas")
      .dispatchEvent("wheel", { deltaY: 100, bubbles: true });
    after = await state();
    check("Mausrad auf Leinwand zoomt weiterhin", after.camRT > before.camRT, {
      before: before.camRT,
      after: after.camRT,
    });
    await page.evaluate(() => window.__th.auditBuild());
    const touch = async (type, points, changed) =>
      page.evaluate(
        ({ type, points, changed }) => {
          const el = document.querySelector("#wrap canvas");
          const t = (p) =>
            new Touch({
              identifier: p.id,
              target: el,
              clientX: p.x,
              clientY: p.y,
            });
          el.dispatchEvent(
            new TouchEvent(type, {
              bubbles: true,
              cancelable: true,
              touches: points.map(t),
              targetTouches: points.map(t),
              changedTouches: changed.map(t),
            }),
          );
        },
        { type, points, changed },
      );
    const t1 = { id: 1, ...(await point(1, -9.1)) },
      t2 = { id: 2, x: 450, y: 100 };
    // Kurze Kneifgeste ohne Ortswechsel darf keinen Einzeltipp ausloesen.
    t2.x = t1.x + 30;
    t2.y = t1.y;
    before = await state();
    await page.evaluate(
      ({ t1, t2 }) => {
        const el = document.querySelector("#wrap canvas");
        const t = (p) =>
          new Touch({
            identifier: p.id,
            target: el,
            clientX: p.x,
            clientY: p.y,
          });
        for (const [type, active, changed] of [
          ["touchstart", [t1], [t1]],
          ["touchstart", [t1, t2], [t2]],
          ["touchend", [t1], [t2]],
          ["touchend", [], [t1]],
        ])
          el.dispatchEvent(
            new TouchEvent(type, {
              bubbles: true,
              cancelable: true,
              touches: active.map(t),
              targetTouches: active.map(t),
              changedTouches: changed.map(t),
            }),
          );
      },
      { t1, t2 },
    );
    after = await state();
    check(
      "Kurze Zwei-Finger-Geste baut nichts",
      after.walls === before.walls && after.geld === before.geld,
      { before, after },
    );
    if (after.walls !== before.walls) await page.keyboard.press("Control+z");
    await touch("touchstart", [t1], [t1]);
    await touch("touchstart", [t1, t2], [t2]);
    await touch("touchend", [t1], [t2]);
    await page.evaluate(() => window.__th.auditCamera());
    before = await state();
    await touch(
      "touchmove",
      [{ ...t1, x: t1.x + 25 }],
      [{ ...t1, x: t1.x + 25 }],
    );
    after = await state();
    check(
      "Nach Kneifen dreht verbleibender Finger Kamera",
      Math.abs(after.camA - before.camA) > 0.1,
      { before: before.camA, after: after.camA },
    );
    await touch("touchend", [], [{ ...t1, x: t1.x + 25 }]);
    await page.evaluate(() => window.__th.auditBuild());
    const tt = { id: 1, ...(await point(5, -9.1)) };
    before = await state();
    await page.evaluate((p) => {
      const el = document.querySelector("#wrap canvas");
      const t = new Touch({
        identifier: p.id,
        target: el,
        clientX: p.x,
        clientY: p.y,
      });
      el.dispatchEvent(
        new TouchEvent("touchstart", {
          bubbles: true,
          cancelable: true,
          touches: [t],
          targetTouches: [t],
          changedTouches: [t],
        }),
      );
      el.dispatchEvent(
        new TouchEvent("touchend", {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [t],
        }),
      );
    }, tt);
    after = await state();
    check(
      "Ein-Finger-Tipp baut weiterhin genau eine Wand",
      after.walls === before.walls + 1 && after.geld === before.geld - 25,
      { before, after },
    );
    await page.keyboard.press("Control+z");
    // Normaler Wandzug und sein Verlauf der Kasse bleiben erhalten.
    await page.evaluate(() => {
      window._lastTouch = -10000;
      window.__th.auditBuild();
    });
    const za = await point(-9, -5),
      zb = await point(3, -5);
    before = await state();
    await page.mouse.move(za.x, za.y);
    await page.mouse.down();
    await page.mouse.move(zb.x, zb.y, { steps: 6 });
    await page.mouse.up();
    after = await state();
    const wallCount = after.walls - before.walls;
    check(
      "Wandzug baut Reihe und berechnet 25 je Wand",
      wallCount >= 5 && before.geld - after.geld === wallCount * 25,
      { before, after, wallCount },
    );
    await page.keyboard.press("Control+z");
    const undone = await state();
    check(
      "Ein Rueckgaengig nimmt ganzen Wandzug zurueck",
      undone.walls === before.walls && undone.geld === before.geld,
      undone,
    );
    // Eine verlorene Capture ist moeglich, ohne pointerup/pointercancel am Stick.
    await page.locator("#modeBtn").click();
    const j = await page.locator("#joy").boundingBox();
    await page.mouse.move(j.x + j.width / 2, j.y + j.height / 2);
    await page.mouse.down();
    await page.mouse.move(j.x + j.width / 2 + 38, j.y + j.height / 2);
    before = await state();
    await page.evaluate(() =>
      document.getElementById("joy").releasePointerCapture(1),
    );
    await page.mouse.move(j.x + j.width + 5, j.y + j.height / 2);
    after = await state();
    check(
      "Gegenprobe: Joystick wurde ausgelenkt",
      before.steer.x > 0.5,
      before,
    );
    check(
      "Verlorene Joystick-Capture stoppt Eingabe",
      after.steer.x === 0 && after.steer.z === 0 && !after.joyEdge,
      after,
    );
    await page.mouse.up();
    await page.keyboard.down("w");
    before = await state();
    check("WASD liefert Richtung", before.steer.z === -1, before.steer);
    await page.keyboard.up("w");
    after = await state();
    check(
      "Taste los setzt Richtung zurueck",
      after.steer.x === 0 && after.steer.z === 0,
      after.steer,
    );
    await page.keyboard.down("w");
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    after = await state();
    check(
      "Fensterwechsel loest WASD",
      after.steer.x === 0 && after.steer.z === 0,
      after.steer,
    );
    await page.keyboard.up("w");
    results.world = await page.evaluate(() => ({
      ladeStand: window._ladeStand,
      ladeOffen: window._ladeOffen,
      modelle: window._gebaeude?.length,
    }));
    check("Keine CSP-Blockaden", results.blocked.length === 0, {
      count: results.blocked.length,
      examples: results.blocked.slice(0, 2),
    });
    check(
      "Keine JavaScript-Fehler",
      results.errors.length === 0,
      results.errors,
    );
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(__dirname, `traumhaus-${label}.json`),
      JSON.stringify(results, null, 2) + "\n",
    );
  }
  if (results.checks.some((r) => !r.ok)) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 2;
});
