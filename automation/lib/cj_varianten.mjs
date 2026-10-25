/**
 * Reine Logik für «CJ-Varianten → Shopify-Auswahl» (kein Netz, keine Schreibzugriffe).
 *
 * WARUM (25.10.2026): Viele CJ-Produkte stehen im Shop mit EINER Variante («Default Title»), obwohl CJ
 * mehrere Farben/Grössen führt (Vorhang 3×3, Heiz-Schal 9 Farben) und die Galerie sie alle zeigt. Die Kundin
 * kann nichts wählen und bekommt irgendeine Ausführung.
 *
 * Grundsatz: Unklares bleibt UNKLAR. Lässt sich ein CJ-Schlüssel nicht eindeutig in Optionen zerlegen,
 * kommt `{ ok:false, grund }` zurück — es wird nie geraten (eine falsch zerlegte Auswahl ist schlimmer als keine).
 */

const BASIS_FARBEN = {
  white: 'Weiss', black: 'Schwarz', red: 'Rot', blue: 'Blau', green: 'Grün', yellow: 'Gelb', pink: 'Rosa',
  gray: 'Grau', grey: 'Grau', brown: 'Braun', purple: 'Violett', orange: 'Orange', beige: 'Beige', khaki: 'Khaki',
  apricot: 'Aprikose', silver: 'Silber', gold: 'Gold', rose: 'Rosé', coffee: 'Kaffeebraun', navy: 'Marineblau',
  burgundy: 'Bordeaux', champagne: 'Champagner', cream: 'Creme', ivory: 'Elfenbein', transparent: 'Transparent',
  multicolor: 'Mehrfarbig', multicolour: 'Mehrfarbig', camel: 'Camel', turquoise: 'Türkis', lavender: 'Lavendel',
  mint: 'Mint', 'off-white': 'Cremeweiss', offwhite: 'Cremeweiss', 'wine red': 'Weinrot', 'rose red': 'Rosenrot',
  'sky blue': 'Himmelblau', 'army green': 'Armeegrün', 'light green': 'Hellgrün', 'dark green': 'Dunkelgrün',
  'light blue': 'Hellblau', 'dark blue': 'Dunkelblau', 'light pink': 'Hellrosa', 'light gray': 'Hellgrau',
  'light grey': 'Hellgrau', 'dark gray': 'Dunkelgrau', 'dark grey': 'Dunkelgrau', 'light brown': 'Hellbraun',
  'dark brown': 'Dunkelbraun', 'light yellow': 'Hellgelb', 'light purple': 'Hellviolett', 'dark purple': 'Dunkelviolett',
  'hot pink': 'Pink', 'rose gold': 'Roségold', 'khaki green': 'Khakigrün', 'bright red': 'Leuchtrot', 'colorful': 'Bunt',
  colourful: 'Bunt', 'random color': 'Zufällige Farbe', 'mixed color': 'Gemischte Farben',
};
const PRAEFIX = { light: 'Hell', dark: 'Dunkel', deep: 'Tief', pale: 'Hell', bright: 'Leucht' };
const BASIS_NUR = { white: 'weiss', black: 'schwarz', red: 'rot', blue: 'blau', green: 'grün', yellow: 'gelb', pink: 'rosa', gray: 'grau', grey: 'grau', brown: 'braun', purple: 'violett', orange: 'orange', beige: 'beige' };
// Ende-Grenze nach dem Farbwort: «Rotary» ist keine Farbe, «Hellgrün» schon (Vorsilbe erlaubt).
const FARB_RE_DE = /^(?:hell|dunkel|himmel|tief|leucht|pastell|neon|armee|marine|rosen|wein|kaffee)?(?:weiss|weiß|schwarz|rot|blau|gr[üu]n|gelb|rosa|ros[ée]|ros[ée]gold|grau|braun|beige|lila|violett|orange|pink|gold|silber|aprikose|apricot|creme|khaki|t[üu]rkis|bordeaux|bunt|mehrfarbig|transparent)(?![a-zäöüß])/i;
const GROESSE_RE = /^(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)(?:\s*[x×*]\s*(\d+(?:[.,]\d+)?))?\s*(cm|mm|m)?$/i;
const KONFEKTION_RE = /^(x{0,3}s|x{0,3}l|m|[2-6]xl|[2-6]xs|one size|free size|\d{2}(?:\.\d)?)$/i;

