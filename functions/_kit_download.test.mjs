// Nur simulierte Stripe-Antworten und Demo-IDs; keine Käufe oder Netzaufrufe.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
const source=readFileSync(new URL('./api/kit-download.js',import.meta.url),'utf8');
const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
let checks=0;
const env={STRIPE_API_KEY:'demo-key',DOWNLOAD_SALT:'demo-salt',ASSETS:{}};
const paid={payment_status:'paid',metadata:{slug:'demo-kit'}};
async function request({config=env,id='cs_test_demo',status=200,body=paid,fail=false,
   verifyHang=false,bodyHang=false,capture=null,fileStatus=200,fileType='application/zip',fileSize='1024',fileFail=false,fileHang=false}={}){
 let calls=0,assetCalls=0;
 globalThis.fetch=async(url,options)=>{
  calls++;assert.equal(url,'https://api.stripe.com/v1/checkout/sessions/cs_test_demo');
  assert.equal(options.headers.Authorization,'Bearer demo-key');assert.ok(options.signal);
  if(fail)throw new Error('Demo-Netzfehler');
  if(verifyHang)return new Promise(resolve=>capture(resolve,options.signal));
  if(bodyHang)return {status:200,ok:true,json:()=>new Promise(resolve=>capture(resolve,options.signal))};
  return new Response(JSON.stringify(body),{status});
 };
 const assets={fetch:async req=>{
  assetCalls++;
  assert.equal(req.method,'HEAD');assert.equal(req.redirect,'manual');assert.ok(req.signal);
  assert.equal(req.url,'https://demo.invalid/downloads/kits/'+createHash('sha256').update(body.metadata.slug+':demo-salt').digest('hex').slice(0,24)+'.zip');
  assert.equal(req.headers.get('authorization'),null);assert.equal(req.headers.get('cookie'),null);
  if(fileFail)throw new Error('Demo-Dateifehler');
  if(fileHang)return new Promise(()=>{});
  const headers={};if(fileType!==null)headers['Content-Type']=fileType;if(fileSize!==null)headers['Content-Length']=fileSize;
  return new Response(null,{status:fileStatus,headers});
 }};
 const response=await api.onRequestGet({request:new Request('https://demo.invalid/api/kit-download?session_id='+encodeURIComponent(id),{headers:{Cookie:'nur-demo=privat'}}),env:{...config,...(config.ASSETS?{ASSETS:assets}:{})}});
 assert.equal(response.headers.get('cache-control'),'no-store');
 return {status:response.status,data:await response.json(),calls,assetCalls};
}
for(const config of [{STRIPE_API_KEY:'demo-key'},{...env,DOWNLOAD_SALT:'  '},{DOWNLOAD_SALT:'demo-salt'}]){
 const r=await request({config});assert.equal(r.status,503);assert.equal(r.calls,0);assert.ok(!r.data.url);checks++;
}
{
 const r=await request({config:{...env,STRIPE_API_KEY:' demo-key ',DOWNLOAD_SALT:' demo-salt\n'}});
 assert.equal(r.status,200);assert.equal(r.data.url,'/downloads/kits/'+createHash('sha256').update('demo-kit:demo-salt').digest('hex').slice(0,24)+'.zip');checks++;
}
for(const payment_status of ['unpaid','no_payment_required']){
 const r=await request({body:{...paid,payment_status}});assert.equal(r.status,402);assert.ok(!r.data.url);assert.equal(r.assetCalls,0);checks++;
}
for(const status of [401,403,429,500]){
 const r=await request({status});assert.equal(r.status,503);assert.ok(!r.data.url);assert.equal(r.calls,1);checks++;
}
assert.equal((await request({status:404})).status,404);checks++;
assert.equal((await request({fail:true})).status,502);checks++;
for(const body of [null,{},'kein Objekt']){assert.equal((await request({body})).status,502);checks++;}
assert.equal((await request({body:{payment_status:'paid',metadata:{}}})).status,422);checks++;
for(const slug of [123,{},[],true]){
 const r=await request({body:{...paid,metadata:{slug}}});assert.equal(r.status,422);assert.equal(r.assetCalls,0);assert.ok(!r.data.url);checks++;
}
{
 const r=await request({body:{...paid,metadata:{slug:'Demo_Kit'}}});assert.equal(r.status,200);assert.equal(r.assetCalls,1);checks++;
}
{
 const r=await request({config:{...env,ASSETS:null}});assert.equal(r.status,503);assert.equal(r.calls,0);assert.equal(r.assetCalls,0);checks++;
}
for(const fileStatus of [301,302,404,429,500]){
 const r=await request({fileStatus});assert.equal(r.status,503);assert.equal(r.calls,1);assert.equal(r.assetCalls,1);assert.ok(!r.data.url);checks++;
}
for(const fileType of ['text/html','application/json',null]){
 const r=await request({fileType});assert.equal(r.status,503);assert.ok(!r.data.url);checks++;
}
for(const fileSize of ['0','21','kaputt']){
 const r=await request({fileSize});assert.equal(r.status,503);assert.ok(!r.data.url);checks++;
}
for(const fileType of ['application/zip','application/x-zip-compressed','application/octet-stream','Application/ZIP; charset=binary']){
 const r=await request({fileType,fileSize:null});assert.equal(r.status,200);assert.equal(r.assetCalls,1);assert.ok(r.data.url);checks++;
}
{
 const r=await request({fileFail:true});assert.equal(r.status,503);assert.equal(r.assetCalls,1);assert.ok(!r.data.url);checks++;
}
{
 const start=Date.now(),r=await request({fileHang:true});assert.equal(r.status,503);assert.ok(Date.now()-start<6000);assert.equal(r.assetCalls,1);assert.ok(!r.data.url);checks++;
}
{
 const r=await request({id:'../fremd'});assert.equal(r.status,400);assert.equal(r.calls,0);checks++;
}
// Die Achtsekundenfrist muss auch greifen, wenn ein Adapter das Abort-Signal
// nicht weitergibt. Nur Demo-Antworten; die Testuhr wartet keine acht Sekunden.
for(const mode of ['verifyHang','bodyHang']){
 const realSet=globalThis.setTimeout,realClear=globalThis.clearTimeout;
 const timers=new Map();let timerId=0,finish,signal;
 globalThis.setTimeout=(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;};
 globalThis.clearTimeout=id=>timers.delete(id);
 try{
  const pending=request({[mode]:true,capture:(resolve,s)=>{finish=resolve;signal=s;}});
  await new Promise(resolve=>setImmediate(resolve));
  const deadline=[...timers.values()].find(t=>t.ms===8000);assert.ok(deadline);deadline.fn();
  const expired=Symbol('noch blockiert');
  const r=await Promise.race([pending,new Promise(resolve=>setImmediate(()=>resolve(expired)))]);
  assert.notEqual(r,expired,mode+': Abbruchsignal allein beendet die Verifizierung nicht');
  assert.equal(r.status,502);assert.equal(r.calls,1);assert.equal(r.assetCalls,0);assert.ok(!r.data.url);
  assert.equal(signal.aborted,true);assert.equal(timers.size,0);checks++;
  finish(mode==='verifyHang'?new Response(JSON.stringify(paid),{status:200}):paid);
  await new Promise(resolve=>setImmediate(resolve));
  const recovered=await request();assert.equal(recovered.status,200);assert.equal(recovered.calls,1);assert.equal(recovered.assetCalls,1);assert.equal(timers.size,0);checks++;
 }finally{globalThis.setTimeout=realSet;globalThis.clearTimeout=realClear;}
}
const html=readFileSync(new URL('../danke-kit.html',import.meta.url),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function page(replies,search='?session_id=cs_test_demo'){
 const box={textContent:'',innerHTML:''},button={hidden:true,disabled:false,addEventListener(type,fn){this.click=fn;}};
 let calls=0;const timers=new Map();let timerId=0;
 vm.runInNewContext(script,{document:{getElementById:id=>id==='box'?box:button},location:{search},URLSearchParams,AbortController,setTimeout:(fn,ms)=>{assert.equal(ms,15000);timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),fetch:async(url,opts)=>{
  assert.equal(opts.cache,'no-store');assert.equal(opts.referrerPolicy,'no-referrer');
  const data=replies[calls++];if(data instanceof Error)throw data;
  return {json:async()=>data};
 }});
 return {box,button,calls:()=>calls,expire:()=>{for(const fn of [...timers.values()])fn();},timers};
}
{
 const p=page([{error:'Zahlung noch nicht bestätigt.'},{ok:true,url:'/downloads/kits/'+ 'a'.repeat(24)+'.zip'}]);
 await settle();assert.equal(p.calls(),1);assert.equal(p.button.hidden,false);assert.match(p.box.textContent,/nicht nochmals kaufen/);
 p.button.click();assert.equal(p.button.disabled,true);await settle();assert.equal(p.calls(),2);assert.equal(p.button.hidden,true);assert.match(p.box.innerHTML,/Kit herunterladen/);checks++;
}
{
 const p=page([new Error('Demo offline')]);await settle();assert.equal(p.button.hidden,false);assert.equal(p.button.disabled,false);checks++;
}
{
 const p=page([{ok:true,url:'https://fremd.invalid/datei'}]);await settle();assert.equal(p.button.hidden,false);assert.ok(!p.box.innerHTML.includes('fremd.invalid'));checks++;
}
{
 const p=page([{error:'<img src=x onerror=alert(1)>'}]);await settle();assert.match(p.box.textContent,/<img/);assert.equal(p.box.innerHTML,'');checks++;
}
{
 const p=page([], '');await settle();assert.equal(p.calls(),0);assert.equal(p.button.hidden,true);checks++;
}
{
 let finish;const hanging=new Promise(resolve=>{finish=resolve;});
 const p=page([hanging,{ok:true,url:'/downloads/kits/'+'b'.repeat(24)+'.zip'}]);
 await settle();assert.equal(p.button.hidden,true);assert.equal(p.calls(),1);
 p.expire();await settle();assert.equal(p.button.hidden,false);assert.equal(p.button.disabled,false);assert.match(p.box.textContent,/nicht nochmals kaufen/);assert.equal(p.calls(),1);checks++;
 p.button.click();await settle();assert.equal(p.calls(),2);assert.match(p.box.innerHTML,/Kit herunterladen/);assert.equal(p.timers.size,0);checks++;
 finish({ok:true,url:'/downloads/kits/'+'c'.repeat(24)+'.zip'});await settle();assert.ok(!p.box.innerHTML.includes('c'.repeat(24)));assert.equal(p.calls(),2);checks++;
}
// Fehlende/defekte Rückkehrkennung ist kein Grund für einen erneuten Kauf.
for (const search of ['', '?session_id=', '?session_id=ungueltig', '?session_id=%3Cimg%3E']) {
 const p=page([],search);await settle();
 assert.equal(p.calls(),0);assert.equal(p.button.hidden,true);assert.equal(p.timers.size,0);
 assert.match(p.box.textContent,/Bestellkennung/);assert.match(p.box.textContent,/nicht nochmals kaufen/);
 assert.doesNotMatch(p.box.textContent,/Bitte über den Shop kaufen/);checks++;
}
assert.doesNotMatch(html,/<h1>Danke für deinen Kauf!/);checks++;
console.log(`${checks} ok, 0 Fehler`);
