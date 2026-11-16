"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const out = process.env.PRISMA_OUT || "/tmp/prisma-qa",
  base = process.env.PRISMA_BASE || "http://127.0.0.1:8182";
const hook = `window.__prismaQA={read:function(){return {running:running,paused:paused,dist:dist,speed:speed,shield:shield,offset:shipX-centerX(dist),polarity:race.polarity,charge:race.charge,matched:race.matched,finished:race.finished,won:race.won,mode:race.mode,profile:raceProfile,next:race.gates.find(function(g){return !g.resolved;}),things:things.filter(function(t){return t.active&&!t.boost;}).map(function(t){return {d:t.d,off:t.off};})};},noDraw:function(){renderer.render=function(){};},draw:function(){renderBloom();}};`;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const report = {
    kind: "Echte Racer-Logik mit kontrollierter rAF-Zeit; kompletter Bot-Lauf mit Tastatureingaben, keine Positionssetzung. Separate Render-/Layout-Fixtures.",
    checks: [],
    errors: [],
  };
  function check(name, ok, data) {
    report.checks.push({ name, ok: !!ok, data });
    assert(ok, name);
  }
  try {
    const c = await browser.newContext({
      viewport: { width: 960, height: 640 },
    });
    await c.addInitScript(() => {
      if(!sessionStorage.getItem("prisma-qa-initialized")){localStorage.clear();sessionStorage.setItem("prisma-qa-initialized","1");}
      window.__raceClock = {
        now: 0,
        id: 0,
        queue: new Map(),
        step: function (ms) {
          this.now += ms;
          const q = [...this.queue.values()];
          this.queue.clear();
          q.forEach((f) => f(this.now));
        },
      };
      performance.now = () => __raceClock.now;
      window.requestAnimationFrame = (f) => {
        const id = ++__raceClock.id;
        __raceClock.queue.set(id, f);
        return id;
      };
      window.cancelAnimationFrame = (id) => __raceClock.queue.delete(id);
    });
    const p = await c.newPage();
    p.on("pageerror", (e) => report.errors.push(e.message));
    await p.route("**/neon-racer.html*", async (r) => {
      const a = await r.fetch(),
        h = await a.text();
      await r.fulfill({
        response: a,
        body: h.replace(
          "reset(); showBest(); profileHud(); requestAnimationFrame(loop);",
          hook +
            "reset(); showBest(); profileHud(); requestAnimationFrame(loop);",
        ),
      });
    });
    await p.goto(base + "/neon-racer.html?station=1", {
      waitUntil: "domcontentloaded",
    });
    await p.waitForFunction(() => window.__prismaQA);
    await p.evaluate(() => __prismaQA.noDraw());
    await p.locator("#startBtn").click();
    check(
      "Rallye startet über echten Startknopf",
      (await p.evaluate(() => __prismaQA.read())).mode === "race",
    );
    await p.keyboard.press("e");
    check(
      "Polwechsel per E",
      (await p.evaluate(() => __prismaQA.read())).polarity === 1,
    );
    await p.locator("#pauseBtn").click();
    const before = await p.evaluate(() => __prismaQA.read());
    await p.keyboard.press("e");
    await p.evaluate(() => {
      for (let i = 0; i < 30; i++) __raceClock.step(1000 / 60);
    });
    const paused = await p.evaluate(() => __prismaQA.read());
    check(
      "Pause hält Strecke und Pol unverändert",
      paused.paused &&
        paused.dist === before.dist &&
        paused.polarity === before.polarity,
    );
    await p.locator("#resumeBtn").click();
    const finish = await p.evaluate(() => {
      function key(k, on) {
        window.dispatchEvent(
          new KeyboardEvent(on ? "keydown" : "keyup", {
            key: k,
            bubbles: true,
          }),
        );
      }
      let flips = 0,
        boosts = 0,
        frames = 0;
      for (; frames < 11000; frames++) {
        let s = __prismaQA.read();
        if (!s.running) break;
        let target = s.next ? s.next.offset : 0;
        const barrier = s.things
          .filter((t) => t.d > s.dist && t.d - s.dist < 35)
          .sort((a, b) => a.d - b.d)[0];
        if (
          barrier &&
          (!s.next || s.next.d - s.dist > 38) &&
          Math.abs(target - barrier.off) < 3
        ) {
          target = barrier.off > 0 ? -3.6 : 3.6;
        }
        if (s.mode === "race") target = s.next ? s.next.offset : 0;
        key("ArrowDown", s.speed > 70);
        const error = target - s.offset;
        key("a", error < -0.5);
        key("d", error > 0.5);
        if (s.next && s.next.polarity !== s.polarity) {
          key("e", true);
          key("e", false);
          flips++;
        }
        if (s.charge >= 3) {
          key("f", true);
          key("f", false);
          boosts++;
        }
        __raceClock.step(1000 / 60);
      }
      key("a", false);
      key("d", false);
      return { state: __prismaQA.read(), frames, flips, boosts };
    });
    check(
      "Vollständige Rallye über echte Lenktasten bis zum Ziel",
      finish.state.won && finish.state.dist === 2800,
      finish,
    );
    check(
      "Resonanztore und Energie-Boost tatsächlich verwendet",
      finish.state.matched >= 12 && finish.boosts > 0,
      finish,
    );
    check(
      "Ergebnis und Profil genau einmal gespeichert",
      finish.state.profile.runs === 1 && finish.state.profile.wins === 1,
    );
    await p.evaluate(() => {
      for (let i = 0; i < 60; i++) __raceClock.step(1000 / 60);
    });
    check(
      "Ergebnis bleibt stabil, keine doppelte Prämie",
      (await p.evaluate(() => __prismaQA.read())).profile.runs === 1,
    );
    await p.locator("#raceModeBack").click();
    await p.locator('[data-race="endless"]').click();
    await p.locator("#startBtn").click();
    check(
      "Endlos-Training separat erreichbar",
      (await p.evaluate(() => __prismaQA.read())).mode === "endless",
    );
    check(
      "Polknopf im Endlosmodus ausgeblendet",
      await p.locator("#polarityBtn").isHidden(),
    );
    await p.reload({waitUntil:"domcontentloaded"});await p.waitForFunction(()=>window.__prismaQA);
    check("Rennprofil übersteht echten Reload",await p.evaluate(()=>__prismaQA.read().profile.runs===1&&__prismaQA.read().profile.wins===1));
    await c.close();
    const v = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await v.newPage();
    page.on("pageerror", (e) => report.errors.push(e.message));
    await page.goto(base + "/neon-racer.html?station=1", {
      waitUntil: "domcontentloaded",
    });
    await page.locator("#startBtn").click();
    await page.waitForTimeout(4000);
    await page.locator("#pauseBtn").click();
    // Bildfixture: pausierte Welt ohne abdunkelnde Pausekarte ansehen.
    await page.locator("#pauseLayer").evaluate(e=>e.style.visibility="hidden");
    await page.screenshot({ path: path.join(out, "desktop.png") });
    await page.locator("#pauseLayer").evaluate(e=>e.style.visibility="");
    await page.locator("#resumeBtn").click();
    await v.close();
    const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
    const touchPage=await touch.newPage();touchPage.on("pageerror",e=>report.errors.push(e.message));
    await touchPage.goto(base+"/neon-racer.html?station=1",{waitUntil:"domcontentloaded"});await touchPage.locator("#startBtn").click();
    await touchPage.locator("#polarityBtn").tap();
    check("Echter Touch-Tipp wechselt den Pol",await touchPage.locator("#polarityBtn").getAttribute("data-pol")==="1");
    for (const size of [
      { width: 390, height: 844 },
      { width: 640, height: 360 },
      { width: 360, height: 640 },
    ]) {
      await touchPage.setViewportSize(size);
      const controls = await touchPage.evaluate(() =>
        ["polarityBtn", "chargeBtn", "pauseBtn", "muteBtn", "brakeBtn"].map((id) => {
          const e = document.getElementById(id),
            r = e.getBoundingClientRect(),
            hit = document.elementFromPoint(
              r.x + r.width / 2,
              r.y + r.height / 2,
            );
          return {
            id,
            x: r.x,
            y: r.y,
            w: r.width,
            h: r.height,
            visible: getComputedStyle(e).display !== "none",
            inside:
              r.x >= 0 &&
              r.y >= 0 &&
              r.right <= innerWidth &&
              r.bottom <= innerHeight,
            hit: hit === e || e.contains(hit),
          };
        }),
      );
      check(
        "Bedienknöpfe erreichbar " + size.width + "×" + size.height,
        controls.every(
          (x) => x.visible && x.inside && x.hit && x.w >= 44 && x.h >= 44,
        ),
        controls,
      );
      await touchPage.screenshot({
        path: path.join(out, size.width + "x" + size.height + ".png"),
      });
    }
    check("Keine JavaScript-Fehler", report.errors.length === 0, report.errors);
    report.status = "passed";
  } catch (e) {
    report.status = "failed";
    report.error = e.stack;
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(
      path.join(out, "ergebnis.json"),
      JSON.stringify(report, null, 2),
    );
    console.log({
      status: report.status,
      checks: report.checks.length,
      error: report.error,
    });
    await browser.close();
  }
})();
