#!/usr/bin/env node
/**
 * Zweite Trend-Zeile „✨ Neu entdeckt": coole Ware, die noch NICHT gekauft wurde.
 *
 * AUFTRAG (Besitzer 25.10.2026): „gerade im trend sind nur sachen wo man gekauft hat — machst du
 * noch eine andere trend zeile, wo man andere coole produkte sieht als gekaufte". Die Reihe
 * „🔥 Gerade im Trend" (`hype-jetzt`, BEST_SELLING) zeigt seit dem 24.10. absichtlich nur die
 * gemessenen Verkäufer (dropship/TOP-PRODUKTE-STARTSEITE-2410.md). Diese Zeile ist das Gegenstück.
 *
 * Was das Skript tut: Kandidaten aus den Trend-Markierungen lesen, alles Gekaufte (letzte TAGE
 * Tage) und alles Gesperrte ausschliessen, Bild-Qualität und CJ-Lieferbarkeit CN→CH MESSEN, die
 * Fracht in die Marge rechnen, und höchstens MAX_JE_TYP Stück je Warengruppe nehmen. Die Logik
 * steht in lib/trend_auswahl.mjs (mit Test); hier steht nur die Messung.
 *
 * ES IST KEIN VERKAUFSURTEIL. Die Ware wurde nie gekauft; die Reihenfolge kommt aus Markierungen
 * früherer Sitzungen plus Marge. Darum heisst die Kollektion „Neu entdeckt", nicht „Bestseller".
 *
 * DER LAUF IST KLEIN: jede CJ-Prüfung kostet Tagespunkte (MAXPRUEF, Deckel 100). Vorgabe ist der
 * TROCKENLAUF; geschrieben wird nur mit LIVE=1.
 *
 * Schalter:
 *   LIVE=1        Tag setzen, Kollektion anlegen + publizieren + ordnen (sonst nur messen)
 *   SCAN          Obergrenze für die grosse Video-Hit-Schicht   (Vorgabe 800, Deckel 3000)
 *   MAXPRUEF      wie viele Kandidaten bei CJ gemessen werden   (Vorgabe 40, Deckel 100)
 *   ZIEL          wie viele Produkte in die Zeile kommen        (Vorgabe 16, Deckel 24)
 *   MAX_JE_TYP    höchstens so viele je Warengruppe             (Vorgabe 2)
 *   MIN_MARGE     Rohmarge VK−EK in CHF                         (Vorgabe 12)
 *   MIN_NETTO     Marge nach Fracht, CHF                        (Vorgabe 5)
 *   TAGE          Zeitraum für „gekauft"                        (Vorgabe 90)
 *   TAG / COLL_HANDLE      Markierung und Kollektions-Handle    (trend-entdecken / neu-entdeckt)
 */
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { cjFetch } from './lib/cj_fetch.mjs';
import { cjToken } from './lib/cj_token.mjs';
import { lieferurteil, CJ_UNBEKANNT, CJ_AUSGELISTET } from './lib/lieferbarkeit.mjs';
import { pruefeKandidat, trendScore, waehleVielfalt, typSchluessel, nettoMarge } from './lib/trend_auswahl.mjs';

const num = (v, d, max) => Math.min(Number.isFinite(parseFloat(v)) ? parseFloat(v) : d, max ?? Infinity);
const SHOP = process.env.SHOPIFY_SHOP || '', TOK_ST = process.env.SHOPIFY_ADMIN_TOKEN || '',
  CID = process.env.SHOPIFY_CLIENT_ID || '', CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET) || '',
  LIVE = process.env.LIVE === '1', API = '2025-01',
  SCAN = num(process.env.SCAN, 800, 3000), MAXPRUEF = num(process.env.MAXPRUEF, 40, 100),
  ZIEL = num(process.env.ZIEL, 16, 24), MAX_JE_TYP = num(process.env.MAX_JE_TYP, 2),
  MIN_MARGE = num(process.env.MIN_MARGE, 12), MIN_NETTO = num(process.env.MIN_NETTO, 5),
  MAX_PREIS = num(process.env.MAX_PREIS, 100),
  // Jahreszeit: Sommerware im Herbst gehört nicht in „Neu entdeckt". MONAT=1..12 überschreibt den Kalender.
  MONAT = process.env.MONAT ? parseInt(process.env.MONAT, 10) : new Date().getMonth() + 1,
  // Seiten mit nachweislich viel Besuch und KEINEM Warenkorb (ShopifyQL, 30 Tage) — nur mit genug Besuch sagt das etwas.
  // Stand 25.10.2026: `abendkleid-aurora-satin-spaghettitrager-schlitz` 158 Sitzungen, 0 Warenkörbe; alle anderen < 20 Sitzungen.
  AUSSCHLUSS = new Set((process.env.AUSSCHLUSS || 'abendkleid-aurora-satin-spaghettitrager-schlitz').split(',').map(s => s.trim()).filter(Boolean)),
  TAGE = num(process.env.TAGE, 90), USD_CHF = num(process.env.USD_CHF, 0.82435),
  TAG = process.env.TAG || 'trend-entdecken', COLL_HANDLE = process.env.COLL_HANDLE || 'neu-entdeckt',
  TITEL = '✨ Neu entdeckt',
  CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';

