/* inject-engine.mjs — fügt beim Build in jede HTML-Seite des Deploy-Verzeichnisses ein:
   (1) die aban-Engine (js/site-nav.js) und
   (2) sitewide JSON-LD (Organization + BreadcrumbList) für besseres Google-Ranking
       (Breadcrumbs in den Suchergebnissen + Marken-Entität).
   Non-destruktiv, idempotent, server-gerendert (Google sieht es ohne JS). Quelle bleibt
   unberührt; läuft im Build über _site/. Aufruf: node automation/inject-engine.mjs _site */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, sep } from "path";

const root = process.argv[2] || "_site";
const SITE = "https://abannews.com";
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

function pageUrl(file) {
  let rel = file.slice(root.length).split(sep).join("/");
  if (!rel.startsWith("/")) rel = "/" + rel;
  rel = rel.replace(/\/index\.html$/i, "/");
  return SITE + rel;
}

function cleanName(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return null;
  let t = m[1].replace(/&amp;/g, "&").replace(/&#160;|&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  // Nur den Themen-Teil vor dem ersten Trenner nehmen (z. B. "… — …", "… | aban").
  t = t.split(/\s[—–|·]\s/)[0].trim();
  return t.slice(0, 110) || null;
}

function canonicalOf(html, fallback) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  if (m) { const h = m[0].match(/href=["']([^"']+)["']/i); if (h) return h[1]; }
  return fallback;
}

function ldFor(html, file) {
  const url = pageUrl(file);
  if (url === SITE + "/") return null;                       // Homepage hat eigenes Schema
  const name = cleanName(html);
  if (!name) return null;
  const item = canonicalOf(html, url);
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": SITE + "/#org", name: "aban news", url: SITE + "/", logo: SITE + "/android-chrome-512x512.png" },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Start", item: SITE + "/" },
        { "@type": "ListItem", position: 2, name, item }
      ] }
    ]
  };
  return '<script type="application/ld+json" data-aban-ld>' + JSON.stringify(ld) + "</script>";
}

let injected = 0, ld = 0, skipped = 0;
let files = [];
try { files = walk(root, []); } catch (e) { console.error("inject-engine: kein", root); process.exit(0); }

for (const f of files) {
  let html;
  try { html = readFileSync(f, "utf8"); } catch { continue; }
  const optout = html.indexOf("no-aban-nav") >= 0 || /<meta\s+name=["']aban-nav["']\s+content=["']off["']/i.test(html);
  const noindex = /<meta[^>]+name=["']robots["'][^>]*noindex/i.test(html);
  const headPos = html.toLowerCase().lastIndexOf("</head>");

  let changed = false;
  // (1) Engine-Script
  if (!optout && headPos >= 0 && html.indexOf("/js/site-nav.js") < 0) {
    const i = html.toLowerCase().lastIndexOf("</head>");
    html = html.slice(0, i) + TAG + "\n" + html.slice(i);
    injected++; changed = true;
  }
  // (2) JSON-LD (Organization + Breadcrumb) — nur indexierbare Inhaltsseiten
  if (!noindex && html.indexOf("data-aban-ld") < 0) {
    const pos = html.toLowerCase().lastIndexOf("</head>");
    if (pos >= 0) {
      const block = ldFor(html, f);
      if (block) { html = html.slice(0, pos) + block + "\n" + html.slice(pos); ld++; changed = true; }
    }
  }
  if (changed) { try { writeFileSync(f, html); } catch { skipped++; } } else skipped++;
}
console.log("inject-engine: " + injected + " Engine + " + ld + " JSON-LD injiziert, " + skipped + " übersprungen (von " + files.length + ").");
