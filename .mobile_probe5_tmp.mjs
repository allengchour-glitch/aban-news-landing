import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || process.env.https_proxy || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0;
function curlGet(url){
  return new Promise(res=>{
    const f='/tmp/_mt'+(seq++);
    execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],
      {maxBuffer:1e8},(e,out)=>{
        if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
        try{ const body=fs.readFileSync(f); fs.unlinkSync(f); res({ct:(out||'').trim()||'text/html',body}); }catch{ res(null); }
      });
  });
}
const b = await chromium.launch({ executablePath: fs.existsSync(CHROME)?CHROME:undefined, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true,
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
await ctx.route('**/*', async route=>{
  const u=route.request().url();
  if(!/^https?:/.test(u)) return route.continue();
  const r=await curlGet(u);
  if(!r) return route.abort();
  try{ await route.fulfill({ status:200, contentType:r.ct, body:r.body }); }catch{ try{route.abort()}catch{} }
});
const p = await ctx.newPage();
for(const URL of process.argv.slice(2)){
  console.log('\n#####', URL);
  try{ await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000}); }catch(e){console.log('nav',e.message);continue;}
  await p.waitForTimeout(6000);
  try{ await p.click('#lx-pop-x',{timeout:2500}); }catch{}
  try{ await p.click('#lx-cookie-banner button:last-of-type',{timeout:2500}); }catch{}
  await p.waitForTimeout(800);
  const before = await p.evaluate(()=>{
    const btns=[...document.querySelectorAll('button,summary,a')].filter(e=>/^\s*filtern\s*$/i.test((e.textContent||'').trim()));
    return btns.length;
  });
  // Filtern antippen
  const clicked = await p.evaluate(()=>{
    const btn=[...document.querySelectorAll('button,summary,a')].find(e=>/^\s*filtern\s*$/i.test((e.textContent||'').trim()));
    if(!btn) return false;
    btn.click(); return btn.outerHTML.slice(0,160);
  });
  await p.waitForTimeout(2500);
  const r = await p.evaluate(()=>{
    const o={};
    const dlg=[...document.querySelectorAll('dialog')].find(d=>d.open);
    if(dlg){
      const rc=dlg.getBoundingClientRect();
      o.dialog={cls:(dlg.className||'').toString().slice(0,60),rect:[Math.round(rc.left),Math.round(rc.top),Math.round(rc.width),Math.round(rc.height)]};
      o.inputs=dlg.querySelectorAll('input:not([name^="grid-"])').length;
      o.selects=[...dlg.querySelectorAll('select')].map(s=>s.name);
      o.text=(dlg.textContent||'').replace(/\s+/g,' ').trim().slice(0,300);
    } else {
      // evtl. kein dialog: sichtbares Panel suchen
      const panel=document.querySelector('.facets, .facets--drawer, [class*="facets"]');
      if(panel){const rc=panel.getBoundingClientRect();const s=getComputedStyle(panel);
        o.panel={cls:(panel.className||'').toString().slice(0,60),display:s.display,rect:[Math.round(rc.left),Math.round(rc.top),Math.round(rc.width),Math.round(rc.height)],
          inputs:panel.querySelectorAll('input:not([name^="grid-"])').length,text:(panel.textContent||'').replace(/\s+/g,' ').trim().slice(0,300)};}
    }
    return o;
  });
  console.log('filtern-knoepfe:',before,'geklickt:',(clicked||'').toString().slice(0,80));
  console.log(JSON.stringify(r,null,1));
  const name=URL.split('/').pop().split('?')[0];
  await p.screenshot({path:'/tmp/mob5_'+name+'.png'});
}
await b.close();
