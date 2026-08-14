import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(url){return new Promise(res=>{const f='/tmp/_my'+(seq++);
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
await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForTimeout(8000);
try{ await p.click('#lx-pop-x',{timeout:3000}); }catch{}
try{ await p.click('#lx-cookie-banner button:last-of-type',{timeout:3000}); }catch{}
await p.waitForTimeout(800);
await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));
await p.waitForTimeout(2500);
const r=await p.evaluate(()=>{
  const o={};
  const bar=document.querySelector('.sticky-add-to-cart__bar');
  o.barVisible = !!bar && getComputedStyle(bar).display!=='none' && bar.getBoundingClientRect().top<innerHeight;
  if(bar){const rc=bar.getBoundingClientRect();o.bar=[Math.round(rc.left),Math.round(rc.top),Math.round(rc.width),Math.round(rc.height)];}
  o.bodyPadBottom=getComputedStyle(document.body).paddingBottom;
  // Welche Links/Buttons liegen unter der Leiste?
  const hidden=[];
  document.querySelectorAll('a,button').forEach(e=>{
    const rc=e.getBoundingClientRect();
    if(rc.width<10||rc.height<10) return;
    if(rc.top>=innerHeight||rc.bottom<=0) return;
    const cx=rc.left+rc.width/2, cy=rc.top+rc.height/2;
    if(cx<0||cy<0||cx>innerWidth||cy>innerHeight) return;
    const hit=document.elementFromPoint(cx,cy);
    if(hit && !(e===hit||e.contains(hit)||hit.contains(e))){
      hidden.push({txt:(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,40),
        rect:[Math.round(rc.left),Math.round(rc.top),Math.round(rc.width),Math.round(rc.height)],
        von:(hit.className||'').toString().slice(0,40)||hit.id||hit.tagName});
    }
  });
  o.verdeckt=hidden.slice(0,15);
  o.verdecktAnzahl=hidden.length;
  return o;
});
console.log(JSON.stringify(r,null,1).slice(0,4000));
await p.screenshot({path:'/tmp/mob10_'+URL.split('/').pop().slice(0,25)+'.png'});
}
await b.close();
