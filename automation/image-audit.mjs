#!/usr/bin/env node
/**
 * image-audit.mjs — KATALOG-WEITER Bild-Compliance-Scan mit Gemini Vision.
 *
 * Findet die teuren Auto-Import-Fallen (User „scho wieder foppu"): Marken-/Trademark-
 * Missbrauch (Botox/Ozempic/Nike…), Vorher-Nachher-Fotos, asiatische Schrift / „MADE IN
 * CHINA", fremde Watermarks/Shop-URLs, medizinische Claims. Schreibt einen Report und
 * kann Treffer optional auf DRAFT setzen + taggen (reversibel, nie löschen).
 *
 * ENV (transient, NIE committen):
 *   GEMINI_API_KEY                              (Pflicht; gratis bei aistudio.google.com)
 *   SHOPIFY_SHOP + SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET   (ODER SHOPIFY_TOKEN)
 *   GEMINI_MODEL=gemini-2.0-flash   MAX=300   DELAY=400   AUDIT_FIX=1 (sonst nur Report)
 *   ONLY_ACTIVE=1 (default: nur ACTIVE prüfen)
 *
 * Lauf:  GEMINI_API_KEY=… node automation/image-audit.mjs            (Report)
 *        AUDIT_FIX=1 GEMINI_API_KEY=… node automation/image-audit.mjs (Treffer → DRAFT+Tag)
 *
 * Idempotent: Produkte mit Tag `bild-ok` oder `bild-audit-flag` werden übersprungen.
 */
import fs from 'node:fs';
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const CID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET;
const GKEY = process.env.GEMINI_API_KEY;
const GMODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const MAX = parseInt(process.env.MAX || '0', 10);
const DELAY = parseInt(process.env.DELAY || '400', 10);
const FIX = process.env.AUDIT_FIX === '1';
const ONLY_ACTIVE = process.env.ONLY_ACTIVE !== '0';
const API = '2025-01';
if (!GKEY) { console.error('❌ GEMINI_API_KEY fehlt.'); process.exit(1); }

const PROMPT = `Du bist Bild-Compliance-Prüfer für einen Schweizer Shopify-Shop.
Markiere NUR klare Verstösse auf dem Produktbild:
1) Fremde Marke/Trademark auf generischem Produkt (z.B. Botox, Ozempic, Nike, Adidas, Apple, Disney).
2) Vorher/Nachher-Vergleichsfoto.
3) Chinesische/japanische/koreanische/asiatische Schriftzeichen ODER Text "MADE IN CHINA".
4) Fremde Watermark / fremde Shop-URL / Logo eines anderen Händlers.
5) Eingeblendete medizinische Heilversprechen (z.B. "cures", "heilt", "100% wirksam gegen Krankheit").
Ein normales, sauberes Produktfoto (auch mit Modellen oder üblichen Kosmetik-Wörtern wie "Anti-Aging") = KEIN Verstoss.
Antworte AUSSCHLIESSLICH als JSON: {"flag": true oder false, "reasons": ["..."]}`;

async function shToken(){
  if (process.env.SHOPIFY_TOKEN) return process.env.SHOPIFY_TOKEN;
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:SEC,grant_type:'client_credentials'})});
  if(!r.ok) throw new Error('Token-Grant '+r.status); return (await r.json()).access_token;
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let TOK;
async function gql(q,v){ for(let a=0;a<6;a++){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'X-Shopify-Access-Token':TOK,'Content-Type':'application/json'},body:JSON.stringify({query:q,variables:v})}); const j=await r.json(); if((j.errors&&JSON.stringify(j.errors).includes('THROTTLED'))||r.status===429){await sleep(2500*(a+1));continue;} if(j.errors) throw new Error(JSON.stringify(j.errors)); return j.data;} throw new Error('throttled'); }

function mimeOf(u){ u=u.toLowerCase(); if(u.includes('.png'))return 'image/png'; if(u.includes('.webp'))return 'image/webp'; return 'image/jpeg'; }
async function audit(url){
  let b64, mime=mimeOf(url);
  try{ const r=await fetch(url); const buf=Buffer.from(await r.arrayBuffer()); if(buf.length>4_000_000) return {flag:false,reasons:['(zu gross, skip)']}; b64=buf.toString('base64'); }
  catch{ return {flag:false,reasons:['(bild-download-fehler)']}; }
  const body={contents:[{parts:[{text:PROMPT},{inline_data:{mime_type:mime,data:b64}}]}],generationConfig:{temperature:0,maxOutputTokens:200}};
  for(let a=0;a<5;a++){
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GMODEL}:generateContent?key=${GKEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(r.status===429||r.status>=500){ await sleep(3000*(a+1)); continue; }
    const j=await r.json();
    const t=j?.candidates?.[0]?.content?.parts?.[0]?.text||'';
    const m=t.match(/\{[\s\S]*\}/); if(!m) return {flag:false,reasons:['(keine antwort)']};
    try{ return JSON.parse(m[0]); }catch{ return {flag:false,reasons:['(parse-fehler)']}; }
  }
  return {flag:false,reasons:['(gemini-rate-limit)']};
}

(async()=>{
  TOK=await shToken();
  console.log(`image-audit ${FIX?'[FIX] ':'[REPORT] '}— ${SHOP} · Modell ${GMODEL} · MAX=${MAX||'∞'}`);
  let cursor=null, seen=0, checked=0, flagged=0, skipped=0;
  const hits=[];
  outer:
  do{
    const d=await gql(`query($c:String){ products(first:40, after:$c){ pageInfo{hasNextPage endCursor}
      nodes{ id title status tags featuredImage{url} } } }`,{c:cursor});
    for(const p of d.products.nodes){
      seen++;
      if(ONLY_ACTIVE && p.status!=='ACTIVE'){ continue; }
      if(p.tags.includes('bild-ok')||p.tags.includes('bild-audit-flag')){ skipped++; continue; }
      if(!p.featuredImage?.url){ continue; }
      const v=await audit(p.featuredImage.url); checked++;
      if(v.flag){
        flagged++; hits.push({id:p.id,title:p.title,reasons:v.reasons,img:p.featuredImage.url});
        console.log(`🚩 ${p.title} → ${(v.reasons||[]).join('; ')}`);
        if(FIX){
          await gql(`mutation($id:ID!){ productUpdate(input:{id:$id, status:DRAFT, tags:["bild-audit-flag"]}){ userErrors{message} } }`,{id:p.id});
        }
      } else if(FIX){
        await gql(`mutation($id:ID!){ tagsAdd(id:$id, tags:["bild-ok"]){ userErrors{message} } }`,{id:p.id});
      }
      await sleep(DELAY);
      if(MAX && checked>=MAX){ console.log('MAX erreicht.'); break outer; }
    }
    cursor=d.products.pageInfo.hasNextPage?d.products.pageInfo.endCursor:null;
    if(seen%400===0) console.log(`… ${seen} gesehen · ${checked} geprüft · ${flagged} markiert`);
  }while(cursor);
  const rep=`reports/image-audit-${new Date().toISOString().slice(0,10)}.json`;
  try{ fs.mkdirSync('reports',{recursive:true}); fs.writeFileSync(rep, JSON.stringify(hits,null,2)); }catch{}
  console.log(`\n✅ ${FIX?'[FIX] ':''}Fertig: ${seen} gesehen · ${checked} geprüft · ${flagged} markiert · ${skipped} schon ok\nReport: ${rep}`);
})().catch(e=>{console.error('❌',e.message);process.exit(1);});
