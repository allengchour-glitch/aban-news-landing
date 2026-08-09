import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL=process.argv[2], SEL=process.argv[3];
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_cb'+(seq++);
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
await p.waitForTimeout(8000);
const out=await p.evaluate((SEL)=>{
 const el=document.querySelector(SEL); if(!el)return {err:'not found'};
 const chain=[]; let n=el;
 while(n){const cs=getComputedStyle(n);const rc=n.getBoundingClientRect();
  chain.push({tag:n.tagName,id:n.id,cls:(typeof n.className==='string'?n.className:'').slice(0,70),
   w:Math.round(rc.width),left:Math.round(rc.left),cssW:cs.width,minW:cs.minWidth,maxW:cs.maxWidth,disp:cs.display,pos:cs.position,ovx:cs.overflowX,
   gtc:cs.gridTemplateColumns.slice(0,80), flex:cs.flex, scrollW:n.scrollWidth, clientW:n.clientWidth});
  n=n.parentElement;}
 return {chain};
},SEL);
console.log(JSON.stringify(out,null,1));
await b.close();
