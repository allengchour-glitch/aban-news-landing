/**
 * Kinder- und Baby-Bekleidung: Geschlechtsregel + Kategorien + Unterfilter.
 * Reine Regeln, kein Netz, kein Schreiben. Die Semantik von istMitglied() ist genau die der Aufgabenstellung:
 * Produkt gehört zu k, wenn g mit einem g_prefix beginnt UND (titel_muss leer ODER mindestens ein Treffer) UND kein titel_nicht-Treffer
 * UND g mit keinem g_nicht beginnt UND kein Tag aus tags_nicht UND (tags_muss_eines leer ODER eines vorhanden) UND Geschlecht == 'kinder'.
 * (Alle Kategorien haben ein g_prefix; deshalb entfällt der Fall «g_prefix leer → Titel entscheidet».)
 */
export const B = 'a-zäöüß';
export const W = s => `(^|[^${B}])(${s})(?![${B}])`;   // ganzes Wort (links und rechts kein Buchstabe)
export const A = s => `(^|[^${B}])(${s})`;             // Wortanfang (rechts offen: Zusammensetzungen wie «Kinderjacke»)
export const E = s => `(${s})(?![${B}])`;              // Wortende (links offen: «Langarmshirt»)

export const C = 'Apparel & Accessories > Clothing > ';
export const BTC = C + 'Baby & Toddler Clothing';

/* ---------- Geschlecht: Muster (Regex-Strings, JavaScript, Flag i, auf den Produkttitel) ---------- */
export const ELTERNTEIL = `mutter|mama|mami|mommy|papa|daddy|dad|vater`;
export const KINDWORT = `kind(er)?|tochter|töchter|sohn|söhne|baby|girl|boy`;
export const FAMILIE = [
  W('famil[a-zäöüß]*|eltern|geschwister'),
  // Elternteil UND Kind im selben Titel: «Mutter-Tochter», «Mama & Kind», «Papa und Sohn», «Just A Dad Who Loves His Girl».
  // Ein Elternwort allein («Baseball-Cap «Mama»», «Dad-Cap») ist ein Spruch für Erwachsene und gehört nicht hierher.
  `^(?=.*${W(ELTERNTEIL)})(?=.*${W(KINDWORT)})`,
  // «Damen- und Kind-Freizeitanzug», «für Erwachsene und Kinder», «Pyjama für Kinder & Erwachsene»
  `(erwachsene[a-zäöüß]*|damen|herren)[- ]*(und|&|\\+)[- ]*kind(er)?(?![${B}])`,
  `(^|[^${B}])kind(er)?[- ]*(und|&|\\+)[- ]*(erwachsene[a-zäöüß]*|damen|herren)(?![${B}])`,
];
export const KINDER_TITEL = [
  A('kinder|kleinkind|baby|neugeboren|säugling|mädchen|maedchen|jungen|jungs|jungens|teenager|teens?(?![a-zäöüß])|strampl|strampelsack'),
  W('kids?'),
];
/** Wörter, die wie ein Kinderwort aussehen, aber Erwachsenenmode meinen. */
export const KINDER_TITEL_NICHT = [
  `baby-?(doll|tee|blau|rosa|pink)`,                                   // Babydoll (Dessous), Baby-Tee (Crop-Top), Farbwörter
  `mädchen-?(stil|haft)`,                                              // «Zuckersüss Mädchenstil» = Erwachsenen-Nachthemd (Tag damen, type Damenmode)
  `(^|[^${B}])(im|am|vom|zum|mit|in|den|dem|einem|der|des) jungen`,    // «im jungen Casual-Stil» (Adjektiv)
];
export const KINDER_TAGS = ['kinder', 'baby', 'kids'];
export const KINDER_TYPEN = ['Baby & Kinder', 'Kinder'];

const rx = Object.fromEntries(Object.entries({ FAMILIE, KINDER_TITEL, KINDER_TITEL_NICHT }).map(([k, v]) => [k, v.map(s => new RegExp(s, 'i'))]));
const trifft = (liste, t) => liste.some(r => r.test(t));

/**
 * Geschlecht eines Produkts, soweit es Kinder betrifft. Rückgabe [ergebnis, quelle].
 *  ergebnis = 'kinder' | 'andere' ('andere' = Damen-/Herren-Abteilung entscheidet nach deren Regeln, hier nicht bestimmt).
 *  quelle   = 'familie' | 'google' | 'titel' | 'tag' | 'typ' | '-'
 */
