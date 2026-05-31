import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const BASE='https://developers.cjdropshipping.com/api2.0/v1';
const tok=JSON.parse(fs.readFileSync('/tmp/cj_token.json')).accessToken;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// breiter: Taschen + Caps/Hüte + Gürtel (alles dünne Mode-Subs)
const KW=[
  {kw:'women tote handbag large pu',c:'taschen'},
  {kw:'women bucket bag drawstring',c:'taschen'},
  {kw:'women hobo shoulder bag soft',c:'taschen'},
  {kw:'canvas tote bag casual women',c:'taschen'},
  {kw:'bucket hat reversible cotton',c:'hut'},
  {kw:'wide brim straw hat women summer',c:'hut'},
  {kw:'mens ratchet belt leather automatic',c:'guertel'},
];
const b=await chromium.launch({headless:true,args:['--ignore-certificate-errors','--no-sandbox']});
const c=await b.newContext({ignoreHTTPSErrors:true});
async function get(p,params={}){const qs=new URLSearchParams(params).toString();
  for(let a=0;a<4;a++){const r=await c.request.get(`${BASE}${p}?${qs}`,{headers:{'CJ-Access-Token':tok},timeout:30000});
  const j=await r.json(); if(j.code===1600200||/Too Many|QPS/i.test(j.message||'')){await sleep((a+1)*2500);continue;} return j;} throw new Error('rl');}
const cand=new Map();
for(const {kw,c:cat} of KW){process.stderr.write(`🔎 ${kw} → ${cat}\n`);
  const r=await get('/product/list',{pageNum:1,pageSize:40,productNameEn:kw});
  const must=cat==='taschen'?'bag':cat==='hut'?'hat':'belt';
  let list=(r.data?.list||[]).filter(p=>{const n=(p.productNameEn||'').toLowerCase();
    return n.includes(must)&&!n.includes('cosmetic')&&!n.includes('storage')&&!n.includes('makeup')&&!n.includes('trash')&&!n.includes('grow');});
  for(const p of list){if(!cand.has(p.pid))cand.set(p.pid,{...p,cat});} await sleep(2400);}
const uniq=[...cand.values()].sort((a,b)=>(Number(b.listedNum)||0)-(Number(a.listedNum)||0)).slice(0,12);
const out=[];
for(const p of uniq){const d=(await get('/product/query',{pid:p.pid})).data;await sleep(2400);if(!d)continue;
  const vs=d.variants||[];const costs=vs.map(v=>Number(v.variantSellPrice)).filter(Boolean);
  out.push({cat:p.cat,pid:d.pid,nameEn:d.productNameEn,sku:vs[0]?.variantSku||d.productSku,
    cost:costs.length?Math.min(...costs):Number(d.sellPrice),vars:vs.length,imgs:(d.productImageSet||[]).length,listed:d.listedNum,img0:(d.productImageSet||[])[0]||''});
  process.stderr.write(`   ✔[${p.cat}] ${d.productNameEn.slice(0,44)} $${costs.length?Math.min(...costs):d.sellPrice} ${vs.length}v ${(d.productImageSet||[]).length}img\n`);}
await b.close();
fs.writeFileSync('/tmp/cj_taschen2.json',JSON.stringify(out,null,2));
for(const p of out)console.log(`[${p.cat}] pid=${p.pid} sku=${p.sku.slice(0,11)} $${p.cost} ${p.vars}v ${p.imgs}img | ${p.nameEn.slice(0,46)}`);
