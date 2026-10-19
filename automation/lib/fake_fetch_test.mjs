// fake_fetch_test.mjs — prüft das Fake-fetch selbst (fake_fetch_preload.mjs), offline, env nur mit PATH (19.10.2026).
// Lauf: /opt/node22/bin/node automation/lib/fake_fetch_test.mjs     (node:test; Exit 1 bei einem Fehler)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { wegwerfOrdner, lauf, PRELOAD } from './fake_fetch_lauf.mjs';

const GEHEIMNIS = 'shpss_ERFUNDEN_0123456789abcdef', TOKEN = 'tok_ERFUNDEN_zzz';
// Probe: führt die Aufrufe aus PROBE (JSON-Liste von [url, opts]) nacheinander aus und druckt je Ergebnis eine Zeile.
const PROBE = `
const liste = JSON.parse(process.env.PROBE);
for (const [url, opts] of liste) {
  try { const r = await fetch(url, opts); console.log(JSON.stringify({ status: r.status, ok: r.ok, body: await r.text() })); }
  catch (e) { console.log(JSON.stringify({ wirft: e.message })); }
}`;
function probe(t, szenario, aufrufe, env = {}) {
  const dir = wegwerfOrdner(t), skript = path.join(dir, 'probe.mjs');
  fs.writeFileSync(skript, PROBE);
  const r = lauf({ dir, skript, szenario, env: { PROBE: JSON.stringify(aufrufe), ...env } });
  return { ...r, zeilen: r.stdout.split('\n').filter(Boolean).map(z => JSON.parse(z)) };
}
const post = (url, body, headers = {}) => [url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }];

