import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0; function curlGet(u){return new Promise(r=>{const f='/tmp/_f'+(seq++);execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',u,'--compressed'],{maxBuffer:1e8},(e,o)=>{if(e){try{fs.unlinkSync(f)}catch{};return r(null);}try{const b=fs.readFileSync(f);fs.unlinkSync(f);r({ct:(o||'').trim()||'text/html',body:b});}catch{r(null);}});});}
const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async rt=>{const u=rt.request().url();if(!/^https?:/.test(u))return rt.continue();const r=await curlGet(u);if(!r)return rt.abort();try{await rt.fulfill({status:200,contentType:r.ct,body:r.body});}catch{try{rt.abort()}catch{}}});
const p=await ctx.newPage();
await p.goto('https://luxestyle.ch/',{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForTimeout(8000);
await p.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=800){scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}});
await p.waitForTimeout(4000);
try{await p.addStyleTag({content:'dialog,[role="dialog"],[class*="popup" i],[class*="cookie" i]{display:none!important}'});}catch{}
const info=await p.evaluate(()=>{
  const f=document.querySelector('footer')||document.querySelector('[class*="footer"]');
  const r=f?f.getBoundingClientRect():null;
  return {docH:document.body.scrollHeight, footerTop:r?Math.round(r.top+scrollY):null, footerH:r?Math.round(r.height):null,
    footerText:f?f.innerText.slice(0,1500):null};
});
console.log(JSON.stringify(info,null,1));
const f=await p.$('footer');
if(f) await f.screenshot({path:'/tmp/footer.png'});
await b.close();
