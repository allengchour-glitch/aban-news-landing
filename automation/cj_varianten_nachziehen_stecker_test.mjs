// plane() in cj_varianten_nachziehen.mjs: Fremdstecker-Varianten (US/UK/AU/JP) dürfen nie angelegt werden. Shop und CJ sind nachgebildet (kein Netz).
import { plane } from './cj_varianten_nachziehen.mjs';
import { rmSync } from 'node:fs';
let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };

const SKU = '260505090828160';
const shopProdukt = (handle, sku = SKU) => ({ productByHandle: { id: 'gid://shopify/Product/1', title: 'Testgerät', status: 'ACTIVE', handle, tags: [], descriptionHtml: '', options: [{ id: 'o', name: 'Title', values: ['Default Title'] }],
  variantsCount: { count: 1 }, mediaCount: { count: 1 }, variants: { nodes: [{ id: 'gid://shopify/ProductVariant/1', sku, price: '19.90', inventoryItem: { id: 'i', unitCost: { amount: '5' } } }] }, media: { nodes: [] } } });
// Variantennummern in der Form, die die Bestell-Engine kennt (CJ + Buchstaben + Ziffernstamm): CJTEST10000, CJTEST10001, …
const cjAntwort = (keyNames, keys, preise) => ({ code: 200, result: true, message: 'Success', data: { pid: SKU, productKeyEn: keyNames, productNameEn: 'Test device',
  variants: keys.map((k, i) => ({ vid: 'vid' + i, variantSku: 'CJTEST1000' + i, variantKey: k, variantSellPrice: preise ? preise[i] : 5, variantWeight: 200, variantImage: '' })) } });
const echtesFetch = globalThis.fetch;
const handles = [];
// linien: Zahl der Frachtlinien CN→CH, die die nachgebildete Frachtabfrage meldet (0 = nicht versendbar, null = Antwort ohne Liste = unbekannt)
// linien als Objekt {vid0: 3, vid1: 0}: Linien je Variante (nicht angegebene = 0); `gefragt` sammelt die vids, für die die Fracht abgefragt wurde
const gefragt = [];
async function lauf(handle, keyNames, keys, sku = SKU, preise, linien = 3) {
  handles.push(handle); gefragt.length = 0;
  const liste = n => ({ code: 200, result: true, message: 'Success', data: n === null ? null : Array.from({ length: n }, (_, i) => ({ logisticName: 'Test-Post' + i, logisticPrice: 1.5, logisticAging: '10-15' })) });
  globalThis.fetch = async (url, init) => {
    if (!/freightCalculate/.test(String(url))) return { status: 200, json: async () => cjAntwort(keyNames, keys, preise) };
    const vid = JSON.parse(init.body).products[0].vid; gefragt.push(vid);
    return { status: 200, json: async () => liste(typeof linien === 'object' && linien !== null ? (linien[vid] ?? 0) : linien) };
  };
  try { return await plane({ q: async () => shopProdukt(handle, sku), cj: 'token', handle, tmp: '/tmp' }); } finally { globalThis.fetch = echtesFetch; }
}
process.env.MAX_VARIANTEN = '1';   // Zählprobe: ohne Filter meldet plane() «viele CJ-Varianten (n > 1)», mit Filter eine kleinere Zahl bzw. «nur 1 Variante»

const A = await lauf('zz-stecker-test-a', 'Color-Electrical outlet', ['White-US', 'Pink-US', 'Blue-US']);
ist('nur US-Varianten: übersprungen mit Grund «nur Fremdstecker»', [A.ergebnis, /^nur Fremdstecker/.test(A.grund)], ['UEBERSPRUNGEN', true]);
const B = await lauf('zz-stecker-test-b', 'Color-Electrical outlet', ['Black-US', 'Black-EU']);
ist('US + EU: US wird verworfen, es bleibt EINE von zwei CJ-Varianten → die mehrdeutige pid-SKU bekommt die Nummer der EU-Variante (27.10.2026, #1029)',
  [B.ergebnis, B.alteSku, B.neueSku, B.vid, B.anzahlCj, B.produktId, B.varianteId], ['SKU_NACHZIEHEN', SKU, 'CJTEST10001', 'vid1', 2, 'gid://shopify/Product/1', 'gid://shopify/ProductVariant/1']);
