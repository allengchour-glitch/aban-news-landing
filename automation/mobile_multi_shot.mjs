// Mehrere Handy-Screenshots in einem Lauf (390px). Entstanden im Rundum-Audit 2026-08-09
// als Ergänzung zu site_shot.mjs, das nur eine URL pro Aufruf schiesst.
// Aufruf: node automation/mobile_multi_shot.mjs <url1> <url2> ...
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URLS=process.argv.slice(2);
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_mm'+(seq++);
 execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}|%{http_code}',u,'--compressed'],{maxBuffer:1e8},(e,out)=>{
 if(e){try{fs.unlinkSync(f)}catch{};return res(null);} const[ct,code]=(out||'').trim().split('|');
 try{const body=fs.readFileSync(f);fs.unlinkSync(f);res({ct:ct||'text/html',body,code});}catch{res(null);}});});}
const b=await chromium.launch({executablePath:fs.existsSync(CHROME)?CHROME:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:false,hasTouch:true,
 userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async r2=>{const u=r2.request().url();if(!/^https?:/.test(u))return r2.continue();
 const r=await curlGet(u);if(!r)return r2.abort();
 try{await r2.fulfill({status:parseInt(r.code)||200,contentType:r.ct,body:r.body});}catch{try{r2.abort()}catch{}}});
for(const URL of URLS){
 const p=await ctx.newPage();
 let code='?';
 try{const resp=await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000}); code=resp?resp.status():'?';}catch(e){code='ERR '+e.message.slice(0,40);}
 await p.waitForTimeout(7000);
 const r=await p.evaluate(()=>{
  const W=document.documentElement.clientWidth;
  const o={W, docW:document.documentElement.scrollWidth, title:document.title.slice(0,60)};
  const pop=document.querySelector('#lx-pop'); 
  if(pop){const cs=getComputedStyle(pop); const pr=pop.getBoundingClientRect();
   o.pop={vis:cs.display!=='none'&&cs.visibility!=='hidden', w:Math.round(pr.width), left:Math.round(pr.left)};
   // Schliess-Button suchen
   const cands=[...pop.querySelectorAll('button,a,span,div')].filter(e=>/^[×✕✖xX]$/.test((e.textContent||'').trim()));
   if(cands.length){const cr=cands[0].getBoundingClientRect();o.close={left:Math.round(cr.left),right:Math.round(cr.right),top:Math.round(cr.top),w:Math.round(cr.width),h:Math.round(cr.height),offscreen:cr.right>W};}
   const btn=[...pop.querySelectorAll('button')].find(e=>/Code sichern/i.test(e.textContent||''));
   if(btn){const br=btn.getBoundingClientRect();o.cta={left:Math.round(br.left),right:Math.round(br.right),w:Math.round(br.width),offscreen:br.right>W};}
  }
  const ck=document.querySelector('#lx-cookie-banner');
  if(ck){const cr=ck.getBoundingClientRect();const cs=getComputedStyle(ck);
   o.cookie={vis:cs.display!=='none',left:Math.round(cr.left),right:Math.round(cr.right),top:Math.round(cr.top),h:Math.round(cr.height),offscreen:cr.right>W};}
  return o;});
 console.log(URL,'HTTP',code,JSON.stringify(r));
 await p.close();
 await new Promise(s=>setTimeout(s,1800));
}
await b.close();
