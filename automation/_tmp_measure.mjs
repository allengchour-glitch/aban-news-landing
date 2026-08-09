import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const PROXY = process.env.HTTPS_PROXY || '';
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
let seq=0;
function curlGet(url){return new Promise(res=>{const f='/tmp/_mb'+(seq++);
 execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',url,'--compressed'],{maxBuffer:1e8},(e,out)=>{
 if(e){try{fs.unlinkSync(f)}catch{};return res(null);} try{const b=fs.readFileSync(f);fs.unlinkSync(f);res({ct:(out||'').trim()||'text/html',body:b});}catch{res(null);} });});}
const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async route=>{const u=route.request().url(); if(!/^https?:/.test(u))return route.continue();
 const r=await curlGet(u); if(!r)return route.abort(); try{await route.fulfill({status:200,contentType:r.ct,body:r.body});}catch{try{route.abort()}catch{}}});
const p=await ctx.newPage();
await p.goto(process.argv[2]||'https://luxestyle.ch/',{waitUntil:'domcontentloaded',timeout:90000});
await p.waitForTimeout(9000);
const res=await p.evaluate(()=>{
  const needles=['Gratis-Versand ab CHF 65','30 Tage Rückgabe','Blitzversand-Artikel ab CH-Lager','TWINT','Klarna','Kauf auf Rechnung','Schweizer Shop','Geld-zurück-Garantie','Belp','Kontaktinformationen','WELCOME10','Halloween','Bewertung'];
  const out={docHeight:document.documentElement.scrollHeight, vp:innerHeight, hits:{}};
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  const found={};
  let n;
  while(n=walker.nextNode()){
    const t=n.nodeValue; if(!t||!t.trim())continue;
    for(const nd of needles){
      if(t.includes(nd)){
        const el=n.parentElement; if(!el)continue;
        const r=el.getBoundingClientRect();
        const y=Math.round(r.top+scrollY);
        const vis = r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).display!=='none';
        (found[nd]=found[nd]||[]).push({y,vis,h:Math.round(r.height),txt:t.trim().slice(0,90)});
      }
    }
  }
  out.hits=found;
  // star rating widgets on product cards
  out.jdgPreview=document.querySelectorAll('.jdgm-prev-badge, [class*="jdgm"]').length;
  out.starEls=document.querySelectorAll('[class*="star" i]').length;
  return out;
});
console.log(JSON.stringify(res,null,1));
await b.close();
