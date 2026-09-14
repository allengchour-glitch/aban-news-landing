// cj_copy_prompt.mjs — EINE Quelle fuer den Beschreibungs-Prompt aller drei CJ-Importer
// (cj_category_fill, cj_sku_import, cj_trending_import). Bis 02.09.2026 trug jeder Importer
// seine eigene Fassung («Beauty-Shop», «Online-Shop», mit/ohne Umlaut-Regel) — dieselbe
// Geschwister-Drift wie bei Farbtabelle, Preisformel und Klingenregel.
//
// Anlass (Betreiber 02.09.2026, «Seite professionell»): 300 Neuimporte gemessen —
// «ideal für» 39 %, «vielseitig» 28 %, «perfekt» 27 %, «hochwertig» 22 %, «stilvoll» 20 %,
// «sorgt für» 19 %, dazu Sie-Form, obwohl der ganze Shop duzt. Das ist Katalog-Rauschen, das
// jede Kundin als KI-Text erkennt. Regeln hier: du-Form, erster Satz = was es ist und wofuer,
// dann nur belegbare Fakten mit Zahlen, Floskel-Verbot, kurz und scannbar fuers Handy.
// NICHTS erfinden bleibt oberste Regel — eine erfundene Zahl ist schlimmer als eine Floskel.

export const VERBOTEN = ['ideal für', 'perfekt', 'vielseitig', 'hochwertig', 'stilvoll', 'sorgt für',
  'verleiht', 'Hingucker', 'Must-have', 'unverzichtbar', 'Entdecke', 'Erlebe', 'revolutionär',
  'das perfekte Geschenk', 'egal ob', 'ob … oder', 'Begleiter', 'im Handumdrehen', 'einzigartig'];

export function copyPrompt({ nameEn, feats, kat }) {
  return `Du schreibst Produkttexte für LuxeStyle, einen Schweizer Online-Shop. Sprich die Kundin mit «du» an.
Aus dem englischen Produktnamen und den Features machst du:
1) einen KURZEN deutschen Produkttitel (max 60 Zeichen, keine Marke erfinden, korrekte Umlaute ä/ö/ü, keine englischen Wörter)
2) eine deutsche Beschreibung, 70–120 Wörter, in dieser Form:
   - Satz 1: Was es ist und wofür man es konkret braucht (der Nutzen im Alltag, kein Werbeton). Beginne NICHT mit «Dieser/Diese/Dieses …» — beginne mit dem Anlass, dem Nutzen oder dem Material (z. B. «An kühlen Herbsttagen …», «Für den Weg ins Büro …», «Wolle mit Karomuster …», «Hält den Nacken warm …»).
   - Satz 2–4: nur belegbare Fakten aus den Features — Masse, Material, Kapazität, Funktion. Mit Zahlen, wo die Features Zahlen nennen. Den Lieferumfang nur nennen, wenn er MEHR als das Produkt selbst umfasst («1 x scarf» ist kein Satz wert). Steht bei Material «Other/Others» oder nichts Konkretes, wird das Material NICHT erwähnt (nie «aus anderen Materialien»). Keine Katalog-Metadaten als Satz: NICHT «für Erwachsene konzipiert», «dient der Wärmefunktion», «Saison: Sommer», «für Frauen bestimmt».
   - Dann <h3>Das zeichnet es aus</h3> mit 3–5 kurzen Stichpunkten (je max 8 Wörter, jeder mit einem Fakt, der im Fliesstext NICHT schon steht).
Regeln: Kurze Sätze. Keine Superlative. NICHTS erfinden — was nicht in den Features steht, steht nicht im Text.
Keine Auswahl behaupten: schreibe NICHT «erhältlich in verschiedenen Farben/Grössen», «reicht von … bis …», «wähle zwischen …» — auch dann nicht, wenn die Features mehrere Grössen nennen. Welche Ausführung verkauft wird, zeigt der Shop selbst; nenne höchstens EINE Grössenangabe, wenn sie in den Features steht.
Keine Wirkversprechen: nichts «fördert Wachstum», «heilt», «gegen Falten/Pigmentflecken» — nur, was das Produkt IST und TUT (pflegt, reinigt, schützt).
Keine medizinischen Messwerte bei Uhren, Armbändern und Ringen: NIE «Blutdruck», «EKG», «Blutzucker», «Glukose», «Elektrokardiogramm» — ein optischer Sensor am Handgelenk kann das nicht, und wer sich als Diabetikerin darauf verlässt, riskiert eine Unterzuckerung. Erlaubt sind Herzfrequenz, Blutsauerstoff/SpO2, Schritte, Schlaf und Hauttemperatur (nie «Körpertemperatur»).
VERBOTEN sind diese Wörter und Wendungen: ${VERBOTEN.join(', ')}.
Kategorie: ${kat || '-'}
Name (EN): ${nameEn}
Features (EN): ${(feats || '').slice(0, 700)}
Titel: max. 60 Zeichen, deutsch, benennt die Ware (kein Werbeton) und trägt KEIN Wirkversprechen — nicht «Wachstumsserum», «gegen Falten», «Anti-Aging Facelift», «dauerhafte Haarentfernung»; stattdessen «Wimpernserum», «Haaröl», «IPL-Haarentfernungsgerät». Ebenso KEINE Messwerte aus der Verbotsliste im Titel — nicht «Smartwatch mit Blutdruckmessung», sondern «Smartwatch mit Herzfrequenz & Blutsauerstoff».
Gib NUR gültiges JSON zurück: {"title":"...","html":"<p>…</p><h3>Das zeichnet es aus</h3><ul><li>…</li></ul>"} (Schweizer ss statt ß, keine Markdown-Fences).`;
}

