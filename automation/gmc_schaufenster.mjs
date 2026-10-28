#!/usr/bin/env node
/**
 * Google-Schaufenster: hält die Zahl der Artikel auf dem Kanal «Google & YouTube» unter der Quote des Merchant Centers
 * (Standard 150 000 Artikel je Bereich; ein Artikel ist eine Variante). Begründung, Regel und Zahlen: automation/lib/gmc_schaufenster.mjs.
 *
 * PHASEN (PHASE=…, Vorgabe plan)
 *   plan          NUR LESEN: liest alle aktiven Produkte (Bulk), rechnet das Schaufenster, nennt Zahlen, Gründe und Beispiele
 *                 auf BEIDEN Seiten (bleibt / geht) und schreibt den Plan nach PLAN_AUS.
 *   abwaehlen     LIVE=1: nimmt Produkte, die nicht ins Schaufenster passen, vom Kanal (publishableUnpublish, 10 je Anfrage). Bestellte und gut bewertete
 *                 Produkte (Stufe 0) bleiben; sind die Bestellungen nicht vollständig lesbar, bricht der Lauf ab.
 *   aufnehmen     LIVE=1: stellt Produkte zurück, die dieses Werkzeug früher abgewählt hat UND die wieder ins Schaufenster passen.
 *   zuruecksetzen LIVE=1: VOLLE Rücknahme: stellt alles zurück, was dieses Werkzeug abgewählt hat (ausser Sperrtag), auch Produkte mit
 *                 Ausschlussfeld oder ausserhalb des Budgets. Danach wählt ein neuer Lauf wieder ab; zum Stoppen die Freigabedatei löschen.
 *   pruefen       NUR LESEN: liest frisch und vergleicht mit Manifest und Plan, nennt die Varianten auf Google.
 *
 * SICHERHEIT
 *   - Scharf nur mit LIVE=1 UND der Freigabedatei dropship/GMC-SCHAUFENSTER-FREI.txt (löschen = Stopp, auch mitten im Lauf: sie wird vor jedem
 *     Stück neu geprüft, Exit 4; ein Lauf auf GitHub Actions sieht nur seine Kopie, dort stoppt «Run abbrechen»); KATALOG (fertige Datei) nie mit LIVE=1.
 *   - Ein Plan mit Fehlern (zu wenige Zeilen, leeres oder zu grosses Schaufenster, zu viele unklare Zeilen, über 70 % abzuwählen, über 5 %
 *     ohne Google-Kategorie) schreibt nichts (Exit 2). BUDGET unter 40 000 wird nie angenommen.
 *   - Manifest (dropship/gmc_schaufenster_manifest.jsonl): eine Zeile je Produkt VOR dem Aufruf («ab-versucht»: Teilfehler oder Absturz
 *     verlieren nichts), «auf» nach belegter Rücknahme. Der Manifest-Pfad wird vor dem ersten Aufruf auf Schreibbarkeit geprüft.
 *   - Es kommt nie ein Produkt hinzu, das nicht schon auf Google lag (Sperrtag, Policy) und nie eines ohne Manifest-Eintrag zurück.
 *   - Produkte, die dreimal fehlschlugen (dropship/gmc_schaufenster_fehler.txt), werden übersprungen und genannt.
 *   - Drosselung wird nie umgangen: bleibt sie bestehen, endet der Lauf (Exit 4), der nächste macht idempotent weiter.
 *
 * ENV  SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET (+ SHOPIFY_SHOP)  ·  LIVE=1  ·  PHASE  ·  MAX (Vorgabe 2000, «alle»)  ·  ONLY=handle,handle (Stichprobe)
 *      BUDGET (Varianten, Vorgabe 90000, mindestens 40000)  ·  PLAN_AUS (Vorgabe /tmp/gmc_schaufenster_plan.json)  ·  MANIFEST  ·  FREIGABE  ·  FEHLERDATEI
 *      KATALOG (fertige Bulk-Datei statt Lesen, nur ohne LIVE)
 * Exit  0 ok · 1 Zugang/Einstellung · 2 Plan nicht erlaubt · 3 Fehlschläge oder Defekt (abgewählt, aber noch auf Google) · 4 Drosselung/Abbruch
 *       5 pruefen: Google trägt noch Produkte ausserhalb des Schaufensters
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import {
  GOOGLE_PUBLICATION, BUDGET_VARIANTEN, MIN_BUDGET, plan, stuecke, mutation, auswerten, parseManifest, manifestZeile, ratingAus, bestellteIds, bewaehrt,
} from './lib/gmc_schaufenster.mjs';

const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = '2026-01';   // 2025-01 ist abgelaufen: Shopify antwortete still mit 2026-01 (Prüfer 28.10.)
const LIVE = process.env.LIVE === '1';
const PHASE = (process.env.PHASE || 'plan').trim();
const BUDGET = Number(process.env.BUDGET || BUDGET_VARIANTEN);
const MAX = /^alle$/i.test(process.env.MAX || '') ? Infinity : Number(process.env.MAX || 2000);
const ONLY = (process.env.ONLY || '').split(',').map(s => s.trim()).filter(Boolean);
const PLAN_AUS = process.env.PLAN_AUS || '/tmp/gmc_schaufenster_plan.json';
const HIER = p => fileURLToPath(new URL(p, import.meta.url));
const MANIFEST = process.env.MANIFEST || HIER('../dropship/gmc_schaufenster_manifest.jsonl');
const FREIGABE = process.env.FREIGABE || HIER('../dropship/GMC-SCHAUFENSTER-FREI.txt');
const FEHLERDATEI = process.env.FEHLERDATEI || HIER('../dropship/gmc_schaufenster_fehler.txt');
const STUECK = 10;
const SCHREIBT = ['abwaehlen', 'aufnehmen', 'zuruecksetzen'];
const schlaf = ms => new Promise(r => setTimeout(r, ms));
const heute = () => new Date().toISOString().slice(0, 10);

if (![...SCHREIBT, 'plan', 'pruefen'].includes(PHASE)) { console.log(`ABBRUCH: unbekannte PHASE «${PHASE}»`); process.exit(1); }
if (!Number.isFinite(BUDGET) || BUDGET < MIN_BUDGET) { console.log(`ABBRUCH: BUDGET muss eine Zahl >= ${MIN_BUDGET} sein (ein Tippfehler würde fast alles abwählen)`); process.exit(1); }
if (!(MAX >= 1)) { console.log('ABBRUCH: MAX muss >= 1 oder «alle» sein'); process.exit(1); }
if (SCHREIBT.includes(PHASE) && !LIVE) console.log('TROCKENLAUF (LIVE=1 schreibt).');
if (LIVE && process.env.KATALOG) { console.log('ABBRUCH: KATALOG (fertige Datei) gilt nur im Trockenlauf; scharf wird frisch gelesen.'); process.exit(1); }
if (LIVE && SCHREIBT.includes(PHASE) && !existsSync(FREIGABE)) {
  console.log('ABBRUCH: dropship/GMC-SCHAUFENSTER-FREI.txt fehlt (Freigabe des Besitzers oder Stopp).'); process.exit(1);
}

async function holeToken() {
  const id = process.env.SHOPIFY_CLIENT_ID, sec = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET);
  if (!id || !sec) { console.log('ABBRUCH: SHOPIFY_CLIENT_ID oder _SECRET fehlt.'); return null; }
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: id, client_secret: sec, grant_type: 'client_credentials' }) });
  const txt = await r.text(); let j = {}; try { j = JSON.parse(txt); } catch { /* unten gemeldet */ }
  if (!j.access_token) { console.log(`ABBRUCH: Token HTTP ${r.status} · ${txt.slice(0, 200)}`); return null; }
  return j.access_token;
}
const TOKEN = await holeToken();
if (!TOKEN) process.exit(1);
const q = (a, b) => shopifyGql(SHOP, API, TOKEN, a, b);

