import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL = process.argv[2]; const LIMIT = parseInt(process.argv[3]||'390',10);
const PROXY = process.env.HTTPS_PROXY || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(url){return new Promise(res=>{const f='/tmp/_lb'+(seq++);
 execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}|%{http_code}',url,'--compressed'],{maxBuffer:1e8},(e,out)=>{
  if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
  const[ct,code]=(out||'').trim().split('|');
  try{const body=fs.readFileSync(f);fs.unlinkSync(f);res({ct:ct||'text/html',body,code});}catch{res(null);}});});}
const b=await chromium.launch({executablePath:fs.existsSync(CHROME)?CHROME:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:false,hasTouch:true,
 userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async route=>{const u=route.request().url();if(!/^https?:/.test(u))return route.continue();
 const r=await curlGet(u);if(!r)return route.abort();
 try{await route.fulfill({status:parseInt(r.code)||200,contentType:r.ct,body:r.body});}catch{try{route.abort()}catch{}}});
const p=await ctx.newPage();
try{await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});}catch(e){console.log('NAV',e.message);}
await p.waitForTimeout(8000);
const r=await p.evaluate((W)=>{
 const path=el=>{let s=el.tagName.toLowerCase();if(el.id)s+='#'+el.id;if(el.className&&typeof el.className==='string')s+='.'+el.className.trim().split(/\s+/).slice(0,3).join('.');return s;};
 const res=[];
 for(const el of document.querySelectorAll('body *')){
  const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden')continue;
  const rc=el.getBoundingClientRect(); if(rc.width<=W+2)continue; if(rc.left<-1000)continue;
  // nur "Blätter": kein Kind ist ebenfalls zu breit
  let childWide=false;
  for(const c of el.children){const cr=c.getBoundingClientRect();if(cr.width>W+2&&cr.left>-1000){childWide=true;break;}}
  if(childWide)continue;
  res.push({sel:path(el),tag:el.tagName,w:Math.round(rc.width),left:Math.round(rc.left),h:Math.round(rc.height),
   cssW:cs.width,ws:cs.whiteSpace,disp:cs.display,pos:cs.position,
   nChild:el.children.length, txt:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,80),
   outer: el.outerHTML.slice(0,220)});
 }
 return {docW:document.documentElement.scrollWidth, bodyW:document.body.getBoundingClientRect().width, leaves:res};
},LIMIT);
console.log('docW',r.docW,'bodyW',r.bodyW,'leafCount',r.leaves.length);
console.log(JSON.stringify(r.leaves.slice(0,12),null,1));
await b.close();
