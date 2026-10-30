import { readFileSync, appendFileSync, writeFileSync, existsSync } from 'node:fs';
import { g } from '/tmp/advbau-claude/sh.mjs';
import { frage } from './gem.mjs';
const LEDGER = '/tmp/cm/cjk/bildscan.jsonl';
const led = readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const gesehen = new Map(led.map(x => [x.url, x]));
const handles = [...new Set(led.filter(x => x.asiatisch && x.texte.length).map(x => x.handle))];
console.log('Treffer-Produkte', handles.length);
const prods = [];
for (let i = 0; i < handles.length; i += 5) {
  const teil = handles.slice(i, i + 5);
  const q = '{' + teil.map((h, k) => `p${k}: productByHandle(handle:${JSON.stringify(h)}){ id handle title status media(first:250){ pageInfo{hasNextPage} nodes{ id mediaContentType ... on MediaImage{ image{url} } } } variants(first:250){ pageInfo{hasNextPage} nodes{ id media(first:1){nodes{id}} } } }`).join(' ') + '}';
  const r = await g(q);
  teil.forEach((h, k) => { const p = r['p' + k]; if (p) prods.push(p); });
}
console.log('Produkte gelesen', prods.length);
const jobs = [];
for (const p of prods) p.media.nodes.forEach((m, pos) => { if (m.image?.url && !gesehen.has(m.image.url)) jobs.push({ handle: p.handle, idx: pos, url: m.image.url }); });
console.log('Bilder noch zu lesen', jobs.length);
let stop = false, n = 0;
async function arbeiter() {
  while (!stop && jobs.length) {
    const j = jobs.shift();
    try {
      const res = await fetch(j.url + (j.url.includes('?') ? '&' : '?') + 'width=900'); if (!res.ok) throw new Error('bild ' + res.status);
      const buf = Buffer.from(await res.arrayBuffer());
      const a = await frage(buf, res.headers.get('content-type') || 'image/jpeg');
      if (a.fehler) { if ([402, 429, 403, 400].includes(a.fehler)) { stop = true; jobs.unshift(j); console.log('STOPP Gemini', JSON.stringify(a)); } else console.log('Fehler', j.handle, JSON.stringify(a)); continue; }
      const z = { ...j, asiatisch: !!a.asiatisch, texte: a.texte || [], ort: a.ort || '' };
      appendFileSync(LEDGER, JSON.stringify(z) + '\n'); gesehen.set(j.url, z);
      if (++n % 100 === 0) console.log('fertig', n);
    } catch (e) { console.log('Fehler', j.handle, String(e).slice(0, 100)); }
  }
}
await Promise.all([1, 2, 3, 4].map(arbeiter));
if (stop || jobs.length) { console.log('ABGEBROCHEN, offen', jobs.length); process.exit(2); }
// Plan
const plan = [];
for (const p of prods) {
  const bilder = p.media.nodes.map((m, pos) => ({ mediaId: m.id, typ: m.mediaContentType, url: m.image?.url || null, pos, treffer: m.image?.url ? (() => { const z = gesehen.get(m.image.url); return !!(z && z.asiatisch && z.texte.length); })() : false, unbekannt: m.image?.url ? !gesehen.has(m.image.url) : false }));
  const variantenBild = new Set(p.variants.nodes.map(v => v.media.nodes[0]?.id).filter(Boolean));
  const mitVariante = bilder.filter(b => b.treffer && variantenBild.has(b.mediaId)).map(b => b.mediaId);
  plan.push({ id: p.id, handle: p.handle, title: p.title, status: p.status, mediaZuViel: p.media.pageInfo.hasNextPage, variantenZuViel: p.variants.pageInfo.hasNextPage, bilder, mitVariante,
    sauber: bilder.filter(b => b.typ === 'IMAGE' && !b.treffer && !b.unbekannt).length, treffer: bilder.filter(b => b.treffer).length });
}
writeFileSync('/tmp/cm/cjk/plan_voll.json', JSON.stringify(plan));
console.log('FERTIG Plan', plan.length);