// Die kleinen, stark markierten Schichten werden VOLLSTÄNDIG gelesen; die grosse (≈1000) nur bis SCAN.
const POOL_KLEIN = 'status:active AND (tag:hype-jetzt OR tag:nachfrage-liebling OR tag:kunden-liebling OR tag:such-boost)';
const POOL_GROSS = 'status:active AND tag:video-hit AND tag:viral';

const schlaf = ms => new Promise(r => setTimeout(r, ms));
const gql = (t, q, v) => shopifyGql(SHOP, API, t, q, v);

async function shopToken() {
  if (!(CID && CS) && TOK_ST) return TOK_ST;
  if (SHOP && CID && CS) {
    const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: CID, client_secret: CS, grant_type: 'client_credentials' }) });
    const j = await r.json().catch(() => ({})); return j.access_token || '';
  }
  return TOK_ST || '';
}

/** Handles aller Produkte, die in den letzten TAGE Tagen in irgendeiner Bestellung standen. */
async function gekaufteHandles(tok) {
  const ab = new Date(Date.now() - TAGE * 864e5).toISOString().slice(0, 10);
  const set = new Set(); let cur = null, bestellungen = 0;
  for (;;) {
    const d = await gql(tok, `query($c:String,$q:String){orders(first:50,after:$c,query:$q){pageInfo{hasNextPage endCursor}
      nodes{lineItems(first:50){nodes{product{handle}}}}}}`, { c: cur, q: `created_at:>=${ab}` });
    for (const o of d.orders.nodes) { bestellungen++; for (const li of o.lineItems.nodes) if (li.product?.handle) set.add(li.product.handle); }
    if (!d.orders.pageInfo.hasNextPage) break;
    cur = d.orders.pageInfo.endCursor;
  }
  return { set, bestellungen };
}

/** Liest Produkte einer Suche (bis max) und bringt sie in die Form, die pruefeKandidat erwartet. */
async function lies(tok, q, max) {
  const out = []; let cur = null;
  while (out.length < max) {
    const d = await gql(tok, `query($c:String,$q:String){products(first:50,after:$c,sortKey:UPDATED_AT,reverse:true,query:$q){
      pageInfo{hasNextPage endCursor}
      nodes{id handle title description(truncateAt:500) tags productType createdAt mediaCount{count}
        variants(first:1){nodes{sku price inventoryItem{unitCost{amount}}}}}}}`, { c: cur, q });
    for (const n of d.products.nodes) {
      const v = n.variants.nodes[0] || {};
      out.push({ id: n.id, handle: n.handle, title: n.title, beschreibung: n.description, tags: n.tags || [],
        productType: n.productType || '', createdAt: n.createdAt, bild: (n.mediaCount?.count || 0) > 0 ? 'vorhanden' : '',
        sku: v.sku || '', preis: parseFloat(v.price), ekChf: v.inventoryItem?.unitCost ? parseFloat(v.inventoryItem.unitCost.amount) : NaN });
    }
    if (!d.products.pageInfo.hasNextPage) break;
    cur = d.products.pageInfo.endCursor;
  }
  return out.slice(0, max);
}

