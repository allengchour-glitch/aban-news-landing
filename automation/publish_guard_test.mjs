// publish_guard_test.mjs — Tests für publish_guard.mjs v2 (19.10.2026), offline: Fake-fetch per --import, Wegwerf-Ordner, env nur mit PATH.
// Lauf: /opt/node22/bin/node automation/publish_guard_test.mjs        (node:test; Exit 1 bei einem Fehler)
// Muster aus Codex-PR #2673 (calls.jsonl), Aufbau in automation/lib/fake_fetch_preload.mjs + fake_fetch_lauf.mjs (wiederverwendbar).
// Die Test-Quellen (Python-Mengen und -Titelregeln, Ledger, Fenster-Dateien) sind ERFUNDEN und klein; ein eigener Test liest zusätzlich die ECHTEN
// Quellen (Python als Gegenprobe), damit eine umbenannte Liste oder ein gekürztes Ledger hier auffällt statt erst am Montag.
// Härtung 19.10. (zwei unabhängige Prüfer): Schalter-Matrix, Transport (redirect/Timeout/Retry/Annotation), Seitenlauf, Fenster-Dateien, Ledger-
// Untergrenzen, Titelregeln — jeweils mit einem Fall, der den Fehler vorher gezeigt hätte (Mutationslauf: siehe Übergabe, nicht im Repo).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { wegwerfOrdner, lauf } from './lib/fake_fetch_lauf.mjs';
import { sperrQuellenLaden, sperrGruende, hostOk, pythonMenge, kanalWahl, zeilenText, konfig, idsAusText, LEDGER_MIN, werbetestProbleme, pauseProbleme,
  titelRegelnPython } from './publish_guard.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url)), REPO = path.join(HIER, '..');
const HOST = 'test.myshopify.com', CID = 'erfundene-client-id', SECRET = 'shpss_ERFUNDEN_0123456789abcdef0123', TOKEN = 'erfundenes-token-granted';
const gid = n => `gid://shopify/Product/${15000000000000 + n}`;
const PUB = { online: 'gid://shopify/Publication/1', shop: 'gid://shopify/Publication/2', tiktok: 'gid://shopify/Publication/3', fbig: 'gid://shopify/Publication/4',
  google: 'gid://shopify/Publication/5', pinterest: 'gid://shopify/Publication/6', pos: 'gid://shopify/Publication/7', inbox: 'gid://shopify/Publication/8', headless: 'gid://shopify/Publication/9' };
const PUBS = [['online', 'Online Store'], ['pos', 'Point of Sale'], ['shop', 'Shop'], ['tiktok', 'TikTok'], ['fbig', 'Facebook & Instagram'], ['google', 'Google & YouTube'],
  ['pinterest', 'Pinterest'], ['inbox', 'Inbox'], ['headless', 'Luxe Style Headless']].map(([k, name]) => ({ id: PUB[k], name }));
const ZIELE = [PUB.shop, PUB.tiktok, PUB.fbig, PUB.pinterest];   // fehlt bei einem Produkt nur im Online Store veröffentlicht

// ── erfundene Quellen ──────────────────────────────────────────────────────────────────────────────────
// Titelregeln als kleine Stubs mit eigenen Kanarien (die echten stehen in google_sperrliste.py; ein Test unten läuft mit ihnen).
const PY_TITELREGELN = `
import re
def ist_feuerzeug(titel, typ=""):
    t = titel or ""
    return bool(re.search(r"feuerzeug|\\blighter", t, re.I)) and not re.search(r"zigarettenanz", t, re.I)
def ist_heilschmuck(titel):
    t = (titel or "").lower()
    return "armband" in t and bool(re.search(r"terahertz|ionen|magnettherapie", t))
def ist_schusswaffen_zubehoer(titel, typ="", tags=(), text="", en=""):
    kopf = " | ".join([titel or "", typ or "", " ".join(tags or [])]).lower()   # wie das Original: Titel, Typ UND Tags
    m = re.search(r"zielfernrohr|zweibein", kopf)
    return ("stark:" + m.group(0)) if m else ""
def _kan(paare, fn):
    return len(paare), [t for t, s in paare if bool(fn(t)) != s]
def feuerzeug_kanarien():
    return _kan([("Sturmfeuerzeug", True), ("Auto-Zigarettenanzuender", False)], ist_feuerzeug)
def heilschmuck_kanarien():
    return _kan([("Terahertz Armband", True), ("Kupfer-Armband Damen", False)], ist_heilschmuck)
def schusswaffen_kanarien():
    return _kan([("AK74 Zielfernrohr-Bruecke", True), ("Kamera-Stativ", False)], ist_schusswaffen_zubehoer)
`;
const PY_SPERRLISTE = `TAG_PRAEFIX = "google-gesperrt"
AUSSCHLUSS_TAGS = {
    "nicht-bewerben", "nur-onlineshop", "waffengesetz-verboten", "medizinprodukt-pruefen",
    "18plus", "raucher", "erotik", "kostuem", "refurbished", "marken-pruefen", "lizenz-risiko",   # Kommentar mit "Anführungszeichen"
    "google-policy-flag", "nicht-google-bewerben", "waffe-pruefen",
}
` + PY_TITELREGELN;
const PY_WERBUNG = `ALLE_WERBEKANAELE = {"nicht-bewerben", "18plus", "erotik", "raucher", "smoke-zubehoer",
                     "adult-nicht-bewerben", "gmc-adult-pull"}  # Kommentar
`;
const LEDGER_ERSTE = { '_merchant_issue_done.txt': `${15000000000041}\tgoogle-gesperrt-notlage\tLedger-Produkt 1\n`,
  '_merchant_sperre_durchgesetzt.txt': `2026-08-14\t${15000000000042}\tgoogle-gesperrt-adult\tLedger-Produkt 2\n`,
  '_google_kanal_gesaeubert.txt': `${gid(43)}\tfremde-marke-im-titel\tLedger-Produkt 3\n`,
  '_google_kanal_gesaeubert2.txt': `${gid(44)}\tpersonenortung\tLedger-Produkt 4\n`,
  '_google_sperrtags_durchgesetzt.txt': `2026-09-23T16:03:07Z\t${gid(45)}\tnicht-bewerben\tGoogle & YouTube+TikTok\tledger-produkt-5\n` };
/** Ledger-Text: die Testzeile plus Füllzeilen bis zur Untergrenze (LEDGER_MIN) — ein kleineres Ledger wäre «abgeschnitten». */
const ledgerText = (datei, erste, n = LEDGER_MIN[datei]) => erste + Array.from({ length: n }, (_, i) => `${15100000000000 + i}\tfueller\n`).join('');
const LEDGER = Object.fromEntries(Object.entries(LEDGER_ERSTE).map(([k, v]) => [k, ledgerText(k, v)]));
const PAUSE = `# halloween\t2000-01-01T00:00:00Z\t2099-01-01T00:00:00Z\tsocial-pause-halloween\npid:${15000000000050}\nh:pause-handle\n`;
const WERBETEST = `# Werbetest\n# ende: 2099-12-31\n${15000000000060}  werbetest-handle   # Silberarmband\n`;

/** Wegwerf-Wurzel mit Kopie des Wächters, seiner Helfer und erfundenen Quellen. `aendern` darf Dateien ersetzen/löschen (null = löschen). */
function wurzel(t, aendern = {}, { echt = false } = {}) {
  const root = wegwerfOrdner(t), kopie = (von, nach) => { fs.mkdirSync(path.dirname(path.join(root, nach)), { recursive: true }); fs.copyFileSync(path.join(REPO, von), path.join(root, nach)); };
  for (const f of ['publish_guard.mjs', 'klingenregel.mjs', 'klingenregel.json', 'lib/social_pause.mjs', 'lib/werbetest_sperre.mjs']) kopie('automation/' + f, 'automation/' + f);
  let dateien;
  if (echt) {   // die ECHTEN Sperrquellen des Repos (Python-Titelregeln samt Regel-JSON, Ledger, Fenster-Dateien)
    for (const f of ['automation/google_sperrliste.py', 'automation/google_sperrtags_durchsetzen.py', 'automation/data/schusswaffen_zubehoer_regel.json', 'data/heilschmuck_regel.json',
      ...Object.keys(LEDGER).map(k => 'dropship/' + k), 'dropship/_social_pause.txt', 'dropship/_werbetest_sperre.txt']) kopie(f, f);
    dateien = { ...aendern };
  } else dateien = { 'automation/google_sperrliste.py': PY_SPERRLISTE, 'automation/google_sperrtags_durchsetzen.py': PY_WERBUNG,
    ...Object.fromEntries(Object.entries(LEDGER).map(([k, v]) => ['dropship/' + k, v])), 'dropship/_social_pause.txt': PAUSE, 'dropship/_werbetest_sperre.txt': WERBETEST, ...aendern };
  for (const [f, inhalt] of Object.entries(dateien)) {
    const ziel = path.join(root, f);
    if (inhalt === null) { fs.rmSync(ziel, { force: true }); continue; }   // null = Datei fehlt (auch eine kopierte)
    fs.mkdirSync(path.dirname(ziel), { recursive: true }); fs.writeFileSync(ziel, inhalt);
  }
  return { root, skript: path.join(root, 'automation', 'publish_guard.mjs') };
}
/** Produkt, das nur im Online Store steht (also in allen vier übrigen Zielkanälen fehlt). */
const produkt = (n, extra = {}) => ({ id: gid(n), handle: `produkt-${n}`, title: `Damen-Kleid Modell ${n}`, status: 'ACTIVE', tags: ['damen', 'cj-real'],
  resourcePublications: { nodes: [{ isPublished: true, publication: { id: PUB.online } }] }, ...extra });
