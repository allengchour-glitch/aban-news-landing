#!/usr/bin/env node
/* delivery_watchdog.mjs — proaktiver Liefer-Wächter. Lehre aus #1004 (8 Tage bei „order ready" hängen geblieben,
 * erst gemerkt als der Kunde fragte). Prüft alle erfüllten Bestellungen und FLAGGT Sendungen, die vor >N Tagen
 * als versandt markiert wurden, aber noch NICHT zugestellt sind → damit wir Kunden informieren / Lieferant chasen
 * KÖNNEN, bevor der Kunde wartet. Schreibt reports/delivery-watchdog.txt + stempelt Metafeld luxe.stuck_shipments.
 * Read-only auf Shopify (kein Kunden-Mail-Versand). No-op ohne Creds.
 * ENV: SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [STUCK_DAYS=7] · [SHOPIFY_SHOP]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
const AT=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const STUCK_DAYS=parseInt(process.env.STUCK_DAYS||'7',10);
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
const API='2025-01';
try{ mkdirSync('reports',{recursive:true}); }catch{}
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/delivery-watchdog.txt', out.join('\n')+'\n'); }catch{} };
if(!AT && !(CID&&CSEC)){ W('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
const tok = AT || await cc();
if(!tok){ W('❌ Kein Token.'); process.exit(0); }
async function gql(q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
const Q=`query($after:String){ orders(first:50, after:$after, query:"fulfillment_status:fulfilled"){ pageInfo{hasNextPage endCursor} edges{ node{
  name createdAt customer{ firstName lastName } shippingAddress{ city countryCodeV2 }
  fulfillments(first:5){ createdAt displayStatus trackingInfo{ number url company } }
} } } }`;
const now=Date.now(); let after=null, total=0, stuck=[], delivered=0;
while(true){
  const r=await gql(Q,{after}); const conn=r?.data?.orders; if(!conn){ W('Fehler: '+JSON.stringify(r?.errors||r).slice(0,200)); break; }
  for(const {node:o} of conn.edges){
    for(const f of (o.fulfillments||[])){
      total++;
      const ageD=Math.floor((now-new Date(f.createdAt).getTime())/86400000);
      const st=(f.displayStatus||'').toUpperCase();
      if(st==='DELIVERED'){ delivered++; continue; }
      if(ageD>STUCK_DAYS){
        const ti=(f.trackingInfo||[])[0]||{};
        stuck.push(`${o.name} · ${o.customer?.firstName||''} ${o.customer?.lastName||''} (${o.shippingAddress?.city||'?'}) · seit ${ageD} T versandt · Status=${st||'—'} · ${ti.company||'?'} ${ti.number||'—'}`);
      }
    }
  }
  if(!conn.pageInfo?.hasNextPage) break; after=conn.pageInfo.endCursor;
}
W(`Liefer-Watchdog: ${total} Sendungen geprüft, ${delivered} zugestellt, ${stuck.length} HÄNGEN >${STUCK_DAYS} Tage ohne Zustellung.`);
if(stuck.length){ W('\n🔴 HÄNGENDE SENDUNGEN (Lieferant chasen / Kunde informieren):'); stuck.forEach(s=>W('  • '+s)); }
else W('✓ Keine hängenden Sendungen.');
// Metafeld stempeln (für Cloud-Sicht)
try{
  const sid=(await gql('{shop{id}}'))?.data?.shop?.id;
  if(sid) await gql('mutation($m:[MetafieldsSetInput!]!){metafieldsSet(metafields:$m){userErrors{message}}}',{m:[{ownerId:sid,namespace:'luxe',key:'stuck_shipments',type:'multi_line_text_field',value:(stuck.join('\n')||'keine').slice(0,480)}]});
}catch{}
