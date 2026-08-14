import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0;
function curlGet(url){
  return new Promise(res=>{
    const f='/tmp/_mq'+(seq++);
    execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],
      {maxBuffer:1e8},(e,out)=>{
        if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
        try{ const body=fs.readFileSync(f); fs.unlinkSync(f); res({ct:(out||'').trim()||'text/html',body}); }catch{ res(null); }
      });
  });
}
const MOB = process.env.DESKTOP!=='1';
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext(MOB
  ? { viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true,
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }
  : { viewport:{width:1440,height:900} });
await ctx.route('**/*', async route=>{
  const u=route.request().url();
  if(!/^https?:/.test(u)) return route.continue();
  const r=await curlGet(u);
  if(!r) return route.abort();
  try{ await route.fulfill({ status:200, contentType:r.ct, body:r.body }); }catch{ try{route.abort()}catch{} }
});
const p = await ctx.newPage();
const URL = process.argv[2];
await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForTimeout(7000);
// Overlays wie ein echter Nutzer wegtippen
try{ await p.click('#lx-pop-x',{timeout:3000}); }catch(e){ console.log('kein pop-x:', e.message.slice(0,60)); }
try{ await p.click('#lx-cookie-banner button:last-of-type',{timeout:3000}); }catch(e){ console.log('kein cookie-btn:', e.message.slice(0,60)); }
await p.waitForTimeout(1500);
const r = await p.evaluate(()=>{
  const o={vw:innerWidth,vh:innerHeight,scrollH:document.documentElement.scrollHeight};
  const vis=(el)=>{const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';};
  o.fixed=[...document.querySelectorAll('*')].filter(el=>{const s=getComputedStyle(el);return (s.position==='fixed'||s.position==='sticky')&&vis(el);})
    .map(el=>{const rc=el.getBoundingClientRect();const s=getComputedStyle(el);
      return {tag:el.tagName.toLowerCase(),id:el.id,cls:(el.className||'').toString().slice(0,50),z:s.zIndex,pos:s.position,
              rect:[Math.round(rc.left),Math.round(rc.top),Math.round(rc.width),Math.round(rc.height)],txt:(el.textContent||'').trim().slice(0,50)};})
    .filter(x=>x.rect[2]>20&&x.rect[3]>10);
  // erster sichtbarer Inhalt: y-Position des ersten Produkt-/Hero-Elements
  const main=document.querySelector('main');
  if(main){const rc=main.getBoundingClientRect();o.mainTop=Math.round(rc.top);}
  return o;
});
console.log(JSON.stringify(r,null,1));
await p.screenshot({path:process.argv[3]||'/tmp/mob2_top.png'});
// nach unten scrollen und nochmal
await p.evaluate(()=>window.scrollTo(0,2000));
await p.waitForTimeout(2500);
const r2 = await p.evaluate(()=>{
  const vis=(el)=>{const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0';};
  return [...document.querySelectorAll('*')].filter(el=>{const s=getComputedStyle(el);return (s.position==='fixed'||s.position==='sticky')&&vis(el);})
    .map(el=>{const rc=el.getBoundingClientRect();const s=getComputedStyle(el);
      return {tag:el.tagName.toLowerCase(),id:el.id,cls:(el.className||'').toString().slice(0,50),z:s.zIndex,
              rect:[Math.round(rc.left),Math.round(rc.top),Math.round(rc.width),Math.round(rc.height)],txt:(el.textContent||'').trim().slice(0,60)};})
    .filter(x=>x.rect[2]>20&&x.rect[3]>10 && x.rect[1]<innerHeight && x.rect[1]+x.rect[3]>0);
});
console.log('--- nach scroll 2000:');
console.log(JSON.stringify(r2,null,1));
await p.screenshot({path:(process.argv[3]||'/tmp/mob2_top.png').replace('.png','_scroll.png')});
await b.close();
