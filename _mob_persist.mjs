import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_pr'+(seq++);
 execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}|%{http_code}',u,'--compressed'],{maxBuffer:1e8},(e,out)=>{
 if(e){try{fs.unlinkSync(f)}catch{};return res(null);} const[ct,code]=(out||'').trim().split('|');
 try{const body=fs.readFileSync(f);fs.unlinkSync(f);res({ct:ct||'text/html',body,code});}catch{res(null);}});});}
const b=await chromium.launch({executablePath:fs.existsSync(CHROME)?CHROME:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:false,hasTouch:true,
 userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async r2=>{const u=r2.request().url();if(!/^https?:/.test(u))return r2.continue();
 const r=await curlGet(u);if(!r)return r2.abort();
 try{await r2.fulfill({status:parseInt(r.code)||200,contentType:r.ct,body:r.body});}catch{try{r2.abort()}catch{}}});
const p=await ctx.newPage();
const state=async(tag)=>{const s=await p.evaluate(()=>{
 const q=s=>{const e=document.querySelector(s);if(!e)return 'absent';const cs=getComputedStyle(e);const r=e.getBoundingClientRect();
  return (cs.display!=='none'&&cs.visibility!=='hidden'&&parseFloat(cs.opacity)>0&&r.height>0)?('sichtbar '+Math.round(r.width)+'x'+Math.round(r.height)):'versteckt';};
 let ls={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(/pop|cookie|lux|welcome|consent/i.test(k))ls[k]=localStorage.getItem(k).slice(0,30);}}catch(e){ls={err:1}}
 let ss={};try{for(let i=0;i<sessionStorage.length;i++){const k=sessionStorage.key(i);if(/pop|cookie|lux|welcome|consent/i.test(k))ss[k]=sessionStorage.getItem(k).slice(0,30);}}catch(e){}
 return {pop:q('#lx-pop'),cookie:q('#lx-cookie-banner'),ls,ss,ck:document.cookie.split(';').map(x=>x.trim().split('=')[0]).filter(k=>/lux|pop|consent|cookie/i.test(k))};});
 console.log(tag,JSON.stringify(s));};
const go=async u=>{try{await p.goto(u,{waitUntil:'domcontentloaded',timeout:90000});}catch(e){console.log('NAV',e.message);} await p.waitForTimeout(7000);};
await go('https://luxestyle.ch/');
await state('1-Start(frisch)');
await p.evaluate(()=>{const pop=document.querySelector('#lx-pop');if(pop){const x=[...pop.querySelectorAll('button,a,span,div')].find(e=>/^[×✕✖xX]$/.test((e.textContent||'').trim()));if(x)x.click();}
 const ck=document.querySelector('#lx-cookie-banner');if(ck){const a=[...ck.querySelectorAll('button,a')].find(e=>/akzeptieren/i.test(e.textContent||''));if(a)a.click();}});
await p.waitForTimeout(2000);
await state('2-nach-Schliessen');
await go('https://luxestyle.ch/collections/damen-mode');
await state('3-2.Seite');
await go('https://luxestyle.ch/products/premium-leder-geldborse-slim');
await state('4-3.Seite');
await b.close();
