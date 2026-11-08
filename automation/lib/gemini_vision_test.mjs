// Test für gemini_vision.mjs: node automation/lib/gemini_vision_test.mjs (nutzt nur eine Attrappe, kein Netz).
import assert from 'node:assert/strict';
import { bildKlassifizieren, antwortLesen, GeminiFatal } from './gemini_vision.mjs';

const BILD = 'https://cdn.example/test.jpg';
const stamm = { url: BILD, key: 'k', model: 'm', base: 'https://api.example/v1beta', prompt: 'p' };
const antwort = (status, json, kopf = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => json,
  arrayBuffer: async () => new TextEncoder().encode('bild').buffer,
  headers: { get: (n) => kopf[String(n).toLowerCase()] ?? null },
});
const gut = (text, extra = {}) => antwort(200, { candidates: [{ content: { parts: [{ text }] }, ...extra }] });

// Attrappe: Aufrufe an das Bild gehen an `bild()`, alle anderen der Reihe nach an die Gemini-Antworten (letzte wiederholt sich).
function attrappe(gemini, bild = () => antwort(200, null)) {
  const aufrufe = [];
  const f = async (u, opt) => {
    aufrufe.push({ u, opt });
    if (istBild(u)) return bild();
    const n = aufrufe.filter((a) => !istBild(a.u)).length - 1;
    const a = gemini[Math.min(n, gemini.length - 1)];
    if (a instanceof Error) throw a;
    return a;
  };
  f.aufrufe = aufrufe;
  f.gemini = () => aufrufe.filter((a) => !istBild(a.u));
  f.bilder = () => aufrufe.filter((a) => istBild(a.u));
  return f;
}
const istBild = (u) => String(u).startsWith('https://cdn.example/');
const warten = [];
const sleepFn = async (ms) => { warten.push(ms); };
let n = 0;
const ok = (name) => { n += 1; console.log('ok    ', name); };

