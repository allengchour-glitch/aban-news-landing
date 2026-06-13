import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const tok = JSON.parse(fs.readFileSync('/tmp/cj_token.json')).accessToken;
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Nachfrage-getrieben (Trend-Recherche Juni 2026 + Kanal-Gewinner „Gadget-Wow + Nutzen"):
// praktische Sommer-/Home-Gadgets, die gut fotografieren und „TikTok made me buy it"-Appeal haben.
const KW = [
  { kw: 'portable neck fan bladeless rechargeable', c: 'gadget', must: 'fan' },
  { kw: 'mini handheld fan usb rechargeable foldable', c: 'gadget', must: 'fan' },
  { kw: 'cordless handheld vacuum mini car home', c: 'gadget', must: 'vacuum' },
  { kw: 'vegetable chopper multifunction slicer kitchen', c: 'kueche', must: 'chop' },
  { kw: 'electric salt pepper grinder automatic', c: 'kueche', must: 'grinder' },
  { kw: 'shower caddy organizer no drill bathroom', c: 'bad', must: 'organizer' },
];
const BAD = ['wholesale', 'lot', 'display', 'wig', 'nail', 'tattoo', 'sticker', 'phone case', 'makeup', 'cosmetic', 'sex', 'replacement', 'spare'];
const b = await chromium.launch({ headless: true, args: ['--ignore-certificate-errors', '--no-sandbox'] });
const c = await b.newContext({ ignoreHTTPSErrors: true });
async function get(p, params = {}) {
  const qs = new URLSearchParams(params).toString();
  for (let a = 0; a < 5; a++) {
    const r = await c.request.get(`${BASE}${p}?${qs}`, { headers: { 'CJ-Access-Token': tok }, timeout: 30000 });
    const j = await r.json();
    if (j.code === 1600200 || /Too Many|QPS/i.test(j.message || '')) { await sleep((a + 1) * 2500); continue; }
    return j;
  }
  throw new Error('rate-limited');
}
const cand = new Map();
for (const { kw, c: cat, must } of KW) {
  process.stderr.write(`🔎 ${kw}\n`);
  const r = await get('/product/list', { pageNum: 1, pageSize: 40, productNameEn: kw });
  const list = (r.data?.list || []).filter(p => {
    const n = (p.productNameEn || '').toLowerCase();
    return n.includes(must) && !BAD.some(x => n.includes(x));
  });
  for (const p of list) if (!cand.has(p.pid)) cand.set(p.pid, { ...p, cat, must });
  await sleep(2400);
}
const uniq = [...cand.values()].sort((a, b) => (Number(b.listedNum) || 0) - (Number(a.listedNum) || 0)).slice(0, 18);
const out = [];
for (const p of uniq) {
  const d = (await get('/product/query', { pid: p.pid })).data; await sleep(2400);
  if (!d) continue;
  const vs = d.variants || [];
  const costs = vs.map(v => Number(v.variantSellPrice)).filter(Boolean);
  out.push({
    cat: p.cat, pid: d.pid, nameEn: d.productNameEn, sku: vs[0]?.variantSku || d.productSku,
    cost: costs.length ? Math.min(...costs) : Number(d.sellPrice), vars: vs.length,
    imgs: (d.productImageSet || []).length, listed: d.listedNum, imgset: (d.productImageSet || []),
  });
  process.stderr.write(`   ✔[${p.cat}] ${d.productNameEn.slice(0, 46)} $${costs.length ? Math.min(...costs) : d.sellPrice} ${vs.length}v ${(d.productImageSet || []).length}img\n`);
}
await b.close();
fs.writeFileSync('/tmp/cj_trend.json', JSON.stringify(out, null, 2));
for (const p of out) console.log(`[${p.cat}] pid=${p.pid} $${p.cost} ${p.vars}v ${p.imgs}img listed=${p.listed} | ${p.nameEn.slice(0, 52)}`);
