// Die Änderungen der Optik-Politur vom 04.11.2026 als reine Daten + eine reine Funktion (kein Netz). Jede Änderung wurde von einem
// unabhängigen Prüfer am Live-Shop nachgestellt (Playwright, Desktop 1440 und Handy 390, Fix per Style-Einschub im Browser);
// Rohberichte: Journal des Workflows optik-suche (wf_fb10406e-0a1), Auszug in README.md.
// Alles ist ANGEHÄNGT oder an einer eindeutigen Stelle ersetzt, damit die Rücknahme (apply.mjs ZURUECK=1) einfach bleibt.

export const DATEIEN = {
  THEME: 'layout/theme.liquid',
  CSS: 'assets/luxe-edit.css',
  FOOTER: 'sections/footer-group.json',
};

// Vorher-Stände (md5 der Live-Dateien am 04.11.2026 ~13:35 UTC). Weicht eine Datei ab, schreibt apply.mjs nichts.
export const MD5_VOR = {
  [DATEIEN.THEME]: 'db6787ce2defcc44960a42cff841b7a4',
  [DATEIEN.CSS]: '4d1fe6687b2bf160ff48cdaee3d39812',
  [DATEIEN.FOOTER]: '368187170859033dc70fce5fa332ce27',
};

export const MARKE_THEME = 'lx-optik-0411';
export const MARKE_CSS_ANFANG = '/* lx-optik-0411 Anfang */';
export const MARKE_CSS_ENDE = '/* lx-optik-0411 Ende */';

// 1) theme.liquid: ein Style-Block direkt nach dem vorhandenen Block lx-meister-0111 (steht im head; die Ankündigungsleiste
//    braucht den head, weil Horizon --header-group-height aus der Leistenhöhe rechnet).
export const THEME_ANKER = '<style id="lx-meister-0111">.lx-review-badge[data-review-zero-only]{display:none!important}</style>';
export const THEME_BLOCK = `<style id="${MARKE_THEME}">
/* 04.11.2026 Optik-Politur. Rücknahme: diesen Block entfernen (dropship/optik-0411/README.md). */
/* Hilfe-Knopf (#luxas-open) deckt am Seitenende die Symbole der letzten Fusszeile: Platz unter der Zeile statt Verschiebung. */
@media (min-width:750px){.shopify-section.footer-utilities{padding-block-end:52px}}
@media (max-width:749px){body:not(.lx-editorial-home) .shopify-section.footer-utilities{padding-block-end:52px}}
/* Ankündigungsleiste auf dem Handy: dreizeilige Texte standen mit Zeilenhöhe 1 Zeile an Zeile (Variablen stehen inline, darum !important). */
@media(max-width:749px){.announcement-bar{--padding-block-start:9px!important;--padding-block-end:9px!important}.announcement-bar__text{line-height:1.3!important}}
/* Karten mit adaptivem Bildformat (Ähnliche Produkte, Suche, Warenkorb-Empfehlungen, 404): einheitlich 4:5 wie im Kategorieraster. */
product-card .card-gallery[data-image-ratio="adapt"]{--gallery-aspect-ratio:4/5!important}
/* Karten ohne Bewertung zeigen keine leeren Sterne und kein «Noch keine Bewertungen» (Startseite und Produktseite tun das schon). */
product-card .lx-review-badge[data-review-state="confirmedZero"],product-card .lx-review-badge[data-review-state="unknown"]{display:none}
product-card .lx-review-badge[data-review-state="confirmedZero"]+product-price{margin-top:4px}
/* Fusszeile: einheitliche Überschriften (Serif) und zweispaltige Linkliste, nur wenn die Spalte breit genug ist. */
footer .menu__heading__default,
footer .menu__heading__accordion,
footer [class*="text_lx_kontakt"] strong:first-child{
  font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif!important;
  font-weight:500!important;
}
footer [class*="text_lx_kontakt"] strong:first-child{display:block;font-size:24px;line-height:1.1;margin-bottom:8px}
footer [class*="text_lx_kontakt"] strong:first-child+br{display:none}
@media(min-width:750px){
  footer summary.menu__heading{padding-block:0}
  footer .menu__details nav.details-content ul{columns:150px 2;column-gap:16px}
  footer .menu__details nav.details-content li{break-inside:avoid}
}
</style>`;

