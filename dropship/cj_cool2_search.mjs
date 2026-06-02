import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const BASE='https://developers.cjdropshipping.com/api2.0/v1';
const tok=JSON.parse(fs.readFileSync('/tmp/cj_token.json')).accessToken;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// Runde 2: coole Accessoires – Haar, Sonnenbrillen, Ringe, Bauchkette
const KW=[
  {kw:'hair claw clip large matte women',c:'accessoire',must:['claw','clip','hair']},
  {kw:'butterfly hair clip set women',c:'accessoire',must:['clip','butterfly','hair']},
  {kw:'sunglasses women polarized cat eye trendy',c:'accessoire',must:['sunglass','glasses']},
  {kw:'sunglasses women oversized square uv400',c:'accessoire',must:['sunglass','glasses']},
  {kw:'stackable rings set women stainless steel',c:'schmuck',must:['ring']},
  {kw:'open ring adjustable women gold zircon',c:'schmuck',must:['ring']},
  {kw:'body chain waist belly women beach',c:'schmuck',must:['chain','body','waist']},
  {kw:'scrunchies satin set women hair',c:'accessoire',must:['scrunch','hair']},
];
const BAD=['cosmetic','storage','trash','grow','wig','nail','tattoo','phone case','sticker','keychain','display','tool kit','wholesale lot','baby','kids','pet','dog','cat food'];
const b=await chromium.launch({headless:true,args:['--ignore-certificate-errors','--no-sandbox']});
const c=await b.newContext({ignoreHTTPSErrors:true});
async function get(p,params={}){const qs=new URLSearchParams(params).toString();
  for(let a=0;a<4;a++){const r=await c.request.get(`${BASE}${p}?${qs}`,{headers:{'CJ-Access-Token':tok},timeout:30000});
  const j=await r.json(); if(j.code===1600200||/Too Many|QPS/i.test(j.message||'')){await sleep((a+1)*2500);continue;} return j;} throw new Error('rl');}
const cand=new Map();
for(const {kw,c:cat,must} of KW){process.stderr.write(`🔎 ${kw}\n`);
  const r=await get('/product/list',{pageNum:1,pageSize:40,productNameEn:kw});
  let list=(r.data?.list||[]).filter(p=>{const n=(p.productNameEn||'').toLowerCase();
    return must.some(m=>n.includes(m))&&!BAD.some(x=>n.includes(x));});
  for(const p of list){if(!cand.has(p.pid))cand.set(p.pid,{...p,cat});} await sleep(2400);}
const uniq=[...cand.values()].sort((a,b)=>(Number(b.listedNum)||0)-(Number(a.listedNum)||0)).slice(0,18);
const out=[];
for(const p of uniq){const d=(await get('/product/query',{pid:p.pid})).data;await sleep(2200);if(!d)continue;
  const vs=(d.variants||[]).map(v=>({sku:v.variantSku,key:v.variantKey||'',cost:Number(v.variantSellPrice)||0}));
  const costs=vs.map(v=>v.cost).filter(Boolean);
  out.push({cat:p.cat,pid:d.pid,nameEn:d.productNameEn,vars:vs,cost:costs.length?Math.min(...costs):Number(d.sellPrice),
    imgs:(d.productImageSet||[]).length,listed:d.listedNum,images:(d.productImageSet||[])});
  process.stderr.write(`   ✔[${p.cat}] ${d.productNameEn.slice(0,46)} $${costs.length?Math.min(...costs):d.sellPrice} ${vs.length}v ${(d.productImageSet||[]).length}img\n`);}
await b.close();
fs.writeFileSync('/tmp/cj_cool2.json',JSON.stringify(out,null,2));
for(const p of out)console.log(`[${p.cat}] pid=${p.pid} $${p.cost} ${p.vars.length}v ${p.imgs}img | ${p.nameEn.slice(0,48)} | keys:${[...new Set(p.vars.map(v=>v.key))].slice(0,5).join(',')}`);