/** Mindestens 3 fertige Medien, das erste Bild mindestens 800 px breit (wie das Bild-Audit). */
async function bildCheck(tok, kand) {
  const ok = [], fehl = [];
  for (let i = 0; i < kand.length; i += 20) {
    const teil = kand.slice(i, i + 20);
    const d = await gql(tok, `query($ids:[ID!]!){nodes(ids:$ids){... on Product{id media(first:6){nodes{status ... on MediaImage{image{width height}}}}}}}`, { ids: teil.map(p => p.id) });
    const je = new Map((d.nodes || []).filter(Boolean).map(n => [n.id, n.media.nodes]));
    for (const p of teil) {
      const m = je.get(p.id) || [];
      const fertig = m.filter(x => x.status === 'READY');
      const erstes = fertig.find(x => x.image);
      if (fertig.length < 3) fehl.push({ handle: p.handle, grund: `nur ${fertig.length} fertige Medien` });
      else if (!(erstes?.image?.width >= 800)) fehl.push({ handle: p.handle, grund: `Hauptbild ${erstes?.image?.width ?? '?'} px` });
      else ok.push(p);
    }
  }
  return { ok, fehl };
}

/** Eine Erhebung je Produkt: CJ lesen, Fracht CN→CH. Wie im Lieferbarkeits-Wächter, plus billigste Linie. */
async function erhebe(tok, sku) {
  const roh = String(sku || '').replace(/^CJ-/, '');
  if (!roh) return { cjCode: null, vid: null, linien: null, minFrachtUsd: NaN };
  const weich = [...CJ_UNBEKANNT, ...CJ_AUSGELISTET];
  const strategien = /^\d{15,}$/.test(roh) ? [{ pid: roh }] : [{ variantSku: roh }, { productSku: roh }];
  let d = null, code = null;
  for (const s of strategien) {
    const q = await cjFetch(`${CJ_BASE}/product/query?` + new URLSearchParams(s),
      { headers: { 'CJ-Access-Token': tok }, context: 'product/query', weicheCodes: weich });
    await schlaf(1200);
    code = Number(q?.code);
    if (q?.result === true && q?.data) { d = q.data; break; }
    if (CJ_AUSGELISTET.includes(code)) return { cjCode: code, vid: null, linien: null, minFrachtUsd: NaN };
  }
  if (!d) return { cjCode: code, vid: null, linien: null, minFrachtUsd: NaN };
  const vs = d.variants || []; const v = vs.find(x => x.variantSku === roh) || vs[0];
  if (!v?.vid) return { cjCode: 200, vid: null, linien: null, minFrachtUsd: NaN };
  const r = await fetch(`${CJ_BASE}/logistic/freightCalculate`, { method: 'POST',
    headers: { 'CJ-Access-Token': tok, 'Content-Type': 'application/json' },
    body: JSON.stringify({ startCountryCode: 'CN', endCountryCode: 'CH', products: [{ quantity: 1, vid: v.vid }] }) });
  const f = await r.json().catch(() => ({})); await schlaf(1200);
  const ok = Number(f?.code) === 200 && Array.isArray(f?.data);
  const preise = ok ? f.data.map(l => Number(l.logisticPrice)).filter(Number.isFinite) : [];
  return { cjCode: 200, vid: v.vid, linien: ok ? f.data.length : null, minFrachtUsd: preise.length ? Math.min(...preise) : NaN };
}

const fehlerIn = (d, pfad) => { const e = d?.[pfad]?.userErrors || []; if (e.length) throw new Error(`${pfad}: ${JSON.stringify(e)}`); };

