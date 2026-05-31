#!/usr/bin/env node
/**
 * CJ-Varianten → Shopify-Optionen (Farbe × Grösse) extrahieren.
 * Aufruf: node dropship/cj_variants.mjs <PID>
 * Gibt JSON aus: { options:[Farbe,Grösse], variants:[{color,size,sku,price,img}] }
 * variantKey-Format bei CJ: "<Farbe>-<Grösse>" (Grösse = letztes Segment nach letztem "-").
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const BASE='https://developers.cjdropshipping.com/api2.0/v1';
const PID=process.argv[2];
if(!PID){console.error('PID fehlt');process.exit(1);}
const tok=JSON.parse(fs.readFileSync('/tmp/cj_token.json')).accessToken;
const SIZES=['XS','S','M','L','XL','XXL','2XL','3XL','4XL','5XL'];
const b=await chromium.launch({headless:true,args:['--ignore-certificate-errors','--no-sandbox']});
const c=await b.newContext({ignoreHTTPSErrors:true});
const r=await (await c.request.get(`${BASE}/product/query?pid=${PID}`,{headers:{'CJ-Access-Token':tok},timeout:30000})).json();
await b.close();
const vs=(r.data?.variants||[]);
const out=[];
for(const v of vs){
  const key=(v.variantKey||v.variantNameEn||'').trim();
  // Grösse = letztes "-"-Segment, falls es wie eine Grösse aussieht
  const parts=key.split('-').map(s=>s.trim());
  let size='', color=key;
  const last=parts[parts.length-1].toUpperCase().replace(/\s/g,'');
  if(SIZES.includes(last)){ size=last; color=parts.slice(0,-1).join('-').trim(); }
  out.push({color:color||'Standard', size:size||'Einheitsgrösse', sku:v.variantSku, price:v.variantSellPrice, img:v.variantImage||''});
}
const colors=[...new Set(out.map(o=>o.color))];
const sizes=[...new Set(out.map(o=>o.size))];
console.log(JSON.stringify({pid:PID, name:r.data?.productNameEn, colorCount:colors.length, sizeCount:sizes.length, colors, sizes, variants:out},null,2));