/** @returns {{text:string, sicher:boolean}} */
export function farbeDeutsch(wert) {
  const roh = String(wert ?? '').trim();
  if (!roh) return { text: '', sicher: false };
  const k = roh.toLowerCase().replace(/\s+/g, ' ');
  if (BASIS_FARBEN[k]) return { text: BASIS_FARBEN[k], sicher: true };
  if (FARB_RE_DE.test(roh)) return { text: roh, sicher: true };      // bereits deutsch
  const teile = k.split(' ');
  if (teile.length === 2 && PRAEFIX[teile[0]] && BASIS_NUR[teile[1]]) {
    return { text: PRAEFIX[teile[0]] + BASIS_NUR[teile[1]], sicher: true };
  }
  if (teile.length >= 2 && teile.every(t => BASIS_FARBEN[t])) {
    return { text: teile.map(t => BASIS_FARBEN[t]).join(' / '), sicher: true };
  }
  return { text: roh, sicher: false };
}

export function groesseNormal(wert) {
  const roh = String(wert ?? '').trim();
  const m = GROESSE_RE.exec(roh);
  if (m) {
    const zahlen = [m[1], m[2], m[3]].filter(Boolean).map(z => z.replace(',', '.'));
    return `${zahlen.join(' × ')} ${(m[4] || 'cm').toLowerCase()}`;
  }
  if (/^(one|free|universal) size$/i.test(roh)) return 'Einheitsgrösse';
  if (/^[xsml0-9]{1,4}$/i.test(roh)) return roh.toUpperCase();
  return roh;
}

/** Art einer Option: 'farbe' | 'groesse' | 'ausfuehrung' — erst nach dem Namen, dann nach den Werten. */
export function optionsArt(name, werte) {
  const n = String(name || '').toLowerCase();
  if (/colou?r|farbe/.test(n)) return 'farbe';
  if (/size|gr[öo]sse|dimension|length|l[äa]nge/.test(n)) return 'groesse';
  const w = (werte || []).map(x => String(x).trim()).filter(Boolean);
  if (w.length) {
    const farbig = w.filter(x => farbeDeutsch(x).sicher).length;
    const gross = w.filter(x => GROESSE_RE.test(x) || KONFEKTION_RE.test(x)).length;
    if (farbig / w.length >= 0.8) return 'farbe';
    if (gross / w.length >= 0.8) return 'groesse';
  }
  return 'ausfuehrung';
}

/**
 * Zerlegt die CJ-Schlüssel («Light Green-140x183cm») in Optionswerte.
 * @param {string} keyNames  CJ `productKeyEn`, z. B. "Color-Specifications"
 * @param {{vid:string,key:string}[]} varianten
 * @returns {{ok:true, namen:string[], zeilen:{vid:string,werte:string[]}[]} | {ok:false, grund:string}}
 */
