#!/usr/bin/env node
/**
 * Erprobte CJ-Produkte für LuxeStyle finden — der ehrliche Ersatz für „VIP-Produkte".
 *
 * WARUM NICHT DIE VIP-LISTE: CJ Prime wirbt mit einer kuratierten VIP-Liste. Die API hat sie
 * nicht. Am 24.10.2026 live gelesen (`setting/get`): 69 Endpunkte, keiner für VIP, keiner für
 * Gutscheine. Beides liegt allein in CJs Weboberfläche und ist von hier aus nicht erreichbar.
 *
 * WAS STATTDESSEN GEHT, und messbar besser ist: `/product/list` nennt je Treffer `listedNum` —
 * wie viele Läden das Produkt führen. Das ist ein Beliebtheitswert aus echten Daten statt
 * eines Etiketts. Die Auswahl trifft `automation/lib/top_kandidaten.mjs`.
 *
 * DIE ENTSCHEIDENDE PRÜFUNG KOMMT ZULETZT: `logistic/freightCalculate` CN→CH je Variante.
 * Elf von elf Erstattungen dieses Shops hiessen „nicht lieferbar"; ein erprobtes Produkt, das
 * nicht hierher kommt, wiederholt genau das. Die Länderliste des Katalogs ist eine Behauptung,
 * die Frachtabfrage eine Messung — und eine FEHLGESCHLAGENE Abfrage heisst `unbekannt`, nicht
 * `nicht lieferbar` (dieselbe Zurückhaltung wie im Lieferbarkeits-Wächter).
 *
 * DER LAUF LEGT NICHTS AN. Er schreibt einen Bericht; das Anlegen bleibt ein eigener Schritt
 * mit Preis, Übersetzung und Bildprüfung.
 *
 * Schalter:
 *   SUCHE     Komma-Liste englischer Suchwörter (Vorgabe: Themen mit gemessener Nachfrage)
 *   SEITEN    Katalogseiten je Suchwort (Vorgabe 2, je 20 Treffer)
 *   MAX       wie viele Kandidaten die Fracht geprüft bekommen (Vorgabe 15)
 *   LISTED    Mindestzahl Läden (Vorgabe 5 — gemessen, siehe top_kandidaten.mjs)
 *   MAXEK     höchster Einkauf in USD (Vorgabe 40)
 *   BERICHT   Zieldatei (Vorgabe dropship/cj-top-kandidaten.csv)
 *   NEU=1     misst auch pids neu, die das Ledger schon kennt
 */
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { cjFetch } from './lib/cj_fetch.mjs';
import { cjToken } from './lib/cj_token.mjs';
import { topUrteil, topAuswahl } from './lib/top_kandidaten.mjs';
import { readFile, writeFile, appendFile } from 'node:fs/promises';

/**
 * Die Suchwörter stammen aus GEMESSENER Nachfrage dieses Shops, nicht aus einer Trendliste:
 * Rizinusöl ist das stärkste Suchthema (64 von 214 Suchsitzungen), und die acht bezahlten
 * Bestellungen kamen über konkrete Suchen nach benannten Dingen — Quarzuhr, E-Scooter-
 * Ladegerät, Gemüseschneider, Katzenspielzeug, Hängematte — nicht über Mode. Darum Haushalt,
 * Technik, Tier und Pflege, und bewusst keine Kleider: die drei meistbesuchten Modeseiten
 * haben in 60 Tagen null Bestellung gebracht.
 */
const STANDARD_SUCHE = [
  'castor oil', 'humidifier', 'aroma diffuser', 'phone charger', 'watch men', 'pet grooming',
  'vegetable cutter', 'cat toy', 'hammock', 'led strip light', 'car phone holder',
  'kitchen organizer', 'massage gun', 'jade roller', 'water bottle', 'yoga mat',
  'dog bed', 'cat litter', 'bluetooth speaker', 'smart watch', 'power bank', 'desk lamp',
  'wall clock', 'storage box', 'shower head', 'hair dryer brush', 'nail lamp',
  'coffee grinder', 'air fryer accessories', 'garden tools', 'bike light', 'travel organizer',
].join(',');

