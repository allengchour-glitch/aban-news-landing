import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(url){return new Promise(res=>{const f='/tmp/_sc'+(seq++);
 execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],{maxBuffer:1e8},(e,out)=>{
 if(e){try{fs.unlinkSync(f)}catch{};return res(null);} try{const b=fs.readFileSync(f);fs.unlinkSync(f);res({ct:(out||'').trim()||'text/html',body:b});}catch{res(null);} });});}
const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async route=>{const u=route.request().url(); if(!/^https?:/.test(u))return route.continue();
 const r=await curlGet(u); if(!r)return route.abort(); try{await route.fulfill({status:200,contentType:r.ct,body:r.body});}catch{try{route.abort()}catch{}}});
const p=await ctx.newPage();
await p.goto(process.argv[2],{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForTimeout(9000);
try{ await p.addStyleTag({content:'dialog,[role="dialog"],.modal,[class*="popup" i],[class*="cookie" i],[id*="cookie" i],[id*="popup" i]{display:none!important}'});}catch{}
const ys=process.argv[3].split(',').map(Number);
for(const y of ys){ await p.evaluate(v=>scrollTo(0,v),y); await p.waitForTimeout(1500);
  await p.screenshot({path:`/tmp/sc_${y}.png`}); console.log('shot',y); }
await b.close();
