// Fotoauswahl der sechs Beispielkategorien (von Hand, mit dem Auge). Wird von render_samples.mjs und banner_test.mjs benutzt.
export const MANIFEST = process.env.MANIFEST || '/tmp/banner_samples/manifest.json';
// Mit dem Auge ausgewaehlt (1-basiert, beste zuerst): kein Fremdtext, kein Markenlogo, keine Collage, Produkt klar erkennbar.
// Ausgeschlossen (siehe dropship/BANNER-LIESMICH.md): Hunde 1 Masspfeile, 2 Streifen-Cardigan (Markenrisiko), 3 Fremdtext, 5 Monogramm-Pullover, 8 Abzeichen «LING CHONG» am Geschirr, 11 Jogginghose;
// Kueche 1 Militaer-Emblem, 4/11 Fremdtext, 5 Spielzeug mit Logo, 10 Zuendkerze, 13 Waermeplatte; Tassen 1, 3, 7 (Collage), 11 (Buchtitel), 13 («Nappiness»), 14 (Bildunterschrift);
// Kissen 2 (Sofa auf Weiss: Produkt viel zu breit fuer eine fast quadratische Karte), 3 (lesbares Etikett «XIAEN»), 4 (Wasserzeichen), 7 (weisse Balken), 10 (Barock-Muster, Markenrisiko), 13 (Collage);
// Kueche 7 (grosses Herstellerlogo «M» auf der Kanne).
export const AUSWAHL = {
  'haustier-hunde': [4, 13, 14, 6, 9, 10, 12, 7],
  'schmuck': [6, 4, 13, 9, 3, 2, 5, 8, 10, 7, 11, 12],
  'tassen-becher': [5, 10, 8, 12, 4, 6, 2, 9],
  'kissen': [6, 8, 9, 5, 14, 1, 12, 11],
  'damen-mode': [3, 1, 2, 4, 10, 14, 9, 5, 6, 8, 12, 13, 11],
  'sub-kueche': [3, 6, 8, 9, 12, 14, 2, 13],
};
// Fotos mit kleinem Makel, die nur zum Auffuellen auf 8 dienen (vor einer Serie durch die Gemini-Pruefung ersetzen)
export const MAKEL = {
  'tassen-becher': { 9: 'Verpackung mit kleinem Schriftzug «Never Wither»' },
  'kissen': { 11: 'Stickerei «sweet baby», unleserliche Zeitung am unteren Rand', 12: 'kleine Zeitschrift «UNION» im Bild' },
  'sub-kueche': { 2: 'kleines Herstellerlogo «M» am Wasserkocher', 13: 'nur 700x432 px, breit, wird beschnitten' },
};

// Bildausschnitt von Hand (Prozent X,Y), wo der Automatismus das Produkt anschneiden wuerde: Kirsch-Brosche liegt am unteren Bildrand
export const FOKUS = { 'schmuck': { 2: '50,100' } };


/** Quellen (file://, ggf. mit #fokus) fuer eine Kategorie des Manifests. */
export function beispielBilder(handle, k) {
  const idx = AUSWAHL[handle] || k.fotos.map((_, i) => i + 1);
  return idx.map(i => 'file://' + k.fotos[i - 1].datei + (FOKUS[handle]?.[i] ? '#fokus=' + FOKUS[handle][i] : ''));
}
