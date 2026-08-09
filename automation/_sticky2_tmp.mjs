import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL=process.argv[2], W=+(process.argv[4]||390), H=+(process.argv[5]||844);
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_st2'+(seq++);
 execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',u,'--compressed'],{maxBuffer:1e8},(e,out)=>{
  if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
  try{const b=fs.readFileSync(f);fs.unlinkSync(f);res({ct:(out||'').trim()||'text/html',body:b});}catch{res(null);}});});}
const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--disable-dev-shm-usage']});
const mob=W<800;
const ctx=await b.newContext(mob?{viewport:{width:W,height:H},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'}:{viewport:{width:W,height:H}});
await ctx.route('**/*',async r=>{const u=r.request().url(); if(!/^https?:/.test(u))return r.continue(); const g=await curlGet(u); if(!g)return r.abort(); try{await r.fulfill({status:200,contentType:g.ct,body:g.body});}catch{try{r.abort()}catch{}}});
const p=await ctx.newPage();
await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForTimeout(6000);
await p.addStyleTag({content:'dialog,[role="dialog"],.modal,[class*="popup" i],[class*="cookie" i],[id*="popup" i],[class*="newsletter" i]{display:none!important}'});
for(const y of [0,600,1300,2000,2800,3600]){
 await p.evaluate(v=>scrollTo(0,v),y); await p.waitForTimeout(1800);
 const s=await p.evaluate(()=>{const bar=document.querySelector('.sticky-add-to-cart__bar'); if(!bar)return 'kein bar';
  const r=bar.getBoundingClientRect(),cs=getComputedStyle(bar);
  return `top=${Math.round(r.top)} opacity=${cs.opacity} vis=${cs.visibility} inView=${r.top<innerHeight&&r.bottom>0&&cs.opacity!=='0'}`;});
 console.log('scrollY='+y, s);
}
await p.evaluate(()=>scrollTo(0,2000)); await p.waitForTimeout(1500);
await p.screenshot({path:process.argv[3]});
await b.close();
