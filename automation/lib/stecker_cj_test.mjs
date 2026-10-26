// Tests für lib/stecker_cj.mjs. Schlüssel sind echte CJ-Variantenschlüssel aus dem Zwischenspeicher vom 26.10.2026. Gegenproben in BEIDE Richtungen.
import { fremdSteckerKey, euroSteckerKey, steckerUrteil, steckerUrteilOptionen } from './stecker_cj.mjs';
let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };

// ── Fremdstecker ──
for (const k of ['White-US', 'Black-UK', 'Red-AU', 'Black-JP', 'Silver Gray-800W US', 'Silver Gray-800W UK', 'Deep wood grain-US WiFi', 'UK Plug', 'G42 British Standard', 'G42 American Standard',
  'White-American Standard 110V', 'Gold-Golden American Standard', 'Black-110V', 'Pink-US Plug'])
  ist(`fremd: ${k}`, fremdSteckerKey(k), true);
// ── Euro / unauffällig: bleibt ──
for (const k of ['Black-EU', 'White-EU Plug', 'EU-3 Million', 'G42 European Standard', 'White-European Standard 220V', 'Silver Gray-800W EU', 'Deep wood grain-EU', 'Black-220V EU'])
  ist(`bleibt: ${k}`, fremdSteckerKey(k), false);
// ── Fehlalarme vermeiden: «US» mitten im Schlüssel, Ringgrössen, Grössen, Farben ──
for (const k of ['US Size 10-Main Ring', 'US Size 10-Ring Set', 'Gold-US 7', 'Blue-Medium', 'Black-XL', 'Rose Red', 'Black python-S', 'Jungle-L', 'Mushroom-Cap', 'Black-Australia Blue', '', null, undefined])
  ist(`kein Stecker: ${k}`, fremdSteckerKey(k), false);
ist('Rangfolge: das Wort «European Standard» gewinnt; ein «EU» VOR einer 110-V-Angabe rettet die falsche Spannung nicht', [fremdSteckerKey('European Standard 110V'), fremdSteckerKey('Black-EU 110V'), fremdSteckerKey('Black-110V')], [false, true, true]);
ist('«Standard» allein ist kein Stecker', fremdSteckerKey('Black-Standard'), false);
ist('220 V allein ist kein Fremdstecker (nur eine Spannung)', fremdSteckerKey('Black-220V'), false);
ist('euroSteckerKey: EU ja, US nein', [euroSteckerKey('Black-EU'), euroSteckerKey('Black-US'), euroSteckerKey('')], [true, false, false]);

ist('«US-3 Million» allein ist nicht sicher (könnte eine Grösse sein)', fremdSteckerKey('US-3 Million'), false);
// ── Urteil je Produkt ──
const SV = (...skus) => skus.map((s, i) => ({ id: 'v' + i, sku: s }));
const cj = { a: 'Black-EU', b: 'Black-US', c: 'Black-UK' };
ist('gemischt: EU bleibt, US/UK werden gelöscht', steckerUrteil(SV('a', 'b', 'c'), cj), { loeschen: ['v1', 'v2'], draft: false, fremd: 2, euro: 1, unbekannt: 0, grund: '2 von 3 Varianten mit Fremdstecker' });
ist('nur Fremdstecker: Entwurf, nichts löschen', steckerUrteil(SV('b', 'c'), { b: 'White-US', c: 'Pink-US' }), { loeschen: [], draft: true, fremd: 2, euro: 0, unbekannt: 0, grund: 'alle Varianten mit Fremdstecker' });
ist('nur EU: nichts zu tun', steckerUrteil(SV('a'), { a: 'Black-EU' }).fremd, 0);
ist('Farben ohne Stecker: nichts zu tun', steckerUrteil(SV('a', 'b'), { a: 'Black', b: 'White' }), { loeschen: [], draft: false, fremd: 0, euro: 0, unbekannt: 0, grund: 'kein Fremdstecker' });
ist('SKU nicht zuzuordnen, CJ hat nur Fremdstecker (Pfannkuchenmaschine «Black-UK»): Entwurf', steckerUrteil(SV('unbekannt'), { x: 'Black-UK' }).draft, true);
ist('Gegenprobe: SKU nicht zuzuordnen, CJ führt auch EU: die unbekannte Variante bleibt (nicht raten)', steckerUrteil(SV('unbekannt', 'a'), { a: 'Black-EU', b: 'Black-US' }), { loeschen: [], draft: false, fremd: 0, euro: 1, unbekannt: 1, grund: 'kein Fremdstecker' });
ist('Ringe mit «US Size»: nie ein Urteil', steckerUrteil(SV('r1', 'r2'), { r1: 'US Size 10-Main Ring', r2: 'US Size 9-Main Ring' }).fremd, 0);
ist('Stecker vorn im Schlüssel (Kamera): mit Geschwister «EU-…» wird «US-…» gelöscht', steckerUrteil(SV('a', 'b'), { a: 'EU-3 Million', b: 'US-3 Million' }).loeschen, ['v1']);
ist('Gegenprobe: ohne «EU-…» am Anfang bleibt «US-6» (Grösse) unberührt', steckerUrteil(SV('a', 'b'), { a: 'US-6', b: 'US-7' }).fremd, 0);

// ── Urteil aus Shop-Optionswerten (ohne CJ-Datenblatt) ──
const OV = (...w) => w.map((werte, i) => ({ id: 'o' + i, werte }));
ist('Optionen: «Dunkelblau Edelstahl 5L / US» fliegt, «/ EU» bleibt', steckerUrteilOptionen(OV(['Dunkelblau Edelstahl 5L', 'EU'], ['Dunkelblau Edelstahl 5L', 'US'], ['Dunkelblau Edelstahl 5L', 'UK'])).loeschen, ['o1', 'o2']);
ist('Optionen: «Weiss-UK» in der Farbe trifft', steckerUrteilOptionen(OV(['Weiss-UK'], ['Weiss-EU'])).loeschen, ['o0']);
ist('Optionen: Stecker unter «Grösse» (Werte AU/UK/US) trifft, EU bleibt', steckerUrteilOptionen(OV(['AU'], ['UK'], ['US'], ['EU'])).loeschen, ['o0', 'o1', 'o2']);
ist('Optionen: nur Fremdstecker → Entwurf', steckerUrteilOptionen(OV(['Schwarz', 'US'], ['Weiss', 'US'])).draft, true);
ist('Optionen Gegenprobe: Schuhgrössen «US 7» / «UK 6» sind kein Stecker', steckerUrteilOptionen(OV(['US 7'], ['UK 6'], ['EU 39'])).fremd, 0);
ist('Optionen Gegenprobe: Farben und Grössen ohne Stecker', steckerUrteilOptionen(OV(['Rot', 'S'], ['Rot', 'M'], ['Blau', 'L'])), { loeschen: [], draft: false, fremd: 0, euro: 0, unbekannt: 0, grund: 'kein Fremdstecker' });
ist('Optionen: Stecker nicht in der letzten Option (Modell = US, Farbe = Weiss)', steckerUrteilOptionen(OV(['US', 'Weiss'], ['EU', 'Weiss'])).loeschen, ['o0']);
ist('Optionen: Ringgrösse «Gold-US 7» bleibt, «Gold-US» ohne Zahl trifft', [steckerUrteilOptionen(OV(['Gold-US 7'])).fremd, steckerUrteilOptionen(OV(['Gold-US'], ['Gold-EU'])).fremd], [0, 1]);
ist('leere Eingaben', steckerUrteil([], {}).draft, false);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
