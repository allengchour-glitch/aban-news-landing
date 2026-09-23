// klingenregel.mjs — EINE Quelle für die Klingen-Hausregel (Google-Kanal).
//
// Vorher stand dieselbe Regex wörtlich in fünf Dateien (cj_category_fill.mjs,
// cj_sku_import.mjs, cj_trending_import.mjs, google_kanal_luecke.py,
// google_kanal_luecke_schliessen.py). Am 28.08. musste sie in allen fünf
// repariert werden, am 29.08. erneut. Sechste Wiederholung der Geschwister-
// Lehre nach Farbtabelle, Grössenmenge, publishVerified(), Preisformel und
// technik_plausibel. **Neue Klingenwörter NUR in klingenregel.json.**
//
// Die JSON liegt neben dieser Datei; sie wird über import.meta.url aufgelöst,
// damit der Aufrufer aus jedem Arbeitsverzeichnis starten kann (die Runner
// laufen aus /tmp).
//
// Drei Stufen, jede aus einem echten Fehlgriff:
//  1. klinge_am_ende      — die Ware selbst. Wortgrenze am ENDE, weil deutsche
//                           Zusammensetzungen das Grundwort hinten tragen.
//                           «Messerblock»/«Messerschärfer» bleiben damit
//                           korrekt draussen (Zubehör ist bei Google zulässig).
//  2. waffenwort_vorne    — Lücke 29.08.: «Retro Schwertabdeckung» ist eine
//                           Scheide und fiel durch Stufe 1. Ohne «messer», sonst
//                           fiele der Messerblock wieder heraus.
//  3. *_ausnahme          — Gegenrichtung: «Schwertblatt» ist der Bogenhanf,
//                           «Schwertwal» der Orca.
import { readFileSync } from 'node:fs';

const R = JSON.parse(readFileSync(new URL('./klingenregel.json', import.meta.url), 'utf8'));

export const KLINGE_AM_ENDE   = new RegExp(R.klinge_am_ende, 'i');
export const WAFFENWORT_VORNE = new RegExp(R.waffenwort_vorne, 'i');
export const VORNE_AUSNAHME   = new RegExp(R.waffenwort_vorne_ausnahme, 'i');
export const MESSGERAET       = new RegExp(R.messgeraet_ausnahme, 'i');
export const KONTEXT_AUSNAHME = new RegExp(R.kontext_ausnahme, 'i');
export const HANDKLINGE_STAMM      = new RegExp(R.handklinge_stamm, 'i');
export const HANDKLINGE_KEIN_PAKET = new RegExp(R.handklinge_kein_paket, 'i');
export const HANDKLINGE_GERAET     = new RegExp(R.handklinge_geraet, 'i');
export const HANDKLINGE_SPIELZEUG  = new RegExp(R.handklinge_spielzeug, 'i');
export const HANDKLINGE_MIT_ZUBEHOER = new RegExp(R.handklinge_mit_zubehoer, 'i');
const KLINGEN_NOMEN = new Set(['messer', 'messern', 'knife', 'knives']);

// Die Kontext-Ausnahme steht ZUERST: «Washed Machete Jeans» ist eine Waschung,
// «Samurai mit Katana, 30 cm» eine Dekofigur. Ein Kleidungs- oder Deko-Wort
// sticht die Klingenwörter — sonst räumt die Regel halbe Abteilungen leer.
export function istKlinge(titel) {
  const t = titel || '';
  if (KONTEXT_AUSNAHME.test(t)) return false;
  if (KLINGE_AM_ENDE.test(t) && !MESSGERAET.test(t)) return true;
  if (WAFFENWORT_VORNE.test(t) && !VORNE_AUSNAHME.test(t)) return true;
  return false;
}

// istHandklinge — die VERSANDFRAGE, nicht die Werbefrage (Lehre 16.09.2026, #1017).
// CJ hat die Sendung aus Shanghai als VERBOTENEN ARTIKEL zurueckgeschickt; fuer die
// Schweiz gibt es keine Linie fuer Klingen, egal was freightCalculate vorher sagte.
// WEITER als istKlinge: «Edelstahl-Messerset» faellt dort durchs Fugen-s, hier nicht.
// ENGER als istKlinge: Zubehoer ohne Klinge im Paket (Block, Halter, Schaerfer,
// Schwertpflegeoel) und Geraete mit gekapselter Klinge (Mixer, Rasierer, Schere)
// duerfen weiter in die Schweiz und bleiben im Verkauf.
export function istHandklinge(titel) {
  const t = titel || '';
  if (KONTEXT_AUSNAHME.test(t)) return false;
  if (HANDKLINGE_SPIELZEUG.test(t)) return false;
  if (MESSGERAET.test(t)) return false;
  if (WAFFENWORT_VORNE.test(t) && VORNE_AUSNAHME.test(t)) return false;
  // 23.09.2026: Paket MIT Klinge — «Hackmesser mit Schutzhülle», «Messerblock mit 6 Messern».
  // Steht VOR der Zubehör-Ausnahme, weil «schutzhülle»/«scheide» dort als reines Zubehör gelten.
  const m = HANDKLINGE_MIT_ZUBEHOER.exec(t);
  if (m && !HANDKLINGE_GERAET.test(t)) {
    const vor = t.slice(0, m.index);
    if (KLINGEN_NOMEN.has(m[1].toLowerCase())) return true;
    if (HANDKLINGE_STAMM.test(vor) && !HANDKLINGE_KEIN_PAKET.test(vor)) return true;
  }
  if (HANDKLINGE_KEIN_PAKET.test(t) || HANDKLINGE_GERAET.test(t)) return false;
  return HANDKLINGE_STAMM.test(t);
}