/** Schreiben: Tag setzen/entfernen, Kollektion anlegen, publizieren wie hype-jetzt, ordnen. */
async function schreibe(tok, gewaehlt) {
  const log = {};
  const bisher = []; let cur = null;
  for (;;) {
    const d = await gql(tok, `query($c:String,$q:String){products(first:100,after:$c,query:$q){pageInfo{hasNextPage endCursor} nodes{id}}}`, { c: cur, q: `tag:${TAG}` });
    bisher.push(...d.products.nodes.map(n => n.id));
    if (!d.products.pageInfo.hasNextPage) break; cur = d.products.pageInfo.endCursor;
  }
  const neu = new Set(gewaehlt.map(p => p.id));
  const weg = bisher.filter(id => !neu.has(id)), dazu = gewaehlt.filter(p => !bisher.includes(p.id));
  const stapel = async (fn, ids) => {
    for (let i = 0; i < ids.length; i += 20) {
      const teil = ids.slice(i, i + 20);
      const q = `mutation{${teil.map((id, k) => `a${k}:${fn}(id:${JSON.stringify(id)},tags:${JSON.stringify([TAG])}){userErrors{field message}}`).join(' ')}}`;
      const d = await gql(tok, q, {});
      for (let k = 0; k < teil.length; k++) fehlerIn(d, `a${k}`);
    }
  };
  await stapel('tagsRemove', weg); await stapel('tagsAdd', dazu.map(p => p.id));
  log.tagEntfernt = weg.length; log.tagGesetzt = dazu.length;

  let c = (await gql(tok, `query($h:String!){collectionByHandle(handle:$h){id handle title}}`, { h: COLL_HANDLE })).collectionByHandle;
  if (!c) {
    const vorbild = (await gql(tok, `{collectionByHandle(handle:"hype-jetzt"){resourcePublicationsV2(first:30){nodes{isPublished publication{id name}}}}}`)).collectionByHandle;
    const d = await gql(tok, `mutation($i:CollectionInput!){collectionCreate(input:$i){collection{id handle title} userErrors{field message}}}`, { i: {
      title: TITEL, handle: COLL_HANDLE, sortOrder: 'MANUAL',
      descriptionHtml: '<p>Frisch ausgewählt: Ideen, die uns im Sortiment aufgefallen sind — von Gadgets bis Wohnen. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.</p>',
      seo: { title: 'Neu entdeckt – ausgewählte Ideen | LuxeStyle CH', description: 'Ausgewählte Ideen aus dem LuxeStyle-Sortiment: Gadgets, Wohnen und mehr. Lieferung in die Schweiz, Gratis-Versand ab CHF 50 nach Rabatt.' },
      ruleSet: { appliedDisjunctively: false, rules: [{ column: 'TAG', relation: 'EQUALS', condition: TAG }] } } });
    fehlerIn(d, 'collectionCreate'); c = d.collectionCreate.collection; log.angelegt = true;
    // PUBLISH-FALLE: eine per API angelegte Kollektion ist NICHT im Onlineshop — Menü-Links liefen schon einmal auf 404.
    const pubs = (vorbild?.resourcePublicationsV2?.nodes || []).filter(n => n.isPublished).map(n => ({ publicationId: n.publication.id }));
    const p = await gql(tok, `mutation($id:ID!,$i:[PublicationInput!]!){publishablePublish(id:$id,input:$i){userErrors{field message}}}`, { id: c.id, i: pubs });
    fehlerIn(p, 'publishablePublish'); log.publiziertIn = pubs.length;
  } else log.angelegt = false;
  log.kollektion = c;

  // Die Mitgliedschaft einer Smart-Collection entsteht verzögert — erst warten, dann ordnen.
  let n = 0;
  for (let i = 0; i < 8; i++) {
    n = (await gql(tok, `query($id:ID!){collection(id:$id){productsCount{count}}}`, { id: c.id })).collection.productsCount.count;
    if (n >= gewaehlt.length) break; await schlaf(5000);
  }
  log.mitglieder = n;
  const moves = gewaehlt.map((p, i) => ({ id: p.id, newPosition: String(i) }));
  const o = await gql(tok, `mutation($id:ID!,$m:[MoveInput!]!){collectionReorderProducts(id:$id,moves:$m){job{id} userErrors{field message}}}`, { id: c.id, m: moves });
  fehlerIn(o, 'collectionReorderProducts'); log.geordnet = true;
  return log;
}

