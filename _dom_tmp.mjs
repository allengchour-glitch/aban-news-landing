import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
const URL=process.argv[2];const PROXY=process.env.HTTPS_PROXY||'';
const CHROME='/opt/pw-browsers/chromium-1194/chrome-linux/chrome';let seq=0;
function g(u){return new Promise(r=>{const f='/tmp/_se'+(seq++);execFile('curl',['-sSL','--max-time','30','-x',PROXY,'-o',f,'-w','%{content_type}',u,'--compressed'],{maxBuffer:1e8},(e,o)=>{if(e){return r(null)}try{const b=fs.readFileSync(f);fs.unlinkSync(f);r({ct:(o||'').trim()||'text/html',body:b})}catch{r(null)}})})}
const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--disable-dev-shm-usage']});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await ctx.route('**/*',async rt=>{const u=rt.request().url();if(!/^https?:/.test(u))return rt.continue();const r=await g(u);if(!r)return rt.abort();try{await rt.fulfill({status:200,contentType:r.ct,body:r.body})}catch{try{rt.abort()}catch{}}});
const p=await ctx.newPage();await p.goto(URL,{waitUntil:'domcontentloaded',timeout:90000});await p.waitForTimeout(8000);
const info=await p.evaluate(()=>{
 const out={buttons:[],fixed:[],dialogs:[]};
 document.querySelectorAll('button,a.button,input[type=submit]').forEach(el=>{
  const r=el.getBoundingClientRect();
  out.buttons.push({t:(el.innerText||el.value||'').trim().slice(0,40),cls:el.className.toString().slice(0,60),name:el.name||'',x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)});
 });
 document.querySelectorAll('*').forEach(el=>{
  const s=getComputedStyle(el);
  if((s.position==='fixed'||s.position==='sticky') && el.offsetHeight>10){
   const r=el.getBoundingClientRect();
   out.fixed.push({tag:el.tagName,cls:el.className.toString().slice(0,50),id:el.id,pos:s.position,z:s.zIndex,x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),txt:(el.innerText||'').trim().slice(0,40)});
  }});
 document.querySelectorAll('dialog,[role=dialog]').forEach(el=>{const r=el.getBoundingClientRect();out.dialogs.push({tag:el.tagName,open:el.hasAttribute('open'),cls:el.className.toString().slice(0,50),y:Math.round(r.y),h:Math.round(r.height),txt:(el.innerText||'').trim().slice(0,60)})});
 out.docW=document.documentElement.scrollWidth; out.winW=window.innerWidth; out.docH=document.documentElement.scrollHeight;
 return out;});
fs.writeFileSync("/tmp/dom.json",JSON.stringify(info));
await b.close();
