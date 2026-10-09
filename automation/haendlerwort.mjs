// haendlerwort.mjs — wörtlich übersetzte chinesische Händlerwörter + Uhren-Modellnamen fremder Marken an der Quelle (09.10.2026).
// Regel: automation/data/haendlerwort_regel.json, dieselbe Datei liest automation/haendlerwort.py (Bestand, täglich im Aufseher).
// 防爆 → «explosionsgeschützt» (bei Leinen = reissfest, bei Werkzeug/Akku eine falsche Sicherheitsangabe), 爆款 → «Explosive …»,
// ins风 → «Ins Wind», 百搭 → «All-match», Submariner/Daytona/Datejust/Nautilus im Uhrentitel. Eingehängt in fallenSicher
// (cj_copy_prompt.mjs) = alle drei CJ-Importer. Gegenprobe: haendlerwort_gleichlauf_test.mjs.
import fs from 'node:fs';
const R = JSON.parse(fs.readFileSync(new URL('./data/haendlerwort_regel.json', import.meta.url), 'utf8'));
const S = (p) => p.replaceAll('{V}', R.grenze_vor).replaceAll('{N}', R.grenze_nach).replaceAll('{M}', R.uhr_modell);
const rep = (r) => r.replace(/\\(\d)/g, '$$$1');
const L = (liste, f) => liste.map(([p, r]) => [new RegExp(S(p), f), rep(r)]);
const EXPL = new RegExp(S(R.explosion_wort), 'iu');
const REISS_KTX = new RegExp(R.reissfest_kontext, 'iu');
const REISS = L(R.reissfest, 'gu'), WEG = L(R.weg_attributiv, 'giu'), EXPLOSIV_T = L(R.explosiv_titel, 'giu');
const HAENDLER = L(R.haendlerwort, 'giu'), HAENDLER_TEXT = L(R.haendlerwort_text, 'giu');
const UHR_KTX = new RegExp(R.uhr_kontext, 'iu'), UHR_KOMP = new RegExp(S(R.uhr_kompatibel), 'iu'), UHR = L(R.uhr_regeln, 'giu');
const UHR_MOD = new RegExp(S(R.uhr_modell), 'iu');
export const HAENDLER_WORT = /(?<![a-zäöü])(?:ins[\s-](?:wind|style|stil)|all-?match(?:ing)?)(?![a-zäöü])/iu;
const PRAEP = /^(?:für|mit|zur|zum|und|oder|durch|bei|von|aus)(?![\wäöüß])/iu;
const HAENGT = /(?<![\wäöüß])(?:seine|ihre|die|der|das|durch|mit|und|eine|einen|einer|für)\s*[.!?]?\s*$/iu;
const WAISE = /(?<![\wäöüÄÖÜ])-[A-Za-zÄÖÜäöü]|[«»"„“]\s*[«»"„“]/gu;

const sub = (regeln, t) => regeln.reduce((a, [rx, r]) => a.replace(rx, r), t);
const glatt = (t) => t.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.;:!?)])/g, '$1').replace(/,\s*,/g, ',').replace(/^[\s,·\-–]+|[\s,·\-–]+$/g, '');
const gross = (t) => t ? t[0].toUpperCase() + t.slice(1) : t;
const woerter = (t) => (t.match(/[A-Za-zÄÖÜäöüß]{2,}/g) || []).length;

// → [neu, gründe]. hand=false: nur die Regel (Kanarien).
export function titelFix(t, hand = true) {
  t = String(t || '');
  if (hand && R.handtitel && Object.prototype.hasOwnProperty.call(R.handtitel, t)) return [R.handtitel[t], ['hand']];
  let neu = t; const gr = [];
  let n2 = sub(EXPLOSIV_T, neu); if (n2 !== neu) { gr.push('explosiv'); neu = n2; }
  if (UHR_KTX.test(neu) && !UHR_KOMP.test(neu)) { n2 = sub(UHR, neu); if (n2 !== neu) { gr.push('uhr-modell'); neu = n2; } }
  if (EXPL.test(neu)) { n2 = REISS_KTX.test(neu) ? sub(REISS, neu) : sub(WEG, neu); if (n2 !== neu) { gr.push('explosion'); neu = n2; } }
  n2 = sub(HAENDLER, neu); if (n2 !== neu) { gr.push('haendlerwort'); neu = n2; }
  if (!gr.length) return [t, []];
  return [gross(glatt(neu)), gr];
}

function satzFix(s, reiss, imLi) {
  if (!EXPL.test(s)) return s;
  if (reiss || REISS_KTX.test(s)) return sub(REISS, s);
  const n = glatt(sub(WEG, s));
  const kopfWeg = (s.split(/\s+/).filter(Boolean)[0] || '') !== (n.split(/\s+/).filter(Boolean)[0] || '');
  if (EXPL.test(n) || (kopfWeg && PRAEP.test(n)) || HAENGT.test(n) || woerter(n) < (imLi ? 2 : 4)) return '';
  return gross(n);
}

export function textFix(html, titel) {
  titel = String(titel || '');
  if (!html || !(EXPL.test(html) || HAENDLER_WORT.test(html) || (UHR_KTX.test(titel) && UHR_MOD.test(html)))) return html;
  const reiss = REISS_KTX.test(titel);
  const teile = html.split(/(<[^>]+>)/);
  const offen = [];
  for (let i = 0; i < teile.length; i++) {
    let tk = teile[i];
    if (tk.startsWith('<')) {
      const m = tk.match(/^<(\/?)([a-z0-9]+)/i);
      if (m) { if (m[1]) { if (offen.length && offen[offen.length - 1] === m[2].toLowerCase()) offen.pop(); } else offen.push(m[2].toLowerCase()); }
      continue;
    }
    if (UHR_KTX.test(titel) && !UHR_KOMP.test(tk)) tk = sub(UHR, tk);
    if (HAENDLER_WORT.test(tk)) {
      tk = tk.split(/(?<=[.!?])(\s+)/).map((x) => {
        if (!x || /^\s+$/.test(x) || !HAENDLER_WORT.test(x)) return x;
        const n = glatt(sub(HAENDLER_TEXT, x));
        return (HAENDLER_WORT.test(n) || (n.match(WAISE) || []).length > (x.match(WAISE) || []).length) ? '' : n;
      }).join('');
    }
    if (EXPL.test(tk)) {
      tk = tk.split(/(?<=[.!?])(\s+)/).map((x) => (!x || /^\s+$/.test(x)) ? x : satzFix(x, reiss, offen.includes('li'))).join('');
      tk = tk.replace(/\s{2,}/g, ' ');
    }
    teile[i] = tk;
  }
  return teile.join('').replace(/<li>\s*(?:<strong>\s*<\/strong>)?\s*<\/li>\s*/g, '').replace(/<p>\s*<\/p>/g, '');
}

export const KANARIEN = R.kanarien;
export default titelFix;
