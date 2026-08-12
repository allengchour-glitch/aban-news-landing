/* shot2.mjs — wie site_shot.mjs, aber: echte Handy-Höhe (844), KEIN Popup-Ausblenden,
 * optional Scroll-Position und optionaler Klick auf einen Selektor.
 * Nutzung: node shot2.mjs <url> <out.png> [scrollY] [clickSelector] [waitAfterClickMs]
 */
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL = process.argv[2];
const OUT = process.argv[3];
const SCROLL = parseInt(process.argv[4] || '0', 10);
const CLICK = process.argv[5] || '';
const WAIT = parseInt(process.argv[6] || '1500', 10);
const H = parseInt(process.env.VH || '844', 10);
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0;
function curlGet(url){
  return new Promise(res=>{
    const f='/tmp/_sc'+(seq++);
    execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],
      {maxBuffer:1e8},(e,out)=>{
        if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
        try{ const body=fs.readFileSync(f); fs.unlinkSync(f); res({ct:(out||'').trim()||'text/html',body}); }catch{ res(null); }
      });
  });
}
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext({ viewport:{width:390,height:H}, deviceScaleFactor:2, isMobile:true, hasTouch:true,
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
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
if (SCROLL) { await p.evaluate(y=>window.scrollTo(0,y), SCROLL); await p.waitForTimeout(1500); }
if (CLICK) {
  try { await p.click(CLICK, {timeout:8000}); console.log('clicked', CLICK); }
  catch(e){ console.log('click FAIL', CLICK, e.message.split('\n')[0]); }
  await p.waitForTimeout(WAIT);
}
await p.screenshot({ path:OUT });
console.log('OK', await p.title(), '→', OUT);
await b.close();
