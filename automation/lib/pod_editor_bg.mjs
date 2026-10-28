/**
 * Editor-Hintergründe der «Selbst gestalten»-Produkte: den Baustein in der Produktbeschreibung lesen und umschreiben.
 *
 * WARUM (28.10.2026, Meldung des Besitzers mit Screenshot der iPhone-Hülle): Der Editor (pod/designer.js) zeigt als Hintergrund `data-img-front`
 * bzw. `data-img-map[Variante]`. pod_inject_designer.mjs nahm dafür das erste Produktbild mit «front» im Dateinamen: bei der iPhone-Hülle das Printful-Mockup
 * der iPhone 16 Pro, in das «Dein Design» EINGEBRANNT ist. Der Text blieb unter dem Design des Kunden stehen. Zwei unabhängige Durchgänge über alle 123 Produktbilder
 * der 37 «wunschdesign»-Produkte fanden den Text auf allen sechs Mockups der Hülle, auf drei Galeriebildern des «Klassischen Unisex T-Shirts» und als Hinweis
 * «DEIN MOTIV HIER» in der Aufkleber-Vorlage.
 *
 * Der Baustein sieht so aus (Reihenfolge der Attribute egal):
 *   <div class="lspod-designer" data-img-front="URL" data-img-back="URL" data-variant="123" data-img-map='{"123":"URL"}' data-ratio="1.414" data-ref="2400"></div>
 * Diese Funktionen ändern NUR die Bild-Attribute (front, back, variant, map); jedes andere Attribut und die ganze übrige Beschreibung bleiben Byte für Byte erhalten.
 * Rein, ohne Netz, getestet in pod_editor_bg_test.mjs.
 */

