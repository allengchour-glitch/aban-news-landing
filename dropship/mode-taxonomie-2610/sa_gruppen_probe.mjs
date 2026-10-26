import { daten, W, A, E, B } from './sa_lib.mjs';
const KID = new RegExp(`(^|[^${B}])(kinder|kids?|kleinkind|mädchen|maedchen|jungs|teenager|teens?|säugling|neugeboren|babys?|baby-)|(^|[^${B}])jungen(?![${B}])`, 'i');
const HER = W('herren(?!los)|männer|maenner|männlich|mann|gentleman');
const DAM = W('damen|frauen|weiblich|ladies|lady');
const UNI = W('unisex|damen und herren|herren und damen|männer und frauen');
const titelG = t => KID.test(t) ? 'kinder' : (UNI.test(t) || (HER.test(t) && DAM.test(t))) ? 'unisex' : HER.test(t) ? 'herren' : DAM.test(t) ? 'damen' : null;
const tagG = p => { const t = p.tags; const d = t.includes('damen') || t.includes('damenschuhe'), h = t.includes('herren') || t.includes('maenner') || t.includes('herrenschuhe'), k = t.includes('kinder') || t.includes('kinderschuhe'); return k ? 'kinder' : d && h ? 'unisex' : d ? 'damen' : h ? 'herren' : null; };
const grp = g => /Shoes/.test(g) ? 'schuh' : /Wallets|Badge/.test(g) ? 'geldboerse' : /Handbags|Luggage/.test(g) ? 'tasche' : /Belts|Buckle|Suspenders/.test(g) ? 'guertel' : /Hats|Balaclavas|Headwear|Neck Gaiters|Bandanas/.test(g) ? 'kopf' : /Scarves/.test(g) ? 'schal' : /Gloves/.test(g) ? 'handschuh' : /Sunglasses/.test(g) ? 'brille' : /Hair/.test(g) ? 'haar' : null;
const m = {};
for (const p of daten) {
  const gr = grp(p.g || ''); if (!gr) continue;
  const tg = titelG(p.title), ta = tagG(p);
  const o = (m[gr] = m[gr] || { n: 0, titelNennt: 0, tagDa: 0, beides: 0, gleich: 0, titel: {}, tag: {} });
  o.n++; if (tg) { o.titelNennt++; o.titel[tg] = (o.titel[tg] || 0) + 1; } if (ta) { o.tagDa++; o.tag[ta] = (o.tag[ta] || 0) + 1; }
  if (tg && ta) { o.beides++; if (tg === ta) o.gleich++; }
}
for (const [k, o] of Object.entries(m)) console.log(k.padEnd(11), 'n', o.n, '| Titel nennt', o.titelNennt, JSON.stringify(o.titel), '| Tag da', o.tagDa, JSON.stringify(o.tag), '| beides', o.beides, 'gleich', o.gleich, (100 * o.gleich / Math.max(1, o.beides)).toFixed(0) + '%');
