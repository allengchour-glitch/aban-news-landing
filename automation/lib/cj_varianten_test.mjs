// Tests für die reine Varianten-Logik. Gegenproben in beide Richtungen; die Zusammenfassung steht am ENDE.
import { farbeDeutsch, groesseNormal, optionsArt, zerlegeOptionen, baueAuswahl, aufrunden90, preisFuer, hinweisText, einheitNormal } from './cj_varianten.mjs';
let ok = 0, fehl = 0;
const ist = (name, wert, soll) => {
  const a = JSON.stringify(wert), b = JSON.stringify(soll);
  if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); }
};

// --- Farben
ist('Light Green', farbeDeutsch('Light Green'), { text: 'Hellgrün', sicher: true });
ist('Dark Blue', farbeDeutsch('Dark Blue'), { text: 'Dunkelblau', sicher: true });
ist('Sky Blue', farbeDeutsch('Sky Blue'), { text: 'Himmelblau', sicher: true });
ist('Pink → Rosa', farbeDeutsch('Pink'), { text: 'Rosa', sicher: true });
ist('Gegenprobe: schon deutsch bleibt', farbeDeutsch('Hellgrün'), { text: 'Hellgrün', sicher: true });
ist('Gegenprobe: Rosa bleibt', farbeDeutsch('Rosa'), { text: 'Rosa', sicher: true });
ist('Unbekannt bleibt unsicher', farbeDeutsch('Moonlight Fantasy'), { text: 'Moonlight Fantasy', sicher: false });
ist('Leer', farbeDeutsch(''), { text: '', sicher: false });
ist('Light Pink', farbeDeutsch('Light Pink'), { text: 'Hellrosa', sicher: true });

// --- Grössen
ist('140x183cm', groesseNormal('140x183cm'), '140 × 183 cm');
ist('140*244', groesseNormal('140*244'), '140 × 244 cm');
ist('30,5x20', groesseNormal('30,5x20'), '30.5 × 20 cm');
ist('XL bleibt', groesseNormal('xl'), 'XL');
ist('One Size', groesseNormal('One Size'), 'Einheitsgrösse');
ist('Gegenprobe: Freitext bleibt', groesseNormal('Für Hunde bis 10 kg'), 'Für Hunde bis 10 kg');

// --- Optionsart
ist('Name Color', optionsArt('Color', ['X']), 'farbe');
ist('Name Size', optionsArt('Size', ['S', 'M']), 'groesse');
ist('Specifications mit Massen → Grösse', optionsArt('Specifications', ['140x114cm', '140x183cm', '140x244cm']), 'groesse');
ist('Specification mit Farben → Farbe', optionsArt('Specification', ['Pink', 'Black', 'Gray']), 'farbe');
ist('Gegenprobe: gemischt bleibt Ausführung', optionsArt('Style', ['Classic', 'Modern']), 'ausfuehrung');

// --- Zerlegung: Vorhang 3 Farben × 3 Grössen
const vorhang = [
  ['White-140x183cm', 'v1'], ['Light Green-140x183cm', 'v2'], ['Apricot-140x183cm', 'v3'],
  ['Apricot-140x114cm', 'v4'], ['Apricot-140x244cm', 'v5'], ['Light Green-140x114cm', 'v6'],
  ['Light Green-140x244cm', 'v7'], ['White-140x114cm', 'v8'], ['White-140x244cm', 'v9'],
].map(([key, vid]) => ({ key, vid }));
const z1 = zerlegeOptionen('Color-Specifications', vorhang);
ist('Vorhang zerlegt', z1.ok && z1.zeilen.length, 9);
const a1 = baueAuswahl(z1);
ist('Vorhang Optionen', a1.optionen.map(o => `${o.name}:${o.werte.join('/')}`), ['Farbe:Weiss/Hellgrün/Aprikose', 'Abmessung:140 × 183 cm/140 × 114 cm/140 × 244 cm']);
ist('Vorhang: nichts unsicher', a1.unsicher, []);
ist('Vorhang v2 = Hellgrün, 183', a1.varianten.find(v => v.vid === 'v2').werte, { Farbe: 'Hellgrün', Abmessung: '140 × 183 cm' });

