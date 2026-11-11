// Wegweiser-Sammlung `aus-tiktok-und-instagram` ordnen (11.11.2026).
//
// Warum: /ig, /tt und /yt führen auf diese Sammlung (manuelle Sortierung). Seite 1 zeigt 24 Produkte. Die Produkte der
// kommenden Beiträge (16. bis 28.11.) standen auf den Plätzen 28 bis 39, also erst auf Seite 2 (Gegenprüfung 11.11.,
// gemessen 14:57 UTC). Dieses Skript stellt sie nach Beitragsdatum nach vorn; alle übrigen behalten ihre heutige
// Reihenfolge dahinter.
//
// Reihenfolge vorn: Pakete aus ../../sw1611/*/pack.json mit tag 16. bis 21.11., dann ../*/pack.json mit tag 22. bis
// 28.11.; je Tag nach dem frühesten Termin. Termine vor heute (Schweizer Zeit) zählen nicht mehr als «kommend».
// Ein Produkt kommt nur nach vorn, wenn es in der Sammlung steht (per ID aus der frischen Admin-Lesung) und ACTIVE ist.
//
// Aufruf:  node ordnen.mjs                               Trockenlauf (Vorgabe): frisch lesen, Plan zeigen, nichts schreiben
//          LIVE=1 node ordnen.mjs                        Sicherung ordnen_sicherung.json (neu, nie überschreiben), nötige
//                                                        Züge per collectionReorderProducts, bis 90 s frisch lesen,
//                                                        ganze Reihenfolge mit dem Soll vergleichen (Exit 0 nur bei Gleichheit)
//          MIT_GIRLANDE=1 [LIVE=1] node ordnen.mjs       nimmt vorher die Rattan-Girlande auf (nur ACTIVE, ohne Sperr-Tag,
//                                                        im Onlineshop, kaufbar); ohne Schalter wird sie übersprungen
//          ZURUECK=1 [LIVE=1] node ordnen.mjs            stellt die gesicherte Reihenfolge her; eine aufgenommene Girlande
//                                                        bleibt drin (ans Ende), ausser mit ZURUECK_GIRLANDE=1
// Exit: 0 gut | 1 Abweichung oder nicht bestätigt | 2 Abbruch vor dem Schreiben | 3 Shopify meldet Fehler beim Schreiben
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tagInZuerich, paketeLesen, sollBerechnen, zuegeBerechnen, abweichungen } from './ordnen_lib.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const SW2211 = process.env.PAKETE_2211 || dirname(HIER);
const SW1611 = process.env.PAKETE_1611 || join(dirname(HIER), '..', 'sw1611');
const SICHERUNG = process.env.SICHERUNG || join(HIER, 'ordnen_sicherung.json');
const LIVE = process.env.LIVE === '1', ZURUECK = process.env.ZURUECK === '1';
const MIT_GIRLANDE = process.env.MIT_GIRLANDE === '1', ZURUECK_GIRLANDE = process.env.ZURUECK_GIRLANDE === '1';
const ZEIT = Number(process.env.ORDNEN_ZEIT || 1); // nur für die Attrappe: staucht Wartezeiten
// Warten: höchstens 30 Lesungen im Takt von 3 s und höchstens 90 s echte Zeit. Die Frist zählt in Versuchen, damit
// eine gestauchte Testuhr nicht zum Flackern führt (Lehre 09.11.).
const TAKT_MS = 3000 * ZEIT, MAX_VERSUCHE = 30, FRIST_ECHT_MS = 90000;
const JETZT = process.env.JETZT ? new Date(process.env.JETZT) : new Date();
const SAMMLUNG = 'aus-tiktok-und-instagram';
const GIRLANDE = 'weihnachts-rattan-girlande-mit-zapfen-und-schl-616100';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const API = '2026-01';
const SEITE = 24; // Produkte auf Seite 1 der Sammlung (Storefront gemessen 11.11. 14:58 UTC)
// Wie wegweiser_aufnehmen.mjs: `rueckhol` ist bewusst kein Sperrgrund (Chargen-Tag rueckhol-0907).
const SPERRE = /nicht-live|nicht-bewerben|gesperrt|adult|18plus|compliance|lizenz|stecker-nicht-ch|grind-gehalten|google-bild-abgelehnt/i;
const FENSTER = [
  { name: 'sw1611', ordner: SW1611, von: '2026-11-16', bis: '2026-11-21' },
  { name: 'sw2211', ordner: SW2211, von: '2026-11-22', bis: '2026-11-28' },
];

