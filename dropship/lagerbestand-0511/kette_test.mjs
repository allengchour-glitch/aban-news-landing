// Kettentest: das ERPROBTE Abgleich-Skript (byte-gleich mit dem Zweig) und das Stempel-Skript laufen hintereinander wie im Workflow, gegen eine
// Attrappe von Shopify (Varianten, inventorySetQuantities, Shop-Metafeld) und einen künstlichen Feed. Kein Netz, kein Fortura, kein echter Shop.
//   node dropship/lagerbestand-0511/kette_test.mjs
// Warum: stempel_test.mjs prüft den Parser mit einer ZEILE, die wir kennen; dieser Test prüft, dass die Zeilen, die das echte Skript ausgibt, vom Gate
// gelesen werden (Format-Abweichung zwischen Abgleich und Gate wäre sonst erst im ersten echten Lauf sichtbar). Gelaufen wird in vier Fällen:
//   1. Trockenlauf (DRY=1): ändert nichts, Gate ohne Schreibmodus zeigt nur an
//   2. Schreiblauf + Nachprüfung + Stempel: Shop gleich Feed, offen=0, Nachprüfung 0 zu ändern, Stempel gesetzt
//   3. Schreiblauf mit 6 Varianten, die Shopify ablehnt: Exit 1, offen=6, KEIN Stempel (auch wenn die Nachprüfung unter der 40er-Grenze liegt)
//   4. alter Feed (40 Stunden) -> KEIN Stempel
//   5. Standardgrenzen des Stempel-Skripts im Prozess (MIN_VARIANTEN 6000; FORCE_ZERO im Stempel-Schritt wird abgelehnt)
//   6. die SCHRITTE DES WORKFLOWS selbst (aus der YAML gelesen, mit aufgelösten ${{ }}-Ausdrücken und den if-Bedingungen) hintereinander, in jeder Lage der Eingaben:
//      Zeitplan / Handstart × «schreiben» × «null_erlauben» × Freigabedatei, gegen eine Welt, in der die Nullungs-Bremse des Abgleichs anschlägt
//      (160 von 200 verkaufbaren Varianten gingen auf 0, Grenze 150) — ohne Freigabedatei wird nie geschrieben; die Bremse wird nur im Schreiblauf eines
//      Handstarts mit null_erlauben aufgehoben; die Nachprüfung läuft immer mit scharfer Bremse; der Stempel steht nur, wenn die Nachprüfung danach ≤ Grenze zeigt.
//      Testgrössen (nicht die des Betriebs): MIN_FEED_ROWS=100 und MIN_VARIANTEN=100 statt 18000 und 6000, ausser im Fall «echte Feed-Grenze».
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
    if (!s.ignorieren) for (const x of liste) s.varianten.find(w => w.ii === x.inventoryItemId).ist = x.quantity;
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
function arbeitsordner({ frei = true } = {}) {   // wie der Sparse-Checkout des Workflows: nur die nötigen Dateien (echte Kopien, keine Verknüpfung: das Stempel-Skript erkennt seinen Start am Pfad)
  const d = neuerTmp();
  fs.mkdirSync(path.join(d, 'dropship')); fs.mkdirSync(path.join(d, 'automation/lib'), { recursive: true });
  fs.copyFileSync(path.join(WURZEL, 'dropship/_fortura_sperr_varianten.txt'), path.join(d, 'dropship/_fortura_sperr_varianten.txt'));
  for (const f of ['fortura_bestand_sync.mjs', 'fortura_bestand_stempel.mjs', 'lib/shopify_gql.mjs', 'lib/shopify_secret.mjs', 'lib/shopify_host.mjs']) fs.copyFileSync(path.join(WURZEL, 'automation', f), path.join(d, 'automation', f));
  if (frei) fs.writeFileSync(path.join(d, 'dropship/FORTURA-BESTAND-FREI.txt'), 'ja\n');
  return d;
}
function welt({ haengen = 0, feedAlterH = 2, frei = true } = {}) {
  const d = arbeitsordner({ frei });
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

/* ---------- 5. Standardgrenzen des Stempel-Skripts im Prozess ---------- */
{
  const w = welt();
  const live = laufen(SYNC, w, env(w), 'lauf-sync.txt');
  const nach = laufen(SYNC, w, env(w, { DRY: '1' }), 'lauf-nach.txt');
  gleich([live.status, nach.status], [0, 0], 'Standardgrenzen: Abgleich und Nachprüfung laufen durch (Shop = Feed)');
  const ohneGrenze = (extra = {}) => laufen(STEMPEL, w, env(w, { LIVE: '1', FEED_DATEI: w.feed, NACH_DATEI: path.join(w.d, 'lauf-nach.txt'), LIVE_EXIT: '0', NACH_EXIT: '0', ...extra }));
  let st = ohneGrenze();
  gleich(st.status, 1, 'Standardgrenzen: ohne MIN_VARIANTEN gilt 6000: 300 gesehene Varianten genügen nicht, Exit 1');
  ok(/\(b\) Nachprüfung sah nur 300 Fortura-Varianten \(weniger als 6000\)/.test(st.stdout), 'Standardgrenzen: der Grund nennt 6000');
  gleich(lies(w).stempel, null, 'Standardgrenzen: kein Stempel');
  // FORCE_ZERO im Stempel-Schritt (geerbt): abgelehnt, auch wenn alles andere stimmt
  st = stempeln(w, { LIVE_EXIT: '0', NACH_EXIT: '0', FORCE_ZERO: '1' });
  gleich(st.status, 1, 'FORCE_ZERO im Stempel-Schritt: Exit 1');
  ok(/FORCE_ZERO ist im Stempel-Schritt gesetzt/.test(st.stdout), 'FORCE_ZERO im Stempel-Schritt: Grund steht in der Ausgabe');
  gleich(lies(w).stempel, null, 'FORCE_ZERO im Stempel-Schritt: kein Stempel');
  st = stempeln(w, { LIVE_EXIT: '0', NACH_EXIT: '0' });
  gleich(st.status, 0, 'Gegenprobe: dieselben Eingaben ohne FORCE_ZERO und mit Testgrenze 100 -> Stempel gesetzt');
  ok(!!lies(w).stempel, 'Gegenprobe: Stempel liegt in der Attrappe');
}

/* ---------- 6. Die Schritte des Workflows selbst, in jeder Lage der Eingaben ---------- */
const WF = path.join(WURZEL, '.github/workflows/fortura-bestand.yml');
const py = spawnSync('python3', ['-I', '-c', 'import sys,json,yaml\nd=yaml.safe_load(open(sys.argv[1],encoding="utf-8"))\nif True in d: d["on"]=d.pop(True)\njson.dump(d,sys.stdout,default=str)', WF], { encoding: 'utf8' });
ok(py.status === 0, 'Workflow-Kette: Workflow lesbar (python3 mit PyYAML)');
if (py.status === 0) {
  const wf = JSON.parse(py.stdout);
  const SCHRITTE = wf.jobs.abgleich.steps;
  const schritt = (id) => SCHRITTE.find(x => x.id === id);
  const SECRETS = { FORTURA_FTP_USER: 'u', FORTURA_FTP_PW: 'p', SHOPIFY_CLIENT_ID: 'id', SHOPIFY_CLIENT_SECRET: 'secret' };

  // Auflösung der einfachen Ausdrücke (nur die, die in den env-Blöcken dieser Schritte vorkommen)
  const aufloesen = (wert, ctx) => String(wert).replace(/\$\{\{\s*([^}]+?)\s*\}\}/g, (_, a) => {
    let mm;
    if ((mm = a.match(/^steps\.(\w+)\.outputs\.(\w+)$/))) return ctx.steps[mm[1]]?.outputs[mm[2]] ?? '';
    if ((mm = a.match(/^secrets\.(\w+)$/))) return SECRETS[mm[1]] ?? '';
    if (a === 'github.event_name') return ctx.ereignis;
    if ((mm = a.match(/^inputs\.(\w+)$/))) return ctx.inputs[mm[1]] ?? '';
    throw new Error('Ausdruck nicht auflösbar: ' + a);
  });
  // Bedingungen wie bei GitHub (null == '0' ist wahr; fehlende Ausgabe = null): dieselbe Auswertung wie in stempel_test.mjs
  const ghZahl = (v) => (v === null || v === undefined ? 0 : typeof v === 'boolean' ? Number(v) : typeof v === 'number' ? v : (String(v).trim() === '' ? 0 : Number(v)));
  const ghGleich = (a, b) => (typeof a === 'string' && typeof b === 'string' ? a.toLowerCase() === b.toLowerCase() : ghZahl(a) === ghZahl(b));
  const bedingung = (ausdruck, ctx) => {
    const js = ausdruck.replace(/^\$\{\{\s*|\s*\}\}$/g, '').replace(/([\w.]+)\s*(==|!=)\s*('[^']*')/g, (_, a, op, b) => `${op === '!=' ? '!' : ''}GLEICH(${a}, ${b})`);
    const steps = new Proxy({}, { get: (_, id) => ({ outputs: new Proxy(ctx.steps[id]?.outputs || {}, { get: (o, k) => (o[k] === undefined || o[k] === '' ? null : o[k]) }) }) });
    return Boolean(new Function('steps', 'cancelled', 'always', 'GLEICH', `return (${js});`)(steps, () => false, () => true, ghGleich));
  };

  // Eine Welt, in der die Nullungs-Bremse des Abgleichs anschlägt: 200 Varianten, alle mit Bestand 3; der Feed meldet nur bei jeder fünften Fortura-Bestand
  // (Soll 4), bei den übrigen 160 keinen (Soll 0). 160 verkaufbare Varianten gehen auf 0: mehr als max(150, 15 % von 200). Der Anteil mit Bestand im Feed
  // (20 %) liegt über der Feed-Bremse (15 %).
  const NULL_ANZAHL = 200;
  const nullSoll = (i) => (i % 5 === 0 ? 4 : 0);
  function weltNull({ frei = true, ignorieren = false } = {}) {
    const d = arbeitsordner({ frei });
    const zeilen = ['ArtNr|Bezeichnung|Lagerbestand Bazar|Lagerbestand Fortura|Lagerbestand Total|Internet_VE'];
    for (let i = 0; i < NULL_ANZAHL; i++) zeilen.push(`B${String(i).padStart(5, '0')}|Artikel ${i}|0|${i % 5 === 0 ? 5 : 0}|${i % 5 === 0 ? 5 : 0}|1`);
    const feed = path.join(d, 'feed.csv'); fs.writeFileSync(feed, zeilen.join('\r\n') + '\r\n', 'latin1');
    const t = new Date(JETZT - 2 * 3600000); fs.utimesSync(feed, t, t);
    const varianten = [];
    for (let i = 0; i < NULL_ANZAHL; i++) varianten.push({ sku: `fortura-B${String(i).padStart(5, '0')}`, ii: `gid://shopify/InventoryItem/${200000 + i}`, tracked: true, status: 'ACTIVE', ist: 3, committed: 0, haengt: false });
    const stand = path.join(d, 'sim.json'); fs.writeFileSync(stand, JSON.stringify({ varianten, stempel: null, ignorieren }));
    return { d, feed, stand };
  }

  // Führt modus -> Abgleich -> (Nachprüfung) -> (Stempel) so aus, wie GitHub es täte: Ausdrücke aufgelöst, Bedingungen ausgewertet.
  // `testgroessen`: false lässt MIN_FEED_ROWS beim echten Wert des Workflows (18000). `geerbt`: Umgebungsvariablen, die schon im Runner stehen (z. B. ein
  // von aussen gesetztes FORCE_ZERO=1); jeder Schritt sieht sie, bis er sie selbst löscht.
  function kette(w, { ereignis, schreiben = '', nullErlauben = '', testgroessen = true, geerbt = {} }) {
    const ctx = { steps: {}, ereignis, inputs: ereignis === 'schedule' ? {} : { schreiben, null_erlauben: nullErlauben } };
    // Ein Zeitplan-Lauf kennt keine Eingaben. Ein (hypothetisch) mitgeschickter Wert wird über die Job-Umgebung durchgereicht, um den Schutz zu prüfen.
    const jobEnv = Object.fromEntries(Object.entries(wf.jobs.abgleich.env || {}).map(([k, v]) => [k, aufloesen(v, ctx)]));
    if (ereignis === 'schedule') { jobEnv.SCHREIBEN_EINGABE = schreiben; jobEnv.NULL_ERLAUBEN_EINGABE = nullErlauben; }
    const basis = { PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin`, HOME: os.tmpdir(), NODE_OPTIONS: `--import=${pathToFileURL(vorlauf).href}`, SIM_STATE: w.stand,
      FORTURA_CSV: w.feed, SHOPIFY_TOKEN_FILE: path.join(w.d, 'tok.txt'), RUNNER_TEMP: w.d, ...geerbt };
    const gefahren = {};
    const fahre = (id) => {
      const st = schritt(id), out = path.join(w.d, `gh_out_${id}`); fs.writeFileSync(out, '');
      const e = { ...basis, ...jobEnv, ...Object.fromEntries(Object.entries(st.env || {}).map(([k, v]) => [k, aufloesen(v, ctx)])), GITHUB_OUTPUT: out };
      if (testgroessen && (id === 'sync' || id === 'nach')) e.MIN_FEED_ROWS = '100';
      if (testgroessen && id === 'stempel') e.MIN_VARIANTEN = '100';
      const r = spawnSync('bash', ['-e', '-c', st.run], { cwd: w.d, env: e, encoding: 'utf8', timeout: 170000 });
      ctx.steps[id] = { outputs: Object.fromEntries(fs.readFileSync(out, 'utf8').split('\n').filter(Boolean).map(z => { const i = z.indexOf('='); return [z.slice(0, i), z.slice(i + 1)]; })) };
      gefahren[id] = true; return r;
    };
    fahre('modus');
    fahre('sync');
    const nachLaeuft = bedingung(schritt('nach').if, ctx); if (nachLaeuft) fahre('nach');
    const stempelLaeuft = bedingung(schritt('stempel').if, ctx); if (stempelLaeuft) fahre('stempel');
    const text = (f) => (fs.existsSync(path.join(w.d, f)) ? fs.readFileSync(path.join(w.d, f), 'utf8') : '');
    return {
      live: ctx.steps.modus.outputs.live, forceZero: ctx.steps.modus.outputs.force_zero,
      rc: { sync: ctx.steps.sync.outputs.rc, nach: ctx.steps.nach?.outputs.rc, stempel: ctx.steps.stempel?.outputs.rc },
      nachLaeuft, stempelLaeuft, logSync: text('lauf-sync.txt'), logNach: text('lauf-nach.txt'), logStempel: text('lauf-stempel.txt'),
    };
  }
  const BREMSE = /ABBRUCH \(Nullungs-Bremse\): 160 von 200 verkaufbaren Varianten würden auf 0 fallen \(Grenze 150\)/;
  const ZEIT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  const nullZiel = (w) => lies(w).varianten.filter((v, i) => v.ist !== nullSoll(i)).length;

  // 6.0 Grundprobe: normaler Tageslauf über die Schritte des Workflows (Zeitplan, Freigabe, Shop weicht um 71 Varianten ab)
  {
    const w = welt(); const r = kette(w, { ereignis: 'schedule' });
    gleich([r.live, r.forceZero], ['1', '0'], 'Kette Zeitplan (normaler Tag): live=1, Bremse nicht aufgehoben');
    gleich(r.rc, { sync: '0', nach: '0', stempel: '0' }, 'Kette Zeitplan (normaler Tag): Abgleich, Nachprüfung, Stempel alle Exit 0');
    gleich(lies(w).varianten.filter((v, i) => v.ist !== w.ziel(v, i)).length, 0, 'Kette Zeitplan (normaler Tag): der Shop steht auf dem Feed-Soll');
    ok(ZEIT.test(lies(w).stempel?.value || ''), 'Kette Zeitplan (normaler Tag): Stempel gesetzt');
  }

  // 6.1 Zeitplan mit Freigabe: die Bremse schlägt an, nichts wird geschrieben, kein Stempel — auch wenn ein Auslöser «null_erlauben» mitschickte
  for (const [name, optionen] of [
    ['Zeitplan', { ereignis: 'schedule' }],
    ['Zeitplan mit (hypothetisch) mitgeschicktem null_erlauben=true', { ereignis: 'schedule', schreiben: 'true', nullErlauben: 'true' }],
    ['Handstart schreiben=true, null_erlauben=false', { ereignis: 'workflow_dispatch', schreiben: 'true', nullErlauben: 'false' }],
    ['Handstart schreiben=true ohne null_erlauben', { ereignis: 'workflow_dispatch', schreiben: 'true' }],
    ['Zeitplan mit von aussen geerbtem FORCE_ZERO=1 im Runner', { ereignis: 'schedule', geerbt: { FORCE_ZERO: '1' } }],
    ['Handstart schreiben=true ohne null_erlauben, aber mit geerbtem FORCE_ZERO=1', { ereignis: 'workflow_dispatch', schreiben: 'true', geerbt: { FORCE_ZERO: '1' } }],
  ]) {
    const w = weltNull(); const vor = md5(w.stand);
    const r = kette(w, optionen);
    gleich([r.live, r.forceZero], ['1', '0'], `Kette ${name}: live=1, Bremse NICHT aufgehoben`);
    gleich(r.rc.sync, '2', `Kette ${name}: Abgleich bleibt an der Nullungs-Bremse stehen (Exit 2)`);
    ok(BREMSE.test(r.logSync), `Kette ${name}: das Log nennt die Bremse mit 160 von 200`);
    gleich(md5(w.stand), vor, `Kette ${name}: im Shop (Attrappe) wurde nichts geändert`);
    ok(!r.nachLaeuft, `Kette ${name}: keine Nachprüfung nach Exit 2`);
    gleich([r.stempelLaeuft, r.rc.stempel, lies(w).stempel], [true, '1', null], `Kette ${name}: der Stempel-Schritt läuft, verweigert (Exit 1), kein Stempel`);
  }

  // 6.2 Handstart mit schreiben=true UND null_erlauben=true: die Bremse ist für den Schreiblauf aufgehoben, danach prüft die Nachprüfung mit scharfer Bremse
  {
    const w = weltNull(); const r = kette(w, { ereignis: 'workflow_dispatch', schreiben: 'true', nullErlauben: 'true' });
    gleich([r.live, r.forceZero], ['1', '1'], 'Kette null_erlauben: live=1, force_zero=1');
    gleich(r.rc, { sync: '0', nach: '0', stempel: '0' }, 'Kette null_erlauben: Abgleich, Nachprüfung, Stempel alle Exit 0');
    ok(/FERTIG\. geändert=200 offen=0 unverändert=0/.test(r.logSync) && !/Nullungs-Bremse/.test(r.logSync), 'Kette null_erlauben: alle 200 Varianten geschrieben, keine Bremse im Log');
    gleich(nullZiel(w), 0, 'Kette null_erlauben: der Shop steht auf dem Feed-Soll (160 auf 0, 40 auf 4)');
    ok(/Abgleich: 200 unverändert · 0 zu ändern/.test(r.logNach) && /\[DRY\] nichts geschrieben\./.test(r.logNach), 'Kette null_erlauben: die Nachprüfung zeigt 0 Abweichungen und lief zu Ende');
    ok(ZEIT.test(lies(w).stempel?.value || '') && /STEMPEL gesetzt/.test(r.logStempel), 'Kette null_erlauben: Stempel gesetzt');
  }
  // 6.3 Die Nachprüfung läuft mit scharfer Bremse: «erfolgreiche» Schreibaufrufe, die den Shop nicht ändern, dürfen nie einen Stempel ergeben —
  //     auch dann nicht, wenn im Runner schon ein FORCE_ZERO=1 steht (die Nachprüfung löscht es, bevor sie rechnet)
  for (const [name, geerbt] of [['', {}], [' (mit geerbtem FORCE_ZERO=1)', { FORCE_ZERO: '1' }]]) {
    const w = weltNull({ ignorieren: true }); const r = kette(w, { ereignis: 'workflow_dispatch', schreiben: 'true', nullErlauben: 'true', geerbt });
    gleich([r.live, r.forceZero, r.rc.sync], ['1', '1', '0'], `Kette ohne Wirkung${name}: Schreiblauf meldet Erfolg (Exit 0), Bremse war aufgehoben`);
    ok(r.nachLaeuft && r.rc.nach === '2' && BREMSE.test(r.logNach), `Kette ohne Wirkung${name}: die Nachprüfung läuft mit SCHARFER Bremse und bricht ab (Exit 2)`);
    ok(/Abgleich: 0 unverändert · 200 zu ändern/.test(r.logNach), `Kette ohne Wirkung${name}: die Nachprüfung sieht alle 200 Abweichungen`);
    gleich([r.stempelLaeuft, r.rc.stempel, lies(w).stempel], [true, '1', null], `Kette ohne Wirkung${name}: Stempel verweigert (Exit 1), kein Stempel`);
    ok(/\(b\) Nachprüfung: 200 Varianten weichen noch vom Feed ab/.test(r.logStempel) && /ABBRUCH/.test(r.logStempel), `Kette ohne Wirkung${name}: der Grund nennt die 200 verbliebenen Abweichungen und den Abbruch`);
  }
  // 6.4 Handstart ohne «schreiben»: Lesemodus, die Eingabe null_erlauben ändert nichts
  {
    const w = weltNull(); const vor = md5(w.stand); const r = kette(w, { ereignis: 'workflow_dispatch', schreiben: 'false', nullErlauben: 'true' });
    gleich([r.live, r.forceZero], ['0', '0'], 'Kette Lesemodus + null_erlauben: live=0, Bremse nicht aufgehoben');
    gleich(r.rc.sync, '2', 'Kette Lesemodus + null_erlauben: auch der Trockenlauf bleibt an der Bremse stehen');
    ok(BREMSE.test(r.logSync) && !/\[DRY\] nichts geschrieben\./.test(r.logSync), 'Kette Lesemodus + null_erlauben: Bremse im Log');
    gleich([md5(w.stand), r.nachLaeuft, r.stempelLaeuft], [vor, false, false], 'Kette Lesemodus + null_erlauben: nichts geändert, weder Nachprüfung noch Stempel');
  }
  // 6.5 Ohne Freigabedatei wird nie geschrieben, in jeder Kombination der Eingaben (normale Welt: ein Schreiblauf wäre am Shop sichtbar)
  for (const [name, optionen] of [
    ['Zeitplan', { ereignis: 'schedule' }],
    ['Zeitplan mit null_erlauben', { ereignis: 'schedule', schreiben: 'true', nullErlauben: 'true' }],
    ['Handstart schreiben=true', { ereignis: 'workflow_dispatch', schreiben: 'true' }],
    ['Handstart schreiben=true, null_erlauben=true', { ereignis: 'workflow_dispatch', schreiben: 'true', nullErlauben: 'true' }],
  ]) {
    const w = welt({ frei: false }); const vor = md5(w.stand);
    const r = kette(w, optionen);
    gleich([r.live, r.forceZero], ['0', '0'], `Kette ohne Freigabedatei, ${name}: live=0, Bremse nicht aufgehoben`);
    gleich([r.rc.sync, md5(w.stand), r.nachLaeuft, r.stempelLaeuft, lies(w).stempel], ['0', vor, false, false, null], `Kette ohne Freigabedatei, ${name}: Trockenlauf, Shop unverändert, keine Nachprüfung, kein Stempel`);
    ok(/\[DRY\] nichts geschrieben\./.test(r.logSync) && !fs.existsSync(path.join(w.d, 'dropship/_fortura_bestand_stand.json')), `Kette ohne Freigabedatei, ${name}: «[DRY] nichts geschrieben.», keine Stand-Datei`);
  }
  {
    const w = weltNull({ frei: false }); const vor = md5(w.stand);
    const r = kette(w, { ereignis: 'workflow_dispatch', schreiben: 'true', nullErlauben: 'true' });
    gleich([r.live, r.forceZero, r.rc.sync, md5(w.stand), r.stempelLaeuft], ['0', '0', '2', vor, false], 'Kette ohne Freigabedatei in der Welt mit anschlagender Bremse: Bremse bleibt scharf, nichts geschrieben');
  }
  // 6.6 Echte Feed-Grenze des Workflows (MIN_FEED_ROWS=18000): ein 400-Zeilen-Feed gilt als abgeschnitten
  {
    const w = welt(); const vor = md5(w.stand);
    const r = kette(w, { ereignis: 'schedule', testgroessen: false });
    gleich(r.rc.sync, '2', 'Kette mit MIN_FEED_ROWS des Workflows (18000): Abgleich bricht ab (Exit 2)');
    ok(/OFFEN: Feed hat nur \d+ Zeilen \(< 18000\) — abgeschnittener Download/.test(r.logSync), 'Kette mit MIN_FEED_ROWS des Workflows: Meldung nennt 18000');
    gleich([md5(w.stand), r.nachLaeuft, r.rc.stempel, lies(w).stempel], [vor, false, '1', null], 'Kette mit MIN_FEED_ROWS des Workflows: nichts geschrieben, kein Stempel');
  }
}

for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
console.log(`\n${n} Prüfungen, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
