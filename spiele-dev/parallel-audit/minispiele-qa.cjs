#!/usr/bin/env node
// Browser-QA: normale Starts mit echten Headern; gezielte Zustandsproben nur in Testantworten.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const BASE = process.env.GAME_BASE_URL || "http://127.0.0.1:8112";
const ROOT = path.resolve(__dirname, "../..");
const OUT = process.env.MINI_QA_OUT || "/tmp/minispiele-qa.json";
const results = [];
const hooks = {
  "tap-duell": "({read:()=>({started,players,running})})",
  "auto-rennen": "({read:()=>({running,winner,cars})})",
  "ballon-pump": "({read:()=>({P,scores})})",
  "farb-klick": "({read:()=>({...state})})",
  "hoch-tief": "({read:()=>state})",
  "mathe-duell": "({read:()=>({current,roundActive,locked,scores})})",
  pong: '({read:()=>({state,ball:{...ball},pad:{...pad},W,H,serveTimer}),resetGame,miss:()=>{state="play";ball={x:10,y:-30,vx:0,vy:-4};step(1)}})',
  "schlange-duell": "({read:()=>({snakes,apples}),spawnApple})",
  simon: "({read:()=>({seq,inputIdx,accepting,playing,current,best})})",
  "stapel-turm": "({read:()=>({state,current,moving,placedRounds}),newGame})",
};
const auto = new Set([
  "ballon-pump",
  "drei-gewinnt",
  "elfmeter",
  "hoch-tief",
  "memory",
  "quiz-buzzer",
  "schere-stein-papier",
  "stapel-turm",
  "vier-gewinnt",
]);
const starts = { "farb-klick": "#btnStart" };
let browser,
  page,
  failures = 0;
