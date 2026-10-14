// schusswaffen_zubehoer.mjs — Importer-Zwilling von google_sperrliste.ist_schusswaffen_zubehoer() (14.10.2026).
//
// BEFUND 14.10.2026 (alle 54'523 aktiven Produkte gelesen): 10 Stück Schusswaffen-Zubehör PER REGEL — Zielfernrohr-Montagen,
// zwei Gewehr-Zweibeine als «Taktisches Outdoor-Stativ», ein Schulterholster als «Taktische Brusttasche», eine Holster-
// Bauchtasche, Gewehrriemen. 7 ohne «waffe-pruefen», 6 davon im Google-Kanal; die drei mit Tag standen trotzdem auf TikTok,
// Facebook/Instagram und Pinterest. heikel_zweck.json hat «Zielfernrohr-Halterungszubehör» über seine Kamera-Titelsperre
// («Halterung») durchgewinkt. ⚠️ NICHT «10 aktiv»: die Nachprüfung (1'735 Bilder) fand ≥ 13 weitere Waffenteile, die nur
// am BILD erkennbar sind — Titel UND CJ-Name harmlos (GEMESSEN an 29 CJ-Namen: «Infrared calibrator» = Laser-Boresight,
// «Multifunctional tactical wrench» = AR-15-Schlüssel, «Outdoor tactical fishing gear backpack» = Gewehrrucksack). Die
// stehen als Handliste «bild_geprueft» in der Regeldatei (BILD_GEPRUEFT) und taggt der Bestandswächter; hier im Importer
// hilft dagegen stark_en: steht die Waffe im CJ-Namen («AR15 Wrench»), schlägt das jetzt den harmlosen deutschen Titel.
//
// Regel + Kanarien EINMAL in automation/data/schusswaffen_zubehoer_regel.json (Python liest dieselbe Datei). Gleichlauf:
// node automation/schusswaffen_zubehoer_gleichlauf_test.mjs (Kanarien + Probe gegen Python, 0 Abweichungen Pflicht).
// Folge im Importer: Tag «waffe-pruefen», nie in Google/TikTok/FB-IG/Pinterest; der Laden bleibt (in der Schweiz legal).
import { readFileSync } from 'node:fs';

const R = JSON.parse(readFileSync(new URL('./data/schusswaffen_zubehoer_regel.json', import.meta.url), 'utf8'));
const C = Object.fromEntries(['stark', 'stark_en', 'schwach', 'kontext', 'kontext_kopf', 'text_tragen', 'nicht_hart',
  'nicht_weich', 'nicht_en'].map(k => [k, new RegExp(R[k] || '(?!)')]));
export const KANARIEN = R.kanarien;
export const BILD_GEPRUEFT = R.bild_geprueft || {};   // am Bild bestimmte Waffenware (Bestandswächter taggt sie)

// Wie google_sperrliste._swz_klar: Tags weg, &nbsp;/&amp;, Leerraum zusammen, klein.
function klar(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').toLowerCase();
}

// Grund (wahr) oder '' — dieselbe Reihenfolge wie die Python-Fassung:
// nicht_hart (Titel/Typ) → nicht_en (CJ-Name leeren) → stark (Titel/Typ/Tags) → stark_en (CJ-Name eindeutig, schlägt
// nicht_weich) → stark im CJ-Namen ohne nicht_weich → schwaches Titelwort + Kontext.
export function istSchusswaffenZubehoer(titel, typ = '', tags = [], text = '', en = '') {
  const t = String(titel || '').toLowerCase();
  const ty = String(typ || '').toLowerCase();
  let e = String(en || '').toLowerCase();
  if (C.nicht_hart.test(t) || C.nicht_hart.test(ty)) return '';
  if (e && C.nicht_en.test(e)) e = '';
  const kopf = [t, ty, (tags || []).map(String).join(' ').toLowerCase()].join(' | ');
  let m = C.stark.exec(kopf);
  if (m) return 'stark:' + m[0];
  m = C.stark_en.exec(e);
  if (m) return 'stark-en-eindeutig:' + m[0];
  const weich = C.nicht_weich.test(t);
  m = C.stark.exec(e);
  if (m && !weich) return 'stark-en:' + m[0];
  const s = C.schwach.exec(t) || C.schwach.exec(e);
  if (s && !weich) {
    const x = klar(text);
    const k = C.kontext.exec(kopf + ' | ' + e) || C.kontext_kopf.exec(kopf + ' | ' + e)
           || C.kontext.exec(x) || C.text_tragen.exec(x);
    if (k) return 'schwach:' + s[0] + '+kontext:' + k[0].slice(0, 40);
  }
  return '';
}

// Für cj_category_fill.mjs: dieselbe Form wie heikelZweck() → dort entsteht Tag «waffe-pruefen», kein Kanal.
export function schusswaffenHeikel(titel, text, en = '') {
  const g = istSchusswaffenZubehoer(titel, '', [], text, en);
  return g ? { gruppe: 'waffe', grund: 'schusswaffen-zubehoer', muster: g.slice(0, 90), verboten: false, stelle: '' } : null;
}

export function kanarienFehler() {
  return KANARIEN.filter(k => Boolean(istSchusswaffenZubehoer(...k.slice(0, 5))) !== k[5]);
}

export default istSchusswaffenZubehoer;
