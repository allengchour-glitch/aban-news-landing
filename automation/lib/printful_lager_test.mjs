// Tests für die reine Logik des Printful-Lager-Wächters (automation/lib/printful_lager.mjs). Kein Netz, keine Zeit, keine Zufallswerte.
// Lauf: /opt/node22/bin/node automation/lib/printful_lager_test.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  STATUS_LIEFERBAR, REGELN, TAG_AUS, parseSku, istPodProdukt, istFremdeWare, variantenStatus, signatur, modellLesen, testKandidaten, rateAuswerten, rateUrteil,
  pfErlaubt, brauchtRate, modellUrteil, katalogIndex, ausblendenBauen, ausblendenText, ausblendenPruefen, ausblendenGleich, tageSeit, vorzustandLesen, shopModelle, sperreMoeglich,
  shopPlan, bremsen, ledgerZeile, ledgerLesen, REAKTIV_MIN_ANTEIL,
} from './printful_lager.mjs';

let n = 0;
const ok = (b, t) => { assert.ok(b, t); n++; };
const gleich = (a, b, t) => { assert.deepStrictEqual(a, b, t); n++; };

const st = (m) => Object.entries(m).map(([region, status]) => ({ region, status }));
const V = (id, m = { EU: 'in_stock', US: 'in_stock' }) => ({ id, availability_status: st(m) });
const antwort = (id, varianten, product = {}) => ({ status: 200, json: { code: 200, result: { product: { id, title: 'Modell ' + id, is_discontinued: false, ...product }, variants: varianten } } });
const AUS = { EU: 'supplier_out_of_stock', US: 'supplier_out_of_stock' };

// ── SKU und Fremdware
gleich(parseSku('9365183_1320'), { shopNr: '9365183', variantId: 1320 }, 'SKU Nummer_Variante');
for (const s of ['fortura-12345', 'CJJT1565130', 'WM-TRIKOT-RO_1', 'LS518_13097', '9000001_', '_12', '12_ab', '', null, undefined, '12_3_4', ' 12_3 x']) gleich(parseSku(s), s === ' 12_3 x' ? null : null, `SKU ${s} wird nie geraten`);
gleich(parseSku(' 12_3 '), { shopNr: '12', variantId: 3 }, 'Leerraum am Rand wird entfernt');
ok(istPodProdukt({ tags: ['wunschdesign'], variants: [{ sku: '1_2' }] }), 'Tag wunschdesign genügt');
ok(istPodProdukt({ tags: ['Printful_Personalized_Product'], variants: [] }), 'Tag ohne Beachtung der Schreibweise');
ok(!istPodProdukt({ tags: ['mode'], variants: [{ sku: '1_2' }] }), 'ohne POD-Tag kein POD-Produkt');
ok(!istPodProdukt({ tags: ['wunschdesign', 'fortura'], variants: [] }), 'Fortura-Tag schliesst aus');
ok(!istPodProdukt({ tags: ['wunschdesign', 'cj-real'], variants: [] }), 'CJ-Tag schliesst aus');
ok(!istPodProdukt({ tags: ['wunschdesign'], variants: [{ sku: 'fortura-9' }] }), 'Fortura-SKU schliesst aus');
ok(!istPodProdukt({ tags: ['wunschdesign'], variants: [{ sku: 'CJJT1' }] }), 'CJ-SKU schliesst aus');
ok(istFremdeWare({ tags: ['ch-lager'], variants: [] }), 'ch-lager ist Fremdware');
ok(!istFremdeWare({ tags: ['tasse'], variants: [{ sku: '5_6' }] }), 'normale POD-Ware ist keine Fremdware');

// ── Printful wird nur gelesen
ok(pfErlaubt('GET', '/products/19') && pfErlaubt('POST', '/shipping/rates'), 'erlaubt: Modell lesen und Preisauskunft');
for (const [m, pf_] of [['POST', '/orders'], ['POST', '/products/19'], ['GET', '/orders'], ['GET', '/products/19/sizes'], ['GET', '/products'], ['PUT', '/products/19'], ['DELETE', '/products/19'], ['GET', '/products/abc'], ['GET', '/products/19?x=1'], ['POST', '/shipping/rates/x'], ['GET', '/shipping/rates'], ['POST', '/orders/123/confirm'], ['GET', '/mockup-generator/create-task/19'], ['POST', undefined]]) ok(!pfErlaubt(m, pf_), `verboten: ${m} ${pf_}`);

