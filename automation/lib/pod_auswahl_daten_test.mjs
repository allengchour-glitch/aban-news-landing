// Tests für das Datenpaket «Selbst gestalten» (Laden, Kürzen, lesende Abfragen mit Attrappe, kein Netz). Lauf: /opt/node22/bin/node automation/lib/pod_auswahl_daten_test.mjs
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ladePaket, kuerzeProdukt, kuerzeRohKatalog, holeVersandRate, holeFehlendeRaten, pfGet, holeSkuIdentitaet, ohneKnoten, leseBestand, schreibeJson, katalogIdsAusSpec, farbenAusSpec, belegIdsAusSpec, DATEIEN, PAKET_DIR, baueSkuIndex, leseSkuIndex, kandidatenIds, SKU_INDEX_Q, SKU_INDEX_SUCHE, BESTAND_Q, OPTIONEN_FELDER, optionenAusAntwort, standAlterH, pruefeDatenAlter, pruefeNeueVarianten, DATEN_MAX_ALTER_H, ZUKUNFT_TOLERANZ_H } from './pod_auswahl_daten.mjs';
import { SPEC } from './pod_auswahl_spec.mjs';

let ok = 0, fehl = 0;
const ist = (n, a, b) => { const gleich = JSON.stringify(a) === JSON.stringify(b); if (gleich) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a).slice(0, 400)}\n   soll: ${JSON.stringify(b).slice(0, 400)}`); } };
const wahr = (n, c, info = '') => ist(n + (c ? '' : ' ' + info), !!c, true);
const antwort = (status, json, kopf = {}) => ({ status, ok: status >= 200 && status < 300, headers: { get: (k) => kopf[k.toLowerCase()] ?? null }, json: async () => json });
const keinePause = async () => {};

// ── Paket lesen
{
  const p = ladePaket();
  ist('Paket: alle sechs Dateien vorhanden', [Object.keys(DATEIEN).length, Object.values(DATEIEN).every((f) => existsSync(join(PAKET_DIR, f)))], [6, true]);
  ist('Paket: Stände 27.10.2026', [p.meta.katalog.stand, p.meta.versand.stand, p.meta.bestand.stand, p.meta.skuPruefung.stand, p.meta.skuIndex.stand], Array(5).fill('2026-10-27'));
  ist('Paket: SKU-Index hat 491 gelesene Produkte, nichts abgeschnitten, 14 Treffer-Nummern (8 Gildan-5000-T-Shirt, 6 Premium-Hoodie)', [p.meta.skuIndex.produkteGelesen, p.skuIndexAbgeschnitten, Object.keys(p.skuIndex).length], [491, [], 14]);
  ist('Paket: SKU-Index enthält keine eigenen Handles und nur Nummern, die der Plan anlegen könnte', [Object.values(p.skuIndex).flat().some((x) => SPEC.some((s) => s.handle === x.handle)), Object.keys(p.skuIndex).every((k) => kandidatenIds(SPEC, p.katalog).includes(Number(k)))], [false, true]);
  ist('Paket: vier vorhandene Produkte im Bestand (die fünfte, Samsung, ist neu)', Object.keys(p.bestand).sort(), ['hardcase-iphone®-hulle-mit-magsafe®-selbst-gestalten', 'poster-zum-selbstgestalten', 'unisex-hoodie-selbst-gestalten', 'unisex-t-shirt-selbst-gestalten']);
  ist('Paket: Katalog = Spezifikation (alle gebrauchten Printful-Produkte)', katalogIdsAusSpec(SPEC).every((id) => p.katalog[String(id)]), true);
  ist('Paket: Beschreibungen = alle Beleg-Produkte (auch die MagSafe-Vergleichsprodukte 798 und 799)', [belegIdsAusSpec(SPEC).every((id) => p.beschreibungen[String(id)]?.desc), belegIdsAusSpec(SPEC).includes(799)], [true, true]);
  ist('Paket: Textilien nur in White gespeichert', ['146', '380', '821', '71', '438', '456', '586'].every((id) => p.katalog[id].variants.every((v) => v.color === 'White')), true);
  ist('Paket: Farben aus der Spezifikation', farbenAusSpec(SPEC), { 146: 'White', 380: 'White', 821: 'White', 71: 'White', 438: 'White', 456: 'White', 586: 'White' });
  ist('Paket: jede vorhandene SKU ist bei Printful geprüft', Object.values(p.bestand).every((b) => b.variants.every((v) => p.skuPruefung[String(v.sku.split('_').pop())]?.produkt)), true);
  let m = ''; try { ladePaket({ dir: '/nicht/da' }); } catch (e) { m = e.message; }
  wahr('Paket: fehlende Datei → klarer Fehler', /Datei fehlt/.test(m));
}

// ── Kürzen
{
  const roh = { 71: { id: 71, title: 'T', type: 'T-SHIRT', files: ['default:Print file'], variants: [
    { id: 1, name: 'a', size: 'S', color: 'White', price: '11.92', in_stock: true, avail: { EU: 'in_stock', US: 'in_stock' } },
    { id: 2, name: 'b', size: 'S', color: 'Black', price: '11.92', in_stock: true, avail: { US: 'in_stock' } },
    { id: 3, name: 'c', size: 'M', color: 'White', price: '11.92', in_stock: true } ] } };
  const k = kuerzeRohKatalog(roh, [71], { 71: 'White' })['71'];
  ist('kuerzeRohKatalog: nur White, EU-Lager als «eu» (fehlt → null)', k.variants.map((v) => [v.id, v.eu]), [[1, 'in_stock'], [3, null]]);
  ist('kuerzeRohKatalog: ohne Farbe alle Varianten', kuerzeRohKatalog(roh, [71])['71'].variants.length, 3);
  let m = ''; try { kuerzeRohKatalog(roh, [99]); } catch (e) { m = e.message; }
  wahr('kuerzeRohKatalog: unbekanntes Produkt → Fehler', /99/.test(m));
  const api = { product: { id: 5, title: 'P', type: 'MUG', files: [{ id: 'default', title: 'Print file' }, { id: 'preview', title: 'Mockup' }] }, variants: [{ id: 9, name: 'n', size: '11 oz', color: null, price: '5.00', in_stock: true, availability_status: [{ region: 'US', status: 'in_stock' }, { region: 'EU', status: 'supplier_out_of_stock' }] }] };
  const kp = kuerzeProdukt(api);
  ist('kuerzeProdukt: Dateiliste «id:Titel», EU-Status aus availability_status', [kp.files, kp.variants[0].eu, kp.type], [['default:Print file', 'preview:Mockup'], 'supplier_out_of_stock', 'MUG']);
}

// ── Versandrate: STANDARD gewinnt, sonst die billigste; Fehler und 429
{
  let aufrufe = [];
  const f = (liste, status = 200) => async (url, opt) => { aufrufe.push({ url, opt }); return antwort(status, status === 200 ? { result: liste } : { result: 'kaputt', error: { message: 'bad' } }); };
  const r1 = await holeVersandRate(6875, { key: 'K', store: 'S', fetchFn: f([{ id: 'PRINTFUL_FAST', name: 'Fast', rate: '25.00', minDeliveryDays: 2, maxDeliveryDays: 3 }, { id: 'STANDARD', name: 'Flat Rate', rate: '10.49', minDeliveryDays: 3, maxDeliveryDays: 6 }]), heute: '2026-10-27' });
  ist('Versand: STANDARD gewählt, auch wenn nicht die erste', [r1.usd, r1.id, r1.tage, r1.gemessen], [10.49, 'STANDARD', [3, 6], '2026-10-27']);
  const b = JSON.parse(aufrufe[0].opt.body);
  ist('Versand: Anfrage CH 8001, eine Variante, USD, Kopfzeilen', [b.recipient, b.items, b.currency, aufrufe[0].opt.headers['X-PF-Store-Id'], aufrufe[0].opt.headers.Authorization, aufrufe[0].opt.method], [{ country_code: 'CH', zip: '8001' }, [{ variant_id: 6875, quantity: 1 }], 'USD', 'S', 'Bearer K', 'POST']);
  const r2 = await holeVersandRate(1, { fetchFn: f([{ id: 'A', rate: '9.00' }, { id: 'B', rate: '7.00' }]) });
  ist('Versand: ohne STANDARD die billigste', [r2.usd, r2.id], [7, 'B']);
  ist('Versand: HTTP-Fehler → {fehler}', Object.keys(await holeVersandRate(1, { fetchFn: f([], 400) })), ['fehler']);
  ist('Versand: leere Liste → {fehler}', (await holeVersandRate(1, { fetchFn: f([]) })).fehler, 'keine Versandart für CH');
  let n = 0; const fetch429 = async () => (++n < 3 ? antwort(429, {}, { 'retry-after': '1' }) : antwort(200, { result: [{ id: 'STANDARD', rate: '8.00' }] }));
  const pausen = []; const r3 = await holeVersandRate(1, { fetchFn: fetch429, pause: async (ms) => { pausen.push(ms); } });
  ist('Versand: 429 → wartet Retry-After + 1 s und versucht es erneut', [r3.usd, n, pausen], [8, 3, [2000, 2000]]);
  n = 0; const r4 = await holeVersandRate(1, { fetchFn: async () => { n++; return antwort(429, {}); }, pause: keinePause, versuche: 3 });
  ist('Versand: dauerhaft 429 → {fehler} nach 3 Versuchen', [n, /429/.test(r4.fehler)], [3, true]);
}
// ── fehlende Raten nachholen: Zwischenspeicher wird nicht erneut gefragt, Pause je Aufruf
{
  const raten = { 1: { usd: 5 }, 2: { fehler: 'alt' } }; const gefragt = []; const pausen = []; let gesichert = 0;
  const fetchFn = async (url, opt) => { const v = JSON.parse(opt.body).items[0].variant_id; gefragt.push(v); return antwort(200, { result: [{ id: 'STANDARD', rate: '7.29' }] }); };
  const n = await holeFehlendeRaten([1, 2, 3], raten, { fetchFn, pause: async (ms) => { pausen.push(ms); }, sichern: () => { gesichert++; } });
  ist('Raten: vorhandene (1) und Fehlerraten ohne «erneut» (2) werden nicht gefragt, nur 3', [gefragt, n, pausen, gesichert], [[3], 1, [900], 1]);
  const n2 = await holeFehlendeRaten([1, 2, 3], raten, { fetchFn, pause: keinePause, erneut: true });
  ist('Raten: mit erneut=true wird die Fehlerrate (2) neu gefragt', [n2, raten[2].usd], [1, 7.29]);
}
// ── GET mit 429
{
  let n = 0; const r = await pfGet('/products/variant/1', { key: 'K', fetchFn: async (url, opt) => (++n < 2 ? antwort(429, {}, { 'retry-after': '3' }) : antwort(200, { result: 1 })), pause: keinePause });
  ist('pfGet: 429 dann 200', [r.status, r.j.result, n], [200, 1, 2]);
  const id = await holeSkuIdentitaet(20688, { key: 'K', fetchFn: async () => antwort(200, { result: { variant: { id: 20688, name: 'MagSafe (Matte / iPhone 14)', color: 'Matte', size: 'iPhone 14', price: '16.27', in_stock: true }, product: { id: 798, type: 'PHONE-CASE' } } }) });
  ist('SKU-Identität', id, { produkt: 798, typ: 'PHONE-CASE', name: 'MagSafe (Matte / iPhone 14)', farbe: 'Matte', groesse: 'iPhone 14', preisUsd: 16.27, imLager: true });
  ist('SKU-Identität bei 404 → {fehler}', Object.keys(await holeSkuIdentitaet(1, { key: 'K', fetchFn: async () => antwort(404, {}) })), ['fehler']);
}
// ── Shopify lesen (Attrappe)
{
  const knoten = { id: 'gid://p/1', handle: 'h', title: 'T', status: 'ACTIVE', productType: 'Poster', vendor: 'V', tags: ['a'], descriptionHtml: '<p>x</p>', seo: { title: null, description: 'd' },
    options: [{ id: 'gid://shopify/ProductOption/1', name: 'Grösse', position: 1, optionValues: [{ id: 'gid://shopify/ProductOptionValue/1', name: 'A', hasVariants: true }, { id: 'gid://shopify/ProductOptionValue/2', name: 'B', hasVariants: true }] }], variants: { edges: [{ node: { id: 'v1', sku: 's1', price: '1.00', inventoryPolicy: 'CONTINUE', selectedOptions: [{ name: 'Grösse', value: 'A' }] } }] } };
  const b = await leseBestand(async (q, v) => ({ data: { productByIdentifier: v.h === 'h' ? knoten : null } }), ['h']);
  ist('leseBestand: Form des Datenpakets', b.h, ohneKnoten(knoten));
  ist('ohneKnoten: Optionen im Datenpaket als {name, position, values} (Namen aller Werte, ohne ids)', b.h.options, [{ name: 'Grösse', position: 1, values: ['A', 'B'] }]);
  ist('ohneKnoten: Varianten ohne Kanten', b.h.variants, [{ id: 'v1', sku: 's1', price: '1.00', inventoryPolicy: 'CONTINUE', selectedOptions: [{ name: 'Grösse', value: 'A' }] }]);
  let m = ''; try { await leseBestand(async () => ({ data: { productByIdentifier: null } }), ['fehlt']); } catch (e) { m = e.message; }
  wahr('leseBestand: unbekanntes Produkt → Fehler mit Handle', /fehlt/.test(m));
  m = ''; try { await leseBestand(async () => ({ errors: [{ message: 'x' }] }), ['h']); } catch (e) { m = e.message; }
  wahr('leseBestand: GraphQL-Fehler → Fehler', /Shopify-Abfrage/.test(m));
}
// ── Bestandsabfrage: productByIdentifier (productByHandle ist veraltet) und Metafeld «Material»
{
  wahr('BESTAND_Q: productByIdentifier(identifier:{handle:$h}) statt productByHandle', /productByIdentifier\(identifier:\{handle:\$h\}\)/.test(BESTAND_Q) && !/productByHandle/.test(BESTAND_Q));
  wahr('BESTAND_Q: liest das Metafeld mm-google-shopping.material als materialMetafeld', /materialMetafeld: metafield\(namespace:"mm-google-shopping", key:"material"\)\{ value \}/.test(BESTAND_Q));
  const knoten = { id: 'p', handle: 'h', title: 'T', status: 'ACTIVE', productType: 'x', vendor: 'V', tags: [], descriptionHtml: '', seo: {}, options: [], variants: { edges: [] } };
  ist('ohneKnoten: Metafeld gesetzt → Text, leer → null, nicht gelesen → Schlüssel fehlt (nicht null!)',
    [ohneKnoten({ ...knoten, materialMetafeld: { value: 'Papier (matt)' } }).materialMetafeld, ohneKnoten({ ...knoten, materialMetafeld: null }).materialMetafeld, 'materialMetafeld' in ohneKnoten(knoten)], ['Papier (matt)', null, false]);
}
// ── Optionen werden über optionValues gelesen (Runde 4): ein Wert OHNE Variante fehlt in Shopifys ProductOption.values, steht aber in optionValues
{
  const roh = [{ id: 'o1', name: 'Material', position: 1, optionValues: [{ id: 'a', name: 'A', hasVariants: true }, { id: 'b', name: 'B', hasVariants: false }] }];
  ist('optionenAusAntwort: values = Namen ALLER optionValues (auch B ohne Variante), optionValues behält id und hasVariants', optionenAusAntwort(roh), [{ id: 'o1', name: 'Material', position: 1, values: ['A', 'B'], optionValues: [{ id: 'a', name: 'A', hasVariants: true }, { id: 'b', name: 'B', hasVariants: false }] }]);
  const knoten = { id: 'p', handle: 'h', title: 'T', status: 'ACTIVE', productType: 'x', vendor: 'V', tags: [], descriptionHtml: '', seo: {}, variants: { edges: [] } };
  ist('ohneKnoten: Datenpaket-Form {name, position, values} mit allen vorhandenen Werten (auch dem leeren B), ohne ids', ohneKnoten({ ...knoten, options: roh }).options, [{ name: 'Material', position: 1, values: ['A', 'B'] }]);
  ist('ohneKnoten: ein Shopify-`values` in der Antwort wird nicht benutzt (hier fehlt B darin, er bleibt trotzdem vorhanden)', ohneKnoten({ ...knoten, options: [{ ...roh[0], values: ['A'] }] }).options[0].values, ['A', 'B']);
  let m = ''; try { optionenAusAntwort([{ name: 'Material', values: ['A'] }], 'Test'); } catch (e) { m = e.message; }
  wahr('optionenAusAntwort: Antwort ohne optionValues (nur Shopify-values) → Fehler statt stillem Rückgriff', /^Test: Option «Material» ohne optionValues/.test(m), m);
  m = ''; try { ohneKnoten({ ...knoten, options: [{ name: 'Grösse', position: 1, values: ['S'] }] }); } catch (e) { m = e.message; }
  wahr('ohneKnoten: Antwort im alten Format (nur values) → Fehler, nennt das Produkt', /^Produkt h: Option «Grösse» ohne optionValues/.test(m), m);
  ist('optionenAusAntwort: keine Optionen → leer', [optionenAusAntwort([]), optionenAusAntwort(undefined)], [[], []]);
  const b = await leseBestand(async () => ({ data: { productByIdentifier: { ...knoten, options: roh } } }), ['h']);
  ist('leseBestand: der leere Wert B steht im Bestand (Existenz), damit ihn der Plan sieht', b.h.options[0].values, ['A', 'B']);
  ist('OPTIONEN_FELDER: optionValues { id name hasVariants } und KEIN values (Schema: values nennt Werte ohne Variante nicht)', [OPTIONEN_FELDER, BESTAND_Q.includes(OPTIONEN_FELDER), /options\{[^}]*\bvalues\b/.test(BESTAND_Q)], ['options{ id name position optionValues{ id name hasVariants } }', true, false]);
  // Das Datenpaket (Stand 27.10.2026) bleibt unverändert: in den vier Bestandsprodukten trägt jeder Wert mindestens eine Variante, die Namen aus optionValues sind genau die bisherigen values
  const paket = ladePaket();
  for (const [h, p] of Object.entries(paket.bestand)) {
    const rohP = { ...p, options: p.options.map((o, i) => ({ id: 'o' + i, name: o.name, position: o.position, optionValues: o.values.map((w) => ({ id: 'w' + w, name: w, hasVariants: p.variants.some((v) => v.selectedOptions.some((s) => s.name === o.name && s.value === w)) })) })),
      variants: { edges: p.variants.map((v) => ({ node: v })) } };
    ist(`Datenpaket ${h}: jeder Optionswert trägt eine Variante; über optionValues gelesen bleiben Optionen (und damit Plan und Hash) gleich`, [rohP.options.every((o) => o.optionValues.every((w) => w.hasVariants)), ohneKnoten(rohP).options], [true, p.options]);
  }
}
// ── Alter des Datenpakets (LIVE verweigert veraltete Daten)
{
  const jetzt = new Date('2026-10-30T00:00:00Z');
  ist('standAlterH: 27.10. 0 Uhr bis 30.10. 0 Uhr = 72 Stunden; ungültige Stände → null', [standAlterH('2026-10-27', jetzt), standAlterH('27.10.2026', jetzt), standAlterH(undefined, jetzt), standAlterH('2026-13-45', jetzt), standAlterH('', jetzt)], [72, null, null, null, null]);
  ist('Höchstalter vorgegeben 72 Stunden', DATEN_MAX_ALTER_H, 72);
  const meta = (st) => ({ katalog: { stand: st }, beschreibungen: { stand: st }, versand: { stand: st }, skuPruefung: { stand: st } });
  ist('pruefeDatenAlter: genau 72 Stunden alt ist noch erlaubt', pruefeDatenAlter(meta('2026-10-27'), { jetzt }), []);
  const alt = pruefeDatenAlter(meta('2026-10-27'), { jetzt: new Date('2026-10-30T00:00:01Z') });
  ist('pruefeDatenAlter: eine Sekunde mehr → alle vier Dateien zu alt, mit Datei und Alter', [alt.map((x) => x.datei), alt[0].alterH], [['katalog.json', 'beschreibungen.json', 'versand.json', 'sku_pruefung.json'], 72]);
  ist('pruefeDatenAlter: eine einzige alte Datei genügt (Versand von 2025)', pruefeDatenAlter({ ...meta('2026-10-29'), versand: { stand: '2025-01-01' } }, { jetzt }).map((x) => x.datei), ['versand.json']);
  ist('pruefeDatenAlter: fehlender oder unlesbarer Stand zählt als zu alt (nichts raten)', pruefeDatenAlter({ katalog: { stand: '2026-10-29' }, beschreibungen: {}, versand: { stand: 'gestern' } }, { jetzt }).map((x) => x.datei), ['beschreibungen.json', 'versand.json', 'sku_pruefung.json']);
  ist('pruefeDatenAlter: mit grösserer Grenze (ausdrücklich) wieder frisch genug', pruefeDatenAlter(meta('2026-10-01'), { jetzt, maxStunden: 24 * 40 }), []);
  ist('pruefeDatenAlter: das echte Datenpaket hat Stand und beschreibungen.stand', ladePaket().meta.beschreibungen.stand, '2026-10-27');
  // Stand in der Zukunft = NICHT frisch (wie lib/grind_dubletten_test.mjs «Stand in der Zukunft = nicht frisch»): ein Tippfehler im Jahr oder eine falsch gehende Uhr darf die Altersgrenze nicht umgehen
  const zuk = pruefeDatenAlter({ ...meta('2026-10-29'), katalog: { stand: '2099-01-01' } }, { jetzt });
  ist('pruefeDatenAlter: Jahr vertippt (2099) → nicht frisch, mit Datei, Zukunft im Grund, negatives Alter', [zuk.map((x) => x.datei), /Zukunft/.test(zuk[0]?.grund), zuk[0]?.alterH < 0], [['katalog.json'], true, true]);
  ist('pruefeDatenAlter: auch ein Datum nur einen Tag voraus (31.10. bei jetzt 30.10.) ist nicht frisch', pruefeDatenAlter(meta('2026-10-31'), { jetzt }).map((x) => x.datei), ['katalog.json', 'beschreibungen.json', 'versand.json', 'sku_pruefung.json']);
  ist('pruefeDatenAlter: Toleranz ZUKUNFT_TOLERANZ_H = 1 Stunde (Uhrenabweichung): 30 Minuten voraus ist frisch, 90 Minuten voraus nicht', [ZUKUNFT_TOLERANZ_H, pruefeDatenAlter(meta('2026-10-30'), { jetzt: new Date('2026-10-29T23:30:00Z') }).length, pruefeDatenAlter(meta('2026-10-30'), { jetzt: new Date('2026-10-29T22:30:00Z') }).length], [1, 0, 4]);
  ist('pruefeDatenAlter: heutiges Datum um 0:00 Uhr (Alter 0) ist frisch', pruefeDatenAlter(meta('2026-10-30'), { jetzt }), []);
  ist('standAlterH: nur ein Teil des Datums («2026-10», «2026») ist KEIN Stand (das Format wird geprüft, Date.parse allein nähme sie an)', [standAlterH('2026-10', jetzt), standAlterH('2026', jetzt), standAlterH('2026-10-27T10:00:00Z', jetzt)], [null, null, null]);
}
// ── Gegenprüfung der neuen Varianten bei Printful (nur GET)
{
  const plan = { produkte: [{ neu: [{ pf: 1, sku: 'S_1', einkaufUsd: 10 }, { pf: 2, sku: 'S_2', einkaufUsd: 12.5 }, { pf: 1, sku: 'S_1', einkaufUsd: 10 }] }, { neu: [{ pf: 3, sku: 'S_3', einkaufUsd: 5 }] }] };
  const var1 = (id, price, eu, extra = {}) => ({ id, price, in_stock: true, availability_status: [{ region: 'US', status: 'in_stock' }, { region: 'EU', status: eu }], ...extra });
  const holen = (tabelle) => { const aufrufe = []; const fetchFn = async (url, opt) => { aufrufe.push({ url, methode: opt?.method || 'GET' }); const id = Number(String(url).split('/').pop()); const t = tabelle[id]; return t === undefined ? antwort(404, {}) : antwort(200, { result: { variant: t } }); }; return { fetchFn, aufrufe }; };
  const a = holen({ 1: var1(1, '10.00', 'in_stock'), 2: var1(2, '12.50', 'in_stock'), 3: var1(3, '5.00', 'in_stock') });
  ist('Gegenprüfung: alles wie im Plan → keine Abweichung; jede Nummer nur einmal gelesen, nur GET', [await pruefeNeueVarianten(plan, { key: 'K', fetchFn: a.fetchFn, pause: keinePause }), a.aufrufe.map((x) => x.methode + ' ' + x.url.split('/').slice(-3).join('/'))], [[], ['GET products/variant/1', 'GET products/variant/2', 'GET products/variant/3']]);
  const b = holen({ 1: var1(1, '11.20', 'in_stock'), 2: var1(2, '12.50', 'supplier_out_of_stock'), 3: undefined });
  const ab = await pruefeNeueVarianten(plan, { key: 'K', fetchFn: b.fetchFn, pause: keinePause });
  ist('Gegenprüfung: Preis geändert, EU-Lager weg, Variante nicht lesbar → drei Abweichungen mit Nummer und SKU', ab, ['Printful 1 (S_1): Einkauf jetzt 11.20 USD, im Plan 10.00 USD', 'Printful 2 (S_2): Lager EU jetzt supplier_out_of_stock, im Plan lieferbar', 'Printful 3 (S_3): nicht lesbar (HTTP 404)']);
  const c = holen({ 1: { id: 1, price: '10.00', in_stock: false }, 2: { id: 2, price: '12.50', in_stock: true }, 3: var1(3, '5.00', 'in_stock') });
  ist('Gegenprüfung: ohne availability_status zählt in_stock', await pruefeNeueVarianten(plan, { key: 'K', fetchFn: c.fetchFn, pause: keinePause }), ['Printful 1 (S_1): Lager EU jetzt nicht lieferbar, im Plan lieferbar']);
  ist('Gegenprüfung: Plan ohne neue Varianten → keine Anfrage', (await pruefeNeueVarianten({ produkte: [{ neu: [] }] }, { key: 'K', fetchFn: async () => { throw new Error('darf nicht aufgerufen werden'); }, pause: keinePause })), []);
}
// ── Schreiben atomar: keine halbe Datei
{
  const d = mkdtempSync(join(tmpdir(), 'pod-daten-')); const f = join(d, 'x', 'a.json');
  schreibeJson(f, { a: 1 });
  ist('schreibeJson: Datei da, keine .tmp-Datei übrig', [JSON.parse(readFileSync(f, 'utf8')), existsSync(f + '.tmp')], [{ a: 1 }, false]);
  rmSync(d, { recursive: true, force: true });
}

// ── SKU-Index (Shopify, nur Abfrage)
{
  const knoten = (handle, status, skus, extra = {}) => ({ handle, title: handle.toUpperCase(), status, tags: ['b', 'a'], variants: { pageInfo: { hasNextPage: !!extra.mehr }, edges: skus.map(([sku, preis, opt]) => ({ node: { sku, price: preis, selectedOptions: [{ name: 'Grösse', value: opt || 'S' }] } })) } });
  const roh = [knoten('fremd', 'ACTIVE', [['1_100', '10.00'], ['1_101', '11.00'], ['x_nicht-numerisch', '5.00'], ['', '1.00']]), knoten('eigen', 'ACTIVE', [['2_100', '9.00']]), knoten('gross', 'DRAFT', [['3_102', '12.00', 'M']], { mehr: true })];
  const r = baueSkuIndex(roh, [100, 102], ['eigen']);
  ist('baueSkuIndex: nur gesuchte Nummern, eigene Handles ignoriert, Tags sortiert, Optionen als Text', r.treffer, { 100: [{ handle: 'fremd', titel: 'FREMD', status: 'ACTIVE', tags: ['a', 'b'], sku: '1_100', preis: '10.00', optionen: 'S' }], 102: [{ handle: 'gross', titel: 'GROSS', status: 'DRAFT', tags: ['a', 'b'], sku: '3_102', preis: '12.00', optionen: 'M' }] });
  ist('baueSkuIndex: Produkt mit mehr als 100 Varianten wird als «abgeschnitten» gemeldet', r.abgeschnitten, ['gross']);
  ist('baueSkuIndex: leer → leer', baueSkuIndex([], [1]), { treffer: {}, abgeschnitten: [] });
  // alle Seiten lesen
  const seiten = [{ data: { products: { pageInfo: { hasNextPage: true, endCursor: 'c1' }, edges: [{ node: roh[0] }] } } }, { data: { products: { pageInfo: { hasNextPage: false, endCursor: null }, edges: [{ node: roh[1] }, { node: roh[2] }] } } }];
  const aufrufe = []; let i = 0;
  const idx = await leseSkuIndex(async (q, v) => { aufrufe.push([q === SKU_INDEX_Q, v.q, v.c]); return seiten[i++]; }, [100, 101, 102], ['eigen']);
  ist('leseSkuIndex: liest beide Seiten mit Cursor, Suche wie bei der Prüfung', [aufrufe, idx.produkteGelesen, Object.keys(idx.treffer)], [[[true, SKU_INDEX_SUCHE, null], [true, SKU_INDEX_SUCHE, 'c1']], 3, ['100', '101', '102']]);
  wahr('Suche deckt die POD-Tags und SKUs mit Unterstrich ab', /tag:wunschdesign/.test(SKU_INDEX_SUCHE) && /printful_personalized_product/.test(SKU_INDEX_SUCHE) && /sku:\*_\*/.test(SKU_INDEX_SUCHE));
  wahr('Abfrage liest nur (query), mit Tags und Varianten-Seiteninfo', /^query/.test(SKU_INDEX_Q) && !/mutation/i.test(SKU_INDEX_Q) && /tags/.test(SKU_INDEX_Q) && /hasNextPage/.test(SKU_INDEX_Q));
  let m = ''; try { await leseSkuIndex(async () => ({ errors: [{ message: 'Throttled' }] }), [1]); } catch (e) { m = e.message; }
  wahr('leseSkuIndex: GraphQL-Fehler → Fehler (kein unvollständiger Index)', /SKU-Index-Abfrage/.test(m));
  m = ''; try { await leseSkuIndex(async () => ({ data: {} }), [1]); } catch (e) { m = e.message; }
  wahr('leseSkuIndex: Antwort ohne products → Fehler', /ohne products/.test(m));
  // kandidatenIds: nur Varianten hinter NEUEN Materialien
  const kat = { 3: { variants: [{ id: 1 }, { id: 2 }] }, 71: { variants: [{ id: 9 }] } };
  const spec = [{ materialien: [{ wert: 'a', bestand: true, printfulProdukt: 71 }, { wert: 'b', printfulProdukt: 3 }] }];
  ist('kandidatenIds: Katalogvarianten der neuen Materialien, nicht die des vorhandenen', kandidatenIds(spec, kat), [1, 2]);
  ist('kandidatenIds mit echten Daten: ohne Bella-3001-Nummern 4011–4015 (das vorhandene T-Shirt-Material)', [4011, 4012, 4013, 4014, 4015].some((id) => kandidatenIds(SPEC, ladePaket().katalog).includes(id)), false);
}

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