// --- Schal: Konstante «Excluding Power Bank» wird ein Hinweis, KEINE Auswahl
const farben = ['Pink', 'Black', 'Gray', 'Brown'];
const schal = farben.map((f, i) => ({ key: `Excluding Power Bank-${f}`, vid: 's' + i }));
const a2 = baueAuswahl(zerlegeOptionen('Specification-Color', schal));
ist('Schal: nur Farbe als Option', a2.optionen.map(o => o.name), ['Farbe']);
ist('Schal: Hinweis Powerbank', a2.hinweise, [{ name: 'Specification', wert: 'Excluding Power Bank' }]);
ist('Schal: Farben deutsch', a2.optionen[0].werte, ['Rosa', 'Schwarz', 'Grau', 'Braun']);

// --- Bindestrich im Wert («Rose-Red» als Farbe)
const bs = [{ key: 'Rose-Red-XL', vid: 'a' }, { key: 'Black-XL', vid: 'b' }, { key: 'Rose-Red-M', vid: 'c' }, { key: 'Black-M', vid: 'd' }];
const z3 = zerlegeOptionen('Color-Size', bs);
ist('Bindestrich im Wert', z3.ok && z3.zeilen.map(z => z.werte.join('|')), ['Rose-Red|XL', 'Black|XL', 'Rose-Red|M', 'Black|M']);

// --- Gegenproben: nicht raten
ist('Gegenprobe: mehr Teile als Optionen, kein Anker', zerlegeOptionen('Color-Size', [{ key: 'A-B-C', vid: 'x' }]).ok, false);
ist('Gegenprobe: doppelte Kombination', zerlegeOptionen('Color', [{ key: 'Red', vid: '1' }, { key: 'red', vid: '2' }]).ok, false);
ist('Gegenprobe: 4 Optionen', zerlegeOptionen('A-B-C-D', [{ key: 'a-b-c-d', vid: '1' }]).ok, false);
ist('Gegenprobe: Schlüssel fehlt', zerlegeOptionen('Color', [{ key: '', vid: '1' }]).ok, false);
ist('Gegenprobe: alles konstant', baueAuswahl(zerlegeOptionen('Color', [{ key: 'Red', vid: '1' }])).ok, false);
ist('Gegenprobe: keine Namen', zerlegeOptionen('', [{ key: 'x', vid: '1' }]).ok, false);
// Übersetzung darf keine zwei Werte gleich machen (Pink→Rosa und Rosa)
ist('Gegenprobe: Pink und Rosa kollidieren', baueAuswahl(zerlegeOptionen('Color', [{ key: 'Pink', vid: '1' }, { key: 'Rosa', vid: '2' }])).ok, false);

// --- Preise
ist('aufrunden90 15.16', aufrunden90(15.16), 15.9);
ist('aufrunden90 14.90 bleibt', aufrunden90(14.9), 14.9);
ist('aufrunden90 14.95 → 15.90', aufrunden90(14.95), 15.9);
ist('Preis: gleiche EK → gleicher Preis', preisFuer({ basisPreis: 14.9, basisKostenChf: 10.82, ekBasisUsd: 2.94, ekUsd: 2.94 }).preis, 14.9);
ist('Preis: billigere Variante nie billiger', preisFuer({ basisPreis: 14.9, basisKostenChf: 10.82, ekBasisUsd: 2.94, ekUsd: 2.27 }).preis, 14.9);
ist('Preis: viel teurere Variante teurer', preisFuer({ basisPreis: 14.9, basisKostenChf: 10.82, ekBasisUsd: 2.94, ekUsd: 9.0 }).preis > 14.9, true);
ist('Preis: kleiner Aufschlag unter 5 Rappen bleibt gleich', preisFuer({ basisPreis: 14.9, basisKostenChf: 10.82, ekBasisUsd: 2.94, ekUsd: 2.99 }).preis, 14.9);
ist('Gegenprobe: unbekannte Kosten → Einheitspreis', preisFuer({ basisPreis: 14.9, basisKostenChf: null, ekBasisUsd: 2.94, ekUsd: 9 }).einheitspreis, true);
ist('Gegenprobe: kein Preis', preisFuer({ basisPreis: 0, basisKostenChf: 5, ekBasisUsd: 1, ekUsd: 1 }).ok, false);
ist('Marge der teureren Variante bleibt', (() => { const p = preisFuer({ basisPreis: 14.9, basisKostenChf: 10.82, ekBasisUsd: 2.94, ekUsd: 9.0 }); return p.preis - p.kostenChf >= 14.9 - 10.82 - 0.01; })(), true);

