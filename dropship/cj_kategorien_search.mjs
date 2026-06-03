import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const BASE='https://developers.cjdropshipping.com/api2.0/v1';
const tok=JSON.parse(fs.readFileSync('/tmp/cj_token.json')).accessToken;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
// dünne/leere Kategorien füllen. must = Pflicht-Token, cat = Ziel-Tag, take = wie viele behalten
const KW=[
  {kw:'baby silicone bib waterproof',must:'bib',cat:'baby',take:1},
  {kw:'baby bath toy set',must:'toy',cat:'kinder-spielzeug',take:1},
  {kw:'kids building blocks educational',must:'block',cat:'kinder-spielzeug',take:1},
  {kw:'montessori wooden toy toddler',must:'toy',cat:'kinder-spielzeug',take:1},
  {kw:'cocktail shaker set bar tools',must:'bar',cat:'bar-tools',take:1},
  {kw:'cocktail making kit stainless',must:'cocktail',cat:'bar-tools',take:1},
  {kw:'flower vase ceramic nordic',must:'vase',cat:'vasen',take:1},
  {kw:'glass vase decorative modern',must:'vase',cat:'vasen',take:1},
  {kw:'facial cleansing brush silicone',must:'brush',cat:'hautpflege-tools',take:1},
  {kw:'ice roller face skin care',must:'roller',cat:'hautpflege-tools',take:1},
  {kw:'car phone holder magnetic vent',must:'holder',cat:'auto-power',take:1},
  {kw:'serving tray wood bamboo',must:'tray',cat:'servieren',take:1},
];
const b=await chromium.launch({headless:true,args:['--ignore-certificate-errors','--no-sandbox']});
const c=await b.newContext({ignoreHTTPSErrors:true});
async function get(p,params={}){const qs=new URLSearchParams(params).toString();
  for(let a=0;a<4;a++){const r=await c.request.get(`${BASE}${p}?${qs}`,{headers:{'CJ-Access-Token':tok},timeout:30000});
  const j=await r.json(); if(j.code===1600200||/Too Many|QPS/i.test(j.message||'')){await sleep((a+1)*2500);continue;} return j;} throw new Error('rl');}
const cand=new Map();
for(const {kw,must,cat} of KW){process.stderr.write(`🔎 ${kw} → ${cat}\n`);
  const r=await get('/product/list',{pageNum:1,pageSize:40,productNameEn:kw});
  let list=(r.data?.list||[]).filter(p=>{const n=(p.productNameEn||'').toLowerCase();
    return n.includes(must)&&!n.includes('grow bag')&&!n.includes('trash');});
  for(const p of list){if(!cand.has(p.pid))cand.set(p.pid,{...p,cat});} await sleep(2400);}
const uniq=[...cand.values()].sort((a,b)=>(Number(b.listedNum)||0)-(Number(a.listedNum)||0)).slice(0,18);
const out=[];
for(const p of uniq){const d=(await get('/product/query',{pid:p.pid})).data;await sleep(2400);if(!d)continue;
  const vs=d.variants||[];const costs=vs.map(v=>Number(v.variantSellPrice)).filter(Boolean);
  out.push({cat:p.cat,pid:d.pid,nameEn:d.productNameEn,sku:vs[0]?.variantSku||d.productSku,
    cost:costs.length?Math.min(...costs):Number(d.sellPrice),vars:vs.length,imgs:(d.productImageSet||[]).length,listed:d.listedNum,img0:(d.productImageSet||[])[0]||''});
  process.stderr.write(`   ✔[${p.cat}] ${d.productNameEn.slice(0,42)} $${costs.length?Math.min(...costs):d.sellPrice} ${vs.length}v ${(d.productImageSet||[]).length}img\n`);}
await b.close();
fs.writeFileSync('/tmp/cj_full.json',JSON.stringify(out,null,2));
for(const p of out)console.log(`[${p.cat}] pid=${p.pid} sku=${p.sku.slice(0,11)} $${p.cost} ${p.vars}v ${p.imgs}img | ${p.nameEn.slice(0,44)}`);
