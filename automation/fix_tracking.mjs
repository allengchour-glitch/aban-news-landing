#!/usr/bin/env node
/* fix_tracking.mjs — repariert einen kaputten/fehlenden Tracking-LINK an einer bereits versandten Bestellung.
 * Hintergrund: #1004 (LED-Laterne, an Romy Marti/Grenchen, BigBuy) hat Tracking-Nr 8420327578013, aber die
 * hinterlegte URL war „https://8420327578013" = kaputt → der Kunden-Tracking-Link ging ins Leere.
 * Fix: setzt einen funktionierenden Universal-Tracker-Link (parcelsapp, erkennt Carrier automatisch) mit derselben
 * Nummer. Ändert NUR den Link, wenn die aktuelle URL fehlt/kaputt ist (idempotent). Kunde wird NICHT neu benachrichtigt
 * (NOTIFY=1 um doch zu benachrichtigen). No-op ohne Creds.
 * ENV: ORDER_NAME (default 1004) · SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [NOTIFY=1] · [DRY_RUN=1]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
const AT=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const NAME=(process.env.ORDER_NAME||'1004').replace(/^#/,'').trim();
const NOTIFY=process.env.NOTIFY==='1'; const DRY=process.env.DRY_RUN==='1';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
const API='2025-01';
try{ mkdirSync('reports',{recursive:true}); }catch{}
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync(`reports/fix-tracking-${NAME}.txt`, out.join('\n')+'\n'); }catch{} };
if(!AT && !(CID&&CSEC)){ W('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
const tok = AT || await cc();
if(!tok){ W('❌ Kein Token.'); process.exit(0); }
async function gql(q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
const Q=`query($q:String!){ orders(first:1, query:$q){ edges{ node{ name fulfillments(first:5){ id status trackingInfo{ number url company } } } } } }`;
const r=await gql(Q,{q:`name:${NAME}`});
const o=(r?.data?.orders?.edges||[]).map(e=>e.node)[0];
if(!o){ W(`Keine Bestellung #${NAME} gefunden.`); process.exit(0); }
const fs=(o.fulfillments||[]).filter(f=>f.status==='SUCCESS'||f.status==='success'||true);
if(!fs.length){ W(`#${NAME}: keine Sendung/Fulfillment vorhanden → nichts zu reparieren.`); process.exit(0); }
const FORCE=process.env.FORCE==='1';
// echte Carrier-Nummer = längster reiner Ziffernblock (>=8) aus URL ODER Nummer (bb-... = BigBuy-Interne, nicht trackbar)
const carrierNum = ti => { const cand=[String(ti.url||''),String(ti.number||'')].map(s=>(s.match(/\d{8,}/)||[])[0]).filter(Boolean); return cand[0]||String(ti.number||''); };
const okUrl = u => /^https?:\/\/[^\/]+\.[^\/]+/.test(String(u||''));
const M=`mutation($id:ID!,$ti:FulfillmentTrackingInput!,$n:Boolean){ fulfillmentTrackingInfoUpdate(fulfillmentId:$id, trackingInfoInput:$ti, notifyCustomer:$n){ fulfillment{ id trackingInfo{ number url company } } userErrors{ field message } } }`;
let fixed=0;
for(const f of fs){
  const ti=(f.trackingInfo||[])[0]||{};
  W(`#${NAME} Fulfillment ${f.id} · status=${f.status} · Nr=${ti.number||'—'} · URL=${ti.url||'—'} · Carrier=${ti.company||'—'}`);
  if(!ti.number){ W('   → keine Tracking-Nummer, überspringe.'); continue; }
  const cn=carrierNum(ti);
  if(!FORCE && okUrl(ti.url) && String(ti.url).includes(cn)){ W('   → URL bereits gültig + enthält Carrier-Nummer, keine Änderung (idempotent).'); continue; }
  const newUrl=`https://parcelsapp.com/en/tracking/${encodeURIComponent(cn)}`;
  W(`   → kaputte/fehlende URL → setze funktionierenden Link: ${newUrl}${NOTIFY?' (+Kunde benachrichtigen)':' (ohne Kunden-Mail)'}`);
  if(DRY){ W('   [DRY] nichts geändert.'); continue; }
  const rr=await gql(M,{id:f.id, ti:{ number:ti.number, url:newUrl, company: ti.company||'BigBuy' }, n:NOTIFY});
  const ue=rr?.data?.fulfillmentTrackingInfoUpdate?.userErrors||[];
  if(ue.length){ W('   ✗ Fehler: '+JSON.stringify(ue).slice(0,160)); continue; }
  const nti=rr?.data?.fulfillmentTrackingInfoUpdate?.fulfillment?.trackingInfo?.[0]||{};
  W('   ✓ aktualisiert → URL='+(nti.url||'?')); fixed++;
}
W(`\nFertig: ${fixed} Sendung(en) repariert.`);