test('ohne Szenario bricht der Start ab (kein stiller Rückfall auf echtes Netz)', t => {
  const dir = wegwerfOrdner(t), skript = path.join(dir, 'p.mjs');
  fs.writeFileSync(skript, 'console.log("ERREICHT");');
  const r = spawnSync(process.execPath, ['--import', PRELOAD, skript], { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /FAKE_FETCH_SCENARIO fehlt/);
  assert.doesNotMatch(r.stdout, /ERREICHT/);
});

test('Tippfehler im Szenario sind Ladefehler (unbekannter match-/respond-Schlüssel, fehlende respond)', t => {
  for (const [name, routes, muster] of [
    ['match', [{ match: { hots: 'x' }, respond: { json: {} } }], /unbekannter match-Schlüssel «hots»/],
    ['respond', [{ respond: { jsn: {} } }], /unbekannter respond-Schlüssel «jsn»/],
    ['ohne respond', [{ match: {} }], /respond fehlt/],
  ]) {
    const dir = wegwerfOrdner(t), skript = path.join(dir, 'p.mjs');
    fs.writeFileSync(skript, 'console.log("ERREICHT");');
    const r = lauf({ dir, skript, szenario: { routes } });
    assert.notEqual(r.status, 0, name);
    assert.match(r.stderr, muster, name);
    assert.doesNotMatch(r.stdout, /ERREICHT/, name);
  }
});

test('ohne passende Route wirft fetch laut und das Protokoll trägt route:null', t => {
  const r = probe(t, { routes: [{ match: { path: '/a' }, respond: { json: { a: 1 } } }] }, [['https://x.test/b', {}]]);
  assert.match(r.zeilen[0].wirft, /FAKE_FETCH: keine Route für GET x\.test\/b/);
  assert.equal(r.aufrufe.length, 1); assert.equal(r.aufrufe[0].route, null); assert.equal(r.aufrufe[0].fehler, 'keine-route');
});

test('erlaubte Hosts: fremder Host wird abgewiesen und protokolliert', t => {
  const r = probe(t, { hosts: ['ok.test'], routes: [{ respond: { json: {} } }] }, [['https://bose.test/x', {}], ['https://ok.test/x', {}]]);
  assert.match(r.zeilen[0].wirft, /Host nicht erlaubt: bose\.test/);
  assert.equal(r.zeilen[1].status, 200);
  assert.deepEqual(r.aufrufe.map(a => a.fehler ?? a.status), ['host-nicht-erlaubt', 200]);
});

test('match: Methode, Pfad, Regex, Header, JSON-Teilmenge, GraphQL-Variablen; erste passende Route gewinnt', t => {
  const routes = [
    { name: 'falscher-header', match: { path: '/g', headers: { 'x-shopify-access-token': 'anders' } }, respond: { json: { r: 'x' } } },
    { name: 'mutation-7', match: { pathRegex: 'g$', queryRegex: 'publish', variables: { id: '7' } }, respond: { json: { r: 'sieben' } } },
    { name: 'oauth', match: { method: 'POST', path: '/o', json: { client_id: 'c', grant_type: 'g' } }, respond: { json: { access_token: 'T' } } },
    { name: 'rest', respond: { status: 404, text: 'nix' } },
  ];
  const r = probe(t, { routes }, [
    post('https://h.test/o', { client_id: 'c', client_secret: GEHEIMNIS, grant_type: 'g' }),
    post('https://h.test/g', { query: 'mutation publish', variables: { id: '7' } }, { 'X-Shopify-Access-Token': TOKEN }),
    post('https://h.test/g', { query: 'mutation publish', variables: { id: '8' } }, { 'X-Shopify-Access-Token': TOKEN }),
  ]);
  assert.equal(JSON.parse(r.zeilen[0].body).access_token, 'T');
  assert.equal(JSON.parse(r.zeilen[1].body).r, 'sieben');
  assert.equal(r.zeilen[2].status, 404);
  assert.deepEqual(r.aufrufe.map(a => a.route), ['oauth', 'mutation-7', 'rest']);
});

test('Geheimnisse: nie im Protokoll (Header-Werte, Body-Schlüssel, GraphQL-Variablen); Namen bleiben sichtbar', t => {
  const r = probe(t, { routes: [{ respond: { json: { ok: true } } }] }, [
    post('https://h.test/o?client_secret=' + GEHEIMNIS, { client_id: 'c', client_secret: GEHEIMNIS, grant_type: 'g' }),
    post('https://h.test/g', { query: '{ a }', variables: { id: '1', apiKey: GEHEIMNIS, nested: { password: GEHEIMNIS } } }, { 'X-Shopify-Access-Token': TOKEN, Authorization: 'Bearer ' + TOKEN }),
  ]);
  assert.ok(!r.roh.includes(GEHEIMNIS), 'Geheimnis im Protokoll');
  assert.ok(!r.roh.includes(TOKEN), 'Token im Protokoll');
  assert.equal(r.aufrufe[0].bodyJson.client_secret, '«redacted»'); assert.equal(r.aufrufe[0].bodyJson.client_id, 'c');
  assert.deepEqual(r.aufrufe[0].queryParams, ['client_secret']);                     // nur der NAME der Query-Parameter
  assert.deepEqual(r.aufrufe[1].headerNames, ['authorization', 'content-type', 'x-shopify-access-token']);
  assert.equal(r.aufrufe[1].variables.id, '1'); assert.equal(r.aufrufe[1].variables.nested.password, '«redacted»');
  assert.equal(r.aufrufe[1].query, '{ a }');
});

test('times, sequence (letzte bleibt), networkError, graphqlErrors, Statuscode', t => {
  const routes = [
    { name: 'einmal', match: { path: '/einmal' }, times: 1, respond: { text: 'eins' } },
    { name: 'folge', match: { path: '/folge' }, respond: { sequence: [{ status: 429, text: 'drossel' }, { json: { ok: 1 } }] } },
    { name: 'netz', match: { path: '/netz' }, respond: { networkError: 'Verbindung weg' } },
    { name: 'gql', match: { path: '/gql' }, respond: { graphqlErrors: [{ message: 'Access denied' }] } },
    { match: {}, respond: { status: 503, text: 'sonst' } },
  ];
  const r = probe(t, { routes }, [['https://h.test/einmal', {}], ['https://h.test/einmal', {}], ['https://h.test/folge', {}], ['https://h.test/folge', {}], ['https://h.test/folge', {}],
    ['https://h.test/netz', {}], ['https://h.test/gql', {}]]);
  assert.deepEqual(r.zeilen.map(z => z.wirft ? 'wirft:' + z.wirft : z.status), [200, 503, 429, 200, 200, 'wirft:Verbindung weg', 200]);
  assert.deepEqual(JSON.parse(r.zeilen[6].body), { errors: [{ message: 'Access denied' }] });
});

test('redirect:"error" mit 3xx wirft wie das echte fetch', t => {
  const r = probe(t, { routes: [{ respond: { status: 302, headers: { location: 'https://evil.test/' } } }] },
    [['https://h.test/a', { redirect: 'error' }], ['https://h.test/a', { redirect: 'manual' }]]);
  assert.match(r.zeilen[0].wirft, /fetch failed/);
  assert.equal(r.zeilen[1].status, 302);
  assert.equal(r.aufrufe[0].redirect, 'error'); assert.equal(r.aufrufe[0].hasSignal, false);
});

test('fastTimers: setTimeout feuert sofort, die Wartezeit steht im Protokoll', t => {
  const dir = wegwerfOrdner(t), skript = path.join(dir, 'p.mjs');
  fs.writeFileSync(skript, `await fetch('https://h.test/a'); await new Promise(r => setTimeout(r, 16000)); console.log('FERTIG');`);
  const t0 = Date.now();
  const r = lauf({ dir, skript, szenario: { fastTimers: true, routes: [{ respond: { json: {} } }] } });
  assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /FERTIG/);
  assert.ok(Date.now() - t0 < 10000, 'Timer wurde nicht übersprungen');
  const timer = fs.readFileSync(path.join(dir, 'calls.jsonl'), 'utf8').split('\n').filter(Boolean).map(JSON.parse).find(z => z.timer);
  assert.deepEqual(timer, { timer: 16000, nachAufruf: 1 });
});