// ── Variantenstatus und Signatur
gleich(variantenStatus(V(1)), { art: 'ok', regionen: ['EU', 'US'] }, 'lieferbar');
gleich(variantenStatus(V(1, { EU: 'stocked_on_demand' })), { art: 'ok', regionen: ['EU'] }, 'stocked_on_demand zählt als lieferbar');
gleich(variantenStatus(V(1, AUS)), { art: 'aus', regionen: [] }, 'überall ausverkauft');
gleich(variantenStatus({ id: 1, availability_status: [] }), { art: 'aus', regionen: [] }, 'leere Liste = ausverkauft (wie die Inventur vom 05.11.)');
gleich(variantenStatus({ id: 1 }), { art: 'unbekannt', regionen: [] }, 'fehlendes Feld = unbekannt, NICHT ausverkauft');
gleich(variantenStatus({ id: 1, availability_status: 'x' }).art, 'unbekannt', 'Feld ohne Liste = unbekannt');
gleich(variantenStatus({ availability_status: [] }).art, 'ungueltig', 'Variante ohne Nummer ist ungültig');
gleich(variantenStatus(null).art, 'ungueltig', 'null ist ungültig');
gleich(variantenStatus({ id: 1, availability_status: [{ region: 'EU', status: 'in_stock' }, { region: 'EU', status: 'in_stock' }, null, { status: 'in_stock' }] }).regionen, ['EU'], 'doppelte, leere und regionslose Einträge werden ignoriert');
ok(STATUS_LIEFERBAR.has('in_stock') && STATUS_LIEFERBAR.has('stocked_on_demand') && !STATUS_LIEFERBAR.has('supplier_out_of_stock'), 'lieferbare Status');
{
  const a = [{ id: 1, art: 'ok', regionen: ['EU'] }, { id: 2, art: 'aus', regionen: [] }];
  gleich(signatur(a), signatur([...a].reverse()), 'Signatur hängt nicht von der Reihenfolge ab');
  ok(signatur(a) !== signatur([{ id: 1, art: 'ok', regionen: ['EU'] }, { id: 2, art: 'ok', regionen: ['US'] }]), 'Signatur ändert sich mit dem Status');
  ok(/^[0-9a-f]{16}$/.test(signatur(a)), 'Signatur ist 16 Hexzeichen');
  ok(signatur([{ id: 1, art: 'ok', regionen: ['EU'] }]) !== signatur([{ id: 1, art: 'ok', regionen: ['US'] }]), 'Signatur ändert sich, wenn die Lieferregion wechselt (EU -> US ändert die Schweizer Rate)');
}

// ── Modell lesen
{
  const l = modellLesen(antwort(7, [V(71), V(72, AUS), V(73)]), 7);
  gleich([l.art, l.nVarianten, l.ausIds, l.alleAus, l.nUnbekannt], ['ok', 3, [72], false, 0], 'Modell mit einer ausverkauften Variante');
  gleich(modellLesen(antwort(7, [V(71, AUS), V(72, AUS)]), 7).alleAus, true, 'alle Varianten ausverkauft');
  gleich(modellLesen(antwort(7, [V(71, AUS), { id: 72 }]), 7).alleAus, false, 'eine unbekannte Variante verhindert «alle aus»');
  gleich(modellLesen({ status: 404, json: {} }, 7).art, 'weg', '404 = nicht mehr im Katalog');
  gleich(modellLesen(antwort(7, [V(71)], { is_discontinued: true }), 7).art, 'eingestellt', 'eingestelltes Modell');
  for (const [a, grund] of [
    [{ status: 500, json: {} }, 'HTTP 500'], [{ status: 200, json: null }, 'HTTP 200'], [{ status: 200, json: { code: 429, result: 'x' } }, 'code 429'],
    [{ status: 200, json: { code: 200, result: {} } }, 'ohne product'], [{ status: 200, json: { code: 200, result: { product: { id: 7 } } } }, 'ohne Varianten'],
    [{ status: 200, json: { code: 200, result: { product: { id: 7 }, variants: [] } } }, 'ohne Varianten'], [antwort(8, [V(1)]), 'falsche Modellnummer'],
    [antwort(7, [{ id: 'x' }, { name: 'ohne Nummer' }]), 'keine gültige Variante'], [antwort(7, [{ id: 1 }, { id: 2 }]), 'ohne Bestandsstatus'],
  ]) { const r = modellLesen(a, 7); gleich([r.art, r.grund], ['unbekannt', grund], `halbe oder falsche Antwort: ${grund}`); }
  gleich(modellLesen(antwort(7, [V(1), V(2)]), 7, { bekannteVarianten: 10 }).grund, 'nur 2 von 10 bekannten Varianten', 'Schwund unter der Hälfte gilt als halbe Antwort');
  gleich(modellLesen(antwort(7, [V(1), V(2), V(3), V(4), V(5)]), 7, { bekannteVarianten: 10 }).art, 'ok', 'genau die Hälfte ist noch erlaubt');
  gleich(modellLesen(antwort(7, [V(1)]), 7, { bekannteVarianten: null }).art, 'ok', 'ohne bekannte Zahl kein Schwund-Urteil');
}

// ── Testvarianten
{
  const l = modellLesen(antwort(7, [V(1, { EU: 'in_stock' }), V(2, { EU: 'in_stock', US: 'in_stock', UK: 'in_stock' }), V(3, AUS), V(4, { EU: 'in_stock', US: 'in_stock', UK: 'in_stock' }), V(5, { US: 'in_stock' })]), 7);
  gleich(testKandidaten(l, 3), [4, 1, 5], 'viele Regionen zuerst, je Regionsmenge eine Variante (die mit der höchsten Nummer), nie eine ausverkaufte');
  gleich(testKandidaten(l, 1), [4], 'höchstens max');
  gleich(testKandidaten(modellLesen(antwort(7, [V(1, AUS)]), 7), 3), [], 'nichts lieferbar: keine Testvariante');
  gleich(testKandidaten({ art: 'unbekannt' }, 3), [], 'nicht lesbar: keine Testvariante');
}

