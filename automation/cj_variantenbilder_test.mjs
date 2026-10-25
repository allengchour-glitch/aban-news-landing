// Tests für die Bildzuordnung der Varianten. Gegenproben in beide Richtungen; Zusammenfassung am ENDE.
import { bildZuordnung, updateEingabe, cjSku } from './cj_variantenbilder.mjs';
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
ist('Mutationseingabe', updateEingabe({ aktionen: [{ variante: 'v1', art: 'vorhanden', mediaId: 'm1' }, { variante: 'v2', art: 'neu', url: 'u' }, { variante: 'v3', art: 'ohne_cj_bild' }, { variante: 'v4', art: 'zu_viele_neue' }] }),
  [{ id: 'v1', mediaId: 'm1' }, { id: 'v2', mediaSrc: ['u'] }]);

// SKU-Formen im Shop
ist('SKU mit CJ-Vorsatz', cjSku('CJ-CJWY289988501AZ'), 'CJWY289988501AZ');
ist('SKU ohne Vorsatz bleibt', cjSku('CJYD315797801AZ'), 'CJYD315797801AZ');
ist('Alt-SKU mit Farbsuffix', cjSku('CJ-CJJJCFCF00364-Red'), 'CJJJCFCF00364-Red');
ist('Gegenprobe: CJ-<pid> bleibt unverändert', cjSku('CJ-2608060715151607300'), 'CJ-2608060715151607300');
ist('leer', cjSku(''), '');

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
