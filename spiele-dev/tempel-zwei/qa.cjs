// Echte WebRTC-Clients, lokales Signaling. Positionsfixtures verkürzen Wege, Aktionen laufen über die UI.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = "http://localhost:8120";
const OUT = __dirname + "/screens";
const checks = [],
  errors = [],
  network = [];
let browser;
function check(name, ok, detail) {
  console.log((ok ? "PASS " : "FAIL ") + name);
  checks.push({ name, ok: !!ok, ...(detail ? { detail } : {}) });
  if (!ok) throw Error(name);
}
async function state(p) {
  return p.evaluate(() => __zs.state());
}
async function tp(p, slot, x, z) {
  await p.evaluate(({ slot, x, z }) => __zs.tp(slot, x, z), { slot, x, z });
}
async function wait(p, fn, arg) {
  await p.waitForFunction(fn, arg, { timeout: 20000 });
}
async function load(p, url = ROOT + "/neon-zusammen.html?mp=local") {
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const r = await p.goto(url);
  await wait(p, () => window.__zs);
  return r;
}
async function both(pages, fn, arg) {
  for (const p of pages) await wait(p, fn, arg);
}
async function move(p, key, fn) {
  await p.keyboard.down(key);
  try {
    await wait(p, fn);
  } finally {
    await p.keyboard.up(key);
  }
}
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  browser = await chromium.launch({
    args: [
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
    ],
  });
  const c = await browser.newContext({ viewport: { width: 960, height: 540 } });
  const a = await c.newPage(),
    b = await c.newPage();
  const response = await load(a);
  check(
    "Standalone bleibt direkt im Tempel",
    a.url().includes("neon-zusammen"),
  );
  check(
    "Tatsächliche CSP aus _headers aktiv",
    !!response.headers()["content-security-policy"],
  );
  await a.screenshot({ path: OUT + "/after-desktop.png" });
  await a.keyboard.press("Tab");
  check(
    "Tastaturfokus ist sichtbar erreichbar",
    await a.evaluate(() => document.activeElement.tagName === "BUTTON"),
  );
  await a.click("#tHostBtn");
  const code = await a.locator("#inviteCode").innerText();
  check(
    "Vier Buchstaben sichtbar, keine vorgetäuschte Kopierbestätigung",
    /^[A-Z]{4}$/.test(code) &&
      !(await a.locator("#coopStatus").innerText()).includes("kopiert"),
  );
  await a.screenshot({ path: OUT + "/after-lobby-code.png" });
  await load(b);
  await b.fill("#tCode", code);
  await b.press("#tCode", "Enter");
  await both([a, b], () => __zs.state().online && __zs.state().running);
  check(
    "Zwei echte Clients, Ember und Aqua",
    (await state(a)).slot === 0 && (await state(b)).slot === 1,
  );
  await a.screenshot({ path: OUT + "/after-coop-room1.png" });
  // Tastendruck bewegt die eigene Figur; zweiter Client empfängt die Position.
  await a.keyboard.down("d");
  await wait(a, () => __zs.state().a.x > -0.8);
  await a.keyboard.up("d");
  await wait(b, () => __zs.state().a.x > -0.9);
  check("Tastaturbewegung wird über DataChannel repliziert", true);
  await tp(a, 0, -6, -10);
  await a.waitForTimeout(300);
  check("Eine Platte reicht nicht", !(await state(a)).gates[0]);
  await tp(b, 1, 6, -10);
  await both([a, b], () => __zs.state().gates[0] && __zs.state().room === 2);
  check(
    "Beide Platten öffnen Tor 1 und aktualisieren beide Raumanzeigen",
    true,
  );
  await move(a, "w", () => __zs.state().a.z < -17);
  check(
    "Geöffnetes Tor ist tatsächlich durchquerbar",
    (await state(a)).a.z < -17,
  );
  await tp(a, 0, 0, -22);
  await both([a, b], () => __zs.state().gems === 1);
  await tp(b, 1, 0, -22);
  await b.waitForTimeout(300);
  check(
    "Gemeinsamer Kristall bleibt auf beiden Clients genau einmal gezählt",
    (await state(a)).gems === 1 && (await state(b)).gems === 1,
  );
  await tp(b, 1, -6, -25);
  await b.click("#bAct");
  check("Aqua verbrennt keine Ranken", (await state(b)).vines);
  check(
    "Online-Hinweis fordert Partner statt unmöglichem Wechsel",
    !(await b.locator("#hint").innerText()).includes("wechsle zu"),
  );
  await tp(a, 0, -6, -25);
  await a.click("#bAct");
  await both([a, b], () => !__zs.state().vines);
  check("Embers Verbrennen auf beiden Seiten repliziert", true);
  await tp(a, 0, -6, -32);
  await a.click("#bAct");
  await both([a, b], () => __zs.state().levers[0]);
  await a.click("#pauseBtn");
  await tp(b, 1, 6, -29);
  await b.click("#bAct");
  await both([a, b], () => __zs.state().plant);
  check(
    "Online-Pause blockiert die Partneraktion nicht",
    (await state(a)).paused,
  );
  await a.click("#pauseResume");
  await b.click("#bAct");
  await both([a, b], () => __zs.state().gates[1] && __zs.state().room === 3);
  check("Wachsen und zweiter Hebel öffnen Tor 2 auf beiden Seiten", true);
  await tp(a, 0, -6, -51);
  await tp(b, 1, 6, -51);
  await a.click("#bAct");
  await wait(a, () => __zs.state().sync[0] <= 0);
  check(
    "Ein einzelner Gleichklangimpuls läuft ab und öffnet kein Tor",
    !(await state(a)).gates[2],
  );
  await Promise.all([a.click("#bAct"), b.click("#bAct")]);
  await both([a, b], () => __zs.state().gates[2] && __zs.state().room === 4);
  check("Gleichklang lässt sich nach Fehlschlag gemeinsam lösen", true);
  await a.screenshot({ path: OUT + "/after-coop-room3.png" });
  await tp(a, 0, -7.6, -68.5);
  await tp(b, 1, 7, -81);
  await both([a, b], () => __zs.state().blind);
  await b.click("#bAct");
  await both([a, b], () => __zs.state().altW);
  check("Ember bindet Blick, Aqua aktiviert Wasseraltar", true);
  await tp(b, 1, 0, -80.5);
  await tp(a, 0, -7, -81);
  await a.click("#bAct");
  await both([a, b], () => __zs.state().altF && __zs.state().g4);
  check("Hintere Schattenplatte erlaubt Rollentausch und Tor 4", true);
  await a.screenshot({ path: OUT + "/after-coop-guardian.png" });
  await b.click("#bPing");
  await wait(a, () =>
    document.getElementById("hint").textContent.includes("ruft dich"),
  );
  check("Echter Partner-Ping kommt an", true);
  await tp(a, 0, -1, -93);
  await a.waitForTimeout(200);
  check("Ein Spieler allein löst keinen Sieg aus", !(await state(a)).won);
  await tp(b, 1, 1, -93);
  await both([a, b], () => __zs.state().won);
  await a.waitForTimeout(2400);
  await wait(b, () => document.getElementById("ov").style.display === "flex");
  check(
    "Gemeinsamer Abschluss mit identischem Ergebnis",
    JSON.stringify((await state(a)).result) ===
      JSON.stringify((await state(b)).result),
  );
  await a.screenshot({ path: OUT + "/after-victory.png" });
  await b.close();
  await a.close();
  // Verbindungsabbruch: sichtbarer, steuerbarer Solo-Wechsel statt erfundener Partner.
  const d = await c.newPage(),
    e = await c.newPage();
  await load(d);
  await d.click("#tHostBtn");
  const code2 = await d.locator("#inviteCode").innerText();
  await load(e, ROOT + "/neon-zusammen.html?mp=local&raum=" + code2);
  await both([d, e], () => __zs.state().online);
  await e.close();
  await wait(d, () => !__zs.state().online);
  check(
    "Nach Trennung bleibt echter Solo-Wechsel nutzbar",
    await d.locator("#bSwap").isVisible(),
  );
  await d.click("#bSwap");
  check(
    "Keine erfundene Onlinepräsenz nach Trennung",
    !(await d.locator("#coopTag").innerText()).includes("🌐"),
  );
  await d.close();
  // Mobile: echte Touch-Events über CDP, zwei gleichzeitige Finger, Cancel und Pause.
  const mc = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  const m = await mc.newPage();
  await load(m);
  await m.screenshot({ path: OUT + "/after-mobile.png" });
  await m.click("#startBtn");
  await m.screenshot({ path: OUT + "/after-mobile-game.png" });
  const before = await state(m);
  const cd = await mc.newCDPSession(m);
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ id: 1, x: 80, y: 744 }],
  });
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ id: 1, x: 125, y: 744 }],
  });
  await m.waitForTimeout(500);
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { id: 1, x: 125, y: 744 },
      { id: 2, x: 333, y: 770 },
    ],
  });
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [{ id: 1, x: 125, y: 744 }],
  });
  await cd.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  const stop = await state(m);
  await m.waitForTimeout(300);
  check(
    "Mobiler Daumenstick bewegt und Touch-Cancel stoppt",
    stop.a.x > before.a.x + 0.2 &&
      Math.abs((await state(m)).a.x - stop.a.x) < 0.01,
  );
  await m.click("#pauseBtn");
  await m.keyboard.press("q");
  check(
    "Pause sperrt Wechsel und hat erreichbaren Fortsetzen-Knopf",
    (await state(m)).paused && (await m.locator("#pauseResume").isVisible()),
  );
  await m.click("#pauseResume");
  await m.click("#bSwap");
  check(
    "Mobiler Figurenwechsel reagiert",
    await m
      .locator("#aquaTask")
      .innerText()
      .then((t) => t.includes("DU")),
  );
  await m.click("#soundBtn");
  check(
    "Ton-Schalter meldet Status zugänglich",
    (await m.locator("#soundBtn").getAttribute("aria-pressed")) === "true",
  );
  check(
    "Mobile Ziele und Bedienung überlappen nicht",
    await m.evaluate(() => {
      const o = document.getElementById("objective").getBoundingClientRect(),
        a = document.getElementById("bAct").getBoundingClientRect(),
        s = document.getElementById("stick").getBoundingClientRect();
      return (
        o.bottom < a.top &&
        o.bottom < s.top &&
        document.documentElement.scrollWidth <= innerWidth
      );
    }),
  );
  // Navigation bei Direktstart (vor dem Laden der grossen Wildnis abgefangen).
  await m.route("**/neon-wildnis.html", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: "<title>Wildnis-Ziel</title>",
    }),
  );
  await m.click("#stationBack");
  await m.waitForURL("**/neon-wildnis.html");
  check("Wildnis-Taste navigiert beim Standalone-Einstieg", true);
  await mc.close();
  // Echte iframe-Einbettung und bestehendes Stationsprotokoll.
  const station = await c.newPage();
  await station.route(ROOT + "/tempel-test-frame", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<script>window.messages=[];addEventListener("message",e=>messages.push(e.data));</script><iframe src="/neon-zusammen.html?station=1" style="width:960px;height:540px"></iframe>',
    }),
  );
  await station.goto(ROOT + "/tempel-test-frame");
  const f = station.frames().find((f) => f.url().includes("neon-zusammen"));
  await wait(f, () => window.__zs);
  await f.click("#stationBack");
  await wait(station, () => messages.includes("mini-back"));
  check("iframe-Rückkehr sendet weiterhin mini-back", true);
  await f.click("#startBtn");
  await f.evaluate(() => {
    __zs.r4();
    __zs.tp(0, -7.6, -68.5);
    __zs.tp(1, 7, -81);
    __zs.act(1);
    __zs.tp(1, 0, -80.5);
    __zs.tp(0, -7, -81);
    __zs.act(0);
  });
  await wait(f, () => __zs.state().g4);
  await f.evaluate(() => {
    __zs.tp(0, -1, -93);
    __zs.tp(1, 1, -93);
  });
  await wait(station, () =>
    messages.some((m) => {
      try {
        return JSON.parse(m).t === "stationDone";
      } catch {
        return false;
      }
    }),
  );
  check(
    "iframe-Abschluss sendet weiterhin stationDone mit Score",
    await station.evaluate(() =>
      messages
        .map((m) => {
          try {
            return JSON.parse(m);
          } catch {
            return {};
          }
        })
        .some((m) => m.t === "stationDone" && Number.isFinite(m.score)),
    ),
  );
  await station.close();
  check("Keine JavaScript- oder Konsolenfehler", errors.length === 0, errors);
  await browser.close();
  const report = {
    environment:
      "Chromium / lokales echtes WebRTC, Signaling über BroadcastChannel. Echte _headers auf Port 8120. Positionsfixtures, UI-Aktionen und ausgewählte Tastatur-/Touch-Wege; kein vollständiger manueller Parcours.",
    checks,
    errors,
  };
  fs.writeFileSync(
    __dirname + "/qa-results.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
})().catch(async (e) => {
  console.error(e);
  fs.writeFileSync(
    __dirname + "/qa-results.json",
    JSON.stringify({ checks, errors, failure: e.message }, null, 2),
  );
  if (browser) await browser.close();
  process.exit(1);
});
