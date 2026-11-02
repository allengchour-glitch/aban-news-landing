import { test } from 'node:test';
import assert from 'node:assert/strict';
import { konfig, anfrage, ergebnis, lauf, REGELN_ANHANG, MAX_SEKUNDEN } from './minimax_h3_clip.mjs';

const basis = { IMAGE_URL: 'https://luxestyle.ch/p.jpg', PROMPT: 'Slow push-in on the product.' };
const hdr = t => ({ get: n => (n.toLowerCase() === 'content-type' ? t : null) });
function fake(antworten, log) {
  return async (url, opt = {}) => {
    log.push({ url, methode: opt.method || 'GET', body: opt.body, auth: opt.headers && opt.headers.Authorization });
    const a = antworten.shift();
    if (!a) throw new Error('unerwarteter Aufruf ' + url);
    return { ok: a.status === undefined || a.status < 400, status: a.status ?? 200, headers: hdr(a.typ || 'application/json'), text: async () => JSON.stringify(a.json ?? {}) };
  };
}
const io = (f, t = { n: 0 }) => ({ fetch: f, warte: async () => {}, jetzt: () => (t.n += 1000) });

test('Vorgaben: Lite, 5 s, 768P, Trockenlauf', () => {
  const c = konfig(basis);
  assert.deepEqual([c.model, c.duration, c.resolution, c.live], ['MiniMax-H3-Lite', 5, '768P', false]);
});
test('Eingabe wird nie still korrigiert', () => {
  for (const e of [{ MODEL: 'x' }, { DURATION: '9' }, { DURATION: '3' }, { DURATION: '4.5' }, { RESOLUTION: '2K' }, { IMAGE_URL: 'http://x/p.jpg' }, { IMAGE_URL: '' }, { PROMPT: ' ' }, { LIVE: '1' }])
    assert.throws(() => konfig({ ...basis, ...e }), /Eingabe ungültig/, JSON.stringify(e));
  assert.equal(MAX_SEKUNDEN, 8);
  assert.throws(() => konfig({ ...basis, MODEL: 'MiniMax-H3-Max', DURATION: '4' }), /Minimum 5/);
});
test('Anfrage: erstes Bild, adaptive, Regeln angehängt, kein Schlüssel', () => {
  const b = anfrage(konfig({ ...basis, LIVE: '1', MINIMAX_API_KEY: 'geheim123' }));
  assert.equal(b.content[1].role, 'first_frame');
  assert.equal(b.content[1].image_url.url, basis.IMAGE_URL);
  assert.equal(b.ratio, 'adaptive');
  assert.ok(b.content[0].text.endsWith(REGELN_ANHANG));
  assert.ok(!JSON.stringify(b).includes('geheim123'));
});
test('Ergebnis: alle Status, succeeded braucht https-URL', () => {
  assert.deepEqual(ergebnis({ task: { status: 'running' } }), { fertig: false });
  assert.deepEqual(ergebnis({ task: { status: 'queued' } }), { fertig: false });
  assert.deepEqual(ergebnis({ task: { status: 'failed' } }), { fertig: true, fehler: 'failed' });
  assert.deepEqual(ergebnis({ task: { status: 'cancelled' } }), { fertig: true, fehler: 'cancelled' });
  assert.equal(ergebnis({ task: { status: 'succeeded', content: { url: 'https://c/x.mp4' } } }).url, 'https://c/x.mp4');
  assert.throws(() => ergebnis({ task: { status: 'succeeded', content: {} } }), /ohne https/);
  assert.throws(() => ergebnis({ task: { status: 'succeeded', content: { url: 'http://c/x.mp4' } } }), /ohne https/);
  assert.throws(() => ergebnis({ task: { status: 'komisch' } }), /Unbekannter Status/);
  assert.throws(() => ergebnis({}), /ohne task.status/);
});
test('Trockenlauf: nur die Bildprüfung (HEAD), keine Anfrage an MiniMax', async () => {
  const log = [];
  const r = await lauf(konfig(basis), io(fake([{ typ: 'image/jpeg', json: {} }], log)));
  assert.equal(r.trocken, true);
  assert.equal(log.length, 1);
  assert.equal(log[0].methode, 'HEAD');
});
test('Bild ohne Bildtyp oder mit Fehlerstatus bricht VOR dem Bezahlen ab', async () => {
  await assert.rejects(() => lauf(konfig({ ...basis, LIVE: '1', MINIMAX_API_KEY: 'k' }), io(fake([{ typ: 'text/html' }], []))), /keinen Bildtyp/);
  await assert.rejects(() => lauf(konfig({ ...basis, LIVE: '1', MINIMAX_API_KEY: 'k' }), io(fake([{ status: 404 }], []))), /nicht erreichbar/);
});
test('LIVE: genau eine Anlage, Abruf bis succeeded, Schlüssel nur im Header', async () => {
  const log = [];
  const f = fake([
    { typ: 'image/png' },
    { json: { task_id: '42' } },
    { json: { task: { status: 'queued' } } },
    { json: { task: { status: 'running' } } },
    { json: { task: { status: 'succeeded', duration: 5, content: { url: 'https://c/x.mp4' } } } },
  ], log);
  const r = await lauf(konfig({ ...basis, LIVE: '1', MINIMAX_API_KEY: 'k-123' }), io(f));
  assert.equal(r.url, 'https://c/x.mp4');
  assert.equal(log.filter(l => l.methode === 'POST').length, 1);
  assert.ok(log[1].url.endsWith('/v2/video_generation'));
  assert.ok(log[2].url.endsWith('/v2/query/video_generation/42'));
  assert.equal(log[1].auth, 'Bearer k-123');
  assert.ok(!log.some(l => (l.body || '').includes('k-123')));
});
test('LIVE: failed, HTTP-Fehler, fehlende task_id und Zeitlimit enden mit Fehler', async () => {
  const k = { ...basis, LIVE: '1', MINIMAX_API_KEY: 'k' };
  await assert.rejects(() => lauf(konfig(k), io(fake([{ typ: 'image/png' }, { json: { task_id: '1' } }, { json: { task: { status: 'failed' } } }], []))), /endete mit failed/);
  await assert.rejects(() => lauf(konfig(k), io(fake([{ typ: 'image/png' }, { status: 402, json: { error: { message: 'insufficient balance' } } }], []))), /HTTP 402 insufficient balance/);
  await assert.rejects(() => lauf(konfig(k), io(fake([{ typ: 'image/png' }, { json: {} }], []))), /ohne task_id/);
  const dauerlaeufer = fake([{ typ: 'image/png' }, { json: { task_id: '7' } }, ...Array(2000).fill({ json: { task: { status: 'running' } } })], []);
  await assert.rejects(() => lauf(konfig(k), { fetch: dauerlaeufer, warte: async () => {}, jetzt: (() => { let n = 0; return () => (n += 60000); })() }), /Zeitlimit/);
});
