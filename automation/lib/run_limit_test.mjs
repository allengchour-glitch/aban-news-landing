// run_limit_test.mjs — prüft lib/run_limit.mjs und das Tor «MAX_PER_RUN» in den fünf Postern (19.10.2026). Offline, ohne Schlüssel.
//   node --test automation/lib/run_limit_test.mjs        (aus dem Repo-Wurzelordner; ~15 s, der Hauptteil sind die 5 × 23 Poster-Prozesse)
//
// A  parseRunLimit als Funktion: Tabelle gültig/ungültig (Grenzfälle, auch Unicode-Leerraum), Meldung (Name, Wert auf 20 Zeichen,
//    kein Zeilenumbruch, Unsichtbares als \uXXXX), Programmierfehler (TypeError), BITGLEICH zur alten Auswertung für jeden Wert
//    1…2000 und die Standards.
// B  runLimitOderEnde: Pause, Fehler, Zahl, Obergrenze — mit eingespeister Ausgabe/Beendigung.
// C  Quelltext: in jedem Poster ist das Tor die ERSTE Anweisung nach den Importen; die alte Auswertung ist weg.
// D  Prozess je Poster (/usr/bin/env -i, PATH, NUR gefälschte Schlüssel «dummy»): Pause → Exit 0 + genau die PAUSE-Zeile + KEINE Wirkung;
//    ungültig → Exit 1 + FEHLER-Zeile + keine Wirkung; MAX_PER_RUN=1 ohne Schlüssel → die bisherige Meldung (Golden aus dem Lauf VOR der
//    Änderung, 19.10.). «Keine Wirkung» heisst hier zweierlei: (1) die Spur (run_limit_spur.mjs) zeigt KEINEN Zugriff auf Dateien, Prozesse
//    oder Netz — nicht einmal Lesen; (2) Prüfsummen von social/*.csv, automation/reels_seed.csv, dropship/_posted_*.txt und den Sperren in
//    /tmp sind vorher/nachher gleich. Die Spur lehnt jedes Schreiben, jeden Prozessstart und jedes Netz AB — selbst ein kaputtes Tor
//    könnte in diesem Test nie echt posten. POSITIV-KANARIENVÖGEL: dieselben Läufe mit MAX_PER_RUN=1 MÜSSEN die Queue anfassen, und die
//    Spur muss einen Lock-Versuch, ein Schreiben, ein fetch und einen Prozessstart ERKENNEN — sonst wäre jede «0 Zugriffe» wertlos.
// E  Aufrufer: kein Skript exportiert MAX_PER_RUN (Falle: upload_edited_product_images.py liest dieselbe Variable mit 0 = ALLE).
//    Die Suche (exportFunde) ist selbst geprüft: «E Kanarienvogel» legt einen Prüfbaum mit 25 Verstössen (Shell, Python, JS, Workflow;
//    ein- und mehrzeilig) und 14 harmlosen Formen an — jeder Verstoss MUSS gefunden, keine harmlose Form darf gemeldet werden.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseRunLimit, runLimitOderEnde, RunLimitError } from './run_limit.mjs';
import { stoppAktiv } from '../post_guard.mjs';
import { baumSchreiben } from './run_limit_baum.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HIER, '..', '..');
const SPUR = path.join(HIER, 'run_limit_spur.mjs');
const PAUSE_ZEILE = 'PAUSE: MAX_PER_RUN=0 — nichts gepostet';

// ───────────────────────── A  parseRunLimit ─────────────────────────
test('A1 gültige Werte', () => {
  const tabelle = [
    [undefined, { standard: 1 }, { n: 1, pause: false }],
    [null, { standard: 1 }, { n: 1, pause: false }],
    ['', { standard: 50 }, { n: 50, pause: false }],
    ['', { standard: 0 }, { n: 0, pause: true }],              // Standard 0 = Pause als Voreinstellung
    ['0', { standard: 1 }, { n: 0, pause: true }],
    ['00', { standard: 1 }, { n: 0, pause: true }],
    [' 0 ', { standard: 50 }, { n: 0, pause: true }],
    ['1', { standard: 1 }, { n: 1, pause: false }],
    ['7', { standard: 1 }, { n: 7, pause: false }],
    [' 12 ', { standard: 1 }, { n: 12, pause: false }],
    ['\t3\n', { standard: 1 }, { n: 3, pause: false }],       // Leerzeichen, Tab, Zeilenumbruch rundherum
    ['007', { standard: 1 }, { n: 7, pause: false }],
    ['0000000000000000000000000012', { standard: 1 }, { n: 12, pause: false }],
    ['9007199254740991', { standard: 1 }, { n: Number.MAX_SAFE_INTEGER, pause: false }],
    ['100', { standard: 1, max: 5 }, { n: 5, pause: false }],  // Obergrenze kappt
    ['5', { standard: 1, max: 5 }, { n: 5, pause: false }],
    ['4', { standard: 1, max: 5 }, { n: 4, pause: false }],
    ['0', { standard: 1, max: 5 }, { n: 0, pause: true }],     // Pause schlägt die Obergrenze nicht, sie bleibt Pause
    [3, { standard: 1 }, { n: 3, pause: false }],              // Zahl statt Text (Aufruf aus Code)
    [0, { standard: 1 }, { n: 0, pause: true }],
    // Unicode-Leerraum (alles, was trim() entfernt) ist erlaubt, wie beim alten parseInt — bewusst, siehe Kopf von run_limit.mjs
    ['\u00a00\u00a0', { standard: 50 }, { n: 0, pause: true }],   // NBSP+0+NBSP = Pause (die sichere Richtung)
    ['\u00a07\u00a0', { standard: 1 }, { n: 7, pause: false }],
    ['\ufeff3', { standard: 1 }, { n: 3, pause: false }],          // BOM davor
    ['\u30002\u3000', { standard: 1 }, { n: 2, pause: false }],   // ideografisches Leerzeichen
    ['\u20284\u2029', { standard: 1 }, { n: 4, pause: false }],   // Zeilen-/Absatztrenner rundherum
  ];
  for (const [roh, opt, soll] of tabelle) assert.deepEqual(parseRunLimit(roh, opt), soll, `Eingabe ${JSON.stringify(roh)} ${JSON.stringify(opt)}`);
});