// Nachkontrolle fuer den Importer: Wie viele verbotene Wendungen stehen im Ergebnis?
export function floskelZaehler(html) {
  const t = String(html || '').replace(/<[^>]+>/g, ' ').toLowerCase();
  return VERBOTEN.filter(w => t.includes(w.toLowerCase().replace(' … ', ' '))).length;
}

// ⛔ HARTE PRUEFUNG statt Bitte (04.09.2026). Der Prompt verbietet Blutdruck/EKG/Blutzucker/
// Glukose bei Uhren, Armbaendern und Ringen seit dem 03.09. — und um 02:17 legte der Grind
// trotzdem «Smartwatch mit Blutsauerstoff & Glukosemessung» an, mit dem NEUEN Prompt und in
// allen sechs Kanaelen. Ein Modell kann eine Anweisung ignorieren; eine Pruefung kann es
// nicht. Bei dieser Klasse zaehlt ein Irrtum gesundheitlich (wer sich als Diabetikerin auf
// eine Uhr verlaesst, riskiert eine Unterzuckerung) — deshalb wird hier geschnitten, nicht
// gebeten. Reinigung, kein Verwerfen: ein leerer Titel wird von Shopify ohnehin abgelehnt.
const TRAEGER_RE = /(?<![\wäöüß])(smartwatch|smart\s*watch|armband|fitness[- ]?tracker|smart[- ]?ring|wearable)|[\wäöüß]*(uhr|watch)(?![\wäöüß])/i;
const MESSWORT = 'Blutdruck|EKG|Blutzucker|Glukose|Elektrokardiogramm|ECG';

// ⚠️ 04.09.2026 — WIRKVERSPRECHEN IM TITEL, deterministisch statt als Bitte.
// Der Prompt verbietet sie seit dem 03.09.; heute um 16:41 legte der Grind trotzdem ein
// «Wimpernwachstums- und Augenstift-Set» an, ACTIVE in allen sechs Kanaelen. Ein Modell
// kann eine Anweisung ignorieren, eine Pruefung nicht — dieselbe Lehre wie bei messSicher().
// Ein Wachstumsversprechen ist eine Heilaussage (Lehre 29.08.); eine zulaessige kosmetische
// Aussage ist es NICHT: «Anti-Aging-Creme» und «Hyaluron-Serum» bleiben unberuehrt.
const WACHSTUM_RE = /\b(wimpern|haar|bart|augenbrauen|n[äa]gel|nagel|brust|penis)[a-zäöüß]*(wachstums?|wuchs)[a-zäöüß]*\b/gi;
const GEGEN_RE = /\bgegen\s+(pigmentflecken|falten|akne|cellulite|haarausfall|schuppen|krampfadern|besenreiser|narben|dehnungsstreifen)\b/gi;
const KUR_RE = /\b(abnehm[a-zäöüß]*|detox|whitening|aufhellend)\b/gi;