// ── Versandrate
{
  const rate = (usd, min, max) => ({ id: 'STANDARD', rate: String(usd), currency: 'USD', minDeliveryDays: min, maxDeliveryDays: max });
  gleich(rateAuswerten({ status: 200, json: { code: 200, result: [rate('10.79', 6, 9)] } }), { art: 'rate', rateUsd: 10.79, tageMin: 6, tageMax: 9 }, 'Rate vorhanden');
  gleich(rateAuswerten({ status: 200, json: { result: [rate('12.00', 5, 8), rate('9.50', 7, 10)] } }).rateUsd, 9.5, 'die günstigste Rate zählt');
  gleich(rateAuswerten({ status: 200, json: { result: [] } }).art, 'keine-rate', 'leere Liste');
  gleich(rateAuswerten({ status: 200, json: { result: [{ rate: 'abc' }] } }).art, 'keine-rate', 'Rate ohne Zahl zählt nicht');
  const b400 = (m) => ({ status: 400, json: { code: 400, result: m, error: { reason: 'BadRequest', message: m } } });
  gleich(rateAuswerten(b400('This product "AS Colour 5101 Hoodie (Army / XL)" ships to Australia, New Zealand only and the current shipping address is outside of this region.')).art, 'keine-rate', 'regionsgebunden (gemessen 06.11.2026)');
  gleich(rateAuswerten(b400('Order contains products that are out of stock')).art, 'ausverkauft', 'ausverkaufte Testvariante ist KEIN Urteil über die Schweiz');
  gleich(rateAuswerten(b400('Invalid variant ID: 99999999')).art, 'variante-ungueltig', 'ungültige Variante');
  gleich(rateAuswerten(b400('Something unexpected happened')).art, 'unbekannt', 'unbekannte 400-Meldung ändert nichts');
  gleich(rateAuswerten({ status: 400, json: { error: { message: 'ships to Japan only' } } }).art, 'keine-rate', 'Meldung auch nur im Feld error.message');
  gleich(rateAuswerten({ status: 401, json: {} }).art, 'fatal', '401 ist fatal');
  gleich(rateAuswerten({ status: 403, json: {} }).art, 'fatal', '403 ist fatal');
  gleich(rateAuswerten({ status: 429, json: {} }).art, 'gedrosselt', '429');
  gleich(rateAuswerten({ status: 503, json: {} }).art, 'unbekannt', '5xx ist unbekannt');
  gleich(rateAuswerten(null).art, 'unbekannt', 'keine Antwort');
  const R = { art: 'rate', rateUsd: 10, tageMin: 3, tageMax: 5 }, K = { art: 'keine-rate', grund: 'x' }, A = { art: 'ausverkauft' }, U = { art: 'unbekannt' };
  gleich(rateUrteil([K, R]).ch, true, 'eine Rate genügt');
  gleich(rateUrteil([K, K]).ch, false, 'zwei eindeutige Absagen');
  gleich(rateUrteil([K]).ch, false, 'eine eindeutige Absage, keine weitere Variante');
  gleich(rateUrteil([K, A]).ch, false, 'ausverkaufte Testvariante stört das Urteil nicht');
  gleich(rateUrteil([K, U]).ch, null, 'eine unklare Antwort macht das Urteil unbekannt');
  gleich(rateUrteil([A]).ch, null, 'nur ausverkaufte Testvarianten: unbekannt');
  gleich(rateUrteil([]).ch, null, 'nichts gemessen: unbekannt');
}

// ── Wann wird die Versandrate gemessen?
{
  const jetzt = new Date('2026-11-06T02:13:00Z');
  const tagIdx = Math.floor(jetzt.getTime() / 86400000);
  const l = (id, varianten, extra) => modellLesen(antwort(id, varianten), id, extra);
  // Modellnummer, die HEUTE nicht in der Scheibe liegt, und eine, die darin liegt
  const nichtScheibe = [...Array(7).keys()].map((i) => 100 + i).find((id) => id % REGELN.scheiben !== tagIdx % REGELN.scheiben);
  const scheibe = [...Array(7).keys()].map((i) => 100 + i).find((id) => id % REGELN.scheiben === tagIdx % REGELN.scheiben);
  const lA = l(nichtScheibe, [V(1), V(2), V(3)]);
  const basisJa = { ch: true, nVarianten: 3 };
  const kein = (k) => brauchtRate(lA, { zustand: undefined, basis: basisJa, vorherAus: new Set(), shopModell: false, jetzt, ...k });
  gleich(kein({}).mess, false, 'unverändert, keine Scheibe: keine Messung');
  gleich(kein({}).grund, 'unveraendert', 'Grund unverändert');
  gleich(kein({ voll: true }).grund, 'voll', 'VOLL=1 misst alles');
  gleich(brauchtRate(l(scheibe, [V(1)]), { basis: { ch: true, nVarianten: 1 }, vorherAus: new Set(), jetzt }).grund, 'scheibe', 'tägliche Scheibe');
  gleich(kein({ basis: { ch: false, nVarianten: 3 } }).grund, 'ch-nein', 'Modelle ohne Schweizer Rate werden jeden Lauf neu gemessen');
  gleich(kein({ basis: { ch: null, nVarianten: 3 } }).grund, 'ch-unbekannt', 'unbekannte Rate wird gemessen');
  gleich(kein({ basis: { ch: true, nVarianten: 4 } }).grund, 'varianten-geaendert', 'andere Variantenzahl als in der Inventur');
  gleich(kein({ vorherAus: new Set([2]) }).grund, 'ausverkauft-geaendert', 'anderer Ausverkauft-Stand als bisher');
  const lAus = l(nichtScheibe, [V(1), V(2, AUS), V(3)]);
  gleich(brauchtRate(lAus, { basis: basisJa, vorherAus: new Set([2]), jetzt }).mess, false, 'gleicher Ausverkauft-Stand wie bisher: keine Messung');
  gleich(kein({ shopModell: true }).grund, 'shop-modell', 'Modell mit Shopprodukt ohne frühere Messung');
  const z = (sig, alterTage) => ({ sig, ch: true, gemessen: new Date(jetzt.getTime() - alterTage * 86400000).toISOString() });
  gleich(kein({ zustand: z(lA.signatur, 1) }).mess, false, 'gleiche Signatur, jung: keine Messung');
  gleich(kein({ zustand: z('anders', 1) }).grund, 'signatur-geaendert', 'andere Signatur');
  gleich(kein({ zustand: z(lA.signatur, 2), shopModell: true }).mess, false, 'Shop-Modell, 2 Tage alt: noch keine Messung');
  gleich(kein({ zustand: z(lA.signatur, 4), shopModell: true }).grund, 'shop-modell', 'Shop-Modell, 4 Tage alt');
  gleich(kein({ zustand: z(lA.signatur, 15) }).grund, 'veraltet', 'nach 14 Tagen immer');
  gleich(kein({ zustand: { sig: lA.signatur, ch: false, gemessen: null } }).grund, 'ch-nein', 'Zustand mit ch=false schlägt die Inventur');
  gleich(brauchtRate(l(nichtScheibe, [V(1, AUS)]), { basis: { ch: false }, jetzt }).grund, 'ueberall-ausverkauft', 'ganz ausverkauft: nichts zu messen');
  gleich(brauchtRate({ art: 'unbekannt' }, { jetzt }).mess, false, 'nicht lesbar: nichts zu messen');
}

