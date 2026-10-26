/**
 * Ausführlichere Produkttexte (Fliesstext) — Zerlegen der Seite, Prüfen dessen, was ein Agent geschrieben hat, Einsetzen.
 * Rein, getestet (text_prosa_test.mjs). Ergänzt lib/fakten_block.mjs (die Tabelle bleibt, der Fliesstext darüber wird reicher).
 *
 * WARUM (26.10.2026): Der User fand die Beschreibungen «zu lasch» und wünschte längere Sätze, schönere Texte mit allen Infos.
 * Mehrere Agenten schreiben parallel; hier steht, was sie NICHT dürfen. Jede Zahl im neuen Text muss in den Quellen stehen (CJ-Datenblatt,
 * alter Text, Titel, Optionen), keine Marken, keine Heil-/Wirkversprechen, nur schlichtes HTML. Was durchfällt, wird nicht gesetzt.
 */
import { htmlZuText, zahlen, VERBOTEN } from './fakten_block.mjs';

export const MARKER = '<!-- ls-text-v2 -->', ENDE = '<!-- /ls-text-v2 -->';
const ENDE_MARKEN = [/<div class="ls-produktdetails"/, /<!-- ls-/, /<div class="ls-fakten"/, /<div style="background:#f7faf7/, /<div class="ls-/];

/** Seite → { kopf, prosa, rest }. Kopf = Lieferzeit-Kasten und «Ohne Risiko»-Kasten, Prosa = alles bis zum ersten Kasten/Marker. Rein, getestet. */
export function zerlege(html) {
  const h = String(html || '');
  const a = h.indexOf(MARKER);
  if (a >= 0) { const e = h.indexOf(ENDE, a); if (e >= 0) return { kopf: h.slice(0, a), prosa: h.slice(a + MARKER.length, e), rest: h.slice(e + ENDE.length), markiert: true }; }
  // Der Auswahl-Lauf stellt <!-- ls-var-v1 --> (und «Ausführung: …»-Hinweise) VOR die Seite. Das gehört zum Kopf und bleibt unberührt —
  // sonst hielt `zerlege` den Marker für den ersten Kasten, fand keine Prosa und lehnte 48 von 220 fertigen Texten ab (26.10.2026).
  const vorspann = /^\s*<!-- ls-var-v1 -->(?:\s*<p><strong>Ausführung:<\/strong>[\s\S]*?<\/p>)*\s*/.exec(h);
  let kopfEnde = vorspann ? vorspann[0].length : 0;
  const liefer = /^\s*<p class="ls-liefer"[^>]*>[\s\S]*?<\/p>\s*/.exec(h.slice(kopfEnde));
  if (liefer) kopfEnde += liefer[0].length;
  const trust = /^\s*<p[^>]*background:#f7faf7[^>]*>[\s\S]*?<\/p>\s*/.exec(h.slice(kopfEnde));
  if (trust) kopfEnde += trust[0].length;
  let restStart = h.length;
  for (const re of ENDE_MARKEN) { const m = re.exec(h.slice(kopfEnde)); if (m) restStart = Math.min(restStart, kopfEnde + m.index); }
  return { kopf: h.slice(0, kopfEnde), prosa: h.slice(kopfEnde, restStart), rest: h.slice(restStart), markiert: false };
}

/** Besteht die alte Prosa nur aus schlichten Elementen? (Sonst nicht anfassen: Tabellen, Bilder, eigene Kästen.) Rein, getestet. */
export const schlichtesProsa = prosa => !/<(table|img|div|iframe|script|style|a |video|svg)/i.test(prosa) && htmlZuText(prosa).length > 0;

const ERLAUBT = new Set(['p', 'h3', 'ul', 'li', 'strong', 'em', 'br']);
const BEHAUPTUNG = /garantiert|bestes?\b|testsieger|nummer\s*1|100\s?%|medizinisch|heil(t|ung|en)\b|therap|schmerzfrei|wissenschaftlich|klinisch|dermatologisch|zertifiziert|original(?!e? (grösse|farbe))|wasserdicht|wasserfest|spritzwassergeschützt|ip\d\d/i;

/** Das CJ-Datenblatt ist englisch: «Waterproof: Yes» belegt «wasserdicht», «Waterproof: no» belegt es NICHT. Rein, getestet. */
export function belegErweitert(beleg) {
  const t = String(beleg || '');
  const nein = /water\s?-?proof\W{0,4}(no|nein|not)\b/i.test(t);
  return t + (/water\s?-?proof|water resistant|\b\d+\s?atm\b/i.test(t) && !nein ? ' wasserdicht wasserfest' : '');
}

