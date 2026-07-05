#!/usr/bin/env node
/* enrich_winner_pdp.mjs — haengt einen ehrlichen Material-/Trust-/FAQ-Block an die Winner-PDP-Beschreibungen an
 * (aus automation/winner_pdp_blocks.json = [{handle, trust_block_html}]). ERGAENZT nur, ersetzt NIE die bestehende
 * Copy. Idempotent per Marker <!--luxe-trustblock-->. DRY (default) / GO=1. No-op ohne Creds/Datei.
 * ENV: SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [GO=1] · [SHOPIFY_SHOP]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const AT=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const GO=process.env.GO==='1'; const API='2025-01'; const MARK='<!--luxe-trustblock-->';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
mkdirSync('reports',{recursive:true});
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/enrich-winner-pdp.txt', out.join('\n')+'\n'); }catch{} };
let BL=[]; try{ BL=JSON.parse(readFileSync('automation/winner_pdp_blocks.json','utf8')); }catch(e){ W('Keine winner_pdp_blocks.json → No-op.'); process.exit(0); }
if(!AT && !(CID&&CSEC)){ W('Keine Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
let tok=AT&&await works(AT)?AT:null; if(!tok&&CID&&CSEC){ const t=await cc(); if(t&&await works(t)) tok=t; }
if(!tok){ W('❌ Auth'); process.exit(0); }
const Q=`query($q:String!){ products(first:1, query:$q){ edges{ node{ id handle descriptionHtml } } } }`;
const U=`mutation($id:ID!,$b:String!){ productUpdate(input:{id:$id, descriptionHtml:$b}){ userErrors{ message } } }`;
let done=0, already=0, miss=0;
for(const b of BL){
  if(!b.handle||!b.trust_block_html){ continue; }
  const n=(await gql(tok,Q,{q:`handle:${b.handle}`}))?.data?.products?.edges?.[0]?.node;
  if(!n||n.handle!==b.handle){ W('? nicht gefunden: '+b.handle); miss++; continue; }
  if((n.descriptionHtml||'').includes(MARK)){ W('= schon veredelt: '+b.handle); already++; continue; }
  const nb=(n.descriptionHtml||'') + '\n' + MARK + '\n' + b.trust_block_html;
  if(!GO){ W('[DRY] wuerde anhaengen: '+b.handle+' (+'+b.trust_block_html.length+' Zeichen)'); continue; }
  const u=await gql(tok,U,{id:n.id,b:nb}); const ue=u?.data?.productUpdate?.userErrors||[];
  if(ue.length){ W('✗ '+b.handle+': '+JSON.stringify(ue).slice(0,90)); } else { W('✓ veredelt: '+b.handle); done++; }
  await new Promise(x=>setTimeout(x,220));
}
W(`\nFertig: ${done} veredelt, ${already} schon, ${miss} fehlt${GO?'':' (DRY — GO=1)'}.`);