/** Alle aktiven Produkte per Bulk-Abfrage (eine Minute). Die Zeilen sind frisch; ein Lauf ohne Beleg «vollständig» schreibt nichts. */
async function liesProdukte() {
  if (process.env.KATALOG) return zeilen(readFileSync(process.env.KATALOG, 'utf8'), null);
  const lauf = (await q(`{currentBulkOperation(type:QUERY){status}}`)).currentBulkOperation;
  if (lauf && ['CREATED', 'RUNNING', 'CANCELING'].includes(lauf.status)) { console.log('ABBRUCH: Es läuft schon eine Bulk-Abfrage, später wiederholen.'); process.exit(4); }
  const inner = `{ products(query:"status:active") { edges { node { id handle title tags variantsCount{count} gp:publishedOnPublication(publicationId:"${GOOGLE_PUBLICATION}") ex:metafield(namespace:"mm-google-shopping", key:"excluded_destination"){ value } cat:metafield(namespace:"mm-google-shopping", key:"google_product_category"){ value } rt:metafield(namespace:"reviews", key:"rating"){ value } rc:metafield(namespace:"reviews", key:"rating_count"){ value } } } } }`;
  const m = (await q(`mutation($q:String!){bulkOperationRunQuery(query:$q){bulkOperation{id} userErrors{message}}}`, { q: inner })).bulkOperationRunQuery;
  if (m.userErrors?.length) {
    const belegt = m.userErrors.some(e => /already in progress|bereits|in progress/i.test(String(e.message)));
    console.log(`ABBRUCH: Bulk-Abfrage: ${JSON.stringify(m.userErrors)}`); process.exit(belegt ? 4 : 1);
  }
  for (let i = 0; i < 240; i++) {
    await schlaf(10000);
    const s = (await q(`{currentBulkOperation(type:QUERY){status errorCode objectCount url}}`)).currentBulkOperation;
    if (s.status === 'COMPLETED') return zeilen(await (await fetch(s.url)).text(), Number(s.objectCount));
    if (['FAILED', 'CANCELED', 'EXPIRED'].includes(s.status)) { console.log(`ABBRUCH: Bulk ${s.status} ${s.errorCode || ''}`); process.exit(1); }
  }
  console.log('ABBRUCH: Bulk-Abfrage dauert zu lange.'); process.exit(4);
}
function zeilen(text, erwartet) {
  const aus = text.split('\n').filter(Boolean).map(z => {
    const o = JSON.parse(z);
    const b = ratingAus(o.rt?.value, o.rc?.value);
    return { id: o.id, handle: o.handle, titel: o.title || '', tags: o.tags || [], varianten: o.variantsCount?.count, aufGoogle: typeof o.gp === 'boolean' ? o.gp : null,
      ausschluss: o.ex?.value || null, kategorie: o.cat?.value || null, rating: b ? b.rating : null, bewertungen: b ? b.anzahl : null, bestellt: false };
  });
  if (erwartet != null && aus.length !== erwartet) { console.log(`ABBRUCH: ${aus.length} Zeilen gelesen, Shopify meldet ${erwartet}.`); process.exit(1); }
  return aus;
}