// 2) luxe-edit.css (nur Startseite und /fr): Block ANS ENDE der Datei.
export const CSS_BLOCK = `${MARKE_CSS_ANFANG}
/* Handy-Menü: die untere Leiste verdeckt sonst die letzten Zeilen, die Sprach-/Währungswahl und das Sprachfeld. */
@media(max-width:760px){
  body:has(#Details-menu-drawer-container[open]) .lx-bottom-nav{display:none}
  .menu-drawer,.menu-drawer__inner-submenu{padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))}
}
/* «Mode im Detail» und «Mach es persönlich»: Foto und Kollage füllen ihre Fläche, keine Seitenstreifen. */
@media(min-width:761px){.lx-fashion-edit{grid-template-columns:minmax(0,min(487px,48%)) minmax(0,1fr)}.lx-fashion-image{background:none}.lx-fashion-image img{width:100%;height:100%;max-height:650px;object-fit:cover;object-position:50% 20%}.lx-home .lx-design-collage-section{grid-template-columns:minmax(0,1fr) minmax(0,384px)}.lx-home .lx-design-collage-section .lx-design-description{text-wrap:balance}}
@media(min-width:761px) and (max-width:1100px){.lx-home .lx-design-collage-section{grid-template-columns:minmax(0,1fr) minmax(0,352px)}}
@media(max-width:440px){.lx-home.lx-browse-home .lx-design-collage{height:auto}.lx-home.lx-browse-home .lx-design-collage img{height:auto}}
/* «Schmuck entdecken» und «Für dein Zuhause»: quadratische Fotos in quadratischer Box (vorher flache Box mit Seitenstreifen);
   die Zweier-Reihe wird ab 1100 px eine Querkarte (Foto links, Text rechts). */
.lx-edit-product-image{position:relative;height:auto;aspect-ratio:1;background:#f2eee7;overflow:hidden}
@media(min-width:1100px){
 .lx-edit-product-grid[style*="--lx-edit-columns:2"] .lx-edit-product-card{flex-direction:row}
 .lx-edit-product-grid[style*="--lx-edit-columns:2"] .lx-edit-product-image{flex:0 0 47%;align-self:flex-start}
 .lx-edit-product-grid[style*="--lx-edit-columns:2"] .lx-edit-product-info{justify-content:center;padding:18px 22px}
 .lx-edit-product-grid[style*="--lx-edit-columns:2"] .lx-edit-product-info h3{min-height:0;padding-right:30px}
}
@media(min-width:1280px){
 .lx-edit-product-grid[style*="--lx-edit-columns:2"] .lx-edit-product-price{margin:18px 0 8px}
}
${MARKE_CSS_ENDE}
`;

// 3) footer-group.json, Block custom_liquid_lxpopup: das Newsletter-Popup wartet auf den EIGENEN Cookie-Hinweis (#lx-cookie-banner,
//    vorher fragte die Prüfung nur nach einem Shopify-Banner, den es auf der Seite nicht gibt) und danach 8 Sekunden.
export const FOOTER_ERSETZUNGEN = [
  ["#shopify-pc__prefs');", "#shopify-pc__prefs,#lx-cookie-banner');"],
  [
    'function versuche(){ if(shown) return; if(Date.now()-T0<MIN_MS || bannerOffen() || !seiteOk()) return; show(); }',
    'var ckT=0; function ckWarte(){ if(bannerOffen()){ ckT=Date.now(); return true; } return Date.now()-ckT<8000; } function versuche(){ if(shown) return; if(Date.now()-T0<MIN_MS || ckWarte() || !seiteOk()) return; show(); }',
  ],
  ['if(scrollOk || Date.now()-T0>=TIMER_MS) versuche(); },2000);', 'ckWarte(); if(scrollOk || Date.now()-T0>=TIMER_MS) versuche(); },2000);'],
];

function genau1(text, teil, was) {
  const n = text.split(teil).length - 1;
  if (n !== 1) throw new Error(`${was}: Anker kommt ${n}× vor (erwartet 1)`);
}

/** Wendet alle Änderungen auf die drei Dateitexte an (rein). Wirft, wenn ein Anker nicht genau einmal vorkommt oder schon eingespielt ist. */
export function anwenden({ theme, css, footer }) {
  if (theme.includes(`id="${MARKE_THEME}"`) || css.includes(MARKE_CSS_ANFANG) || footer.includes('function ckWarte()')) throw new Error('schon eingespielt');
  genau1(theme, THEME_ANKER, 'theme.liquid');
  const t2 = theme.replace(THEME_ANKER, () => `${THEME_ANKER}\n${THEME_BLOCK}`);
  const c2 = css.endsWith('\n') ? css + CSS_BLOCK : `${css}\n${CSS_BLOCK}`;
  let f2 = footer;
  for (const [alt, neu] of FOOTER_ERSETZUNGEN) { genau1(f2, alt, 'footer-group.json'); f2 = f2.replace(alt, () => neu); }
  return { theme: t2, css: c2, footer: f2 };
}

/** Macht die Änderungen rückgängig (rein), ohne die Sicherung zu brauchen: entfernt genau die eingefügten Blöcke und stellt die Ersetzungen zurück. */
export function zuruecknehmen({ theme, css, footer }) {
  const t2 = theme.replace(`\n${THEME_BLOCK}`, '');
  const i = css.indexOf(MARKE_CSS_ANFANG), j = css.indexOf(MARKE_CSS_ENDE);
  const c2 = i >= 0 && j > i ? css.slice(0, i) + css.slice(j + MARKE_CSS_ENDE.length + 1) : css;
  let f2 = footer;
  for (const [alt, neu] of [...FOOTER_ERSETZUNGEN].reverse()) f2 = f2.replace(neu, () => alt);
  return { theme: t2, css: c2, footer: f2 };
}
