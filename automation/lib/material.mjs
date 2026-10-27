/**
 * Material einer Ware aus belegten Quellen lesen (Besitzer 27.10.2026: «Material zur Auswahl … und alle anderen auch nachtragen»).
 *
 * Wo es hingeht: Metafeld `mm-google-shopping.material` (dasselbe Feld füttert das Merchant-Center-Attribut «material»); der Theme-Block
 * `lux_spezifikationen` zeigt es als Zeile «Material» in «Spezifikationen & Details», sobald die Beschreibung keine eigene Zeile hat.
 *
 * REGEL: nichts erfinden. Ein Wert entsteht nur, wenn er WÖRTLICH in einer Quelle steht (Beschreibung der Seite oder CJ-Datenblatt) und
 * jedes Wort ein bekannter Stoffname ist. Alles andere (Marketingsätze, «Selbstklebender Sticker», mehrdeutige Doppelangaben) bleibt leer.
 * CJs grobes Feld `materialNameEn` («Metal», «Cloth», «Leather») wird NICHT benutzt: «Leather» deckt bei CJ auch PU-Leder, «Echtleder»
 * wäre dann falsch.
 */

// Stammwörter bekannter Stoffe (klein). Ein Teil gilt, wenn er eines davon enthält; kurze Kürzel nur als ganzes Wort.
const STAMM = ['kunststoff', 'plastik', 'metall', 'polyester', 'leder', 'denim', 'jeans', 'holz', 'baumwolle', 'strick', 'stein', 'glas', 'spitze',
  'leinen', 'fleece', 'nylon', 'seide', 'elastan', 'elasthan', 'edelstahl', 'stahl', 'aluminium', 'zink', 'silikon', 'keramik', 'papier', 'gummi',
  'kupfer', 'messing', 'titan', 'plüsch', 'samt', 'wolle', 'viskose', 'acryl', 'harz', 'porzellan', 'bambus', 'kork', 'filz', 'canvas', 'neopren',
  'silber', 'gold', 'kristall', 'strass', 'schaumstoff', 'mikrofaser', 'jersey', 'chiffon', 'satin', 'flanell', 'kaschmir', 'polyurethan',
  'polycarbonat', 'vinyl', 'jute', 'rattan', 'bronze', 'zinn', 'eisen', 'magnesium', 'carbon', 'karbon', 'baumwoll', 'tüll', 'organza', 'cord',
  'wildleder', 'veloursleder', 'mesh', 'lycra', 'rayon', 'modal', 'hanf', 'stroh', 'weide', 'marmor', 'granit', 'beton', 'zement', 'gips', 'wachs',
  'textil', 'stoff', 'gewebe', 'pelz', 'kunstfell', 'kunstpelz', 'federn', 'daunen', 'perlen', 'perle', 'emaille', 'kupferlegierung', 'legierung'];
const KURZ = new Set(['abs', 'pvc', 'pu', 'pe', 'pp', 'eva', 'tpu', 'tpe', 'pet', 'pc', 'pa', 'pmma', 'mdf', 'tpr']);
// Füllwörter, die vorne abgeschnitten werden dürfen (der Stoff selbst bleibt)
const VORSILBEN = /^(?:hochwertig(?:e|er|es|en)?|qualitativ(?:e|er|es|en)?|strapazierfähig(?:e|er|es|en)?|robust(?:e|er|es|en)?|weich(?:e|er|es|en)?|premium|schön(?:e|er|es|en)?)\s+/i;
// Wörter, die zeigen, dass ein Satz und kein Stoffname vorliegt
const SATZ = /\b(für|mit|ohne|dein|deine|ideal|perfekt|geeignet|selbstklebend\w*|verwendet|besteht|beschichtung für|hergestellt|tragen|schützt|zum|zur|und zwar)\b/i;

const norm = s => String(s || '').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&auml;/gi, 'ä').replace(/&ouml;/gi, 'ö').replace(/&uuml;/gi, 'ü')
  .replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&Uuml;/g, 'Ü').replace(/&szlig;/gi, 'ß').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ').trim();

