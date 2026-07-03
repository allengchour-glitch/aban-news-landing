#!/usr/bin/env node
/* scan_catalog — lädt den BigBuy-DE-Katalog einmal und listet Namen, die auf einen RegExp passen.
 * Zum schnellen Prüfen "gibt es X?" ohne Rätselraten. ENV: BIGBUY_API_KEY, RE="<regex>", [MAX=60].
 */
const BB_KEY=(process.env.BIGBUY_API_KEY||'').trim();
const RE=new RegExp(process.env.RE||'.', 'i');
const MAX=Number(process.env.MAX||60);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function bbGet(path,timeoutMs=420000){for(let a=0;a<6;a++){const ac=new AbortController();const to=setTimeout(()=>ac.abort(),timeoutMs);let r,txt;try{r=await fetch(`https://api.bigbuy.eu${path}`,{headers:{Authorization:`Bearer ${BB_KEY}`,Accept:'application/json'},signal:ac.signal});txt=await r.text();}catch{clearTimeout(to);await sleep((a+1)*4000);continue;}clearTimeout(to);if(r.status===429||/exceeded the rate limit/i.test(txt)){await sleep((a+1)*5000);continue;}if(!r.ok)return null;try{return JSON.parse(txt);}catch{return null;}}return null;}
console.log('Lade Katalog …');
const info=await bbGet('/rest/catalog/productsinformation.json?isoCode=de');
if(!Array.isArray(info)){console.log('Kein Katalog (Rate-Limit?)');process.exit(0);}
console.log(`Katalog: ${info.length}`);
const hits=info.filter(p=>RE.test(p.name||''));
console.log(`Treffer für /${RE.source}/i : ${hits.length}`);
hits.slice(0,MAX).forEach(p=>console.log(`  [${p.id}] ${p.name}`));