const schlaf = (ms) => new Promise((r) => setTimeout(r, ms));
let token = null, gesendet = false; // gesendet: ab hier hat das Skript einen Schreibaufruf abgeschickt
async function gql(query, variables = {}) {
  if (!token) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.SHOPIFY_CLIENT_ID, client_secret: process.env.SHOPIFY_CLIENT_SECRET, grant_type: 'client_credentials' }) });
    const j = await r.json(); if (!j.access_token) throw new Error('kein Zugang (Client-Credentials)'); token = j.access_token;
  }
  if (/^\s*mutation/.test(query)) gesendet = true;
  for (let v = 1; ; v++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token }, body: JSON.stringify({ query, variables }) });
    const j = await r.json();
    const gedrosselt = r.status === 429 || (j.errors || []).some((e) => e?.extensions?.code === 'THROTTLED');
    // Nur Lesungen werden wiederholt. Schreibaufrufe nie (Lehre 09.11.: ein Abbruch heisst nicht «nichts passiert»).
    if (gedrosselt && !/^\s*mutation/.test(query) && v < 4) { await schlaf(2000 * v * ZEIT); continue; }
    if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors).slice(0, 400));
    return j.data;
  }
}

async function sammlungLesen(streng = false) {
  const ids = [], handles = new Map(); let after = null, kopf = null;
  for (;;) {
    const d = await gql(`query($h:String!,$a:String){ c: collectionByIdentifier(identifier:{handle:$h}){ id handle sortOrder ruleSet{ appliedDisjunctively } productsCount{ count } products(first:250, after:$a, sortKey:COLLECTION_DEFAULT){ pageInfo{ hasNextPage endCursor } nodes{ id handle status } } } }`, { h: SAMMLUNG, a: after });
    const c = d.c; if (!c) throw new Error('Sammlung fehlt: ' + SAMMLUNG);
    kopf = { id: c.id, handle: c.handle, sortOrder: c.sortOrder, regel: c.ruleSet, anzahl: c.productsCount?.count };
    for (const n of c.products.nodes) { ids.push(n.id); handles.set(n.id, n.handle); }
    if (!c.products.pageInfo.hasNextPage) break; after = c.products.pageInfo.endCursor;
  }
  if (new Set(ids).size !== ids.length) throw new Error('Sammlung liefert doppelte Produkte (Lesung unsicher)');
  const zaehlerOk = typeof kopf.anzahl !== 'number' || kopf.anzahl === ids.length;
  // Vor dem Schreiben streng: ein Zähler, der nicht zur Liste passt, heisst «Lesung unsicher». Nach einem Schreibaufruf
  // kann der Zähler kurz nachhinken; dort zählt die Lesung dann nur als «noch nicht bestätigt».
  if (streng && !zaehlerOk) throw new Error(`Sammlung meldet ${kopf.anzahl} Produkte, gelesen ${ids.length} (Lesung unsicher)`);
  return { ...kopf, ids, handles, zaehlerOk };
}
const PRODUKT = `id handle title status tags onlineStoreUrl variants(first:50){ nodes{ availableForSale } }`;
async function produktLesen(id, handle) {
  if (id) { const d = await gql(`query($id:ID!){ p: product(id:$id){ ${PRODUKT} } }`, { id }); if (d.p) return d.p; }
  if (handle) { const d = await gql(`query($h:String!){ p: productByIdentifier(identifier:{handle:$h}){ ${PRODUKT} } }`, { h: handle }); return d.p; }
  return null;
}
async function jobFertig(id) {
  if (!id) return true;
  const d = await gql(`query($id:ID!){ job(id:$id){ id done } }`, { id });
  return !!d.job?.done;
}
const kurz = (id) => String(id).split('/').pop();

