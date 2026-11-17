// Regelwerk: Karat/Feingehalt raus, «goldplattiert»/«Gold filled»/«Echtgold» → «vergoldet». Nur Textknoten.
const S = String.raw;
const SEP = S`[\s\-‑]*`;
const KT = S`(?:9|10|14|18|22|24)\s?[-‑]?\s?(?:k|kt|karat|carat)(?![a-zäöüß])`;   // 18K, 18 K, 18-K, 18 Karat
const KA = S`(?:9|10|14|18|22|24)[-‑ ]?karätig\w*`;                                 // 18-karätig(e)
const LB = S`(?<![\w.,])`;
const NOUN = S`(?:gold[\s\-‑]?plattierung|gold[\s\-‑]?platierung|goldauflage|gold[\s\-‑]?verplattung|goldverplattung|gold[\s\-‑]?füllung|goldfüllung|goldgefüllung|echt[\s\-‑]?vergoldung|echtgold[\s\-‑]?(?:vergoldung|beschichtung|plattierung)|vergoldung|goldbeschichtung|gold[\s\-‑]?beschichtung)`;
const up = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const satzAnfang = (str, off) => off === 0 || /[.!?]\s+$/.test(str.slice(0, off));
// Ersatz mit Gross-/Kleinschreibung: am Knoten- oder Satzanfang gross, sonst wie angegeben
const E = (rep) => (...a) => { const off = a[a.length - 2], str = a[a.length - 1]; return satzAnfang(str, off) ? up(rep) : rep; };
const R = (name, re, f) => [name, new RegExp(re, 'gi'), f];
export const REGELN = [
  // --- Echtgold + PVD / Vergoldung ---------------------------------------------------------
  R('echtgold-pvd-1', S`mit\s+${KT}\s+echtgold\s+pvd-beschichtet`, E('PVD-vergoldet')),
  R('echtgold-pvd-2', S`pvd-beschichtet\s+mit\s+${KT}\s+echtgold`, E('PVD-vergoldet')),
  R('echtgold-pvd-3', S`${KT}\s+echtgold\s+pvd-beschichtet`, E('PVD-vergoldet')),
  R('echtgold-vergoldet', S`mit\s+${KT}\s+echtgold\s+vergoldet`, E('vergoldet')),
  R('echtes-gold-plattiert', S`echtes\s+${KT}\s+gold\s+plattiert`, E('vergoldet')),
  R('echtes-gold-plating', S`echtes\s+gold-plating`, () => 'Vergoldung'),
  R('echtgold-nomen', S`${KT}\s+echt(?:gold|vergoldung)(?:[\s\-‑]?(?:vergoldung|beschichtung|galvanisierung|plattierung))?`, () => 'Vergoldung'),
  // --- Gold filled / Gold plated (englisch) ------------------------------------------------
  R('aus-gold-filled', S`aus\s+${KT}\s+gold\s+filled\s+material`, () => 'aus vergoldetem Material'),
  R('gold-filled', S`${KT}\s+gold\s+filled\s+material`, E('vergoldetes Material')),
  R('real-gold-plating', S`${KT}\s+real\s+gold\s+plating`, () => 'Vergoldung'),
  R('real-gold-plated', S`aus\s+${KT}\s+real\s+gold\s+plated\s+material`, () => 'aus vergoldetem Material'),
  R('gold-plated', S`${KT}\s+gold[\s\-‑]plated`, E('vergoldet')),
  // --- «mit 18K Gold beschichtet/überzogen/…» -----------------------------------------------
  R('mit-gold-verb', S`mit\s+${KT}\s+gold\s+(?:beschichtet|überzogen|veredelt|galvanisiert|plattiert|elektroplattiert|vergoldet)`, E('vergoldet')),
  // --- Karat + Plattierungs-Nomen -> «Vergoldung» (Galvanisierung/Elektroplattierung bleiben neutral: nur die Zahl fällt weg) ---
  R('karat-nomen', S`${KT}${SEP}${NOUN}`, () => 'Vergoldung'),
  R('karat-goldplattiert-adj', S`${KT}${SEP}gold[\s\-‑]?(?:plattiert|verplattet|gefüllt)(\w*)`, (m, a, ...r) => E('vergoldet' + a)(m, a, ...r)),
  R('karatig-nomen', S`${KA}${SEP}${NOUN}`, () => 'Vergoldung'),
  // --- Weissgold-plattiert -----------------------------------------------------------------------
  R('weissgold-plattiert', S`wei(?:ss|ß)gold[\s\-‑]?plattiert(\w*)`, (m, a, ...r) => E('weiss vergoldet' + a)(m, a, ...r)),
  R('weissgold-plattierung', S`wei(?:ss|ß)gold[\s\-‑]?plattierung`, () => 'Weiss-Vergoldung'),
  // --- übrige Plattierungswörter ----------------------------------------------------------------
  R('echtes-goldplattiert', S`echte[rsnm]?\s+gold[\s\-‑]?plattiert(\w*)`, (m, a, ...r) => E('vergoldet' + a)(m, a, ...r)),
  R('goldplattiert-adj', S`gold[\s\-‑]?(?:plattiert|verplattet|gefüllt)(\w*)`, (m, a, ...r) => E('vergoldet' + a)(m, a, ...r)),
  R('gold-nomen', S`(?<![\w-])(?:gold[\s\-‑]?plattierung|gold[\s\-‑]?platierung|goldauflage|gold[\s\-‑]?verplattung|goldverplattung|gold[\s\-‑]?füllung|goldfüllung|goldgefüllung)(?![\w-])`, () => 'Vergoldung'),
  R('bindestrich-plattierung', S`(?<=\w)-gold[\s\-‑]?plattierung(\w*)`, (m, a) => '-Vergoldung' + a),
  R('kupfer-echtgold', S`(\w+)-echtgold-plattierung`, (m, a) => 'Vergoldung auf ' + a),
  R('echtvergoldung', S`(?<![\w-])echt[\s\-‑]?vergoldung`, () => 'Vergoldung'),
  R('echtgold-nomen2', S`(?<![\w-])echtgold[\s\-‑]?(?:galvanisierung|beschichtung|plattierung|vergoldung)`, () => 'Vergoldung'),
  R('echtes-gold-durch', S`echtes\s+gold\s+durch\s+elektroplattierung`, () => 'Vergoldung durch Elektroplattierung'),
  R('vergoldet-mit-gold', S`vergoldet\s+mit\s+(?:${KT}\s+)?gold(?![\w-])`, () => 'vergoldet'),
  R('echt-vor-gold-nomen', S`echt\w*\s+(?=gold[\s\-‑]?(?:plating|elektroplattierung|beschichtung))`, () => ''),
  R('gold-plating', S`(?<![\w-])gold[\s\-‑]?plating`, () => 'Vergoldung'),
  R('hochkaraetig', S`hochkarätig(\w*)`, (m, a) => 'hochwertig' + a),
  R('pvd-gold-vakuum', S`PVD-Gold-Vakuumbeschichtung`, () => 'PVD-Vakuum-Vergoldung'),
  R('gold-elektroplattierung', S`mit\s+Gold-Elektroplattierung\s+veredelt`, () => 'galvanisch vergoldet'),
  R('echtgold-rest', S`(?<![\w-])echt(?:es)?\s?gold(?![a-zäöüß])`, () => 'Gold'),
  // --- Rest: Karat-Zahl samt Trenner streichen; folgender Buchstabe am Satzanfang gross ---------
  R('karat-vor-wort', S`${LB}(?:${KT}|${KA})[\s\-‑]*([A-Za-zÄÖÜäöüß])`, (m, b, ...r) => { const off = r[r.length - 2], str = r[r.length - 1]; return satzAnfang(str, off) ? up(b) : b; }),
  R('karat-nachgestellt', S`\s${KT}(?=[\s,.;:)…]|$)`, () => ''),
  R('gold-schicht-verb', S`mit\s+einer\s+Gold-Schicht\s+überzogen`, () => 'vergoldet'),
  R('gold-schicht', S`(?<![\w-])Gold-Schicht(?![\w-])`, () => 'Vergoldung'),
  R('k-vor-farbe', S`(?<![\w.-])K\s+(?=Weiss|Gelb|Rosé|Rose)`, () => ''),
  // --- «echte Vergoldung» → «Vergoldung» --------------------------------------------------------
  R('echte-vergoldung', S`\becht(?:e[rsnm]?)\s+(?=vergoldung|vergoldet)`, () => ''),
  // --- Satzbau nach dem Streichen ---------------------------------------------------------------
  R('veredelt-mit-vergoldung', S`veredelt\s+mit\s+Vergoldung(?=[.,])`, () => 'vergoldet'),
  R('bullet-veredelt-mit-vergoldung', S`^Veredelt\s+mit\s+Vergoldung$`, () => 'Vergoldet'),
  R('mit-vergoldung-versehen', S`mit\s+Vergoldung\s+(?=versehen)`, () => 'mit einer Vergoldung '),
  R('vergoldung-allein', S`(?<=[.!?]\s)Vergoldung\.(?=\s|$)`, () => 'Das Schmuckstück ist vergoldet.'),
];
const TEXT_RE = /(<[^>]*>)/;
export function wende(text) { // Zeichenkette ohne Tags
  let t = text;
  for (const [, re, f] of REGELN) t = t.replace(re, f);
  return t;
}
export function wendeHtml(html) {
  return String(html).split(TEXT_RE).map((s, i) => (i % 2 ? s : wende(s))).join('');
}
export const PRUEF = new RegExp(S`${LB}${KT}|${KA}|goldplattier|gold-plattier|gold[\s\-‑]?filled|goldgefüllt|goldfüllung|gold-füllung|goldverplatt|echtgold|echtes gold|real gold|goldplatier|gold-platier|echtvergold|reinheit|purität|purity|feingehalt|(?<![\w.-])K\s+(?=Weiss|Gelb)|hochkarät`, 'i');
