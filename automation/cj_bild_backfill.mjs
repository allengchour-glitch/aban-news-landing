#!/usr/bin/env node
/* cj_bild_backfill.mjs — holt die fehlenden Produktbilder bei CJ nach.
 *
 * DER BEFUND: 1'801 aktive Produkte im Google-Kanal haben genau EIN Bild. 1'098 davon sind
 * CJ-Ware und tragen die CJ-Produkt-ID in der SKU («CJ-<pid>»), die Bilder liegen also
 * abrufbar bereit — sie wurden beim Import nur nie geholt. Genau diese Lücke ist der einzige
 * verbliebene Mangel in Googles Scorecard für den Shop («Images per offer»); Versand,
 * Rückgabe und Bildqualität stehen auf grün. Und Google ist der einzige Kanal mit belegten
 * Verkäufen (52 Klicks, +206 %, praktisch alles organisch).
 *
 * Ein zweites Bild zahlt doppelt: Merchant bewertet den Eintrag besser, UND im Shop wird das
 * Karten-Karussell überhaupt erst sichtbar. Horizon rendert es fertig eingebaut, aber ohne
 * zweites Bild gibt es nichts zu blättern — deshalb war der Theme-Schalter nie die Ursache.
 *
 * ⚠️ 441 der 1'801 sind Printful-POD. Deren eines Bild IST das Produkt (ein Motiv auf einem
 * Blank); es gibt bei Printful keine weiteren Ansichten zu holen. Sie bleiben aussen vor.
 *
 * ⚠️ CJ ZÄHLT EINE ANFRAGE PRO SEKUNDE ÜBER ALLE PROZESSE GEMEINSAM. Vier Grind-Runner laufen
 * ohnehin; dieser Lauf ist der fünfte Esser am selben Tisch. Er wartet deshalb bewusst lange
 * zwischen den Anfragen und behandelt Code 1600200 als «warte», nicht als Fehler — dieselbe
 * Bauweise wie in cj_category_fill.mjs, wo ein unbehandelter Netz-Zucker den ganzen Runner
 * riss und 30 Minuten Strafschlaf auslöste.
 *
 * ⚠️ JEDE BILD-URL VOR DEM ANLEGEN AUF 200 PRÜFEN. CJ liefert Pfade, die es nicht mehr gibt;
 * ein FAILED-Media hängt sonst dauerhaft am Produkt. Genau so stand «Outdoor Camping Gerades
 * Messer» live im Shop mit sieben FAILED-Medien und keinem sichtbaren Bild.
 *
 * ENV: CJ_TOKEN (sonst /tmp/cj_token.json) · SHOPIFY_CLIENT_ID/SECRET · CAP=200 · DRY=1
 */
import fs from 'node:fs';

const SHOP = 'au3j0y-hq.myshopify.com', API = '2025-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const CJT = (process.env.CJ_TOKEN || (fs.existsSync('/tmp/cj_token.json')
  ? (JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')).accessToken || '') : '')).trim();
const DRY = process.env.DRY === '1';
const CAP = parseInt(process.env.CAP || '200', 10);
const EXPORT = process.env.EXPORT || '/tmp/export.jsonl';
const LEDGER = 'dropship/_cj_bild_backfill.txt';
const MAXBILD = 4;                      // vier zusätzliche reichen fürs Karussell und für Google
const CJSLEEP = parseInt(process.env.CJSLEEP || '2500', 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function cj(path) {
  for (let i = 0; i < 5; i++) {
    try {
      const r = await fetch('https://developers.cjdropshipping.com/api2.0/v1' + path,
        { headers: { 'CJ-Access-Token': CJT }, signal: AbortSignal.timeout(45000) });
      const t = await r.text();
      let j; try { j = JSON.parse(t); } catch { await sleep(2000 * (i + 1)); continue; }
      if (Number(j.code) === 1600200) { await sleep(2000 * (i + 1)); continue; }
      return j;
    } catch { await sleep(2000 * (i + 1)); }
  }
  return { code: 0, data: null };
}

async function shTok() {
  // Der laufende Betrieb hält ein frisches Admin-Token in /tmp/cj_shop_token.txt bereit
  // (shop_token_refresh.sh erneuert es, weil es nur ~24 h gilt). Es zu benutzen erspart
  // diesem Lauf die Client-Credentials — und damit die Abhängigkeit von zwei Secrets, die
  // nur im Env laufender Prozesse existieren und mit dem letzten davon verschwinden.
  if (fs.existsSync('/tmp/cj_shop_token.txt')) {
    const t = fs.readFileSync('/tmp/cj_shop_token.txt', 'utf8').trim();
    if (t) return t;
  }
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: CID, client_secret: CSEC,
                               grant_type: 'client_credentials' }) });
      const tok = JSON.parse(await r.text()).access_token;
      if (tok) return tok;
    } catch {}
    await sleep(2000 * (a + 1));
  }
  throw new Error('shTok: kein Token');
}

