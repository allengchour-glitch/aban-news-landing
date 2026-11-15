#!/usr/bin/env node
// Aufruf: WELTEN_BASE_URL=http://127.0.0.1:8112 node spiele-dev/parallel-audit/welten-qa.cjs
// WELTEN_GAMES=neon-park,neon-zusammen begrenzt den Lauf; CSP bleibt unverändert.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WELTEN_BASE_URL || "http://127.0.0.1:8112";
const out = process.env.WELTEN_OUT || "/tmp/aban-welten/final";
const games = (
  process.env.WELTEN_GAMES ||
  "neon-wildnis,neon-park,neon-zusammen,lebenspfad,neon-realm"
).split(",");
const hooks = {
  "neon-wildnis":
    "({running,paused,keys,stick:stickV,pos:{x:player.position.x,z:player.position.z}})",
  "neon-park":
    "({running:laeuft,paused,keys,stick:{x:mx,y:mz},pos:{x:ich.x,z:ich.z},hold:RIDES[0].halten,online:ONLINE,renderFrame:renderer.info.render.frame})",
  "neon-zusammen":
    "({running,paused,keys,stick:{x:kx,y:kz},pos:{x:chars[active].x,z:chars[active].z},active,online:NETON})",
  lebenspfad:
    "({running,menuOpen,phase:G&&G.phase,seed:NET.seed,turn:G&&G.turn,queue:NET.q.length})",
};
async function click(page, selector) {
  const el = page.locator(selector);
  await el.evaluate((node) => node.scrollIntoView({ block: "center" }));
  const b = await el.boundingBox();
  assert(b, "Unsichtbar: " + selector);
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
}
async function state(page) {
  return page.evaluate(() => window.__weltenQA());
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  let browser;
  let failed = 0;
  const results = [];
  try {
    for (const game of games) {
      let context, deadline;
      const result = { game, checks: [], errors: [], csp: null, console: [] };
      try {
        browser = await chromium.launch({
          executablePath: process.env.PW_CHROME || undefined,
          args: [
            "--no-sandbox",
            "--enable-unsafe-swiftshader",
            "--use-angle=swiftshader-webgl",
            "--use-gl=angle",
            "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding",
          ],
        });
        context = await browser.newContext({
          viewport: { width: 640, height: 440 },
          hasTouch: true,
          serviceWorkers: "block",
        });
        deadline = setTimeout(() => {
          result.deadline = true;
          context.close().catch(() => {});
        }, 120000);
        await context.addInitScript(() => {
          localStorage.setItem("lp_tut_seen", "1");
          localStorage.setItem("nw_intro", "1");
          window.__weltenCsp = [];
          document.addEventListener("securitypolicyviolation", (e) =>
            window.__weltenCsp.push({
              directive: e.effectiveDirective,
              uri: e.blockedURI,
            }),
          );
        });
        const page = await context.newPage();
        page.setDefaultTimeout(30000);
        page.on("pageerror", (e) => result.errors.push(e.message));
        page.on("console", (m) => {
          if (m.type() === "error") result.console.push(m.text().slice(0, 300));
        });
        if (hooks[game])
          await page.route("**/" + game + ".html*", async (route) => {
            const response = await route.fetch();
            let html = await response.text();
            const idx = html.lastIndexOf("})();");
            assert(idx > 0, "Test-Hook-Anker fehlt");
            // Nur lesender Griff in den vorhandenen IIFE-Scope; sämtliche Response-Header bleiben erhalten.
            html =
              html.slice(0, idx) +
              "window.__weltenQA=()=>" +
              hooks[game] +
              ";\n" +
              html.slice(idx);
            await route.fulfill({ response, body: html });
          });
        const response = await page.goto(
          base + "/" + game + ".html?station=1&mp=local",
          { waitUntil: "domcontentloaded", timeout: 60000 },
        );
        assert(
          response.headers()["content-security-policy"],
          "Echte CSP-Header fehlen",
        );
        if (game === "neon-realm") {
          await page.waitForURL(/\/neon-wildnis\.html/, { timeout: 15000 });
          assert(page.url().includes("/neon-wildnis.html"));
          result.checks.push("Legacy-Adresse leitet zur Wildnis um");
        } else {
          await page.waitForFunction(() => window.__weltenQA, null, {
            timeout: 60000,
          });
          if (game === "neon-park")
            await page
              .locator("#lade")
              .waitFor({ state: "hidden", timeout: 60000 });
          if (
            game === "neon-park" &&
            process.env.WELTEN_PARK_MOBILE_ONLY === "1"
          ) {
            await page.setViewportSize({ width: 390, height: 540 });
            await click(page, "#bSolo");
            assert.equal((await state(page)).running, true);
            await click(page, "#pauseBtn");
            assert.equal((await state(page)).paused, true);
            const frame = (await state(page)).renderFrame;
            await page.waitForTimeout(300);
            assert.equal((await state(page)).renderFrame, frame);
            result.checks.push(
              "390×540: Solo-Pause stoppt weitere Render-Aufrufe",
            );
            await page.screenshot({
              path: path.join(out, "neon-park-pause-mobile.png"),
              timeout: 30000,
            });
            const resume = await page.locator("#pauseResume").boundingBox();
            assert(resume && resume.width >= 44 && resume.height >= 44);
            await page.touchscreen.tap(
              resume.x + resume.width / 2,
              resume.y + resume.height / 2,
            );
            await page.waitForFunction(
              () => !window.__weltenQA().paused,
              null,
              { timeout: 30000 },
            );
            await page.waitForFunction(
              (before) => window.__weltenQA().renderFrame > before,
              frame,
              { timeout: 30000 },
            );
            result.checks.push(
              "Echter mobiler Weiter-Tap schliesst Pause; Welt rendert wieder",
            );
          } else {
            if (game === "neon-park" || game === "neon-zusammen") {
              const park = game === "neon-park";
              await click(page, park ? "#bCoop" : "#coopBtn");
              assert.equal(
                await page
                  .locator(park ? "#bCancel" : "#cancelCoop")
                  .isVisible(),
                true,
              );
              await click(page, park ? "#bCancel" : "#cancelCoop");
              assert.equal(
                await page.locator(park ? "#bSolo" : "#startBtn").isVisible(),
                true,
              );
              result.checks.push(
                "Lokale WebRTC-Suche lässt sich abbrechen; Solo wieder verfügbar",
              );
            }
            await click(page, game === "neon-park" ? "#bSolo" : "#startBtn");
            assert.equal((await state(page)).running, true);
            result.checks.push("Echter Start-Klick");
            if (game === "lebenspfad") {
              await page.keyboard.press("Escape");
              const before = await state(page);
              assert.equal(before.menuOpen, true);
              await page.keyboard.press("Space");
              const after = await state(page);
              assert.equal(after.phase, before.phase);
              assert.equal(after.seed, before.seed);
              assert.equal(after.queue, before.queue);
              result.checks.push(
                "Space im Menü ändert weder Phase noch Seed/Netz-Queue",
              );
              await page.keyboard.press("Escape");
              await page.keyboard.press("Space");
              assert.equal((await state(page)).phase, "rolling");
              result.checks.push("Nach Menü-Schliessen würfelt Space wieder");
            } else {
              const touch = await context.newCDPSession(page);
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchStart",
                touchPoints: [{ x: 80, y: 350, id: 17 }],
              });
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [{ x: 110, y: 320, id: 17 }],
              });
              const held = await state(page);
              assert(
                Math.hypot(held.stick.x, held.stick.y) > 0.1,
                "Touch-Stick nimmt keine Eingabe an",
              );
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchCancel",
                touchPoints: [],
              });
              assert.deepEqual((await state(page)).stick, { x: 0, y: 0 });
              await touch.detach();
              result.checks.push(
                "Echter Touch-Drag und Touch-Abbruch setzen den Stick zurück",
              );
              await page.keyboard.down("w");
              await page.waitForTimeout(200);
              await page.evaluate(() =>
                window.dispatchEvent(new Event("blur")),
              );
              const reset = await state(page);
              assert.equal(!!reset.keys.w, false);
              assert.deepEqual(reset.stick, { x: 0, y: 0 });
              const before = reset.pos;
              await page.waitForTimeout(300);
              const after = (await state(page)).pos;
              assert(
                Math.hypot(after.x - before.x, after.z - before.z) < 0.03,
                "Bewegung nach Fokusverlust",
              );
              await page.keyboard.up("w");
              result.checks.push(
                "Fokusverlust löscht Eingabe und stoppt Bewegung",
              );
              await page.keyboard.press("Escape");
              assert.equal((await state(page)).paused, true);
              const frozen = await state(page);
              await page.keyboard.down("d");
              await page.waitForTimeout(250);
              assert.deepEqual((await state(page)).pos, frozen.pos);
              await page.keyboard.press("Escape");
              assert.equal((await state(page)).paused, false);
              assert.equal(!!(await state(page)).keys.d, false);
              await page.keyboard.up("d");
              result.checks.push(
                "Pause friert Solo ein; Fortsetzen übernimmt keine gehaltene Taste",
              );
              if (game === "neon-park" || game === "neon-zusammen") {
                await page.setViewportSize({ width: 390, height: 540 });
                const btn = await page.locator("#pauseBtn").boundingBox();
                assert(btn.width >= 44 && btn.height >= 44);
                await click(page, "#pauseBtn");
                assert.equal(await page.locator("#pauseO").isVisible(), true);
                await page.screenshot({
                  path: path.join(out, game + "-pause-mobile.png"),
                  timeout: 60000,
                });
                await click(page, "#pauseResume");
                assert.equal((await state(page)).paused, false);
                result.checks.push(
                  "390×540: erreichbarer Pause-/Weiterknopf, ≥44px",
                );
              }
            }
          }
          result.csp = await page.evaluate(() => window.__weltenCsp);
          assert.deepEqual(result.csp, [], "CSP-Verletzungen");
        }
        assert.deepEqual(result.errors, [], "JS-Laufzeitfehler");
        result.ok = true;
      } catch (e) {
        result.ok = false;
        result.failure = e.message;
        failed++;
      } finally {
        clearTimeout(deadline);
        if (context) await context.close();
        if (browser) {
          await browser.close();
          browser = null;
        }
      }
      results.push(result);
      console.log(JSON.stringify(result));
      fs.writeFileSync(
        path.join(out, "results.json"),
        JSON.stringify({ base, results }, null, 2) + "\n",
      );
    }
  } finally {
    if (browser) await browser.close();
  }
  process.exitCode = failed ? 1 : 0;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
