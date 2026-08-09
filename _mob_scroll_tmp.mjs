import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL = process.argv[2]; const OUT = process.argv[3]; const X = parseInt(process.argv[4]||'400',10); const Y = parseInt(process.argv[5]||'0',10);
const PROXY = process.env.HTTPS_PROXY || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(url){return new Promise(res=>{const f='/tmp/_sb2'+(seq++);
 execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}|%{http_code}',url,'--compressed'],{maxBuffer:1e8},(e,out)=>{
  if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
  const[ct,code]=(out||'').trim().split('|');
  try{const body=fs.readFileSync(f);fs.unlinkSync(f);res({ct:ct||'text/html',body,code});}catch{res(null);}});});}
const b=await chromium.launch({executablePath:fs.existsSync(CHROME)?CHROME:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
 userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async route=>{const u=route.request().url();if(!/^https?:/.test(u))return route.continue();
 const r=await curlGet(u);if(!r)return route.abort();
 try{await route.fulfill({status:parseInt(r.code)||200,contentType:r.ct,body:r.body});}catch{try{route.abort()}catch{}}});
const p=await ctx.newPage();
try{await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});}catch(e){console.log('NAV',e.message);}
await p.waitForTimeout(8000);
const before = await p.evaluate(()=>({sx:window.scrollX, sw:document.documentElement.scrollWidth, cw:document.documentElement.clientWidth}));
await p.evaluate(([x,y])=>window.scrollTo(x,y), [X,Y]);
await p.waitForTimeout(1500);
const after = await p.evaluate(()=>({sx:window.scrollX, sy:window.scrollY}));
console.log('BEFORE',JSON.stringify(before),'AFTER',JSON.stringify(after));
await p.screenshot({path:OUT});
console.log('SHOT',OUT);
await b.close();
