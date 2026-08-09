/* Read-only: lädt eine Storefront-Seite im Browser und protokolliert Konsolen-Fehler,
 * Seiten-Exceptions, fehlgeschlagene Requests und ein paar Performance-Kennzahlen.
 * Requests werden seriell (Queue, max 2 parallel) via curl über den Agent-Proxy geholt,
 * damit keine 429-Phantomfehler entstehen. */
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL = process.argv[2];
const PROXY = process.env.HTTPS_PROXY || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0, active = 0; const queue = [];
function pump(){ while(active < 2 && queue.length){ const j = queue.shift(); active++; j().finally(()=>{ active--; pump(); }); } }
function curlGet(url){
  return new Promise(res=>{
    queue.push(()=> new Promise(done=>{
      const f='/tmp/_cc'+(seq++);
      execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}|%{http_code}',url,'--compressed'],
        {maxBuffer:1e8},(e,out)=>{
          if(e){ try{fs.unlinkSync(f)}catch{}; res(null); return done(); }
          try{ const body=fs.readFileSync(f); fs.unlinkSync(f);
               const [ct,code]=(out||'').trim().split('|');
               res({ct:ct||'text/html', body, code:parseInt(code||'200',10)}); }
          catch{ res(null); }
          done();
        });
    }));
    pump();
  });
}
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext({ viewport:{width:390,height:900}, deviceScaleFactor:2, isMobile:true, hasTouch:true,
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const httpErr = [], netFail = [], consoleErr = [], pageErr = [];
await ctx.route('**/*', async route=>{
  const u = route.request().url();
  if(!/^https?:/.test(u)) return route.continue();
  const r = await curlGet(u);
  if(!r){ netFail.push(u); return route.abort(); }
  if(r.code >= 400) httpErr.push(r.code + ' ' + u);
  try{ await route.fulfill({ status:r.code, contentType:r.ct, body:r.body }); }catch{ try{route.abort()}catch{} }
});
const p = await ctx.newPage();
p.on('console', m=>{ if(m.type()==='error') consoleErr.push(m.text().slice(0,300)); });
p.on('pageerror', e=>{ pageErr.push((e.name||'Error')+': '+(e.message||'').slice(0,300)); });
try{ await p.goto(URL, {waitUntil:'load', timeout:120000}); }catch(e){ console.log('NAV:', e.message); }
await p.waitForTimeout(12000);
const perf = await p.evaluate(()=>{
  const n = performance.getEntriesByType('navigation')[0] || {};
  const res = performance.getEntriesByType('resource');
  const by = {};
  for(const r of res){ const h=new URL(r.name).host; by[h]=(by[h]||0)+1; }
  return { domNodes: document.getElementsByTagName('*').length,
           images: document.images.length,
           scripts: document.scripts.length,
           domContentLoaded: Math.round(n.domContentLoadedEventEnd||0),
           loadEvent: Math.round(n.loadEventEnd||0),
           resourceCount: res.length,
           hosts: Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,12) };
});
console.log('\n===== ' + URL);
console.log('PERF', JSON.stringify(perf, null, 1));
console.log('\nPAGE EXCEPTIONS (' + pageErr.length + '):'); pageErr.forEach(e=>console.log('  !', e));
console.log('\nCONSOLE ERRORS (' + consoleErr.length + '):'); [...new Set(consoleErr)].forEach(e=>console.log('  *', e));
console.log('\nHTTP >=400 (' + httpErr.length + '):'); [...new Set(httpErr)].forEach(e=>console.log('  #', e));
console.log('\nHARNESS ABORTS (' + netFail.length + ', evtl. eigene Drossel):'); [...new Set(netFail)].slice(0,15).forEach(e=>console.log('  ?', e));
await b.close();
