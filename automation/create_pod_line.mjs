#!/usr/bin/env node
/* LuxeStyle — create_pod_line.mjs
 * Generischer FERTIG-POD-Produktgenerator: legt aus Designs (social/designs/*.png) eine ganze Produktlinie an
 * (Shirt/Tasse/Tote/Kissen/Mauspad), themen-Copy + SEO, ACTIVE + publiziert, Auto-Druck über Printful.
 * SKU `9000001_<printfulVariantId>` + Metafeld custom.print_file → printful_sync druckt automatisch.
 * Idempotent über Handle + Ledger social/designs/_pod_<type>_created.txt. No-op ohne Creds. DRY_RUN=1.
 * ENV: TYPE=shirt|mug|tote|mousepad|cushion · SOURCE=schweiz|all (oder ONLY=a,b) · SHOPIFY_* · [LIMIT=60] · [DRY_RUN=1]
 */
import fs from 'node:fs';
const SHOPraw=process.env.SHOPIFY_SHOP||''; const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01'; const PREFIX='9000001';
const TYPE=(process.env.TYPE||'mug').trim().toLowerCase();
const SOURCE=(process.env.SOURCE||'schweiz').trim().toLowerCase();
const ONLY=(process.env.ONLY||'').split(',').map(s=>s.trim()).filter(Boolean);
const LIMIT=Math.max(1,parseInt(process.env.LIMIT||'60',10)||60);
const BASE='https://abannews.com/social/designs/'; const DIR='social/designs';
let SHOP=SHOPraw.replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }

// ── Produkttyp-Konfigs (Printful-Varianten verifiziert via öffentlichem Katalog) ──
const TYPES={
  shirt:{ pt:'T-Shirt', prefix:'shirt', opt:'Grösse', tags:['kleidung','t-shirt','herren','damen'],
    sizes:[['S','4011','29.90'],['M','4012','29.90'],['L','4013','29.90'],['XL','4014','29.90'],['2XL','4015','32.90']],
    blurb:n=>`«${n}» auf einem weichen Unisex-T-Shirt (Bella+Canvas 3001, 100% gekämmte Baumwolle). Schweizer Mundart &amp; Motive zum Anziehen.`,
    bullets:['100% Baumwolle, angenehm weich','Unisex-Schnitt, S–2XL','Direktdruck, langlebig','Perfektes Geschenk'] },
  mug:{ pt:'Tasse', prefix:'tasse', opt:'Grösse', tags:['tasse','geschenk','kueche'],
    sizes:[['11 oz (Standard)','1320','16.90'],['15 oz (Gross)','4830','19.90']],
    blurb:n=>`«${n}» auf einer glänzenden Keramik-Tasse. Spülmaschinen- &amp; mikrowellenfest – der perfekte Start in den Tag.`,
    bullets:['Hochwertige Keramik, glänzend','Spülmaschinen- & mikrowellenfest','11 oz oder 15 oz','Schönes CH-Geschenk'] },
  tote:{ pt:'Tasche', prefix:'tote', opt:'Grösse', tags:['tasche','accessoire','nachhaltig'],
    sizes:[['38 × 38 cm','4533','21.90']],
    blurb:n=>`«${n}» auf einer robusten All-Over-Stofftasche. Gross, langlebig und alltagstauglich – für Einkauf, Uni &amp; Strand.`,
    bullets:['Robustes Gewebe, grosses Volumen','All-Over-Druck','Wiederverwendbar & nachhaltig','Tolles Geschenk'] },
  mousepad:{ pt:'Mauspad', prefix:'mousepad', opt:'Grösse', tags:['mauspad','buero','gaming','tech'],
    sizes:[['18 × 16 cm','14943','17.90']],
    blurb:n=>`«${n}» auf einem rutschfesten Mauspad. Glatte Oberfläche für präzises Tracking – Büro &amp; Gaming.`,
    bullets:['Rutschfeste Gummi-Unterseite','Glatte Oberfläche','Abriebfester Druck','Für Büro & Gaming'] },
  cushion:{ pt:'Kissen', prefix:'kissen', opt:'Grösse', tags:['kissen','wohnen','dekoration'],
    sizes:[['45 × 45 cm','4532','29.90'],['56 × 30 cm','9513','29.90']],
    blurb:n=>`«${n}» auf einem kuscheligen Deko-Kissen (inkl. Füllung). Bringt Schweizer Charme aufs Sofa.`,
    bullets:['Weiche Füllung inklusive','All-Over-Druck beidseitig möglich','Versteckter Reissverschluss','Wohn-Deko & Geschenk'] },
};
const CFG=TYPES[TYPE]; if(!CFG){ console.error('Unbekannter TYPE (shirt|mug|tote|mousepad|cushion).'); process.exit(1); }
const LEDGER=`social/designs/_pod_${TYPE}_created.txt`;

