import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0;
function curlGet(url){
  return new Promise(res=>{
    const f='/tmp/_mp'+(seq++);
    execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],
      {maxBuffer:1e8},(e,out)=>{
        if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
        try{ const body=fs.readFileSync(f); fs.unlinkSync(f); res({ct:(out||'').trim()||'text/html',body}); }catch{ res(null); }
      });
  });
}
const MOB = process.env.DESKTOP!=='1';
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext(MOB
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
const URL = process.argv[2];
const WAIT = parseInt(process.argv[3]||'8000',10);
await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForTimeout(WAIT);
const r = await p.evaluate(()=>{
  const o = {};
  const probe = (id)=>{
    const el = document.getElementById(id);
    if(!el) return null;
    const st = getComputedStyle(el), rc = el.getBoundingClientRect();
    return { display:st.display, visibility:st.visibility, opacity:st.opacity, z:st.zIndex, pos:st.position,
             rect:[Math.round(rc.left),Math.round(rc.top),Math.round(rc.width),Math.round(rc.height)],
             html: el.outerHTML.slice(0,1200) };
  };
  o.pop = probe('lx-pop');
  o.cookie = probe('lx-cookie-banner');
  o.bodyOverflow = getComputedStyle(document.body).overflow;
  o.htmlOverflow = getComputedStyle(document.documentElement).overflow;
  // was liegt in der Mitte des Bildschirms / an typischen Stellen?
  const pts = [[195,100],[195,300],[195,422],[195,700],[195,760],[195,800],[60,60],[340,60],[195,180]];
  o.hits = pts.map(([x,y])=>{
    const e = document.elementFromPoint(x,y);
    return { x,y, tag: e? e.tagName.toLowerCase():null, id: e? e.id:null,
             cls: e&&e.className? e.className.toString().slice(0,50):'', txt: e? (e.textContent||'').trim().slice(0,40):'' };
  });
  return o;
});
console.log(JSON.stringify(r,null,1));
await p.screenshot({path:process.argv[4]||'/tmp/mob_probe.png'});
await b.close();
