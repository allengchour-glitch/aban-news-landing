import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URLS=process.argv.slice(2);
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_wm'+(seq++);
 execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}|%{http_code}',u,'--compressed'],{maxBuffer:1e8},(e,out)=>{
 if(e){try{fs.unlinkSync(f)}catch{};return res(null);} const[ct,code]=(out||'').trim().split('|');
 try{const body=fs.readFileSync(f);fs.unlinkSync(f);res({ct:ct||'text/html',body,code});}catch{res(null);}});});}
const b=await chromium.launch({executablePath:fs.existsSync(CHROME)?CHROME:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:false,hasTouch:true,
 userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async r2=>{const u=r2.request().url();if(!/^https?:/.test(u))return r2.continue();
 const r=await curlGet(u);if(!r)return r2.abort();
 try{await r2.fulfill({status:parseInt(r.code)||200,contentType:r.ct,body:r.body});}catch{try{r2.abort()}catch{}}});
for(const URL of URLS){
 const p=await ctx.newPage();
 try{await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});}catch(e){console.log('NAV',e.message);}
 await p.waitForTimeout(6000);
 const r=await p.evaluate(()=>{
  const res=[];
  const probe=document.createElement('span');
  document.body.appendChild(probe);
  for(const el of document.querySelectorAll('.shopify-policy__body h1,.shopify-policy__body h2,.shopify-policy__body h3,.shopify-policy__body p,.shopify-policy__title h1, main h1, main h2')){
   const cs=getComputedStyle(el);
   probe.style.cssText='position:absolute;left:-9999px;white-space:nowrap;font:'+cs.font+';letter-spacing:'+cs.letterSpacing+';text-transform:'+cs.textTransform;
   const words=(el.textContent||'').trim().split(/\s+/);
   let worst=null;
   for(const w of words){probe.textContent=w;const ww=probe.getBoundingClientRect().width;if(!worst||ww>worst.w)worst={w:Math.round(ww),word:w};}
   if(worst&&worst.w>380)res.push({tag:el.tagName,fs:cs.fontSize,ow:cs.overflowWrap,wb:cs.wordBreak,hy:cs.hyphens,...worst});
  }
  probe.remove();
  return {docW:document.documentElement.scrollWidth, title:document.title, res};});
 console.log(URL, JSON.stringify(r,null,1));
 await p.close(); await new Promise(s=>setTimeout(s,1800));
}
await b.close();
