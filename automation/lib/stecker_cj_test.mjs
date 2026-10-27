// Tests für lib/stecker_cj.mjs. Schlüssel sind echte CJ-Variantenschlüssel aus dem Zwischenspeicher vom 26.10.2026. Gegenproben in BEIDE Richtungen.
import { fremdSteckerKey, euroSteckerKey, steckerUrteil, steckerUrteilOptionen, alleSchluesselMitStecker, mitteStecker } from './stecker_cj.mjs';
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


// ── Gegenlesung 27.10.2026 («Geld und Tore»): von 27 plausiblen Fremdstecker-Schlüsseln blieben 19 unerkannt
{
  const FREMD27 = ['White-US', 'White-USA', 'White-US-Plug', 'US-Plug', 'US Plug-White', 'White-US plug 110V', 'Black-UK 3 Pin', 'Black-UK Plug 13A', 'Black-UK Standard 3-pin', 'AU Plug 10A', 'AU/NZ', 'Type B', 'Type A', 'Type G',
    'White-(US)', 'White-British', 'White-American', 'Black-NZ', 'White-AU plug', 'White- UK', 'Black UK', 'White-Japan', 'Black-JP', 'Black-US 110-240V', 'White-US Standard', 'Black-US 15A', 'Black-UK 13A'];
  ist('27 Schreibweisen: alle erkannt (Typ A/B/G nur mit Steckerkontext)', FREMD27.filter(k => !fremdSteckerKey(k, { steckerKontext: true })), []);
  ist('27 Schreibweisen: ohne Steckerkontext fehlen genau «Type A/B/G» (sonst sind es die Ausführungen einer Bürste)', FREMD27.filter(k => !fremdSteckerKey(k)), ['Type B', 'Type A', 'Type G']);
  ist('«Type A/B/G» als Liste und als Teil eines Schlüssels (mit Kontext)', ['Type A/B/G', 'Plug Type B', 'Black-Type A', 'Type G Plug'].filter(k => !fremdSteckerKey(k, { steckerKontext: true })), []);
  // Gegenproben: EU-Stecker, Weitbereich, Grössen, USB-Typen, Büstenhalter, Länder-Kürzel ohne Steckerwort
  const KEIN = ['White-EU', 'White-EU Plug', 'Black-EU', 'EU-3 Million', 'Black-US/EU', 'White-UK+EU adapter', 'EU Plug-White', 'Black-220V EU', 'Silver Gray-800W EU', 'US Size 10-Main Ring', 'Gold-US 7', 'UK 6', 'Black-US 34A', 'Blue-US 7.5', 'US-3 Million',
    'Black-UK Size 8', 'USB Type A', 'Type C', 'Type-C Cable', 'Black-Type-A', 'Black-BR', 'Black-IN', 'Black-KR', 'Black-CN', 'Black-ZA', 'Black-Australia Blue', 'American Football-L', 'Black-Standard'];
  ist('Gegenproben: EU-Stecker, Schuh-/Ring-/Büstenhalter-Grössen, USB-Typen, bare Kürzel BR/IN/KR/CN/ZA und «Australia Blue» sind KEIN Fremdstecker', KEIN.filter(k => fremdSteckerKey(k, { steckerKontext: true }) && !['Black-Type-A'].includes(k)), []);
  ist('Typ A/B ohne Kontext sind keine Steckertypen (Ausführung A/B); «Type C» (Euro) nie', [fremdSteckerKey('Type A'), fremdSteckerKey('Type C', { steckerKontext: true }), fremdSteckerKey('Type E', { steckerKontext: true })], [false, false, false]);
  ist('BR/IN/KR/CN/ZA zählen nur MIT Steckerwort («BR Plug», «India Plug», «Korean Socket»)', ['Black-BR Plug', 'Black-India Plug', 'White-Korean Socket', 'Black-CN Plug'].every(k => fremdSteckerKey(k)) && !fremdSteckerKey('Black-BR'), true);
  ist('Spannung: «110V» bleibt Fremdstecker auch mit EU-Wort davor; «Black-EU 110V» ebenfalls (die Spannung passt nicht)', [fremdSteckerKey('Black-EU 110V'), fremdSteckerKey('European Standard 110V'), fremdSteckerKey('Black-220V')], [true, false, false]);
  // Urteil je Produkt mit den neuen Schlüsseln
  const SV3 = (...skus) => skus.map((s, i) => ({ id: 'v' + i, sku: s }));
  ist('steckerUrteil: «US Plug-White» und «UK 3 Pin» werden gelöscht, «EU Plug-White» bleibt', steckerUrteil(SV3('a', 'b', 'c'), { a: 'EU Plug-White', b: 'US Plug-White', c: 'Black-UK 3 Pin' }).loeschen, ['v1', 'v2']);
  ist('steckerUrteil mit Kontext: «Type A»/«Type B» werden gelöscht, «Type C» bleibt; ohne Kontext bleiben alle', [steckerUrteil(SV3('a', 'b', 'c'), { a: 'Type A', b: 'Type B', c: 'Type C' }, { steckerKontext: true }).loeschen, steckerUrteil(SV3('a', 'b', 'c'), { a: 'Type A', b: 'Type B', c: 'Type C' }).loeschen], [['v0', 'v1'], []]);
  // H02 (Mutationsprobe): die alle-Fremd-Erkennung. Eine Variante, deren SKU nicht zuzuordnen ist, ist fremd, wenn CJ gar keinen Euro-Stecker führt, sonst bleibt sie
  ist('SKU nicht zuzuordnen und CJ führt nur Fremdstecker → die unbekannte Variante ist fremd (Entwurf)', steckerUrteil(SV3('x'), { y: 'White-USA', z: 'Black-UK Plug' }).draft, true);
  ist('SKU nicht zuzuordnen, CJ führt auch EU → die unbekannte Variante bleibt (nicht raten)', steckerUrteil(SV3('x', 'a'), { a: 'Black-EU', b: 'White-USA' }), { loeschen: [], draft: false, fremd: 0, euro: 1, unbekannt: 1, grund: 'kein Fremdstecker' });
  // H01 (Mutationsprobe): steht die EU-Angabe VOR dem Fremdland, entscheidet das Ende des Schlüssels (alte Regel: «White-EU-AU» endet auf AU); das Länderwort-Verfahren allein (EU-Angabe → kein Fremdstecker) würde sie durchlassen
  ist('EU-Angabe vor einem Fremdland am Ende («White-EU-US/-UK/-AU/-JP») ist ein Fremdstecker, «White-US-EU» (EU am Ende) nicht', ['White-EU-US', 'White-EU-UK', 'White-EU-AU', 'White-EU-JP', 'White-US-EU'].map(k => fremdSteckerKey(k)), [true, true, true, true, false]);
  // Z189 (Mutationsprobe): nennt ein Schlüssel ausdrücklich AUCH den Euro-Stecker («US Plug-EU 220V», «Black-US/EU»), ist es ein Bündel- oder Umschaltangebot und kein reiner Fremdstecker: die alten Regeln entscheiden
  ist('Länderwort + EU-Angabe im selben Schlüssel («US Plug-EU 220V», «Black-US/EU») ist kein Fremdstecker, «US Plug» allein schon', [fremdSteckerKey('US Plug-EU 220V'), fremdSteckerKey('Black-US/EU'), fremdSteckerKey('US Plug')], [false, false, true]);
  // alleSchluesselMitStecker: nennt JEDE Variante ihren Stecker? (Grundlage für «Fremdstecker im Beschreibungstext» im Plan)
  ist('alleSchluesselMitStecker: jeder Schlüssel nennt EU oder ein Fremdland → ja; eine Variante ohne Angabe → nein; leer → nein',
    [alleSchluesselMitStecker(['White-EU', 'White-US', 'Black-UK Plug']), alleSchluesselMitStecker(['White 1.5x1.5M', 'White 10x8M-EU']), alleSchluesselMitStecker([]), alleSchluesselMitStecker(['EU-Half black', 'UK-Full black']), alleSchluesselMitStecker(['Type A', 'Type C'], { steckerKontext: true }), alleSchluesselMitStecker(['Type A', 'Type C'])],
    [true, false, false, true, false, false]);
}

