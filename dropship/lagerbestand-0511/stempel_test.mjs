// Test für den Fortura-Bestandsabgleich im Dauerbetrieb (Stempel-Skript, Workflow, Unverändertheit des erprobten Skripts). Kein Netz, kein Shopify.
//   node dropship/lagerbestand-0511/stempel_test.mjs
// Geprüft wird:
//   1. das erprobte Abgleich-Skript und die Sperrliste sind byte-gleich mit dem Stand auf dem Zweig claude/luxestyle-status-tztnn1 (SHA1)
//   2. stempelEntscheid: jede Grenze des Gates (Exit, 40 / 1 %, 36 Stunden, offen, Stand-Datei, Fingerabdruck, Nachprüfung zu Ende)
//   3. Parser der Zeile «Abgleich: X unverändert · Y zu ändern …» (mit der echten Zeile aus dem Probelauf), Zeitstempelformat
//   4. Attrappe der Shopify-API: richtige Variablen für metafieldsSet, userErrors -> Exit 1, Zurücklesen, Token, fehlende Zugänge -> Exit 2,
//      bei nicht bestandenem Gate wird NIE ein Aufruf gemacht
//   5. das Skript als Prozess (Exit-Codes 0/1/2, Trockenlauf, mit vorgeschaltetem fetch)
//   6. der Workflow: YAML-Schlüssel, Modus-Logik (wirklich ausgeführt, alle Kombinationen aus Freigabedatei, Ereignis, «schreiben» und «null_erlauben»),
//      Schritte mit Attrappen-Skripten (Exit-Weitergabe, DRY, Secret-Bereinigung, FORCE_ZERO nur im Schreiblauf, MIN_FEED_ROWS), Protokoll-Bereinigung
//      (keine Produkttitel, kein Feed, kein Token im Artefakt; 7 Tage)
// Für die Mutationsprobe (stempel_mutation.mjs) liest der Test seine Dateien relativ zu seinem eigenen Ort: eine Kopie des Baums wird mit
// derselben Datei geprüft.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const WURZEL = path.resolve(HIER, '../..');
const STEMPEL = path.join(WURZEL, 'automation/fortura_bestand_stempel.mjs');
const m = await import(pathToFileURL(STEMPEL).href);

let n = 0, fehler = 0, uebersprungen = 0;
const ok = (bed, text) => { n++; if (!bed) { fehler++; console.log('  ✗', text); } };
const gleich = (ist, soll, text) => ok(JSON.stringify(ist) === JSON.stringify(soll), `${text}: ist ${JSON.stringify(ist)}, soll ${JSON.stringify(soll)}`);
const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex');
const tmp = (p) => fs.mkdtempSync(path.join(os.tmpdir(), p));
const tmpDirs = [];
const neuerTmp = (p) => { const d = tmp(p); tmpDirs.push(d); return d; };

/* ============ 1. Erprobtes Skript unverändert ============ */
{
  const SYNC_SHA1 = '0dc135363bd9c5b7259bb0d49d7dd793057fe3f2';      // Zweigfassung (git show origin/claude/luxestyle-status-tztnn1:automation/fortura_bestand_sync.mjs)
  const SPERR_SHA1 = '37af707bed8f00d8448cb668099ae0b8fe560e3c';     // dropship/_fortura_sperr_varianten.txt auf demselben Zweig
  const sync = fs.readFileSync(path.join(WURZEL, 'automation/fortura_bestand_sync.mjs'));
  gleich(sha1(sync), SYNC_SHA1, 'fortura_bestand_sync.mjs ist byte-gleich mit der Zweigfassung');
  gleich(sync.toString('utf8').split('\n').length - 1, 360, 'fortura_bestand_sync.mjs hat 360 Zeilen');
  gleich(sha1(fs.readFileSync(path.join(WURZEL, 'dropship/_fortura_sperr_varianten.txt'))), SPERR_SHA1, 'Sperrliste ist byte-gleich mit der Zweigfassung');
  // Die Dateien, die der Abgleich zur Laufzeit relativ zum Arbeitsverzeichnis liest/schreibt, passen zur Sparse-Liste des Workflows
  const t = sync.toString('utf8');
  ok(t.includes("'dropship/_fortura_sperr_varianten.txt'"), 'Abgleich liest die Sperrliste unter dropship/');
  ok(t.includes("'dropship/_fortura_bestand_stand.json'") && t.includes("'dropship/_fortura_bestand_log.tsv'") && t.includes("'dropship/_fortura_bestand_report.md'"), 'Abgleich schreibt Stand, Journal, Bericht unter dropship/');
  ok(/process\.exit\(fehler \? 1 : 0\)/.test(t), 'Abgleich: Exit 1 bei offenen Zeilen');
  ok(/stand: new Date\(\)\.toISOString\(\)\.slice\(0, 16\) \+ 'Z'/.test(t) && /offen: fehler/.test(t), 'Stand-Datei: Feld «stand» (Minuten) und «offen» wie vom Gate erwartet');
}

/* ============ 2. Zeitstempel und Parser ============ */
{
  const re = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  gleich(m.stempelWert(new Date(0)), '1970-01-01T00:00:00Z', 'Stempel Epoche');
  gleich(m.stempelWert(new Date(Date.UTC(2026, 10, 5, 3, 51, 7, 999))), '2026-11-05T03:51:07Z', 'Stempel ohne Millisekunden, nicht gerundet');
  gleich(m.stempelWert(Date.UTC(2026, 11, 31, 23, 59, 59)), '2026-12-31T23:59:59Z', 'Stempel aus Zahl');
  ok(re.test(m.stempelWert()), 'Stempel jetzt hat das Format YYYY-MM-DDTHH:MM:SSZ');
  let wirft = false; try { m.stempelWert(new Date('kaputt')); } catch { wirft = true; }
  ok(wirft, 'ungültiges Datum wirft');
  const jetzt = Date.UTC(2026, 10, 5, 3, 58, 12);
  gleich(Date.parse(m.stempelWert(new Date(jetzt))), jetzt, 'Stempel lässt sich zurückparsen');

  const ECHT = 'Abgleich: 6532 unverändert · 1884 zu ändern (davon 161 auf 0) · 8 SKU nicht mehr im Feed (0.1 %) · 0 ohne Bestandsführung (unangetastet) · 0 ohne CH-Lagerzeile';
  gleich(m.parseAbgleichZeile(ECHT), {
    unveraendert: 6532, zuAendern: 1884, davonAufNull: 161, nichtImFeed: 8, nichtImFeedProzent: 0.1, ohneBestandsfuehrung: 0, ohneCHLagerzeile: 0,
  }, 'echte Zeile aus dem Probelauf');
  gleich(m.parseAbgleichZeile('\n' + ECHT + '\nACTIVE: 1')?.zuAendern, 1884, 'Zeile mitten im Text');
  gleich(m.parseAbgleichZeile('Abgleich: 10 unverändert · 5 zu ändern (davon 1 auf 0)\nAbgleich: 20 unverändert · 3 zu ändern')?.zuAendern, 3, 'mehrere Zeilen: die letzte zählt');
  gleich(m.parseAbgleichZeile('Abgleich: 10 unverändert · 5 zu ändern')?.davonAufNull, null, 'fehlende Teile werden null, nicht 0');
  gleich(m.parseAbgleichZeile(''), null, 'leerer Text');
  gleich(m.parseAbgleichZeile(undefined), null, 'undefined');
  gleich(m.parseAbgleichZeile('Abgleich: viele unverändert · wenige zu ändern'), null, 'Wörter statt Zahlen');
  gleich(m.parseAbgleichZeile('Der Abgleich lief gut.'), null, 'Text ohne die Zeile');
  gleich(m.parseAbgleichZeile('Abgleich: 1 unverändert · 2 zu ändern\r\n')?.zuAendern, 2, 'CRLF');
  gleich(m.parseFingerabdruck('Feed /tmp/x.csv: 19953 Zeilen → 18578 Artikelnummern (Fingerabdruck 0a1b2c3d4e5f)'), '0a1b2c3d4e5f', 'Fingerabdruck');
  gleich(m.parseFingerabdruck('nichts'), null, 'kein Fingerabdruck');
  gleich(m.nachpruefungZuEnde('x\n[DRY] nichts geschrieben.\n'), { zuEnde: true, abbruch: false }, 'Nachprüfung zu Ende');
  gleich(m.nachpruefungZuEnde('Abgleich: 1 unverändert · 2 zu ändern\nABBRUCH (Nullungs-Bremse): 300 …'), { zuEnde: false, abbruch: true }, 'Nachprüfung abgebrochen');
  gleich(m.nachpruefungZuEnde('OFFEN: Feed fehlt'), { zuEnde: false, abbruch: true }, 'Nachprüfung OFFEN');
}

/* ============ 3. stempelEntscheid: das Gate ============ */
const JETZT = Date.UTC(2026, 10, 5, 3, 58, 12);
const STUNDE = 3600000;
const nachText = (x, y, fp = 'abc123def456') =>
  `Feed /x/feed.csv: 19953 Zeilen → 18578 Artikelnummern (Fingerabdruck ${fp})\nShop: ${x + y} Varianten mit SKU fortura-* auf 141 Seiten\n\n` +
  `Abgleich: ${x} unverändert · ${y} zu ändern (davon 2 auf 0) · 8 SKU nicht mehr im Feed (0.1 %) · 0 ohne Bestandsführung (unangetastet) · 0 ohne CH-Lagerzeile\n` +
  `ACTIVE: 3000 Varianten · verkaufbar vorher 2000 → nachher 1998\n\n[DRY] nichts geschrieben.\n`;
