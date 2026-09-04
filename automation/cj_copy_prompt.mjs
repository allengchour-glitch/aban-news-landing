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
   - Satz 1: Was es ist und wofür man es konkret braucht (der Nutzen im Alltag, kein Werbeton).
   - Satz 2–4: nur belegbare Fakten aus den Features — Masse, Material, Kapazität, Funktion, Lieferumfang. Mit Zahlen, wo die Features Zahlen nennen.
   - Dann <h3>Das zeichnet es aus</h3> mit 3–5 kurzen Stichpunkten (je max 8 Wörter, jeder mit einem Fakt).
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
