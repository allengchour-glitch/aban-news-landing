/**
 * Fakten-Block für Produktseiten: belegte Angaben aus dem CJ-Datenblatt, ordentlich gegliedert.
 *
 * WARUM (25.10.2026): Der User öffnete Produktseiten (Edelstahl-Armband, Diamond Painting) und fand die Beschreibung «zu lasch».
 * Mehr Text hilft nur, wenn er stimmt — ein erfundener Absatz ist schlimmer als ein kurzer. Darum gilt:
 *   1. Jede Angabe muss im CJ-Quelltext stehen (Material, Verpackung, Lieferumfang, Hinweise, Schritte, Gewicht, Masse).
 *   2. Ein Sprachmodell darf übersetzen und ordnen, NICHT ergänzen. Das prüft die Zahlen-Gegenprobe: jede Zahl in der Ausgabe muss
 *      als Zahl im Quelltext stehen, sonst fliegt der Eintrag raus (nicht das ganze Produkt).
 *   3. Marken- und Lizenznamen kommen nicht in den Block (Kontosperr-Risiko, siehe Merchant-Feed).
 *   4. Ist die Quelle dünn (unter drei belegte Angaben), bekommt das Produkt KEINEN Block — lieber kurz als erfunden.
 * Alle Funktionen hier sind rein und getestet (fakten_block_test.mjs); der Lauf steht in automation/cj_fakten_block.mjs.
 */
export const MARKER = '<!-- ls-fakten-v1 -->';
const ENDE = '<!-- /ls-fakten-v1 -->';

/** Wie finde ich das CJ-Produkt zu einer Shopify-SKU? Reihenfolge = Trefferwahrscheinlichkeit. Rein, getestet. */
export function strategien(sku) {
  let s = String(sku || '').trim();
  if (!s) return [];
  const pid15 = s.match(/(\d{15,})/);
  if (pid15) return [['pid', pid15[1]]];
  s = s.replace(/^cj-(?=.)/i, '');   // nur «cj-» MIT Bindestrich: die blanke SKU CJLY… beginnt selbst mit CJ
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return [['pid', s.toUpperCase()]];
  if (/^CJ[A-Z0-9]{5,}$/i.test(s)) return [['variantSku', s.toUpperCase()], ['productSku', s.toUpperCase()]];
  return [['variantSku', s], ['productSku', s]];
}

