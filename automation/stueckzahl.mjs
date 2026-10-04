// stueckzahl.mjs — trägt die Stückzahl aus dem Lieferantennamen in den deutschen Titel.
//
// WARUM: CJ schreibt die Menge in den ENGLISCHEN Produktnamen — «24-piece», «2 Rolls»,
// «Set Of 5 Balloon Boxes», «2-Pack». Der Übersetzer baut daraus einen schönen deutschen
// Titel und lässt die Zahl weg. Ergebnis: ein Multipack sieht aus wie ein Einzelstück, und
// der CHF-Preis wirkt absurd hoch — genau die Beschwerde, die am 26.07.2026 zur
// Multipack-Regel führte («sonst fragen leute zu teuer für ballon»). Damals wurden
// 15 Luftballon-Produkte VON HAND korrigiert; der Importer legte am nächsten Tag neue an.
// Hier ist die Quelle: jeder Importer hängt die Zahl beim Anlegen an.
//
// ⚠️ NUR MENGENANGABEN, keine Eigenschaften. Der Unterschied entscheidet:
//     «24-piece Sticker Set»        → 24 Stück      (Liefermenge)
//     «5D Diamond Painting»         → NEIN          (Technik-Bezeichnung)
//     «PlayStation 5 Controller»    → NEIN          (Gerätename)
//     «2 Rolls Thank You Stickers»  → 2 Stück       (Liefermenge)
//     «3 in 1 Ladestation»          → NEIN          (Funktionsangabe)
//     «Size 10 Ring»                → NEIN          (Grösse)
// Deshalb zählt nur eine Zahl UNMITTELBAR vor einem Mengenwort — und «in 1», «D», «ATM»,
// «Style» sind ausgeschlossen. Bei Widerspruch (zwei verschiedene Mengen im Namen) wird
// NICHTS geschrieben: eine falsche Stückzahl ist schlimmer als keine.

const SET_OF = /\bset\s+of\s+(\d{1,4})\b/i;
const MENGE  = /\b(\d{1,4})\s*[-\s]?(?:pieces?|pcs?|pack|packs|rolls?|sheets?|pairs?|bags?|st[üu]ck)\b/gi;
// «24 Style» meint die AUSWAHL, nicht die Liefermenge — das ist bei CJ häufig.
const KEINE_MENGE = /\b\d{1,4}\s*[-\s]?(?:style|styles|colors?|colours?|designs?|in\s*1|d\b|atm|ml|cm|mm|g|kg|w|v)\b/i;

export function mengeAusName(nameEn) {
  const n = String(nameEn || '');
  if (!n) return null;
  const gefunden = new Set();
  const s = n.match(SET_OF);
  if (s) gefunden.add(parseInt(s[1], 10));
  for (const m of n.matchAll(MENGE)) {
    const vorher = n.slice(Math.max(0, m.index - 12), m.index + m[0].length);
    if (KEINE_MENGE.test(vorher)) continue;
    gefunden.add(parseInt(m[1], 10));
  }
  const werte = [...gefunden].filter(v => v >= 2 && v <= 5000);
  // Zwei verschiedene Mengen im selben Namen → nicht raten.
  return werte.length === 1 ? werte[0] : null;
}

