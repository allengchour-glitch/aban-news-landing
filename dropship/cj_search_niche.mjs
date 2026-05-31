#!/usr/bin/env node
/**
 * CJ-Nischensuche mit gecachtem Token (kein Env nötig) für dünne Menü-Kategorien.
 * Liest /tmp/cj_token.json, sucht Keywords, filtert per must-Tokens, reichert Top-Treffer an.
 * Ausgabe: /tmp/cj_niche.json  +  kompakte Übersicht auf stdout.
 * Jede Nische trägt das Ziel-Tag (cat) für die Smart-Collection-Regel.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const BASE='https://developers.cjdropshipping.com/api2.0/v1';
const tok=JSON.parse(fs.readFileSync('/tmp/cj_token.json')).accessToken;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// cat = Shopify-Regel-Tag der Zielkategorie
const KEYWORDS=[
  { kw:'car phone holder mount', must:['holder'],  cat:'Auto-Halterung', take:2 },
  { kw:'car cleaning gel dust',  must:['clean'],   cat:'Auto-Reinigung', take:2 },
  { kw:'car jump starter power bank', must:['jump'], cat:'Auto-Power',   take:1 },
  { kw:'serving tray wooden',    must:['tray'],    cat:'Servieren',      take:2 },
  { kw:'packing cubes travel',   must:['packing'], cat:'Reise-Gadget',   take:2 },
  { kw:'travel organizer bag',   must:['organizer'],cat:'Reise-Gadget',  take:1 },
  { kw:'insulated water bottle', must:['bottle'],  cat:'Trinkflasche',   take:2 },
];

const b=await chromium.launch({headless:true,args:['--ignore-certificate-errors','--no-sandbox']});
const c=await b.newContext({ignoreHTTPSErrors:true});
async function get(path,params={}){
  const qs=new URLSearchParams(params).toString();
  for(let a=0;a<4;a++){
    const r=await c.request.get(`${BASE}${path}?${qs}`,{headers:{'CJ-Access-Token':tok},timeout:30000});
    const j=await r.json();
    if(j.code===1600200||/Too Many|QPS/i.test(j.message||'')){await sleep((a+1)*2500);continue;}
    return j;
  }
  throw new Error('rate limit '+path);
}
const out=[];
for(const {kw,must,cat,take} of KEYWORDS){
  process.stderr.write(`🔎 ${kw} → ${cat}\n`);
  const r=await get('/product/list',{pageNum:1,pageSize:40,productNameEn:kw});
  let list=(r.data?.list||[]).filter(p=>{const n=(p.productNameEn||'').toLowerCase();return must.every(w=>n.includes(w));});
  list.sort((a,b)=>(Number(b.listedNum)||0)-(Number(a.listedNum)||0));
  await sleep(2400);
  for(const p of list.slice(0,take)){
    const d=(await get('/product/query',{pid:p.pid})).data; await sleep(2400);
    if(!d) continue;
    const vs=d.variants||[]; const costs=vs.map(v=>Number(v.variantSellPrice)).filter(Boolean);
    out.push({cat, pid:d.pid, nameEn:d.productNameEn, sku:vs[0]?.variantSku||d.productSku,
      cost:costs.length?Math.min(...costs):Number(d.sellPrice), vars:vs.length,
      imgs:(d.productImageSet||[]).length, listed:d.listedNum,
      img0:(d.productImageSet||[])[0]||''});
    process.stderr.write(`   ✔ ${d.productNameEn.slice(0,50)} | $${costs.length?Math.min(...costs):d.sellPrice} | ${vs.length}var ${(d.productImageSet||[]).length}img\n`);
  }
}
await b.close();
fs.writeFileSync('/tmp/cj_niche.json',JSON.stringify(out,null,2));
console.log(JSON.stringify(out.map(o=>({cat:o.cat,pid:o.pid,name:o.nameEn.slice(0,55),sku:o.sku,cost:o.cost,vars:o.vars,imgs:o.imgs,listed:o.listed})),null,2));