// ── Urteil je Modell
{
  const ok3 = modellLesen(antwort(7, [V(1), V(2, AUS), V(3)]), 7);
  const R = { ch: true }, KEINE = { ch: false, grund: 'x' }, NULL = { ch: null };
  let u = modellUrteil(ok3, R, { ch: true, aus: false, ausVarianten: [] }, { klasse: 'FLACH' });
  gleich([u.fensterAus, u.shopAus, u.ausVarianten], [false, false, [2]], 'Variante fällt aus: Modell bleibt, Variante wird ausgeblendet');
  u = modellUrteil(modellLesen(antwort(7, [V(1, AUS), V(2, AUS)]), 7), null, { ch: true }, {});
  gleich([u.fensterAus, u.shopAus, u.gruende, u.ausVarianten], [true, true, ['ueberall-ausverkauft'], []], 'Modell fällt aus: ganz ausverkauft');
  u = modellUrteil(ok3, KEINE, { ch: true }, {});
  gleich([u.fensterAus, u.shopAus, u.shopUnsicher, u.shopGruende], [true, true, false, ['keine-ch-rate']], 'frisch gemessen: keine Schweizer Rate');
  u = modellUrteil(ok3, NULL, { ch: false }, {});
  gleich([u.fensterAus, u.shopAus, u.shopUnsicher], [true, false, true], 'alter Stand «keine Rate», jetzt nicht entscheidbar: Fenster bleibt vorsichtig, Shop rührt nichts an');
  u = modellUrteil(ok3, R, { ch: false, aus: true }, {});
  gleich([u.fensterAus, u.shopAus, u.ch], [false, false, true], 'Rückkehr: Rate wieder da');
  u = modellUrteil(modellLesen(antwort(7, [V(1), V(2)]), 7), null, { ch: true, aus: true, ausVarianten: [] }, {});
  gleich(u.fensterAus, false, 'Rückkehr: wieder lieferbar, wieder im Fenster');
  u = modellUrteil({ art: 'unbekannt', id: 7 }, null, { ch: true, aus: true, ausVarianten: [] }, {});
  gleich([u.fensterAus, u.shopAus, u.unbekannt], [true, false, true], 'nicht lesbar: bisheriger Stand (ausgeblendet) bleibt, Shop unberührt');
  u = modellUrteil({ art: 'unbekannt', id: 7 }, null, { ch: true, aus: false, ausVarianten: [5, 6] }, {});
  gleich([u.fensterAus, u.ausVarianten], [false, [5, 6]], 'nicht lesbar: bisherige Variantenliste bleibt');
  u = modellUrteil(ok3, R, { ch: true }, { klasse: 'UNGEEIGNET' });
  gleich([u.fensterAus, u.shopAus, u.gruende], [true, false, ['technisch']], 'technisch ungeeignet blendet nur im Fenster aus, der Shop bleibt unberührt');
  u = modellUrteil({ art: 'weg', id: 7 }, null, { ch: true }, {});
  gleich([u.fensterAus, u.shopAus, u.gruende], [true, true, ['nicht-im-katalog']], 'Modell nicht mehr im Katalog');
  u = modellUrteil({ art: 'eingestellt', id: 7 }, null, { ch: true }, {});
  gleich([u.fensterAus, u.shopAus, u.gruende], [true, true, ['eingestellt']], 'Modell eingestellt');
}

