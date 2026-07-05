#!/usr/bin/env node
/* cj_raucher — importiert Raucher-/Dreh-Zubehör (Grinder, Pfeifen, Rolling Trays, Aschenbecher) von CJ
 * per SUCHE (CJ hat keine Grinder-Kategorie). LEGAL CH 18+, aber COMPLIANCE: publiziert NUR Online Store + POS
 * (raus aus Google/Meta/TikTok/Pinterest). Tags raucher+18plus. Ledger dropship/cj_raucher_done.txt.
 * ENV: SHOPIFY_*, CJ_TOKEN, CAP, LIVE=1, GEMINI_API_KEY (optional für DE-Titel).
 */
import fs from 'node:fs';
const SHOP=process.env.SHOPIFY_SHOP,CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET,API='2025-01';
const CJT=(process.env.CJ_TOKEN||'').trim(), GK=process.env.GEMINI_API_KEY;
const LIVE=process.env.LIVE==='1', CAP=parseInt(process.env.CAP||'40',10);
const LEDGER='dropship/cj_raucher_done.txt';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TERMS=['herb grinder','weed grinder','rolling tray','tobacco rolling machine','smoking pipe','tobacco pipe','glass pipe','metal cigarette case','cigarette ashtray','hookah shisha'];
// BAN: alles was KEIN Raucher-Zeug ist, aber „grinder/mill/pipe/tray" im Namen trägt (Küche/Haustier/Werkzeug/Sanitär).
const BAN=/wholesale|\bsample\b|replacement|kinder|for kids|baby|cbd|thc|weed leaf|vape|e-liquid|nicotine|nail|paw|claw|\bpet\b|\bdog\b|\bcat\b|foot|callus|meat|coffee|\bsalt\b|pepper|spice|garlic|angle grinder|\bwood\b|granite|drill|chuck|blender|mincer|kitchen|\bmill\b|grain|flour|bench grinder|sander|polish|whetstone|sharpen|tool set|cutting disc|pvc|plumb|drain|garden|hose|meat|coffee|nut/i;
// Positiv-Filter: Name MUSS eine raucher-spezifische Phrase enthalten (nicht bloss „grinder"/„pipe").
const SMOKE=/herb grinder|weed grinder|tobacco grinder|rolling tray|rolling paper|rolling machine|smoking pipe|tobacco pipe|glass pipe|hand pipe|water pipe|bubbler|hookah|shisha|ashtray|cigarette case|cigarette holder|cigar case|snuff/i;
const chf=u=>{u=parseFloat((''+u).split('--')[0])||0;let m=u<8?2.4:u<20?2.2:u<50?2.0:1.85;return Math.max(4.9,Math.round(u*m)+0.9).toFixed(2);};
async function cj(p){const r=await fetch('https://developers.cjdropshipping.com/api2.0/v1'+p,{headers:{'CJ-Access-Token':CJT}});return r.json();}
async function shTok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return(await r.json()).access_token;}
async function sgql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
async function deTitle(en){ if(!GK) return null; try{const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GK}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:`Übersetze diesen Produktnamen in einen kurzen, sauberen DEUTSCHEN Produkttitel (max 60 Zeichen, kein Markenname erfinden, Raucher-/Dreh-Zubehör): "${en}". Nur den Titel ausgeben.`}]}],generationConfig:{temperature:0.4,thinkingConfig:{thinkingBudget:0}}})});const j=await r.json();return (j?.candidates?.[0]?.content?.parts?.[0]?.text||'').trim().replace(/^["']|["']$/g,'').slice(0,70);}catch{return null;} }

const SET=`mutation($i:ProductSetInput!){productSet(synchronous:true,input:$i){product{id}userErrors{message}}}`;
const MED=`mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){userErrors{message}}}`;
const PUB=`mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`;
const TRUST=`<p>📦 Lieferung ca. 10–20 Tage · 🔞 Nur für Erwachsene ab 18 Jahren · 🇨🇭 LuxeStyle</p>`;

const st=await shTok();
// NUR Online Store + POS Publications (Compliance)
const pubsAll=(await sgql(st,`{publications(first:20){edges{node{id name}}}}`)).data.publications.edges;
const ONLINE=pubsAll.filter(e=>/online store|point of sale/i.test(e.node.name)).map(e=>({publicationId:e.node.id}));
console.log('Publiziert nur auf:', pubsAll.filter(e=>/online store|point of sale/i.test(e.node.name)).map(e=>e.node.name).join(', '));
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.replace('cj:','').trim()).filter(Boolean):[]);
let total=0;
for(const term of TERMS){
  if(total>=CAP)break;
  for(let page=1;page<=3 && total<CAP;page++){
    const j=await cj(`/product/list?pageSize=20&pageNum=${page}&productNameEn=${encodeURIComponent(term)}`); await sleep(800);
    const list=(j.data&&j.data.list)||[]; if(!list.length)break;
    for(const p of list){
      if(total>=CAP)break;
      const nm=p.productNameEn||''; if(!nm||done.has(String(p.pid))||BAN.test(nm))continue;
      if(!SMOKE.test(nm))continue; // muss raucher-spezifisch passen (strenge Positiv-Phrase)
      const pr=parseFloat((''+p.sellPrice).split('--')[0])||0; if(pr<1||pr>60)continue;
      const dj=await cj(`/product/query?pid=${p.pid}`); await sleep(700);
      const d=dj.data||{}; const imgs=((d.productImageSet)||[]).filter(u=>/^https/.test(u)).slice(0,6);
      if(imgs.length<2)continue;
      let title=await deTitle(nm)||nm.slice(0,70);
      const slug=title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,44)+'-'+String(p.pid).slice(-6);
      const html=`<p><strong>${title}</strong></p><ul><li>Robuste Qualität für Genießer</li><li>Praktisch & langlebig</li><li>Diskret verpackt</li></ul>${TRUST}`;
      if(!LIVE){console.log(`  [DRY] CHF${chf(p.sellPrice)} | ${title}`);total++;continue;}
      const input={title,handle:slug,productType:'Raucherzubehör',vendor:'LuxeStyle',status:'ACTIVE',tags:['raucher','18plus','zubehoer','cj-real'],descriptionHtml:html,
        seo:{title:(title+' (18+) | LuxeStyle').slice(0,70),description:(`${title} – Raucher-/Dreh-Zubehör für Erwachsene. Nur ab 18 Jahren.`).slice(0,300)},
        productOptions:[{name:'Variante',values:[{name:'Standard'}]}],
        variants:[{optionValues:[{optionName:'Variante',name:'Standard'}],price:chf(p.sellPrice),inventoryItem:{sku:('CJ-'+p.pid).slice(0,70),tracked:false},inventoryPolicy:'CONTINUE'}],
        files:[{originalSource:imgs[0],contentType:'IMAGE'}]};
      const r=await sgql(st,SET,{i:input}); const e=r.data?.productSet?.userErrors||[]; const pid=r.data?.productSet?.product?.id;
      if(e.length||!pid){console.log('  ✗',title.slice(0,30),JSON.stringify(e).slice(0,80));continue;}
      if(imgs.length>1)await sgql(st,MED,{id:pid,m:imgs.slice(1).map(u=>({originalSource:u,mediaContentType:'IMAGE'}))});
      await sgql(st,PUB,{id:pid,p:ONLINE}); // NUR Online Store + POS
      fs.appendFileSync(LEDGER,'cj:'+p.pid+'\n'); done.add(String(p.pid));
      total++; console.log(`✅ ${title} → CHF ${chf(p.sellPrice)}`);
      await sleep(300);
    }
  }
}
console.log(`\nFERTIG: ${total} Raucher-Produkte (nur Online Store + POS)${LIVE?'':' [DRY]'}.`);
