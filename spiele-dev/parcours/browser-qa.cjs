"use strict";
/* Nur nach Freigabe der geteilten GPU ausführen. Genau ein Browser, finally schliesst ihn.
   Lädt zuerst unverändertes HTML; spätere Sonden injizieren nur einen lokalen Test-Hook.
   Der Server muss das Arbeitsverzeichnis mit den echten _headers ausliefern. */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.JUMP_QA_URL || "http://127.0.0.1:8182";
const out = process.env.JUMP_QA_OUT || "/tmp/aban-jump-qa";
fs.mkdirSync(out, { recursive: true });
const hook = `window.__jumpQA={
  snap(){return {level:curLvl,count:railState.count,running,won,paused,deaths,coins,charge:portalCharge,
    players:PL.map(p=>({x:p.x,y:p.y,railId:p.railId,railT:p.railT,ckX:p.ckX,onGround:p.onGround,jumps:p.jumps}))};},
  start(idx,coop){curLvl=idx;startGame(coop);},
  put(pi,x,y){var p=PL[pi];Object.assign(p,{x,y,vx:0,vy:0,jumps:0,coyote:0,jbuf:0,onGround:false});Rails.resetPlayer(p);},
  enter(id,pi=0){var p=PL[pi],q=Rails.point(railState.rails[id],.04);this.put(pi,q.x,q.y+.78);p.vx=13;},
  goal(pi=0){this.put(pi,goalX,goalY);},
  pause:setPaused,retry:retryCheckpoint
};\n`;