ist('Gegenprobe: Rotary ist keine Farbe', farbeDeutsch('Rotary Phone').sicher, false);
ist('Gegenprobe: Grünkohl ist keine Farbe', farbeDeutsch('Grünkohl').sicher, false);
ist('Dunkelblau bleibt', farbeDeutsch('Dunkelblau'), { text: 'Dunkelblau', sicher: true });

// --- «Style N» → «Modell N» (Uhren-Fall), und es bleibt eindeutig
const uhr = baueAuswahl(zerlegeOptionen('Style', [{ key: 'Style 1', vid: 'u1' }, { key: 'Style2', vid: 'u2' }, { key: 'Style10', vid: 'u3' }]));
ist('Style → Modell', uhr.optionen[0].werte, ['Modell 1', 'Modell 2', 'Modell 10']);
ist('Style: nichts unsicher', uhr.unsicher, []);
ist('Gegenprobe: «Stylish» bleibt unsicher', baueAuswahl(zerlegeOptionen('Style', [{ key: 'Stylish', vid: '1' }, { key: 'Plain', vid: '2' }])).unsicher.length, 2);

// Konfektionsgrössen bleiben «Grösse» (Gegenprobe zu «Abmessung»), sonst fehlte der Kleider-Hinweis bei Kleidern
const kl = baueAuswahl(zerlegeOptionen('Color-Size', [{ key: 'Red-S', vid: '1' }, { key: 'Red-M', vid: '2' }, { key: 'Blue-S', vid: '3' }, { key: 'Blue-M', vid: '4' }]));
ist('Kleid: Grösse bleibt Grösse', kl.optionen.map(o => o.name), ['Farbe', 'Grösse']);
ist('Kein Optionsname löst den Kleider-Hinweis des Themes bei Massen aus', a1.optionen.every(o => !/gr[öo]sse|size/i.test(o.name)), true);

// --- Optionsnamen, Hinweise, KI-Übersetzung (extra)
const tasse = baueAuswahl(zerlegeOptionen('Style-Capacity', [{ key: '1 Style-420ml', vid: '1' }, { key: '2 Style-420ml', vid: '2' }, { key: '1 Style-350ml', vid: '3' }, { key: '2 Style-350ml', vid: '4' }]));
ist('Tasse: Namen Modell × Inhalt', tasse.optionen.map(o => o.name), ['Modell', 'Inhalt']);
ist('Tasse: Werte', tasse.optionen.map(o => o.werte), [['Modell 1', 'Modell 2'], ['420 ml', '350 ml']]);
ist('Tasse: nichts unsicher', tasse.unsicher, []);
ist('Hinweis Inhalt', hinweisText({ name: 'Capacity', wert: '400ml' }), 'Inhalt: 400 ml.');
ist('Hinweis Powerbank', hinweisText({ name: 'Specification', wert: 'Excluding Power Bank' }), 'Ohne Powerbank (nicht im Lieferumfang).');
ist('Gegenprobe: unbekannte Konstante → null', hinweisText({ name: 'Mode', wert: 'Fancy' }), null);
ist('Gegenprobe: Zahl ohne Einheit → null', hinweisText({ name: 'Capacity', wert: 'big' }), null);
ist('einheitNormal 5V', einheitNormal('5v'), '5 V');
const oel = zerlegeOptionen('Color', [{ key: 'Oil Painting Blue', vid: '1' }, { key: 'Cherry Blossom Red', vid: '2' }]);
ist('ohne Übersetzung: unsicher', baueAuswahl(oel).unsicher.length, 2);
const oel2 = baueAuswahl(oel, { wert: { 'Oil Painting Blue': 'Ölgemälde Blau', 'Cherry Blossom Red': 'Kirschblüte Rot' } });
ist('mit Übersetzung: Werte + nichts unsicher', [oel2.optionen[0].werte, oel2.unsicher], [['Ölgemälde Blau', 'Kirschblüte Rot'], []]);
ist('Gegenprobe: gleiche Übersetzung zweier Werte wird abgelehnt', baueAuswahl(oel, { wert: { 'Oil Painting Blue': 'Blau', 'Cherry Blossom Red': 'Blau' } }).ok, false);
ist('Länge heisst Länge', baueAuswahl(zerlegeOptionen('Length', [{ key: '1m', vid: '1' }, { key: '2m', vid: '2' }])).optionen[0].name, 'Länge');