const SHOP = process.env.SHOPIFY_SHOP || '', API = '2025-01',
  CID = process.env.SHOPIFY_CLIENT_ID || '', CS = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET) || '',
  BASE = 'https://developers.cjdropshipping.com/api2.0/v1',
  SEITEN = Math.min(parseInt(process.env.SEITEN || '2', 10), 10),
  MAX = Math.min(parseInt(process.env.MAX || '15', 10), 50),
  LISTED = parseInt(process.env.LISTED || '5', 10),
  MAXEK = parseFloat(process.env.MAXEK || '40'),
  BERICHT = process.env.BERICHT || 'dropship/cj-top-kandidaten.csv',
  LEDGER = process.env.LEDGER || 'dropship/cj_top_ledger.txt',
  NEU = process.env.NEU === '1',
  // Vorgabe aus gemessener Nachfrage: Rizinusöl ist das stärkste Suchthema des Shops, und die
  // Käufe kamen über konkrete Suchen nach benannten Dingen (Uhr, Ladegerät) — nicht über Mode.
  SUCHE = (process.env.SUCHE || STANDARD_SUCHE)
    .split(',').map(s => s.trim()).filter(Boolean);

const schlaf = ms => new Promise(r => setTimeout(r, ms));

async function shopToken() {
  if (process.env.SHOPIFY_ADMIN_TOKEN) return process.env.SHOPIFY_ADMIN_TOKEN;
  if (!SHOP || !CID || !CS) return '';
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: CID, client_secret: CS, grant_type: 'client_credentials' }),
  });
  if (!r.ok) { console.error(`Shopify-Token: HTTP ${r.status} — ${(await r.text()).slice(0, 200)}`); return ''; }
  return (await r.json()).access_token || '';
}

/**
 * Deutsche Suchwörter zu einem englischen CJ-Titel. Bewusst grob und kurz: die Frage ist
 * „führt der Shop so etwas schon?", nicht „ist es dasselbe Produkt".
 */
const WARENGRUPPE = [
  // Reihenfolge zählt: das SPEZIFISCHE zuerst. Im ersten Lauf landete ein
  // „Reptile Pet Incubation Fogger" unter „Luftbefeuchter", weil `humidifier` vorn stand.
  [/reptile|terrarium/i, 'Reptil'],
  [/humidifier|air purifier/i, 'Luftbefeuchter'], [/diffuser|aroma|fragrance/i, 'Diffuser'],
  // Ohrringe vor Halskette: „Pendant Earrings" ist ein Ohrring, kein Anhänger.
  [/watch/i, 'Uhr'], [/earrings?/i, 'Ohrringe'], [/necklace|pendant/i, 'Halskette'],
  [/bracelet/i, 'Armband'],
  // `\bring\b` reicht NICHT: die Wortgrenze vorne fehlt in `/ring\b/`, und damit traf das
  // Muster „SpRING" — ein Cardigan wurde als Ring gezählt. Zweimal dieselbe Klasse an einem
  // Abend (vorher `switch` im Lichtschalter).
  [/(^|[^a-z])rings?([^a-z]|$)/i, 'Ring'],
  [/yoga|legging/i, 'Yoga'],
  [/cardigan|jacket|coat/i, 'Cardigan'],
  [/speaker/i, 'Lautsprecher'], [/power ?bank/i, 'Powerbank'], [/lamp|light/i, 'Lampe'],
  [/hammock/i, 'Hängematte'], [/massage/i, 'Massage'], [/charger/i, 'Ladegerät'],
];

/**
 * Wie viele AKTIVE Produkte der Shop in derselben Warengruppe schon führt.
 *
 * WARUM das hierher gehört: der Dauerauftrag heisst „Kunden, die kaufen" — mehr Produkte sind
 * Mittel, nicht Zweck. Gemessen am 24.10.2026 führt der Shop bereits 155 Luftbefeuchter,
 * 64 Diffuser, 2106 Uhren und 2662 Schmuckstücke. Ein weiteres davon anzulegen ist Arbeit
 * ohne Wirkung; die dünnen Gruppen sind der eigentliche Fund. -1 heisst „nicht gemessen".
 */