// Kürzt einen Titel auf maxLen — an einer WORTGRENZE, nie mitten im Wort.
//
// ⚠️ 23.08.2026, gefunden vom Katalog-Audit in Code, der einen Tag alt war: Diese Datei
// machte es im «· N Stück»-Zweig längst richtig und im HAUPTPFAD roh (`t.slice(0,70)`).
// Beide Fassungen standen in derselben Datei. Ergebnis live: 51 Titel enden mitten im
// Wort — «…mit 3D-Digitaldru», «…grossem Fassungsvermög», «…Vorne/Hinten/L». Die
// Längenverteilung belegt die harte Kappe unabhängig: 69 Zeichen → 25 Produkte,
// 70 → 82, 71 → 11. Der Titel ist die Zeile in Google Shopping, in der Kollektions-
// Kachel und im Warenkorb — genau dort, wo die Kaufentscheidung fällt.
//
// Das ist zum VIERTEN Mal dieselbe Fehlerklasse nach Farbtabelle, publishVerified() und
// Preisformel: wer eine Hilfsfunktion an einer Stelle repariert, muss ihre Geschwister
// suchen — hier standen sie 15 Zeilen auseinander.
export function kuerzen(text, maxLen = 70) {
  const t = String(text || '').trim();
  if (t.length <= maxLen) return t;
  let basis = t.slice(0, maxLen);
  const luecke = basis.lastIndexOf(' ');
  // Bleibt nach dem Rückschnitt zu wenig übrig, ist der harte Schnitt das kleinere Übel
  // (ein Titel aus zwei Wörtern sagt weniger als ein leicht angeschnittener).
  if (luecke > maxLen * 0.55) basis = basis.slice(0, luecke);
  return basis.replace(/[\s·,–-]+$/, '')
              .replace(/\s+(?:und|oder|mit|für|im|in|aus|der|die|das|den|zum|zur|&|·)$/i, '')
              .replace(/[\s·,–-]+$/, '');
}

// Hängt «· N Stück» an, wenn der Titel noch keine Stückzahl nennt.
// ⚠️ Reicht der Platz nicht, wird der TITEL gekürzt, nicht die Stückzahl weggelassen —
// sie ist die Angabe, ohne die der Preis missverstanden wird. Bleibt zu wenig übrig,
// gewinnt der ungekürzte Titel (dieselbe Regel wie bei den Wearable-Titeln: Shopify
// lehnt einen leeren Titel ab).
// ⚠️ 04.10.2026 (Neuimport-Qualität, 837 Neuimporte in 24 h gemessen): Die Übersetzer liefern
// typografische Sonderzeichen — U+2011 (geschützter Bindestrich, 88 Titel), U+202F (schmales
// Leerzeichen, 51 Titel), zusammen 121 von 837. Für die Kundin unsichtbar, für die Suche tödlich:
// «12‑in‑1» findet niemand, der «12-in-1» tippt, und JEDE Regex im Haus (Stückzahl-Wache,
// Multipack-Regel, Kauderwelsch-Wache) sieht «5‑Stück» nicht als Menge. Hier, an der EINEN Stelle,
// durch die alle drei Importer gehen, werden sie auf ASCII geglättet.
const SONDERZEICHEN = [[/[‐‑‒⁃]/g, '-'], [/[    ]/g, ' '], [/\s{2,}/g, ' ']];
export function glaetten(text) {
  let t = String(text || '');
  for (const [rx, ersatz] of SONDERZEICHEN) t = t.replace(rx, ersatz);
  return t.trim();
}

// Der deutsche Titel nennt die Menge schon — in irgendeiner Form. Gemessen 04.10.2026 an vier
// Neuimporten: «12 Stück Kuchenformen aus Metall · 12 Stück», «(2 Stück) · 2 Stück»,
// «12-teiliger Kochset … · 12 Stück», «5-teiliges Küchenhelfer-Set · 5 Stück». Die alte Wache
// kannte nur die eigene Form «· N Stück».
const MENGE_IM_TITEL = new RegExp(
  '\\d+\\s*(?:St[üu]ck|Stk|Blatt|Paar|Rollen?|Teile|Sets?|Packs?)\\b|\\d+\\s*-?\\s*teilig|' +
  '\\(\\s*\\d+\\s*(?:St|x)\\b|\\d+er[- ]?(?:Set|Pack|Packung)|\\bSet\\s+à\\s*\\d+|' +
  '\\b(?:zwei|drei|vier|fünf|fuenf|sechs|sieben|acht|neun|zehn|elf|zwölf|zwoelf)teilig', 'i');

export function titelMitMenge(titel, nameEn, maxLen = 70) {
  const t = glaetten(titel);
  if (MENGE_IM_TITEL.test(t)) return kuerzen(t, maxLen);
  const n = mengeAusName(nameEn);
  if (!n) return kuerzen(t, maxLen);
  const zusatz = ` · ${n} Stück`;
  if (t.length + zusatz.length <= maxLen) return t + zusatz;
  const platz = maxLen - zusatz.length;
  if (platz < 24) return kuerzen(t, maxLen);
  return kuerzen(t, platz) + zusatz;
}
