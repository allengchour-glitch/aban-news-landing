/**
 * Offline-Vertragspruefung fuer die LuxeStyle-Video-Sektion.
 *
 * Das Theme laeuft auf Shopify und kann hier nicht produktiv gerendert werden. Dieser
 * Pruefer liest deshalb die zwei Liquid-Quellen und bricht bei jeder Aenderung ab, die
 * globale Shop-Videos wieder auf Produktseiten durchreichen koennte.
 */

function vorkommen(text, nadel) {
  return text.split(nadel).length - 1;
}

function liquidBloecke(text) {
  return [...text.matchAll(/\{%-?\s*liquid\s*([\s\S]*?)-?%\}/g)].map((m) => m[1]).join('\n');
}

function listenSchleifenOhneGuard(snippet) {
  const zeilen = liquidBloecke(snippet).split(/\r?\n/).map((zeile) => zeile.trim());
  const stapel = [];
  const fehler = [];

  const ende = new Map([
    ['endif', 'if'],
    ['endunless', 'unless'],
    ['endcase', 'case'],
    ['endfor', 'for'],
    ['endcapture', 'capture'],
  ]);

  for (let index = 0; index < zeilen.length; index += 1) {
    const zeile = zeilen[index];
    if (!zeile || zeile.startsWith('#')) continue;

    const endTyp = ende.get(zeile.split(/\s+/)[0]);
    if (endTyp) {
      const position = stapel.map((x) => x.typ).lastIndexOf(endTyp);
      if (position < 0) fehler.push(`Liquid-Ende ${endTyp} ohne Anfang in Zeile ${index + 1}`);
      else if (position !== stapel.length - 1) fehler.push(`Liquid-Block ${endTyp} ist in Zeile ${index + 1} falsch verschachtelt`);
      else stapel.pop();
      continue;
    }

    const start = zeile.match(/^(if|unless|case|for|capture)\s+(.+)$/);
    if (!start) continue;

    if (start[1] === 'for' && /^lx_v\s+in\s+liste$/.test(start[2])) {
      const erlaubt = stapel.some((x) => x.typ === 'if' && x.ausdruck === 'lx_globale_liste_erlaubt');
      if (!erlaubt) fehler.push(`globale Listenschleife ohne Guard in Liquid-Zeile ${index + 1}`);
    }
    stapel.push({ typ: start[1], ausdruck: start[2] });
  }

  if (stapel.length) fehler.push(`offene Liquid-Bloecke: ${stapel.map((x) => x.typ).join(', ')}`);

  return fehler;
}

export function pruefeLuxeVideoScope({ section, snippet }) {
  if (typeof section !== 'string' || typeof snippet !== 'string') {
    throw new TypeError('section und snippet muessen Text sein');
  }
  const fehler = [];
  const homeGuard = "if request.page_type == 'index' or template.name == 'index'";
  const globalAssign = 'assign lx_liste = shop.metafields.luxe.videos.value';
  const homeStart = section.indexOf(homeGuard);
  const homeEnd = section.indexOf('endif', homeStart);
  const globalPos = section.indexOf(globalAssign);

  if (!section.includes('assign lx_liste = null')) fehler.push('globale Liste startet nicht fail-closed mit null');
  if (vorkommen(section, globalAssign) !== 1) fehler.push('globale Shop-Liste muss genau einmal gelesen werden');
  if (homeStart < 0 || homeEnd < 0 || globalPos < homeStart || globalPos > homeEnd) {
    fehler.push('globale Shop-Liste steht nicht im Startseiten-Guard');
  }
  const truePos = section.indexOf('assign lx_globale_liste_erlaubt = true');
  if (vorkommen(section, 'assign lx_globale_liste_erlaubt = true') !== 1 || truePos < homeStart || truePos > homeEnd) {
    fehler.push('Startseiten-Freigabe steht nicht eindeutig im Startseiten-Guard');
  }
  if (vorkommen(section, 'product.metafields.luxe.video_url.value') !== 1) {
    fehler.push('Produktvideo muss genau aus product.metafields.luxe.video_url kommen');
  }
  if (!section.includes('globale_liste_erlaubt: lx_globale_liste_erlaubt')) {
    fehler.push('Sektion gibt den Scope-Guard nicht an das Snippet weiter');
  }
  if (liquidBloecke(snippet).includes('shop.metafields.luxe.videos')) {
    fehler.push('Snippet darf die globale Shop-Liste nicht selbst lesen');
  }
  if (!snippet.includes('assign lx_globale_liste_erlaubt = false')) {
    fehler.push('Snippet startet nicht fail-closed');
  }
  if (vorkommen(snippet, 'if globale_liste_erlaubt == true') !== 1) {
    fehler.push('Snippet akzeptiert keine eindeutige ausdrueckliche Freigabe');
  }
  fehler.push(...listenSchleifenOhneGuard(snippet));
  return fehler;
}
