/**
 * Wahl des Kategorie-Bildes für hero_image_guard.mjs (rein, ohne Netz).
 *
 * WARUM (gemessen 11.11.2026, dropship/kategorie-banner-v2/README.md): 453 Menü-Kategorien trugen ein Bild, das der
 * Wächter ungeprüft vom ERSTEN Produkt der Collection genommen hatte. 43 davon waren BigBuy-Dateien von Entwürfen
 * oder gelöschten Produkten (Puma, Michael Kors, LEGO, Casio …): die Collection-Liste der Admin-Schnittstelle enthält
 * auch Entwürfe und nicht veröffentlichte Ware. Ein Bild darf darum nur von einem Produkt kommen, das eine Kundin
 * gerade kaufen kann, und nie ein vorhandenes Bild ersetzen.
 */
import { SPERR_TAGS_TAXONOMIE } from './sperr_tags.mjs';

/** Tags, deren Produkte nie das Gesicht einer Kategorie sein dürfen (Sperrliste der Taxonomie + Bildbefunde). */
export const HERO_SPERR_TAGS = [...SPERR_TAGS_TAXONOMIE, 'google-bild-abgelehnt', 'bild-zu-klein', 'cj-ausgelistet'];
/** Kleinste Kantenlänge des Titelbilds in Pixeln (Kategorie-Kopf ist bis zu 1600 px breit). */
export const MIN_KANTE = 800;

/**
 * Grund, warum ein Produkt NICHT als Bildquelle taugt, oder null, wenn es taugt.
 * Erwartet die Felder aus der Abfrage im Runner: status, onlineStoreUrl, tags, featuredImage{url width height},
 * variants.nodes[].availableForSale.
 */
export function ausschlussGrund(p, opt = {}) {
  const sperr = opt.sperrTags || HERO_SPERR_TAGS;
  const minKante = opt.minKante ?? MIN_KANTE;
  if (!p) return 'leer';
  if (p.status !== 'ACTIVE') return 'nicht-aktiv';
  if (!p.onlineStoreUrl) return 'nicht-im-onlineshop';
  const tags = (p.tags || []).map(t => String(t).toLowerCase());
  const t = sperr.find(s => tags.includes(String(s).toLowerCase()));
  if (t) return `sperr-tag:${t}`;
  const varianten = p.variants?.nodes || [];
  if (!varianten.some(v => v && v.availableForSale === true)) return 'nicht-lieferbar';
  const b = p.featuredImage;
  if (!b?.url) return 'ohne-bild';
  const w = Number(b.width), h = Number(b.height);
  if (!(w >= minKante && h >= minKante)) return 'bild-zu-klein';
  return null;
}

/**
 * Erstes taugliches Produkt in der Reihenfolge der Collection.
 * Rückgabe { produkt, abgelehnt } — produkt ist null, wenn keines taugt; abgelehnt zählt die Gründe.
 */
export function waehleBildProdukt(produkte, opt = {}) {
  const abgelehnt = {};
  for (const p of produkte || []) {
    const g = ausschlussGrund(p, opt);
    if (!g) return { produkt: p, abgelehnt };
    const k = g.startsWith('sperr-tag:') ? 'sperr-tag' : g;
    abgelehnt[k] = (abgelehnt[k] || 0) + 1;
  }
  return { produkt: null, abgelehnt };
}

/**
 * Entscheid je Collection: 'fehlt' (Collection nicht gefunden), 'hat-bild' (nie überschreiben),
 * 'setzen' (mit produkt), 'kein-taugliches-produkt'.
 */
export function entscheid(collection, opt = {}) {
  if (!collection) return { art: 'fehlt' };
  if (collection.image?.url) return { art: 'hat-bild' };
  const { produkt, abgelehnt } = waehleBildProdukt(collection.products?.nodes, opt);
  if (!produkt) return { art: 'kein-taugliches-produkt', abgelehnt };
  return { art: 'setzen', produkt, abgelehnt };
}

/** Exit-Code des Laufs: 0 sauber, 1 Lese- oder Schreibfehler (der Wächter hat etwas nicht geprüft oder nicht geschafft). */
export function exitCode(bericht) {
  if (bericht.menuError) return 1;
  if ((bericht.menuCollections || 0) === 0) return 1;
  if ((bericht.leseFehler || []).length) return 1;
  if ((bericht.schreibFehler || []).length) return 1;
  return 0;
}
