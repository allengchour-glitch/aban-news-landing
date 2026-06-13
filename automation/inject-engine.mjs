/* inject-engine.mjs — fügt die aban-Engine (js/site-nav.js) in jede HTML-Seite des
   Deploy-Verzeichnisses ein. Non-destruktiv: nur EINE Zeile vor </head>, idempotent,
   überspringt Seiten mit Opt-out. Quelle bleibt unberührt; läuft im Build über _site/.
   Aufruf: node automation/inject-engine.mjs _site */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

const root = process.argv[2] || "_site";
const TAG = '<script defer src="/js/site-nav.js"></script>';

function walk(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

let injected = 0, skipped = 0;
let files = [];
try { files = walk(root, []); } catch (e) { console.error("inject-engine: kein", root); process.exit(0); }

for (const f of files) {
  let html;
  try { html = readFileSync(f, "utf8"); } catch { continue; }
  if (html.indexOf("/js/site-nav.js") >= 0) { skipped++; continue; }            // schon drin
  if (html.indexOf("no-aban-nav") >= 0) { skipped++; continue; }                 // Opt-out
  if (/<meta\s+name=["']aban-nav["']\s+content=["']off["']/i.test(html)) { skipped++; continue; }
  const i = html.toLowerCase().lastIndexOf("</head>");
  if (i < 0) { skipped++; continue; }                                            // kein vollständiges <head>
  const out = html.slice(0, i) + TAG + "\n" + html.slice(i);
  try { writeFileSync(f, out); injected++; } catch { skipped++; }
}
console.log("inject-engine: " + injected + " Seiten verbunden, " + skipped + " übersprungen (von " + files.length + ").");
