import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0;
function curlGet(url){
  return new Promise(res=>{
    const f='/tmp/_mr'+(seq++);
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
const DISMISS = process.env.DISMISS==='1';
await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForTimeout(7000);
if(DISMISS){
  try{ await p.click('#lx-pop-x',{timeout:3000}); }catch{}
  try{ await p.click('#lx-cookie-banner button:last-of-type',{timeout:3000}); }catch{}
  await p.waitForTimeout(1200);
}
await p.evaluate(()=>window.scrollTo(0,1600));
await p.waitForTimeout(2500);
const r = await p.evaluate(()=>{
  const o={};
  const bar=document.querySelector('.sticky-add-to-cart__bar');
  if(bar){
    const rc=bar.getBoundingClientRect();
    o.bar=[Math.round(rc.left),Math.round(rc.top),Math.round(rc.width),Math.round(rc.height)];
    const btn=bar.querySelector('button,[type=submit],.button');
    if(btn){const b2=btn.getBoundingClientRect();
      o.btn=[Math.round(b2.left),Math.round(b2.top),Math.round(b2.width),Math.round(b2.height)];
      o.btnText=(btn.textContent||'').trim().slice(0,40);
      const cx=Math.round(b2.left+b2.width/2), cy=Math.round(b2.top+b2.height/2);
      const hit=document.elementFromPoint(cx,cy);
      o.hitAtBtnCenter={x:cx,y:cy,tag:hit?hit.tagName.toLowerCase():null,id:hit?hit.id:null,cls:hit?(hit.className||'').toString().slice(0,50):'',txt:hit?(hit.textContent||'').trim().slice(0,40):''};
      // Anteil des Knopfes, der von einem anderen Element bedeckt ist (Raster 5x5)
      let covered=0,total=0;
      for(let i=1;i<=5;i++)for(let j=1;j<=5;j++){
        const x=b2.left+b2.width*i/6, y=b2.top+b2.height*j/6;
        const e=document.elementFromPoint(x,y); total++;
        if(!e||!(btn===e||btn.contains(e)||e.contains(btn))) covered++;
      }
      o.coveredPct=Math.round(covered/total*100);
    }
  }
  const ck=document.getElementById('lx-cookie-banner');
  if(ck){const rc=ck.getBoundingClientRect();const s=getComputedStyle(ck);
    o.cookie={rect:[Math.round(rc.left),Math.round(rc.top),Math.round(rc.width),Math.round(rc.height)],display:s.display,bottom:s.bottom};}
  const pop=document.getElementById('lx-pop');
  if(pop){const s=getComputedStyle(pop);o.pop={display:s.display};}
  return o;
});
console.log(JSON.stringify(r,null,1));
await p.screenshot({path:process.argv[3]||'/tmp/mob3.png'});
await b.close();
