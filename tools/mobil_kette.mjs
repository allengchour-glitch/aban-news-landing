import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
const url = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport:{width:390,height:844}, userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
await ctx.route('**/*', async r => { try { const o=execFileSync('curl',['-s','-L','--max-time','40','-A','Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',r.request().url()],{maxBuffer:80*1024*1024}); await r.fulfill({status:200,body:o}); } catch { await r.abort(); } });
const p = await ctx.newPage();
await p.goto(url,{waitUntil:'networkidle',timeout:90000}).catch(()=>{});
const out = await p.evaluate(() => {
  const w = innerWidth;
  const id = e => `${e.tagName.toLowerCase()}${e.id?'#'+e.id:''}${e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):''}`;
  // tiefstes Element, das breiter ist als das Fenster, und seine ganze Kette nach oben
  const alle=[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().width>w+2);
  const tiefste=alle.filter(e=>![...e.children].some(c=>c.getBoundingClientRect().width>w+2));
  const kette=[];
  if (tiefste.length){ let e=tiefste[0];
    while(e && e!==document.documentElement){ const r=e.getBoundingClientRect();
      kette.push({el:id(e), w:Math.round(r.width), links:Math.round(r.left), ov:getComputedStyle(e).overflowX, mw:getComputedStyle(e).maxWidth, disp:getComputedStyle(e).display}); e=e.parentElement; } }
  return { scrollWidth:document.documentElement.scrollWidth, innerWidth:w, anzahlZuBreit:alle.length,
           tiefste:tiefste.slice(0,4).map(id), kette:kette.slice(0,10) };
});
console.log(JSON.stringify(out,null,1));
await b.close();
