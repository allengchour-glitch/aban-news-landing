// Tests für die Bildzuordnung der Varianten. Gegenproben in beide Richtungen; Zusammenfassung am ENDE.
import { bildZuordnung, updateEingabe, cjSku, istCjVariantenSku, dateiname, erledigtAusLedger, neueMedienAnlegen } from './cj_variantenbilder.mjs';
let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };

// Künstliche Signaturen: Farbbild (768 Bytes) einfarbig + Hash. Gleiche Farbe/gleicher Hash = identisches Bild.
const sig = (r, g, b, h = 0n) => { const rgb = new Uint8Array(768); for (let i = 0; i < 768; i += 3) { rgb[i] = r; rgb[i + 1] = g; rgb[i + 2] = b; } return { h, rgb }; };
const rot = sig(200, 30, 30), rot2 = sig(200, 30, 30), blau = sig(30, 30, 200), gruen = sig(30, 200, 30);
const nah = sig(205, 33, 28, 1n);                // fast gleich (Hash 1 Bit, Farbe wenige Stufen)
const aehnlichAberAnders = sig(200, 30, 30, 0xFFFFn);  // gleiche Farbe, aber anderer Aufbau (16 Hash-Bits)

const shop = [{ id: 'v1', sku: 'S1', hatBild: false }, { id: 'v2', sku: 'S2', hatBild: false }, { id: 'v3', sku: 'S3', hatBild: true }];
const cjUrls = { S1: 'u-rot', S2: 'u-blau', S3: 'u-gruen' };
const cjSigs = new Map([['u-rot', rot], ['u-blau', blau], ['u-gruen', gruen]]);

// Normalfall: rot → Medium m1, blau → Medium m2; v3 hat schon ein Bild und bleibt unberührt
let a = bildZuordnung({ shopVarianten: shop, cjProSku: cjUrls, mediaSigs: new Map([['m1', rot2], ['m2', blau], ['m3', gruen]]), cjSigs });
ist('Zuordnung rot/blau', a.map(x => [x.sku, x.art, x.mediaId]), [['S1', 'vorhanden', 'm1'], ['S2', 'vorhanden', 'm2']]);
ist('Variante mit Bild wird nie angefasst', a.some(x => x.sku === 'S3'), false);

// Kein identisches Medium → neu hochladen
a = bildZuordnung({ shopVarianten: shop, cjProSku: cjUrls, mediaSigs: new Map([['m3', gruen]]), cjSigs });
ist('kein Treffer → neu', a.map(x => [x.sku, x.art]), [['S1', 'neu'], ['S2', 'neu']]);

// Fast gleich (Hash 1 Bit, Farbe leicht) zählt als identisch; gleiche Farbe, anderer Aufbau NICHT
a = bildZuordnung({ shopVarianten: [shop[0]], cjProSku: cjUrls, mediaSigs: new Map([['m1', nah]]), cjSigs });
ist('fast identisch → vorhanden', a[0].art, 'vorhanden');
a = bildZuordnung({ shopVarianten: [shop[0]], cjProSku: cjUrls, mediaSigs: new Map([['m1', aehnlichAberAnders]]), cjSigs });
ist('Gegenprobe: gleicher Farbton, anderer Aufbau → neu', a[0].art, 'neu');

// Mehrdeutig: zwei gleich gute Treffer → NICHT zuordnen
a = bildZuordnung({ shopVarianten: [shop[0]], cjProSku: cjUrls, mediaSigs: new Map([['m1', rot], ['m9', rot2]]), cjSigs });
ist('mehrdeutig → neu statt raten', [a[0].art, a[0].grund], ['neu', 'mehrdeutig']);

// Grenzen
ist('ohne CJ-Bild', bildZuordnung({ shopVarianten: [shop[0]], cjProSku: {}, mediaSigs: new Map(), cjSigs })[0].art, 'ohne_cj_bild');
ist('CJ-Bild unlesbar', bildZuordnung({ shopVarianten: [shop[0]], cjProSku: { S1: 'u-x' }, mediaSigs: new Map(), cjSigs })[0].art, 'cj_bild_unlesbar');
const viele = [1, 2, 3, 4].map(i => ({ id: 'v' + i, sku: 'K' + i, hatBild: false }));
const urls4 = { K1: 'a', K2: 'b', K3: 'c', K4: 'd' };
const sigs4 = new Map([['a', sig(10, 10, 10)], ['b', sig(60, 60, 60)], ['c', sig(110, 110, 110)], ['d', sig(160, 160, 160)]]);
a = bildZuordnung({ shopVarianten: viele, cjProSku: urls4, mediaSigs: new Map(), cjSigs: sigs4, maxNeu: 2 });
ist('Obergrenze neuer Bilder', a.map(x => x.art), ['neu', 'neu', 'zu_viele_neue', 'zu_viele_neue']);
// Zwei Varianten teilen ein CJ-Bild (Farbe × Grösse): nur EIN Upload
a = bildZuordnung({ shopVarianten: [{ id: 'v1', sku: 'G1', hatBild: false }, { id: 'v2', sku: 'G2', hatBild: false }], cjProSku: { G1: 'a', G2: 'a' }, mediaSigs: new Map(), cjSigs: sigs4, maxNeu: 1 });
ist('geteiltes CJ-Bild zählt einmal', a.map(x => [x.art, !!x.wieder]), [['neu', false], ['neu', true]]);