export function zerlegeOptionen(keyNames, varianten) {
  const namen = String(keyNames || '').split('-').map(s => s.trim()).filter(Boolean);
  if (!namen.length) return { ok: false, grund: 'keine Optionsnamen bei CJ' };
  if (namen.length > 3) return { ok: false, grund: `mehr als 3 Optionen (${namen.length})` };
  if (!varianten?.length) return { ok: false, grund: 'keine Varianten' };
  if (varianten.some(v => !String(v.key || '').trim())) return { ok: false, grund: 'Variante ohne Schlüssel' };

  const teilen = v => String(v.key).trim().split('-').map(s => s.trim());
  let zeilen;
  if (namen.length === 1) {
    zeilen = varianten.map(v => ({ vid: v.vid, werte: [String(v.key).trim()] }));
  } else {
    const direkt = varianten.filter(v => teilen(v).length === namen.length);
    if (direkt.length === varianten.length) {
      zeilen = varianten.map(v => ({ vid: v.vid, werte: teilen(v) }));
    } else if (namen.length === 2 && direkt.length > 0) {
      // Werte mit Bindestrich («Rose-Red»): gültig sind nur Teilwerte, die in eindeutigen Zeilen vorkommen
      const links = new Set(direkt.map(v => teilen(v)[0])), rechts = new Set(direkt.map(v => teilen(v)[1]));
      zeilen = [];
      for (const v of varianten) {
        const t = teilen(v);
        if (t.length === 2) { zeilen.push({ vid: v.vid, werte: t }); continue; }
        // Erst beide Seiten bekannt; sonst genügt eine bekannte Seite — aber nur, wenn genau EIN Schnitt passt.
        const schnitte = [];
        for (let k = 1; k < t.length; k++) schnitte.push([t.slice(0, k).join('-'), t.slice(k).join('-')]);
        let gefunden = null;
        for (const pass of [([l, r]) => links.has(l) && rechts.has(r), ([l, r]) => rechts.has(r) || links.has(l)]) {
          const treffer = schnitte.filter(pass);
          if (treffer.length > 1) return { ok: false, grund: `mehrdeutiger Schlüssel «${v.key}»` };
          if (treffer.length === 1) { gefunden = treffer[0]; break; }
        }
        if (!gefunden) return { ok: false, grund: `Schlüssel «${v.key}» lässt sich nicht zerlegen` };
        zeilen.push({ vid: v.vid, werte: gefunden });
      }
    } else {
      return { ok: false, grund: `Schlüssel passen nicht zu ${namen.length} Optionen` };
    }
  }
  // Jede Kombination genau einmal
  const gesehen = new Set();
  for (const z of zeilen) {
    const k = z.werte.map(w => w.toLowerCase()).join('|');
    if (gesehen.has(k)) return { ok: false, grund: `doppelte Kombination «${z.werte.join(' / ')}»` };
    gesehen.add(k);
  }
  return { ok: true, namen, zeilen };
}

// «Grösse» NUR für Konfektionsgrössen. Der Theme-Block `lux_sizeguide` (templates/product.json) zeigt bei jedem Optionsnamen
// mit «grösse»/«size» den Kleider-Hinweis «asiatisch konfektioniert … eine Nummer grösser wählen» — bei einem Vorhang
// mit «140 × 183 cm» wäre das falsch. Abmessungen heissen darum «Abmessung».
const OPTIONSNAME = { farbe: 'Farbe', groesse: 'Grösse', abmessung: 'Abmessung', ausfuehrung: 'Ausführung' };
// Deutsche Namen für CJ-Optionsnamen, die weder Farbe noch Grösse sind («Capacity» → «Inhalt», nicht «Ausführung 2»).
export const NAMEN_DE = { style: 'Modell', model: 'Modell', type: 'Typ', specification: 'Ausführung', specifications: 'Ausführung',
  capacity: 'Inhalt', volume: 'Inhalt', material: 'Material', pattern: 'Muster', quantity: 'Menge', package: 'Set', set: 'Set',
  voltage: 'Spannung', plug: 'Stecker', 'plug type': 'Stecker', power: 'Leistung', shape: 'Form', width: 'Breite', motif: 'Motiv',
  length: 'Länge', dimension: 'Abmessung', dimensions: 'Abmessung' };
const MASS_EINHEIT_RE = /^\d+(?:[.,]\d+)?\s*(ml|l|cm|mm|m|kg|g|w|v|mah|ah)$/i;