async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

function theme(n){ if(/swiss|matterhorn|fondue|alphorn|edelweiss|gruezi|hoppschwiiz|cowbell|ch-|heidi|raclette|enzian|steinbock|murmeli|alpaufzug|chuchi|cervelat|znueni|fasnacht|postauto|baern|basel|prosit|eidgenoss|apero|feierabig|haerzlech|gopfertami|sali-zaeme/.test(n))return 'schweiz';
  if(/^text-(gruezi|hoi|hoppschwiiz|merci)/.test(n))return 'schweiz'; return 'andere'; }
function pretty(n){ const m={'text-hoi':'Hoi','text-gruezi':'Grüezi','text-hoppschwiiz':'Hopp Schwiiz','text-merci':'Merci'};
  if(m[n])return m[n]; return n.replace(/^(text|tattoo|badge|logo)-/,'').replace(/^ch-/,'').replace(/-(cute|y2k|line|vtg|graffiti|face|jack|spooky|sun|pattern|caquelon|mitenand|vilmal|zaeme)$/,'').replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase()); }

const SET=`mutation($input:ProductSetInput!){ productSet(synchronous:true,input:$input){ product{ id handle } userErrors{ field message } } }`;
const MF=`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ field message } } }`;
const PUBQ=`{ publications(first:20){ edges{ node{ id } } } }`;
const PUB=`mutation($id:ID!,$pubs:[PublicationInput!]!){ publishablePublish(id:$id,input:$pubs){ userErrors{ field message } } }`;

const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[]);
let names=fs.readdirSync(DIR).filter(f=>f.endsWith('.png')).map(f=>f.replace(/\.png$/,''));
if(ONLY.length) names=names.filter(n=>ONLY.includes(n));
else if(SOURCE==='schweiz') names=names.filter(n=>theme(n)==='schweiz');
names=names.filter(n=>!done.has(n)).slice(0,LIMIT);
console.log(`${names.length} ${CFG.pt}-Produkte (TYPE=${TYPE}, SOURCE=${SOURCE})${DRY?' [DRY]':''}`);
if(DRY){ names.forEach(n=>console.log(`  PLAN: ${CFG.pt} «${pretty(n)}» → ${CFG.prefix}-${n.replace(/^ch-/,'')}`)); process.exit(0); }

const tok=await token();
const pubs=((await gql(tok,PUBQ))?.data?.publications?.edges||[]).map(e=>({publicationId:e.node.id}));
let made=0, fails=[];
for(const n of names){
  const url=BASE+n+'.png'; const name=pretty(n); const th=theme(n);
  const title=`${CFG.pt} «${name}»`;
  const tags=['printful_personalized_product',`fertig-${TYPE}`,...CFG.tags]; if(th==='schweiz') tags.push('schweiz-edition');
  const input={ title, handle:`${CFG.prefix}-`+n.replace(/^ch-/,''), productType:CFG.pt, vendor:'LuxeStyle', status:'ACTIVE',
    descriptionHtml:`<p><strong>${CFG.blurb(name)}</strong></p><ul>${CFG.bullets.map(b=>`<li>${b}</li>`).join('')}</ul><p>🇨🇭 On-demand in Europa gedruckt · LuxeStyle</p>`,
    seo:{ title:`${CFG.pt} «${name}» | LuxeStyle`, description:`${CFG.pt} mit Motiv «${name}». In Europa gedruckt, Premium-Qualität. Gratis-Versand ab CHF 65.` },
    tags,
    productOptions:[{name:CFG.opt, values:CFG.sizes.map(s=>({name:s[0]}))}],
    variants:CFG.sizes.map(s=>({ optionValues:[{optionName:CFG.opt,name:s[0]}], price:s[2], sku:`${PREFIX}_${s[1]}`, inventoryPolicy:'CONTINUE' })),
    files:[{originalSource:url, contentType:'IMAGE', alt:title}] };
  const r=await gql(tok,SET,{input}); const e=r?.data?.productSet?.userErrors||[];
  if(e.length||!r?.data?.productSet?.product){ fails.push(`${n}: ${JSON.stringify(e.length?e:r).slice(0,140)}`); continue; }
  const pid=r.data.productSet.product.id;
  await gql(tok,MF,{mf:[{ownerId:pid,namespace:'custom',key:'print_file',type:'url',value:url}]});
  if(pubs.length) await gql(tok,PUB,{id:pid,pubs});
  fs.appendFileSync(LEDGER,n+'\n'); made++; if(made%10===0) console.log(`  … ${made}`);
  await new Promise(x=>setTimeout(x,250));
}
if(fails.length) fails.slice(0,15).forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${made} ${CFG.pt}-Produkt(e) angelegt${fails.length?`, ${fails.length} Fehler`:''}.`);
