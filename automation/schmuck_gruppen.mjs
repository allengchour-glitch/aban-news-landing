#!/usr/bin/env node
/**
 * Sammlungen der sechs Schmuck-Menüköpfe anlegen, die KEINE eigene Kategorie sind: «Für Herren», «Gravur & Namen», «Motive», «Stile»,
 * «Sets & Besonderes», «Zubehör» (Handles schmuck-herren-gruppe, schmuck-personalisiert-gruppe, schmuck-motiv-gruppe, schmuck-stil-gruppe,
 * schmuck-sets-gruppe, schmuck-zubehoer-gruppe). Plan und Tags der Kinder: lib/schmuck_menue.mjs (gruppenPlan, getestet).
 *
 * Regel je Sammlung: «ein Produkt trägt mindestens eines der Tags sort-<kind>» (ODER-Regel, je Kind `TAG EQUALS`), Sortierung BEST_SELLING,
 * publiziert in denselben Kanälen wie die Collection «hype-jetzt» (Publish-Falle: per API angelegte Collections sind sonst nicht im Onlineshop).
 * Kinder, die schon existierende Collections sind (broschen-pins, schmuck-sets …), tragen ihr vorhandenes Tag aus lib/kategorien.mjs; das Skript
 * liest für JEDES Kind nach, welche Regel die Collection im Shop wirklich hat, und meldet Abweichungen. premium-schmuck ist manuell (kein Tag) und
 * kann keine Tag-Regel stellen: steht unter «ohne Tag» im Bericht.
 *
 * TROCKENLAUF IST VORGABE (liest nur): Tabelle der Gruppen und Kinder; mit KATALOG=<Datei> zusätzlich Mitgliederzahlen. LIVE=1 legt an.
 * Idempotent: gibt es den Handle schon mit DERSELBEN Regel, wird nichts angelegt (fehlende Veröffentlichungskanäle werden nachgeholt); mit anderer Regel wird
 * nichts überschrieben, es wird gemeldet (Exit 2).
 * PUBLISH-FALLE: Angelegt und «veröffentlicht» heisst nicht erreichbar (resourcePublicationsV2 täuscht in beide Richtungen, Skill kategorien-nach-google Falle 4).
 * Mit LIVE=1 wird darum jede der sechs Sammlungen am Schluss im Onlineshop abgerufen (lib/collection_web.mjs: HTTP 200 ohne Weiterleitung UND mindestens ein Produkt,
 * mit Wiederholungen, weil Shopify die Mitgliedschaft verzögert füllt); eine «vorhandene» Sammlung, die der Onlineshop nicht zeigt, wird trotz gegenteiliger Auskunft der API
 * in allen Kanälen neu veröffentlicht. Besteht eine Sammlung die Prüfung nicht, Exit 2 (das Menü darf sie nicht verlinken). Ohne `web` bricht LIVE ab (Exit 1).
 * WEB_PRUEFEN=1 macht die Prüfung auch im Trockenlauf (nur Bericht). Exit 2 auch bei LIVE, wenn eine vorhandene Kind-Collection nicht das Tag der Engine als Regel hat
 * (die Gruppen-Sammlung verfehlte dann ihre Mitglieder), und wenn die Vorbild-Collection «hype-jetzt» keine Kanäle hat. Im Trockenlauf sind diese Fälle nur Meldungen.
 * Reihenfolge: Tags (kategorien_anlegen.mjs PHASE=tags) → Collections der Kategorien (PHASE=sammlungen) → dieses Skript → schmuck_menue.mjs.
 */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { gehoertIn } from './lib/kategorien.mjs';
import { gruppenPlan, gleicheRegel, kategorieVon } from './lib/schmuck_menue.mjs';
import { collectionsImWeb } from './lib/collection_web.mjs';

const LEDGER = 'dropship/kategorien_ledger.txt';
const COLL_Q = `query($h:String!){collectionByHandle(handle:$h){id title productsCount{count} ruleSet{appliedDisjunctively rules{column relation condition}}}}`;
const schlaf = ms => new Promise(r => setTimeout(r, ms));
const regelText = c => !c ? 'fehlt' : c.ruleSet ? c.ruleSet.rules.map(x => `${x.column} ${x.relation} ${x.condition}`).join(c.ruleSet.appliedDisjunctively ? ' ODER ' : ' UND ') : 'manuell';

