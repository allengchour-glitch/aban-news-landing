// _katalog_bericht.mjs — macht aus den Befunden des Katalog-Audits einen Bericht,
// den man einem Haendler in die Hand geben kann. Das ist das Bezahlte: nicht die Zahl,
// sondern JEDES betroffene Produkt mit Handle, woertlichem Beleg und dem Weg zur Behebung.
//
// Der Bericht ist eine einzelne HTML-Datei ohne fremde Verweise — er laesst sich per
// E-Mail verschicken, ausdrucken und offline lesen.
//
// ⚠️ Er behauptet NUR, was gemessen wurde. Jeder Befund traegt den Beleg woertlich, damit
// der Haendler ihn an seinem eigenen Shop nachpruefen kann. Keine geschaetzten Umsatz-
// wirkungen, keine erfundenen Prozentzahlen — das war die Regel, an der sich in der
// Recherche vom 29.09.2026 die meisten fremden Angebote disqualifiziert haben.

const NAMEN = {
  rohe_variante: 'Rohe Lieferantentexte im Variantennamen',
  fremdsprache: 'Englische Farbwerte im deutschsprachigen Shop',
  option_farbe_ohne_farben: 'Option heisst „Farbe", enthält aber keine Farben',
  streichpreis_defekt: 'Durchgestrichener Preis nicht höher als der Preis',
  gleiche_ware_preis: 'Gleiche Ware, verschiedene Preise',
  ohne_bild: 'Produkt ohne Bild',
  doppelter_titel: 'Doppelter Produkttitel',
};

