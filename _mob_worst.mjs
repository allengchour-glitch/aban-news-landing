import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL=process.argv[2], OUT=process.argv[3];
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_ws'+(seq++);
 execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}|%{http_code}',u,'--compressed'],{maxBuffer:1e8},(e,out)=>{
 if(e){try{fs.unlinkSync(f)}catch{};return res(null);} const[ct,code]=(out||'').trim().split('|');
 try{const body=fs.readFileSync(f);fs.unlinkSync(f);res({ct:ct||'text/html',body,code});}catch{res(null);}});});}
const b=await chromium.launch({executablePath:fs.existsSync(CHROME)?CHROME:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
 userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'});
await ctx.route('**/*',async r2=>{const u=r2.request().url();if(!/^https?:/.test(u))return r2.continue();
 const r=await curlGet(u);if(!r)return r2.abort();
 try{await r2.fulfill({status:parseInt(r.code)||200,contentType:r.ct,body:r.body});}catch{try{r2.abort()}catch{}}});
const p=await ctx.newPage();
try{await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});}catch(e){console.log('NAV',e.message);}
await p.waitForTimeout(8000);
const r=await p.evaluate(()=>{
 const o={innerW:window.innerWidth, clientW:document.documentElement.clientWidth, docW:document.documentElement.scrollWidth,
  vv:window.visualViewport?Math.round(window.visualViewport.width):null};
 const q=(s,n)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();
  return {w:Math.round(r.width),left:Math.round(r.left),right:Math.round(r.right)};};
 o.pop=q('#lx-pop'); o.cookie=q('#lx-cookie-banner'); o.header=q('header.header-section');
 const pop=document.querySelector('#lx-pop');
 if(pop){const x=[...pop.querySelectorAll('button,a,span,div')].find(e=>/^[×✕✖xX]$/.test((e.textContent||'').trim()));
  if(x){const r=x.getBoundingClientRect();o.closeX={left:Math.round(r.left),right:Math.round(r.right),top:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),ausserhalb:r.left>o.clientW};}}
 const ck=document.querySelector('#lx-cookie-banner');
 if(ck){const acc=[...ck.querySelectorAll('button,a')].find(e=>/akzeptieren/i.test(e.textContent||''));
  if(acc){const r=acc.getBoundingClientRect();o.akzept={left:Math.round(r.left),right:Math.round(r.right),top:Math.round(r.top),ausserhalb:r.left>o.clientW};}}
 return o;});
console.log(JSON.stringify(r,null,1));
await p.screenshot({path:OUT});
console.log('SHOT',OUT);
await b.close();
