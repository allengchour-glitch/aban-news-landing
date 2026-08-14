import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL = process.argv[2];
const SHOT = process.argv[3] || '';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(r=>{const f='/tmp/_fs'+(seq++);execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',u,'--compressed'],{maxBuffer:1e8},(e,o)=>{if(e){try{fs.unlinkSync(f)}catch{};return r(null)}try{const b=fs.readFileSync(f);fs.unlinkSync(f);r({ct:(o||'').trim()||'text/html',body:b})}catch{r(null)}})});}
const b=await chromium.launch({executablePath:fs.existsSync(CHROME)?CHROME:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async route=>{const u=route.request().url();if(!/^https?:/.test(u))return route.continue();const r=await curlGet(u);if(!r)return route.abort();try{await route.fulfill({status:200,contentType:r.ct,body:r.body})}catch{try{route.abort()}catch{}}});
await ctx.addInitScript(()=>{try{localStorage.setItem('lx_popup_v1','dismissed')}catch(e){}});
const p=await ctx.newPage();
try{await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000})}catch(e){console.log('nav:',e.message)}
await p.waitForTimeout(6000);
const r=await p.evaluate(()=>{
  const rect=e=>e?(({x,y,width,height})=>({x:Math.round(x),y:Math.round(y),w:Math.round(width),h:Math.round(height)}))(e.getBoundingClientRect()):null;
  const sb=document.querySelector('#luxsb-wrap');
  return {url:location.pathname, body:document.body.className,
    marker:document.documentElement.innerHTML.indexOf('lux-fix-20260814-suchleiste')>-1,
    suchleiste:sb?{display:getComputedStyle(sb).display,rect:rect(sb)}:'nicht im DOM',
    main:rect(document.querySelector('main#MainContent')),
    header:rect(document.querySelector('#header-group'))};
});
console.log(JSON.stringify(r));
if(SHOT){await p.screenshot({path:SHOT});}
await b.close();
