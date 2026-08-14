import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(url){return new Promise(res=>{const f='/tmp/_pb'+(seq++);
 execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],{maxBuffer:1e8},(e,out)=>{
  if(e){try{fs.unlinkSync(f)}catch{};return res(null);} try{const body=fs.readFileSync(f);fs.unlinkSync(f);res({ct:(out||'').trim()||'text/html',body});}catch{res(null);} });});}
const b=await chromium.launch({executablePath:fs.existsSync(CHROME)?CHROME:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,
 userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async route=>{const u=route.request().url(); if(!/^https?:/.test(u))return route.continue();
 const r=await curlGet(u); if(!r)return route.abort(); try{await route.fulfill({status:200,contentType:r.ct,body:r.body});}catch{try{route.abort()}catch{}}});
const p=await ctx.newPage();
for(const url of process.argv.slice(2)){
  try{ await p.goto(url,{waitUntil:'domcontentloaded',timeout:90000}); }catch(e){ console.log('nav',url,e.message); }
  await p.waitForTimeout(6000);
  const info=await p.evaluate(()=>{
    const out={url:location.pathname, bodyClass:document.body.className, htmlClass:document.documentElement.className};
    const el=document.getElementById('luxsb-wrap');
    if(el){const cs=getComputedStyle(el),r=el.getBoundingClientRect();
      out.luxsb={display:cs.display,position:cs.position,z:cs.zIndex,rect:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};}
    else out.luxsb=null;
    const main=document.querySelector('main');
    if(main){const r=main.getBoundingClientRect(); out.mainTop=Math.round(r.top);}
    // all fixed/sticky visible
    out.sticky=[...document.querySelectorAll('body *')].filter(e=>{const cs=getComputedStyle(e);return (cs.position==='fixed'||cs.position==='sticky')&&cs.display!=='none'&&e.getBoundingClientRect().height>10;})
      .slice(0,25).map(e=>{const r=e.getBoundingClientRect();return (e.id||e.className||e.tagName).toString().slice(0,50)+' '+getComputedStyle(e).position+' y='+Math.round(r.y)+' h='+Math.round(r.height)+' z='+getComputedStyle(e).zIndex;});
    const hdr=document.querySelector('header'); if(hdr){const r=hdr.getBoundingClientRect(); out.header=[Math.round(r.y),Math.round(r.height)];}
    return out;
  });
  console.log(JSON.stringify(info,null,1));
}
await b.close();