{ // 1) echte Antwort
  const f = attrappe([gut('Hier: {"zeigt_produkt":true,"text_overlay":true}')]);
  const r = await bildKlassifizieren({ ...stamm, fetchFn: f, sleepFn });
  assert.equal(r.ok, true); assert.equal(r.c.text_overlay, true);
  const g = f.gemini()[0];
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
  assert.deepEqual(Object.keys(r).sort(), ['c', 'grund', 'ok'], 'interne Merker (ausfall, fatal) gehen nicht nach aussen');
  ok('dauerhaftes 429: kein Erfolg vorgetäuscht, steigende Wartezeit, keine internen Merker im Ergebnis');
}
{ // 4) 401/402/403/404 ohne Ersatzschlüssel: Abbruch, nicht «in Ordnung»
  for (const status of [401, 402, 403, 404]) {
    const f = attrappe([antwort(status, { error: { message: 'Schlüssel kaputt' } })]);
    await assert.rejects(() => bildKlassifizieren({ ...stamm, fetchFn: f, sleepFn }), (e) => e instanceof GeminiFatal && e.status === status);
    assert.equal(f.gemini().length, 1, 'ein dauerhafter Fehler wird nicht wiederholt');
  }
  ok('401/402/403/404 brechen ab (GeminiFatal), ohne Wiederholung');
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
  const c = antwortLesen(null);
  assert.equal(c.ok, false); assert.equal(c.grund, 'keine-json-antwort');
  ok('Antwort ohne brauchbares JSON zählt nicht als Befund');
}
{ // 7) Bild nicht lesbar: kein Gemini-Aufruf; Ausfall des Bild-Servers heisst «bild-netz» und wird einmal wiederholt
  warten.length = 0;
  const f = attrappe([gut('{}')], () => antwort(404, null));
  const r = await bildKlassifizieren({ ...stamm, fetchFn: f, sleepFn });
  assert.equal(r.ok, false); assert.equal(r.grund, 'bild-nicht-lesbar'); assert.equal(f.gemini().length, 0); assert.equal(f.bilder().length, 1);
  const g = attrappe([gut('{}')], () => antwort(503, null));
  const s = await bildKlassifizieren({ ...stamm, fetchFn: g, sleepFn });
  assert.equal(s.ok, false); assert.equal(s.grund, 'bild-netz'); assert.equal(g.gemini().length, 0); assert.equal(g.bilder().length, 2); assert.deepEqual(warten, [3000]);
  const h = attrappe([gut('{}')], () => { throw new Error('socket'); });
  const t = await bildKlassifizieren({ ...stamm, fetchFn: h, sleepFn });
  assert.equal(t.grund, 'bild-netz'); assert.equal(h.gemini().length, 0);
  ok('unlesbares Bild: Grund genannt, Gemini nicht belastet; Ausfall des Bild-Servers wird nicht als «Bild fehlt» gewertet');
}
{ // 8) Netzfehler wird wiederholt, dann gemeldet
  warten.length = 0;
  const f = attrappe([new Error('socket')]);
  const r = await bildKlassifizieren({ ...stamm, fetchFn: f, sleepFn, versuche: 2 });
  assert.equal(r.ok, false); assert.equal(r.grund, 'netz'); assert.deepEqual(warten, [5000]);
  ok('Netzfehler: ein Wiederholversuch, dann «netz»');
}
{ // 9) Gratis-Schlüssel erschöpft: Ersatzschlüssel übernimmt nach zwei Versuchen und wird gemeldet
  warten.length = 0;
  const schluessel = [];
  const f = async (u, opt) => {
    if (istBild(u)) return antwort(200, null);
    schluessel.push(opt.headers['x-goog-api-key']);
    return opt.headers['x-goog-api-key'] === 'gratis' ? antwort(429, { error: { message: 'quota' } }) : gut('{"zeigt_produkt":true}');
  };
  const r = await bildKlassifizieren({ ...stamm, key: 'gratis', keyFallback: 'bezahlt', fetchFn: f, sleepFn });
  assert.equal(r.ok, true); assert.equal(r.wechsel, true); assert.equal(r.wechselGrund, 'http-429');
  assert.deepEqual(schluessel, ['gratis', 'gratis', 'bezahlt'], 'mit Ersatzschlüssel nur zwei Versuche am Gratis-Schlüssel (nicht vier)');
  assert.deepEqual(warten, [20000]);
  ok('erschöpfter Gratis-Schlüssel: nach zwei Versuchen Wechsel auf den Ersatzschlüssel, mit Meldung');
}
{ // 10) Ohne Ersatzschlüssel bleibt es bei der ehrlichen Aufgabe; das Zeitlimit hängt am Gemini-Aufruf UND am Bild
  const f = attrappe([antwort(429, { error: {} })]);
  const r = await bildKlassifizieren({ ...stamm, fetchFn: f, sleepFn, versuche: 1 });
  assert.equal(r.ok, false); assert.equal(r.grund, 'http-429'); assert.ok(!r.wechsel);
  assert.ok(f.gemini()[0].opt.signal instanceof AbortSignal, 'Zeitlimit (AbortSignal) am Gemini-Aufruf');
  assert.ok(f.bilder()[0].opt.signal instanceof AbortSignal, 'Zeitlimit (AbortSignal) beim Bildholen: ohne dieses hängt der Lauf an einem stummen Server');
  ok('ohne Ersatzschlüssel: ehrliches Aufgeben; Zeitlimit für hängende Aufrufe und Bilder');
}
{ // 11) Gedanken-Teile werden übersprungen, Textteile zusammengefügt
  const f = attrappe([antwort(200, { candidates: [{ finishReason: 'STOP', content: { parts: [
    { text: 'Entwurf: {"zeigt_produkt":false}', thought: true },
    { text: '{"zeigt_produkt":' },
    { text: 'true,"collage":false}' },
  ] } }] })]);
  const r = await bildKlassifizieren({ ...stamm, fetchFn: f, sleepFn });
  assert.equal(r.ok, true); assert.equal(r.c.zeigt_produkt, true); assert.equal(r.c.collage, false);
  ok('Gedanken-Teile zählen nicht als Antwort, mehrere Textteile werden zusammengefügt');
}
{ // 12) Gekappte Antwort (MAX_TOKENS) heisst «abgeschnitten», nicht «keine-json-antwort»; vollständiges JSON zählt trotzdem
  for (const text of ['{"zeigt_', '```json\n', '{"zeigt_produkt":true,"unscharf":false']) {
    const r = await bildKlassifizieren({ ...stamm, fetchFn: attrappe([gut(text, { finishReason: 'MAX_TOKENS' })]), sleepFn });
    assert.equal(r.ok, false); assert.equal(r.grund, 'abgeschnitten', `Text ${JSON.stringify(text)}`);
  }
  const v = await bildKlassifizieren({ ...stamm, fetchFn: attrappe([gut('{"zeigt_produkt":true}', { finishReason: 'MAX_TOKENS' })]), sleepFn });
  assert.equal(v.ok, true);
  ok('abgeschnittene Antwort wird als solche gemeldet (so fiele ein Rückfall auf 80 Tokens sofort auf)');
}
{ // 13) Sicherheitsblockade ist ein Bildproblem, kein Schlüsselproblem
  const a = await bildKlassifizieren({ ...stamm, fetchFn: attrappe([antwort(200, { promptFeedback: { blockReason: 'SAFETY' } })]), sleepFn });
  assert.equal(a.ok, false); assert.equal(a.grund, 'bild-abgelehnt');
  for (const ende of ['SAFETY', 'PROHIBITED_CONTENT', 'IMAGE_SAFETY']) {
    const b = await bildKlassifizieren({ ...stamm, fetchFn: attrappe([antwort(200, { candidates: [{ finishReason: ende }] })]), sleepFn });
    assert.equal(b.grund, 'bild-abgelehnt', ende);
  }
  ok('von Gemini gesperrte Bilder: «bild-abgelehnt» statt Serie von «keine-json-antwort»');
}
{ // 14) Form der Anfrage: genug Tokens für denkende Modelle, JSON-Modus (Regressionstest zum 80-Token-Fund vom 08.11.)
  const f = attrappe([gut('{"zeigt_produkt":true}')], () => antwort(200, null));
  await bildKlassifizieren({ ...stamm, fetchFn: f, sleepFn });
  const q = JSON.parse(f.gemini()[0].opt.body);
  assert.ok(q.generationConfig.maxOutputTokens >= 512, `maxOutputTokens ${q.generationConfig.maxOutputTokens} liess denkenden Modellen 3 bis 4 Tokens für die Antwort`);
  assert.equal(q.generationConfig.responseMimeType, 'application/json');
  assert.equal(q.generationConfig.temperature, 0);
  assert.equal(q.contents[0].parts[0].text, 'p');
  assert.equal(q.contents[0].parts[1].inline_data.data, Buffer.from('bild').toString('base64'));
  ok('Anfrage: mindestens 512 Ausgabe-Tokens und JSON-Modus, Bild als Base64');
}
{ // 15) Zeitüberschreitung des Gratis-Schlüssels: zwei Versuche, dann Ersatzschlüssel (vorher: vier Minuten je Produkt ohne Wechsel)
  warten.length = 0;
  const schluessel = [];
  const f = async (u, opt) => {
    if (istBild(u)) return antwort(200, null);
    schluessel.push(opt.headers['x-goog-api-key']);
    if (opt.headers['x-goog-api-key'] === 'gratis') throw new Error('The operation was aborted due to timeout');
    return gut('{"zeigt_produkt":true}');
  };
  const r = await bildKlassifizieren({ ...stamm, key: 'gratis', keyFallback: 'bezahlt', fetchFn: f, sleepFn });
  assert.equal(r.ok, true); assert.equal(r.wechsel, true); assert.equal(r.wechselGrund, 'netz');
  assert.deepEqual(schluessel, ['gratis', 'gratis', 'bezahlt']); assert.deepEqual(warten, [5000]);
  const g = attrappe([antwort(503, { error: {} })]);
  const s = await bildKlassifizieren({ ...stamm, key: 'gratis', keyFallback: 'bezahlt', fetchFn: g, sleepFn });
  assert.equal(s.wechsel, true); assert.equal(s.wechselGrund, 'http-503');
  ok('Zeitlimit oder 5xx am Gratis-Schlüssel: Wechsel nach zwei Versuchen, Grund wird genannt');
}
{ // 16) Schlüssel- oder Modellfehler am ersten Schlüssel: der Ersatz kommt dran; versagen beide, bricht der Lauf ab
  const schluessel = [];
  const f = async (u, opt) => {
    if (istBild(u)) return antwort(200, null);
    schluessel.push(opt.headers['x-goog-api-key']);
    return opt.headers['x-goog-api-key'] === 'gratis' ? antwort(403, { error: { message: 'no access' } }) : gut('{"zeigt_produkt":true}');
  };
  const r = await bildKlassifizieren({ ...stamm, key: 'gratis', keyFallback: 'bezahlt', fetchFn: f, sleepFn });
  assert.equal(r.ok, true); assert.equal(r.wechsel, true); assert.equal(r.wechselGrund, 'http-403');
  assert.deepEqual(schluessel, ['gratis', 'bezahlt'], 'ein dauerhafter Fehler wird nicht wiederholt, sondern sofort gewechselt');
  const beide = attrappe([antwort(403, { error: { message: 'no access' } })]);
  await assert.rejects(() => bildKlassifizieren({ ...stamm, key: 'gratis', keyFallback: 'bezahlt', fetchFn: beide, sleepFn }), (e) => e instanceof GeminiFatal && e.status === 403);
  assert.equal(beide.gemini().length, 2);
  ok('403 am Gratis-Schlüssel: sofort Ersatzschlüssel; Fehler an beiden: Abbruch');
}
{ // 17) Das Bild wird nur einmal geholt (auch beim Wechsel) und mit dem echten Dateityp gesendet
  const f = attrappe([antwort(503, { error: {} }), gut('{"zeigt_produkt":true}')], () => antwort(200, null, { 'content-type': 'image/webp; charset=binary' }));
  const r = await bildKlassifizieren({ ...stamm, key: 'gratis', keyFallback: 'bezahlt', fetchFn: f, sleepFn, versuche: 1 });
  assert.equal(r.ok, true); assert.equal(f.bilder().length, 1, 'ein Wechsel holt das Bild nicht noch einmal');
  assert.equal(JSON.parse(f.gemini()[0].opt.body).contents[0].parts[1].inline_data.mime_type, 'image/webp');
  const png = attrappe([gut('{}')], () => antwort(200, null, { 'content-type': 'binary/octet-stream' }));
  await bildKlassifizieren({ ...stamm, url: 'https://cdn.example/test.png', fetchFn: png, sleepFn });
  assert.equal(JSON.parse(png.gemini()[0].opt.body).contents[0].parts[1].inline_data.mime_type, 'image/png', 'ohne brauchbaren Dateityp entscheidet die Endung');
  ok('Bild einmal geholt; Dateityp aus dem Kopf, sonst aus der Endung');
}
{ // 18) Der Ersatzschlüssel kann ein anderes Modell bekommen (Gratis-Schlüssel: kleines Modell, Ersatz: grosses)
  const modelle = [];
  const f = async (u, opt) => {
    if (istBild(u)) return antwort(200, null);
    modelle.push(u.split('/models/')[1].split(':')[0] + '@' + opt.headers['x-goog-api-key']);
    return opt.headers['x-goog-api-key'] === 'gratis' ? antwort(429, { error: {} }) : gut('{"zeigt_produkt":true}');
  };
  const r = await bildKlassifizieren({ ...stamm, model: 'klein', modelFallback: 'gross', key: 'gratis', keyFallback: 'bezahlt', fetchFn: f, sleepFn });
  assert.equal(r.ok, true); assert.deepEqual(modelle, ['klein@gratis', 'klein@gratis', 'gross@bezahlt']);
  const g = [];
  const h = async (u, opt) => { if (istBild(u)) return antwort(200, null); g.push(u.split('/models/')[1].split(':')[0]); return opt.headers['x-goog-api-key'] === 'gratis' ? antwort(503, { error: {} }) : gut('{}'); };
  await bildKlassifizieren({ ...stamm, model: 'einziges', key: 'gratis', keyFallback: 'bezahlt', fetchFn: h, sleepFn });
  assert.deepEqual(g, ['einziges', 'einziges', 'einziges'], 'ohne modelFallback bleibt das Modell gleich');
  ok('Ersatzschlüssel mit eigenem Modell; ohne Angabe bleibt das erste Modell');
}
console.log(`ALLES OK (${n} Gruppen)`);
