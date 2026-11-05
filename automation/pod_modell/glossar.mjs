/**
 * Glossar der «Modell-Fabrik» (Selbst gestalten, 05.11.2026): deutsche Titel, Handles, Farbnamen und die Rangfolge der Farben.
 * Rein: kein Netz, keine Dateien, kein Zufall. Gleiche Eingabe = gleiche Ausgabe.
 *
 * GRUNDSATZ (wie im ganzen Repo): Unbekanntes bleibt UNBEKANNT. Ein Wort, das nicht im Glossar steht, wird NICHT geraten, sondern als `unbekannt`
 * gemeldet; das Tor «titel_uebersetzt» sperrt dann das Anlegen, bis das Glossar oder `TITEL_FEST` ergänzt ist.
 *
 * Titel: «<Zielgruppe> <Eigenschaften> <Typ> selbst gestalten» (das Muster der heutigen Produkte, z. B. «Kiss-Cut Aufkleber selbst gestalten»).
 *   - Der Teil vor « | » ist der Handelsname des Herstellers («Unisex Staple T-Shirt | Bella + Canvas 3001»): der Teil dahinter und jede Fremdmarke entfallen.
 *   - Adjektive vor dem Nomen werden nach dem Geschlecht des Nomens gebeugt (Nominativ ohne Artikel: m -er, f -e, n -es); Fremdwörter bleiben unverändert (Premium, Eco).
 *   - `TITEL_FEST` (Printful-Nummer → Titel) hat Vorrang, wo die Regel kein gutes Deutsch ergäbe («Closed-Back Structured Cap»).
 */
import { umrechneText, ozArt } from '../../dropship/selbst-gestalten-fertig-0511/werkzeuge/schweizer_masse.mjs';

export const GLOSSAR_VERSION = '2026-11-05.1';
export const SUFFIX = 'selbst gestalten';
/** Längster erlaubter Handle: die Feed-ID des Google-Schaufensters ist der Handle, Googles ID-Grenze liegt bei 50 Zeichen (dropship/CODEX-FUNDE-2810.md). */
export const HANDLE_MAX = 50;

// ─────────────────────────────────────────────────────────────── Marken
/** Fremdhersteller, die nicht im Titel stehen dürfen (Kleinschreibung; als ganze Wörter geprüft). */
export const FREMDMARKEN = Object.freeze([
  'bella', 'canvas', 'bella + canvas', 'bella canvas', 'gildan', 'champion', 'adidas', 'under armour', 'nike', 'yupoong', 'otto cap', 'otto', 'flexfit', 'stanley/stella', 'stanley', 'stella',
  "sol's", 'sols', 'as colour', 'comfort colors', 'lane seven', 'cotton heritage', 'independent trading co.', 'independent trading', 'port authority', 'richardson', 'beechfield', 'atlantis',
  'econscious', 'mantis', 'liberty bags', 'newhattan', 'printstar', 'united athle', 'awdis', 'jerzees', 'hanes', 'fruit of the loom', 'next level', 'anvil', 'russell', 'sportsman',
  'valucap', 'imabari', 'big accessories', 'greentex', 'apple', 'samsung', 'galaxy', 'pixel', 'google', 'iphone', 'airpods', 'magsafe', 'huawei', 'xiaomi', 'oneplus', 'sony', 'disney',
]);
/** Gerätenamen, die bei Handyhüllen NÖTIG sind (sie sagen, wozu die Hülle passt). */
export const MARKEN_NOETIG = Object.freeze({ 'PHONE-CASE': ['iphone', 'airpods', 'magsafe', 'samsung', 'galaxy', 'pixel', 'google', 'apple'] });

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Fremdmarken, die in `text` vorkommen (ganze Wörter, ohne die für diesen Typ nötigen Gerätenamen). */
export function fremdmarkenIn(text, typ = '') {
  const erlaubt = new Set(MARKEN_NOETIG[String(typ).toUpperCase()] || []);
  const t = ` ${String(text || '').toLowerCase()} `;
  const gef = [];
  for (const m of FREMDMARKEN) {
    if (erlaubt.has(m)) continue;
    if (new RegExp(`(^|[^a-zäöüß0-9])${esc(m)}(?![a-zäöüß0-9])`, 'i').test(t) && !gef.includes(m)) gef.push(m);
  }
  // «bella + canvas» enthält «bella» und «canvas»: nur die längste Fassung melden. «canvas» allein ist eine Leinwand, keine Marke → nur melden, wenn «bella» dabei ist.
  const ohneCanvas = gef.filter((m) => !(m === 'canvas' && !gef.includes('bella') && !gef.includes('bella + canvas') && !gef.includes('bella canvas')));
  return ohneCanvas.filter((m) => !ohneCanvas.some((o) => o !== m && o.length > m.length && o.includes(m)));
}

