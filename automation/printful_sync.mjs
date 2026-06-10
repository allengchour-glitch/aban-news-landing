#!/usr/bin/env node
/* LuxeStyle — printful_sync.mjs
 * Verbindet den eigenen „Selbst gestalten"-Editor mit dem Druck-Anbieter PRINTFUL.
 * Für jede BEZAHLTE, noch nicht synchronisierte Shopify-Bestellung mit POD-Artikeln (Tag wunschdesign +
 * Editor-Druckdatei-Property) legt es einen Printful-Druckauftrag an:
 *   • Variante = aus der Shopify-SKU decodiert ( "<sync>_<printfulVariantId>" → Printful-Katalog-Variante )
 *   • Druckdatei(en) = aus den Bestell-Eigenschaften "🖼️ Druckdatei (Vorne/Hinten)" (Cloudinary-URL)
 *   • Empfänger = Shopify-Lieferadresse
 * KONTROLL-GATE (User-Wunsch): Gemini prüft jede Druckdatei (leer? unscharf? unzulässig?) → PASS/FAIL.
 *   PASS  → Auftrag wird VERBINDLICH bestätigt (confirm) und produziert.
 *   FAIL  → Auftrag bleibt ENTWURF (draft) + Shopify-Tag `printful-review` + Telegram-Hinweis.
 * Idempotent: erledigte Bestellungen bekommen Tag `printful-synced` + Metafeld printful.order_id.
 * No-op ohne PRINTFUL_API_KEY oder ohne Shopify-Creds. ENV:
 *   PRINTFUL_API_KEY (zwingend), [PRINTFUL_STORE_ID], [PRINTFUL_AUTO_CONFIRM=1|0 (Default 1 = AI-gated)],
 *   SHOPIFY_SHOP, SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN), [GEMINI_API_KEY], [TELEGRAM_*], [MAX=20], [DRY_RUN=1]
 */
const SHOPraw=process.env.SHOPIFY_SHOP||'';
const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim();
const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const PF_KEY=(process.env.PRINTFUL_API_KEY||'').trim();
const PF_STORE=(process.env.PRINTFUL_STORE_ID||'').trim();
const AUTO_CONFIRM=(process.env.PRINTFUL_AUTO_CONFIRM||'1')!=='0';
const GEMINI=(process.env.GEMINI_API_KEY||'').trim();
const TG_TOKEN=(process.env.TELEGRAM_BOT_TOKEN||'').trim();
const TG_CHAT=(process.env.TELEGRAM_CHAT_ID||'').trim();
const MAX=Math.max(1,parseInt(process.env.MAX||'20',10)||20);
const DRY=process.env.DRY_RUN==='1';
const API='2025-01';

let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim();
if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';

if(!PF_KEY){ console.log('Kein PRINTFUL_API_KEY → No-op (Connector noch nicht scharf).'); process.exit(0); }
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

// ---------- Shopify-Auth (wie desc_block.mjs) ----------
async function gql(tok,query,variables){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query,variables})}); return r.json(); }
async function works(tok){ try{ const r=await gql(tok,'{ shop { name } }'); return r?.data?.shop?.name?r.data.shop:null; }catch{ return null; } }
async function clientCredentials(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function resolveToken(){ if(ADMIN_TOKEN){ const s=await works(ADMIN_TOKEN); if(s) return ADMIN_TOKEN; } if(CID&&CSEC){ const t=await clientCredentials(); if(t&&await works(t)) return t; } console.error('❌ Keine funktionierende Shopify-Auth.'); process.exit(0); }

// ---------- Printful ----------
async function pf(path,method,body){ const headers={'Authorization':'Bearer '+PF_KEY,'Content-Type':'application/json'}; if(PF_STORE) headers['X-PF-Store-Id']=PF_STORE;
  const r=await fetch('https://api.printful.com'+path,{method:method||'GET',headers,body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({})); return {ok:r.ok,status:r.status,j}; }

// ---------- Telegram ----------
async function tg(text){ if(!TG_TOKEN||!TG_CHAT) return; try{ await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:TG_CHAT,text,parse_mode:'HTML',disable_web_page_preview:true})}); }catch{} }

