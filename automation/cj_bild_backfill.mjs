#!/usr/bin/env node
/* cj_bild_backfill.mjs — holt die fehlenden Produktbilder bei CJ nach (v2, 23.09.2026).
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
 * ⚠️ CJ ZÄHLT EINE ANFRAGE PRO SEKUNDE ÜBER ALLE PROZESSE GEMEINSAM. Seit 21.09. teilen alle
 * CJ-Verbraucher EINE Stempeluhr (`cj_takt.mjs`, 1,8 s Start-zu-Start) — der eigene CJSLEEP
 * von v1 ist damit überflüssig. Code 1600200 bleibt «warte», nicht Fehler.
 *
 * ⚠️ JEDE BILD-URL VOR DEM ANLEGEN AUF 200 PRÜFEN. CJ liefert Pfade, die es nicht mehr gibt;
 * ein FAILED-Media hängt sonst dauerhaft am Produkt. Genau so stand «Outdoor Camping Gerades
 * Messer» live im Shop mit sieben FAILED-Medien und keinem sichtbaren Bild.
 *
 * v2 — WAS SICH GEGENÜBER LAUF C (23.09., 17:31–18:48 UTC) GEÄNDERT HAT, alles gemessen:
 *  1. «unklar» war zu 16 von 25 der LEERE CJ-PUNKTE-EIMER (Code 16900500 «Insufficient API
 *     points … Remaining: 0, Required: 10»), 7 von 25 antworteten sofort 200 mit 4–24 Bildern.
 *     v1 zählte das nur und ging weiter: 464 von 593 Kandidaten wurden verbrannt, ohne dass
 *     einer je gefragt worden wäre. Jetzt WARTET der Lauf auf den Eimer (füllt ~2,75 P/s,
 *     product/query = 10 P; Journal 23.08.) und fragt dasselbe Produkt erneut. Erst nach
 *     10 Minuten ununterbrochener Leere endet er mit «PAUSE» — nie mit FERTIG.
 *  2. Code 1602001 «Product not found» sah wie die Tote-Ware-Klasse aus (2 von 25, beide Male) —
 *     war aber der FALSCHE ENDPUNKT: beide waren Varianten-SKUs (…01AZ), die `productSku=`
 *     nicht kennt; `variantSku=` antwortet 200 mit 5 Bildern (gemessen 22:57, siehe SKU_FORMEN).
 *     Trotzdem gilt für ein echtes 1602001/1602002: ZUERST mit Datum in die Nebenliste
 *     dropship/_cj_bild_unklar.txt; erst ein zweiter Treffer an einem ANDEREN Tag schreibt
 *     «cj-kennt-nicht» ins Hauptledger. Ein Tagesausfall bei CJ soll kein Produkt für immer abhaken.
 *  3. Das Ledger verlor 50 «+N»-Zeilen: ein Rebase eines anderen Schreibers tauschte um
 *     18:33:43 den Inode der Datei, der offene WriteStream schrieb 14 Minuten ins Leere.
 *     Jetzt appendFileSync JE ZEILE (öffnet den PFAD, nicht den Inode) und ein ISO-Datum als
 *     vierte Spalte. Und VOR jedem CJ-Aufruf EINE Shopify-Lesung (Status, Bildzahl, SKU,
 *     vorhandene Medien): wer schon ≥4 Bilder hat, bekommt «schon-mehr-bilder» — ohne einen
 *     einzigen CJ-Punkt. Das fängt die 50 Verlorenen und jeden stalen Export.
 *  4. Die OCR-Wache lädt per curl über den Proxy — und der antwortet für cf.cjdropshipping.com
 *     seit heute Abend mit CONNECT 403 (Egress-Policy; 17:31–18:48 war der Host noch offen).
 *     bildtext_pruefen.py gibt dann −1, und v1 hätte jedes Produkt als «nichts-brauchbar»
 *     DAUERHAFT abgehakt. Jetzt: Vorprüfung am Start (curl auf ein Prüfbild); gesperrt →
 *     «PAUSE» ohne einen CJ-Aufruf. Zur Laufzeit gilt −1 als «ocr-offen» (nur Log, kein
 *     Ledger), drei solche Produkte in Folge → PAUSE. Die Policy wird NICHT umgangen (README
 *     /root/.ccr: 403 = melden, nicht umfahren) — der Aufseher versucht es stündlich neu.
 *  5. Nach productCreateMedia wird der Medienstatus ZURÜCKGELESEN (bis 3× alle 5 s, bis kein
 *     PROCESSING mehr). v1 schrieb «+N» blind. FAILED → Ledger «failed:N»; sind ALLE neuen
 *     FAILED, endet der Lauf mit klarer Meldung (Dateispeicher-Stopp-Regel). Gemessen heute:
 *     10 von 10 «+N» READY (5–9 Medien) trotz «vollem» Basic-Speicher.
 *  6. Zweite Welle: nach ≤1 Bild kommen die Produkte mit 2–3 Bildern dran (Ziel ≥5 gesamt,
 *     MAXBILD = 5 − vorhanden). Die Stichprobe (5 von 19 mit CJ-200) fand 0 Zugewinn — CJ bot
 *     exakt die schon vorhandenen Dateien. Deshalb misst die Welle sich selbst: nach 100
 *     Produkten mit CJ-Antwort unter 10 % Zugewinn → «WELLE2 gestoppt». Welle-2-Zeilen tragen
 *     das Suffix «/w2», damit ein Produkt aus Welle 1 dort erneut geprüft werden darf — einmal.
 *  7. Jede Log-Zeile trägt die UTC-Zeit (Lauf C liess sich nur über Keepalive-Log, mtime und
 *     Git-Commits rekonstruieren). «FERTIG» nur bei 0 offen; sonst «PAUSE: n offen» — der
 *     Aufseher (pause_kuehlt) wartet dann eine Stunde, statt 20 h zu sperren.
 *
 * ENV: CJ_TOKEN (sonst /tmp/cj_token.json) · SHOPIFY_CLIENT_ID/SECRET · CAP=200 · DRY=1 ·
 *      WELLE2=0 (Welle 2 aus) · EXPORT=/tmp/export.jsonl
 */
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { takt } from './cj_takt.mjs';
import { nachlauf } from './eimer_etikette.mjs';

