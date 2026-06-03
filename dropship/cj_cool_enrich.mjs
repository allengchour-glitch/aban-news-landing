import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const BASE='https://developers.cjdropshipping.com/api2.0/v1';
const tok=JSON.parse(fs.readFileSync('/tmp/cj_token.json')).accessToken;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PIDS=process.argv.slice(2);
const b=await chromium.launch({headless:true,args:['--ignore-certificate-errors','--no-sandbox']});
const c=await b.newContext({ignoreHTTPSErrors:true});
async function get(p,params={}){const qs=new URLSearchParams(params).toString();
  for(let a=0;a<4;a++){const r=await c.request.get(`${BASE}${p}?${qs}`,{headers:{'CJ-Access-Token':tok},timeout:30000});
  const j=await r.json(); if(j.code===1600200||/Too Many|QPS/i.test(j.message||'')){await sleep((a+1)*2500);continue;} return j;} throw new Error('rl');}
const out=[];
for(const pid of PIDS){const d=(await get('/product/query',{pid})).data;await sleep(2200);if(!d)continue;
  const vs=(d.variants||[]).map(v=>({sku:v.variantSku,key:v.variantKey||v.variantNameEn||'',cost:Number(v.variantSellPrice)||0}));
  out.push({pid:d.pid,nameEn:d.productNameEn,desc:(d.productDescEn||'').replace(/<[^>]+>/g,' ').slice(0,300),
    vars:vs, images:(d.productImageSet||[])});
  process.stderr.write(`✔ ${d.productNameEn.slice(0,50)} | ${vs.length}v | ${(d.productImageSet||[]).length}img\n`);
  process.stderr.write(`   keys: ${[...new Set(vs.map(v=>v.key))].slice(0,12).join(' | ')}\n`);
}
await b.close();
fs.writeFileSync('/tmp/cj_cool_full.json',JSON.stringify(out,null,2));
console.log('wrote',out.length,'→ /tmp/cj_cool_full.json');
