import { readFileSync } from 'node:fs';
import { g } from '/tmp/advbau-claude/sh.mjs';
const plan = JSON.parse(readFileSync('/tmp/cm/cjk/plan_deutlich.json','utf8'));
const hs = process.argv.slice(2).length ? process.argv.slice(2) : plan.filter(p=>p.treffer>0).map(p=>p.handle);
let bad = 0, ok = 0;
for (let i = 0; i < hs.length; i += 5) {
  const teil = hs.slice(i, i + 5);
  const r = await g('{' + teil.map((h,k)=>`p${k}: productByHandle(handle:${JSON.stringify(h)}){ handle status media(first:250){nodes{id}} variants(first:250){nodes{id media(first:1){nodes{id}}}} }`).join(' ') + '}');
  for (const [k,h] of teil.entries()) {
    const now = r['p'+k]; const p = plan.find(x=>x.handle===h); if (!now) { console.log('FEHLT', h); bad++; continue; }
    const ids = now.media.nodes.map(m=>m.id); const treff = new Set(p.bilder.filter(b=>b.treffer).map(b=>b.mediaId)); const varHit = new Set(p.mitVariante);
    const imgs = p.bilder.filter(b=>b.typ==='IMAGE'); const sauber = imgs.filter(b=>!b.treffer).length;
    const erwartetDraft = sauber < 3;
    const fehler = [];
    if (erwartetDraft) { if (now.status !== 'DRAFT') fehler.push('status ' + now.status); if (ids.length !== p.bilder.length) fehler.push('Bilder verändert'); }
    else {
      const rest = ids.filter(id => treff.has(id) && !varHit.has(id)); if (rest.length) fehler.push('deutliche Bilder noch da ' + rest.length);
      const soll = p.bilder.filter(b => !(treff.has(b.mediaId) && !varHit.has(b.mediaId))).length; if (ids.length !== soll) fehler.push(`Anzahl ${ids.length} statt ${soll}`);
      const firstClean = ids[0] && !treff.has(ids[0]); if (!firstClean && !ids.every(id=>treff.has(id))) fehler.push('erstes Bild nicht sauber');
      const vorherVar = p.variantenBild; // nicht gespeichert
    }
    if (fehler.length) { bad++; console.log('ABWEICHUNG', h, fehler.join('; ')); } else ok++;
  }
}
console.log('geprüft', hs.length, 'ok', ok, 'Abweichungen', bad);
