/* Prüfstand für die jdgmBildsperre: lädt die Produktseite wie ein Browser, wartet auf das
 * Judge.me-Widget und meldet, WAS im DOM steht — Bewertungen, Bilder, gesperrte Adressen.
 * Schreibt nichts. Zweck: belegen, dass der Vorhang nur die zwölf Bilder nimmt und sonst nichts.
 */
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL = process.argv[2];
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0;
function curlGet(url){
  return new Promise(res=>{
    const f='/tmp/_pb'+(seq++);
    execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],
      {maxBuffer:1e8},(e,out)=>{
        if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
        try{ const body=fs.readFileSync(f); fs.unlinkSync(f); res({ct:(out||'').trim()||'text/html',body}); }catch{ res(null); }
      });
  });
}
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext({ viewport:{width:1440,height:2200} });
await ctx.route('**/*', async route=>{
  const u=route.request().url();
  if(!/^https?:/.test(u)) return route.continue();
  const r=await curlGet(u);
  if(!r) return route.abort();
  try{ await route.fulfill({ status:200, contentType:r.ct, body:r.body }); }catch{ try{route.abort()}catch{} }
});
const p = await ctx.newPage();
await p.goto(URL+(URL.includes('?')?'&':'?')+'nocache='+Date.now(), {waitUntil:'domcontentloaded', timeout:90000}).catch(e=>console.log('nav:',e.message));
// Widget in den Blick scrollen, damit Judge.me lädt
for (let i=0;i<12;i++){ await p.mouse.wheel(0,1600); await p.waitForTimeout(700); }
await p.waitForTimeout(6000);
const r = await p.evaluate(()=>{
  const q=s=>Array.from(document.querySelectorAll(s));
  const urls=q('a.jdgm-rev__pic-link,.jdgm-rev__pic-img,.jdgm-gallery__thumbnail-img,.jdgm-gallery__thumbnail')
    .map(e=>e.getAttribute('href')||e.getAttribute('data-mfp-src')||e.getAttribute('data-src')||e.getAttribute('src')||'')
    .filter(Boolean);
  return {
    widgetVorhanden: !!document.querySelector('.jdgm-widget,.jdgm-rev-widg'),
    bewertungenImDom: q('.jdgm-rev').length,
    sterne: (document.querySelector('.jdgm-widget__title,.jdgm-rev-widg__summary-average')||{}).textContent||'',
    anzahlText: (document.querySelector('.jdgm-rev-widg__summary-text')||{}).textContent||'',
    bildLinks: urls.length,
    bildDateien: urls.map(u=>u.split('/').pop()),
    sperreGeladen: typeof window!=='undefined' && document.documentElement.innerHTML.includes('jdgmBildsperre'),
    seitenSchalter: q('.jdgm-paginate__page').map(e=>e.textContent.trim()),
  };
});
console.log(JSON.stringify(r,null,1));
await b.close();
