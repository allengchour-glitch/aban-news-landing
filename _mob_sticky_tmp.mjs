import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL=process.argv[2], OUT=process.argv[3], Y=parseInt(process.argv[4]||'2000',10);
const PROXY=process.env.HTTPS_PROXY||''; const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(u){return new Promise(res=>{const f='/tmp/_st'+(seq++);
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
await p.evaluate(()=>{const pop=document.querySelector('#lx-pop');if(pop){const x=[...pop.querySelectorAll('button,a,span,div')].find(e=>/^[×✕✖xX]$/.test((e.textContent||'').trim()));if(x)x.click();}});
await p.waitForTimeout(1000);
await p.evaluate(y=>window.scrollTo(0,y), Y);
await p.waitForTimeout(2500);
const r=await p.evaluate(()=>{
 const W=document.documentElement.clientWidth,H=window.innerHeight;
 const path=el=>{let s=el.tagName.toLowerCase();if(el.id)s+='#'+el.id;if(el.className&&typeof el.className==='string')s+='.'+el.className.trim().split(/\s+/).slice(0,3).join('.');return s;};
 const bars=[];
 for(const el of document.querySelectorAll('body *')){
  const cs=getComputedStyle(el); if(cs.position!=='fixed'&&cs.position!=='sticky')continue;
  if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)===0)continue;
  const rc=el.getBoundingClientRect(); if(rc.height<8||rc.width<40)continue;
  if(rc.bottom<0||rc.top>H)continue;
  if(el.parentElement&&getComputedStyle(el.parentElement).position==='sticky')continue;
  bars.push({sel:path(el).slice(0,70),pos:cs.position,z:cs.zIndex,top:Math.round(rc.top),bottom:Math.round(rc.bottom),h:Math.round(rc.height),w:Math.round(rc.width),txt:(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,55)});
 }
 // paarweise Überlappung
 const ov=[];
 for(let i=0;i<bars.length;i++)for(let j=i+1;j<bars.length;j++){
  const a=bars[i],c=bars[j];
  if(a.top<c.bottom&&c.top<a.bottom) ov.push([a.sel+'(z'+a.z+')',c.sel+'(z'+c.z+')',Math.round(Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top))+'px']);
 }
 // wieviel vertikaler Raum ist von fixed/sticky belegt?
 let covered=0; const seg=[];
 bars.forEach(bb=>seg.push([Math.max(0,bb.top),Math.min(H,bb.bottom)]));
 seg.sort((a,b)=>a[0]-b[0]); let cur=null;
 for(const s of seg){ if(!cur){cur=[...s];continue;} if(s[0]<=cur[1]){cur[1]=Math.max(cur[1],s[1]);}else{covered+=cur[1]-cur[0];cur=[...s];}}
 if(cur)covered+=cur[1]-cur[0];
 // sticky ATC Button Tippfläche
 const atc=document.querySelector('.sticky-add-to-cart, [class*="sticky-add-to-cart"]');
 let atcInfo=null;
 if(atc){const rc=atc.getBoundingClientRect();const btn=atc.querySelector('button,a');
  atcInfo={w:Math.round(rc.width),h:Math.round(rc.height),top:Math.round(rc.top),bottom:Math.round(rc.bottom),
   btn:btn?{w:Math.round(btn.getBoundingClientRect().width),h:Math.round(btn.getBoundingClientRect().height),txt:(btn.textContent||'').trim().slice(0,30)}:null};
  const t=atc.querySelector('.sticky-add-to-cart__title'); if(t)atcInfo.title={cw:t.clientWidth,sw:t.scrollWidth,txt:(t.textContent||'').trim().slice(0,60)};
 }
 return {scrollY:Math.round(window.scrollY),H,bars,overlaps:ov,coveredPx:covered,coveredPct:Math.round(covered/H*100),atc:atcInfo};
});
console.log(JSON.stringify(r,null,1).slice(0,7000));
await p.screenshot({path:OUT});
console.log('SHOT',OUT);
await b.close();