const errors = [];
async function load(game) {
  errors.length = 0;
  await page.goto(`${BASE}/minispiele/${game}.html`);
}
async function event(selector, type = "click", init = {}) {
  await page.locator(selector).dispatchEvent(type, init);
}
async function pointer(selector, pointerType = "touch") {
  await event(selector, "pointerdown", { pointerType, button: 0 });
}
async function wait(ms) {
  await page.clock.runFor(ms);
}
async function read() {
  return page.evaluate(() => window.__miniQA.read());
}
async function visible(selector) {
  return page.locator(selector).isVisible();
}
async function test(name, fn) {
  if(process.env.MINI_QA_ONLY && !name.includes(process.env.MINI_QA_ONLY))return;
  try {
    await fn();
    assert.deepEqual(errors, [], "JavaScript-/CSP-Fehler");
    results.push({ name, ok: true });
    console.log("PASS", name);
  } catch (e) {
    failures++;
    results.push({ name, ok: false, error: String(e) });
    console.error("FAIL", name, String(e));
  }
}
(async () => {
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PW_CHROME || undefined,
      args: ["--no-sandbox"],
    });
    // Unveränderte HTML-Antworten: alle zwanzig Spiele an beiden Bildschirmgrössen starten.
    const games = fs
      .readdirSync(path.join(ROOT, "minispiele"))
      .filter((f) => f.endsWith(".html") && f !== "index.html")
      .map((f) => f.slice(0, -5))
      .sort();
    assert.equal(games.length, 20);
    for (const width of [390, 900]) {
      const context = await browser.newContext({
        viewport: { width, height: 540 },
        hasTouch: width === 390,
        isMobile: width === 390,
      });
      page = await context.newPage();
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (
          m.type() === "error" &&
          /Content Security Policy|Refused to/.test(m.text())
        )
          errors.push(m.text());
      });
      await page.clock.install();
      for (const game of games)
        await test(`Start ${game} ${width}×540`, async () => {
          await load(game);
          if (!auto.has(game))
            await page
              .locator(starts[game] || "#startBtn")
              .click({ force: true });
          await wait(3100);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
            "Horizontaler Überlauf",
          );
          if (["ballon-pump", "farb-klick"].includes(game)) {
            const bad = await page.evaluate(
              () =>
                [
                  ...document.querySelectorAll(".pumpbtn,.stopbtn,.fbtn"),
                ].filter((e) => {
                  const r = e.getBoundingClientRect();
                  const hit = document.elementFromPoint(
                    r.x + r.width / 2,
                    r.y + r.height / 2,
                  );
                  return (
                    r.y < 0 ||
                    r.bottom > innerHeight + 1 ||
                    !hit ||
                    !(hit === e || e.contains(hit))
                  );
                }).length,
            );
            assert.equal(bad, 0, "Spielbuttons abgeschnitten oder überdeckt");
          }
        });
      await context.close();
    }
    const context = await browser.newContext({
      viewport: { width: 390, height: 540 },
      hasTouch: true,
      isMobile: true,
    });
    page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.clock.install();
    // RAF-Zähler und lesende Testgriffe; Original-Response-Header inklusive CSP bleiben erhalten.
    await page.addInitScript(() => {
      const request = window.requestAnimationFrame.bind(window),
        cancel = window.cancelAnimationFrame.bind(window);
      window.__miniFrames = new Set();
      window.requestAnimationFrame = (fn) => {
        let id = request((t) => {
          __miniFrames.delete(id);
          fn(t);
        });
        __miniFrames.add(id);
        return id;
      };
      window.cancelAnimationFrame = (id) => {
        __miniFrames.delete(id);
        cancel(id);
      };
    });
    await page.route("**/minispiele/*.html", async (route) => {
      const response = await route.fetch();
      const game = new URL(route.request().url()).pathname
        .split("/")
        .pop()
        .slice(0, -5);
      let body = await response.text();
      if (hooks[game])
        body = body.replace(
          /\}\)\(\);\s*<\/script>/,
          `window.__miniQA=${hooks[game]};})();\n</script>`,
        );
      await route.fulfill({ response, body });
    });
    await test("Drei gewinnt: alter Sieg nach Reset, Gewinn, Remis, Revanche", async () => {
      await load("drei-gewinnt");
      for (const i of [0, 3, 1, 4, 2])
        await page.locator(".cell").nth(i).dispatchEvent("click");
      await event("#resetBtn");
      await wait(800);
      assert.equal(await visible("#overlay"), false);
      assert.equal(
        (await page.locator(".cell").allTextContents()).join(""),
        "",
      );
      for (const i of [0, 3, 1, 4, 2])
        await page.locator(".cell").nth(i).dispatchEvent("click");
      await wait(800);
      assert.equal(await visible("#overlay"), true);
      await event("#againBtn");
      for (const i of [0, 1, 2, 4, 3, 5, 7, 6, 8])
        await page.locator(".cell").nth(i).dispatchEvent("click");
      await wait(600);
      assert.match(await page.locator("#ovRes").textContent(), /Unentschieden/);
    });
    await test("Schere Stein Papier: verborgen, Remis, drei Siege, Revanche", async () => {
      await load("schere-stein-papier");
      await event('[data-p="1"][data-c="stein"]');
      assert.equal(await page.locator(".picked").count(), 0);
      assert.equal(await page.locator("#ch1 button:disabled").count(), 3);
      assert.equal(await page.locator("#ch2 button:disabled").count(), 0);
      await event('[data-p="2"][data-c="stein"]');
      await wait(500);
      assert.match(
        await page.locator("#rtitle").textContent(),
        /Unentschieden/,
      );
      await event("#obtn");
      for (let i = 0; i < 3; i++) {
        await event('[data-p="1"][data-c="stein"]');
        await event('[data-p="2"][data-c="schere"]');
        await wait(500);
        if (i < 2) await event("#obtn");
      }
      assert.equal(await page.locator("#s1").textContent(), "3");
      assert.match(
        await page.locator("#rtitle").textContent(),
        /gewinnt das Spiel/,
      );
      await event("#obtn");
      assert.equal(await page.locator("#s1").textContent(), "0");
      assert.equal(await page.locator(".choice:disabled").count(), 0);
    });
    await test("Hoch Tief: echter Touch → Maus, gleiche Karte, 20 Tipps, Revanche", async () => {
      await load("hoch-tief");
      await page.locator("#btnHigher").tap({ force: true });
      await wait(1300);
      await page.locator("#btnHigher").click({ force: true });
      assert.equal((await read()).busy, true);
      await wait(1300);
      await page.evaluate(() => {
        Math.random = () => 0;
      });
      for (let i = 2; i < 20; i++) {
        await event("#btnHigher");
        await wait(1300);
      }
      assert.equal((await read()).done, true);
      assert.equal(await visible("#overlay"), true);
      await event("#btnAgain");
      assert.equal((await read()).round, 1);
      assert.equal((await read()).scores[1], 0);
      await event("#btnHigher");
      assert.match(await page.locator("#feedback").textContent(), /Gleich/);
    });
    await test("Tipp Duell: Touch → Maus im Takt, Ende und Neustart", async () => {
      await load("tap-duell");
      await event("#startBtn");
      const box = await page.locator("#halfBottom").boundingBox();
      // Gleiche Hybrid-Eingaben, aber auf zwei verschiedene gültige Beats statt Spam.
      const started = (await read()).started;
      await wait(Math.max(0, started + 1000 - await page.evaluate(() => performance.now())));
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      assert.equal((await read()).players[1].hits, 1);
      await wait(Math.max(0, started + 1750 - await page.evaluate(() => performance.now())));
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      assert.equal((await read()).players[1].hits, 2);
      assert.ok((await read()).players[1].score >= 100);
      await wait(Math.max(0, started + 10100 - await page.evaluate(() => performance.now())));
      assert.equal(await visible("#endOverlay"), true);
      await event("#againBtn");
      assert.equal(await page.locator("#cntBottom").textContent(), "0");
      assert.equal(await visible("#endOverlay"), false);
    });
    await test("Ballon: Platzen zeigt Füllstand, drei Punkte, Revanche", async () => {
      await load("ballon-pump");
      for (let i = 0; i < 25; i++)
        await pointer('[data-p="0"][data-act="pump"]');
      assert.match(await page.locator("#ftxt0").textContent(), /GEPLATZT/);
      await pointer('[data-p="1"][data-act="stop"]');
      await wait(500);
      await pointer("#nextBtn");
      for (let i = 0; i < 2; i++) {
        await pointer('[data-p="1"][data-act="pump"]');
        await pointer('[data-p="1"][data-act="stop"]');
        await pointer('[data-p="0"][data-act="stop"]');
        await wait(500);
        if (i === 0) await pointer("#nextBtn");
      }
      assert.equal(await visible("#winOverlay"), true);
      assert.equal((await read()).scores[1], 3);
      await pointer("#againBtn");
      assert.deepEqual((await read()).scores, [0, 0]);
    });
    await test("Elfmeter: gehalten, Tor, uneinholbarer Sieg und Neustart", async () => {
      await load("elfmeter");
      await event("#z0");
      await event("#z0");
      await wait(2100);
      assert.equal(await page.locator("#score1").textContent(), "0");
      assert.match(await page.locator("#shots1").textContent(), /🧤/);
      await event("#z0");
      await event("#z1");
      await wait(2100);
      assert.equal(await page.locator("#score2").textContent(), "1");
      for (let i = 0; i < 8 && !(await visible("#overlay")); i++) {
        await event("#z0");
        await event("#z0");
        await wait(2100);
      }
      assert.equal(await visible("#overlay"), true);
      assert.match(await page.locator("#endtitle").textContent(), /Spieler 2/);
      await page.locator("#overlay button").dispatchEvent("click");
      assert.equal(await page.locator("#score2").textContent(), "0");
      assert.equal(await visible("#overlay"), false);
    });
    await test("Index: zwanzig eigene lokale Spiele ohne Koop-Versprechen", async () => {
      await load("index");
      assert.equal(await page.locator("#grid a.card").count(), 20);
      const links = await page
        .locator("#grid a.card")
        .evaluateAll((a) => a.map((e) => e.getAttribute("href")));
      assert.equal(new Set(links).size, 20);
      assert.match(
        await page.locator('meta[name="description"]').getAttribute("content"),
        /^20 /,
      );
      assert.doesNotMatch(await page.locator("footer").textContent(), /Koop/);
    });
    await test("Farb Klick: Wort statt Tinte, Fehlersperre, vier Punkte, Revanche", async () => {
      await load("farb-klick");
      await event("#btnStart");
      await wait(1000);
      const target = (await read()).ziel;
      const wrong = await page
        .locator("#knUnten button")
        .evaluateAll(
          (els, t) => els.find((e) => e.dataset.key !== t).dataset.key,
          target,
        );
      await event(`#knUnten [data-key="${wrong}"]`);
      await event(`#knUnten [data-key="${target}"]`);
      assert.equal((await read()).p1, 0);
      await wait(950);
      for (let i = 0; i < 4; i++) {
        const t = (await read()).ziel;
        await event(`#knUnten [data-key="${t}"]`);
        await wait(i < 3 ? 1800 : 800);
      }
      assert.equal((await read()).p1, 4);
      assert.equal(await visible("#ovEnde"), true);
      await event("#btnNochmal");
      assert.equal((await read()).p1, 0);
    });
    await test("Stapel Turm: Hybrid-Maus, sechs Züge, genau ein RAF nach Revanchen", async () => {
      await load("stapel-turm");
      for (let i = 0; i < 6; i++) {
        const box = await page.locator("#cv").boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await wait(i < 5 ? 600 : 1300);
      }
      assert.equal((await read()).placedRounds, 6);
      assert.equal(await visible("#ov"), true);
      await event("#ovBtn");
      assert.equal((await read()).placedRounds, 0);
      for (let i = 0; i < 4; i++) await page.evaluate(() => __miniQA.newGame());
      assert.equal(await page.evaluate(() => __miniFrames.size), 1);
    });
    await test("Pong: Schläger, verpasster Ball, fünf Punkte, Revanche", async () => {
      await load("pong");
      await event("#startBtn");
      const box = await page.locator("#cv").boundingBox();
      await event("#cv", "mousedown", {
        clientX: box.x + 60,
        clientY: box.y + box.height - 40,
      });
      assert.ok(Math.abs((await read()).pad[1] - 60) < 1);
      await event("#cv", "mouseup");
      for (let i = 0; i < 5; i++) await page.evaluate(() => __miniQA.miss());
      assert.equal(await visible("#ov"), true);
      assert.equal(await page.locator("#ptsP1").textContent(), "5");
      await event("#againBtn");
      assert.equal(await page.locator("#ptsP1").textContent(), "0");
      const g = await read();
      assert.equal(g.W, Math.round(box.width));
      assert.equal(g.H, Math.round(box.height));
    });
    await test("Mathe Duell: Rechnung, eindeutige Antworten, Fehlersperre, Sieg", async () => {
      await load("mathe-duell");
      await event("#startBtn");
      await wait(3000);
      for (let i = 0; i < 4; i++) {
        const g = await read();
        const [a, op, b] = g.current.text.split(" ");
        const answer = op === "+" ? +a + +b : op === "−" ? a - b : a * b;
        assert.equal(g.current.answer, answer);
        assert.equal(new Set(g.current.options).size, 4);
        const wrong = g.current.options.find((n) => n !== answer);
        await event(`#ans2 [data-val="${wrong}"]`);
        assert.equal((await read()).locked[2], true);
        await event(`#ans1 [data-val="${answer}"]`);
        await wait(i < 3 ? 4000 : 1000);
      }
      assert.equal(await visible("#end"), true);
      await event("#againBtn");
      assert.equal((await read()).scores[1], 0);
    });
    await test("Memory: Fehlpaar wechselt Spieler, acht Paare, Neustart", async () => {
      await load("memory");
      const cards = await page
        .locator("#board .card .back-face")
        .allTextContents();
      let j = cards.findIndex((e) => e !== cards[0]);
      await page.locator("#board .card").nth(0).dispatchEvent("click");
      await page.locator("#board .card").nth(j).dispatchEvent("click");
      await wait(950);
      assert.match(await page.locator("#turn").textContent(), /Spieler 2/);
      for (const value of new Set(cards)) {
        const ix = cards
          .map((v, i) => (v === value ? i : -1))
          .filter((i) => i >= 0);
        for (const i of ix)
          await page.locator("#board .card").nth(i).dispatchEvent("click");
        await wait(500);
      }
      await wait(600);
      assert.equal(await visible("#overlay"), true);
      assert.equal(await page.locator("#s2").textContent(), "8");
      await event("#again");
      assert.equal(await page.locator("#board .matched").count(), 0);
    });
    await test("Quiz: zehn Antworten, Endstand und Neustart", async () => {
      await load("quiz-buzzer");
      const correct = [0, 1, 0, 1, 1, 1, 0, 0, 1, 1];
      for (const c of correct) {
        await event("#buz1");
        await page.locator("#answers .ans").nth(c).dispatchEvent("click");
        await wait(1800);
      }
      assert.equal(await visible("#end"), true);
      assert.equal(await page.locator("#pt1").textContent(), "10");
      await page.locator("#end button").dispatchEvent("click");
      assert.match(await page.locator("#qnum").textContent(), /Frage 1 von 10/);
    });
    await test("Reaktion: Frühstart bestraft, Best of 5 und Revanche", async () => {
      await load("reaktions-duell");
      await event("#startBtn");
      for (let i = 0; i < 3; i++) {
        await event("#p1", "mousedown");
        await wait(1600);
      }
      assert.equal(await visible("#endScreen"), true);
      assert.equal(await page.locator("#endScore").textContent(), "0 : 3");
      await event("#againBtn");
      assert.equal(await visible("#arena"), true);
    });
    await test("Maulwurf und Punkte Jagd: Treffer, Zeitende, Neustart", async () => {
      await load("maulwurf");
      await event("#startBtn");
      await wait(1600);
      assert.ok(await page.locator("#grid1 .up").count());
      await pointer("#grid1 .up >> nth=0");
      assert.equal(await page.locator("#s1").textContent(), "1");
      await wait(20000);
      assert.equal(await visible("#endScreen"), true);
      await event("#againBtn");
      assert.equal(await page.locator("#s1").textContent(), "0");
      await load("punkte-jagd");
      await event("#startBtn");
      await event("#fieldTop .star", "mousedown");
      assert.equal(await page.locator("#s1").textContent(), "1");
      await wait(30100);
      assert.equal(await visible("#endOv"), true);
      await event("#againBtn");
      assert.equal(await page.locator("#s1").textContent(), "0");
    });
    await test("Simon: Folge, Fehler, Spielerwechsel, Sieg und Neustart", async () => {
      await load("simon");
      await event("#startBtn");
      await wait(1200);
      let g = await read();
      assert.equal(g.accepting, true);
      await pointer(["#g", "#r", "#y", "#b"][(g.seq[0] + 1) % 4]);
      await wait(2500);
      g = await read();
      assert.equal(g.current, 1);
      assert.equal(g.accepting, true);
      await pointer(["#g", "#r", "#y", "#b"][g.seq[0]]);
      await wait(2600);
      g = await read();
      await pointer(["#g", "#r", "#y", "#b"][(g.seq[0] + 1) % 4]);
      await wait(1300);
      assert.equal(await visible("#over"), true);
      assert.match(await page.locator("#resTitle").textContent(), /Spieler 2/);
      await event("#againBtn");
      assert.deepEqual((await read()).best, [0, 0]);
    });
    await test("Auto Rennen und Tauziehen: Ziel, Matchende, Revanche", async () => {
      await load("auto-rennen");
      await event("#startBtn");
      await wait(3000);
      // Neue Regel: Gas halten, kein Klickzähler. Der eigene Mechaniktest prüft gutes Schalten.
      await page.keyboard.down("a");
      await wait(45000);
      await page.keyboard.up("a");
      assert.equal((await read()).winner, "red");
      await event("#startBtn");
      assert.equal((await read()).cars.red.p, 0);
      await load("tauziehen");
      await event("#startBtn");
      await wait(2800);
      // Halten zieht und erschöpft. Zwei echte zeitbegrenzte Runden ergeben das Match.
      for (let round = 0; round < 2; round++) {
        await page.keyboard.down("a");
        await wait(26000);
        await page.keyboard.up("a");
        await wait(4000);
      }
      assert.equal(await visible("#endO"), true);
      await event("#againBtn");
      assert.equal(await page.locator("#s1").textContent(), "0");
    });
    await test("Vier gewinnt: vertikaler Sieg und leere Revanche", async () => {
      await load("vier-gewinnt");
      const box = await page.locator("#board").boundingBox();
      for (const c of [0, 1, 0, 1, 0, 1, 0]) {
        await event("#board", "click", {
          clientX: box.x + ((c + 0.5) * box.width) / 7,
        });
        await wait(500);
      }
      await wait(600);
      assert.match(await page.locator("#endText").textContent(), /Rot gewinnt/);
      await page.locator("#overlay button").dispatchEvent("click");
      assert.equal(await visible("#overlay"), false);
      assert.match(await page.locator("#turnLabel").textContent(), /Rot/);
    });
    await test("Schlange: Körper und Äpfel eindeutig, Crash und Revanche", async () => {
      await load("schlange-duell");
      await event("#startBtn");
      const g = await read();
      for (const s of Object.values(g.snakes))
        assert.equal(new Set(s.body.map((p) => p.x + "," + p.y)).size, 3);
      await page.evaluate(() => {
        Math.random = () => 0;
        __miniQA.spawnApple();
        __miniQA.spawnApple();
      });
      const apples = (await read()).apples;
      assert.equal(
        new Set(apples.map((p) => p.x + "," + p.y)).size,
        apples.length,
      );
      await wait(2000);
      assert.equal(await visible("#endScreen"), true);
      await event("#againBtn");
      assert.equal(await visible("#endScreen"), false);
    });
    await context.close();
    // Gleiche reale Zeit bei verschiedenen RAF-Raten, ohne CSS-/CSP-Ausnahmen.
    const timing = await browser.newContext({
      viewport: { width: 390, height: 540 },
    });
    page = await timing.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      let id = 0;
      window.__frames = new Map();
      window.requestAnimationFrame = (f) => {
        __frames.set(++id, f);
        return id;
      };
      window.cancelAnimationFrame = (i) => __frames.delete(i);
      window.__advance = (t) => {
        const q = [...__frames.values()];
        __frames.clear();
        q.forEach((fn) => fn(t));
      };
    });
    await page.route("**/minispiele/pong.html", async (route) => {
      const response = await route.fetch();
      let body = await response.text();
      body = body.replace(
        /\}\)\(\);\s*<\/script>/,
        `window.__miniQA=${hooks.pong};})();\n</script>`,
      );
      await route.fulfill({ response, body });
    });
    await test("Pong: gleiche Aufschlagdauer bei 30/60/120 Hz", async () => {
      const times = [];
      for (const hz of [30, 60, 120]) {
        await load("pong");
        await page.evaluate(() => __miniQA.resetGame());
        const launched = await page.evaluate((hz) => {
          for (let i = 0; i <= hz * 2; i++) {
            __advance((i * 1000) / hz);
            if (__miniQA.read().state === "play") return (i * 1000) / hz;
          }
          return null;
        }, hz);
        assert.ok(launched !== null);
        times.push({ hz, ms: launched });
      }
      assert.ok(
        Math.max(...times.map((t) => t.ms)) -
          Math.min(...times.map((t) => t.ms)) <=
          1000 / 30 + 1,
      );
      results.push({ timing: times });
    });
    await timing.close();
  } catch (e) {
    failures++;
    results.push({ fatal: String(e) });
    console.error(e);
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync(
      OUT,
      JSON.stringify({ base: BASE, filter:process.env.MINI_QA_ONLY||null, failures, results }, null, 2),
    );
    console.log(
      `${results.filter((r) => r.ok).length} ok, ${failures} Fehler; ${OUT}`,
    );
    process.exitCode = failures ? 1 : 0;
  }
})();