/** Stimmt die Regel einer vorhandenen Kind-Collection mit dem Tag der Engine überein (eine Regel `TAG EQUALS <tag>`)? */
export const kindTagStimmt = (c, tag) => !!c?.ruleSet && !c.ruleSet.appliedDisjunctively && c.ruleSet.rules.length === 1 && c.ruleSet.rules[0].column === 'TAG'
  && c.ruleSet.rules[0].relation === 'EQUALS' && c.ruleSet.rules[0].condition === tag;

/**
 * Der ganze Lauf mit eingespeister Abfrage `q(query, variables)` (Tests spielen eine Attrappe ein).
 * `web(handles)` → { handle: {ok, status, n, grund} } ist die HTTP-Prüfung im Onlineshop (Tests spielen eine Attrappe ein).
 * @returns {Promise<{code:number, ergebnis:object[], kinder:object[]}>}  code 0 = in Ordnung, 1 = Aufruffehler, 2 = ein Handle ist mit anderer Regel belegt oder eine Sammlung ist im Onlineshop nicht erreichbar/leer
 */
export async function gruppenLauf(q, { live = false, katalog = null, web = null, ledger = LEDGER, jetzt = () => new Date(), warte = schlaf, out = console.log, err = console.error, plan = gruppenPlan(), kategorieVonHandle = kategorieVon } = {}) {
  if (live && !web) { err('LIVE braucht die HTTP-Prüfung der neuen Sammlungen (Publish-Falle): ohne sie wird nichts angelegt'); return { code: 1, ergebnis: [], kinder: [] }; }
  const produkte = katalog?.produkte || null;
  // ── Kinder: welches Tag tragen die Mitglieder wirklich? ──
  const kinder = [], sehen = new Set();
  for (const g of plan) for (const k of g.kinder) {
    if (sehen.has(k.handle)) continue; sehen.add(k.handle);
    const c = (await q(COLL_Q, { h: k.handle })).collectionByHandle;
    const kat = kategorieVonHandle(k.handle);
    const zeile = { handle: k.handle, tag: k.tag, imShop: !!c, regel: regelText(c), shopProdukte: c?.productsCount?.count ?? null };
    zeile.stimmt = !k.tag ? null : !c ? null : kindTagStimmt(c, k.tag);
    if (produkte && kat) { zeile.passen = produkte.filter(p => gehoertIn(kat, p)).length; zeile.tragenTag = produkte.filter(p => (p.tags || []).includes(k.tag)).length; }
    kinder.push(zeile);
  }
  out('KIND'.padEnd(36) + 'TAG'.padEnd(46) + 'IM SHOP'.padEnd(9) + (produkte ? 'PASSEN  TRAGEN-TAG  ' : '') + 'REGEL IM SHOP');
  for (const z of kinder) {
    const urteil = z.tag === null ? 'manuell, ohne Tag (nicht per Tag erreichbar)' : z.imShop ? (z.stimmt ? 'ok' : 'ABWEICHUNG: ' + z.regel) : 'noch nicht angelegt';
    out(z.handle.padEnd(36) + String(z.tag ?? '-').padEnd(46) + (z.imShop ? 'ja' : 'nein').padEnd(9) + (produkte ? String(z.passen ?? '-').padStart(6) + String(z.tragenTag ?? '-').padStart(12) + '  ' : '') + urteil);
  }
  const abweichend = kinder.filter(z => z.imShop && z.stimmt === false);
  if (abweichend.length) err(`\nWARNUNG: ${abweichend.length} vorhandene Kind-Collections haben eine andere Regel als das Tag der Engine: ${abweichend.map(z => z.handle).join(', ')} - die Gruppen-Regel würde ihre Mitglieder verfehlen.`);

  // ── Gruppen ──
  const ergebnis = [];
  out('\nGRUPPE'.padEnd(37) + 'STATUS'.padEnd(22) + 'KINDER (Tags)' + (produkte ? '   ERWARTET' : ''));
  for (const g of plan) {
    const c = (await q(COLL_Q, { h: g.handle })).collectionByHandle;
    const status = !c ? 'neu' : gleicheRegel(c.ruleSet, g.regel) ? 'vorhanden (gleiche Regel)' : 'BELEGT, andere Regel';
    let erwartet = null;
    if (produkte) { const ks = g.kinder.map(k => kategorieVonHandle(k.handle)).filter(Boolean); erwartet = produkte.filter(p => ks.some(k => gehoertIn(k, p))).length; }
    ergebnis.push({ handle: g.handle, status, erwartet, id: c?.id ?? null, regelIm: regelText(c) });
    out(g.handle.padEnd(36) + status.padEnd(22) + g.regel.rules.map(r => r.condition).join(', ') + (g.ohneTag.length ? `  [ohne Tag: ${g.ohneTag.join(', ')}]` : '') + (erwartet !== null ? `   ${erwartet}` : ''));
    if (status.startsWith('BELEGT')) err(`  ⚠ ${g.handle}: Handle ist belegt mit anderer Regel (${regelText(c)}) -> wird NICHT überschrieben`);
  }
  const belegt = ergebnis.filter(e => e.status.startsWith('BELEGT'));
  if (!live) {
    if (web) { // Bericht: wie sieht der Onlineshop die vorhandenen Sammlungen?
      const vorhanden = ergebnis.filter(e => e.id), erg = vorhanden.length ? await web(vorhanden.map(e => e.handle)) : {};
      for (const e of vorhanden) { e.web = erg[e.handle]; out(`  Onlineshop ${e.handle.padEnd(34)} ${e.web.ok ? `ok (HTTP ${e.web.status}, Produkte vorhanden)` : 'NICHT in Ordnung: ' + e.web.grund}`); }
    }
    out('\nTrockenlauf - nichts geschrieben.'); return { code: belegt.length ? 2 : 0, ergebnis, kinder };
  }
  if (belegt.length) { err(`\nABBRUCH, nichts geschrieben: ${belegt.length} Handles sind mit anderer Regel belegt (${belegt.map(e => e.handle).join(', ')}). Entscheid beim Menschen.`); return { code: 2, ergebnis, kinder }; }
  if (abweichend.length) { err(`\nABBRUCH, nichts geschrieben: ${abweichend.length} vorhandene Kind-Collections haben nicht das Tag der Engine (${abweichend.map(z => z.handle).join(', ')}); die Gruppen-Sammlung würde ihre Mitglieder verfehlen.`); return { code: 2, ergebnis, kinder }; }

  // ── Schreiben: nur die neuen ──
  const vorbild = (await q(`{collectionByHandle(handle:"hype-jetzt"){resourcePublicationsV2(first:30){nodes{isPublished publication{id name}}}}}`)).collectionByHandle;
  const pubs = (vorbild?.resourcePublicationsV2?.nodes || []).filter(n => n.isPublished).map(n => ({ publicationId: n.publication.id }));
  if (!pubs.length) { err('ABBRUCH: die Vorbild-Collection «hype-jetzt» hat keine Veröffentlichungskanäle - neue Collections blieben unpubliziert (404).'); return { code: 2, ergebnis, kinder }; }
  for (const g of plan) {
    const e = ergebnis.find(x => x.handle === g.handle);
    if (e.status !== 'neu') {
      // Idempotent UND heilend: bricht ein Lauf zwischen Anlegen und Veröffentlichen ab, bliebe die Sammlung sonst für immer unveröffentlicht (404).
      const kanaele = (await q(`query($id:ID!){collection(id:$id){resourcePublicationsV2(first:30){nodes{isPublished publication{id name}}}}}`, { id: e.id })).collection.resourcePublicationsV2.nodes;
      let fehlt = pubs.filter(x => !kanaele.some(n => n.isPublished && n.publication.id === x.publicationId));
      // resourcePublicationsV2 täuscht: «veröffentlicht» laut API, aber der Onlineshop liefert 404 → dann in allen Kanälen erneut veröffentlichen (idempotent)
      if (!fehlt.length && (await web([g.handle]))[g.handle]?.status === 404) fehlt = pubs;
      if (fehlt.length) {
        const p2 = await q(`mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i){userErrors{field message}}}`, { id: e.id, i: fehlt });
        if (p2.publishablePublish.userErrors.length) throw new Error(`publishablePublish ${g.handle} ${JSON.stringify(p2.publishablePublish.userErrors)}`);
        out(`übersprungen (${e.status}), aber in ${fehlt.length} Kanälen nachpubliziert: ${g.handle}`); appendFileSync(ledger, `${jetzt().toISOString()} · nachpubliziert ${g.handle}\n`);
      } else out(`übersprungen (${e.status}): ${g.handle}`);
      continue;
    }
    const d = await q(`mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id handle} userErrors{field message}}}`, { i: {
      title: g.titel, handle: g.handle, sortOrder: 'BEST_SELLING', descriptionHtml: `<p>${g.beschreibung}</p>`,
      seo: { title: `${g.titel} online kaufen | LuxeStyle CH`, description: g.seoBeschreibung }, ruleSet: g.regel } });
    if (d.collectionCreate.userErrors.length) throw new Error(`collectionCreate ${g.handle} ${JSON.stringify(d.collectionCreate.userErrors)}`);
    const id = d.collectionCreate.collection.id;
    const p = await q(`mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i){userErrors{field message}}}`, { id, i: pubs });
    if (p.publishablePublish.userErrors.length) throw new Error(`publishablePublish ${g.handle} ${JSON.stringify(p.publishablePublish.userErrors)}`);
    e.id = id; e.angelegt = true;
    out(`Angelegt: ${g.handle} · publiziert in ${pubs.length} Kanälen`);
    appendFileSync(ledger, `${jetzt().toISOString()} · angelegt ${g.handle}\n`);
  }
  // Mitgliedschaft entsteht verzögert (Shopify füllt Smart-Collections nachträglich)
  if (ergebnis.some(x => x.angelegt)) await warte(20000);
  for (const e of ergebnis.filter(x => x.angelegt)) {
    let n = 0;
    for (let i = 0; i < 6; i++) { n = (await q(`query($id:ID!){collection(id:$id){productsCount{count}}}`, { id: e.id })).collection.productsCount.count; if (e.erwartet === null || n >= e.erwartet * 0.9) break; await warte(8000); }
    e.mitglieder = n;
    out(`  ${e.handle.padEnd(34)} Mitglieder ${String(n).padStart(5)}${e.erwartet !== null ? ` / erwartet ${e.erwartet}` : ''}`);
  }
  // Kundensicht: jede der sechs Sammlungen muss im Onlineshop mit HTTP 200 (ohne Weiterleitung) Produkte zeigen. Die Mitgliedschaft füllt Shopify verzögert, darum mehrere Versuche.
  const zuPruefen = ergebnis.filter(e => e.id);
  for (const e of zuPruefen) {
    let r = null;
    for (let i = 0; i < 5; i++) { r = (await web([e.handle]))[e.handle]; if (r?.ok) break; if (i < 4) await warte(8000); }
    e.web = r || { ok: false, status: 0, n: 0, grund: 'keine Antwort' };
    out(`  Onlineshop ${e.handle.padEnd(34)} ${e.web.ok ? 'ok (HTTP 200, Produkte vorhanden)' : 'NICHT in Ordnung: ' + e.web.grund}`);
  }
  const nichtImWeb = zuPruefen.filter(e => !e.web.ok);
  if (nichtImWeb.length) {
    err(`\nFEHLER: ${nichtImWeb.length} Sammlungen sind im Onlineshop nicht erreichbar oder leer (${nichtImWeb.map(e => `${e.handle}: ${e.web.grund}`).join('; ')}). Das Menü darf sie nicht verlinken; nach einer Weile erneut laufen lassen (veröffentlicht wird idempotent nachgeholt).`);
    return { code: 2, ergebnis, kinder };
  }
  return { code: 0, ergebnis, kinder };
}

async function main() {
  const KATALOG = process.env.KATALOG || '/tmp/katalog_taxo.json';
  const katalog = existsSync(KATALOG) ? JSON.parse(readFileSync(KATALOG, 'utf8')) : null;
  if (!katalog) console.log(`Hinweis: Katalog ${KATALOG} fehlt - keine Mitgliederzahlen`);
  else console.log(`Katalog: ${katalog.produkte.length} aktive Produkte (${KATALOG})`);
  const SHOP = process.env.SHOPIFY_SHOP, CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: CS, grant_type: 'client_credentials' }) });
  const tok = (await r.json()).access_token;
  if (!tok) { console.error('Kein Shopify-Token'); process.exit(1); }
  const q = (a, b) => shopifyGql(SHOP, '2025-01', tok, a, b);
  const live = process.env.LIVE === '1';
  const web = live || process.env.WEB_PRUEFEN === '1' ? hs => collectionsImWeb(hs) : null;
  const res = await gruppenLauf(q, { live, katalog, web });
  process.exit(res.code);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error('FEHLER', e.message); process.exit(1); });
