#!/usr/bin/env node
/**
 * schutzausruestung.mjs — sucht auf den ECHTEN Produktseiten nach Angaben zur
 * Zertifizierung von persoenlicher Schutzausruestung (Helme, Westen, Schutzbrillen).
 *
 *   node tools/schutzausruestung.mjs --selbsttest
 *   node tools/schutzausruestung.mjs <handle> [<handle> …]
 *   node tools/schutzausruestung.mjs --datei dropship/schutzausruestung-handles.txt
 *
 * ⚠️ DIE WICHTIGSTE REGEL DIESES GERAETS — sonst richtet es Schaden an:
 * **Fehlender CE-Text auf der Seite beweist NICHT, dass das Produkt kein CE hat.**
 * Die Produktseiten hier sind aus Lieferantendaten erzeugt und nennen fast nie eine Norm.
 * Das Geraet unterscheidet deshalb streng drei Faelle:
 *
 *   europaeisch  — die Seite nennt eine EU-Norm (EN 1078 Velo, EN 1077 Ski,
 *                  EN 1385 Wassersport, EN ISO 12402 Rettungsweste, UN ECE R44 /
 *                  R129 „i-Size" Kinderrueckhaltesystem) oder CE als Wort.
 *   chinesisch   — die Seite nennt NUR eine chinesische Kennzeichnung (3C, CCC, GB-Norm).
 *                  Das ist ein BEFUND: ein positiver Hinweis, dass die EU-Zulassung fehlt.
 *   unbekannt    — die Seite sagt gar nichts. Das ist KEIN Befund, sondern eine
 *                  Dokumentationsluecke: beim Lieferanten nachfragen, nicht vom Verkauf nehmen.
 *
 * Wer „unbekannt" als „nicht zertifiziert" liest, nimmt gesunde Ware aus dem Verkauf.
 * Wer „chinesisch" ignoriert, verkauft in der Schweiz Schutzausruestung ohne EU-Nachweis.
 */

import { readFileSync } from 'node:fs';
import { sichtbarerText } from './shop_conversion.mjs';

const BASIS = 'https://luxestyle.ch/products/';

/**
 * EU-Normen und das CE-Zeichen. `CE` steht nur als eigenstaendiges Wort —
 * sonst faengt es „initial-scale", „compare-at", „Service" und hunderte CSS-Klassen.
 */
export const EUROPAEISCH = /\bEN[ -]?(1078|1077|1385|1384|12492|166)\b|\bEN[ -]?ISO[ -]?12402\b|\b(?:UN[ -]?)?ECE[ -]?R?[ -]?(44|129)\b|\bi-?Size\b|\bCE\b[ -]?(Kennzeichnung|Zeichen|zertifiziert|gepr(ü|ue)ft|konform)?|\bconformit(é|e) europ(é|e)enne\b/i;

/** Chinesische Kennzeichnungen. `3C` und `CCC` sind die gaengigen Schreibweisen. */
export const CHINESISCH = /\b3C\b|\bCCC\b|\bGB[ /-]?\d{4,5}\b|China Compulsory/i;

/**
 * Sichtbarer Text einer Seite → Befund.
 * `norm` ist 'europaeisch' | 'chinesisch' | 'unbekannt'.
 */
export function befund(html) {
  const text = sichtbarerText(html);
  const eu = EUROPAEISCH.test(text);
  const cn = CHINESISCH.test(text);
  return {
    europaeisch: eu,
    chinesisch: cn,
    // Eine EU-Angabe schlaegt eine chinesische: wer beides fuehrt, hat die EU-Zulassung.
    norm: eu ? 'europaeisch' : cn ? 'chinesisch' : 'unbekannt',
    belegstelle: cn && !eu ? (text.match(CHINESISCH) || [null])[0] : null,
  };
}

/** HTTP-Codes, bei denen der Shop nur drosselt — die Seite EXISTIERT. */
export const GEDROSSELT = new Set([429, 430, 503]);

