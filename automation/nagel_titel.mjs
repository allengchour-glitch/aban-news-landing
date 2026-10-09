// nagel_titel.mjs — 穿戴甲-Übersetzungsfalle an der Quelle (09.10.2026). Regel: automation/data/nagel_titel_regel.json,
// dieselbe Datei liest automation/nagel_titel.py (Bestand, täglich im Aufseher). Gegenprobe: nagel_titel_gleichlauf_test.mjs.
// Anlass: «Nagelverstärkungstabletten», «Long Wear Armor», «Handgemachte Rüstung», «Nagelarmor» — CJ übersetzt 穿戴甲
// (tragbarer Nagel; 甲 = Nagel UND Panzer) wörtlich. Eingehängt in fallenSicher (cj_copy_prompt.mjs) = alle drei CJ-Importer.
import fs from 'node:fs';
const R = JSON.parse(fs.readFileSync(new URL('./data/nagel_titel_regel.json', import.meta.url), 'utf8'));
const rx = (s, g = '') => new RegExp(s.replaceAll('{V}', R.grenze_vor).replaceAll('{N}', R.grenze_nach), 'iu' + g);
const KONTEXT = rx(R.nagel_kontext), NOMEN = rx(R.nagel_nomen), STICKER = rx(R.sticker);
const HART = R.hart.map(([p, r, g]) => [rx(p, 'g'), r, g]);
const ADJ_ENDE = rx(R.adjektiv_ende), ADJ_PLURAL = rx(R.adjektiv_plural, 'g');

function aufraeumen(t) {
  return t.replace(/\s{2,}/g, ' ').replace(/\s+([,.;:)])/g, '$1').replace(/(?:\s*·\s*){2,}/g, ' · ')
    .replace(/\(\s*\)/g, '').replace(/^[\s·\-–,]+|[\s·\-–,]+$/g, '');
}

export function hart(t) {
  let neu = String(t || ''); const gr = [];
  for (const [re, rep, g] of HART) { const n2 = neu.replace(re, rep); if (n2 !== neu) { gr.push(g); neu = n2; } }
  return [neu, gr];
}

// → [neuer Titel, gründe]. Ohne Nagel-Kontext (Titel + CJ-Name, oder nagelWare) oder ohne harten Treffer: unverändert.
export function nagelTitel(titel, en = '', nagelWare = false) {
  const t = String(titel || '');
  if (!nagelWare && !KONTEXT.test(`${t} ${en || ''}`)) return [t, []];
  let [neu, gr] = hart(t);
  if (!gr.length) return [t, []];
  neu = aufraeumen(neu);
  if (!NOMEN.test(neu)) {
    const n2 = neu.replace(STICKER, 'Press-on-Nägel');
    if (n2 !== neu) neu = n2;
    else if (!neu) neu = 'Press-on-Nägel';
    else if (ADJ_ENDE.test(neu)) neu = neu + ' Press-on-Nägel';
    else neu = neu + ' · Press-on-Nägel';
  }
  neu = neu.replace(ADJ_PLURAL, (m, a, b) => a + 'e' + b);
  return [aufraeumen(neu), gr];
}

export const KANARIEN = R.kanarien;
export default nagelTitel;
