#!/usr/bin/env node
// tools/itch_build.cjs — verpackt ein Web-Spiel als eigenständigen itch.io-HTML5-Build.
// ----------------------------------------------------------------------------
// Macht aus z.B. neon-flug.html ein dist/<name>/index.html, das ohne den
// abannews-Server läuft: three.js wird inline eingebettet, interne Links
// (/online-tools.html …) werden auf absolute abannews.com-URLs umgeschrieben.
// Erzeugt zusätzlich dist/<name>-itch.zip — fertig zum Hochladen auf itch.io
// (Kind of project: HTML, "This file will be played in the browser").
//
//   node tools/itch_build.cjs            # Default: neon-flug.html
//   node tools/itch_build.cjs neon-survivor.html
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = process.cwd();
const game = process.argv[2] || "neon-flug.html";
const name = game.replace(/\.html$/, "");
const outDir = path.join(ROOT, "dist", name);

let html = fs.readFileSync(path.join(ROOT, game), "utf8");

// 1) three.js inline einbetten (ersetzt den externen <script src>)
const threePath = path.join(ROOT, "js", "vendor", "three.min.js");
if (fs.existsSync(threePath) && /src="\/js\/vendor\/three\.min\.js"/.test(html)) {
  const three = fs.readFileSync(threePath, "utf8");
  html = html.replace(
    /<script src="\/js\/vendor\/three\.min\.js"><\/script>/,
    "<script>\n" + three + "\n</script>"
  );
}

// 2) Interne absolute Links/Assets → abannews.com (damit sie off-site funktionieren)
html = html.replace(/(href|src)="\/(?!\/)([^"]*)"/g, '$1="https://abannews.com/$2"');

// 3) Schreiben
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "index.html"), html);

// 4) Zippen (Inhalt der index.html im Wurzelverzeichnis des Zips — itch-Anforderung)
const zipPath = path.join(ROOT, "dist", name + "-itch.zip");
fs.rmSync(zipPath, { force: true });
execSync(`cd "${outDir}" && zip -q -r "${zipPath}" .`);

const kb = (fs.statSync(zipPath).size / 1024).toFixed(0);
console.log(`✅ itch-Build: dist/${name}/index.html`);
console.log(`📦 ZIP: ${zipPath} (${kb} KB) — auf itch.io als HTML-Projekt hochladen`);