// ── 19.10. (Prüfung): Eingabeformen, die ein Test-Skript wirklich benutzt — vorher still falsch protokolliert/abgeglichen ────────────
/** Startet ein eigenes Skript (Text) unter dem Preload; stdout-Zeilen werden als JSON gelesen. */
function eigenes(t, code, szenario) {
  const dir = wegwerfOrdner(t), skript = path.join(dir, 'e.mjs');
  fs.writeFileSync(skript, code);
  const r = lauf({ dir, skript, szenario });
  assert.equal(r.status, 0, r.stderr);
  return { ...r, zeilen: r.stdout.split('\n').filter(Boolean).map(z => JSON.parse(z)) };
}

test('Header als Objekt, Paarliste und Headers-Instanz: gleiche Namen im Protokoll, match.headers greift bei allen dreien', t => {
  const r = eigenes(t, `
const U = 'https://h.test/a', alle = [{ 'X-Test': '1' }, [['X-Test', '1']], new Headers({ 'X-Test': '1' })];
for (const headers of alle) console.log(JSON.stringify((await fetch(U, { headers })).status));`,
  { routes: [{ match: { headers: { 'x-test': '1' } }, respond: { status: 200, text: 'ja' } }, { respond: { status: 404, text: 'nein' } }] });
  assert.deepEqual(r.zeilen, [200, 200, 200]);
  assert.deepEqual(r.aufrufe.map(a => a.headerNames), [['x-test'], ['x-test'], ['x-test']]);
});

test('Request-Instanz: Header UND JSON-Body zählen (match.json, Protokoll mit geschwärztem Geheimnis)', t => {
  const r = eigenes(t, `
const q = new Request('https://h.test/o', { method: 'POST', headers: { 'X-Req': 'x', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: 'c', client_secret: 'GEHEIM-REQ' }) });
console.log(JSON.stringify((await fetch(q)).status));
console.log(JSON.stringify((await fetch(new Request('https://h.test/o', { method: 'POST', body: JSON.stringify({ client_id: 'anders' }) }))).status));`,
  { routes: [{ match: { method: 'POST', headers: { 'x-req': 'x' }, json: { client_id: 'c' } }, respond: { status: 200, text: 'ok' } }, { respond: { status: 404, text: 'nein' } }] });
  assert.deepEqual(r.zeilen, [200, 404]);
  assert.deepEqual(r.aufrufe[0].headerNames, ['content-type', 'x-req']); assert.equal(r.aufrufe[0].bodyJson.client_id, 'c'); assert.equal(r.aufrufe[0].bodyJson.client_secret, '«redacted»');
  assert.ok(!r.roh.includes('GEHEIM-REQ'), 'Geheimnis im Protokoll');
});

test('Formular-Body (URLSearchParams oder x-www-form-urlencoded) wird wie ein flaches JSON-Objekt abgeglichen und geschwärzt protokolliert', t => {
  const r = eigenes(t, `
const p = new URLSearchParams({ grant_type: 'client_credentials', client_secret: 'GEHEIM-FORM' });
console.log(JSON.stringify((await fetch('https://h.test/o', { method: 'POST', body: p })).status));
console.log(JSON.stringify((await fetch('https://h.test/o', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials&client_secret=GEHEIM-TEXT' })).status));
console.log(JSON.stringify((await fetch('https://h.test/o', { method: 'POST', body: new URLSearchParams({ grant_type: 'anders' }) })).status));`,
  { routes: [{ match: { json: { grant_type: 'client_credentials' } }, respond: { status: 200, text: 'ok' } }, { respond: { status: 404, text: 'nein' } }] });
  assert.deepEqual(r.zeilen, [200, 200, 404]);
  assert.deepEqual(r.aufrufe[0].headerNames, ['content-type']);   // setzt das echte fetch bei URLSearchParams selbst
  for (const a of r.aufrufe.slice(0, 2)) { assert.equal(a.bodyJson.grant_type, 'client_credentials'); assert.equal(a.bodyJson.client_secret, '«redacted»'); }
  assert.ok(!r.roh.includes('GEHEIM-FORM') && !r.roh.includes('GEHEIM-TEXT'), 'Geheimnis im Protokoll');
});

test('fastTimers: Timer-Objekt mit unref/ref, clearTimeout vor dem Feuern verhindert den Aufruf, ein nicht gelöschter Timer feuert', t => {
  const r = eigenes(t, `
const t1 = setTimeout(() => console.log(JSON.stringify('t1 gefeuert')), 5000);
console.log(JSON.stringify([typeof t1, typeof t1.unref, t1.unref() === t1, t1.ref() === t1]));
clearTimeout(t1);
setTimeout(() => console.log(JSON.stringify('t2 gefeuert')), 7000);
await new Promise(r => setTimeout(r, 100));
const echt = setTimeout(() => {}, 100000); clearTimeout(echt);   // fremdes/echtes Objekt durchreichen darf nicht werfen
console.log(JSON.stringify('fertig'));`, { fastTimers: true, routes: [] });
  assert.deepEqual(r.zeilen, [['object', 'function', true, true], 't2 gefeuert', 'fertig']);
  assert.deepEqual(r.aufrufe.filter(a => a.timer).map(a => a.timer), [5000, 7000, 100, 100000]);
});