export function htmlZuText(html) {
  const mitUmbruch = String(html || '').replace(/<(?:br|\/p|\/li|\/div|\/tr|\/h\d|\/td|\/th)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ');
  return mitUmbruch.split('\n').map(norm).filter(Boolean).join('\n');
}

const istStoff = t => {
  const k = t.toLowerCase();
  if (STAMM.some(s => k.includes(s))) return true;
  return k.split(/[\s\-/]+/).some(w => KURZ.has(w));
};

// Wörter ohne Stoffnamen, die in einer Stoffangabe stehen dürfen. Alles andere (z. B. «printing», «compound», «silk», «Hauptsächlich») verwirft die Angabe.
const FUELL = new Set(['reine', 'reiner', 'reines', 'reinen', 'recycelte', 'recycelter', 'recyceltes', 'recycelten', 'bio', 'öko', 'ökologische', 'ökologischer', 'ökologisches',
  'organische', 'organischer', 'organisches', 'gemischte', 'gemischter', 'gemischtes', 'mischung', 'mix', 'faser', 'fasern', 'oxford', 'dünne', 'dünner', 'dünnes', 'dicke', 'dicker',
  'dickes', 'gebürstete', 'gebürsteter', 'gebürstetes', 'matt', 'glänzend', 'transparente', 'transparenter', 'transparentes', 'massive', 'massiver', 'massives', 'synthetische',
  'synthetischer', 'synthetisches', 'synthetik', 'mikro', 'hartes', 'weiches']);
// Kürzel: mehrdeutige werden ausgeschrieben («PC» heisst auf einer deutschen Seite Computer), die übrigen gross geschrieben
const KURZ_VOLL = { pc: 'Polycarbonat', pp: 'Polypropylen', pe: 'Polyethylen', pa: 'Polyamid' };
const SYNONYM = { lycra: 'Elastan', spandex: 'Elastan', elasthan: 'Elastan', elastane: 'Elastan' };
const OBERBEGRIFF = new Set(['stoff', 'stoffe', 'textil', 'textilien', 'gewebe', 'material', 'materialien']);
const wortOk = w => STAMM.some(x => w.includes(x)) || KURZ.has(w) || FUELL.has(w) || /^\d+(?:er)?$/.test(w);

/** Ein einzelner Teil («Polyester», «100 % Baumwolle», «hochwertige Aluminiumlegierung») → gereinigt oder null. */
export function teil(roh) {
  let t = norm(roh).replace(/[.;:!]+$/, '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
  t = t.replace(/^\d{1,3}(?:[.,]\d+)?\s*%\s*/, '');          // «100 % Baumwolle» → «Baumwolle» (der Anteil steht nur bei einem Stoff sicher)
  for (let i = 0; i < 3; i++) t = t.replace(VORSILBEN, '');
  t = t.replace(/^echtes?\s+leder$/i, 'Echtleder').replace(/^echt\s?leder$/i, 'Echtleder').replace(/^pu\s*leder$/i, 'PU-Leder');
  if (!t || t.length > 40 || /\d{3,}/.test(t) && !/925|999|750|585/.test(t)) return null;
  if (SATZ.test(t) || t.split(' ').length > 4) return null;
  const k = t.toLowerCase();
  if (SYNONYM[k]) return SYNONYM[k];
  if (OBERBEGRIFF.has(k)) return null;
  if (/^pu[- ]/i.test(t) && !/^pu[- ]?(leder|kunstleder|schaum)/i.test(t)) return null;   // «PU-Leichtmetall» ist Unsinn
  if (!istStoff(t)) return null;
  if (!t.toLowerCase().split(/[\s\-/]+/).filter(Boolean).every(wortOk)) return null;      // jedes Wort ein Stoffwort oder Füllwort
  t = t.replace(/\b(pc|pp|pe|pa)\b/gi, m => KURZ_VOLL[m.toLowerCase()]).replace(/\b(abs|pvc|eva|tpu|tpe|pet|pmma|mdf|tpr|pu)\b/gi, m => m.toUpperCase());
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** «Polyester, Strick» / «Edelstahl und Silikon» / «Metall/Glas» → «Polyester, Strick» (höchstens 4 Teile) oder null, wenn auch nur ein Teil kein Stoff ist. */
export function bereinige(roh) {
  let s = norm(roh);
  // Klammern: steht darin ein Stoffwort («Denim (Polyester-Zusammensetzung)»), ist die Angabe nicht eindeutig → verwerfen; sonst («Dacron») weglassen
  for (const m of s.matchAll(/\(([^)]*)\)/g)) if (istStoff(m[1])) return null;
  s = s.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (!s || s.length > 80) return null;
  const teile = s.split(/\s*(?:[,;/&+]|\bund\b|\bsowie\b|\boder\b)\s*/i).map(x => x.trim()).filter(Boolean);
  if (!teile.length || teile.length > 4) return null;
  const aus = [];
  for (const t of teile) { const w = teil(t); if (!w) return null; if (!aus.some(a => a.toLowerCase() === w.toLowerCase())) aus.push(w); }
  return aus.join(', ');
}

// Zeilen, die nur einen TEIL des Produkts beschreiben oder eine Zusammensetzung angeben, ergeben keinen Gesamtwert
const TEILWORT = /\b(futter|sohle|obermaterial|hauptstoff|hauptsächlich|überwiegend|vorwiegend|gehäuse|armband|rahmen|griff|fassung|verschluss|innen\w*|aussen\w*|außen\w*|zusammensetzung|beschichtung|oberfläche|einlage|polster\w*|lining|sole|upper|main|case|strap|frame|handle|coating|insert|inner|outer|shell|body|surface|composition)\b/i;

const ZEILE = /(?:^|\n)\s*(?:[•·\-–*]\s*)?(?:\p{Extended_Pictographic}\s*)?(?:Material(?:ien)?|Material\s*\(?Hersteller\)?)\s*[:：]\s*([^\n]{2,120})/giu;

/**
 * Material aus Beschreibung (HTML oder Text). Nimmt «Material: X»-Zeilen. Zwei verschiedene Werte → null (mehrdeutig).
 * @returns {{wert:string, quelle:string}|{ungeklaert:string}|null}
 */
export function materialAusText(html) {
  const text = htmlZuText(html);
  const werte = new Map(); let roh = '';
  for (const m of text.matchAll(ZEILE)) {
    roh = roh || m[1].trim();
    if (TEILWORT.test(m[1])) { roh = 'Teilangabe: ' + m[1].trim(); continue; }
    const w = bereinige(m[1]);
    if (w) werte.set(w.toLowerCase(), w);
  }
  if (werte.size === 1) return { wert: [...werte.values()][0], quelle: 'beschreibung' };
  if (werte.size > 1) return { ungeklaert: 'mehrdeutig: ' + [...werte.values()].join(' | ') };
  return roh ? { ungeklaert: 'kein Stoffname: ' + roh.slice(0, 60) } : null;
}

// Englische CJ-Angaben → deutsch. Unbekanntes Wort = Angabe verwerfen.
const EN = { alloy: 'Legierung', 'zinc alloy': 'Zinklegierung', 'aluminum alloy': 'Aluminiumlegierung', 'aluminium alloy': 'Aluminiumlegierung', aluminum: 'Aluminium', aluminium: 'Aluminium',
  'stainless steel': 'Edelstahl', steel: 'Stahl', 'titanium steel': 'Titanstahl', titanium: 'Titan', copper: 'Kupfer', brass: 'Messing', bronze: 'Bronze', iron: 'Eisen', metal: 'Metall',
  silver: 'Silber', '925 silver': '925er Silber', 'sterling silver': 'Sterlingsilber', gold: 'Gold', plastic: 'Kunststoff', abs: 'ABS', pvc: 'PVC', pu: 'PU', tpu: 'TPU', silicone: 'Silikon',
  silica: 'Silikon', rubber: 'Gummi', resin: 'Kunstharz', acrylic: 'Acryl', wood: 'Holz', bamboo: 'Bambus', cork: 'Kork', glass: 'Glas', crystal: 'Kristall', ceramic: 'Keramik',
  porcelain: 'Porzellan', stone: 'Stein', marble: 'Marmor', paper: 'Papier', cotton: 'Baumwolle', 'pure cotton': 'Baumwolle', linen: 'Leinen', silk: 'Seide', wool: 'Wolle', cashmere: 'Kaschmir',
  polyester: 'Polyester', nylon: 'Nylon', spandex: 'Elastan', elastane: 'Elastan', lycra: 'Elastan', viscose: 'Viskose', rayon: 'Viskose', velvet: 'Samt', flannel: 'Flanell', fleece: 'Fleece',
  denim: 'Denim', canvas: 'Canvas', mesh: 'Mesh', lace: 'Spitze', chiffon: 'Chiffon', satin: 'Satin', plush: 'Plüsch', felt: 'Filz', neoprene: 'Neopren', foam: 'Schaumstoff', sponge: 'Schwamm',
  'pu leather': 'PU-Leder', 'faux leather': 'Kunstleder', 'artificial leather': 'Kunstleder', 'genuine leather': 'Echtleder', 'real leather': 'Echtleder', cowhide: 'Rindsleder', suede: 'Wildleder',
  microfiber: 'Mikrofaser', 'microfibre': 'Mikrofaser', jute: 'Jute', rattan: 'Rattan', straw: 'Stroh', hemp: 'Hanf', pearl: 'Perle', pearls: 'Perlen', rhinestone: 'Strass', rhinestones: 'Strass',
  carbon: 'Carbon', 'carbon fiber': 'Carbon', 'carbon fibre': 'Carbon', kraft: 'Kraftpapier', 'kraft paper': 'Kraftpapier', polycarbonate: 'Polycarbonat', vinyl: 'Vinyl', stainless: 'Edelstahl', 'stainless steel': 'Edelstahl', 'cloth': null, others: null, other: null };

export function enZuDe(roh) {
  const s = norm(roh).toLowerCase().replace(/[.;]+$/, '').replace(/\b(high[- ]quality|premium|quality|soft|durable|environmentally friendly|eco[- ]friendly)\b/g, '').replace(/\s+/g, ' ').trim();
  if (!s || s.length > 80) return null;
  const teile = s.split(/\s*(?:[,;/&+]|\band\b|\bor\b)\s*/).map(x => x.trim()).filter(Boolean);
  if (!teile.length || teile.length > 4) return null;
  const aus = [];
  for (const t of teile) {
    const m = /^(?:(\d{1,3}(?:\.\d+)?)\s*%\s*)?(.+)$/.exec(t); const w = m && EN[m[2].trim()];
    if (!w) return null; if (!aus.includes(w)) aus.push(w);
  }
  return aus.join(', ');
}

/**
 * Material aus dem CJ-Datenblatt (Beschreibungstext, Zeile «Material: …» oder «Material | …» aus Eigenschaftstabellen, englisch).
 * @param {{description?:string, productPro?:string, productProEn?:string}} cj
 */
export function materialAusCj(cj) {
  const text = htmlZuText([cj?.description, cj?.productProEn, cj?.productPro].filter(Boolean).join('\n'));
  const werte = new Map(); let roh = '';
  for (const m of text.matchAll(/(?:^|\n)\s*(?:[•·\-–*]\s*)?(?:Materials?|Material\s*\(?supplier\)?|Main material|Fabric|Composition)\s*[:：|]\s*([^\n]{2,100})/gi)) {
    roh = roh || m[1].trim();
    if (TEILWORT.test(m[1])) { roh = 'Teilangabe: ' + m[1].trim(); continue; }
    const w = enZuDe(m[1]);   // CJ-Datenblätter sind englisch: nur Wörter aus dem Wörterbuch, kein Raten
    if (w) werte.set(w.toLowerCase(), w);
  }
  if (werte.size === 1) return { wert: [...werte.values()][0], quelle: 'cj-datenblatt' };
  if (werte.size > 1) return { ungeklaert: 'mehrdeutig: ' + [...werte.values()].join(' | ') };
  return roh ? { ungeklaert: 'kein Stoffname: ' + roh.slice(0, 60) } : null;
}

/** Zeigt die Seite schon ein Material? (Detailzeile in der Beschreibung, Option «Material» oder Metafeld) */
export function hatMaterial({ descriptionHtml, optionen, metafeld }) {
  if (String(metafeld || '').trim()) return 'metafeld';
  if ((optionen || []).some(o => /^material/i.test(o?.name || o))) return 'option';
  if (/<li>\s*<strong>\s*Material(?:ien)?\s*:?\s*<\/strong>/i.test(descriptionHtml || '')) return 'detailblock';
  return null;
}

const KUNSTLEDER = /\b(pu[- ]?leder|pu[- ]?kunstleder|kunstleder|lederimitat|imitat|veganes? leder|faux|synthetik|pvc[- ]?leder)\b/i;
/**
 * CJ schreibt «Leather» auch für Kunstleder. Übersetzt wird deshalb nur mit Beleg: nennt Titel/Text/Datenblatt Kunstleder oder PU → so;
 * nennt eine Quelle «Leder» ohne Kunstleder-Hinweis → «Leder»; sonst null (Wert bleibt, wie er ist).
 */
export function lederWert({ titel, descriptionHtml, cj }) {
  const alles = [titel, htmlZuText(descriptionHtml), cj?.description, cj?.productNameEn].filter(Boolean).join(' ');
  if (/\bpu[- ]?leder\b|\bpu[- ]?kunstleder\b/i.test(alles) || /\bpu leather\b/i.test(alles)) return 'PU-Leder';
  if (/\bkunstleder\b|\blederimitat\b|\bfaux leather\b|\bimitat\w*\b|\bartificial leather\b|\bvegan\w* leder\b/i.test(alles)) return 'Kunstleder';
  if (/\b(?:echt|rinds|schafs|ziegen|kuh|wild|nappa)?leder\b/i.test(alles) && !/\bpu\b/i.test(alles)) return 'Leder';
  return null;
}

// Bei Uhren und elektrischen Geräten meint «Material:» meist nur Gehäuse, Armband oder Stab/Beschichtung, nicht das ganze Produkt
const UHR = /(uhr|smartwatch)/i;
const GERAET = /(stab\b|bürste|massag|glätter|haartrockner|rasierer|trimmer|lockenwickler|haarstyler|kamera|ladegerät|ladestation|lautsprecher|kopfhörer|drohne|controller|power ?bank|ladekabel|adapter|display|lampe|föhn|fön\b|epilier|elektr)/i;
const GERAET_WERT = /^(metall|keramik|legierung|aluminium|edelstahl|stahl|eisen|zinklegierung|aluminiumlegierung)$/i;
// Stoffwörter, die ein Titel nennen darf; Wert und Titel müssen mindestens eines davon teilen
const TITEL_STOFF = ['steinzeug', 'porzellan', 'keramik', 'silikon', 'leder', 'holz', 'edelstahl', 'glas', 'baumwoll', 'leinen', 'seide', 'wolle', 'bambus', 'kupfer', 'messing', 'titan',
  'acryl', 'samt', 'denim', 'fleece', 'plüsch', 'nylon', 'polyester', 'kunststoff', 'gummi', 'aluminium', 'marmor', 'filz'];
export function titelKonflikt(titel, wert) {
  const t = String(titel || '').toLowerCase(), w = String(wert || '').toLowerCase();
  const imTitel = TITEL_STOFF.filter(x => t.includes(x));
  return imTitel.length > 0 && !imTitel.some(x => w.includes(x));
}
/** Letzte Sperre vor dem Schreiben: Wert, der mehr verspricht, als die übrigen Quellen hergeben, bleibt weg. `uebersetzung`: nur die Sprache ändert sich, der Wert stand schon da. */
export function pruefeWert(wert, { descriptionHtml, titel, cj }, { uebersetzung = false } = {}) {
  if (/^pu$/i.test(wert) || /^pu,|, ?pu$/i.test(wert)) return 'alleinstehendes «PU» ist mehrdeutig (Polyurethan oder PU-Leder)';
  if (/(^|, )(echtleder|rindsleder|leder|wildleder)(,|$)/i.test(wert)) {
    const alles = [titel, htmlZuText(descriptionHtml), cj?.description, cj?.productNameEn].filter(Boolean).join(' ');
    if (KUNSTLEDER.test(alles)) return 'Leder, aber Quellen nennen auch Kunstleder/PU';
  }
  if (!uebersetzung) {
    if (UHR.test(titel || '')) return 'Uhr: die Angabe betrifft meist nur Gehäuse oder Armband';
    if (GERAET.test(titel || '') && GERAET_WERT.test(wert)) return 'Gerät: «' + wert + '» betrifft meist nur ein Teil';
    if (titelKonflikt(titel, wert)) return 'Titel nennt einen anderen Stoff als der Wert';
  }
  return null;
}

/** Entscheidung je Produkt. Reihenfolge: schon vorhanden → Seitentext → CJ-Datenblatt. */
export function entscheide({ descriptionHtml, optionen, metafeld, cj, titel }) {
  const da = hatMaterial({ descriptionHtml, optionen, metafeld });
  if (da) return { tun: false, grund: 'schon-da:' + da };
  const frei = (w, quelle) => { const sperre = pruefeWert(w, { descriptionHtml, titel, cj }); return sperre ? { tun: false, grund: 'sperre:' + sperre } : { tun: true, wert: w, quelle }; };
  const t = materialAusText(descriptionHtml);
  if (t?.wert) return frei(t.wert, t.quelle);
  if (cj) { const c = materialAusCj(cj); if (c?.wert) return frei(c.wert, c.quelle); if (c?.ungeklaert) return { tun: false, grund: 'cj:' + c.ungeklaert }; }
  if (t?.ungeklaert) return { tun: false, grund: 'text:' + t.ungeklaert };
  return { tun: false, grund: 'keine-quelle' };
}
