/**
 * Ein Eintrag für den Google-Merchant-Feed — und die Entscheidung, ob ein Produkt hineingehört.
 *
 * WARUM EIGENES MODUL (gemessen 2026-10-17):
 * Der Generator `automation/autopilot/merchant_feed.mjs` schrieb bei JEDEM Produkt
 * `<g:identifier_exists>no</g:identifier_exists>` und liess `google_product_category` ganz weg —
 * obwohl der Shop beides hat: **84 % der Fortura-Artikel tragen einen Barcode (GTIN)** und
 * **100 % der zuletzt geänderten 600 Produkte haben ein `mm-google-shopping.google_product_category`**.
 * Ein Feed, der eine vorhandene GTIN verschweigt, verliert in Google Shopping die Zuordnung zum
 * Produkt (keine Preisvergleich-Karte, schlechtere Platzierung) — und `identifier_exists:no` bei
 * einem Artikel MIT GTIN ist schlicht eine Falschangabe gegenüber Google.
 *
 * Zweitens filterte der Generator nur über eine handgeschriebene Titel-Liste (`nike|adidas|…`).
 * Die Sperrtags, die der Katalog selbst trägt (`nicht-google-bewerben`, `gmc-adult-pull`,
 * `google-policy-flag`, …), las er NICHT — dieselbe Falle wie beim `publish_guard`:
 * TAGS LESEN, BEVOR MAN HANDELT. Hier zählt sie doppelt, weil ein Adult-Artikel im
 * Merchant-Feed eine Kontosperre kosten kann.
 */
import { sperrTags } from './kanal_sperren.mjs';

/**
 * Lizenz-/Figurennamen. Ein Kostüm „Batman Classic" oder „Kostüm Pokemon Pikachu" im
 * Merchant-Feed ist der klassische Grund für eine KONTOSPERRE (Markenrechtsverletzung) —
 * schlimmer als ein einzelner abgelehnter Artikel.
 *
 * GEMESSEN 2026-10-24 an der Fortura-Ware (2371 aktive Produkte): **31 Artikel mit einem
 * Lizenznamen gingen durch** — `RISIKO` kannte nur `disney|frozen`, und „Kostüm Batman Classic"
 * enthält weder „kinder" noch eine der Markenwörter. Alle 31 Titel wurden EINZELN nachgelesen,
 * bevor ein Name hier steht: Harry Potter, Batman, Superman, Sonic, Super Mario, Paw Patrol,
 * Pokemon, Hello Kitty, Spiderman, Mickey Mouse, Peppa, Barbie. Kein Fehltreffer darunter.
 *
 * Die Wortgrenzen sind nicht Zierde, sondern die Gegenprobe (vierte Wiederholung der Klasse
 * „zu breites Muster", vgl. `rueckhol` und `/ring\b/`): ohne `\b` trifft `sonic` das Wort
 * „ultrasonic" und `mario` die „Marionette" — beides harmlose Ware, die stumm verschwände.
 * BEWUSST NICHT IM MUSTER: `anna` und `elsa`. Die Gegenprobe fing sie — `anna` trifft über die
 * Wortgrenze am Bindestrich den Vornamen in „Kapuzenpullover «Anna-Lena»". Beide sind gewöhnliche
 * Vornamen; die Frozen-Figuren deckt `frozen` in `RISIKO` ab. Nicht nachtragen.
 */
export const LIZENZ = /\b(harry potter|batman|superman|spider[- ]?man|paw patrol|pok[eé]mon|peppa|star wars|marvel|avengers|minions?|hello kitty|barbie|mickey|minnie|super mario|sonic|bluey|spongebob|hulk|iron man|captain america)\b/i;

/** Titel/Marken, die Google als Markenfälschungs- oder Safety-Risiko lesen kann. */
export const RISIKO = /\b(nike|adidas|puma|reebok|converse|vans|disney|frozen|timberland|chanel|gucci|rolex|louis vuitton|supreme)\b|baby|kinder|lern-tablet|schwimmring|schwimmbrille|schwimmflügel|pool.?float/i;

export const escXml = s => String(s ?? '').replace(/[<>&"']/g, m =>
  ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[m]));

