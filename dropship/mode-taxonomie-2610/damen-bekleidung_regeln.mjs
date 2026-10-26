/**
 * Damen-Bekleidung: Geschlechtsregel + Kategorien (rein, ohne Netz).
 * Die Regeln stehen als Regex-STRINGS (JavaScript, Flag i); damen-bekleidung.json enthaelt genau diese Strings.
 * Wortgrenzen ohne \b (JavaScript-\b kennt keine Umlaute): W = ganzes Wort, A = Wortanfang (rechts offen, Zusammensetzungen),
 * E = Wortende (links offen: «Wollmantel» endet auf «mantel»).
 */
const B = 'a-zäöüß';
export const W = s => `(^|[^${B}])(${s})(?![${B}])`;
export const A = s => `(^|[^${B}])(${s})`;
export const E = s => `(${s})(?![${B}])`;
const C = 'Apparel & Accessories > Clothing > ';

/* ---------------- Geschlecht ---------------- */
export const GESCHLECHT_RE = {
  unisex: [
    A('unisex|für paare|pärchen|partner-?(shirt|look|outfit)|paar-?look|couple'),
  ],
  damen: [A('damen|frauen|weiblich|ladies')],
  herren: [A('herren(?!los)|männer|maenner|männlich|mann(?![a-zäöüß])|gentleman')],
  kinder: [A('kinder|mädchen|maedchen|jungs|babys?(?![a-zäöüß])|baby-|kleinkind|teenager|teens?(?![a-zäöüß])|kids?(?![a-zäöüß])|säugling|neugeboren|strampler|famili|eltern'), '(^|für |& |und |, )jungen(?![a-zäöüß])', W('mutter|tochter|mama|mami|papa|vater|sohn|kind')],
};
/** Schritt 5: ohne jede Angabe, aber ein Titel, der in den Daten mit bekanntem Geschlecht nie bei Herren vorkommt (yoga 147:0, leggings 106:0). */
GESCHLECHT_RE.eindeutig = [A('yoga|leggings|jeggings|bikini|badeanzug|tankini|jumpsuit|cheongsam')];
export const NUR_WEIBLICH_G = [C + 'Dresses', C + 'Skirts', C + 'Skorts', C + 'Underwear & Socks > Bras', C + 'Underwear & Socks > Lingerie', C + 'Sleepwear & Loungewear > Nightgowns', C + 'Underwear & Socks > Petticoats'];
const rx = Object.fromEntries(Object.entries(GESCHLECHT_RE).map(([k, v]) => [k, v.map(s => new RegExp(s, 'i'))]));
const hit = (k, t) => rx[k].some(r => r.test(t));

/** damen | herren | kinder | unisex | unbekannt — mit Quelle der Entscheidung */
export function geschlechtQuelle(p) {
  const [g, q] = geschlechtQuelle0(p);
  // Kleider, Roecke, BHs, Nachthemden sind nie Herren (Uebersetzungsfehler wie «Herren-Rock»): Herren/Unisex aus Tag oder Titel -> damen
  if ((g === 'herren' || (g === 'unisex' && q === 'tag')) && NUR_WEIBLICH_G.some(x => (p.g || '').startsWith(x))) return ['damen', 'google'];
  return [g, q];
}
function geschlechtQuelle0(p) {
  const t = p.title || '', tg = p.tags || [];
  const u = hit('unisex', t), d = hit('damen', t), h = hit('herren', t), k = hit('kinder', t);
  if (k) return ['kinder', 'titel'];
  if (u || (d && h)) return ['unisex', 'titel'];
  if (h) return ['herren', 'titel'];
  if (d) return ['damen', 'titel'];
  if (tg.includes('unisex')) return ['unisex', 'tag'];
  const td = tg.includes('damen'), th = tg.includes('herren') || tg.includes('maenner'), tk = tg.includes('kinder');
  if (td && th) return ['unisex', 'tag'];
  if (td) return ['damen', 'tag'];
  if (th) return ['herren', 'tag'];
  if (tk) return ['kinder', 'tag'];
  const ty = p.type || '';
  if (ty === 'Damenmode') return ['damen', 'typ'];
  if (ty === 'Herrenmode') return ['herren', 'typ'];
  if (ty === 'Baby & Kinder' || ty === 'Kinder') return ['kinder', 'typ'];
  if (/^(T-Shirt|Shirt)$/i.test(ty) || /selbst gestalten/i.test(t)) return ['unisex', 'typ'];
  if (NUR_WEIBLICH_G.some(x => (p.g || '').startsWith(x))) return ['damen', 'google'];
  if (rx.eindeutig.some(r => r.test(t))) return ['damen', 'eindeutig'];
  return ['unbekannt', '-'];
}
export const geschlecht = p => geschlechtQuelle(p)[0];
export const geschlechtDamen = p => { const g = geschlecht(p); return g === 'damen' || g === 'unisex'; };