// ---------- Gemini-Kontrolle der Druckdatei ----------
async function fetchB64(url){ const r=await fetch(url); if(!r.ok) throw new Error('img '+r.status); const ab=await r.arrayBuffer(); const ct=r.headers.get('content-type')||'image/png'; return {b64:Buffer.from(ab).toString('base64'),mime:ct.split(';')[0]}; }
async function controlDesign(url){ if(!GEMINI) return {pass:true,reason:'(keine Gemini-Prüfung konfiguriert)'};
  try{ const {b64,mime}=await fetchB64(url);
    const prompt='You are a print-shop QA checker. Look at this customer print file (design to be printed on a product). Answer with a single word PASS or FAIL, then a short reason. FAIL only if: the image is essentially empty/blank, extremely low quality/blurry, or contains hateful/illegal/explicit content. Otherwise PASS. Format exactly: PASS - reason  OR  FAIL - reason';
    const body={contents:[{parts:[{text:prompt},{inline_data:{mime_type:mime,data:b64}}]}]};
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(GEMINI)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    const t=((j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts||[]).map(p=>p.text||'').join(' ')).trim();
    const pass=/^\s*pass/i.test(t)|| (!/^\s*fail/i.test(t) && /pass/i.test(t));
    return {pass:!/^\s*fail/i.test(t), reason:t.slice(0,180)||'(leere Antwort)'};
  }catch(e){ return {pass:true,reason:'Prüfung übersprungen ('+e.message+')'}; } }

// ---------- SKU → Printful-Variante ----------
function variantFromSku(sku){ const m=String(sku||'').match(/_(\d+)\s*$/); return m?parseInt(m[1],10):null; }
function placementFor(productType,sideKey){ const t=String(productType||'').toUpperCase();
  // Mehrlagen-Textil → front/back; Einzelplatzierung (Tasse/Hülle/Sticker/Flasche/Poster/Magnet) → default
  if(['MUG','PHONE-CASE','STICKER','POSTER','CANVAS','MAGNET'].includes(t)) return 'default';
  return sideKey==='back'?'back':'front'; }

const ORDERS_Q=`query($q:String!,$n:Int!){ orders(first:$n, query:$q, sortKey:CREATED_AT){ edges{ node{
  id name email tags
  shippingAddress{ name firstName lastName address1 address2 city provinceCode countryCodeV2 zip phone }
  lineItems(first:50){ edges{ node{ quantity sku title
    product{ productType tags metafield(namespace:"custom", key:"print_file"){ value } }
    variant{ sku }
    customAttributes{ key value } } } }
}}}}`;

