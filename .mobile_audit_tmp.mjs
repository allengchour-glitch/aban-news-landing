// Handy-Audit der Live-Storefront: misst echte Layout-Fehler bei 390x844 (iPhone).
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0;
function curlGet(url){
  return new Promise(res=>{
    const f='/tmp/_ma'+(seq++);
    execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],
      {maxBuffer:1e8},(e,out)=>{
        if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
        try{ const body=fs.readFileSync(f); fs.unlinkSync(f); res({ct:(out||'').trim()||'text/html',body}); }catch{ res(null); }
      });
  });
}
const MOBILE = process.env.DESKTOP !== '1';
const urls = process.argv.slice(2);
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext(MOBILE
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
for (const URL of urls){
  console.log('\n########', URL);
  try{ await p.goto(URL, {waitUntil:'domcontentloaded', timeout:90000}); }catch(e){ console.log('nav:',e.message); continue; }
  await p.waitForTimeout(6000);
  const out = await p.evaluate(()=>{
    const vw = window.innerWidth, vh = window.innerHeight;
    const res = { vw, vh, scrollW: document.documentElement.scrollWidth, bodyScrollW: document.body.scrollWidth, title: document.title };
    // 1) horizontale Überläufer
    const over = [];
    document.querySelectorAll('*').forEach(el=>{
      const r = el.getBoundingClientRect();
      if (r.width===0||r.height===0) return;
      const st = getComputedStyle(el);
      if (st.display==='none'||st.visibility==='hidden') return;
      if (r.right > vw + 2 || r.left < -2){
        over.push({ tag: el.tagName.toLowerCase(), cls: (el.className&&el.className.toString().slice(0,60))||'', id: el.id,
                    left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width),
                    pos: st.position, txt: (el.textContent||'').trim().slice(0,50) });
      }
    });
    // nur die "tiefsten" (ohne überlaufende Kinder in der Liste) grob filtern -> alle zurückgeben, max 40
    res.overflow = over.slice(0,40);
    res.overflowCount = over.length;
    // 2) fixed/sticky Elemente
    const fixed = [];
    document.querySelectorAll('*').forEach(el=>{
      const st = getComputedStyle(el);
      if (st.position!=='fixed' && st.position!=='sticky') return;
      const r = el.getBoundingClientRect();
      if (r.width<20||r.height<10) return;
      if (st.display==='none'||st.visibility==='hidden'||st.opacity==='0') return;
      fixed.push({ tag:el.tagName.toLowerCase(), id:el.id, cls:(el.className&&el.className.toString().slice(0,70))||'',
                   pos:st.position, z:st.zIndex, rect:[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)],
                   txt:(el.textContent||'').trim().slice(0,60) });
    });
    res.fixed = fixed;
    return res;
  });
  console.log(JSON.stringify(out, null, 1).slice(0, 9000));
}
await b.close();
