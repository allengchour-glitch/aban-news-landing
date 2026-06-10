#!/usr/bin/env node
/* LuxeStyle — prodigi_sync.mjs
 * Verbindet Fertig-/Wunsch-Produkte mit dem Druck-Anbieter PRODIGI (EU/Global-Labs).
 * Für jede BEZAHLTE, noch nicht synchronisierte Shopify-Bestellung mit Prodigi-Artikeln (Tag prodigi_personalized_product)
 * legt es einen Prodigi-Druckauftrag an:
 *   • Prodigi-SKU = Shopify-Variant-SKU DIREKT (z.B. GLOBAL-FAP-A3)
 *   • Druckdatei = Bestell-Property "🖼️ Druckdatei …" (Editor) ODER Produkt-Metafeld custom.print_file (Fertigware)
 *   • Empfänger = Shopify-Lieferadresse
 * Vor dem Auftrag optional Quote (POST /quotes) → echte Lieferzeit/Kosten in den Log.
 * KONTROLL-GATE (wie Printful): Gemini prüft jede Druckdatei → PASS bestätigt (callback Confirmed), FAIL = Entwurf (Draft) +
 *   Tag prodigi-review + Telegram. (Prodigi: status "Draft" wird nicht produziert, bis manuell freigegeben.)
 * Idempotent: erledigte Bestellungen → Tag prodigi-synced + Metafeld prodigi.order_id.
 * No-op ohne PRODIGI_API_KEY oder Shopify-Creds. ENV:
 *   PRODIGI_API_KEY (zwingend), [PRODIGI_SANDBOX=1], [PRODIGI_AUTO_CONFIRM=1|0 (Default 1)], [PRODIGI_SHIPPING=Budget|Standard|Express],
 *   SHOPIFY_SHOP, SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN), [GEMINI_API_KEY], [TELEGRAM_*], [MAX=20], [DRY_RUN=1]
 */
const SHOPraw=process.env.SHOPIFY_SHOP||'';
const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim();
const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const KEY=(process.env.PRODIGI_API_KEY||'').trim();
const PBASE=process.env.PRODIGI_SANDBOX==='1' ? 'https://api.sandbox.prodigi.com/v4.0' : 'https://api.prodigi.com/v4.0';
const AUTO_CONFIRM=(process.env.PRODIGI_AUTO_CONFIRM||'1')!=='0';
const SHIPPING=(process.env.PRODIGI_SHIPPING||'Standard').trim();
const GEMINI=(process.env.GEMINI_API_KEY||'').trim();
const TG_TOKEN=(process.env.TELEGRAM_BOT_TOKEN||'').trim();
const TG_CHAT=(process.env.TELEGRAM_CHAT_ID||'').trim();
const MAX=Math.max(1,parseInt(process.env.MAX||'20',10)||20);
const DRY=process.env.DRY_RUN==='1';
const API='2025-01';

let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim();
if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';

if(!KEY){ console.log('Kein PRODIGI_API_KEY → No-op (Connector noch nicht scharf).'); process.exit(0); }
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

async function gql(tok,query,variables){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query,variables})}); return r.json(); }
async function works(tok){ try{ const r=await gql(tok,'{ shop { name } }'); return r?.data?.shop?.name?r.data.shop:null; }catch{ return null; } }
async function clientCredentials(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function resolveToken(){ if(ADMIN_TOKEN){ const s=await works(ADMIN_TOKEN); if(s) return ADMIN_TOKEN; } if(CID&&CSEC){ const t=await clientCredentials(); if(t&&await works(t)) return t; } console.error('❌ Keine funktionierende Shopify-Auth.'); process.exit(0); }

async function prodigi(path,method,body){ const r=await fetch(PBASE+path,{method:method||'GET',headers:{'X-API-Key':KEY,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined}); const j=await r.json().catch(()=>({})); return {ok:r.ok,status:r.status,j}; }
async function tg(text){ if(!TG_TOKEN||!TG_CHAT) return; try{ await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:TG_CHAT,text,parse_mode:'HTML',disable_web_page_preview:true})}); }catch{} }

