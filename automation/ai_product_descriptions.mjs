#!/usr/bin/env node
/* ai_product_descriptions — veredelt dünne/generische Produktbeschreibungen mit einzigartigem,
 * benefit-getriebenem Text (Gemini). Behält Spec-Detail-Block (ls-feed-details) + setzt Trust-Zeile.
 * Macht Beschreibungen UNIQUE (gut für SEO, kein Duplicate Content) + verkaufsstark (Conversion).
 * Idempotent: Marker <!--ls-ai-desc--> → re-runs überspringen. Batch via LIMIT (default 150).
 * DRY-Default. LIVE=1 schreibt. ENV: SHOPIFY_*, GEMINI_API_KEY (oder /tmp/gemini_key).
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const LIVE=process.env.LIVE==='1';
const LIMIT=parseInt(process.env.LIMIT||'150',10);
const GEMINI=(process.env.GEMINI_API_KEY||(fs.existsSync('/tmp/gemini_key')?fs.readFileSync('/tmp/gemini_key','utf8').trim():'')).trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TRUST='<p>🇨🇭 Schweizer Shop · 🚚 Gratis-Versand ab CHF 65 · ↩️ 30 Tage Rückgabe · Code <strong>WELCOME10</strong> = –10%</p>';
async function tk(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function gql(t,q,v){for(let a=0;a<5;a++){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});if(r.status===429||r.status>=500){await sleep((a+1)*2000);continue;}return r.json();}return null;}
async function gemini(prompt){for(let a=0;a<3;a++){try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.7,maxOutputTokens:600}})});if(r.status===429||r.status>=500){await sleep((a+1)*3000);continue;}const j=await r.json();const txt=j?.candidates?.[0]?.content?.parts?.[0]?.text;if(txt)return txt;}catch{await sleep(1500);}}return null;}

const t=await tk();if(!t){console.error('Kein Token');process.exit(1);}
if(!GEMINI){console.error('Kein GEMINI_API_KEY');process.exit(1);}
const Q=`query($c:String){products(first:50,query:"tag:bigbuy status:active",sortKey:CREATED_AT,reverse:true,after:$c){pageInfo{hasNextPage endCursor}edges{node{id title productType descriptionHtml}}}}`;
let c=null,items=[],seen=new Set(),stall=0;
do{const r=await gql(t,Q,{c});const pg=r?.data?.products;if(!pg){await sleep(2000);continue;}const b=items.length;
 for(const e of pg.edges){if(seen.has(e.node.id))continue;seen.add(e.node.id);
   if((e.node.descriptionHtml||'').includes('ls-ai-desc'))continue; // schon veredelt
   items.push(e.node); }
 if(items.length===b){if(++stall>=5)break;}else stall=0;
 c=pg.pageInfo.hasNextPage?pg.pageInfo.endCursor:null;
}while(c && items.length<LIMIT);
console.log(`${items.length} Produkte ohne KI-Beschreibung (Batch, LIMIT ${LIMIT}).`);

let done=0,skip=0;
for(const n of items){
 // bestehenden Spec-Block (ls-feed-details) erhalten
 const m=(n.descriptionHtml||'').match(/<div class="ls-feed-details">[\s\S]*?<\/div>/);
 const spec=m?m[0]:'';
 const prompt=`Schreibe eine verkaufsstarke, EINZIGARTIME deutsche Produktbeschreibung (Schweizer Online-Shop LuxeStyle) für:
Produkt: "${n.title}"${n.productType?` (Kategorie: ${n.productType})`:''}

Format als HTML:
1) <p>…</p> — 2–3 ganze Sätze, benefit-getrieben (was hat die Kund:in davon, Anwendung, Gefühl), spezifisch auf DIESES Produkt, KEINE generischen Floskeln, kein Keyword-Stuffing, kein Preis.
2) <ul> mit 3–4 <li> — konkrete Vorteile/Eigenschaften (kurz).
Antworte NUR mit dem HTML (<p>…</p><ul>…</ul>), nichts davor/danach, keine Markdown-Zäune.`;
 let body=await gemini(prompt);
 if(!body){skip++;continue;}
 body=body.replace(/^```html?\s*/i,'').replace(/```\s*$/,'').trim();
 if(body.length<80){skip++;continue;}
 const full=`${body}\n${spec}\n${TRUST}\n<!--ls-ai-desc-->`;
 if(LIVE){
   const r=await gql(t,`mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}`,{i:{id:n.id,descriptionHtml:full}});
   const e=r?.data?.productUpdate?.userErrors||[];if(e.length){console.log(' ⚠️',JSON.stringify(e).slice(0,100));skip++;continue;}
 }
 done++; if(done%25===0)console.log(`  … ${done}/${items.length}`);
 await sleep(250);
}
console.log(`\nFertig. Veredelt: ${done} · übersprungen: ${skip} ${LIVE?'':'(DRY)'}`);
