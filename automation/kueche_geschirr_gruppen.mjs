#!/usr/bin/env node
/**
 * Sammlungen für die Trennung «Küche & Kochen» / «Geschirr & Tisch» anlegen (siehe lib/kueche_geschirr_menue.mjs): fünf Gruppen (kochen-grillen-backen,
 * kuechenhelfer-vorrat, kuechengeraete-alle, geschirr-besteck-tisch, kaffee-tee-trinken) und zwei Köpfe (kueche-kochen, geschirr-tisch).
 *
 * Die Regel jeder Sammlung ist «ein Produkt trägt mindestens eines der Tags sort-<kind>» (ODER, je Kind `TAG EQUALS`, Sortierung BEST_SELLING). Welche Kinder und Tags,
 * entscheidet das Skript aus dem LIVE gelesenen Hauptmenü und den LIVE gelesenen Regeln der Kind-Sammlungen: nur Kinder mit genau einer Regel `TAG EQUALS <tag>` zählen
 * (Titel-Regel-Sammlungen wie `sub-kueche` und manuelle bleiben draussen und stehen im Bericht unter «ohne Tag»). Lauf, Prüfungen und HTTP-Prüfung im Onlineshop:
 * schmuck_gruppen.mjs (gruppenLauf: nichts Fremdes überschreiben, Publish-Falle, Exit 2 bei belegtem Handle oder nicht erreichbarer Sammlung).
 *
 * TROCKENLAUF IST VORGABE (liest nur). KATALOG=<Datei> (Vorgabe /tmp/katalog_voll.json, `node automation/katalog_bulk.mjs <Datei>`) zeigt die erwarteten Mitglieder
 * (aktive Produkte); Shopify zählt Entwürfe mit, die Zahl nach dem Anlegen darf also höher sein. LIVE=1 legt an. WEB_PRUEFEN=1 macht die HTTP-Prüfung auch im Trockenlauf.
 * Exit 0 = in Ordnung, 1 = Aufruffehler, 2 = Handle mit anderer Regel belegt / Sammlung im Onlineshop nicht erreichbar oder leer / Plan ohne Regel.
 * Reihenfolge: dieses Skript → kueche_geschirr_menue.mjs.
 */
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { collectionsImWeb } from './lib/collection_web.mjs';
import { eingabeAus } from './menu_eintrag_einfuegen.mjs';
import { gruppenLauf, kindTagStimmt } from './schmuck_gruppen.mjs';
import { gruppenPlan, erwartetAus, ELTERN, OBER } from './lib/kueche_geschirr_menue.mjs';

const FELDER = 'id title type resourceId url tags';
const MENU_Q = `query($h:String!){menus(first:1,query:$h){nodes{id title handle items{${FELDER} items{${FELDER} items{${FELDER}}}}}}}`;
const ZAHL_Q = `query($id:ID!){collection(id:$id){productsCount{count}}}`;
const REGEL_Q = `query($h:String!){collectionByHandle(handle:$h){id title productsCount{count} ruleSet{appliedDisjunctively rules{column relation condition}}}}`;

/** Das Tag `sort-…` einer vorhandenen Sammlung, wenn ihre Regel genau `TAG EQUALS <tag>` ist; sonst null. */
export const tagAusRegel = c => {
  const r = c?.ruleSet?.rules?.[0];
  return r && kindTagStimmt(c, r.condition) && /^sort-/.test(r.condition) ? r.condition : null;
};

/**
 * Plan aus dem live gelesenen Menü und den live gelesenen Kind-Regeln.
 * @returns {Promise<{plan?:object[], fehler:string[]}>}
 */
export async function planLesen(q, out = console.log) {
  const m = (await q(MENU_Q, { h: 'handle:main-menu' })).menus.nodes[0];
  if (!m || m.handle !== 'main-menu') return { fehler: ['Hauptmenü nicht gefunden'] };
  const baum = eingabeAus(m.items);
  if (!baum.some(x => x.title === ELTERN) && !baum.some(x => x.title === OBER[0].titel)) return { fehler: [`weder «${ELTERN}» noch «${OBER[0].titel}» im Menü`] };
  const tags = {};
  const roh = gruppenPlan(baum, () => null); // nur um die Kind-Handles zu kennen
  const handles = [...new Set(roh.flatMap(p => p.kinder.map(k => k.handle)))];
  for (const h of handles) tags[h] = tagAusRegel((await q(REGEL_Q, { h })).collectionByHandle);
  const plan = gruppenPlan(baum, h => tags[h] || null);
  const fehler = plan.filter(p => !p.regel.rules.length).map(p => `${p.handle}: keine Kind-Sammlung mit Tag-Regel gefunden`);
  const ohne = [...new Set(plan.flatMap(p => p.ohneTag))];
  if (ohne.length) out(`Ohne Tag-Regel (bleiben im Menü, kommen nicht in die Vereinigung): ${ohne.join(', ')}`);
  return { plan, fehler };
}