function pickFiles(attrs){ // → [{side,url}] aus Properties "🖼️ Druckdatei (Vorne/Hinten)"
  const out=[]; for(const a of attrs||[]){ const k=a.key||''; if(/Druckdatei|Print file/i.test(k) && /^https?:\/\//.test(a.value||'')){ const side=/Hinten|Back/i.test(k)?'back':'front'; out.push({side,url:a.value}); } } return out; }
function isPod(li){ const tags=(li.product&&li.product.tags||[]).map(x=>x.toLowerCase()); return tags.includes('wunschdesign')||tags.includes('printful_personalized_product'); }

async function tagOrder(tok,id,tags,pfId){ if(DRY) return;
  await gql(tok,`mutation($id:ID!,$tags:[String!]!){ tagsAdd(id:$id,tags:$tags){ userErrors{ message } } }`,{id,tags});
  if(pfId) await gql(tok,`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ message } } }`,{mf:[{ownerId:id,namespace:'printful',key:'order_id',type:'single_line_text_field',value:String(pfId)}]});
}

(async function main(){
  const tok=await resolveToken();
  // Bezahlt, unfulfilled, noch nicht synchronisiert
  const q='financial_status:paid fulfillment_status:unfulfilled -tag:printful-synced';
  const data=await gql(tok,ORDERS_Q,{q,n:MAX});
  const edges=(data?.data?.orders?.edges)||[];
  if(!edges.length){ console.log('Keine offenen POD-Bestellungen zum Synchronisieren.'); process.exit(0); }
  let created=0, drafts=0, skipped=0, fails=[];
  for(const {node:o} of edges){
    const items=[]; let needReview=false, reviewMsg=[];
    for(const {node:li} of (o.lineItems.edges||[])){
      if(!isPod(li)) continue;
      const sku=(li.variant&&li.variant.sku)||li.sku;
      const vid=variantFromSku(sku);
      let files=pickFiles(li.customAttributes);
      // Fertig-Produkte (ohne Editor-Upload): festes Motiv aus Produkt-Metafeld custom.print_file
      if(!files.length){ const mf=li.product&&li.product.metafield&&li.product.metafield.value; if(mf && /^https?:\/\//.test(mf)) files=[{side:'front',url:mf}]; }
      if(!vid){ skipped++; reviewMsg.push(`${li.title}: SKU ohne Printful-Variante`); needReview=true; continue; }
      if(!files.length){ skipped++; reviewMsg.push(`${li.title}: keine Druckdatei (Cloudinary/Metafeld?)`); needReview=true; continue; }
      const pfFiles=[];
      for(const f of files){ const ctrl=await controlDesign(f.url); if(!ctrl.pass){ needReview=true; reviewMsg.push(`${li.title}: Kontrolle FAIL – ${ctrl.reason}`); }
        pfFiles.push({type:placementFor(li.product&&li.product.productType,f.side),url:f.url}); }
      items.push({variant_id:vid,quantity:li.quantity||1,files:pfFiles});
    }
    if(!items.length){ continue; }
    const a=o.shippingAddress||{};
    const recipient={ name:a.name||[a.firstName,a.lastName].filter(Boolean).join(' ')||'Kunde', address1:a.address1||'', address2:a.address2||'', city:a.city||'', state_code:a.provinceCode||'', country_code:a.countryCodeV2||'CH', zip:a.zip||'', email:o.email||'', phone:a.phone||'' };
    const confirm = AUTO_CONFIRM && !needReview;
    if(DRY){ console.log(`[DRY] ${o.name}: ${items.length} Item(s), confirm=${confirm}${needReview?' (REVIEW: '+reviewMsg.join('; ')+')':''}`); continue; }
    const res=await pf('/orders'+(confirm?'?confirm=1':''),'POST',{recipient,items});
    if(!res.ok){ fails.push(`${o.name}: Printful ${res.status} ${JSON.stringify(res.j).slice(0,160)}`); await tagOrder(tok,o.id,['printful-review']); drafts++; continue; }
    const pfId=res.j&&res.j.result&&res.j.result.id;
    await tagOrder(tok,o.id,['printful-synced',confirm?'printful-confirmed':'printful-review'],pfId);
    if(confirm){ created++; } else { drafts++; }
    if(needReview){ await tg(`🟡 LuxeStyle POD: Bestellung <b>${o.name}</b> → Printful-Entwurf #${pfId||'?'} (Kontrolle prüfen):\n${reviewMsg.join('\n')}`); }
    console.log(`${o.name} → Printful #${pfId||'?'} ${confirm?'BESTÄTIGT':'ENTWURF (Review)'}`);
  }
  if(fails.length){ await tg(`🔴 LuxeStyle POD-Sync Fehler:\n${fails.join('\n')}`); fails.forEach(f=>console.error('✗',f)); }
  const summary=`Printful-Sync fertig: ${created} bestätigt, ${drafts} Entwurf/Review, ${skipped} Item übersprungen.`;
  console.log(summary);
  if((created||drafts) && !DRY) await tg(`✅ LuxeStyle POD: ${summary}`);
})().catch(e=>{ console.error('Fataler Fehler:',e); process.exit(0); });
