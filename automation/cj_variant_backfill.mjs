/* cj_variant_backfill.mjs — rüstet FAST-importierten cj-real-Produkten (1 «Standard»-Variante) die
 * ECHTEN CJ-Varianten nach (Farbe/Grösse-Auswahl) + Technische Details (Gewicht).
 * Anlass 2026-08-05: Beschreibung nannte Farben («Blau, Rot, Gelb …»), aber kein Farbwähler (User-Fund).
 *
 * Pro Produkt: SKU CJ-<pid> → CJ product/query?pid → Varianten → productSet(id, options, variants).
 * Preis je Variante = max(bestehender Shop-Preis, CJ-Formel) → nie unter den reprice-Boden.
 * CJ hat nur 1 Variante → irreführende «Erhältlich in den Farben …»-Zeile aus Beschreibung strippen.
 * Idempotent: Ledger dropship/_cj_variants_done.txt. ENV: LIMIT, DRY=1, ONLY=<handle>, CJ_SLEEP.
 */
import fs from 'node:fs';

const CID = process.env.SHOPIFY_CLIENT_ID, CSEC = process.env.SHOPIFY_CLIENT_SECRET;
const SHOP = 'au3j0y-hq.myshopify.com';
const CJ_EMAIL = (process.env.CJ_EMAIL || '').trim(), CJ_API_KEY = (process.env.CJ_API_KEY || '').trim();
const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';
const TOKEN_FILE = '/tmp/cj_token.json';
const LEDGER = 'dropship/_cj_variants_done.txt';
const LIMIT = parseInt(process.env.LIMIT || '100', 10);
const DRY = process.env.DRY === '1';
const ONLY = (process.env.ONLY || '').trim();
const CJ_SLEEP = parseInt(process.env.CJ_SLEEP || '900', 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ⚠️ Diese Datei hatte eine EIGENE, kleinere Farbtabelle (27 statt 54 Eintraege). Sie kannte
// «dark gray»/«light gray»/«black and white»/«light brown» nicht — der Importer legte saubere
// deutsche Farben an, dieser Nachruester haengte «Dark Gray» daneben. Seit 21.08.2026 teilen
// sich alle CJ-Werkzeuge automation/farben_de.mjs.
import { deColor } from './farben_de.mjs';

const MAT_DE = { plastic:'Kunststoff', metal:'Metall', glass:'Glas', 'stainless steel':'Edelstahl',
  cotton:'Baumwolle', polyester:'Polyester', wood:'Holz', ceramic:'Keramik', silicone:'Silikon',
  'silica gel':'Silikon', leather:'Leder', 'pu leather':'PU-Leder', pu:'PU-Leder', alloy:'Metall-Legierung',
  'zinc alloy':'Zinklegierung', copper:'Kupfer', acrylic:'Acryl', nylon:'Nylon', canvas:'Canvas',
  latex:'Latex', resin:'Harz', bamboo:'Bambus', linen:'Leinen', velvet:'Samt', tpu:'TPU', abs:'ABS',
  pvc:'PVC', sponge:'Schaumstoff', iron:'Eisen', rubber:'Gummi', paper:'Papier', crystal:'Kristall',
  pearl:'Perle', 'zircon':'Zirkonia', flannel:'Flanell', 'oxford cloth':'Oxford-Gewebe', spandex:'Elasthan' };
const deMat = m => { const k=(m||'').toLowerCase().trim(); return MAT_DE[k] || m; };
function extractSpecs(desc){
  const t=(desc||'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,' ');
  const MAP={size:'Masse',dimensions:'Masse','product size':'Masse',thickness:'Dicke',length:'Länge',
    width:'Breite',height:'Höhe',diameter:'Durchmesser',capacity:'Fassungsvermögen',voltage:'Spannung',
    power:'Leistung','battery capacity':'Akku-Kapazität','cable length':'Kabellänge'};
  const rows=[];const seen=new Set();
  for(const line of t.split('\n')){
    const m=line.match(/^\s*([A-Za-z][A-Za-z ]{2,20}):\s*([^:]{2,60})$/);
    if(!m) continue;
    const key=m[1].trim().toLowerCase();
    if(!(key in MAP)||seen.has(MAP[key])) continue;
    const val=m[2].trim().replace(/\s+/g,' ');
    if(!/\d/.test(val)) continue;              // nur Werte mit Zahlen (Masse/Watt/ml …)
    if(/color|colour/i.test(key)) continue;
    seen.add(MAP[key]); rows.push(`${MAP[key]}: ${val}`);
    if(rows.length>=4) break;
  }
  return rows;
}
function buildDetails(cj, colors, sizes){
  const rows=[];
  const mats=(cj?.materialNameEn||[]).map(deMat).filter(Boolean);
  if(mats.length) rows.push(`Material: ${[...new Set(mats)].join(', ')}`);
  const w=Number(cj?.productWeight)||0; if(w>0) rows.push(`Gewicht: ca. ${w>=1000?(w/1000).toFixed(1)+' kg':Math.round(w)+' g'}`);
  for(const r of extractSpecs(cj?.description)) rows.push(r);
  if((cj?.productProEn||[]).includes('BATTERY')) rows.push('Mit Batterie/Akku');
  if(colors&&colors.length>1) rows.push(`Farben: ${colors.join(', ')}`);
  if(sizes&&sizes.length>1) rows.push(`Grössen: ${sizes.join(', ')}`);
  if(!rows.length) return '';
  return `\n<h3>Technische Details</h3><ul>${rows.map(r=>'<li>'+r+'</li>').join('')}</ul>`;
}
async function attachVideo(stok, productId, cj){
  const vurl=cj?.productVideo;
  if(!vurl||!/^https?:\/\//.test(vurl)) return false;
  const r=await gql(stok,`mutation($id:ID!,$m:[CreateMediaInput!]!){ productCreateMedia(productId:$id,media:$m){ mediaUserErrors{message} } }`,
    {id:productId,m:[{originalSource:vurl,mediaContentType:'VIDEO',alt:'Produktvideo'}]});
  return !(r?.data?.productCreateMedia?.mediaUserErrors||[]).length;
}

function parseVar(v){ const k=(v.variantKey||'').trim(); const i=k.lastIndexOf('-'); let color=null,size=null;
  const SZ=/^(XXS|XS|S|M|L|XL|XXL|3XL|4XL|5XL|\d{2,3}(cm|mm)?|One Size|Free Size)$/i;
  if(i>0){ const a=k.slice(0,i).trim(), b=k.slice(i+1).trim();
    if(SZ.test(b)){ color=a; size=b; } else { color=k; } }
  else if(k){ if(SZ.test(k)) size=k; else color=k; }
  return { color, size, price:Number(v.variantSellPrice)||0, weight:Number(v.variantWeight)||0, sku:v.variantSku||'' }; }

const SORDER=['XXS','XS','S','M','L','XL','XXL','3XL','4XL','5XL'];
function chf(usd, weightG){ const landed = usd*0.9 + Math.max(0,( (weightG>500?12:7) )-7);
  let p = Math.max(landed*1.4, landed+5, 14.90); return Math.floor(p)+0.90; }

async function shTok(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); return (await r.json()).access_token; }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/2024-10/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v||{}})}); return r.json(); }
async function cjToken(){ try{ if(fs.existsSync(TOKEN_FILE)){ const t=JSON.parse(fs.readFileSync(TOKEN_FILE,'utf8')); if(t.exp>Date.now()+60000) return t.accessToken; } }catch{}
  const r=await fetch(`${CJ_BASE}/authentication/getAccessToken`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:CJ_EMAIL,apiKey:CJ_API_KEY})});
  const j=await r.json().catch(()=>({})); if(!j?.data?.accessToken) return null;
  try{ fs.writeFileSync(TOKEN_FILE,JSON.stringify({accessToken:j.data.accessToken,exp:Date.now()+14*864e5})); }catch{}
  return j.data.accessToken; }