/* ---------------- Mitgliedschaft (genau die Semantik der Aufgabe) ---------------- */
const cache = new Map();
const R = s => { let r = cache.get(s); if (!r) { r = new RegExp(s, 'i'); cache.set(s, r); } return r; };
export function istMitglied(k, p, gesch = geschlecht(p)) {
  if (!(gesch === k.geschlecht || (gesch === 'unisex' && (k.geschlecht === 'damen' || k.geschlecht === 'herren')))) return false;
  const g = p.g || '', t = p.title || '', tg = p.tags || [];
  if (k.g_prefix.length ? !k.g_prefix.some(x => g.startsWith(x)) : !(k.titel_muss.length && k.titel_muss.some(s => R(s).test(t)))) return false;
  if (k.g_nicht.some(x => g.startsWith(x))) return false;
  if (k.titel_muss.length && !k.titel_muss.some(s => R(s).test(t))) return false;
  if (k.titel_nicht.some(s => R(s).test(t))) return false;
  if (k.tags_nicht.some(x => tg.includes(x))) return false;
  if (k.tags_muss_eines.length && !k.tags_muss_eines.some(x => tg.includes(x))) return false;
  return true;
}
export const istInUnterfilter = (u, p) =>
  (!u.titel_muss || !u.titel_muss.length || u.titel_muss.some(s => R(s).test(p.title))) && !(u.titel_nicht || []).some(s => R(s).test(p.title));

/* ---------------- Kategorien ---------------- */
const UMSTAND = A('umstand|schwanger|still(kleid|shirt|top|bh)|mutterschaft|maternity');
const FREMD = ['(kostüm|cosplay|verkleid|maskenball)', A('stoffmasken?|mundschutz|gesichtsmaske|tactical|taktisch'), A('body[- ]?chain')];
/** Produkte mit diesen Tags kommen in KEINE Themenkategorie (automation/lib/kategorien.mjs SPERR_TAGS + zwei Google-/Lizenz-Sperren). */
export const SPERR = ['adult-nicht-bewerben', '18plus', 'gmc-adult-pull', 'google-gesperrt-adult', 'raucher-rueckhol-0809', 'nicht-bewerben', 'compliance-pruefen', 'waffenzubehoer-nicht-verkaufen', 'stecker-nicht-ch', 'lizenz-nicht-bewerben'];
const K = (handle, titel, g_prefix, o = {}) => ({
  handle, titel, eltern: 'damen', geschlecht: 'damen', g_prefix, g_nicht: o.g_nicht || [], titel_muss: o.titel_muss || [],
  titel_nicht: [...FREMD, ...(o.titel_nicht || [])], _opt: o.titel_nicht || [], tags_muss_eines: [], tags_nicht: [...SPERR], beschreibung: o.beschreibung || '', unterfilter: o.unterfilter || [],
});
const U = (handle, titel, titel_muss, titel_nicht = []) => ({ handle, titel, titel_muss, titel_nicht });

