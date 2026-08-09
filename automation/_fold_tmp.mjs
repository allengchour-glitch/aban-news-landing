import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_f'+(seq++);
 execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',u,'--compressed'],{maxBuffer:1e8},(e,out)=>{
  if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
  try{const b=fs.readFileSync(f);fs.unlinkSync(f);res({ct:(out||'').trim()||'text/html',body:b});}catch{res(null);}});});}
const handles=fs.readFileSync(process.argv[2],'utf8').trim().split('\n');
const MOB=process.env.MOBILE==='1';
const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext(MOB?{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'}:{viewport:{width:1440,height:900}});
await ctx.route('**/*',async r=>{const u=r.request().url(); if(!/^https?:/.test(u))return r.continue(); const g=await curlGet(u); if(!g)return r.abort(); try{await r.fulfill({status:200,contentType:g.ct,body:g.body});}catch{try{r.abort()}catch{}}});
const p=await ctx.newPage();
console.log('handle\tchrome\th1\tpreis\tatc\tfold\tpreisImFold\tatcImFold');
for(const h of handles){
 try{
  await p.goto('https://luxestyle.ch/products/'+h,{waitUntil:'domcontentloaded',timeout:90000});
  await p.waitForTimeout(6500);
  const r=await p.evaluate(()=>{
   const t=e=>e?Math.round(e.getBoundingClientRect().top+scrollY):null;
   const main=document.querySelector('main');
   const g=main.querySelector('[class*="media" i] img');
   const h1=main.querySelector('h1');
   const pr=[...main.querySelectorAll('[class*="price" i]')].find(x=>x.children.length===0&&/CHF/.test(x.textContent)&&x.getBoundingClientRect().width>40);
   const atc=[...main.querySelectorAll('button')].find(x=>/In den Warenkorb legen/.test(x.textContent)&&x.getBoundingClientRect().width>200);
   return {chrome:t(g),h1:t(h1),preis:t(pr),atc:t(atc),vh:innerHeight};
  });
  console.log([h.slice(0,42),r.chrome,r.h1,r.preis,r.atc,r.vh,(r.preis!==null&&r.preis<r.vh),(r.atc!==null&&r.atc<r.vh)].join('\t'));
 }catch(e){ console.log(h+'\tFEHLER '+e.message.slice(0,40)); }
 await new Promise(r=>setTimeout(r,1500));
}
await b.close();