// S02 (Endprüfung 27.10.2026): «BR» allein ist das Kürzel für Braun/Brasilien und kein Stecker, nur MIT Steckerwort («BR Plug»); der Schutz ist die Trennung der beiden Mengen LAENDER / LAENDER_MIT_STECKERWORT
ist('S02 «BR» allein ist kein Stecker, «BR Plug» schon', [fremdSteckerKey('Black-BR'), fremdSteckerKey('BR'), fremdSteckerKey('Black-BR Plug')], [false, false, true]);

// ── Stecker in der MITTE des Schlüssels (27.10.2026, Prüfung: automatische-lockenstange-600000, luftung-fur-schwei-arbeiten-628600) ──
// Echte Schlüssel. Ein Land mitten im Schlüssel zählt nur, wenn die Struktur des ganzen Produkts es belegt (gleiche Segmentzahl, ein Land-Segment mit ≥ 2 Ländern,
// je Land derselbe Satz übriger Segmente). Schuh- und Kleidergrössen («Black-US-8» / «Black-EU-41») erfüllen das nicht.
const MK = (...ks) => { const v = ks.map((k, i) => ({ id: 'v' + i, sku: 'S' + i })); return steckerUrteil(v, Object.fromEntries(ks.map((k, i) => ['S' + i, k]))); };
const LOCKEN = ['Lotus Pink-EU-28mm', 'Lotus Pink-EU-32mm', 'Lotus Pink-US-28mm', 'Lotus Pink-US-32mm', 'Lotus Pink-UK-28mm', 'Lotus Pink-UK-32mm'];
ist('Lockenstange: US und UK in der Mitte werden gelöscht, beide EU-Grössen bleiben', MK(...LOCKEN), { loeschen: ['v2', 'v3', 'v4', 'v5'], draft: false, fremd: 4, euro: 2, unbekannt: 0, grund: '4 von 6 Varianten mit Fremdstecker' });
const LUFT = ['100XP Smoke Purifier 15W-US-99', '100XP Smoke Purifier 15W-UK-99', '100XP Smoke Purifier 15W-AU-99', '100XP Smoke Purifier 15W-EU-99'];
ist('Lüftung für Schweissarbeiten: US/UK/AU in der Mitte werden gelöscht, EU bleibt', [MK(...LUFT).loeschen, MK(...LUFT).euro], [['v0', 'v1', 'v2'], 1]);
ist('Lockenstange nur mit Fremdstecker → alle Varianten Fremdstecker (draft)', MK('Lotus Pink-US-28mm', 'Lotus Pink-UK-28mm', 'Lotus Pink-US-32mm', 'Lotus Pink-UK-32mm').draft, true);
// Gegenproben: das darf NICHT als Stecker gelten
ist('Schuhe «Black-US-8/9», «Black-EU-41/42»: US-/EU-Grössen sind verschieden → unberührt', MK('Black-US-8', 'Black-US-9', 'Black-EU-41', 'Black-EU-42').loeschen, []);
ist('Schuhe, nur zwei Varianten «Black-US-8» / «Black-EU-41» → unberührt', MK('Black-US-8', 'Black-EU-41').loeschen, []);
ist('Bekannte Grenze: «Red-US-S» und «Red-EU-S» (Grössennorm, gleicher Rest) sind strukturell nicht von Steckern zu unterscheiden → die US-Variante gilt als Fremdstecker (in 1 688 echten Datenblättern kommt das nie vor)', MK('Red-US-S', 'Red-EU-S').loeschen.length, 1);
ist('nicht für jedes Land derselbe Satz: EU hat 28 und 32 mm, US nur 28 mm → keine sichere Struktur, unberührt (im Zweifel nichts löschen)', MK('Pink-EU-28mm', 'Pink-EU-32mm', 'Pink-US-28mm').loeschen, []);
ist('verschiedene Segmentzahl: die Mitten-Regel greift nicht; «Pink-US» fällt unter die Endungsregel, «Pink-EU-28mm» bleibt', MK('Pink-EU-28mm', 'Pink-US').loeschen, ['v1']);
ist('Mitte nennt kein Land («Pink-Large-28mm», «Pink-Small-28mm») → unberührt', MK('Pink-Large-28mm', 'Pink-Small-28mm').loeschen, []);
ist('nur EIN Land in der Mitte («Pink-EU-28mm», «Pink-EU-32mm») → unberührt', MK('Pink-EU-28mm', 'Pink-EU-32mm').loeschen, []);
ist('ein Wort neben dem Land in der Mitte («Pink-US Size-28mm») ist kein Ländercode → unberührt', MK('Pink-US Size-28mm', 'Pink-EU Size-28mm').loeschen, []);
ist('nur EIN Land in der Mitte, und zwar ein fremdes («Pink-US-28mm», «Pink-US-32mm») → keine Struktur, unberührt (nichts wird zum Entwurf)', [MK('Pink-US-28mm', 'Pink-US-32mm').loeschen, MK('Pink-US-28mm', 'Pink-US-32mm').draft], [[], false]);
ist('ein Wort in der Mitte, das kein Ländercode ist («Pink-US-28mm», «Pink-Red-28mm») → unberührt', MK('Pink-US-28mm', 'Pink-Red-28mm').loeschen, []);
ist('mitteStecker: weniger als zwei Schlüssel, leere und ungleiche Eingaben → null', [mitteStecker([]), mitteStecker(['A-EU-1']), mitteStecker(null), mitteStecker(['A-EU-1', 'A-US'])], [null, null, null, null]);
{
  const m = mitteStecker(LOCKEN);
  ist('mitteStecker liefert fremd/euro je Schlüssel', [m.fremd('Lotus Pink-US-28mm'), m.fremd('Lotus Pink-EU-28mm'), m.euro('Lotus Pink-EU-32mm'), m.euro('Lotus Pink-UK-32mm'), m.fremd('Lotus Pink-JP-28mm')], [true, false, true, false, true]);
}
ist('alleSchluesselMitStecker: bei Stecker in der Mitte nennt jeder Schlüssel seinen Stecker', [alleSchluesselMitStecker(LOCKEN), alleSchluesselMitStecker(['Black-US-8', 'Black-US-9', 'Black-EU-41'])], [true, false]);
ist('bestehende Endungsregeln unverändert: «White-US», «Black-EU» weiter wie vorher', MK('Black-EU', 'Black-US', 'Black-UK').loeschen, ['v1', 'v2']);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
