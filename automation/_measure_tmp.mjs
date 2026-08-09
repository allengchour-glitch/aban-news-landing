import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL=process.argv[2], MOBILE=process.env.MOBILE==='1';
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_mb'+(seq++);
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
  const res={vh:innerHeight,vw:innerWidth,docH:document.body.scrollHeight};
  const top=el=>{if(!el)return null;const r=el.getBoundingClientRect();return Math.round(r.top+scrollY);};
  const txt=el=>el?el.textContent.trim().replace(/\s+/g,' ').slice(0,90):null;
  const q=s=>document.querySelector(s);
  // price
  const priceEl=[...document.querySelectorAll('*')].find(e=>e.children.length===0&&/^CHF\s?[\d'’.,]+$/.test(e.textContent.trim()));
  res.price={top:top(priceEl),text:txt(priceEl)};
  const h1=q('h1'); res.h1={top:top(h1),text:txt(h1)};
  // ATC
  const btns=[...document.querySelectorAll('button,input[type=submit]')].filter(e=>/warenkorb|kaufen|cart/i.test(e.textContent+' '+(e.value||'')));
  res.buttons=btns.map(e=>({top:top(e),text:txt(e)||e.value,visible:!!(e.offsetWidth||e.offsetHeight),cls:e.className.slice(0,60)}));
  const pay=q('.shopify-payment-button, shopify-accelerated-checkout'); res.payBtn={top:top(pay),text:txt(pay)};
  // variant picker
  res.variantFieldsets=[...document.querySelectorAll('fieldset,.variant-option')].map(f=>({top:top(f),legend:txt(f.querySelector('legend'))||txt(f).slice(0,40),inputs:f.querySelectorAll('input').length}));
  // gallery
  const g=q('.product-media-container,.product__media-gallery,[class*="media-gallery"]'); res.gallery={top:top(g)};
  res.imgs=document.querySelectorAll('.product-media img, [class*="media-gallery"] img').length;
  // sticky header height
  const hd=q('header,#header-group,.header'); res.header={top:top(hd),h:hd?Math.round(hd.getBoundingClientRect().height):null};
  // full visible text of first 900px
  res.foldText=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return e.children.length===0&&r.top<innerHeight&&r.bottom>0&&r.width>0&&e.textContent.trim();}).map(e=>e.textContent.trim().replace(/\s+/g,' ')).filter(t=>t.length<80).slice(0,40);
  // description / size chart / delivery
  const bodyTxt=document.body.innerText;
  res.hasSizeChart=/Grössentabelle|Größentabelle|Size Chart|Grössen-?tabelle/i.test(bodyTxt);
  res.deliveryLines=(bodyTxt.match(/[^\n]*(Lieferzeit|Werktage|Lieferung in)[^\n]*/g)||[]).slice(0,6);
  res.returnLines=(bodyTxt.match(/[^\n]*(Rückgabe|Retour|30 Tage)[^\n]*/g)||[]).slice(0,5);
  res.reviewLine=(bodyTxt.match(/[^\n]*(Bewertung|Review|Sterne)[^\n]*/g)||[]).slice(0,4);
  return res;
});
console.log(JSON.stringify(out,null,1));
await b.close();
