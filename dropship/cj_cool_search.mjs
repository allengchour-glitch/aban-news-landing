import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const BASE='https://developers.cjdropshipping.com/api2.0/v1';
const tok=JSON.parse(fs.readFileSync('/tmp/cj_token.json')).accessToken;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// Schmuck + coole Damen-Accessoires (trendig, TikTok-tauglich)
const KW=[
  {kw:'layered necklace women gold stainless steel',c:'schmuck',must:'necklace'},
  {kw:'hoop earrings stainless steel hypoallergenic',c:'schmuck',must:'earring'},
  {kw:'pendant necklace women waterproof 18k',c:'schmuck',must:'necklace'},
  {kw:'anklet women summer beach adjustable',c:'schmuck',must:'anklet'},
  {kw:'charm bracelet women stainless steel',c:'schmuck',must:'bracelet'},
  {kw:'butterfly hair clip claw large women',c:'accessoire',must:'clip'},
  {kw:'silk scrunchies set women hair',c:'accessoire',must:'scrunch'},
  {kw:'cat eye sunglasses women uv400 trendy',c:'accessoire',must:'sunglass'},
];
const BAD=['cosmetic','storage','makeup','trash','grow','wig','nail','tattoo','phone case','sticker','keychain','wholesale lot','display stand','tool'];
const b=await chromium.launch({headless:true,args:['--ignore-certificate-errors','--no-sandbox']});
const c=await b.newContext({ignoreHTTPSErrors:true});
async function get(p,params={}){const qs=new URLSearchParams(params).toString();
  for(let a=0;a<4;a++){const r=await c.request.get(`${BASE}${p}?${qs}`,{headers:{'CJ-Access-Token':tok},timeout:30000});
  const j=await r.json(); if(j.code===1600200||/Too Many|QPS/i.test(j.message||'')){await sleep((a+1)*2500);continue;} return j;} throw new Error('rl');}
const cand=new Map();
for(const {kw,c:cat,must} of KW){process.stderr.write(`🔎 ${kw}\n`);
  const r=await get('/product/list',{pageNum:1,pageSize:40,productNameEn:kw});
  let list=(r.data?.list||[]).filter(p=>{const n=(p.productNameEn||'').toLowerCase();
    return n.includes(must)&&!BAD.some(x=>n.includes(x));});
  for(const p of list){if(!cand.has(p.pid))cand.set(p.pid,{...p,cat,must});} await sleep(2400);}
const uniq=[...cand.values()].sort((a,b)=>(Number(b.listedNum)||0)-(Number(a.listedNum)||0)).slice(0,16);
const out=[];
for(const p of uniq){const d=(await get('/product/query',{pid:p.pid})).data;await sleep(2400);if(!d)continue;
  const vs=d.variants||[];const costs=vs.map(v=>Number(v.variantSellPrice)).filter(Boolean);
  out.push({cat:p.cat,pid:d.pid,nameEn:d.productNameEn,sku:vs[0]?.variantSku||d.productSku,
    cost:costs.length?Math.min(...costs):Number(d.sellPrice),vars:vs.length,imgs:(d.productImageSet||[]).length,
    listed:d.listedNum,imgset:(d.productImageSet||[])});
  process.stderr.write(`   ✔[${p.cat}] ${d.productNameEn.slice(0,46)} $${costs.length?Math.min(...costs):d.sellPrice} ${vs.length}v ${(d.productImageSet||[]).length}img\n`);}
await b.close();
fs.writeFileSync('/tmp/cj_cool.json',JSON.stringify(out,null,2));
for(const p of out)console.log(`[${p.cat}] pid=${p.pid} $${p.cost} ${p.vars}v ${p.imgs}img | ${p.nameEn.slice(0,50)}`);
