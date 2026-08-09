import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URLS=process.argv.slice(2);
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_m2'+(seq++);
 execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}|%{http_code}',u,'--compressed'],{maxBuffer:1e8},(e,out)=>{
 if(e){try{fs.unlinkSync(f)}catch{};return res(null);} const[ct,code]=(out||'').trim().split('|');
 try{const body=fs.readFileSync(f);fs.unlinkSync(f);res({ct:ct||'text/html',body,code});}catch{res(null);}});});}
const b=await chromium.launch({executablePath:fs.existsSync(CHROME)?CHROME:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:false,hasTouch:true,
 userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async r2=>{const u=r2.request().url();if(!/^https?:/.test(u))return r2.continue();
 const r=await curlGet(u);if(!r)return r2.abort();
 try{await r2.fulfill({status:parseInt(r.code)||200,contentType:r.ct,body:r.body});}catch{try{r2.abort()}catch{}}});
for(const URL of URLS){
 const p=await ctx.newPage(); let code='?';
 try{const resp=await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000}); code=resp?resp.status():'?';}catch(e){code='ERR';}
 await p.waitForTimeout(6500);
 const r=await p.evaluate(()=>{
  const W=document.documentElement.clientWidth;
  const chip=[...document.querySelectorAll('div')].find(d=>/width:\s*max-content/.test(d.getAttribute('style')||''));
  let chipInfo=null;
  if(chip){const rc=chip.getBoundingClientRect();const par=chip.parentElement;const pr=par.getBoundingClientRect();
   chipInfo={rowW:Math.round(rc.width),wrapW:Math.round(pr.width),wrapOvx:getComputedStyle(par).overflowX,n:chip.children.length};}
  return {W, docW:document.documentElement.scrollWidth, over:document.documentElement.scrollWidth-W, chip:chipInfo, title:document.title.slice(0,45)};});
 console.log(URL.replace('https://luxestyle.ch',''),'HTTP',code,'docW',r.docW,'over',r.over,'chip',JSON.stringify(r.chip));
 await p.close(); await new Promise(s=>setTimeout(s,1700));
}
await b.close();