// ─────────────────────────────────────────────────────────────── Nomen, Adjektive, Zielgruppe
/** Nomen (auch Zusammensetzungen): Schlüssel in Kleinschreibung, Englisch → {de, g (m/f/n), art}. Längste Treffer zuerst. */
export const NOMEN = Object.freeze({
  't-shirt': { de: 'T-Shirt', g: 'n' }, 'tee': { de: 'T-Shirt', g: 'n' }, 'shirt': { de: 'Shirt', g: 'n' }, 'long sleeve tee': { de: 'Langarmshirt', g: 'n' },
  'tank top': { de: 'Tanktop', g: 'n' }, 'tank': { de: 'Tanktop', g: 'n' }, 'hoodie': { de: 'Hoodie', g: 'm' }, 'sweatshirt': { de: 'Sweatshirt', g: 'n' }, 'zip hoodie': { de: 'Hoodie mit Reissverschluss', g: 'm' },
  'mug': { de: 'Tasse', g: 'f' }, 'tumbler': { de: 'Trinkbecher', g: 'm' }, 'bottle': { de: 'Trinkflasche', g: 'f' },
  'poster': { de: 'Poster', g: 'n' }, 'framed poster': { de: 'Poster mit Rahmen', g: 'n' }, 'canvas': { de: 'Leinwand', g: 'f' },
  'cap': { de: 'Cap', g: 'f' }, 'hat': { de: 'Hut', g: 'm' }, 'beanie': { de: 'Mütze', g: 'f' }, 'bucket hat': { de: 'Fischerhut', g: 'm' }, 'dad hat': { de: 'Dad-Cap', g: 'f' }, 'baseball cap': { de: 'Baseball-Cap', g: 'f' }, 'trucker cap': { de: 'Trucker-Cap', g: 'f' },
  'case': { de: 'Hülle', g: 'f' }, 'pillow': { de: 'Kissen', g: 'n' }, 'pillow case': { de: 'Kissenbezug', g: 'm' },
  'tote': { de: 'Tragetasche', g: 'f' }, 'tote bag': { de: 'Tragetasche', g: 'f' }, 'bag': { de: 'Tasche', g: 'f' }, 'backpack': { de: 'Rucksack', g: 'm' }, 'drawstring bag': { de: 'Turnbeutel', g: 'm' },
  'sticker': { de: 'Aufkleber', g: 'm' }, 'stickers': { de: 'Aufkleber', g: 'pl' }, 'sticker sheet': { de: 'Aufkleberbogen', g: 'm' }, 'stickers sheet': { de: 'Aufkleberbogen', g: 'm' },
  'blanket': { de: 'Decke', g: 'f' }, 'sherpa blanket': { de: 'Sherpa-Decke', g: 'f' }, 'throw blanket': { de: 'Wohndecke', g: 'f' }, 'towel': { de: 'Handtuch', g: 'n' }, 'apron': { de: 'Schürze', g: 'f' },
  'mouse pad': { de: 'Mauspad', g: 'n' }, 'coaster': { de: 'Untersetzer', g: 'm' }, 'puzzle': { de: 'Puzzle', g: 'n' }, 'jigsaw puzzle': { de: 'Puzzle', g: 'n' }, 'flag': { de: 'Fahne', g: 'f' },
  'leggings': { de: 'Leggings', g: 'pl' }, 'dress': { de: 'Kleid', g: 'n' }, 'bodycon dress': { de: 'Bodycon-Kleid', g: 'n' }, 'crop top': { de: 'Crop-Top', g: 'n' }, 'top': { de: 'Top', g: 'n' }, 'shorts': { de: 'Shorts', g: 'pl' },
  'sweatpants': { de: 'Jogginghose', g: 'f' }, 'joggers': { de: 'Jogginghose', g: 'f' }, 'pants': { de: 'Hose', g: 'f' }, 'swimsuit': { de: 'Badeanzug', g: 'm' }, 'bodysuit': { de: 'Body', g: 'm' }, 'one piece': { de: 'Body', g: 'm' },
  'pullover': { de: 'Pullover', g: 'm' }, 'sweater': { de: 'Pullover', g: 'm' }, 'cardigan': { de: 'Strickjacke', g: 'f' }, 'vest': { de: 'Weste', g: 'f' }, 'polo': { de: 'Poloshirt', g: 'n' }, 'jacket': { de: 'Jacke', g: 'f' },
  'letterman jacket': { de: 'College-Jacke', g: 'f' }, 'windbreaker': { de: 'Windjacke', g: 'f' }, 'anorak': { de: 'Anorak', g: 'm' }, 'socks': { de: 'Socken', g: 'pl' }, 'flip flops': { de: 'Flip-Flops', g: 'pl' },
  'headband': { de: 'Stirnband', g: 'n' }, 'bandana': { de: 'Bandana', g: 'n' }, 'neck gaiter': { de: 'Schlauchschal', g: 'm' }, 'snapback': { de: 'Snapback-Cap', g: 'f' }, 'jersey': { de: 'Trikot', g: 'n' },
  'glass': { de: 'Glas', g: 'n' }, 'pint glass': { de: 'Pintglas', g: 'n' }, 'wine glass': { de: 'Weinglas', g: 'n' }, 'rocks glass': { de: 'Whiskyglas', g: 'n' },
  'yoga mat': { de: 'Yogamatte', g: 'f' }, 'bath mat': { de: 'Badematte', g: 'f' }, 'desk mat': { de: 'Schreibtischunterlage', g: 'f' }, 'pet feeding mat': { de: 'Futtermatte', g: 'f' }, 'pet bowl': { de: 'Futternapf', g: 'm' }, 'pet collar': { de: 'Halsband', g: 'n' },
  'shower curtain': { de: 'Duschvorhang', g: 'm' }, 'table runner': { de: 'Tischläufer', g: 'm' }, 'can cooler': { de: 'Dosenkühler', g: 'm' }, 'wall clock': { de: 'Wanduhr', g: 'f' }, 'area rug': { de: 'Teppich', g: 'm' },
  'comforter': { de: 'Bettdecke', g: 'f' }, 'duvet cover': { de: 'Bettbezug', g: 'm' }, 'wall tapestry': { de: 'Wandteppich', g: 'm' }, 'tapestry': { de: 'Wandteppich', g: 'm' }, 'tablecloths': { de: 'Tischdecken', g: 'pl' },
  'napkins': { de: 'Servietten', g: 'pl' }, 'placemat': { de: 'Tischset', g: 'n' }, 'suitcase': { de: 'Koffer', g: 'm' }, 'luggage tag': { de: 'Kofferanhänger', g: 'm' }, 'license plate frame': { de: 'Nummernschildrahmen', g: 'm' },
  'postcard': { de: 'Postkarte', g: 'f' }, 'greeting card': { de: 'Grusskarte', g: 'f' }, 'journal': { de: 'Notizbuch', g: 'n' }, 'note pads': { de: 'Notizblöcke', g: 'pl' }, 'playing cards': { de: 'Spielkarten', g: 'pl' },
  'business cards': { de: 'Visitenkarten', g: 'pl' }, 'gift wrap papers': { de: 'Geschenkpapier', g: 'n' }, 'wrapping papers': { de: 'Geschenkpapier', g: 'n' }, 'car magnets': { de: 'Auto-Magnete', g: 'pl' }, 'decals': { de: 'Aufkleber', g: 'pl' },
  'candle': { de: 'Kerze', g: 'f' }, 'magnet': { de: 'Magnet', g: 'm' }, 'ornament': { de: 'Anhänger', g: 'm' }, 'ornaments': { de: 'Anhänger', g: 'm' }, 'notebook': { de: 'Notizbuch', g: 'n' },
});
/** Adjektive und Eigenschaften: {de, var} (var = unveränderlich, Fremdwort) oder {drop:true} (Handelsname, Technik, nichts für Kunden). */
export const ADJ = Object.freeze({
  large: { de: 'gross' }, small: { de: 'klein' }, thin: { de: 'dünn' }, thick: { de: 'dick' }, long: { de: 'lang' }, short: { de: 'kurz' }, heavy: { de: 'schwer' }, lightweight: { de: 'leicht' }, light: { de: 'leicht' },
  structured: { de: 'strukturiert' }, unstructured: { de: 'unstrukturiert' }, slim: { de: 'schlank' }, classic: { de: 'klassisch' }, matte: { de: 'matt' }, glossy: { de: 'glänzend' }, recycled: { de: 'recycelt' },
  premium: { de: 'Premium', var: true }, vintage: { de: 'Vintage', var: true }, retro: { de: 'Retro', var: true }, eco: { de: 'Eco', var: true }, organic: { de: 'Bio', var: true }, basic: { de: 'Basic', var: true },
  cropped: { de: 'Cropped', var: true }, oversized: { de: 'Oversize', var: true }, relaxed: { de: 'Relaxed', var: true }, 'kiss-cut': { de: 'Kiss-Cut', var: true }, 'all-over': { de: 'Allover', var: true },
  white: { de: 'weiss' }, black: { de: 'schwarz' }, grey: { de: 'grau' }, red: { de: 'rot' }, blue: { de: 'blau' },
  ceramic: { de: 'Keramik', var: true, praefix: true }, 'stainless': { de: 'Edelstahl', var: true, praefix: true }, snap: { de: 'Snap', var: true }, sherpa: { de: 'Sherpa', var: true }, holographic: { de: 'holografisch' },
  // Handelsnamen und Technikwörter der Hersteller: für Kunden ohne Aussage, darum weggelassen
  heavyweight: { de: 'Heavyweight', var: true }, 'garment-dyed': { de: 'stückgefärbt' }, 'pigment-dyed': { de: 'pigmentgefärbt' }, knitted: { de: 'gestrickt' }, knit: { de: 'gestrickt' }, fleece: { de: 'Fleece', var: true, praefix: true },
  cotton: { de: 'Baumwoll', var: true, praefix: true }, raglan: { de: 'Raglan', var: true }, 'french-terry': { de: 'French Terry', var: true }, rundhals: { de: 'Rundhals', var: true }, 'v-ausschnitt': { de: 'V-Ausschnitt', var: true }, rollkragen: { de: 'Rollkragen', var: true },
  'quarter-zip': { de: 'Quarter-Zip', var: true }, 'half-zip': { de: 'Half-Zip', var: true }, langarm: { de: 'Langarm', var: true }, kurzarm: { de: 'Kurzarm', var: true }, embroidered: { de: 'bestickt' }, ribbed: { de: 'gerippt' }, denim: { de: 'Denim', var: true },
  urban: { de: 'Urban', var: true }, luxe: { de: 'Luxe', var: true }, sports: { de: 'Sport', var: true, praefix: true }, christmas: { de: 'Weihnachts', var: true, praefix: true }, pet: { de: 'Haustier', var: true, praefix: true }, hardcover: { de: 'Hardcover', var: true },
  vinyl: { de: 'Vinyl', var: true, praefix: true }, clear: { de: 'transparent' }, hooded: { de: 'Kapuzen', var: true, praefix: true }, fit: { drop: true }, metal: { de: 'Metall', var: true, praefix: true },
  staple: { drop: true }, sublimated: { drop: true }, enhanced: { drop: true }, print: { drop: true }, blend: { drop: true },
});
/** Zielgruppe (Unveränderlich, steht vor allem anderen). */
export const ZIELGRUPPE = Object.freeze({ unisex: 'Unisex', "women's": 'Damen', womens: 'Damen', women: 'Damen', "men's": 'Herren', mens: 'Herren', men: 'Herren', kids: 'Kinder', "kids'": 'Kinder', youth: 'Jugend', baby: 'Baby', toddler: 'Kleinkind' });
/** Teile in Klammern, die nur eine Einheit des Herstellers nennen (zählen für Kunden nicht). */
const EINHEIT_KLAMMER = /^\((in|cm|mm|inch|inches)\)$/i;
/** Wörter, die als Phrase vor den Einzelwörtern gelten (Kleinschreibung). Werte: 'drop' oder ein Schlüssel von NOMEN/ADJ. */
const PHRASEN = Object.freeze({
  'heavy blend': 'drop', 'all-over print': 'all-over', 'stainless steel': 'stainless', 'long sleeve': 'langarm', 'short sleeve': 'kurzarm', 'crew neck': 'rundhals', crewneck: 'rundhals', 'v-neck': 'v-ausschnitt', 'v neck': 'v-ausschnitt',
  'turtle neck': 'rollkragen', 'quarter zip': 'quarter-zip', 'quarter-zip': 'quarter-zip', 'half zip': 'half-zip', 'french terry': 'french-terry', 'garment dye': 'garment-dyed', 'classic fit': 'classic', 'relaxed fit': 'relaxed',
});