const gut = (u = {}) => ({
  liveExit: 0, nachText: nachText(8400, 16), nachExit: 0, feedMtimeMs: JETZT - 2 * STUNDE, jetztMs: JETZT,
  stand: { stand: '2026-11-05T03:55Z', feed_hash: 'abc123def456', offen: 0, geaendert: 1884, varianten: 8416 }, ...u,
});
const entscheid = (u) => m.stempelEntscheid(gut(u));
const hat = (e, teil) => e.gruende.some(g => g.includes(teil));
{
  const e = entscheid();
  ok(e.ok && e.gruende.length === 0, 'alles in Ordnung -> Stempel erlaubt');
  gleich([e.mess.unveraendert, e.mess.zuAendern, e.mess.summe, e.mess.grenze, e.mess.feedAlterH, e.mess.offen], [8400, 16, 8416, 84, 2, 0], 'Messwerte');

  // (a) Exit-Code des Live-Laufs
  for (const x of [1, 2, 3, 124, 137]) ok(!entscheid({ liveExit: x }).ok && hat(entscheid({ liveExit: x }), `Exit ${x}`), `(a) Exit ${x} -> kein Stempel`);
  for (const x of [undefined, null, NaN, '0', '', 0.5, -1]) ok(!entscheid({ liveExit: x }).ok, `(a) liveExit ${JSON.stringify(x)} -> kein Stempel`);
  ok(hat(entscheid({ liveExit: undefined }), 'unbekannt'), '(a) fehlender Exit-Code wird als unbekannt gemeldet');

  // (b) Grenze max(40, 1 % von X+Y)
  const klein = { minVarianten: 10 };
  ok(entscheid({ nachText: nachText(60, 40), opt: klein }).ok, '(b) Y=40 bei 100 Varianten: erlaubt (Mindestgrenze 40)');
  ok(!entscheid({ nachText: nachText(59, 41), opt: klein }).ok && hat(entscheid({ nachText: nachText(59, 41), opt: klein }), '41 Varianten weichen'), '(b) Y=41 bei 100 Varianten: zu viel');
  ok(entscheid({ nachText: nachText(1960, 40), opt: klein }).ok, '(b) Y=40 bei 2000 Varianten: erlaubt');
  ok(!entscheid({ nachText: nachText(1959, 41), opt: klein }).ok && hat(entscheid({ nachText: nachText(1959, 41), opt: klein }), '41 Varianten weichen'), '(b) Y=41 bei 2000 Varianten: 1 % sind erst 20, Grenze bleibt 40');
  ok(entscheid({ nachText: nachText(9900, 100) }).ok, '(b) Y=100 bei 10000 Varianten: genau 1 % erlaubt');
  ok(!entscheid({ nachText: nachText(9899, 101) }).ok, '(b) Y=101 bei 10000 Varianten: zu viel');
  ok(entscheid({ nachText: nachText(8332, 84) }).ok, '(b) Y=84 bei 8416 Varianten: erlaubt (1 % = 84,16)');
  ok(!entscheid({ nachText: nachText(8331, 85) }).ok, '(b) Y=85 bei 8416 Varianten: zu viel');
  ok(entscheid({ nachText: nachText(8416, 0) }).ok, '(b) Y=0: erlaubt');
  ok(hat(entscheid({ nachText: nachText(6532, 1884) }), '1884 Varianten weichen noch vom Feed ab'), '(b) die Lage vor dem Lauf (1884) besteht das Gate nicht');
  // Untergrenze 6000 (Messbasis: 8 416 Varianten im Probelauf vom 05.11.; die Zeile zählt nur Varianten mit Bestandsführung und CH-Lagerzeile)
  gleich(m.MIN_VARIANTEN, 6000, '(b) Untergrenze der gesehenen Varianten ist 6000');
  ok(!entscheid({ nachText: nachText(5999, 0) }).ok && hat(entscheid({ nachText: nachText(5999, 0) }), 'weniger als 6000') && hat(entscheid({ nachText: nachText(5999, 0) }), 'Shop nicht gelesen'), '(b) 5999 Varianten gesehen: Shop nicht gelesen');
  ok(entscheid({ nachText: nachText(6000, 0) }).ok, '(b) genau 6000 Varianten: genug');
  ok(entscheid({ nachText: nachText(6532, 16) }).ok, '(b) 6548 Varianten (nahe der Untergrenze, 16 Abweichungen): erlaubt');
  for (const x of [0, 1000, 3998, 4000]) ok(!entscheid({ nachText: nachText(x, 0) }).ok, `(b) nur ${x} Varianten gesehen: kein Stempel (früher genügten 1000)`);
  ok(entscheid({ nachText: nachText(8400, 16) }).ok, '(b) die echte Grössenordnung des Probelaufs (8 416) besteht');
  ok(entscheid({ nachText: nachText(50, 0), opt: { minVarianten: 10 } }).ok, '(b) minVarianten ist einstellbar');
  // FORCE_ZERO im Stempel-Schritt: null_erlauben gilt nur für den Schreiblauf, die Nachprüfung läuft mit scharfer Bremse
  ok(!entscheid({ forceZero: true }).ok && hat(entscheid({ forceZero: true }), 'FORCE_ZERO') && hat(entscheid({ forceZero: true }), 'scharfer Nullungs-Bremse'), '(b) FORCE_ZERO im Stempel-Schritt: kein Stempel, Grund genannt');
  ok(entscheid({ forceZero: false }).ok && entscheid({ forceZero: undefined }).ok, '(b) ohne FORCE_ZERO bleibt alles wie bisher');
  ok(!entscheid({ nachText: '' }).ok && hat(entscheid({ nachText: '' }), 'Zeile'), '(b) leere Nachprüfung');
  ok(!entscheid({ nachText: undefined }).ok, '(b) Nachprüfung undefined');
  ok(!entscheid({ nachText: nachText(8400, 16).replace('[DRY] nichts geschrieben.', '') }).ok && hat(entscheid({ nachText: nachText(8400, 16).replace('[DRY] nichts geschrieben.', '') }), 'nicht zu Ende'), '(b) ohne Schlusszeile (Lauf abgebrochen)');
  ok(!entscheid({ nachText: nachText(8400, 16) + '\nABBRUCH (Plausibilitätsbremse): …' }).ok, '(b) ABBRUCH im Text');
  ok(!entscheid({ nachText: nachText(8400, 16) + '\nOFFEN: Feed fehlt' }).ok, '(b) OFFEN im Text');
  ok(!entscheid({ nachExit: 2 }).ok && hat(entscheid({ nachExit: 2 }), 'Nachprüfung endete mit Exit 2'), '(b) Exit 2 der Nachprüfung');
  ok(!entscheid({ nachExit: 1 }).ok, '(b) Exit 1 der Nachprüfung');
  ok(entscheid({ nachExit: undefined }).ok && entscheid({ nachExit: null }).ok, '(b) ohne Nachprüfungs-Exit gilt der Text allein');

  // (c) Feed-Alter
  ok(entscheid({ feedMtimeMs: JETZT - 36 * STUNDE }).ok, '(c) genau 36 Stunden: erlaubt');
  ok(!entscheid({ feedMtimeMs: JETZT - 36 * STUNDE - 1000 }).ok && hat(entscheid({ feedMtimeMs: JETZT - 36 * STUNDE - 1000 }), 'Stunden alt'), '(c) 36 Stunden und 1 Sekunde: zu alt');
  ok(!entscheid({ feedMtimeMs: JETZT - 49 * STUNDE }).ok, '(c) 49 Stunden: zu alt');
  ok(entscheid({ feedMtimeMs: JETZT }).ok, '(c) Feed von jetzt');
  ok(entscheid({ feedMtimeMs: JETZT + 5 * 60000 }).ok, '(c) Uhrenabweichung von 5 Minuten wird geduldet');
  ok(!entscheid({ feedMtimeMs: JETZT + 11 * 60000 }).ok && hat(entscheid({ feedMtimeMs: JETZT + 11 * 60000 }), 'Zukunft'), '(c) 11 Minuten in der Zukunft: nein');
  ok(!entscheid({ feedMtimeMs: NaN }).ok && !entscheid({ feedMtimeMs: undefined }).ok, '(c) unbekannte Feedzeit');
  // Dateizeit 1970 = das Feed-Skript konnte den Stand auf dem Server nicht lesen: Alter der Daten unbelegt, KEIN Stempel (Prüfer 05.11.: vorher galt die Abrufzeit)
  for (const x of [0, -1000]) {
    const e0 = entscheid({ feedMtimeMs: x });
    ok(!e0.ok && hat(e0, '(c) Stand des Feeds auf dem Server nicht belegt') && hat(e0, 'Alter der Daten ist unbekannt'), `(c) Dateizeit ${x} (Serverstand unbekannt): kein Stempel, eigener Grund`);
    ok(!hat(e0, 'Stunden alt'), `(c) Dateizeit ${x}: nicht als «Millionen Stunden alt» gemeldet`);
  }
  ok(entscheid({ feedMtimeMs: 1 }).ok === false && entscheid({ feedMtimeMs: JETZT - 1000 }).ok, '(c) schon 1 Millisekunde nach 1970 ist ein (viel zu altes) Datum, ein echtes jetziges geht durch');
  ok(entscheid({ feedMtimeMs: JETZT - 10 * STUNDE, opt: { feedMaxStunden: 8 } }).ok === false, '(c) feedMaxStunden ist einstellbar');

  // (d) Stand-Datei
  ok(!entscheid({ stand: { ...gut().stand, offen: 1 } }).ok && hat(entscheid({ stand: { ...gut().stand, offen: 1 } }), 'offen=1'), '(d) offen=1');
  ok(!entscheid({ stand: { ...gut().stand, offen: 40 } }).ok, '(d) offen=40');
  for (const o of [undefined, null, '0', '', false, -0.5, NaN]) ok(!entscheid({ stand: { ...gut().stand, offen: o } }).ok, `(d) offen=${JSON.stringify(o)} zählt nicht als 0`);
  ok(entscheid({ stand: { ...gut().stand, offen: 0 } }).ok, '(d) offen=0');
  ok(!entscheid({ stand: null }).ok && hat(entscheid({ stand: null }), 'fehlt oder ist unlesbar'), '(d) keine Stand-Datei');
  ok(!entscheid({ stand: undefined }).ok && !entscheid({ stand: 'text' }).ok, '(d) Stand ist kein Objekt');
  ok(!entscheid({ stand: { offen: 0, feed_hash: 'abc123def456' } }).ok, '(d) Stand ohne Zeitstempel');
  ok(!entscheid({ stand: { ...gut().stand, stand: 'gestern' } }).ok, '(d) Stand mit kaputtem Zeitstempel');
  ok(entscheid({ stand: { ...gut().stand, stand: '2026-11-05T00:58:12Z' } }).ok, '(d) Stand genau 180 Minuten alt: erlaubt');
  ok(!entscheid({ stand: { ...gut().stand, stand: '2026-11-05T00:58:11Z' } }).ok && hat(entscheid({ stand: { ...gut().stand, stand: '2026-11-05T00:58:11Z' } }), 'Minuten alt'), '(d) Stand 180 Minuten und 1 Sekunde alt: stammt nicht aus diesem Lauf');
  ok(entscheid({ stand: { ...gut().stand, stand: '2026-11-05T03:55Z' } }).ok, '(d) Stand im Format des Abgleichs (Minuten, ohne Sekunden) wird gelesen');
  ok(!entscheid({ stand: { ...gut().stand, stand: '2026-11-04T03:55Z' } }).ok, '(d) Stand von gestern');
  ok(!entscheid({ stand: { ...gut().stand, stand: '2026-11-05T05:00Z' } }).ok, '(d) Stand aus der Zukunft');
  ok(!entscheid({ stand: { ...gut().stand, feed_hash: 'ffffffffffff' } }).ok && hat(entscheid({ stand: { ...gut().stand, feed_hash: 'ffffffffffff' } }), 'Fingerabdruck'), '(d) Fingerabdruck der Stand-Datei weicht von der Nachprüfung ab');
  ok(entscheid({ stand: { ...gut().stand, feed_hash: undefined } }).ok, '(d) ohne Fingerabdruck in der Stand-Datei wird nicht verglichen');

  // mehrere Verstösse: alle Gründe stehen drin
  const viel = entscheid({ liveExit: 1, nachText: '', feedMtimeMs: NaN, stand: null });
  ok(!viel.ok && viel.gruende.length >= 4 && hat(viel, '(a)') && hat(viel, '(b)') && hat(viel, '(c)') && hat(viel, '(d)'), 'mehrere Verstösse: alle vier Gruppen genannt');
  ok(!m.stempelEntscheid().ok, 'ohne jede Eingabe: kein Stempel');
  ok(!m.stempelEntscheid({}).ok, 'leere Eingabe: kein Stempel');
}

