#!/usr/bin/env node
/* create_seo_pages_from_json.mjs — erstellt/aktualisiert SEO-Landingpages aus automation/seo_pages_r2.json.
 * JSON = [{handle,title,title_tag,meta_description,body_html}]. Idempotent per Handle, setzt global.title_tag/
 * description_tag. Publiziert die Seite. No-op ohne Creds/Datei. DRY_RUN=1.
 * ENV: SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [DRY_RUN=1] · [PAGES_FILE=automation/seo_pages_r2.json]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const AT=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(), CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
const FILE=process.env.PAGES_FILE||'automation/seo_pages_r2.json';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
mkdirSync('reports',{recursive:true});
const out=[]; const W=m=>{ out.push(m); console.log(m); try{ writeFileSync('reports/seo-pages-r2.txt', out.join('\n')+'\n'); }catch{} };
let PAGES=[]; try{ PAGES=JSON.parse(readFileSync(FILE,'utf8')); }catch(e){ W('Keine '+FILE+' → No-op ('+e.message+').'); process.exit(0); }
if(!Array.isArray(PAGES)||!PAGES.length){ W('Keine Seiten in '+FILE+'.'); process.exit(0); }
if(!AT && !(CID&&CSEC)){ W('Keine Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
let tok=AT&&await works(AT)?AT:null; if(!tok&&CID&&CSEC){ const t=await cc(); if(t&&await works(t)) tok=t; }
if(!tok){ W('❌ Auth'); process.exit(0); }
const Q=`query($q:String!){ pages(first:5, query:$q){ edges{ node{ id handle } } } }`;
const CRE=`mutation($page:PageCreateInput!){ pageCreate(page:$page){ page{ id handle } userErrors{ field message } } }`;
const UPD=`mutation($id:ID!,$page:PageUpdateInput!){ pageUpdate(id:$id, page:$page){ page{ id } userErrors{ field message } } }`;
const MF=`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ field message } } }`;
let created=0, updated=0; const fails=[];
for(const p of PAGES){
  if(!p.handle||!p.title||!p.body_html){ fails.push((p.handle||'?')+':unvollstaendig'); continue; }
  if(DRY){ W(`[DRY] ${p.handle}: ${p.title}`); continue; }
  const ex=(await gql(tok,Q,{q:`handle:${p.handle}`}))?.data?.pages?.edges?.[0]?.node;
  let id=ex?.id;
  if(ex){ const r=await gql(tok,UPD,{id:ex.id,page:{title:p.title,body:p.body_html,isPublished:true}}); const ue=r?.data?.pageUpdate?.userErrors||[]; if(ue.length){fails.push(`${p.handle}:${JSON.stringify(ue).slice(0,90)}`);continue;} updated++; W(`~ ${p.handle} aktualisiert`); }
  else { const r=await gql(tok,CRE,{page:{title:p.title,handle:p.handle,body:p.body_html,isPublished:true}}); const ue=r?.data?.pageCreate?.userErrors||[]; if(ue.length){fails.push(`${p.handle}:${JSON.stringify(ue).slice(0,90)}`);continue;} id=r?.data?.pageCreate?.page?.id; created++; W(`+ ${p.handle} erstellt`); }
  if(id){ const tt=(p.title_tag||'').slice(0,70), dt=(p.meta_description||'').slice(0,320);
    await gql(tok,MF,{mf:[{ownerId:id,namespace:'global',key:'title_tag',type:'single_line_text_field',value:tt},{ownerId:id,namespace:'global',key:'description_tag',type:'single_line_text_field',value:dt}]}); }
  await new Promise(x=>setTimeout(x,250));
}
W(`\nFertig: ${created} erstellt, ${updated} aktualisiert${fails.length?' · Fails: '+fails.join(' | '):''}${DRY?' (DRY)':''}.`);
