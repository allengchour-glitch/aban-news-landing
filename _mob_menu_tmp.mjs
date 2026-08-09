import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL=process.argv[2], OUT=process.argv[3];
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_mn'+(seq++);
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
// Popup + Cookie schliessen wie ein Nutzer
const dismissed = await p.evaluate(()=>{
 const log=[];
 const pop=document.querySelector('#lx-pop');
 if(pop){const x=[...pop.querySelectorAll('button,a,span,div')].find(e=>/^[×✕✖xX]$/.test((e.textContent||'').trim()));
  if(x){x.click();log.push('popup-x-clicked');}else{log.push('no-x-found');}}
 const ck=document.querySelector('#lx-cookie-banner');
 if(ck){const acc=[...ck.querySelectorAll('button,a')].find(e=>/akzeptieren/i.test(e.textContent||''));
  if(acc){acc.click();log.push('cookie-accepted');}}
 return log;});
console.log('DISMISS',JSON.stringify(dismissed));
await p.waitForTimeout(1500);
// Menü öffnen
const opened = await p.evaluate(()=>{
 const d=document.querySelector('#Details-menu-drawer-container');
 if(!d)return 'no-details';
 const s=d.querySelector('summary');
 if(s){s.click(); return 'summary-clicked';}
 d.setAttribute('open',''); return 'attr-set';});
console.log('OPEN',opened);
await p.waitForTimeout(2500);
const r=await p.evaluate(()=>{
 const W=document.documentElement.clientWidth, H=window.innerHeight;
 const path=el=>{let s=el.tagName.toLowerCase();if(el.id)s+='#'+el.id;if(el.className&&typeof el.className==='string')s+='.'+el.className.trim().split(/\s+/).slice(0,3).join('.');return s;};
 const d=document.querySelector('#Details-menu-drawer-container');
 const out={W,H,drawerOpen:!!(d&&d.hasAttribute('open')), docW:document.documentElement.scrollWidth, items:[], overlap:[], popupVisible:false, cookieVisible:false};
 const pop=document.querySelector('#lx-pop'); if(pop){const cs=getComputedStyle(pop);out.popupVisible=cs.display!=='none'&&cs.visibility!=='hidden'&&parseFloat(cs.opacity)>0;}
 const ck=document.querySelector('#lx-cookie-banner'); if(ck){const cs=getComputedStyle(ck);const r2=ck.getBoundingClientRect();out.cookieVisible=cs.display!=='none'&&r2.height>0; out.cookieRect={top:Math.round(r2.top),bottom:Math.round(r2.bottom),z:cs.zIndex};}
 // Drawer-Panel
 const panel=document.querySelector('.menu-drawer,.menu-drawer-container [class*="drawer"]');
 if(panel){const pr=panel.getBoundingClientRect();const cs=getComputedStyle(panel);out.panel={sel:path(panel),w:Math.round(pr.width),h:Math.round(pr.height),top:Math.round(pr.top),left:Math.round(pr.left),z:cs.zIndex,pos:cs.position};}
 // Menüpunkte + Tippflächen
 const root=d||document;
 for(const el of root.querySelectorAll('summary, a[href]')){
  const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden')continue;
  const rc=el.getBoundingClientRect(); if(rc.width<=0||rc.height<=0)continue;
  if(rc.top>H||rc.bottom<0)continue;
  out.items.push({sel:path(el).slice(0,45),w:Math.round(rc.width),h:Math.round(rc.height),top:Math.round(rc.top),txt:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,32),small:rc.height<44});
 }
 // Überlappungen: welche fixed/sticky Elemente liegen über dem Drawer?
 const drawerRect=out.panel?{t:out.panel.top,b:out.panel.top+out.panel.h,l:out.panel.left,r:out.panel.left+out.panel.w}:null;
 if(drawerRect){
  for(const el of document.querySelectorAll('body *')){
   const cs=getComputedStyle(el); if(cs.position!=='fixed'&&cs.position!=='sticky')continue;
   if(cs.display==='none'||cs.visibility==='hidden')continue;
   const rc=el.getBoundingClientRect(); if(rc.height<8||rc.width<8)continue;
   if(el.closest('.menu-drawer,#Details-menu-drawer-container'))continue;
   const ov=!(rc.right<drawerRect.l||rc.left>drawerRect.r||rc.bottom<drawerRect.t||rc.top>drawerRect.b);
   if(ov)out.overlap.push({sel:path(el).slice(0,60),z:cs.zIndex,pos:cs.position,top:Math.round(rc.top),h:Math.round(rc.height)});
  }
 }
 return out;});
console.log(JSON.stringify(r,null,1).slice(0,7000));
await p.screenshot({path:OUT});
console.log('SHOT',OUT);
await b.close();
