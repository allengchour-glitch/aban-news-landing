import { readFileSync, appendFileSync, existsSync } from 'node:fs';
import { g } from '/tmp/advbau-claude/sh.mjs';
const LIVE = process.env.LIVE === '1';
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const MAX = Number(process.env.MAX || 1e9);
const LEDGER = '/tmp/cm/cjk/apply_ledger.txt';
const done = new Set(existsSync(LEDGER) ? readFileSync(LEDGER, 'utf8').split('\n').filter(Boolean).map(z => z.split('\t')[1]) : []);
let plan = JSON.parse(readFileSync('/tmp/cm/cjk/plan_deutlich.json', 'utf8'));
plan = plan.filter(p => p.treffer > 0).filter(p => !p.bilder.some(b => b.unbekannt) && !p.mediaZuViel && !p.variantenZuViel);
if (ONLY.length) plan = plan.filter(p => ONLY.includes(p.handle));
const z = { entwurf: 0, loeschen: 0, loeschenProdukte: 0, behaltenVariante: 0, umordnen: 0, uebersprungen: 0 };
let n = 0;
for (const p of plan) {
  if (n >= MAX) break;
  if (done.has(p.handle)) { z.uebersprungen++; continue; }
  const imgs = p.bilder.filter(b => b.typ === 'IMAGE');
  const sauber = imgs.filter(b => !b.treffer);
  const aktion = sauber.length >= 3 ? 'bereinigen' : 'entwurf';
  n++;
  if (aktion === 'entwurf') {
    z.entwurf++;
    console.log('ENTWURF', p.handle, 'sauber', sauber.length, 'von', imgs.length);
    if (LIVE) { const w = (await g(`mutation($i:ProductInput!){productUpdate(input:$i){product{id status} userErrors{field message}}}`, { i: { id: p.id, status: 'DRAFT' } })).productUpdate; if (w.userErrors.length) { console.log('  FEHLER', JSON.stringify(w.userErrors)); continue; } appendFileSync(LEDGER, 'ENTWURF\t' + p.handle + '\t' + new Date().toISOString() + '\n'); }
    continue;
  }
  const var_ = new Set(p.mitVariante);
  const weg = imgs.filter(b => b.treffer && !var_.has(b.mediaId));
  const bleibtTreffer = imgs.filter(b => b.treffer && var_.has(b.mediaId));
  const rest = p.bilder.filter(b => !weg.includes(b));
  const ziel = [...rest.filter(b => !(b.treffer && var_.has(b.mediaId))), ...rest.filter(b => b.treffer && var_.has(b.mediaId))];
  const moves = []; ziel.forEach((b, i) => { if (rest.indexOf(b) !== i) moves.push({ id: b.mediaId, newPosition: String(i) }); });
  z.loeschen += weg.length; if (weg.length) z.loeschenProdukte++; z.behaltenVariante += bleibtTreffer.length; if (moves.length) z.umordnen++;
  console.log('BEREINIGEN', p.handle, '| loeschen', weg.length, '| Variantenbild mit Schrift bleibt', bleibtTreffer.length, '| Moves', moves.length, '| sauber', sauber.length);
  if (LIVE) {
    if (weg.length) { const w = (await g(`mutation($p:ID!,$m:[ID!]!){productDeleteMedia(productId:$p, mediaIds:$m){deletedMediaIds mediaUserErrors{field message code}}}`, { p: p.id, m: weg.map(b => b.mediaId) })).productDeleteMedia; if (w.mediaUserErrors.length || w.deletedMediaIds.length !== weg.length) { console.log('  FEHLER', JSON.stringify(w)); continue; } }
    if (moves.length) { const w = (await g(`mutation($i:ID!,$m:[MoveInput!]!){productReorderMedia(id:$i, moves:$m){job{id} mediaUserErrors{field message code}}}`, { i: p.id, m: moves })).productReorderMedia; if (w.mediaUserErrors.length) { console.log('  FEHLER Reorder', JSON.stringify(w.mediaUserErrors)); continue; } }
    appendFileSync(LEDGER, 'BEREINIGT\t' + p.handle + '\t' + new Date().toISOString() + '\n');
  }
}
console.log(JSON.stringify(z), LIVE ? 'LIVE' : 'TROCKEN');