function abbruch(text, code = 2) {
  console.error('ABBRUCH: ' + text);
  if (gesendet && code === 2) { console.error('Ein Schreibaufruf war schon abgeschickt: Zustand frisch lesen (Trockenlauf), nicht blind wiederholen.'); code = 1; }
  process.exit(code);
}
function pruefeSammlung(s) {
  if (s.regel) abbruch('Sammlung ist automatisch (Regel), manuelle Reihenfolge nicht möglich');
  if (s.sortOrder !== 'MANUAL') abbruch(`Sortierung ist ${s.sortOrder}, nicht MANUAL: nichts geändert`);
}
function sicherungAnlegen(inhalt) {
  try { writeFileSync(SICHERUNG, JSON.stringify(inhalt, null, 1), { flag: 'wx' }); }
  catch (e) {
    if (e.code === 'EEXIST') abbruch(`Sicherung ${basename(SICHERUNG)} gibt es schon (ältere Reihenfolge). Nichts geändert. Erst ZURUECK=1 LIVE=1 oder die Datei bewusst umbenennen.`);
    abbruch('Sicherung nicht schreibbar: ' + e.message);
  }
  console.log(`Sicherung geschrieben: ${SICHERUNG}`);
}

// Nach bestätigter Rücknahme: Sicherung umbenennen (nie löschen), damit ein neuer LIVE-Lauf wieder möglich ist.
function sicherungAblegen() {
  const ziel = SICHERUNG.replace(/\.json$/, '') + '.zurueck-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json';
  renameSync(SICHERUNG, ziel);
  console.log(`Sicherung abgelegt als ${basename(ziel)} (ein neuer LIVE-Lauf ist damit wieder möglich).`);
}

// Wartet, bis die Reihenfolge dem Soll entspricht (Job ist asynchron). Höchstens 90 s.
async function warteAufReihenfolge(jobId, soll) {
  const ende = Date.now() + FRIST_ECHT_MS; let fertigGesehen = 0, ist = null;
  for (let v = 0; v < MAX_VERSUCHE && Date.now() < ende; v++) {
    await schlaf(TAKT_MS);
    const fertig = await jobFertig(jobId);
    ist = await sammlungLesen();
    if (ist.zaehlerOk && ist.ids.join(',') === soll.join(',')) return { ok: true, ist, fertig };
    if (fertig && ++fertigGesehen >= 2) return { ok: false, ist, fertig, grund: 'Job fertig, Reihenfolge weicht ab' };
  }
  return { ok: false, ist, fertig: false, grund: 'Frist abgelaufen (30 Lesungen, höchstens 90 s)' };
}
async function warteAufMitglied(id, drin) {
  const ende = Date.now() + FRIST_ECHT_MS; let s = null;
  for (let v = 0; v < MAX_VERSUCHE && Date.now() < ende; v++) {
    await schlaf(TAKT_MS);
    s = await sammlungLesen();
    if (s.zaehlerOk && s.ids.includes(id) === drin) return { ok: true, s };
  }
  return { ok: false, s };
}

async function umordnen(sammlungId, aktuell, soll, namen) {
  const zuege = zuegeBerechnen(aktuell, soll);
  if (!zuege.length) return { zuege, job: null };
  if (zuege.length > 250) abbruch(`${zuege.length} Züge: Shopify nimmt höchstens 250 je Aufruf, nicht vorgesehen`);
  console.log(`Sende ${zuege.length} Züge (collectionReorderProducts):`);
  for (const z of zuege) console.log(`  ${namen(z.id)} → Platz ${Number(z.newPosition) + 1}`);
  const d = await gql(`mutation($id:ID!,$m:[MoveInput!]!){ collectionReorderProducts(id:$id, moves:$m){ job{ id done } userErrors{ field message } } }`, { id: sammlungId, m: zuege });
  const r = d.collectionReorderProducts;
  if (r.userErrors.length) abbruch('Shopify meldet: ' + JSON.stringify(r.userErrors), 3);
  return { zuege, job: r.job?.id || null };
}

function zeigeReihenfolge(titel, ids, namen, markiert = new Set()) {
  console.log(titel);
  ids.forEach((id, i) => {
    if (i === SEITE) console.log('  ---- ab hier Seite 2 ----');
    console.log(`  ${String(i + 1).padStart(2)} ${markiert.has(id) ? '*' : ' '} ${namen(id)}`);
  });
}