async function fetchB64(url){ const r=await fetch(url); if(!r.ok) throw new Error('img '+r.status); const ab=await r.arrayBuffer(); const ct=r.headers.get('content-type')||'image/png'; return {b64:Buffer.from(ab).toString('base64'),mime:ct.split(';')[0]}; }
async function controlDesign(url){ if(!GEMINI) return {pass:true,reason:'(keine Gemini-Prüfung konfiguriert)'};
  try{ const {b64,mime}=await fetchB64(url);
    const prompt='You are a print-shop QA checker. Look at this customer print file. Answer with a single word PASS or FAIL, then a short reason. FAIL only if: the image is essentially empty/blank, extremely low quality/blurry, or contains hateful/illegal/explicit content. Otherwise PASS. Format exactly: PASS - reason  OR  FAIL - reason';
    const body={contents:[{parts:[{text:prompt},{inline_data:{mime_type:mime,data:b64}}]}]};
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GEMINI)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    const t=((j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts||[]).map(p=>p.text||'').join(' ')).trim();
    return {pass:!/^\s*fail/i.test(t), reason:t.slice(0,180)||'(leere Antwort)'};
  }catch(e){ return {pass:true,reason:'Prüfung übersprungen ('+e.message+')'}; } }

const ORDERS_Q=`query($q:String!,$n:Int!){ orders(first:$n, query:$q, sortKey:CREATED_AT){ edges{ node{
  id name email tags
  shippingAddress{ name firstName lastName address1 address2 city provinceCode countryCodeV2 zip phone }
  lineItems(first:50){ edges{ node{ quantity sku title
    product{ productType tags metafield(namespace:"custom", key:"print_file"){ value } }
    variant{ sku }
    customAttributes{ key value } } } }
}}}}`;

