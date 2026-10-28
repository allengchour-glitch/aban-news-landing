#!/usr/bin/env node
/* LuxeStyle — pod_inject_designer.mjs
 * Spritzt das Gestalten-Widget-Snippet in ALLE wunschdesign-Produktbeschreibungen
 * (Vorne/Hinten-Mockups + erste Variante). Idempotent: ersetzt einen evtl. vorhandenen Block.
 * ⚠️ STAND 28.10.2026: Ein Lauf ändert ALLE ~38 Beschreibungen, nicht nur neue (die Live-Bausteine wurden von Hand gepflegt: Hintergründe, Skriptadresse = CDN-Fassung;
 *    das Skript leitet front/back aus den Medien-Dateinamen ab). Immer ZUERST mit DRY_RUN=1 ansehen und gezielt prüfen, nie blind ausrollen.
 *    Saubere Hintergründe (ohne eingebranntes «Dein Design») stehen in pod/editor-hintergruende.json und gewinnen; die Skriptadresse im Baustein bleibt erhalten.
 * Auth: Client-Credentials-Grant. No-op-safe ohne Creds. DRY_RUN=1 = nur anzeigen.
 * ENV: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, [DRY_RUN]
 */
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { readFileSync } from 'node:fs';
import { pruefeUebersteuerung, waehleEditorBilder, skriptAdresse } from './lib/pod_editor_bg.mjs';
const SHOP=process.env.SHOPIFY_SHOP||'', CID=process.env.SHOPIFY_CLIENT_ID||'', SECRET=shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET)||'';
const DRY=process.env.DRY_RUN==='1', API='2024-10', JS='https://abannews.com/pod/designer.js';
if(!SHOP||!CID||!SECRET){ console.log('Shopify-Creds fehlen → No-op.'); process.exit(0); }

// Saubere Editor-Hintergründe (Handle → {front, back?, map?}): Printful-Mockups tragen «Dein Design» eingebrannt und dürfen nicht Hintergrund sein.
// Die Tabelle gewinnt gegen die Ableitung aus den Medien-Dateinamen, damit ein erneutes Ausrollen den Fix nicht zurückdreht (pod/editor-hintergruende.json, automation/pod_editor_hintergruende.mjs).
const UEBER=(()=>{ try{ const t=JSON.parse(readFileSync(new URL('../pod/editor-hintergruende.json',import.meta.url),'utf8')); const f=pruefeUebersteuerung(t); if(f.length){ console.error('pod/editor-hintergruende.json ungültig:\n - '+f.join('\n - ')); process.exit(2); } return t; }catch(e){ if(e&&e.code==='ENOENT') return {}; throw e; } })();

async function token(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:SECRET,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); if(!j.access_token){ console.error('Token-Fehler',r.status,JSON.stringify(j).slice(0,200)); process.exit(1);} return j.access_token; }
async function gql(tok,query,variables){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query,variables})}); return r.json(); }

// Helle Produkt-Vorlagen für die Editor-Canvas (statt leerem Kasten): Kunde gestaltet auf dem Produkt.
const TPL_BASE='https://abannews.com/pod/templates/';
const TPL_BY_TYPE={'tasse':'tasse','t-shirt':'shirt','kissen':'kissen','tasche':'tote','poster':'poster','magnet':'magnet','bügeltransfer':'buegeltransfer','buegeltransfer':'buegeltransfer','mauspad':'mousepad'};
const TPL_BY_TAG={'pod-mug':'tasse','pod-shirt':'shirt','pod-cushion':'kissen','pod-tote':'tote','pod-poster':'poster','pod-magnet':'magnet','pod-mousepad':'mousepad','buegeltransfer':'buegeltransfer','bügelbild':'buegeltransfer'};
function templateFor(p){
  var t=(p.productType||'').toLowerCase().trim();
  if(TPL_BY_TYPE[t]) return TPL_BASE+TPL_BY_TYPE[t]+'.png';
  var tags=(p.tags||[]).map(x=>String(x).toLowerCase());
  for(var k in TPL_BY_TAG){ if(tags.indexOf(k)>=0) return TPL_BASE+TPL_BY_TAG[k]+'.png'; }
  return '';
}

const Q=`query($after:String){ products(first:30, query:"tag:wunschdesign OR tag:selbst-gestalten", after:$after){ pageInfo{hasNextPage endCursor}
  edges{ node{ id handle title descriptionHtml productType tags
    variants(first:50){ edges{ node{ id selectedOptions{ name value } } } }
    media(first:15){ edges{ node{ ... on MediaImage{ image{ url } } } } } } } } }`;
const M=`mutation($p:ProductUpdateInput!){ productUpdate(product:$p){ product{ id } userErrors{ field message } } }`;

