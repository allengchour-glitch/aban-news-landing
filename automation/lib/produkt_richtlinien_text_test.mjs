import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PRODUKT_RICHTLINIEN_HTML, produktSeoBeschreibung } from './produkt_richtlinien_text.mjs';

let n = 0;
const ok = (wert, meldung) => { assert.ok(wert, meldung); n++; };
const hier = dirname(fileURLToPath(import.meta.url));
const quellen = [
  join(hier, '..', 'cj_category_fill.mjs'),
  join(hier, '..', 'cj_trending_import.mjs'),
];
const verboteneMuster = [
  /Lieferung\s+(?:ca\.?\s*)?\d/i,
  /\d+\s*(?:Tage|Werktage)\s+(?:Rückgabe|Rueckgabe)/i,
  /Gepr(?:ü|ue)fte?\s+(?:Qualit(?:ä|ae)t|Angaben)/i,
  /(?:Gratis|Kostenlos\w*)[-\s]?Versand/i,
  /(?:Rabatt|Gutschein|\bCode\s+[A-Z0-9])/i,
];
const hatPauschalclaim = text => verboteneMuster.some(muster => muster.test(text));

ok(PRODUKT_RICHTLINIEN_HTML.includes('/policies/shipping-policy'), 'Versandrichtlinie verlinkt');
ok(PRODUKT_RICHTLINIEN_HTML.includes('/policies/refund-policy'), 'Rueckgaberichtlinie verlinkt');
ok(PRODUKT_RICHTLINIEN_HTML.includes('Preis und Verfügbarkeit'), 'Auswahlabhaengigkeit genannt');
ok(!hatPauschalclaim(PRODUKT_RICHTLINIEN_HTML), 'HTML ohne alte Pauschalclaims');
ok(!/\p{Extended_Pictographic}/u.test(PRODUKT_RICHTLINIEN_HTML), 'HTML ohne Emoji');

const seo = produktSeoBeschreibung('Testprodukt');
ok(seo.includes('Preis und verfügbare Ausführungen'), 'SEO-Text bleibt sachlich');
ok(!hatPauschalclaim(seo), 'SEO-Text ohne alte Pauschalclaims');
ok(produktSeoBeschreibung('') === '', 'Leerer Titel bleibt leer');
ok(produktSeoBeschreibung('A'.repeat(400)).length === 320, 'SEO-Text auf 320 Zeichen begrenzt');

for (const alt of [
  'Lieferung ca. 7 Tage',
  '14 Werktage Rückgabe',
  'Geprüfte Angaben',
  'Kostenloser Versand',
  'Rabatt mit Code TEST20',
]) ok(hatPauschalclaim(alt), `Guard erkennt: ${alt}`);

for (const datei of quellen) {
  const src = readFileSync(datei, 'utf8');
  ok(src.includes("from './lib/produkt_richtlinien_text.mjs'"), `${datei} nutzt den zentralen Text`);
  ok(!hatPauschalclaim(src), `${datei} enthaelt keinen alten Pauschalclaim`);
}

console.log(`${n} ok, 0 Fehler`);