const GRAPHQL = { pathRegex: 'graphql\\.json$' };
function szenario({ produkte = [], ergebnisse = {}, oauth, publications = PUBS, produktRoute, extra = [] } = {}) {
  return { hosts: [HOST], fastTimers: true, routes: [
    { name: 'oauth', match: { method: 'POST', host: HOST, path: '/admin/oauth/access_token', json: { client_id: CID, client_secret: SECRET, grant_type: 'client_credentials' } },
      respond: oauth ?? { json: { access_token: TOKEN } } },
    ...extra,
    { name: 'kanaele', match: { ...GRAPHQL, queryRegex: 'publications\\(first', headers: { 'x-shopify-access-token': TOKEN } }, respond: { json: { data: { publications: { nodes: publications } } } } },
    ...Object.entries(ergebnisse).map(([n, respond]) => ({ name: 'publish-' + n, match: { ...GRAPHQL, queryRegex: 'publishablePublish', variables: { id: gid(+n) } }, respond })),
    { name: 'publish', match: { ...GRAPHQL, queryRegex: 'publishablePublish', headers: { 'x-shopify-access-token': TOKEN } }, respond: { json: { data: { publishablePublish: { userErrors: [] } } } } },
    { name: 'produkte', match: { ...GRAPHQL, queryRegex: 'products\\(first', headers: { 'x-shopify-access-token': TOKEN } },
      respond: produktRoute ?? { json: { data: { products: { nodes: produkte, pageInfo: { hasNextPage: false, endCursor: null } } } } } },
  ] };
}
const ENV = { SHOPIFY_SHOP: HOST, SHOPIFY_CLIENT_ID: CID, SHOPIFY_CLIENT_SECRET: SECRET };
const SCHREIBEND = { LIVE: '1', APPROVE_PUBLISH: '1' };
function start(w, sz, env = {}, args = []) { return lauf({ dir: w.root, skript: w.skript, szenario: sz, env: { ...ENV, ...env }, args }); }
const bericht = r => JSON.parse(r.stdout.split('\n').filter(z => !z.startsWith('::')).join('\n'));
const annotationen = r => r.stdout.split('\n').filter(z => z.startsWith('::'));
const mutationen = r => r.aufrufe.filter(a => a.query?.includes('publishablePublish'));
const keinGeheimnis = r => { assert.ok(!r.roh.includes(SECRET), 'Client-Secret taucht in Ausgabe/Protokoll auf'); assert.ok(!r.roh.includes(TOKEN), 'Token taucht in Ausgabe/Protokoll auf'); };

// ── Schalter ───────────────────────────────────────────────────────────────────────────────────────────
test('nur LIVE=1: keine Mutation, aber LAUT (liveRequested/live/grund + ::warning::)', t => {
  const w = wurzel(t), r = start(w, szenario({ produkte: [produkt(1), produkt(2)] }), { LIVE: '1' });
  assert.equal(r.status, 0, r.stderr);
  const b = bericht(r);
  assert.equal(b.liveRequested, true); assert.equal(b.live, false); assert.equal(b.publishApproved, false); assert.equal(b.modus, 'lesend');
  assert.match(b.grund, /LIVE=1 ohne APPROVE_PUBLISH=1/);
  assert.equal(b.zuPublizieren, 2); assert.equal(b.published, 0); assert.equal(b.zaehler.offen, 2);
  assert.equal(annotationen(r).filter(z => z.startsWith('::warning ')).length, 1);
  assert.match(annotationen(r)[0], /^::warning title=publish_guard::.*APPROVE_PUBLISH=1 fehlt/);
  assert.deepEqual(mutationen(r), []); keinGeheimnis(r);
});

test('APPROVE_PUBLISH=1 allein und kein Schalter: lesender Lauf, keine Mutation', t => {
  for (const [env, grund] of [[{ APPROVE_PUBLISH: '1' }, /APPROVE_PUBLISH=1 ohne LIVE=1/], [{}, /Trockenlauf/]]) {
    const w = wurzel(t), r = start(w, szenario({ produkte: [produkt(1)] }), env), b = bericht(r);
    assert.equal(r.status, 0, r.stderr); assert.equal(b.live, false); assert.match(b.grund, grund); assert.deepEqual(mutationen(r), []);
  }
});

test('beide Schalter: Mutation NUR für nicht gesperrte Produkte, nur an die fehlenden Zielkanäle', t => {
  const w = wurzel(t), r = start(w, szenario({ produkte: [
    produkt(1), produkt(2),
    produkt(10, { tags: ['18plus', 'raucher', 'smoke-zubehoer'] }),                               // KANARIENVOGEL: echter Tag-Satz (Aschenbecher, 19.10. gemessen)
    produkt(11, { tags: ['nicht-google-bewerben', 'google-policy-flag'] }),
    produkt(12, { tags: ['google-gesperrt-adult'] }),                                             // Präfix aus TAG_PRAEFIX
    produkt(13, { tags: ['social-pause-halloween'] }),                                            // Präfix
    produkt(14, { tags: ['harness-google-raus-2026-08-21'] }),                                    // Namensmuster
    produkt(41), produkt(42), produkt(43), produkt(44), produkt(45),                              // je ein Ledger
    produkt(50), produkt(51, { handle: 'pause-handle' }),                                         // social-pause-Fenster: pid / handle
    produkt(60), produkt(61, { handle: 'werbetest-handle' }),                                     // Werbetest-Sperre: pid / handle
    produkt(70, { title: 'Yoland Schwertpflegeöl – Rostschutz für Klingen' }),                    // Klingenregel ohne Tag
  ] }), SCHREIBEND);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const b = bericht(r);
  assert.equal(b.live, true); assert.equal(b.modus, 'schreibend');
  assert.equal(b.scanned, 17); assert.equal(b.productsMissingChannels, 17);
  assert.equal(b.respektierteSperren, 15); assert.equal(b.zaehler.skipped_sperre, 15);
  assert.equal(b.published, 2); assert.equal(b.failed, 0);
  const m = mutationen(r);
  assert.deepEqual(m.map(x => x.variables.id).sort(), [gid(1), gid(2)]);
  for (const x of m) assert.deepEqual(x.variables.input.map(i => i.publicationId).sort(), [...ZIELE].sort());   // Shop, TikTok, FB/IG, Pinterest — nie Google/Inbox/POS/Headless
  const kanarie = b.produkte.find(p => p.handle === 'produkt-10');
  assert.equal(kanarie.state, 'skipped_sperre'); assert.ok(kanarie.gruende.includes('tag:18plus'));
  const grund = h => b.produkte.find(p => p.handle === h).gruende.join(',');
  assert.match(grund('produkt-12'), /praefix:google-gesperrt-adult/); assert.match(grund('produkt-13'), /praefix:social-pause-halloween/);
  assert.match(grund('produkt-14'), /muster:harness-google-raus-2026-08-21/);
  for (const [n, datei] of [[41, '_merchant_issue_done.txt'], [42, '_merchant_sperre_durchgesetzt.txt'], [43, '_google_kanal_gesaeubert.txt'], [44, '_google_kanal_gesaeubert2.txt'], [45, '_google_sperrtags_durchgesetzt.txt']])
    assert.match(grund('produkt-' + n), new RegExp('ledger:' + datei));
  assert.match(grund('produkt-50'), /social-pause-fenster/); assert.match(grund('pause-handle'), /social-pause-fenster/);
  assert.match(grund('produkt-60'), /werbetest-sperre/); assert.match(grund('werbetest-handle'), /werbetest-sperre/);
  assert.match(grund('produkt-70'), /titel:klinge/);
  keinGeheimnis(r);
});

test('Gegenproben: Chargenmarke, «pull»-Tag, Messerblock und sauberes Produkt werden NICHT gesperrt', t => {
  const w = wurzel(t), r = start(w, szenario({ produkte: [
    produkt(1, { tags: ['rueckhol-0907', 'damen'] }), produkt(2, { tags: ['kat-damen-pullover'] }), produkt(3, { title: 'Messerblock aus Holz', tags: ['haushalt'] }),
    produkt(4, { tags: ['versand-pruefen'] }) ] }), SCHREIBEND);
  assert.equal(r.status, 0, r.stderr); assert.equal(bericht(r).published, 4); assert.equal(mutationen(r).length, 4);
});