const SET_MUSS = [
  E('sets?|zweiteiler|zweiteilig\\w*|2-?teilig\\w*|2-?teiler|3-?teilig\\w*|dreiteil\\w*|outfit|co-?ord|ensemble|anzug'),
  '(top|hemd|bluse|pullover|hoodie|cardigan|shirt|bodysuit|oberteil|crop|weste|blazer|tank\\w*|cami\\w*) (&|und|\\+) [a-zäöüß-]*(hose|rock|shorts|jupe|jogger|pants|leggings)',
  'bodysuit mit (shorts|hose|rock)',
  '(top|shirt|bluse|hemd|oberteil) (&|und|\\+) (cardigan|blazer|jacke|weste)',
  '(cardigan|pullover|hoodie|hemd|bluse|blazer|jacke)[^&+]{0,40}(&|\\+| und )\\s?[a-zäöüß ]*(hose|hosen|rock|shorts|jupe)(?![a-zäöüß-]*(print|muster))',
  '(hose|rock|shorts) (&|und|\\+) [a-zäöüß-]*(top|hemd|bluse|pullover|hoodie|cardigan|shirt|bodysuit|oberteil|weste|blazer)',
];
const SET_NICHT = [A('fake|mock|faux|tang-?anzug'), E('zweiteiler-?(look|optik)'), A('(im|in) zweiteiler'), 'zweiteiler-?look'];

const KLEIDER_U = [
  U('damen-kleider-mini', 'Minikleider', [A('mini'), W('kurzes')]),
  U('damen-kleider-midi', 'Midikleider', [A('midi|mid-?length|mittellang|knielang')]),
  U('damen-kleider-maxi', 'Maxikleider', [A('maxi|bodenlang|knöchellang|longkleid|langkleid'), W('langes')]),
  U('damen-kleider-abend', 'Abendkleider & festliche Kleider', [A('abend|ballkleid|ball-?kleid|gala|abschlussball|festkleid|festlich|prom(?![a-zäöüß])|brautjungfer|hochzeit|trauzeugin')]),
  U('damen-kleider-cocktail', 'Cocktail- & Partykleider', [A('cocktail|party|clubkleid')]),
  U('damen-kleider-business', 'Business- & Etuikleider', [A('business|büro|office|bleistift|etui|workwear')]),
  U('damen-kleider-sommer', 'Sommerkleider', [A('sommer')]),
  U('damen-kleider-strand', 'Strandkleider', [A('strand|beach|urlaub|resort')]),
  U('damen-kleider-boho', 'Boho-Kleider', [A('boho|bohemian|ibiza|hippie|ethno|folk')]),
  U('damen-kleider-strick', 'Strick- & Winterkleider', [A('strick|pullover|rollkragen|winter|woll|plüsch|fleece|flanell|kapuzen')]),
  U('damen-kleider-freizeit', 'Freizeit- & Hemdblusenkleider', [A('freizeit|casual|alltag|shirt-?kleid|hemd|hemdblusen|blusenkleid|sweat')]),
  U('damen-kleider-blumen', 'Blumenkleider', [A('blumen|geblümt|floral|blüten')]),
  U('damen-kleider-spitze', 'Spitzenkleider', [A('spitze(?![a-zäöüß])|spitzen|häkel|lace')]),
  U('damen-kleider-langarm', 'Langarmkleider', [A('langarm|langärm|lange ärmel|3/4|¾')]),
  U('damen-kleider-schulterfrei', 'Schulterfreie Kleider', [A('off-?shoulder|schulterfrei|trägerlos|bandeau')]),
];

