/**
 * Ersatzprobe für die vom Shopify-CDN ausgelieferte (minifizierte) Fassung von 6.2.1, solange 6.2.1 noch nicht hochgeladen ist.
 *
 * Das CDN minifiziert hochgeladene .js-Dateien (GEMESSEN 06.11.2026 an 6.2.0: 206 421 → 136 191 Byte, Namen bleiben, Zeilenumbrüche weg, Kommentar mit «/*!» bleibt, Emoji als 🖼-Paar).
 * Es ist KEIN lokaler Minifier installiert (weder esbuild noch terser; nichts installiert, wie vorgegeben). Darum leitet dieses Skript aus der echten, vom CDN gelieferten Fassung von 6.2.0
 * die Fassung 6.2.1 mit genau den zwei Textersetzungen ab, in denen sich beide unterscheiden (Zeichenkette des Schlüssels, VERSION). Das ist eine Ersatzprobe, kein Lauf des CDN-Minifiers über 6.2.1:
 * der echte Beleg folgt nach dem Hochladen (README, Live-Plan Schritt 3: ausgelieferte Datei laden und alle drei Reihen mit V6_DATEI=<Datei> V6_VERSION=6.2.1 wiederholen).
 *
 * Aufruf:  node cdn_ersatz.mjs <vom CDN ausgelieferte 6.2.0> <Zieldatei>
 *          V6_VERSION=6.2.1 node alle_fassungen.mjs <Zieldatei>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

/** Die Zeichenkette des Schlüssels in den Schreibweisen, in denen ein Minifier das Emoji ausgeben kann (Surrogatpaar, \u{…}, echtes Zeichen). */
const ALT = ['"\\uD83D\\uDDBC\\uFE0F Druckdatei ("', '"\\u{1F5BC}\\uFE0F Druckdatei ("', '"\u{1F5BC}\uFE0F Druckdatei ("'];

/** @returns {{text:string, ersetzt:string[]}} 6.2.1-Stand-in; wirft, wenn ein Muster nicht genau einmal vorkommt. */
export function ersatz621(text620) {
  const ersetzt = [];
  let t = text620;
  const treffer = ALT.map((a) => [a, t.split(a).length - 1]).filter(([, n]) => n > 0);
  if (treffer.length !== 1 || treffer[0][1] !== 1) throw new Error(`Schlüssel «Druckdatei (» nicht genau einmal gefunden: ${JSON.stringify(treffer)}`);
  t = t.split(treffer[0][0]).join('"_Druckdatei ("'); ersetzt.push('Schlüssel');
  const re = /(\bVERSION\s*=\s*)(["'])6\.2\.0\2/g;
  const n = (t.match(re) || []).length;
  if (n !== 1) throw new Error(`VERSION = "6.2.0" nicht genau einmal gefunden (${n})`);
  t = t.replace(re, '$1$26.2.1$2'); ersetzt.push('VERSION');
  return { text: t, ersetzt };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [quelle, ziel] = process.argv.slice(2);
  if (!quelle || !ziel) { console.error('Aufruf: node cdn_ersatz.mjs <ausgelieferte 6.2.0> <Zieldatei>'); process.exit(2); }
  const roh = readFileSync(quelle, 'utf8');
  const { text, ersetzt } = ersatz621(roh);
  writeFileSync(ziel, text);
  console.log(`Ersatzprobe geschrieben: ${ziel} (${Buffer.byteLength(text)} Byte, SHA-256 ${createHash('sha256').update(text).digest('hex').slice(0, 16)}…), ersetzt: ${ersetzt.join(', ')}. KEIN Lauf des CDN-Minifiers über 6.2.1.`);
}