// ── Ausblenden-Datei: Format, Prüfung, Vergleich
{
  const urteile = new Map([[10, { fensterAus: true, ausVarianten: [] }], [5, { fensterAus: false, ausVarianten: [9, 3] }], [7, { fensterAus: false, ausVarianten: [] }], [2, { fensterAus: true, ausVarianten: [] }], [30, { fensterAus: false, ausVarianten: [1] }]]);
  const o = ausblendenBauen(urteile, '2026-11-06', 5);
  gleich(o.modelle, [2, 10], 'Modelle sortiert');
  gleich(o.varianten, { 5: [3, 9], 30: [1] }, 'Varianten nur für sichtbare Modelle, sortiert');
  gleich(o.schemaVersion, 1, 'Schema 1');
  ok(/5 Modelle gelesen/.test(o.quelle) && /GEMESSEN 2026-11-06/.test(o.quelle), 'Quelle nennt Datum und Zahl');
  gleich(ausblendenBauen(new Map([[3, { fensterAus: true, ausVarianten: [7] }], [4, { fensterAus: false, ausVarianten: [8] }]]), '2026-11-06', 2).varianten, { 4: [8] }, 'ausgeblendete Modelle tragen nie eine Variantenliste');
  const t = ausblendenText(o);
  ok(t.endsWith('}}\n') && t.includes('"varianten":{\n"5":[3,9],\n"30":[1]\n}}'), 'Zeilenformat wie im Paket');
  gleich(ausblendenPruefen(t).modelle, [2, 10], 'Text lässt sich wieder lesen');
  gleich(ausblendenText({ ...o, varianten: {} }).includes('"varianten":{\n}}'), true, 'leere Variantenliste');
  ok(ausblendenPruefen(ausblendenText({ ...o, varianten: {} })) !== null, 'leere Variantenliste ist gültig');
  for (const schlecht of ['', '{', '[]', '{"schemaVersion":2,"modelle":[],"varianten":{}}', '{"schemaVersion":1,"modelle":["a"],"varianten":{}}', '{"schemaVersion":1,"modelle":[],"varianten":[]}', '{"schemaVersion":1,"modelle":[],"varianten":{"x":[1]}}', '{"schemaVersion":1,"modelle":[],"varianten":{"1":["a"]}}', '{"schemaVersion":1,"varianten":{}}']) gleich(ausblendenPruefen(schlecht), null, `ungültig: ${schlecht.slice(0, 40)}`);
  ok(ausblendenGleich(o, { ...o, stand: '2020-01-01', quelle: 'anders', modelle: [10, 2], varianten: { 30: [1], 5: [9, 3] } }), 'gleich ohne Stand, Quelle und Reihenfolge');
  ok(!ausblendenGleich(o, { ...o, modelle: [2] }), 'anderes Modell: ungleich');
  ok(!ausblendenGleich(o, { ...o, varianten: { 5: [3] } }), 'andere Variante: ungleich');
  ok(!ausblendenGleich(o, null), 'null ist ungleich');
  gleich(tageSeit('2026-11-05', new Date('2026-11-06T02:00:00Z')), 1, 'Tage seit Stand');
  gleich(tageSeit('kaputt', new Date()), null, 'unlesbarer Stand');
  // Paket-Datei: derselbe Text, Byte für Byte (Formatabweichung wäre eine stille Änderung der Live-Datei)
  const repo = fileURLToPath(new URL('../../', import.meta.url));
  const paket = repo + 'dropship/katalog-fenster-0611/ziel/assets__luxe-clothing-ausblenden.json';
  if (existsSync(paket)) {
    const roh = readFileSync(paket, 'utf8');
    const p = ausblendenPruefen(roh);
    ok(p !== null, 'Paket-Datei ist gültig');
    gleich(ausblendenText(p), roh, 'Paket-Datei wird Byte für Byte gleich geschrieben');
    const vz = vorzustandLesen(p);
    gleich([vz.modelle.size, [...vz.varianten.values()].reduce((s, x) => s + x.size, 0)], [40, 126], 'Paket: 40 Modelle, 126 Varianten');
    const inv = JSON.parse(readFileSync(repo + 'dropship/codex-katalog/ausblenden.json', 'utf8'));
    const vi = vorzustandLesen(inv);
    gleich([vi.modelle.size, [...vi.varianten.values()].reduce((s, x) => s + x.size, 0)], [40, 126], 'Inventur-Datei hat dieselben Zahlen');
    ok(ausblendenGleich(p, { modelle: [...vi.modelle], varianten: Object.fromEntries([...vi.varianten].map(([k, s]) => [k, [...s]])) }), 'Paket-Datei und Inventur-Datei sind inhaltsgleich');
  }
  const vz = vorzustandLesen({ modelle_ausblenden: [3, 1], varianten_ausblenden: { 5: [2] } });
  gleich([[...vz.modelle], [...vz.varianten.get(5)]], [[3, 1], [2]], 'Inventur-Format');
  gleich(vorzustandLesen(null).modelle.size, 0, 'leerer Vorzustand');
}