/** Gängige Fälle, bei denen die Regel schlechtes Deutsch ergäbe: Printful-Nummer → Titel OHNE den Zusatz «selbst gestalten». Jeder Eintrag ist von Hand geprüft. */
export const TITEL_FEST = Object.freeze({
  403: { titel: 'Keramik-Tasse mit farbiger Innenseite', slug: 'keramik-tasse-farbige-innenseite' },     // der Handle darf höchstens 50 Zeichen haben
  1: 'Poster auf mattem Papier',
  140: { titel: 'Strukturierte Cap mit geschlossener Rückseite', slug: 'strukturierte-cap-geschlossen' },
  683: 'Snap-Hülle für iPhone',
  214: 'Premium Kissen mit Allover-Druck',
});

const gross1 = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const ENDUNG = { m: 'er', f: 'e', n: 'es', pl: 'e' };

/**
 * Deutscher Titel (ohne «selbst gestalten») aus dem englischen Katalogtitel.
 * @param {{printfulProductId?:number, titelEn:string, marke?:string|null, typ?:string}} k
 * @returns {{titel:string|null, quelle:'fest'|'glossar', unbekannt:string[], entferntMarken:string[], masse:string|null}}
 */
export function titelDe(k) {
  const id = k.printfulProductId;
  if (id != null && TITEL_FEST[id]) { const f = TITEL_FEST[id]; return { titel: typeof f === 'string' ? f : f.titel, slugFest: typeof f === 'string' ? null : f.slug, quelle: 'fest', unbekannt: [], entferntMarken: [], masse: null }; }
  let s = String(k.titelEn ?? '').replace(/[’‘`´]/g, "'").split('|')[0].trim();
  const entfernt = [];
  if (k.marke) { const re = new RegExp(`(^|\\s)${esc(String(k.marke))}(?=\\s|$)`, 'gi'); if (re.test(s)) { entfernt.push(String(k.marke).toLowerCase()); s = s.replace(re, ' '); } }
  for (const m of fremdmarkenIn(s, k.typ)) { entfernt.push(m); s = s.replace(new RegExp(`(^|[^A-Za-z0-9])${esc(m)}(?![A-Za-z0-9])`, 'gi'), ' '); }
  s = umrechneText(s, { ozArt: ozArt({ typ: k.typ, titel: s }) }).text;
  const woerter = s.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).filter((w) => !EINHEIT_KLAMMER.test(w));
  const zg = [], adj = [], nach = [], unbekannt = [];
  let nomen = null, masse = null;
  for (let i = 0; i < woerter.length;) {
    // Phrase aus bis zu drei Wörtern, längste zuerst
    let treffer = null;
    for (let n = Math.min(3, woerter.length - i); n >= 1 && !treffer; n--) {
      const ph = woerter.slice(i, i + n).join(' ').replace(/[,;:]+$/, '').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(PHRASEN, ph)) treffer = { n, art: PHRASEN[ph] === 'drop' ? 'drop' : PHRASEN[ph], ph };
      else if (NOMEN[ph]) treffer = { n, art: 'nomen', ph };
      else if (n === 1 && (ADJ[ph] || ZIELGRUPPE[ph])) treffer = { n, art: 'wort', ph };
    }
    const w = woerter[i].replace(/[,;:]+$/, '');
    const wl = w.toLowerCase();
    if (!treffer) {
      if (/^\d+([.,]\d+)?$/.test(w) && woerter[i + 1] && /^(g|kg|ml|l|cm|mm)\.?$/i.test(woerter[i + 1])) { masse = `${w} ${woerter[i + 1].replace(/\.$/, '')}`; i += 2; continue; }
      if (wl === 'for' || wl === 'für') { const rest = woerter.slice(i + 1).join(' '); const m = fremdmarkenIn(rest, k.typ); const erlaubt = MARKEN_NOETIG[String(k.typ).toUpperCase()] || []; if (rest && erlaubt.some((e) => rest.toLowerCase().includes(e)) && m.length === 0) nach.push(`für ${rest}`); else unbekannt.push(woerter.slice(i).join(' ')); break; }
      unbekannt.push(w); i++; continue;
    }
    if (treffer.art === 'drop') { i += treffer.n; continue; }
    if (treffer.art === 'nomen') {
      if (nomen) { unbekannt.push(`zweites Nomen «${treffer.ph}»`); i += treffer.n; continue; }
      nomen = NOMEN[treffer.ph]; i += treffer.n; continue;
    }
    if (treffer.art === 'wort' || ADJ[treffer.art]) {
      const key = treffer.art === 'wort' ? treffer.ph : treffer.art;
      if (ZIELGRUPPE[key]) zg.push(ZIELGRUPPE[key]);
      else if (ADJ[key].drop) { /* weglassen */ } else adj.push(ADJ[key]);
      i += treffer.n; continue;
    }
    unbekannt.push(w); i++;
  }
  if (!nomen) { unbekannt.push('kein Nomen erkannt'); return { titel: null, quelle: 'glossar', unbekannt, entferntMarken: entfernt, masse }; }
  // Adjektive vor dem Nomen: veränderlich nach Geschlecht, Fremdwörter und Präfixe (Keramik-, Edelstahl-) bleiben
  const praefixe = adj.filter((a) => a.praefix).map((a) => a.de);
  const vor = adj.filter((a) => !a.praefix).map((a) => (a.var ? a.de : a.de + ENDUNG[nomen.g]));
  const kopf = praefixe.length ? `${praefixe.join('-')}-${nomen.de}` : nomen.de;
  const teile = [...zg, ...vor, kopf, ...nach];
  let titel = teile.join(' ').replace(/\s+/g, ' ').trim();
  titel = gross1(titel);
  if (masse) titel += ` ${masse}`;
  return { titel, quelle: 'glossar', unbekannt, entferntMarken: entfernt, masse };
}

/** Vergleichsschlüssel für Titel: Kleinschreibung, Striche und Mehrfach-Leerraum gleich (heutige Titel heissen «… – Selbst gestalten»). */
export const titelSchluessel = (t) => String(t ?? '').toLowerCase().replace(/[–—-]/g, ' ').replace(/\s+/g, ' ').trim();

/** Titel mit dem Zusatz «selbst gestalten». */
export const titelVoll = (titel) => `${titel} ${SUFFIX}`;

// ─────────────────────────────────────────────────────────────── Handle
/** Kleinbuchstaben a-z, Ziffern, Bindestrich; Umlaute als ae/oe/ue, ß als ss. */
export function slug(s) {
  return String(s ?? '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/é|è|ê/g, 'e').replace(/à|â/g, 'a')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
const HANDLE_ENDE = slug(SUFFIX);
/**
 * Handle <slug>-selbst-gestalten, höchstens HANDLE_MAX Zeichen. Ist der Slug zu lang, wird er an der letzten Wortgrenze gekürzt (nie mitten im Wort).
 * `schonVergeben` (Set): bei Kollision wird «-<nummer>» vor den Zusatz gesetzt (nie ein vorhandener Handle).
 */
export function handleAus(titelOhneSuffix, { nummer = null, schonVergeben = new Set(), slugFest = null } = {}) {
  const platz = HANDLE_MAX - HANDLE_ENDE.length - 1;
  const FUELL = /-(mit|und|fuer|auf|in|von|der|die|das|am|im|zu)$/;
  const kuerze = (sl, max) => { if (sl.length <= max) return sl; const k = sl.slice(0, max); const i = k.lastIndexOf('-'); let r = (i > 0 ? k.slice(0, i) : k).replace(/-+$/, ''); while (FUELL.test(r)) r = r.replace(FUELL, ''); return r; };   // nie mit einem Füllwort enden
  const basis = slugFest ? slug(slugFest) : slug(titelOhneSuffix);
  const probiere = (sl) => `${sl}-${HANDLE_ENDE}`;
  let h = probiere(kuerze(basis, platz));
  if (!schonVergeben.has(h)) return { handle: h, kollision: false };
  if (nummer != null) {
    const n = String(nummer);
    h = probiere(`${kuerze(basis, platz - n.length - 1)}-${n}`);
    if (!schonVergeben.has(h)) return { handle: h, kollision: true };
  }
  return { handle: null, kollision: true };
}

// ─────────────────────────────────────────────────────────────── Farben
/** Ganze Namen, die nicht aus Einzelwörtern entstehen (Kleinschreibung). */
export const FARBE_FEST = Object.freeze({
  'navy blazer': 'Marineblau', 'sport grey': 'Grau meliert', 'heather sport dark navy': 'Marineblau meliert', 'carbon grey': 'Hellgrau', 'dusty rose': 'Altrosa', 'carolina blue': 'Himmelblau',
  'irish green': 'Grün', 'kelly green': 'Hellgrün', 'military green': 'Olivgrün', 'forest green': 'Waldgrün', 'indigo blue': 'Indigoblau', 'royal blue': 'Königsblau', 'team royal': 'Königsblau',
  'team red': 'Rot', 'vintage black': 'Verwaschenes Schwarz', 'vintage white': 'Verwaschenes Weiss', 'dark chocolate': 'Dunkelbraun', 'golden yellow': 'Goldgelb', 'light blue': 'Hellblau', 'light pink': 'Hellrosa',
  'dark grey': 'Dunkelgrau', 'dark gray': 'Dunkelgrau', 'dark navy': 'Dunkles Marineblau', 'french navy': 'Marineblau', 'charcoal grey': 'Anthrazit', 'athletic heather': 'Grau meliert', 'midnight navy': 'Marineblau', 'dark blue': 'Dunkelblau', 'dark green': 'Dunkelgrün', 'dark heather': 'Dunkelgrau meliert',
  'multicam black': 'Camouflage Schwarz', 'multicam green': 'Camouflage Grün', 'natural': 'Natur', 'oyster': 'Beige', 'tan': 'Beige', 'bone': 'Cremeweiss', 'latte': 'Hellbraun', 'heliconia': 'Pink',
  'sky blue': 'Himmelblau', 'baby blue': 'Babyblau', 'hot pink': 'Pink', 'sand': 'Sand', 'ash': 'Hellgrau', 'graphite heather': 'Graphit meliert', 'azalea': 'Rosa', 'matte': 'Matt', 'glossy': 'Glänzend', 'clear': 'Transparent',
});
const BASISFARBE = Object.freeze({
  white: 'Weiss', black: 'Schwarz', grey: 'Grau', gray: 'Grau', blue: 'Blau', green: 'Grün', red: 'Rot', pink: 'Rosa', orange: 'Orange', purple: 'Lila', yellow: 'Gelb', brown: 'Braun',
  navy: 'Marineblau', royal: 'Königsblau', gold: 'Gold', silver: 'Silber', beige: 'Beige', khaki: 'Khaki', olive: 'Oliv', maroon: 'Weinrot', burgundy: 'Bordeaux', charcoal: 'Anthrazit', cream: 'Creme',
  ivory: 'Elfenbein', mint: 'Mint', teal: 'Petrol', turquoise: 'Türkis', lavender: 'Lavendel', lilac: 'Flieder', coral: 'Koralle', peach: 'Pfirsich', salmon: 'Lachs', lime: 'Limette', violet: 'Violett',
  rose: 'Rosé', mustard: 'Senf', chocolate: 'Schokobraun', sage: 'Salbeigrün', emerald: 'Smaragdgrün', sapphire: 'Saphirblau', crimson: 'Karminrot', cardinal: 'Kardinalrot', mauve: 'Malve', oatmeal: 'Haferflocken', ecru: 'Ecru', jade: 'Jade', aqua: 'Aqua', steel: 'Stahlblau', espresso: 'Espresso', blush: 'Blush', sky: 'Himmelblau', sunset: 'Sonnenuntergang', forest: 'Waldgrün', kelly: 'Hellgrün', army: 'Armeegrün', camo: 'Camouflage', natural: 'Natur', jean: 'Jeansblau', midnight: 'Nachtblau', denim: 'Jeansblau', stone: 'Stein', anthracite: 'Anthrazit', slate: 'Schiefer', graphite: 'Graphit', camel: 'Kamel', copper: 'Kupfer', bronze: 'Bronze', wine: 'Weinrot',
});
const FARBZUSATZ = Object.freeze({ dark: 'Dunkel', light: 'Hell', deep: 'Tief', bright: 'Leuchtend', pale: 'Blass', soft: 'Zart', baby: 'Baby', neon: 'Neon' });
const FARBSUFFIX = Object.freeze({ heather: 'meliert', melange: 'meliert', marle: 'meliert', marl: 'meliert', triblend: 'meliert', tri: 'meliert', vintage: 'verwaschen', washed: 'verwaschen', faded: 'verwaschen', sunwashed: 'verwaschen' });
const IGNORIERT = new Set(['sport', 'team', 'true', 'classic', 'solid', 'color', 'colour', 'blend', 'athletic', 'pigment', 'dyed', 'garment', 'custom', 'base', 'g.', 'french']);

/** Eine Farbe (ohne «/»): {de|null, unbekannt}. */
function einFarbname(roh) {
  const fest = FARBE_FEST[roh.toLowerCase().trim()];
  if (fest) return { de: fest, unbekannt: [] };
  const tok = roh.toLowerCase().split(/[\s-]+/).filter(Boolean);
  const zus = [], suf = []; let basis = null; const unb = [];
  for (const t of tok) {
    if (FARBZUSATZ[t]) zus.push(FARBZUSATZ[t]);
    else if (FARBSUFFIX[t]) { if (!suf.includes(FARBSUFFIX[t])) suf.push(FARBSUFFIX[t]); }
    else if (BASISFARBE[t]) { if (basis) { unb.push(roh); break; } basis = BASISFARBE[t]; }
    else if (IGNORIERT.has(t)) continue;
    else unb.push(t);
  }
  if (unb.length || (!basis && !suf.length)) return { de: null, unbekannt: unb.length ? unb : [roh] };
  const kern = basis ? (zus.length ? zus.join('') + basis.toLowerCase() : basis) : 'Grau';
  return { de: [kern, ...suf].join(' '), unbekannt: [] };
}
/** Deutscher Farbname («Black/White» → «Schwarz/Weiss»); de = null, wenn ein Wort fehlt. */
export function farbeDe(name) {
  if (name == null || String(name).trim() === '') return { de: null, unbekannt: [] };
  const teile = String(name).split('/').map((x) => x.trim()).filter(Boolean).map(einFarbname);
  const unbekannt = teile.flatMap((t) => t.unbekannt);
  return { de: unbekannt.length ? null : teile.map((t) => t.de).join('/'), unbekannt };
}

/**
 * Rang einer Farbe für die Auswahl bei mehr als 100 Varianten (kleiner = gängiger). SETZUNG, nicht gemessen: neutrale Grundfarben verkaufen sich beim Bedruckbaren
 * erfahrungsgemäss am häufigsten (Weiss, Schwarz, Marineblau, Grau), danach kräftige Standardfarben. Gleicher Rang: mehr bestellbare Varianten zuerst, dann der Name.
 */
export const FARB_RANG = Object.freeze(['white', 'black', 'navy', 'grey', 'gray', 'charcoal', 'ash', 'red', 'royal', 'blue', 'green', 'forest', 'pink', 'orange', 'yellow', 'purple', 'maroon', 'burgundy', 'natural', 'sand', 'khaki', 'olive']);
export function farbRang(name) {
  const tok = String(name ?? '').toLowerCase().split(/[\s/-]+/).filter(Boolean);
  let best = 99;
  // Erstes bekanntes Farbwort entscheidet («Dark Heather Grey» → grey); Zusatzwörter zählen nicht. «Heather» allein (ohne weiteres Farbwort) ist ein meliertes Grau.
  for (const t of tok) { const i = FARB_RANG.indexOf(t); if (i >= 0) { best = i; break; } }
  if (best === 99 && tok.includes('heather')) best = FARB_RANG.indexOf('grey');
  // Reine Grundfarben vor veränderten (meliert, dunkel, verwaschen …): «Schwarz meliert» kommt nach «Marineblau», nicht vor ihm
  const rein = tok.length === 1 && FARB_RANG.includes(tok[0]);
  return best === 99 ? 99 : (rein ? best : 100 + best);
}
