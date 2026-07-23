/* fortura_cat.mjs — mappt Fortura-Warengruppe (Grp-Bez) + Kategorie-Code → Collection-Tags.
 * Zuverlässiger als Titel-Raten. Genutzt von fortura_import.mjs (neue Ware) + fortura_sort.mjs (Bestand).
 * Kategorie-Codes (Kostüme): 5010=Damen 5020=Herren 5030=Unisex 5040=Kinder 17700=Trachten/Swiss.
 */
export function fortCatTags(grpBez, kategorie, title = '') {
  const g = (grpBez || '').toLowerCase();
  const k = String(kategorie || '').trim();
  const t = (title || '').toLowerCase();
  const tags = [];
  // Kostüme nach Geschlecht (Kategorie-Code am verlässlichsten)
  if (/verkleidung kostüme erwachsene|kostüm/.test(g) || /^kostüm/.test(t)) {
    if (k === '5010') tags.push('damenkostuem');
    else if (k === '5020') tags.push('herrenkostuem');
    else if (k === '5030') tags.push('unisexkostuem');
  }
  if (/kostüme kinder/.test(g) || /kinderkostüm/.test(t)) tags.push('kinderkostuem');
  if (k === '17700' || /trachten/.test(t)) tags.push('trachten', 'schweiz-edition');
  // Kostüm-Bestandteile
  if (/perücke/.test(g) || /perücke/.test(t)) tags.push('peruecke');
  if (/\bhüte\b|kopfbedeckung/.test(g)) tags.push('kostuem-hut');
  if (/\bmaske/.test(g)) tags.push('maske');
  if (/accessoires|scherzartikel/.test(g)) tags.push('kostuem-accessoire');
  // Weitere Warengruppen
  if (/fanartikel|fanrartikel/.test(g)) tags.push('fanartikel');
  if (/qualiplüsch|plüsch/.test(g)) tags.push('pluesch');
  if (/bruder/.test(g)) tags.push('bruder');
  if (/wohndeko/.test(g)) tags.push('wohndeko-ft');
  if (/dekoballon|ballon/.test(g)) tags.push('ballone');
  if (/halloween/.test(g)) tags.push('halloween');
  if (/weihnacht/.test(g) || k === '5050') tags.push('weihnachten');
  return [...new Set(tags)];
}

// Tag → {title, emoji-Titel, Beschreibung} für Collection-Anlage
export const FORT_COLLECTIONS = {
  damenkostuem:      ['damenkostuem', '👗 Damenkostüme', 'Kostüme & Verkleidung für Damen – Fasnacht, Halloween & Motto-Partys. CH-Lager, 1–2 Tage.'],
  herrenkostuem:     ['herrenkostuem', '🤵 Herrenkostüme', 'Kostüme & Verkleidung für Herren – schnelle Lieferung aus der Schweiz.'],
  unisexkostuem:     ['unisexkostuem', '🎭 Unisex- & Tierkostüme', 'Unisex-, Tier- & Fantasiekostüme für alle. Ab Schweizer Lager.'],
  kinderkostuem:     ['kinderkostuem', '🧒 Kinderkostüme', 'Kostüme für Kinder – Tiere, Helden & mehr. Blitzversand aus der Schweiz.'],
  trachten:          ['trachten', '🇨🇭 Trachten & Edelweiss', 'Edelweisshemden, Trachten & Schweizer Klassiker – perfekt für den 1. August.'],
  peruecke:          ['peruecke', '💇 Perücken', 'Perücken für jeden Look & jedes Kostüm. Aus dem CH-Lager.'],
  'kostuem-hut':     ['kostuem-hut', '🎩 Hüte & Kopfbedeckung', 'Hüte, Kappen & Kopfbedeckungen für dein Kostüm.'],
  maske:             ['maske', '😷 Masken', 'Masken für Fasnacht, Halloween & Motto-Partys.'],
  'kostuem-accessoire':['kostuem-accessoire', '🧤 Kostüm-Accessoires', 'Accessoires & Scherzartikel, die dein Kostüm komplett machen.'],
  fanartikel:        ['fanartikel', '⚽ Fanartikel & Länder', 'Fan- & Länder-Artikel für Sport, Party & Nationalstolz.'],
  pluesch:           ['pluesch', '🧸 Plüschtiere', 'Kuschelige Plüschtiere – schnelle Lieferung aus der Schweiz.'],
  bruder:            ['bruder', '🚜 BRUDER Fahrzeuge', 'BRUDER Traktoren, Bagger & LKW – hochwertiges Spielzeug ab CH-Lager.'],
  'wohndeko-ft':     ['wohndeko-ft', '🏠 Wohndeko', 'Dekoration & Wohnaccessoires für jeden Anlass.'],
  ballone:           ['ballone', '🎈 Ballone & Deko', 'Ballone, Girlanden & Partydeko für deine Feier.'],
};
