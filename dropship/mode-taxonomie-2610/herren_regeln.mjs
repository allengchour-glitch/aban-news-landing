// Quelle der Wahrheit für die Herren-Abteilung. herren_messen.mjs misst diese Regeln und schreibt /tmp/mode_taxonomie/herren-bekleidung.json.
// Reihenfolge = Vorrang. Ausschlüsse gegenüber vorrangigen Kategorien mit überlappender Google-Kategorie werden beim Schreiben des JSON
// AUSDRÜCKLICH in titel_nicht eingetragen (ableiten() in herren_messen.mjs), damit jede Kategorie für sich ausführbar ist.
const B = 'a-zäöüß';
export const A = s => `(^|[^${B}])(${s})`;             // Wortanfang (rechts offen: Zusammensetzungen)
export const W = s => `(^|[^${B}])(${s})(?![${B}])`;   // ganzes Wort
export const E = s => `(${s})(?![${B}])`;              // Wortende (links offen: «Langarmhemd»)
const CL = 'Apparel & Accessories > Clothing > ';
export const G_SHIRTS = [CL + 'Shirts & Tops'];
export const G_JACKEN = [CL + 'Outerwear > Coats & Jackets'];
export const G_ANZUG = [CL + 'Suits', CL + 'Outerwear > Coats & Jackets'];
export const G_WESTEN = [CL + 'Outerwear > Vests'];
export const G_HOSEN = [CL + 'Pants'];
export const G_SHORTS = [CL + 'Shorts', CL + 'Pants'];
export const G_OVERALL = [CL + 'One-Pieces > Jumpsuits & Rompers'];
export const G_SETS = [CL + 'Outfit Sets', CL + 'Shirts & Tops', CL + 'Pants', CL + 'Shorts', CL + 'Outerwear > Coats & Jackets'];
export const G_SPORT = [CL + 'Activewear'];

export const HOODIE = [E('hoodies?|hoodys?|hooded'), A('sweat-?shirts?'), A('kapuzen-?(pullover|pulli|sweat\\w*|shirt|jacke|cardigan|kardigan)'), A('sweatjacke'), '^(?=.*pullover)(?=.*kapuze)'];
export const POLO = [`^(?!.*(pullover|cardigan|strickjacke))(.*[^${B}])?polo(?!-?(kragen|ausschnitt|hals))`];
export const PULLOVER = [E('pullover|pullis?|sweater|troyer|turtleneck|cardigans?|kardigans?|kardigen|cardigan-?jacke'), `^(?!.*hemd)(.*[^${B}])?strick(?!muster|-?\\s?polo)`, `^(?!.*(t-?shirt|hemd)).*rollkragen`, `^(?!.*(t-?shirt|hemd)).*(half-?zip|halb-?zip|halbzipfel)`, A('fleece-?(pullover|pulli|sweater|shirt)'), A('wollpullover')];
export const HEMD = ['(?<!unter|nacht)hemd', A('overshirt|button-?(down|up)|guayabera|kimono'), 'blusen?', '^(?=.*shirt)(?!.*(t-?shirt|henley|henry))(?=.*(knopfleiste|revers|button|stehkragen|kubakragen|mandarin|plaid|kariert|karo|bügelfrei|cord|flanell|oxford|kragen|knöpf))'];
export const TSHIRT = [A('t-?shirts?|tees?(?![a-zäöüß])|tops?(?![a-zäöüß])|tank|singlet|muskel|trikot|henley|longsleeve|unterhemd'), E('shirts?|top'), 'oberteil|schirt|kurzärml'];

export const ANZUG = ['(?<!arbeits|schutz|jagd|ski|regen)anzug', A('sakko|blazer|smoking|zweireiher|business-?jacke|frack|gehrock'), '(?<!denim[ -])jackett'];
export const SHORTS = [`^(?!.*(kombination|hemd)).*shorts?(?![${B}])`, 'kurzjeans', 'kurze (washed )?(denim )?jeans', A('bermuda')];
export const SETS = [`(^|[^${B}])(sets?|outfits?|kombination)(?![${B}])`, `(shirt|hemd|hoodie|oberteil|top|jacke|weste|kurzärmling|pullover)[${B}-]* ?(und|&|\\+) ?[${B}-]*(hose|hosen|shorts|jogger)`];
export const KATEGORIEN = [
  { handle: 'herren-sets', titel: 'Sets & Zweiteiler', g: G_SETS, muss: SETS, nicht: [] },
  { handle: 'herren-anzuege-sakkos', titel: 'Anzüge & Sakkos', g: G_ANZUG, muss: ANZUG, nicht: [] },
  { handle: 'herren-hoodies-sweatshirts', titel: 'Hoodies & Sweatshirts', g: G_SHIRTS, muss: HOODIE, nicht: [] },
  { handle: 'herren-poloshirts', titel: 'Poloshirts', g: G_SHIRTS, muss: POLO, nicht: [] },
  { handle: 'herren-pullover-strick', titel: 'Pullover & Strick', g: G_SHIRTS, muss: PULLOVER, nicht: [] },
  { handle: 'herren-hemden', titel: 'Hemden', g: G_SHIRTS, muss: HEMD, nicht: [] },
  { handle: 'herren-t-shirts', titel: 'T-Shirts & Shirts', g: G_SHIRTS, muss: TSHIRT, nicht: [] },
  { handle: 'herren-jacken-maentel', titel: 'Jacken & Mäntel', g: G_JACKEN, muss: [], nicht: [A('warnjacke|sicherheits')] },
  { handle: 'herren-westen', titel: 'Westen', g: G_WESTEN, muss: [], nicht: [A('warn|sicherheits|schutz|kampf|angel|fischer|jagd|kühl|heiz|reflekt|trage')] },
  { handle: 'herren-shorts', titel: 'Shorts', g: G_SHORTS, muss: SHORTS, nicht: [] },
  { handle: 'herren-jeans', titel: 'Jeans', g: G_HOSEN, muss: [E('jeans?|jeanshosen?'), A('denim')], nicht: [] },
  { handle: 'herren-hosen', titel: 'Hosen', g: G_HOSEN, muss: [], nicht: [A('schutz|schürze|skianzug|snowboard')] },
  { handle: 'herren-overalls', titel: 'Overalls & Jumpsuits', g: G_OVERALL, muss: [], nicht: [A('ski-?overall|ringer|einteiler')] },
  { handle: 'herren-sportbekleidung', titel: 'Sportbekleidung', g: G_SPORT, muss: [], nicht: [] },
];