const entities = t => String(t).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
/** HTML → Zeilen reiner Text. Bilder und leere Zeilen fallen weg. Rein, getestet. */
export function htmlZuText(html) {
  return entities(String(html || '').replace(/<img[^>]*>/gi, '\n').replace(/<\/(p|div|li|tr|h\d)>|<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .split('\n').map(z => z.replace(/\s+/g, ' ').trim()).filter(z => /[A-Za-zÄÖÜäöü0-9]/.test(z) && z.length > 1).join('\n');
}
const liste = v => { if (Array.isArray(v)) return v; try { const a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch { return v ? [String(v)] : []; } };

/** CJ-Produkt → Quelltext (was das Modell sehen darf) plus Rohwerte. Rein, getestet. */
export function quelleAus(cj) {
  const zeilen = [];
  const name = cj?.productNameEn; if (name) zeilen.push(`Product name: ${name}`);
  const mat = liste(cj?.materialNameEnSet?.length ? cj.materialNameEnSet : cj?.materialNameEn); if (mat.length) zeilen.push(`Material (supplier field): ${mat.join(', ')}`);
  const pack = liste(cj?.packingNameEnSet?.length ? cj.packingNameEnSet : cj?.packingNameEn); if (pack.length) zeilen.push(`Packaging: ${pack.join(', ')}`);
  const w = Number(cj?.productWeight); if (w > 0) zeilen.push(`Product weight: ${w} g`);
  const beschr = htmlZuText(cj?.description); if (beschr) zeilen.push('Description:\n' + beschr.slice(0, 3200));
  const keys = [...new Set((cj?.variants || []).map(v => v.variantKey).filter(Boolean))].slice(0, 30);
  if (keys.length) zeilen.push('Variants: ' + keys.join(' | '));
  return { text: zeilen.join('\n'), beschreibungZeilen: beschr ? beschr.split('\n').length : 0, material: mat, gewicht: w > 0 ? w : 0, kategorie: cj?.categoryName || '' };
}

/** Alle Zahlen eines Textes, Komma wie Punkt, ohne Tausenderpunkte. Rein, getestet. */
export function zahlen(t) {
  return [...String(t || '').matchAll(/\d+(?:[.,]\d+)?/g)].map(m => m[0].replace(',', '.'));
}
/** Jede Zahl des Werts muss in der Quelle vorkommen. Rein, getestet. */
export function zahlenBelegt(wert, quellZahlen) {
  const s = quellZahlen instanceof Set ? quellZahlen : new Set(quellZahlen);
  return zahlen(wert).every(z => s.has(z) || s.has(String(Number(z))));
}
/** Marken, Lizenzen, Werbeaussagen und Heilversprechen: kommen nie in den Block. Rein, getestet. */
export const VERBOTEN = /\b(disney|marvel|pokemon|pokémon|nintendo|playstation|xbox|harry potter|hello kitty|batman|spiderman|lego|nike|adidas|apple|iphone|samsung|rolex|gucci|louis vuitton|chanel)\b|heil(t|ung|en)\b|therap|medizin|diagnos|krebs|schmerz(frei|linder)|100 ?% (sicher|wirksam|original)|bestseller|garantiert|wasserdicht(?!e? schutz)/i;

const MASSEINHEIT = /\d\s*(mm|cm|dm|m|zoll|inch|in|"|″|ml|l|liter|g|kg|w|v|mah|ah|hz|stück|pcs|teile)\b/i;
/** Erlaubte Beschriftungen: alles andere ist vom Modell erfunden und wird verworfen. */
export const LABELS = /^(material|verarbeitung|zielgruppe|farbe|farben|muster|stil|passform|ärmel|ausschnitt|verschluss|saison|anlass|länge|breite|höhe|tiefe|durchmesser|masse|gewicht|tragkraft|kapazität|leistung|spannung|akku|anschluss|futter|sohle|stromversorgung|lichtfarbe|helligkeit|vergrösserung)$/i;
const VERARBEITUNG = /galvani|poliert|gebürstet|beschichtet|vergoldet|versilbert|lackiert|bedruckt|gestickt|genäht|geschweisst|gegossen|geschliffen|plattiert|gewebt|gestrickt|geklebt|gepresst|geschmiedet/i;
const MASS_LABELS = /^(länge|breite|höhe|tiefe|durchmesser|masse)$/i;
const woerter = t => new Set((String(t).toLowerCase().match(/[a-zäöüß]{6,}/g) || []));
/** Steht der Sinn eines Eintrags schon auf der Seite? (≥ 60 % der längeren Wörter). Rein, getestet. */
export function schonDa(eintrag, vorhanden) {
  const w = [...woerter(eintrag)]; if (w.length < 3) return false;
  const v = woerter(vorhanden); return w.filter(x => v.has(x)).length / w.length >= 0.6;
}
const kurz = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const ss = t => String(t).replace(/ß/g, 'ss');

/** Rohantwort des Modells → bereinigte Struktur. Wirft nichts; verwirft einzelne Einträge mit Grund. Rein, getestet. */
export function saeubern(roh, quelle, vorhandenerText = '') {
  const verworfen = [];
  const qz = new Set(zahlen(quelle)); for (const z of [...qz]) qz.add(String(Number(z)));
  const hat = (grund, wert) => { verworfen.push(`${grund}: ${kurz(wert, 70)}`); return false; };
  const gut = wert => {
    const w = String(wert || '').trim();
    if (w.length < 2) return false;
    if (VERBOTEN.test(w)) return hat('verbotenes Wort', w);
    if (!zahlenBelegt(w, qz)) return hat('Zahl nicht in der Quelle', w);
    if (/[一-鿿]/.test(w)) return hat('chinesische Zeichen', w);
    return true;
  };
  // «Masse 160x48» ohne Einheit ist keine Angabe: es könnten cm, mm oder Anzahl Steine sein (gemessen am Diamond Painting, 25.10.).
  // Und ein Mass ohne Zahl («Volle Länge, Grössen S–XXL») ist keins: Grössen stehen schon in der Auswahl.
  const massOhneEinheit = (label, wert) => MASS_LABELS.test(label) && (!/\d/.test(wert) || !MASSEINHEIT.test(wert));
  const vorh = vorhandenerText.toLowerCase();
  const daten = [], sehen = new Set();
  for (const d of Array.isArray(roh?.daten) ? roh.daten : []) {
    const label = ss(kurz(d?.label, 40)), wert = ss(kurz(d?.wert, 160));
    if (!label || !gut(wert) || !gut(label)) continue;
    if (!LABELS.test(label)) { verworfen.push(`Beschriftung nicht erlaubt: ${label}`); continue; }
    if (/:/.test(wert)) { verworfen.push(`zwei Angaben in einer: ${label} ${kurz(wert, 40)}`); continue; }
    if (/^verarbeitung$/i.test(label) && !VERARBEITUNG.test(wert)) { verworfen.push(`Verarbeitung ohne Verfahren: ${kurz(wert, 40)}`); continue; }
    if (massOhneEinheit(label, wert)) { verworfen.push(`Mass ohne Zahl/Einheit: ${label} ${kurz(wert, 40)}`); continue; }
    const k = label.toLowerCase();
    if (sehen.has(k)) continue; sehen.add(k);
    if (vorh && vorh.includes(k + ':')) { verworfen.push(`steht schon auf der Seite: ${label}`); continue; }
    daten.push({ label, wert });
  }
  const strings = (a, max, laenge) => (Array.isArray(a) ? a : []).map(x => ss(kurz(x, laenge))).filter(gut)
    .filter(x => { if (vorhandenerText && schonDa(x, vorhandenerText)) { verworfen.push(`steht schon auf der Seite: ${kurz(x, 50)}`); return false; } return true; }).slice(0, max);
  const out = {
    daten: daten.slice(0, 10),
    lieferumfang: strings(roh?.lieferumfang, 6, 90),
    anleitung: strings(roh?.anleitung, 8, 180),
    hinweise: strings(roh?.hinweise, 5, 200),
  };
  out.belegt = out.daten.length + out.lieferumfang.length + out.anleitung.length + out.hinweise.length;
  out.verworfen = verworfen;
  return out;
}

/** Genug Substanz für einen eigenen Block? Rein, getestet. */
export const genug = s => (s?.belegt || 0) >= 3 && (s.daten.length + s.lieferumfang.length) >= 2;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** Struktur → HTML-Block mit Marker. Rein, getestet. */
export function renderBlock(s, { wissen = null } = {}) {
  const teile = [];
  if (s.daten.length) teile.push(`<h4>Technische Daten</h4><table style="border-collapse:collapse;width:100%;font-size:14px;line-height:1.45;">${s.daten.map(d => `<tr><th style="text-align:left;font-weight:600;padding:6px 10px 6px 0;border-bottom:1px solid #ece7de;width:38%;vertical-align:top;">${esc(d.label)}</th><td style="padding:6px 0;border-bottom:1px solid #ece7de;">${esc(d.wert)}</td></tr>`).join('')}</table>`);
  if (s.lieferumfang.length) teile.push(`<h4>Lieferumfang</h4><ul>${s.lieferumfang.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`);
  if (s.anleitung.length) teile.push(`<h4>So geht's</h4><ol>${s.anleitung.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`);
  if (wissen?.titel && wissen.schritte?.length) teile.push(`<h4>${esc(wissen.titel)}</h4><ol>${wissen.schritte.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`);
  if (s.hinweise.length) teile.push(`<h4>Gut zu wissen</h4><ul>${s.hinweise.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`);
  teile.push('<p style="font-size:12px;opacity:.7;margin-top:10px;">Angaben aus dem Datenblatt des Lieferanten. Kleine Abweichungen bei Mass und Farbe sind möglich.</p>');
  return `${MARKER}<div class="ls-fakten" style="margin:16px 0;">${teile.join('')}</div>${ENDE}`;
}

/** Block in die Beschreibung setzen: vor den Querverweisen, sonst ans Ende. Ein vorhandener Block wird ersetzt, nie verdoppelt. Rein, getestet. */
export function einsetzen(html, block) {
  const h = String(html || '');
  const a = h.indexOf(MARKER);
  if (a >= 0) { const e = h.indexOf(ENDE, a); return e >= 0 ? h.slice(0, a) + block + h.slice(e + ENDE.length) : h; }
  const x = h.indexOf('<!-- ls-xsell-v1 -->');
  return x >= 0 ? h.slice(0, x) + block + h.slice(x) : h + block;
}

/** Allgemeines Handwerkswissen (keine Produktangabe): nur für Gruppen, in denen der Ablauf überall gleich ist. Rein, getestet. */
export const WISSEN = [
  { passt: (titel, kat) => /diamond painting|diamant(en)?[- ]?(malerei|bild)|point drill|diamond mosaic|diamond mosaik|5d diamond/i.test(`${titel} ${kat}`) || /Diamond Painting/i.test(kat),
    titel: 'So funktioniert Diamond Painting (allgemein)',
    schritte: ['Leinwand flach auflegen und die Schutzfolie nur Stück für Stück abziehen, damit die Klebefläche sauber bleibt.',
      'Das Symbol auf der Vorlage mit dem Farbcode auf dem passenden Beutelchen vergleichen.',
      'Einen Diamanten mit dem Applikator-Stift aufnehmen und genau auf das Symbol setzen.',
      'Jede Reihe leicht andrücken und bereichsweise arbeiten, damit nichts verrutscht.',
      'Zum Schluss das ganze Bild mit einem flachen, sauberen Gegenstand fest andrücken.'] },
];
export const wissenFuer = (titel, kategorie) => WISSEN.find(w => w.passt(titel || '', kategorie || '')) || null;

/** Auftrag an das Sprachmodell. Rein, getestet (Inhalt der Regeln). */
export function auftrag(quelle, titel) {
  return `Du ordnest Produktangaben für einen Schweizer Onlineshop. Quelle ist das englische Datenblatt eines Lieferanten.
Antworte NUR als JSON in genau dieser Form:
{"daten":[{"label":"Material","wert":"Edelstahl"}],"lieferumfang":["1 Armband"],"anleitung":[],"hinweise":[]}
STRENGE REGELN:
- Nimm nur Angaben, die im Quelltext stehen. Nichts ergänzen, nichts schätzen, nichts aus eigenem Wissen dazu.
- Jede Zahl muss im Quelltext stehen. Einheiten unverändert lassen (mm bleibt mm, cm bleibt cm, g bleibt g). Nichts umrechnen.
- Fehlt eine Angabe, lass den Eintrag weg. Leere Felder sind richtig.
- «daten»: erlaubte Beschriftungen sind NUR: Material, Verarbeitung (nur ein Verfahren wie galvanisiert, poliert, bedruckt), Zielgruppe, Farbe, Muster, Stil, Passform, Ärmel, Ausschnitt, Verschluss, Saison, Anlass, Länge, Breite, Höhe, Tiefe, Durchmesser, Masse, Gewicht, Tragkraft, Kapazität, Leistung, Spannung, Akku, Anschluss, Futter, Sohle, Lichtfarbe, Helligkeit, Vergrösserung. Höchstens 10.
- Ein Wert ist EINE Angabe, kein Doppelpunkt, keine zwei Angaben in einem Wert. Grössen (S, M, L, 38, 40 …) NICHT aufführen — sie stehen schon in der Auswahl.
- Masse nur mit Zahl UND Einheit, im Format «2400 × 700 mm» oder «25 cm». Steht im Quelltext keine Einheit dabei, lass das Mass weg.
- «lieferumfang»: nur, wenn der Quelltext ein Packing list / Package includes nennt; Teile ins Deutsche übersetzen («1 Luftbett», nicht «1 Polyester Airbed»). Höchstens 6.
- «anleitung»: nur, wenn der Quelltext Schritte oder eine Bedienung beschreibt. Höchstens 8.
- «hinweise»: nur echte Hinweise des Quelltexts (Messtoleranz, Farbabweichung, Montage, Pflege, Sicherheit). Jeden Hinweis einmal, kurz, ohne Wiederholung. Höchstens 5.
- Keine Marken, keine Lizenzfiguren, keine Werbesprache, keine Heil- oder Wirkversprechen, keine Wörter wie wasserdicht oder garantiert, wenn sie nicht ausdrücklich im Quelltext stehen.
- Deutsch, Schweizer Rechtschreibung (ss statt ß), sachlich, kurz.
Produkt: ${titel}
QUELLTEXT:
${quelle}`;
}
