import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(url){return new Promise(res=>{const f='/tmp/_mw'+(seq++);
  execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],{maxBuffer:1e8},(e,out)=>{
    if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
    try{const body=fs.readFileSync(f);fs.unlinkSync(f);res({ct:(out||'').trim()||'text/html',body});}catch{res(null);}});});}
const MOB = process.env.DESKTOP!=='1';
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext(MOB
  ? { viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true,
      userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }
  : { viewport:{width:1440,height:900} });
await ctx.route('**/*', async route=>{const u=route.request().url();
  if(!/^https?:/.test(u)) return route.continue();
  const r=await curlGet(u); if(!r) return route.abort();
  try{ await route.fulfill({status:200,contentType:r.ct,body:r.body}); }catch{ try{route.abort()}catch{} }});
const p = await ctx.newPage();
for(const URL of process.argv.slice(2)){
  console.log('\n#####',URL);
  try{ await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000}); }catch(e){ console.log('nav',e.message); continue; }
  await p.waitForTimeout(6000);
  // NICHT wegtippen: so sieht es der Erstbesucher
  const r = await p.evaluate(()=>{
    const o={};
    const words = /warenkorb|kasse|checkout|bezahlen|kaufen/i;
    const cands=[...document.querySelectorAll('button,a,input[type=submit]')].filter(e=>{
      const rc=e.getBoundingClientRect();
      return rc.width>40&&rc.height>25&&words.test((e.textContent||e.value||'')) ;
    });
    o.buttons=cands.slice(0,8).map(e=>{
      const rc=e.getBoundingClientRect();
      let covered=0,total=0;
      for(let i=1;i<=4;i++)for(let j=1;j<=4;j++){
        const x=rc.left+rc.width*i/5,y=rc.top+rc.height*j/5;
        if(x<0||y<0||x>innerWidth||y>innerHeight) continue;
        const el=document.elementFromPoint(x,y); total++;
        if(!el||!(e===el||e.contains(el)||el.contains(e))) covered++;
      }
      return {txt:(e.textContent||e.value||'').trim().replace(/\s+/g,' ').slice(0,40),
              rect:[Math.round(rc.left),Math.round(rc.top),Math.round(rc.width),Math.round(rc.height)],
              inView: rc.top<innerHeight&&rc.bottom>0, sichtbarePunkte:total, verdeckt:covered};
    });
    return o;
  });
  console.log(JSON.stringify(r,null,1).slice(0,4000));
}
await b.close();