async function main() {
  if (!SHOP) { console.log('no-op: kein SHOPIFY_SHOP.'); return; }
  const stok = await shopToken();
  if (!stok) { console.log('no-op: kein Shopify-Token (Client-Credentials fehlgeschlagen).'); return; }
  const ctok = await cjToken();
  if (!ctok) { console.log('no-op: CJ-Auth fehlgeschlagen oder CJ_EMAIL/CJ_API_KEY fehlen — ohne CJ ist die Lieferbarkeit nicht messbar.'); return; }

  const bericht = { ts: new Date().toISOString(), live: LIVE, region: `Schichten: klein (alle) + video-hit&viral (bis ${SCAN}, UPDATED_AT absteigend)`,
    gekaufteBestellungen: 0, gekaufteProdukte: 0, gelesen: 0, gruende: {}, vorauswahl: 0, bilder: { ok: 0, fehl: [] },
    cj: { geprueft: 0, lieferbar: 0, nichtLieferbar: 0, unbekannt: 0, nettoZuDuenn: 0, abbruch: null }, gewaehlt: [] };

  const { set: gekauft, bestellungen } = await gekaufteHandles(stok);
  bericht.gekaufteBestellungen = bestellungen; bericht.gekaufteProdukte = gekauft.size;

  const alle = new Map();
  for (const p of [...await lies(stok, POOL_KLEIN, 500), ...await lies(stok, POOL_GROSS, SCAN)]) alle.set(p.id, p);
  bericht.gelesen = alle.size;

  const kand = [];
  for (const p of alle.values()) {
    const r = pruefeKandidat(p, { gekauft, minMarge: MIN_MARGE, maxPreis: MAX_PREIS, ausschluss: AUSSCHLUSS, monat: MONAT });
    if (!r.ok) { const k = r.grund.replace(/[:(].*/, '').trim(); bericht.gruende[k] = (bericht.gruende[k] || 0) + 1; continue; }
    kand.push({ ...p, score: trendScore(p.tags, p.preis - p.ekChf) });
  }
  kand.sort((a, b) => b.score - a.score || String(b.createdAt).localeCompare(String(a.createdAt)));
  bericht.gruende['KANDIDAT'] = kand.length;

  const vor = waehleVielfalt(kand, { ziel: MAXPRUEF, maxJeTyp: MAX_JE_TYP + 1 }).gewaehlt;
  bericht.vorauswahl = vor.length;
  const bild = await bildCheck(stok, vor);
  bericht.bilder = { ok: bild.ok.length, fehl: bild.fehl };

  const gut = [];
  for (const p of bild.ok) {
    if (gut.length >= ZIEL + 8) break;                      // genug beisammen (ZIEL + Reserve): keine weiteren CJ-Punkte ausgeben
    let e;
    try { e = await erhebe(ctok, p.sku); }
    catch (err) {
      if (/CJ_QUOTA/.test(err.message)) { bericht.cj.abbruch = 'CJ-Tagespunkte erschöpft'; break; }
      bericht.cj.unbekannt++; bericht.cj.geprueft++; continue;   // Drosselung o. Ä.: nichts behaupten
    }
    bericht.cj.geprueft++;
    const u = lieferurteil(e);
    if (u.urteil === 'unbekannt') { bericht.cj.unbekannt++; continue; }
    if (u.urteil !== 'lieferbar') { bericht.cj.nichtLieferbar++; continue; }
    bericht.cj.lieferbar++;
    const netto = nettoMarge({ preis: p.preis, ekChf: p.ekChf, frachtUsd: e.minFrachtUsd, usdChf: USD_CHF });
    if (netto === null || netto < MIN_NETTO) { bericht.cj.nettoZuDuenn++; continue; }   // Fracht nicht messbar = nicht aufnehmen
    gut.push({ ...p, frachtUsd: e.minFrachtUsd, linien: e.linien, netto });
  }

  const final = waehleVielfalt(gut, { ziel: ZIEL, maxJeTyp: MAX_JE_TYP });
  const zeile = p => ({ handle: p.handle, titel: p.title, preis: p.preis, ek: p.ekChf,
    roh: Math.round((p.preis - p.ekChf) * 100) / 100, fracht: p.frachtUsd, netto: p.netto, linien: p.linien,
    score: p.score, typ: typSchluessel(p), trendTags: p.tags.filter(t => /liebling|boost|hype|video-hit|viral/.test(t)) });
  bericht.gewaehlt = final.gewaehlt.map(zeile);
  bericht.monat = MONAT; bericht.maxPreis = MAX_PREIS; bericht.ausschluss = [...AUSSCHLUSS];
  bericht.nachVielfaltAussortiert = final.uebersprungen.length;
  // Reserve: geprüft und lieferbar, aber nicht gewählt — Ersatz, falls eine Sichtprüfung ein Produkt ablehnt.
  const gewaehltIds = new Set(final.gewaehlt.map(p => p.id));
  bericht.reserve = gut.filter(p => !gewaehltIds.has(p.id)).map(zeile);
  if (LIVE) bericht.geschrieben = final.gewaehlt.length ? await schreibe(stok, final.gewaehlt) : 'nichts zu schreiben (keine geprüften Produkte)';
  console.log(JSON.stringify(bericht, null, 2));
  if (!LIVE) console.log('\n(Trockenlauf — nichts geändert. Mit LIVE=1 werden Tag, Kollektion und Reihenfolge geschrieben.)');
}
main().catch(e => { console.error('FEHLER:', e.message); process.exit(1); });
