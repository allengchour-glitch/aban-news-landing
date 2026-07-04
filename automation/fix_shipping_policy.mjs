#!/usr/bin/env node
/* fix_shipping_policy.mjs — korrigiert die Versand-Policy per Shopify-API (shopPolicyUpdate).
 * Audit: /policies/shipping-policy sagt „ab CHF 65" → auf CHF 50 angleichen (eine Wahrheit). NUR exakte Strings.
 * DRY_RUN=1 = nur zeigen. No-op ohne Creds.
 * ENV: SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [DRY_RUN=1] · [SHOPIFY_SHOP]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
const AT=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
const API='2025-01';
try{ mkdirSync('reports',{recursive:true}); }catch{}
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/fix-shipping-policy.txt', out.join('\n')+'\n'); }catch{} };
if(!AT && !(CID&&CSEC)){ W('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
const tok = AT || await cc();
if(!tok){ W('❌ Kein Token.'); process.exit(0); }
async function gql(q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
const REPL=[['ab CHF 65','ab CHF 50'],['CHF 65','CHF 50'],['ab 65','ab 50'],['2–7 Werktage','5–12 Werktage'],['2-7 Werktage','5–12 Werktage']];

const r=await gql(`{ shop{ shippingPolicy{ id body } } }`);
const p=r?.data?.shop?.shippingPolicy;
if(!p?.id){ W('Keine Versand-Policy vorhanden (nichts zu tun).'); process.exit(0); }
let body=p.body||'', hits=[];
for(const [a,b] of REPL){ if(body.includes(a)){ const n=body.split(a).length-1; body=body.split(a).join(b); hits.push(`"${a}"→"${b}" ×${n}`); } }
if(!hits.length){ W('Versand-Policy: keine Ziel-Strings (CHF 65 / 2–7) gefunden — evtl. schon korrekt oder anderer Wortlaut.'); process.exit(0); }
W('Versand-Policy Ersetzungen:'); hits.forEach(h=>W('   '+h));
if(DRY){ W('[DRY] nicht geschrieben.'); process.exit(0); }
const up=await gql(`mutation($p:ShopPolicyInput!){ shopPolicyUpdate(shopPolicy:$p){ userErrors{ field message } shopPolicy{ id } } }`,{p:{id:p.id, body}});
const ue=up?.data?.shopPolicyUpdate?.userErrors||[];
if(ue.length){ W('✗ Fehler: '+JSON.stringify(ue).slice(0,160)); } else { W('✓ Versand-Policy aktualisiert (CHF 50 / 5–12 Werktage).'); }
