// Hilfsfunktionen des Edel-Tests (rein, kein Netz): Textwächter gegen unbelegte Angaben und Bild-Umordnung.
// Getrennt von anlegen.mjs, damit anlegen_test.mjs ohne CJ- und Shop-Bausteine läuft.

/**
 * Angaben, die der Lieferant nur behauptet oder die ein unabhängiger Prüfer (17.11.2026) als unbelegt, irreführend oder rechtlich heikel gefunden hat.
 * Sie dürfen in KEINEM Kundentext, Tag oder Optionswert stehen, bis ein Muster oder eine schriftliche Klärung sie belegt. Jeder Eintrag: [Muster, warum].
 * Wer eine Angabe nach dem Muster wieder aufnimmt, nimmt sie hier heraus UND begründet das im README.
 */
export const UNBELEGT = [
  [/kaschmir|cashmere|kasch-mir/i, 'Faser nur Lieferantenangabe, beim Strickjacken-Datenblatt widersprüchlich (Polyester Women\'s Jackets)'],
  [/rindsleder|echtleder|vollleder|cowhide|genuine leather/i, 'Leder nur Lieferantenangabe, Bilder zeigen Prägung/Metallic'],
  [/moissanit|moissan/i, 'Steinart nur Lieferantenangabe, kein Prüfzeugnis'],
  [/diamant/i, 'Diamant-Vergleich: Täuschungsgefahr'],
  [/rubin|saphir|smaragd/i, 'Steinart des Mittelsteins nicht bestimmt (Glas oder Korund?)'],
  [/labor|gezüchtet|synthetisch/i, 'Herkunft der Steine nur Lieferantenangabe'],
  [/bambus|bamboo/i, 'Nähe zu einer bekannten Luxusmarken-Tasche (Bambusgriff), Material des Henkels ungeklärt'],
  [/geschenkbox|geschenkverpackung|gift ?box/i, 'Box steht nur im Alt-Text des Lieferanten, auf keinem Bild'],
  [/zertifikat|\bgra\b/i, 'Zertifikat nur behauptet, am Muster nicht gesehen'],
  [/platin|rhodium/i, 'Überzugsmetall unbelegt (Plaqué-Aussage unter der Edelmetallkontrolle)'],
  [/\bvvs/i, 'Diamant-Skala bei einem Nicht-Diamanten'],
  [/\b0[.,]\d+ ?ct\b|\bkarat\b/i, 'Karat bei einem Nicht-Diamanten'],
  [/100 ?%/, 'absolute Faserangabe'],
  [/asiatisch/i, 'Pauschalsatz widerspricht der Masstabelle (Jacke ist weit geschnitten)'],
  [/aufwendig/i, 'steht nicht im Datenblatt'],
  [/obermaterial/i, 'Futter und Innenmaterial unbekannt'],
  [/klassisch/i, 'Bild zeigt S-förmige Zwischenglieder, kein klassisches Einreihen'],
  [/fein ?gestrickt|feinstrick|\bfeine[nrs]? (damen|pullover|strick)/i, 'Maschenfeinheit nicht belegt (das Datenblatt nennt nur die Dicke: dünn)'],
  [/drehverschluss|metallperlen|metallschloss/i, 'Verschlussart und Henkelmaterial sind Deutung, das Datenblatt sagt nur «cover type»'],
  [/\bedel\b|luxus|premium|designer/i, 'Superlative und Arbeitstitel nicht in Kundentexte'],
];

/** Alle Texte eines Eintrags aus produkte.json, die ein Kunde sieht oder die als Tag/Auswahl im Shop landen. */
export function kundenTexte(p) {
  const t = [['titel', p.titel], ['handle', p.handle], ['seo.title', p.seo?.title], ['seo.description', p.seo?.description], ['html', (p.html || '').replace(/<[^>]*>/g, ' ')]];
  for (const g of p.tags || []) t.push(['tag', g]);
  for (const [k, v] of Object.entries(p.uebersetzung || {})) t.push([`uebersetzung ${k}`, v]);
  for (const [o, r] of Object.entries(p.optionen || {})) {
    if (r.name) t.push([`optionen ${o} Name`, r.name]);
    for (const v of Object.values(r.werte || {})) t.push([`optionen ${o} Wert`, v]);
  }
  return t.filter(([, x]) => typeof x === 'string' && x);
}

/** Findet unbelegte Angaben. Rückgabe: [{id, feld, treffer, grund}], leer = sauber. Das Tag «edel-test-1711» ist ausgenommen (Arbeitsname, nur Verwaltung). */
export function unbelegteAngaben(p, liste = UNBELEGT) {
  const treffer = [];
  for (const [feld, text] of kundenTexte(p)) {
    if (feld === 'tag' && text === 'edel-test-1711') continue;
    for (const [re, grund] of liste) { const m = text.match(re); if (m) treffer.push({ id: p.id, feld, treffer: m[0], grund }); }
  }
  return treffer;
}

/** Längen, die Shopify und Google erwarten (Titel höchstens 70 Zeichen, SEO-Titel 60, SEO-Beschreibung 160, Beschreibung mindestens 150 reine Textzeichen). Rückgabe: Liste der Verstösse. */
export function laengenFehler(p) {
  const f = [];
  if ((p.titel || '').length > 70) f.push(`Titel ${p.titel.length} Zeichen`);
  if ((p.seo?.title || '').length > 60) f.push(`SEO-Titel ${p.seo.title.length} Zeichen`);
  if ((p.seo?.description || '').length > 160) f.push(`SEO-Beschreibung ${p.seo.description.length} Zeichen`);
  const rein = (p.html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();   // dieselbe Mindestlänge wie das Tor «text» der Grind-Kette (150 Zeichen)
  if (rein.length < 150) f.push(`Beschreibung ${rein.length} Zeichen (mindestens 150)`);
  return f;
}

/**
 * Stellt Galeriebilder ans Ende der Dateiliste (z. B. ein Bild, das drei Produkte oder eine Farbe zeigt, die es nicht gibt), damit sie nicht das Hauptbild sind.
 * `galerie`: die Bild-Adressen in der Reihenfolge des Lieferanten; `indizes`: welche davon ans Ende. Rein: ändert eine Kopie.
 * Wirft, wenn ein Index nicht existiert oder das Bild nicht in `files` steht (dann stimmt die Annahme über die Reihenfolge nicht).
 * Variantenbilder bleiben gültig: sie verweisen über die Adresse auf die Datei, nicht über die Stelle.
 */
export function bilderAnsEnde(eingabe, galerie, indizes) {
  const e = JSON.parse(JSON.stringify(eingabe));
  if (!indizes?.length) return e;
  const ende = new Set();
  for (const i of indizes) {
    const u = galerie[i];
    if (!Number.isInteger(i) || !u) throw new Error(`Bild-Index ${i} gibt es in der Galerie nicht (${galerie.length} Bilder)`);
    if (!e.files.some(f => f.originalSource === u)) throw new Error(`Bild ${i} steht nicht in files (nicht erreichbar oder anders benannt)`);
    ende.add(u);
  }
  if (ende.size >= e.files.length) throw new Error('Alle Bilder ans Ende gestellt: es bliebe kein Hauptbild');
  e.files = [...e.files.filter(f => !ende.has(f.originalSource)), ...e.files.filter(f => ende.has(f.originalSource))];
  return e;
}
