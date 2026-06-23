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

// ── Index der KI-Themen-Hubs (ki-*.html) für interne Verlinkung ("Verwandte Themen") ──
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function tokset(base) { return new Set(base.replace(/^ki-/, "").replace(/\.html$/i, "").split("-").filter((w) => w.length > 2)); }
let related = 0;
let healed = 0;
let kbhub = 0;
const hubs = [];
for (const f of files) {
  const base = f.split(sep).pop();
  if (!base.startsWith("ki-") || !base.endsWith(".html")) continue;
  let h; try { h = readFileSync(f, "utf8"); } catch { continue; }
  if (/<meta[^>]+name=["']robots["'][^>]*noindex/i.test(h)) continue;
  const name = cleanName(h);
  if (!name) continue;
  hubs.push({ base, url: pageUrl(f), name, tokens: tokset(base) });
}
function relatedFor(base) {
  const me = hubs.find((x) => x.base === base);
  if (!me) return [];
  const scored = hubs.filter((x) => x.base !== base).map((x) => {
    let s = 0; for (const t of x.tokens) if (me.tokens.has(t)) s++;
    return { x, s };
  }).sort((a, b) => b.s - a.s);
  const out = scored.filter((o) => o.s > 0).slice(0, 6).map((o) => o.x);
  for (const o of scored) { if (out.length >= 6) break; if (out.indexOf(o.x) < 0) out.push(o.x); }
  return out.slice(0, 6);
}
function relatedBlock(base) {
  const rel = relatedFor(base);
  if (rel.length < 3) return "";
  const items = rel.map((r) => `<li style="margin:0"><a href="${esc(r.url)}" style="display:inline-block;background:#fff;border:1px solid #e6e1d6;border-radius:18px;padding:6px 13px;font-size:.85rem;color:#374151;text-decoration:none;font-weight:600">${esc(r.name)}</a></li>`).join("");
  return `<nav aria-label="Verwandte KI-Themen" data-aban-related style="max-width:760px;margin:28px auto 8px;padding:0 16px"><h2 style="font-size:1.05rem;margin:0 0 10px">Verwandte KI-Themen</h2><ul style="list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:8px">${items}</ul></nav>`;
}

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
  // (3) SERP-Feinschliff: index,follow -> + große Bild-Vorschau & volle Snippets (nie bei noindex)
  if (!noindex) {
    const before = html;
    html = html.replace(/(<meta\s+name=["']robots["']\s+content=["'])index,\s*follow(["'])/i,
      "$1index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1$2");
    if (html !== before) changed = true;
  }
  // (4) Core Web Vitals: Lazy-Load für Bilder ab dem 2. Bild (erstes = mögliches LCP-Bild, nicht lazy)
  {
    let seen = 0;
    const next = html.replace(/<img\b([^>]*)>/gi, function (m, attrs) {
      seen++;
      if (seen === 1) return m;                                  // erstes Bild unverändert lassen
      if (/\bloading\s*=/.test(attrs)) return m;                 // schon gesetzt
      return "<img loading=\"lazy\" decoding=\"async\"" + attrs + ">";
    });
    if (next !== html) { html = next; changed = true; }
  }
  // (5) Standard-OG-Bild + Twitter-Card, wo keins gesetzt ist (bessere Social/Discover-CTR)
  {
    const pos = html.toLowerCase().lastIndexOf("</head>");
    if (pos >= 0 && !/property=["']og:image["']/i.test(html)) {
      let add = '<meta property="og:image" content="' + SITE + '/og-image.png">';
      if (!/name=["']twitter:card["']/i.test(html)) {
        add += '<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="' + SITE + '/og-image.png">';
      }
      html = html.slice(0, pos) + add + "\n" + html.slice(pos);
      changed = true;
    }
  }
  // (6) Interne Verlinkung: "Verwandte KI-Themen" in KI-Hubs (ki-*.html), idempotent
  {
    const base = f.split(sep).pop();
    if (!noindex && base.startsWith("ki-") && base.endsWith(".html") && html.indexOf("data-aban-related") < 0) {
      const block = relatedBlock(base);
      const bpos = block ? html.toLowerCase().lastIndexOf("</body>") : -1;
      if (bpos >= 0) { html = html.slice(0, bpos) + block + "\n" + html.slice(bpos); related++; changed = true; }
    }
  }
  // (6b) Backlink zum Kaufberater-Pillar-Hub (bi-direktionale Cluster-Verlinkung), idempotent
  {
    const base = f.split(sep).pop();
    if (!noindex && base.endsWith("-kaufen-schweiz.html") && html.indexOf("data-aban-kbhub") < 0) {
      const bpos = html.toLowerCase().lastIndexOf("</body>");
      if (bpos >= 0) {
        const block = '<nav data-aban-kbhub aria-label="Kaufberater-Übersicht" style="max-width:760px;margin:18px auto;padding:0 16px;font-size:.9rem"><a href="/kaufberater-schweiz.html" style="color:#b45309;font-weight:700">← Alle Kaufberater in der Schweiz im Überblick</a></nav>';
        html = html.slice(0, bpos) + block + "\n" + html.slice(bpos); kbhub++; changed = true;
      }
    }
  }
  // (7) Selbstheilung fehlender Meta-Tags (Social/Mobile), nur indexierbare Seiten
  if (!noindex) {
    const pos2 = html.toLowerCase().lastIndexOf("</head>");
    if (pos2 >= 0) {
      let add = "";
      const tm = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const titleTxt = tm ? tm[1].replace(/\s+/g, " ").trim().replace(/"/g, "&quot;") : "";
      const dm = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
      const descTxt = dm ? dm[1].trim().replace(/"/g, "&quot;") : "";
      if (titleTxt && !/property=["']og:title["']/i.test(html)) add += '<meta property="og:title" content="' + titleTxt + '">';
      if (descTxt && !/property=["']og:description["']/i.test(html)) add += '<meta property="og:description" content="' + descTxt + '">';
      if (!/name=["']theme-color["']/i.test(html)) add += '<meta name="theme-color" content="#d97706">';
      if (!/name=["']viewport["']/i.test(html)) add += '<meta name="viewport" content="width=device-width, initial-scale=1.0">';
      if (add) { html = html.slice(0, pos2) + add + "\n" + html.slice(pos2); healed++; changed = true; }
    }
  }
  if (changed) { try { writeFileSync(f, html); } catch { skipped++; } } else skipped++;
}
console.log("inject-engine: " + injected + " Engine + " + ld + " JSON-LD + " + related + " Related + " + kbhub + " Kaufberater-Backlinks + " + healed + " Meta-Heilungen injiziert, " + skipped + " übersprungen (von " + files.length + ").");
