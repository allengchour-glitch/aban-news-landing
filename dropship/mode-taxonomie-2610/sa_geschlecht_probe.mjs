import { daten, W, A, B } from './sa_lib.mjs';
const KID = new RegExp(`(^|[^${B}])(kinder|kids?|kleinkind|mädchen|maedchen|jungs|teenager|teens?|säugling|neugeboren|babys?|baby-)|(^|[^${B}])jungen(?![${B}])`, 'i');
const JUNGEN_ADJ = new RegExp(`(^|[^${B}])(im|am|vom|zum|mit|in|den|dem|einem|der) jungen`, 'i');
const HER = W('herren(?!los)|männer|maenner|männlich|mann|gentleman');
const DAM = W('damen|frauen|weiblich|ladies|lady');
const UNI = W('unisex|damen und herren|herren und damen|männer und frauen');
function titelG(t) {
  const tt = t.replace(JUNGEN_ADJ, ' ');
  if (KID.test(tt)) return 'kinder';
  if (UNI.test(t)) return 'unisex';
  const h = HER.test(t), d = DAM.test(t);
  if (h && d) return 'unisex';
  if (h) return 'herren'; if (d) return 'damen';
  return null;
}
function tagG(p) {
  const t = p.tags;
  if (t.includes('kinderschuhe')) return 'kinder';
  if (t.includes('damenschuhe') && !t.includes('herrenschuhe')) return 'damen';
  if (t.includes('herrenschuhe') && !t.includes('damenschuhe')) return 'herren';
  const d = t.includes('damen'), h = t.includes('herren') || t.includes('maenner'), k = t.includes('kinder');
  if (d && h) return 'unisex'; if (d) return 'damen'; if (h) return 'herren'; if (k) return 'kinder';
  return null;
}
const U = process.argv[2] || 'shoes';
const uni = daten.filter(p => U === 'shoes' ? (p.g || '').startsWith('Apparel & Accessories > Shoes') : /Handbags|Clothing Accessories|Luggage/.test(p.g || ''));
const x = {}; const bsp = {};
for (const p of uni) { const k = `Tag ${tagG(p) || '-'} | Titel ${titelG(p.title) || '-'}`; x[k] = (x[k] || 0) + 1; (bsp[k] = bsp[k] || []).push(p.title.slice(0, 80)); }
console.log(U, uni.length);
for (const [k, v] of Object.entries(x).sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(5), k, '  e.g.', bsp[k].slice(0, 2).join(' || '));