/** Der Lauf mit eingespeister Abfrage `q` und Web-Prüfung `web` (Tests spielen Attrappen ein). */
export async function kuecheGeschirrGruppenLauf(q, { live = false, web = null, katalog = null, out = console.log, err = console.error, ...rest } = {}) {
  const { plan, fehler } = await planLesen(q, out);
  if (fehler.length) { err('ABBRUCH, nichts geschrieben:\n- ' + fehler.join('\n- ')); return { code: 2, ergebnis: [], kinder: [], fehler }; }
  if (katalog) {
    const e = erwartetAus(katalog.produkte, plan);
    out('Erwartete Mitglieder (aktive Produkte im Katalog): ' + plan.map(p => `${p.handle} ${e[p.handle]}`).join(' · '));
  }
  // Ohne `katalog` an gruppenLauf: dessen Zählung kennt nur Engine-Kategorien, hier wäre sie 0. Eigene Zahlen oben.
  const res = await gruppenLauf(q, { live, web, plan, kategorieVonHandle: () => null, katalog: null, out, err, ...rest });
  // Mengenprüfung (nur für frisch angelegte Sammlungen): Shopify zählt Entwürfe mit, also mindestens 90 % der aktiven Mitglieder laut Katalog. Eine falsche Regel (z. B. 1 statt 355) darf das Menü nicht freigeben.
  // Smart-Collections füllen sich verzögert (03.11.: «geschirr-besteck-tisch» zeigte direkt nach dem Anlegen 0, wenig später 433): darum bis zu sechsmal nachzählen.
  if (res.code === 0 && katalog) {
    const e = erwartetAus(katalog.produkte, plan), warte = rest.warte || (ms => new Promise(r => setTimeout(r, ms)));
    const wenig = () => (res.ergebnis || []).filter(x => x.angelegt && x.mitglieder != null && x.mitglieder < e[x.handle] * 0.9);
    let zuWenig = wenig();
    for (let i = 0; i < 6 && zuWenig.length; i++) {
      await warte(8000);
      for (const x of zuWenig) x.mitglieder = (await q(ZAHL_Q, { id: x.id })).collection.productsCount.count;
      zuWenig = wenig();
    }
    if (zuWenig.length) { err(`\nFEHLER: zu wenige Mitglieder (Shopify zählt Entwürfe mit, erwartet mindestens 90 % der aktiven laut Katalog): ${zuWenig.map(x => `${x.handle} ${x.mitglieder} statt ${e[x.handle]}`).join('; ')}. Nach einigen Minuten den Trockenlauf wiederholen (Mitglieder lesen), bevor das Menü umgebaut wird.`); return { ...res, code: 2 }; }
  }
  return res;
}

/** Die Schalter aus der Umgebung: Trockenlauf ist Vorgabe, nur LIVE=1 schreibt; die HTTP-Prüfung läuft bei LIVE oder WEB_PRUEFEN=1. */
export const optionenAusEnv = (env, web) => ({ live: env.LIVE === '1', web: env.LIVE === '1' || env.WEB_PRUEFEN === '1' ? web : null });

async function main() {
  const KATALOG = process.env.KATALOG || '/tmp/katalog_voll.json';
  const katalog = existsSync(KATALOG) ? JSON.parse(readFileSync(KATALOG, 'utf8')) : null;
  console.log(katalog ? `Katalog: ${katalog.produkte.length} aktive Produkte (${KATALOG})` : `Hinweis: Katalog ${KATALOG} fehlt - keine erwarteten Mitgliederzahlen`);
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const res = await kuecheGeschirrGruppenLauf(q, { ...optionenAusEnv(process.env, hs => collectionsImWeb(hs)), katalog });
  process.exit(res.code);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