async function schonImShop(tok, name, cache) {
  const treffer = WARENGRUPPE.find(([re]) => re.test(name));
  if (!tok || !treffer) return { gruppe: '', vorhanden: -1 };
  const gruppe = treffer[1];
  if (cache.has(gruppe)) return { gruppe, vorhanden: cache.get(gruppe) };
  try {
    const d = await shopifyGql(SHOP, API, tok, `query($q:String!){productsCount(query:$q){count}}`,
      { q: `status:active AND title:*${gruppe}*` });
    const n = Number(d?.productsCount?.count);
    const wert = Number.isFinite(n) ? n : -1;
    cache.set(gruppe, wert);
    return { gruppe, vorhanden: wert };
  } catch { return { gruppe, vorhanden: -1 }; }
}

async function suchen(tok, wort) {
  const out = [];
  for (let seite = 1; seite <= SEITEN; seite++) {
    const r = await cjFetch(`${BASE}/product/list?pageNum=${seite}&pageSize=20&productNameEn=${encodeURIComponent(wort)}`,
      { headers: { 'CJ-Access-Token': tok }, context: `Suche ${wort}` });
    const l = r?.data?.list || [];
    out.push(...l.map(t => ({ ...t, suchwort: wort })));
    if (l.length < 20) break;
    await schlaf(400);
  }
  return out;
}

/** Fracht CN→CH für die erste Variante. null = unbekannt, nicht „geht nicht". */
async function fracht(tok, pid) {
  let vid = null;
  try {
    const q = await cjFetch(`${BASE}/product/query?pid=${encodeURIComponent(pid)}`,
      { headers: { 'CJ-Access-Token': tok }, context: 'Variante', weicheCodes: [1602001, 1602002, 1602003] });
    vid = q?.data?.variants?.[0]?.vid || null;
  } catch { return { vid: null, linien: null }; }
  if (!vid) return { vid: null, linien: null };
  try {
    const f = await cjFetch(`${BASE}/logistic/freightCalculate`, {
      context: 'Fracht', headers: { 'CJ-Access-Token': tok, 'Content-Type': 'application/json' },
      init: { method: 'POST', body: JSON.stringify({ startCountryCode: 'CN', endCountryCode: 'CH', products: [{ quantity: 1, vid }] }) },
    });
    return { vid, linien: Array.isArray(f?.data) ? f.data.length : null };
  } catch { return { vid, linien: null }; }
}

/**
 * Das Gedächtnis des Laufs: jede schon gemessene pid mit ihrem Frachturteil.
 *
 * Ohne das kostet jeder weitere Lauf dieselben Frachtabfragen noch einmal — und derselbe
 * Treffer taucht bei mehreren Suchwörtern auf. Ein `unbekannt` wird NICHT festgeschrieben:
 * es hiess „nicht lesbar", nicht „nicht lieferbar", und darf beim nächsten Lauf neu gemessen
 * werden. Mit `NEU=1` wird alles nochmals gemessen.
 */
async function ledgerLesen() {
  const m = new Map();
  try {
    for (const z of (await readFile(LEDGER, 'utf8')).split('\n').filter(Boolean)) {
      const [pid, , urteil] = z.split('\u00b7').map(x => x.trim());
      if (pid && urteil && urteil !== 'unbekannt') m.set(pid, urteil);
    }
  } catch { /* noch kein Ledger */ }
  return m;
}

