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

// «…becher» ist oft kein Trinkgefäss: Aschenbecher, Zahnputzbecher, Würfelbecher, Eisbecher, Stiftebecher (26.10.2026: 38 solche Treffer in der Menü-Kategorie,
// gefunden mit kategorie_pruefer.mjs). Wir prüfen die Vorsilbe des Wortes: lange Stämme irgendwo, kurze («eis», «ei») nur am Wortanfang — sonst träfe
// «Reisebecher» (r-EIS-e). «Kaffeebecher», «Thermobecher», «Reisebecher» bleiben Trinkgefässe.
const KEIN_TRINKGEFAESS_ANYWHERE = /(asche|zahn|würfel|wuerfel|pflanz|blumen|zigarr|zigarett|joghurt|pudding|popcorn|kerzen|farb|wasch|putz|stift|pinsel|tinten|spül|spuel|trichter|sprüh|sprueh|dessert|salat|mess)/i;
const KEIN_TRINKGEFAESS_ANFANG = /^(eis|ei|eier|mund)/i;
function istKeinTrinkgefaess(t) {
  for (const m of t.matchAll(/([a-zäöüß]+)(tassen|tasse|becher)(?![a-zäöüß])/gi)) {
    const vor = m[1];
    if (KEIN_TRINKGEFAESS_ANYWHERE.test(vor) || KEIN_TRINKGEFAESS_ANFANG.test(vor)) return true;
  }
  return false;
}

export function istTasseOderBecher(titel) {
  const t = String(titel || '');
  if (!TRINKGEFAESS_RE.test(t)) return false;
  if (istKeinTrinkgefaess(t) && !/(^|[^a-zäöüß])(tasse|tassen|becher)(?![a-zäöüß])/i.test(t)) return false;
  // Zubehör ausschliessen — aber ein Set, das Tassen ENTHÄLT, bleibt ein Trinkgefäss-Set («Tee-Set mit Tasse und Teetablett»)
  if (AUSSCHLUSS_RE.test(t) && !/^(tee-?set|tee-?tassenset|tragbares teeservice)/i.test(t)) return false;
  return true;
}
export const TASSEN_TAG = 'tassen-becher';
export { TASSENSET_RE };
