import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(url){return new Promise(res=>{const f='/tmp/_mz'+(seq++);
  execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],{maxBuffer:1e8},(e,out)=>{
    if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
    try{const body=fs.readFileSync(f);fs.unlinkSync(f);res({ct:(out||'').trim()||'text/html',body});}catch{res(null);}});});}
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:1, isMobile:true, hasTouch:true,
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
await ctx.route('**/*', async route=>{const u=route.request().url();
  if(!/^https?:/.test(u)) return route.continue();
  const r=await curlGet(u); if(!r) return route.abort();
  try{ await route.fulfill({status:200,contentType:r.ct,body:r.body}); }catch{ try{route.abort()}catch{} }});
const p = await ctx.newPage();
for(const URL of process.argv.slice(2)){
  console.log('\n#####',URL);
  try{ await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000}); }catch(e){ console.log('nav',e.message); continue; }
  await p.waitForTimeout(9000);
  await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight*0.75));
  await p.waitForTimeout(6000);
  const r=await p.evaluate(()=>{
    const imgs=[...document.querySelectorAll('.jdgm-widget img, [class*="jdgm"] img')].map(i=>i.src).filter(Boolean);
    const revs=[...document.querySelectorAll('.jdgm-rev')].length;
    const body=[...document.querySelectorAll('.jdgm-rev__body')].map(e=>(e.textContent||'').trim().slice(0,120)).slice(0,6);
    return {revs, imgs:[...new Set(imgs)].slice(0,30), body};
  });
  console.log(JSON.stringify(r,null,1).slice(0,4000));
}
await b.close();
