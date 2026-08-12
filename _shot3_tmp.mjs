/* shot3 — Handy-Shot mit Cookie-Jar + POST-Weiterleitung (echtes In-den-Warenkorb-Legen möglich) */
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL=process.argv[2], OUT=process.argv[3];
const SCROLL=parseInt(process.argv[4]||'0',10);
const CLICKS=(process.argv[5]||'').split('||').filter(Boolean);
const H=parseInt(process.env.VH||'844',10);
const PROXY=process.env.HTTPS_PROXY||'';
const JAR='/tmp/_shopjar.txt';
const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlReq(url,method,body,headers){
 return new Promise(res=>{
  const f='/tmp/_sd'+(seq++);
  const a=['-sSL','--max-time','40','-x',PROXY,'-b',JAR,'-c',JAR,'-o',f,'-w','%{content_type}',url,'--compressed','-X',method];
  for(const [k,v] of Object.entries(headers||{})){ if(/^(content-type|accept|x-requested-with)$/i.test(k)) a.push('-H',`${k}: ${v}`); }
  if(body){ const bf='/tmp/_sb'+(seq++); fs.writeFileSync(bf,body); a.push('--data-binary','@'+bf); }
  execFile('curl',a,{maxBuffer:1e8},(e,out)=>{
   if(e){try{fs.unlinkSync(f)}catch{};return res(null);}
   try{const b=fs.readFileSync(f);fs.unlinkSync(f);res({ct:(out||'').trim()||'text/html',body:b});}catch{res(null);}
  });
 });
}
try{fs.unlinkSync(JAR)}catch{}
const b=await chromium.launch({executablePath:fs.existsSync(CHROME)?CHROME:undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:H},deviceScaleFactor:2,isMobile:true,hasTouch:true,
 userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async route=>{
 const r=route.request(); const u=r.url();
 if(!/^https?:/.test(u)) return route.continue();
 const resp=await curlReq(u,r.method(),r.postData(),r.headers());
 if(!resp) return route.abort();
 try{await route.fulfill({status:200,contentType:resp.ct,body:resp.body});}catch{try{route.abort()}catch{}}
});
const p=await ctx.newPage();
try{await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});}catch(e){console.log('nav:',e.message);}
await p.waitForTimeout(7000);
if(SCROLL){await p.evaluate(y=>window.scrollTo(0,y),SCROLL);await p.waitForTimeout(1200);}
for(const c of CLICKS){
 try{await p.click(c,{timeout:10000});console.log('clicked',c);}catch(e){console.log('clickFAIL',c,e.message.split('\n')[0]);}
 await p.waitForTimeout(3500);
}
await p.screenshot({path:OUT});
console.log('OK',await p.title(),'→',OUT, 'url=',p.url());
await b.close();
