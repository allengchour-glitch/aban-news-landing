// ============================================================
// GLUT (Aschebund-Trilogie, Band 1) — Verkaufs-Konfiguration
// Eigene Datei, getrennt vom Anti-Hype-Buch (js/buch-config.js),
// weil "Glut" ein anderes Publikum hat (Romantasy/BookTok).
// Wird von glut.html geladen.
//
// Sobald ein Verkaufslink existiert, hier EINMAL eintragen:
//  KDP_URL    = Amazon-Produktseite (Kindle/Taschenbuch).
//               z.B. "https://www.amazon.de/dp/XXXXXXXXXX"
//  TOLINO_URL = Thalia/Tolino-Produktseite (deutscher Buchhandel).
//  DIREKT_URL = Direktverkauf ePub (Gumroad/Lemon/Payhip), hoechste Marge.
//               z.B. "https://abannews.lemonsqueezy.com/buy/xxxxxxxx"
// Leer lassen ("") -> der jeweilige Button bleibt verborgen (kein toter Link).
// ============================================================
window.GLUT = {
  KDP_URL: "",
  TOLINO_URL: "",
  DIREKT_URL: ""
};
