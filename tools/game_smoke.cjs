#!/usr/bin/env node
// tools/game_smoke.cjs — Autonome QA für die Web-Spiele (headless Chromium).
// ----------------------------------------------------------------------------
// Startet einen Mini-Static-Server, lädt jedes Spiel im echten Browser, prüft
// auf JS-Laufzeitfehler und macht Screenshots (Menü + Live-Frame nach Start).
// Exit-Code 1, wenn irgendein Spiel einen Seitenfehler wirft.
//
// So verifiziert die Cloud-Session Spiel-Änderungen SELBST — ohne GPU/Desktop/User:
//   node tools/game_smoke.cjs                  # alle Standard-Spiele
//   node tools/game_smoke.cjs neon-flug.html   # gezielt
// Screenshots landen in $SMOKE_OUT (Default: <os tmp>/aban-smoke).
//
// Umgebung: Playwright kommt aus dem Repo-node_modules; Chromium-Binary via
// PW_CHROME (Default: vorinstalliertes /opt/pw-browsers chromium-1194). Passt
// den Pfad automatisch an, falls eine andere Build-Nummer vorliegt.
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { chromium } = require("playwright");

const ROOT = process.cwd();
const PORT = 8099;
const OUT = process.env.SMOKE_OUT || path.join(os.tmpdir(), "aban-smoke");
const GAMES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["traumhaus.html", "lebenspfad.html", "neon-wildnis.html", "neon-survivor.html",
     "neon-realm.html", "neon-flug.html", "wort-des-tages.html", "wortbruecke.html", "spiele.html"];

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".wav": "audio/wav", ".mp3": "audio/mpeg",
  ".glb": "model/gltf-binary", ".svg": "image/svg+xml", ".png": "image/png",
};

function findChrome() {
  if (process.env.PW_CHROME && fs.existsSync(process.env.PW_CHROME)) return process.env.PW_CHROME;
  const base = "/opt/pw-browsers";
  if (fs.existsSync(base)) {
    for (const d of fs.readdirSync(base)) {
      const p = path.join(base, d, "chrome-linux", "chrome");
      if (d.startsWith("chromium-") && fs.existsSync(p)) return p;
    }
  }
  return undefined; // Playwright-Default versuchen
}

function serve() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const fp = path.join(ROOT, p);
    if (!fp.startsWith(ROOT) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
      res.writeHead(404); res.end("404"); return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(fp)] || "application/octet-stream" });
    fs.createReadStream(fp).pipe(res);
  });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const server = serve();
  await new Promise((r) => server.listen(PORT, r));
  const exe = findChrome();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  let failed = 0;

  for (const game of GAMES) {
    const errors = [];
    const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
    page.on("pageerror", (e) => errors.push(String(e.message)));
    const tag = game.replace(/\.html$/, "");
    try {
      /* traumhaus laedt ~640 GLB-Modelle (~55 s) — "networkidle" in 15 s ist dort
         unerreichbar und liess den Smoke als Harness-Fehler durchfallen, obwohl das
         Spiel fehlerfrei lief. Schwere Seiten: nur "load" abwarten, dann Puffer. */
      const schwer = /traumhaus/.test(game);
      await page.goto(`http://localhost:${PORT}/${game}`,
        schwer ? { waitUntil: "load", timeout: 60000 } : { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(schwer ? 8000 : 700);
      await page.screenshot({ path: path.join(OUT, `${tag}_menu.png`), timeout: schwer ? 90000 : 30000 });
      await page.keyboard.press("Space"); // Start (bei den meisten Spielen)
      // Spiele mit explizitem Start-Knopf (z. B. neon-realm #startBtn): zusätzlich klicken
      try { const sb = await page.$("#startBtn"); if (sb && await sb.isVisible()) await sb.click(); } catch {}
      await page.waitForTimeout(1400);
      await page.screenshot({ path: path.join(OUT, `${tag}_live.png`), timeout: schwer ? 90000 : 30000 });
    } catch (e) {
      errors.push("HARNESS: " + e.message);
    }
    const ok = errors.length === 0;
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${game}${ok ? "" : "\n   " + errors.join("\n   ")}`);
    await page.close();
  }

  await browser.close();
  server.close();
  console.log(`\nScreenshots: ${OUT}`);
  console.log(failed ? `❌ ${failed}/${GAMES.length} mit Fehlern` : `✅ alle ${GAMES.length} ohne JS-Fehler`);
  process.exit(failed ? 1 : 0);
})();
