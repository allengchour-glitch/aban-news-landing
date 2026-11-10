// Reine Funktionen (kein Netz): der CSS-Block `lx-optik-1011` fürs MAIN-Theme (layout/theme.liquid).
//
// Quelle: die von unabhängigen Prüfern einzeln nachgestellten Optik-Funde vom 10.11.2026 (Workflow `optik`, Urteil «bestätigt», Regel jeweils per
// addStyleTag am Live-Stand vorher/nachher gemessen: Zellen, Seitenbreite, Überlappungen). Jede Regel ist auf ihre Vorlage (und wo nötig Seite) begrenzt.
// NICHT dabei (bewusst): C21 (Kartentitel kleiner, Geschmack), C41 (weisser Kachelhintergrund am Desktop: färbt die Bänder neben Fotos mit farbigem Hintergrund weiss, Besitzervorgabe vom 25.10.
// «am liebsten keine weisse Hintergrund»), C46/C47/C48 (Editor «Selbst gestalten» gehört in die Editor-Datei), C59 (Schrift im Text von «Über uns», Gestaltungsentscheid), C61 (404-Suchfeld
// auf dem Handy ausblenden), C45 (Produktbilder löschen = Datenfix), alle als «widerlegt» oder «nicht messbar» eingestuften.
// Nach der unabhängigen Prüfung vom 10.11. angepasst: C25 mit höherer Spezifität nur für die Reiterzeile (`.lx-tabs .lx-tabs__zeile a`, sonst gewinnt das Inline-Style des Templates) und mit den
// Unterfilter-Pillen; C39 nur für die Zwei-Spalten-Galerie ohne grosses erstes Bild und mit dem Abstand der Galerie (`--image-gap`).

export const THEME_DATEI = 'layout/theme.liquid';
export const MARKE = 'lx-optik-1011';
const ANKER = '</head>';

const SERIF = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif';