const SHOP = 'au3j0y-hq.myshopify.com', API = '2026-01';
const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const CJT = (process.env.CJ_TOKEN || (fs.existsSync('/tmp/cj_token.json')
  ? (JSON.parse(fs.readFileSync('/tmp/cj_token.json', 'utf8')).accessToken || '') : '')).trim();
const DRY = process.env.DRY === '1';
const CAP = parseInt(process.env.CAP || '200', 10);
const WELLE2 = process.env.WELLE2 !== '0';
const EXPORT = process.env.EXPORT || '/tmp/export.jsonl';
const LEDGER = 'dropship/_cj_bild_backfill.txt';
const UNKLAR = 'dropship/_cj_bild_unklar.txt';       // id \t JJJJ-MM-TT \t ref — Tages-Merkliste (Punkt 2)
const ZIEL = 5;                                      // Bilder gesamt je Produkt (Karussell + Google)
// Ein Bild, das am 23.09. per Node-HEAD 200 gab — dient nur der Frage «lässt der Proxy den Host
// durch?». Antwortet curl 000/403/407, ist die OCR-Wache blind und der Lauf darf keine Punkte
// verbrennen. Ein 404 hiesse nur «Prüfbild veraltet», der Host wäre erreichbar.
const PRUEFBILD = 'https://cf.cjdropshipping.com/036abff9-ca7b-476c-92af-983879909004.jpg';
const EIMER_WARTE = 20000, EIMER_WARTE_LANG = 60000, EIMER_MAX_LEER = 600000;
const WELLE2_PROBE = 100, WELLE2_MIN = 0.10;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = m => console.log(`${new Date().toISOString().slice(11, 19)} ${m}`);

// Warum appendFileSync statt WriteStream: siehe Kopf, Punkt 3. Jede Zeile öffnet den Pfad neu.
function ledger(id, klasse, ref) {
  if (DRY) { log(`   DRY Ledger: ${id.split('/').pop()}\t${klasse}\t${ref}`); return; }
  fs.appendFileSync(LEDGER, `${id}\t${klasse}\t${ref}\t${new Date().toISOString()}\n`);
}