async function cjGet(tok,path,params){ const qs=new URLSearchParams(params).toString();
  const r=await fetch(`${CJ_BASE}${path}?${qs}`,{headers:{'CJ-Access-Token':tok}}); return r.json().catch(()=>({})); }

(async()=>{
  if(!CID||!CSEC){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
  if(!CJ_EMAIL||!CJ_API_KEY){ console.log('Keine CJ-Creds → No-op.'); process.exit(0); }
  const stok=await shTok(); const ctok=await cjToken();
  if(!ctok){ console.log('CJ-Auth fehlgeschlagen → No-op.'); process.exit(0); }
  const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').filter(Boolean):[]);
  const q = ONLY ? `handle:${ONLY}` : 'tag:cj-real AND status:active';
  let after=null, checked=0, upgraded=0;
  while(checked<LIMIT){
    const pr=await gql(stok,`query($q:String!,$n:Int!,$a:String){ products(first:$n,query:$q,after:$a){ pageInfo{hasNextPage endCursor} edges{node{ id handle title descriptionHtml options{name} variants(first:2){edges{node{id title price sku}}} }} } }`,{q,n:50,a:after});
    const conn=pr?.data?.products; if(!conn) break;
    for(const e of conn.edges){
      if(checked>=LIMIT) break;
      const p=e.node; const pid=p.id.split('/').pop();
      if(done.has(pid)) continue;
      const vs=p.variants.edges.map(x=>x.node);
      if(vs.length!==1 || vs[0].title!=='Standard'){ if(!DRY)fs.appendFileSync(LEDGER,pid+'\n'); continue; }
      const m=(vs[0].sku||'').match(/^CJ-(.+)$/); if(!m){ if(!DRY)fs.appendFileSync(LEDGER,pid+'\n'); continue; }
      checked++;
      try{
        const cj=await cjGet(ctok,'/product/query',{pid:m[1]}); await sleep(CJ_SLEEP);
        if(cj?.code===16900500){ console.log('CJ-Punkte aufgebraucht → Abbruch (kein Ledger).'); process.exit(0); }
        if(!cj?.data){
          if(cj?.code===1602001||cj?.code===1600200){ // Produkt bei CJ geloescht/ungueltig → nie wieder versuchen
            if(!DRY)fs.appendFileSync(LEDGER,pid+'\n');
            console.log('· CJ-Produkt weg code='+cj.code+' (geledgert):',p.title.slice(0,40)); continue;
          }
          console.log('· CJ-Fehler code='+(cj?.code||'?')+' (kein Ledger):',p.title.slice(0,40)); continue;
        }
        const cvs=(cj?.data?.variants||[]).map(parseVar).filter(v=>v.color||v.size);
        const curPrice=parseFloat(vs[0].price);
        const colors=[...new Set(cvs.map(v=>v.color).filter(Boolean))].map(deColor);
        const rawColors=[...new Set(cvs.map(v=>v.color).filter(Boolean))];
        const sizes=[...new Set(cvs.map(v=>v.size).filter(Boolean))].sort((a,b)=>{const ia=SORDER.indexOf(a.toUpperCase()),ib=SORDER.indexOf(b.toUpperCase());if(ia>=0&&ib>=0)return ia-ib;return (parseInt(a)||99)-(parseInt(b)||99)||a.localeCompare(b);});
        const useC=rawColors.length>1||(rawColors.length===1&&!sizes.length&&rawColors.length>1), useS=sizes.length>1;
        if(!useC&&!useS){
          // CJ hat real keine Auswahl → irreführende Farb-Zeile strippen
          const dh=p.descriptionHtml||'';
          let dh2=dh.replace(/<li>Erhältlich in (den Farben|verschiedenen Farben)[^<]*<\/li>/i,'<li>Lieferung wie abgebildet</li>');
          if(!dh2.includes('Technische Details')) dh2+=buildDetails(cj?.data,null,null);
          if(dh2!==dh&&!DRY){ await gql(stok,`mutation($i:ProductInput!){ productUpdate(input:$i){ userErrors{message} } }`,{i:{id:p.id,descriptionHtml:dh2}}); }
          if(!DRY) await attachVideo(stok,p.id,cj?.data);
          if(!DRY)fs.appendFileSync(LEDGER,pid+'\n');
          console.log('· keine CJ-Auswahl:',p.title.slice(0,50)); continue;
        }
        const opts=[]; if(useC)opts.push({name:'Farbe',values:colors.map(x=>({name:x}))}); if(useS)opts.push({name:'Grösse',values:sizes.map(x=>({name:x}))});
        const seen=new Set(); const newVars=[];
        for(const v of cvs){ const ov=[];
          if(useC)ov.push({optionName:'Farbe',name:deColor(v.color)||colors[0]});
          if(useS)ov.push({optionName:'Grösse',name:v.size||sizes[0]});
          const key=ov.map(x=>x.name).join('|'); if(seen.has(key))continue; seen.add(key);
          const price=Math.max(curPrice, v.price?chf(v.price,v.weight):0).toFixed(2);
          newVars.push({optionValues:ov,price,inventoryItem:{sku:('CJ-'+(v.sku||m[1])).slice(0,70),tracked:false},inventoryPolicy:'CONTINUE'});
          if(newVars.length>=60)break; }
        if(newVars.length<2){ if(!DRY)fs.appendFileSync(LEDGER,pid+'\n'); continue; }
        if(DRY){ console.log(`[DRY] ${p.title.slice(0,50)} → ${opts.map(o=>o.name+':'+o.values.length).join(', ')} (${newVars.length} Varianten)`); }
        else{
          const res=await gql(stok,`mutation($i:ProductSetInput!){ productSet(synchronous:true,input:$i){ product{id} userErrors{field message} } }`,{i:{id:p.id,productOptions:opts,variants:newVars}});
          const errs=res?.data?.productSet?.userErrors||[];
          if(errs.length){ console.log('✗',p.title.slice(0,45),JSON.stringify(errs).slice(0,140)); continue; }
          // Gewicht als Technisches Detail ergänzen (einmalig)
          if(!(p.descriptionHtml||'').includes('Technische Details')){
            const dh2=(p.descriptionHtml||'')+buildDetails(cj?.data,colors,sizes);
            if(dh2!==(p.descriptionHtml||'')) await gql(stok,`mutation($i:ProductInput!){ productUpdate(input:$i){ userErrors{message} } }`,{i:{id:p.id,descriptionHtml:dh2}});
          }
          await attachVideo(stok,p.id,cj?.data);
          fs.appendFileSync(LEDGER,pid+'\n'); upgraded++;
          console.log('✓',p.title.slice(0,55),'→',newVars.length,'Varianten');
        }
      }catch(err){ console.log('✗',p.handle,err.message); }
    }
    if(!conn.pageInfo.hasNextPage) break;
    after=conn.pageInfo.endCursor;
  }
  console.log(`FERTIG: ${checked} geprüft, ${upgraded} nachgerüstet${DRY?' [DRY]':''}.`);
})();
