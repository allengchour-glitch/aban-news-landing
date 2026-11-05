// Tests für versand_messen.mjs (kein Netz: fetch-Attrappe, Wegwerf-Ordner). Lauf: /opt/node22/bin/node automation/pod_modell/versand_messen_test.mjs
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repraesentant, brauchtMessung, messeEine, main } from './versand_messen.mjs';
import { planeModell, lade, versand, testUebersetzung, bilderFuer, neuerTest } from './testhilfe.mjs';

const { ist, wahr, ende } = neuerTest('versand_messen');
const v = (id, farbe, groesse) => ({ printfulVariantId: id, farbe, groesse });

// ── Repräsentant: erste Farbe, darin die letzte (grösste) Grösse
ist('erste Farbe, letzte Grösse', repraesentant({ varianten: [v(1, 'Weiss', 'S'), v(2, 'Weiss', 'M'), v(3, 'Weiss', 'XL'), v(4, 'Schwarz', 'S'), v(5, 'Schwarz', 'XL')] }).printfulVariantId, 3);
ist('ohne Farben: die letzte Variante', repraesentant({ varianten: [v(1, null, '10×10'), v(2, null, '20×20')] }).printfulVariantId, 2);
ist('eine Variante', repraesentant({ varianten: [v(7, null, null)] }).printfulVariantId, 7);
ist('keine Variante: null', repraesentant({ varianten: [] }), null);

// ── wer braucht eine Messung?
const plan = { stufe: 1, varianten: [v(10, 'A', 'S'), v(11, 'A', 'L')] };
ist('Rate für eine Variante der Auswahl: keine Messung', brauchtMessung(plan, { variante: 11, raten: [{ id: 'STANDARD' }] }), false);
ist('Rate für eine fremde Variante: Messung', brauchtMessung(plan, { variante: 99, raten: [{ id: 'STANDARD' }] }), true);
ist('keine Rate vorhanden: Messung', [brauchtMessung(plan, undefined), brauchtMessung(plan, { variante: 11, raten: [] })], [true, true]);
ist('ALLE=1: immer', brauchtMessung(plan, { variante: 11, raten: [{ id: 'STANDARD' }] }, true), true);
ist('nicht gestaltbar (UNGEEIGNET) oder ohne Variante: nie', [brauchtMessung({ stufe: null, varianten: [v(1)] }, undefined), brauchtMessung({ stufe: 1, varianten: [] }, undefined), brauchtMessung(null, undefined)], [false, false, false]);

// ── messeEine
const antwort = (status, j, kopf = {}) => ({ status, headers: { get: (k) => kopf[k] ?? null }, json: async () => j });
{
  const gesehen = [];
  const f = async (url, o) => { gesehen.push([url, o.method, JSON.parse(o.body), o.headers.Authorization]); return antwort(200, { result: [{ id: 'STANDARD', rate: '10.79', minDeliveryDays: 6, maxDeliveryDays: 9 }] }); };
  const r = await messeEine(11051, { fetchFn: f, key: 'GEHEIM', store: '77' });
  ist('Anfrage: POST an die Preisauskunft, CH 8001, genau eine Variante, Menge 1', [gesehen[0][0], gesehen[0][1], gesehen[0][2]], ['https://api.printful.com/shipping/rates', 'POST', { recipient: { country_code: 'CH', zip: '8001' }, items: [{ variant_id: 11051, quantity: 1 }] }]);
  ist('Antwort: Rate mit Tagen, Variante vermerkt', [r.http, r.variante, r.raten, r.fehler, r.gemessenFuer], [200, 11051, [{ id: 'STANDARD', rateUsd: '10.79', tageMin: 6, tageMax: 9 }], null, 'auswahl']);
}
{
  let n = 0; const pausen = [];
  const f = async () => (++n < 3 ? antwort(429, {}, { 'retry-after': '2' }) : antwort(200, { result: [{ id: 'STANDARD', rate: '5', minDeliveryDays: 3, maxDeliveryDays: 6 }] }));
  const r = await messeEine(1, { fetchFn: f, key: 'k', store: '1', pause: async (ms) => { pausen.push(ms); } });
  ist('429: wartet laut retry-after und wiederholt', [n, pausen, r.raten.length], [3, [2000, 2000], 1]);
  const r2 = await messeEine(1, { fetchFn: async () => antwort(429, {}), key: 'k', store: '1', pause: async () => {}, versuche: 2 });
  ist('429 dauerhaft: Fehler, keine Rate', [r2.http, r2.raten, r2.fehler], [429, [], '429 dauerhaft']);
  const r3 = await messeEine(1, { fetchFn: async () => antwort(400, { error: { message: 'Variant not found' } }), key: 'k', store: '1' });
  ist('Fehlerantwort: Text bleibt, keine Rate', [r3.raten, /Variant not found/.test(r3.fehler)], [[], true]);
}

