/* Tests fuer galaxus_treffer.mjs — echte Seitenausschnitte vom 24.10.2026 als Faelle.
 * Lauf: node automation/lib/galaxus_treffer_test.mjs
 */
import { preisZahl, istProduktseite, galaxusTreffer } from './galaxus_treffer.mjs';

let ok = 0, fehler = 0;
const t = (name, ist, soll) => {
  const a = JSON.stringify(ist), b = JSON.stringify(soll);
  if (a === b) { ok++; } else { fehler++; console.error(`✗ ${name}\n   ist : ${a}\n   soll: ${b}`); }
};

/* ---- preisZahl ---- */
t('CHF22.– ist 22', preisZahl('22.–'), 22);
t('22 ohne Nachkomma', preisZahl('22'), 22);
t('22.95 mit Rappen', preisZahl('22.95'), 22.95);
t('Komma wie Punkt', preisZahl('22,95'), 22.95);
t('Tausendertrennung', preisZahl("1'234.50"), 1234.5);
t('Tausender mit Typo-Apostroph', preisZahl('1’234.–'), 1234);
t('Bindestrich statt Gedankenstrich', preisZahl('22.-'), 22);
t('Buchstaben sind kein Preis', preisZahl('zweiundzwanzig'), null);
t('leer ist kein Preis', preisZahl(''), null);
t('Nichtstring ist kein Preis', preisZahl(22), null);
// Gegenprobe: eine dritte Nachkommastelle ist kein Schweizer Preis und darf nicht durchgehen
t('drei Nachkommastellen abgelehnt', preisZahl('22.955'), null);

/* ---- istProduktseite ---- */
t('Produktseite erkannt', istProduktseite('https://www.galaxus.ch/en/s5/product/widmann-magic-wand-10440859?q=800'), true);
t('Suchseite ist kein Treffer', istProduktseite('https://www.galaxus.ch/en/search?q=194099141734'), false);
t('Captcha-Adresse ist kein Treffer', istProduktseite('https://www.galaxus.ch/captcha'), false);
t('fremde Seite zaehlt nicht', istProduktseite('https://www.example.com/product/x'), false);
t('fehlende Adresse', istProduktseite(undefined), false);

/* ---- galaxusTreffer: der echte Messfall ---- */
const ECHT = `11 images

# **Widmann** Magic wand

**CHF22.–**

[Ratings](https://www.galaxus.ch/en/s5/product/widmann-magic-wand-fancy-dress-accessories-10440859?q=8003558528158#productRatingsBlock)

Free shipping starting at 50.–i

## Colour2

- [![Green, White](https://x.jpeg)\\
\\
Green, White\\
\\
CHF22.–](https://www.galaxus.ch/en/s5/product/widmann-magic-wand-fancy-dress-accessories-10440859)

- [![Black](https://y.jpeg)\\
\\
Black\\
\\
CHF8.–](https://www.galaxus.ch/en/s5/product/widmann-magic-wand-fancy-dress-accessories-10392216)`;
const URL_P = 'https://www.galaxus.ch/en/s5/product/widmann-magic-wand-fancy-dress-accessories-10440859?q=8003558528158';

t('echter Treffer', galaxusTreffer({ url: URL_P, markdown: ECHT }),
  { art: 'treffer', marke: 'Widmann', titel: 'Magic wand', preis: 22 });

/* Die WICHTIGSTE Gegenprobe: die fremde Variante CHF 8 darf nicht gewinnen.
 * Ein "tiefster Preis der Seite" wuerde hier 8 messen und den Artikel als teuer melden. */
t('Variantenpreis gewinnt nicht', galaxusTreffer({ url: URL_P, markdown: ECHT }).preis, 22);

/* Gegenprobe in die andere Richtung: steht die Hauptpreiszeile nach der Variantenliste,
 * wird trotzdem die erste nach der Ueberschrift genommen — hier gibt es keine, also unbekannt. */
t('kein Preis nach der Ueberschrift', galaxusTreffer({
  url: URL_P, markdown: '**CHF8.–**\n\n# **Widmann** Magic wand\n\nkein Preis mehr',
}), { art: 'unbekannt', grund: 'kein-preis' });

t('Suchseite ohne Treffer', galaxusTreffer({
  url: 'https://www.galaxus.ch/en/search?q=194099141734',
  markdown: '# 194099141734: Search\n\nNo results',
}), { art: 'kein_treffer' });

t('Captcha im Text', galaxusTreffer({
  url: URL_P, markdown: '# Are you a robot? - Galaxus\n\n**CHF0.–**',
}), { art: 'unbekannt', grund: 'captcha' });

t('Captcha in der Adresse', galaxusTreffer({
  url: 'https://www.galaxus.ch/captcha', markdown: '# **Widmann** x\n\n**CHF22.–**',
}), { art: 'unbekannt', grund: 'captcha' });

t('leerer Text ist unbekannt', galaxusTreffer({ url: URL_P, markdown: '   ' }),
  { art: 'unbekannt', grund: 'kein-text' });
t('fehlender Text ist unbekannt', galaxusTreffer({ url: URL_P }),
  { art: 'unbekannt', grund: 'kein-text' });
t('ohne Ueberschrift unbekannt', galaxusTreffer({ url: URL_P, markdown: '**CHF22.–**' }),
  { art: 'unbekannt', grund: 'keine-ueberschrift' });

/* Preis 0 ist kein Preis — sonst zaehlt eine leere Seite als geschenkt */
t('Preis 0 ist unbekannt', galaxusTreffer({
  url: URL_P, markdown: '# **Widmann** x\n\n**CHF0.–**',
}), { art: 'unbekannt', grund: 'preis-unlesbar' });

/* Ueberschrift ohne Marke (kommt vor: Fremdmarken ohne Fettung) */
t('Ueberschrift ohne Marke', galaxusTreffer({
  url: URL_P, markdown: '# Money - money bag\n\n**CHF17.10**',
}), { art: 'treffer', marke: null, titel: 'Money - money bag', preis: 17.1 });

/* Echter zweiter Messfall: Rappen-Preis */
t('Rappenpreis', galaxusTreffer({
  url: URL_P, markdown: '# **Boland** Clownette wig\n\n**CHF19.90**',
}), { art: 'treffer', marke: 'Boland', titel: 'Clownette wig', preis: 19.9 });

/* Gegenprobe zum Zeilenanker: Galaxus nennt bei Aktionen einen durchgestrichenen
 * Vorpreis in derselben Zeile ("was **CHF99.–**"). Ohne Anker am Zeilenanfang
 * wuerde dieser Vorpreis als aktueller Preis gemessen. */
t('Vorpreis in derselben Zeile zaehlt nicht', galaxusTreffer({
  url: URL_P,
  markdown: '# **Widmann** Magic wand\n\nwas **CHF99.–**\n\n**CHF22.–**',
}), { art: 'treffer', marke: 'Widmann', titel: 'Magic wand', preis: 22 });

console.log(`\n${ok} Pruefungen ok, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