test('A2 ungültige Werte werfen RunLimitError (nie still umgedeutet)', () => {
  const schlecht = ['-1', '-0', '-3', '+5', '2.5', '0.0', '.5', '5.', '1e3', '1E3', '0x10', '0b1', 'abc', '5x', 'x5', 'NaN', 'Infinity',
    '-Infinity', ' ', '  \t', '5 5', '1,5', '1_000', '- 3', 'null', 'undefined', 'true', '١٢', '１２',   // Arabisch-indisch / Vollbreite
    '\u00a0', '\u2028', '\u3000', '\ufeff',   // nur Unicode-Leerraum = «nur Leerzeichen»
    '\u200b5', '5\u200b', '\u202e5', '5\u202e', '\u{e0001}5', '5\u0085x', '\u007f5',   // unsichtbare Nicht-Leerraum-Zeichen sind Müll
    '9007199254740992', '9007199254740993', '99999999999999999999', '1'.repeat(400),
    NaN, Infinity, -Infinity, 2.5, -3, 1e21, {}, [], true];
  for (const roh of schlecht) {
    assert.throws(() => parseRunLimit(roh, { standard: 1 }), e => e instanceof RunLimitError && /MAX_PER_RUN/.test(e.message), `Eingabe ${String(roh).slice(0, 30)} müsste werfen`);
  }
});

test('A3 Meldung: Name der Variable, Wert auf 20 Zeichen gekürzt, ohne Zeilenumbruch, ohne halbe Zeichen', () => {
  const m = f => { try { f(); } catch (e) { return e.message; } return ''; };
  const lang = m(() => parseRunLimit('x'.repeat(50), { standard: 1 }));
  assert.ok(lang.includes('MAX_PER_RUN="' + 'x'.repeat(20) + '"…'), lang);
  assert.ok(!lang.includes('x'.repeat(21)), 'mehr als 20 Zeichen des Werts in der Meldung');
  const genau20 = m(() => parseRunLimit('y'.repeat(20) + '!', { standard: 1 }));   // 21 Zeichen → gekürzt
  assert.ok(genau20.includes('"' + 'y'.repeat(20) + '"…') && !genau20.includes('!'), genau20);
  const kurz = m(() => parseRunLimit('abc', { standard: 1 }));
  assert.ok(kurz.includes('MAX_PER_RUN="abc"') && !kurz.includes('…'), kurz);
  const umbruch = m(() => parseRunLimit('abc\ndef', { standard: 1 }));
  assert.ok(!/[\r\n]/.test(umbruch) && umbruch.includes('abc\\ndef'), umbruch);
  const emoji = m(() => parseRunLimit('😀'.repeat(25), { standard: 1 }));
  assert.ok(emoji.includes('😀'.repeat(20) + '"…') && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(emoji), 'halbes Zeichen');
  const eigenerName = m(() => parseRunLimit('abc', { standard: 1, name: 'TIKTOK_MAX' }));
  assert.ok(eigenerName.startsWith('TIKTOK_MAX="abc"'), eigenerName);
  const gross = m(() => parseRunLimit('99999999999999999999', { standard: 1 }));
  assert.ok(/zu gross/.test(gross) && gross.includes('"99999999999999999999"'), gross);
});

const UNSICHTBAR = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;   // dieselbe Klasse wie im Code, hier unabhängig davon notiert
test('A3b Meldung: Unsichtbares steht als \\uXXXX — eine Zeile, keine Steuer-, Format- oder Umlenkzeichen (Befund 19.10.: U+2028 kam roh durch)', () => {
  const m = f => { try { f(); } catch (e) { return e.message; } return ''; };
  const faelle = [   // [Eingabe, erwartete Schreibweise in der Meldung]
    ['\u2028', '\\u2028'], ['\u2029x', '\\u2029x'], ['a\u0085b', 'a\\u0085b'],            // Zeilentrenner, NEL
    ['a\u007fb', 'a\\u007fb'], ['\u009b[31m', '\\u009b[31m'],                             // DEL, C1-CSI
    ['\u202e5', '\\u202e5'], ['5\u2066', '5\\u2066'], ['\u200b', '\\u200b'], ['\ufeffx', '\\ufeffx'],   // Umlenkung, ZWSP, BOM
    ['\u00a0', '\\u00a0'], ['\u3000x', '\\u3000x'],                                        // Sonderleerzeichen werden sichtbar
    ['\u{e0001}x', '\\u{e0001}x'],                                                          // ausserhalb der BMP (Tag-Zeichen)
    ['\u001b[2J', '\\u001b[2J'], ['a\nb', 'a\\nb'], ['\x00', '\\u0000'],                   // wie bisher (JSON.stringify)
  ];
  for (const [roh, soll] of faelle) {
    const meldung = m(() => parseRunLimit(roh, { standard: 1 }));
    assert.ok(meldung.includes(`MAX_PER_RUN="${soll}"`), `Eingabe ${JSON.stringify(roh)}: erwartet ${soll} in: ${meldung}`);
    assert.ok(!UNSICHTBAR.test(meldung) && !/[\u00a0\u3000]/.test(meldung) && !/[\r\n]/.test(meldung), `Meldung zu ${JSON.stringify(roh)} trägt rohe Steuer-/Formatzeichen`);
  }
  // Positiv-Kanarienvogel: die Prüfklasse trifft die rohen Zeichen wirklich (sonst bewiese «sauber» oben nichts)
  for (const c of ['\u2028', '\u2029', '\u0085', '\u007f', '\u202e', '\u200b', '\ufeff', '\u{e0001}', '\x00', '\n']) assert.ok(UNSICHTBAR.test(c), `Prüfklasse erkennt ${JSON.stringify(c)} nicht`);
  // Gewöhnliches bleibt lesbar: Umlaut, Emoji, Gedankenstrich, normales Leerzeichen
  assert.ok(m(() => parseRunLimit('ü 😀', { standard: 1 })).includes('MAX_PER_RUN="ü 😀"'));
});

