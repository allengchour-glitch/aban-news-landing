import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL = process.argv[2];
const PROXY = process.env.HTTPS_PROXY || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(url){return new Promise(res=>{const f='/tmp/_pb'+(seq++);
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
const r = await p.evaluate(()=>{
 const W=390; const out={innerW:window.innerWidth, clientW:document.documentElement.clientWidth,
  vvW: window.visualViewport?Math.round(window.visualViewport.width):null,
  htmlSW:document.documentElement.scrollWidth, bodySW:document.body.scrollWidth,
  bodyCS:{minW:getComputedStyle(document.body).minWidth, ovx:getComputedStyle(document.body).overflowX, w:getComputedStyle(document.body).width},
  htmlCS:{minW:getComputedStyle(document.documentElement).minWidth, ovx:getComputedStyle(document.documentElement).overflowX},
  wide:[]};
 const path=el=>{let s=el.tagName.toLowerCase();if(el.id)s+='#'+el.id;if(el.className&&typeof el.className==='string')s+='.'+el.className.trim().split(/\s+/).slice(0,3).join('.');return s;};
 for(const el of document.querySelectorAll('body *')){
  const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden')continue;
  const rc=el.getBoundingClientRect(); if(rc.width<=0||rc.height<=0)continue;
  if(rc.left< -1000) continue; // skip-links
  if(rc.right>W+2||rc.width>W+2){
    out.wide.push({sel:path(el),pos:cs.position,z:cs.zIndex,left:Math.round(rc.left),right:Math.round(rc.right),w:Math.round(rc.width),h:Math.round(rc.height),cssW:cs.width,minW:cs.minWidth,txt:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,45)});
  }
 }
 return out;});
console.log(JSON.stringify(r,null,1).slice(0,9000));
await b.close();
