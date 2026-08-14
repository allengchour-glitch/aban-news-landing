import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(url){return new Promise(res=>{const f='/tmp/_mu'+(seq++);
  execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],{maxBuffer:1e8},(e,out)=>{
    if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
    try{const body=fs.readFileSync(f);fs.unlinkSync(f);res({ct:(out||'').trim()||'text/html',body});}catch{res(null);}});});}
const MOB = process.env.DESKTOP!=='1';
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext(MOB
  ? { viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true,
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }
  : { viewport:{width:1440,height:900} });
await ctx.route('**/*', async route=>{const u=route.request().url();
  if(!/^https?:/.test(u)) return route.continue();
  const r=await curlGet(u); if(!r) return route.abort();
  try{ await route.fulfill({status:200,contentType:r.ct,body:r.body}); }catch{ try{route.abort()}catch{} }});
const p = await ctx.newPage();
await p.goto(process.argv[2],{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForTimeout(7000);
try{ await p.click('#lx-pop-x',{timeout:2500}); }catch{}
try{ await p.click('#lx-cookie-banner button:last-of-type',{timeout:2500}); }catch{}
await p.waitForTimeout(1000);
const r = await p.evaluate(()=>{
  const o={vw:innerWidth,vh:innerHeight};
  const secs=[...document.querySelectorAll('.shopify-section')].slice(0,6).map(s=>{
    const rc=s.getBoundingClientRect();
    return {id:s.id.replace('shopify-section-',''),top:Math.round(rc.top+scrollY),h:Math.round(rc.height)};
  });
  o.sections=secs;
  // grosse Textblöcke im ersten Abschnitt
  const big=[];
  document.querySelectorAll('h1,h2,h3,p,div').forEach(el=>{
    const st=getComputedStyle(el); const fs=parseFloat(st.fontSize);
    const rc=el.getBoundingClientRect();
    if(fs>=28 && rc.height>0 && rc.top+scrollY < 3000){
      const own=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();
      if(own.length>40) big.push({tag:el.tagName.toLowerCase(),fs:Math.round(fs),lines:Math.round(rc.height/parseFloat(st.lineHeight||fs)),
        h:Math.round(rc.height),top:Math.round(rc.top+scrollY),chars:own.length,txt:own.slice(0,90)});
    }
  });
  o.bigText=big;
  // erster Knopf / Link mit Klasse button
  const btn=document.querySelector('.button, a.button, [class*="button"]');
  if(btn){const rc=btn.getBoundingClientRect();o.firstButton={txt:(btn.textContent||'').trim().slice(0,40),top:Math.round(rc.top+scrollY)};}
  // erstes Produktbild
  const card=document.querySelector('.product-card, .card-gallery, product-card');
  if(card){const rc=card.getBoundingClientRect();o.firstProductTop=Math.round(rc.top+scrollY);}
  o.scrollH=document.documentElement.scrollHeight;
  return o;
});
console.log(JSON.stringify(r,null,1));
await b.close();
