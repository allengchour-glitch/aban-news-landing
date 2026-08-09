import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL=process.argv[2];
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_o'+(seq++);
 execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',u,'--compressed'],{maxBuffer:1e8},(e,out)=>{
  if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
  try{const b=fs.readFileSync(f);fs.unlinkSync(f);res({ct:(out||'').trim()||'text/html',body:b});}catch{res(null);}});});}
const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async r=>{const u=r.request().url(); if(!/^https?:/.test(u))return r.continue(); const g=await curlGet(u); if(!g)return r.abort(); try{await r.fulfill({status:200,contentType:g.ct,body:g.body});}catch{try{r.abort()}catch{}}});
const p=await ctx.newPage();
await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForTimeout(6000);
const o=await p.evaluate(()=>{
 const t=e=>Math.round(e.getBoundingClientRect().top+scrollY);
 const find=(re)=>{const el=[...document.querySelectorAll('h1,h2,h3,h4,summary,button,p,div')].find(e=>re.test(e.textContent.trim())&&e.children.length<4&&e.getBoundingClientRect().height>0);return el?{top:t(el),txt:el.textContent.trim().replace(/\s+/g,' ').slice(0,55)}:null;};
 return {docH:document.body.scrollHeight, vh:innerHeight,
  bild:(()=>{const e=document.querySelector('main [class*="media" i] img');return e?t(e):null})(),
  titel:find(/^Mini-Kleid|^Eleganter|^Damenuhr|^T-Shirt zum/),
  preis:(()=>{const e=[...document.querySelectorAll('main [class*="price" i]')].find(x=>x.children.length===0&&/CHF/.test(x.textContent));return e?{top:t(e),txt:e.textContent.trim()}:null})(),
  bewertungen:find(/Bewertungen/),
  farbe:find(/^Farbe$/), groesse:find(/^Grösse$/),
  atc:(()=>{const e=[...document.querySelectorAll('main button')].find(x=>/In den Warenkorb legen/.test(x.textContent)&&x.getBoundingClientRect().width>200);return e?t(e):null})(),
  versandBlock:find(/^Versand & Lieferung/), rueckgabeBlock:find(/^Rückgabe & Umtausch/),
  beschreibung:find(/Produktdetails|Warum bei LuxeStyle|Lieferzeit/),
  reviewsWidget:find(/Bewertung schreiben|Kundenbewertungen/),
  empfehlungen:find(/Das könnte dir|Ähnliche|Passt dazu|Weitere Produkte|Kunden kauften/)};
});
console.log(JSON.stringify(o,null,1));
await p.evaluate(()=>scrollTo(0,1400)); await p.waitForTimeout(2500);
await p.screenshot({path:process.argv[3]});
await b.close();
