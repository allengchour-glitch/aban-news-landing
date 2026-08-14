import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0;
function curlGet(url){
  return new Promise(res=>{
    const f='/tmp/_vc'+(seq++);
    execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],
      {maxBuffer:1e8},(e,out)=>{
        if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
        try{ const body=fs.readFileSync(f); fs.unlinkSync(f); res({ct:(out||'').trim()||'text/html',body}); }catch{ res(null); }
      });
  });
}
const URLS = process.argv.slice(2);
const MOBILE = process.env.MOBILE !== '0';
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
for (const U of URLS) {
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
  try{ await p.goto(U, {waitUntil:'domcontentloaded', timeout:90000}); }catch(e){ console.log('nav:',e.message); }
  await p.waitForTimeout(8000);
  await p.evaluate(()=>window.scrollTo(0,1600));
  await p.waitForTimeout(2500);
  const r = await p.evaluate(()=>{
    const out={url:location.pathname, vw:innerWidth, vh:innerHeight};
    const ban=document.getElementById('lx-cookie-banner');
    if(!ban){ out.banner='FEHLT'; }
    else {
      const cs=getComputedStyle(ban);
      out.bannerDisplay=cs.display; out.bannerBottom=cs.bottom; out.bannerZ=cs.zIndex;
      const bb=ban.getBoundingClientRect();
      out.bannerRect={x:Math.round(bb.x),y:Math.round(bb.y),w:Math.round(bb.width),h:Math.round(bb.height)};
      out.bannerVisible = cs.display!=='none' && bb.height>0;
    }
    const bar=document.querySelector('.sticky-add-to-cart__bar');
    if(!bar){ out.bar='FEHLT'; return out; }
    const bcs=getComputedStyle(bar);
    const br=bar.getBoundingClientRect();
    out.barRect={x:Math.round(br.x),y:Math.round(br.y),w:Math.round(br.width),h:Math.round(br.height)};
    out.barStuck=bar.getAttribute('data-stuck'); out.barZ=bcs.zIndex; out.barOpacity=bcs.opacity; out.barVis=bcs.visibility; out.barTransform=bcs.transform;
    const btn=bar.querySelector('.sticky-add-to-cart__button, button[type=submit], .add-to-cart-button');
    if(!btn){ out.btn='FEHLT'; return out; }
    const r2=btn.getBoundingClientRect();
    out.btnRect={x:Math.round(r2.x),y:Math.round(r2.y),w:Math.round(r2.width),h:Math.round(r2.height)};
    // 5x5 Raster
    let hit=0, tot=0, hits={};
    for(let i=0;i<5;i++)for(let j=0;j<5;j++){
      const x=r2.x+r2.width*(i+0.5)/5, y=r2.y+r2.height*(j+0.5)/5;
      const el=document.elementFromPoint(x,y);
      tot++;
      let id='(null)';
      if(el){ id=el.id||el.className||el.tagName; if(el.closest&&el.closest('#lx-cookie-banner')) id='#lx-cookie-banner'; else if(el.closest&&el.closest('.sticky-add-to-cart__bar')) id='STICKY-BAR'; }
      hits[id]=(hits[id]||0)+1;
      if(id==='#lx-cookie-banner') hit++;
    }
    out.rasterVerdeckt=hit+'/'+tot; out.rasterTreffer=hits;
    const mid=document.elementFromPoint(r2.x+r2.width/2, r2.y+r2.height/2);
    out.mitteTreffer = mid ? (mid.id||mid.className||mid.tagName) : null;
    return out;
  });
  console.log(JSON.stringify(r,null,1));
  await ctx.close();
}
await b.close();
