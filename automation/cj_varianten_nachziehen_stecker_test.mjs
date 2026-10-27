// plane() in cj_varianten_nachziehen.mjs: Fremdstecker-Varianten (US/UK/AU/JP) dürfen nie angelegt werden. Shop und CJ sind nachgebildet (kein Netz).
import { plane } from './cj_varianten_nachziehen.mjs';
import { rmSync } from 'node:fs';
let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };

const SKU = '260505090828160';
const shopProdukt = (handle, sku = SKU) => ({ productByHandle: { id: 'gid://shopify/Product/1', title: 'Testgerät', status: 'ACTIVE', handle, tags: [], descriptionHtml: '', options: [{ id: 'o', name: 'Title', values: ['Default Title'] }],
  variantsCount: { count: 1 }, mediaCount: { count: 1 }, variants: { nodes: [{ id: 'gid://shopify/ProductVariant/1', sku, price: '19.90', inventoryItem: { id: 'i', unitCost: { amount: '5' } } }] }, media: { nodes: [] } } });
const cjAntwort = (keyNames, keys) => ({ code: 200, result: true, message: 'Success', data: { pid: SKU, productKeyEn: keyNames, productNameEn: 'Test device',
  variants: keys.map((k, i) => ({ vid: 'vid' + i, variantSku: 'CJTEST' + i, variantKey: k, variantSellPrice: 5, variantWeight: 200, variantImage: '' })) } });
const echtesFetch = globalThis.fetch;
const handles = [];
async function lauf(handle, keyNames, keys, sku = SKU) {
  handles.push(handle);
  globalThis.fetch = async () => ({ status: 200, json: async () => cjAntwort(keyNames, keys) });
  try { return await plane({ q: async () => shopProdukt(handle, sku), cj: 'token', handle, tmp: '/tmp' }); } finally { globalThis.fetch = echtesFetch; }
}
process.env.MAX_VARIANTEN = '1';   // Zählprobe: ohne Filter meldet plane() «viele CJ-Varianten (n > 1)», mit Filter eine kleinere Zahl bzw. «nur 1 Variante»

const A = await lauf('zz-stecker-test-a', 'Color-Electrical outlet', ['White-US', 'Pink-US', 'Blue-US']);
ist('nur US-Varianten: übersprungen mit Grund «nur Fremdstecker»', [A.ergebnis, /^nur Fremdstecker/.test(A.grund)], ['UEBERSPRUNGEN', true]);
const B = await lauf('zz-stecker-test-b', 'Color-Electrical outlet', ['Black-US', 'Black-EU']);
ist('US + EU: US wird verworfen, es bleibt EINE von zwei CJ-Varianten → die mehrdeutige pid-SKU bekommt die Nummer der EU-Variante (27.10.2026, #1029)',
  [B.ergebnis, B.alteSku, B.neueSku, B.vid, B.anzahlCj, B.produktId, B.varianteId], ['SKU_NACHZIEHEN', SKU, 'CJTEST1', 'vid1', 2, 'gid://shopify/Product/1', 'gid://shopify/ProductVariant/1']);
const C = await lauf('zz-stecker-test-c', 'Color-Electrical outlet', ['Black-US', 'Black-EU', 'White-EU', 'White-UK']);
ist('US/UK + zwei EU: es bleiben zwei Varianten (2 > Zählgrenze 1)', /viele CJ-Varianten \(2 > 1\)/.test(C.grund), true);
const D = await lauf('zz-stecker-test-d', 'Color', ['Black', 'White', 'Red']);
ist('Gegenprobe: Farben ohne Stecker bleiben alle drei (3 > Zählgrenze 1)', /viele CJ-Varianten \(3 > 1\)/.test(D.grund), true);
const E = await lauf('zz-stecker-test-e', 'Size-Style', ['US Size 10-Main Ring', 'US Size 9-Main Ring']);
ist('Gegenprobe: Ringgrössen «US Size …» sind kein Stecker (2 > Zählgrenze 1)', /viele CJ-Varianten \(2 > 1\)/.test(E.grund), true);

const F = await lauf('zz-stecker-test-f', 'Color-Electrical outlet', ['Black-US', 'Black-EU', 'Black-UK', 'Black-AU']);
ist('Vier Stecker-Varianten (US/EU/UK/AU): es bleibt EU → SKU der EU-Variante', [F.ergebnis, F.neueSku, F.anzahlCj], ['SKU_NACHZIEHEN', 'CJTEST1', 4]);
const G = await lauf('zz-stecker-test-g', 'Color-Width', ['Black And Gray Belt With Hood-US', 'Black And Gray Belt With Hood-EU', 'Black And Gray Belt With Hood-UK', 'Black And Gray Belt With Hood-AU']);
ist('Heizdecke mit den echten CJ-Schlüsseln: EU bleibt', [G.ergebnis, G.neueSku, G.vid], ['SKU_NACHZIEHEN', 'CJTEST1', 'vid1']);
const H = await lauf('zz-stecker-test-h', 'Color-Electrical outlet', ['Black-US', 'Black-EU'], 'CJ-CJTEST1');
ist('Gegenprobe: die Shop-SKU nennt schon eine Variante (CJ-CJTEST1) → nichts nachzuziehen', [H.ergebnis, /^CJ führt nur 1 Variante/.test(H.grund)], ['UEBERSPRUNGEN', true]);
const I = await lauf('zz-stecker-test-i', 'Color', ['Black']);
ist('Gegenprobe: CJ führt wirklich nur EINE Variante → übersprungen, SKU bleibt', [I.ergebnis, /^CJ führt nur 1 Variante/.test(I.grund)], ['UEBERSPRUNGEN', true]);
const J = await lauf('zz-stecker-test-j', 'Color-Electrical outlet', ['Black-US', 'Black-UK', 'Black-AU']);
ist('Gegenprobe: nur Fremdstecker → bleibt «nur Fremdstecker», keine SKU-Änderung', [J.ergebnis, /^nur Fremdstecker/.test(J.grund)], ['UEBERSPRUNGEN', true]);

for (const h of handles) { try { rmSync(`/tmp/cj_fakten_cache/${h}.json`); } catch { /* nie geschrieben */ } }
console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