/** Regeln je Gruppe. `bedingung` ist ein Liquid-Ausdruck (ohne {% if %}), leer = auf jeder Seite. */
export const GRUPPEN = [
  {
    id: 'alle', bedingung: '',
    kommentar: 'C29: Titel der Produktkarten gleichmässiger umbrechen (keine einzelnen Wörter in der letzten Zeile). Zeilenzahl und Kartenhöhe gemessen unverändert.',
    css: 'product-card .text-block[class*="product_title"] p{text-wrap:balance}',
  },
  {
    id: 'start', bedingung: "template.name == 'index'",
    kommentar: 'C22: die Platten der Kategorie-Thumbs haben einen feinen Rand, damit auch die weissen sichtbar sind (nur Startseite).',
    css: '.lx-home .lx-category-thumb{position:relative}\n.lx-home .lx-category-thumb::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 0 0 1px rgba(80,60,40,.16);pointer-events:none}',
  },
  {
    id: 'kollektion', bedingung: "template.name == 'collection'",
    kommentar: 'C25: Tippflächen auf dem Handy mindestens 44 px (Filtern, Reiter, Chips, Unterfilter-Pillen, Schalter «Alle N Kategorien»; die aufgeklappte Liste bleibt). C32: Spaltenwahl auf dem Desktop 36 px statt 24 bis 28 px.',
    css: '@media(max-width:749px){.facets-toggle__button{min-height:44px}.lx-tabs .lx-tabs__zeile a{display:inline-flex;align-items:center;box-sizing:border-box;min-height:44px}.lx-chipflex a{display:flex;align-items:center;box-sizing:border-box;min-height:44px}.lx-uf a{display:inline-flex;align-items:center;box-sizing:border-box;min-height:44px}.lx-tabs summary{min-height:44px;box-sizing:border-box}}\n'
      + '@media(min-width:750px){.column-options{gap:8px}.column-options__option .column-picker{display:flex;align-items:center;justify-content:center;box-sizing:border-box;width:36px;height:36px;padding:0}.column-options__option .column-picker svg{width:20px;height:20px}}',
  },
  {
    id: 'produkt', bedingung: "template.name == 'product'",
    kommentar: 'C37: Zwischenüberschriften der Beschreibung kleiner als der Titel (waren gleich gross). C39: ein einzelnes letztes Galeriebild bei ungerader Zahl mittig (nur Zwei-Spalten-Galerie ohne grosses erstes Bild, nie bei nur einem Bild, nicht im Schnellkauf-Fenster). C42: Hintergrund hinter Fotos mit Rand (object-fit:contain) wie die Seite statt beigem Band, in der Wischgalerie und im Zoom; auf dem Handy gemessen.',
    css: `.rte.lux-beschreibung h3{font-family:${SERIF};font-size:1.375rem;font-weight:600;line-height:1.3}\n`
      + 'media-gallery.media-gallery--grid.media-gallery--two-column:not(.media-gallery--large-first-image):not(.quick-add-modal__content *) .media-gallery__grid>li:last-child:nth-child(odd):not(:first-child){grid-column:1/-1;justify-self:center;width:calc((100% - var(--image-gap,4px))/2)}\n'
      + 'media-gallery .media-fit-contain :is(img,.deferred-media__poster-image){background-color:transparent}',
  },
  {
    id: 'warenkorb', bedingung: "template.name == 'cart'",
    kommentar: 'C49: Vertrauenszeilen im Warenkorb in der Mitte wie Titel und Knopf. C50: leerer Warenkorb auf dem Handy weniger Leerraum.',
    css: '[id$="__lux_cart_trust"] ul{justify-content:center;text-align:center}\n'
      + '@media (max-width:749px){.cart-page--empty .cart-page__title,.cart-page--empty .cart-page__more-blocks{margin-top:40px}}',
  },
  {
    id: 'ueber-uns', bedingung: "template.name == 'page' and page.handle == 'ueber-uns'",
    kommentar: 'C57: die dunkle Box auf dem Handy mit weniger Innenabstand (nur Abstände, nicht Schrift oder Farbe).',
    css: '@media (max-width:600px){rte-formatter div[style*="background:#2c2c2c"]{padding:22px 18px!important}rte-formatter div[style*="background:#2c2c2c"] ul{padding-left:18px!important;line-height:1.6!important}}',
  },
  {
    id: 'rueckgabe', bedingung: "template.name == 'page' and page.handle == 'rueckgabe'",
    kommentar: 'C58: die Tabelle der Rückgabeseite auf dem Handy mit breiterer erster Spalte (4 auf 2 Zeilen).',
    css: '@media(max-width:600px){.lxs table td:first-child{width:46%}.lxs table th,.lxs table td{padding:9px 8px}div.lxs div.box{padding-left:12px;padding-right:12px}}',
  },
  {
    id: 'fehler404', bedingung: "template.name == '404'",
    kommentar: 'C60: das Suchfeld der 404-Seite nimmt die ganze Breite und kürzt den Platzhalter mit Auslassungspunkten statt ihn abzuschneiden.',
    css: 'div:has(> form.lux404-suche){width:100%}\nform.lux404-suche input[type=search]{text-overflow:ellipsis}',
  },
];

function gruppeBlock(g) {
  const kopf = `<style id="${MARKE}-${g.id}">\n/* ${g.kommentar} */\n${g.css}\n</style>\n`;
  return g.bedingung ? `{%- if ${g.bedingung} -%}\n${kopf}{%- endif -%}\n` : kopf;
}

export const BLOCK = `{%- comment -%} 10.11.2026 ${MARKE}: Optik-Politur, vorher einzeln am Live-Stand gemessen. Rücknahme: diesen ganzen Block entfernen (dropship/optik-1011/README.md). {%- endcomment -%}\n`
  + GRUPPEN.map(gruppeBlock).join('');

const zaehle = (s, t) => s.split(t).length - 1;

/** Theme-Text mit dem Block vor dem einzigen </head>. Wirft, wenn schon eingespielt oder der Anker nicht genau einmal vorkommt. */
export function anwenden(theme) {
  if (typeof theme !== 'string' || !theme) throw new Error('theme.liquid leer oder nicht lesbar');
  if (theme.includes(`id="${MARKE}`)) throw new Error('schon eingespielt');
  const n = zaehle(theme, ANKER);
  if (n !== 1) throw new Error(`Anker ${ANKER} kommt ${n}-mal vor, erwartet 1`);
  return theme.split(ANKER).join(BLOCK + ANKER);
}

/** Entfernt genau den eingespielten Block. Wirft, wenn er nicht genau einmal vorkommt. */
export function zuruecknehmen(theme) {
  const n = zaehle(theme, BLOCK);
  if (n !== 1) throw new Error(`Block kommt ${n}-mal vor, erwartet 1: nichts zurückgenommen`);
  return theme.split(BLOCK).join('');
}
