// Kettentest: das ERPROBTE Abgleich-Skript (byte-gleich mit dem Zweig) und das Stempel-Skript laufen hintereinander wie im Workflow, gegen eine
// Attrappe von Shopify (Varianten, inventorySetQuantities, Shop-Metafeld) und einen künstlichen Feed. Kein Netz, kein Fortura, kein echter Shop.
//   node dropship/lagerbestand-0511/kette_test.mjs
// Warum: stempel_test.mjs prüft den Parser mit einer ZEILE, die wir kennen; dieser Test prüft, dass die Zeilen, die das echte Skript ausgibt, vom Gate
// gelesen werden (Format-Abweichung zwischen Abgleich und Gate wäre sonst erst im ersten echten Lauf sichtbar). Gelaufen wird in vier Fällen:
//   1. Trockenlauf (DRY=1): ändert nichts, Gate ohne Schreibmodus zeigt nur an
//   2. Schreiblauf + Nachprüfung + Stempel: Shop gleich Feed, offen=0, Nachprüfung 0 zu ändern, Stempel gesetzt
//   3. Schreiblauf mit 6 Varianten, die Shopify ablehnt: Exit 1, offen=6, KEIN Stempel (auch wenn die Nachprüfung unter der 40er-Grenze liegt)
//   4. alter Feed (40 Stunden) -> KEIN Stempel
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const WURZEL = path.resolve(HIER, '../..');
const SYNC = path.join(WURZEL, 'automation/fortura_bestand_sync.mjs');
const STEMPEL = path.join(WURZEL, 'automation/fortura_bestand_stempel.mjs');