function esc(u){ return String(u).replace(/"/g,'&quot;'); }
function pickImgs(urls){
  var front=urls.find(u=>/front/i.test(u)) || urls[0] || '';
  var back =urls.find(u=>/back/i.test(u)) || '';
  if(back===front) back='';
  return {front,back};
}
// ALLE vorhandenen Designer-Bloecke entfernen (global, nicht nur am Anfang) — sonst entstehen Duplikate,
// wenn ein anderer Cron (z.B. Lieferzeit-Block) vor den Designer-Block schiebt.
function stripOld(desc){ return desc.replace(/<div class="lspod-designer"[\s\S]*?<\/script>\s*(?:<hr\s*\/?>)?\s*/gi,''); }
// Farb-bewusster Editor: pro Produkttyp Farbwert → Farb-Template. Editor zeigt die gewählte Farbe live.
const COLOR_TPL={ 't-shirt':{'weiss':'shirt-white','weiß':'shirt-white','white':'shirt-white','schwarz':'shirt-black','black':'shirt-black','navy':'shirt-navy','dunkelblau':'shirt-navy'} };
function colorMapFor(p, variants){
  const reg=COLOR_TPL[(p.productType||'').toLowerCase().trim()]; if(!reg) return null;
  const map={};
  for(const v of variants){
    let col=''; for(const o of (v.selectedOptions||[])){ if(/farbe|colou?r/i.test(o.name)) col=String(o.value).toLowerCase().trim(); }
    const key=reg[col]; if(key) map[String(v.id).split('/').pop()]=TPL_BASE+key+'.png';
  }
  return Object.keys(map).length?map:null;
}
function snippet(front,back,vid,poster,imgMap,js){
  var attrs=`data-img-front="${esc(front)}"`;
  if(back) attrs+=` data-img-back="${esc(back)}"`;
  if(vid) attrs+=` data-variant="${vid.split('/').pop()}"`;
  if(imgMap) attrs+=` data-img-map='${JSON.stringify(imgMap).replace(/'/g,'&#39;')}'`;
  if(poster) attrs+=` data-ratio="1.414" data-ref="2400"`;   // Poster: Hochformat 1:√2, höhere Druckauflösung
  return `<div class="lspod-designer" ${attrs}></div>\n<script src="${js||JS}" defer></script>\n<hr>\n`;
}

const tok=await token();
let after=null, n=0, changed=0;
do{
  const j=await gql(tok,Q,{after});
  if(j.errors){ console.error('Query-Fehler',JSON.stringify(j.errors).slice(0,300)); break; }
  const conn=j.data.products; after=conn.pageInfo.hasNextPage?conn.pageInfo.endCursor:null;
  for(const e of conn.edges){
    const p=e.node; n++;
    const urls=p.media.edges.map(m=>m.node&&m.node.image&&m.node.image.url).filter(Boolean);
    const {front,back}=pickImgs(urls);
    const vAll=(p.variants.edges||[]).map(x=>x.node);
    const vid=(vAll[0]&&vAll[0].id)||'';
    const tpl=templateFor(p);            // helle Produkt-Vorlage als Editor-Hintergrund (bevorzugt)
    const cmap=colorMapFor(p, vAll);     // {variantId: farb-template} → Editor zeigt gewählte Farbe
    const isPoster=(p.productType||'').toLowerCase()==='poster' || (p.tags||[]).map(t=>String(t).toLowerCase()).includes('pod-poster');
    const wahl=waehleEditorBilder({front,back,tpl,isPoster,cmap,ueber:UEBER[p.handle]});   // Fallback: Produkt-/Marketingbild; Tabelle gewinnt
    const bg=wahl.bg;
    if(!bg){ console.log(`– ${p.title}: kein Bild, übersprungen`); continue; }
    const clean=stripOld(p.descriptionHtml||'');
    const newDesc=snippet(bg, wahl.back, vid, isPoster, wahl.map, skriptAdresse(p.descriptionHtml, JS))+clean;   // vorhandene Skriptadresse bleibt (live: CDN-Fassung mit Cloudinary)
    if(newDesc===p.descriptionHtml){ console.log(`= ${p.title}: unverändert`); continue; }
    if(DRY){ console.log(`DRY ${p.title}: front=${bg.split('/').pop().split('?')[0]} back=${wahl.back?wahl.back.split('/').pop().split('?')[0]:'–'}${wahl.map?' karte='+Object.keys(wahl.map).length:''}${UEBER[p.handle]?' [Tabelle]':''}`); changed++; continue; }
    const r=await gql(tok,M,{p:{id:p.id,descriptionHtml:newDesc}});
    const ue=r.data&&r.data.productUpdate&&r.data.productUpdate.userErrors||[];
    if(r.errors||ue.length){ console.error(`✗ ${p.title}:`,JSON.stringify(r.errors||ue).slice(0,200)); }
    else { changed++; console.log(`✓ ${p.title}  (vorne${back?'+hinten':''})`); }
    await new Promise(x=>setTimeout(x,350));
  }
}while(after);
console.log(`\nFertig: ${n} Produkte geprüft, ${changed} ${DRY?'(DRY) ':''}aktualisiert.`);
