import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(url){return new Promise(res=>{const f='/tmp/_mx'+(seq++);
  execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],{maxBuffer:1e8},(e,out)=>{
    if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
    try{const body=fs.readFileSync(f);fs.unlinkSync(f);res({ct:(out||'').trim()||'text/html',body});}catch{res(null);}});});}
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true,
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
await ctx.route('**/*', async route=>{const u=route.request().url();
  if(!/^https?:/.test(u)) return route.continue();
  const r=await curlGet(u); if(!r) return route.abort();
  try{ await route.fulfill({status:200,contentType:r.ct,body:r.body}); }catch{ try{route.abort()}catch{} }});
const p = await ctx.newPage();
await p.goto(process.argv[2]||'https://luxestyle.ch/',{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForTimeout(8000);
try{ await p.click('#lx-pop-x',{timeout:3000}); }catch(e){console.log('pop-x:',e.message.slice(0,50));}
try{ await p.click('#lx-cookie-banner button:last-of-type',{timeout:3000}); }catch{}
await p.waitForTimeout(800);
console.log('HTML der Suchleiste:');
console.log(await p.evaluate(()=>{const e=document.getElementById('luxsb-wrap');return e?e.outerHTML.slice(0,2000):'fehlt';}));
try{
  await p.fill('#luxsb-wrap input','uhr');
  await Promise.all([
    p.waitForNavigation({timeout:20000}).catch(e=>console.log('keine Navigation:',e.message.slice(0,60))),
    p.click('#luxsb-wrap button, #luxsb-wrap [type=submit]')
  ]);
}catch(e){ console.log('Fehler beim Suchen:', e.message.slice(0,120)); }
await p.waitForTimeout(3000);
console.log('URL danach:', p.url());
console.log('Titel:', await p.title());
const cnt = await p.evaluate(()=>document.querySelectorAll('.product-card, product-card, .card-gallery').length);
console.log('Produktkarten:', cnt);
await p.screenshot({path:'/tmp/mob9_search.png'});
await b.close();