const WARUM = {
  rohe_variante: 'Die Kundschaft liest den Text des Lieferanten statt einer Auswahl. Wer nicht versteht, was er wählt, wählt nichts.',
  fremdsprache: 'Ein deutschsprachiger Shop, der englische Farbwerte zeigt, wirkt unfertig — und bei Rückgaben streitet man über die Farbe.',
  option_farbe_ohne_farben: 'Wer eine Farbe zu wählen glaubt, wählt in Wahrheit ein anderes Produkt oder ein Set. Das erzeugt Fehlbestellungen und Rücksendungen.',
  streichpreis_defekt: 'Der durchgestrichene Preis verspricht eine Ersparnis, die es nicht gibt. In der Schweiz regelt die Preisbekanntgabeverordnung, welche Vergleichspreise zulässig sind.',
  gleiche_ware_preis: 'Dieselbe Ware kostet je nach Farbe verschieden viel, ohne dass ein Grund sichtbar wäre. Entweder fehlt der Grund in der Beschreibung — oder der Preis ist falsch.',
  ohne_bild: 'Ein Produkt ohne Bild wird nicht gekauft.',
  doppelter_titel: 'Zwei Produkte mit demselben Titel konkurrieren in der Suche gegeneinander und verwirren die Kundschaft.',
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function berichtHtml(ergebnis, shop, jetzt = new Date()) {
  const datum = jetzt.toISOString().slice(0, 10);
  const arten = Object.keys(ergebnis.nachArt ?? {}).sort((a, b) => ergebnis.nachArt[b] - ergebnis.nachArt[a]);

  // Defekte zuerst, Hinweise danach — und sichtbar getrennt. Ein Markenfarbname wie
  // `heritage black` ist auffaellig, aber kein Fehler (gemessen an nomadi.de, 29.09.2026);
  // ihn als Defekt zu verkaufen waere eine Uebertreibung, die den ganzen Bericht entwertet.
  arten.sort((a, b) => {
    const sa = (ergebnis.befunde.find((x) => x.art === a)?.schwere === 'defekt') ? 0 : 1;
    const sb = (ergebnis.befunde.find((x) => x.art === b)?.schwere === 'defekt') ? 0 : 1;
    return sa - sb || ergebnis.nachArt[b] - ergebnis.nachArt[a];
  });

  let abschnitte = '';
  let hinweisKopf = false;
  for (const art of arten) {
    const treffer = ergebnis.befunde.filter((b) => b.art === art);
    const istHinweis = treffer[0]?.schwere !== 'defekt';
    if (istHinweis && !hinweisKopf) {
      hinweisKopf = true;
      abschnitte += '<section class="trenner"><h2 class="hinweis">Hinweise &mdash; einen Blick wert, '
        + 'aber es kann eine gute Erkl&auml;rung geben</h2><p class="warum">Zum Beispiel f&uuml;hren '
        + 'Marken ihre Farben oft mit dem englischen Originalnamen. Das ist kein Fehler, nur eine '
        + 'Entscheidung &mdash; deshalb steht es hier und nicht oben.</p></section>';
    }
    abschnitte += `<section><h2${istHinweis ? ' class="hinweis"' : ''}>${ergebnis.nachArt[art]} × ${esc(NAMEN[art] ?? art)}</h2>`;
    abschnitte += `<p class="warum">${esc(WARUM[art] ?? '')}</p><table><thead><tr>`
      + '<th>Produkt</th><th>Beleg (wörtlich aus Ihrem Katalog)</th></tr></thead><tbody>';
    for (const b of treffer) {
      const link = b.handle ? `<a href="https://${esc(shop)}/products/${esc(b.handle)}">${esc(b.titel)}</a>` : esc(b.titel);
      abschnitte += `<tr><td>${link}</td><td class="beleg">${esc(b.beleg)}</td></tr>`;
    }
    abschnitte += '</tbody></table></section>';
  }
  if (arten.length === 0) {
    abschnitte = '<section><h2>Kein Befund</h2><p class="warum">Dieser Katalog ist sauber — '
      + 'wie Gymshark und Allbirds in der Gegenprobe.</p></section>';
  }

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Katalog-Bericht ${esc(shop)} — ${datum}</title>
<style>
:root{--tinte:#1a1a1a;--papier:#fff;--linie:#d9d9d9;--warn:#b45309}
*{box-sizing:border-box}
body{margin:0;padding:32px 16px;background:var(--papier);color:var(--tinte);
  font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:860px;margin:0 auto}
h1{font-size:1.8rem;margin:0 0 4px} h2{font-size:1.15rem;margin:34px 0 6px;
  padding-left:12px;border-left:3px solid var(--warn)}
h2.hinweis{border-left-color:var(--linie);opacity:.85}
.trenner{margin-top:44px;padding-top:8px;border-top:1px solid var(--linie)}
.kopf{border-bottom:2px solid var(--tinte);padding-bottom:16px;margin-bottom:8px}
.zahl{font-size:2.6rem;font-weight:700;line-height:1;margin:18px 0 2px}
.warum{opacity:.8;margin:2px 0 12px;max-width:62ch}
table{width:100%;border-collapse:collapse;font-size:.92rem;margin-bottom:8px}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--linie);vertical-align:top}
th{font-weight:600;background:#f6f6f6}
.beleg{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85rem;word-break:break-word}
a{color:inherit}
footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--linie);font-size:.85rem;opacity:.75}
@media print{body{padding:0} a{text-decoration:none}}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--tinte:#e8e8e8;--papier:#141414;--linie:#333}
  :root:not([data-theme="light"]) th{background:#1f1f1f}}
:root[data-theme="dark"]{--tinte:#e8e8e8;--papier:#141414;--linie:#333}
</style></head><body><main>
<div class="kopf">
  <h1>Katalog-Bericht</h1>
  <p>${esc(shop)} · geprüft am ${datum}</p>
</div>
<p class="zahl">${ergebnis.produkteMitDefekt}</p>
<p class="warum">von <strong>${ergebnis.produkte}</strong> geprüften Produkten haben einen <strong>Defekt</strong> —
etwas, das objektiv falsch ist und das Ihre Kundschaft zu sehen bekommt.
Dazu kommen <strong>${ergebnis.hinweise}</strong> Hinweise (${ergebnis.betroffeneProdukte} Produkte insgesamt betroffen).
Jeder Befund unten steht wörtlich so in Ihrem öffentlichen Katalog und lässt sich dort nachprüfen.</p>
${abschnitte}
<footer>
<p><strong>Wie gemessen wurde.</strong> Gelesen wurde ausschliesslich
<code>https://${esc(shop)}/products.json</code> — der öffentliche Endpunkt, den jeder
Shopify-Shop selbst bereitstellt. Es wurden keine Zugangsdaten verwendet, nichts verändert
und nichts gespeichert.</p>
<p><strong>Wie zuverlässig das ist.</strong> Derselbe Prüfer ergibt bei gepflegten Katalogen
null Defekte — gemessen am 30.09.2026 an gymshark.com, allbirds.com, ankerkraut.de und
snocks.com (je 250 Produkte, je 0). Ein Prüfer, der überall ausschlägt, misst nichts.</p>
<p><strong>Defekt gegen Hinweis.</strong> Ein Defekt ist objektiv falsch und für Ihre Kundschaft
sichtbar. Ein Hinweis ist einen Blick wert, kann aber eine gute Erklärung haben — Marken führen
ihre Farben oft mit dem englischen Originalnamen. Beides wird getrennt gezählt, damit keine Zahl
größer aussieht als sie ist.</p>
<p><strong>Was hier nicht steht.</strong> Der Einkaufspreis ist nicht öffentlich, deshalb
enthält dieser Bericht keine Margenrechnung. Es werden auch keine Umsatzwirkungen geschätzt —
nur das, was messbar im Katalog steht.</p>
</footer>
</main></body></html>`;
}
