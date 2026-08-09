import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL=process.argv[2], MOBILE=process.env.MOBILE==='1';
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_m2'+(seq++);
 execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',u,'--compressed'],{maxBuffer:1e8},(e,out)=>{
  if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
  try{const b=fs.readFileSync(f);fs.unlinkSync(f);res({ct:(out||'').trim()||'text/html',body:b});}catch{res(null);}});});}
const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext(MOBILE?{viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'}:{viewport:{width:1440,height:900}});
await ctx.route('**/*',async r=>{const u=r.request().url(); if(!/^https?:/.test(u))return r.continue(); const g=await curlGet(u); if(!g)return r.abort(); try{await r.fulfill({status:200,contentType:g.ct,body:g.body});}catch{try{r.abort()}catch{}}});
const p=await ctx.newPage();
await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForTimeout(6000);
const out=await p.evaluate(()=>{
  const abs=el=>{const r=el.getBoundingClientRect();return {top:Math.round(r.top+scrollY),h:Math.round(r.height),w:Math.round(r.width)};};
  const vis=el=>{const s=getComputedStyle(el);const r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'&&r.width>0&&r.height>0;};
  const res={vh:innerHeight,docH:document.body.scrollHeight};
  const main=document.querySelector('main')||document.body;
  // main product price: inside main, class contains price
  res.prices=[...main.querySelectorAll('[class*="price" i]')].filter(e=>e.children.length===0&&/CHF/.test(e.textContent)&&vis(e)).slice(0,6).map(e=>({...abs(e),t:e.textContent.trim(),c:e.className.slice(0,50)}));
  res.h1=(()=>{const e=main.querySelector('h1');return e?{...abs(e),t:e.textContent.trim().slice(0,70)}:null})();
  // sticky ATC: is it in viewport at scroll 0?
  res.sticky=[...document.querySelectorAll('[class*="sticky-add-to-cart" i]')].map(e=>{const s=getComputedStyle(e);const r=e.getBoundingClientRect();return{cls:e.className.slice(0,60),pos:s.position,display:s.display,vpTop:Math.round(r.top),vpBottom:Math.round(r.bottom),visibleNow:vis(e)&&r.top<innerHeight&&r.bottom>0};});
  res.atc=[...main.querySelectorAll('button')].filter(e=>/warenkorb/i.test(e.textContent)).map(e=>({...abs(e),t:e.textContent.trim().slice(0,40),cls:e.className.slice(0,50),vis:vis(e)}));
  // variant swatch inputs
  res.optionGroups=[...main.querySelectorAll('fieldset')].map(f=>{const lb=f.querySelector('legend');const inputs=[...f.querySelectorAll('input')];return{...abs(f),legend:lb?lb.textContent.trim().replace(/\s+/g,' ').slice(0,60):null,n:inputs.length,type:inputs[0]?inputs[0].type:null,swatchImgs:f.querySelectorAll('img, .swatch').length};});
  // gallery thumbnails
  res.thumbs=main.querySelectorAll('[class*="thumb" i] img, [class*="thumbnail" i]').length;
  res.mediaImgs=main.querySelectorAll('[class*="media" i] img').length;
  // cookie banner
  const cb=[...document.querySelectorAll('*')].find(e=>/Wir nutzen Cookies/.test(e.textContent)&&e.children.length<8&&vis(e));
  res.cookie=cb?{...abs(cb),pos:getComputedStyle(cb).position}:null;
  return res;
});
console.log(JSON.stringify(out));
await b.close();