test('A4 Programmierfehler sind TypeError (nicht RunLimitError)', () => {
  for (const opt of [{}, { standard: -1 }, { standard: 1.5 }, { standard: NaN }, { standard: '1' }, { standard: 1, max: 0 },
    { standard: 1, max: -2 }, { standard: 1, max: 2.5 }, { standard: 9, max: 5 }]) {
    assert.throws(() => parseRunLimit('3', opt), e => e instanceof TypeError && !(e instanceof RunLimitError), JSON.stringify(opt));
  }
  assert.throws(() => parseRunLimit('3'), TypeError);   // ganz ohne Angaben
});

test('A5 BITGLEICH zur alten Auswertung für «1»…«2000», Leerzeichen, führende Nullen und die Standards 1 und 50', () => {
  const alt = (roh, N) => Math.max(1, parseInt(roh || String(N), 10) || N);   // der Ausdruck aus allen fünf Postern vor dem 19.10.
  for (const N of [1, 50]) {
    for (let i = 1; i <= 2000; i++) assert.equal(parseRunLimit(String(i), { standard: N }).n, alt(String(i), N), `Wert ${i}, Standard ${N}`);
    for (const roh of [undefined, '', ' 3 ', '03', '007', '\t9']) assert.equal(parseRunLimit(roh, { standard: N }).n, alt(roh, N), `Wert ${JSON.stringify(roh)}, Standard ${N}`);
    // Unicode-Leerraum um eine positive Zahl: der alte Ausdruck las sie ebenfalls (parseInt überspringt ihn) — also nichts Neues, nichts verloren
    for (const roh of ['\u00a03', '3\u00a0', '\u00a012\u00a0', '\ufeff9', '\u30005', '\u20287']) assert.equal(parseRunLimit(roh, { standard: N }).n, alt(roh, N), `Wert ${JSON.stringify(roh)}, Standard ${N}`);
  }
});

// ───────────────────────── B  Tor ─────────────────────────
function tor(env, opt = {}) {
  const log = [], err = [], code = [];
  const r = runLimitOderEnde({ standard: 1, env, log: s => log.push(s), err: s => err.push(s), beenden: c => { code.push(c); }, ...opt });
  return { r, log, err, code };
}

test('B1 Tor: Pause, Fehler, Zahl, Standard, Obergrenze, eigener Name', () => {
  assert.deepEqual(tor({ MAX_PER_RUN: '0' }), { r: undefined, log: [PAUSE_ZEILE], err: [], code: [0] });
  const f = tor({ MAX_PER_RUN: 'abc' });
  assert.equal(f.code.length, 1); assert.equal(f.code[0], 1); assert.deepEqual(f.log, []);
  assert.equal(f.err.length, 1); assert.ok(f.err[0].startsWith('FEHLER: MAX_PER_RUN="abc"') && f.err[0].endsWith('— nichts gepostet'), f.err[0]);
  assert.deepEqual(tor({ MAX_PER_RUN: '3' }), { r: 3, log: [], err: [], code: [] });
  assert.deepEqual(tor({}), { r: 1, log: [], err: [], code: [] });
  assert.deepEqual(tor({}, { standard: 50 }), { r: 50, log: [], err: [], code: [] });
  assert.deepEqual(tor({ MAX_PER_RUN: '9' }, { max: 5 }), { r: 5, log: ['HINWEIS: MAX_PER_RUN=9 auf 5 gekappt (Obergrenze dieses Posters)'], err: [], code: [] });
  assert.deepEqual(tor({ MAX_PER_RUN: '4' }, { max: 5 }), { r: 4, log: [], err: [], code: [] });
  assert.deepEqual(tor({ FOO: '0' }, { name: 'FOO' }), { r: undefined, log: ['PAUSE: FOO=0 — nichts gepostet'], err: [], code: [0] });
  assert.throws(() => tor({}, { standard: undefined }), TypeError);   // Programmierfehler wird nicht als «ungültiger Wert» verschluckt
});

// ───────────────────────── C  Quelltext ─────────────────────────
const POSTER = [
  { name: 'metricool-schedule', standard: 50, csv: 'social/metricool_queue.csv', schluessel: { METRICOOL_USER_TOKEN: 'dummy' },
    leer: 'Kein METRICOOL_USER_TOKEN → No-op.' },
  { name: 'social-autopost-meta', standard: 1, csv: 'social/posts_image.csv', mcDatei: true,
    schluessel: { IG_USER_ID: '1', IG_ACCESS_TOKEN: 'dummy', FB_PAGE_ID: '1', FB_PAGE_ACCESS_TOKEN: 'dummy', META_ACCESS_TOKEN: 'dummy' },
    leer: 'Kein Meta-Kanal konfiguriert (IG/FB/Threads Secrets fehlen) → No-op. Setze THREADS_ACCESS_TOKEN etc.' },
  { name: 'story-autopost-meta', standard: 1, csv: 'social/story_queue.csv', mcDatei: true,
    schluessel: { IG_USER_ID: '1', IG_ACCESS_TOKEN: 'dummy', FB_PAGE_ID: '1', FB_PAGE_ACCESS_TOKEN: 'dummy', META_ACCESS_TOKEN: 'dummy' },
    leer: 'Kein Meta-Kanal für Stories konfiguriert → No-op.' },
  { name: 'tiktok-autopost', standard: 1, csv: 'automation/reels_seed.csv', schluessel: { TT_ACCESS_TOKEN: 'dummy' },
    leer: 'Kein TT_ACCESS_TOKEN → No-op. Setze TT_ACCESS_TOKEN als Secret.' },
  { name: 'video-autopost-meta', standard: 1, csv: 'social/video_queue.csv',
    schluessel: { IG_USER_ID: '1', IG_ACCESS_TOKEN: 'dummy', FB_PAGE_ID: '1', FB_PAGE_ACCESS_TOKEN: 'dummy', META_ACCESS_TOKEN: 'dummy' },
    leer: 'Kein Meta-Kanal konfiguriert → No-op.' },
];
for (const p of POSTER) p.datei = `automation/${p.name}.mjs`;