/** Prüft den Text, den ein Agent geschrieben hat. Liefert { ok, gruende }. `erlaubteZahlen` = Zahlen aus allen Quellen. Rein, getestet. */
export function prosaPruefen(neu, erlaubteZahlen, { minZeichen = 450, maxZeichen = 3600, titel = '', beleg = '' } = {}) {
  const gruende = [], h = String(neu || '').trim();
  if (!h) return { ok: false, gruende: ['leer'] };
  for (const m of h.matchAll(/<\/?([a-z0-9]+)([^>]*)>/gi)) {
    const tag = m[1].toLowerCase();
    if (!ERLAUBT.has(tag)) gruende.push(`Tag nicht erlaubt: <${tag}>`);
    else if (m[2].trim() && !/^\s*\/?$/.test(m[2])) gruende.push(`Attribut nicht erlaubt: <${tag}${m[2]}>`);
  }
  const text = htmlZuText(h);
  if (text.length < minZeichen) gruende.push(`zu kurz (${text.length} Zeichen, Mindestens ${minZeichen})`);
  if (text.length > maxZeichen) gruende.push(`zu lang (${text.length} Zeichen)`);
  if ((h.match(/<p>/gi) || []).length < 2) gruende.push('weniger als zwei Absätze');
  if (/[一-鿿]/.test(text)) gruende.push('chinesische Zeichen');
  if (/ß/.test(text)) gruende.push('ß statt ss (Schweizer Schreibweise)');
  if (VERBOTEN.test(text)) gruende.push(`verbotenes Wort: ${(VERBOTEN.exec(text) || [])[0]}`);
  // Ein Behauptungswort ist erlaubt, wenn das CJ-Datenblatt (beleg) dasselbe Wort nennt — der alte Seitentext zählt nicht als Beleg.
  for (const m of text.matchAll(new RegExp(BEHAUPTUNG.source, 'gi'))) { if (!belegErweitert(beleg).toLowerCase().includes(m[0].toLowerCase())) { gruende.push(`Behauptung ohne Beleg: ${m[0]}`); break; } }
  const erl = erlaubteZahlen instanceof Set ? erlaubteZahlen : new Set(erlaubteZahlen);
  const fremd = [...new Set(zahlen(text))].filter(z => !erl.has(z) && !erl.has(String(Number(z))));
  if (fremd.length) gruende.push(`Zahl nicht in den Quellen: ${fremd.slice(0, 5).join(', ')}`);
  if (/CHF|Fr\.|€|\$/.test(text)) gruende.push('Preisangabe im Fliesstext');
  if (/datenblatt|lieferant|laut angaben|laut quelle|herstellerangabe|laut hersteller/i.test(text)) gruende.push('Quellenverweis im Kundentext (kein «Datenblatt», «Lieferant», «laut Angaben»)');
  if (/\b(das|dieses) (produkt|modell|set|stück|ding)\b[^.]*\b(gehört zur kategorie|führt es als|ist als .* ausgewiesen)/i.test(text) || /gehört zur kategorie/i.test(text)) gruende.push('Verwaltungssprache («gehört zur Kategorie», «ausgewiesen»)');
  if (/(lieferzeit|versand|rückgabe|garantie)/i.test(text)) gruende.push('Versand/Rückgabe steht schon in den Kästen');
  const sätze = text.split(/[.!?]\s/).filter(s => s.trim().length > 3);
  if (sätze.length < 5) gruende.push(`weniger als fünf Sätze (${sätze.length})`);
  if (titel) { const w = (titel.toLowerCase().match(/[a-zäöü]{5,}/g) || []); if (w.length && !w.some(x => text.toLowerCase().includes(x.slice(0, 5)))) gruende.push('nennt das Produkt nicht'); }
  return { ok: gruende.length === 0, gruende };
}

/** Neue Prosa in die Seite setzen (zwischen Marker). Ein vorhandener Block wird ersetzt. Rein, getestet. */
export function prosaEinsetzen(html, neu) {
  const z = zerlege(html);
  // Überschriften als <h4>: das Theme setzt <h3> deutlich grösser als die Tabelle darunter (26.10., Screenshot) — so wirkt die Seite einheitlich.
  const klein = String(neu).trim().replace(/<h3>/g, '<h4>').replace(/<\/h3>/g, '</h4>');
  return z.kopf + MARKER + klein + ENDE + (z.markiert ? '' : '\n') + z.rest;
}
