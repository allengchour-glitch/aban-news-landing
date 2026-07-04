#!/usr/bin/env node
/* fix_policies_rewrite.mjs — schreibt CH-konforme Policy-Bodies (aus automation/policy_bodies.json) via GraphQL
 * shopPolicyUpdate. WICHTIG (2026-07-04): Shopify-Policies sind NICHT per REST PUT /policies/{id}.json schreibbar
 * (liefert HTTP 406) → deshalb GraphQL `shopPolicyUpdate(shopPolicy:{type,body})`. Das erklaerte auch, warum die
 * fruehere REST-Variante die Versand-Policy nie geaendert hat.
 * policy_bodies.json = { "shipping":"<html>", "refund":"<html>", "privacy_addendum":"<html>" } (Teilmenge erlaubt).
 * Idempotent: privacy-Addendum nur wenn Marker fehlt; shipping/refund nur wenn Body abweicht. DRY (default), GO=1 schreibt.
 * ENV: SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [GO=1] · [SHOPIFY_SHOP]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const AT=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const GO=process.env.GO==='1'; const API='2025-01';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
mkdirSync('reports',{recursive:true});
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/fix-policies-rewrite.txt', out.join('\n')+'\n'); }catch{} };
let BODIES={}; try{ BODIES=JSON.parse(readFileSync('automation/policy_bodies.json','utf8')); }catch(e){ W('Keine policy_bodies.json → No-op ('+e.message+').'); process.exit(0); }
if(!AT && !(CID&&CSEC)){ W('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
let tok=AT&&await works(AT)?AT:null; if(!tok&&CID&&CSEC){ const t=await cc(); if(t&&await works(t)) tok=t; }
if(!tok){ W('❌ Auth'); process.exit(0); }

// aktuelle Policies (type -> body)
const cur=await gql(tok,`{ shop{ shopPolicies{ type body } } }`);
const pols=cur?.data?.shop?.shopPolicies||[];
if(!pols.length){ W('Keine shopPolicies gelesen: '+JSON.stringify(cur?.errors||'').slice(0,150)); process.exit(0); }
const bodyOf=t=>(pols.find(p=>p.type===t)?.body)||'';
W(`${pols.length} shopPolicies gelesen: ${pols.map(p=>p.type).join(', ')}`);

const PRIVACY_MARKER='Datenschutz nach Schweizer Recht';
const MUT=`mutation($p:ShopPolicyInput!){ shopPolicyUpdate(shopPolicy:$p){ shopPolicy{ type } userErrors{ field message } } }`;
let changed=0;
async function upd(type,newBody,label){
  if(!GO){ W(`   [DRY] wuerde ${label} (${type}) schreiben (${newBody.length} Zeichen).`); return; }
  const r=await gql(tok,MUT,{p:{type, body:newBody}});
  const ue=r?.data?.shopPolicyUpdate?.userErrors||[];
  if(ue.length){ W('   ✗ '+JSON.stringify(ue).slice(0,160)); }
  else if(r?.errors){ W('   ✗ gql '+JSON.stringify(r.errors).slice(0,160)); }
  else { W('   ✓ geschrieben.'); changed++; }
}

if(BODIES.shipping){ const b=bodyOf('SHIPPING_POLICY');
  if(b.trim()===BODIES.shipping.trim()){ W('Shipping: schon aktuell.'); }
  else { W('Shipping: Body ersetzen.'); await upd('SHIPPING_POLICY', BODIES.shipping, 'Shipping'); } }

if(BODIES.refund){ const b=bodyOf('REFUND_POLICY');
  if(b.trim()===BODIES.refund.trim()){ W('Refund: schon aktuell.'); }
  else { W('Refund: Body ersetzen.'); await upd('REFUND_POLICY', BODIES.refund, 'Refund'); } }

if(BODIES.privacy_addendum){ const b=bodyOf('PRIVACY_POLICY');
  if(b.includes(PRIVACY_MARKER)){ W('Privacy: revDSG-Abschnitt schon vorhanden.'); }
  else { W('Privacy: revDSG-Abschnitt voranstellen.'); await upd('PRIVACY_POLICY', BODIES.privacy_addendum+'\n'+b, 'Privacy(prepend)'); } }

W(`\nFertig: ${changed} geschrieben${GO?'':' (DRY — GO=1 zum Schreiben)'}.`);