// ── Kommandozeile: schreibt NUR die Versanddatei, fremde Einträge bleiben, kein Schlüssel im Protokoll
{
  const d = mkdtempSync(join(tmpdir(), 'vm-'));
  const k = lade(19), erz = (p) => p;
  const p19 = erz(planeModell({ katalog: k, versand: versand('10.39', 3, 6, 999999), uebersetzung: testUebersetzung(k), bilder: bilderFuer(k) }, { jetzt: 'x', stufen: [1, 2] }));
  writeFileSync(join(d, '19.json'), JSON.stringify(p19));
  const p19kopie = { ...p19, printfulProductId: 5 }; writeFileSync(join(d, '5.json'), JSON.stringify(p19kopie));
  const vf = join(d, 'versand.json');
  const eigeneVariante = p19.varianten[p19.varianten.length - 1].printfulVariantId;
  writeFileSync(vf, JSON.stringify({ 19: versand('10.39', 3, 6, 999999), 5: { variante: eigeneVariante, http: 200, raten: [{ id: 'STANDARD', rateUsd: '1', tageMin: 1, tageMax: 2 }] }, 6: { variante: 1, raten: [{ id: 'X' }] } }));
  const zeilen = []; const gefragt = [];
  const f = async (url, o) => { gefragt.push(JSON.parse(o.body).items[0].variant_id); return antwort(200, { result: [{ id: 'STANDARD', rate: '12.34', minDeliveryDays: 4, maxDeliveryDays: 7 }] }); };
  const code = await main({ PLAENE: d, VERSAND: vf, PRINTFUL_API_KEY: 'GEHEIM', PRINTFUL_STORE_ID: '3', PAUSE_MS: '0' }, { fetch: f, pause: async () => {}, log: (z) => zeilen.push(z) });
  const nachher = JSON.parse(readFileSync(vf, 'utf8'));
  ist('Lauf: nur Modell 19 (fremde Rate) wird gemessen, Modell 5 (eigene Variante) nicht', [code, gefragt, nachher[19].variante, nachher[19].raten[0].rateUsd], [0, [eigeneVariante], eigeneVariante, '12.34']);
  ist('… die Einträge anderer Modelle bleiben unverändert', [nachher[5].raten[0].rateUsd, nachher[6].variante], ['1', 1]);
  wahr('… und im Protokoll steht kein Schlüssel', !zeilen.join('\n').includes('GEHEIM'));
  // Messung scheitert: alter Eintrag bleibt
  writeFileSync(vf, JSON.stringify({ 19: versand('10.39', 3, 6, 999999) }));
  await main({ PLAENE: d, VERSAND: vf, PRINTFUL_API_KEY: 'k', PRINTFUL_STORE_ID: '3', PAUSE_MS: '0', MODELLE: '19' }, { fetch: async () => antwort(400, { error: { message: 'kaputt' } }), pause: async () => {}, log: () => {} });
  ist('Messung scheitert: der alte Eintrag bleibt stehen', JSON.parse(readFileSync(vf, 'utf8'))[19].variante, 999999);
  ist('ohne Schlüssel oder Pflichtangaben: Exit 1, kein Netz', [await main({ PLAENE: d, VERSAND: vf }, { log: () => {}, fetch: async () => { throw new Error('Netz!'); } }), await main({ PLAENE: d, VERSAND: vf, PRINTFUL_API_KEY: 'k' }, { log: () => {} }), await main({}, { log: () => {} })], [1, 1, 1]);
  rmSync(d, { recursive: true, force: true });
}
ende();
