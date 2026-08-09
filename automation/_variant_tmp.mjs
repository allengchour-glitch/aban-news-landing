import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL=process.argv[2];
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_v'+(seq++);
 execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',u,'--compressed'],{maxBuffer:1e8},(e,out)=>{
  if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
  try{const b=fs.readFileSync(f);fs.unlinkSync(f);res({ct:(out||'').trim()||'text/html',body:b});}catch{res(null);}});});}
const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:1440,height:1200}});
await ctx.route('**/*',async r=>{const u=r.request().url(); if(!/^https?:/.test(u))return r.continue(); const g=await curlGet(u); if(!g)return r.abort(); try{await r.fulfill({status:200,contentType:g.ct,body:g.body});}catch{try{r.abort()}catch{}}});
const p=await ctx.newPage();
await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForTimeout(6000);
const snap=async()=>await p.evaluate(()=>{
  const main=document.querySelector('main');
  const pr=[...main.querySelectorAll('[class*="price" i]')].filter(e=>e.children.length===0&&/CHF/.test(e.textContent));
  const img=main.querySelector('[class*="media" i] img, .product-media img');
  const sel=[...main.querySelectorAll('input[type=radio]:checked, select')].map(e=>e.type==='radio'?e.value:e.value);
  return {price:pr[0]?pr[0].textContent.trim():null, img:img?img.currentSrc||img.src:null, url:location.search, sel};
});
const opts=await p.evaluate(()=>{
  const main=document.querySelector('main');
  const groups=[...main.querySelectorAll('.variant-option, [class*="variant-option"]')];
  return groups.map(g=>({label:(g.querySelector('legend,label,.variant-option__label')||{}).textContent?.trim().replace(/\s+/g,' ').slice(0,50),
    kind: g.querySelector('select')?'select':(g.querySelectorAll('input[type=radio]').length?'radio':'?'),
    n: g.querySelectorAll('input[type=radio]').length || (g.querySelector('select')?g.querySelectorAll('option').length:0),
    hasSwatchImg: g.querySelectorAll('img,[style*="background-image"]').length,
    values:[...g.querySelectorAll('input[type=radio]')].map(i=>i.value).slice(0,12)}));
});
console.log('OPTIONS', JSON.stringify(opts));
console.log('BEFORE', JSON.stringify(await snap()));
// click 2nd value of first group
const radios=await p.$$('main input[type=radio]');
console.log('radioCount',radios.length);
for (const idx of [1,2]){
  if(radios[idx]){
    try{ await radios[idx].click({force:true}); }catch(e){ console.log('clickerr',e.message.slice(0,80)); }
    await p.waitForTimeout(3500);
    console.log('AFTER click radio#'+idx, JSON.stringify(await snap()));
  }
}
await b.close();