export function wirkSicher(o) {
  if (!o || !o.title) return o;
  const schnitt = (t) => t
    .replace(WACHSTUM_RE, (m) => m.replace(/(wachstums?|wuchs)[a-zäöüß]*/i, ''))
    .replace(GEGEN_RE, '')
    .replace(KUR_RE, '')
    .replace(/\s*[,&]\s*(?=[,&])/g, '')
    .replace(/\s*(?:und|&)\s*(?=[,.]|$)/gi, '')
    .replace(/^\s*[,&·–-]+\s*|\s*[,&·–-]+\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\b(?:mit|für|fuer|zur|zum|und|inkl\.?)\s*$/i, '')
    .trim();
  const t2 = schnitt(o.title);
  if (t2.length >= 8 && t2 !== o.title) o.title = t2;
  return o;
}

export function messSicher(o) {
  if (!o || !o.title) return o;
  if (!TRAEGER_RE.test(o.title)) return o;
  const schnitt = (t) => t
    .replace(new RegExp(`\\b(?:${MESSWORT})[- ]?(?:messung|überwachung|ueberwachung|funktion|analyse|sensor|tracking)\\b`, 'gi'), '')
    .replace(new RegExp(`\\b(?:${MESSWORT})\\b[- ]?`, 'gi'), '')
    .replace(/\s*[,&]\s*(?=[,&])/g, '')
    .replace(/\b(mit|für|fuer|zur|zum|inkl\.?|inklusive)\s*(?:und|&|,|-)+\s*/gi, (m, w) => w + ' ')
    .replace(/\s*(?:und|&)\s*(?=[,.]|$)/gi, '')
    .replace(/^\s*[,&·–-]+\s*|\s*[,&·–-]+\s*$/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\b(?:mit|für|fuer|zur|zum|und|inkl\.?)\s*$/i, '')
    .trim();
  const t2 = schnitt(o.title);
  if (t2.length >= 8 && t2 !== o.title) o.title = t2;
  if (o.html) {
    // Im TEXT die Bindestrich-Koppelung in EINEM Schritt aufloesen, sonst bleibt ein
    // Fragment stehen («Unterstützt Herzfrequenz- und») — Lehre 03.09.
    o.html = o.html
      .replace(new RegExp(`([A-Za-zÄÖÜäöüß]+)-\\s*(?:und|oder|&amp;|&)\\s*(?:${MESSWORT})[- ]?(?:messung|überwachung|funktion|analyse|sensor|tracking)\\b`, 'gi'), '$1messung')
      .replace(new RegExp(`\\b(?:${MESSWORT})[- ]?(?:messung|überwachung|funktion|analyse|sensor|tracking)\\s*(?:und|oder|&amp;|&|,)\\s*`, 'gi'), '');
  }
  return o;
}

