/* site_shot.mjs — autonomer Screenshot der Live-Storefront (User-Dauerauftrag 2026-07-23
 * «mach immer selbst studium mit screenshot autonom»).
 *
 * TRICK: Diese Cloud-Umgebung blockt luxestyle.ch im Browser direkt (ERR_CONNECTION_RESET),
 * ABER curl kommt über den Agent-Proxy durch. Lösung: Playwright fängt JEDE Browser-Anfrage ab
 * und lässt sie curl (über $HTTPS_PROXY) holen → Seite rendert normal.
 *
 * Nutzung: /opt/node22/bin/node automation/site_shot.mjs <url> <out.png> [viewportHöhe]
 * Default: https://luxestyle.ch → /tmp/home_shot.png
 */
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL = process.argv[2] || 'https://luxestyle.ch';
const OUT = process.argv[3] || '/tmp/home_shot.png';
const H = parseInt(process.argv[4] || '3600', 10);
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0;
function curlGet(url){
  return new Promise(res=>{
    const f='/tmp/_sb'+(seq++);
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
  ? { viewport:{width:390,height:H}, deviceScaleFactor:2, isMobile:true, hasTouch:true, userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }
  : { viewport:{width:1440,height:H} });
await ctx.route('**/*', async route=>{
  const u=route.request().url();
  if(!/^https?:/.test(u)) return route.continue();
  const r=await curlGet(u);
  if(!r) return route.abort();
  try{ await route.fulfill({ status:200, contentType:r.ct, body:r.body }); }catch{ try{route.abort()}catch{} }
});
const p = await ctx.newPage();
const bust = URL + (URL.includes('?')?'&':'?') + 'nocache=' + process.argv[5] || Math.floor(Date.now()/1000);
try{ await p.goto(bust, {waitUntil:'domcontentloaded', timeout:90000}); }catch(e){ console.log('nav:',e.message); }
await p.waitForTimeout(7000);
// Popups/Cookie-Banner NUR ausblenden (kein Klick → keine ungewollte Navigation)
try{ await p.keyboard.press('Escape'); }catch{}
try{ await p.addStyleTag({ content:`dialog,[role="dialog"],.modal,.popup,.newsletter-popup,[class*="popup" i],[class*="cookie" i],[class*="overlay" i],[id*="popup" i]{display:none!important;visibility:hidden!important} body{overflow:auto!important}` }); }catch{}
await p.waitForTimeout(1000);
const r=await p.evaluate(()=>({anchor: !!document.getElementById('lspod-start'), designer: !!document.querySelector('.lspod-designer'), cta: (document.querySelector('.lspod-designer')||{}).innerText? [...document.querySelectorAll('.lspod-designer button')].map(b=>b.innerText.trim()).filter(Boolean):[], nativeATC: document.querySelectorAll('form[action*="/cart/add"] button[name=add]').length, payBtn: document.querySelectorAll('.shopify-payment-button').length, formVariant: (document.querySelector('form[action*="/cart/add"] [name=id]')||{}).value })); console.log('PRUEF '+JSON.stringify(r)); const r2=await p.evaluate(async()=>{
  const sel=document.querySelector('variant-picker select, .variant-option select, select[name*="option" i]');
  if(!sel) return {kein_select:true};
  const vor=sel.value; const opts=[...sel.options].map(o=>o.value);
  const neu=opts.find(v=>v!==vor); sel.value=neu; sel.dispatchEvent(new Event('change',{bubbles:true}));
  await new Promise(r=>setTimeout(r,4000));
  const f=document.querySelector('form[action*="/cart/add"] [name=id]');
  return {gewaehlt:neu, formVariant:f&&f.value, url:location.search, atc:document.querySelectorAll('form[action*="/cart/add"] button[name=add]').length};
});
console.log('PRUEF2 '+JSON.stringify(r2));
await p.screenshot({ path:OUT });
console.log('OK', await p.title(), '→', OUT);
await b.close();
