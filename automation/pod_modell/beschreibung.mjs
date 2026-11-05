/**
 * Beschreibung der «Selbst gestalten»-Produkte der Modell-Fabrik. Rein: kein Netz, keine Dateien (ausser `ladeUebersetzung`, die nur liest).
 *
 * NUR BELEGTE FAKTEN: Jede Aussage der Beschreibung steht in einer Übersetzungsdatei als Paar {de, beleg}. `beleg` ist ein englischer Auszug, der WÖRTLICH in der Printful-Beschreibung
 * des Modells vorkommen muss (Gross-/Kleinschreibung, Leerraum und Anführungszeichen egal). `pruefeUebersetzung` prüft ausserdem:
 *   - jede Zahl im deutschen Satz steht im Beleg (oder in dessen metrischer Umrechnung, auf Rundung genau): keine erfundene Zahl,
 *   - kein Zoll, oz, lb, kein Gedankenstrich im deutschen Satz,
 *   - Behauptungen («wasserdicht», «zertifiziert», «nachhaltig» …) nur, wenn der Beleg das Gegenstück enthält,
 *   - nie Lieferzeit-, Rückgabe-, Garantie- oder Preisaussagen (die stehen nur in den festen Bausteinen dieser Datei).
 * Fakten aus dem Katalog (Technik, Druckdatei, Masstabelle) kommen aus den Daten selbst, nicht aus der Übersetzung.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { umrechneText } from '../../dropship/selbst-gestalten-fertig-0511/werkzeuge/schweizer_masse.mjs';

export const PLATZHALTER_VARIANTE = '__ERSTE_VARIANTE__';
export const PLATZHALTER_EDITOR = '__LSPOD_EDITOR_URL__';
/** Steht in der Karte als Zeichenkette ("__SHOP_VARIANTEN__"); anlegen.mjs ersetzt sie samt Anführungszeichen durch die Abbildung Shopify-Variante → Printful-Variante. */
export const PLATZHALTER_SHOP = '__SHOP_VARIANTEN__';

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** JSON für ein <script type="application/json">: «<» wird <, damit weder «</script>» noch «<!--» den Block beenden. */
export const jsonFuerScript = (o) => JSON.stringify(o).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/** Text ohne HTML-Marken und ohne den Inhalt von <script>/<style> (für alle Prüfungen am sichtbaren Text). */
export function htmlText(h) {
  return String(h ?? '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────────────────────── feste Texte
/**
 * Wortlaut der bestehenden Produktseiten (z. B. unisex-t-shirt-selbst-gestalten, gelesen 05.11.2026), mit EINER Änderung: der Gedankenstrich nach «weiterverkaufen» ist ein Komma
 * («…, darum ist eine Rückgabe…»), weil Kundentexte keine Gedankenstriche tragen. Inhalt gleich.
 */
export const RUECKGABE_TEXT = 'Jedes Stück wird eigens nach deinem Entwurf gedruckt und lässt sich deshalb nicht weiterverkaufen, darum ist eine Rückgabe aus Meinungsänderung ausgeschlossen. Bei Druckfehlern, Beschädigung oder falscher Lieferung ersetzen wir es selbstverständlich.';
/** Der Wortlaut der Live-Seite (mit Gedankenstrich), nur für den Test «gleich bis auf den Strich». */
export const RUECKGABE_TEXT_LIVE = 'Jedes Stück wird eigens nach deinem Entwurf gedruckt und lässt sich deshalb nicht weiterverkaufen — eine Rückgabe aus Meinungsänderung ist darum ausgeschlossen. Bei Druckfehlern, Beschädigung oder falscher Lieferung ersetzen wir es selbstverständlich.';

export const TECHNIK_DE = Object.freeze({
  DTG: 'Direktdruck auf Textil (DTG)', SUBLIMATION: 'Sublimationsdruck', EMBROIDERY: 'Stickerei', DIGITAL: 'Digitaldruck', 'CUT-SEW': 'Zuschnitt und Naht: die Teile werden vor dem Nähen bedruckt',
  'DIRECT-TO-FABRIC': 'Direktdruck auf Stoff, danach genäht', DTFILM: 'Folientransfer (DTF)', KNITWEAR: 'Gestrickt',
});

export const technikDeVon = (key) => TECHNIK_DE[key] ?? null;

/** Kundentexte zu den Einschränkungs-Codes der Modellkarte. «Tipp» heisst: Erfahrungswert, nicht gemessen. */
export const HINWEIS_DE = Object.freeze({
  stickerei: 'Tipp zur Stickerei: Dein Motiv wird in Garnfarben umgesetzt. Fotos, Farbverläufe und sehr feine Linien lassen sich nicht sticken.',
  gestrickt: 'Tipp zum Strick: Die Druckdatei ist ein Maschenraster (ein Pixel entspricht einer Masche). Feine Details und Fotos gehen verloren.',
  allover_einzeldatei: 'Tipp: Dein Motiv läuft über das ganze Teil und über die Nähte.',
  kappe: 'Tipp: Die Fläche ist klein und gewölbt. Halte dein Motiv klein und ohne feine Details.',
  tasche: 'Tipp: Die Druckfläche endet vor Nähten und Henkeln. Setze dein Motiv nicht an den Rand.',
  rundumdruck: 'Tipp: Das Motiv läuft rund um das Gefäss. Den Bereich am Henkel hältst du am besten frei.',
});

// ─────────────────────────────────────────────────────────────── Zahlen und Behauptungen
/** Zahlen eines Textes als Fliesskommazahlen: «55,9», «55.9», «1'000», «1 000». Prozentzeichen und Einheiten bleiben weg. */
export function zahlenAus(text) {
  const t = String(text ?? '').replace(/(\d)['’ ](\d{3})(?!\d)/g, '$1$2').replace(/(\d),(\d)/g, '$1.$2');
  return (t.match(/\d+(?:\.\d+)?/g) || []).map(Number);
}
const gleichZahl = (a, b) => Math.abs(a - b) <= Math.max(0.06, Math.abs(b) * 0.006);

/** Behauptungen: das deutsche Wort braucht das englische Gegenstück im Beleg. Mit en = null ist das deutsche Wort nie erlaubt. */
export const BEHAUPTUNGEN = Object.freeze([
  { de: /wasserdicht|wasserfest|wasserabweisend/i, en: /water[- ]?(proof|resistant|repellent)|waterproof/i, name: 'wasserdicht' },
  { de: /zertifiziert/i, en: /certif|GOTS|OCS|GRS|OEKO|fairtrade|PETA/i, name: 'zertifiziert' },
  { de: /nachhaltig/i, en: /sustainab/i, name: 'nachhaltig' },
  { de: /klimaneutral|co2/i, en: /carbon|climate|co2/i, name: 'klimaneutral' },
  { de: /vegan/i, en: /vegan/i, name: 'vegan' },
  { de: /\bbio\b|biologisch/i, en: /organic/i, name: 'bio' },
  { de: /recycel/i, en: /recycl/i, name: 'recycelt' },
  { de: /\beco\b|\böko/i, en: /\beco\b|eco-friendly|environment|sustainab|recycl|organic/i, name: 'Eco/Öko' },
  { de: /hypoallergen|allergiker/i, en: /hypoallergenic/i, name: 'hypoallergen' },
  { de: /spülmaschinen/i, en: /dishwasher/i, name: 'spülmaschinenfest' },
  { de: /mikrowelle/i, en: /microwave/i, name: 'mikrowellengeeignet' },
  { de: /maschinenwasch|waschmaschine/i, en: /machine[- ]wash/i, name: 'maschinenwaschbar' },
  { de: /bpa/i, en: /bpa/i, name: 'BPA' },
  { de: /feuerfest|flammhemmend|schwer entflammbar/i, en: /flame|fire/i, name: 'flammhemmend' },
  { de: /lichtecht|uv-beständig|uv-schutz/i, en: /\buv\b|fade[- ]?(proof|resistant)/i, name: 'UV/lichtecht' },
]);
/** Nie erlaubt in Übersetzungen: Zusagen zu Lieferung, Rückgabe, Garantie, Preis. Dafür gibt es feste Bausteine. */
export const VERBOTEN = Object.freeze([
  [/\bgarantie\b|\bgarantiert\b|\bgewährleist/i, 'Garantie'], [/werktag|lieferzeit|lieferdatum|versandzeit|express/i, 'Lieferzeit'], [/rückgabe|umtausch|rücksendung|widerruf/i, 'Rückgabe'],
  [/gratis|kostenlos|versandkostenfrei|geschenkt/i, 'Gratis'], [/bestseller|testsieger|beliebteste|nr\. ?1|ultimativ|unvergleichlich|unübertroffen|unschlagbar|einzigartig|makellos|erstklassig|\bperfekt|der beste|die beste|das beste|bestmöglich/i, 'Superlativ'], [/chf|fr\.\s?\d|€|\busd\b|\$/i, 'Preis'],
  [/\bzoll\b|\binch|″|\d\s*["”]|\boz\b|\bunzen?\b|\blbs?\b|\bpfund\b|°\s?f\b|fahrenheit/i, 'Zoll/oz/lb'], [/[–—−‒―]|\s-\s/, 'Gedankenstrich'],
]);

const norm = (s) => String(s ?? '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[“”„«»]/g, '"').replace(/[–—−]/g, '-').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Prüft eine Übersetzungsdatei gegen die Printful-Beschreibung.
 * @param {{intro?:{de:string,beleg:string}[], punkte?:{de:string,beleg:string}[], hinweis?:{de:string,beleg:string}[]}} u
 * @param {string} original  Beschreibung des Katalogs als Text ohne HTML (karte.beschreibung.original)
 * @param {{ozArt?:string|null}} kontext  wofür «oz» steht (volumen/gewicht), damit «11 oz» als «325 ml» erlaubt ist (schweizer_masse.ozArt)
 * @returns {{ok:boolean, fehler:string[], nichtUebernommen:string[], saetze:number}}
 */
export function pruefeUebersetzung(u, original, kontext = {}) {
  const fehler = [];
  if (!u || typeof u !== 'object') return { ok: false, fehler: ['keine Übersetzung vorhanden'], nichtUebernommen: [], saetze: 0 };
  const o = norm(original);
  const gruppen = [['intro', u.intro], ['punkte', u.punkte], ['hinweis', u.hinweis]];
  let saetze = 0; const belege = [];
  if (!Array.isArray(u.intro) || u.intro.length === 0) fehler.push('intro fehlt (mindestens ein Satz mit Beleg)');
  for (const [name, liste] of gruppen) {
    if (liste === undefined) continue;
    if (!Array.isArray(liste)) { fehler.push(`${name}: keine Liste`); continue; }
    liste.forEach((x, i) => {
      const wo = `${name}[${i}]`;
      if (!x || typeof x.de !== 'string' || !x.de.trim()) { fehler.push(`${wo}: «de» fehlt`); return; }
      if (typeof x.beleg !== 'string' || !x.beleg.trim()) { fehler.push(`${wo}: «beleg» fehlt («${x.de.slice(0, 40)}»)`); return; }
      saetze++;
      const b = norm(x.beleg);
      if (!o.includes(b)) fehler.push(`${wo}: Beleg steht nicht wörtlich in der Printful-Beschreibung: «${x.beleg.slice(0, 70)}»`);
      belege.push(b);
      // Zahlen: erlaubt sind die des Belegs und die seiner metrischen Umrechnung
      const erlaubt = [...zahlenAus(x.beleg), ...zahlenAus(umrechneText(x.beleg, kontext).text)];
      for (const z of zahlenAus(x.de)) if (!erlaubt.some((e) => gleichZahl(z, e))) fehler.push(`${wo}: Zahl ${z} steht nicht im Beleg («${x.de.slice(0, 50)}»)`);
      for (const [re, was] of VERBOTEN) if (re.test(x.de)) fehler.push(`${wo}: «${was}» ist in Übersetzungen nicht erlaubt («${x.de.slice(0, 50)}»)`);
      for (const bh of BEHAUPTUNGEN) if (bh.de.test(x.de) && !bh.en.test(x.beleg)) fehler.push(`${wo}: Behauptung «${bh.name}» ohne Gegenstück im Beleg («${x.de.slice(0, 50)}»)`);
    });
  }
  // Was aus der Printful-Beschreibung nicht übernommen wurde (nur Hinweis, kein Fehler: manches ist bewusst weggelassen, z. B. Herkunft des Rohlings)
  const zeilen = String(original ?? '').split(/\n|•/).map((x) => norm(x)).filter((x) => x.length > 3);
  const nichtUebernommen = zeilen.filter((z) => !belege.some((b) => z.includes(b) || b.includes(z))).map((z) => z.slice(0, 90));
  return { ok: fehler.length === 0, fehler, nichtUebernommen, saetze };
}

/** Liest <ordner>/<id>.json (nur lesen); null, wenn es die Datei nicht gibt oder sie kein JSON ist (mit Fehlertext). */
export function ladeUebersetzung(ordner, id) {
  if (!ordner) return { u: null, fehler: 'kein Übersetzungsordner angegeben' };
  const f = join(ordner, `${id}.json`);
  if (!existsSync(f)) return { u: null, fehler: `keine Übersetzungsdatei ${id}.json` };
  try { return { u: JSON.parse(readFileSync(f, 'utf8')), fehler: null }; } catch (e) { return { u: null, fehler: `${id}.json ist kein gültiges JSON: ${e.message}` }; }
}

// ─────────────────────────────────────────────────────────────── Bausteine
const LIEFERBOX_STIL = 'background:#f4f6fb;border:1px solid #dde3ef;border-radius:10px;padding:10px 14px;font-size:13px;margin:0 0 14px;';
const RETOURE_STIL = 'background:#fff7e6;border-left:3px solid #e0a300;border-radius:4px;padding:9px 12px;margin:12px 0;font-size:14px;line-height:1.5;';

/** «6 bis 9 Werktage» (nie ein Bindestrich-Bereich, nie ein Gedankenstrich). */
export function spanneText(min, max) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 1 || max < min) return null;
  return min === max ? `${min} Werktage` : `${min} bis ${max} Werktage`;
}

/**
 * Lieferbox im Wortlaut der heutigen «Selbst gestalten»-Produkte (GEMESSEN 05.11.2026, z. B. dad-cap-selbst-gestalten: «Lieferzeit Schweiz: 7–14 Werktage · Druck auf Bestellung · Versand nur in die Schweiz und nach Liechtenstein»),
 * aber ohne Gedankenstrich («7 bis 14»). KEINE Versandtage von Printful allein (sie enthalten die Fertigung nicht, QUELLE printful.com/shipping) und kein Satz «Datum siehst du in der Kasse» (für Druckartikel nicht belegt).
 * @param {{min:number,max:number}} lieferzeit
 */
export function lieferbox({ min, max }) {
  const sp = spanneText(min, max);
  if (!sp) return null;
  return `<p class="ls-liefer" data-tier="pod" style="${LIEFERBOX_STIL}">📦 <strong>Lieferzeit</strong> Schweiz: <strong>${sp}</strong> <span style="opacity:.7;">· Druck auf Bestellung · Versand nur in die Schweiz und nach Liechtenstein</span></p>`;
}

/**
 * Eine Tabelle, deren Zellen nur die Zahlen der Grössenbezeichnung wiederholen (Leinwand «20,3 × 25,4 cm» mit den Spalten Höhe 20,3 und Breite 25,4), sagt dem Kunden nichts Neues und trug dazu noch die
 * Überschrift «zum Selbstmessen» (Gegenleser 2, K4). Sie entfällt ohne Vermerk (es geht nichts verloren).
 */
export function tabelleWiederholtNurGroesse(t) {
  let zellen = 0;
  for (const m of t.messungen ?? []) for (const w of m.werte ?? []) {
    const erlaubt = zahlenAus(w.groesseAnzeige ?? w.groesse);
    const zahlen = zahlenAus(w.anzeige);
    zellen++;
    if (!zahlen.length || !zahlen.every((z) => erlaubt.some((e) => gleichZahl(z, e)))) return false;
  }
  return zellen > 0;
}

function tabelleHtml(t, labelDe) {
  const messungen = t.messungen.filter((m) => m.werte && m.werte.length);
  if (!messungen.length) return null;
  const groessen = [...new Set(messungen.flatMap((m) => m.werte.map((w) => w.groesseAnzeige ?? w.groesse)))];
  const kopf = messungen.map((m) => `<th>${esc(labelDe(m.label))}</th>`).join('');
  const zeilen = groessen.map((g) => `<tr><th scope="row">${esc(g)}</th>${messungen.map((m) => { const w = m.werte.find((x) => (x.groesseAnzeige ?? x.groesse) === g); return `<td>${w ? esc(String(w.anzeige).replace(/(\d)\s*[–—]\s*(\d)/g, '$1 bis $2')) : ''}</td>`; }).join('')}</tr>`).join('');
  return `<table class="lx-modell-tabelle"><thead><tr><th>Grösse</th>${kopf}</tr></thead><tbody>${zeilen}</tbody></table>`;
}
/** Deutsche Namen der Messungen der Grössentabelle. Buchstaben (A, B, C …) gehören zu einer Skizze des Herstellers, die wir nicht zeigen: solche Tabellen entfallen. */
export const MESSUNG_DE = Object.freeze({ length: 'Länge', width: 'Breite', height: 'Höhe', chest: 'Brustumfang', 'sleeve length': 'Ärmellänge', waist: 'Taille', hips: 'Hüfte', 'chest width': 'Brustbreite', 'body length': 'Körperlänge', 'inseam length': 'Schrittlänge', inseam: 'Schrittlänge', thickness: 'Dicke' });
export const messungDe = (l) => MESSUNG_DE[String(l).toLowerCase().trim()] ?? null;

/**
 * Baut die Beschreibung (HTML mit Platzhaltern). Gibt auch zurück, was weggelassen wurde (Tabellen ohne deutsche Beschriftung usw.).
 * @param {{karte:object, lieferzeit:{min:number,max:number}|null, modell:number, klasse:string, kompakt:object, editorKarte:object, technikDe:string|null, basis:object|null, uebersetzung:object}} p
 */
export function beschreibungBauen({ karte, lieferzeit, modell, klasse, kompakt, editorKarte, technikDe, basis, uebersetzung }) {
  if (!editorKarte || typeof editorKarte !== 'object') throw new Error('beschreibungBauen: editorKarte fehlt (die Karte, die der Editor aus <script id="lspod-karte"> liest)');
  const weggelassen = [];
  const teile = [];
  const box = lieferzeit ? lieferbox(lieferzeit) : null;
  if (box) teile.push(box);
  // Container nach der EINBINDUNG im Kopf von pod/v6/lspod-designer-v6.js: eigene Klasse «lspod-designer-v6» (der live wirksame Editor v5 sucht nur «lspod-designer» und bliebe hier stumm), Karte als Kind.
  teile.push(`<div class="lspod-designer-v6" data-modell="${esc(modell)}" data-klasse="${esc(klasse)}" data-variant="${PLATZHALTER_VARIANTE}"><script type="application/json" id="lspod-karte">${jsonFuerScript(editorKarte)}</script></div>`);
  teile.push(`<script src="${PLATZHALTER_EDITOR}" defer></script>`);
  teile.push('<hr>');
  for (const x of uebersetzung?.intro ?? []) teile.push(`<p>${esc(x.de)}</p>`);
  if ((uebersetzung?.punkte ?? []).length) teile.push(`<ul>${uebersetzung.punkte.map((x) => `<li>${esc(x.de)}</li>`).join('')}</ul>`);
  for (const x of uebersetzung?.hinweis ?? []) teile.push(`<p>${esc(x.de)}</p>`);

  // Eckdaten aus dem Katalog
  const daten = [];
  if (technikDe) daten.push(`<li><strong>Druckverfahren:</strong> ${esc(technikDe)}</li>`);
  // Bei Modellen mit mehreren Druckdateien (Poster, Leinwand, Kissen, Decke, Aufkleber, Tasse: je Grösse eine andere Datei) gälte die Zeile nur für EINE Grösse und wäre für die übrigen falsch
  // (Gegenleser 05.11.: «42 × 29,7 cm» bei Postern bis 61 × 91,4 cm): dann entfällt sie, der Editor zeigt die Fläche der gewählten Grösse.
  const basisKarte = (kompakt?.platzierungen ?? []).find((p) => p.id === kompakt?.basis);
  const mehrereDateien = (basisKarte?.geometrien?.length ?? 0) > 1;
  if (basis?.printfile && !mehrereDateien) {
    const pf = basis.printfile, cm = pf.groesseCm;
    const f = `${pf.breitePx} × ${pf.hoehePx} Pixel${pf.dpi ? ` bei ${pf.dpi} dpi` : ''}${cm ? `, das sind ${String(cm.breite).replace('.', ',')} × ${String(cm.hoehe).replace('.', ',')} cm` : ''}`;
    daten.push(`<li><strong>Druckdatei (${esc(basis.titel)}):</strong> ${esc(f)}</li>`);
  }
  if (daten.length) teile.push(`<div class="lx-modell-daten"><h4>Eckdaten</h4><ul>${daten.join('')}</ul></div>`);

  // Grössentabellen (cm). Buchstaben-Tabellen und Tabellen mit US/UK-Werten entfallen
  const tabellen = [];
  for (const t of karte.groessentabelle?.tabellen ?? []) {
    const labels = t.messungen.map((m) => messungDe(m.label));
    if (labels.some((l) => l === null)) { weggelassen.push(`Grössentabelle «${t.typ}» ohne deutsche Beschriftung der Masse (${t.messungen.map((m) => m.label).join(', ')})`); continue; }
    if (t.messungen.some((m) => m.markiert)) { weggelassen.push(`Grössentabelle «${t.typ}» enthält markierte (nicht umgerechnete) Werte`); continue; }
    if (tabelleWiederholtNurGroesse(t)) continue;
    const h = tabelleHtml(t, (l) => messungDe(l));
    if (!h) continue;
    if (tabellen.some((x) => x.h === h)) { weggelassen.push(`Grössentabelle «${t.typ}» ist gleich einer schon gezeigten`); continue; }
    tabellen.push({ h, text: `<h4>${t.typ === 'measure_yourself' ? 'Grössentabelle zum Selbstmessen (cm)' : 'Masse des Produkts (cm)'}</h4>${h}` });
  }
  if (tabellen.length) teile.push(`<div class="lx-modell-groessen">${tabellen.map((x) => x.text).join('')}</div>`);

  // Tipps zur Technik/Form (Erfahrungswerte), Panel-Hinweis
  const tipps = [];
  for (const c of kompakt.hinweise ?? []) if (HINWEIS_DE[c.code]) tipps.push(HINWEIS_DE[c.code]);
  if (klasse === 'PANEL' && kompakt.platzierungen?.length) tipps.push(`Dieses Modell besteht aus ${kompakt.platzierungen.filter((p) => p.art === 'flaeche').length} bedruckten Teilen (${kompakt.platzierungen.filter((p) => p.art === 'flaeche').map((p) => p.titel).join(', ')}). Jedes Teil bekommt sein eigenes Motiv.`);
  if (tipps.length) teile.push(`<div class="lx-modell-tipps"><h4>Gut zu wissen</h4><ul>${tipps.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>`);

  teile.push(`<div class="ls-pod-retoure" style="${RETOURE_STIL}">↩️ <strong>Rückgabe bei personalisierter Ware:</strong> ${esc(RUECKGABE_TEXT)} <a href="/policies/refund-policy">Rückgaberichtlinie</a></div>`);
  return { html: teile.join('\n'), weggelassen };
}