/* ============ 4. Attrappe der Shopify-API ============ */
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
function attrappe({ userErrors = [], zurueck = undefined, tokenStatus = 200, shopId = 'gid://shopify/Shop/12345', ohneErgebnis = false, gqlStatus = 200 } = {}) {
  const calls = []; let gespeichert = null;
  const fetchFn = async (url, init = {}) => {
    const body = init.body ? JSON.parse(init.body) : {};
    if (/^https:\/\/au3j0y-hq\.myshopify\.com\/admin\/oauth\/access_token$/.test(url)) {
      calls.push({ art: 'token', url, body });
      return tokenStatus === 200 ? json({ access_token: 'tok_abc' }) : json({ error: 'x' }, tokenStatus);
    }
    if (/^https:\/\/au3j0y-hq\.myshopify\.com\/admin\/api\/2025-01\/graphql\.json$/.test(url)) {
      calls.push({ art: 'gql', url, query: body.query, variables: body.variables, token: init.headers?.['X-Shopify-Access-Token'] });
      if (gqlStatus !== 200) return json({}, gqlStatus);
      if (/^\s*\{\s*shop\s*\{\s*id\s*\}\s*\}\s*$/.test(body.query)) return json({ data: { shop: { id: shopId } } });
      if (/metafieldsSet/.test(body.query)) {
        if (ohneErgebnis) return json({ data: { metafieldsSet: null } });
        if (!userErrors.length) gespeichert = body.variables.m[0].value;
        return json({ data: { metafieldsSet: { metafields: userErrors.length ? [] : [{ id: 'gid://shopify/Metafield/1' }], userErrors } } });
      }
      if (/metafield\(namespace/.test(body.query)) return json({ data: { shop: { metafield: { value: zurueck !== undefined ? zurueck : gespeichert } } } });
    }
    throw new Error('unerwarteter Aufruf: ' + url);
  };
  return { fetchFn, calls, gespeichert: () => gespeichert };
}
const q = (a) => (query, variables) => import(pathToFileURL(path.join(WURZEL, 'automation/lib/shopify_gql.mjs')).href)
  .then(g => g.shopifyGql('au3j0y-hq.myshopify.com', m.API, 'tok', query, variables, { fetch: a.fetchFn, warte: async () => {} }));
{
  const WERT = '2026-11-05T03:58:12Z';
  const a = attrappe();
  const r = await m.stempelSchreiben(await q(a), WERT);
  ok(r.ok && r.shopId === 'gid://shopify/Shop/12345', 'stempelSchreiben: ok');
  gleich(a.calls.map(c => c.art), ['gql', 'gql', 'gql'], 'drei Aufrufe: Shop-ID, metafieldsSet, Zurücklesen');
  const set = a.calls.find(c => /metafieldsSet/.test(c.query));
  gleich(set.variables, { m: [{ ownerId: 'gid://shopify/Shop/12345', namespace: 'luxe', key: 'fortura_bestand_stand', type: 'single_line_text_field', value: WERT }] }, 'metafieldsSet: genau diese Variablen');
  ok(set.query.startsWith('mutation') && /userErrors\{ field message code \}/.test(set.query), 'metafieldsSet ist eine Mutation mit userErrors');
  ok(a.calls.every(c => c.url.includes('/admin/api/2025-01/')), 'API-Version 2025-01');
  ok(a.calls.every(c => c.token === 'tok'), 'Token im Kopf mitgegeben');
  const lies = a.calls[2];
  gleich(lies.variables, { ns: 'luxe', k: 'fortura_bestand_stand' }, 'Zurücklesen fragt dasselbe Metafeld');
  gleich(a.calls.filter(c => /mutation/.test(c.query)).length, 1, 'genau eine Mutation');

  const b = attrappe({ userErrors: [{ field: ['metafields', '0', 'value'], message: 'ungültig', code: 'INVALID_VALUE' }] });
  const rb = await m.stempelSchreiben(await q(b), WERT);
  ok(!rb.ok && /ungültig/.test(rb.grund), 'userErrors -> nicht ok, Grund genannt');
  gleich(b.calls.length, 2, 'bei userErrors wird nicht mehr zurückgelesen');

  const c = attrappe({ zurueck: '2020-01-01T00:00:00Z' });
  const rc = await m.stempelSchreiben(await q(c), WERT);
  ok(!rc.ok && /Zurücklesen weicht ab/.test(rc.grund), 'Zurücklesen weicht ab -> nicht ok');
  const d = attrappe({ zurueck: null });
  ok(!(await m.stempelSchreiben(await q(d), WERT)).ok, 'Metafeld nach dem Schreiben leer -> nicht ok');
  const e2 = attrappe({ shopId: 'kaputt' });
  const re2 = await m.stempelSchreiben(await q(e2), WERT);
  ok(!re2.ok && e2.calls.length === 1, 'ungültige Shop-ID -> nichts geschrieben');
  const f = attrappe({ ohneErgebnis: true });
  ok(!(await m.stempelSchreiben(await q(f), WERT)).ok, 'metafieldsSet ohne Ergebnis -> nicht ok');
  const g = attrappe({ gqlStatus: 403 });
  let wirft = false; try { await m.stempelSchreiben(await q(g), WERT); } catch { wirft = true; }
  ok(wirft, 'HTTP 403 von Shopify wirft (lauf() macht daraus Exit 1)');
}

/* ============ 5. lauf() mit Dateien und Attrappe ============ */
const SECRET = 'shpss_' + 'ab12cd34'.repeat(4);
function werkstatt(u = {}) {
  const d = neuerTmp('stempel-');
  const feed = path.join(d, 'feed.csv'), stand = path.join(d, 'stand.json'), nach = path.join(d, 'nach.txt'), frei = path.join(d, 'frei.txt');
  fs.writeFileSync(feed, 'ArtNr|Lagerbestand Fortura\n');
  fs.utimesSync(feed, new Date(JETZT - 2 * STUNDE), new Date(JETZT - 2 * STUNDE));
  fs.writeFileSync(stand, JSON.stringify(u.stand ?? gut().stand));
  fs.writeFileSync(nach, u.nachText ?? nachText(8400, 16));
  if (u.frei !== false) fs.writeFileSync(frei, 'ja\n');
  const env = {
    LIVE: '1', LIVE_EXIT: '0', NACH_EXIT: '0', NACH_DATEI: nach, FEED_DATEI: feed, STAND_DATEI: stand, FREIGABE_DATEI: frei,
    SHOPIFY_CLIENT_ID: 'client-id-geheim', SHOPIFY_CLIENT_SECRET: SECRET, ...(u.env || {}),
  };
  for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
  return { d, env, feed, stand, nach, frei };
}
async function laufen(w, a = attrappe()) {
  const aus = [], err = [];
  const code = await m.lauf({ env: w.env, jetzt: JETZT, fetchFn: a.fetchFn, log: s => aus.push(s), fehlerLog: s => err.push(s), gqlOpt: { warte: async () => {} } });
  return { code, aus: aus.join('\n'), err: err.join('\n'), a };
}
{
  // alles gut + Freigabe: schreibt
  let w = werkstatt(); let r = await laufen(w);
  gleich(r.code, 0, 'lauf: alles gut mit Freigabe -> Exit 0');
  ok(/STEMPEL gesetzt: shop\.metafields\.luxe\.fortura_bestand_stand = 2026-11-05T03:58:12Z/.test(r.aus), 'lauf: meldet den gesetzten Stempel');
  gleich(r.a.gespeichert(), '2026-11-05T03:58:12Z', 'lauf: Attrappe hat genau den Stempel gespeichert');
  gleich(r.a.calls.filter(c => c.art === 'token').length, 1, 'lauf: ein Token-Aufruf');
  gleich(r.a.calls.find(c => c.art === 'token').body, { client_id: 'client-id-geheim', client_secret: SECRET, grant_type: 'client_credentials' }, 'lauf: Token per Client-Credentials');
  ok(!(r.aus + r.err).includes(SECRET) && !(r.aus + r.err).includes('client-id-geheim') && !(r.aus + r.err).includes('tok_abc'), 'lauf: keine Geheimnisse in der Ausgabe');

  // vertauschtes Client-Secret («shpss_…=NAME») wird bereinigt
  w = werkstatt({ env: { SHOPIFY_CLIENT_SECRET: SECRET + '=SHOPIFY_CLIENT_SECRET' } }); r = await laufen(w);
  gleich(r.a.calls.find(c => c.art === 'token')?.body.client_secret, SECRET, 'lauf: vertauschtes Client-Secret wird bereinigt');

  // Trockenlauf: kein Aufruf, egal warum
  const trocken = {
    'ohne Freigabedatei': werkstatt({ frei: false }),
    'mit DRY=1': werkstatt({ env: { DRY: '1' } }),
    'ohne LIVE': werkstatt({ env: { LIVE: undefined } }),
    'mit LIVE=0': werkstatt({ env: { LIVE: '0' } }),
    'mit LIVE=true': werkstatt({ env: { LIVE: 'true' } }),
  };
  for (const [wie, wk] of Object.entries(trocken)) {
    const rr = await laufen(wk);
    gleich([rr.code, rr.a.calls.length], [0, 0], `lauf: Trockenlauf ${wie}: Exit 0 und kein einziger Aufruf`);
    ok(/Trockenlauf/.test(rr.aus) && /fortura_bestand_stand = 2026-11-05T03:58:12Z/.test(rr.aus), `lauf: Trockenlauf ${wie} zeigt den Stempel nur an`);
  }

  // Gate nicht bestanden: Exit 1, kein Aufruf, Gründe auf stderr
  const schlecht = {
    'Live-Exit 1': { env: { LIVE_EXIT: '1' } },
    'Live-Exit fehlt': { env: { LIVE_EXIT: undefined } },
    'Live-Exit Text': { env: { LIVE_EXIT: 'null' } },
    'Nachprüfung zu viel': { nachText: nachText(8300, 116) },
    'Nachprüfung Exit 2': { env: { NACH_EXIT: '2' } },
    'Nachprüfung Exit Text': { env: { NACH_EXIT: 'x' } },
    'offen > 0': { stand: { ...gut().stand, offen: 3 } },
    'Stand fehlt': { stand: 'kein json' },
    'FORCE_ZERO=1 im Stempel-Schritt': { env: { FORCE_ZERO: '1' } },
  };
  for (const [wie, u] of Object.entries(schlecht)) {
    const wk = werkstatt(u);
    if (wie === 'Stand fehlt') fs.rmSync(wk.stand);
    const rr = await laufen(wk);
    gleich([rr.code, rr.a.calls.length], [1, 0], `lauf: Gate nicht bestanden (${wie}): Exit 1 und kein einziger Aufruf`);
    ok(/KEIN STEMPEL gesetzt/.test(rr.err), `lauf: Gate nicht bestanden (${wie}) nennt den Grund`);
  }
  for (const fz of ['0', '', 'true']) {
    const rf = await laufen(werkstatt({ env: { FORCE_ZERO: fz } }));
    gleich([rf.code, rf.a.calls.length > 0], [0, true], `lauf: FORCE_ZERO=${JSON.stringify(fz)} ist kein «1» und blockiert den Stempel nicht (nur die Bremse des Abgleichs kennt «1»)`);
  }
  let wk = werkstatt(); fs.rmSync(wk.nach);
  let rr = await laufen(wk); gleich([rr.code, rr.a.calls.length], [1, 0], 'lauf: Nachprüfungsdatei fehlt -> Exit 1, kein Aufruf');
  wk = werkstatt(); fs.rmSync(wk.feed);
  rr = await laufen(wk); gleich([rr.code, rr.a.calls.length], [1, 0], 'lauf: Feeddatei fehlt -> Exit 1, kein Aufruf');
  wk = werkstatt(); fs.utimesSync(wk.feed, new Date(JETZT - 40 * STUNDE), new Date(JETZT - 40 * STUNDE));
  rr = await laufen(wk); gleich([rr.code, rr.a.calls.length], [1, 0], 'lauf: Feed 40 Stunden alt -> Exit 1, kein Aufruf');
  // Auch im Trockenlauf zeigt ein durchgefallenes Gate Exit 1
  wk = werkstatt({ frei: false, env: { LIVE_EXIT: '2' } });
  rr = await laufen(wk); gleich(rr.code, 1, 'lauf: Trockenlauf mit durchgefallenem Gate -> Exit 1');

  // Shopify-Fehler -> Exit 1
  rr = await laufen(werkstatt(), attrappe({ userErrors: [{ field: ['x'], message: 'abgelehnt', code: 'X' }] }));
  gleich(rr.code, 1, 'lauf: userErrors -> Exit 1');
  ok(/KEIN STEMPEL: metafieldsSet: .*abgelehnt/.test(rr.err), 'lauf: userErrors -> Grund genannt');
  rr = await laufen(werkstatt(), attrappe({ zurueck: 'anderer Wert' }));
  gleich(rr.code, 1, 'lauf: Zurücklesen weicht ab -> Exit 1');
  rr = await laufen(werkstatt(), attrappe({ tokenStatus: 401 }));
  gleich([rr.code, rr.a.calls.filter(c => c.art === 'gql').length], [1, 0], 'lauf: Token abgelehnt -> Exit 1, kein GraphQL-Aufruf');
  rr = await laufen(werkstatt(), attrappe({ gqlStatus: 403 }));
  gleich(rr.code, 1, 'lauf: HTTP 403 beim Schreiben -> Exit 1');

  // fehlende Eingaben/Zugänge -> Exit 2
  rr = await laufen(werkstatt({ env: { SHOPIFY_CLIENT_ID: undefined, SHOPIFY_CLIENT_SECRET: undefined } }));
  gleich([rr.code, rr.a.calls.length], [2, 0], 'lauf: keine Shopify-Zugänge -> Exit 2, kein Aufruf');
  rr = await laufen(werkstatt({ env: { SHOPIFY_CLIENT_ID: undefined } }));
  gleich([rr.code, rr.a.calls.length], [2, 0], 'lauf: nur das Secret, keine Client-ID -> Exit 2');
  rr = await laufen(werkstatt({ env: { NACH_DATEI: undefined } }));
  gleich([rr.code, rr.a.calls.length], [2, 0], 'lauf: NACH_DATEI nicht angegeben -> Exit 2');
  rr = await laufen(werkstatt({ env: { FEED_MAX_STUNDEN: 'abc' } }));
  gleich([rr.code, rr.a.calls.length], [2, 0], 'lauf: FEED_MAX_STUNDEN keine Zahl -> Exit 2');
  rr = await laufen(werkstatt({ env: { STAND_MAX_MIN: '0' } }));
  gleich(rr.code, 2, 'lauf: STAND_MAX_MIN=0 -> Exit 2');
  rr = await laufen(werkstatt({ env: { SHOPIFY_SHOP: 'boese.example.com' } }));
  gleich([rr.code, rr.a.calls.length], [2, 0], 'lauf: fremde Shop-Domain -> Exit 2, Zugangsdaten gehen nirgends hin');
  ok(/myshopify\.com/.test(rr.err), 'lauf: fremde Shop-Domain wird begründet');
  rr = await laufen(werkstatt({ env: { SHOPIFY_SHOP: 'au3j0y-hq.myshopify.com' } }));
  gleich(rr.code, 0, 'lauf: explizit gesetzter richtiger Shop -> Exit 0');
  // Token-Datei als Ersatz
  const tf = path.join(neuerTmp('tok-'), 't.txt'); fs.writeFileSync(tf, 'tok_aus_datei\n');
  rr = await laufen(werkstatt({ env: { SHOPIFY_CLIENT_ID: undefined, SHOPIFY_CLIENT_SECRET: undefined, SHOPIFY_TOKEN_FILE: tf } }));
  gleich(rr.code, 0, 'lauf: Token-Datei statt Client-Zugang -> Exit 0');
  ok(rr.a.calls.every(c => c.art === 'gql' && c.token === 'tok_aus_datei'), 'lauf: Token aus der Datei, kein OAuth-Aufruf');
  // einstellbare Grenzen
  wk = werkstatt({ env: { FEED_MAX_STUNDEN: '1' } });
  rr = await laufen(wk); gleich(rr.code, 1, 'lauf: FEED_MAX_STUNDEN=1 macht 2 Stunden alten Feed zu alt');
}

/* ============ 6. Das Skript als Prozess ============ */
{
  const sauberEnv = (extra) => ({ PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin`, HOME: os.tmpdir(), ...extra });
  const lauf = (extra, cwd, node = []) => spawnSync(process.execPath, [...node, STEMPEL], { cwd, env: sauberEnv(extra), encoding: 'utf8', timeout: 30000 });
  const jetztIso = () => new Date().toISOString();
  const bau = ({ frei = true, standOffen = 0, stundenAlt = 1 } = {}) => {
    const d = neuerTmp('stempel-prozess-');
    fs.mkdirSync(path.join(d, 'dropship'));
    const feed = path.join(d, 'feed.csv'), nach = path.join(d, 'nach.txt');
    fs.writeFileSync(feed, 'ArtNr|Lagerbestand Fortura\n');
    const t = new Date(Date.now() - stundenAlt * STUNDE); fs.utimesSync(feed, t, t);
    fs.writeFileSync(nach, nachText(8400, 16));
    fs.writeFileSync(path.join(d, 'dropship/_fortura_bestand_stand.json'), JSON.stringify({ stand: jetztIso().slice(0, 16) + 'Z', feed_hash: 'abc123def456', offen: standOffen, varianten: 8416 }));
    if (frei) fs.writeFileSync(path.join(d, 'dropship/FORTURA-BESTAND-FREI.txt'), 'ja\n');
    return { d, env: { LIVE_EXIT: '0', NACH_EXIT: '0', NACH_DATEI: nach, FEED_DATEI: feed } };
  };
  // Vorgeschaltetes fetch (nimmt den Platz des echten Netzes), schreibt jeden Aufruf in eine Datei
  const vorlauf = path.join(neuerTmp('vorlauf-'), 'fake_fetch.mjs');
  fs.writeFileSync(vorlauf, `
import fs from 'node:fs';
const LOG = process.env.FAKE_LOG, MODUS = process.env.FAKE_MODUS || 'ok';
let wert = null;
const antwort = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  const body = init.body ? JSON.parse(init.body) : {};
  fs.appendFileSync(LOG, JSON.stringify({ url, query: body.query, variables: body.variables }) + '\\n');
  if (/access_token$/.test(url)) return antwort({ access_token: 'tok' });
  if (/^\\s*\\{\\s*shop\\s*\\{\\s*id\\s*\\}\\s*\\}\\s*$/.test(body.query)) return antwort({ data: { shop: { id: 'gid://shopify/Shop/777' } } });
  if (/metafieldsSet/.test(body.query)) {
    if (MODUS === 'userErrors') return antwort({ data: { metafieldsSet: { metafields: [], userErrors: [{ field: ['x'], message: 'nein', code: 'X' }] } } });
    wert = body.variables.m[0].value; fs.writeFileSync(LOG + '.wert', wert);
    return antwort({ data: { metafieldsSet: { metafields: [{ id: 'gid://shopify/Metafield/1' }], userErrors: [] } } });
  }
  return antwort({ data: { shop: { metafield: { value: MODUS === 'abweichung' ? 'x' : wert } } } });
};
`);
  const ZEIT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

  let r = lauf({}, os.tmpdir());
  gleich(r.status, 2, 'Prozess: ohne Eingaben -> Exit 2');
  ok(/NACH_DATEI/.test(r.stderr), 'Prozess: ohne Eingaben nennt NACH_DATEI');

  let b = bau({ standOffen: 2 });
  r = lauf({ ...b.env, LIVE: '1' }, b.d);
  gleich(r.status, 1, 'Prozess: offen=2 -> Exit 1');
  ok(/KEIN STEMPEL gesetzt/.test(r.stderr) && /offen=2/.test(r.stderr), 'Prozess: offen=2 wird genannt');

  b = bau({ stundenAlt: 50 });
  r = lauf({ ...b.env, LIVE: '1' }, b.d);
  gleich(r.status, 1, 'Prozess: Feed 50 Stunden alt -> Exit 1');

  b = bau({ frei: false });
  let log = path.join(b.d, 'fetch.log'); fs.writeFileSync(log, '');
  r = lauf({ ...b.env, LIVE: '1', SHOPIFY_CLIENT_ID: 'i', SHOPIFY_CLIENT_SECRET: SECRET, FAKE_LOG: log }, b.d, ['--import', pathToFileURL(vorlauf).href]);
  gleich([r.status, fs.readFileSync(log, 'utf8')], [0, ''], 'Prozess: ohne Freigabedatei Exit 0 und kein Netzaufruf');
  const wertAnzeige = (r.stdout.match(/fortura_bestand_stand = (\S+)/) || [])[1];
  ok(ZEIT.test(wertAnzeige || ''), 'Prozess: Trockenlauf zeigt einen Stempel im richtigen Format');

  b = bau();
  r = lauf({ ...b.env, DRY: '1', LIVE: '1', FAKE_LOG: log }, b.d, ['--import', pathToFileURL(vorlauf).href]);
  gleich([r.status, fs.readFileSync(log, 'utf8')], [0, ''], 'Prozess: DRY=1 trotz Freigabe: Exit 0 und kein Netzaufruf');

  b = bau(); log = path.join(b.d, 'fetch.log'); fs.writeFileSync(log, '');
  r = lauf({ ...b.env, LIVE: '1', SHOPIFY_CLIENT_ID: 'i', SHOPIFY_CLIENT_SECRET: SECRET, FAKE_LOG: log }, b.d, ['--import', pathToFileURL(vorlauf).href]);
  gleich(r.status, 0, 'Prozess: live mit Freigabe -> Exit 0');
  const wertLive = fs.existsSync(log + '.wert') ? fs.readFileSync(log + '.wert', 'utf8') : '';
  ok(ZEIT.test(wertLive) && Math.abs(Date.parse(wertLive) - Date.now()) < 60000, 'Prozess: geschriebener Stempel hat das Format und ist von jetzt');
  const zeilen = fs.readFileSync(log, 'utf8').trim().split('\n').map(z => JSON.parse(z));
  gleich(zeilen.map(z => /access_token/.test(z.url) ? 'token' : /metafieldsSet/.test(z.query) ? 'set' : /metafield\(/.test(z.query) ? 'lesen' : 'shop'), ['token', 'shop', 'set', 'lesen'], 'Prozess: Reihenfolge der Aufrufe');
  gleich(zeilen[2].variables.m[0].ownerId, 'gid://shopify/Shop/777', 'Prozess: ownerId ist die gelesene Shop-GID');
  ok(!r.stdout.includes(SECRET) && !r.stderr.includes(SECRET), 'Prozess: Secret nicht in der Ausgabe');

  b = bau(); log = path.join(b.d, 'fetch.log'); fs.writeFileSync(log, '');
  r = lauf({ ...b.env, LIVE: '1', SHOPIFY_CLIENT_ID: 'i', SHOPIFY_CLIENT_SECRET: SECRET, FAKE_LOG: log, FAKE_MODUS: 'userErrors' }, b.d, ['--import', pathToFileURL(vorlauf).href]);
  gleich(r.status, 1, 'Prozess: userErrors von Shopify -> Exit 1');
  b = bau(); log = path.join(b.d, 'fetch.log'); fs.writeFileSync(log, '');
  r = lauf({ ...b.env, LIVE: '1', SHOPIFY_CLIENT_ID: 'i', SHOPIFY_CLIENT_SECRET: SECRET, FAKE_LOG: log, FAKE_MODUS: 'abweichung' }, b.d, ['--import', pathToFileURL(vorlauf).href]);
  gleich(r.status, 1, 'Prozess: Zurücklesen weicht ab -> Exit 1');
  b = bau();
  r = lauf({ ...b.env, LIVE: '1' }, b.d);
  gleich(r.status, 2, 'Prozess: live ohne Shopify-Zugang -> Exit 2');
  // Importieren darf nichts starten
  const imp = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(pathToFileURL(STEMPEL).href)}); console.log('importiert')`], { env: sauberEnv({}), encoding: 'utf8', timeout: 20000 });
  ok(imp.status === 0 && imp.stdout.trim() === 'importiert', 'Import des Moduls startet keinen Lauf');
}

