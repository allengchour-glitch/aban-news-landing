/**
 * Regel «gehört in die Kategorie Tassen & Becher» — rein, ohne Netz, mit Gegenproben getestet.
 *
 * WARUM EIN SKRIPT UND KEINE TITELREGEL IM SHOP (gemessen 25.10.2026): Eine Smart-Collection «Titel enthält Tasse» träfe
 * «Tassel» (Fransen-Röcke, Quasten-Schmuck, Schals — über 25 aktive Produkte), «Mugwort» (Bein-Patches), Shisha-Becher,
 * Tassenhalter, Hundefutter-Becher. Shopify kennt bei CONTAINS keine Wortgrenze. Darum bekommen die richtigen Produkte
 * ein Tag, und die Collection hängt am Tag.
 *
 * Eine Tasse/ein Becher ist ein TRINKGEFÄSS. Zubehör rund ums Trinkgefäss (Halter, Organizer, Wärmer, Reiniger) und
 * Becher mit anderem Zweck (Messbecher, Shisha, Hundefutter, Mixer-Becher) gehören nicht dazu.
 */
// Teegeschirr ohne das Wort Tasse/Becher (Kung-Fu-Teeset, Teeservice, Matcha-Set) ist KEINE Tasse und gehört nicht in diese Kategorie.
const TRINKGEFAESS_RE = /((tasse|tassen|becher|mug)(?![a-zäöüß])|tassenset|tassen-set|tassengarnitur)/i;
const TASSENSET_RE = /(tassenset|tassen-set|tassengarnitur|teeservice|tee-set|teeset)/i;
// Zubehör und Becher mit anderem Zweck
const AUSSCHLUSS_RE = /(halter|halterung|ständer|staender|organizer|abtropf|reiniger|wärmer|waermer|heiz|kühler|kuehler|pad\b|unterlage|regal|korb|lunchbox|kissen|shisha|(^|[^a-zäöüß])auto([^a-zäöüß]|$)|hundefutter|hundenapf|scheinwerfer|vernebler|entsafter|mixer|messlöffel|messloeffel|messbecher|bad-set|zahnbürst|zahnbuerst|ladegerät|ladegeraet|induktion|wireless|kaffeekanne|abnehmbar|sport-becher-dose|magazin)/i;

export function istTasseOderBecher(titel) {
  const t = String(titel || '');
  if (!TRINKGEFAESS_RE.test(t)) return false;
  // Zubehör ausschliessen — aber ein Set, das Tassen ENTHÄLT, bleibt ein Trinkgefäss-Set («Tee-Set mit Tasse und Teetablett»)
  if (AUSSCHLUSS_RE.test(t) && !/^(tee-?set|tee-?tassenset|tragbares teeservice)/i.test(t)) return false;
  return true;
}
export const TASSEN_TAG = 'tassen-becher';
export { TASSENSET_RE };
