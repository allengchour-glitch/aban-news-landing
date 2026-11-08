// Nur simulierte Stripe-Antworten und Demo-IDs; keine Käufe oder Netzaufrufe.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
const source=readFileSync(new URL('./api/kit-download.js',import.meta.url),'utf8');
const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
let checks=0;
const env={STRIPE_API_KEY:'demo-key',DOWNLOAD_SALT:'demo-salt'};
const paid={payment_status:'paid',metadata:{slug:'demo-kit'}};
async function request({config=env,id='cs_test_demo',status=200,body=paid,fail=false}={}){
 let calls=0;
 globalThis.fetch=async(url,options)=>{
  calls++;assert.equal(url,'https://api.stripe.com/v1/checkout/sessions/cs_test_demo');
  assert.equal(options.headers.Authorization,'Bearer demo-key');assert.ok(options.signal);
  if(fail)throw new Error('Demo-Netzfehler');
  return new Response(JSON.stringify(body),{status});
 };
 const response=await api.onRequestGet({request:new Request('https://demo.invalid/api/kit-download?session_id='+encodeURIComponent(id)),env:config});
 assert.equal(response.headers.get('cache-control'),'no-store');
 return {status:response.status,data:await response.json(),calls};
}
for(const config of [{STRIPE_API_KEY:'demo-key'},{...env,DOWNLOAD_SALT:'  '},{DOWNLOAD_SALT:'demo-salt'}]){
 const r=await request({config});assert.equal(r.status,503);assert.equal(r.calls,0);assert.ok(!r.data.url);checks++;
}
{
 const r=await request({config:{STRIPE_API_KEY:' demo-key ',DOWNLOAD_SALT:' demo-salt\n'}});
 assert.equal(r.status,200);assert.equal(r.data.url,'/downloads/kits/'+createHash('sha256').update('demo-kit:demo-salt').digest('hex').slice(0,24)+'.zip');checks++;
}
for(const payment_status of ['unpaid','no_payment_required']){
 const r=await request({body:{...paid,payment_status}});assert.equal(r.status,402);assert.ok(!r.data.url);checks++;
}
for(const status of [401,403,429,500]){
 const r=await request({status});assert.equal(r.status,503);assert.ok(!r.data.url);assert.equal(r.calls,1);checks++;
}
assert.equal((await request({status:404})).status,404);checks++;
assert.equal((await request({fail:true})).status,502);checks++;
for(const body of [null,{},'kein Objekt']){assert.equal((await request({body})).status,502);checks++;}
assert.equal((await request({body:{payment_status:'paid',metadata:{}}})).status,422);checks++;
{
 const r=await request({id:'../fremd'});assert.equal(r.status,400);assert.equal(r.calls,0);checks++;
}
const html=readFileSync(new URL('../danke-kit.html',import.meta.url),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function page(replies,search='?session_id=cs_test_demo'){
 const box={textContent:'',innerHTML:''},button={hidden:true,disabled:false,addEventListener(type,fn){this.click=fn;}};
 let calls=0;
 vm.runInNewContext(script,{document:{getElementById:id=>id==='box'?box:button},location:{search},URLSearchParams,fetch:async(url,opts)=>{
  assert.equal(opts.cache,'no-store');assert.equal(opts.referrerPolicy,'no-referrer');
  const data=replies[calls++];if(data instanceof Error)throw data;
  return {json:async()=>data};
 }});
 return {box,button,calls:()=>calls};
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
console.log(`${checks} ok, 0 Fehler`);