/* ============ 7. Workflow ============ */
{
  const WF = path.join(WURZEL, '.github/workflows/fortura-bestand.yml');
  const py = spawnSync('python3', ['-I', '-c', 'import sys,json,yaml\nd=yaml.safe_load(open(sys.argv[1],encoding="utf-8"))\nif True in d: d["on"]=d.pop(True)\njson.dump(d,sys.stdout,default=str)', WF], { encoding: 'utf8' });
  if (py.status !== 0) {
    uebersprungen++;
    console.log('  ! Workflow-Prüfung ÜBERSPRUNGEN (python3 mit PyYAML fehlt):', (py.stderr || '').trim().split('\n').pop());
    ok(false, 'Workflow-Prüfung konnte nicht laufen');
  } else {
    const wf = JSON.parse(py.stdout);
    const text = fs.readFileSync(WF, 'utf8');
    const job = wf.jobs.abgleich;
    const steps = job.steps;
    const schritt = (id) => steps.find(s => s.id === id);
    gleich(wf.name, 'Fortura-Bestand (Abgleich)', 'Name');
    gleich(wf.on.schedule, [{ cron: '51 3 * * *' }], 'Zeitplan: ein Eintrag, täglich 03:51 UTC');
    gleich(Object.keys(wf.on).sort(), ['schedule', 'workflow_dispatch'], 'Auslöser: nur Zeitplan und Handstart');
    gleich(wf.on.workflow_dispatch.inputs.schreiben.type, 'boolean', 'Eingabe «schreiben» ist boolean');
    gleich(wf.on.workflow_dispatch.inputs.schreiben.default, false, 'Eingabe «schreiben» Vorgabe false');
    gleich(Object.keys(wf.on.workflow_dispatch.inputs).sort(), ['null_erlauben', 'schreiben'], 'Handstart-Eingaben: genau «schreiben» und «null_erlauben»');
    gleich(wf.on.workflow_dispatch.inputs.null_erlauben.type, 'boolean', 'Eingabe «null_erlauben» ist boolean');
    gleich(wf.on.workflow_dispatch.inputs.null_erlauben.default, false, 'Eingabe «null_erlauben» Vorgabe false');
    ok(!('inputs' in (wf.on.schedule[0] || {})), 'der Zeitplan hat keine Eingaben');
    gleich(wf.permissions, { contents: 'read' }, 'permissions: contents read, sonst nichts');
    gleich(wf.concurrency, { group: 'fortura-bestand', 'cancel-in-progress': false }, 'concurrency-Gruppe fortura-bestand, nicht abbrechen');
    gleich(job['timeout-minutes'], 60, 'timeout 60 Minuten');
    gleich(job['runs-on'], 'ubuntu-latest', 'ubuntu-latest');
    gleich(Object.keys(wf.jobs), ['abgleich'], 'ein einziger Job');
    gleich(job.env, { EREIGNIS: '${{ github.event_name }}', SCHREIBEN_EINGABE: '${{ inputs.schreiben }}', NULL_ERLAUBEN_EINGABE: '${{ inputs.null_erlauben }}' }, 'Job-Umgebung wie beim Lager-Wächter, plus die Eingabe null_erlauben');
    ok(!/FORCE_ZERO/.test(JSON.stringify(job.env)) && !/FORCE_ZERO/.test(JSON.stringify(wf.env || {})), 'FORCE_ZERO steht weder in der Job- noch in der Workflow-Umgebung (nie für alle Schritte)');

    // Actions-Versionen wie in den vorhandenen Workflows
    const nutzt = steps.filter(s => s.uses).map(s => s.uses);
    gleich(nutzt, ['actions/checkout@v4', 'actions/setup-node@v4', 'actions/upload-artifact@v4'], 'Actions-Versionen');
    gleich(steps.find(s => s.uses === 'actions/setup-node@v4').with['node-version'], '22', 'Node 22');

    // Sparse-Checkout: genau die nötigen Dateien
    const co = steps.find(s => s.uses === 'actions/checkout@v4').with;
    const sparse = co['sparse-checkout'].split('\n').map(z => z.trim()).filter(Boolean).sort();
    gleich(sparse, [
      'automation/fortura_bestand_stempel.mjs', 'automation/fortura_bestand_sync.mjs', 'automation/fortura_feed_holen.sh',
      'automation/lib/shopify_gql.mjs', 'automation/lib/shopify_host.mjs', 'automation/lib/shopify_secret.mjs',
      'dropship/FORTURA-BESTAND-FREI.txt', 'dropship/_fortura_sperr_varianten.txt',
    ], 'Sparse-Checkout: nur die nötigen Dateien');
    gleich(co['sparse-checkout-cone-mode'], false, 'Sparse-Checkout ohne Cone-Modus');
    for (const f of sparse.filter(f => !f.endsWith('FORTURA-BESTAND-FREI.txt'))) ok(fs.existsSync(path.join(WURZEL, f)), `Sparse-Datei liegt im Repo: ${f}`);
    // jede Datei, die die Skripte einlesen (import ./lib/…), steht in der Liste
    for (const skript of ['automation/fortura_bestand_stempel.mjs', 'automation/fortura_bestand_sync.mjs']) {
      const t = fs.readFileSync(path.join(WURZEL, skript), 'utf8');
      for (const imp of t.matchAll(/from '(\.\/lib\/[^']+)'/g)) ok(sparse.includes('automation/' + imp[1].slice(2)), `Sparse-Liste enthält ${imp[1]} (importiert von ${skript})`);
    }

    // Modus-Logik: Text und AUSFÜHRUNG
    const modus = schritt('modus');
    ok(modus.run.includes('dropship/FORTURA-BESTAND-FREI.txt') && modus.run.includes('"$EREIGNIS" = "schedule"') && modus.run.includes('"$SCHREIBEN_EINGABE" = "true"'), 'Modus-Text: Freigabedatei, schedule, Eingabe');
    // Der Modus-Schritt wird in jeder Kombination wirklich ausgeführt: Freigabedatei × Ereignis × «schreiben» × «null_erlauben».
    const modusLauf = (frei, ereignis, eingabe, nullEingabe = '') => {
      const d = neuerTmp('modus-'); fs.mkdirSync(path.join(d, 'dropship'));
      if (frei) fs.writeFileSync(path.join(d, 'dropship/FORTURA-BESTAND-FREI.txt'), 'ja');
      const out = path.join(d, 'out'); fs.writeFileSync(out, '');
      const r = spawnSync('bash', ['-e', '-c', modus.run], { cwd: d, env: { PATH: process.env.PATH, GITHUB_OUTPUT: out, EREIGNIS: ereignis, SCHREIBEN_EINGABE: eingabe, NULL_ERLAUBEN_EINGABE: nullEingabe }, encoding: 'utf8' });
      if (r.status !== 0) return { fehler: r.stderr };
      const o = Object.fromEntries(fs.readFileSync(out, 'utf8').trim().split('\n').map(z => z.split('=')));
      return { live: o.live, force_zero: o.force_zero, stdout: r.stdout };
    };
    // 1) Von Hand ausgeschriebene Fälle (unabhängig vom Modell unten)
    for (const [frei, ereignis, eingabe, nullE, live, fz] of [
      [false, 'schedule', '', '', '0', '0'], [false, 'workflow_dispatch', 'true', '', '0', '0'], [false, 'workflow_dispatch', 'false', '', '0', '0'],
      [true, 'schedule', '', '', '1', '0'], [true, 'workflow_dispatch', 'true', '', '1', '0'], [true, 'workflow_dispatch', 'false', '', '0', '0'],
      [true, 'workflow_dispatch', '', '', '0', '0'], [true, 'push', 'true', '', '1', '0'], [true, 'push', '', '', '0', '0'],
      // neue Eingabe «null_erlauben»
      [true, 'workflow_dispatch', 'true', 'true', '1', '1'],      // der einzige Weg zu force_zero=1
      [true, 'workflow_dispatch', 'true', 'false', '1', '0'], [true, 'workflow_dispatch', 'true', '', '1', '0'],
      [true, 'workflow_dispatch', 'false', 'true', '0', '0'],     // ohne «schreiben» wirkt sie nicht
      [true, 'workflow_dispatch', '', 'true', '0', '0'],
      [true, 'schedule', '', 'true', '1', '0'],                   // im Zeitplan nie (auch wenn ein Auslöser sie mitschickte)
      [true, 'schedule', 'true', 'true', '1', '0'],
      [false, 'workflow_dispatch', 'true', 'true', '0', '0'],     // ohne Freigabedatei nie
      [false, 'schedule', '', 'true', '0', '0'],
      [true, 'push', 'true', 'true', '1', '0'],                   // fremdes Ereignis: nie
    ]) {
      const r = modusLauf(frei, ereignis, eingabe, nullE);
      gleich([r.live, r.force_zero], [live, fz], `Modus ausgeführt: Freigabe ${frei}, ${ereignis}, schreiben «${eingabe}», null_erlauben «${nullE}» -> live=${live}, force_zero=${fz}`);
    }
    // 2) Alle Kombinationen gegen das Modell der Regel + Invarianten
    {
      let kombis = 0, verstoesse = [];
      for (const frei of [true, false]) for (const ereignis of ['schedule', 'workflow_dispatch', 'push', '']) for (const eingabe of ['', 'true', 'false', 'TRUE', '1', 'yes']) for (const nullE of ['', 'true', 'false', 'TRUE', '1', 'yes', 'true ']) {
        const r = modusLauf(frei, ereignis, eingabe, nullE); kombis++;
        const live = frei && (ereignis === 'schedule' || eingabe === 'true');
        const fz = live && ereignis === 'workflow_dispatch' && nullE === 'true';
        const tag = `${frei ? 'frei' : 'ohne Freigabe'}/${ereignis || '-'}/${eingabe || '-'}/${nullE || '-'}`;
        if (r.live !== (live ? '1' : '0') || r.force_zero !== (fz ? '1' : '0')) verstoesse.push(`${tag}: live=${r.live} force_zero=${r.force_zero}`);
        if (!frei && (r.live !== '0' || r.force_zero !== '0')) verstoesse.push(`${tag}: OHNE Freigabedatei geschrieben`);
        if (ereignis !== 'workflow_dispatch' && r.force_zero !== '0') verstoesse.push(`${tag}: Bremse ausserhalb eines Handstarts aufgehoben`);
        if (r.force_zero === '1' && r.live !== '1') verstoesse.push(`${tag}: force_zero ohne Schreibmodus`);
      }
      gleich(verstoesse, [], `Modus ausgeführt: ${kombis} Kombinationen — ohne Freigabedatei nie Schreiben, force_zero nur bei Handstart im Schreibmodus mit null_erlauben=true`);
      ok(kombis === 2 * 4 * 6 * 7, 'Modus: alle Kombinationen wurden gefahren');
    }
    {
      const r = modusLauf(true, 'workflow_dispatch', 'true', 'true');
      ok(/::warning title=Nullungs-Bremse aufgehoben::/.test(r.stdout), 'Modus: bei aufgehobener Bremse steht eine Warnung im Lauf');
      const r2 = modusLauf(false, 'workflow_dispatch', 'true', 'true');
      ok(/null_erlauben wirkt nur bei Handstart mit Freigabedatei und schreiben=true; hier ignoriert/.test(r2.stdout) && !/::warning/.test(r2.stdout), 'Modus: ignorierte Eingabe wird gemeldet, ohne Warnung');
      ok(!/ignoriert|::warning/.test(modusLauf(true, 'schedule', '', '').stdout), 'Modus: im Zeitplan keine Meldung zur Eingabe');
    }

    // Reihenfolge der Schritte
    const namen = steps.map(s => s.id || s.uses);
    const pos = (id) => namen.indexOf(id);
    ok(pos('modus') < pos('feed') && pos('feed') < pos('sync') && pos('sync') < pos('nach') && pos('nach') < pos('stempel'), 'Reihenfolge: Modus, Feed, Abgleich, Nachprüfung, Stempel');
    const zugang = steps.find(s => s.name === 'Zugänge prüfen');
    ok(steps.indexOf(zugang) < pos('feed') && steps.indexOf(zugang) > pos('modus'), 'Zugänge werden vor dem Feed geprüft');

    // Bedingungen: die Ausdrücke bestehen nur aus !cancelled(), always(), steps.<id>.outputs.<name>, ==, !=, &&, || und Klammern und sind damit
    // gültiges JavaScript. Fehlende Ausgaben sind in GitHub leer (null == '' ist wahr), darum liefert der Stellvertreter '' für alles Unbekannte.
    // Gleichheit wie bei GitHub (Dokumentation «Operators»): zwei Texte ohne Beachtung der Gross-/Kleinschreibung; bei ungleichen Typen werden beide zu Zahlen
    // (null -> 0, '' -> 0, Text -> Zahl oder NaN). Eine fehlende Ausgabe ist null (nicht ''): darum ist null == '0' WAHR. Der alte Stellvertreter lieferte '' und
    // verbarg das (Prüfer 05.11.). Hier steht '' oder undefined für «Schritt hat nichts ausgegeben».
    const ghZahl = (v) => (v === null || v === undefined ? 0 : typeof v === 'boolean' ? Number(v) : typeof v === 'number' ? v : (String(v).trim() === '' ? 0 : Number(v)));
    const ghGleich = (a, b) => (typeof a === 'string' && typeof b === 'string' ? a.toLowerCase() === b.toLowerCase() : ghZahl(a) === ghZahl(b));
    gleich([ghGleich(null, '0'), ghGleich(null, ''), ghGleich('', '0'), ghGleich('0', '0'), ghGleich(null, '1'), ghGleich('1', '1')], [true, true, false, true, false, true], 'Auswerter: GitHub-Gleichheit (null == \'0\' ist wahr, \'\' == \'0\' ist falsch)');
    const auswertenWert = (ausdruck, { live, sync, abgebrochen = false } = {}) => {
      const roh = ausdruck.replace(/^\$\{\{\s*|\s*\}\}$/g, '');
      const js = roh.replace(/([\w.]+)\s*(==|!=)\s*('[^']*')/g, (_, a, op, b) => `${op === '!=' ? '!' : ''}GLEICH(${a}, ${b})`);
      const ausgaben = { modus: { live }, sync: { rc: sync } };
      const fehlt = (v) => v === undefined || v === '';
      const steps = new Proxy({}, { get: (_, id) => ({ outputs: new Proxy(ausgaben[id] || {}, { get: (o, k) => (fehlt(o[k]) ? null : o[k]) }) }) });
      return new Function('steps', 'cancelled', 'always', 'GLEICH', `return (${js});`)(steps, () => abgebrochen, () => true, ghGleich);
    };
    const auswerten = (ausdruck, o) => Boolean(auswertenWert(ausdruck, o));
    for (const [live, sync, nachSoll, stempelSoll] of [
      ['1', '0', true, true], ['1', '1', true, true], ['1', '2', false, true], ['1', '3', false, true], ['1', '124', false, true], ['1', '', false, false],
      ['0', '0', false, false], ['0', '1', false, false], ['0', '', false, false], ['', '0', false, false],
    ]) {
      gleich(auswerten(schritt('nach').if, { live, sync }), nachSoll, `Bedingung Nachprüfung (live ${live || '-'}, Abgleich-Exit ${sync || '-'})`);
      gleich(auswerten(schritt('stempel').if, { live, sync }), stempelSoll, `Bedingung Stempel (live ${live || '-'}, Abgleich-Exit ${sync || '-'})`);
    }
    ok(!auswerten(schritt('nach').if, { live: '1', sync: '0', abgebrochen: true }) && !auswerten(schritt('stempel').if, { live: '1', sync: '0', abgebrochen: true }), 'nach einem Abbruch von Hand laufen weder Nachprüfung noch Stempel');
    ok(schritt('nach').if.includes("steps.modus.outputs.live == '1'") && schritt('nach').if.includes('!cancelled()'), 'Nachprüfung nur im Schreibmodus');
    ok(schritt('stempel').if.includes("steps.modus.outputs.live == '1'") && schritt('stempel').if.includes('!cancelled()'), 'Stempel nur im Schreibmodus, auch nach einem roten Abgleich (damit der Grund sichtbar wird)');
    for (const id of ['feed', 'sync']) ok(!schritt(id).if, `Schritt ${id} hat keine Sonderbedingung (läuft nur, wenn alles davor grün ist)`);
    // Nachprüfung und Stempel dürfen nie laufen, wenn der Abgleich keinen Exit-Code hinterlassen hat (Schritt übersprungen oder abgebrochen), auch nicht über null == '0'
    ok(!auswerten(schritt('nach').if, { live: '1', sync: undefined }) && !auswerten(schritt('stempel').if, { live: '1', sync: undefined }), 'ohne Exit-Code des Abgleichs (Schritt übersprungen) laufen weder Nachprüfung noch Stempel');
    ok(schritt('nach').if.includes("steps.sync.outputs.rc != ''"), 'Nachprüfung: Wächter «rc != \'\'» steht in der Bedingung');
    // Nullungs-Bremse und abgeschnittener Feed: Verdrahtung im Text
    {
      const sy = schritt('sync'), na = schritt('nach'), st = schritt('stempel');
      ok(sy.env.FORCE_ZERO_MODUS === '${{ steps.modus.outputs.force_zero }}' && sy.env.LIVE === '${{ steps.modus.outputs.live }}', 'Abgleich-Schritt bekommt live und force_zero aus dem Modus-Schritt');
      ok(!('FORCE_ZERO' in sy.env) && !('FORCE_ZERO' in na.env) && !('FORCE_ZERO' in st.env), 'FORCE_ZERO steht in keiner env-Zeile; es wird nur im Abgleich-Skript gesetzt');
      ok(sy.run.includes('if [ "$LIVE" = "1" ] && [ "$FORCE_ZERO_MODUS" = "1" ]; then export FORCE_ZERO=1; else unset FORCE_ZERO; fi'), 'Abgleich: FORCE_ZERO nur im Schreibmodus mit Meldung des Modus-Schritts, sonst gelöscht');
      ok(/^\s*unset FORCE_ZERO\s*$/m.test(na.run) && !/export FORCE_ZERO/.test(na.run), 'Nachprüfung: FORCE_ZERO wird gelöscht, nie gesetzt');
      ok(na.run.indexOf('unset FORCE_ZERO') < na.run.indexOf('DRY=1 node'), 'Nachprüfung: FORCE_ZERO wird VOR dem Lauf gelöscht');
      ok(!/FORCE_ZERO/.test(st.run) && !/FORCE_ZERO/.test(JSON.stringify(st.env)), 'Stempel-Schritt kennt FORCE_ZERO nicht (das Skript lehnt eine geerbte Variable ab)');
      const syncText = fs.readFileSync(path.join(WURZEL, 'automation/fortura_bestand_sync.mjs'), 'utf8');
      ok(/process\.env\.MIN_FEED_ROWS/.test(syncText) && /process\.env\.FORCE_ZERO !== '1'/.test(syncText), 'Das Abgleich-Skript liest MIN_FEED_ROWS und FORCE_ZERO unter genau diesen Namen');
      gleich([sy.env.MIN_FEED_ROWS, na.env.MIN_FEED_ROWS], ['18000', '18000'], 'MIN_FEED_ROWS=18000 im Abgleich UND in der Nachprüfung (Feed vom 05.11.: 20 309 Zeilen)');
      ok(!('MIN_FEED_ROWS' in schritt('feed').env) && !('MIN_FEED_ROWS' in st.env), 'MIN_FEED_ROWS nur dort, wo das Abgleich-Skript läuft');
    }
    // Alter des Feeds: Grenze 36 Stunden nur im Schreibmodus; Zeitlimit des Abrufs
    {
      const feed = schritt('feed');
      gleich(feed['timeout-minutes'], 20, 'Feed-Schritt: eigenes Zeitlimit von 20 Minuten (3 Versuche mit je 15 Minuten Download würden sonst den Job ausfüllen)');
      ok(typeof feed.env.FORTURA_MAX_ALTER_H === 'string', 'Feed-Schritt: FORTURA_MAX_ALTER_H wird gesetzt');
      for (const [live, soll] of [['1', '36'], ['0', ''], [undefined, ''], ['', ''], ['2', '']]) gleich(auswertenWert(feed.env.FORTURA_MAX_ALTER_H, { live }), soll, `Feed-Schritt: Altersgrenze bei live=${JSON.stringify(live)}`);
      ok(!JSON.stringify(feed.env).includes('SHOPIFY'), 'Feed-Schritt: keine Shopify-Zugangsdaten');
    }
    ok(steps.find(s => s.name === 'Zusammenfassung').if === 'always()', 'Zusammenfassung läuft immer');
    const hoch = steps.find(s => s.uses === 'actions/upload-artifact@v4');
    ok(hoch.if === 'always()', 'Artefakt wird immer hochgeladen');
    gleich(hoch.with.name, 'fortura-bestand-protokoll', 'Artefaktname');
    // Das Artefakt trägt nur den bereinigten Ordner protokoll/ (Schritt «Protokoll bereinigen»), 7 Tage
    const apfade = hoch.with.path.split('\n').map(z => z.trim()).filter(Boolean);
    gleich(apfade, ['protokoll/'], 'Artefakt: genau ein Pfad, der bereinigte Ordner protokoll/ (keine Rohdateien, keine Pauschalpfade)');
    ok(!apfade.some(p => /fortura_feed|feed\.csv|token|\*\*|^\.$|lauf-/i.test(p)), 'Artefakt enthält weder den Feed noch den Token noch Pauschalpfade noch Rohlogs');
    gleich(hoch.with['retention-days'], 7, 'Artefakt: 7 Tage Aufbewahrung (Repo ist öffentlich)');
    ok(hoch.with['if-no-files-found'] === 'ignore', 'Artefakt: fehlende Dateien sind kein Fehler');
    {
      const nr = (name) => steps.findIndex(s => s.name === name);
      ok(nr('Protokoll bereinigen') > nr('Zusammenfassung') && nr('Protokoll bereinigen') >= 0 && nr('Protokoll bereinigen') < steps.indexOf(hoch), 'Reihenfolge: erst bereinigen, dann hochladen');
    }
    gleich(steps.find(s => s.name === 'Protokoll bereinigen').if, 'always()', 'Bereinigung läuft immer (auch nach rotem Schritt)');

    // Stempel-Schritt: Eingaben
    const se = schritt('stempel').env;
    ok(se.LIVE_EXIT === '${{ steps.sync.outputs.rc }}' && se.NACH_EXIT === '${{ steps.nach.outputs.rc }}' && se.NACH_DATEI === 'lauf-nach.txt', 'Stempel bekommt Exit des Abgleichs, Exit und Text der Nachprüfung');
    ok(se.LIVE === '${{ steps.modus.outputs.live }}' && !('DRY' in se), 'Stempel: LIVE aus dem Modus, kein DRY');
    ok(schritt('nach').run.includes('DRY=1 node automation/fortura_bestand_sync.mjs') && schritt('nach').run.includes('tee lauf-nach.txt'), 'Nachprüfung ist ein DRY-Lauf des Abgleichs');
    ok(schritt('sync').run.includes('if [ "$LIVE" = "1" ]; then unset DRY; else export DRY=1; fi'), 'Abgleich: ohne Schreibmodus immer DRY=1');
    ok(steps.find(s => s.name === 'Feed holen (nur lesen)').run.includes('bash automation/fortura_feed_holen.sh "$FORTURA_CSV"'), 'Feed wird mit dem Feed-Skript an FORTURA_CSV geholt');

    // Geheimnisse
    const secrets = new Set([...text.matchAll(/secrets\.([A-Z0-9_]+)/g)].map(x => x[1]));
    gleich([...secrets].sort(), ['FORTURA_FTP_PW', 'FORTURA_FTP_USER', 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET'], 'genau diese vier Secrets');
    for (const s of steps) if (s.run) ok(!/\$\{\{\s*secrets\./.test(s.run), `Secret steht nicht im Skripttext von «${s.name}» (nur in env)`);
    ok(!/set\s+-[a-z]*x/.test(text), 'kein «set -x» im Workflow');
    ok(!/(echo|printf|cat)[^\n]*\$\{?(FORTURA_FTP_PW|FORTURA_FTP_USER|SHOPIFY_CLIENT_SECRET|SHOPIFY_CLIENT_ID)\b/.test(text), 'keine Ausgabe der Zugangsdaten');
    ok(!/FORTURA_FTP_(USER|PW)/.test(JSON.stringify(steps.filter(s => !['Zugänge prüfen', 'Feed holen (nur lesen)'].includes(s.name)))), 'Fortura-Zugang steht nur im Zugangs- und im Feed-Schritt');
    ok(!/SHOPIFY_CLIENT_SECRET/.test(JSON.stringify(steps.filter(s => ['Feed holen (nur lesen)', 'Schreiben oder nur lesen?'].includes(s.name)))), 'Shopify-Secret steht nicht im Feed-Schritt');
    ok(!/--force|git push|git commit|contents:\s*write/.test(text), 'Workflow schreibt nichts ins Repo');

    // Schritte wirklich ausführen, mit Attrappen-Skripten
    const stubDir = (inhalt) => {
      const d = neuerTmp('schritt-');
      fs.mkdirSync(path.join(d, 'automation/lib'), { recursive: true }); fs.mkdirSync(path.join(d, 'dropship'));
      fs.copyFileSync(path.join(WURZEL, 'automation/lib/shopify_secret.mjs'), path.join(d, 'automation/lib/shopify_secret.mjs'));
      for (const [pfad, code] of Object.entries(inhalt)) fs.writeFileSync(path.join(d, pfad), code);
      return d;
    };
    const fuehre = (s, d, env) => {
      const out = path.join(d, 'gh_out'), envd = path.join(d, 'gh_env'), sum = path.join(d, 'gh_sum');
      for (const f of [out, envd, sum]) fs.writeFileSync(f, '');
      const r = spawnSync('bash', ['-e', '-c', s.run], { cwd: d, encoding: 'utf8', env: { PATH: process.env.PATH, GITHUB_OUTPUT: out, GITHUB_ENV: envd, GITHUB_STEP_SUMMARY: sum, RUNNER_TEMP: path.join(d, 'rt'), ...env } });
      return { ...r, out: fs.readFileSync(out, 'utf8'), envd: fs.readFileSync(envd, 'utf8'), sum: fs.readFileSync(sum, 'utf8') };
    };
    const STUB = "console.log('STUB DRY=' + (process.env.DRY ?? 'unset') + ' SECRET=' + process.env.SHOPIFY_CLIENT_SECRET + ' ARGS=' + process.argv.slice(2).join(',') + ' FZ=' + (process.env.FORCE_ZERO ?? 'unset') + ' MFR=' + (process.env.MIN_FEED_ROWS ?? 'unset')); process.exit(Number(process.env.STUB_EXIT || 0));";
    const roh = 'shpss_' + '0123456789abcdef'.repeat(2);
    for (const [wie, live, exit, dry] of [['live', '1', '0', 'unset'], ['Trockenlauf', '0', '0', '1'], ['live, Exit 1', '1', '1', 'unset'], ['live, Exit 2', '1', '2', 'unset']]) {
      const d = stubDir({ 'automation/fortura_bestand_sync.mjs': STUB });
      const r = fuehre(schritt('sync'), d, { LIVE: live, STUB_EXIT: exit, SHOPIFY_CLIENT_ID: 'i', SHOPIFY_CLIENT_SECRET: roh + '=SHOPIFY_CLIENT_SECRET', DRY: live === '1' ? '1' : undefined });
      gleich(r.status, Number(exit), `Abgleich-Schritt (${wie}): Exit des Skripts wird weitergegeben`);
      gleich(r.out.trim(), 'rc=' + exit, `Abgleich-Schritt (${wie}): rc landet in den Ausgaben`);
      ok(r.stdout.includes(`STUB DRY=${dry} `), `Abgleich-Schritt (${wie}): DRY=${dry}`);
      ok(r.stdout.includes(`SECRET=${roh} `), `Abgleich-Schritt (${wie}): Client-Secret ist bereinigt`);
      ok(fs.readFileSync(path.join(d, 'lauf-sync.txt'), 'utf8').includes('STUB'), `Abgleich-Schritt (${wie}): Text liegt in lauf-sync.txt`);
    }
    // FORCE_ZERO: nur im Schreibmodus UND mit Meldung des Modus-Schritts; ein von aussen geerbter Wert wird nie durchgereicht
    for (const live of ['1', '0', '']) for (const modusFz of ['1', '0', '']) for (const geerbt of [undefined, '1', '0']) {
      const d = stubDir({ 'automation/fortura_bestand_sync.mjs': STUB });
      const r = fuehre(schritt('sync'), d, { LIVE: live, FORCE_ZERO_MODUS: modusFz, FORCE_ZERO: geerbt, MIN_FEED_ROWS: schritt('sync').env.MIN_FEED_ROWS, SHOPIFY_CLIENT_ID: 'i', SHOPIFY_CLIENT_SECRET: roh });
      const soll = live === '1' && modusFz === '1' ? '1' : 'unset';
      ok(r.stdout.includes(` FZ=${soll} `), `Abgleich-Schritt: live «${live}», force_zero «${modusFz}», geerbt ${geerbt ?? '-'} -> FORCE_ZERO ${soll} (war: ${(r.stdout.match(/ FZ=(\S+)/) || [])[1]})`);
      ok(r.stdout.includes(' MFR=18000'), `Abgleich-Schritt (live «${live}»): MIN_FEED_ROWS=18000 kommt beim Skript an`);
    }
    for (const geerbt of [undefined, '1', '0', 'true']) {
      const d = stubDir({ 'automation/fortura_bestand_sync.mjs': STUB });
      const r = fuehre(schritt('nach'), d, { FORCE_ZERO: geerbt, FORCE_ZERO_MODUS: '1', MIN_FEED_ROWS: schritt('nach').env.MIN_FEED_ROWS, SHOPIFY_CLIENT_ID: 'i', SHOPIFY_CLIENT_SECRET: roh });
      ok(r.stdout.includes(' FZ=unset ') && r.stdout.includes('STUB DRY=1 ') && r.stdout.includes(' MFR=18000'), `Nachprüfung: FORCE_ZERO wird nie durchgereicht (geerbt ${geerbt ?? '-'}), DRY=1, MIN_FEED_ROWS=18000`);
    }
    for (const exit of ['0', '2']) {
      const d = stubDir({ 'automation/fortura_bestand_sync.mjs': STUB });
      const r = fuehre(schritt('nach'), d, { STUB_EXIT: exit, SHOPIFY_CLIENT_ID: 'i', SHOPIFY_CLIENT_SECRET: roh + '=SHOPIFY_CLIENT_SECRET' });
      gleich([r.status, r.out.trim()], [Number(exit), 'rc=' + exit], `Nachprüfungs-Schritt Exit ${exit} wird weitergegeben`);
      ok(r.stdout.includes('STUB DRY=1 ') && r.stdout.includes(`SECRET=${roh} `), 'Nachprüfungs-Schritt: immer DRY=1, Secret bereinigt');
      ok(fs.existsSync(path.join(d, 'lauf-nach.txt')), 'Nachprüfungs-Schritt schreibt lauf-nach.txt');
    }
    {
      const d = stubDir({ 'automation/fortura_bestand_stempel.mjs': "console.log('STEMPEL-STUB LIVE_EXIT=' + process.env.LIVE_EXIT + ' NACH_EXIT=' + process.env.NACH_EXIT + ' NACH_DATEI=' + process.env.NACH_DATEI + ' LIVE=' + process.env.LIVE); process.exit(Number(process.env.STUB_EXIT || 0));" });
      const r = fuehre(schritt('stempel'), d, { LIVE_EXIT: '0', NACH_EXIT: '0', NACH_DATEI: 'lauf-nach.txt', LIVE: '1', STUB_EXIT: '1' });
      gleich([r.status, r.out.trim()], [1, 'rc=1'], 'Stempel-Schritt: Exit 1 wird weitergegeben');
      ok(r.stdout.includes('LIVE_EXIT=0 NACH_EXIT=0 NACH_DATEI=lauf-nach.txt LIVE=1'), 'Stempel-Schritt: Eingaben kommen beim Skript an');
    }
    {
      const d = stubDir({});
      fs.mkdirSync(path.join(d, 'rt'));
      const r = fuehre(zugang, d, { FORTURA_FTP_USER: 'u', FORTURA_FTP_PW: 'p', SHOPIFY_CLIENT_ID: 'i', SHOPIFY_CLIENT_SECRET: 's' });
      gleich(r.status, 0, 'Zugänge-Schritt: alles gesetzt -> Exit 0');
      ok(r.envd.includes(`FORTURA_CSV=${path.join(d, 'rt')}/fortura_feed.csv`) && r.envd.includes(`SHOPIFY_TOKEN_FILE=${path.join(d, 'rt')}/shop_token.txt`), 'Zugänge-Schritt: Pfade im Runner-Temp');
      for (const fehlt of ['FORTURA_FTP_USER', 'FORTURA_FTP_PW', 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET']) {
        const e = { FORTURA_FTP_USER: 'u', FORTURA_FTP_PW: 'p', SHOPIFY_CLIENT_ID: 'i', SHOPIFY_CLIENT_SECRET: 's' }; delete e[fehlt];
        const rr = fuehre(zugang, d, e);
        ok(rr.status === 2 && rr.stdout.includes('::error') && rr.stdout.includes(fehlt), `Zugänge-Schritt: ohne ${fehlt} -> Exit 2 und der Name steht in der Meldung`);
      }
      const rr = fuehre(zugang, d, { FORTURA_FTP_USER: 'u', FORTURA_FTP_PW: 'GEHEIMESPW', SHOPIFY_CLIENT_ID: 'i', SHOPIFY_CLIENT_SECRET: 'GEHEIMSEC' });
      ok(!rr.stdout.includes('GEHEIMESPW') && !rr.stdout.includes('GEHEIMSEC') && !rr.stderr.includes('GEHEIMESPW'), 'Zugänge-Schritt gibt keine Werte aus');
    }
    {
      const d = stubDir({});
      fs.writeFileSync(path.join(d, 'lauf-feed.txt'), 'Fortura-Feed geladen -> x (6000000 Bytes, 19953 Zeilen)\n');
      fs.writeFileSync(path.join(d, 'lauf-sync.txt'), 'Feed x: 1 Zeilen\nShop: 8416 Varianten\n\nAbgleich: 8400 unverändert · 16 zu ändern\nFERTIG. geändert=16 offen=0\n  fortura-GEHEIMTITEL 3 → 2\n');
      fs.writeFileSync(path.join(d, 'lauf-stempel.txt'), 'STEMPEL gesetzt: x\n');
      const r = fuehre(steps.find(s => s.name === 'Zusammenfassung'), d, { LIVE: '1', ERG_FEED: 'success', ERG_SYNC: 'success', ERG_NACH: 'skipped', ERG_STEMPEL: 'success', RC_SYNC: '0', RC_STEMPEL: '0' });
      gleich(r.status, 0, 'Zusammenfassung läuft ohne Fehler');
      ok(r.sum.includes('## Fortura-Bestand (Abgleich)') && r.sum.includes('| Abgleich | success | 0 |') && r.sum.includes('Abgleich: 8400 unverändert') && r.sum.includes('STEMPEL gesetzt'), 'Zusammenfassung zeigt Tabelle, Zahlen und Stempel');
      ok(!r.sum.includes('GEHEIMTITEL'), 'Zusammenfassung zeigt keine Produktzeilen');
      const r2 = fuehre(steps.find(s => s.name === 'Zusammenfassung'), stubDir({}), { LIVE: '0' });
      gleich(r2.status, 0, 'Zusammenfassung läuft auch ohne jede Datei');
      ok(r2.sum.includes('nur gelesen') && r2.sum.includes('(kein Lauf)'), 'Zusammenfassung im Trockenlauf ohne Dateien');
      ok(!r.sum.includes('aufgehoben') && !r2.sum.includes('aufgehoben'), 'Zusammenfassung: ohne null_erlauben kein Hinweis auf eine aufgehobene Bremse');
      const r3 = fuehre(steps.find(s => s.name === 'Zusammenfassung'), d, { LIVE: '1', FORCE_ZERO_MODUS: '1' });
      ok(r3.sum.includes('Nullungs-Bremse: **aufgehoben**') && r3.sum.includes('Nachprüfung lief mit scharfer Bremse'), 'Zusammenfassung nennt eine aufgehobene Nullungs-Bremse');
    }

    // Protokoll bereinigen: das Artefakt enthält keine Produkttitel, keinen Feed, keinen Token
    {
      const bereinigen = steps.find(s => s.name === 'Protokoll bereinigen');
      const T1 = 'GEHEIMTITEL-Weihnachtsmann-Kostüm', T2 = 'GEHEIMTITEL-Feed-Abgleich: 5 unverändert';
      const syncLog = [
        'Feed /home/runner/work/_temp/fortura_feed.csv: 20308 Zeilen → 18900 Artikelnummern (Fingerabdruck 0a1b2c3d4e5f)',
        'Shop: 8416 Varianten mit SKU fortura-* auf 141 Seiten', '',
        'Abgleich: 6532 unverändert · 1884 zu ändern (davon 161 auf 0) · 8 SKU nicht mehr im Feed (0.1 %) · 0 ohne Bestandsführung (unangetastet) · 0 ohne CH-Lagerzeile',
        'ACTIVE: 2258 Varianten · verkaufbar vorher 2258 → nachher 2195 (63 wegen Bazar-/Puffer-/Committed-Abzug nicht mehr bestellbar)',
        `  fortura-HB2887ML          3 →     0  feed  ${T1}`,
        `  fortura-ZZ00000           2 →     0  nicht-mehr-im-feed  ${T2}`,
        '  fortura-A1                1 →     4  feed  Abgleich: 99 unverändert · 1 zu ändern',
        '  … und 1859 weitere', '',
        'Wiederaufnahme: 3 bereits in diesem Feed-Lauf gesetzt.',
        '… 100/1884 (ok 100, offen 0)', '… 1884/1884 (ok 1884, offen 0)', '',
        'FERTIG. geändert=1884 offen=0 unverändert=6532 → dropship/_fortura_bestand_report.md',
        'ABBRUCH (Nullungs-Bremse): 161 von 2500 verkaufbaren Varianten würden auf 0 fallen (Grenze 375). Nichts geschrieben.',
        'OFFEN: Feed hat nur 12 Zeilen (< 18000) — abgeschnittener Download. Nichts geschrieben.', '[DRY] nichts geschrieben.', '',
      ].join('\n');
      const feedLog = ['Fortura-Feed geladen -> /home/runner/work/_temp/fortura_feed.csv (11700000 Bytes, 20309 Zeilen, Stand auf dem Server 2026-11-05T01:00:00Z)',
        '  Login: HTTP 503', '  Download zu klein: 100 Bytes (Mindestens 9000000). Abgeschnitten oder Fehlerantwort.', '  Neuer Versuch in 20s (1/3)…', 'HINWEIS: Stand nicht lesbar', 'FEHLER (Fortura-Feed): x',
        'DEBUG _sid=GEHEIMSID-123', '  curl -u GEHEIMUSER:GEHEIMPW https://x', ''].join('\n');
      const baue = (u = {}) => {
        const d = stubDir({}); fs.mkdirSync(path.join(d, 'rt'));
        if (u.logs !== false) {
          fs.writeFileSync(path.join(d, 'lauf-feed.txt'), feedLog); fs.writeFileSync(path.join(d, 'lauf-sync.txt'), syncLog); fs.writeFileSync(path.join(d, 'lauf-nach.txt'), syncLog);
          fs.writeFileSync(path.join(d, 'lauf-stempel.txt'), 'Gate: Live-Exit 0 · ...\nSTEMPEL gesetzt: shop.metafields.luxe.fortura_bestand_stand = 2026-11-05T04:00:00Z (frisch zurückgelesen)\n');
          fs.writeFileSync(path.join(d, 'dropship/_fortura_bestand_log.tsv'), '2026-11-05T04:01:00.000Z\t0a1b2c3d4e5f\tfortura-HB2887ML\t3\t0\tok\tfeed\t\tgid://shopify/InventoryItem/1\tACTIVE\n');
          fs.writeFileSync(path.join(d, 'dropship/_fortura_bestand_report.md'), '# Fortura-Bestandsabgleich\n');
          fs.writeFileSync(path.join(d, 'dropship/_fortura_bestand_stand.json'), '{"offen":0}');
        }
        // Dinge, die NICHT ins Artefakt gehören und im Arbeitsordner liegen könnten
        fs.writeFileSync(path.join(d, 'fortura_feed.csv'), 'ArtNr|Bezeichnung\nGEHEIMFEED|x\n'); fs.writeFileSync(path.join(d, 'shop_token.txt'), 'shpat_GEHEIMTOKEN');
        fs.writeFileSync(path.join(d, 'dropship/_fortura_sperr_varianten.txt'), 'gid://x'); fs.writeFileSync(path.join(d, 'lauf-sonst.txt'), 'GEHEIMSONST');
        return d;
      };
      const d = baue();
      const r = fuehre(bereinigen, d, { LIVE: '1' });
      gleich(r.status, 0, 'Protokoll bereinigen: Exit 0');
      const pdir = path.join(d, 'protokoll');
      gleich(fs.readdirSync(pdir).sort(), ['00-LIESMICH.txt', '_fortura_bestand_log.tsv', '_fortura_bestand_report.md', '_fortura_bestand_stand.json', 'lauf-feed.txt', 'lauf-nach.txt', 'lauf-stempel.txt', 'lauf-sync.txt'], 'Protokoll: genau diese acht Dateien, sonst nichts (kein Feed, kein Token, keine Sperrliste)');
      const alles = fs.readdirSync(pdir).map(f => fs.readFileSync(path.join(pdir, f), 'utf8')).join('\n----\n');
      for (const geheim of ['GEHEIMTITEL', 'Weihnachtsmann', 'GEHEIMFEED', 'GEHEIMTOKEN', 'GEHEIMSONST', 'GEHEIMSID', 'GEHEIMUSER', 'GEHEIMPW', 'fortura-HB2887ML          3']) ok(!alles.includes(geheim), `Protokoll enthält «${geheim}» nicht`);
      ok(!/^ {2}fortura-/m.test(alles) && !/und 1859 weitere/.test(alles), 'Protokoll: keine Planzeilen (SKU + Bestand + Titel), auch nicht der Rest «… und N weitere»');
      for (const nutz of ['Feed /home/runner/work/_temp/fortura_feed.csv: 20308 Zeilen', 'Shop: 8416 Varianten', 'Abgleich: 6532 unverändert · 1884 zu ändern (davon 161 auf 0)', 'ACTIVE: 2258 Varianten', 'Wiederaufnahme: 3', '… 100/1884 (ok 100, offen 0)', 'FERTIG. geändert=1884 offen=0', 'ABBRUCH (Nullungs-Bremse): 161 von 2500', 'OFFEN: Feed hat nur 12 Zeilen', '[DRY] nichts geschrieben.']) {
        ok(fs.readFileSync(path.join(pdir, 'lauf-sync.txt'), 'utf8').includes(nutz) && fs.readFileSync(path.join(pdir, 'lauf-nach.txt'), 'utf8').includes(nutz), `Protokoll behält die Zahlenzeile «${nutz.slice(0, 40)}»`);
      }
      const fl = fs.readFileSync(path.join(pdir, 'lauf-feed.txt'), 'utf8');
      ok(fl.includes('Fortura-Feed geladen') && fl.includes('  Login: HTTP 503') && fl.includes('  Download zu klein: 100 Bytes') && fl.includes('FEHLER (Fortura-Feed)'), 'Protokoll: die Diagnosezeilen des Feed-Abrufs bleiben');
      ok(fs.readFileSync(path.join(pdir, 'lauf-stempel.txt'), 'utf8').includes('STEMPEL gesetzt'), 'Protokoll: Stempel-Ausgabe bleibt');
      ok(fs.readFileSync(path.join(pdir, '_fortura_bestand_log.tsv'), 'utf8').includes('fortura-HB2887ML\t3\t0\tok'), 'Protokoll: Journal (SKU, alt, neu) ist vollständig kopiert');
      const kopf = fs.readFileSync(path.join(pdir, '00-LIESMICH.txt'), 'utf8');
      ok(kopf.startsWith('Fortura-Bestand (Abgleich): Protokoll dieses Laufs, 7 Tage aufbewahrt.') && !/^ /m.test(kopf.split('\n')[0]) && !kopf.includes('ENDE'), 'LIESMICH: Kopfzeile steht in Spalte 1, die Heredoc-Marke ist nicht im Text');
      ok(/Rücknahme/.test(kopf) && /4 alt \(Bestand VORHER\)/.test(kopf) && /5 neu \(Bestand NACHHER\)/.test(kopf) && /Spalte 9/.test(kopf) && /Ein fertiges Rücknahme-Skript gibt es nicht/.test(kopf), 'LIESMICH: sagt wofür (Rücknahme über die Journal-Spalten alt/neu) und dass es kein Rücknahme-Skript gibt');
      ok(/keine Produkttitel, keine Feed-Datei, keine Zugangsdaten/.test(kopf), 'LIESMICH: nennt, was NICHT enthalten ist');
      // Ohne jede Datei (z. B. Zugang fehlt): läuft durch, nur das LIESMICH
      const d2 = baue({ logs: false });
      const r2 = fuehre(bereinigen, d2, { LIVE: '0' });
      gleich([r2.status, fs.readdirSync(path.join(d2, 'protokoll'))], [0, ['00-LIESMICH.txt']], 'Protokoll ohne Läufe: Exit 0, nur das LIESMICH');
    }
  }
}

for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
console.log(`\n${n} Prüfungen, ${fehler} Fehler${uebersprungen ? `, ${uebersprungen} übersprungen` : ''}`);
process.exit(fehler ? 1 : 0);
