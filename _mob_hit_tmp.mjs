import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL=process.argv[2], OUT=process.argv[3], Y=parseInt(process.argv[4]||'2200',10);
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_ht'+(seq++);
 execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}|%{http_code}',u,'--compressed'],{maxBuffer:1e8},(e,out)=>{
 if(e){try{fs.unlinkSync(f)}catch{};return res(null);} const[ct,code]=(out||'').trim().split('|');
 try{const body=fs.readFileSync(f);fs.unlinkSync(f);res({ct:ct||'text/html',body,code});}catch{res(null);}});});}
const b=await chromium.launch({executablePath:fs.existsSync(CHROME)?CHROME:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:false,hasTouch:true,
 userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async r2=>{const u=r2.request().url();if(!/^https?:/.test(u))return r2.continue();
 const r=await curlGet(u);if(!r)return r2.abort();
 try{await r2.fulfill({status:parseInt(r.code)||200,contentType:r.ct,body:r.body});}catch{try{r2.abort()}catch{}}});
const p=await ctx.newPage();
try{await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});}catch(e){console.log('NAV',e.message);}
await p.waitForTimeout(7000);
// NUR Popup schliessen, Cookie-Banner bewusst stehen lassen (echter Erstbesuch)
await p.evaluate(()=>{const pop=document.querySelector('#lx-pop');if(pop){const x=[...pop.querySelectorAll('button,a,span,div')].find(e=>/^[×✕✖xX]$/.test((e.textContent||'').trim()));if(x)x.click();}});
await p.waitForTimeout(1000);
await p.evaluate(y=>window.scrollTo(0,y), Y);
await p.waitForTimeout(2500);
const r=await p.evaluate(()=>{
 const path=el=>{if(!el)return null;let s=el.tagName.toLowerCase();if(el.id)s+='#'+el.id;if(el.className&&typeof el.className==='string')s+='.'+el.className.trim().split(/\s+/).slice(0,3).join('.');return s;};
 const out={};
 const bar=document.querySelector('.sticky-add-to-cart__bar');
 if(bar){const br=bar.getBoundingClientRect();out.bar={top:Math.round(br.top),bottom:Math.round(br.bottom),h:Math.round(br.height)};
  const btn=[...bar.querySelectorAll('button,a')].find(e=>/Warenkorb|Kaufen|hinzu/i.test(e.textContent||''))||bar.querySelector('button');
  if(btn){const rc=btn.getBoundingClientRect();
   out.btn={left:Math.round(rc.left),top:Math.round(rc.top),w:Math.round(rc.width),h:Math.round(rc.height),txt:(btn.textContent||'').trim().slice(0,30)};
   const cx=rc.left+rc.width/2, cy=rc.top+rc.height/2;
   const hit=document.elementFromPoint(cx,cy);
   out.hitCenter={x:Math.round(cx),y:Math.round(cy),el:path(hit),isBtnOrChild: !!(hit&&(hit===btn||btn.contains(hit)))};
   // gesamte Fläche des Bars abtasten
   let blocked=0,total=0;
   for(let x=6;x<390;x+=12)for(let y=Math.round(out.bar.top)+4;y<Math.min(843,out.bar.bottom);y+=8){
    total++; const h2=document.elementFromPoint(x,y); if(h2&&h2.closest('#lx-cookie-banner'))blocked++;}
   out.barBlockedPct=Math.round(blocked/total*100);
  }
 }
 const ck=document.querySelector('#lx-cookie-banner');
 if(ck){const cr=ck.getBoundingClientRect();out.cookie={top:Math.round(cr.top),bottom:Math.round(cr.bottom),z:getComputedStyle(ck).zIndex};}
 return out;});
console.log(JSON.stringify(r,null,1));
await p.screenshot({path:OUT});
console.log('SHOT',OUT);
await b.close();
