/**
 * Prüfung der Produkt-Handles für den Skill lieferbar: reine Funktion, kein Prozess, kein Zustand.
 * Port von pruefeHandles aus luxe-befehle/hilfen.ts (Claude-Code-Mod), mit engeren Grenzen für Codex.
 *
 * Warum so streng: die Handles kommen vom Menschen oder aus einem Text, den das Modell gelesen hat, und gehen
 * danach als Umgebungswert (HANDLES='…') in einen Shell-Befehl. Was nicht genau dem Muster entspricht, wird
 * abgewiesen, nie «repariert». Gleiches gilt für den Echo in der Fehlermeldung: er zeigt nur harmlose Zeichen.
 */

/** So viele verschiedene Handles prüft lieferbar höchstens auf einmal (jede Prüfung kostet CJ-Tagespunkte). */
export const MAX_HANDLES = 25;
/** So lang darf ein Handle höchstens sein (Stichprobe aus 197 Shop-Adressen: längster 68). */
export const MAX_LAENGE = 80;
/** So viele Zeichen darf die rohe Eingabe haben: 25 Handles zu 80 Zeichen plus Trenner passen mit Luft hinein. */
export const MAX_EINGABE = 5000;

const HANDLE = /^[a-z0-9][a-z0-9-]*$/;

export const AUFRUF = `Aufruf: die Handles über stdin, getrennt durch Komma, Leerzeichen oder Zeilenumbruch (eine Spalte geht), höchstens ${MAX_HANDLES}, z. B. elektrischer-fleischwolf-5l-kuchenmaschine-656962,anderes-produkt-123456`;

/** Zeigt ein Stück Eingabe harmlos: nur Buchstaben, Ziffern, «.», «_», «-»; alles andere wird «?», lang wird gekürzt. */
export function sichtbar(text, max = 24) {
  const s = String(text ?? '');
  const zeichen = Array.from(s, z => (/^[A-Za-z0-9._-]$/.test(z) ? z : '?'));
  return `«${zeichen.slice(0, max).join('')}${zeichen.length > max ? '…' : ''}»`;
}

/**
 * Urteil über die Eingabe: `{ handles: [...] }` (geprüft, ohne Doppelte, in der genannten Reihenfolge) oder
 * `{ fehler: 'Text' }`. Erlaubt sind nur a-z, 0-9 und «-» (das erste Zeichen ohne «-»), höchstens 80 Zeichen je
 * Handle; Trenner sind Komma, Leerzeichen und Zeilenumbruch (LF oder CRLF): eine Spalte aus einer Tabelle ist die
 * natürliche Form einer Liste, und jedes Token wird danach einzeln geprüft, der Umbruch öffnet also nichts. Ein
 * einzelner Wagenrücklauf ohne Zeilenvorschub ist KEIN Trenner (das Token ist dann ungültig). Umbruch und Leerraum
 * am Anfang oder Ende (so endet ein Heredoc) werden abgeschnitten.
 */
export function pruefeHandles(eingabe) {
  if (typeof eingabe !== 'string') return { fehler: `Keine Handles angegeben. ${AUFRUF}` };
  if (eingabe.length > MAX_EINGABE) return { fehler: `Eingabe zu lang (${eingabe.length} Zeichen, erlaubt sind ${MAX_EINGABE}). ${AUFRUF}` };

  const roh = eingabe.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '');

  const teile = roh.replace(/\r\n/g, '\n').split(/[ ,\n]+/).filter(Boolean);
  if (teile.length === 0) return { fehler: `Keine Handles angegeben. ${AUFRUF}` };

  const falsch = teile.filter(h => !HANDLE.test(h));
  if (falsch.length > 0) {
    const zeige = [...new Set(falsch)].slice(0, 3).map(h => sichtbar(h)).join(', ');
    return { fehler: `Kein gültiger Handle: ${zeige}${new Set(falsch).size > 3 ? ' …' : ''}. Erlaubt sind nur Kleinbuchstaben a-z, Ziffern und Bindestrich, das erste Zeichen kein Bindestrich. ${AUFRUF}` };
  }
  const lang = teile.filter(h => h.length > MAX_LAENGE);
  if (lang.length > 0) {
    return { fehler: `Handle zu lang: ${sichtbar(lang[0])} hat ${lang[0].length} Zeichen, erlaubt sind ${MAX_LAENGE}. ${AUFRUF}` };
  }

  const handles = [...new Set(teile)];
  if (handles.length > MAX_HANDLES) {
    return { fehler: `Zu viele Handles: ${handles.length}, erlaubt sind ${MAX_HANDLES} (jede Prüfung kostet CJ-Tagespunkte). ${AUFRUF}` };
  }
  return { handles };
}

/**
 * Liest eine Quelle bis zum Ende (EOF), höchstens `max` Bytes. `lies(puffer, von, laenge)` gibt die Zahl der gelesenen Bytes
 * zurück (0 = Ende) und darf werfen; `warte(ms)` wartet. Drei Fälle, die ein einzelnes read() falsch behandelt:
 *  - Die Eingabe kommt in Stücken (langsamer Schreiber, grosser Heredoc): weiterlesen bis 0, nicht beim ersten Stück aufhören.
 *  - Fehlercode «EOF» (so meldet Windows das Ende): ist das Ende.
 *  - Fehlercode «EAGAIN» (geerbte nicht blockierende stdin, die Daten kommen erst später): kurz warten und erneut lesen,
 *    höchstens `maxWartenMs` ohne Fortschritt, dann ein Fehler (nie unbegrenzt warten).
 * Alles andere wird weitergeworfen. Ergebnis: `{ zuLang, text }`; `zuLang`, wenn der Puffer voll wurde (mehr Eingabe als erlaubt).
 */
export function liesBisEnde(lies, warte, { max = MAX_EINGABE * 4 + 1, maxWartenMs = 10000, schrittMs = 20 } = {}) {
  const puffer = Buffer.alloc(max);
  let n = 0, gewartet = 0;
  while (n < puffer.length) {
    let gelesen;
    try {
      gelesen = lies(puffer, n, puffer.length - n);
    } catch (fehler) {
      if (fehler?.code === 'EOF') break;
      if (fehler?.code === 'EAGAIN') {
        if (gewartet >= maxWartenMs) throw new Error(`keine Daten innerhalb von ${Math.round(maxWartenMs / 1000)} Sekunden (stdin ist nicht blockierend und bleibt leer)`);
        warte(schrittMs);
        gewartet += schrittMs;
        continue;
      }
      throw fehler;
    }
    if (gelesen === 0) break;
    n += gelesen;
    gewartet = 0;
  }
  return { zuLang: n >= puffer.length, text: puffer.subarray(0, n).toString('utf8') };
}
