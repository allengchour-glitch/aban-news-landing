/* Mobile-Drawer-Test: öffnet Burger-Menü bzw. fügt in den Warenkorb und screenshottet. */
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL = process.argv[2] || 'https://luxestyle.ch';
const OUT = process.argv[3] || '/tmp/m_drawer.png';
const MODE = process.argv[4] || 'menu'; // menu | cart | searchbar
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0;
function curlGet(url, method='GET', postData=null, headers={}){
  return new Promise(res=>{
    const f='/tmp/_db'+(seq++);
    const args=['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed','-X',method];
    for(const [k,v] of Object.entries(headers)) if(!/^(host|content-length)$/i.test(k)) args.push('-H',`${k}: ${v}`);
    if(postData!=null){ const pf=f+'.post'; fs.writeFileSync(pf, postData); args.push('--data-binary','@'+pf); }
    execFile('curl',args,{maxBuffer:1e8},(e,out)=>{
      if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
      try{ const body=fs.readFileSync(f); fs.unlinkSync(f); res({ct:(out||'').trim()||'text/html',body}); }catch{ res(null); }
    });
  });
}
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true,
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
await ctx.route('**/*', async route=>{
  const req=route.request(); const u=req.url();
  if(!/^https?:/.test(u)) return route.continue();
  const r=await curlGet(u, req.method(), req.postDataBuffer(), req.headers());
  if(!r) return route.abort();
  try{ await route.fulfill({ status:200, contentType:r.ct, body:r.body }); }catch{ try{route.abort()}catch{} }
});
const p = await ctx.newPage();
try{ await p.goto(URL, {waitUntil:'domcontentloaded', timeout:90000}); }catch(e){ console.log('nav:',e.message); }
await p.waitForTimeout(6000);
try{ await p.addStyleTag({ content:`[class*="cookie" i],[id*="shopify-pc" i]{display:none!important}` }); }catch{}
// Newsletter-Popup gezielt schliessen (nicht CSS-hiden — sonst verschwindet auch der Cart-Drawer)
try{ await p.locator('[aria-label*="chlie" i], [aria-label*="lose" i], .close-button').first().click({timeout:3500}); }catch{}
try{ await p.mouse.click(349,250); }catch{} // Fallback: ×-Position des Forms-Popups
try{ await p.keyboard.press('Escape'); }catch{}
await p.waitForTimeout(1000);
if(MODE==='menu'){
  const burger = p.locator('header button[aria-label*="enü" i], header .header-drawer, header summary, header button:has(svg)').first();
  try{ await burger.click({timeout:8000}); }catch(e){ console.log('click:',e.message); }
  await p.waitForTimeout(2500);
} else if(MODE==='cart'){
  const atc = p.locator('button[name="add"], .product-form__submit, button:has-text("Warenkorb")').first();
  try{ await atc.click({timeout:8000}); }catch(e){ console.log('atc:',e.message); }
  await p.waitForTimeout(4000);
} else if(MODE==='searchbar'){
  await p.evaluate(()=>window.scrollTo(0,600));
  await p.waitForTimeout(1500);
}
await p.screenshot({ path:OUT });
console.log('OK →', OUT);
await b.close();
