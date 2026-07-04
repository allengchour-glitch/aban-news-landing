#!/usr/bin/env node
/* LuxeStyle — create_seo_landing.mjs
 * SEO-Landingpage „Fan-Trikot selbst gestalten – Schweiz" (Kauf-Intent-Longtail, generisch, kein WM/FIFA).
 * Legt eine Shopify-PAGE an bzw. aktualisiert sie (idempotent per Handle) + SEO-Meta. Verlinkt den Designer + Kategorien.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [DRY_RUN=1]
 */
const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

const HANDLE='fan-trikot-selbst-gestalten';
const TITLE='Fan-Trikot selbst gestalten – Schweiz';
const TITLE_TAG='Fan-Trikot selbst gestalten – Name & Nummer | LuxeStyle Schweiz';
const DESC_TAG='Fussballtrikot selbst gestalten in der Schweiz: Name + Nummer frei wählbar, Live-Vorschau, Grössen S–2XL. In der Schweiz gestaltet & geliefert. Inoffizielles Fan-Design.';
const BODY=`
<p><strong>Gestalte dein eigenes Fan-Trikot</strong> — mit deinem Namen und deiner Wunschnummer. Ein <strong>Fussballtrikot selbst gestalten</strong> war noch nie so einfach: Farbe wählen, Name eintippen, Live-Vorschau prüfen — fertig. In der Schweiz gestaltet und schnell zu dir geliefert.</p>
<p><a href="/products/wm-trikot-selbst-gestalten"><strong>➜ Jetzt dein Fan-Trikot gestalten</strong></a></p>
<h2>So funktioniert's</h2>
<ol>
<li><strong>Farbe &amp; Grösse wählen</strong> (Rot, Weiss, Schwarz oder Blau · S–2XL).</li>
<li><strong>Name &amp; Nummer eintippen</strong> und die Live-Vorschau prüfen.</li>
<li>Wir drucken &amp; liefern in der Schweiz. <em>Was du in der Vorschau siehst, wird gedruckt.</em></li>
</ol>
<h2>Warum LuxeStyle</h2>
<ul>
<li>🇨🇭 In der Schweiz gestaltet &amp; versandt — verfolgbare Lieferung (ca. 7–14 Werktage).</li>
<li>👕 Hochwertiges, atmungsaktives Material (recycelt) — angenehmer Allover-Druck.</li>
<li>🚚 Gratis Versand ab CHF 50 · ↩️ 30 Tage Rückgabe aufs Sortiment.</li>
<li>🔒 Sichere Zahlung: Visa, Mastercard, TWINT, PayPal, Klarna.</li>
</ul>
<p><strong>Trikot mit Name und Nummer</strong>, personalisiert für dich, dein Rudel oder als Geschenk. Kein Konto nötig — einfach gestalten und bestellen.</p>
<p>Mehr entdecken: <a href="/collections/sg-alle">Selbst gestalten</a> · <a href="/products/wm-trikot-selbst-gestalten">Fan-Trikot Designer</a></p>
<p style="font-size:13px;opacity:.75;">Hinweis: inoffizielles, selbst gestaltetes Fan-Design in Schweizer Farben — kein Lizenzprodukt.</p>
`.trim();

const tok=await token();
const Q=`query($q:String!){ pages(first:5, query:$q){ edges{ node{ id title handle } } } }`;
let existing=null;
try{ const r=await gql(tok,Q,{q:`handle:${HANDLE}`}); existing=(r?.data?.pages?.edges||[]).map(e=>e.node).find(n=>n.handle===HANDLE)||null; }catch(e){}
if(DRY){ console.log(`DRY: würde Page „${TITLE}" (${HANDLE}) ${existing?'aktualisieren':'anlegen'} + SEO-Meta setzen.`); process.exit(0); }

let pageId=existing?.id||null;
if(existing){
  const M=`mutation($id:ID!,$page:PageUpdateInput!){ pageUpdate(id:$id, page:$page){ page{ id } userErrors{ field message } } }`;
  const r=await gql(tok,M,{id:existing.id,page:{title:TITLE, body:BODY, isPublished:true}}); const ue=r?.data?.pageUpdate?.userErrors||[];
  if(ue.length){ console.error('✗ pageUpdate:',JSON.stringify(ue)); process.exit(1); }
  console.log('✓ Page aktualisiert:',HANDLE);
} else {
  const M=`mutation($page:PageCreateInput!){ pageCreate(page:$page){ page{ id handle } userErrors{ field message } } }`;
  const r=await gql(tok,M,{page:{title:TITLE, handle:HANDLE, body:BODY, isPublished:true}}); const ue=r?.data?.pageCreate?.userErrors||[];
  if(ue.length){ console.error('✗ pageCreate:',JSON.stringify(ue)); process.exit(1); }
  pageId=r?.data?.pageCreate?.page?.id; console.log('✓ Page angelegt:',r?.data?.pageCreate?.page?.handle);
}
// SEO-Meta setzen
if(pageId){
  const MF=`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ field message } } }`;
  const mr=await gql(tok,MF,{mf:[
    {ownerId:pageId, namespace:'global', key:'title_tag', type:'single_line_text_field', value:TITLE_TAG},
    {ownerId:pageId, namespace:'global', key:'description_tag', type:'single_line_text_field', value:DESC_TAG},
  ]});
  const me=mr?.data?.metafieldsSet?.userErrors||[]; if(me.length) console.error('✗ SEO-Meta:',JSON.stringify(me)); else console.log('✓ SEO-Meta gesetzt.');
}
console.log(`Fertig: /pages/${HANDLE} live (Kauf-Intent-Landingpage, generisch).`);
