#!/usr/bin/env node
/* fix_theme_shipping.mjs — behebt die Ehrlichkeits-Verstösse im THEME (Announcement-Banner) per Shopify-Asset-API.
 * Audit 2026-07-04: Header „Gratis-Versand ab CHF 65 · Schneller Versand aus EU-Lager · 2–7 Werktage" widerspricht
 * den Policy-Seiten (CHF 50 / 5–12 Tage) = verbotenes Über-Versprechen + Schwellen-Widerspruch.
 * Ansatz: aktives Theme finden, Kandidaten-Assets (settings_data.json, locales, sections/snippets/templates .liquid)
 * lesen, NUR EXAKTE Ziel-Strings ersetzen, geänderte Assets zurückschreiben. Jede Ersetzung wird geloggt (reversibel).
 * ⚠️ SICHER: nur exakte Strings unten; nichts anderes wird angefasst. DRY_RUN=1 = nur zeigen. GO default.
 * ENV: SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [DRY_RUN=1] · [SHOPIFY_SHOP]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
const AT=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
const API='2025-01';
try{ mkdirSync('reports',{recursive:true}); }catch{}
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/fix-theme-shipping.txt', out.join('\n')+'\n'); }catch{} };
if(!AT && !(CID&&CSEC)){ W('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
const tok = AT || await cc();
if(!tok){ W('❌ Kein Token.'); process.exit(0); }
const H={'X-Shopify-Access-Token':tok,'Content-Type':'application/json'};
async function rest(path,method,body){ const r=await fetch(`https://${SHOP}/admin/api/${API}/${path}`,{method:method||'GET',headers:H,body:body?JSON.stringify(body):undefined}); const t=await r.text(); let j=null; try{j=JSON.parse(t);}catch{} return {status:r.status,j,t}; }

// EXAKTE Ersetzungen (nur diese; alles andere unangetastet)
const REPL=[
  ['ab CHF 65','ab CHF 50'], ['CHF 65','CHF 50'], ['ab 65','ab 50'],
  ['2–7 Werktage','5–12 Werktage'], ['2-7 Werktage','5–12 Werktage'],
  ['2–7 Tage','5–12 Tage'], ['2-7 Tage','5–12 Tage'],
];
const applyRepl=(s)=>{ let v=s, hits=[]; for(const [a,b] of REPL){ if(v.includes(a)){ const n=v.split(a).length-1; v=v.split(a).join(b); hits.push(`"${a}"→"${b}" ×${n}`); } } return {v,hits}; };

// 1) aktives Theme
const th=await rest('themes.json');
const theme=(th.j?.themes||[]).find(t=>t.role==='main')||(th.j?.themes||[])[0];
if(!theme){ W('❌ Kein Theme gefunden.'); process.exit(0); }
W(`Theme: ${theme.name} (id ${theme.id}, role ${theme.role})`);

// 2) Asset-Liste, Kandidaten filtern
const al=await rest(`themes/${theme.id}/assets.json`);
const keys=(al.j?.assets||[]).map(a=>a.key).filter(k=>
  k==='config/settings_data.json' || /^locales\/.*\.json$/.test(k) ||
  /^(sections|snippets|templates)\/.*\.(liquid|json)$/.test(k)
);
W(`${keys.length} Kandidaten-Assets werden geprüft…`);
let changed=0, scanned=0;
for(const key of keys){
  const a=await rest(`themes/${theme.id}/assets.json?asset[key]=${encodeURIComponent(key)}`);
  const val=a.j?.asset?.value; if(typeof val!=='string'){ continue; } scanned++;
  if(process.env.DUMP==='1'){ const lines=val.split(/\\n|\n/).filter(l=>/Werktag|Arbeitstag|EU-Lager|Lieferzeit|Lieferung|Versand|\b\d\s?[–-]\s?\d\b|CHF\s?\d/i.test(l)); if(lines.length){ W(`\n[DUMP] ${key}:`); lines.slice(0,12).forEach(l=>W('   '+l.trim().slice(0,160))); } }
  const {v,hits}=applyRepl(val);
  if(!hits.length) continue;
  W(`\n${key}:`); hits.forEach(h=>W('   '+h));
  if(DRY){ W('   [DRY] nicht geschrieben.'); continue; }
  const up=await rest(`themes/${theme.id}/assets.json`,'PUT',{asset:{key,value:v}});
  if(up.status>=200&&up.status<300){ W('   ✓ geschrieben.'); changed++; }
  else { W('   ✗ Fehler '+up.status+' '+String(up.t).slice(0,120)); }
  await new Promise(x=>setTimeout(x,300));
}
W(`\nFertig: ${scanned} Assets gescannt, ${changed} geändert${DRY?' (DRY)':''}.`);
if(!changed && !DRY) W('Hinweis: keine Ziel-Strings gefunden — evtl. steht der Banner-Text in Theme-Settings unter anderem Wortlaut. reports/fix-theme-shipping.txt + settings_data prüfen.');
