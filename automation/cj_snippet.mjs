// cj_snippet.mjs — der Text, der bei Google UNTER dem Titel steht.
//
// DER FUND (29.08.2026): Von 65 Adressen, für die luxestyle.ch in Googles Top 100 steht,
// trugen 50 als Meta-Beschreibung nur «<Produktname> – bei LuxeStyle Schweiz. Gratis-Versand
// ab CHF 50, 30 Tage Rückgabe.» Dieser Satz wiederholt den Titel und sagt über die Ware
// nichts — und er ist das einzige Argument, das eine Seite auf Position 17 hat.
//
// Der Bestand wurde mit `automation/snippet_rankende_seiten.py` repariert. DIESE Datei ist
// die Quellenkorrektur: alle drei CJ-Importer schrieben den Baustein bei JEDEM neuen
// Produkt — ohne sie wäre die Reparatur bis morgen wieder eingeholt (dieselbe Lehre wie bei
// `condition` und `google_product_category`: zu jedem Backfill gehört die Frage, wer das
// Feld beim NÄCHSTEN Produkt schreibt).
//
// ⚠️ EINE Datei für alle drei Importer. Preisformel, Farbtabelle, Grössenmenge und
// `publishVerified()` standen hier schon je drei- bis viermal mit auseinandergelaufenem
// Inhalt. Neue Regeln NUR hier.

// Bausteine, die im Beschreibungstext stehen, aber nichts über die Ware sagen.
// ⚠️ Bei zwei Produkten steht der Versandhinweis VOR dem Beschreibungstext — ohne diese
// Wache landet «📦 Lieferzeit Schweiz: 10–20 Werktage» als Google-Snippet.
const BAUSTEIN = /(Lieferzeit|Direktversand|Gratis-Versand|30 Tage Rückgabe|Sorglos shoppen|Versand nur in die|Versand:)/i;
// Heilaussagen und Messversprechen gehören nicht in den Feed-Text.
const HEIKEL = /\b(blutzucker|blutdruck|ekg|harnsäure|heilt|therapie|krebs|diabetes|lindert|behandelt|entlastet?|hallux|valgus|arthrose|schmerz|linderung)\w*/i;
// Unübersetzte fremde Produktbezeichnung («Der Paperang Thermal Printer Mini Mobile Photo
// Printer …»). ⚠️ Schwelle FÜNF, nicht drei: Deutsch schreibt Substantive gross, bei drei
// fielen «Bieten Sie Ihrer Katze» und «Das Fitness Smart Armband» als Marken durch.
const FREMDMARKE = /\b([A-ZÄÖÜ][a-zäöüß]+ ){5,}/;
const MAXLEN = 155;   // darüber schneidet Google ab

// ⚠️ NUMERISCHE Entities mitentschlüsseln. Der erste Live-Import nach dem Einbau schrieb
// «Gefrostete PU-Oberfl&#228;che» ins Google-Snippet: die Liste kannte `&amp;` und `&quot;`,
// aber nicht `&#228;` (ä). CJ-Beschreibungen sind voll davon. Eine Auslassungsliste von
// Entities ist immer unvollständig — die Zahlenform muss allgemein aufgelöst werden.
const ENTITY = { amp: '&', nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>',
                 auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü',
                 szlig: 'ß', eacute: 'é', egrave: 'è', agrave: 'à', deg: '°', euro: '€' };
const nurText = (s) => (s || '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
  .replace(/&([a-zA-Z]+);/g, (m, n) => (n in ENTITY ? ENTITY[n] : m))
  .replace(/\s+/g, ' ').trim();

function ersterSatz(html) {
  for (const m of (html || '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
    const t = nurText(m[1]);
    if (t.length < 40 || BAUSTEIN.test(t)) continue;   // Baustein, kein Produkttext
    const satz = t.split(/(?<=[.!?])\s+/)[0];
    if (satz) return satz.trim();
  }
  return '';
}

function merkmal(html) {
  for (const m of (html || '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
    const t = nurText(m[1]).replace(/^[\s.]+|[\s.]+$/g, '');
    if (!t || t.length > 60) continue;
    // ⚠️ Auch die Merkmalsliste trägt Versandzeilen: «Versand: 🇨🇭 Schweiz · Lieferung
    // 10–20 Werktage» wurde einmal als «Merkmal» gewählt, weil es Ziffern enthält.
    if (BAUSTEIN.test(t) || /Schweiz/.test(t) || HEIKEL.test(t)) continue;
    if (/\d|cm|mm|ml|liter|holz|leder|edelstahl|akku|wasserdicht|faltbar|kabellos|silikon|baumwolle/i.test(t)) return t;
  }
  return '';
}

/**
 * Baut die Meta-Beschreibung aus dem Beschreibungstext des Produkts.
 * Wörtlich übernommen — es wird nichts erfunden und nichts umformuliert.
 * Taugt der Text nicht, kommt der alte Baustein zurück: ein langweiliges Suchergebnis
 * ist besser als ein falsches.
 */
export function snippet(html, titel) {
  const baustein = `${titel} – bei LuxeStyle Schweiz. Gratis-Versand ab CHF 50, 30 Tage Rückgabe.`;
  const satz = ersterSatz(html);
  if (satz.length < 40 || HEIKEL.test(satz) || FREMDMARKE.test(satz)) return baustein.slice(0, 320);
  if (satz.length > MAXLEN) {
    return satz.slice(0, MAXLEN).replace(/\s+\S*$/, '').replace(/[\s,;–-]+$/, '') + ' …';
  }
  const m = merkmal(html);
  return (m && satz.length + 3 + m.length <= MAXLEN) ? `${satz} ${m}.` : satz;
}

export default snippet;