// ⚠️ 07.09.2026 — AUSWAHL-VERSPRECHEN BEI EINER VARIANTE, deterministisch statt als Bitte.
// Der Prompt verbietet sie seit dem 03.09. Gemessen am 07.09.: von 1'205 seither angelegten
// Ein-Varianten-Produkten versprechen 52 (4,3 %) trotzdem eine Auswahl. Dritte Fassung der
// Lehre vom 04.09.: ein Modell kann eine Anweisung ignorieren, eine Pruefung nicht.
//
// Warum das hier geht und im BESTAND nicht: Der Importer kennt die Variantenzahl, bevor der
// Text geschrieben wird, und der Text ist frisch — ein Satz weniger kostet nichts, die Fakten
// stehen ohnehin im Faktenblock. Im Bestand traegt derselbe Satz fast immer eine zweite
// Aussage («Erhältlich in verschiedenen Farben, passt er sich jedem Stil an»), deshalb meldet
// wahlversprechen.py dort nur und schneidet nicht (an 28 Faellen gelesen, 28 davon Mischsaetze).
//
// Gearbeitet wird SATZWEISE: ein halber Satz ist schlimmer als ein fehlender (Lehre 21.08.).
const WAHL_RE = /(?:erh[äa]ltlich|verf[üu]gbar|lieferbar)\s+in\s+(?:verschiedenen|unterschiedlichen|mehreren|zwei|drei|vier|f[üu]nf|sechs|den)\b|\bin\s+(?:verschiedenen|unterschiedlichen|mehreren|zwei|drei|vier)\s+[\wäöüß]+\b[^.!?]{0,60}?\s(?:erh[äa]ltlich|verf[üu]gbar|lieferbar)\b|\b(?:zwei|drei|vier|f[üu]nf|sechs|mehrere|verschiedene|unterschiedliche)\s+(?:verschiedene\s+)?(?:Farben|Gr[öo]ssen|Gr[öö]?[ßs]en|Ausf[üu]hrungen|Varianten|Modelle|Designs|Muster|Motive|Farbvarianten|Farbkombinationen)\s+(?:erh[äa]ltlich|verf[üu]gbar|lieferbar|zur\s+Auswahl)\b|\bw[äa]hlen\s+sie\s+(?:aus|zwischen)\b|\bzur\s+auswahl\b/i;

// Ein SET-Inhalt ist keine Auswahl: «4 Boxen in zwei Grössen: 2× gross, 2× klein» beschreibt,
// was mitgeliefert wird (Lehre 01.09.). Stueckzahl «N×» vor einem Buchstaben schuetzt den Satz.
const SET_RE = /\b\d+\s*[×x]\s*[a-zäöüß]/i;

// ⚠️ GEGENRICHTUNG zur Verbreiterung oben (09.09.2026, «Farbblock-Armband mit Zirkonia»):
// «Es ist mit Zirkonia IN VERSCHIEDENEN FARBEN BESETZT» beschreibt die WARE, nicht eine Wahl —
// die Steine sind mehrfarbig, es gibt nichts auszuwaehlen. Das enge Muster von vorher traf das
// nicht; das breitere koennte es treffen, sobald im selben Satz irgendwo «erhaeltlich» steht.
// Jede Verschaerfung braucht ihre Gegenrichtung, sonst schneidet der Importer einen WAHREN Satz
// weg — und ein halber Satz ist schlimmer als eine falsche Klausel (Lehre 21.08./01.09.).
// Bewusst POSITIONSGEBUNDEN: das Partizip muss direkt auf die Farbangabe folgen.
const BESCHREIBEND_RE = /\bin\s+(?:verschiedenen|unterschiedlichen|mehreren)\s+[\wäöüß]+\s+(?:besetzt|bedruckt|gemustert|gehalten|meliert|lackiert|gef[äa]rbt|verziert|bemalt|schimmernd|changierend|gestreift|kariert)\b/i;

// Zweite Gegenrichtung (09.09.2026): der Marker steht VOR der Klausel — «Im Lieferumfang sind
// 10 Gummilaschen in verschiedenen Groessen enthalten» ist ein Set-Inhalt, keine Wahl.
const SETINHALT_RE = /\b(?:Lieferumfang|im Set|Set enth[äa]lt|mitgeliefert|beiliegend)\b/i;