/** Reihenfolge = Vorrang. Ein hoeherer Vorrang schliesst sein Titelmuster bei allen spaeteren Kategorien mit gleichem/kleinerem g-Bereich aus. */
export const KATEGORIEN_ROH = [
  K('damen-umstandsmode', 'Umstandsmode', [C], { titel_muss: [UMSTAND], beschreibung: 'Kleider, Leggings, Jeans und Unterwäsche für die Schwangerschaft und die Stillzeit. Weiche, dehnbare Stoffe und Schnitte mit viel Platz für den Bauch.' }),

  K('damen-bademode', 'Bademode', [C + 'Swimwear'], { beschreibung: 'Bikinis, Badeanzüge und Strandkimonos für Pool, See und Meer. Schnitte und Farben für den Sommerurlaub.' }),
  K('damen-nachtwaesche', 'Nachtwäsche & Loungewear', [C + 'Sleepwear & Loungewear'], { beschreibung: 'Pyjamas, Nachthemden und Morgenmäntel für erholsame Nächte. Dazu bequeme Loungewear für den Abend auf dem Sofa.' }),
  K('damen-dessous', 'Dessous & Unterwäsche', [C + 'Underwear & Socks'], { beschreibung: 'BHs, Slips, Shapewear, Strumpfhosen und Socken. Unterwäsche, die sich unter der Kleidung gut anfühlt.' }),
  K('damen-sportbekleidung', 'Sportbekleidung', [C + 'Activewear', C + 'One-Pieces > Leotards'], { beschreibung: 'Leggings, Yogahosen, Sport-Tops und Trainingsjacken für Fitness, Yoga und Laufen. Atmungsaktive, elastische Stoffe für freie Bewegung.' }),

  K('damen-kleider', 'Kleider', [C + 'Dresses'], { unterfilter: KLEIDER_U, beschreibung: 'Von Sommerkleidern über Midikleider bis zu festlichen Abendkleidern. Wählen Sie nach Länge, Anlass oder Stil.' }),
  K('damen-roecke', 'Röcke', [C + 'Skirts', C + 'Skorts'], { beschreibung: 'Mini-, Midi- und Maxiröcke, Faltenröcke und Bleistiftröcke. Zum Kombinieren mit Blusen, Shirts und Pullovern.' }),
  K('damen-jumpsuits', 'Jumpsuits & Overalls', [C + 'One-Pieces > Jumpsuits'], { beschreibung: 'Einteiler in lang und kurz, elegant oder lässig. Ein Teil, ein fertiger Look.' }),
  K('damen-sets', 'Zweiteiler & Sets', [C + 'Outfit Sets', C + 'Suits', C + 'Shirts & Tops', C + 'Pants', C + 'Shorts', C + 'Skirts'], {
    titel_muss: SET_MUSS, titel_nicht: SET_NICHT,
    beschreibung: 'Aufeinander abgestimmte Zweiteiler und Sets aus Top und Hose, Top und Rock oder Blazer und Hose. Sie sparen sich die Kombinationssuche.' }),

  K('damen-jacken-maentel', 'Jacken & Mäntel', [C + 'Outerwear'], { titel_nicht: [E('hemd|hemden')], beschreibung: 'Mäntel, Winterjacken, Blazer und Westen für alle Jahreszeiten. Vom leichten Übergangsmodell bis zur warmen Daunenjacke.' }),

  K('damen-jeans', 'Jeans', [C + 'Pants'], { titel_muss: [A('jeans|denim|jeggings?'), E('jeans')], beschreibung: 'Jeans in verschiedenen Schnitten: eng, gerade, weit oder High Waist. Dazu Jeanshosen aus Denim.' }),
  K('damen-hosen', 'Hosen', [C + 'Pants'], { titel_nicht: [E('hotpants?')], beschreibung: 'Stoffhosen, weite Hosen, Leggings, Jogginghosen und Cargohosen. Für Büro, Freizeit und Wochenende.' }),
  K('damen-shorts', 'Shorts', [C + 'Shorts'], { beschreibung: 'Kurze Hosen für den Sommer: Jeansshorts, Stoffshorts, Radlerhosen und Bermudas.' }),

  K('damen-hoodies-sweatshirts', 'Hoodies & Sweatshirts', [C + 'Shirts & Tops'], {
    titel_muss: [E('hoodies?|sweatshirts?|kapuzenpullover|kapuzenpulli|kapuzensweat|kapuzenjacke|sweatjacke'), A('hoodie')],
    beschreibung: 'Hoodies, Sweatshirts und Kapuzenpullover aus weichem Material. Der bequeme Klassiker für kühle Tage.' }),
  K('damen-strickjacken', 'Strickjacken & Cardigans', [C + 'Shirts & Tops'], {
    titel_muss: [E('cardigans?|kardigans?|strickjacke|strickjäckchen|bolero|wickeljacke|kimono|shrug')],
    beschreibung: 'Cardigans und Strickjacken zum Überziehen. Lang oder kurz, grob oder fein gestrickt.' }),
  K('damen-pullover', 'Pullover & Strick', [C + 'Shirts & Tops'], {
    titel_muss: [E('pullover|pulli|pullis|sweater|jumper|strickoberteil|strickshirt'), A('rollkragenpullover|pullunder')],
    beschreibung: 'Strickpullover, Rollkragenpullover und Feinstrick. Warm im Winter, leicht im Frühling.' }),
  K('damen-blusen-hemden', 'Blusen & Hemden', [C + 'Shirts & Tops'], {
    titel_muss: [E('blusen?|blouses?|hemd|hemden|tunika|tunic|kaftan|kasack')],
    beschreibung: 'Blusen, Hemden und Tuniken für Büro und Freizeit. Aus Chiffon, Baumwolle, Leinen oder Satin.' }),
  K('damen-t-shirts', 'T-Shirts & Langarmshirts', [C + 'Shirts & Tops'], {
    titel_muss: [E('t-?shirts?|shirts?|langarmshirts?|poloshirts?|polos?|longsleeves?|henley')],
    beschreibung: 'T-Shirts, Poloshirts und Langarmshirts als Basis für jeden Look. Einfarbig, gestreift oder bedruckt.' }),
  K('damen-tops', 'Tops & Oberteile', [C + 'Shirts & Tops'], { titel_nicht: [A('bade-?tops?')],
    titel_muss: [E('tops?|tanktops?|tanks?|crops?|camis?|camisoles?|bandeau|bustier|oberteils?|oberteile|bodys?|bodysuits?|neckholder|trägertops?'), A('achsellos|kurzärmlos|kurzärmlook|topschickling')],
    beschreibung: 'Tops, Tanktops, Camisoles und weitere Oberteile für warme Tage. Zum Kombinieren mit Röcken und Hosen.' }),
];


