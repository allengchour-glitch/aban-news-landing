#!/usr/bin/env node
// AEO-Prospect-Scanner — findet Verkaufs-Leads für den AI-Sichtbarkeit-Service.
//
// Nimmt echte Firmen-Websites, lässt die fertige AEO-Engine (functions/_aeo-engine.mjs)
// drüberlaufen und gibt sie SORTIERT aus: schlechtester Score zuerst = heißester Lead
// (die Firma ist für KI/Suche am schlechtesten aufgestellt → größter Bedarf, dein bester
// Gesprächsaufhänger). Pro Firma steht die größte Lücke direkt dabei.
//
// Quelle der URLs:
//   - ohne Argument: handwerk-radar/data/anbieter.json (55 echte DACH-Betriebe)
//   - --file pfad.txt : eine URL pro Zeile (deine eigene Ziel-Liste)
//   - --limit N       : nur die ersten N prüfen (Default 12; 0 = alle)
//
// Aufruf:  node tools/aeo-prospect-scan.mjs --limit 12
//
// Hinweis: Der Scanner liest nur öffentliche Seiten (unbedenklich). Für die
// Ansprache gilt UWG — bevorzugt WARME Kontakte, keine Massen-Kaltmails.

import { analyze } from "../functions/_aeo-engine.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const UA = "aban-aeo-scan/1.0 (+https://abannews.com/ai-sichtbarkeit.html)";

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function loadTargets() {
  const file = arg("--file", null);
  if (file) {
    return readFileSync(file, "utf8").split("\n").map(s => s.trim())
      .filter(Boolean).map(url => ({ name: url, url }));
  }
  // Default: echte Betriebe aus dem handwerk-radar
  const data = JSON.parse(readFileSync(join(ROOT, "handwerk-radar/data/anbieter.json"), "utf8"));
  return data.anbieter.filter(a => a.website)
    .map(a => ({ name: a.name, url: a.website, stadt: a.stadt, land: a.land }));
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal, redirect: "follow" });
    if (!res.ok) return { error: "HTTP " + res.status };
    const html = await res.text();
    return { html: html.slice(0, 120000) };
  } catch (e) {
    return { error: String(e.message || e).slice(0, 60) };
  } finally {
    clearTimeout(t);
  }
}

const targets = loadTargets();
const limit = parseInt(arg("--limit", "12"), 10);
const list = limit > 0 ? targets.slice(0, limit) : targets;

console.log(`\nAEO-Prospect-Scan — ${list.length} Firmen (von ${targets.length})\n`);

const rows = [];
for (const t of list) {
  const r = await fetchHtml(t.url);
  if (r.error) {
    console.log(`  · ${t.name}  — übersprungen (${r.error})`);
    continue;
  }
  const a = analyze(r.html);
  const topRec = (a.recommendations && a.recommendations[0]) ? a.recommendations[0].text : "—";
  rows.push({ ...t, score: a.score, grade: a.grade, hook: topRec });
  console.log(`  ✓ ${t.name}  → ${a.score}/100 (${a.grade})`);
}

rows.sort((x, y) => x.score - y.score); // schlechtester zuerst = heißester Lead

console.log("\n\n=== DEINE LEAD-LISTE (schlechtester Score zuerst = größter Bedarf) ===\n");
console.log("| # | Score | Note | Firma | Website | Größte Lücke (dein Aufhänger) |");
console.log("|---|------:|------|-------|---------|-------------------------------|");
rows.forEach((r, i) => {
  console.log(`| ${i + 1} | ${r.score} | ${r.grade} | ${r.name} | ${r.url} | ${r.hook} |`);
});
console.log(`\n${rows.length} bewertet. Tipp: die obersten 3–5 sind deine besten Erstkontakte.`);
console.log("Ansprache bevorzugt WARM (Firmen, die du kennst) — UWG beachten.\n");

// --- Sende-fertige Mails pro Lead (Top-N, Default 5; --emails N) -----------
function buildEmail(r) {
  const subj = `${r.name}: in der KI-Suche kaum auffindbar (Score ${r.score}/100)`;
  const body =
`Guten Tag,

ich habe die Website von ${r.name} kurz darauf geprüft, wie gut sie von
KI-Antwortmaschinen (ChatGPT, Perplexity, Google AI) gefunden und zitiert wird.
Ergebnis: ${r.score}/100 — Note „${r.grade}".

Die größte Stellschraube bei euch: ${r.hook}

Immer mehr Kunden recherchieren so. Wer dort schlecht abschneidet, wird seltener
gefunden. Das lässt sich beheben — meist mit wenigen gezielten Änderungen.

Wenn es euch interessiert, schicke ich kostenlos die 3 größten Lücken als kurze
Übersicht — ohne Verkaufsgespräch. Ein kurzes „ja" genügt.

Freundliche Grüsse
Allen Chour — abannews.com`;
  return { subj, body };
}

const nEmails = parseInt(arg("--emails", "5"), 10);
if (nEmails > 0 && rows.length) {
  console.log("\n=== SENDE-FERTIGE MAILS (oberste Leads) — kopieren, prüfen, abschicken ===");
  console.log("(Nur an Kontakte mit Bezug schicken — UWG. Score/Lücke sind echt aus dem Check.)\n");
  rows.slice(0, nEmails).forEach((r, i) => {
    const m = buildEmail(r);
    console.log(`\n──────── Mail ${i + 1}: ${r.name}  (${r.url}) ────────`);
    console.log(`Betreff: ${m.subj}\n`);
    console.log(m.body);
  });
  console.log("\n");
}