export function wahlSicher(o) {
  if (!o || !o.html) return o;
  const raus = (txt) => {
    // Saetze an .!? trennen, aber nicht zwischen Ziffern (14.5 cm) — Lehre 03.09.
    const teile = txt.split(/(?<=[.!?])(?!\d)\s+/);
    const bleibt = teile.filter(t => !(WAHL_RE.test(t) && !SET_RE.test(t) && !BESCHREIBEND_RE.test(t) && !SETINHALT_RE.test(t)));
    return bleibt.length === teile.length ? null : bleibt.join(' ').replace(/\s{2,}/g, ' ').trim();
  };
  let h = o.html;
  // 1. Listenpunkte, die nur die Klausel tragen, ganz entfernen.
  h = h.replace(/<li>([\s\S]*?)<\/li>/gi, (m, inner) => {
    const t = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return (WAHL_RE.test(t) && !SET_RE.test(t) && !BESCHREIBEND_RE.test(t) && !SETINHALT_RE.test(t)) ? '' : m;
  });
  // 2. Absaetze satzweise saeubern; bleibt nichts uebrig, faellt der Absatz weg.
  h = h.replace(/<p>([\s\S]*?)<\/p>/gi, (m, inner) => {
    if (/<[a-z]/i.test(inner)) return m;      // Auszeichnung im Absatz: nicht anfassen
    const neu = raus(inner);
    if (neu === null) return m;
    return neu.length >= 25 ? `<p>${neu}</p>` : '';
  });
  h = h.replace(/<ul>\s*<\/ul>/gi, '').replace(/\n{3,}/g, '\n\n');
  // Sicherung: lieber die falsche Klausel als ein leerer Text.
  const nackt = h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (nackt.length < 120) return o;
  o.html = h;
  return o;
}