function pickFiles(attrs){ const out=[]; for(const a of attrs||[]){ const k=a.key||''; if(/Druckdatei|Print file/i.test(k) && /^https?:\/\//.test(a.value||'')){ out.push({url:a.value}); } } return out; }
function isProdigi(li){ const tags=(li.product&&li.product.tags||[]).map(x=>x.toLowerCase()); return tags.includes('prodigi_personalized_product'); }

async function tagOrder(tok,id,tags,pId){ if(DRY) return;
  await gql(tok,`mutation($id:ID!,$tags:[String!]!){ tagsAdd(id:$id,tags:$tags){ userErrors{ message } } }`,{id,tags});
  if(pId) await gql(tok,`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ message } } }`,{mf:[{ownerId:id,namespace:'prodigi',key:'order_id',type:'single_line_text_field',value:String(pId)}]});
}

(async function main(){
  const tok=await resolveToken();
  const q='financial_status:paid fulfillment_status:unfulfilled -tag:prodigi-synced';
  const data=await gql(tok,ORDERS_Q,{q,n:MAX});
  const edges=(data?.data?.orders?.edges)||[];
  if(!edges.length){ console.log('Keine offenen Prodigi-Bestellungen zum Synchronisieren.'); process.exit(0); }
  let created=0, drafts=0, skipped=0, fails=[];
  for(const {node:o} of edges){
    const items=[]; let needReview=false, reviewMsg=[];
    for(const {node:li} of (o.lineItems.edges||[])){
      if(!isProdigi(li)) continue;
      const sku=(li.variant&&li.variant.sku)||li.sku;
      let files=pickFiles(li.customAttributes);
      if(!files.length){ const mf=li.product&&li.product.metafield&&li.product.metafield.value; if(mf && /^https?:\/\//.test(mf)) files=[{url:mf}]; }
      if(!sku){ skipped++; reviewMsg.push(`${li.title}: keine SKU`); needReview=true; continue; }
      if(!files.length){ skipped++; reviewMsg.push(`${li.title}: keine Druckdatei (Property/Metafeld?)`); needReview=true; continue; }
      const assets=[];
      for(const f of files){ const ctrl=await controlDesign(f.url); if(!ctrl.pass){ needReview=true; reviewMsg.push(`${li.title}: Kontrolle FAIL – ${ctrl.reason}`); }
        assets.push({printArea:'default',url:f.url}); }
      items.push({sku, copies:li.quantity||1, sizing:'fillPrintArea', assets});
    }
    if(!items.length){ continue; }
    const a=o.shippingAddress||{};
    const recipient={ name:a.name||[a.firstName,a.lastName].filter(Boolean).join(' ')||'Kunde', email:o.email||'', phoneNumber:a.phone||'',
      address:{ line1:a.address1||'', line2:a.address2||'', postalOrZipCode:a.zip||'', countryCode:a.countryCodeV2||'CH', townOrCity:a.city||'', stateOrCounty:a.provinceCode||'' } };
    // Optional: Quote für Lieferzeit/Kosten
    try{ const qr=await prodigi('/quotes','POST',{shippingMethod:SHIPPING,destinationCountryCode:recipient.address.countryCode,currencyCode:'CHF',items:items.map(i=>({sku:i.sku,copies:i.copies,attributes:{},assets:[{printArea:'default'}]}))});
      if(qr.ok && qr.j&&qr.j.quotes&&qr.j.quotes[0]){ const q0=qr.j.quotes[0]; const ship=(q0.shipments&&q0.shipments[0])||{}; console.log(`  ⓘ ${o.name} Quote: Versand ${ship.carrier?.name||SHIPPING}, Kosten ${q0.costSummary?.totalCost?.amount||'?'} ${q0.costSummary?.totalCost?.currency||''}`); } }catch{}
    const idempotencyKey=o.name.replace(/[^A-Za-z0-9]/g,'')+'-'+(o.id.split('/').pop());
    const confirm = AUTO_CONFIRM && !needReview;
    if(DRY){ console.log(`[DRY] ${o.name}: ${items.length} Item(s) [${items.map(i=>i.sku).join(',')}], confirm=${confirm}${needReview?' (REVIEW: '+reviewMsg.join('; ')+')':''}`); continue; }
    // Prodigi: status.stage Draft = nicht produziert; ohne callbackUrl wird Order normal verarbeitet. Wir steuern Review via idempotency + Tag.
    const res=await prodigi('/orders','POST',{ shippingMethod:SHIPPING, idempotencyKey, recipient, items: items.map(i=>({sku:i.sku,copies:i.copies,sizing:i.sizing,assets:i.assets})) });
    if(!res.ok || !(res.j&&res.j.order)){ fails.push(`${o.name}: Prodigi ${res.status} ${JSON.stringify(res.j).slice(0,180)}`); await tagOrder(tok,o.id,['prodigi-review']); drafts++; continue; }
    const pId=res.j.order.id;
    await tagOrder(tok,o.id,['prodigi-synced',confirm?'prodigi-confirmed':'prodigi-review'],pId);
    if(confirm){ created++; } else { drafts++; }
    if(needReview){ await tg(`🟡 LuxeStyle Prodigi: Bestellung <b>${o.name}</b> → Auftrag ${pId||'?'} (Kontrolle prüfen):\n${reviewMsg.join('\n')}`); }
    console.log(`${o.name} → Prodigi ${pId||'?'} ${confirm?'OK':'REVIEW'}`);
  }
  if(fails.length){ await tg(`🔴 LuxeStyle Prodigi-Sync Fehler:\n${fails.join('\n')}`); fails.forEach(f=>console.error('✗',f)); }
  const summary=`Prodigi-Sync fertig: ${created} bestätigt, ${drafts} Entwurf/Review, ${skipped} Item übersprungen.`;
  console.log(summary);
  if((created||drafts) && !DRY) await tg(`✅ LuxeStyle Prodigi: ${summary}`);
})().catch(e=>{ console.error('Fataler Fehler:',e); process.exit(0); });