export function geschlechtQuelle(p) {
  const t = p.title || '', g = p.g || '', tags = p.tags || [];
  if (trifft(rx.FAMILIE, t)) return ['kinder', 'familie'];
  if (g.startsWith(BTC) || g.startsWith('Apparel & Accessories > Clothing Accessories > Baby & Toddler Clothing Accessories')) return ['kinder', 'google'];
  if (trifft(rx.KINDER_TITEL, t) && !trifft(rx.KINDER_TITEL_NICHT, t)) return ['kinder', 'titel'];
  if (tags.some(x => KINDER_TAGS.includes(x))) return ['kinder', 'tag'];
  if (KINDER_TYPEN.includes(p.type)) return ['kinder', 'typ'];
  return ['andere', '-'];
}
export const geschlecht = p => geschlechtQuelle(p)[0];

/* ---------- Sperren ---------- */
export const SPERR = ['adult-nicht-bewerben', '18plus', 'gmc-adult-pull', 'google-gesperrt-adult', 'raucher-rueckhol-0809', 'nicht-bewerben', 'compliance-pruefen', 'waffenzubehoer-nicht-verkaufen', 'stecker-nicht-ch', 'lizenz-nicht-bewerben'];
/** Kostüme (tag fortura, Handles ft-*) haben eigene Kategorien. */
export const TAGS_NICHT = [...SPERR, 'fortura'];
/** Kein Kleidungsstück für Kinder: Puppenkleider (Spielzeug), Kostüme, Reitsport für Erwachsene UND Kinder. */
export const FREMD_TITEL = [A('puppe[a-zäöüß]*'), '(kostüm|cosplay|verkleid)', A('reit(leggings|weste|hose)')];

/* ---------- Kategorien ---------- */
const alleNicht = [...FREMD_TITEL];
const keineFamilie = [...FAMILIE];                 // Familien-Looks haben Vorrang vor jeder anderen Kategorie
const N = [...alleNicht, ...keineFamilie];

export const KATEGORIEN_ROH = [
  {
    handle: 'kinder-baby-sets', titel: 'Baby-Sets & Outfits',
    g_prefix: [BTC + ' > Baby & Toddler Outfits'], g_nicht: [], titel_muss: [], titel_nicht: N,
    beschreibung: 'Zwei- und mehrteilige Sets für Babys, vom Strampler-Set bis zum Pullover mit Hose. Dazu Neugeborenen-Sets und Foto-Outfits.',
  },
  {
    handle: 'kinder-baby-strampler-bodys', titel: 'Strampler, Bodys & Overalls',
    g_prefix: [BTC + ' > Baby One-Pieces', 'Baby & Toddler'], g_nicht: ['Baby & Toddler >'], titel_muss: ['strampe?l|body|overall|jumpsuit|einteiler|onesie|säuglingsanzug|babysuit'], titel_nicht: N,
    beschreibung: 'Strampler, Bodys, Overalls und Jumpsuits für Babys in Kurz- und Langarm. Auch gefütterte Modelle für kältere Tage.',
  },
  {
    handle: 'kinder-baby-kleider-oberteile', titel: 'Baby-Kleider, Oberteile & Jacken',
    g_prefix: [BTC, 'Baby & Toddler'], g_nicht: [BTC + ' > Baby & Toddler Outfits', BTC + ' > Baby One-Pieces', BTC + ' > Baby & Toddler Sleepwear', BTC + ' > Baby & Toddler Swimwear', BTC + ' > Toddler Underwear', 'Baby & Toddler >'],
    titel_muss: ['kleid|rock|hose|pullover|weste|jacke|strick|shirt|top(?![a-zäöüß])|anzug|hoodie|mantel|cardigan|oberteil'], titel_nicht: N,
    beschreibung: 'Einzelteile für Babys: Kleider, Pullover, Strickjacken, Hosen und Westen. Dazu ein Anzug und Kleidung für Neugeborene.',
  },
  {
    handle: 'kinder-sets-outfits', titel: 'Kinder-Sets & Outfits',
    g_prefix: [C + 'Outfit Sets'], g_nicht: [], titel_muss: [], titel_nicht: [...N, 'handschuh'],
    beschreibung: 'Zwei- und dreiteilige Sets für Mädchen und Jungen, etwa Shirt mit Hose, Pullover mit Shorts oder Top mit Rock. Dazu Sweatshirt-Sets und ein Kinderanzug.',
  },
  {
    handle: 'kinder-oberteile-kleider-hosen', titel: 'Oberteile, Kleider, Hosen & Jacken',
    g_prefix: [C + 'Shirts & Tops', C + 'Outerwear', C + 'Suits', C + 'Dresses', C + 'Skirts', C + 'Pants', C + 'Shorts', C + 'Activewear', C + 'One-Pieces'],
    g_nicht: [], titel_muss: [], titel_nicht: N,
    beschreibung: 'Einzelteile für Mädchen, Jungen und Teenager: T-Shirts, Pullover, Kleider, Leggings, Shorts und Overalls. Dazu Jacken, Ponchos und Anzüge.',
  },
  {
    handle: 'kinder-nachtwaesche-bademode', titel: 'Nachtwäsche, Bademode & Unterwäsche',
    g_prefix: [C + 'Sleepwear & Loungewear', C + 'Swimwear', C + 'Underwear & Socks', BTC + ' > Baby & Toddler Sleepwear', BTC + ' > Baby & Toddler Swimwear', BTC + ' > Toddler Underwear'],
    g_nicht: [], titel_muss: [], titel_nicht: N,
    beschreibung: 'Pyjamas, Schlafanzüge, Schlafsäcke und Bademäntel für Kinder und Babys. Dazu Badeanzüge mit Sonnenschutz sowie Unterwäsche und Socken.',
  },
  {
    handle: 'kinder-familien-looks', titel: 'Familien-Looks',
    g_prefix: ['Apparel & Accessories > Clothing'], g_nicht: ['Apparel & Accessories > Clothing Accessories'], titel_muss: FAMILIE, titel_nicht: alleNicht,
    beschreibung: 'Passende Outfits für Eltern und Kinder: Pyjamas, Hausanzüge, Pullover, T-Shirts und Sets im Partnerlook. Dazu viele Weihnachts-Looks.',
  },
];

