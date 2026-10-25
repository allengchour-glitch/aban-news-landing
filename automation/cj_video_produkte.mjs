#!/usr/bin/env node
/**
 * Welche CJ-Produkte haben ein Video, sind in die Schweiz lieferbar und sind für den Shop neu?
 *
 * DER LAUF SCHREIBT NICHTS AM SHOP. Er sucht, messt und berichtet.
 *
 * Was gemessen wird, und warum jedes Mal mit Gegenprobe:
 *   1. `product/list` → `isVideo`. Nur das Flag sagt, dass CJ ein Video hält; die API gibt die
 *      Datei NICHT heraus (Begründung und alle geprüften Endpunkte in `lib/cj_video.mjs`).
 *   2. `logistic/freightCalculate` CN→CH → Frachtlinien. Null Linien ist der sichere
 *      Negativfall (siehe `lib/lieferbarkeit.mjs`: elf von elf Erstattungen des Shops hiessen
 *      „nicht lieferbar"). Eine fehlgeschlagene Abfrage ist NICHT „null Linien", sondern
 *      `unbekannt` — sonst sperrt eine Drosselung gesunde Ware.
 *   3. Vor den Messungen läuft eine GEGENPROBE an einem bekannt lieferbaren Produkt. Bekommt
 *      es keine Linien, ist das Messgerät kaputt und der Lauf bricht ab, statt „nichts
 *      lieferbar" zu melden.
 *   4. Dubletten: `productsCount` je Warengruppe im eigenen Katalog. Die Gegenprobe ist eine
 *      Unsinnsabfrage, die 0 geben MUSS — Shopify ignoriert stillschweigend Filter, die es
 *      nicht kennt (siehe Projektgedächtnis), und eine zu grosse Trefferzahl sieht dann aus
 *      wie eine Messung.
 *
 * Schalter:
 *   WORTE   Suchwörter, mit Komma getrennt (Vorgabe: die 15 vom 24.10.)
 *   SEITEN  Katalogseiten je Suchwort (Vorgabe 2, je 50 Treffer)
 *   KURS    USD→CHF (Vorgabe 0.82435, live gelesen 24.10.2026, Datenstand 23.10.)
 *   FAKTOR  Aufschlag auf die Landekosten für den Preisvorschlag (Vorgabe 2)
 *   PROBE   pid des Gegenproben-Produkts
 *   BERICHT Zieldatei (Vorgabe dropship/cj-video-produkte.csv)
 */
import { cjFetch } from './lib/cj_fetch.mjs';
import { cjToken } from './lib/cj_token.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { hatVideo, preisHoch, kosten, warengruppe } from './lib/cj_video.mjs';
import { writeFile } from 'node:fs/promises';

const BASE = 'https://developers.cjdropshipping.com/api2.0/v1',
  SHOP = process.env.SHOPIFY_SHOP || '', API = '2025-01',
  WORTE = (process.env.WORTE || 'floating lamp,levitating,night light,kitchen gadget,pet toy,massage gun,projector,humidifier,watch,jewelry,halloween,christmas,car accessories,yoga,phone holder').split(',').map(s => s.trim()).filter(Boolean),
  SEITEN = Math.min(Math.max(parseInt(process.env.SEITEN || '2', 10), 1), 10),
  KURS = Number(process.env.KURS || '0.82435'),
  FAKTOR = Number(process.env.FAKTOR || '2'),
  PROBE = process.env.PROBE || '2608070456571627400',
  BERICHT = process.env.BERICHT || 'dropship/cj-video-produkte.csv',
  WEICH = [1602001, 1602002, 1602003];

const schlaf = ms => new Promise(r => setTimeout(r, ms));

/** Warengruppe → Shopify-Suche für die Dublettenzählung. */
const GRUPPEN_ABFRAGE = {
  projektor: 'status:active AND (title:*projektor* OR title:*sternenlicht* OR title:*sternenhimmel*)',
  schwebend: 'status:active AND (title:*schwebend* OR title:*levitation* OR title:*magnetschwebe*)',
  luftbefeuchter: 'status:active AND title:*luftbefeuchter*',
  partylicht: 'status:active AND (title:*disco* OR title:*partylicht* OR title:*laser*)',
  uhrenarmband: 'status:active AND title:*uhrenarmband*',
  hologramm: 'status:active AND (title:*hologramm* OR title:*holografisch*)',
  hud: 'status:active AND (title:*head-up* OR title:*hud*)',
  yoga: 'status:active AND tag:yoga',
};

