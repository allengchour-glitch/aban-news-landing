/* page_scan.mjs — scrollt die Live-Seite mit NORMALER Fensterhöhe durch und schiesst
 * mehrere Screenshots. Nötig, weil site_shot.mjs die Viewport-Höhe direkt setzt: bei
 * 4200px dehnen die vh-basierten Section-Höhen den Hero ins Absurde.
 * Nutzung: node /tmp/page_scan.mjs <url> <prefix> <anzahl>
 */
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL = process.argv[2] || 'https://luxestyle.ch';
const PRE = process.argv[3] || '/tmp/scan';
const N   = parseInt(process.argv[4] || '6', 10);
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0;
function curlGet(url){
  return new Promise(res=>{
    const f='/tmp/_ps'+(seq++);
    execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],
      {maxBuffer:1e8},(e,out)=>{
        if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
        try{ const body=fs.readFileSync(f); fs.unlinkSync(f); res({ct:(out||'').trim()||'text/html',body}); }catch{ res(null); }
      });
  });
}
const MOBILE = process.env.MOBILE === '1';
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext(MOBILE
  ? { viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true, userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }
  : { viewport:{width:1440,height:900} });
await ctx.route('**/*', async route=>{
  const u=route.request().url();
  if(!/^https?:/.test(u)) return route.continue();
  const r=await curlGet(u);
  if(!r) return route.abort();
  try{ await route.fulfill({ status:200, contentType:r.ct, body:r.body }); }catch{ try{route.abort()}catch{} }
});
const p = await ctx.newPage();
try{ await p.goto(URL, {waitUntil:'domcontentloaded', timeout:90000}); }catch(e){ console.log('nav:',e.message); }
await p.waitForTimeout(7000);
try{ await p.keyboard.press('Escape'); }catch{}
try{ await p.addStyleTag({ content:`dialog,[role="dialog"],.modal,.popup,.newsletter-popup,[class*="popup" i],[class*="cookie" i],[id*="popup" i]{display:none!important} body{overflow:auto!important}` }); }catch{}
const vh = MOBILE ? 844 : 900;
const total = await p.evaluate(()=>document.body.scrollHeight);
console.log('Seitenhöhe', total, '| Fenster', vh);
// Sektionsnamen mitloggen — sagt mehr als das Bild allein
const secs = await p.evaluate(()=>[...document.querySelectorAll('.shopify-section')].map(s=>{
  const r=s.getBoundingClientRect();
  const h=s.querySelector('h1,h2,h3');
  return {id:s.id.replace('shopify-section-',''), y:Math.round(r.top+window.scrollY), h:Math.round(r.height), titel:(h?h.textContent:'').trim().slice(0,60)};
}));
fs.writeFileSync(PRE+'_sections.json', JSON.stringify(secs,null,1));
for(const s of secs) console.log(`  y${String(s.y).padStart(5)} h${String(s.h).padStart(4)}  ${s.id.padEnd(22)} ${s.titel}`);
for(let i=0;i<N;i++){
  const y=i*vh;
  if(y>total) break;
  await p.evaluate(v=>window.scrollTo(0,v), y);
  await p.waitForTimeout(1800);
  await p.screenshot({ path:`${PRE}${i}.png` });
}
console.log('OK', await p.title());
await b.close();
