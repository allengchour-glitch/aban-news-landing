// Test für gemini_vision.mjs: node automation/lib/gemini_vision_test.mjs (nutzt nur eine Attrappe, kein Netz).
import assert from 'node:assert/strict';
import { bildKlassifizieren, GeminiFatal } from './gemini_vision.mjs';

const BILD = 'https://cdn.example/test.jpg';
const stamm = { url: BILD, key: 'k', model: 'm', base: 'https://api.example/v1beta', prompt: 'p' };
const antwort = (status, json) => ({ status, ok: status >= 200 && status < 300, json: async () => json, arrayBuffer: async () => new TextEncoder().encode('bild').buffer });
const gut = (text) => antwort(200, { candidates: [{ content: { parts: [{ text }] } }] });

// Attrappe: erste Aufrufe = Bild holen, danach die Gemini-Antworten der Reihe nach.
function attrappe(gemini, bildOk = true) {
  const aufrufe = [];
  const f = async (u, opt) => {
    aufrufe.push({ u, opt });
    if (u === BILD) return bildOk ? antwort(200, null) : antwort(404, null);
    const n = aufrufe.filter((a) => a.u !== BILD).length - 1;
    const a = gemini[Math.min(n, gemini.length - 1)];
    if (a instanceof Error) throw a;
    return a;
  };
  f.aufrufe = aufrufe;
  return f;
}
const warten = [];
const sleepFn = async (ms) => { warten.push(ms); };
let n = 0;
const ok = (name) => { n += 1; console.log('ok    ', name); };

{ // 1) echte Antwort
  const f = attrappe([gut('Hier: {"zeigt_produkt":true,"text_overlay":true}')]);
  const r = await bildKlassifizieren({ ...stamm, fetchFn: f, sleepFn });
  assert.equal(r.ok, true); assert.equal(r.c.text_overlay, true);
  const g = f.aufrufe.find((a) => a.u !== BILD);
  assert.equal(g.opt.headers['x-goog-api-key'], 'k'); assert.ok(!g.u.includes('key='), 'Schlüssel nicht in der Adresse');
  ok('echte Antwort wird gelesen, Schlüssel steht im Kopf statt in der Adresse');
}
{ // 2) 429 mit Wartehinweis, dann Erfolg
  warten.length = 0;
  const f = attrappe([antwort(429, { error: { details: [{ retryDelay: '7s' }] } }), gut('{"zeigt_produkt":true}')]);
  const r = await bildKlassifizieren({ ...stamm, fetchFn: f, sleepFn });
  assert.equal(r.ok, true); assert.deepEqual(warten, [9000]);
  ok('429: wartet den genannten Hinweis plus 2 s und wiederholt');
}
{ // 3) 429 ohne Hinweis, dauerhaft: gibt nach den Versuchen ehrlich auf
  warten.length = 0;
  const f = attrappe([antwort(429, { error: {} })]);
  const r = await bildKlassifizieren({ ...stamm, fetchFn: f, sleepFn, versuche: 3 });
  assert.equal(r.ok, false); assert.equal(r.grund, 'http-429'); assert.deepEqual(warten, [20000, 40000]);
  ok('dauerhaftes 429: kein Erfolg vorgetäuscht, steigende Wartezeit');
}
{ // 4) 402 und 403: Abbruch, nicht «in Ordnung»
  for (const status of [401, 402, 403, 404]) {
    const f = attrappe([antwort(status, { error: { message: 'Schlüssel kaputt' } })]);
    await assert.rejects(() => bildKlassifizieren({ ...stamm, fetchFn: f, sleepFn }), (e) => e instanceof GeminiFatal && e.status === status);
  }
  ok('401/402/403/404 brechen ab (GeminiFatal)');
}
{ // 5) 400 wegen eines einzelnen Bildes ist nicht tödlich
  const f = attrappe([antwort(400, { error: { message: 'Unable to process input image' } })]);
  const r = await bildKlassifizieren({ ...stamm, fetchFn: f, sleepFn });
  assert.equal(r.ok, false); assert.equal(r.grund, 'bild-abgelehnt');
  const g = attrappe([antwort(400, { error: { message: 'API key not valid' } })]);
  await assert.rejects(() => bildKlassifizieren({ ...stamm, fetchFn: g, sleepFn }), GeminiFatal);
  ok('400 mit Bildbezug: Bild abgelehnt; 400 sonst: Abbruch');
}
{ // 6) Antwort ohne JSON und kaputtes JSON
  const a = await bildKlassifizieren({ ...stamm, fetchFn: attrappe([gut('Das Bild ist schön.')]), sleepFn });
  assert.equal(a.ok, false); assert.equal(a.grund, 'keine-json-antwort');
  const b = await bildKlassifizieren({ ...stamm, fetchFn: attrappe([gut('{zeigt_produkt: ja}')]), sleepFn });
  assert.equal(b.ok, false); assert.equal(b.grund, 'json-defekt');
  ok('Antwort ohne brauchbares JSON zählt nicht als Befund');
}
{ // 7) Bild nicht lesbar: kein Gemini-Aufruf
  const f = attrappe([gut('{}')], false);
  const r = await bildKlassifizieren({ ...stamm, fetchFn: f, sleepFn });
  assert.equal(r.ok, false); assert.equal(r.grund, 'bild-nicht-lesbar'); assert.equal(f.aufrufe.length, 1);
  ok('unlesbares Bild: Grund genannt, Gemini nicht belastet');
}
{ // 8) Netzfehler wird wiederholt, dann gemeldet
  warten.length = 0;
  const f = attrappe([new Error('socket')]);
  const r = await bildKlassifizieren({ ...stamm, fetchFn: f, sleepFn, versuche: 2 });
  assert.equal(r.ok, false); assert.equal(r.grund, 'netz'); assert.deepEqual(warten, [5000]);
  ok('Netzfehler: ein Wiederholversuch, dann «netz»');
}
console.log(`ALLES OK (${n} Gruppen)`);
