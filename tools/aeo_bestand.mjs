#!/usr/bin/env node
/* aeo_bestand.mjs — misst die EIGENEN Seiten mit der eigenen AEO-Engine.
 *
 * ⚠️ WOZU. abannews verkauft KI-Sichtbarkeit (Audit, Monitor, Beratung) — geprüft hatte
 * die Engine bis 2026-09-03 aber nur fremde Seiten. Der erste Lauf über den eigenen
 * Bestand deckte einen Fehler in der verkauften Engine auf: gemessen wurde der
 * Seitenrahmen (Titel + Menü + Brotkrume) statt des Inhalts, weshalb 234 von 270
 * Kaufberatern zu Unrecht „Erster Satz ist sehr lang" bekamen — derselbe falsche Rat
 * ging in jeden bezahlten Kunden-Report. Siehe `functions/_aeo-engine.mjs`.
 *
 * Dieses Werkzeug hält den Bestand messbar: Ø-Score je Seitengruppe, die schwächsten
 * Seiten, und welche Kategorie systematisch fehlt (= wo Arbeit am meisten bringt).
 *
 * Aufruf:
 *   node tools/aeo_bestand.mjs                 # Bericht auf der Konsole
 *   node tools/aeo_bestand.mjs --json          # Maschinenlesbar
 *   node tools/aeo_bestand.mjs --gruppe tools  # nur eine Gruppe
 *   node tools/aeo_bestand.mjs --schwelle 60   # Exit 1, wenn eine Gruppe darunter liegt
 */
import { analyze } from "../functions/_aeo-engine.mjs";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const hat = (n) => process.argv.includes(n);

/* Gruppen nach GELDNÄHE sortiert: was Umsatz bringt, steht oben. */
const GRUPPEN = {
  geld:     { titel: "Geld- & Service-Seiten", test: (f) => ["angebote.html", "beratung.html", "ai-sichtbarkeit.html", "produkte.html", "kurs.html", "ki-schnellstart.html", "vorlagen-set.html", "founding.html", "ki-audit.html", "shop.html"].includes(f) },
  kauf:     { titel: "Kaufberater (Affiliate)", test: (f) => /kaufen-schweiz\.html$/.test(f) },
  vergleich:{ titel: "Vergleiche & Entscheidungshilfen", test: (f) => /^(?:vergleich|.*-vs-).*\.html$/.test(f) },
  tools:    { titel: "Rechner & Werkzeuge", test: (f) => /(?:rechner|generator|-check)\.html$/.test(f) },
};

const alle = readdirSync(ROOT).filter((f) => f.endsWith(".html"));
const nur = arg("--gruppe", null);
const schwelle = Number(arg("--schwelle", 0));
const bericht = [];

for (const [key, g] of Object.entries(GRUPPEN)) {
  if (nur && nur !== key) continue;
  const dateien = alle.filter(g.test);
  if (!dateien.length) continue;

  const seiten = [];
  const katSumme = {}, katMax = {}, hochProKat = {};
  for (const f of dateien) {
    const r = analyze(readFileSync(join(ROOT, f), "utf8"));
    seiten.push({ datei: f, score: r.score, grade: r.grade });
    for (const c of r.categories) {
      katSumme[c.key] = (katSumme[c.key] || 0) + c.points;
      katMax[c.key] = (katMax[c.key] || 0) + c.max;
    }
    for (const e of r.recommendations.filter((x) => x.severity === "hoch")) {
      hochProKat[e.category] = (hochProKat[e.category] || 0) + 1;
    }
  }
  seiten.sort((a, b) => a.score - b.score);
  const schnitt = seiten.reduce((a, b) => a + b.score, 0) / seiten.length;
  const kategorien = Object.keys(katSumme)
    .map((k) => ({ key: k, erfuellt: katSumme[k] / katMax[k] }))
    .sort((a, b) => a.erfuellt - b.erfuellt);

  bericht.push({
    gruppe: key, titel: g.titel, seitenzahl: dateien.length,
    schnitt: Math.round(schnitt * 10) / 10,
    schlechteste: seiten.slice(0, 5),
    kategorien, hochEmpfehlungen: hochProKat,
  });
}

if (hat("--json")) { console.log(JSON.stringify({ stand: new Date().toISOString().slice(0, 10), gruppen: bericht }, null, 2)); }
else {
  console.log("KI-Sichtbarkeit des eigenen Bestands — gemessen mit functions/_aeo-engine.mjs\n");
  for (const b of bericht) {
    console.log(`### ${b.titel} — ${b.seitenzahl} Seiten · Ø ${b.schnitt}/100`);
    console.log("    schwächste Kategorien: " + b.kategorien.slice(0, 3).map((c) => `${c.key} ${Math.round(c.erfuellt * 100)}%`).join(" · "));
    const hoch = Object.entries(b.hochEmpfehlungen).sort((a, b2) => b2[1] - a[1]);
    console.log("    dringend (hoch): " + (hoch.length ? hoch.map(([k, v]) => `${k} ${v}×`).join(" · ") : "keine"));
    console.log("    schwächste Seiten: " + b.schlechteste.map((s) => `${s.datei} (${s.score})`).join(", ") + "\n");
  }
}

if (schwelle > 0) {
  const drunter = bericht.filter((b) => b.schnitt < schwelle);
  if (drunter.length) {
    console.error(`\n❌ ${drunter.length} Gruppe(n) unter ${schwelle}: ` + drunter.map((b) => `${b.titel} (${b.schnitt})`).join(", "));
    process.exit(1);
  }
  console.log(`\n✅ Alle Gruppen ≥ ${schwelle}.`);
}
