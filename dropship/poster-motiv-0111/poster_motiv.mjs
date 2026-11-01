import { readFileSync, writeFileSync } from 'node:fs';
import { g } from './sh.mjs';
const LIVE = process.env.LIVE === '1';
const vorher = JSON.parse(readFileSync('/tmp/cm/poster_stand_vorher.json', 'utf8'));
const MOTIV = { '15504098197889': 'Familienstammbaum', '15525460672897': 'Blumen in Rosa, Gelb und Grün', '16615662354823': 'Blühender Baum mit gelb-weissen Blüten' };
const BANNER = ' · 🔄 30 Tage Rückgabe';
const plan = [];
for (const n of vorher) {
  const id = n.id.split('/').pop();
  const m = n.title.match(/«([^»]+)»/); const motiv = MOTIV[id] || (m && m[1]);
  if (!motiv) { console.log('KEIN MOTIV', id, n.title); continue; }
  let sd = n.seo.description || '';
  sd = sd.replace(/,?\s*30 Tage Rückgabe\.?/i, '').replace(/\s+\./g, '.').trim();
  if (id === '15504098197889') sd = 'Leinwandbild mit Wunschnamen – bei LuxeStyle Schweiz. Gratis-Versand ab CHF 50.';
  const neuSeo = `Motiv: ${motiv}. ${sd}`;
  let body = n.descriptionHtml; const nBanner = body.split(BANNER).length - 1;
  if (nBanner > 1) { console.log('STOPP: Banner mehrfach', id); process.exit(2); }
  const neuBody = nBanner === 1 ? body.replace(BANNER, '') : body;
  plan.push({ id: n.id, hid: id, titel: n.title, seoTitle: n.seo.title, alt: n.seo.description, neu: neuSeo, bodyAendern: nBanner === 1, neuBody });
}
for (const p of plan) console.log(p.hid, '|', p.titel.slice(0, 45), '\n   alt :', p.alt, '\n   neu :', p.neu, '| Länge', p.neu.length, '| Banner raus:', p.bodyAendern);
console.log('Produkte', plan.length);
if (!LIVE) { console.log('Trockenlauf — nichts geschrieben.'); process.exit(0); }
for (const p of plan) {
  const input = { id: p.id, seo: { title: p.seoTitle, description: p.neu } };
  if (p.bodyAendern) input.descriptionHtml = p.neuBody;
  const w = (await g(`mutation($i:ProductInput!){ productUpdate(input:$i){ product{ id } userErrors{ field message } } }`, { i: input })).productUpdate;
  if (w.userErrors.length) console.log('FEHLER', p.hid, JSON.stringify(w.userErrors)); else console.log('ok', p.hid);
}