async function ergebnisPruefen(soll, namen, warten) {
  const nachher = await sammlungLesen(); // ganze Reihenfolge frisch, unabhängig von der Warteschleife
  const gleich = nachher.zaehlerOk && nachher.ids.join(',') === soll.join(',');
  console.log(`NACHGELESEN ${SAMMLUNG}: ${nachher.ids.length} Produkte | ${gleich ? 'OK, gleich dem Soll' : 'ABWEICHUNG'}${warten && !warten.ok ? ' (' + warten.grund + ')' : ''}`);
  if (!gleich) for (const a of abweichungen(nachher.ids, soll)) console.log(`  Platz ${a.platz}: ist ${a.ist ? namen(a.ist) : '(leer)'} | soll ${a.soll ? namen(a.soll) : '(leer)'}`);
  return gleich;
}

// ---------------------------------------------------------------- Rücknahme
async function zurueck() {
  if (!existsSync(SICHERUNG)) abbruch(`keine Sicherung ${SICHERUNG}: nichts zurückzunehmen`);
  const sich = JSON.parse(readFileSync(SICHERUNG, 'utf8'));
  let s = await sammlungLesen(true); pruefeSammlung(s);
  if (s.id !== sich.sammlung.id) abbruch(`Sicherung gehört zu ${sich.sammlung.id}, gelesen ${s.id}`);
  const alt = sich.vorher.map((x) => x.id);
  const namenMap = new Map([...sich.vorher.map((x) => [x.id, x.handle]), ...s.handles]);
  const namen = (id) => namenMap.get(id) || kurz(id);
  const g = sich.girlande || {};
  const girlandeRaus = ZURUECK_GIRLANDE && g.aufnehmen && !g.war_drin && g.id && s.ids.includes(g.id);
  if (ZURUECK_GIRLANDE && !girlandeRaus) console.log('ZURUECK_GIRLANDE: die Girlande wurde laut Sicherung nicht von diesem Skript aufgenommen oder steht nicht mehr drin. Sie bleibt, wie sie ist.');
  const basis = girlandeRaus ? s.ids.filter((id) => id !== g.id) : s.ids;
  const fehlt = alt.filter((id) => !basis.includes(id));
  const neu = basis.filter((id) => !alt.includes(id));
  const soll = [...alt.filter((id) => basis.includes(id)), ...neu];
  console.log(`Rücknahme aus ${basename(SICHERUNG)} (gesichert ${sich.zeit}): ${alt.length} Produkte gesichert, heute ${s.ids.length}`);
  if (fehlt.length) console.log(`  nicht mehr in der Sammlung (übersprungen): ${fehlt.map(namen).join(', ')}`);
  if (neu.length) console.log(`  seither neu (kommen ans Ende, in heutiger Folge): ${neu.map(namen).join(', ')}`);
  if (girlandeRaus) console.log(`  Girlande wird herausgenommen (ZURUECK_GIRLANDE=1): ${namen(g.id)}`);
  const zuege = zuegeBerechnen(basis, soll);
  console.log(`Plan: ${girlandeRaus ? '1 Herausnahme, ' : ''}${zuege.length} Züge.`);
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); return 0; }
  if (!girlandeRaus && s.ids.join(',') === soll.join(',')) { console.log('Schon in gesicherter Reihenfolge. Nichts zu tun.'); sicherungAblegen(); return 0; }
  if (girlandeRaus) {
    const d = await gql(`mutation($id:ID!,$p:[ID!]!){ collectionRemoveProducts(id:$id, productIds:$p){ job{ id done } userErrors{ field message } } }`, { id: s.id, p: [g.id] });
    if (d.collectionRemoveProducts.userErrors.length) abbruch('Shopify meldet: ' + JSON.stringify(d.collectionRemoveProducts.userErrors), 3);
    const w = await warteAufMitglied(g.id, false);
    if (!w.ok) { console.error('ABWEICHUNG: Girlande nach 90 s noch in der Sammlung. Sicherung bleibt.'); return 1; }
    s = w.s; console.log('Girlande herausgenommen, frisch nachgelesen.');
  }
  const soll2 = [...alt.filter((id) => s.ids.includes(id)), ...s.ids.filter((id) => !alt.includes(id))];
  const { zuege: z2, job } = await umordnen(s.id, s.ids, soll2, namen);
  const w = z2.length ? await warteAufReihenfolge(job, soll2) : null;
  const ok = await ergebnisPruefen(soll2, namen, w);
  if (ok) sicherungAblegen(); else console.log('Sicherung bleibt liegen.');
  return ok ? 0 : 1;
}

