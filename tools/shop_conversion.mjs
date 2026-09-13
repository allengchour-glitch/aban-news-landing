#!/usr/bin/env node
/**
 * shop_conversion.mjs — misst, welche Conversion-Bausteine auf den LIVE-Seiten von
 * luxestyle.ch wirklich stehen. Keine Checkliste aus dem Bauch, sondern Abruf und Zaehlung.
 *
 *   node tools/shop_conversion.mjs --selbsttest
 *   node tools/shop_conversion.mjs <url> [<url> …]
 *   node tools/shop_conversion.mjs --standard        (Startseite, Verkaufs-Collection, 3 PDP)
 *
 * WARUM (2026-09-13): das Gedaechtnis behauptete „Sticky-ATC seit Juni offen, nie gebaut" und
 * „Gratis-Versand ab CHF 65". Ein einziger Abruf der Produktseite widerlegte beides: die
 * Sticky-Leiste steht live (`sticky-add-to-cart__bar`), und die Schwelle ist CHF 50.
 *
 * 🔑 DIE REGEL, DIE DIESES GERAET VON EINEM GREP UNTERSCHEIDET:
 * Vor jeder Textpruefung werden `<script>`, `<style>` und HTML-Kommentare entfernt. Auf der
 * Produktseite steht in einem JS-Kommentar „Gratis-Versand ab CHF 49" — reine Entwickler-
 * Historie, die KEIN Kunde sieht. Wer roh greppt, meldet zwei widersprechende Versprechen und
 * schickt die naechste Session auf eine Reparatur, die es nicht braucht.
 */

/** Jeder Baustein: Name, Regex, und ob er im sichtbaren Text oder im Markup gesucht wird. */
const BAUSTEINE = [
  ['sticky_atc',        /sticky-add-to-cart/i,                              'markup'],
  ['bewertungs_sterne', /jdgm-star|jdgm-prev-badge/i,                       'markup'],
  ['warenkorb_schublade', /cart-drawer/i,                                   'markup'],
  ['gratis_balken',     /Gratisversand-Balken|free-?shipping-?(bar|progress)/i, 'markup'],
  // 2026-09-13 korrigiert: die erste Fassung suchte nur „Grössentabelle" und meldete bei den
  // Kleidern NEIN. Die Seiten nennen es **„Mass-Tabellen"** (Schweizer Schreibweise). Eine
  // vorhandene Hilfe als fehlend zu melden schickt die naechste Session auf Arbeit, die es
  // nicht braucht — genau der Fehler, den ein Messgeraet verhindern soll.
  ['groessenhilfe',     /mass-?tabelle|gr(ö|oe|Ö)ssentabelle|size-?chart/i, 'text'],
  ['asien_hinweis',     /asiatisch konfektioniert/i,                        'text'],
  ['video',             /<video[\s>]|product-media--video|video-section/i,  'markup'],
  ['versandversprechen', /Gratis-?\s?Versand ab CHF ?\d+|Gratis ab CHF ?\d+/i, 'text'],
  ['lieferdatum',       /Lieferung voraussichtlich/i,                       'text'],
  ['rueckgabe',         /\d+ Tage R(ü|ue)ckgabe/i,                          'text'],
  ['schweiz_signal',    /Schweizer Shop|🇨🇭/,                               'text'],
];
/** Zahlungs- und Vertrauenslogos: gezaehlt, nicht nur ja/nein. */
const ZAHLUNG = /visa|mastercard|twint|postfinance|paypal|klarna|american express|amex/gi;
/** Die Versandschwelle, wie der Kunde sie liest. */
const SCHWELLE = /Gratis-?\s?Versand ab CHF ?(\d+)|Gratis ab CHF ?(\d+)/gi;

/** Entfernt, was kein Kunde liest: Skripte, Stile, HTML-Kommentare. */
export function sichtbarerText(html) {
  return String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');
}

export function messe(html) {
  const text = sichtbarerText(html);
  const b = {};
  for (const [name, re, wo] of BAUSTEINE) b[name] = re.test(wo === 'text' ? text : html);

  const schwellen = new Set();
  for (const m of text.matchAll(SCHWELLE)) schwellen.add(Number(m[1] || m[2]));

  const bewertungen = [...String(html).matchAll(/data-number-of-reviews="(\d+)"/g)]
    .map(m => Number(m[1]));

  return {
    bytes: Buffer.byteLength(html),
    bilder: (html.match(/<img\b/gi) || []).length,
    skripte: (html.match(/<script\b/gi) || []).length,
    zahlungslogos: new Set((html.match(ZAHLUNG) || []).map(s => s.toLowerCase())).size,
    schwellen: [...schwellen].sort((x, y) => x - y),
    bewertungen_max: bewertungen.length ? Math.max(...bewertungen) : null,
    ...b,
  };
}

async function hole(url) {
  const r = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' },
  });
  return { status: r.status, html: await r.text() };
}

const STANDARD = [
  'https://luxestyle.ch/',
  'https://luxestyle.ch/collections/geschenke-unter-50-franken',
  'https://luxestyle.ch/products/weihnachts-pyjama-fur-die-ganze-familie-600900',
  'https://luxestyle.ch/products/kuscheliger-kapuzen-poncho-im-tier-look-632300',
  'https://luxestyle.ch/products/halloween-umhang-kleiner-teufel-aus-flanell-632800',
];

