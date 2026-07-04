#!/usr/bin/env node
/* keycheck.mjs — prüft, welche Secrets (aus luxe-secrets.ps1 / ENV) vorhanden UND gültig sind, OHNE Werte zu leaken.
 * Läuft auf dem PC (nach `. luxe-secrets.ps1`). Cloud = die meisten leer (erwartet). Schreibt reports/keycheck.txt.
 * SICHERHEIT: gibt NIE einen Secret-Wert aus — nur present:yes/no, valid:yes/no, Länge. Die (halb-öffentliche)
 * SHOPIFY_CLIENT_ID wird gezeigt (steht eh im Memory); alle *_SECRET/*_KEY/*_TOKEN nur maskiert.
 * ENV: liest alles aus process.env. Keine Args.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
try{ mkdirSync('reports',{recursive:true}); }catch{}
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/keycheck.txt', out.join('\n')+'\n'); }catch{} };
const has=v=>{ const x=(process.env[v]||'').trim(); return x?`ja (len ${x.length})`:'NEIN'; };
const g=v=>(process.env[v]||'').trim();

W('# LuxeStyle Key-Check '+new Date().toISOString());
W('# (nur present/valid — NIE der Wert)\n');

// --- SHOPIFY (kritisch für policies-ch / chf65-sweep / swissness) ---
const CID=g('SHOPIFY_CLIENT_ID'), CSEC=g('SHOPIFY_CLIENT_SECRET'), AT=g('SHOPIFY_ADMIN_TOKEN');
let SHOP=g('SHOPIFY_SHOP').replace(/^https?:\/\//,'').replace(/\/.*$/,''); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
W('## Shopify (Writes: policies-ch, chf65-sweep, swissness)');
W('  SHOPIFY_CLIENT_ID     = '+(CID||'(leer)')+(CID==='ffe6c3a1326affdd7f461760ac1a8950'?'  ✓ richtige installierte App':(CID?'  ⚠️ NICHT die verifizierte App-ID (soll ffe6c3a1326affdd7f461760ac1a8950 sein)':'')));
W('  SHOPIFY_CLIENT_SECRET = '+has('SHOPIFY_CLIENT_SECRET'));
W('  SHOPIFY_ADMIN_TOKEN   = '+has('SHOPIFY_ADMIN_TOKEN'));
async function shopifyValid(){
  try{
    let tok=AT;
    if(!tok && CID && CSEC){
      const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});
      const j=await r.json().catch(()=>({})); tok=j.access_token||''; if(!tok){ return '❌ token-exchange fehlgeschlagen ('+r.status+' '+JSON.stringify(j).slice(0,80)+')'; }
    }
    if(!tok) return '⏭️ keine Creds → übersprungen';
    const q=await fetch(`https://${SHOP}/admin/api/2025-01/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:'{shop{name}}'})});
    const jj=await q.json().catch(()=>({})); const name=jj?.data?.shop?.name;
    return name?('✅ gültig — Shop "'+name+'" erreichbar (write_products möglich)'):('❌ Token abgelehnt: '+JSON.stringify(jj).slice(0,100));
  }catch(e){ return '❌ '+(e?.message||String(e)).slice(0,100); }
}
W('  → Validierung: '+await shopifyValid()+'\n');

// --- FAL (winner-reels / Seedance) ---
W('## fal.ai (winner-reels / Seedance)');
W('  FAL_KEY = '+has('FAL_KEY'));
async function falValid(){ const k=g('FAL_KEY'); if(!k) return '⏭️ leer'; try{ const r=await fetch('https://queue.fal.run/fal-ai/any-llm',{method:'POST',headers:{'Authorization':'Key '+k,'Content-Type':'application/json'},body:JSON.stringify({})}); if(r.status===401||r.status===403) return '❌ Key abgelehnt ('+r.status+')'; return '✅ Key akzeptiert (HTTP '+r.status+', kein 401/403)'; }catch(e){ return '⚠️ Netz/Fehler: '+(e?.message||'').slice(0,60); } }
W('  → Validierung: '+await falValid()+'\n');

// --- GEMINI (image-audit / KI-Text) ---
W('## Gemini (image-audit / KI-Text)');
W('  GEMINI_API_KEY = '+has('GEMINI_API_KEY'));
async function geminiValid(){ const k=g('GEMINI_API_KEY'); if(!k) return '⏭️ leer'; try{ const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models?key='+encodeURIComponent(k)); if(r.status===200) return '✅ gültig'; return '❌ HTTP '+r.status; }catch(e){ return '⚠️ '+(e?.message||'').slice(0,60); } }
W('  → Validierung: '+await geminiValid()+'\n');

// --- PRINTFUL (Trikot-Bestellungen) ---
W('## Printful (perso-Trikot)');
W('  PRINTFUL_API_KEY = '+has('PRINTFUL_API_KEY'));
async function pfValid(){ const k=g('PRINTFUL_API_KEY'); if(!k) return '⏭️ leer'; try{ const r=await fetch('https://api.printful.com/store',{headers:{'Authorization':'Bearer '+k}}); if(r.status===200) return '✅ gültig'; return '❌ HTTP '+r.status; }catch(e){ return '⚠️ '+(e?.message||'').slice(0,60); } }
W('  → Validierung: '+await pfValid()+'\n');

// --- Social-Tokens (nur Presence, keine Validierung um kein Rate-Limit/Log zu triggern) ---
W('## Social / KI-Router (nur present, keine Live-Validierung)');
for(const v of ['META_ACCESS_TOKEN','TT_CLIENT_KEY','TT_CLIENT_SECRET','TT_ACCESS_TOKEN','TT_REFRESH_TOKEN','TT_API_LIVE','GROQ_API_KEY','OPENROUTER_API_KEY','DEEPSEEK_API_KEY','MISTRAL_API_KEY']){ W('  '+v.padEnd(22)+' = '+has(v)); }

W('\nFertig. Rot = Blocker für die jeweilige Command. Werte wurden NICHT ausgegeben.');
