import { readFileSync, writeFileSync } from 'node:fs';
import { cjFetch } from '/home/user/aban-news-landing/automation/lib/cj_fetch.mjs';
import { cjToken } from '/home/user/aban-news-landing/automation/lib/cj_token.mjs';
const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const tok = await cjToken();
const zz = ms => new Promise(r => setTimeout(r, ms));
const k = JSON.parse(readFileSync('kandidaten.json', 'utf8')).kand;
const such = [
  /Moissanite Sterling Silver Necklace/i, /S925 Silver 11\.7g Moissanite Tennis/i, /Tahitian Natural Seawater/i, /S925 Silver 5\.6g Lab-Created/i,
  /Natural Light Green Hetian Jade Bracelet/i, /Natural Hetian Jade\s+Amber/i, /Women's Wool Coat Natural/i, /Cashmere Knit Cardigan/i, /Cashmere Long-sleeve/i,
  /Niche Original Genuine/i, /Cowhide Embroidery Ladies Bamboo/i, /Vegetable Tanned Leather Men's/i, /Men's Genuine Leather Handmade Retro/i,
  /Van Gogh Star Radiance/i, /Fully Automatic Nine-position Watch Winder/i, /Glass Chandelier/i,
];
const ausw = [];
for (const re of such) { const p = k.find(x => re.test(x.name)); if (p && !ausw.includes(p)) ausw.push(p); }
const erg = [];
for (const p of ausw) {
  let vid = null, ek = null, gew = null, linien = null, fehler = null;
  try {
    const q = await cjFetch(`${BASE}/product/query?pid=${encodeURIComponent(p.pid)}`, { headers: { 'CJ-Access-Token': tok }, context: 'Variante', weicheCodes: [1602001, 1602002, 1602003] });
    await zz(1150);
    const vs = q?.data?.variants || [];
    vid = vs[0]?.vid; ek = vs[0]?.variantSellPrice; gew = vs[0]?.variantWeight;
    p.nvar = vs.length; p.material = q?.data?.materialNameEn; p.verbot = q?.data?.productType; p.entf = q?.data?.entryNameEn || q?.data?.entryName;
  } catch (e) { fehler = String(e.message || e).slice(0, 80); }
  if (vid) {
    try {
      const f = await cjFetch(`${BASE}/logistic/freightCalculate`, { context: 'Fracht', headers: { 'CJ-Access-Token': tok, 'Content-Type': 'application/json' }, init: { method: 'POST', body: JSON.stringify({ startCountryCode: 'CN', endCountryCode: 'CH', products: [{ quantity: 1, vid }] }) } });
      await zz(1150);
      linien = (f?.data || []).map(l => ({ n: l.logisticName, preis: l.logisticPrice, tage: l.logisticAging }));
    } catch (e) { fehler = String(e.message || e).slice(0, 80); }
  }
  erg.push({ name: p.name.slice(0, 70), preis: p.preis, ek, gew, nvar: p.nvar, material: p.material, listed: p.listed, linien, fehler });
  console.log(p.name.slice(0, 55).padEnd(56), 'ek', ek, 'gew', gew, 'Var', p.nvar, '| CH-Linien:', linien === null ? 'UNBEKANNT ' + (fehler || '') : linien.length ? linien.map(l => `${l.n} ${l.preis}$ ${l.tage}T`).join('; ') : 'KEINE');
}
writeFileSync('fracht.json', JSON.stringify(erg, null, 1));
