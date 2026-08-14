import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0;
function curlGet(url){
  return new Promise(res=>{
    const f='/tmp/_ms'+(seq++);
    execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],
      {maxBuffer:1e8},(e,out)=>{
        if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
        try{ const body=fs.readFileSync(f); fs.unlinkSync(f); res({ct:(out||'').trim()||'text/html',body}); }catch{ res(null); }
      });
  });
}
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true,
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
await ctx.route('**/*', async route=>{
  const u=route.request().url();
  if(!/^https?:/.test(u)) return route.continue();
  const r=await curlGet(u);
  if(!r) return route.abort();
  try{ await route.fulfill({ status:200, contentType:r.ct, body:r.body }); }catch{ try{route.abort()}catch{} }
});
const p = await ctx.newPage();
await p.goto(process.argv[2],{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForTimeout(7000);
try{ await p.click('#lx-pop-x',{timeout:3000}); }catch{}
try{ await p.click('#lx-cookie-banner button:last-of-type',{timeout:3000}); }catch{}
await p.waitForTimeout(1000);
// Menü-Schublade öffnen
const opened = await p.evaluate(()=>{
  const btn = document.querySelector('[aria-label*="Men" i], .header__menu, button[command*="menu" i], .menu-drawer-toggle, header button');
  if(!btn) return 'kein knopf';
  btn.click(); return btn.outerHTML.slice(0,200);
});
console.log('menu-toggle:', opened);
await p.waitForTimeout(2000);
const r = await p.evaluate(()=>{
  const o={};
  const dlgs=[...document.querySelectorAll('dialog')].filter(d=>d.open).map(d=>{
    const rc=d.getBoundingClientRect(); const s=getComputedStyle(d);
    return {cls:(d.className||'').toString().slice(0,60),z:s.zIndex,rect:[Math.round(rc.left),Math.round(rc.top),Math.round(rc.width),Math.round(rc.height)],links:d.querySelectorAll('a').length};
  });
  o.openDialogs=dlgs;
  const sb=document.getElementById('luxsb-wrap');
  if(sb){const s=getComputedStyle(sb);const rc=sb.getBoundingClientRect();
    o.searchbar={display:s.display,z:s.zIndex,rect:[Math.round(rc.left),Math.round(rc.top),Math.round(rc.width),Math.round(rc.height)]};}
  // was liegt oben im Drawer-Bereich?
  o.hits=[[195,140],[195,200],[195,400]].map(([x,y])=>{const e=document.elementFromPoint(x,y);
    return {x,y,tag:e?e.tagName.toLowerCase():null,id:e?e.id:null,cls:e?(e.className||'').toString().slice(0,40):'',txt:e?(e.textContent||'').trim().slice(0,40):''};});
  return o;
});
console.log(JSON.stringify(r,null,1));
await p.screenshot({path:process.argv[3]||'/tmp/mob4.png'});
await b.close();