async function cj(path) {
  // 1600200 (QPS) und kaputtes JSON heissen «warte» — beides wird über die gemeinsame
  // Stempeluhr wiederholt, damit kein zweiter Prozess in dieselbe Drossel läuft.
  for (let i = 0; i < 5; i++) {
    try {
      await takt();
      const r = await fetch('https://developers.cjdropshipping.com/api2.0/v1' + path,
        { headers: { 'CJ-Access-Token': CJT }, signal: AbortSignal.timeout(45000) });
      const t = await r.text();
      let j; try { j = JSON.parse(t); } catch { await sleep(2000 * (i + 1)); continue; }
      if (Number(j.code) === 1600200) { await sleep(2000 * (i + 1)); continue; }
      return j;
    } catch { await sleep(2000 * (i + 1)); }
  }
  return { code: 0, data: null, message: 'keine Antwort nach 5 Versuchen' };
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
      await nachlauf(j);            // Eimer-Etikette: unter 600 Punkten warten (22.09., Runde 4)
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

// Liest das Bild per OCR und meldet die Zahl erkannter Wörter; -1 = nicht lesbar.
// ⚠️ DIESE WACHE FEHLTE IM ERSTEN LAUF, und das war teuer: Ein Kontaktbogen über 24 selbst
// ergänzte Bilder zeigte bei ACHT englischen Werbetext IM BILD («Deepened pot body design»,
// «Dog Grinding Teeth», «Shock-absorbing knee pads for safe running»). Google verbietet
// Werbetext im Produktbild, und in einem Schweizer Shop sagt englischer Marketingtext der
// Kundin, wo die Ware herkommt. Der Backfill hat also einen Mangel behoben und dabei einen
// neuen angelegt — deshalb prüft er jetzt jedes Bild, BEVOR er es anhängt.
// Die Schwelle ist geeicht, nicht geraten: bei denselben 24 Bildern las Tesseract bei jedem
// sauberen NULL Wörter und bei jedem Textbild vier bis sechsundvierzig. Dazwischen liegt
// nichts, ein Grenzfall existiert nicht.
function bildWoerter(u) {
  try {
    const r = spawnSync('python3', ['automation/bildtext_pruefen.py', '--url', u],
                        { encoding: 'utf8', timeout: 60000 });
    const n = parseInt((r.stdout || '').trim(), 10);
    return Number.isFinite(n) ? n : -1;
  } catch { return -1; }
}

// Antwortet der Proxy dem curl der OCR-Wache überhaupt? (Kopf, Punkt 4)
function proxyCode(u) {
  try {
    const r = spawnSync('curl', ['-sS', '-o', '/dev/null', '-w', '%{http_code}', '-I',
                                 '--max-time', '20', u], { encoding: 'utf8', timeout: 30000 });
    return (r.stdout || '').trim() || '000';
  } catch { return '000'; }
}

// Zwei URLs zeigen dasselbe Bild, wenn der Dateiname gleich ist — CJ liefert dieselbe Datei
// unter wechselnden Hosts aus. Ohne diesen Vergleich läge das Hauptbild zweimal am Produkt.
const dateiname = u => (u.split('?')[0].split('/').pop() || '').toLowerCase();

// Ledger lesen: je Produkt alle Klassen. Endgültig (für beide Wellen) ist, was CJ selbst
// beantwortet hat: keine weiteren Bilder, nichts Brauchbares, keine Referenz, CJ kennt es nicht.
// Welle 1 überspringt jede Zeile ohne «/w2» (v1-Semantik, rückwärtskompatibel); Welle 2 nur
// Zeilen mit «/w2» — ein «+N» aus Welle 1 darf dort genau einmal nachgeprüft werden.
const ENDGUELTIG = /^(keine-weiteren|nichts-brauchbar|keine-cj-ref|cj-kennt-nicht)(\/w2)?$/;
function ledgerLesen() {
  const m = new Map();
  if (!fs.existsSync(LEDGER)) return m;
  for (const l of fs.readFileSync(LEDGER, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    const [id, kl] = l.split('\t');
    if (!m.has(id)) m.set(id, []);
    m.get(id).push(kl || '');
  }
  return m;
}
function erledigt(done, id, welle) {
  const kl = done.get(id); if (!kl) return false;
  if (kl.some(k => ENDGUELTIG.test(k))) return true;
  return welle === 1 ? kl.some(k => !k.endsWith('/w2')) : kl.some(k => k.endsWith('/w2'));
}

// Tages-Merkliste für «Product not found» (Kopf, Punkt 2). Gibt true zurück, wenn der Treffer
// an einem ANDEREN Tag schon einmal vorkam — dann ist die Ware wirklich tot.
function notfound(id, ref) {
  const heute = new Date().toISOString().slice(0, 10);
  const tage = new Set();
  if (fs.existsSync(UNKLAR))
    for (const l of fs.readFileSync(UNKLAR, 'utf8').split('\n')) {
      const f = l.split('\t'); if (f[0] === id && f[1]) tage.add(f[1]);
    }
  if ([...tage].some(t => t !== heute)) return true;
  if (!tage.has(heute) && !DRY) fs.appendFileSync(UNKLAR, `${id}\t${heute}\t${ref}\n`);
  return false;
}

const SKU_FORMEN = [
  // `CJ-<pid>` (neuere Importe) → pid=  ·  `CJ-CJYD2867018` / `cj-CJMZ…` (ältere) → productSku=
  // (beide antworten 200 mit productImageSet; gemessen 22.09.: 17 bzw. 5 Bilder).
  // Dritte Form (22.09., 7 von 40 im ersten Lauf): `CJ-01638FF0-D4AA-…` (UUID) ist eine CJ-PRODUKT-ID
  // alter Form — `product/query?pid=<UUID>` antwortet 200 mit Bildern (gemessen: 8 und 6). ⚠️ Fast
  // falsch beurteilt: `variant/queryByVid` gab 20/20 «Variant not found», und 4'564 aktive Produkte
  // tragen diese Form — ein «not found» vom falschen Endpunkt beweist nichts (Lehre 09.08., steht
  // in cj_verfuegbarkeit.cj_kennt(): Form c = pid). Erst den Bestand lesen, dann messen.
  // ⚠️ 23.09.2026 22:57, GEMESSEN: `CJ-CJMY293180001AZ` ist eine VARIANTEN-SKU (Suffix \d{2}[A-Za-z]{2}).
  // `productSku=CJMY293180001AZ` → 1602001 «Product not found»; `variantSku=CJMY293180001AZ` → 200,
  // pid 2606121004231638500, 5 Bilder. v1 und Lauf C fragten den falschen Endpunkt — die «2 von 25
  // echte tote Ware» der Messung waren beide AZ-Form, und das Ledger trägt 0 «+N» für diese Form.
  // Dieselbe Regel steht seit 21.09. in cj_verfuegbarkeit.cj_kennt(). Ein «not found» vom falschen
  // Endpunkt beweist nichts (Lehre 09.08.). Der Variantenname hinter dem Bindestrich ist Deko.
  [/^cj-(\d{6,})/i, m => `/product/query?pid=${m[1]}`],
  [/^cj-([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})/i, m => `/product/query?pid=${m[1]}`],
  [/^cj-([A-Z]{2,8}\d{5,}[A-Z]{0,3})/i, m => /\d{2}[A-Za-z]{2}$/.test(m[1])
      ? `/product/query?variantSku=${m[1]}` : `/product/query?productSku=${m[1]}`],
];
const cjFrage = sku => { for (const [re, f] of SKU_FORMEN) { const m = sku.match(re); if (m) return f(m); } return null; };

const LIVE_Q = 'query($id:ID!){product(id:$id){status mediaCount{count} variants(first:1){nodes{sku}}' +
  ' media(first:25){nodes{id status ... on MediaImage{image{url}}}}}}';
const STATUS_Q = 'query($id:ID!){product(id:$id){media(first:25){nodes{id status}}}}';

async function main() {
  if (!CJT) { log('kein CJ-Token — Lauf endet'); return; }
  const done = ledgerLesen();
  const w1 = [], w2 = [];
  for (const zeile of fs.readFileSync(EXPORT, 'utf8').split('\n')) {
    if (!zeile.trim()) continue;
    let p; try { p = JSON.parse(zeile); } catch { continue; }
    if (p.status !== 'ACTIVE') continue;
    // ⚠️ 22.09.2026: Der Export trägt seit dem Umbau KEINE Varianten mehr (Felder: id, title,
    // status, tags, productType, g, mediaCount, priceRangeV2) — `sku` war immer '', der Lauf
    // meldete «0 Kandidaten» und schrieb FERTIG, und die FERTIG-Sperre hielt ihn seit 30.08.
    // fest, während 831 aktive CJ-Produkte mit einem Bild dastanden. Kandidat ist jedes aktive
    // `cj-real`; die SKU wird je Produkt live bei Shopify geholt. Der Google-Filter (`g`) ist
    // gefallen: er traf am 23.09. genau EIN Produkt.
    if (!(p.tags || []).includes('cj-real')) continue;
    const mc = typeof p.mediaCount === 'object' ? (p.mediaCount?.count || 0) : (p.mediaCount || 0);
    if (mc <= 1) { if (!erledigt(done, p.id, 1)) w1.push({ id: p.id, titel: p.title, welle: 1 }); }
    else if (mc <= 3 && WELLE2) { if (!erledigt(done, p.id, 2)) w2.push({ id: p.id, titel: p.title, welle: 2 }); }
  }
  log(`Kandidaten aus ${EXPORT}: Welle 1 (≤1 Bild) ${w1.length} · Welle 2 (2–3 Bilder) ${w2.length}` +
      ` · Ledger ${done.size} Produkte${DRY ? ' · DRY' : ''}`);
  const offen = [...w1, ...w2];
  if (!offen.length) { log('FERTIG: keine Kandidaten'); return; }

  // Vorprüfung Bildhost (Kopf, Punkt 4) — VOR dem ersten CJ-Punkt.
  const pc = proxyCode(PRUEFBILD);
  if (/^(000|403|407)$/.test(pc)) {
    log(`Bildhost cf.cjdropshipping.com über den Proxy gesperrt (curl ${pc}) — OCR-Wache blind, ` +
        `Egress-Policy melden, nicht umgehen`);
    if (!DRY) { log(`PAUSE: ${offen.length} offen (Bildhost gesperrt, 0 CJ-Punkte verbraucht)`); return; }
    log('   DRY läuft trotzdem weiter — Bilder gelten dann als ocr-offen');
  } else log(`Bildhost über Proxy erreichbar (curl ${pc})`);

  const tok = await shTok();
  const z = { ergaenzt: 0, ohne: 0, tot: 0, unklar: 0, werbetext: 0, ocrOffen: 0, schonMehr: 0,
              nichtAktiv: 0, kenntNicht: 0, notfound: 0, failed: 0, eimerWarte: 0, gefragt: 0 };
  let leerSeit = 0, leerFolge = 0, ocrOffenFolge = 0, pause = null;
  let w2gefragt = 0, w2gewinn = 0;
  let entschieden = 0;      // Produkte, die in diesem Lauf zu einem Ergebnis kamen (auch «unklar»)

  for (const o of offen) {
    // CAP zählt CJ-Anfragen (10 Punkte je Stück) — das ist die knappe Ressource, nicht die Produkte.
    if (z.gefragt >= CAP) { log(`CAP ${CAP} CJ-Anfragen erreicht`); break; }
    if (pause) break;
    if (w2gefragt >= WELLE2_PROBE && w2gewinn / w2gefragt < WELLE2_MIN) {
      log(`WELLE2 gestoppt: ${w2gewinn}/${w2gefragt} mit Zugewinn (< ${WELLE2_MIN * 100} %) — lohnt nicht`);
      break;
    }
    entschieden++;
    // 1. EINE Shopify-Lesung vor dem CJ-Aufruf (Kopf, Punkt 3).
    const sq = await sgql(tok, LIVE_Q, { id: o.id });
    const p = sq.data?.product;
    if (!p) { z.unklar++; log(`   unklar (Shopify ohne Antwort) ${o.id.split('/').pop()}`); continue; }
    const sku = p.variants?.nodes?.[0]?.sku || '';
    const mc = p.mediaCount?.count || 0;
    const welle = mc <= 1 ? 1 : 2;
    const sfx = welle === 2 ? '/w2' : '';
    if (p.status !== 'ACTIVE') { z.nichtAktiv++; ledger(o.id, 'nicht-aktiv' + sfx, sku); continue; }
    if (mc >= 4) { z.schonMehr++; ledger(o.id, 'schon-mehr-bilder' + sfx, sku); continue; }
    if (welle !== o.welle && erledigt(done, o.id, welle)) continue;   // Export stale, Live-Welle schon erledigt
    if (welle === 2 && !WELLE2) continue;
    const frage = cjFrage(sku);
    if (!frage) { ledger(o.id, 'keine-cj-ref' + sfx, sku); continue; }
    const maxbild = ZIEL - mc;
    const medienVorher = new Set((p.media?.nodes || []).map(n => n.id));
    const da = new Set((p.media?.nodes || []).map(n => dateiname(n?.image?.url || '')).filter(Boolean));

    // 2. CJ fragen — und bei leerem Eimer WARTEN statt weiterziehen (Kopf, Punkt 1).
    let dj;
    for (;;) {
      dj = await cj(frage);
      const code = Number(dj.code);
      if (code === 16900500) {
        if (!leerSeit) leerSeit = Date.now();
        leerFolge++;
        if (Date.now() - leerSeit > EIMER_MAX_LEER) {
          pause = `CJ-Punkte-Eimer seit ${Math.round((Date.now() - leerSeit) / 60000)} min leer`;
          entschieden--;          // dieses Produkt wurde nie beantwortet — bleibt offen
          break;
        }
        const w = leerFolge >= 3 ? EIMER_WARTE_LANG : EIMER_WARTE;
        z.eimerWarte += w / 1000;
        if (leerFolge === 1 || leerFolge % 5 === 0)
          log(`   Eimer leer (16900500), warte ${w / 1000} s … (${leerFolge}× in Folge)`);
        await sleep(w);
        continue;
      }
      break;
    }
    if (pause) break;
    z.gefragt++;
    const code = Number(dj.code);
    if (code === 200) { leerSeit = 0; leerFolge = 0; }
    else if (code === 1602001 || code === 1602002) {
      // ⚠️ Der v1-Kommentar nannte 16900500 als «not found» — falsch. 1602001 ist es (2 von 25,
      // beide Male). 1602002 «removed from shelves» ist dieselbe Endstation (cj_kosten_backfill).
      z.notfound++;
      if (notfound(o.id, sku)) { z.kenntNicht++; ledger(o.id, 'cj-kennt-nicht' + sfx, sku); log(`   cj-kennt-nicht (2. Tag) ${sku}`); }
      else log(`   CJ ${code} «${String(dj.message || '').slice(0, 40)}» ${sku} → Merkliste (1. Tag)`);
      continue;
    } else {
      // ⚠️ EINE FEHLGESCHLAGENE ANFRAGE IST KEIN «HAT KEINE BILDER». Der erste Lauf schrieb
      // beides in dasselbe Ledger und übersprang das Produkt damit für immer: 530 von 752
      // galten als bildlos. Nur `code === 200` beweist eine leere Liste; alles andere heisst
      // «später nochmal», und dann darf NICHTS ins Ledger.
      z.unklar++; log(`   unklar code=${code} «${String(dj.message || '').slice(0, 60)}» ${sku}`); continue;
    }
    if (welle === 2) w2gefragt++;
    const bilder = ((dj.data || {}).productImageSet || []).filter(u => /^https/.test(u));
    if (bilder.length <= mc) { z.ohne++; ledger(o.id, 'keine-weiteren' + sfx, sku); continue; }

    // 3. Bilder prüfen: Dublette, HTTP-200, Werbetext.
    const neu = []; let produktOcrOffen = false;
    for (const u of bilder) {
      if (neu.length >= maxbild) break;
      if (da.has(dateiname(u))) continue;
      if (!(await lebt(u))) { z.tot++; continue; }
      // Bis zu drei Wörter sind zulässig: ein Markenschriftzug auf dem Schuh, die Zahl auf
      // einem Zifferblatt. Ab vier ist es Fliesstext, also Werbung. −1 heisst «nicht lesbar»
      // und ist KEIN Freibrief — und seit heute auch kein Urteil über das Produkt (Punkt 4).
      const w = bildWoerter(u);
      if (w === -1) { produktOcrOffen = true; continue; }
      if (w >= 4) { z.werbetext++; continue; }
      da.add(dateiname(u));
      neu.push(u);
    }
    if (!neu.length) {
      if (produktOcrOffen) {
        z.ocrOffen++; ocrOffenFolge++;
        log(`   ocr-offen (Bild nicht lesbar, kein Ledger) ${sku}`);
        if (ocrOffenFolge >= 3) pause = 'OCR-Wache 3× in Folge blind (Bildhost über Proxy gesperrt?)';
        continue;
      }
      z.ohne++; ledger(o.id, 'nichts-brauchbar' + sfx, sku); continue;
    }
    ocrOffenFolge = 0;
    if (welle === 2) w2gewinn++;
    if (DRY) {
      log(`   DRY ${o.titel.slice(0, 40)} · hat ${mc} · CJ ${bilder.length} · würde +${neu.length} anhängen${produktOcrOffen ? ' (dazu ocr-offen)' : ''}`);
      ledger(o.id, `+${neu.length}` + sfx, sku);
      continue;
    }

    // 4. Anhängen und ZURÜCKLESEN (Kopf, Punkt 5).
    const r = await sgql(tok, 'mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(' +
      'productId:$id,media:$m){mediaUserErrors{message}}}',
      { id: o.id, m: neu.map(u => ({ originalSource: u, mediaContentType: 'IMAGE' })) });
    const fehler = r.data?.productCreateMedia?.mediaUserErrors;
    if (!r.data || (fehler && fehler.length)) {
      z.unklar++; log(`   ⚠️ ${o.titel.slice(0, 30)}: ${fehler?.[0]?.message?.slice(0, 60) || 'Mutation ohne Antwort'}`);
      continue;
    }
    let neueMedien = [];
    for (let v = 0; v < 3; v++) {
      await sleep(5000);
      const s = await sgql(tok, STATUS_Q, { id: o.id });
      neueMedien = (s.data?.product?.media?.nodes || []).filter(n => !medienVorher.has(n.id));
      if (neueMedien.length && !neueMedien.some(n => n.status === 'PROCESSING' || n.status === 'UPLOADED')) break;
    }
    const ready = neueMedien.filter(n => n.status === 'READY').length;
    const failed = neueMedien.filter(n => n.status === 'FAILED').length;
    const proc = neueMedien.length - ready - failed;
    if (!neueMedien.length) { z.unklar++; log(`   ⚠️ ${sku}: keine neuen Medien sichtbar nach 15 s (kein Ledger)`); continue; }
    if (failed) {
      z.failed += failed;
      ledger(o.id, `failed:${failed}` + sfx, sku);
      log(`   ⚠️ ${sku}: ${failed} von ${neueMedien.length} neuen Medien FAILED (ready ${ready}, proc ${proc})`);
      if (failed === neueMedien.length) { pause = `alle ${failed} neuen Medien FAILED — Dateispeicher? (Stopp-Regel)`; break; }
      continue;
    }
    z.ergaenzt++;
    ledger(o.id, `+${neueMedien.length}` + sfx, sku);
    log(`   +${neueMedien.length} ${o.titel.slice(0, 40)} (hatte ${mc}, ready ${ready}, proc ${proc}, W${welle})`);
    if (z.ergaenzt % 25 === 0)
      log(`   ${z.ergaenzt} ergänzt · ${z.ohne} ohne weitere · ${z.werbetext} Werbetext · ${z.ocrOffen} ocr-offen · ${z.unklar} unklar · Eimer-Wartezeit ${Math.round(z.eimerWarte)} s`);
  }

  const bilanz = `${z.ergaenzt} Produkte mit zusätzlichen Bildern, ${z.ohne} ohne weitere/brauchbare, ` +
    `${z.schonMehr} schon ≥4 Bilder, ${z.nichtAktiv} nicht aktiv, ${z.tot} URLs tot, ${z.werbetext} Bilder Werbetext, ` +
    `${z.ocrOffen} ocr-offen, ${z.notfound} not-found (${z.kenntNicht} endgültig), ${z.failed} FAILED, ` +
    `${z.unklar} unklar, CJ gefragt ${z.gefragt}, Eimer-Wartezeit ${Math.round(z.eimerWarte)} s` +
    (w2gefragt ? `, Welle 2: ${w2gewinn}/${w2gefragt} mit Zugewinn` : '');
  // Offen ist, was ohne Ledger-Zeile blieb (unklar, ocr-offen, not-found am 1. Tag) plus alles
  // hinter CAP/PAUSE. Der Kandidatenzähler des nächsten Laufs ist die Wahrheit; hier reicht die Summe.
  const nochOffen = (offen.length - entschieden) + z.unklar + z.ocrOffen + (z.notfound - z.kenntNicht);
  if (pause) log(`PAUSE: ${nochOffen} offen (${pause}) — ${bilanz}`);
  else if (nochOffen === 0 && !DRY) log(`FERTIG: ${bilanz}`);
  else log(`${DRY ? 'DRY-ENDE' : 'PAUSE'}: ${nochOffen} offen — ${bilanz}`);
}

main().catch(e => { log(`PAUSE: Absturz ${String(e && e.stack || e).slice(0, 300)}`); process.exit(1); });