async function shopToken() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  if (!SHOP) return '';
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET),
      grant_type: 'client_credentials',
    }),
  });
  if (!r.ok) { console.error(`Shopify-Token: HTTP ${r.status}`); return ''; }
  return (await r.json()).access_token || '';
}

/** Erste Variante eines Produkts. Nicht lesbar heisst `null`, nicht „keine". */
async function variante(tok, pid) {
  const u = new URL(`${BASE}/product/query`);
  u.searchParams.set('pid', pid);
  let r;
  try { r = await cjFetch(u.toString(), { headers: { 'CJ-Access-Token': tok }, context: 'CJ-Produkt', weicheCodes: WEICH }); }
  catch { return null; }
  const d = r?.data;
  if (!d?.pid) return null;
  const v = (d.variants || [])[0];
  if (!v?.vid) return null;
  return { vid: v.vid, sku: v.variantSku, preis: preisHoch(v.variantSellPrice ?? d.sellPrice), name: d.productNameEn || d.productName };
}

/** Frachtlinien CN→CH. `null` heisst nicht gemessen — NIE als „nicht lieferbar" lesen. */
async function fracht(tok, vid) {
  let f;
  try {
    const r = await fetch(`${BASE}/logistic/freightCalculate`, {
      method: 'POST', headers: { 'CJ-Access-Token': tok, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startCountryCode: 'CN', endCountryCode: 'CH', products: [{ quantity: 1, vid }] }),
    });
    f = await r.json();
  } catch { return { linien: null }; }
  if (Number(f?.code) !== 200 || !Array.isArray(f?.data)) return { linien: null };
  const guenstig = f.data
    .map(x => ({ name: x.logisticName, preis: Number(x.logisticPrice), dauer: x.logisticAging }))
    .filter(x => Number.isFinite(x.preis)).sort((a, b) => a.preis - b.preis)[0];
  return { linien: f.data.length, frachtUsd: guenstig?.preis ?? null, linie: guenstig?.name ?? null, dauer: guenstig?.dauer ?? null };
}