// Erste Anweisung nach Kommentaren und Importen (auch mehrzeilige Importe)
function ersteAnweisung(quelltext) {
  const zeilen = quelltext.split('\n');
  let block = false, importOffen = false;
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i].trim();
    if (block) { if (z.includes('*/')) block = false; continue; }
    if (importOffen) { if (/from\s+['"][^'"]+['"]/.test(z)) importOffen = false; continue; }
    if (!z || z.startsWith('//') || z.startsWith('#!')) continue;
    if (z.startsWith('/*')) { if (!z.includes('*/')) block = true; continue; }
    if (/^import\s/.test(z)) { if (!/from\s+['"][^'"]+['"]/.test(z) && !/^import\s+['"]/.test(z)) importOffen = true; continue; }
    return { zeile: i + 1, text: z };
  }
  return null;
}

test('C Quelltext: das Tor ist in jedem Poster die erste Anweisung, die alte Auswertung ist weg', async t => {
  for (const p of POSTER) {
    await t.test(p.name, () => {
      const q = fs.readFileSync(path.join(REPO, p.datei), 'utf8');
      const erste = ersteAnweisung(q);
      assert.ok(erste, 'keine Anweisung gefunden');
      const m = /^const MAX\s*=\s*runLimitOderEnde\(\{ standard: (\d+) \}\);/.exec(erste.text);
      assert.ok(m, `erste Anweisung (Zeile ${erste.zeile}) ist nicht das Tor: ${erste.text.slice(0, 80)}`);
      assert.equal(Number(m[1]), p.standard, 'Standard geändert (bisher 50 bei metricool-schedule, sonst 1)');
      assert.equal(q.split('runLimitOderEnde(').length - 1, 1, 'Tor muss genau einmal aufgerufen werden');
      assert.ok(/import\s*\{\s*runLimitOderEnde\s*\}\s*from\s*'\.\/lib\/run_limit\.mjs'/.test(q), 'Import fehlt');
      assert.ok(!/process\.env\.MAX_PER_RUN/.test(q), 'MAX_PER_RUN wird noch direkt gelesen (am Tor vorbei)');
      assert.ok(!/parseInt\([^)]*MAX_PER_RUN/.test(q), 'alte parseInt-Auswertung ist noch da');
    });
  }
});

// ───────────────────────── D  Prozess je Poster ─────────────────────────
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'run-limit-test-'));
after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} });
let zaehler = 0;

// Poster/Skript starten: /usr/bin/env -i (nur PATH + die genannten Variablen), cwd = Repo, Spur davor, Zeitgrenze.
function laufe(datei, umgebung, { timeoutMs = 30000, quelle = ['--import', SPUR, datei] } = {}) {
  const spurDatei = path.join(TMP, `spur-${++zaehler}.txt`);
  const args = ['-i', `PATH=${path.dirname(process.execPath)}:/usr/bin:/bin`, `RUN_LIMIT_SPUR=${spurDatei}`,
    ...Object.entries(umgebung).map(([k, v]) => `${k}=${v}`), process.execPath, ...quelle];
  const r = spawnSync('/usr/bin/env', args, { cwd: REPO, encoding: 'utf8', timeout: timeoutMs });
  let spur = [];
  try { spur = fs.readFileSync(spurDatei, 'utf8').split('\n').filter(Boolean).map(z => { const i = z.indexOf('\t'); return [z.slice(0, i), z.slice(i + 1)]; }); } catch {}
  return { status: r.status, signal: r.signal, stdout: r.stdout || '', stderr: r.stderr || '', spur };
}
const wirkungen = spur => spur.filter(([art]) => art !== 'exit');

function dateienZumPruefen() {
  const social = fs.readdirSync(path.join(REPO, 'social')).filter(f => f.endsWith('.csv')).map(f => `social/${f}`);
  return [...social, 'automation/reels_seed.csv', 'dropship/_posted_media.txt', 'dropship/_posted_produkte.txt', 'dropship/_posted_familien.txt',
    'dropship/_social_pause.txt', 'dropship/_social_vorrang.txt', 'dropship/_SOCIAL_STOPP'];
}
function schnappschuss() {
  const s = {};
  for (const d of dateienZumPruefen()) {
    try { s[d] = crypto.createHash('sha256').update(fs.readFileSync(path.join(REPO, d))).digest('hex'); } catch { s[d] = 'fehlt'; }
  }
  const stat = f => { try { const st = fs.statSync(f); return `${st.ino}:${st.size}:${st.mtimeMs}`; } catch { return 'fehlt'; } };
  s['/tmp/ig_post.lock'] = stat('/tmp/ig_post.lock');
  for (const f of fs.readdirSync('/tmp').filter(f => f.startsWith('queuecsv_')).sort()) s[`/tmp/${f}`] = stat(`/tmp/${f}`);
  return s;
}
// Der Autopilot dieses Containers schreibt Queues und Ledger zwischendurch selbst: ein Unterschied zählt erst, wenn er in drei
// Läufen hintereinander auftritt (ein Poster-Fehler wäre jedes Mal da, ein fremder Schreiber nur zufällig).
function gesichert(datei, umgebung, opt) {
  let r;
  for (let versuch = 0; versuch < 3; versuch++) {
    const vor = schnappschuss();
    r = laufe(datei, umgebung, opt);
    const nach = schnappschuss();
    r.geaendert = Object.keys({ ...vor, ...nach }).filter(k => vor[k] !== nach[k]);
    if (!r.geaendert.length) break;
  }
  return r;
}

const KEINE_WIRKUNG = (r, was) => {
  assert.deepEqual(wirkungen(r.spur), [], `${was}: Zugriff trotz Pause/Fehler: ${JSON.stringify(wirkungen(r.spur).slice(0, 5))}`);
  assert.deepEqual(r.geaendert, [], `${was}: Prüfsummen/Sperren verändert: ${r.geaendert.join(', ')}`);
};