test('Sperr-Gründe sind Sache der Quelle: ein neuer Tag in der Python-Liste sperrt ohne Codeänderung', t => {
  const w = wurzel(t, { 'automation/google_sperrliste.py': PY_SPERRLISTE.replace('"waffe-pruefen"', '"waffe-pruefen", "neuer-sperrtag"') });
  const r = start(w, szenario({ produkte: [produkt(1, { tags: ['neuer-sperrtag'] }), produkt(2)] }), SCHREIBEND), b = bericht(r);
  assert.equal(b.published, 1); assert.equal(b.zaehler.skipped_sperre, 1); assert.deepEqual(mutationen(r).map(m => m.variables.id), [gid(2)]);
});

// ── fail-closed ────────────────────────────────────────────────────────────────────────────────────────
test('Sperrquelle fehlt/unlesbar/gekürzt → «unklar»: Exit 1, ::error::, keine Mutation, nicht einmal eine Netzanfrage', t => {
  const faelle = {
    'Ledger fehlt': { 'dropship/_merchant_issue_done.txt': null },
    'Ledger ist ein Ordner (unlesbar)': { 'dropship/_google_kanal_gesaeubert.txt': null },
    'alle Ledger leer': Object.fromEntries(Object.keys(LEDGER).map(k => ['dropship/' + k, ''])),
    'Pause-Datei fehlt': { 'dropship/_social_pause.txt': null },
    'Werbetest-Datei fehlt': { 'dropship/_werbetest_sperre.txt': null },
    'Sperrliste fehlt': { 'automation/google_sperrliste.py': null },
    'AUSSCHLUSS_TAGS gekürzt (Kanarienvogel fehlt)': { 'automation/google_sperrliste.py': PY_SPERRLISTE.replace('"nicht-bewerben", ', '') },
    'AUSSCHLUSS_TAGS umgebaut (set([...]))': { 'automation/google_sperrliste.py': 'TAG_PRAEFIX = "google-gesperrt"\nAUSSCHLUSS_TAGS = set(["nicht-bewerben"])\n' },
    'TAG_PRAEFIX fehlt': { 'automation/google_sperrliste.py': PY_SPERRLISTE.replace('TAG_PRAEFIX = "google-gesperrt"', '') },
    'ALLE_WERBEKANAELE nie geschlossen': { 'automation/google_sperrtags_durchsetzen.py': 'ALLE_WERBEKANAELE = {"nicht-bewerben", "18plus"' },
    // 19.10. (Prüfer): ein einzelnes abgeschnittenes/leeres Ledger und eine Fenster-Datei mit kaputtem Kopf galten vorher als «ok» (0 gesperrte IDs)
    'ein Ledger abgeschnitten (3 statt ≥ 100 IDs)': { 'dropship/_google_sperrtags_durchgesetzt.txt': ledgerText('_google_sperrtags_durchgesetzt.txt', LEDGER_ERSTE['_google_sperrtags_durchgesetzt.txt'], 2) },
    'ein Ledger leer': { 'dropship/_google_kanal_gesaeubert.txt': '' },
    'Werbetest: «# ende» ohne Doppelpunkt/Datum': { 'dropship/_werbetest_sperre.txt': `# Werbetest A\n# ende 24.10.2026\n${15000000000060} werbetest-handle\n` },
    'Werbetest: Kopf fehlt ganz': { 'dropship/_werbetest_sperre.txt': `${15000000000060} werbetest-handle\n` },
    'Werbetest: Datum unmöglich (2026-13-45)': { 'dropship/_werbetest_sperre.txt': `# ende: 2026-13-45\n${15000000000060} werbetest-handle\n` },
    'Werbetest: Zeile ohne lesbare ID (nur Handle)': { 'dropship/_werbetest_sperre.txt': `# ende: 2099-12-31\nwerbetest-handle   # nur Handle\n` },
    'Pause: Kopf mit unlesbaren Daten': { 'dropship/_social_pause.txt': `# halloween\tgestern\tmorgen\tsocial-pause-halloween\npid:${15000000000050}\n` },
    'Pause: Schlüssel ohne Kopf': { 'dropship/_social_pause.txt': `pid:${15000000000050}\nh:pause-handle\n` },
    'Pause: Kommentarzeile setzt das Fenster zurück': { 'dropship/_social_pause.txt': PAUSE.replace('pid:', '# nur ein Kommentar\npid:') },
    'Titelregeln: Kanarienvogel Feuerzeug fällt': { 'automation/google_sperrliste.py': PY_SPERRLISTE.replace('("Sturmfeuerzeug", True)', '("Sturmfeuerzeug", False)') },
    'Titelregeln: Kanarien Heil-Schmuck leer': { 'automation/google_sperrliste.py': PY_SPERRLISTE.replace('return _kan([("Terahertz Armband", True), ("Kupfer-Armband Damen", False)], ist_heilschmuck)', 'return 0, []') },
    'Titelregeln: Funktion fehlt/umbenannt': { 'automation/google_sperrliste.py': PY_SPERRLISTE.replace('def ist_schusswaffen_zubehoer', 'def ist_swz_umbenannt') },
    'JS-Modul fehlt: klingenregel.mjs': { 'automation/klingenregel.mjs': null },
    'JS-Module fehlen: social_pause.mjs + werbetest_sperre.mjs': { 'automation/lib/social_pause.mjs': null, 'automation/lib/werbetest_sperre.mjs': null },
  };
  const muster = { 'ein Ledger abgeschnitten (3 statt ≥ 100 IDs)': /_google_sperrtags_durchgesetzt\.txt: nur \d+ Produkt-IDs, Untergrenze 100/, 'ein Ledger leer': /_google_kanal_gesaeubert\.txt: nur 0 Produkt-IDs/,
    'Werbetest: «# ende» ohne Doppelpunkt/Datum': /_werbetest_sperre\.txt: Kopf «# ende/, 'Werbetest: Kopf fehlt ganz': /_werbetest_sperre\.txt: Kopf «# ende/,
    'Werbetest: Datum unmöglich (2026-13-45)': /_werbetest_sperre\.txt: Kopf «# ende/, 'Werbetest: Zeile ohne lesbare ID (nur Handle)': /_werbetest_sperre\.txt: Zeile 2: keine lesbare Produkt-ID/,
    'Pause: Kopf mit unlesbaren Daten': /_social_pause\.txt: Zeile 1: Kopf/, 'Pause: Schlüssel ohne Kopf': /_social_pause\.txt: Zeile 1: Schlüssel ohne gültigen Kopf/,
    'Pause: Kommentarzeile setzt das Fenster zurück': /_social_pause\.txt: Zeile 2: Kopf/, 'Titelregeln: Kanarienvogel Feuerzeug fällt': /Titelregeln unklar — Kanarien fehlgeschlagen oder leer: feuerzeug \[2,1\]/,
    'Titelregeln: Kanarien Heil-Schmuck leer': /Kanarien fehlgeschlagen oder leer: heilschmuck \[0,0\]/, 'Titelregeln: Funktion fehlt/umbenannt': /Titelregeln unklar — Python endete mit Status 1: .*ist_schusswaffen_zubehoer/,
    'JS-Modul fehlt: klingenregel.mjs': /automation\/klingenregel\.mjs: Modul nicht ladbar \(ERR_MODULE_NOT_FOUND\)/ };
  for (const [name, aendern] of Object.entries(faelle)) {
    const dir0 = name === 'Ledger ist ein Ordner (unlesbar)';
    const w = wurzel(t, aendern);
    if (dir0) fs.mkdirSync(path.join(w.root, 'dropship', '_google_kanal_gesaeubert.txt'));
    const r = start(w, szenario({ produkte: [produkt(1), produkt(2)] }), SCHREIBEND), b = bericht(r);
    assert.equal(r.status, 1, `${name}: Exit ${r.status}`);
    assert.equal(b.sperrquellen.status, 'unklar', name); assert.ok(b.sperrquellen.probleme.length >= 1, name);
    if (muster[name]) assert.match(b.sperrquellen.probleme.join(' | '), muster[name], name);
    assert.doesNotMatch(r.stderr, /ERR_MODULE_NOT_FOUND|at .*\.mjs:\d+/, `${name}: Stack-Trace statt «unklar»`);
    assert.equal(b.live, false, name); assert.match(b.grund, /fail-closed/, name);
    assert.ok(annotationen(r).some(z => z.startsWith('::error ')), name);
    assert.deepEqual(r.aufrufe, [], `${name}: es darf keine Netzanfrage geben`); keinGeheimnis(r);
  }
});