/** «400ml» → «400 ml». Nur Zahl + Einheit; alles andere unverändert. */
export function einheitNormal(wert) {
  const m = /^(\d+(?:[.,]\d+)?)\s*(ml|l|cm|mm|m|kg|g|w|v|mah|ah)$/i.exec(String(wert || '').trim());
  return m ? `${m[1].replace(',', '.')} ${m[2].toLowerCase() === 'v' || m[2].toLowerCase() === 'w' ? m[2].toUpperCase() : m[2].toLowerCase()}` : String(wert || '').trim();
}

const TEILE = { 'power bank': 'Powerbank', powerbank: 'Powerbank', battery: 'Batterie', batteries: 'Batterien', 'remote control': 'Fernbedienung',
  charger: 'Ladegerät', 'usb cable': 'USB-Kabel', cable: 'Kabel', adapter: 'Adapter', adaptor: 'Adapter', 'with box': 'Verpackung' };
/** Hinweis aus einer KONSTANTEN CJ-Option (alle Varianten gleich). null = nicht sicher übersetzbar → nur melden, nichts schreiben. */
export function hinweisText({ name, wert }) {
  const w = String(wert || '').trim();
  let m = /^(excluding|without|no|excl\.?)\s+(.+)$/i.exec(w);
  if (m && TEILE[m[2].toLowerCase()]) return `Ohne ${TEILE[m[2].toLowerCase()]} (nicht im Lieferumfang).`;
  m = /^(including|with|incl\.?)\s+(.+)$/i.exec(w);
  if (m && TEILE[m[2].toLowerCase()]) return `Mit ${TEILE[m[2].toLowerCase()]}.`;
  const de = NAMEN_DE[String(name || '').toLowerCase()];
  if (de && MASS_EINHEIT_RE.test(w)) return `${de}: ${einheitNormal(w)}.`;
  return null;
}

/**
 * Baut aus der Zerlegung die endgültige Shop-Auswahl.
 * Konstante Optionen (alle Varianten gleich, z. B. «Excluding Power Bank») werden KEINE Auswahl, sondern ein Hinweis.
 */
