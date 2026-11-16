import fs from 'node:fs';
import {createCjReadOnlyClient} from '../lib/cj_readonly.mjs';
const pid='2608070226531601500';let captured=null;const secrets=[process.env.CJ_API_KEY].filter(Boolean);
const traced=async(url,init)=>{
 const r=await fetch(url,init);
 if(r.ok){
  const j=await r.clone().json().catch(()=>null);
  if(String(url).includes('/authentication/getAccessToken')&&j?.data?.accessToken)secrets.push(j.data.accessToken);
  if(String(url).includes('/product/query')&&j?.result&&j?.data?.pid===pid){const d=j.data;captured={pid:d.pid,productSku:d.productSku,productNameEn:d.productNameEn,productKeyEn:d.productKeyEn,description:d.description,productImageSet:d.productImageSet,bigImage:d.bigImage,variants:(d.variants||[]).map(v=>({vid:v.vid,variantSku:v.variantSku,variantKey:v.variantKey,variantStandard:v.variantStandard,variantImage:v.variantImage}))};}
 }
 return r;
};
const report=await createCjReadOnlyClient({fetchImpl:traced}).readProduct({pid});
if(report.state!=='product_identity_verified'||!captured)throw Error('Lieferantendaten nicht bestätigt: '+report.state+' '+report.reason);
const txt=JSON.stringify(captured,null,2);if(secrets.some(s=>txt.includes(s)))throw Error('Sensible Daten in Antwort; nicht speichern');
fs.mkdirSync('cj-ring-source',{recursive:true});fs.writeFileSync('cj-ring-source/datasheet.json',txt);fs.writeFileSync('cj-ring-source/verified.json',JSON.stringify({pid,verified:true,variants:captured.variants.length,requests:report.requests},null,2));console.log('Lieferantendaten zum gebundenen Ring bestätigt; Grössen/Bildquellen im Artefakt. Keine Shop-Änderung.');
