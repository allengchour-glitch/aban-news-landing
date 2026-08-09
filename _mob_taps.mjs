import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL=process.argv[2], OUT=process.argv[3], Y=parseInt(process.argv[4]||'0',10);
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_tp'+(seq++);
 execFile('curl',['-sSL','--max-time','40','-x',PROXY,'-o',f,'-w','%{content_type}|%{http_code}',u,'--compressed'],{maxBuffer:1e8},(e,out)=>{
 if(e){try{fs.unlinkSync(f)}catch{};return res(null);} const[ct,code]=(out||'').trim().split('|');
 try{const body=fs.readFileSync(f);fs.unlinkSync(f);res({ct:ct||'text/html',body,code});}catch{res(null);}});});}
const b=await chromium.launch({executablePath:fs.existsSync(CHROME)?CHROME:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:false,hasTouch:true,
 userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async r2=>{const u=r2.request().url();if(!/^https?:/.test(u))return r2.continue();
 const r=await curlGet(u);if(!r)return r2.abort();
 try{await r2.fulfill({status:parseInt(r.code)||200,contentType:r.ct,body:r.body});}catch{try{r2.abort()}catch{}}});
const p=await ctx.newPage();
try{await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});}catch(e){console.log('NAV',e.message);}
await p.waitForTimeout(7000);
await p.evaluate(()=>{const pop=document.querySelector('#lx-pop');if(pop){const x=[...pop.querySelectorAll('button,a,span,div')].find(e=>/^[×✕✖xX]$/.test((e.textContent||'').trim()));if(x)x.click();}
 const ck=document.querySelector('#lx-cookie-banner');if(ck){const a=[...ck.querySelectorAll('button,a')].find(e=>/akzeptieren/i.test(e.textContent||''));if(a)a.click();}});
await p.waitForTimeout(1500);
if(Y){await p.evaluate(y=>window.scrollTo(0,y),Y); await p.waitForTimeout(2000);}
const r=await p.evaluate(()=>{
 const path=el=>{let s=el.tagName.toLowerCase();if(el.id)s+='#'+el.id;if(el.className&&typeof el.className==='string')s+='.'+el.className.trim().split(/\s+/).slice(0,2).join('.');return s;};
 const vis=el=>{const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)===0)return false;const r=el.getBoundingClientRect();return r.width>2&&r.height>2;};
 const sel='a[href], button, input[type=submit], [role="button"], summary, select';
 let total=0; const small={};
 for(const el of document.querySelectorAll(sel)){
  if(!vis(el))continue; if(/visually-hidden|sr-only/i.test(el.className||''))continue;
  const rc=el.getBoundingClientRect(); total++;
  if(rc.width>=44&&rc.height>=44)continue;
  let par=el.parentElement,big=false;
  while(par&&par!==document.body){if(par.matches&&par.matches('a[href],button')){const pr=par.getBoundingClientRect();if(pr.width>=44&&pr.height>=44){big=true;break;}}par=par.parentElement;}
  if(big)continue;
  const key=path(el)+' '+Math.round(rc.width)+'x'+Math.round(rc.height)+' :: '+((el.getAttribute('aria-label')||el.textContent||'').trim().replace(/\s+/g,' ').slice(0,28));
  small[key]=(small[key]||0)+1;
 }
 const entries=Object.entries(small).sort((a,b)=>b[1]-a[1]);
 const smallTotal=entries.reduce((s,e)=>s+e[1],0);
 // vertikale Belegung durch sticky/fixed
 const H=window.innerHeight; const segs=[];
 for(const el of document.querySelectorAll('body *')){
  const cs=getComputedStyle(el); if(cs.position!=='fixed'&&cs.position!=='sticky')continue;
  if(!vis(el))continue; const rc=el.getBoundingClientRect(); if(rc.height<8||rc.width<100)continue;
  if(rc.bottom<0||rc.top>H)continue;
  if(el.parentElement&&getComputedStyle(el.parentElement).position==='sticky')continue;
  segs.push([Math.max(0,rc.top),Math.min(H,rc.bottom),path(el).slice(0,50),cs.position,Math.round(rc.height)]);
 }
 segs.sort((a,b)=>a[0]-b[0]); let cov=0,cur=null;
 for(const s of segs){if(!cur){cur=[s[0],s[1]];continue;}if(s[0]<=cur[1])cur[1]=Math.max(cur[1],s[1]);else{cov+=cur[1]-cur[0];cur=[s[0],s[1]];}}
 if(cur)cov+=cur[1]-cur[0];
 return {scrollY:Math.round(window.scrollY),totalTaps:total,smallTotal,smallPct:Math.round(smallTotal/total*100),entries:entries.slice(0,16),
   stickySegs:segs.map(s=>({sel:s[2],pos:s[3],h:s[4],top:Math.round(s[0])})),coveredPx:Math.round(cov),coveredPct:Math.round(cov/H*100)};
});
console.log(JSON.stringify(r,null,1).slice(0,7000));
await p.screenshot({path:OUT});
console.log('SHOT',OUT);
await b.close();
