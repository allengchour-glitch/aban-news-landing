#!/usr/bin/env node
/* LuxeStyle — printful_create_design_products.mjs
 * Macht aus den Fertig-Designs (social/designs/*.png) verkaufbare KISS-CUT-STICKER-Produkte via Printful.
 * Pro Design: Cloudinary-Upload der Druckdatei → POST /store/products (Printful legt das Produkt an und
 * pusht es als Shopify-Produkt; Printful erzeugt die Sticker-Mockups selbst). Auto-Fulfillment.
 * Idempotent über Ledger social/designs/_created.txt. DRY_RUN=1 → nur Vorschau der Payloads.
 *
 * ENV: PRINTFUL_API_KEY (Pflicht) · [PRINTFUL_STORE_ID] · [CLOUD=dwyi6kkrl] · [PRESET=pigto8ba]
 *      [LIMIT=99] · [ONLY=name,name] · [DRY_RUN=1]
 */
import fs from 'node:fs';
import path from 'node:path';
const PF_KEY=(process.env.PRINTFUL_API_KEY||'').trim();
const PF_STORE=(process.env.PRINTFUL_STORE_ID||'').trim();
const CLOUD=process.env.CLOUD||'dwyi6kkrl';
const PRESET=process.env.PRESET||'pigto8ba';
const LIMIT=Math.max(1,parseInt(process.env.LIMIT||'99',10)||99);
const ONLY=(process.env.ONLY||'').split(',').map(s=>s.trim()).filter(Boolean);
const DRY=process.env.DRY_RUN==='1';
const DIR='social/designs';
const LEDGER=path.join(DIR,'_created.txt');
if(!PF_KEY){ console.log('Kein PRINTFUL_API_KEY → No-op.'); process.exit(0); }

// Kiss-Cut-Sticker Printful-Katalog-Varianten (aus bestehendem Sticker-Produkt) + Verkaufspreise CHF
const VARIANTS=[
  {variant_id:10163, retail_price:'5.90'},   // 3"×3"
  {variant_id:10164, retail_price:'5.90'},   // 4"×4"
  {variant_id:10165, retail_price:'6.90'},   // 5.5"×5.5"
  {variant_id:16362, retail_price:'9.90'},   // 15"×3.75" (Kiss-Cut Streifen)
];
// Schöne Produktnamen
const NAMES={
 'text-hoi':'Sticker «Hoi» – Schweiz','text-gruezi':'Sticker «Grüezi» – Schweiz',
 'text-vegan':'Sticker «Vegan»','text-plantpowered':'Sticker «Plant Powered»',
 'text-goodvibes':'Sticker «Good Vibes Only»','text-bekind':'Sticker «Be Kind»',
 'text-staywild':'Sticker «Stay Wild»','text-kaffee':'Sticker «Kaffee zuerst»',
 'art-mountains':'Sticker «Berge» Line-Art','art-veggies':'Sticker «Veggie-Gang»',
 'cat-astronaut':'Sticker «Cat Astronaut»','floral-line':'Sticker «Wildblumen» Line-Art',
 'retro-sunset':'Sticker «Retro Sunset»','y2k-butterfly':'Sticker «Y2K Butterfly»',
 'art-cow-save':'Sticker «Cute Cow»',
};
function nice(n){ return NAMES[n]|| ('Sticker «'+n.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase())+'»'); }

async function cloudUpload(file){
  const buf=fs.readFileSync(file);
  const fd=new FormData(); fd.append('file', new Blob([buf]), path.basename(file)); fd.append('upload_preset',PRESET);
  const r=await fetch('https://api.cloudinary.com/v1_1/'+CLOUD+'/auto/upload',{method:'POST',body:fd});
  const j=await r.json(); if(!j.secure_url) throw new Error('Cloudinary: '+JSON.stringify(j).slice(0,160)); return j.secure_url;
}
async function pf(pathx,body){ const headers={'Authorization':'Bearer '+PF_KEY,'Content-Type':'application/json'}; if(PF_STORE) headers['X-PF-Store-Id']=PF_STORE;
  const r=await fetch('https://api.printful.com'+pathx,{method:'POST',headers,body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({})); return {ok:r.ok,status:r.status,j}; }

const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.trim()).filter(Boolean):[]);
let names=fs.readdirSync(DIR).filter(f=>f.endsWith('.png')).map(f=>f.replace(/\.png$/,''));
if(ONLY.length) names=names.filter(n=>ONLY.includes(n));
names=names.filter(n=>!done.has(n)).slice(0,LIMIT);
console.log(`${names.length} Designs zu Sticker-Produkten${DRY?' (DRY)':''}: ${names.join(', ')}\n`);

let made=0, fails=[];
for(const n of names){
  try{
    const file=path.join(DIR,n+'.png');
    let url='(dry)';
    if(!DRY) url=await cloudUpload(file);
    const body={ sync_product:{ name: nice(n) },
      sync_variants: VARIANTS.map(v=>({ variant_id:v.variant_id, retail_price:v.retail_price, files:[{url}] })) };
    if(DRY){ console.log('PLAN:', nice(n), '| Varianten', VARIANTS.length, '| Preise', VARIANTS.map(v=>v.retail_price).join('/')); made++; continue; }
    const res=await pf('/store/products', body);
    if(!res.ok){ fails.push(`${n}: ${res.status} ${JSON.stringify(res.j).slice(0,180)}`); continue; }
    fs.appendFileSync(LEDGER, n+'\n');
    console.log(`✓ ${nice(n)} → Printful #${res.j?.result?.id||'?'}`);
    made++;
  }catch(e){ fails.push(`${n}: ${e.message}`); }
}
if(fails.length) fails.forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${made} Sticker-Produkt(e)${DRY?' geplant (DRY)':' angelegt'}${fails.length?`, ${fails.length} Fehler`:''}.`);