let n = 0, fehler = 0;
const ok = (bed, text) => { n++; if (!bed) { fehler++; console.log('  ✗', text); } };
const gleich = (ist, soll, text) => ok(JSON.stringify(ist) === JSON.stringify(soll), `${text}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);
const LOC = 'gid://shopify/Location/109350125953';   // fest im Abgleich-Skript
const tmpDirs = [];
const neuerTmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'kette-')); tmpDirs.push(d); return d; };

/* ---------- Attrappe (als vorgeschaltetes Modul, damit das echte Skript unverändert läuft) ---------- */
const vorlauf = path.join(neuerTmp(), 'sim_shop.mjs');
fs.writeFileSync(vorlauf, `
import fs from 'node:fs';
const ST = process.env.SIM_STATE;
const antwort = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  const body = init.body ? JSON.parse(init.body) : {};
  if (/access_token$/.test(url)) return antwort({ access_token: 'tok' });
  const s = JSON.parse(fs.readFileSync(ST, 'utf8'));
  const speichern = () => fs.writeFileSync(ST, JSON.stringify(s));
  const q = body.query || '';
  if (/productVariants\\(first:60/.test(q)) {
    const von = body.variables.c ? Number(body.variables.c) : 0, bis = von + 60;
    const nodes = s.varianten.slice(von, bis).map(v => ({ sku: v.sku, product: { id: 'gid://shopify/Product/' + v.sku, title: 'Artikel ' + v.sku, status: v.status },
      inventoryItem: { id: v.ii, tracked: v.tracked, inventoryLevels: { nodes: [{ location: { id: '${LOC}' }, updatedAt: '2026-11-01T00:00:00Z',
        quantities: [{ name: 'available', quantity: v.ist }, { name: 'committed', quantity: v.committed }] }] } } }));
    return antwort({ data: { productVariants: { pageInfo: { hasNextPage: bis < s.varianten.length, endCursor: String(bis) }, nodes } } });
  }
  if (/inventorySetQuantities/.test(q)) {
    const liste = body.variables.input.quantities;
    s.schreibaufrufe = (s.schreibaufrufe || 0) + 1;
    const fehl = liste.filter(x => { const v = s.varianten.find(w => w.ii === x.inventoryItemId); return !v || v.haengt || v.ist !== x.compareQuantity; });
    if (fehl.length) { speichern(); return antwort({ data: { inventorySetQuantities: { inventoryAdjustmentGroup: null, userErrors: [{ field: ['input'], message: 'compareQuantity passt nicht', code: 'COMPARE_QUANTITY_MISMATCH' }] } } }); }
    for (const x of liste) s.varianten.find(w => w.ii === x.inventoryItemId).ist = x.quantity;
    speichern();
    return antwort({ data: { inventorySetQuantities: { inventoryAdjustmentGroup: { createdAt: '2026-11-05T03:55:00Z' }, userErrors: [] } } });
  }
  if (/^\\s*\\{\\s*shop\\s*\\{\\s*id\\s*\\}\\s*\\}\\s*$/.test(q)) return antwort({ data: { shop: { id: 'gid://shopify/Shop/4242' } } });
  if (/metafieldsSet/.test(q)) { s.stempel = body.variables.m[0]; speichern(); return antwort({ data: { metafieldsSet: { metafields: [{ id: 'gid://shopify/Metafield/1' }], userErrors: [] } } }); }
  if (/metafield\\(namespace/.test(q)) return antwort({ data: { shop: { metafield: s.stempel ? { value: s.stempel.value } : null } } });
  throw new Error('unerwartete Abfrage: ' + q.slice(0, 80));
};
`);

/* ---------- Welt bauen: künstlicher Feed und passender Shop ---------- */
const ANZAHL = 300, OHNE_FEED = 4;   // 300 Varianten im Shop, vier davon nicht mehr im Feed
const JETZT = Date.now();
function welt({ haengen = 0, feedAlterH = 2 } = {}) {
  const d = neuerTmp();
  fs.mkdirSync(path.join(d, 'dropship'));
  fs.copyFileSync(path.join(WURZEL, 'dropship/_fortura_sperr_varianten.txt'), path.join(d, 'dropship/_fortura_sperr_varianten.txt'));
  fs.writeFileSync(path.join(d, 'dropship/FORTURA-BESTAND-FREI.txt'), 'ja\n');
  // Feed: 400 Zeilen, Bestand Fortura = i % 7 (6 von 7 Artikeln positiv), Puffer 1 -> Soll max(0, i % 7 - 1)
  const zeilen = ['ArtNr|Bezeichnung|Lagerbestand Bazar|Lagerbestand Fortura|Lagerbestand Total|Internet_VE'];
  for (let i = 0; i < 400; i++) zeilen.push(`A${String(i).padStart(5, '0')}|Artikel ${i}|3|${i % 7}|${3 + (i % 7)}|1`);
  const feed = path.join(d, 'feed.csv'); fs.writeFileSync(feed, zeilen.join('\r\n') + '\r\n', 'latin1');
  const t = new Date(JETZT - feedAlterH * 3600000); fs.utimesSync(feed, t, t);
  const soll = (i) => Math.max(0, (i % 7) - 1);
  const varianten = [];
  for (let i = 0; i < ANZAHL; i++) {
    // Die ersten 70 Varianten weichen vom Feed ab: 25 zu hoch (vor dem Lauf kaufbar, obwohl der Feed weniger meldet), 25 zu niedrig/auf 0, 20 auf 4.
    // Dazu die 4 Varianten, die nicht mehr im Feed stehen (Soll 0, Ist > 0). Wie viele es genau sind, rechnet `aenderungen` unten aus.
    let ist = soll(i);
    if (i < 25) ist = soll(i) + 3; else if (i < 50) ist = soll(i) === 0 ? 2 : 0; else if (i < 70) ist = 4;
    const sku = i < ANZAHL - OHNE_FEED ? `fortura-A${String(i).padStart(5, '0')}` : `fortura-ZZ${i}`;
    varianten.push({ sku, ii: `gid://shopify/InventoryItem/${100000 + i}`, tracked: true, status: i % 5 === 0 ? 'DRAFT' : 'ACTIVE', ist, committed: 0, haengt: i < haengen });
  }
  const ziel = (v, i) => (v.sku.startsWith('fortura-ZZ') ? 0 : soll(i));
  const aenderungen = varianten.filter((v, i) => v.ist !== ziel(v, i)).length;
  const stand = path.join(d, 'sim.json'); fs.writeFileSync(stand, JSON.stringify({ varianten, stempel: null }));
  return { d, feed, stand, soll, ziel, varianten, aenderungen };
}
const lies = (w) => JSON.parse(fs.readFileSync(w.stand, 'utf8'));
const env = (w, extra = {}) => ({
  PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin`, HOME: os.tmpdir(), FORTURA_CSV: w.feed, SHOPIFY_TOKEN_FILE: path.join(w.d, 'tok.txt'),
  SHOPIFY_CLIENT_ID: 'id', SHOPIFY_CLIENT_SECRET: 'secret', MIN_FEED_ROWS: '100', SIM_STATE: w.stand, ...extra,
});
function laufen(skript, w, e, datei) {   // wie «… 2>&1 | tee datei» im Workflow
  const r = spawnSync('bash', ['-c', 'node --import "$1" "$0" 2>&1', skript, pathToFileURL(vorlauf).href], { cwd: w.d, env: e, encoding: 'utf8', timeout: 170000 });
  if (datei) fs.writeFileSync(path.join(w.d, datei), r.stdout);
  return r;
}
const md5 = (p) => crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
const stempeln = (w, extra) => laufen(STEMPEL, w, env(w, { LIVE: '1', FEED_DATEI: w.feed, NACH_DATEI: path.join(w.d, 'lauf-nach.txt'), MIN_VARIANTEN: '100', ...extra }));

/* ---------- 1. Trockenlauf ---------- */
{
  const w = welt();
  const vorher = md5(w.stand);
  const r = laufen(SYNC, w, env(w, { DRY: '1' }), 'lauf-sync.txt');
  gleich(r.status, 0, 'Trockenlauf: Exit 0');
  ok(r.stdout.includes('[DRY] nichts geschrieben.'), 'Trockenlauf: Schlusszeile');
  gleich(md5(w.stand), vorher, 'Trockenlauf: der Shop (Attrappe) ist unverändert, kein einziger Schreibaufruf');
  ok(!fs.existsSync(path.join(w.d, 'dropship/_fortura_bestand_stand.json')), 'Trockenlauf: keine Stand-Datei');
  const zeile = r.stdout.split('\n').find(z => z.startsWith('Abgleich:'));
  ok(!!zeile, 'Trockenlauf: Zeile «Abgleich:» vorhanden');
  console.log('  (Trockenlauf)', zeile);
  const m = await import(pathToFileURL(STEMPEL).href);
  const z = m.parseAbgleichZeile(r.stdout);
  ok(z && z.zuAendern === w.aenderungen && z.unveraendert === ANZAHL - w.aenderungen, `Trockenlauf: Parser liest die echte Zeile (zu ändern ${z?.zuAendern} von erwartet ${w.aenderungen}, unverändert ${z?.unveraendert})`);
  ok(z && z.nichtImFeed === OHNE_FEED && z.ohneBestandsfuehrung === 0 && z.ohneCHLagerzeile === 0, 'Trockenlauf: alle Zahlen der echten Zeile werden gelesen');
  ok(/\(Fingerabdruck [0-9a-f]{12}\)/.test(r.stdout) && m.parseFingerabdruck(r.stdout) !== null, 'Trockenlauf: Fingerabdruck aus der echten Ausgabe lesbar');
  // Stempel im Trockenlauf-Modus des Workflows wird nicht aufgerufen; ruft man ihn trotzdem auf, scheitert das Gate an der fehlenden Stand-Datei
  const s = stempeln(w, { LIVE_EXIT: '0', NACH_EXIT: '0' });
  ok(s.status === 1 && /Stand-Datei fehlt/.test(s.stdout), 'Trockenlauf: Stempel ohne Live-Lauf scheitert am Gate (Stand-Datei fehlt)');
  gleich(lies(w).stempel, null, 'Trockenlauf: kein Stempel in der Attrappe');
}

/* ---------- 2. Schreiblauf, Nachprüfung, Stempel ---------- */
{
  const w = welt();
  const live = laufen(SYNC, w, env(w), 'lauf-sync.txt');
  gleich(live.status, 0, 'Schreiblauf: Exit 0');
  ok(live.stdout.includes(`FERTIG. geändert=${w.aenderungen} offen=0 unverändert=${ANZAHL - w.aenderungen}`), `Schreiblauf: «FERTIG. geändert=${w.aenderungen} offen=0 unverändert=${ANZAHL - w.aenderungen}»`);
  const s = lies(w);
  gleich(s.varianten.filter((v, i) => v.ist !== w.ziel(v, i)).length, 0, 'Schreiblauf: alle 300 Varianten stehen auf Feed-Soll (die 4 ausgelisteten auf 0)');
  const stand = JSON.parse(fs.readFileSync(path.join(w.d, 'dropship/_fortura_bestand_stand.json'), 'utf8'));
  ok(stand.offen === 0 && stand.geaendert === w.aenderungen && stand.varianten === ANZAHL && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/.test(stand.stand) && /^[0-9a-f]{12}$/.test(stand.feed_hash), 'Schreiblauf: Stand-Datei offen=0, geändert=Anzahl der Abweichungen, Format des Zeitstempels');
  ok(fs.existsSync(path.join(w.d, 'dropship/_fortura_bestand_log.tsv')) && fs.readFileSync(path.join(w.d, 'dropship/_fortura_bestand_log.tsv'), 'utf8').trim().split('\n').length === w.aenderungen, 'Schreiblauf: Journal mit einer Zeile je Änderung');
  const nach = laufen(SYNC, w, env(w, { DRY: '1' }), 'lauf-nach.txt');
  gleich(nach.status, 0, 'Nachprüfung: Exit 0');
  ok(/Abgleich: 300 unverändert · 0 zu ändern/.test(nach.stdout), 'Nachprüfung: «Abgleich: 300 unverändert · 0 zu ändern»');
  const st = stempeln(w, { LIVE_EXIT: String(live.status), NACH_EXIT: String(nach.status) });
  gleich(st.status, 0, 'Stempel: Exit 0');
  ok(/STEMPEL gesetzt: shop\.metafields\.luxe\.fortura_bestand_stand = \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/.test(st.stdout), 'Stempel: Meldung');
  const gesetzt = lies(w).stempel;
  gleich([gesetzt.ownerId, gesetzt.namespace, gesetzt.key, gesetzt.type], ['gid://shopify/Shop/4242', 'luxe', 'fortura_bestand_stand', 'single_line_text_field'], 'Stempel: Metafeld in der Attrappe');
  ok(Math.abs(Date.parse(gesetzt.value) - Date.now()) < 120000, 'Stempel: Wert ist von jetzt');
  console.log('  (Schreiblauf)', st.stdout.split('\n').find(z => z.startsWith('Gate:')));
  // zweiter Lauf desselben Tages ändert nichts mehr
  const nochmal = laufen(SYNC, w, env(w), 'lauf-sync2.txt');
  ok(nochmal.status === 0 && /FERTIG\. geändert=0 offen=0 unverändert=300/.test(nochmal.stdout), 'zweiter Schreiblauf: geändert=0 (idempotent)');
  console.log(`  (Zahlen) ${ANZAHL} Varianten im Shop, ${w.aenderungen} wichen vom Feed ab, nach dem Lauf 0`);
}

/* ---------- 3. Shopify lehnt 6 Varianten ab: kein Stempel ---------- */
{
  const w = welt({ haengen: 6 });
  const live = laufen(SYNC, w, env(w), 'lauf-sync.txt');
  gleich(live.status, 1, 'abgelehnte Zeilen: Abgleich endet mit Exit 1');
  const stand = JSON.parse(fs.readFileSync(path.join(w.d, 'dropship/_fortura_bestand_stand.json'), 'utf8'));
  gleich([stand.geaendert, stand.offen], [w.aenderungen - 6, 6], `abgelehnte Zeilen: geändert=${w.aenderungen - 6}, offen=6`);
  const nach = laufen(SYNC, w, env(w, { DRY: '1' }), 'lauf-nach.txt');
  const m = await import(pathToFileURL(STEMPEL).href);
  const z = m.parseAbgleichZeile(nach.stdout);
  gleich(z?.zuAendern, 6, 'abgelehnte Zeilen: Nachprüfung sieht noch 6 Abweichungen (unter der 40er-Grenze)');
  // (b) allein würde bestehen; (a) und (d) halten den Stempel zurück
  const e1 = m.stempelEntscheid({ liveExit: 0, nachText: nach.stdout, nachExit: 0, feedMtimeMs: fs.statSync(w.feed).mtimeMs, jetztMs: Date.now(), stand, opt: { minVarianten: 100 } });
  ok(!e1.ok && e1.gruende.length === 1 && e1.gruende[0].startsWith('(d)'), 'abgelehnte Zeilen: bei Exit 0 hielte allein «offen» den Stempel zurück (Gate d)');
  const st = stempeln(w, { LIVE_EXIT: String(live.status), NACH_EXIT: String(nach.status) });
  gleich(st.status, 1, 'abgelehnte Zeilen: Stempel verweigert, Exit 1');
  ok(/\(a\) Live-Lauf endete mit Exit 1/.test(st.stdout) && /\(d\) Stand-Datei trägt offen=6/.test(st.stdout), 'abgelehnte Zeilen: beide Gründe stehen in der Ausgabe');
  gleich(lies(w).stempel, null, 'abgelehnte Zeilen: kein Stempel in der Attrappe');
  const st2 = stempeln(w, { LIVE_EXIT: '0', NACH_EXIT: String(nach.status) });
  gleich(st2.status, 1, 'abgelehnte Zeilen: auch mit gefälschtem Live-Exit 0 verweigert (offen=6)');
  gleich(lies(w).stempel, null, 'abgelehnte Zeilen: weiterhin kein Stempel');
}

/* ---------- 4. alter Feed ---------- */
{
  const w = welt({ feedAlterH: 40 });
  const live = laufen(SYNC, w, env(w), 'lauf-sync.txt');
  const nach = laufen(SYNC, w, env(w, { DRY: '1' }), 'lauf-nach.txt');
  gleich([live.status, nach.status], [0, 0], 'alter Feed: Abgleich und Nachprüfung laufen durch');
  const st = stempeln(w, { LIVE_EXIT: '0', NACH_EXIT: '0' });
  gleich(st.status, 1, 'alter Feed (40 Stunden): Stempel verweigert');
  ok(/\(c\) Feed ist 40\.\d Stunden alt/.test(st.stdout), 'alter Feed: Grund (c) steht in der Ausgabe');
  gleich(lies(w).stempel, null, 'alter Feed: kein Stempel');
}

for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
console.log(`\n${n} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