// ── Shop-Plan
const SHOP = { isFulfillmentService: false }, DIENST = { isFulfillmentService: true };
const lv = (ort, menge) => ({ inventoryLevels: { nodes: [{ quantities: [{ name: 'available', quantity: menge }], location: ort }] } });
const var_ = (id, sku, o = {}) => ({ id, sku, inventoryPolicy: 'CONTINUE', sperre: null, inventoryItem: { id: 'i' + id, tracked: false, ...(o.item || {}) }, ...o.rest });
const prod = (id, status, varianten, tags = ['printful_personalized_product', 'wunschdesign']) => ({ id: 'gid://P/' + id, handle: 'p' + id, status, tags, variantenVollstaendig: true, variants: varianten });
{
  const l = (id, vs) => modellLesen(antwort(id, vs), id);
  const lesungen = new Map([[10, l(10, [V(101), V(102, AUS), V(103)])], [11, l(11, [V(111, AUS), V(112, AUS)])], [12, l(12, [V(121), V(122)])]]);
  const idx = katalogIndex(lesungen);
  gleich([idx.get(102), idx.get(111), idx.get(999)], [{ modell: 10, art: 'aus' }, { modell: 11, art: 'aus' }, undefined], 'Katalogindex Variante -> Modell');
  const urteile = new Map([[10, modellUrteil(lesungen.get(10), { ch: true }, { ch: true }, {})], [11, modellUrteil(lesungen.get(11), null, { ch: true }, {})], [12, modellUrteil(lesungen.get(12), { ch: true }, { ch: true }, {})]]);
  gleich([...shopModelle([prod(1, 'ACTIVE', [var_('v1', '5_101'), var_('v2', '5_121')])], idx)].sort(), [10, 12], 'Modelle mit Shopprodukt');
  gleich([...shopModelle([prod(1, 'ACTIVE', [var_('v1', '5_101')], ['mode'])], idx)], [], 'Produkte ohne POD-Tag zählen nicht');

  // Szenario 1: Variante fällt aus (Strategie B): nur Befund
  let pl = shopPlan([prod(1, 'ACTIVE', [var_('v1', '5_101'), var_('v2', '5_102'), var_('v3', '5_103')])], idx, urteile, 'B');
  gleich([pl.aktionen.length, pl.befunde.map((b) => b.art)], [0, ['variante-ausverkauft']], 'B: ausverkaufte Einzelvariante ergibt nur einen Befund');
  // Strategie A: gesperrt, wenn der Bestand ohnehin verfolgt wird, an einem Shop-Standort liegt und 0 ist
  const getrackt = (ort, menge) => ({ item: { tracked: true, ...lv(ort, menge) } });
  pl = shopPlan([prod(1, 'ACTIVE', [var_('v1', '5_101'), var_('v2', '5_102', getrackt(SHOP, 0)), var_('v3', '5_103')])], idx, urteile, 'A');
  gleich(pl.aktionen.map((a) => [a.typ, a.varianteId, a.vorherPolicy]), [['sperre', 'v2', 'CONTINUE']], 'A: getrackte Variante am Shop-Standort mit Bestand 0 wird gesperrt');
  pl = shopPlan([prod(1, 'ACTIVE', [var_('v1', '5_101'), var_('v2', '5_102', getrackt(SHOP, 0))])], idx, urteile, 'auto');
  gleich(pl.aktionen.map((a) => a.typ), ['sperre'], 'auto = A, wo erlaubt');
  for (const [name, o, grund] of [['ungetrackt', {}, 'ungetrackt'], ['Dienst-Standort', getrackt(DIENST, 0), 'dienststandort'], ['Menge positiv', getrackt(SHOP, 5), 'menge-positiv']]) {
    pl = shopPlan([prod(1, 'ACTIVE', [var_('v1', '5_101'), var_('v2', '5_102', o)])], idx, urteile, 'A');
    gleich([pl.aktionen.length, pl.befunde.length, pl.befunde[0].text.includes(grund)], [0, 1, true], `A fällt bei ${name} auf B zurück (${grund})`);
  }
  pl = shopPlan([prod(1, 'ACTIVE', [var_('v1', '5_101'), var_('v2', '5_102', { ...getrackt(SHOP, 0), rest: { inventoryPolicy: 'DENY' } })])], idx, urteile, 'A');
  gleich(pl.aktionen.length, 0, 'bereits DENY: keine Aktion');
  gleich(sperreMoeglich({ inventoryItem: { tracked: true, inventoryLevels: { nodes: [] } } }).grund, 'ohne-standort', 'ohne Standort keine Sperre');
  gleich(sperreMoeglich({ inventoryItem: { tracked: true, ...lv(DIENST, 0) } }).ok, false, 'Dienst-Standort wird nie beschrieben');
  // Rückkehr einer gesperrten Variante
  pl = shopPlan([prod(1, 'ACTIVE', [var_('v1', '5_101', { rest: { sperre: 'CONTINUE', inventoryPolicy: 'DENY' } })])], idx, urteile, 'B');
  gleich(pl.aktionen.map((a) => [a.typ, a.policyZurueck]), [['freigabe', 'CONTINUE']], 'Rückkehr: von uns gesperrte Variante wird freigegeben (auch unter B)');
  pl = shopPlan([prod(1, 'ACTIVE', [var_('v1', '5_101'), var_('v2', '5_102', { rest: { sperre: 'CONTINUE', inventoryPolicy: 'DENY' } })])], idx, urteile, 'B');
  gleich(pl.aktionen.length + pl.befunde.length, 0, 'noch ausverkaufte, schon gesperrte Variante: nichts zu tun');

  // Szenario 2: Modell fällt aus -> ENTWURF, nur wenn ALLE Varianten ausfallen
  pl = shopPlan([prod(2, 'ACTIVE', [var_('w1', '6_111'), var_('w2', '6_112')])], idx, urteile, 'B');
  gleich(pl.aktionen.map((a) => [a.typ, a.vorher, a.modelle, a.variantenJeModell]), [['entwurf', 'ACTIVE', [11], { 11: [111, 112] }]], 'alle Varianten ausverkauft: ENTWURF');
  pl = shopPlan([prod(2, 'ACTIVE', [var_('w1', '6_111'), var_('w3', '6_121')])], idx, urteile, 'B');
  gleich(pl.aktionen.length, 0, 'eine lieferbare Variante: kein ENTWURF');
  pl = shopPlan([prod(2, 'ACTIVE', [var_('w1', '6_111'), var_('w9', 'WM-TRIKOT-RO1')])], idx, urteile, 'B');
  gleich(pl.aktionen.length, 0, 'eine nicht zuordenbare Variante: kein ENTWURF (nie raten)');
  pl = shopPlan([prod(2, 'ACTIVE', [var_('w1', '6_111'), var_('w8', '6_99999')])], idx, urteile, 'B');
  gleich(pl.aktionen.length, 0, 'eine Variante ausserhalb des Katalogs: kein ENTWURF');
  pl = shopPlan([{ ...prod(2, 'ACTIVE', [var_('w1', '6_111')]), variantenVollstaendig: false }], idx, urteile, 'B');
  gleich([pl.aktionen.length, pl.befunde[0].art, pl.zaehl.unvollstaendig], [0, 'zu-viele-varianten', 1], 'unvollständige Variantenliste: keine Entscheidung');
  const urteileKeineRate = new Map(urteile); urteileKeineRate.set(12, modellUrteil(lesungen.get(12), { ch: false, grund: 'x' }, { ch: true }, {}));
  pl = shopPlan([prod(3, 'ACTIVE', [var_('x1', '7_121'), var_('x2', '7_122')])], idx, urteileKeineRate, 'B');
  gleich(pl.aktionen.map((a) => [a.typ, a.grund]), [['entwurf', 'keine-ch-rate']], 'frisch gemessen ohne Schweizer Rate: ENTWURF');
  const urteileUnsicher = new Map(urteile); urteileUnsicher.set(12, modellUrteil(lesungen.get(12), { ch: null }, { ch: false }, {}));
  pl = shopPlan([prod(3, 'ACTIVE', [var_('x1', '7_121'), var_('x2', '7_122')])], idx, urteileUnsicher, 'B');
  gleich(pl.aktionen.length, 0, 'nur ein alter Stand «keine Rate»: der Shop wird nicht angefasst');
  const urteileUnbek = new Map(urteile); urteileUnbek.set(11, modellUrteil({ art: 'unbekannt' }, null, { ch: true }, {}));
  pl = shopPlan([prod(2, 'ACTIVE', [var_('w1', '6_111'), var_('w2', '6_112')])], idx, urteileUnbek, 'B');
  gleich(pl.aktionen.length, 0, 'unbekanntes Modell: nichts erraten');

  // unsicheres Modell: ein von uns entworfenes Produkt kommt NICHT zurück, solange nur ein alter Stand «keine Rate» sagt (kein Hin und Her)
  const lOk = new Map([[12, l(12, [V(121), V(122)])]]);
  const urtUnsicher = new Map([[12, modellUrteil(lOk.get(12), { ch: null }, { ch: false }, {})]]);
  gleich(urtUnsicher.get(12).shopUnsicher, true, 'Ausgangslage: Modell unsicher');
  pl = shopPlan([prod(3, 'DRAFT', [var_('x1', '7_121'), var_('x2', '7_122')], ['printful_personalized_product', TAG_AUS])], katalogIndex(lOk), urtUnsicher, 'B');
  gleich(pl.aktionen.length, 0, 'unsicheres Modell: keine Reaktivierung (kein Hin und Her bei unklarer Messung)');
  // Szenario 3: Rückkehr (Entwurf von uns -> aktiv; fremde Entwürfe nie)
  const lAlle = new Map([[11, l(11, [V(111), V(112)])]]);
  const idx2 = katalogIndex(lAlle);
  const urt2 = new Map([[11, modellUrteil(lAlle.get(11), { ch: true }, { ch: true }, {})]]);
  pl = shopPlan([prod(4, 'DRAFT', [var_('y1', '8_111'), var_('y2', '8_112')], ['printful_personalized_product', TAG_AUS])], idx2, urt2, 'B');
  gleich(pl.aktionen.map((a) => a.typ), ['reaktivieren'], 'von uns entworfenes Produkt kommt zurück');
  pl = shopPlan([prod(5, 'DRAFT', [var_('y1', '8_111'), var_('y2', '8_112')], ['printful_personalized_product', 'wunschdesign'])], idx2, urt2, 'B');
  gleich(pl.aktionen.length, 0, 'Entwurf ohne unser Tag (z. B. zu kleine Druckdatei) bleibt Entwurf');
  const lHalb = new Map([[11, l(11, [V(111), V(112, AUS), V(113, AUS), V(114, AUS)])]]);
  const urtH = new Map([[11, modellUrteil(lHalb.get(11), { ch: true }, { ch: true }, {})]]);
  pl = shopPlan([prod(4, 'DRAFT', [var_('y1', '8_111'), var_('y2', '8_112'), var_('y3', '8_113'), var_('y4', '8_114')], ['printful_personalized_product', TAG_AUS])], katalogIndex(lHalb), urtH, 'B');
  gleich(pl.aktionen.length, 0, `unter ${REAKTIV_MIN_ANTEIL * 100} % lieferbar: bleibt Entwurf`);
  pl = shopPlan([prod(4, 'ARCHIVED', [var_('y1', '8_111')], ['printful_personalized_product', TAG_AUS])], idx2, urt2, 'B');
  gleich(pl.aktionen.length, 0, 'archiviertes Produkt bleibt unberührt');

  // Fremde Ware und Muster
  pl = shopPlan([
    prod(6, 'ACTIVE', [var_('f1', 'fortura-12345')], ['fortura', 'printful_personalized_product']),
    prod(7, 'ACTIVE', [var_('c1', 'CJJT1565130')], ['cj-real']),
    prod(8, 'ACTIVE', [var_('m1', '6_111'), var_('m2', '6_112')], ['mode']),
    prod(9, 'ACTIVE', [var_('s1', 'WM-TRIKOT-RO1'), var_('s2', 'MUGSET-KINGQ')]),
    prod(10, 'ACTIVE', [var_('g1', 'fortura-1'), var_('g2', '6_111')]),
  ], idx, urteile, 'A');
  gleich(pl.aktionen.length + pl.befunde.length, 0, 'Fortura, CJ, Produkte ohne POD-Tag und ohne SKU-Muster: keine Aktion, kein Befund');
  gleich([pl.zaehl.fremdOderOhnePod, pl.zaehl.ohneZuordnung], [4, 1], 'Zähler: fremd/ohne Tag 4 (Fortura, CJ, Mode, gemischt), ohne passende SKU 1');
}

