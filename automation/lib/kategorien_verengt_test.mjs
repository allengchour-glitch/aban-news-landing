import { verengtPasst, baueVerengt, VERENGT_DATEN } from './kategorien_verengt.mjs';
let ok = 0, fehl = 0;
const ist = (n, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) ok++; else { fehl++; console.log(`✗ ${n}\n   ist:  ${JSON.stringify(a)}\n   soll: ${JSON.stringify(b)}`); } };
const regel = { appliedDisjunctively: true, rules: [{ column: 'TITLE', relation: 'CONTAINS', condition: 'schutzhülle für' }, { column: 'TITLE', relation: 'CONTAINS', condition: 'handyhülle' }] };
const d = { handle: 'handy-huellen', titel: 'Handyhüllen', ruleSet: regel, ausschlussG: ['Animals & Pet Supplies', 'Home & Garden'], ausschlussTitel: 'airtag|halsband|staubschutz', min: 3 };
const p = (title, g = '') => ({ title, g, tags: [] });
ist('echte Hülle', verengtPasst(d, p('Handyhülle Silikon für iPhone 15', 'Electronics > Communications > Telephony')), true);
ist('Hundehalsband fällt über die Google-Kategorie', verengtPasst(d, p('Schutzhülle für Hundehalsband', 'Animals & Pet Supplies > Pet Supplies')), false);
ist('AirTag-Hülle fällt über das Titelmuster', verengtPasst(d, p('Schutzhülle für AirTag', 'Electronics > Electronics Accessories')), false);
ist('Gegenprobe: ohne Google-Kategorie bleibt es drin', verengtPasst(d, p('Handyhülle Leder')), true);
ist('Gegenprobe: Titel passt gar nicht zur Grundregel', verengtPasst(d, p('Sonnenhut', 'Electronics')), false);
ist('nurG: Whitelist', verengtPasst({ ...d, ausschlussG: [], nurG: ['Electronics'] }, p('Handyhülle', 'Apparel & Accessories')), false);
const [k] = baueVerengt([d]);
ist('Format wie kategorien.mjs', [k.id, k.handle, k.tag, k.min, k.bestehend], ['v-handy-huellen', 'handy-huellen', 'sort-handy-huellen', 3, true]);
ist('Daten sind eine Liste', Array.isArray(VERENGT_DATEN), true);
for (const e of VERENGT_DATEN) {
  ist(`Daten ${e.handle}: Pflichtfelder`, !!(e.handle && e.titel && e.ruleSet?.rules?.length), true);
  if (e.ausschlussTitel) { let gut = true; try { new RegExp(e.ausschlussTitel, 'i'); } catch { gut = false; } ist(`Daten ${e.handle}: Regex gültig`, gut, true); }
}
// «Westen & Gilets»: «Weste» steckt auch in «Western» und «Krankenschwestern» (26.10.2026: ~80 Western-Stiefel, -Kleider, -Hemden, Armbänder in der Collection, dazu 72 Hundewesten).
// Titel und Google-Kategorien sind echte Beispiele aus dem Katalog.
const W = VERENGT_DATEN.find(e => e.handle === 'westen-gilets');
const w = (t, g) => W ? verengtPasst(W, p(t, g)) : null;
ist('Westen: Eintrag vorhanden', !!W, true);
for (const [t, g] of [['Rundhals Strickweste für Damen', 'Apparel & Accessories > Clothing > Outerwear > Vests'], ['Western Y2K Strap Weste mit Knöpfen', 'Apparel & Accessories > Clothing > Outerwear'], ['Trachtenweste dunkelblau', ''],
  ['Taktische Weste aus Cordura, atmungsaktiv', 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags'], ['Kostüm Hippie Gilet', ''], ['LED-Sportweste für Outdoor-Aktivitäten', 'Sporting Goods > Exercise & Fitness > Sport Safety Lights & Reflectors'], ['Baby Strickweste mit Streifen', 'Apparel & Accessories > Clothing > Baby & Toddler Clothing']])
  ist(`Westen Ja: ${t}`, w(t, g), true);
for (const [t, g] of [['Western Ankle Boots mit Fransen', 'Apparel & Accessories > Shoes'], ['Weites Western-Hemd', 'Apparel & Accessories > Clothing > Shirts & Tops'], ['Eleganter Doubleface-Wollmantel im Western-Stil', 'Apparel & Accessories > Clothing > Outerwear'],
  ['Hemd Western braun', ''], ['Klassisches Krankenschwesternkostüm', ''], ['Hundeweste für mittlere und grosse Hunde', 'Animals & Pet Supplies > Pet Supplies > Dog Supplies'], ['Kompakte 5000mAh Powerbank für Heizwesten', 'Electronics > Electronics Accessories > Power'],
  ['Westenkleid mit Perlenblüten-Brosche', 'Apparel & Accessories > Clothing > Dresses'], ['Zirkonia Herz Armband im Western-Stil', 'Apparel & Accessories > Jewelry > Bracelets'], ['Magazinbeutel für Feldweste aus 1000D Nylon', 'Apparel & Accessories > Handbags, Wallets & Cases > Handbags'], ['Latex Sport Shapewear Weste für definierte Mitte', 'Apparel & Accessories > Clothing > Underwear & Socks']])
  ist(`Westen Nein: ${t}`, w(t, g), false);
ist('Westen Gegenprobe: ein Titel ohne Weste/Gilet passt nie', w('Western Hut', 'Apparel & Accessories'), false);
// konstruiert (im Katalog gibt es keinen solchen Titel): «Gilet» neben «Western» muss die Ausnahme auslösen, sonst fiele ein echtes Gilet heraus
ist('Westen Ja (konstruiert): Western Gilet bleibt', w('Western Gilet mit Fransen', 'Apparel & Accessories > Clothing > Outerwear'), true);
console.log(`${ok} ok, ${fehl} Fehler`); process.exit(fehl ? 1 : 0);
