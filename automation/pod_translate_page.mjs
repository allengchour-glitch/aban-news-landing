#!/usr/bin/env node
/* LuxeStyle — pod_translate_page.mjs
 * Registriert eine ENGLISCHE Übersetzung der POD-Seite "Selbst gestalten" (Titel/Body/Meta) für locale 'en'.
 * Baut den EN-Body produkt-first (gleiche Struktur wie die DE-Seite) aus dropship/pod/wunsch_raw.json.
 * Auth: Client-Credentials. No-op ohne Creds.
 * ENV: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET, [POD_PAGE_ID]
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP||'', CID=process.env.SHOPIFY_CLIENT_ID||'', SECRET=process.env.SHOPIFY_CLIENT_SECRET||'';
const PAGE=process.env.POD_PAGE_ID||'gid://shopify/Page/698444710273', API='2024-10';
if(!SHOP||!CID||!SECRET){ console.log('Creds fehlen → No-op.'); process.exit(0); }
const data=JSON.parse(fs.readFileSync('dropship/pod/wunsch_raw.json','utf8'));

// EN-Namen je Handle-Prefix
const EN={
  'klassisches-unisex-t-shirt':'Classic Unisex T-Shirt','unisex-t-shirt':'Unisex T-Shirt','premium-hoodie':'Premium Hoodie',
  'unisex-hoodie':'Unisex Hoodie','keramik-tasse':'Ceramic Mug','bio-jutebeutel':'Organic Tote Bag',
  'baumwolltasche-mit-langen-henkeln':'Cotton Tote (long handles)','dad-cap':'Dad Cap','hardcase-iphone':'iPhone Hard Case (MagSafe)',
  'transparente-iphone':'Clear iPhone Case','edelstahl-trinkflasche':'Steel Water Bottle (straw)','urban-umhangetasche':'Urban Crossbody Bag',
  'alltags-umhangetasche':'Everyday Crossbody Bag','allover-stoffbeutel':'All-Over Tote Bag','kiss-cut-aufkleber':'Kiss-Cut Stickers',
  'allover-rucksack':'All-Over Backpack','allover-yoga-leggings':'All-Over Yoga Leggings','recycelter-unisex-allover-hoodie':'Recycled All-Over Hoodie',
  'recycelter-unisex-allover-pullover':'Recycled All-Over Sweatshirt','recycelte-allover-jogginghosen':'Recycled All-Over Joggers',
  'unisex-allover-bomberjacke':'All-Over Bomber Jacket','kleid-mit-schlitz':'All-Over Slit Dress','einteiliger-allover-badeanzug':'All-Over One-Piece Swimsuit',
  'boardshorts-mit-allover-druck':'All-Over Board Shorts','allover-sport-bh':'All-Over Sports Bra','baby-jersey-body':'Baby Jersey Bodysuit'
};
const order=['klassisches-unisex-t-shirt','unisex-t-shirt','premium-hoodie','unisex-hoodie','keramik-tasse','bio-jutebeutel','baumwolltasche-mit-langen-henkeln','dad-cap','hardcase-iphone','transparente-iphone','edelstahl-trinkflasche','urban-umhangetasche','alltags-umhangetasche','allover-stoffbeutel','kiss-cut-aufkleber','allover-rucksack','allover-yoga-leggings','recycelter-unisex-allover-hoodie','recycelter-unisex-allover-pullover','recycelte-allover-jogginghosen','unisex-allover-bomberjacke','kleid-mit-schlitz','einteiliger-allover-badeanzug','boardshorts-mit-allover-druck','allover-sport-bh','baby-jersey-body'];
const catOf=h=>/jutebeutel|baumwolltasche|stoffbeutel|rucksack|umhangetasche/.test(h)?'taschen':(/dad-cap|iphone|trinkflasche|keramik-tasse|aufkleber/.test(h)?'accessoires':'kleidung');
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function enName(h){ for(const k in EN){ if(h.startsWith(k)) return EN[k]; } return h; }

let prods=data.products.edges.map(e=>{const n=e.node; const amt=parseFloat(n.priceRangeV2.minVariantPrice.amount); const price=amt%1===0?`CHF ${amt}.–`:`CHF ${amt.toFixed(2)}`; return {name:enName(n.handle), handle:n.handle, img:n.featuredImage?.url||'', price, cat:catOf(n.handle)};});
const rank=h=>{const i=order.findIndex(o=>h.startsWith(o));return i<0?999:i;};
prods.sort((a,b)=>rank(a.handle)-rank(b.handle));
const card=p=>`<a class="lspod-card" data-cat="${p.cat}" href="/products/${encodeURIComponent(p.handle)}">
      <div class="lspod-imgwrap"><img loading="lazy" src="${p.img}" alt="${esc(p.name)} – design it yourself"></div>
      <div class="lspod-info"><span class="lspod-name">${esc(p.name)}</span><span class="lspod-price">from ${p.price}</span></div>
      <span class="lspod-go">Design it →</span>
    </a>`;

const STYLE=fs.readFileSync('dropship/pod/page_body.html','utf8').match(/<style>[\s\S]*?<\/style>/)[0];

const BODY=`<div class="lspod">
${STYLE}
<section class="lspod-hero">
  <p class="lspod-eyebrow">LuxeStyle · Print on Demand</p>
  <h2>Your Design. Your Piece.</h2>
  <p class="sub">Pick a product, upload your artwork – we print &amp; ship. No minimum order.</p>
  <div class="lspod-ideas"><span>📷 Photo</span><span>✍️ Slogan</span><span>🎨 Artwork</span><span>🏷️ Logo</span><span>👕 Team design</span><span>🎁 Gift</span></div>
  <div class="lspod-trust"><span>🇨🇭 Free shipping over CHF 65</span><span>⚡ On-demand</span><span>📦 5–10 days</span><span>↩️ 30-day returns</span></div>
  <a class="lspod-cta" href="#produkte">Choose your product ↓</a>
</section>
<section id="produkte" class="lspod-section" style="padding-top:8px;">
  <h3 class="lspod-sech">Choose your product</h3>
  <p class="lspod-secsub">${prods.length} products – from CHF 3. Tap one, upload your design.</p>
  <div class="lspod-filter">
    <button class="lspod-fbtn is-active" data-filter="all">All</button>
    <button class="lspod-fbtn" data-filter="kleidung">Clothing</button>
    <button class="lspod-fbtn" data-filter="taschen">Bags</button>
    <button class="lspod-fbtn" data-filter="accessoires">Accessories</button>
  </div>
  <div class="lspod-grid" id="lspod-grid">
    ${prods.map(card).join('\n    ')}
  </div>
  <p class="lspod-note">Price incl. one-sided print. All options &amp; the final price are shown transparently in the designer – no hidden costs.</p>
</section>
<section class="lspod-section">
  <h3 class="lspod-sech">Inspiration</h3>
  <p class="lspod-secsub">How yours could look – text, photo, logo or artwork. You design, we print.</p>
  <div class="lspod-insp">
    <figure><img loading="lazy" src="https://abannews.com/social/looks/ex-tshirt-mountain.png" alt="Design example: minimalist t-shirt"><figcaption>Minimal line</figcaption></figure>
    <figure><img loading="lazy" src="https://abannews.com/social/looks/ex-hoodie-sunset.png" alt="Design example: retro hoodie"><figcaption>Retro sunset</figcaption></figure>
    <figure><img loading="lazy" src="https://abannews.com/social/looks/ex-mug-quote.png" alt="Design example: mug with quote"><figcaption>Your quote</figcaption></figure>
    <figure><img loading="lazy" src="https://abannews.com/social/looks/ex-tote-cat.png" alt="Design example: tote with artwork"><figcaption>Your artwork</figcaption></figure>
    <figure><img loading="lazy" src="https://abannews.com/social/looks/ex-tshirt-paint.png" alt="Design example: colourful t-shirt"><figcaption>Colourful</figcaption></figure>
    <figure><img loading="lazy" src="https://abannews.com/social/looks/ex-case-marble.png" alt="Design example: marble phone case"><figcaption>Your style</figcaption></figure>
  </div>
</section>
<section class="lspod-section" style="background:var(--bg);border-radius:20px;margin:8px 0;">
  <h3 class="lspod-sech">How it works</h3>
  <p class="lspod-secsub">Your one-off in under 2 minutes.</p>
  <div class="lspod-steps">
    <div class="lspod-step"><span class="lspod-ico">👕</span><span class="lspod-num">1</span><b>Pick a product</b><p>T-shirt, hoodie, mug, bag, phone case &amp; more.</p></div>
    <div class="lspod-step"><span class="lspod-ico">⬆️</span><span class="lspod-num">2</span><b>Upload your design</b><p>Slogan, photo, artwork or logo – place it right in the editor.</p></div>
    <div class="lspod-step"><span class="lspod-ico">✅</span><span class="lspod-num">3</span><b>Preview &amp; order</b><p>Check the live preview, order – we print on demand.</p></div>
  </div>
  <div class="lspod-why">
    <div><div class="i">🇨🇭</div><b>Swiss shop</b><span>support &amp; TWINT</span></div>
    <div><div class="i">🖨️</div><b>Verified print quality</b><span>vivid, long-lasting colours</span></div>
    <div><div class="i">🔒</div><b>Secure payment</b><span>TWINT · card · PayPal</span></div>
    <div><div class="i">💯</div><b>Satisfaction guarantee</b><span>defect? we replace free</span></div>
  </div>
</section>
<div class="lspod-band">
  <div><b>100+</b><span>Colours &amp; sizes</span></div>
  <div><b>0</b><span>Minimum order</span></div>
  <div><b>5–10</b><span>Days delivery</span></div>
  <div><b>🇨🇭</b><span>Swiss shop · TWINT</span></div>
</div>
<section class="lspod-section">
  <h3 class="lspod-sech">FAQ</h3>
  <div class="lspod-faq">
    <details open><summary>How do I upload my design?</summary><p>Pick a product, open the designer and upload your image, photo or logo. You'll see a live preview and can adjust size &amp; position.</p></details>
    <details><summary>What does personalisation cost?</summary><p>The shown price (from CHF X) includes a one-sided print. Extra options and the final price are shown transparently in the designer – no hidden costs.</p></details>
    <details><summary>Is there a minimum order?</summary><p>No. You can order from a single piece – each item is produced on demand for you.</p></details>
    <details><summary>How long is delivery?</summary><p>Production &amp; shipping together take about 5–10 business days. Free shipping over CHF 65.</p></details>
    <details><summary>Which files work best?</summary><p>High-resolution PNG or JPG (min. 1500 px). For logos/artwork we recommend transparent PNGs.</p></details>
    <details><summary>Can I return it?</summary><p>For print defects or flaws we replace free of charge. Our 30-day return policy applies.</p></details>
  </div>
</section>
<section class="lspod-final">
  <h3>Ready? Create your one-off.</h3>
  <p>Over ${prods.length} products await your design – from CHF 3.</p>
  <a class="lspod-cta" href="#produkte">Choose product ↑</a>
</section>
${fs.readFileSync('dropship/pod/page_body.html','utf8').match(/<script>[\s\S]*?<\/script>/)[0]}
</div>`;

const EN_TITLE='Design it yourself – your design on a T-shirt, hoodie & more';
const EN_METATITLE='Design your own T-shirt, hoodie & more | LuxeStyle Switzerland';
const EN_METADESC='Create your own piece: T-shirt, hoodie, mug, bag, phone case & more with your design, photo or logo. Printed on demand, from CHF 3, no minimum order.';

async function token(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:SECRET,grant_type:'client_credentials'})}); const j=await r.json(); if(!j.access_token){console.error('Token',r.status);process.exit(1);} return j.access_token; }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }

const tok=await token();
const tr=await gql(tok,`query($id:ID!){ translatableResource(resourceId:$id){ translatableContent{ key digest } } }`,{id:PAGE});
const dig={}; (tr.data.translatableResource.translatableContent||[]).forEach(c=>dig[c.key]=c.digest);
const translations=[
  {locale:'en',key:'title',value:EN_TITLE,translatableContentDigest:dig.title},
  {locale:'en',key:'body_html',value:BODY,translatableContentDigest:dig.body_html},
  {locale:'en',key:'meta_title',value:EN_METATITLE,translatableContentDigest:dig.meta_title},
  {locale:'en',key:'meta_description',value:EN_METADESC,translatableContentDigest:dig.meta_description}
].filter(t=>t.translatableContentDigest);
const M=`mutation($id:ID!,$tr:[TranslationInput!]!){ translationsRegister(resourceId:$id, translations:$tr){ userErrors{ field message } translations{ key locale } } }`;
const res=await gql(tok,M,{id:PAGE,tr:translations});
const ue=res.data&&res.data.translationsRegister&&res.data.translationsRegister.userErrors||[];
if(res.errors||ue.length){ console.error('Fehler:',JSON.stringify(res.errors||ue).slice(0,400)); process.exit(1); }
console.log('✅ EN-Übersetzung registriert:', (res.data.translationsRegister.translations||[]).map(t=>t.key).join(', '), `(Body ${BODY.length} Zeichen)`);
