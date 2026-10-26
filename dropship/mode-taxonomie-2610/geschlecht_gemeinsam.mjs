/**
 * Gemeinsame Geschlechtsregel der vier Mode-Abteilungen (loest die vier getrennten Funktionen ab, wo sie sich widersprachen).
 * Rein, ohne Netz, schreibt nichts. Benutzt von pruefen.mjs; die Beschreibung steht in ALLES.json -> geschlecht.
 *
 * KLEIDUNG (Google-Kategorie "Apparel & Accessories > Clothing ..." oder leer):
 *   Eingaben sind die drei bisherigen Entscheidungen D (Damen-Regel), H (Herren-Regel), K (Kinder-Regel). Gemessen (28300 Produkte,
 *   11 901 Kleidungsprodukte) kommen nur 14 Kombinationen vor; jede steht unten mit Begruendung. Eine unbekannte Kombination liefert
 *   'konflikt' und wird von pruefen.mjs gemeldet (nie geraten).
 *     1  K = kinder                        -> kinder      (Familien-, Baby- und Kinderware; K kennt die Ausnahmen «Mädchenstil», «Babydoll», «im jungen Stil»)
 *     2  H = partner                       -> partner     (Paar-Looks; Familien hat 1 schon abgefangen)
 *     3  D oder H = kinder, K = andere     -> Damen-Regel ohne die Kinder-Ausnahmewoerter erneut («Mädchenstil»-Nachthemd ist Erwachsenenware)
 *     4  D = H                             -> D           (damen, herren, unisex, unbekannt)
 *     5  H = damen und D = herren | unisex -> damen       (weibliche Schnitte mit Herren-Etikett: Halterneck, Off-Shoulder, High-Waist; Selbst-gestalten-Yogaleggings)
 *     6  D = unisex und H = unbekannt      -> unisex      (Produkttyp T-Shirt)
 *     7  sonst                             -> konflikt
 *   Danach, nur bei 'unbekannt' (kein Titelwort, kein Tag, kein Produkttyp, keine Google-Kategorie nennt eine Zielgruppe):
 *     8  weiblich kodiertes Titelwort (Spitze, Rueschen, Cape, Poncho, Umhang, Schleier, Chiffon, Boho, hohe Taille ...) -> damen
 *     9  geschlechtsneutrale Kleidungsart (Hoodie, Sweatshirt, Pullover, Jacke, Weste, Hemd, Hose, Shorts, Socken, Pyjama,
 *        Bademantel, Trainingsanzug ...) und kein Fremdwort (taktisch, Tarn, Warn, Kostuem ...)             -> unisex (steht in Damen UND Herren)
 *     10 sonst bleibt 'unbekannt' (das Produkt steht in keiner Zielgruppen-Kategorie).
 * ANDERE WAREN (Schuhe, Taschen, Accessoires): die Regel aus sa_regeln.mjs (unveraendert; ohne Beleg gilt dort unisex).
 */
import { geschlechtQuelle as damenQ } from './damen-bekleidung_regeln.mjs';
import { geschlecht as herrenG } from './herren_gen.mjs';
import { geschlechtQuelle as kinderQ } from './kinder-baby-bekleidung_regeln.mjs';
import { geschlecht as saG, gruppeVon as saGruppe } from './sa_regeln.mjs';

const B = 'a-zäöüß';
export const istKleidung = p => /^Apparel & Accessories > Clothing( >|$)/.test(p.g || '') || !p.g;
const A = s => new RegExp(`(^|[^${B}])(${s})`, 'i');
// Ausnahmewoerter der Kinder-Regel (Erwachsenenware): vor der erneuten Damen-Entscheidung entfernen
const KIND_AUSNAHME = new RegExp(`baby-?(doll|tee|blau|rosa|pink)|mädchen-?(stil|haft)|(^|[^${B}])(im|am|vom|zum|mit|in|den|dem|einem|der|des) jungen`, 'gi');