// Eingabe für die Mutation: nur vorhandene/neue Bilder, nichts anderes
const planE = { aktionen: [{ variante: 'v1', art: 'vorhanden', mediaId: 'm1' }, { variante: 'v2', art: 'neu', url: 'u' }, { variante: 'v3', art: 'ohne_cj_bild' }, { variante: 'v4', art: 'zu_viele_neue' }] };
ist('Mutationseingabe: neue Bilder nur mit angelegtem Medium (per mediaId, nie mediaSrc)', updateEingabe(planE, new Map([['u', 'm-neu']])),
  [{ id: 'v1', mediaId: 'm1' }, { id: 'v2', mediaId: 'm-neu' }]);
ist('Mutationseingabe: neues Bild ohne angelegtes Medium wird NICHT geschrieben', updateEingabe(planE), [{ id: 'v1', mediaId: 'm1' }]);
ist('Gegenprobe: kein mediaSrc in der Eingabe', JSON.stringify(updateEingabe(planE, new Map([['u', 'm-neu']]))).includes('mediaSrc'), false);

// SKU-Formen im Shop
ist('SKU mit CJ-Vorsatz', cjSku('CJ-CJWY289988501AZ'), 'CJWY289988501AZ');
ist('SKU ohne Vorsatz bleibt', cjSku('CJYD315797801AZ'), 'CJYD315797801AZ');
ist('Alt-SKU mit Farbsuffix', cjSku('CJ-CJJJCFCF00364-Red'), 'CJJJCFCF00364-Red');
ist('Gegenprobe: CJ-<pid> bleibt unverändert', cjSku('CJ-2608060715151607300'), 'CJ-2608060715151607300');
ist('leer', cjSku(''), '');

// 03.11.2026: CJ-Kennungen mit Buchstabenblock vor den Ziffern (Nachtlicht CJJZSNSN00275) wurden als «keine CJ-Varianten-SKU» übersprungen
ist('SKU mit Buchstabenblock: CJJZSNSN00275-Red-0.3 watts', istCjVariantenSku('CJJZSNSN00275-Red-0.3 watts'), true);
ist('SKU mit Buchstabenblock: CJJJCFCF00364-Red', istCjVariantenSku('CJJJCFCF00364-Red'), true);
ist('bisherige Form bleibt: CJJT261357801AZ', istCjVariantenSku('CJJT261357801AZ'), true);
ist('bisherige Form bleibt: CJYD3213815', istCjVariantenSku('CJYD3213815'), true);
ist('Gegenprobe: CJ-<pid> ist keine Varianten-SKU', istCjVariantenSku('CJ-2608060715151607300'), false);
ist('Gegenprobe: pid ohne Präfix', istCjVariantenSku('2608060715151607300'), false);
ist('Gegenprobe: UUID', istCjVariantenSku('5BB44D7E-10C7-410E-8437-D56F2D9CFBF5'), false);
ist('Gegenprobe: eigene LX-SKU', istCjVariantenSku('LX-23-KRISTALL-SET-3-TEILIG'), false);
ist('Gegenprobe: CJ direkt vor Ziffern', istCjVariantenSku('CJ2608060715151607300'), false);
ist('Gegenprobe: zu langer Buchstabenblock (7)', istCjVariantenSku('CJAAABCDEFGH123'), false);
ist('Gegenprobe: leer/undefined', [istCjVariantenSku(''), istCjVariantenSku(undefined)], [false, false]);

