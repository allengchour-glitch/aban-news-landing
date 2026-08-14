import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(url){return new Promise(res=>{const f='/tmp/_mv'+(seq++);
  execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],{maxBuffer:1e8},(e,out)=>{
    if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
    try{const body=fs.readFileSync(f);fs.unlinkSync(f);res({ct:(out||'').trim()||'text/html',body});}catch{res(null);}});});}
const MOB = process.env.DESKTOP!=='1';
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext(MOB
  ? { viewport:{width:parseInt(process.env.VW||'390'),height:parseInt(process.env.VH||'844')}, deviceScaleFactor:2, isMobile:true, hasTouch:true,
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }
  : { viewport:{width:1440,height:900} });
await ctx.route('**/*', async route=>{const u=route.request().url();
  if(!/^https?:/.test(u)) return route.continue();
  const r=await curlGet(u); if(!r) return route.abort();
  try{ await route.fulfill({status:200,contentType:r.ct,body:r.body}); }catch{ try{route.abort()}catch{} }});
const p = await ctx.newPage();
await p.goto(process.argv[2],{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForTimeout(7000);
try{ await p.click('#lx-pop-x',{timeout:2500}); }catch{}
try{ await p.click('#lx-cookie-banner button:last-of-type',{timeout:2500}); }catch{}
await p.waitForTimeout(1000);
const sel = process.argv[3] || '[id*="hero"]';
const r = await p.evaluate((sel)=>{
  const sec=document.querySelector(sel);
  if(!sec) return {err:'nicht gefunden'};
  const srect=sec.getBoundingClientRect();
  const out={section:{id:sec.id,top:Math.round(srect.top+scrollY),h:Math.round(srect.height),w:Math.round(srect.width)},kids:[]};
  const walk=(el,d)=>{
    if(d>7) return;
    for(const c of el.children){
      const rc=c.getBoundingClientRect(); const st=getComputedStyle(c);
      const t=(c.textContent||'').replace(/\s+/g,' ').trim();
      out.kids.push({d,tag:c.tagName.toLowerCase(),cls:(c.className||'').toString().slice(0,45),
        fs:Math.round(parseFloat(st.fontSize)),lh:st.lineHeight,ov:st.overflow,
        top:Math.round(rc.top+scrollY),bottom:Math.round(rc.bottom+scrollY),h:Math.round(rc.height),
        w:Math.round(rc.width),txt:t.slice(0,70)});
      walk(c,d+1);
    }
  };
  walk(sec,0);
  const bottom=Math.round(srect.bottom+scrollY);
  out.spill=out.kids.filter(k=>k.bottom>bottom+2).map(k=>({...k,ueber:k.bottom-bottom}));
  return out;
},sel);
console.log(JSON.stringify(r,null,1).slice(0,12000));
await b.close();