const C = await lauf('zz-stecker-test-c', 'Color-Electrical outlet', ['Black-US', 'Black-EU', 'White-EU', 'White-UK']);
ist('US/UK + zwei EU: es bleiben zwei Varianten (2 > Zählgrenze 1)', /viele CJ-Varianten \(2 > 1\)/.test(C.grund), true);
const D = await lauf('zz-stecker-test-d', 'Color', ['Black', 'White', 'Red']);
ist('Gegenprobe: Farben ohne Stecker bleiben alle drei (3 > Zählgrenze 1)', /viele CJ-Varianten \(3 > 1\)/.test(D.grund), true);
const E = await lauf('zz-stecker-test-e', 'Size-Style', ['US Size 10-Main Ring', 'US Size 9-Main Ring']);
ist('Gegenprobe: Ringgrössen «US Size …» sind kein Stecker (2 > Zählgrenze 1)', /viele CJ-Varianten \(2 > 1\)/.test(E.grund), true);

const F = await lauf('zz-stecker-test-f', 'Color-Electrical outlet', ['Black-US', 'Black-EU', 'Black-UK', 'Black-AU']);
ist('Vier Stecker-Varianten (US/EU/UK/AU): es bleibt EU → SKU der EU-Variante', [F.ergebnis, F.neueSku, F.anzahlCj], ['SKU_NACHZIEHEN', 'CJTEST10001', 4]);
const G = await lauf('zz-stecker-test-g', 'Color-Width', ['Black And Gray Belt With Hood-US', 'Black And Gray Belt With Hood-EU', 'Black And Gray Belt With Hood-UK', 'Black And Gray Belt With Hood-AU']);
ist('Heizdecke mit den echten CJ-Schlüsseln: EU bleibt', [G.ergebnis, G.neueSku, G.vid], ['SKU_NACHZIEHEN', 'CJTEST10001', 'vid1']);
const H = await lauf('zz-stecker-test-h', 'Color-Electrical outlet', ['Black-US', 'Black-EU'], 'CJ-CJTEST10001');
ist('Gegenprobe: die Shop-SKU nennt schon eine Variante (CJ-CJTEST10001) → nichts nachzuziehen', [H.ergebnis, /^CJ führt nur 1 Variante/.test(H.grund)], ['UEBERSPRUNGEN', true]);
const I = await lauf('zz-stecker-test-i', 'Color', ['Black']);
ist('Gegenprobe: CJ führt wirklich nur EINE Variante → übersprungen, SKU bleibt', [I.ergebnis, /^CJ führt nur 1 Variante/.test(I.grund)], ['UEBERSPRUNGEN', true]);
const J = await lauf('zz-stecker-test-j', 'Color-Electrical outlet', ['Black-US', 'Black-UK', 'Black-AU']);
ist('Gegenprobe: nur Fremdstecker → bleibt «nur Fremdstecker», keine SKU-Änderung', [J.ergebnis, /^nur Fremdstecker/.test(J.grund)], ['UEBERSPRUNGEN', true]);

