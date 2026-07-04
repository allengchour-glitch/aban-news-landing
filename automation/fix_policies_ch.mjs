#!/usr/bin/env node
/* fix_policies_ch.mjs — korrigiert die Shop-Policies (Versand/Rückgabe/AGB/Datenschutz) auf STRIKT-CH + CHF 50 per
 * REST /policies.json. Audit 2026-07-04: shipping „ab CHF 65" + „weltweit (EU/UK/USA…)"; refund „EU-14T"; Zahlen
 * inkonsistent (CHF 50 vs 65, 5-12 vs 7-12). DUMP=1 druckt die echten Bodies; GO=1 wendet die REPL an (PUT).
 * ⚠️ Nur exakte Ziel-Strings. No-op ohne Creds.
 * ENV: SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [DUMP=1] · [GO=1] · [SHOPIFY_SHOP]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
const AT=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DUMP=process.env.DUMP==='1'; const GO=process.env.GO==='1';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
const API='2025-01';
try{ mkdirSync('reports',{recursive:true}); }catch{}
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/fix-policies-ch.txt', out.join('\n')+'\n'); }catch{} };
if(!AT && !(CID&&CSEC)){ W('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
const tok = AT || await cc();
if(!tok){ W('❌ Kein Token.'); process.exit(0); }
const H={'X-Shopify-Access-Token':tok,'Content-Type':'application/json'};
async function rest(path,method,body){ const r=await fetch(`https://${SHOP}/admin/api/${API}/${path}`,{method:method||'GET',headers:H,body:body?JSON.stringify(body):undefined}); const t=await r.text(); let j=null; try{j=JSON.parse(t);}catch{} return {status:r.status,j,t}; }

const REPL=[
  ['CHF 65','CHF 50'], ['ab 65 CHF','ab 50 CHF'], ['65 CHF','50 CHF'],
  ['7–12 Werktage','5–12 Werktage'], ['7-12 Werktage','5–12 Werktage'],
  ['Wir versenden weltweit — Schweiz, Liechtenstein, EU, UK, USA, Kanada, Australien und mehr.','Wir versenden ausschliesslich innerhalb der Schweiz und Liechtenstein.'],
  ['Wir versenden weltweit – Schweiz, Liechtenstein, EU, UK, USA, Kanada, Australien und mehr.','Wir versenden ausschliesslich innerhalb der Schweiz und Liechtenstein.'],
  ['weltweit — Schweiz, Liechtenstein, EU, UK, USA, Kanada, Australien und mehr','ausschliesslich innerhalb der Schweiz und Liechtenstein'],
  ['weltweit – Schweiz, Liechtenstein, EU, UK, USA, Kanada, Australien und mehr','ausschliesslich innerhalb der Schweiz und Liechtenstein'],
];

const pl=await rest('policies.json');
if(pl.status!==200 || !pl.j?.policies){ W('Policies-Read fehlgeschlagen: '+pl.status+' '+String(pl.t).slice(0,200)); process.exit(0); }
W(`${pl.j.policies.length} Policies gefunden.`);
let changed=0;
for(const p of pl.j.policies){
  const title=p.title||''; const body=p.body||'';
  if(DUMP){ W(`\n===== ${title} (${p.id}) =====`); W(body.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').slice(0,1600)); continue; }
  let nb=body, hits=[];
  for(const [a,b] of REPL){ if(nb.includes(a)){ const n=nb.split(a).length-1; nb=nb.split(a).join(b); hits.push(`"${a.slice(0,44)}"→"${b.slice(0,30)}" ×${n}`); } }
  if(!hits.length){ W(`${title}: keine Ziel-Strings.`); continue; }
  W(`\n${title}:`); hits.forEach(h=>W('   '+h));
  if(!GO){ W('   [DRY] nicht geschrieben.'); continue; }
  const up=await rest(`policies/${p.id}.json`,'PUT',{policy:{id:p.id, body:nb}});
  if(up.status>=200&&up.status<300){ W('   ✓ geschrieben.'); changed++; } else { W('   ✗ Fehler '+up.status+' '+String(up.t).slice(0,140)); }
}
W(`\nFertig: ${changed} geändert${DUMP?' (Dump)':(GO?'':' (DRY)')}.`);