/**
 * Holt eine Produktseite. Wiederholt bei Drosselung mit wachsender Wartezeit.
 *
 * ⚠️ TEUER GELERNT (2026-09-20): ein Lauf ueber 123 Seiten mit 150 ms Pause meldete
 * **43 „unerreichbare" Seiten — alle 43 waren HTTP 429**, also Drosselung, nicht
 * fehlende Seiten. Wer das nicht trennt, meldet ein Drittel der Klasse als nicht
 * vorhanden und misst in Wahrheit die eigene Abruffrequenz.
 */
async function hole(handle, versuche = 3) {
  let letzter = 0;
  for (let i = 0; i < versuche; i++) {
    const antwort = await fetch(BASIS + handle, {
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36' },
    });
    if (antwort.ok) return { handle, http: 200, ...befund(await antwort.text()) };
    letzter = antwort.status;
    if (!GEDROSSELT.has(letzter)) return { handle, http: letzter, norm: 'fehlt' };
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  return { handle, http: letzter, norm: 'gedrosselt' };
}

/* ------------------------------- Selbsttest ------------------------------- */

function selbsttest() {
  let ok = 0; const fehler = [];
  const pruefe = (name, b) => { if (b) ok++; else fehler.push(name); };

  // --- Die Falle, in die ich beim ersten Versuch selbst getreten bin
  pruefe('„initial-scale" ist kein CE-Zeichen',
    befund('<p>content="width=device-width,initial-scale=1"</p>').norm === 'unbekannt');
  pruefe('„compare-at" ist kein CE-Zeichen',
    befund('<p>.compare-at-price { color: red }</p>').norm === 'unbekannt');
  pruefe('„Service" enthaelt kein eigenstaendiges CE',
    befund('<p>Unser Service ist schnell.</p>').norm === 'unbekannt');

  // --- Skripte und Stile zaehlen nicht (geerbt von sichtbarerText)
  pruefe('EN 1078 im <script> zaehlt nicht',
    befund('<script>var norm = "EN 1078";</script><p>Helm</p>').norm === 'unbekannt');
  pruefe('3C im <style> zaehlt nicht',
    befund('<style>.a{content:"3C"}</style><p>Helm</p>').norm === 'unbekannt');
  pruefe('3C im HTML-Kommentar zaehlt nicht',
    befund('<!-- 3C Helmet --><p>Helm</p>').norm === 'unbekannt');

  // --- Europaeisch wird erkannt
  pruefe('EN 1078 wird erkannt', befund('<p>Gepr&uuml;ft nach EN 1078</p>').norm === 'europaeisch');
  pruefe('EN1078 ohne Leerzeichen', befund('<p>Norm EN1078</p>').norm === 'europaeisch');
  pruefe('EN ISO 12402 (Rettungsweste)', befund('<p>EN ISO 12402-5</p>').norm === 'europaeisch');
  pruefe('CE-Kennzeichnung als Wort', befund('<p>Mit CE-Kennzeichnung</p>').norm === 'europaeisch');
  pruefe('CE allein als Wort', befund('<p>Zeichen: CE</p>').norm === 'europaeisch');

  // --- Chinesisch wird erkannt und belegt
  pruefe('3C Helmet wird erkannt', befund('<p>White Double Mirror-3C Helmet</p>').norm === 'chinesisch');
  pruefe('CCC wird erkannt', befund('<p>CCC certified</p>').norm === 'chinesisch');
  pruefe('GB 24429 wird erkannt', befund('<p>Standard GB 24429</p>').norm === 'chinesisch');
  pruefe('die Belegstelle wird mitgeliefert', befund('<p>3C Helmet</p>').belegstelle === '3C');

  // --- Kinderrueckhaltesysteme und Schwimmhilfen (neu 2026-09-20)
  pruefe('ECE R44 wird erkannt', befund('<p>Zugelassen nach ECE R44/04</p>').norm === 'europaeisch');
  pruefe('UN ECE R129 wird erkannt', befund('<p>UN ECE R129</p>').norm === 'europaeisch');
  pruefe('i-Size wird erkannt', befund('<p>i-Size gepr&uuml;ft</p>').norm === 'europaeisch');
  pruefe('iSize ohne Bindestrich', befund('<p>iSize Norm</p>').norm === 'europaeisch');
  pruefe('eine blosse Zahl 44 ist keine Norm', befund('<p>Gr&ouml;sse 44 erh&auml;ltlich</p>').norm === 'unbekannt');
  pruefe('„129 cm" ist keine Norm', befund('<p>L&auml;nge 129 cm</p>').norm === 'unbekannt');
  pruefe('R129 ohne ECE bleibt unbekannt (koennte eine Artikelnummer sein)',
    befund('<p>Modell R129 schwarz</p>').norm === 'unbekannt');

  // --- Drosselung ist kein Messergebnis
  pruefe('429 gilt als gedrosselt, nicht als fehlend', GEDROSSELT.has(429));
  pruefe('430 gilt als gedrosselt', GEDROSSELT.has(430));
  pruefe('404 gilt NICHT als gedrosselt', GEDROSSELT.has(404) === false);

  // --- Die Rangfolge: wer beides fuehrt, hat die EU-Zulassung
  pruefe('EU schlaegt China', befund('<p>3C und EN 1078</p>').norm === 'europaeisch');
  pruefe('und dann gibt es keine Belegstelle', befund('<p>3C und EN 1078</p>').belegstelle === null);

  // --- DIE ENTSCHEIDENDE GEGENPROBE
  pruefe('eine Seite ohne jede Angabe ist UNBEKANNT, nicht „unzertifiziert"',
    befund('<p>Leichter Helm in vier Farben.</p>').norm === 'unbekannt');
  pruefe('unbekannt ist weder europaeisch noch chinesisch',
    befund('<p>Leichter Helm.</p>').europaeisch === false && befund('<p>Leichter Helm.</p>').chinesisch === false);

  console.log(`${ok} Pruefungen bestanden, ${fehler.length} gescheitert`);
  for (const f of fehler) console.log('  ✗ ' + f);
  return fehler.length === 0;
}

/* --------------------------------- Bericht -------------------------------- */

async function bericht(handles) {
  const zeilen = [];
  for (const h of handles) {
    zeilen.push(await hole(h));
    await new Promise((r) => setTimeout(r, 400));
  }
  const zaehle = (n) => zeilen.filter((z) => z.norm === n).length;

  console.log(`\nGeprueft: ${zeilen.length} Produktseiten`);
  console.log(`  europaeische Norm genannt : ${zaehle('europaeisch')}`);
  console.log(`  NUR chinesische Kennzeichnung (BEFUND): ${zaehle('chinesisch')}`);
  console.log(`  keine Angabe (Dokumentationsluecke, KEIN Befund): ${zaehle('unbekannt')}`);
  console.log(`  Seite fehlt (404 o.ae.): ${zaehle('fehlt')}`);
  console.log(`  gedrosselt, NICHT gemessen: ${zaehle('gedrosselt')}`);

  const cn = zeilen.filter((z) => z.norm === 'chinesisch');
  if (cn.length) {
    console.log('\nNur chinesische Kennzeichnung — diese brauchen eine Entscheidung:');
    for (const z of cn) console.log(`  ${z.handle}  (gefunden: „${z.belegstelle}")`);
  }
}

const direktAufgerufen = process.argv[1] && process.argv[1].endsWith('schutzausruestung.mjs');
if (direktAufgerufen) {
  const args = process.argv.slice(2);
  if (args[0] === '--selbsttest') process.exit(selbsttest() ? 0 : 1);
  else {
    const handles = args[0] === '--datei'
      ? readFileSync(args[1], 'utf8').split(/\r?\n/).map((z) => z.trim()).filter(Boolean)
      : args;
    if (!handles.length) { console.error('Keine Handles angegeben.'); process.exit(2); }
    await bericht(handles);
  }
}