// ⚠️ 14.09.2026 — TEXTPOLITUR, deterministisch. Gemessen an 300 Importen vom 13./14.09.:
// 99 % der Texte begannen mit «Dieser/Diese/Dieses …» (Monotonie, die jede Kundin als
// KI-Muster liest), 23 % trugen «Im Lieferumfang ist ein Schal enthalten» (CJs «Packing
// list: 1 x scarf» als Satz), 12 % «ist für Erwachsene konzipiert» / «dient der
// Wärmefunktion» (CJ-Metadaten als Prosa), 14 % eine verbotene Floskel trotz Nachbesserung
// (16× «vielseitig», 14× «sorgt für»). Der Prompt bittet seit heute um alles vier; eine
// Bitte reicht bei einem Modell nicht (Lehre 04.09.), deshalb hier der Schnitt — SATZWEISE,
// nie mitten im Satz (Lehre 21.08.), und nur bei Saetzen, die NUR die Metadatenaussage tragen.
const LIEFER_EINZEL_RE = /^\s*im lieferumfang (?:ist|sind)\s+(?:ein|eine|einen|1|1×|1 x)\s+[\wäöüß-]+\s+enthalten\s*[.!]?\s*$/i;
const META_RE = /^\s*(?:er|sie|es|der \w+|die \w+|das \w+)\s+(?:ist|sind|wurde|wurden)\s+(?:speziell\s+)?(?:für\s+(?:erwachsene|frauen|damen|herren|männer|maenner|kinder|jugendliche)(?:\s+(?:und|oder)\s+(?:den\s+)?[\wäöüß ]{3,30})?\s+)?(?:konzipiert|bestimmt|gedacht|entwickelt|geeignet)\s*(?:und\s+dient\s+der\s+[\wäöüß]+funktion)?\s*[.!]?\s*$|^\s*(?:er|sie|es)\s+dient\s+der\s+[\wäöüß]+funktion\s*[.!]?\s*$|^\s*(?:die\s+)?saison\s+ist\s+[\wäöüß/ ]+\s*[.!]?\s*$/i;
// Attributive Floskel-Adjektive fallen als WORT («ein vielseitiges Accessoire» → «ein Accessoire»);
// der Satz bleibt grammatisch, weil ein Attribut nie Satzglied-tragend ist.
const ADJ_FLOSKEL_RE = /\b(?:vielseitig|hochwertig|stilvoll|einzigartig|perfekt)(?:e|es|er|en|em)?\s+(?=[\wäöüß])/gi;
// Stichpunkte, die nur Katalog-Metadaten tragen («Für Damen konzipiert», «Für Herbst und Winter
// geeignet») — 14 % der Importe vom 14.09. Faellt nur, wenn danach noch ≥2 Stichpunkte bleiben.
const META_LI_RE = /^\s*f[üu]r\s+(?:damen|herren|frauen|m[äa]nner|erwachsene|kinder|jugendliche|babys?|herbst|winter|sommer|fr[üu]hling|alle\s+jahreszeiten)(?:\s*(?:und|&|\/)\s*[\wäöüß]+)?\s+(?:konzipiert|geeignet|bestimmt|gedacht|entwickelt)\s*[.!]?\s*$/i;
// CJ «Material: Other» kommt als «aus 100 % anderen Materialien gefertigt» an — eine Aussage ohne Inhalt.
const ANDERE_MAT_KLAUSEL_RE = /\s*(?:,?\s*(?:und|sowie)\s+)?(?:ist|besteht)?\s*aus\s+(?:100\s*%\s*)?(?:anderen|andere|sonstigen|sonstige|verschiedenen)\s+materialien?(?:\s+(?:gefertigt|hergestellt))?/i;
// Metadaten als TEILSATZ («Er ist speziell für Frauen konzipiert und hat ein Karomuster.») —
// die Klausel faellt, der Rest bleibt ein ganzer Satz («Er hat ein Karomuster.»).
const META_KLAUSEL_RE = /\s+(?:ist|sind)\s+(?:speziell\s+)?f[üu]r\s+(?:frauen|damen|herren|m[äa]nner|erwachsene|kinder|babys?)\s+(?:konzipiert|gedacht|bestimmt|entwickelt|geeignet)\s+und\s+(?=[\wäöüß])/i;
const ANDERE_MAT_SATZ_RE = /^\s*(?:er|sie|es|der\s+\w+|die\s+\w+|das\s+\w+)\s+(?:ist|besteht)\s+aus\s+(?:100\s*%\s*)?(?:anderen|andere|sonstigen|sonstige|verschiedenen)\s+materialien?(?:\s+(?:gefertigt|hergestellt))?\s*[.!]?\s*$/i;
export function beginntMitDies(html) {
  const t = String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return /^Dies(?:er|e|es)\b/.test(t);
}
export function textPolieren(o) {
  if (!o || !o.html) return o;
  let h = o.html.replace(/<p>([\s\S]*?)<\/p>/gi, (m, inner) => {
    if (/<[a-z]/i.test(inner)) return m;                       // Auszeichnung: nicht anfassen
    const teile = inner.split(/(?<=[.!?])(?!\d)\s+/);
    const bleibt = teile.filter(t => !LIEFER_EINZEL_RE.test(t) && !META_RE.test(t) && !ANDERE_MAT_SATZ_RE.test(t))
      .map(t => t.replace(ANDERE_MAT_KLAUSEL_RE, '').replace(META_KLAUSEL_RE, ' ').replace(/\s+([.!?,])/g, '$1'));
    const neu = bleibt.join(' ').replace(ADJ_FLOSKEL_RE, '').replace(/\s{2,}/g, ' ').trim();
    return neu.length >= 25 ? `<p>${neu}</p>` : '';
  });
  const lis = [...h.matchAll(/<li>([\s\S]*?)<\/li>/gi)].map(m => m[1].replace(/\s+/g, ' ').trim());
  // Ohne Inhalt → immer weg; Metadaten → nur, wenn danach noch ≥2 Stichpunkte stehen.
  const leer = (t) => LIEFER_EINZEL_RE.test(t) || /^im lieferumfang:?\s*1\s*(?:x|×)\s*[\wäöüß-]+$/i.test(t) || ANDERE_MAT_KLAUSEL_RE.test(t);
  const nachLeer = lis.filter(t => !leer(t));
  const uebrig = nachLeer.filter(t => !META_LI_RE.test(t)).length;
  h = h.replace(/<li>([\s\S]*?)<\/li>/gi, (m, inner) => {
    const t = inner.replace(/\s+/g, ' ').trim();
    if (leer(t) || (META_LI_RE.test(t) && uebrig >= 2)) return '';
    return `<li>${t.replace(ADJ_FLOSKEL_RE, '').replace(/\s{2,}/g, ' ').trim()}</li>`;
  });
  const nackt = h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (nackt.length < 120) return o;                             // lieber die Floskel als ein leerer Text
  o.html = h;
  return o;
}
