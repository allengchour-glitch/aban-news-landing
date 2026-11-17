import { writeFileSync } from 'node:fs';
import { cjFetch } from '/home/user/aban-news-landing/automation/lib/cj_fetch.mjs';
import { cjToken } from '/home/user/aban-news-landing/automation/lib/cj_token.mjs';
const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const tok = await cjToken();
const zz = ms => new Promise(r => setTimeout(r, ms));
const get = async (q, ctx) => { const r = await cjFetch(`${BASE}/product/list?${q}`, { headers: { 'CJ-Access-Token': tok }, context: ctx }); await zz(1150); return r?.data || {}; };
// 1) Anzahl im Katalog je Preisband (ohne Suchwort)
const baender = [[0, 20], [20, 50], [50, 100], [100, 200], [200, 500], [500, 1000], [1000, 100000]];
const zahl = {};
for (const [a, b] of baender) {
  const d = await get(`pageNum=1&pageSize=1&minPrice=${a}&maxPrice=${b}`, 'band');
  zahl[`${a}-${b}`] = d.total; console.log('Band', a, b, d.total);
}
// 2) Kandidaten ab USD 100 je Thema
const woerter = ['watch', 'necklace', 'ring', 'bracelet', 'earring', 'diamond', 'moissanite', 'gold', '925 silver', 'pearl', 'jade', 'genuine leather bag', 'handbag', 'wallet', 'coat', 'cashmere', 'wool', 'down jacket', 'perfume', 'sunglasses', 'boots', 'sofa', 'chair', 'table', 'chandelier', 'rug', 'massage', 'e-bike', 'scooter', 'drone', 'camera', 'projector', 'speaker', 'robot vacuum', 'coffee machine', 'wig human hair', 'crystal', 'vase', 'sculpture', 'mirror'];
const alle = new Map();
for (const w of woerter) {
  const d = await get(`pageNum=1&pageSize=20&minPrice=100&productNameEn=${encodeURIComponent(w)}`, 'kand ' + w);
  const l = d.list || [];
  console.log(w.padEnd(20), 'ab 100 USD:', d.total, ' Seite:', l.length);
  for (const p of l) if (!alle.has(p.pid)) alle.set(p.pid, { pid: p.pid, name: p.productNameEn, preis: p.sellPrice, kat: [p.oneCategoryName, p.twoCategoryName, p.threeCategoryName].filter(Boolean).join(' > '), listed: p.listedNum, laender: p.shippingCountryCodes, lieferant: p.supplierName, video: p.isVideo, wort: w, gew: p.productWeight });
}
writeFileSync('kandidaten.json', JSON.stringify({ zahl, kand: [...alle.values()] }, null, 1));
console.log('Kandidaten gesamt', alle.size);