async function sgql(t, q, v) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t },
        body: JSON.stringify({ query: q, variables: v }), signal: AbortSignal.timeout(60000) });
      const j = await r.json();
      if (j && j.data) return j;
    } catch {}
    await sleep(2000 * (i + 1));
  }
  return { data: null };
}

// Ein HEAD reicht, um eine tote URL zu erkennen, und lädt das Bild nicht herunter.
// ⚠️ Manche CDNs beantworten HEAD mit 405; dann wird ein Range-GET nachgeschoben, statt das
// Bild fälschlich als tot zu verwerfen.
async function lebt(u) {
  try {
    let r = await fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(20000) });
    if (r.status === 405 || r.status === 501)
      r = await fetch(u, { headers: { Range: 'bytes=0-64' }, signal: AbortSignal.timeout(20000) });
    return r.status >= 200 && r.status < 300;
  } catch { return false; }
}

// Zwei URLs zeigen dasselbe Bild, wenn der Dateiname gleich ist — CJ liefert dieselbe Datei
// unter wechselnden Hosts aus. Ohne diesen Vergleich läge das Hauptbild zweimal am Produkt.
const dateiname = u => (u.split('?')[0].split('/').pop() || '').toLowerCase();

async function main() {
  if (!CJT) { console.log('kein CJ-Token — Lauf endet'); return; }
  const done = new Set();
  if (fs.existsSync(LEDGER))
    for (const l of fs.readFileSync(LEDGER, 'utf8').split('\n'))
      if (l.trim()) done.add(l.split('\t')[0]);

  const offen = [];
  for (const zeile of fs.readFileSync(EXPORT, 'utf8').split('\n')) {
    if (!zeile.trim()) continue;
    let p; try { p = JSON.parse(zeile); } catch { continue; }
    if (p.status !== 'ACTIVE' || !p.g) continue;
    const mc = typeof p.mediaCount === 'object' ? (p.mediaCount?.count || 0) : (p.mediaCount || 0);
    if (mc > 1) continue;
    const vs = Array.isArray(p.variants) ? p.variants : (p.variants?.nodes || []);
    const sku = (vs[0]?.sku || '');
    const m = sku.match(/^CJ-(\d{6,})$/);
    if (!m) continue;                       // nur Ware mit CJ-Produkt-ID in der SKU
    if (done.has(p.id)) continue;
    offen.push({ id: p.id, pid: m[1], titel: p.title });
  }
  console.log(`CJ-Produkte mit nur einem Bild: ${offen.length}`);
  if (DRY) {
    for (const o of offen.slice(0, 8)) console.log(`   ${o.pid}  ${o.titel.slice(0, 50)}`);
    return;
  }

  const tok = await shTok();
  let ergaenzt = 0, ohne = 0, tot = 0;
  const led = fs.createWriteStream(LEDGER, { flags: 'a' });
  for (const o of offen.slice(0, CAP)) {
    const dj = await cj(`/product/query?pid=${o.pid}`);
    await sleep(CJSLEEP);
    const bilder = ((dj.data || {}).productImageSet || []).filter(u => /^https/.test(u));
    if (bilder.length < 2) { ohne++; led.write(`${o.id}\tkeine-weiteren\t${o.pid}\n`); continue; }

    // Was hängt schon am Produkt? Der Dateiname des vorhandenen Bildes darf nicht doppelt rein.
    const q = await sgql(tok, 'query($id:ID!){product(id:$id){media(first:20){nodes{' +
      '... on MediaImage{image{url}}}}}}', { id: o.id });
    const da = new Set(((q.data?.product?.media?.nodes) || [])
      .map(n => dateiname(n?.image?.url || '')).filter(Boolean));

    const neu = [];
    for (const u of bilder) {
      if (neu.length >= MAXBILD) break;
      if (da.has(dateiname(u))) continue;
      if (!(await lebt(u))) { tot++; continue; }
      da.add(dateiname(u));
      neu.push(u);
    }
    if (!neu.length) { ohne++; led.write(`${o.id}\tnichts-brauchbar\t${o.pid}\n`); continue; }

    const r = await sgql(tok, 'mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(' +
      'productId:$id,media:$m){mediaUserErrors{message}}}',
      { id: o.id, m: neu.map(u => ({ originalSource: u, mediaContentType: 'IMAGE' })) });
    const fehler = r.data?.productCreateMedia?.mediaUserErrors;
    if (fehler && fehler.length) {
      console.log(`  ⚠️ ${o.titel.slice(0, 30)}: ${fehler[0].message.slice(0, 60)}`);
      continue;
    }
    ergaenzt++;
    led.write(`${o.id}\t+${neu.length}\t${o.pid}\n`);
    if (ergaenzt % 25 === 0)
      console.log(`   ${ergaenzt} Produkte ergänzt · ${ohne} ohne weitere Bilder · ${tot} tote URLs`);
  }
  console.log(`FERTIG: ${ergaenzt} Produkte mit zusätzlichen Bildern, ` +
              `${ohne} hatten keine weiteren, ${tot} URLs waren tot`);
}

main();