/* Unterfilter: Facetten innerhalb einer Kategorie (ein Produkt kann in mehreren stehen; sie gelten nur innerhalb ihrer Kategorie).
 * Nur Titelwörter, die das Produkt wörtlich nennt; mindestens 5 Treffer. */
export const UNTERFILTER = {
  'kinder-baby-sets': [
    { handle: 'kinder-baby-sets-maedchen', titel: 'Für Mädchen', titel_muss: [W('mädchen|maedchen|girls?')] },
    { handle: 'kinder-baby-sets-jungen', titel: 'Für Jungen', titel_muss: [W('jungen|jungs|boys?')] },
    { handle: 'kinder-baby-sets-strick', titel: 'Strick, Waffel & Wolle', titel_muss: ['strick|waffel|geripp|lammwoll', A('woll')] },
    { handle: 'kinder-baby-sets-sommer', titel: 'Sommer & Kurzarm', titel_muss: ['sommer|kurzarm|kurzärm|shorts|ärmellos|träger|t-shirt'], titel_nicht: ['pullover|langarm|langärm|lange ärmel|sweatshirt|hoodie|strickpullover'] },
    { handle: 'kinder-baby-sets-langarm', titel: 'Langarm & Pullover', titel_muss: ['langarm|langärm|lange ärmel|pullover|hoodie|sweatshirt|kapuze|herbst|winter|fleece'] },
  ],
  'kinder-baby-strampler-bodys': [
    { handle: 'kinder-baby-strampler', titel: 'Strampler', titel_muss: ['strampl'] },
    { handle: 'kinder-baby-overalls', titel: 'Overalls & Jumpsuits', titel_muss: ['overall|jumpsuit|einteiler|babysuit'] },
    { handle: 'kinder-baby-bodys', titel: 'Bodys', titel_muss: ['body'] },
    { handle: 'kinder-baby-gefuettert', titel: 'Gefüttert & warm', titel_muss: ['fleece|gefütter|plüsch|futter|dick|warm|lammwoll', A('woll')] },
    { handle: 'kinder-baby-aermellos', titel: 'Sommer, ärmellos & kurzarm', titel_muss: ['ärmellos|kurzärm|kurzarm|kurzen ärmeln|sommer'] },
  ],
  'kinder-baby-kleider-oberteile': [],
  'kinder-sets-outfits': [
    { handle: 'kinder-sets-maedchen', titel: 'Für Mädchen', titel_muss: [W('mädchen|maedchen')] },
    { handle: 'kinder-sets-jungen', titel: 'Für Jungen', titel_muss: [W('jungen|jungs|jungens')] },
    { handle: 'kinder-sets-sommer', titel: 'Sommer & Kurzarm', titel_muss: ['sommer|kurzarm|ärmellos|shorts|leinen'], titel_nicht: ['pullover|langarm|langärm|lange ärmel|sweatshirt|hoodie|strick'] },
    { handle: 'kinder-sets-pullover', titel: 'Pullover & Langarm', titel_muss: ['pullover|langarm|herbst|winter|sweatshirt'] },
  ],
  'kinder-oberteile-kleider-hosen': [
    { handle: 'kinder-kleider', titel: 'Kleider', titel_muss: ['kleid'] },
    { handle: 'kinder-t-shirts', titel: 'T-Shirts & Shirts', titel_muss: ['shirt|träger'], titel_nicht: ['sweat'] },
    { handle: 'kinder-pullover-hoodies', titel: 'Pullover & Hoodies', titel_muss: ['pullover|hoodie|sweatshirt|sweater|rollkragen'] },
    { handle: 'kinder-hosen-leggings', titel: 'Hosen, Leggings & Overalls', titel_muss: ['leggings|shorts|hose|jeans|overall|jumpsuit'], titel_nicht: ['kleid'] },
    { handle: 'kinder-oberteile-maedchen', titel: 'Für Mädchen', titel_muss: [W('mädchen|maedchen')] },
    { handle: 'kinder-teenager', titel: 'Für Teenager', titel_muss: [W('teenager|teens?')] },
  ],
  'kinder-nachtwaesche-bademode': [
    { handle: 'kinder-pyjamas', titel: 'Pyjamas & Schlafanzüge', titel_muss: ['pyjama|schlafanzug|nachthemd'] },
    { handle: 'kinder-schlafsaecke', titel: 'Schlafsäcke', titel_muss: ['schlafsack'] },
    { handle: 'kinder-bademode', titel: 'Bademode', titel_muss: ['badeanzug|bademode|bikini|badehose'] },
    { handle: 'kinder-unterwaesche', titel: 'Unterwäsche & Socken', titel_muss: ['unterwäsche|socken'] },
  ],
  'kinder-familien-looks': [
    { handle: 'kinder-familie-pyjamas', titel: 'Pyjamas & Hausanzüge', titel_muss: ['pyjama|schlafanzug|loungewear|hausanzug|homewear'] },
    { handle: 'kinder-familie-weihnachten', titel: 'Weihnachts-Looks', titel_muss: ['weihnacht|christmas|hirsch|elch|nikolaus'] },
    { handle: 'kinder-familie-shirts', titel: 'Pullover, Shirts & Hoodies', titel_muss: ['shirt|pullover|hoodie|sweater|sweatshirt'] },
    { handle: 'kinder-familie-mutter-kind', titel: 'Mutter & Kind', titel_muss: [W('mutter|tochter|mama')] },
  ],
};

