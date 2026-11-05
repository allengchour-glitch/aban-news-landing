/**
 * Kategorie-Felder der Modell-Fabrik (Fund beider Gegenleser 05.11.2026): ohne `google_product_category`, `gender`, `age_group` und die Shopify-Kategorie nimmt das Google-Schaufenster ein Produkt nicht auf
 * («Missing value» bei Bekleidung). Rein: kein Netz, keine Dateien.
 *
 * NUR BELEGTES: Die Google-Pfade sind die Zeichenketten, die die heutigen «Selbst gestalten»-Produkte im Shop tragen (GEMESSEN 05.11.2026 an 38 Produkten, Metafeld `mm-google-shopping.google_product_category`).
 * Die Shopify-Kategorie-Nummern (`TaxonomyCategory`) stammen aus der Admin-API selbst (Abfrage `taxonomy { categories(search:) }`, GEMESSEN 05.11.2026): Blattkategorie, wo es eine gibt, sonst die vom Shop
 * schon benutzte. Für einen Typ OHNE Eintrag bleiben die Felder LEER und das Hinweis-Tor `kategorie` meldet es: nie raten, `KATEGORIEN` ergänzen, bevor ein Produkt veröffentlicht wird.
 *
 * Erkannt wird am Namen des Handelsprodukts (Teil vor « | », englisch), nicht am Typ des Katalogs: der Typ ist unzuverlässig (Hoodie, Sweatshirt und Tragetasche tragen ihn als «T-SHIRT»).
 */
const GOOGLE = Object.freeze({
  shirts: 'Apparel & Accessories > Clothing > Shirts & Tops',
  hats: 'Apparel & Accessories > Clothing Accessories > Hats',
  totes: 'Luggage & Bags > Shopping Totes',
  mugs: 'Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs',
  posters: 'Home & Garden > Decor > Artwork > Posters, Prints, & Visual Artwork',
  stickers: 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts > Art & Crafting Materials > Embellishments & Trims > Decorative Stickers',
  phoneCases: 'Electronics > Communications > Telephony > Mobile Phone Accessories > Mobile Phone Cases',
  blankets: 'Home & Garden > Linens & Bedding > Bedding > Blankets',
  pillows: 'Home & Garden > Decor > Throw Pillows',
});
const T = (id) => `gid://shopify/TaxonomyCategory/${id}`;

/** Reihenfolge zählt: das erste passende Muster gewinnt. `test` bekommt den englischen Handelsnamen (Kleinschreibung, ohne « | Marke »). */
export const KATEGORIEN = Object.freeze([
  { art: 'phone-case', test: /\b(phone )?case\b.*\b(iphone|samsung|galaxy|pixel|phone)\b|\b(iphone|samsung|galaxy)\b.*\bcase\b/, google: GOOGLE.phoneCases, shopify: T('el-4-8-4-2') },
  { art: 'pillow', test: /\bpillow(?!\s*case)\b/, google: GOOGLE.pillows, shopify: T('hg-3-64') },
  { art: 'blanket', test: /\bblanket\b/, google: GOOGLE.blankets, shopify: T('hg-15-1-4') },
  { art: 'mug', test: /\bmug\b/, google: GOOGLE.mugs, shopify: T('hg-11-10-5-5') },
  { art: 'tote', test: /\btote\b/, google: GOOGLE.totes, shopify: T('lb-11') },
  { art: 'sticker', test: /\bsticker/, google: GOOGLE.stickers, shopify: T('ae-2-1-2-8-4') },
  { art: 'hoodie', test: /\bhoodie\b/, google: GOOGLE.shirts, shopify: T('aa-1-13-13') },
  { art: 'sweatshirt', test: /\bsweatshirt\b/, google: GOOGLE.shirts, shopify: T('aa-1-13-14') },
  { art: 't-shirt', test: /\bt-?shirt\b|\btee\b/, google: GOOGLE.shirts, shopify: T('aa-1-13-8') },
  { art: 'cap', test: /\b(cap|hat|beanie)\b/, google: GOOGLE.hats, shopify: T('aa-2-17') },
  { art: 'canvas', test: /\bcanvas\b/, google: GOOGLE.posters, shopify: T('hg-3-4-2-2') },
  { art: 'poster', test: /\bposter\b/, google: GOOGLE.posters, shopify: T('hg-3-4-2-1') },
]);

const handelsname = (titelEn) => String(titelEn ?? '').split('|')[0].toLowerCase();

/** {art, google, shopify} oder null. */
export function kategorieFuer(titelEn) {
  const n = handelsname(titelEn);
  const k = KATEGORIEN.find((x) => x.test.test(n));
  return k ? { art: k.art, google: k.google, shopify: k.shopify } : null;
}

/**
 * Google-Merkmale aus dem DEUTSCHEN Titel (Zielgruppe steht am Anfang, glossar.ZIELGRUPPE). Ohne Zielgruppe wie bei den heutigen Produkten: unisex, adult.
 * Kinder und Jugend: Google kennt `kids`, aber kein Geschlecht dazu: `unisex`. Baby: `infant`; Kleinkind: `toddler`.
 */
export function zielgruppeFuerGoogle(titelDe) {
  const t = String(titelDe ?? '').trim().toLowerCase();
  if (/^damen\b/.test(t)) return { gender: 'female', age_group: 'adult' };
  if (/^herren\b/.test(t)) return { gender: 'male', age_group: 'adult' };
  if (/^(kinder|jugend)\b/.test(t)) return { gender: 'unisex', age_group: 'kids' };
  if (/^baby\b/.test(t)) return { gender: 'unisex', age_group: 'infant' };
  if (/^kleinkind\b/.test(t)) return { gender: 'unisex', age_group: 'toddler' };
  return { gender: 'unisex', age_group: 'adult' };
}

/** Die Metafelder `mm-google-shopping.*` für ein Produkt (leer, wenn der Typ unbekannt ist). */
export function googleMetafelder(kat, titelDe) {
  if (!kat) return [];
  const z = zielgruppeFuerGoogle(titelDe);
  const f = (key, value) => ({ namespace: 'mm-google-shopping', key, type: 'single_line_text_field', value });
  return [f('google_product_category', kat.google), f('gender', z.gender), f('age_group', z.age_group)];
}