// Dünnes Raster → eine zusammengefasste Auswahl; vollständige Raster bleiben getrennt
const duenn = baueAuswahl(zerlegeOptionen('Style-Capacity', [{ key: '1 Style-420ml', vid: '1' }, { key: '2 Style-420ml', vid: '2' }, { key: '3 Style-350ml', vid: '3' }, { key: '4 Style-350ml', vid: '4' }, { key: '5 Style-240ml', vid: '5' }, { key: '6 Style-240ml', vid: '6' }]));
ist('dünnes Raster: eine Option', duenn.optionen.map(o => o.name), ['Ausführung']);
ist('dünnes Raster: Werte', duenn.optionen[0].werte, ['Modell 1 · 420 ml', 'Modell 2 · 420 ml', 'Modell 3 · 350 ml', 'Modell 4 · 350 ml', 'Modell 5 · 240 ml', 'Modell 6 · 240 ml']);
ist('dünnes Raster: Variante trägt den Wert', duenn.varianten[2].werte, { Ausführung: 'Modell 3 · 350 ml' });
const fast = ['Red', 'Blue', 'Green'].flatMap(f => ['S', 'M', 'L', 'XL'].map(g => ({ key: `${f}-${g}`, vid: f + g }))).slice(0, 11);   // 11 von 12
ist('Gegenprobe: fast vollständiges Raster bleibt getrennt', baueAuswahl(zerlegeOptionen('Color-Size', fast)).optionen.map(o => o.name), ['Farbe', 'Grösse']);

// ── 26.10.2026: «Gold black» galt als «bereits deutsch» (Regex prüfte nur den Anfang) · Codes unter «Color» sind Modelle ──
ist('Gold black → ganz übersetzt', farbeDeutsch('Gold black'), { text: 'Gold / Schwarz', sicher: true });
ist('Gold white → ganz übersetzt', farbeDeutsch('Gold white').text, 'Gold / Weiss');
ist('Silver blue weiterhin richtig', farbeDeutsch('Silver blue').text, 'Silber / Blau');
ist('Gegenprobe: deutsch bleibt deutsch (Bindestrich)', farbeDeutsch('Silber-Schwarz'), { text: 'Silber-Schwarz', sicher: true });
ist('Gegenprobe: Hellgrün bleibt', farbeDeutsch('Hellgrün').text, 'Hellgrün');
ist('Gegenprobe: «Beige-Camel» bleibt unverändert', farbeDeutsch('Beige-Camel'), { text: 'Beige-Camel', sicher: true });
ist('Rose Red Black → Rosenrot / Schwarz', farbeDeutsch('Rose Red Black').text, 'Rosenrot / Schwarz');
ist('Colorful Rose Red', farbeDeutsch('Colorful Rose Red').text, 'Bunt / Rosenrot');
ist('Deep Green + Black', farbeDeutsch('Deep Green Black').text, 'Tiefgrün / Schwarz');
ist('Gegenprobe: unbekanntes Wort bleibt unsicher', farbeDeutsch('Gold noodles').sicher, false);
ist('Gegenprobe: «Goldfisch» ist keine Farbe', farbeDeutsch('Goldfisch').sicher, false);
const codes = baueAuswahl(zerlegeOptionen('Color', ['A', 'B', 'C', 'Black'].map((k, i) => ({ key: k, vid: String(i) }))));
ist('Codes: Option heisst Modell', codes.optionen.map(o => o.name), ['Modell']);
ist('Codes: Werte', codes.optionen[0].werte, ['Modell A', 'Modell B', 'Modell C', 'Schwarz']);
ist('Gegenprobe: echte Farben bleiben Farbe', baueAuswahl(zerlegeOptionen('Color', ['Red', 'Blue', 'Black'].map((k, i) => ({ key: k, vid: String(i) })))).optionen[0].name, 'Farbe');
ist('Gegenprobe: ein einzelner Code unter Farben ist keine Modell-Option', baueAuswahl(zerlegeOptionen('Color', ['Red', 'Blue', 'Black', 'A'].map((k, i) => ({ key: k, vid: String(i) })))).optionen[0].name, 'Farbe');

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