const BAUSTEIN = /<div class="lspod-designer"((?:\s+[a-z-]+=(?:"[^"]*"|'[^']*'))*)\s*><\/div>/;
const ATTR = /([a-z-]+)=(?:"([^"]*)"|'([^']*)')/g;
const ORDNUNG = ['data-img-front', 'data-img-back', 'data-variant', 'data-img-map'];

const entHtml = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const escDoppelt = (u) => String(u).replace(/"/g, '&quot;');
const escEinfach = (j) => String(j).replace(/'/g, '&#39;');

/** Attribute des ersten Bausteins als Liste [{name, wert, anf}] in Originalreihenfolge; null, wenn kein Baustein vorhanden ist. */
function attribute(html) {
  const m = String(html ?? '').match(BAUSTEIN);
  if (!m) return null;
  const liste = [];
  for (const a of m[1].matchAll(ATTR)) liste.push({ name: a[1], wert: a[2] ?? a[3], anf: a[2] !== undefined ? '"' : "'" });
  return liste;
}

/** @returns {null | {front:string|null, back:string|null, variant:string|null, map:object|null, andere:Object<string,string>}} */
export function leseEditorAttribute(html) {
  const liste = attribute(html);
  if (!liste) return null;
  const roh = Object.fromEntries(liste.map((a) => [a.name, entHtml(a.wert)]));
  let map = null;
  if ('data-img-map' in roh) { try { map = JSON.parse(roh['data-img-map']); } catch { map = null; } }
  const andere = Object.fromEntries(Object.entries(roh).filter(([k]) => !ORDNUNG.includes(k)));
  return { front: roh['data-img-front'] ?? null, back: roh['data-img-back'] ?? null, variant: roh['data-variant'] ?? null, map, andere };
}

/**
 * Schreibt die Bild-Attribute des Bausteins um. `undefined` = nicht anfassen, `null` = Attribut entfernen, sonst setzen.
 * `map` ist ein Objekt {variantenNummer: url}. Wirft, wenn kein Baustein da ist (nie raten, wohin ein neuer gehört).
 */
export function setzeEditorAttribute(html, { front, back, variant, map } = {}) {
  const s = String(html ?? '');
  const m = s.match(BAUSTEIN);
  if (!m) throw new Error('Kein Editor-Baustein (<div class="lspod-designer" …>) in der Beschreibung');
  const liste = attribute(s).map((a) => ({ ...a }));
  const neu = { 'data-img-front': front, 'data-img-back': back, 'data-variant': variant, 'data-img-map': map };
  // bestehende Attribute behalten ihren Platz; neu hinzukommende hängen hinten an, in der festen Reihenfolge front, back, variant, map
  for (const name of ORDNUNG) {
    const wert = neu[name];
    if (wert === undefined) continue;
    const i = liste.findIndex((a) => a.name === name);
    if (wert === null) { if (i >= 0) liste.splice(i, 1); continue; }
    let eintrag;
    if (name === 'data-img-map') {
      if (typeof wert !== 'object' || Array.isArray(wert)) throw new Error('map muss ein Objekt {variante: url} sein');
      eintrag = { name, wert: escEinfach(JSON.stringify(wert)), anf: "'" };
    } else eintrag = { name, wert: escDoppelt(wert), anf: '"' };
    if (i >= 0) liste[i] = eintrag; else liste.push(eintrag);
  }
  const attrText = liste.map((a) => ` ${a.name}=${a.anf}${a.wert}${a.anf}`).join('');
  return s.replace(BAUSTEIN, `<div class="lspod-designer"${attrText}></div>`);
}

/** Die Printful-Mockups, in die «Dein Design» eingebrannt ist, heissen `<produkt>-front-<13 Hex>.jpg` (gemessen an der iPhone-Hülle und am Unisex-Tee, 28.10.2026). */
export const PRINTFUL_MOCKUP_NAME = /-(?:front|back|left|right)-[0-9a-f]{12,14}\.(?:jpe?g|png)(?:\?|$)/i;
export const istPrintfulMockup = (url) => PRINTFUL_MOCKUP_NAME.test(String(url ?? ''));

/**
 * Prüft die Übersteuerungstabelle (pod/editor-hintergruende.json): {handle: {front?, back?, map?}}.
 * Gibt eine Liste von Fehlern zurück (leer = in Ordnung). Eine Adresse, die auf ein Printful-Mockup zeigt, ist ein Fehler.
 */
export function pruefeUebersteuerung(tabelle) {
  const fehler = [];
  if (!tabelle || typeof tabelle !== 'object' || Array.isArray(tabelle)) return ['Tabelle ist kein Objekt'];
  const pruefeUrl = (h, wo, u) => {
    if (typeof u !== 'string' || !/^https:\/\/[^\s"']+$/.test(u)) fehler.push(`${h}: ${wo} ist keine https-Adresse`);
    else if (istPrintfulMockup(u)) fehler.push(`${h}: ${wo} zeigt auf ein Printful-Mockup mit eingebranntem Platzhalter (${u.split('/').pop().split('?')[0]})`);
  };
  for (const [h, e] of Object.entries(tabelle)) {
    if (!e || typeof e !== 'object') { fehler.push(`${h}: Eintrag ist kein Objekt`); continue; }
    const unbekannt = Object.keys(e).filter((k) => !['front', 'back', 'map'].includes(k));
    if (unbekannt.length) fehler.push(`${h}: unbekannte Felder ${unbekannt.join(', ')}`);
    if (!e.front && !e.map) fehler.push(`${h}: weder front noch map`);
    if (e.front) pruefeUrl(h, 'front', e.front);
    if (e.back) pruefeUrl(h, 'back', e.back);
    if (e.map) {
      if (typeof e.map !== 'object' || Array.isArray(e.map)) fehler.push(`${h}: map ist kein Objekt`);
      else for (const [v, u] of Object.entries(e.map)) { if (!/^\d+$/.test(v)) fehler.push(`${h}: map-Schlüssel «${v}» ist keine Variantennummer`); pruefeUrl(h, `map[${v}]`, u); }
    }
  }
  return fehler;
}

/**
 * Welche Bilder der Baustein bekommt (pod_inject_designer.mjs). Ohne Übersteuerung genau das bisherige Verhalten: Vorlage vor Produktbild, kein Hinten bei Vorlage/Poster, Farbkarte nur wenn vorhanden.
 * Mit Übersteuerung (pod/editor-hintergruende.json) gewinnt sie: front aus der Tabelle, hinten nur wenn die Tabelle es nennt (kein Mockup «von selbst»), Karte aus der Tabelle.
 * @returns {{bg:string, back:string, map:object|null}}
 */
export function waehleEditorBilder({ front, back, tpl, isPoster, cmap, ueber } = {}) {
  const bg = (ueber && ueber.front) || tpl || front || '';
  const hinten = ueber ? (ueber.back || '') : (tpl ? '' : (isPoster ? '' : (back || '')));
  const map = (ueber && ueber.map) || cmap || null;
  return { bg, back: hinten, map };
}

/**
 * Die Skriptadresse, die schon hinter dem Baustein steht (<script src="…" defer>), bleibt beim erneuten Ausrollen erhalten.
 * WARUM: Live laden die Seiten eine eigene Fassung auf cdn.shopify.com (lspod-designer-v5.js, mit gesetzter Cloudinary-Konfiguration für Bild-Upload und Druckdatei); die Fassung im
 * Repo (pod/designer.js) hat diese Konfiguration nicht. Würde pod_inject_designer.mjs die Adresse auf die Repo-Fassung zurücksetzen, ginge der Bild-Upload verloren.
 */
export function skriptAdresse(html, standard) {
  const m = String(html ?? '').match(/<div class="lspod-designer"(?:\s+[a-z-]+=(?:"[^"]*"|'[^']*'))*\s*><\/div>\s*<script\s+src="([^"]+)"/);
  return m ? entHtml(m[1]) : standard;
}
