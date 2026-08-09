import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || '';
let seq=0;
const curlGet=(url)=>new Promise(res=>{const f='/tmp/_ck'+(seq++);
 execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],{maxBuffer:1e8},(e,out)=>{
  if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
  try{const b=fs.readFileSync(f);fs.unlinkSync(f);res({ct:(out||'').trim()||'text/html',body:b});}catch{res(null);}});});
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
 userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async r=>{const u=r.request().url();if(!/^https?:/.test(u))return r.continue();
 const x=await curlGet(u); if(!x) return r.abort(); try{await r.fulfill({status:200,contentType:x.ct,body:x.body});}catch{try{r.abort()}catch{}}});
const p=await ctx.newPage();
await p.goto('https://luxestyle.ch/',{waitUntil:'load',timeout:120000}).catch(e=>console.log('nav',e.message));
await p.waitForTimeout(8000);
const r=await p.evaluate(()=>{
 const cards=[...document.querySelectorAll('product-card')].filter(c=>c.getBoundingClientRect().width>0);
 const c=cards[0]; const img=c&&c.querySelector('img');
 const picked={};
 [...document.images].filter(i=>i.currentSrc&&/product|files/.test(i.currentSrc)).forEach(i=>{
   const m=i.currentSrc.match(/width=(\d+)/); if(m) picked[m[1]]=(picked[m[1]]||0)+1;});
 return {kartenBreiteCSSpx: c?Math.round(c.getBoundingClientRect().width):null,
  bildAnzeigeBreite: img?Math.round(img.getBoundingClientRect().width):null,
  bildGewaehlteURL: img?img.currentSrc.replace(/^.*files\//,'').slice(0,80):null,
  sizesAttr: img?img.getAttribute('sizes'):null,
  gewaehlteBreitenHistogramm: picked, dpr: devicePixelRatio};
});
console.log(JSON.stringify(r,null,1));
await b.close();
