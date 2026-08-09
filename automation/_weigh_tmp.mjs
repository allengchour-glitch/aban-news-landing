/* Nur-Lesen: misst echtes Ladegewicht (Requests + Bytes) einer Seite im 390px-Mobile-Viewport. */
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL = process.argv[2];
const PROXY = process.env.HTTPS_PROXY || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq = 0;
function curlGet(url){
  return new Promise(res=>{
    const f='/tmp/_wg'+(seq++);
    execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],
      {maxBuffer:1e8},(e,out)=>{
        if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
        try{ const body=fs.readFileSync(f); fs.unlinkSync(f); res({ct:(out||'').trim()||'text/html',body}); }catch{ res(null); }
      });
  });
}
const b = await chromium.launch({ executablePath: CHROME, args:['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await b.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true,
  userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const log=[];
await ctx.route('**/*', async route=>{
  const u=route.request().url();
  if(!/^https?:/.test(u)) return route.continue();
  const r=await curlGet(u);
  if(!r) return route.abort();
  log.push({u, type:route.request().resourceType(), bytes:r.body.length});
  try{ await route.fulfill({ status:200, contentType:r.ct, body:r.body }); }catch{ try{route.abort()}catch{} }
});
const p = await ctx.newPage();
try{ await p.goto(URL, {waitUntil:'load', timeout:120000}); }catch(e){ console.log('nav:',e.message); }
await p.waitForTimeout(9000);
const byType={};
for(const r of log){ const t=byType[r.type]||(byType[r.type]={n:0,b:0}); t.n++; t.b+=r.bytes; }
let tn=0,tb=0;
console.log('=== '+URL);
for(const [k,v] of Object.entries(byType).sort((a,b)=>b[1].b-a[1].b)){
  console.log('  '+k.padEnd(12)+' '+String(v.n).padStart(4)+' Requests  '+(v.b/1024).toFixed(0).padStart(6)+' KB'); tn+=v.n; tb+=v.b;
}
console.log('  TOTAL        '+String(tn).padStart(4)+' Requests  '+(tb/1024).toFixed(0).padStart(6)+' KB  ('+(tb/1048576).toFixed(2)+' MB)');
const imgs=log.filter(r=>r.type==='image').sort((a,b)=>b.bytes-a.bytes);
console.log('\n  Top-10 Bilder:');
imgs.slice(0,10).forEach(r=>console.log('   '+(r.bytes/1024).toFixed(0).padStart(5)+' KB  '+r.u.replace(/^https?:\/\/luxestyle.ch\/cdn\/shop\//,'').slice(0,110)));
// DOM-Knoten live
const nodes = await p.evaluate(()=>document.getElementsByTagName('*').length);
const hidden = await p.evaluate(()=>{let n=0;document.querySelectorAll('.hidden--mobile').forEach(e=>{n+=e.getElementsByTagName('*').length+1});return n;});
console.log('\n  DOM-Elemente live: '+nodes+'   davon in .hidden--mobile (auf Handy unsichtbar): '+hidden);

const other=log.filter(r=>!["image","script","document","stylesheet","font","ping","xhr","fetch"].includes(r.type)).sort((a,b)=>b.bytes-a.bytes);
console.log("\n  Top other/media:"); other.slice(0,8).forEach(r=>console.log("   "+r.type+" "+(r.bytes/1024).toFixed(0)+" KB  "+r.u.slice(0,120)));
const sc=log.filter(r=>r.type==="script").sort((a,b)=>b.bytes-a.bytes);
console.log("\n  Top Skripte:"); sc.slice(0,10).forEach(r=>console.log("   "+(r.bytes/1024).toFixed(0).padStart(5)+" KB  "+r.u.replace(/\?.*/,"").slice(-95)));
const hosts={};log.forEach(r=>{const h=r.u.split("/")[2];const x=hosts[h]||(hosts[h]={n:0,b:0});x.n++;x.b+=r.bytes;});
console.log("\n  Nach Host:"); Object.entries(hosts).sort((a,b)=>b[1].b-a[1].b).slice(0,10).forEach(([h,v])=>console.log("   "+(v.b/1024).toFixed(0).padStart(6)+" KB  "+String(v.n).padStart(3)+"x  "+h));
console.log("\n  gtag-Aufrufe:"); log.filter(r=>/gtag\/js|gtm\.js/.test(r.u)).forEach(r=>console.log("   "+r.u));
console.log("  Fremd-Hosts gesamt: "+Object.keys(hosts).filter(h=>!/luxestyle|shopify/.test(h)).length+" → "+Object.keys(hosts).filter(h=>!/luxestyle|shopify/.test(h)).join(", "));
await b.close();