// ---------------------------------------------------------------- Vorwärts
async function vorwaerts() {
  const heute = tagInZuerich(JETZT);
  const s = await sammlungLesen(true); pruefeSammlung(s);
  console.log(`Sammlung ${SAMMLUNG} (${s.id}): ${s.ids.length} Produkte, Sortierung ${s.sortOrder}. Heute ${heute} (Schweizer Zeit).`);
  const { pakete, hinweise } = paketeLesen(FENSTER);
  for (const h of hinweise) console.log('  Hinweis: ' + h);
  const namenMap = new Map(s.handles);
  const namen = (id) => namenMap.get(id) || kurz(id);

  const vorn = [], meldungen = [];
  let girlande = { handle: GIRLANDE, id: null, aufnehmen: false, war_drin: false };
  console.log(`Pakete im Fenster 16. bis 28.11.: ${pakete.length}`);
  for (const p of pakete) {
    const zeile = `  ${p.tag} ${p.handle} [${p.quelle}${p.entwuerfe ? ', Entwürfe angelegt' : ', noch keine Entwürfe in angelegt.json'}]`;
    if (p.tag < heute) { console.log(zeile + ': Termin vorbei, nicht vorn'); meldungen.push(`vorbei: ${p.handle}`); continue; }
    const id = p.produkt_id && s.ids.includes(p.produkt_id) ? p.produkt_id : [...s.handles].find(([, h]) => h === p.handle)?.[0] || null;
    const prod = await produktLesen(id || p.produkt_id, p.handle);
    if (!prod) { console.log(zeile + ': Produkt im Shop nicht gefunden, nicht vorn'); meldungen.push(`nicht gefunden: ${p.handle}`); continue; }
    namenMap.set(prod.id, prod.handle);
    if (p.produkt_id && prod.id !== p.produkt_id) { console.log(zeile + `: pack.json nennt ${kurz(p.produkt_id)}, Shop hat ${kurz(prod.id)} für diesen Handle, nicht vorn`); meldungen.push(`ID weicht ab: ${p.handle}`); continue; }
    if (prod.handle !== p.handle) console.log(`    Hinweis: Handle im Shop heute ${prod.handle}`);
    const drin = s.ids.includes(prod.id);
    const kaufbar = prod.variants.nodes.some((v) => v.availableForSale);
    const sperre = prod.tags.find((t) => SPERRE.test(t));
    const extra = [!prod.onlineStoreUrl && 'nicht im Onlineshop', !kaufbar && 'keine kaufbare Variante', sperre && 'Sperr-Tag ' + sperre].filter(Boolean);
    if (p.handle === GIRLANDE && !drin) {
      girlande = { handle: prod.handle, id: prod.id, aufnehmen: false, war_drin: false };
      if (!MIT_GIRLANDE) { console.log(zeile + ': nicht in der Sammlung, ohne MIT_GIRLANDE=1 übersprungen'); meldungen.push('Girlande übersprungen (kein Schalter)'); continue; }
      const grund = prod.status !== 'ACTIVE' ? 'Status ' + prod.status : extra[0] || null;
      if (grund) { console.log(zeile + `: nicht aufgenommen (${grund})`); meldungen.push(`Girlande nicht aufgenommen: ${grund}`); continue; }
      girlande.aufnehmen = true; vorn.push(prod.id);
      console.log(zeile + `: wird aufgenommen (MIT_GIRLANDE=1) und vorn eingereiht | geprüft: Status ${prod.status}, im Onlineshop, kaufbar, kein Sperr-Tag (Tags: ${prod.tags.length})`);
      continue;
    }
    if (p.handle === GIRLANDE) girlande = { handle: prod.handle, id: prod.id, aufnehmen: false, war_drin: true };
    if (!drin) { console.log(zeile + ': nicht in der Sammlung, nicht vorn'); meldungen.push(`nicht in der Sammlung: ${p.handle}`); continue; }
    if (prod.status !== 'ACTIVE') { console.log(zeile + `: Status ${prod.status}, bleibt hinten`); meldungen.push(`nicht aktiv: ${p.handle} (${prod.status})`); continue; }
    vorn.push(prod.id);
    console.log(zeile + `: vorn, heute Platz ${s.ids.indexOf(prod.id) + 1}${extra.length ? ' | Hinweis: ' + extra.join(', ') : ''}`);
  }

  // Für den Plan: eine aufzunehmende Girlande steht nach collectionAddProducts zunächst hinten.
  const basis = girlande.aufnehmen ? [...s.ids, girlande.id] : s.ids;
  const soll = sollBerechnen(basis, vorn);
  const zuege = zuegeBerechnen(basis, soll);
  const v = new Set(vorn);
  zeigeReihenfolge(`Soll-Reihenfolge (* = kommender Beitrag, ${vorn.length} vorn):`, soll, namen, v);
  const vonSeite1 = s.ids.slice(0, SEITE).filter((id) => soll.indexOf(id) >= SEITE);
  if (vonSeite1.length) console.log(`Rutschen von Seite 1 auf Seite 2: ${vonSeite1.map(namen).join(', ')}`);
  console.log(`Plan: ${girlande.aufnehmen ? 'Girlande aufnehmen, ' : ''}${zuege.length} Züge${zuege.length ? ': ' + zuege.map((z) => `${namen(z.id)}→${Number(z.newPosition) + 1}`).join(', ') : ''}.`);
  if (meldungen.length) console.log('Gemeldet: ' + meldungen.join(' | '));
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben.'); return 0; }

  if (!girlande.aufnehmen && !zuege.length) { console.log('Alles schon im Soll-Stand. Nichts zu tun.'); return 0; }
  sicherungAnlegen({
    zeit: new Date().toISOString(), skript: 'ordnen.mjs', sammlung: { id: s.id, handle: s.handle }, sortOrder: s.sortOrder,
    vorher: s.ids.map((id) => ({ id, handle: s.handles.get(id) })), soll_geplant: soll, girlande,
  });
  let jetzt = s;
  if (girlande.aufnehmen) {
    const d = await gql(`mutation($id:ID!,$p:[ID!]!){ collectionAddProducts(id:$id, productIds:$p){ userErrors{ field message } } }`, { id: s.id, p: [girlande.id] });
    if (d.collectionAddProducts.userErrors.length) abbruch('Shopify meldet: ' + JSON.stringify(d.collectionAddProducts.userErrors), 3);
    const w = await warteAufMitglied(girlande.id, true);
    if (!w.ok) { console.error('ABWEICHUNG: Girlande nach 90 s nicht in der Sammlung. Keine Umordnung gesendet.'); return 1; }
    jetzt = w.s; console.log(`Girlande aufgenommen, frisch nachgelesen (Platz ${jetzt.ids.indexOf(girlande.id) + 1} von ${jetzt.ids.length}).`);
  }
  // Soll aus der frischen Lesung neu rechnen (falls sich zwischen Plan und Schreiben etwas bewegt hat).
  const vornJetzt = vorn.filter((id) => jetzt.ids.includes(id));
  if (vornJetzt.length !== vorn.length) console.log('Hinweis: ein Produkt ist zwischenzeitlich aus der Sammlung verschwunden: ' + vorn.filter((id) => !jetzt.ids.includes(id)).map(namen).join(', '));
  const soll2 = sollBerechnen(jetzt.ids, vornJetzt);
  const { zuege: z2, job } = await umordnen(jetzt.id, jetzt.ids, soll2, namen);
  const w = z2.length ? await warteAufReihenfolge(job, soll2) : null;
  return (await ergebnisPruefen(soll2, namen, w)) ? 0 : 1;
}

try {
  process.exitCode = ZURUECK ? await zurueck() : await vorwaerts();
} catch (e) {
  console.error('FEHLER: ' + e.message);
  if (gesendet) console.error('Ein Schreibaufruf war schon abgeschickt: Zustand frisch lesen (Trockenlauf), nicht blind wiederholen.');
  process.exitCode = gesendet ? 1 : 2;
}