async function main() {
  const ctok = await cjToken();
  if (!ctok) { console.log('no-op: CJ-Auth fehlgeschlagen — CJ_EMAIL/CJ_API_KEY prüfen.'); return; }

  // GEGENPROBE ZUERST: ohne funktionierendes Messgerät ist jede Zahl unten wertlos.
  const pv = await variante(ctok, PROBE);
  const pf = pv ? await fracht(ctok, pv.vid) : { linien: null };
  if (!(pf.linien > 0)) {
    console.log(`ABBRUCH: Gegenprobe ${PROBE} bekam ${pf.linien} Frachtlinien. Das Messgerät arbeitet nicht — es wird nichts gemeldet, statt "nichts lieferbar" zu behaupten.`);
    return;
  }
  console.log(`Gegenprobe ${PROBE}: ${pf.linien} Frachtlinien → Messgerät arbeitet.`);

  // 1. Katalog durchsuchen und die Video-Treffer sammeln.
  let gesehen = 0, mitVideo = 0, ohneVideo = 0, unbekanntVideo = 0;
  const treffer = new Map();
  for (const wort of WORTE) {
    for (let seite = 1; seite <= SEITEN; seite++) {
      const u = new URL(`${BASE}/product/list`);
      u.searchParams.set('pageNum', String(seite));
      u.searchParams.set('pageSize', '50');
      u.searchParams.set('productNameEn', wort);
      let r;
      try { r = await cjFetch(u.toString(), { headers: { 'CJ-Access-Token': ctok }, context: 'CJ-Katalog', weicheCodes: WEICH }); }
      catch (e) { console.error(`  ${wort} S.${seite}: ${e.message}`); await schlaf(1200); continue; }
      for (const p of r?.data?.list || []) {
        gesehen++;
        const v = hatVideo(p);
        if (v === true) { mitVideo++; if (!treffer.has(p.pid)) treffer.set(p.pid, { pid: p.pid, name: p.productNameEn, listedNum: p.listedNum, wort }); }
        else if (v === false) ohneVideo++;
        else unbekanntVideo++;
      }
      await schlaf(1200);
    }
  }
  console.log(`\nKatalog: ${gesehen} Treffer gesehen · isVideo ja ${mitVideo} · nein ${ohneVideo} · unbekannt ${unbekanntVideo}`);
  console.log(`Verschiedene Video-Produkte: ${treffer.size}`);

  // 2. Je Video-Produkt: Variante, Fracht, Kosten.
  const zeilen = [];
  let lieferbar = 0, nicht = 0, unbekannt = 0;
  for (const h of treffer.values()) {
    const v = await variante(ctok, h.pid);
    if (!v) { unbekannt++; zeilen.push({ ...h, urteil: 'unbekannt', grund: 'CJ-Detail nicht lesbar' }); continue; }
    const f = await fracht(ctok, v.vid);
    await schlaf(1300);
    if (f.linien === null) { unbekannt++; zeilen.push({ ...h, name: v.name, urteil: 'unbekannt', grund: 'Frachtabfrage fehlgeschlagen' }); continue; }
    if (f.linien === 0) { nicht++; zeilen.push({ ...h, name: v.name, urteil: 'nicht_lieferbar', grund: 'null Frachtlinien CN→CH' }); continue; }
    lieferbar++;
    const k = kosten({ ekUsd: v.preis, frachtUsd: f.frachtUsd, kurs: KURS, faktor: FAKTOR });
    zeilen.push({
      ...h, name: v.name, urteil: 'lieferbar', vid: v.vid, sku: v.sku,
      linien: f.linien, dauer: f.dauer, linie: f.linie, ekUsd: v.preis, frachtUsd: f.frachtUsd,
      gruppe: warengruppe(v.name), ...(k || { landenChf: null, vkVorschlag: null, margeChf: null }),
    });
  }
  console.log(`Lieferbar ${lieferbar} · nicht lieferbar ${nicht} · unbekannt ${unbekannt}`);

  // 3. Dubletten: wie viel führt der Shop in diesen Gruppen schon?
  const bestand = {};
  const stok = await shopToken();
  if (stok) {
    const zaehle = async q => (await shopifyGql(SHOP, API, stok, `query($q:String!){productsCount(query:$q){count}}`, { q }))?.productsCount?.count;
    const probe = await zaehle('status:active AND title:*zzqxyzunsinn*');
    if (probe === 0) {
      for (const g of new Set(zeilen.filter(z => z.gruppe).map(z => z.gruppe))) {
        if (GRUPPEN_ABFRAGE[g]) { bestand[g] = await zaehle(GRUPPEN_ABFRAGE[g]); await schlaf(400); }
      }
      console.log('\nShop-Bestand je Gruppe:', JSON.stringify(bestand));
    } else {
      console.log(`\nShop-Bestand NICHT gezählt: die Unsinnsabfrage gab ${probe} statt 0 — der Filter wird ignoriert, die Zahlen wären erfunden.`);
    }
  } else {
    console.log('\nShop-Bestand nicht gezählt: kein Shopify-Token. Dubletten bleiben unbekannt.');
  }
  for (const z of zeilen) z.shopBestand = z.gruppe && z.gruppe in bestand ? bestand[z.gruppe] : null;

  zeilen.sort((a, b) => (a.urteil === 'lieferbar' ? 0 : 1) - (b.urteil === 'lieferbar' ? 0 : 1)
    || (a.shopBestand ?? 9999) - (b.shopBestand ?? 9999) || (b.margeChf ?? -1) - (a.margeChf ?? -1));

  const sp = ['pid', 'name', 'urteil', 'grund', 'gruppe', 'shopBestand', 'linien', 'dauer', 'linie', 'ekUsd', 'frachtUsd', 'landenChf', 'vkVorschlag', 'margeChf', 'sku', 'vid', 'listedNum', 'wort'];
  const csv = [sp.join(',')].concat(zeilen.map(z => sp.map(k => {
    const w = z[k] ?? '';
    return /[",\n]/.test(String(w)) ? `"${String(w).replace(/"/g, '""')}"` : String(w);
  }).join(',')));
  await writeFile(BERICHT, csv.join('\n') + '\n');
  console.log(`\nBericht: ${BERICHT} (${zeilen.length} Zeilen)`);
  console.log('Die Videodatei selbst liegt nur in CJs eingeloggter Weboberfläche — dieser Lauf nennt die Produkte, nicht die Datei.');
}
main().catch(e => { console.error(e); process.exit(1); });