test('D0 Spur-Selbsttest: Lock, Schreiben, Netz und Prozessstart werden erkannt UND abgelehnt (Positiv-Kanarienvogel für alle «0 Zugriffe»)', async t => {
  const PRUEFLING = path.join(HIER, 'run_limit_spur_probe.mjs');
  await t.test('Lock-Versuch wird gesehen und verweigert', t2 => {
    if (stoppAktiv()) return t2.skip('dropship/_SOCIAL_STOPP steht — post_guard.lock() beendet vor dem Lock-Versuch');
    const r = laufe('x', {}, { quelle: ['--import', SPUR, PRUEFLING, 'lock'] });
    assert.ok(r.spur.some(([a, z]) => a === 'GESPERRT-openSync(wx)' && z === '/tmp/ig_post.lock'), JSON.stringify(r.spur));
  });
  await t.test('Schreiben, Umbenennen, fetch und Prozessstart — auch über benannte Importe (so importieren die Poster)', () => {
    const ziel = path.join(TMP, 'darf_nicht_entstehen.txt');
    const ziel2 = path.join(TMP, 'darf_auch_nicht_entstehen.txt');
    const r = laufe('x', { PROBE_ZIEL: ziel, PROBE_ZIEL2: ziel2 }, { quelle: ['--import', SPUR, PRUEFLING, 'effekte'] });
    for (const z of [ziel, ziel2, ziel2 + '.neu']) assert.equal(fs.existsSync(z), false, `Datei ${z} entstand trotz Spur`);
    const zaehle = art => r.spur.filter(([a]) => a === art).length;
    assert.equal(zaehle('GESPERRT-writeFileSync'), 2); assert.equal(zaehle('GESPERRT-appendFileSync'), 1);
    assert.equal(zaehle('GESPERRT-renameSync'), 1); assert.equal(zaehle('GESPERRT-execFileSync'), 2); assert.equal(zaehle('GESPERRT-spawnSync'), 1);
    assert.ok(r.spur.some(([a, z]) => a === 'fetch' && z === 'https://example.invalid/probe'), JSON.stringify(r.spur));
  });
  await t.test('Prüfling ohne Spur startet nicht (kein Versehen im Echtbetrieb)', () => {
    const r = spawnSync(process.execPath, [PRUEFLING, 'effekte'], { cwd: REPO, encoding: 'utf8', env: { PATH: '/usr/bin:/bin' } });
    assert.equal(r.status, 2); assert.match(r.stderr, /ohne Spur/);
  });
});