// 03.11.2026: Dateiname-Abgleich gegen Verwechslung von Bildern, die sich nur durch eine Aufschrift unterscheiden (2PCS / 3PCS)
ist('dateiname: ohne Abfrage, kleingeschrieben', dateiname('https://cdn.shopify.com/s/files/1/x/files/1360695797593.JPG?v=1783290259'), '1360695797593.jpg');
ist('dateiname: leer', dateiname(undefined), '');
const zwei = 'https://cf.cj/2744600106147.jpg', drei = 'https://cf.cj/1360695797593.jpg';
const sigZ = new Map([[zwei, rot], [drei, rot2]]);                       // beide CJ-Bilder: derselbe Hash, dieselbe Farbe (nur die Aufschrift unterscheidet sie)
const shopZ = [{ id: 'v2', sku: 'W2', hatBild: false }, { id: 'v3', sku: 'W3', hatBild: false }];
const cjZ = { W2: zwei, W3: drei };
a = bildZuordnung({ shopVarianten: shopZ, cjProSku: cjZ, mediaSigs: new Map([['m3', rot]]), cjSigs: sigZ });
ist('ohne Dateinamen (bisheriges Verhalten): beide bekommen dasselbe Medium', a.map(x => [x.sku, x.art, x.mediaId]), [['W2', 'vorhanden', 'm3'], ['W3', 'vorhanden', 'm3']]);
a = bildZuordnung({ shopVarianten: shopZ, cjProSku: cjZ, mediaSigs: new Map([['m3', rot]]), cjSigs: sigZ, mediaNamen: new Map([['m3', '1360695797593.jpg']]) });
ist('mit Dateinamen: das 3er-Medium gehört der 3er-Variante, die 2er bekommt ein neues Bild', a.map(x => [x.sku, x.art, x.mediaId || null]), [['W2', 'neu', null], ['W3', 'vorhanden', 'm3']]);
ist('mit Dateinamen: Grund «gleicher Dateiname»', a[1].grund, 'gleicher Dateiname');
a = bildZuordnung({ shopVarianten: shopZ, cjProSku: cjZ, mediaSigs: new Map([['m3', rot], ['m9', rot2]]), cjSigs: sigZ, mediaNamen: new Map([['m3', '1360695797593.jpg'], ['m9', '2744600106147.jpg']]) });
ist('mit beiden Medien: jede Variante bekommt ihr eigenes Medium', a.map(x => [x.sku, x.mediaId]), [['W2', 'm9'], ['W3', 'm3']]);
a = bildZuordnung({ shopVarianten: [shopZ[0]], cjProSku: { W2: zwei }, mediaSigs: new Map([['m3', rot]]), cjSigs: sigZ, mediaNamen: new Map([['m3', 'fremd.jpg']]) });
ist('Gegenprobe: Medium mit unbekanntem Dateinamen bleibt Hash-Treffer', a[0].art, 'vorhanden');

// Ledger: teilweise geschriebene Produkte nachholen, aber nur mit NACHFUELLEN=1
const led = ['voll · t · GESCHRIEBEN · 5/5', 'teil · t · GESCHRIEBEN · 2/3', 'null · t · GESCHRIEBEN · 0/4', 'fehl · t · FEHLER · x', 'drei · t · TEILWEISE · 1/3', 'drei · t · TEILWEISE · 1/3', 'drei · t · TEILWEISE · 1/3', 'zwei · t · TEILWEISE · 1/3'].join('\n');
ist('Ledger ohne Nachfüllen: GESCHRIEBEN gilt dauerhaft (auch teilweise), FEHLER nicht', [...erledigtAusLedger(led)].sort(), ['drei', 'null', 'teil', 'voll']);
ist('Ledger mit Nachfüllen: nur vollständige gelten als erledigt', [...erledigtAusLedger(led, true)].sort(), ['drei', 'voll']);
ist('Ledger: spätere vollständige Zeile überschreibt die frühere teilweise', [...erledigtAusLedger('p · t · GESCHRIEBEN · 2/3\np · t · GESCHRIEBEN · 3/3', true)], ['p']);
ist('Ledger: leer', [...erledigtAusLedger('')], []);

// Medien anlegen (Netz simuliert)
const mkQ = (stand) => { const aufrufe = []; const q = async (query, v) => { aufrufe.push(query.includes('productCreateMedia') ? 'anlegen' : 'stand'); if (query.includes('productCreateMedia')) return { productCreateMedia: { media: v.m.map((_, i) => ({ id: 'M' + i, status: 'UPLOADED' })), mediaUserErrors: [] } }; return { product: { media: { nodes: stand() } } }; }; return { q, aufrufe }; };
let n1 = 0; let { q: q1, aufrufe: au1 } = mkQ(() => (++n1 < 2 ? [{ id: 'M0', status: 'PROCESSING' }, { id: 'M1', status: 'READY' }] : [{ id: 'M0', status: 'READY' }, { id: 'M1', status: 'FAILED' }]));
const karte1 = await neueMedienAnlegen({ q: q1, produktId: 'P', urls: ['u0', 'u1'], warte: async () => {}, versuche: 5 });
ist('Medien: wartet bis alle fertig sind, FAILED fehlt in der Karte', [[...karte1], au1], [[['u0', 'M0']], ['anlegen', 'stand', 'stand']]);
ist('Medien: keine URLs → kein Aufruf', [...(await neueMedienAnlegen({ q: async () => { throw new Error('nie'); }, produktId: 'P', urls: [] }))], []);
let fehler = '';
try { await neueMedienAnlegen({ q: async () => ({ productCreateMedia: { media: [], mediaUserErrors: [{ message: 'kaputt', code: 'INVALID' }] } }), produktId: 'P', urls: ['u'], warte: async () => {} }); } catch (e) { fehler = e.message; }
ist('Medien: Fehler von Shopify wird geworfen', /Medien anlegen: .*kaputt/.test(fehler), true);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