(async () => {
  let browser;
  const errors = [], checks = [];
  function checked(name) { checks.push(name); console.log("PASS " + name); }
  try {
    browser = await chromium.launch({ headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
    await page.goto(base + "/neon-jump.html?station=1", { waitUntil: "load" });
    await page.locator("#soloBtn").waitFor();
    await page.screenshot({ path: path.join(out, "desktop-menu.png") });
    await page.locator("#soloBtn").click();
    await page.keyboard.down("d"); await page.waitForTimeout(120); await page.keyboard.press("w");
    await page.waitForFunction(() => document.querySelector("#railProgress").textContent.includes("1 / 3"), null, { timeout: 10000 });
    await page.keyboard.up("d");
    checked("Unveränderte Seite: echter Tastatur-Sprung fängt erste Schiene und sichert Impuls");
    await page.keyboard.press("r");
    assert.match(await page.locator("#railProgress").textContent(), /1 \/ 3/);
    checked("Echter R-Tastendruck behält Impuls");

    // Nur Test-Hook ergänzen, HTTP-Antwort inklusive CSP des Servers erhalten.
    await page.route("**/neon-jump.html?station=1", async route => {
      const response = await route.fetch(); let body = await response.text();
      // Asset-Hash ist optional: dieselbe Sonde funktioniert vor/nach Cache-Versionierung.
      const marker = /(<script src="\/js\/parcours\/lichtschienen\.js(?:\?v=[a-f0-9]{12})?"><\/script>\s*<script>)([\s\S]*?)(<\/script>)/;
      const main = body.match(marker); assert.ok(main, "Jump-Hauptskript gefunden");
      const at = main[2].lastIndexOf("})();"); assert.ok(at >= 0);
      body = body.replace(main[0], main[1] + main[2].slice(0, at) + hook + main[2].slice(at) + main[3]);
      await route.fulfill({ response, body });
    });
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => !!window.__jumpQA);
    for (let level = 0; level < 3; level++) {
      await page.evaluate(level => window.__jumpQA.start(level, false), level);
      for (let id = 0; id < 3; id++) {
        await page.evaluate(id => window.__jumpQA.enter(id), id);
        await page.waitForFunction(id => window.__jumpQA.snap().players[0].railId === id, id);
        if (id === 0) await page.screenshot({ path: path.join(out, `desktop-schiene-${level + 1}.png`) });
        await page.waitForFunction(id => window.__jumpQA.snap().count === id + 1, id);
      }
      await page.evaluate(() => window.__jumpQA.goal());
      await page.waitForFunction(() => window.__jumpQA.snap().won);
      await page.screenshot({ path: path.join(out, `desktop-finale-${level + 1}.png`) });
      checked(`Strecke ${level + 1}: alle Schienen, Portaltransfer und Finale gerendert`);
    }

    await page.evaluate(() => window.__jumpQA.start(0, true));
    for (let id = 0; id < 3; id++) {
      await page.evaluate(id => window.__jumpQA.enter(id, id % 2), id);
      await page.waitForFunction(id => window.__jumpQA.snap().count === id + 1, id);
    }
    await page.evaluate(() => { window.__jumpQA.goal(0); window.__jumpQA.put(1, 117, 7); });
    await page.locator("#waitP").waitFor({ state: "visible" });
    assert.equal(await page.evaluate(() => window.__jumpQA.snap().won), false);
    await page.evaluate(() => window.__jumpQA.goal(1));
    await page.waitForFunction(() => window.__jumpQA.snap().won);
    checked("Koop: geteilte Impulse und gemeinsames Portalziel");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => !!window.__jumpQA);
    await page.evaluate(() => window.__jumpQA.start(0, false));
    await page.evaluate(() => window.__jumpQA.enter(0));
    await page.waitForFunction(() => window.__jumpQA.snap().players[0].railId === 0);
    await page.screenshot({ path: path.join(out, "mobile-schiene.png") });
    const layout = await page.evaluate(() => {
      const ids = ["hud", "railHud", "retryBtn", "muteBtn", "pauseBtn"];
      return ids.map(id => { const r = document.getElementById(id).getBoundingClientRect(); return { id, x: r.x, y: r.y, right: r.right, bottom: r.bottom }; });
    });
    for (const r of layout) assert.ok(r.x >= 0 && r.right <= 391, `${r.id} passt in mobilen Viewport`);
    const hud = layout.find(r => r.id === "hud"), retry = layout.find(r => r.id === "retryBtn");
    assert.ok(retry.y >= hud.bottom || retry.bottom <= hud.y, "Retry verdeckt keinen HUD-Zähler");
    checked("Mobiles Layout: HUD, Feedback und Retry innerhalb des Viewports");
    await page.close();

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    mobile.on("pageerror", error => errors.push(error.message));
    await mobile.goto(base + "/neon-jump.html?station=1", { waitUntil: "load" });
    await mobile.locator("#startBtn").click();
    assert.equal(await mobile.locator("#touch").isVisible(), true);
    await mobile.locator("#tzJ").tap();
    await mobile.screenshot({ path: path.join(out, "mobile-touch.png") });
    checked("Echtes Touch-Gerät: Solo-Start und Sprungzone nutzbar");

    await mobile.route("**/spiele-dev/parcours/qa-host.html", route => route.fulfill({
      contentType: "text/html", body: `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"><script>window.posts=[];addEventListener('message',e=>posts.push(e.data))</script><iframe src="/neon-jump.html?station=1" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe></body></html>`
    }));
    await mobile.goto(base + "/spiele-dev/parcours/qa-host.html");
    const frame = mobile.frameLocator("iframe");
    await frame.locator("#retryBtn").waitFor({ state: "visible" });
    await mobile.screenshot({ path: path.join(out, "mobile-station.png") });
    await frame.locator("#stationBack").tap();
    await mobile.waitForFunction(() => window.posts.includes("mini-back"));
    checked("Echte iframe-Station: Solo-Autostart und mini-back unter echten CSP-Headern");
    await mobile.close();
    assert.deepEqual(errors, [], "Keine JS-/Console-Fehler");
    fs.writeFileSync(path.join(out, "result.json"), JSON.stringify({ checks, errors, layout }, null, 2));
    console.log(`${checks.length} Browser-Prüfungen bestanden. Bilder: ${out}`);
  } finally {
    if (browser) await browser.close();
    console.log("Jump-Browser geschlossen; GPU wieder frei.");
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