const GEFAELSCHT = { META_ACCESS_TOKEN: 'dummy', METRICOOL_USER_TOKEN: 'dummy', TT_ACCESS_TOKEN: 'dummy', IG_USER_ID: '1', IG_ACCESS_TOKEN: 'dummy', FB_PAGE_ID: '1', FB_PAGE_ACCESS_TOKEN: 'dummy' };
const mcTokenDa = (() => { try { return /METRICOOL_USER_TOKEN=([^\s'"]+)/.test(fs.readFileSync('/tmp/metricool.env', 'utf8')); } catch { return false; } })();

for (const p of POSTER) {
  test(`D ${p.name}: MAX_PER_RUN=0 → Pause, ungültig → Fehler, 1 → wie bisher`, async t => {
    await t.test('Pause ohne Schlüssel: Exit 0, genau die PAUSE-Zeile, keine Wirkung', () => {
      const r = gesichert(p.datei, { MAX_PER_RUN: '0' });
      assert.equal(r.status, 0, r.stderr); assert.equal(r.stdout.trim(), PAUSE_ZEILE); assert.equal(r.stderr, '');
      assert.deepEqual(r.spur.filter(([a]) => a === 'exit'), [['exit', '0']]);
      KEINE_WIRKUNG(r, 'Pause ohne Schlüssel');
    });
    await t.test('Pause MIT (gefälschten) Schlüsseln, auch mit DRY: dieselbe Zeile, keine Wirkung', () => {
      for (const extra of [{}, { DRY_RUN: '1' }, { DRY: '1' }]) {
        const r = gesichert(p.datei, { MAX_PER_RUN: '0', ...GEFAELSCHT, ...extra });
        assert.equal(r.status, 0, r.stderr); assert.equal(r.stdout.trim(), PAUSE_ZEILE); assert.equal(r.stderr, '');
        KEINE_WIRKUNG(r, `Pause mit Schlüsseln ${JSON.stringify(extra)}`);
      }
    });
    await t.test('Pause auch bei « 0 » und «00»', () => {
      for (const roh of [' 0 ', '00', '0000']) {
        const r = gesichert(p.datei, { MAX_PER_RUN: roh, ...GEFAELSCHT });
        assert.equal(r.status, 0); assert.equal(r.stdout.trim(), PAUSE_ZEILE); KEINE_WIRKUNG(r, `Pause ${JSON.stringify(roh)}`);
      }
    });
    await t.test('ungültige Werte: Exit 1, FEHLER-Zeile auf stderr, nichts auf stdout, keine Wirkung', () => {
      for (const roh of ['abc', '-3', '2.5', '1e3', '0x10', '5x', ' ', '99999999999999999999', 'ü']) {
        const r = gesichert(p.datei, { MAX_PER_RUN: roh, ...(roh === 'abc' ? GEFAELSCHT : {}) });
        assert.equal(r.status, 1, `Wert ${JSON.stringify(roh)}: Exit ${r.status}, stdout ${r.stdout}, stderr ${r.stderr}`);
        assert.equal(r.stdout, '');
        assert.ok(r.stderr.startsWith(`FEHLER: MAX_PER_RUN=${JSON.stringify(roh)}`) && r.stderr.trim().endsWith('— nichts gepostet'), r.stderr);
        assert.deepEqual(r.spur.filter(([a]) => a === 'exit'), [['exit', '1']]);
        KEINE_WIRKUNG(r, `Wert ${JSON.stringify(roh)}`);
      }
    });
    await t.test('ungültiger Wert mit Zeilentrenner/Umlenkzeichen: die FEHLER-Zeile bleibt EINE Zeile, die Zeichen stehen als \\uXXXX (Befund 19.10.)', () => {
      const r = gesichert(p.datei, { MAX_PER_RUN: '\u2028x\u202e\u0085' });
      assert.equal(r.status, 1, `Exit ${r.status}, stderr ${r.stderr}`); assert.equal(r.stdout, '');
      assert.equal(r.stderr, 'FEHLER: MAX_PER_RUN="\\u2028x\\u202e\\u0085" ist keine gültige Anzahl — erlaubt: ganze Zahl ab 0 in Ziffern (0 = Pause), sonst nichts — nichts gepostet\n');
      assert.ok(!/[\u2028\u2029\u0085\u202e]/.test(r.stderr), 'rohes Zeichen in stderr');
      assert.equal(r.stderr.trimEnd().split(/\r\n|[\n\r\u2028\u2029\u0085]/).length, 1, 'FEHLER-Zeile über mehrere Zeilen verteilt');
      KEINE_WIRKUNG(r, 'unsichtbare Zeichen');
    });
    await t.test('ohne Schlüssel und MAX_PER_RUN=1 (oder unbelegt, leer, 5, « 3 », 03): die bisherige Meldung, kein Schreiben, kein Netz', t2 => {
      if (p.mcDatei && mcTokenDa) return t2.skip('/tmp/metricool.env trägt einen Schlüssel — der Poster ginge ohne Variable weiter (Golden gilt nur ohne)');
      for (const umgebung of [{}, { MAX_PER_RUN: '' }, { MAX_PER_RUN: '1' }, { MAX_PER_RUN: '5' }, { MAX_PER_RUN: ' 3 ' }, { MAX_PER_RUN: '03' }]) {
        const r = gesichert(p.datei, umgebung);
        assert.equal(r.status, 0, `${JSON.stringify(umgebung)}: ${r.stderr}`);
        assert.equal(r.stdout.trim(), p.leer, `${JSON.stringify(umgebung)}`);
        assert.equal(r.stderr, '');
        assert.deepEqual(r.spur.filter(([a]) => a.startsWith('GESPERRT') || a === 'fetch'), [], 'Schreib-/Netzversuch ohne Schlüssel');
      }
    });
    await t.test('POSITIV-KANARIENVOGEL: dieselben gefälschten Schlüssel mit MAX_PER_RUN=1 fassen die Queue an (sonst ist «0 Zugriffe» oben wertlos)', () => {
      const r = laufe(p.datei, { MAX_PER_RUN: '1', ...GEFAELSCHT }, { timeoutMs: 12000 });   // Zeitgrenze erlaubt: es zählt nur die Spur
      const csv = path.join(REPO, p.csv);
      assert.ok(r.spur.some(([a, z]) => (a === 'existsSync' || a === 'readFileSync') && z === csv), `Queue ${p.csv} nicht berührt: ${JSON.stringify(r.spur.slice(0, 6))}`);
      assert.ok(!r.stdout.includes('PAUSE') && !r.stderr.includes('FEHLER: MAX_PER_RUN'), 'Tor schlug bei «1» an');
    });
  });
}

// ───────────────────────── E  Aufrufer ─────────────────────────
function dateien(ordner, endung, tiefe = 4) {
  const aus = [];
  const gehe = (d, t) => {
    let eintraege = [];
    try { eintraege = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of eintraege) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const voll = path.join(d, e.name);
      if (e.isDirectory()) { if (t > 0) gehe(voll, t - 1); } else if (endung.test(e.name)) aus.push(voll);
    }
  };
  gehe(ordner, tiefe);
  return aus;
}

// Text der Anweisung, die bei «ab» beginnt: bis zum Ende der Klammergruppe bzw. bis Semikolon/Zeilenende AUF Klammertiefe 0 (höchstens
// 4000 Zeichen). «tiefe0» = 1, wenn der Treffer selbst mit einer öffnenden Klammer endet («environ.update(»). Strings zählen nicht
// gesondert — grob genug für die Frage «nennt diese Anweisung die Variable?», und mehrzeilige Wörterbücher sind damit erfasst.
function anweisungstext(text, ab, tiefe0 = 0) {
  let i = ab; while (i < text.length && /\s/.test(text[i])) i++;
  const start = i; let tiefe = tiefe0;
  for (; i < text.length && i - start < 4000; i++) {
    const c = text[i];
    if ('([{'.includes(c)) tiefe++;
    else if (')]}'.includes(c)) { tiefe--; if (tiefe < 0) break; }
    else if (tiefe === 0 && (c === ';' || c === '\n')) break;
  }
  return text.slice(start, i);
}

// Fundstellen «Datei:Zeile: Text», an denen MAX_PER_RUN für ANDERE Programme sichtbar gesetzt wird statt nur für einen Befehl/Schritt.
// Als Funktion mit Wurzel, damit «E Kanarienvogel» sie an einem Prüfbaum prüfen kann. Gemeint ist «setzen», nie «lesen» oder «einem
// Unterprozess mitgeben» (env={…, 'MAX_PER_RUN': '1'} wie in social_vorlauf.py ist der erlaubte Weg).
function exportFunde(root, { ausser = [] } = {}) {
  const V = 'MAX_PER_RUN';
  const funde = [];
  const nimm = d => !ausser.includes(path.resolve(d));
  const lies = d => fs.readFileSync(d, 'utf8');
  const melde = (d, text, idx) => {
    const zeile = text.slice(0, idx).split('\n').length;
    const a = text.lastIndexOf('\n', idx - 1) + 1; let e = text.indexOf('\n', idx); if (e < 0) e = text.length;
    funde.push(`${path.relative(root, d)}:${zeile}: ${text.slice(a, e).trim().slice(0, 120)}`);
  };
  const zeilenAnfang = (text, idx) => text.slice(text.lastIndexOf('\n', idx - 1) + 1, idx);
  // gemeinsame Muster; «alle» = Treffer über den ganzen Text, die Zeile des Treffers darf kein Kommentar sein
  const suche = (d, text, muster, kommentar, pruefen = () => true) => {
    for (const m of text.matchAll(muster)) {
      if (kommentar.test(zeilenAnfang(text, m.index) + m[0].slice(0, 1))) continue;
      if (pruefen(m)) melde(d, text, m.index);
    }
  };
  const SH = new RegExp(String.raw`(?:^|[;&|(]|\brun:)[ \t]*(?:export|declare\s+-\w*x|typeset\s+-\w*x)\b[^\n#]*\b${V}\b|^[ \t]*set\s+-a\b[^\n]*${V}`, 'gm');
  const SH_KOMMENTAR = /^\s*#/;

  // Shell: export / declare -x / typeset -x / set -a  (auch mehrzeilig: «MAX_PER_RUN=0» + «export MAX_PER_RUN» → die export-Zeile nennt sie)
  for (const d of [...dateien(path.join(root, 'automation'), /\.(sh|bash)$/), ...dateien(path.join(root, 'tools'), /\.(sh|bash)$/)].filter(nimm)) {
    suche(d, lies(d), SH, SH_KOMMENTAR);
  }

  // Python: environ[…] = …, putenv, environ.update(…) / .setdefault(…) / |= mit der Variable im Argument (auch mehrzeilig)
  const PY_KOMMENTAR = /^\s*#/;
  const PY_DIREKT = new RegExp(String.raw`\benviron\s*\[\s*['"]${V}['"]\s*\]\s*=(?!=)|\bputenv\(\s*['"]${V}['"]`, 'g');
  const PY_GRUPPE = /\benviron\s*(?:\.\s*(?:update|setdefault)\s*\(|\|=)/g;
  for (const d of [...dateien(path.join(root, 'automation'), /\.py$/), ...dateien(path.join(root, 'tools'), /\.py$/)].filter(nimm)) {
    const text = lies(d);
    suche(d, text, PY_DIREKT, PY_KOMMENTAR);
    suche(d, text, PY_GRUPPE, PY_KOMMENTAR, m => anweisungstext(text, m.index + m[0].length, m[0].endsWith('(') ? 1 : 0).includes(V));
  }

  // JavaScript: process.env.X = …, process.env['X'] = …, ||= / ??= / &&=, Object.assign(process.env, {…}), process.env = {…}
  const JS_KOMMENTAR = /^\s*(?:\/\/|\/\*|\*)/;
  const JS_DIREKT = new RegExp(String.raw`\bprocess\.env\s*(?:\.\s*${V}|\[\s*['"\x60]${V}['"\x60]\s*\])\s*(?:\|\||\?\?|&&)?=(?!=)`, 'g');
  const JS_GRUPPE = /\bObject\.assign\(\s*process\.env\b|\bprocess\.env\s*=(?!=)/g;
  for (const d of [...dateien(path.join(root, 'automation'), /\.(mjs|js|cjs)$/), ...dateien(path.join(root, 'tools'), /\.(mjs|js|cjs)$/)].filter(nimm)) {
    const text = lies(d);
    suche(d, text, JS_DIREKT, JS_KOMMENTAR);
    suche(d, text, JS_GRUPPE, JS_KOMMENTAR, m => anweisungstext(text, m.index + m[0].length, m[0].startsWith('Object') ? 1 : 0).includes(V));
  }

  // Workflows: nur im env: eines SCHRITTS (Einzug ≥ 10) — nie auf Job-/Workflow-Ebene, nie über GITHUB_ENV, nie als export im run-Block
  const wf = path.join(root, '.github', 'workflows');
  for (const d of dateien(wf, /\.ya?ml$/, 0).filter(nimm)) {
    const text = lies(d);
    let pos = 0;
    for (const z of text.split('\n')) {
      const idx = pos; pos += z.length + 1;
      if (/^\s*#/.test(z) || !z.includes(V)) continue;
      const einzug = z.length - z.trimStart().length;
      const schluessel = new RegExp(String.raw`\b${V}['"]?\s*:`).test(z);
      if ((schluessel && einzug < 10) || /GITHUB_ENV|GITHUB_OUTPUT/.test(z) || new RegExp(SH.source, 'm').test(z)) melde(d, text, idx);
    }
  }
  return funde;
}

test('E Aufrufer: niemand exportiert MAX_PER_RUN, Workflows setzen sie nur im Schritt, der Autopilot nur als Vorsatz', () => {
  const funde = exportFunde(REPO);   // schliesst diese Datei ein: ihre Fixtures nennen die Variable nie wörtlich (siehe «E Kanarienvogel»)
  assert.deepEqual(funde, [], 'MAX_PER_RUN wird exportiert/gesetzt — Poster (0 = Pause) und upload_edited_product_images.py (0 = ALLE) lesen dieselbe Variable');

  // Autopilot: jede Nennung ist ein Vorsatz «MAX_PER_RUN=1 …» vor genau einem Befehl
  const ap = fs.readFileSync(path.join(REPO, 'automation', 'social_autopilot.sh'), 'utf8').split('\n')
    .map((z, i) => [i + 1, z]).filter(([, z]) => /\bMAX_PER_RUN\b/.test(z) && !/^\s*#/.test(z));
  assert.ok(ap.length >= 4, 'Autopilot nennt MAX_PER_RUN nicht mehr (4 Aufrufe am 19.10.) — Annahme prüfen');
  for (const [n, z] of ap) assert.ok(/(^|\s)MAX_PER_RUN=1\s+\$NODE\b/.test(z), `social_autopilot.sh:${n} ist kein Vorsatz mit 1: ${z.trim()}`);

  // Die Falle selbst bleibt dokumentiert: das Python-Programm liest «0 = alle»
  const py = fs.readFileSync(path.join(REPO, 'automation', 'upload_edited_product_images.py'), 'utf8');
  assert.ok(/os\.environ\.get\("MAX_PER_RUN", "0"\)/.test(py), 'upload_edited_product_images.py liest MAX_PER_RUN anders als bei der Messung (19.10.) — Kopf von lib/run_limit.mjs anpassen');
});

// Prüfbaum: «pos_*» MÜSSEN gemeldet werden (jede Form, in der MAX_PER_RUN für andere Programme gesetzt wird), «neg_*» NICHT (Lesen,
// Unterprozess-env, Vorsatz, Kommentar, Vergleich, Schritt-env). Der Name der Variable ist zusammengesetzt: so steht in DIESER Datei
// nirgends ein wörtliches Setzen, und die Suche über das echte Repo (Test E) bleibt auch ohne Ausnahme sauber lesbar.
test('E Kanarienvogel: die Aufrufer-Suche findet jede Form des Setzens (Python, JS, Shell, Workflow, ein- und mehrzeilig) und meldet nichts Harmloses', () => {
  const V = 'MAX_' + 'PER_RUN';
  const baum = fs.mkdtempSync(path.join(TMP, 'e-baum-'));
  const POS = {
    'automation/pos_sh_export.sh': `export ${V}=0\n`,
    'automation/pos_sh_declare.sh': `declare -gx ${V}=0\n`,
    'automation/pos_sh_zweizeilig.sh': `${V}=0\nexport ${V}\n`,
    'automation/pos_sh_set_a.sh': `set -a; ${V}=0; set +a\n`,
    'automation/pos_sh_eingerueckt.sh': `if true; then\n    export FOO=1 ${V}=0\nfi\n`,
    'automation/pos_py_klammer.py': `import os\nos.environ["${V}"] = "0"\n`,
    'automation/pos_py_ohne_leerzeichen.py': `import os\nos.environ['${V}']='0'\n`,
    'automation/pos_py_putenv.py': `import os\nos.putenv("${V}", "0")\n`,
    'automation/pos_py_update.py': `import os\nos.environ.update({"${V}": "0"})\n`,
    'automation/pos_py_update_mehrzeilig.py': `import os\nos.environ.update({\n    "TZ": "UTC",\n    "${V}": str(0),\n})\n`,
    'automation/pos_py_setdefault.py': `import os\nos.environ.setdefault("${V}", "0")\n`,
    'automation/pos_py_oder_gleich.py': `import os\nos.environ |= {"${V}": "0"}\n`,
    'automation/pos_js_zuweisung.mjs': `process.env.${V} = '0';\n`,
    'automation/pos_js_klammer.mjs': `process.env['${V}'] = "0";\n`,
    'automation/pos_js_vorlage.mjs': 'process.env[`' + V + '`] = "0";\n',
    'automation/pos_js_oder_gleich.mjs': `process.env.${V} ||= '5';\n`,
    'automation/pos_js_assign.mjs': `Object.assign(process.env, { ${V}: '0' });\n`,
    'automation/pos_js_assign_mehrzeilig.cjs': `Object.assign(process.env, {\n  TZ: 'UTC',\n  ${V}: '0',\n});\n`,
    'automation/pos_js_ersetzen.js': `process.env = { ...process.env, ${V}: '0' };\n`,
    'tools/pos_tools_py.py': `import os\nos.environ.update(dict(${V}="0"))\n`,
    'tools/pos_tools_sh.sh': `export ${V}=0\n`,
    '.github/workflows/pos_job.yml': `jobs:\n  post:\n    env:\n      ${V}: '0'\n    steps:\n      - run: echo hi\n`,
    '.github/workflows/pos_workflow.yml': `env:\n  ${V}: '0'\njobs:\n  a:\n    runs-on: x\n`,
    '.github/workflows/pos_github_env.yml': `jobs:\n  a:\n    steps:\n      - run: echo "${V}=0" >> "$GITHUB_ENV"\n`,
    '.github/workflows/pos_run_export.yml': `jobs:\n  a:\n    steps:\n      - run: export ${V}=0 && node x.mjs\n`,
  };
  const NEG = {
    'automation/neg_sh_vorsatz.sh': `${V}=1 node x.mjs\nWEG=metricool ${V}=1 $NODE y.mjs\n`,
    'automation/neg_sh_kommentar.sh': `# export ${V}=0 — nur ein Kommentar\n`,
    'automation/neg_sh_lesen.sh': `echo "$${V}"\nif [ "\${${V}:-1}" = 0 ]; then exit 0; fi\n`,
    'automation/neg_py_lesen.py': `import os\nn = int(os.environ.get("${V}", "0"))\nm = os.environ.get('${V}') or 1\nif os.environ["${V}"] == "0":\n    pass\n`,
    'automation/neg_py_unterprozess.py': `import os, subprocess\nsubprocess.run(cmd, env={**os.environ, "${V}": "1"})\n`,
    'automation/neg_py_kommentar.py': `import os\n# os.environ["${V}"] = "0"\n`,
    'automation/neg_py_fremde_gruppe.py': `import os\nos.environ.update({"TZ": "UTC"})\nandere = {"${V}": "1"}\n`,
    'automation/neg_js_lesen.mjs': `const n = process.env.${V};\nif (process.env.${V} === '0') {}\nconst m = process.env['${V}'] ?? '1';\n`,
    'automation/neg_js_unterprozess.mjs': `spawnSync('x', [], { env: { ...process.env, ${V}: '1' } });\n`,
    'automation/neg_js_kommentar.mjs': `// process.env.${V} = '0'\n/* Object.assign(process.env, { ${V}: 1 }) */\n * process.env.${V} = '0'\n`,
    'automation/neg_js_fremde_gruppe.mjs': `Object.assign(process.env, { TZ: 'UTC' });\nconst e = { ${V}: '1' };\n`,
    'automation/neg_js_tests.mjs': `assert.equal(process.env.${V} == null, true);\n`,
    '.github/workflows/neg_schritt.yml': `jobs:\n  a:\n    steps:\n      - name: x\n        env:\n          ${V}: '1'\n        run: node x.mjs\n`,
    '.github/workflows/neg_kommentar.yml': `jobs:\n  a:\n    # ${V}: '0'  (auskommentiert)\n    steps: []\n`,
  };
  baumSchreiben(baum, { ...POS, ...NEG });   // Schreiben steckt in einer Hilfsdatei: queue_schreiber_wache.py meldet sonst diese Datei
  assert.throws(() => baumSchreiben(baum, { '../draussen.txt': 'x' }), /liegt nicht unter/);
  assert.throws(() => baumSchreiben(baum, { '/tmp/draussen.txt': 'x' }), /liegt nicht unter/);
  const gemeldet = new Set(exportFunde(baum).map(f => f.split(':')[0]));
  const nichtGefunden = Object.keys(POS).filter(rel => !gemeldet.has(rel));
  const zuViel = Object.keys(NEG).filter(rel => gemeldet.has(rel));
  assert.deepEqual(nichtGefunden, [], 'Aufrufer-Suche ÜBERSIEHT diese Formen des Setzens');
  assert.deepEqual(zuViel, [], 'Aufrufer-Suche meldet harmlose Formen');
  assert.equal(Object.keys(POS).length, 25); assert.equal(Object.keys(NEG).length, 14);
  // «ausser» nimmt eine Datei wirklich aus
  const ohne = exportFunde(baum, { ausser: [path.join(baum, 'automation/pos_sh_export.sh')] }).map(f => f.split(':')[0]);
  assert.ok(!ohne.includes('automation/pos_sh_export.sh') && ohne.includes('automation/pos_sh_declare.sh'));
});
