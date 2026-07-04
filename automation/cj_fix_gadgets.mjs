#!/usr/bin/env node
/* cj_fix_gadgets.mjs — bestehende CJ-Gadgets mit ECHTEN CJ-Namen neu betiteln + beschreiben.
 * Die alten cj_gadget_fill-Produkte haben ERFUNDENE Pool-Namen ("Mini-Gamekonsole" = eigentlich Beamer!).
 * Query tag:cj-real productType:Gadgets -tag:cj-realname → CJ product/query (echter Name+Specs) → Gemini
 * DE-Titel+Beschreibung (grounded) → productUpdate title/desc/seo + tag cj-realname (Dedup).
 * ENV: CJ_TOKEN · SHOPIFY_CLIENT_ID/SECRET · GEMINI(/tmp/gemini_key) · LIMIT=200 · DRY=1
 */
import fs from 'node:fs';
const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const CJT=(process.env.CJ_TOKEN||'').trim();
const GK=(fs.existsSync('/tmp/gemini_key')?fs.readFileSync('/tmp/gemini_key','utf8'):'').trim();
const DRY=process.env.DRY==='1', LIMIT=parseInt(process.env.LIMIT||'200',10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TRUST=`<div style="background:#f7faf7;border:1px solid #d9e7d9;border-radius:10px;padding:11px 14px;margin:12px 0;font-size:14px;line-height:1.5;"><strong>\u{1F6E1}️ Sorglos shoppen:</strong> ✅ Geprüfte Qualität · \u{1F69A} Lieferung ca. 8–16 Tage · \u{1F504} 30 Tage Rückgabe · \u{1F1E8}\u{1F1ED} Schweizer Shop · \u{1F4B3} TWINT, Karte & Klarna.</div>\n<p>Gratis-Versand ab CHF 50 · <strong>–10 % mit Code WELCOME10</strong></p>`;
async function shTok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function gql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
async function cj(sku){try{const r=await fetch(`https://developers.cjdropshipping.com/api2.0/v1/product/query?productSku=${encodeURIComponent(sku)}`,{headers:{'CJ-Access-Token':CJT}});const j=await r.json();return j.result?j.data:null;}catch{return null;}}
async function gemini(nameEn,feats){
 const prompt=`Du textest für einen Schweizer Tech-Shop. Aus dem englischen Produktnamen (+ Feature-Text) mache:
1) einen KORREKTEN, natürlichen DEUTSCHEN Produkttitel (max 62 Zeichen) – die ECHTE Produktart muss stimmen
   (z. B. wenn es ein Beamer/Projektor ist, NICHT "Gamekonsole" nennen). Keine Marke erfinden.
2) eine deutsche Beschreibung (100-160 Wörter, Galaxus-Stil, NUR aus den Fakten – nichts erfinden).
Name (EN): ${nameEn}
Features (EN): ${(feats||'').slice(0,900)}
Gib NUR gültiges JSON: {"title":"...","html":"<p>…</p><h3>Das zeichnet es aus</h3><ul><li>…</li></ul>"} (Schweizer ss, keine Fences).`;
 for(let i=0;i<3;i++){const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GK}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.5,maxOutputTokens:1600,thinkingConfig:{thinkingBudget:0},responseMimeType:'application/json'}})});
  const j=await r.json();if(j.error){if(j.error.code===429){await sleep(15000);continue;}return null;}
  try{const o=JSON.parse(j.candidates?.[0]?.content?.parts?.[0]?.text||'');if(o.title&&o.html)return o;}catch{}
 }
 return null;
}
const Q=`query($c:String){products(first:40,after:$c,query:"tag:cj-real productType:Gadgets -tag:cj-realname"){pageInfo{hasNextPage endCursor}nodes{id title variants(first:1){nodes{sku}}}}}`;
const UP=`mutation($id:ID!,$t:String!,$d:String!,$s:String!){productUpdate(input:{id:$id,title:$t,descriptionHtml:$d,seo:{title:$s}}){userErrors{message}}}`;
const TAG=`mutation($id:ID!){tagsAdd(id:$id,tags:["cj-realname"]){userErrors{message}}}`;
const T=await shTok();
let cursor=null,done=0,fixed=0;
outer: while(true){
 const r=await gql(T,Q,{c:cursor}); const conn=r.data?.products; if(!conn){console.log('q fail',JSON.stringify(r).slice(0,150));break;}
 for(const p of conn.nodes){
  if(fixed>=LIMIT)break outer; done++;
  const sku=(p.variants.nodes[0]?.sku||'').replace(/^CJ-/,'');
  const d=await cj(sku); await sleep(650);
  if(!d||!d.productNameEn){continue;}
  const feats=(d.description||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const g=await gemini(d.productNameEn,feats); await sleep(4200);
  if(!g){continue;}
  const nt=g.title.slice(0,70);
  if(DRY){if(fixed<12)console.log(`  ${p.title}  →  ${nt}`);fixed++;continue;}
  const html=`${g.html}\n${TRUST}`;
  const ur=await gql(T,UP,{id:p.id,t:nt,d:html,s:(nt+' | LuxeStyle CH').slice(0,70)});
  if((ur.data?.productUpdate?.userErrors||[]).length){continue;}
  await gql(T,TAG,{id:p.id}); fixed++;
  if(fixed%20===0)console.log(`  ${fixed} Gadgets gefixt…`);
 }
 if(!conn.pageInfo.hasNextPage)break; cursor=conn.pageInfo.endCursor;
}
console.log(`\nFERTIG: ${fixed}/${done} CJ-Gadgets neu betitelt+beschrieben${DRY?' [DRY]':''}.`);