test('Sperrquelle unklar im Trockenlauf: ebenfalls Exit 1 (kaputter Wächter soll auffallen), --zeile meldet es in EINER Zeile mit Exit 0', t => {
  const w = wurzel(t, { 'dropship/_social_pause.txt': null });
  assert.equal(start(w, szenario({ produkte: [produkt(1)] })).status, 1);
  const z = start(w, szenario({ produkte: [produkt(1)] }), SCHREIBEND, ['--zeile']);
  assert.equal(z.status, 0); assert.equal(z.stdout.trim().split('\n').length, 1);
  assert.match(z.stdout, /^⚠️ PUBLISH-GUARD: unklar \(Sperrquelle unklar/); assert.deepEqual(mutationen(z), []);
});

test('echte Quellen des Repos: lesbar, Kanarien vorhanden, Python-Mengen Zeichen für Zeichen gleich (Python als Gegenprobe)', t => {
  const q = sperrQuellenLaden();
  assert.equal(q.ok, true, q.probleme?.join('; '));
  assert.ok(q.stat.ausschlussTags >= 12 && q.stat.werbekanalTags >= 6 && q.stat.ledgerIds > 0);
  const py = (datei, name) => {
    const r = spawnSync('python3', ['-I', '-c', `import ast,json,sys
t = ast.parse(open(sys.argv[1], encoding="utf-8").read())
for n in t.body:
    if isinstance(n, ast.Assign) and getattr(n.targets[0], "id", None) == sys.argv[2]:
        print(json.dumps(sorted({str(x).strip().lower() for x in ast.literal_eval(n.value)}))); break`, path.join(HIER, datei), name], { encoding: 'utf8' });
    return r.status === 0 ? JSON.parse(r.stdout) : null;
  };
  const a = py('google_sperrliste.py', 'AUSSCHLUSS_TAGS'), w = py('google_sperrtags_durchsetzen.py', 'ALLE_WERBEKANAELE');
  if (!a || !w) return t.skip('python3 nicht verfügbar');
  const text = n => fs.readFileSync(path.join(HIER, n), 'utf8');
  assert.deepEqual([...pythonMenge(text('google_sperrliste.py'), 'AUSSCHLUSS_TAGS')].sort(), a);
  assert.deepEqual([...pythonMenge(text('google_sperrtags_durchsetzen.py'), 'ALLE_WERBEKANAELE')].sort(), w);
  assert.ok([...a, ...w].every(x => q.tags.has(x)));
  assert.match(text('google_sperrliste.py'), /startswith\("google-kanal-"\)/, 'der feste Präfix google-kanal- steht nicht mehr in ausschluss_tag()');
});

// ── Host ───────────────────────────────────────────────────────────────────────────────────────────────
test('verdorbener SHOPIFY_SHOP: Exit 2, 0 Netzaufrufe, Wert und Secret nicht in der Ausgabe', t => {
  for (const shop of ['evil.com', 'test.myshopify.com.evil.com', 'user:pw@test.myshopify.com', 'test.myshopify.com/admin', 'test.myshopify.com:8443', 'TEST.myshopify.com',
    'https://test.myshopify.com', 'te st.myshopify.com', 'test.myshopify.com?x=1', `${SECRET}`]) {
    const w = wurzel(t), r = start(w, szenario({ produkte: [produkt(1)] }), { ...SCHREIBEND, SHOPIFY_SHOP: shop });
    assert.equal(r.status, 2, `${shop}: Exit ${r.status}`); assert.deepEqual(r.aufrufe, [], `${shop}: Netzanfrage trotz verdorbenem Host`);
    assert.match(r.stdout, /kein gültiger \*\.myshopify\.com-Host/); assert.ok(!r.roh.includes(SECRET)); assert.ok(!r.roh.includes('evil'));
  }
  assert.ok(hostOk('au3j0y-hq.myshopify.com') && !hostOk('au3j0y-hq.myshopify.com.evil.com') && !hostOk('x.myshopify.com\n'));
});

test('ohne SHOPIFY_SHOP / ohne Zugangsdaten: No-op mit Exit 0 (Forks ohne Secrets bleiben grün), keine Anfrage', t => {
  const a = start(wurzel(t), szenario(), { SHOPIFY_SHOP: '' }); assert.equal(a.status, 0); assert.match(a.stdout, /no-op: kein SHOPIFY_SHOP/); assert.deepEqual(a.aufrufe, []);
  const b = start(wurzel(t), szenario(), { SHOPIFY_CLIENT_ID: '', SHOPIFY_CLIENT_SECRET: '' }); assert.equal(b.status, 0); assert.match(b.stdout, /no-op: keine Shopify-Zugangsdaten/); assert.deepEqual(b.aufrufe, []);
});

// ── Fehler sichtbar ────────────────────────────────────────────────────────────────────────────────────
test('userErrors, GraphQL-Fehler, verlorene Antwort, fehlendes Ergebnis: sichtbar je Produkt, Teilerfolg bleibt, Exit 1', t => {
  const w = wurzel(t), r = start(w, szenario({ produkte: [produkt(1), produkt(2), produkt(3), produkt(4), produkt(5), produkt(6)], ergebnisse: {
    2: { json: { data: { publishablePublish: { userErrors: [{ field: ['id'], message: 'Publication rejected' }] } } } },
    3: { graphqlErrors: [{ message: 'Access denied' }] },
    4: { networkError: 'Verbindung weg' },
    5: { json: { data: {} } } } }), SCHREIBEND);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  const b = bericht(r), st = h => b.produkte.find(p => p.handle === h);
  assert.deepEqual(b.zaehler, { published: 2, skipped_sperre: 0, userErrors: 1, unknown: 3, offen: 0 });
  assert.equal(b.published, 2); assert.equal(b.failed, 4);
  assert.equal(st('produkt-2').state, 'userErrors'); assert.match(st('produkt-2').meldung, /Publication rejected/);
  assert.equal(st('produkt-3').state, 'unknown'); assert.match(st('produkt-3').meldung, /GraphQL: .*Access denied/);
  assert.equal(st('produkt-4').state, 'unknown'); assert.match(st('produkt-4').meldung, /Verbindung weg/);
  assert.equal(st('produkt-5').state, 'unknown'); assert.match(st('produkt-5').meldung, /Ergebnismeldung/);
  assert.equal(b.errors.length, 4);
  assert.equal(st('produkt-1').state, 'published'); assert.equal(st('produkt-6').state, 'published');   // der Lauf bricht nicht bei der ersten Panne ab
  assert.ok(annotationen(r).some(z => /^::error title=publish_guard::.*4 Produkt/.test(z)));
  keinGeheimnis(r);
});

test('5 Schreibfehler in Folge stoppen die Schleife; der Rest bleibt «offen», Exit 1', t => {
  const n = [1, 2, 3, 4, 5, 6, 7, 8];
  const w = wurzel(t), r = start(w, szenario({ produkte: n.map(i => produkt(i)), ergebnisse: Object.fromEntries(n.map(i => [i, { networkError: 'Verbindung weg' }])) }), SCHREIBEND);
  const b = bericht(r);
  assert.equal(r.status, 1); assert.equal(mutationen(r).length, 5); assert.equal(b.zaehler.unknown, 5); assert.equal(b.zaehler.offen, 3); assert.match(b.abbruch, /nach 5 Fehlern in Folge/);
});

test('Drosselung (THROTTLED) wird ausgesessen: 2 s, dann Erfolg — ohne echte Wartezeit; ein Dauerfehler endet nach 4 Wiederholungen', t => {
  const w = wurzel(t), drossel = { graphqlErrors: [{ message: 'Throttled', extensions: { code: 'THROTTLED' } }] };
  const r = start(w, szenario({ produkte: [produkt(1)], ergebnisse: { 1: { sequence: [drossel, drossel, { json: { data: { publishablePublish: { userErrors: [] } } } }] } } }), SCHREIBEND);
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.equal(bericht(r).published, 1);
  assert.deepEqual(r.aufrufe.filter(a => a.timer).map(a => a.timer), [2000, 4000]);
  const w2 = wurzel(t), r2 = start(w2, szenario({ produkte: [produkt(1)], ergebnisse: { 1: { graphqlErrors: drossel.graphqlErrors } } }), SCHREIBEND);
  assert.equal(r2.status, 1); assert.equal(mutationen(r2).length, 5); assert.deepEqual(r2.aufrufe.filter(a => a.timer).map(a => a.timer), [2000, 4000, 8000, 16000]);
});

test('OAuth-Fehler sind Fehler, nicht «no-op»: HTTP-Status ohne Inhalt, keine weitere Anfrage', t => {
  for (const [oauth, muster] of [[{ status: 401, text: `denied ${SECRET}` }, /OAuth: HTTP 401/], [{ json: { error: 'invalid' } }, /OAuth: Antwort enthält keinen Token/], [{ networkError: 'dns' }, /dns/]]) {
    const w = wurzel(t), r = start(w, szenario({ oauth, produkte: [produkt(1)] }), SCHREIBEND);
    assert.equal(r.status, 1, r.stdout); assert.match(bericht(r).hauptfehler, muster); assert.equal(r.aufrufe.length, 1); assert.deepEqual(mutationen(r), []);
    assert.ok(!r.stdout.includes(SECRET) && !r.stderr.includes(SECRET));   // auch ein Server, der das Secret zurückspiegelt, kommt nicht in die Ausgabe
  }
});

test('ADMIN_TOKEN statt Client-Credentials: kein OAuth-Aufruf, Token im Header', t => {
  const sz = szenario({ produkte: [produkt(1)] }); sz.routes[0].match = { path: '/gibt-es-nicht' };
  for (const r of sz.routes) if (r.match.headers) r.match.headers['x-shopify-access-token'] = 'admin-token-erfunden';
  const w = wurzel(t), r = start(w, sz, { ...SCHREIBEND, SHOPIFY_CLIENT_ID: '', SHOPIFY_CLIENT_SECRET: '', SHOPIFY_ADMIN_TOKEN: 'admin-token-erfunden' });
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.equal(bericht(r).published, 1); assert.ok(!r.aufrufe.some(a => a.path.includes('oauth'))); assert.ok(!r.roh.includes('admin-token-erfunden'));
});

test('ungültige Antworten und Produkte: nie schreiben, immer melden', t => {
  const kaputt = [['Tags fehlen', { tags: undefined }], ['Tag ist kein String', { tags: [null] }], ['Tags als String', { tags: 'nicht-bewerben' }],
    ['isPublished fehlt', { resourcePublications: { nodes: [{ publication: { id: PUB.online } }] } }], ['Kanalliste fehlt', { resourcePublications: null }], ['Titel fehlt', { title: undefined }]];
  for (const [name, extra] of kaputt) {
    const w = wurzel(t), r = start(w, szenario({ produkte: [produkt(1, extra), produkt(2)] }), SCHREIBEND), b = bericht(r);
    assert.equal(r.status, 1, name); assert.deepEqual(mutationen(r).map(m => m.variables.id), [gid(2)], name); assert.equal(b.zaehler.unknown, 1, name);
  }
  const w = wurzel(t), r = start(w, szenario({ produktRoute: { json: { data: { products: null } } } }), SCHREIBEND);
  assert.equal(r.status, 1); assert.match(bericht(r).hauptfehler, /Products: Antwort enthält keine gültige Produktliste/); assert.deepEqual(mutationen(r), []);
  const w2 = wurzel(t), r2 = start(w2, szenario({ publications: [{ id: PUB.google, name: 'Google & YouTube' }] }), SCHREIBEND);
  assert.equal(r2.status, 1); assert.match(bericht(r2).hauptfehler, /kein Zielkanal/);
});

test('isPublished:false zählt als fehlend; DRAFT/ARCHIVED werden nicht angefasst', t => {
  const unveroeffentlicht = nodes => ({ resourcePublications: { nodes } });
  const alle = [PUB.online, ...ZIELE].map(id => ({ isPublished: true, publication: { id } }));
  const w = wurzel(t), r = start(w, szenario({ produkte: [
    produkt(1, unveroeffentlicht(alle.map(n => n.publication.id === PUB.tiktok ? { ...n, isPublished: false } : n))), produkt(2, unveroeffentlicht(alle)),
    produkt(3, { status: 'DRAFT' }), produkt(4, { status: 'ARCHIVED' }) ] }), SCHREIBEND), b = bericht(r);
  assert.equal(r.status, 0, r.stdout); assert.equal(b.skippedInactive, 2); assert.equal(b.productsMissingChannels, 1);
  assert.deepEqual(mutationen(r).map(m => [m.variables.id, m.variables.input.map(i => i.publicationId)]), [[gid(1), [PUB.tiktok]]]);
});

// ── Kanäle ─────────────────────────────────────────────────────────────────────────────────────────────
test('Google, Inbox, Point of Sale und unbekannte Kanäle sind nie Ziel; Headless nur mit INCLUDE_HEADLESS=1; INCLUDE_GOOGLE wird abgelehnt', t => {
  const neu = [...PUBS, { id: 'gid://shopify/Publication/99', name: 'Neuer Marktplatz' }];
  const r = start(wurzel(t), szenario({ produkte: [produkt(1)], publications: neu }), SCHREIBEND), b = bericht(r);
  assert.deepEqual(b.targetChannels, ['Online Store', 'Shop', 'TikTok', 'Facebook & Instagram', 'Pinterest']);
  assert.deepEqual(b.ignoredChannels, ['Point of Sale', 'Google & YouTube', 'Inbox', 'Luxe Style Headless', 'Neuer Marktplatz']);
  assert.deepEqual(mutationen(r)[0].variables.input.map(i => i.publicationId).sort(), [...ZIELE].sort());
  const h = start(wurzel(t), szenario({ produkte: [produkt(1)], publications: neu }), { ...SCHREIBEND, INCLUDE_HEADLESS: '1' });
  assert.ok(mutationen(h)[0].variables.input.some(i => i.publicationId === PUB.headless)); assert.ok(!mutationen(h)[0].variables.input.some(i => i.publicationId === PUB.google));
  const g = start(wurzel(t), szenario({ produkte: [produkt(1)] }), { ...SCHREIBEND, INCLUDE_GOOGLE: '1' });
  assert.equal(g.status, 2); assert.match(g.stdout, /INCLUDE_GOOGLE wird nicht unterstützt/); assert.deepEqual(g.aufrufe, []);
  assert.deepEqual(kanalWahl(PUBS).ziel.map(p => p.name), ['Online Store', 'Shop', 'TikTok', 'Facebook & Instagram', 'Pinterest']);
});

test('SCAN: ungültige Werte werden abgelehnt (Exit 2), sonst auf 3000 gedeckelt; Seitenlauf stoppt bei SCAN', t => {
  for (const scan of ['abc', '0', '-5', '1.5']) { const r = start(wurzel(t), szenario(), { SCAN: scan }); assert.equal(r.status, 2, scan); assert.deepEqual(r.aufrufe, []); }
  const seite = n => ({ json: { data: { products: { nodes: Array.from({ length: 50 }, (_, i) => produkt(n * 100 + i)), pageInfo: { hasNextPage: true, endCursor: 'c' + n } } } } });
  const sz = szenario({ produktRoute: { sequence: [seite(1), seite(2), seite(3)] } });
  const r = start(wurzel(t), sz, { SCAN: '120' }), b = bericht(r);
  assert.equal(b.scanned, 120); assert.equal(r.aufrufe.filter(a => a.query?.includes('products(first')).length, 3);
});

// ── Schalter-Matrix (Prüfer 19.10.: «Truthiness»-Rückfall überlebte alle Tests) ─────────────────────────────────────
test('Schalter: nur der exakte Wert «1» zählt — «0», «true», «ja», leer, « 1» und «2» schreiben nie (der Workflow gibt beim manuellen Start «0» mit)', t => {
  for (const [live, appr] of [['1', '0'], ['1', 'true'], ['0', '1'], ['true', '1']]) {
    const r = start(wurzel(t), szenario({ produkte: [produkt(1)] }), { LIVE: live, APPROVE_PUBLISH: appr }), b = bericht(r);
    assert.equal(r.status, 0, `${live}/${appr}: ${r.stderr}`); assert.equal(b.live, false, `${live}/${appr}`);
    assert.deepEqual(mutationen(r), [], `${live}/${appr}: Mutation trotz LIVE=«${live}» APPROVE_PUBLISH=«${appr}»`);
  }
  for (const v of ['0', 'true', 'TRUE', 'ja', 'yes', 'on', '', ' ', ' 1', '1 ', '2']) {
    assert.equal(konfig({ LIVE: '1', APPROVE_PUBLISH: v }).live, false, `APPROVE_PUBLISH=${JSON.stringify(v)}`);
    assert.equal(konfig({ LIVE: v, APPROVE_PUBLISH: '1' }).live, false, `LIVE=${JSON.stringify(v)}`);
  }
  assert.equal(konfig({ LIVE: '1', APPROVE_PUBLISH: '1' }).live, true);
  assert.equal(konfig({ LIVE: '1' }).live, false); assert.equal(konfig({ APPROVE_PUBLISH: '1' }).live, false); assert.equal(konfig({}).live, false);
});

// ── Transport: Redirect, Timeout, Retry, Annotationen ──────────────────────────────────────────────────────────────
/** Ersetzt die Antwort einer benannten Route des Szenarios. */
const mitRoute = (sz, name, respond) => { sz.routes.find(x => x.name === name).respond = respond; return sz; };

test('Transport: JEDE Anfrage trägt redirect:"error" und ein Timeout-Signal; ein Redirect auf OAuth oder GraphQL ist ein Fehler ohne zweite Anfrage', t => {
  const r = start(wurzel(t), szenario({ produkte: [produkt(1), produkt(2)] }), SCHREIBEND), anfragen = r.aufrufe.filter(a => a.method);
  assert.ok(anfragen.some(a => a.path.includes('oauth')) && mutationen(r).length === 2 && anfragen.length >= 5, 'Szenario läuft nicht wie erwartet');
  for (const a of anfragen) { assert.equal(a.redirect, 'error', `${a.path}: redirect`); assert.equal(a.hasSignal, true, `${a.path}: Timeout-Signal`); }
  // Node/undici gibt bei 307/308 Body UND eigene Header (X-Shopify-Access-Token) weiter — nur redirect:'error' verhindert das.
  const umleitung = { status: 307, headers: { location: 'https://evil.test/' } };
  const o = start(wurzel(t), szenario({ produkte: [produkt(1)], oauth: umleitung }), SCHREIBEND);
  assert.equal(o.status, 1); assert.match(bericht(o).hauptfehler, /fetch failed/); assert.equal(o.aufrufe.length, 1);
  const g = start(wurzel(t), mitRoute(szenario({ produkte: [produkt(1)] }), 'kanaele', umleitung), SCHREIBEND);
  assert.equal(g.status, 1); assert.match(bericht(g).hauptfehler, /fetch failed/); assert.deepEqual(mutationen(g), []);
});

test('Retry: HTTP 503/429 werden mit 2 s, 4 s … ausgesessen (ohne echte Wartezeit); ein Dauerfehler endet nach 4 Wiederholungen mit «HTTP 503»', t => {
  const ok = { json: { data: { products: { nodes: [produkt(1)], pageInfo: { hasNextPage: false, endCursor: null } } } } };
  const r = start(wurzel(t), szenario({ produktRoute: { sequence: [{ status: 503, text: 'Wartung' }, { status: 429, text: 'zu viele' }, ok] } }), SCHREIBEND);
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.equal(bericht(r).published, 1);
  assert.deepEqual(r.aufrufe.filter(a => a.timer).map(a => a.timer), [2000, 4000]);
  assert.equal(r.aufrufe.filter(a => a.query?.includes('products(first')).length, 3);
  const d = start(wurzel(t), szenario({ produktRoute: { status: 503, text: 'Wartung' } }), SCHREIBEND);
  assert.equal(d.status, 1); assert.match(bericht(d).hauptfehler, /^HTTP 503$/);
  assert.deepEqual(d.aufrufe.filter(a => a.timer).map(a => a.timer), [2000, 4000, 8000, 16000]);
  assert.equal(d.aufrufe.filter(a => a.query?.includes('products(first')).length, 5); assert.deepEqual(mutationen(d), []);
});

test('Annotationen: ein Fehlertext mit Zeilenumbruch und «%» kann keinen Workflow-Befehl einschleusen; --zeile bleibt EINE Zeile', t => {
  const boese = 'dns weg\n::set-output name=x::y 100%25\r::error::gefaelscht';
  const sz = () => szenario({ oauth: { networkError: boese }, produkte: [produkt(1)] });
  const r = start(wurzel(t), sz(), SCHREIBEND), a = annotationen(r);
  assert.equal(r.status, 1); assert.equal(a.length, 1, a.join(' | '));
  assert.match(a[0], /^::error title=publish_guard::dns weg/); assert.ok(!a[0].includes('%'));
  assert.ok(!r.stdout.split('\n').some(z => /^::(set-output|error::gefaelscht)/.test(z)));
  const z = start(wurzel(t), sz(), SCHREIBEND, ['--zeile']);
  assert.equal(z.status, 0); assert.equal(z.stdout.trim().split('\n').length, 1, z.stdout); assert.match(z.stdout, /^⚠️ PUBLISH-GUARD: unklar \(dns weg/);
});

// ── Seitenlauf und Antwortformen ───────────────────────────────────────────────────────────────────────────────────
test('Seitenlauf: unsinnige Cursor-/Seitenangaben, eine Kanalliste ohne Namen und eine Antwort ohne data sind Fehler (Exit 1, keine Mutation)', t => {
  const seite = (nodes, pageInfo) => ({ json: { data: { products: { nodes, pageInfo } } } });
  const produktAnfragen = r => r.aufrufe.filter(a => a.query?.includes('products(first')).length;
  const faelle = [
    ['hasNextPage ohne endCursor', szenario({ produktRoute: seite([produkt(1)], { hasNextPage: true, endCursor: null }) }), /ungültiger Seitencursor/, 1],
    ['leerer endCursor', szenario({ produktRoute: seite([produkt(1)], { hasNextPage: true, endCursor: '' }) }), /ungültiger Seitencursor/, 1],
    ['Cursor wiederholt sich (Endlosschleife)', szenario({ produktRoute: { sequence: [seite([produkt(1)], { hasNextPage: true, endCursor: 'c1' }), seite([produkt(2)], { hasNextPage: true, endCursor: 'c1' })] } }),
      /ungültiger Seitencursor/, 2],
    ['hasNextPage fehlt', szenario({ produktRoute: seite([produkt(1)], { endCursor: 'c1' }) }), /keine gültige Produktliste/, 1],
    ['pageInfo fehlt', szenario({ produktRoute: seite([produkt(1)], undefined) }), /keine gültige Produktliste/, 1],
    ['Kanalliste ohne Namen', szenario({ produkte: [produkt(1)], publications: [{ id: PUB.online }] }), /keine gültige Kanalliste/, 0],
    ['Kanalliste ohne ID', szenario({ produkte: [produkt(1)], publications: [{ name: 'Shop' }] }), /keine gültige Kanalliste/, 0],
    ['Antwort ohne data', mitRoute(szenario({ produkte: [produkt(1)] }), 'kanaele', { json: {} }), /GraphQL: Antwort ohne data/, 0],
  ];
  for (const [name, sz, muster, anfragen] of faelle) {
    const r = start(wurzel(t), sz, SCHREIBEND);
    assert.equal(r.status, 1, `${name}: Exit ${r.status}`); assert.match(bericht(r).hauptfehler, muster, name);
    assert.deepEqual(mutationen(r), [], name); assert.equal(produktAnfragen(r), anfragen, `${name}: Anzahl Produktanfragen`);
  }
});

test('Fehlerserie: ein userErrors-Ergebnis setzt die Serie zurück — 4 Netzfehler, 1 Ablehnung, 3 Netzfehler, 1 Erfolg stoppen NICHT', t => {
  const netz = { networkError: 'Verbindung weg' }, abgelehnt = { json: { data: { publishablePublish: { userErrors: [{ field: ['id'], message: 'abgelehnt' }] } } } };
  const n = [1, 2, 3, 4, 5, 6, 7, 8, 9], erg = { 1: netz, 2: netz, 3: netz, 4: netz, 5: abgelehnt, 6: netz, 7: netz, 8: netz };
  const r = start(wurzel(t), szenario({ produkte: n.map(i => produkt(i)), ergebnisse: erg }), SCHREIBEND), b = bericht(r);
  assert.equal(r.status, 1); assert.equal(b.abbruch, undefined, 'die Schleife darf hier nicht stoppen'); assert.equal(mutationen(r).length, 9);
  assert.deepEqual(b.zaehler, { published: 1, skipped_sperre: 0, userErrors: 1, unknown: 7, offen: 0 });
});

// ── Namensmuster, Kanalnamen, Ledger-IDs (Prüfer: Mutationen überlebten) ─────────────────────────────────────────────
test('Namensmuster: nicht-…-bewerben (beide Reihenfolgen), …-raus-JJJJ und compliance-pruefen sperren; ähnliche Namen nicht', t => {
  const r = start(wurzel(t), szenario({ produkte: [
    produkt(1, { tags: ['compliance-pruefen'] }),                 // GEMESSEN 19.10.: 4 aktive Träger im Shop
    produkt(2, { tags: ['nicht-tiktok-bewerben'] }),              // nicht-<kanal>-bewerben, nicht in der Python-Liste
    produkt(3, { tags: ['lizenzware-nicht-bewerben'] }),          // <grund>-nicht-bewerben: GEMESSEN 19.10. im Shop (0 aktiv) und bis dahin ungedeckt
    produkt(4, { tags: ['harness-pinterest-raus-2026-10-01'] }),
    produkt(11, { tags: ['bewerben'] }), produkt(12, { tags: ['nicht-bewerben-ok'] }), produkt(13, { tags: ['bewerben-nicht'] }),
    produkt(14, { tags: ['nichtbewerben'] }), produkt(15, { tags: ['compliance-pruefen-erledigt'] }) ] }), SCHREIBEND), b = bericht(r);
  assert.equal(r.status, 0, r.stdout);
  const st = h => b.produkte.find(p => p.handle === h);
  for (const [n, muster] of [[1, 'muster:compliance-pruefen'], [2, 'muster:nicht-tiktok-bewerben'], [3, 'muster:lizenzware-nicht-bewerben'], [4, 'muster:harness-pinterest-raus-2026-10-01']]) {
    assert.equal(st('produkt-' + n).state, 'skipped_sperre', `Produkt ${n}`); assert.deepEqual(st('produkt-' + n).gruende, [muster]);
  }
  for (const n of [11, 12, 13, 14, 15]) assert.equal(st('produkt-' + n).state, 'published', `Produkt ${n} darf nicht gesperrt sein`);
});

test('Kanalnamen mit Leerraum zählen; Ledger-IDs: 13- bis 16-stellig und gid-Form werden gelesen, 12 und 17 Stellen nicht', () => {
  const k = kanalWahl([{ id: 'a', name: ' Online Store ' }, { id: 'b', name: 'TikTok\n' }, { id: 'c', name: ' Google & YouTube ' }]);
  assert.deepEqual(k.ziel.map(p => p.id), ['a', 'b']); assert.deepEqual(k.ignoriert.map(p => p.id), ['c']);
  const ids = idsAusText('x\t7123456789012\ty\n' + '1234567890123456\tz\n' + 'gid://shopify/Product/9876543210123\n' + '123456789012\tzu kurz\n' + '12345678901234567\tzu lang\n' + 'v2026-10-19T17:00:00Z\n');
  assert.deepEqual([...ids].sort(), ['1234567890123456', '7123456789012', '9876543210123']);
});

// ── Fenster-Dateien: legitime Zustände bleiben «ok» (die Härtung darf keinen Daueralarm erzeugen) ─────────────────
test('legitime Zustände bleiben OK: abgelaufener Werbetest (auch mit Müllzeilen), leere/kommentierte Datei, abgelaufenes Pause-Fenster — und sperren dann nichts', t => {
  for (const [name, aendern] of Object.entries({
    'Werbetest abgelaufen': { 'dropship/_werbetest_sperre.txt': `# ende: 2000-01-01\nkaputt ohne id\n${15000000000060} werbetest-handle\n` },
    'Werbetest leer': { 'dropship/_werbetest_sperre.txt': '' },
    'Werbetest nur Kommentare': { 'dropship/_werbetest_sperre.txt': '# Werbetest vorbei\n' },
    'Pause-Fenster abgelaufen': { 'dropship/_social_pause.txt': `# halloween\t2000-01-01T00:00:00Z\t2000-02-01T00:00:00Z\tsocial-pause-halloween\npid:${15000000000050}\nh:pause-handle\n` },
    'Pause-Datei leer': { 'dropship/_social_pause.txt': '' },
  })) {
    const r = start(wurzel(t, aendern), szenario({ produkte: [produkt(50), produkt(60)] }), SCHREIBEND), b = bericht(r);
    assert.equal(r.status, 0, `${name}: ${r.stdout}`); assert.equal(b.sperrquellen.status, 'ok', name);
    const betrifft = name.startsWith('Pause') ? 50 : 60;
    assert.ok(mutationen(r).some(m => m.variables.id === gid(betrifft)), `${name}: Produkt ${betrifft} muss frei sein`);
  }
});

test('werbetestProbleme/pauseProbleme: reine Funktionen mit festem Datum', () => {
  const id = 15000000000060;
  assert.deepEqual(werbetestProbleme(`# ende: 2026-10-24\n${id} h # Kommentar\n15000000000061 h2 bis:2026-10-15\n`, '2026-10-19'), []);
  assert.deepEqual(werbetestProbleme('', '2026-10-19'), []); assert.deepEqual(werbetestProbleme('# nur Kommentar\n', '2026-10-19'), []);
  assert.deepEqual(werbetestProbleme(`# ende: 2026-10-24\nkaputt\n`, '2026-10-25'), [], 'nach dem Ende wird die Datei ignoriert');
  assert.match(werbetestProbleme(`${id} h\n`, '2026-10-19')[0], /Kopf «# ende: JJJJ-MM-TT» fehlt oder ist ungültig, aber 1 Produktzeile/);
  assert.match(werbetestProbleme(`# ende: 2026-10-24\n${id}\nsilberarmband-614500\n12345 zu-kurz\n`, '2026-10-19')[0], /^Zeile 3, 4: keine lesbare Produkt-ID/);
  assert.deepEqual(pauseProbleme('# halloween\t2026-10-15T00:00:00Z\t2026-11-01T00:00:00Z\tsocial-pause-halloween\npid:1\nh:x\n'), []);
  assert.deepEqual(pauseProbleme(''), []);
  const verkehrt = pauseProbleme('# halloween\t2026-11-01T00:00:00Z\t2026-10-15T00:00:00Z\tx\npid:1\n');   // Ende vor Anfang: Kopf unlesbar, darunter der Schlüssel ohne Kopf
  assert.equal(verkehrt.length, 2); assert.match(verkehrt[0], /^Zeile 1: Kopf/); assert.match(verkehrt[1], /^Zeile 2: Schlüssel ohne gültigen Kopf/);
  assert.match(pauseProbleme('pid:1\n')[0], /^Zeile 1: Schlüssel ohne gültigen Kopf/);
  assert.equal(pauseProbleme(Array.from({ length: 20 }, () => 'pid:1').join('\n')).length, 5, 'höchstens 5 Meldungen');
});

// ── Titelregeln (Feuerzeug / Heil-Schmuck / Schusswaffen-Zubehör) ────────────────────────────────────────────────────
test('Titelregeln: ein frisch importiertes, UNGETAGGTES Feuerzeug / Heil-Schmuck / Schusswaffen-Zubehör wird nicht nach TikTok/FB-IG/Pinterest gestellt', t => {
  // Vor der Härtung (v2 ohne Titelregeln) ging jedes dieser Produkte an alle vier Zielkanäle: nur der TÄGLICHE Durchsetzer taggt sie nachträglich.
  const w = wurzel(t), r = start(w, szenario({ produkte: [
    produkt(1, { title: 'Windsicheres Feuerzeug für Outdoor' }), produkt(2, { title: 'Terahertz Armband – Energie & Balance' }), produkt(3, { title: 'AK74 Zielfernrohrbrücke aus Metall', productType: 'Zubehör' }),
    produkt(4, { title: 'Metall-Lighter mit Gravur' }), produkt(5, { title: 'Auto-Zigarettenanzünder mit USB & Type-C' }), produkt(6, { title: 'Kupfer-Armband Damen' }), produkt(7),
    produkt(8, { title: 'Montagehalterung aus Metall', productType: 'Zweibein-Zubehör' }),            // Produkttyp wird an die Regel weitergegeben
    produkt(9, { title: 'Stativ faltbar', tags: ['outdoor', 'zielfernrohr-montage'] }) ] }), SCHREIBEND);   // Tags werden an die Regel weitergegeben
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const b = bericht(r), st = n => b.produkte.find(p => p.handle === 'produkt-' + n);
  assert.deepEqual(st(1).gruende, ['titel:feuerzeug']); assert.deepEqual(st(2).gruende, ['titel:heilschmuck']);
  assert.deepEqual(st(3).gruende, ['titel:schusswaffen-zubehoer(stark:zielfernrohr)']); assert.deepEqual(st(4).gruende, ['titel:feuerzeug']);
  assert.deepEqual(st(8).gruende, ['titel:schusswaffen-zubehoer(stark:zweibein)']); assert.deepEqual(st(9).gruende, ['titel:schusswaffen-zubehoer(stark:zielfernrohr)']);
  for (const n of [1, 2, 3, 4, 8, 9]) assert.equal(st(n).state, 'skipped_sperre', `Produkt ${n}`);
  assert.deepEqual(mutationen(r).map(m => m.variables.id).sort(), [gid(5), gid(6), gid(7)]);
  assert.equal(b.sperrquellen.titelKanarien, 6);
});

test('Titelregeln fallen mitten im Lauf aus (Python stürzt bei einem Titel ab): Hauptfehler, KEINE Mutation — auch nicht für die sauberen Produkte', t => {
  const w = wurzel(t, { 'automation/google_sperrliste.py': PY_SPERRLISTE.replace('    t = titel or ""\n', '    t = titel or ""\n    if "BOOM" in t: raise RuntimeError("boom")\n') });
  const r = start(w, szenario({ produkte: [produkt(1), produkt(2, { title: 'BOOM' }), produkt(3)] }), SCHREIBEND);
  assert.equal(r.status, 1, r.stdout); assert.match(bericht(r).hauptfehler, /Titelregeln unklar — es wird NICHT geschrieben: Python endete mit Status 1: .*boom/);
  assert.deepEqual(mutationen(r), []);
});

test('Titelregeln ohne python3: Exit 1 vor der ersten Netzanfrage, die Meldung nennt python3; titelRegelnPython meldet {ok:false} statt zu werfen', t => {
  const r = start(wurzel(t), szenario({ produkte: [produkt(1)] }), { ...SCHREIBEND, PATH: '/nonexistent' }), b = bericht(r);
  assert.equal(r.status, 1); assert.match(b.sperrquellen.probleme.join(' | '), /Titelregeln unklar — python3 nicht ausführbar \(ENOENT\)/); assert.deepEqual(r.aufrufe, []);
  const x = titelRegelnPython([], { python: 'dieses-programm-gibt-es-nicht' });
  assert.equal(x.ok, false); assert.match(x.grund, /nicht ausführbar/);
});

test('Python läuft isoliert (-I): ein json.py im Arbeitsverzeichnis oder PYTHONPATH wird NICHT geladen', t => {
  const w = wurzel(t, { 'json.py': 'raise RuntimeError("gepflanztes Modul geladen")\n' });   // Arbeitsverzeichnis des Laufs ist die Wurzel
  const r = start(w, szenario({ produkte: [produkt(1, { title: 'Windsicheres Feuerzeug für Outdoor' }), produkt(2)] }), { ...SCHREIBEND, PYTHONPATH: w.root });
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.deepEqual(mutationen(r).map(m => m.variables.id), [gid(2)]);
  assert.equal(bericht(r).produkte.find(p => p.handle === 'produkt-1').state, 'skipped_sperre');
});

test('titelRegelnPython: ein Interpreter mit unerwarteter Antwort (kein JSON, falsche Länge, falsche Form, Status ≠ 0, Zeitüberschreitung) liefert {ok:false} — nie «keine Treffer»', t => {
  const dir = wegwerfOrdner(t), ok = '{"feuerzeug":[2,0],"heilschmuck":[2,0],"schusswaffen":[2,0]}';
  const falsch = (name, ausgabe, extra = '') => { const f = path.join(dir, name); fs.writeFileSync(f, `#!/bin/sh\n${extra}cat >/dev/null\n${ausgabe}\n`, { mode: 0o755 }); return f; };
  const e = [{ title: 'a', type: '', tags: [] }, { title: 'b', type: '', tags: [] }];
  const faelle = [
    ['kein JSON', falsch('a', "echo 'Hallo'"), /Antwort ist kein JSON/],
    ['zu wenige Urteile', falsch('b', `echo '{"kanarien":${ok},"urteile":[[]]}'`), /nicht die erwartete Form/],
    ['Urteil ist kein String', falsch('c', `echo '{"kanarien":${ok},"urteile":[[],[5]]}'`), /nicht die erwartete Form/],
    ['Kanarien fehlen', falsch('d', `echo '{"urteile":[[],[]]}'`), /nicht die erwartete Form/],
    ['Kanarien fehlgeschlagen', falsch('e', `echo '{"kanarien":{"feuerzeug":[2,1],"heilschmuck":[2,0],"schusswaffen":[2,0]},"urteile":[[],[]]}'`), /Kanarien fehlgeschlagen oder leer: feuerzeug \[2,1\]/],
    ['Status 3', falsch('f', 'exit 3'), /Python endete mit Status 3/],
    ['Zeitüberschreitung', falsch('g', 'sleep 5'), /nicht ausführbar \(ETIMEDOUT\)/],
  ];
  for (const [name, python, muster] of faelle) {
    const r = titelRegelnPython(e, { python, timeout: name === 'Zeitüberschreitung' ? 300 : 20000 });
    assert.equal(r.ok, false, name); assert.match(r.grund, muster, name);
  }
  const gut = titelRegelnPython(e, { python: falsch('h', `echo '{"kanarien":${ok},"urteile":[["titel:feuerzeug"],[]]}'`) });
  assert.equal(gut.ok, true); assert.deepEqual(gut.urteile, [['titel:feuerzeug'], []]);
});

test('mehrere fehlende JS-Module werden ALLE benannt (eine Meldung statt Stack-Trace nacheinander)', t => {
  const w = wurzel(t, { 'automation/klingenregel.mjs': null, 'automation/lib/social_pause.mjs': null, 'automation/lib/werbetest_sperre.mjs': null });
  const r = start(w, szenario({ produkte: [produkt(1)] }), SCHREIBEND), p = bericht(r).sperrquellen.probleme.join(' | ');
  assert.equal(r.status, 1);
  for (const m of ['automation/klingenregel.mjs', 'automation/lib/social_pause.mjs', 'automation/lib/werbetest_sperre.mjs']) assert.ok(p.includes(m + ': Modul nicht ladbar'), `${m} fehlt in: ${p}`);
  assert.deepEqual(r.aufrufe, []);
});

test('ECHTE Titelregeln (google_sperrliste.py + Regel-JSON des Repos): gesperrt wie beim Durchsetzer, Zigarettenanzünder-Ladegeräte und Material allein bleiben frei', t => {
  const w = wurzel(t, {}, { echt: true }), r = start(w, szenario({ produkte: [
    produkt(1, { title: 'Windsicheres Feuerzeug für Outdoor' }), produkt(2, { title: 'Sturmfeuerzeug Kupfer mit Gravur' }), produkt(3, { title: 'Terahertz Armband – Energie & Balance' }),
    produkt(4, { title: 'Kupfer-Armband mit negativen Ionen' }), produkt(5, { title: 'AK74 Zielfernrohrbrücke aus Metall' }),
    produkt(6, { title: 'Auto-Zigarettenanzünder mit USB & Type-C' }), produkt(7, { title: 'USB-Autoladegerät für Zigarettenanzünder' }), produkt(8, { title: 'Leichter Daunenmantel für Damen' }),
    produkt(9, { title: 'Kupfer-Armband Damen' }) ] }), SCHREIBEND);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const b = bericht(r), st = n => b.produkte.find(p => p.handle === 'produkt-' + n);
  for (const [n, g] of [[1, 'titel:feuerzeug'], [2, 'titel:feuerzeug'], [3, 'titel:heilschmuck'], [4, 'titel:heilschmuck']]) assert.deepEqual(st(n).gruende, [g], `Produkt ${n}`);
  assert.match(st(5).gruende[0], /^titel:schusswaffen-zubehoer\(stark:ak74\)$/);
  assert.deepEqual(mutationen(r).map(m => m.variables.id).sort(), [gid(6), gid(7), gid(8), gid(9)]);
});

// ── Aufruf ─────────────────────────────────────────────────────────────────────────────────────────────
test('unbekannter Schalter: Exit 2 ohne Lauf; --zeile ist EINE Zeile und schreibt nie; --selbsttest läuft offline', t => {
  const w = wurzel(t), sz = szenario({ produkte: [produkt(1), produkt(2, { tags: ['18plus'] })] });
  const u = start(w, sz, SCHREIBEND, ['--schreiben']); assert.equal(u.status, 2); assert.deepEqual(u.aufrufe, []); assert.match(u.stderr, /Unbekannter Schalter: --schreiben/);
  const z = start(w, sz, SCHREIBEND, ['--zeile']);
  assert.equal(z.status, 0, z.stderr); assert.equal(z.stdout.trim().split('\n').length, 1); assert.deepEqual(mutationen(z), []);
  assert.match(z.stdout, /^PUBLISH-GUARD: 2 gescannt · Lücken 2 \(absichtlich gesperrt 1, zu publizieren 1\) · 5 Zielkanäle \(Inbox\/POS\/Google nie\)$/m);
  const s = spawnSync(process.execPath, [path.join(HIER, 'publish_guard.mjs'), '--selbsttest'], { cwd: wegwerfOrdner(t), encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(s.status, 0, s.stdout + s.stderr); assert.match(s.stdout, /Selbsttest publish_guard\.mjs: (\d+)\/\1\n/);
});

test('reine Funktionen: Parser, Sperr-Gründe, Zeilentext', () => {
  assert.deepEqual([...pythonMenge('X = {\n "a", \'B\', # "c"\n "d-e"\n}\n', 'X')], ['a', 'b', 'd-e']);
  assert.equal(pythonMenge('X = {"a", {"b"}}', 'X'), null);
  assert.ok(hostOk('au3j0y-hq.myshopify.com')); assert.ok(!hostOk('x.myshopify.com.evil.com'));
  const q = { tags: new Set(['18plus']), praefixe: ['social-pause'], ids: new Map([['15000000000001', 'ledger.txt']]), pause: new Set(), wtIds: new Set(), wtHandles: new Set() };
  assert.deepEqual(sperrGruende({ id: gid(2), handle: 'a', title: 'x', tags: ['18PLUS'] }, q), ['tag:18plus']);
  assert.deepEqual(sperrGruende({ id: gid(1), handle: 'a', title: 'x', tags: [] }, q), ['ledger:ledger.txt']);
  assert.deepEqual(sperrGruende({ id: gid(3), handle: 'a', title: 'x', tags: ['rueckhol-0907', 'kat-damen-pullover'] }, q), []);
  assert.match(zeilenText({ bericht: { hauptfehler: 'x'.repeat(500) }, exit: 1 }), /^⚠️ PUBLISH-GUARD: unklar \(x{160}\)$/);
});

// ── Aufrufer (Workflow): das Verhalten dort muss BEWUSST sein — Codex hat genau das vergessen ──────────
test('shop-guards.yml: beide Schalter bewusst gesetzt, nachfolgende Wächter laufen trotz Exit 1 des Publish-Guards', () => {
  const y = fs.readFileSync(path.join(REPO, '.github/workflows/shop-guards.yml'), 'utf8');
  assert.match(y, /^\s+LIVE: \$\{\{ github\.event_name == 'schedule' && '1' \|\| github\.event\.inputs\.live \}\}/m);
  const schritt = y.split(/\n      - name: /).find(s => s.startsWith('Publish guard'));
  assert.ok(schritt, 'Publish-Guard-Schritt fehlt');
  assert.match(schritt, /APPROVE_PUBLISH: \$\{\{ github\.event_name == 'schedule' && '1' \|\| github\.event\.inputs\.approve_publish \}\}/);
  assert.match(schritt, /run: node automation\/publish_guard\.mjs\s*$/);
  assert.match(y, /approve_publish:\n\s+description:.*\n\s+required: false\n\s+default: '0'/);                       // manueller Start schreibt nur mit zweitem Schalter
  for (const n of ['Alt-text guard', 'Discount guard', 'Hero image guard', 'Rating guard'])
    assert.match(y.split(/\n      - name: /).find(s => s.startsWith(n)), /if: \$\{\{ !cancelled\(\) && steps\.preis\.conclusion != 'skipped' \}\}/, `${n} läuft nicht unabhängig`);
  assert.match(y, /- name: Price guard[^\n]*\n\s+id: preis/);
});
