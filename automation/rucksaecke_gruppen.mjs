#!/usr/bin/env node
/**
 * Sammlungen der zwei Rucksack-Menüköpfe anlegen, die KEINE eigene Kategorie sind: «Spezial-Rucksäcke» (rucksaecke-spezial-gruppe: taktisch/Tarn, Foto/Drohne, Motorrad)
 * und «Material & Ausstattung» (rucksaecke-material-gruppe: Leder, Canvas/Retro/Vintage, Ladefunktion, wasserdicht). «Rucksäcke» (rucksaecke) gibt es schon; die Gruppe
 * «Nach Einsatz» braucht keine Sammlung (der Kopf «Rucksäcke» trägt die sieben Einsatz-Kategorien selbst, siehe lib/rucksaecke_menue.mjs).
 *
 * Der Lauf ist derselbe wie bei Schmuck (schmuck_gruppen.mjs, gruppenLauf: Plan prüfen, Regel `TAG EQUALS sort-<kind>` ODER-verknüpft, BEST_SELLING, Kanäle von «hype-jetzt»,
 * HTTP-Prüfung im Onlineshop, nichts Fremdes überschreiben), nur mit dem Plan und den Kategorien der Rucksack-Taxonomie.
 *
 * TROCKENLAUF IST VORGABE (liest nur); mit KATALOG=<Datei> zusätzlich Mitgliederzahlen. LIVE=1 legt an. WEB_PRUEFEN=1 macht die HTTP-Prüfung auch im Trockenlauf.
 * Exit 0 = in Ordnung, 1 = Aufruffehler, 2 = Handle mit anderer Regel belegt oder Sammlung im Onlineshop nicht erreichbar/leer.
 * Reihenfolge: Tags und Collections der Kategorien (SCHMUCK=1 BEREICH_DATEI=rucksaecke BEREICH_GRUPPEN=<die drei Gruppen> BEREICH_PRAEFIX=r- PREFIX=r- kategorien_anlegen.mjs,
 * PHASE=tags, dann PHASE=sammlungen) → dieses Skript → rucksaecke_menue.mjs.
 */
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { collectionsImWeb } from './lib/collection_web.mjs';
import { gruppenLauf } from './schmuck_gruppen.mjs';
import { gruppenPlan, kategorieVon } from './lib/rucksaecke_menue.mjs';

/** Der Lauf mit dem Rucksack-Plan (Tests spielen die Abfrage `q` und die Web-Prüfung ein). */
export const rucksackGruppenLauf = (q, opt = {}) => gruppenLauf(q, { ...opt, plan: gruppenPlan(), kategorieVonHandle: kategorieVon });

/** Die Schalter aus der Umgebung: Trockenlauf ist Vorgabe, nur LIVE=1 schreibt; die HTTP-Prüfung läuft bei LIVE oder WEB_PRUEFEN=1. */
export const optionenAusEnv = (env, web) => ({ live: env.LIVE === '1', web: env.LIVE === '1' || env.WEB_PRUEFEN === '1' ? web : null });

async function main() {
  const KATALOG = process.env.KATALOG || '/tmp/katalog_rucksaecke.json';
  const katalog = existsSync(KATALOG) ? JSON.parse(readFileSync(KATALOG, 'utf8')) : null;
  if (!katalog) console.log(`Hinweis: Katalog ${KATALOG} fehlt - keine Mitgliederzahlen`);
  else console.log(`Katalog: ${katalog.produkte.length} aktive Produkte (${KATALOG})`);
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const res = await rucksackGruppenLauf(q, { ...optionenAusEnv(process.env, hs => collectionsImWeb(hs)), katalog });
  process.exit(res.code);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
