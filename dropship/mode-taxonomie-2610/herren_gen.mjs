// Geschlechts-Regel der Herren-Abteilung. Wird von herren_messen.mjs benutzt und im JSON (geschlecht_regel) in Worten beschrieben.
// Reihenfolge = Vorrang (erste zutreffende Stufe entscheidet).
import fs from 'fs';
// Messdatensatz nur für die Mess-Skripte (herren_*messen, *_bauen). Die Regeln selbst brauchen ihn nicht: ohne die Datei (CI, neue Umgebung) bleibt d null,
// damit lib/mode_taxonomie.mjs und seine Tests das Modul laden können.
export const d = fs.existsSync('/tmp/mode_daten.json') ? JSON.parse(fs.readFileSync('/tmp/mode_daten.json', 'utf8')) : null;
export const isCl = p => /^Apparel & Accessories > Clothing( >|$)/.test(p.g || '') || !p.g;
const B = 'a-zäöüß';
export const A_ = s => new RegExp(`(^|[^${B}])(${s})`, 'i');          // Wortanfang
export const W_ = s => new RegExp(`(^|[^${B}])(${s})(?![${B}])`, 'i'); // ganzes Wort
export const E_ = s => new RegExp(`(${s})(?![${B}])`, 'i');            // Wortende
const hasTag = (p, t) => (p.tags || []).some(x => x.toLowerCase() === t);
export const RX = {
  partner: A_('famili(e|en)|eltern-?kind|eltern (und|&) kind(er)?|mama(?![a-zäöüß])|papa(?![a-zäöüß])|mutter(?!schutz|schaft)|vater(?![a-zäöüß])|mommy|daddy|geschwister|für paare|pärchen|paar-?(look|t-?shirt|shirt|hoodie|pullover)|partner-?(shirt|look|outfit|hoodie)|couple|paare(?![a-zäöüß])'),
  kinder: A_('kinder|mädchen|maedchen|jungs|babys?(?![a-zäöüß])|baby-|kleinkind|teenager|teens?(?![a-zäöüß])|kids?(?![a-zäöüß])|säugling|neugeboren|strampler'),
  kinderGross: /(^|[^a-zäöüßA-ZÄÖÜ])Jungen(?![a-zäöüßA-ZÄÖÜ])/,
  unisex: A_('unisex|damen (und|&|/) ?herren|herren (und|&|/) ?damen|damen/herren|herren/damen|männer (und|&) frauen|frauen (und|&) männer'),
  herren: A_('herren(?!los)|männer|maenner|männlich|mann(?![a-zäöüß])|gentleman'),
  damen: A_('damen|frauen|weiblich|ladies|lady'),
  // Kleidungsstücke, die ein Herr nicht trägt: «Herren-Rock» ist dort ein Übersetzungsfehler
  nurDamen: A_('kleid(?![a-zäöüß]*schrank)|kleider|abendkleid|ballkleid|brautkleid|midikleid|maxikleid|minikleid|sommerkleid|rock(?![a-zäöüß])|röcke|minirock|maxirock|midirock|bh(?![a-zäöüß])|büstenhalter|bikini|tanga|dessous|negligé|babydoll|bustier|korsett|umstandsmode|stillen'),
  // eindeutig weibliche Schnitte: «Herren-Jeans High-Waist», «Herren Off-Shoulder-Hemd» sind Zuordnungsfehler der Quelle
  weiblichDesign: A_('off-?shoulder|halter-?neck|neckholder|schulterfrei|trägerlos|bauchfrei|high[- ]?waist(ed)?|high[- ]?rise|hohe taille|hochgeschnittene taille|tüll|schwangerschaft|hollow-?out'),
  eindeutigDamen: A_('yoga|legging|umstandsmode|schwangerschaft|stillshirt|stillen'),
  weichDamen: A_('bluse|blusen|camisole'),
};
const G_FEM = /Dresses|Skirts|Bras$|Lingerie|Nightgowns|Skorts/;
export function geschlecht(p) {
  const t = p.title || '', g = p.g || '';
  if (RX.partner.test(t)) return 'partner';
  if (/^Apparel & Accessories > Clothing > Baby & Toddler Clothing/.test(g)) return 'kinder';
  if (RX.kinder.test(t) || RX.kinderGross.test(t)) return 'kinder';
  if (RX.unisex.test(t)) return 'unisex';
  const h = RX.herren.test(t), dd = RX.damen.test(t);
  const fem = RX.nurDamen.test(t) || G_FEM.test(g);
  const th0 = hasTag(p, 'herren') || hasTag(p, 'maenner') || hasTag(p, 'männer');
  if (h && dd) return 'unisex';
  if (h && RX.weiblichDesign.test(t)) return 'damen';
  if (h) return (fem || (RX.weichDamen.test(t) && !th0)) ? 'damen' : 'herren';
  if (dd) return 'damen';
  if (hasTag(p, 'kinder')) return 'kinder';
  const th = hasTag(p, 'herren') || hasTag(p, 'maenner') || hasTag(p, 'männer'), td = hasTag(p, 'damen'), tu = hasTag(p, 'unisex');
  if (th && (fem || RX.weichDamen.test(t) || RX.weiblichDesign.test(t))) return 'damen';
  if (tu || (th && td)) return 'unisex';
  if (th) return 'herren';
  if (td) return 'damen';
  if (p.type === 'Herrenmode') return fem ? 'damen' : 'herren';
  if (p.type === 'Damenmode') return 'damen';
  if (p.type === 'Baby & Kinder' || p.type === 'Kinder') return 'kinder';
  if (G_FEM.test(g) || RX.eindeutigDamen.test(t)) return 'damen';
  if (hasTag(p, 'fertig-shirt') || hasTag(p, 'pod-shirt') || hasTag(p, 'printful_personalized_product') || /selbst gestalten/i.test(t)) return 'unisex';
  return 'unbekannt';
}
// Ursprungs-Signale (für die Widerspruchsmessung)
export const tagGeschlecht = p => {
  const th = hasTag(p, 'herren') || hasTag(p, 'maenner') || hasTag(p, 'männer'), td = hasTag(p, 'damen'), tk = hasTag(p, 'kinder');
  return th && td ? 'beide' : th ? 'herren' : td ? 'damen' : tk ? 'kinder' : 'keins';
};
export const titelGeschlecht = p => {
  const t = p.title || '';
  const h = RX.herren.test(t), dd = RX.damen.test(t);
  return h && dd ? 'beide' : h ? 'herren' : dd ? 'damen' : RX.kinder.test(t) ? 'kinder' : 'keins';
};
export { hasTag };