/* ---------------- Unterfilter (Facetten innerhalb einer Kategorie, duerfen sich ueberschneiden) ---------------- */
export const UNTERFILTER = {
  'damen-roecke': [
    U('damen-roecke-mini', 'Miniröcke', [A('mini'), W('kurzrock|kurzer rock')]),
    U('damen-roecke-midi', 'Midiröcke', [A('midi|knielang|mid-?length|mittellang')]),
    U('damen-roecke-maxi', 'Maxiröcke & lange Röcke', [A('maxi|langrock|bodenlang'), W('langer|langen|lange')]),
    U('damen-roecke-jeans', 'Jeansröcke', [A('jeans|denim')]),
    U('damen-roecke-plissee', 'Plissee- & Faltenröcke', [A('plissee|plissier|falten|faltenrock')]),
  ],
  'damen-jumpsuits': [
    U('damen-jumpsuits-overall', 'Overalls & Latzhosen', [A('overall|latzhose|einteiler')]),
    U('damen-jumpsuits-playsuit', 'Playsuits & kurze Jumpsuits', [A('playsuit|romper|kurzer|kurze|shorts')]),
    U('damen-jumpsuits-sport', 'Jumpsuits für Sport & Yoga', [A('yoga|sport|fitness')]),
  ],
  'damen-sets': [
    U('damen-sets-hose', 'Sets mit Hose', [A('hose|jogger|pants|leggings|shorts')]),
    U('damen-sets-rock', 'Sets mit Rock', [A('rock|jupe')]),
    U('damen-sets-sport', 'Trainings- & Hoodie-Sets', [A('hoodie|sweat|jogging|training|sport|yoga|fleece|plüsch')]),
    U('damen-sets-sommer', 'Sommer- & Freizeit-Sets', [A('sommer|resort|strand|leinen|boho|chiffon|freizeit|casual')]),
  ],
  'damen-jacken-maentel': [
    U('damen-jacken-maentel-maentel', 'Mäntel', [E('mantel|coat|trench\\w*|parka')]),
    U('damen-jacken-winter', 'Winter- & Daunenjacken', [A('daunen|winter|puffer|steppjacke|steppmantel|gefütterte?[rs]?|wattiert|gepolstert|parka|thermo')], [E('mantel|coat')]),
    U('damen-jacken-westen', 'Westen', [E('weste|westen|gilet')]),
    U('damen-jacken-blazer', 'Blazer', [E('blazer|sakko')]),
    U('damen-jacken-kunstfell', 'Fell- & Plüschjacken', [A('fell|plüsch|teddy|shearling|lammfell|pelz')]),
    U('damen-jacken-kapuze', 'Jacken mit Kapuze', [A('kapuze')]),
  ],
  'damen-jeans': [
    U('damen-jeans-highwaist', 'High-Waist-Jeans', [A('high-?waist|hochtaill|hohe?r? (taille|bund)|hohem bund')]),
    U('damen-jeans-weit', 'Weite Jeans & Wide Leg', [A('wide|weit|baggy|loose')]),
    U('damen-jeans-gerade', 'Straight-Leg-Jeans', [A('straight|gerade')]),
    U('damen-jeans-slim', 'Slim- & Stretch-Jeans', [A('slim|skinny|stretch')]),
    U('damen-jeans-flare', 'Bootcut- & Flare-Jeans', [A('flare|bootcut|ausgestellt|schlag')]),
    U('damen-jeans-ripped', 'Ripped & Destroyed', [A('ripped|distressed|riss|zerrissen|gerissen')]),
  ],
  'damen-hosen': [
    U('damen-hosen-weit', 'Weite Hosen & Culottes', [A('wide|weit|palazzo|culotte|schlag|flare|ausgestellt')]),
    U('damen-hosen-stoff', 'Stoff- & Business-Hosen', [A('stoff|business|anzug|bügelfalten|elegant')]),
    U('damen-hosen-jogging', 'Jogging- & Freizeithosen', [A('jogg|sweat|trainings|freizeit')]),
    U('damen-hosen-capri', 'Capri- & Cropped-Hosen', [A('capri|kapri|7/8|cropped')]),
  ],
  'damen-shorts': [
    U('damen-shorts-jeans', 'Jeansshorts', [A('jeans|denim')]),
  ],
  'damen-hoodies-sweatshirts': [
    U('damen-hoodies-hoodie', 'Hoodies', [A('hoodie')]),
    U('damen-hoodies-sweatshirt', 'Sweatshirts', [A('sweatshirt|sweater')]),
    U('damen-hoodies-kapuzenpullover', 'Kapuzenpullover', [A('kapuzenpullover|kapuzenpulli|kapuzensweat')]),
    U('damen-hoodies-zip', 'Zip-Hoodies & Sweatjacken', [A('zip|reissverschluss|kapuzenjacke|sweatjacke')]),
    U('damen-hoodies-oversize', 'Oversize-Hoodies', [A('oversize|loose|locker')]),
    U('damen-hoodies-fleece', 'Fleece- & Plüsch-Hoodies', [A('fleece|plüsch|samt|gefüttert|teddy')]),
  ],
  'damen-strickjacken': [
    U('damen-strickjacken-cardigan', 'Cardigans', [A('cardigan|kardigan')]),
    U('damen-strickjacken-strickjacke', 'Strickjacken', [A('strickjacke')]),
    U('damen-strickjacken-kapuze', 'Cardigans mit Kapuze', [A('kapuze')]),
  ],
  'damen-pullover': [
    U('damen-pullover-rollkragen', 'Rollkragenpullover', [A('rollkragen')]),
    U('damen-pullover-strick', 'Strickpullover', [A('strick')]),
    U('damen-pullover-v', 'Pullover mit V-Ausschnitt', [A('v-?(neck|ausschnitt)')]),
    U('damen-pullover-rundhals', 'Rundhalspullover', [A('rundhals')]),
    U('damen-pullover-grob', 'Grobstrick- & Zopfmuster-Pullover', [A('grobstrick|kabel|zopf|chunky|waffel|rippen|gerippt|fisher|pointelle')]),
    U('damen-pullover-oversize', 'Oversize-Pullover', [A('oversize|loose|locker')]),
    U('damen-pullover-weihnacht', 'Weihnachts- & Motivpullover', [A('weihnacht|christmas|xmas|schneemann|rentier|santa|herz|katze|tier')]),
  ],
  'damen-blusen-hemden': [
    U('damen-blusen-bluse', 'Blusen', [E('blusen?|blouses?')]),
    U('damen-blusen-hemd', 'Hemden', [E('hemd|hemden')]),
    U('damen-blusen-chiffon', 'Chiffonblusen', [A('chiffon')]),
    U('damen-blusen-leinen', 'Leinenblusen & -hemden', [A('leinen|baumwoll-?leinen')]),
    U('damen-blusen-satin', 'Satin- & Seidenblusen', [A('satin|seide')]),
    U('damen-blusen-spitze', 'Spitzenblusen', [A('spitze(?![a-zäöüß])|spitzen')]),
    U('damen-blusen-rueschen', 'Blusen mit Rüschen', [A('rüsch')]),
  ],
  'damen-t-shirts': [
    U('damen-t-shirts-tshirt', 'T-Shirts', [E('t-?shirts?')]),
    U('damen-t-shirts-langarm', 'Langarmshirts', [A('langarm|langärm|long-?sleeve')]),
    U('damen-t-shirts-print', 'Shirts mit Print', [A('print|druck|bedruckt|aufdruck')]),
    U('damen-t-shirts-oversize', 'Oversize-Shirts', [A('oversize|loose|locker')]),
  ],
  'damen-tops': [
    U('damen-tops-tank', 'Tanktops', [E('tanktops?|tanks?')]),
    U('damen-tops-cami', 'Camisoles', [A('cami')]),
    U('damen-tops-crop', 'Crop-Tops & Bodys', [A('crop|bauchfrei|kurzes? (top|oberteil)|kurzarm-body'), E('bodys?|bodysuits?')]),
    U('damen-tops-neckholder', 'Neckholder- & Bandeau-Tops', [A('bandeau|neckholder|halter|tube')]),
    U('damen-tops-spitze', 'Spitzentops', [A('spitze(?![a-zäöüß])|spitzen|häkel')]),
    U('damen-tops-strick', 'Strick-Tops', [A('strick')]),
    U('damen-tops-schulterfrei', 'Schulterfreie Tops', [A('off-?shoulder|schulterfrei|rückenfrei|backless')]),
  ],
  'damen-sportbekleidung': [
    U('damen-sport-leggings', 'Sport-Leggings', [A('leggings|tights')]),
    U('damen-sport-yogahosen', 'Yogahosen', [A('yoga-?hose|yoga-?pants|yoga-hosen|yogapants')]),
    U('damen-sport-shorts', 'Sport-Shorts', [E('shorts?')]),
    U('damen-sport-sets', 'Sets, Anzüge & Jumpsuits', [A('set(?![a-zäöüß])|zweiteil|anzug|2-?teil|jumpsuit|overall|einteiler|bodysuit|catsuit')]),
    U('damen-sport-tops', 'Sport-Tops & BHs', [A('top|bra(?![a-zäöüß])|bh(?![a-zäöüß])|shirt|tank')]),
  ],
  'damen-bademode': [
    U('damen-bademode-bikini', 'Bikinis & Tankinis', [A('bikini|tankini')]),
    U('damen-bademode-badeanzug', 'Badeanzüge', [A('badeanzug|einteiler|schwimmanzug')]),
  ],
  'damen-nachtwaesche': [
    U('damen-nachtwaesche-pyjama', 'Pyjamas & Schlafanzüge', [A('pyjama|schlafanzug|schlaf-?set')]),
    U('damen-nachtwaesche-nachthemd', 'Nachthemden & Morgenmäntel', [A('nachthemd|nachtkleid|nachtgewand|nachtrobe|morgenrobe|morgenmantel|bademantel|robe(?![a-zäöüß])')]),
  ],
  'damen-dessous': [
    U('damen-dessous-bh', 'BHs, Dessous & Korsetts', [A('bh(?![a-zäöüß])|dessous|bustier|korsett|lingerie|body(?![a-zäöüß])')]),
    U('damen-dessous-shapewear', 'Shapewear', [A('shapewear|taillenformer|shaper|formend|bauch')]),
    U('damen-dessous-strumpfhosen', 'Strumpfhosen, Strümpfe & Socken', [A('strumpf|tights|feinstrumpf|netzstrümpfe|strümpfe'), E('socken|söckchen')]),
  ],
};


