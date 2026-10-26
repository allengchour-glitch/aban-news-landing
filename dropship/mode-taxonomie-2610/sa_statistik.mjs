// Messwerte fuer geschlecht_regel / widersprueche (alles am Datensatz). node sa_statistik.mjs
import { daten, B } from './sa_lib.mjs';
import { gruppeVon, geschlecht, KID_RE, KID_AUSNAHME, HER_RE, DAM_RE, UNI_RE } from './sa_regeln.mjs';

export function titelGeschlecht(t) {
  const tt = t.replace(new RegExp(KID_AUSNAHME.source, 'ig'), ' ');
  const h = HER_RE.test(t), d = DAM_RE.test(t);
  if (KID_RE.test(tt) && !h && !d && !/kinder-? (und|&) erwachsene|erwachsene[n]?-? (und|&) kinder/i.test(t)) return 'kinder';
  if (UNI_RE.test(t) || (h && d) || /kinder-? (und|&) erwachsene|erwachsene[n]?-? (und|&) kinder/i.test(t)) return 'unisex';
  if (h) return 'herren'; if (d) return 'damen'; return null;
}
export function tagGeschlecht(p) {
  const t = p.tags; const k = t.includes('kinderschuhe') || t.includes('kinder');
  const d = t.includes('damenschuhe') || t.includes('damen'), h = t.includes('herrenschuhe') || t.includes('herren') || t.includes('maenner');
  if (k) return 'kinder'; if (d && h) return 'unisex'; if (t.includes('unisex')) return 'unisex'; if (h) return 'herren'; if (d) return 'damen'; return null;
}
export const typGeschlecht = p => ({ Damenschuhe: 'damen', Herrenschuhe: 'herren', Kinderschuhe: 'kinder' })[p.type] || null;

export function statistik() {
  const U = daten.filter(p => gruppeVon(p));
  const gr = {}; for (const p of U) gr[gruppeVon(p)] = (gr[gruppeVon(p)] || 0) + 1;
  const erg = {}, quelle = {}; for (const p of U) { const [g, q] = geschlecht(p); erg[g] = (erg[g] || 0) + 1; quelle[q] = (quelle[q] || 0) + 1; }
  // Widerspruch Titel gegen Tag (nur wenn beide etwas sagen)
  let beide = 0, gleich = 0; const paare = {}; const typStimmtTitel = { titel: 0, tag: 0, keines: 0, keinTyp: 0 }; const beispiele = {};
  for (const p of U) {
    const a = titelGeschlecht(p.title), b = tagGeschlecht(p); if (!a || !b) continue; beide++;
    if (a === b) { gleich++; continue; }
    const k = `Tag ${b} -> Titel ${a}`; paare[k] = (paare[k] || 0) + 1; (beispiele[k] = beispiele[k] || []).push(p.handle + ': ' + p.title.slice(0, 60));
    const ty = typGeschlecht(p); if (!ty) typStimmtTitel.keinTyp++; else if (ty === a) typStimmtTitel.titel++; else if (ty === b) typStimmtTitel.tag++; else typStimmtTitel.keines++;
  }
  // Sammel-Tag «damen» bei Kopf/Handschuh/Brille
  const schwach = {};
  for (const p of U) { const g = gruppeVon(p); if (!['kopf', 'handschuh', 'brille'].includes(g)) continue; if (!p.tags.includes('damen')) continue; const a = titelGeschlecht(p.title); const o = (schwach[g] = schwach[g] || { tagDamen: 0, titelNennt: 0, titelDamen: 0 }); o.tagDamen++; if (a) { o.titelNennt++; if (a === 'damen') o.titelDamen++; } }
  return { N: U.length, gr, erg, quelle, beide, gleich, paare, typStimmtTitel, schwach, beispiele };
}
if (process.argv[1] && process.argv[1].endsWith('sa_statistik.mjs')) { const s = statistik(); console.log(JSON.stringify({ ...s, beispiele: undefined }, null, 1)); for (const [k, v] of Object.entries(s.beispiele)) console.log(k, v.slice(0, 3)); }
