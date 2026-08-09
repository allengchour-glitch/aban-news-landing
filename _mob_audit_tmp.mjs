/* mob_audit.mjs — Handy-Tiefenprüfung 390px. Misst statt zu raten.
 * Nutzung: node mob_audit.mjs <url> <out.png> [openMenu=0|1]
 * Popups werden NICHT ausgeblendet (sie sind Teil der Prüfung).
 */
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL = process.argv[2];
const OUT = process.argv[3] || '/tmp/m.png';
const OPENMENU = process.argv[4] === '1';
const FULL = process.env.FULLPAGE === '1';
const PROXY = process.env.HTTPS_PROXY || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0;
const status = {};
function curlGet(url){
  return new Promise(res=>{
    const f='/tmp/_mb'+(seq++);
    execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}|%{http_code}|%{url_effective}',url,'--compressed'],
      {maxBuffer:1e8},(e,out)=>{
        if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
        const [ct,code,eff]=(out||'').trim().split('|');
        try{ const body=fs.readFileSync(f); fs.unlinkSync(f); res({ct:ct||'text/html',body,code,eff}); }catch{ res(null); }
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
  if(u===URL){ status.main = {code:r.code, eff:r.eff}; }
  try{ await route.fulfill({ status: parseInt(r.code)||200, contentType:r.ct, body:r.body }); }catch{ try{route.abort()}catch{} }
});
const p = await ctx.newPage();
try{ await p.goto(URL, {waitUntil:'domcontentloaded', timeout:90000}); }catch(e){ console.log('NAV-ERR:',e.message); }
await p.waitForTimeout(8000);

if (OPENMENU){
  // Menü-Button suchen und klicken
  const sels = ['button[aria-label*="enu" i]','.header__menu-toggle','[data-menu-toggle]','summary[aria-label*="enu" i]','button.menu-drawer__toggle','header button:has(svg)'];
  let done=false;
  for (const s of sels){
    try{ const el = await p.$(s); if(el && await el.isVisible()){ await el.click({timeout:5000}); done=true; break; } }catch{}
  }
  console.log('MENU-CLICK:', done);
  await p.waitForTimeout(2500);
}

const report = await p.evaluate(()=>{
  const vw = window.innerWidth, vh = window.innerHeight;
  const de = document.documentElement;
  const out = { vw, vh, title: document.title,
    scrollW: Math.max(de.scrollWidth, document.body.scrollWidth),
    clientW: de.clientWidth, scrollH: de.scrollHeight, overflowers: [], smallTaps: [], fixed: [], dialogs: [], clipped: [] };
  const vis = el => { const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)===0) return false; const r=el.getBoundingClientRect(); return r.width>0&&r.height>0; };
  const path = el => { let s=el.tagName.toLowerCase(); if(el.id)s+='#'+el.id; if(el.className&&typeof el.className==='string')s+='.'+el.className.trim().split(/\s+/).slice(0,3).join('.'); return s; };
  // Overflow-Verursacher
  for (const el of document.querySelectorAll('body *')){
    if(!vis(el)) continue;
    const r = el.getBoundingClientRect();
    const abs = r.right + window.scrollX;
    if (abs > vw + 2 || r.left + window.scrollX < -2){
      const cs = getComputedStyle(el);
      if (cs.position==='fixed') continue;
      out.overflowers.push({ sel: path(el), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), txt: (el.textContent||'').trim().slice(0,50) });
    }
  }
  // Tippflächen
  const tapSel = 'a[href], button, input[type=submit], input[type=button], [role="button"], summary, select, .swatch, label[for]';
  const seen = new Set();
  for (const el of document.querySelectorAll(tapSel)){
    if(!vis(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > document.documentElement.scrollHeight) continue;
    if (r.width >= 44 && r.height >= 44) continue;
    // Eltern-Tippfläche zählt: wenn ein Vorfahr-Link/Button >=44 ist, ignorieren
    let par = el.parentElement, big=false;
    while(par && par!==document.body){ if(par.matches&&par.matches('a[href],button')){ const pr=par.getBoundingClientRect(); if(pr.width>=44&&pr.height>=44){big=true;break;} } par=par.parentElement; }
    if(big) continue;
    const key = path(el)+'|'+Math.round(r.width)+'x'+Math.round(r.height)+'|'+(el.textContent||'').trim().slice(0,20);
    if(seen.has(key)) continue; seen.add(key);
    out.smallTaps.push({ sel: path(el), w: Math.round(r.width), h: Math.round(r.height), txt:(el.getAttribute('aria-label')||el.textContent||'').trim().slice(0,40), href: el.getAttribute('href')||'' });
  }
  // Fixed/sticky Leisten
  for (const el of document.querySelectorAll('body *')){
    if(!vis(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.position!=='fixed' && cs.position!=='sticky') continue;
    const r = el.getBoundingClientRect();
    if (r.height < 8) continue;
    out.fixed.push({ sel: path(el), pos: cs.position, z: cs.zIndex, top: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width), txt:(el.textContent||'').trim().slice(0,60).replace(/\s+/g,' ') });
  }
  // offene Dialoge / Popups
  for (const el of document.querySelectorAll('dialog, [role="dialog"], [class*="popup" i], [class*="modal" i]')){
    if(!vis(el)) continue;
    const r = el.getBoundingClientRect();
    out.dialogs.push({ sel: path(el), open: el.hasAttribute('open'), w:Math.round(r.width), h:Math.round(r.height), txt:(el.textContent||'').trim().slice(0,80).replace(/\s+/g,' ') });
  }
  // abgeschnittene Texte (overflow hidden + scrollWidth > clientWidth)
  for (const el of document.querySelectorAll('h1,h2,h3,a,span,p,div,button,li')){
    if(!vis(el)) continue;
    const cs = getComputedStyle(el);
    if (/visually-hidden|sr-only|screen-reader/i.test(el.className||'')) continue;
    if (cs.overflow==='hidden'||cs.overflowX==='hidden'||cs.textOverflow==='ellipsis'){
      if (el.scrollWidth > el.clientWidth + 3 && el.clientWidth>20 && el.children.length<3){
        out.clipped.push({ sel: path(el), clientW: el.clientWidth, scrollW: el.scrollWidth, txt:(el.textContent||'').trim().slice(0,60) });
      }
    }
  }
  return out;
});
report.http = status.main || null;
fs.writeFileSync(OUT.replace(/\.png$/,'')+'.json', JSON.stringify(report,null,1));
const brief = { url:URL, http:report.http, title:report.title, scrollW:report.scrollW, clientW:report.clientW, vw:report.vw,
  overflowers: report.overflowers.slice(0,15), nOverflow: report.overflowers.length,
  smallTaps: report.smallTaps.slice(0,20), nSmallTaps: report.smallTaps.length,
  fixed: report.fixed, dialogs: report.dialogs,
  clipped: report.clipped.slice(0,10), nClipped: report.clipped.length };
console.log(JSON.stringify(brief, null, 1));
await p.screenshot({ path: OUT, fullPage: FULL });
console.log('SHOT', OUT);
await b.close();