// ── Bremsen
{
  const basis = { modelleGesamt: 577, unbekannt: 0, neuAus: 0, entwuerfe: 0, aktivePod: 464 };
  gleich(bremsen(basis), [], 'nichts auffällig');
  gleich(bremsen({ ...basis, unbekannt: 57 }), [], 'bis 10 % nicht lesbar ist erlaubt');
  gleich(bremsen({ ...basis, unbekannt: 58 })[0].art, 'zu-viele-unbekannt', 'über 10 % nicht lesbar: Abbruch');
  gleich(bremsen({ ...basis, neuAus: 29 }), [], 'bis 5 % neu verschwindende Modelle erlaubt (29 von 577)');
  gleich(bremsen({ ...basis, neuAus: 30 })[0].art, 'zu-viele-neu-aus', '30 neu verschwindende Modelle: Abbruch');
  gleich(bremsen({ modelleGesamt: 12, unbekannt: 0, neuAus: 20, entwuerfe: 0, aktivePod: 5 }), [], 'kleine Menge: mindestens 20 erlaubt');
  gleich(bremsen({ modelleGesamt: 12, unbekannt: 0, neuAus: 21, entwuerfe: 0, aktivePod: 5 })[0].art, 'zu-viele-neu-aus', '21 von 12');
  gleich(bremsen({ ...basis, entwuerfe: 14 }), [], 'bis 3 % aktiver Produkte auf ENTWURF (14 von 464)');
  gleich(bremsen({ ...basis, entwuerfe: 15 })[0].art, 'zu-viele-entwuerfe', '15 von 464: Abbruch');
  gleich(bremsen({ ...basis, entwuerfe: 5, aktivePod: 10 }), [], 'mindestens 5 Entwürfe erlaubt');
  gleich(bremsen({ ...basis, entwuerfe: 6, aktivePod: 10 })[0].art, 'zu-viele-entwuerfe', '6 Entwürfe bei 10 aktiven');
  gleich(bremsen({ ...basis, neuAus: 30 }, { maxNeuAus: 50 }), [], 'Grenze per Umgebung anhebbar');
  gleich(bremsen({ ...basis, entwuerfe: 20 }, { maxEntwuerfe: 25 }), [], 'Entwurfs-Grenze anhebbar');
  gleich(bremsen({ ...basis, unbekannt: 0 }, { maxUnbekanntAnteil: 0 }), [], 'Grenze 0 bei 0 Unbekannten');
  gleich(bremsen({ modelleGesamt: 0, unbekannt: 0, neuAus: 0, entwuerfe: 0, aktivePod: 0 }), [], 'leere Menge teilt nicht durch null');
  gleich(bremsen({ ...basis, unbekannt: 100, neuAus: 100, entwuerfe: 100 }).map((v) => v.art).sort(), ['zu-viele-entwuerfe', 'zu-viele-neu-aus', 'zu-viele-unbekannt'], 'mehrere Bremsen zugleich');
}

