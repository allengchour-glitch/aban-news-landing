// run_limit_test.mjs — prüft lib/run_limit.mjs und das Tor «MAX_PER_RUN» in den fünf Postern (19.10.2026). Offline, ohne Schlüssel.
//   node --test automation/lib/run_limit_test.mjs        (aus dem Repo-Wurzelordner; ~15 s, der Hauptteil sind die 5 × 23 Poster-Prozesse)
//
// A  parseRunLimit als Funktion: Tabelle gültig/ungültig (Grenzfälle), Meldung (Name, Wert auf 20 Zeichen, kein Zeilenumbruch),
//    Programmierfehler (TypeError), BITGLEICH zur alten Auswertung für jeden Wert 1…2000 und die Standards.
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
  ];
  for (const [roh, opt, soll] of tabelle) assert.deepEqual(parseRunLimit(roh, opt), soll, `Eingabe ${JSON.stringify(roh)} ${JSON.stringify(opt)}`);
});

test('A2 ungültige Werte werfen RunLimitError (nie still umgedeutet)', () => {
  const schlecht = ['-1', '-0', '-3', '+5', '2.5', '0.0', '.5', '5.', '1e3', '1E3', '0x10', '0b1', 'abc', '5x', 'x5', 'NaN', 'Infinity',
    '-Infinity', ' ', '  \t', '5 5', '1,5', '1_000', '- 3', 'null', 'undefined', 'true', '١٢', '１２',   // Arabisch-indisch / Vollbreite
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

test('E Aufrufer: niemand exportiert MAX_PER_RUN, Workflows setzen sie nur im Schritt, der Autopilot nur als Vorsatz', () => {
  const funde = [];
  for (const d of [...dateien(path.join(REPO, 'automation'), /\.(sh|bash)$/), ...dateien(path.join(REPO, 'tools'), /\.(sh|bash)$/)]) {
    fs.readFileSync(d, 'utf8').split('\n').forEach((z, i) => {
      if (/^\s*(export|declare\s+-\w*x|typeset\s+-\w*x)\b.*\bMAX_PER_RUN\b/.test(z) || /^\s*set\s+-a\b.*MAX_PER_RUN/.test(z)) funde.push(`${path.relative(REPO, d)}:${i + 1}: ${z.trim()}`);
    });
  }
  for (const d of [...dateien(path.join(REPO, 'automation'), /\.py$/), ...dateien(path.join(REPO, 'tools'), /\.py$/)]) {
    fs.readFileSync(d, 'utf8').split('\n').forEach((z, i) => {
      if (/environ\[['"]MAX_PER_RUN['"]\]\s*=[^=]|putenv\(\s*['"]MAX_PER_RUN['"]/.test(z)) funde.push(`${path.relative(REPO, d)}:${i + 1}: ${z.trim()}`);
    });
  }
  assert.deepEqual(funde, [], 'MAX_PER_RUN wird exportiert/gesetzt — Poster (0 = Pause) und upload_edited_product_images.py (0 = ALLE) lesen dieselbe Variable');

  // Workflows: MAX_PER_RUN nur im env: eines Schritts (Einrückung ≥ 10), nie auf Job- oder Workflow-Ebene
  const wf = path.join(REPO, '.github', 'workflows');
  const ebenen = [];
  for (const d of dateien(wf, /\.ya?ml$/, 0)) {
    fs.readFileSync(d, 'utf8').split('\n').forEach((z, i) => {
      if (/^\s*#/.test(z) || !/\bMAX_PER_RUN\s*:/.test(z)) return;
      const einzug = z.length - z.trimStart().length;
      if (einzug < 10) ebenen.push(`${path.basename(d)}:${i + 1}: Einzug ${einzug}`);
    });
  }
  assert.deepEqual(ebenen, [], 'MAX_PER_RUN auf Job-/Workflow-Ebene würde mehrere Schritte (auch den Python-Lauf) erreichen');

  // Autopilot: jede Nennung ist ein Vorsatz «MAX_PER_RUN=1 …» vor genau einem Befehl
  const ap = fs.readFileSync(path.join(REPO, 'automation', 'social_autopilot.sh'), 'utf8').split('\n')
    .map((z, i) => [i + 1, z]).filter(([, z]) => /\bMAX_PER_RUN\b/.test(z) && !/^\s*#/.test(z));
  assert.ok(ap.length >= 4, 'Autopilot nennt MAX_PER_RUN nicht mehr (4 Aufrufe am 19.10.) — Annahme prüfen');
  for (const [n, z] of ap) assert.ok(/(^|\s)MAX_PER_RUN=1\s+\$NODE\b/.test(z), `social_autopilot.sh:${n} ist kein Vorsatz mit 1: ${z.trim()}`);

  // Die Falle selbst bleibt dokumentiert: das Python-Programm liest «0 = alle»
  const py = fs.readFileSync(path.join(REPO, 'automation', 'upload_edited_product_images.py'), 'utf8');
  assert.ok(/os\.environ\.get\("MAX_PER_RUN", "0"\)/.test(py), 'upload_edited_product_images.py liest MAX_PER_RUN anders als bei der Messung (19.10.) — Kopf von lib/run_limit.mjs anpassen');
});
