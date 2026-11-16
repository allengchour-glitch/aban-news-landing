// Prueft je Clip-Produkt: Status, Kanal Online Store, Sammlungen (Mitgliedschaft), Ausfuehrung (ID, Titel, verkaufbar).
import fs from 'node:fs'; import { gql } from './shop.mjs';
const C = { s01: ['led-tulpen-planet-nachtlicht-fur-tisch-618400', '67679802950023'], s03: ['dreifachklinken-tennisarmband-mit-zirkon-613400', '67672760975751'], s05: ['weihnachtskugeln-beflockt-9-stuck-625300', '67843689152903'], s06: ['reisebeutel-aus-rindsleder-44x20x28-cm-01ba7c', '67726147944839'], s09: ['retro-vogel-keramikbecher-mit-ballgriff-637200', '67675894710663'], s08: ['gusseisen-teekanne-sandguss-unbeschichtet-609800', ''], s10: ['kristallspitzen-set-8-teilig-holzbox', ''] };
const ZIEL = { s03: ['schmuck', 'sub-armbaender', 'gliederarmbaender', 'zirkonia-strassarmbaender'], s01: ['sub-beleuchtung', 'nachtlichter-ambiente', 'wohnen-dekoration'], s05: ['weihnachten-2026', 'premium-geschenke'], s06: ['sub-taschen', 'damen-reisetaschen', 'herren-reisetaschen', 'sub-reise'], s09: ['geschirr-tisch', 'kaffee-tee-trinken', 'teekannen-kaffeeservice', 'deko-objekte-accessoires'], s08: ['geschirr-tisch', 'kaffee-tee-trinken', 'teekannen-kaffeeservice'], s10: ['deko-objekte-accessoires'] };
const out = {};
for (const [id, [h, vid]] of Object.entries(C)) {
  const d = await gql(`query($h:String!){productByHandle(handle:$h){id title status onlineStoreUrl collections(first:100){nodes{handle}} variants(first:100){nodes{id title availableForSale inventoryPolicy}}}}`, { h });
  const p = d.productByHandle; if (!p) { console.log(id, h, 'FEHLT'); continue; }
  const hs = p.collections.nodes.map((c) => c.handle);
  const v = p.variants.nodes.find((x) => x.id.endsWith('/' + vid));
  out[id] = { handle: h, status: p.status, online: !!p.onlineStoreUrl, variante: v ? { id: vid, titel: v.title, verkaufbar: v.availableForSale } : null, varianten: p.variants.nodes.length, mitglied: Object.fromEntries(ZIEL[id].map((c) => [c, hs.includes(c)])), sammlungen: hs };
  console.log(id, h, p.status, 'online', !!p.onlineStoreUrl, '| Ausf.', v ? v.title + ' verkaufbar=' + v.availableForSale : '(keine angegeben)', '| von', p.variants.nodes.length);
  console.log('   Mitglied:', ZIEL[id].map((c) => c + '=' + hs.includes(c)).join(' '));
}
fs.writeFileSync('live/clips_pruefen.json', JSON.stringify({ zeit: new Date().toISOString(), out }, null, 1));