// ── Ledger
{
  const z = ledgerZeile('2026-11-06T02:20:00.000Z', 'entwurf', 'gid://shopify/Product/1', { status: 'ACTIVE', handle: 'a b' });
  ok(z.startsWith('printful-lager 2026-11-06T02:20:00.000Z entwurf gid://shopify/Product/1 vorher='), 'Ledger-Zeile beginnt wie das Muster der anderen Protokolle');
  gleich(ledgerLesen(`Rauschen\n${z}\n${ledgerZeile('2026-11-06T02:21:00.000Z', 'theme', 'assets/x.json', { inhalt: '{"a":1}\n', md5Nachher: 'abc' })}\nprintful-lager kaputt vorher={\n`),
    [{ iso: '2026-11-06T02:20:00.000Z', typ: 'entwurf', ziel: 'gid://shopify/Product/1', vorher: { status: 'ACTIVE', handle: 'a b' } }, { iso: '2026-11-06T02:21:00.000Z', typ: 'theme', ziel: 'assets/x.json', vorher: { inhalt: '{"a":1}\n', md5Nachher: 'abc' } }], 'Ledger lesen: Rauschen und kaputte Zeilen werden übersprungen, Inhalt mit Zeilenumbruch bleibt heil');
  gleich(ledgerLesen(''), [], 'leeres Ledger');
}

console.log(`${n} Prüfungen bestanden`);