export const WEIBLICH_TITEL = new RegExp(`(^|[^${B}])(spitze(?![${B}])|spitzen|rüschen|prinzess|chiffon|boho|hohe[rn]? taille|high[- ]?waist|ballett|waistcoat|tüll|bandeau|neckholder|bauchfrei)|(^|[^${B}]|kapuzen|woll|strick|samt|baumwoll|mesh|jacquard)(cape|capes|poncho|umhang|schleier)(?![${B}])`, 'i');
// Kleidungsart am WORTENDE (auch Zusammensetzungen: Freizeithose, Winterjacke, Kapuzenjacke, Sportjacke, Radanzug)
export const NEUTRAL_ART = new RegExp(`(hoodie|kapuzen[${B}]*|sweatshirt|pullover|jacke|weste|mantel|polo|shirt|hemd|hose|hosen|jeans|jogger|shorts|socken|pyjama|bademantel|anzug|fleece|cardigan|baselayer)(?![${B}])`, 'i');
// Fremdwoerter: Einsatz-/Funktionsware und Verkleidung bleiben «unbekannt» (nie raten); «badehose» ist meist Herrenware und gehoert nicht in Damen-Bademode
export const FREMD_WORT = new RegExp(`(^|[^${B}])(taktisch|tactical|tarn|warn|sicherheits|kost[üu]m|cosplay|laptop|trainer(?![${B}])|ständer|schürze|schutz(hose|weste)|angel|fischer|jagd|kampf|heiz|reflektier|led-|motorrad|ski-|schlauch)|kühl|badehose`, 'i');

export function geschlechtKleidung(p) {
  const [D, dq] = damenQ(p), H = herrenG(p), [K] = kinderQ(p);
  let g, q;
  if (K === 'kinder') { g = 'kinder'; q = 'kinder-regel'; }
  else if (H === 'partner') { g = 'partner'; q = 'herren-regel'; }
  else if ((D === 'kinder' || H === 'kinder') && K === 'andere') { g = damenQ({ ...p, title: (p.title || '').replace(KIND_AUSNAHME, ' ') })[0]; q = 'kinder-ausnahme'; }
  else if (D === H) { g = D; q = dq; }
  else if (H === 'damen' && (D === 'herren' || D === 'unisex')) { g = 'damen'; q = 'weiblicher-schnitt'; }
  else if (D === 'unisex' && H === 'unbekannt') { g = 'unisex'; q = 'typ'; }
  else { g = 'konflikt'; q = `D=${D} H=${H} K=${K}`; }
  if (g === 'unbekannt') {
    const t = p.title || '';
    if (WEIBLICH_TITEL.test(t) && !FREMD_WORT.test(t)) { g = 'damen'; q = 'weiblich-kodiert'; }
    else if (NEUTRAL_ART.test(t) && !FREMD_WORT.test(t)) { g = 'unisex'; q = 'neutrale-art'; }
  }
  return [g, q];
}
/**
 * ANDERE WAREN, Nachsatz: in der Gruppe Tasche/Geldboerse gilt ohne Beleg unisex (sa_regeln.mjs). Elf solcher Taschen tragen aber ein
 * eindeutig weiblich kodiertes Wort (Strohtasche, Korbtasche, Rattan, Baguette, Bow, Schalenhandtasche, Henkeltasche, Top-Handle,
 * Kettenriemen, Plueschtasche; am Datensatz gelesen, 11 von 11 sind Damentaschen) -> damen. Alles andere bleibt unisex.
 */
export const WEIBLICH_TASCHE = new RegExp(`(${'stroh|rattan|korbtasche|handkorb|baguette|schalenhandtasche|henkeltasche|top-?handle|kettenriemen|plüsch'})|(^|[^${B}])bow(?![${B}])`, 'i');
export function geschlechtSA(p) {
  const [g, q] = saG(p);
  if (q === 'unbekannt' && ['tasche', 'geldboerse'].includes(saGruppe(p)) && WEIBLICH_TASCHE.test(p.title || '')) return ['damen', 'weiblich-kodiert'];
  return [g, q];
}
/** Geschlecht je Abteilungsdatei (pruefen.mjs): die drei Kleidungsdateien teilen EINE Entscheidung. */
const kl = p => geschlechtKleidung(p)[0];
export const GEN_JE_DATEI = {
  'damen-bekleidung': kl,
  'herren-bekleidung': kl,
  'kinder-baby-bekleidung': kl,
  'schuhe-accessoires': p => geschlechtSA(p)[0],
};
