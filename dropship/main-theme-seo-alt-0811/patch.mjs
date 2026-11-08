import { createHash } from 'node:crypto';

export const DATEIEN = Object.freeze({
  meta: 'snippets/meta-tags.liquid',
  startseite: 'sections/luxe-edit-home.liquid',
});

export const MD5_VOR = Object.freeze({
  [DATEIEN.meta]: 'de2a6f9cf9200f49fe65ad6ca42f1643',
  [DATEIEN.startseite]: 'ed6943c40b94dcf5c7e532685b17c9bc',
});

export const MD5_NACH = Object.freeze({
  [DATEIEN.meta]: '00c5408ac77fd0bc6c4b1528a3b8aa2b',
  [DATEIEN.startseite]: '1ec32ba5c57c0db75165e49faedf180d',
});

export const META_ALT = `  if request.page_type == 'index'
    assign og_description = 'LuxeStyle aus Belp: Mode, Beauty, Technik &amp; Wohnen. Versand in die Schweiz (ab Schweizer Lager meist 2–3, sonst 10–20 Werktage) und nach Liechtenstein.'
  # 10.10.2026: Liechtenstein seit 09.10. Lieferland → Texte CH+LI (automation/liefergebiet_text_wache.py prüft auch das Theme)
  endif`;

export const META_NEU = `  if request.page_type == 'index'
    if request.locale.iso_code == 'fr'
      assign og_description = 'Découvrez une sélection de mode, beauté, maison et technologie chez LuxeStyle. Livraison en Suisse et au Liechtenstein.'
    else
      assign og_description = 'LuxeStyle aus Belp: Mode, Pflege, Technik und Wohnen. Versand in die Schweiz und nach Liechtenstein.'
    endif
  # 10.10.2026: Liechtenstein seit 09.10. Lieferland → Texte CH+LI (automation/liefergebiet_text_wache.py prüft auch das Theme)
  endif`;

const ALT_ERSETZUNGEN = Object.freeze([
  Object.freeze({
    alt: "<div class=\"lx-trend-image\">{{ lx_trend.featured_image | image_url: width: 600 | image_tag: loading: 'lazy', widths: '240, 360, 480, 600', sizes: '(max-width: 760px) 42vw, (max-width: 1100px) 28vw, 21vw', alt: '' }}</div>",
    neu: "<div class=\"lx-trend-image\">{{ lx_trend.featured_image | image_url: width: 600 | image_tag: loading: 'lazy', widths: '240, 360, 480, 600', sizes: '(max-width: 760px) 42vw, (max-width: 1100px) 28vw, 21vw', alt: lx_trend.title }}</div>",
  }),
  Object.freeze({
    alt: "<div class=\"lx-edit-product-image\">{{ lx_edit_product.featured_image | image_url: width: 700 | image_tag: loading: 'lazy', widths: '280, 420, 560, 700', sizes: '(max-width: 760px) 68vw, 31vw', alt: '' }}</div>",
    neu: "<div class=\"lx-edit-product-image\">{{ lx_edit_product.featured_image | image_url: width: 700 | image_tag: loading: 'lazy', widths: '280, 420, 560, 700', sizes: '(max-width: 760px) 68vw, 31vw', alt: lx_edit_product.title }}</div>",
  }),
  Object.freeze({
    alt: "<div class=\"lx-more-photo\">{{ lx_more_product.featured_image | image_url: width: 700 | image_tag: loading: 'lazy', widths: '240, 360, 480, 560, 700', sizes: '(max-width: 760px) 44vw, 22vw', alt: '' }}</div>",
    neu: "<div class=\"lx-more-photo\">{{ lx_more_product.featured_image | image_url: width: 700 | image_tag: loading: 'lazy', widths: '240, 360, 480, 560, 700', sizes: '(max-width: 760px) 44vw, 22vw', alt: lx_more_product.title }}</div>",
  }),
]);

export const md5 = (text) => createHash('md5').update(text).digest('hex');

function anzahl(text, suche) {
  if (!suche) return 0;
  let n = 0;
  for (let i = text.indexOf(suche); i >= 0; i = text.indexOf(suche, i + suche.length)) n += 1;
  return n;
}

function ersetzeEinmal(text, alt, neu, name) {
  const n = anzahl(text, alt);
  if (n !== 1) throw new Error(`${name}: Ausgangsanker kommt ${n}× vor; erwartet 1. Nichts schreiben.`);
  return text.replace(alt, neu);
}

export function metaPatch(text) {
  const neu = ersetzeEinmal(text, META_ALT, META_NEU, DATEIEN.meta);
  if (anzahl(neu, META_NEU) !== 1 || anzahl(neu, META_ALT) !== 0) throw new Error(`${DATEIEN.meta}: Meta-Gegenprobe fehlgeschlagen.`);
  return neu;
}

export function startseitenPatch(text) {
  let neu = text;
  for (const [i, ersetzung] of ALT_ERSETZUNGEN.entries()) {
    neu = ersetzeEinmal(neu, ersetzung.alt, ersetzung.neu, `${DATEIEN.startseite} Alttext ${i + 1}`);
  }
  for (const ersetzung of ALT_ERSETZUNGEN) {
    if (anzahl(neu, ersetzung.neu) !== 1 || anzahl(neu, ersetzung.alt) !== 0) throw new Error(`${DATEIEN.startseite}: Alttext-Gegenprobe fehlgeschlagen.`);
  }
  return neu;
}

export function baueZiel(filename, text, apiMd5 = '') {
  if (!Object.values(DATEIEN).includes(filename)) throw new Error(`Nicht erlaubte Theme-Datei: ${filename}`);
  const lokal = md5(text);
  if (apiMd5 && lokal !== apiMd5) throw new Error(`${filename}: Inhalt passt nicht zur API-Prüfsumme (${lokal} statt ${apiMd5}).`);
  if (lokal !== MD5_VOR[filename]) throw new Error(`${filename}: Ausgangsstand ${lokal} statt ${MD5_VOR[filename]}. Nichts schreiben.`);
  const neu = filename === DATEIEN.meta ? metaPatch(text) : startseitenPatch(text);
  const ziel = md5(neu);
  if (ziel !== MD5_NACH[filename]) throw new Error(`${filename}: Zielstand ${ziel} statt ${MD5_NACH[filename]}. Nichts schreiben.`);
  return Object.freeze({ filename, vorherMd5: lokal, nachherMd5: ziel, vorher: text, nachher: neu });
}

export function pruefeDateimenge(dateien) {
  const namen = dateien.map((x) => x.filename).sort();
  const soll = Object.values(DATEIEN).sort();
  if (JSON.stringify(namen) !== JSON.stringify(soll)) throw new Error(`Theme-Dateimenge abweichend: ${namen.join(', ') || 'leer'}.`);
}