export function kategorienBauen(roh = KATEGORIEN_ROH, uf = UNTERFILTER) {
  return roh.map(k => ({
    handle: k.handle, titel: k.titel, eltern: 'kinder', geschlecht: 'kinder',
    g_prefix: k.g_prefix, g_nicht: k.g_nicht || [], titel_muss: k.titel_muss || [], titel_nicht: k.titel_nicht || [],
    tags_muss_eines: k.tags_muss_eines || [], tags_nicht: TAGS_NICHT, beschreibung: k.beschreibung,
    unterfilter: (uf[k.handle] || []).map(f => ({ handle: f.handle, titel: f.titel, titel_muss: f.titel_muss, titel_nicht: f.titel_nicht || [] })),
  }));
}
export const KATEGORIEN = kategorienBauen();

/* ---------- Auswertung (genau die Semantik der Aufgabe) ---------- */
const cache = new Map();
const R = s => { let r = cache.get(s); if (!r) { r = new RegExp(s, 'i'); cache.set(s, r); } return r; };
export function istMitglied(k, p, gesch = geschlecht(p)) {
  const g = p.g || '', t = p.title || '', tags = p.tags || [];
  if (!k.g_prefix.some(x => g.startsWith(x))) return false;
  if (k.titel_muss.length && !k.titel_muss.some(s => R(s).test(t))) return false;
  if (k.titel_nicht.some(s => R(s).test(t))) return false;
  if (k.g_nicht.some(x => g.startsWith(x))) return false;
  if (k.tags_nicht.some(x => tags.includes(x))) return false;
  if (k.tags_muss_eines.length && !k.tags_muss_eines.some(x => tags.includes(x))) return false;
  return gesch === k.geschlecht;
}
export const istInUnterfilter = (u, p) => u.titel_muss.some(s => R(s).test(p.title || '')) && !(u.titel_nicht || []).some(s => R(s).test(p.title || ''));
