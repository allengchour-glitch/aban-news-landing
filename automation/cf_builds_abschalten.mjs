#!/usr/bin/env node
/**
 * Schaltet die dauerhaft roten „Workers Builds"-Checks ab — oder sagt im Trockenlauf nur,
 * was es taete. Hintergrund und Sicherungen: automation/lib/cf_builds.mjs.
 *
 *   SKRIPTE="aban-news-landing,aban-a,ki-verzeichnis" node automation/cf_builds_abschalten.mjs
 *   SCHARF=1 … node automation/cf_builds_abschalten.mjs      (loescht wirklich)
 *
 * Braucht CLOUDFLARE_API_TOKEN (Recht „Workers CI Write") und CLOUDFLARE_ACCOUNT_ID.
 */
import { bauAusloeserAbschalten, berichtText } from "./lib/cf_builds.mjs";

const token = process.env.CLOUDFLARE_API_TOKEN || "";
const konto = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const repo = process.env.REPO || "allengchour-glitch/aban-news-landing";
const skripte = (process.env.SKRIPTE || "aban-news-landing,aban-a,ki-verzeichnis")
  .split(",").map((s) => s.trim()).filter(Boolean);
const trocken = process.env.SCHARF !== "1";

if (!token || !konto) {
  // Ein Waechter darf aussteigen, aber er muss den Grund nennen (Repo-Regel).
  console.error("Kein Lauf: " + (!token ? "CLOUDFLARE_API_TOKEN fehlt. " : "") + (!konto ? "CLOUDFLARE_ACCOUNT_ID fehlt." : ""));
  process.exit(2);
}

console.log(`Repository: ${repo}`);
console.log(`Skripte:    ${skripte.join(", ")}`);
console.log(trocken ? "Modus:      Trockenlauf (SCHARF=1 loescht wirklich)\n" : "Modus:      SCHARF — Bau-Ausloeser werden geloescht\n");

const bericht = await bauAusloeserAbschalten({ konto, token, skripte, repo, trocken });
console.log(berichtText(bericht, trocken));

const fehler = bericht.filter((r) => r.fehler).length;
const geloescht = bericht.reduce((n, r) => n + r.geloescht.length, 0);
console.log(`\nZusammen: ${geloescht} Bau-Ausloeser geloescht, ${fehler} Skript(e) nicht lesbar.`);
process.exit(fehler ? 1 : 0);