// Auflagen der Prüfer (27.10.2026): was nicht eindeutig sicher ist, wird NICHT geschrieben, sondern als «SKU mehrdeutig» zurückgestellt
const K = await lauf('zz-stecker-test-k', 'Color-Electrical outlet', ['Black-US', 'Black-CN']);
ist('US + CN: «CN» ist kein ausdrücklicher Euro-Stecker → nicht schreiben', [K.ergebnis, /^SKU mehrdeutig: .*Euro-Stecker/.test(K.grund)], ['UEBERSPRUNGEN', true]);
const L = await lauf('zz-stecker-test-l', 'Color-Electrical outlet', ['Black-US', 'Black-EU'], SKU, [54.9, 66.17]);
ist('Massagegerät: EU-Version 21 % teurer als US → nicht schreiben (Shop-Preis hängt an der Ausgangsvariante)', [L.ergebnis, /^SKU mehrdeutig: .*\+21 %/.test(L.grund)], ['UEBERSPRUNGEN', true]);
const M = await lauf('zz-stecker-test-m', 'Color-Electrical outlet', ['Black-US', 'Black-EU'], SKU, [6.8, 6.3]);
ist('EU-Variante billiger als US → schreiben', [M.ergebnis, M.neueSku], ['SKU_NACHZIEHEN', 'CJTEST10001']);
const N = await lauf('zz-stecker-test-n', 'Color-Electrical outlet', ['Black-US', 'Black-EU'], 'unbekanntes-format');
ist('Gegenprobe: Shop-SKU in unbekannter Form → nichts nachzuziehen, alter Grund bleibt', [N.ergebnis, /^CJ führt nur 1 Variante/.test(N.grund)], ['UEBERSPRUNGEN', true]);

// Prüfung 27.10.2026 (echte Daten): die verworfenen Varianten dürfen sich nur im Stecker unterscheiden, und die bleibende muss nach CH versendbar sein
const O = await lauf('zz-stecker-test-o', 'Color-Electrical outlet', ['Black-US', 'Gray-US', 'Black-EU']);
ist('Black-US, Gray-US, Black-EU: die graue Variante unterscheidet sich nicht nur im Stecker → nicht schreiben', [O.ergebnis, /^SKU mehrdeutig: .*unterscheidet sich nicht nur im Stecker/.test(O.grund)], ['UEBERSPRUNGEN', true]);
const P = await lauf('zz-stecker-test-p', 'Color-Electrical outlet', ['Black-US', 'Black-EU'], SKU, undefined, 0);
ist('Euro-Variante ohne Frachtlinie nach CH (Babyphone) → nicht schreiben, endgültig «Lieferbarkeit nicht bewiesen»', [P.ergebnis, /^Lieferbarkeit nicht bewiesen/.test(P.grund), P.neueSku], ['UEBERSPRUNGEN', true, undefined]);
const Q = await lauf('zz-stecker-test-q', 'Color-Electrical outlet', ['Black-US', 'Black-EU'], SKU, undefined, null);
ist('Fracht nicht messbar (Antwort ohne Liste) → nicht schreiben, «Lieferbarkeit unbekannt»', [Q.ergebnis, /^Lieferbarkeit unbekannt/.test(Q.grund)], ['UEBERSPRUNGEN', true]);
const R = await lauf('zz-stecker-test-r', 'Color-Electrical outlet', ['Black-US', 'Black-EU'], SKU, undefined, 1);
ist('Gegenprobe: eine Frachtlinie genügt → schreiben', [R.ergebnis, R.neueSku], ['SKU_NACHZIEHEN', 'CJTEST10001']);

// Der Lieferbeweis gilt der BLEIBENDEN Variante, nicht irgendeiner (Mutant «fracht(cj, vsRoh[0].vid)» überlebte, solange die Attrappe alle vids gleich beantwortete)
const S = await lauf('zz-stecker-test-s', 'Color-Electrical outlet', ['Black-US', 'Black-EU'], SKU, undefined, { vid0: 3, vid1: 0 });
ist('US-Variante hat Linien, die bleibende EU-Variante keine → nicht schreiben; gefragt wurde nur die EU-Variante', [S.ergebnis, /^Lieferbarkeit nicht bewiesen/.test(S.grund), [...gefragt]], ['UEBERSPRUNGEN', true, ['vid1']]);
const U = await lauf('zz-stecker-test-u', 'Color-Electrical outlet', ['Black-US', 'Black-EU'], SKU, undefined, { vid0: 0, vid1: 3 });
ist('US-Variante ohne Linie, die bleibende EU-Variante mit Linien → schreiben (vid der EU-Variante)', [U.ergebnis, U.vid, [...gefragt]], ['SKU_NACHZIEHEN', 'vid1', ['vid1']]);

for (const h of handles) { try { rmSync(`/tmp/cj_fakten_cache/${h}.json`); } catch { /* nie geschrieben */ } }
console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
