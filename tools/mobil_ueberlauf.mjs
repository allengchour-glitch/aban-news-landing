// Misst auf 390 px, ob die Seite seitlich ueberlaeuft. Anfragen ueber curl (Proxy).
import { chromium } from 'playwright';
import { execFileSync } from 'child_process';
const url = process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const ctx = await b.newContext({ viewport:{width:390,height:844}, userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
await ctx.route('**/*', async route => {
  try {
    const out = execFileSync('curl', ['-s','-L','--max-time','40','-A','Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', route.request().url()], { maxBuffer: 80*1024*1024 });
    await route.fulfill({ status:200, body: out });
  } catch { await route.abort(); }
});
const p = await ctx.newPage();
await p.goto(url, { waitUntil:'networkidle', timeout:90000 }).catch(()=>{});
const m = await p.evaluate(() => {
  const d=document.documentElement;
  const weit=[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().width>innerWidth+2)
    .slice(0,8).map(e=>`${e.tagName.toLowerCase()}.${(e.className||'').toString().split(' ')[0]}=${Math.round(e.getBoundingClientRect().width)}`);
  return { scrollWidth:d.scrollWidth, clientWidth:d.clientWidth, weit };
});
console.log(JSON.stringify(m,null,1));
await b.close();