/** Google kappt Titel bei 150 Zeichen — lieber am Wort trennen als mitten im Wort. */
export function kuerzeTitel(titel, max = 150) {
  const t = String(titel ?? '').trim();
  if (t.length <= max) return t;
  const schnitt = t.slice(0, max);
  const luecke = schnitt.lastIndexOf(' ');
  return (luecke > max * 0.6 ? schnitt.slice(0, luecke) : schnitt).trim();
}

/**
 * Gehört das Produkt in den Feed?
 * @returns {{ok: boolean, grund: string}} — `grund` ist immer gefüllt, auch bei ok:false,
 *   damit ein Lauf sagen kann, WARUM etwas fehlt (ein stummer Skip sieht aus wie „keine Daten").
 */
export function pruefeProdukt(p = {}) {
  const tags = p.tags || [];
  const treffer = sperrTags(tags);
  if (treffer.length) return { ok: false, grund: `Sperrtag: ${treffer.join(', ')}` };
  if (!p.bild) return { ok: false, grund: 'kein Titelbild' };
  if (!(+p.preis > 0)) return { ok: false, grund: 'kein Preis > 0' };
  if (!p.titel) return { ok: false, grund: 'kein Titel' };
  if (!(p.id || p.sku || p.handle)) return { ok: false, grund: 'keine ID (id/sku/handle fehlen)' };
  if (!p.link) return { ok: false, grund: 'kein Link' };
  if (RISIKO.test(p.titel) || RISIKO.test(p.marke || '')) return { ok: false, grund: 'Marken-/Safety-Risiko' };
  const lizenz = (String(p.titel).match(LIZENZ) || [])[0];
  if (lizenz) return { ok: false, grund: `Lizenzname: ${lizenz}` };
  return { ok: true, grund: 'im Feed' };
}

/**
 * Baut den `<item>`-Block. Erwartet ein flaches Produkt-Objekt (siehe merchant_feed.mjs).
 * Gibt `null` zurück, wenn `pruefeProdukt` ablehnt — der Aufrufer protokolliert den Grund.
 */
export function feedItem(p = {}, opt = {}) {
  if (!pruefeProdukt(p).ok) return null;
  const waehrung = p.waehrung || 'CHF';
  const z = [];
  const feld = (k, v) => { if (v !== undefined && v !== null && String(v) !== '') z.push(`<g:${k}>${escXml(v)}</g:${k}>`); };

  feld('id', p.id || p.sku || p.handle);
  feld('title', kuerzeTitel(p.titel));
  feld('description', String(p.beschreibung || p.titel).slice(0, 5000));
  feld('link', p.link);
  feld('image_link', p.bild);
  for (const w of (p.weitereBilder || []).slice(0, 10)) feld('additional_image_link', w);
  feld('availability', p.verfuegbar === false ? 'out of stock' : 'in stock');
  // Aktionspreis nur, wenn der Vergleichspreis WIRKLICH hoeher liegt — sonst meldet Google
  // „sale_price invalid". Dann ist der Listenpreis `price` und der Verkaufspreis `sale_price`.
  const aktion = +p.vergleichspreis > +p.preis;
  feld('price', `${(+(aktion ? p.vergleichspreis : p.preis)).toFixed(2)} ${waehrung}`);
  if (aktion) feld('sale_price', `${(+p.preis).toFixed(2)} ${waehrung}`);
  feld('condition', p.zustand || 'new');
  feld('brand', p.marke || 'LuxeStyle');

  // GTIN wenn vorhanden; sonst Marke + MPN; erst wenn beides fehlt, ehrlich identifier_exists=no.
  const gtin = String(p.gtin || '').replace(/\s/g, '');
  if (/^\d{8}$|^\d{12,14}$/.test(gtin)) feld('gtin', gtin);
  else if (p.sku) feld('mpn', p.sku);
  else feld('identifier_exists', 'no');

  feld('google_product_category', p.googleKategorie);
  feld('product_type', p.produktTyp);
  feld('item_group_id', p.gruppe);
  feld('age_group', p.altersgruppe);
  feld('gender', p.geschlecht);
  if (opt.versandLand && opt.versandPreis !== undefined) {
    z.push(`<g:shipping><g:country>${escXml(opt.versandLand)}</g:country>` +
      `<g:price>${escXml(`${(+opt.versandPreis).toFixed(2)} ${waehrung}`)}</g:price></g:shipping>`);
  }
  return `<item>\n${z.join('\n')}\n</item>`;
}
