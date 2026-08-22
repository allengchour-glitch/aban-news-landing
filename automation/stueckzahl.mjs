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

// Hängt «· N Stück» an, wenn der Titel noch keine Stückzahl nennt.
// ⚠️ Reicht der Platz nicht, wird der TITEL gekürzt, nicht die Stückzahl weggelassen —
// sie ist die Angabe, ohne die der Preis missverstanden wird. Gekürzt wird an einer
// Wortgrenze; bleibt zu wenig übrig, gewinnt der ungekürzte Titel (dieselbe Regel wie
// bei den Wearable-Titeln: Shopify lehnt einen leeren Titel ab).
export function titelMitMenge(titel, nameEn, maxLen = 70) {
  const t = String(titel || '').trim();
  if (/·\s*\d+\s*(?:St[üu]ck|Stk|Blatt|Paar)\b/i.test(t)) return t.slice(0, maxLen);
  const n = mengeAusName(nameEn);
  if (!n) return t.slice(0, maxLen);
  const zusatz = ` · ${n} Stück`;
  if (t.length + zusatz.length <= maxLen) return t + zusatz;
  const platz = maxLen - zusatz.length;
  if (platz < 24) return t.slice(0, maxLen);
  let basis = t.slice(0, platz);
  const luecke = basis.lastIndexOf(' ');
  if (luecke > 20) basis = basis.slice(0, luecke);
  // Ein abgeschnittener Titel darf nicht auf einem Binde- oder Füllwort enden
  // («… für Notizbuch, Laptop und · 24 Stück» liest sich wie ein Fehler).
  basis = basis.replace(/[\s·,–-]+$/, '')
               .replace(/\s+(?:und|oder|mit|für|im|in|aus|der|die|das|den|zum|zur|&|·)$/i, '')
               .replace(/[\s·,–-]+$/, '');
  return basis + zusatz;
}
