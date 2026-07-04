#!/usr/bin/env node
/* fix_policies_rewrite.mjs — schreibt CH-konforme Policy-Bodies (aus automation/policy_bodies.json) via REST /policies.json.
 * Grund: exakter Find-Replace (fix_policies_ch.mjs) griff nicht (HTML/Entities/Dash-Varianten). Hier ersetzen wir GANZE
 * Bodies bzw. stellen bei der Datenschutzerklaerung einen revDSG-Abschnitt idempotent VORAN (GET->modify->PUT).
 * policy_bodies.json = { "shipping":"<html>", "refund":"<html>", "privacy_addendum":"<html>" }  (Teilmenge erlaubt).
 * Idempotent: privacy-Addendum nur wenn Marker noch nicht drin; shipping/refund nur wenn Body abweicht.
 * DRY (default) listet nur; GO=1 schreibt. No-op ohne Creds/Datei.
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
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
const tok = AT || await cc(); if(!tok){ W('❌ Kein Token.'); process.exit(0); }
const H={'X-Shopify-Access-Token':tok,'Content-Type':'application/json'};
async function rest(path,method,body){ const r=await fetch(`https://${SHOP}/admin/api/${API}/${path}`,{method:method||'GET',headers:H,body:body?JSON.stringify(body):undefined}); const t=await r.text(); let j=null; try{j=JSON.parse(t);}catch{} return {status:r.status,j,t}; }

const pl=await rest('policies.json');
if(pl.status!==200 || !pl.j?.policies){ W('Policies-Read fehlgeschlagen: '+pl.status); process.exit(0); }
const find=re=>pl.j.policies.find(p=>re.test(p.title||''));
const PRIVACY_MARKER='Datenschutz nach Schweizer Recht';
let changed=0;
async function put(p,newBody,label){
  if(!GO){ W(`   [DRY] wuerde ${label} schreiben (${newBody.length} Zeichen).`); return; }
  const up=await rest(`policies/${p.id}.json`,'PUT',{policy:{id:p.id, body:newBody}});
  if(up.status>=200&&up.status<300){ W('   ✓ geschrieben.'); changed++; } else { W('   ✗ Fehler '+up.status+' '+String(up.t).slice(0,140)); }
}

// SHIPPING (ganzer Body)
if(BODIES.shipping){ const p=find(/shipping|versand/i);
  if(!p){ W('Shipping-Policy nicht gefunden.'); }
  else if((p.body||'').trim()===BODIES.shipping.trim()){ W('Shipping: schon aktuell.'); }
  else { W(`Shipping „${p.title}": Body ersetzen.`); await put(p, BODIES.shipping, 'Shipping'); } }

// REFUND (ganzer Body)
if(BODIES.refund){ const p=find(/refund|r(ü|ue)ckgab|return/i);
  if(!p){ W('Refund-Policy nicht gefunden.'); }
  else if((p.body||'').trim()===BODIES.refund.trim()){ W('Refund: schon aktuell.'); }
  else { W(`Refund „${p.title}": Body ersetzen.`); await put(p, BODIES.refund, 'Refund'); } }

// PRIVACY (revDSG-Abschnitt idempotent voranstellen)
if(BODIES.privacy_addendum){ const p=find(/privacy|datenschutz/i);
  if(!p){ W('Privacy-Policy nicht gefunden.'); }
  else if((p.body||'').includes(PRIVACY_MARKER)){ W('Privacy: revDSG-Abschnitt schon vorhanden.'); }
  else { W(`Privacy „${p.title}": revDSG-Abschnitt voranstellen.`); await put(p, BODIES.privacy_addendum + '\n' + (p.body||''), 'Privacy(prepend)'); } }

W(`\nFertig: ${changed} geschrieben${GO?'':' (DRY — GO=1 zum Schreiben)'}.`);
