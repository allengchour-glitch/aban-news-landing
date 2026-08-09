import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL=process.argv[2];
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_v2'+(seq++);
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
  return {price:pr[0]?pr[0].textContent.trim():null, img:(img?(img.currentSrc||img.src):'').split('/').pop().slice(0,40), url:location.search,
    sels:[...main.querySelectorAll('select')].map(s=>s.value)};
});
const sels=await p.$$('main select');
console.log('selects',sels.length);
console.log('BEFORE',JSON.stringify(await snap()));
if(sels[0]){
  const vals=await sels[0].evaluate(s=>[...s.options].map(o=>o.value));
  console.log('opt0 values',JSON.stringify(vals));
  for(const v of vals.slice(1,4)){
    await sels[0].selectOption(v);
    await p.waitForTimeout(4000);
    console.log('AFTER opt0='+v, JSON.stringify(await snap()));
  }
}
await b.close();
