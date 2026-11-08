/**
 * Kleiner, schreibfreier Sprachwaechter fuer strukturierte Storefront-Stichproben.
 *
 * Er soll keine Sprache vollstaendig erkennen oder Texte automatisch uebersetzen. Er blockiert
 * nur eindeutige englische UI-Phrasen und deutlich englische Produkt-/SEO-Texte auf deutschen
 * Seiten. Ausserdem erkennt er, wenn eine /fr/-Seite den deutschen Titel, die Meta-Beschreibung
 * und die H1 unveraendert wiederholt. Unsichere oder fehlende Daten bleiben UNKNOWN.
 */

const EN_UI = new Set([
  'add to cart', 'buy it now', 'choose options', 'continue shopping', 'view product',
  'sold out', 'out of stock', 'in stock', 'checkout', 'search', 'account', 'cart',
  'quantity', 'color', 'colour', 'size',
]);

// Bewusst ohne im Deutschen uebliche Shopwoerter wie Beauty, Gaming, Hoodie, T-Shirt oder Yoga.
const EN_FUNKTION = new Set([
  'and', 'for', 'from', 'of', 'our', 'the', 'this', 'with', 'your',
]);
const EN_KATALOG = new Set([
  'blanket', 'bow', 'comfort', 'dress', 'gentleman', 'handle', 'jumpsuit', 'lace',
  'nap', 'soft', 'solid', 'strap', 'wireless', 'women', 'womens',
]);
const EN_EINDEUTIG = new Set(['blanket', 'jellyfish', 'jumpsuit']);

const DE_MARKER = new Set([
  'ab', 'aus', 'bei', 'damen', 'dein', 'deine', 'der', 'die', 'entdecken', 'farbe',
  'fuer', 'für', 'groesse', 'grösse', 'herren', 'in', 'jetzt', 'kaufen', 'mit',
  'produkt', 'rueckgabe', 'rückgabe', 'schweiz', 'und', 'versand', 'von', 'warenkorb',
]);
const FR_MARKER = new Set([
  'acheter', 'avec', 'couleur', 'decouvrir', 'découvrir', 'et', 'femmes', 'hommes',
  'livraison', 'maintenant', 'panier', 'pour', 'produit', 'retour', 'suisse', 'taille',
]);

function sichtbarerText(value) {
  return String(value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|#39);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function woerter(value) {
  return (sichtbarerText(value).toLocaleLowerCase('de-CH').match(/[\p{L}]+(?:['’][\p{L}]+)?/gu) || [])
    .map(word => word.replace(/[’']/g, ''));
}

function einzigartigeTreffer(tokens, set) {
  return [...new Set(tokens.filter(token => set.has(token)))];
}

function norm(value) {
  return sichtbarerText(value)
    .normalize('NFKC')
    .toLocaleLowerCase('de-CH')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {unknown} value
 * @param {{feld?: string, art?: 'titel'|'meta'|'ui'}} optionen
 */
export function pruefeDeText(value, { feld = 'text', art = 'titel' } = {}) {
  const text = sichtbarerText(value);
  if (!text) return { status: 'UNKNOWN', feld, grund: 'Text fehlt' };

  const exakt = norm(text);
  if (art === 'ui' && EN_UI.has(exakt)) {
    return { status: 'BLOCKED', feld, grund: `englische UI-Phrase: ${text}` };
  }

  const tokens = woerter(text);
  const funktion = einzigartigeTreffer(tokens, EN_FUNKTION);
  const katalog = einzigartigeTreffer(tokens, EN_KATALOG);
  const eindeutig = einzigartigeTreffer(tokens, EN_EINDEUTIG);
  const deutlichEnglisch = art === 'meta'
    ? funktion.length >= 2 || (funktion.length >= 1 && katalog.length >= 1) || katalog.length >= 3
    : funktion.length >= 1 || katalog.length >= 2 || eindeutig.length >= 1;

  if (deutlichEnglisch) {
    return {
      status: 'BLOCKED',
      feld,
      grund: `deutlich englische Woerter: ${[...new Set([...funktion, ...katalog, ...eindeutig])].join(', ')}`,
    };
  }
  return { status: 'OK', feld };
}

/** Prueft nur die gelieferten Felder; das Ergebnis ist kein Vollkatalog-Beleg. */
export function pruefeDeSeite(seite = {}) {
  const pruefungen = [
    pruefeDeText(seite.title, { feld: 'title', art: 'titel' }),
    pruefeDeText(seite.metaDescription, { feld: 'metaDescription', art: 'meta' }),
    pruefeDeText(seite.h1, { feld: 'h1', art: 'titel' }),
    ...(Array.isArray(seite.uiTexts)
      ? seite.uiTexts.map((text, index) => pruefeDeText(text, { feld: `uiTexts[${index}]`, art: 'ui' }))
      : []),
  ];
  const blocker = pruefungen.filter(pruefung => pruefung.status === 'BLOCKED');
  const geprueft = pruefungen.filter(pruefung => pruefung.status !== 'UNKNOWN').length;
  return {
    status: blocker.length ? 'BLOCKED' : geprueft ? 'OK' : 'UNKNOWN',
    blocker,
    geprueft,
    unbekannt: pruefungen.filter(pruefung => pruefung.status === 'UNKNOWN').map(pruefung => pruefung.feld),
  };
}

/**
 * Erkennt deutsche /fr/-Duplikate aus einem gelieferten DE/FR-Paar. Ein identischer Produktname
 * allein reicht nicht, weil Eigennamen in beiden Sprachen gleich bleiben duerfen.
 */
export function pruefeFrDeutschDuplikat({ de = null, fr = null } = {}) {
  if (!fr || typeof fr !== 'object') return { status: 'UNKNOWN', grund: 'FR-Seite fehlt' };

  const felder = ['title', 'metaDescription', 'h1', 'visibleText'];
  const gleich = de && typeof de === 'object'
    ? felder.filter(feld => {
        const a = norm(de[feld]);
        const b = norm(fr[feld]);
        return a.length >= (feld === 'visibleText' ? 80 : 8) && a === b;
      })
    : [];
  const gleicheInhalte = new Set(gleich.map(feld => norm(fr[feld])));
  const tokens = woerter(felder.map(feld => fr[feld]).filter(Boolean).join(' '));
  const deMarker = einzigartigeTreffer(tokens, DE_MARKER);
  const frMarker = einzigartigeTreffer(tokens, FR_MARKER);
  const gleicherHaupttext = gleich.includes('visibleText');
  const deutschStattFranzoesisch = deMarker.length >= 3 && deMarker.length > frMarker.length;

  if (gleicherHaupttext || gleicheInhalte.size >= 2 || deutschStattFranzoesisch) {
    const teile = [];
    if (gleich.length) teile.push(`identisch: ${gleich.join(', ')}`);
    if (deutschStattFranzoesisch) teile.push(`deutsche Marker: ${deMarker.join(', ')}`);
    return { status: 'BLOCKED', grund: teile.join(' | '), gleich, deMarker, frMarker };
  }
  const hatInhalt = felder.some(feld => sichtbarerText(fr[feld]));
  return hatInhalt
    ? { status: 'OK', gleich, deMarker, frMarker }
    : { status: 'UNKNOWN', grund: 'FR-Inhalte fehlen', gleich: [] };
}