export const BESCHREIBUNG = {
  'damen-kleider': 'Kleider für Damen in allen Längen: Mini, Midi und Maxi. Mit den Filtern finden Sie Abend-, Sommer-, Strand- und Boho-Kleider.',
  'damen-roecke': 'Röcke für Damen als Mini-, Midi- und Maxiröcke, dazu Plissee- und Jeansröcke. Filtern Sie nach Länge und Stil.',
  'damen-jumpsuits': 'Jumpsuits, Overalls und Playsuits für Damen, lang und kurz. Dazu Einteiler für Sport und Yoga.',
  'damen-sets': 'Zweiteiler und Sets für Damen aus Top und Hose, Top und Rock oder Hoodie und Jogginghose. Dazu Hosenanzüge und Blazer-Sets.',
  'damen-jacken-maentel': 'Jacken, Mäntel, Blazer und Westen für Damen. Von der Übergangsjacke über den Trenchcoat bis zur Winter- und Daunenjacke.',
  'damen-jeans': 'Jeans für Damen in verschiedenen Schnitten wie High Waist, Wide Leg, Straight, Slim und Flared. Dazu Ripped-Jeans und Stretch-Jeans.',
  'damen-hosen': 'Hosen für Damen ausser Jeans: Stoffhosen, weite Hosen, Culottes, Capri- und Freizeithosen. Filtern Sie nach Schnitt und Anlass.',
  'damen-shorts': 'Kurze Hosen für Damen: Jeansshorts, Stoffshorts, Cargoshorts und Bermudas. Für Sommer, Urlaub und Alltag.',
  'damen-hoodies-sweatshirts': 'Hoodies, Sweatshirts und Kapuzenpullover für Damen. Mit oder ohne Reissverschluss, in normaler und Oversize-Passform.',
  'damen-strickjacken': 'Cardigans und Strickjacken für Damen, kurz und lang, mit oder ohne Kapuze. Zum Überziehen über Shirts und Kleider.',
  'damen-pullover': 'Pullover und Strickpullover für Damen, vom Rollkragenpullover bis zum Grobstrick. Dazu Pullover mit V-Ausschnitt oder Rundhals.',
  'damen-blusen-hemden': 'Blusen, Hemden und Hemdblusen für Damen aus Chiffon, Satin, Leinen oder Baumwolle. Mit und ohne Spitze oder Rüschen.',
  'damen-t-shirts': 'T-Shirts, Poloshirts und Langarmshirts für Damen. Einfarbig, gestreift oder mit Print.',
  'damen-tops': 'Tops, Tanktops, Camisoles, Crop-Tops und Bodys für Damen. Zum Kombinieren mit Röcken, Hosen und Blazern.',
  'damen-sportbekleidung': 'Sportbekleidung für Damen: Leggings, Yogahosen, Sport-Shorts, Sport-Tops und Trainingssets. Für Fitness, Yoga und Alltag.',
  'damen-bademode': 'Bikinis, Tankinis und Badeanzüge für Damen sowie Strandkimonos und Cover-ups. Für Pool, See und Meer.',
  'damen-nachtwaesche': 'Pyjamas, Nachthemden und Morgenmäntel für Damen. Dazu Loungewear für zu Hause.',
  'damen-dessous': 'BHs, Dessous, Korsetts und Shapewear für Damen. Dazu Strumpfhosen, Strümpfe und Socken.',
  'damen-umstandsmode': 'Kleider, Leggings, Jeans und Röcke für die Schwangerschaft. Dazu Stillkleider und Umstandswäsche.',
};