(async () => {
  const tok = await cjToken();
  if (!tok) { console.error('Kein CJ-Token: CJ_EMAIL/CJ_API_KEY fehlen oder CJ lehnt ab. Abbruch.'); process.exit(1); }
  const stok = await shopToken();
  if (!stok) console.error('Kein Shopify-Token — die Spalte „schon im Shop" bleibt leer (nicht: null).');
  const gruppenCache = new Map();

  const treffer = [];
  for (const w of SUCHE) {
    try { const t = await suchen(tok, w); treffer.push(...t); console.log(`  ${w}: ${t.length} Treffer`); }
    catch (e) { console.error(`  ${w}: ${e.message}`); if (/CJ_QUOTA|CJ_THROTTLED/.test(e.message)) break; }
  }
  // Dasselbe Produkt steht bei mehreren Suchwörtern — und im ersten Lauf dreimal in der
  // Auswahl, was drei Frachtabfragen für dieselbe Ware kostete.
  const nachPid = new Map();
  for (const t of treffer) if (t.pid && !nachPid.has(t.pid)) nachPid.set(t.pid, t);
  const einmalig = [...nachPid.values()];
  console.log(`\nGelesen ${treffer.length} Katalogtreffer aus ${SUCHE.length} Suchwörtern, ${einmalig.length} verschiedene.`);

  const gruende = {};
  for (const t of einmalig) { const u = topUrteil(t, { listedMin: LISTED, maxEk: MAXEK }); gruende[u.grund] = (gruende[u.grund] || 0) + 1; }
  console.log('Gründe:', JSON.stringify(gruende));

  const bekannt = NEU ? new Map() : await ledgerLesen();
  const frisch = einmalig.filter(t => !bekannt.has(String(t.pid)));
  if (bekannt.size) console.log(`Ledger: ${bekannt.size} pids schon gemessen, ${einmalig.length - frisch.length} davon heute wieder getroffen.`);

  const gewaehlt = topAuswahl(frisch, MAX, { listedMin: LISTED, maxEk: MAXEK });
  console.log(`\nFracht nach CH wird für ${gewaehlt.length} Kandidaten gemessen:`);
  const zeilen = [['suchwort', 'pid', 'name', 'laeden', 'ek_usd', 'frachtlinien', 'urteil', 'bild'].join(',')];
  let lieferbar = 0, unbekannt = 0;
  for (const { t, u } of gewaehlt) {
    const { linien } = await fracht(tok, t.pid);
    const urteil = linien === null ? 'unbekannt' : (linien > 0 ? 'lieferbar-ch' : 'keine-ch-fracht');
    const { gruppe, vorhanden } = urteil === 'lieferbar-ch'
      ? await schonImShop(stok, t.productNameEn, gruppenCache) : { gruppe: '', vorhanden: -1 };
    if (urteil === 'lieferbar-ch') lieferbar++; if (urteil === 'unbekannt') unbekannt++;
    const hinweis = vorhanden < 0 ? '' : vorhanden === 0 ? '  ← NEU im Shop' : `  (Shop hat schon ${vorhanden} × ${gruppe})`;
    console.log(`  ${urteil.padEnd(15)} ${String(u.laeden).padStart(5)} Läden  $${u.preis}  ${t.productNameEn.slice(0, 50)}${hinweis}`);
    zeilen.push([t.suchwort, t.pid, `"${String(t.productNameEn).replace(/"/g, "'")}"`, u.laeden, u.preis,
      linien ?? '', urteil, gruppe, vorhanden < 0 ? '' : vorhanden,
      `"${(u.lager || []).join(' ')}"`, t.productImage].join(','));
    await appendFile(LEDGER, `${t.pid} \u00b7 ${new Date().toISOString().slice(0, 10)} \u00b7 ${urteil} \u00b7 ${String(t.productNameEn).replace(/\u00b7/g, '-').slice(0, 70)}\n`);
    await schlaf(400);
  }
  await writeFile(BERICHT, zeilen.join('\n') + '\n');
  console.log(`\n${lieferbar} liefern nach CH, ${unbekannt} unbekannt. Bericht: ${BERICHT}`);
  console.log('Der Lauf legt nichts an — Anlegen ist ein eigener Schritt (Preis, Übersetzung, Bildprüfung).');
})();
