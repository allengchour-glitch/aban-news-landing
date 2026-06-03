import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const BASE='https://developers.cjdropshipping.com/api2.0/v1';
const tok=JSON.parse(fs.readFileSync('/tmp/cj_token.json')).accessToken;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const KW=['womens handbag pu leather tote','crossbody bag women chain','shoulder bag women large','mini bag women trendy'];
const b=await chromium.launch({headless:true,args:['--ignore-certificate-errors','--no-sandbox']});
const c=await b.newContext({ignoreHTTPSErrors:true});
async function get(p,params={}){const qs=new URLSearchParams(params).toString();
  for(let a=0;a<4;a++){const r=await c.request.get(`${BASE}${p}?${qs}`,{headers:{'CJ-Access-Token':tok},timeout:30000});
  const j=await r.json(); if(j.code===1600200||/Too Many|QPS/i.test(j.message||'')){await sleep((a+1)*2500);continue;} return j;} throw new Error('rl');}
const cand=new Map();
for(const kw of KW){process.stderr.write(`🔎 ${kw}\n`);
  const r=await get('/product/list',{pageNum:1,pageSize:40,productNameEn:kw});
  let list=(r.data?.list||[]).filter(p=>{const n=(p.productNameEn||'').toLowerCase();return n.includes('bag')&&!n.includes('cosmetic')&&!n.includes('storage')&&!n.includes('makeup');});
  for(const p of list){if(!cand.has(p.pid))cand.set(p.pid,p);} await sleep(2400);}
const uniq=[...cand.values()].sort((a,b)=>(Number(b.listedNum)||0)-(Number(a.listedNum)||0)).slice(0,8);
const out=[];
for(const p of uniq){const d=(await get('/product/query',{pid:p.pid})).data;await sleep(2400);if(!d)continue;
  const vs=d.variants||[];const costs=vs.map(v=>Number(v.variantSellPrice)).filter(Boolean);
  out.push({cat:'taschen',pid:d.pid,nameEn:d.productNameEn,sku:vs[0]?.variantSku||d.productSku,
    cost:costs.length?Math.min(...costs):Number(d.sellPrice),vars:vs.length,imgs:(d.productImageSet||[]).length,listed:d.listedNum,img0:(d.productImageSet||[])[0]||''});
  process.stderr.write(`   ✔ ${d.productNameEn.slice(0,50)} $${costs.length?Math.min(...costs):d.sellPrice} ${vs.length}var ${(d.productImageSet||[]).length}img\n`);}
await b.close();
fs.writeFileSync('/tmp/cj_bags.json',JSON.stringify(out,null,2));
for(const p of out)console.log(`pid=${p.pid} $${p.cost} ${p.vars}var ${p.imgs}img | ${p.nameEn.slice(0,55)}`);