/**
 * Produkte aus bezahlten Bestellungen (Stufe 0 «bewährt»). Nur lesen. Ältere Bestellungen als 60 Tage liefert Shopify nur mit dem Recht `read_all_orders`:
 * `ordersCount` gegen die gelesene Zahl ist deshalb die Probe; stimmt sie nicht, gilt die Liste als unvollständig (und ein Schreiblauf bricht ab).
 */
async function liesBestellte() {
  const alle = []; let nach = null, gesamt = null;
  try {
    for (let i = 0; i < 100; i++) {
      const d = await q(`query($c:String){ ordersCount(limit:null){ count } orders(first:100, after:$c, sortKey:CREATED_AT){ pageInfo{ hasNextPage endCursor } nodes{ test cancelledAt displayFinancialStatus lineItems(first:100){ pageInfo{ hasNextPage } nodes{ product{ id } } } } } }`, { c: nach });
      gesamt = d.ordersCount?.count ?? gesamt;
      alle.push(...(d.orders?.nodes || []));
      if (!d.orders?.pageInfo?.hasNextPage) break;
      nach = d.orders.pageInfo.endCursor;
    }
  } catch (e) { return { ids: new Set(), vollstaendig: false, gelesen: alle.length, gesamt, fehler: String(e.message).slice(0, 160) }; }
  const b = bestellteIds(alle);
  // Fehlt ordersCount, ist die Vollständigkeit unbelegt: dann gilt die Liste als unvollständig (fail-closed; GEMESSEN 28.10.: Shopify liefert {"count":29,"precision":"EXACT"}).
  const vollstaendig = b.vollstaendig && gesamt != null && gesamt === alle.length;
  const grund = gesamt == null ? 'ordersCount fehlt' : `gelesen ${alle.length} von ${gesamt} Bestellungen${b.vollstaendig ? ' (Recht read_all_orders prüfen)' : ' (Positionen abgeschnitten)'}`;
  return { ids: b.ids, vollstaendig, gelesen: alle.length, gesamt, fehler: vollstaendig ? null : grund };
}

