/* Reale lokale WebRTC-Verbindung wie th-koop.mjs; keine Internet-Koop-Zusage.
 * Zwei kleine Seiten, GLBs abgewiesen und Rendern aus: prueft Lobby/Netzlogik.
 * Keine CSP-/TLS-Ausnahme. TH_SOURCE erlaubt Gegenprobe mit altem HTML.
 */
const fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require(
  process.env.TH_PLAYWRIGHT || process.env.PLAYWRIGHT_MODULE || "playwright",
);
const origin = process.env.TH_ORIGIN || "http://127.0.0.1:8112";
const label = process.env.TH_LABEL || "after";
let src = fs.readFileSync(
  process.env.TH_SOURCE || path.resolve(__dirname, "../../traumhaus.html"),
  "utf8",
);
src = src.replace(
  "window.__th={",
  "renderer.render=function(){};window.__th={",
);
src = src.replace(
  "  bahnProfil:function(typ){",
  `  auditNet:function(){return {status:MPs&&MPs.status,host:mpHost,lobby:this.lobby(),running:running};},
  auditClose:function(){if(MPs)MPs.close();},
  auditFloor:function(){doPlaceFloor(30,20,0);return floors['30,20'];},
  auditFloorRead:function(){return floors['30,20'];},
  bahnProfil:function(typ){`,
);
const report = {
  checks: [],
  errors: [],
  blocked: [],
  limits: [
    "Lokale Engine ?mp=local; keine Internetvermittlung getestet.",
    "GLBs abgewiesen, Rendern aus; kein visueller Koop- oder Bewegungstest.",
  ],
};
const check = (name, ok, detail) => {
  report.checks.push({ name, ok, detail });
  console.log(JSON.stringify(report.checks.at(-1)));
};
(async () => {
  const browser = await chromium.launch({
    args: [
      "--enable-unsafe-swiftshader",
      "--disable-features=WebRtcHideLocalIpsWithMdns",
    ],
  });
  try {
    const ctx = await browser.newContext({
      viewport: { width: 720, height: 405 },
      screen: { width: 1280, height: 900 },
    });
    await ctx.route("**/*.glb", (r) => r.abort());
    await ctx.route("**/traumhaus.html*", async (r) => {
      const response = await r.fetch();
      await r.fulfill({ response, body: src });
    });
    const pages = [];
    for (const role of ["Host", "Gast"]) {
      const p = await ctx.newPage();
      pages.push(p);
      p.on("pageerror", (e) => report.errors.push(role + ": " + e.message));
      p.on("console", (m) => {
        if (/Content Security Policy|violates.*directive/i.test(m.text()))
          report.blocked.push(m.text());
      });
      await p.goto(origin + "/traumhaus.html?mp=local", {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
      await p.waitForFunction(() => !!window.__th, null, { timeout: 120000 });
      await p.locator("#mpName").fill(role);
    }
    const [host, guest] = pages;
    await host.locator("#hostBtn").click();
    const code = await host.locator("#mpCodeShow").textContent();
    await guest.locator("#mpCode").fill(code);
    await guest.locator("#joinBtn").click();
    await host.waitForFunction(
      () => window.__th.lobby().spieler.length === 2,
      null,
      { timeout: 45000 },
    );
    await guest.waitForFunction(
      () => window.__th.lobby().spieler.length === 2,
      null,
      { timeout: 45000 },
    );
    let h = await host.evaluate(() => window.__th.auditNet()),
      g = await guest.evaluate(() => window.__th.auditNet());
    check(
      "Beide echten Peers verbunden",
      h.status === "connected" && g.status === "connected",
      { h, g },
    );
    check(
      "Lobby zeigt beide Namen vor Spielstart",
      h.lobby.spieler.join(",") === "Host,Gast" &&
        g.lobby.spieler.join(",") === "Host,Gast" &&
        !h.running &&
        !g.running,
      { h, g },
    );
    check(
      "Startknopf nur beim Host",
      h.lobby.start !== "none" && g.lobby.start === "none",
      { host: h.lobby.start, guest: g.lobby.start },
    );
    await host.locator("#mpStartBtn").click();
    await guest.waitForFunction(() => window.__th.laeuft(), null, {
      timeout: 45000,
    });
    check(
      "Host startet beide Seiten",
      (await host.evaluate(() => window.__th.laeuft())) &&
        (await guest.evaluate(() => window.__th.laeuft())),
    );
    await host.evaluate(() => window.__th.auditFloor());
    await guest.waitForFunction(
      () => window.__th.auditFloorRead() === 0,
      null,
      { timeout: 15000 },
    );
    check(
      "Bauzustand kommt ueber DataChannel an",
      (await guest.evaluate(() => window.__th.auditFloorRead())) === 0,
    );
    check("Keine CSP-Blockaden", report.blocked.length === 0, {
      count: report.blocked.length,
      examples: report.blocked.slice(0, 2),
    });
    check("Keine JavaScript-Fehler", report.errors.length === 0, report.errors);
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(__dirname, `traumhaus-lobby-${label}.json`),
      JSON.stringify(report, null, 2) + "\n",
    );
  }
  if (report.checks.some((x) => !x.ok)) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 2;
});