export function baueAuswahl(zerlegung, extra = {}) {
  if (!zerlegung.ok) return zerlegung;
  const { namen, zeilen } = zerlegung;
  const hinweise = [], unsicher = [];
  const behalten = [];
  namen.forEach((name, i) => {
    const werte = [...new Set(zeilen.map(z => z.werte[i]))];
    if (werte.length === 1) { hinweise.push({ name, wert: werte[0] }); return; }
    let art = optionsArt(name, werte);
    if (art === 'groesse' && (/length|l[äa]nge|dimension/i.test(name) || werte.every(x => GROESSE_RE.test(String(x).trim())))) art = 'abmessung';
    behalten.push({ i, name, werte, art });
  });
  if (!behalten.length) return { ok: false, grund: 'keine echte Auswahl (alle Optionen konstant)', hinweise };

  const benutzt = new Map();
  const optionen = behalten.map(o => {
    let ziel = o.art === 'ausfuehrung' ? (NAMEN_DE[String(o.name).toLowerCase()] || OPTIONSNAME.ausfuehrung)
      : (o.art === 'abmessung' && /length|l[äa]nge/i.test(o.name)) ? 'Länge' : OPTIONSNAME[o.art];
    const n = (benutzt.get(ziel) || 0) + 1; benutzt.set(ziel, n);
    if (n > 1) ziel = `${ziel} ${n}`;
    const wertMap = new Map();
    for (const w of o.werte) {
      let neu = w;
      if (o.art === 'farbe') {
        const f = farbeDeutsch(w);
        if (!f.sicher && extra.wert?.[w]) neu = extra.wert[w];
        else { neu = f.text; if (!f.sicher) unsicher.push({ option: ziel, wert: w }); }
      }
      else if (o.art === 'groesse' || o.art === 'abmessung') neu = groesseNormal(w);
      else {
        const stil = /^style\s*[-_]?\s*(\d+)$/i.exec(w.trim()) || /^(\d+)\s*style$/i.exec(w.trim());   // «Style1» / «1 Style» → «Modell 1»
        if (stil) neu = `Modell ${stil[1]}`;
        else if (MASS_EINHEIT_RE.test(w.trim())) neu = einheitNormal(w);
        else if (extra.wert?.[w]) neu = extra.wert[w];
        else if (!/[äöüß]/i.test(w) && /[a-z]/i.test(w)) unsicher.push({ option: ziel, wert: w });
      }
      wertMap.set(w, neu);
    }
    const eindeutig = new Set(wertMap.values());
    if (eindeutig.size !== wertMap.size) return { fehler: `Übersetzung macht Werte von «${o.name}» gleich` };
    return { name: ziel, art: o.art, quelle: o.i, werte: [...wertMap.values()], map: wertMap };
  });
  const bad = optionen.find(o => o.fehler);
  if (bad) return { ok: false, grund: bad.fehler };

  const varianten = zeilen.map(z => ({
    vid: z.vid,
    werte: Object.fromEntries(optionen.map(o => [o.name, o.map.get(z.werte[o.quelle])])),
  }));
  // Ein dünn besetztes Raster (z. B. 6 Modelle × 3 Inhalte, aber nur 6 echte Varianten) liesse die Kundin Kombinationen anklicken, die es nicht gibt.
  // Ab weniger als der Hälfte der möglichen Kombinationen: EINE Auswahl «A · B». Normale Raster (Farbe × Grösse mit wenigen Lücken) bleiben getrennt.
  const kombis = optionen.reduce((a, o) => a * o.werte.length, 1);
  if (optionen.length > 1 && varianten.length / kombis < 0.5) {
    const name = OPTIONSNAME.ausfuehrung;
    const liste = varianten.map(v => optionen.map(o => v.werte[o.name]).join(' · '));
    if (new Set(liste).size !== liste.length) return { ok: false, grund: 'zusammengefasste Werte nicht eindeutig' };
    return { ok: true, optionen: [{ name, art: 'ausfuehrung', werte: liste }], varianten: varianten.map((v, i) => ({ vid: v.vid, werte: { [name]: liste[i] } })), hinweise, unsicher, zusammengefasst: true };
  }
  return { ok: true, optionen: optionen.map(({ name, art, werte }) => ({ name, art, werte })), varianten, hinweise, unsicher };
}

/** Nächster Preis mit .90 am Ende, der mindestens x beträgt. */
export function aufrunden90(x) {
  const n = Math.floor(x + 1e-9);
  return Math.round((n + 0.9 >= x - 1e-9 ? n + 0.9 : n + 1.9) * 100) / 100;
}

/**
 * Preis je Variante. Der bisherige Preis ist die Untergrenze: eine Variante wird nie billiger als das,
 * was der Shop heute verlangt. Teurere CJ-Varianten bekommen den Aufschlag mit demselben Verhältnis
 * Preis/Kosten wie die heutige Variante.
 * Unbekannte Basiskosten → Einheitspreis (nie raten).
 */
export function preisFuer({ basisPreis, basisKostenChf, ekBasisUsd, ekUsd, usdChf = 0.82435 }) {
  const preis = Number(basisPreis);
  if (!Number.isFinite(preis) || preis <= 0) return { ok: false, grund: 'kein Basispreis' };
  const kosten0 = Number(basisKostenChf), ek0 = Number(ekBasisUsd), ek = Number(ekUsd);
  if (![kosten0, ek0, ek].every(Number.isFinite) || kosten0 <= 0) {
    return { ok: true, preis, kostenChf: Number.isFinite(kosten0) && kosten0 > 0 ? kosten0 : null, einheitspreis: true };
  }
  const aufschlagKosten = (ek - ek0) * usdChf;
  const kosten = Math.round((kosten0 + aufschlagKosten) * 100) / 100;
  if (aufschlagKosten <= 0.05) return { ok: true, preis, kostenChf: Math.max(kosten, 0), einheitspreis: false };
  const faktor = preis / kosten0;
  return { ok: true, preis: aufrunden90(preis + aufschlagKosten * faktor), kostenChf: kosten, einheitspreis: false };
}