function liesManifest() {
  if (!existsSync(MANIFEST)) return { ids: new Set(), kaputt: 0 };
  return parseManifest(readFileSync(MANIFEST, 'utf8'));
}
/** Zeilen anhängen; endet die Datei nicht auf einen Zeilenumbruch, steht vor der ersten neuen Zeile einer (sonst verschmölzen zwei Einträge). */
let umbruchNoetig = false;
function anhaengen(pfad, text) {
  appendFileSync(pfad, (umbruchNoetig ? '\n' : '') + text);
  umbruchNoetig = false;
}
function liesFehler() {
  const n = new Map();
  if (!existsSync(FEHLERDATEI)) return n;
  for (const z of readFileSync(FEHLERDATEI, 'utf8').split('\n')) { const id = z.split('\t')[0]; if (id) n.set(id, (n.get(id) || 0) + 1); }
  return n;
}

function bericht(p, alle) {
  const z = p.zahlen, v = p.varianten;
  console.log(`\nSCHAUFENSTER (Budget ${z.budget} Varianten, Deckel je Kategorie ${z.katDeckel})`);
  console.log(`  gelesen ${alle.length} aktive Produkte · auf Google jetzt ${alle.filter(x => x.aufGoogle === true).length} · unklar ${p.unklar}`);
  console.log(`  zulässig: Stufe 0 (bewährt: bestellt oder gut bewertet) ${z.produkte[0]} · Stufe 1 (Fortura/CH-Lager) ${z.produkte[1]} · Stufe 2 (Marge A/B) ${z.produkte[2]} · Stufe 3 (Rest) ${z.produkte[3]}`);
  console.log(`  im Schaufenster: S0 ${z.drin[0]} / ${z.varianten[0]} Var. · S1 ${z.drin[1]} / ${z.varianten[1]} Var. · S2 ${z.drin[2]} / ${z.varianten[2]} Var. · S3 ${z.drin[3]} / ${z.varianten[3]} Var. · zusammen ${z.varianten.gesamt} Varianten`);
  console.log(`  Varianten auf Google: jetzt ${v.vorher} → nach dem Lauf ${v.nachher}   (Quote 150000, Budget ${z.budget})`);
  console.log(`  ABWÄHLEN ${p.abwaehlen.length} Produkte, Gründe ${JSON.stringify(p.gruende)}`);
  console.log(`  AUFNEHMEN ${p.aufnehmen.length} Produkte (aus dem Manifest, passen wieder) · ZURÜCKSETZEN ${p.zuruecksetzen.length} (alles aus dem Manifest, ausser Sperrtag)`);
  const proKat = {};
  for (const x of alle) if (p.drin.has(x.id) && x.aufGoogle === true) { const k = String(x.kategorie).split(' > ').slice(0, 2).join(' > '); proKat[k] = (proKat[k] || 0) + Number(x.varianten); }
  console.log('  grösste Kategorien im Schaufenster (Varianten): ' + Object.entries(proKat).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k}=${n}`).join(' · '));
  const proben = (liste, n) => liste.filter((_, i) => i % Math.max(1, Math.floor(liste.length / n)) === 0).slice(0, n);
  console.log('  BLEIBEN (Beispiele je Stufe):');
  for (const s of [0, 1, 2, 3]) for (const x of proben(alle.filter(a => p.drin.get(a.id) === s && a.aufGoogle === true), 4)) console.log(`    S${s} ${x.handle} · ${x.varianten} Var.`);
  console.log('  GEHEN (Beispiele, über die Gründe verteilt):');
  const proGrund = {};
  for (const x of p.abwaehlen) (proGrund[x.grund] ||= []).push(x);
  for (const [g, l] of Object.entries(proGrund)) for (const x of proben(l, 3)) console.log(`    ${g} · ${x.handle} · ${x.varianten} Var.`);
  if (p.fehler.length) console.log(`\nPLAN NICHT ERLAUBT: ${p.fehler.join(' | ')}`);
}

const alle = await liesProdukte();
const bestellt = await liesBestellte();
for (const x of alle) x.bestellt = bestellt.ids.has(x.id);
console.log(`BEWÄHRT: ${bestellt.ids.size} Produkte aus bezahlten Bestellungen (${bestellt.gelesen} Bestellungen gelesen${bestellt.gesamt != null ? `, Shopify zählt ${bestellt.gesamt}` : ''}) · dazu ${alle.filter(x => !x.bestellt && bewaehrt(x)).length} mit guter Bewertung`);
if (!bestellt.vollstaendig) console.log(`WARNUNG: Bestellungen unvollständig gelesen (${bestellt.fehler}): bestellte Produkte sind nicht sicher geschützt.`);
/** Bewertungsfelder: GEMESSEN 28.10. tragen 2 076 von 56 618 Produkten eines. Viel weniger heisst: nicht (richtig) gelesen, etwa eine alte KATALOG-Datei ohne reviews.rating. */
const MIN_BEWERTET = 200;
const mitRating = alle.filter(x => x.rating != null).length;
console.log(`BEWERTUNGSFELDER: bei ${mitRating} Produkten gelesen${mitRating < MIN_BEWERTET ? ` (unter ${MIN_BEWERTET}: Stufe 0 gilt dann nur für bestellte Produkte, schwach Bewertete werden nicht erkannt)` : ''}`);
if (ONLY.length) console.log(`ONLY: Stichprobe von ${ONLY.length} Handles (der Plan rechnet trotzdem über alle ${alle.length} Produkte).`);
const man = liesManifest();
if (man.kaputt) console.log(`HINWEIS: ${man.kaputt} kaputte Manifest-Zeilen (werden nicht beachtet).`);
const p = plan(alle, man.ids, { budget: BUDGET });
bericht(p, alle);
writeFileSync(PLAN_AUS, JSON.stringify({ am: new Date().toISOString(), zahlen: p.zahlen, varianten: p.varianten, fehler: p.fehler, abwaehlen: p.abwaehlen, aufnehmen: p.aufnehmen, zuruecksetzen: p.zuruecksetzen }));
console.log(`  Plan geschrieben: ${PLAN_AUS}`);

if (PHASE === 'plan') process.exit(p.ok ? 0 : 2);

if (PHASE === 'pruefen') {
  if (!p.ok) { console.log('\nPRÜFUNG nicht aussagekräftig: der Plan ist nicht erlaubt (siehe oben).'); process.exit(2); }
  const nachId = new Map(alle.map(x => [x.id, x]));
  const falsch = [];
  for (const id of man.ids) { const x = nachId.get(id); if (x && x.aufGoogle === true) falsch.push({ id, handle: x.handle, problem: 'abgewählt, aber noch auf Google' }); }
  const fehlt = [...man.ids].filter(id => !nachId.has(id)).length;
  const zuViel = alle.filter(x => x.aufGoogle === true && !p.drin.has(x.id)).length;
  const varianten = alle.filter(x => x.aufGoogle === true).reduce((s, x) => s + (Number.isFinite(Number(x.varianten)) ? Number(x.varianten) : 0), 0);
  console.log(`\nPRÜFUNG: Varianten auf Google jetzt ${varianten} (Quote 150000) · Manifest ${man.ids.size} Produkte · davon noch auf Google ${falsch.length} (Defekt) · nicht mehr aktiv/gelesen ${fehlt} · auf Google, aber nicht im Schaufenster ${zuViel}`);
  for (const f of falsch.slice(0, 10)) console.log(`    ${f.handle}: ${f.problem}`);
  if (falsch.length) process.exit(3);
  if (zuViel && !ONLY.length) { console.log('  Google trägt noch Produkte ausserhalb des Schaufensters: PHASE=abwaehlen steht aus.'); process.exit(5); }
  process.exit(0);
}

if (PHASE === 'abwaehlen' && LIVE && !bestellt.vollstaendig) { console.log(`ABBRUCH: Die Bestellungen sind unvollständig gelesen (${bestellt.fehler}); ohne sie würden verkaufte Produkte vom Kanal gehen.`); process.exit(1); }
if (PHASE === 'abwaehlen' && LIVE && mitRating < MIN_BEWERTET) { console.log(`ABBRUCH: Nur ${mitRating} Produkte mit Bewertungsfeld gelesen (erwartet über ${MIN_BEWERTET}); ohne sie würden gut bewertete Produkte vom Kanal gehen.`); process.exit(1); }
if (!p.ok && PHASE !== 'zuruecksetzen') process.exit(2);   // die volle Rücknahme darf auch bei verdächtigem Plan laufen: sie stellt nur Eigenes zurück
const art = PHASE === 'abwaehlen' ? 'abwaehlen' : 'aufnehmen';           // Art der Mutation (Unpublish oder Publish)
let ziele = PHASE === 'abwaehlen' ? p.abwaehlen : PHASE === 'aufnehmen' ? p.aufnehmen : p.zuruecksetzen;
if (ONLY.length) {
  ziele = ziele.filter(x => ONLY.includes(x.handle));
  if (!ziele.length) { console.log(`ABBRUCH: ONLY nennt keinen Handle, der in dieser Phase etwas zu tun hat (${ONLY.join(', ')}).`); process.exit(1); }
}
const fehlerAnzahl = liesFehler();
const gesperrt = ziele.filter(x => (fehlerAnzahl.get(x.id) || 0) >= 3);
if (gesperrt.length) console.log(`HINWEIS: ${gesperrt.length} Produkte schlugen schon dreimal fehl und werden übersprungen (${FEHLERDATEI}), zum Beispiel ${gesperrt.slice(0, 3).map(x => x.handle).join(', ')}.`);
const bereit = ziele.filter(x => (fehlerAnzahl.get(x.id) || 0) < 3).slice(0, MAX);
console.log(`\n${PHASE.toUpperCase()}: ${bereit.length} von ${ziele.length} Produkten${bereit.length < ziele.length - gesperrt.length ? ` (MAX ${MAX} erreicht, der Rest folgt im nächsten Lauf)` : ''}`);
if (!LIVE) { console.log('TROCKENLAUF: nichts geschrieben.'); process.exit(0); }
if (!bereit.length) { console.log('Nichts zu tun.'); process.exit(0); }
if (PHASE !== 'abwaehlen' && man.kaputt) { console.log(`ABBRUCH: ${man.kaputt} kaputte Manifest-Zeilen: eine Rücknahme könnte Produkte übersehen. Manifest prüfen.`); process.exit(1); }

// Das Manifest muss schreibbar sein, BEVOR das erste Produkt vom Kanal geht (sonst gäbe es abgewählte Produkte ohne Spur).
try {
  mkdirSync(dirname(MANIFEST), { recursive: true });
  if (existsSync(MANIFEST)) { const b = readFileSync(MANIFEST); umbruchNoetig = b.length > 0 && b[b.length - 1] !== 10; }
  appendFileSync(MANIFEST, '');
} catch (e) { console.log(`ABBRUCH: Manifest ${MANIFEST} nicht schreibbar: ${String(e.message).slice(0, 120)}`); process.exit(1); }

let gut = 0, schlecht = 0, runde = 0; const t0 = Date.now();
const nameVon = new Map(bereit.map(x => [x.id, x.handle]));
for (const st of stuecke(bereit.map(x => x.id), STUECK)) {
  // Die Freigabe gilt nicht nur beim Start: wer die Datei löscht, stoppt den Lauf vor dem nächsten Stück (Zweitmeinung Codex 28.10.2026, am Code bestätigt).
  if (LIVE && !existsSync(FREIGABE)) {
    console.log(`ABBRUCH nach ${gut} erfolgreichen: die Freigabedatei ist weg (Stopp). Das nächste Stück wurde nicht begonnen, der Rest bleibt für den nächsten Lauf.`);
    process.exit(4);
  }
  // Absicht VOR dem Aufruf: stürzt der Lauf mitten im Stück ab (oder meldet Shopify einen Teilfehler), bleiben die schon entveröffentlichten Produkte rückholbar.
  if (PHASE === 'abwaehlen') anhaengen(MANIFEST, st.map(id => manifestZeile(id, undefined, heute(), 'ab-versucht')).join('\n') + '\n');
  let antwort;
  try { antwort = await q(mutation(st, art)); }
  catch (e) {
    console.log(`ABBRUCH nach ${gut} erfolgreichen: ${String(e.message).slice(0, 200)} (Drosselung oder Fehler; der nächste Lauf macht weiter; das laufende Stück steht als «ab-versucht» im Manifest, PHASE=pruefen zeigt den echten Stand).`);
    process.exit(4);
  }
  const r = auswerten(antwort, st, art);
  if (r.ok.length && PHASE !== 'abwaehlen') anhaengen(MANIFEST, r.ok.map(id => manifestZeile(id, undefined, heute(), 'auf')).join('\n') + '\n');
  if (r.fehlgeschlagen.length) appendFileSync(FEHLERDATEI, r.fehlgeschlagen.map(f => `${f.id}\t${heute()}\t${String(f.meldung).replace(/\s+/g, ' ').slice(0, 120)}`).join('\n') + '\n');
  gut += r.ok.length; schlecht += r.fehlgeschlagen.length;
  for (const f of r.fehlgeschlagen.slice(0, 3)) console.log(`  FEHLER ${nameVon.get(f.id)}: ${f.meldung}`);
  if (++runde % 25 === 0) console.log(`  ${gut + schlecht} / ${bereit.length} · erfolgreich ${gut} · Fehler ${schlecht} · ${Math.round((Date.now() - t0) / 1000)} s`);
  if (schlecht > 100 && schlecht / (gut + schlecht) > 0.05) { console.log('ABBRUCH: mehr als 5 % Fehlschläge.'); process.exit(3); }
}
console.log(`FERTIG: erfolgreich ${gut}, Fehler ${schlecht}, ${Math.round((Date.now() - t0) / 1000)} s. Nächster Schritt: PHASE=pruefen.`);
process.exit(schlecht ? 3 : 0);