/* ---------------- Ableitung der Ausschluesse ---------------- */
const unter = (a, b) => a.every(x => b.some(y => x.startsWith(y)));
const ueberlappt = (a, b) => a.some(x => b.some(y => x.startsWith(y) || y.startsWith(x)));
export function kategorienBauen(roh = KATEGORIEN_ROH) {
  const out = [];
  for (const k of roh) {
    const n = JSON.parse(JSON.stringify(k));
    n.beschreibung = BESCHREIBUNG[n.handle] || n.beschreibung;
    if (!n.unterfilter.length && UNTERFILTER[n.handle]) n.unterfilter = JSON.parse(JSON.stringify(UNTERFILTER[n.handle]));
    for (const e of out) {
      if (!ueberlappt(n.g_prefix, e.g_prefix)) continue;
      if (e.titel_muss.length && !e.g_nicht.length && unter(n.g_prefix, e.g_prefix)) {
        if (e._opt.length) { // «Muster trifft UND Gegenmuster trifft nicht» als eine Regex mit Lookahead (Fremd- und Umstand-Ausschluss stehen ohnehin bei jeder Kategorie)
          const s = `^(?!.*(?:${e._opt.join('|')}))(?=.*(?:${e.titel_muss.join('|')}))`;
          if (!n.titel_nicht.includes(s)) n.titel_nicht.push(s);
        } else for (const s of e.titel_muss) if (!n.titel_nicht.includes(s)) n.titel_nicht.push(s);
      }
    }
    out.push(n);
  }
  return out;
}
export const KATEGORIEN = kategorienBauen();