function zeile(url, m, status) {
  const ja = (v) => (v ? 'ja ' : 'NEIN');
  return [
    `  ${status} ${(m.bytes / 1048576).toFixed(2)} MB · ${m.bilder} Bilder · ${m.skripte} Skripte`,
    `     sticky-ATC ${ja(m.sticky_atc)} · Sterne ${ja(m.bewertungs_sterne)} · Bewertungen ${m.bewertungen_max ?? '—'}`,
    `     Versandversprechen ${ja(m.versandversprechen)} (Schwelle ${m.schwellen.join('/') || '—'}) · Balken ${ja(m.gratis_balken)}`,
    `     Lieferdatum ${ja(m.lieferdatum)} · Rueckgabe ${ja(m.rueckgabe)} · CH-Signal ${ja(m.schweiz_signal)}`,
    `     Groessenhilfe ${ja(m.groessenhilfe)} · Asien-Hinweis ${ja(m.asien_hinweis)} · Video ${ja(m.video)} · Zahlungslogos ${m.zahlungslogos}`,
  ].join('\n');
}

function selbsttest() {
  console.log('Selbsttest shop_conversion.mjs\n' + '-'.repeat(64));
  let fehler = 0;
  const pruefe = (ok, was) => { console.log(`  ${ok ? 'OK ' : 'FEHLER'} ${was}`); fehler += ok ? 0 : 1; };

  // Die Falle, die dieses Geraet ueberhaupt noetig gemacht hat:
  const mitKommentar = `<p>Gratis-Versand ab CHF 50</p>
    <script>/* 2026-08-31: der Automatik-Rabatt «Gratis-Versand ab CHF 49» ist ACTIVE */</script>
    <!-- frueher stand hier Gratis-Versand ab CHF 65 -->`;
  const m1 = messe(mitKommentar);
  pruefe(JSON.stringify(m1.schwellen) === '[50]',
    `nur die sichtbare Schwelle zaehlt: ${JSON.stringify(m1.schwellen)} (49 im Skript, 65 im Kommentar ignoriert)`);

  // Gegenprobe: steht 49 wirklich im sichtbaren Text, MUSS es auftauchen
  const m2 = messe('<p>Gratis-Versand ab CHF 49</p>');
  pruefe(JSON.stringify(m2.schwellen) === '[49]', 'Gegenprobe: sichtbare 49 wird sehr wohl gezaehlt');

  // Bausteine: erkannt und nicht erfunden
  const m3 = messe('<div class="sticky-add-to-cart__bar"></div><span class="jdgm-star"></span>');
  pruefe(m3.sticky_atc && m3.bewertungs_sterne, 'sticky-ATC und Sterne werden erkannt');
  const m4 = messe('<div class="hero"></div>');
  pruefe(!m4.sticky_atc && !m4.bewertungs_sterne && !m4.versandversprechen,
    'Gegenprobe: eine leere Seite meldet keinen einzigen Baustein');

  // Ein Baustein, der nur im Skript steht, ist nicht gebaut
  const m5 = messe('<script>document.querySelector(".sticky-add-to-cart")</script>');
  pruefe(m5.sticky_atc, 'Markup-Bausteine duerfen auch im Skript zaehlen (Theme laedt sie nach)');

  // Bewertungszahl
  const m6 = messe('<div data-number-of-reviews="0"></div><div data-number-of-reviews="7"></div>');
  pruefe(m6.bewertungen_max === 7, `hoechste Bewertungszahl gewinnt: ${m6.bewertungen_max}`);
  pruefe(messe('<p>nichts</p>').bewertungen_max === null, 'Gegenprobe: keine Angabe ist null, nicht 0');

  // Die zweite Falle: die Groessenhilfe heisst hier nicht Groessentabelle
  const m8 = messe('<p>📐 Mass-Tabellen ansehen (cm)</p>');
  pruefe(m8.groessenhilfe, 'Schweizer Schreibweise „Mass-Tabellen" wird als Groessenhilfe erkannt');
  pruefe(messe('<p>Grössentabelle</p>').groessenhilfe, 'und „Grössentabelle" natuerlich auch');
  pruefe(!messe('<p>Diese Hose ist aus Baumwolle</p>').groessenhilfe,
    'Gegenprobe: eine Seite ohne Groessenhilfe meldet keine');
  pruefe(messe('<p>asiatisch konfektioniert und faellt kleiner aus</p>').asien_hinweis,
    'Asien-Hinweis wird erkannt');

  // Zahlungslogos werden entdoppelt
  const m7 = messe('<p>visa VISA Visa mastercard</p>');
  pruefe(m7.zahlungslogos === 2, `Zahlungslogos entdoppelt: ${m7.zahlungslogos}`);

  console.log('-'.repeat(64));
  console.log(fehler === 0 ? 'SELBSTTEST BESTANDEN' : `SELBSTTEST FEHLGESCHLAGEN (${fehler})`);
  return fehler;
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const argv = process.argv.slice(2);
  if (argv.includes('--selbsttest')) process.exit(selbsttest());
  const urls = argv.includes('--standard') || argv.length === 0 ? STANDARD : argv;
  for (const u of urls) {
    try {
      const { status, html } = await hole(u);
      console.log(`\n${u}`);
      console.log(zeile(u, messe(html), `HTTP ${status} ·`));
    } catch (e) {
      console.log(`\n${u}\n  FEHLER ${e.message}`);
    }
  }
}
