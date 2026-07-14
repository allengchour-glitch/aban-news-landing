/* bb_viable_scan.mjs — findet RENTABLE, lagernde BigBuy-CH-Produkte (User 2026-07-14:
 * «bigbuy rentable sachen füllen die im lager sind»). Schreibt /tmp/bb_viable_ch.json + /tmp/bb_ref2id.json
 * für den bestehenden Importer automation/bb_viable_ch_import.mjs.
 *
 * RENTABILITÄT (teuer gelernt: CH-Versand SEUR ~€27.94 fix frisst BigBuy-Retail-Marge):
 *   Kalkuliert mit inShopsPrice (Markt-RRP) statt retailPrice. Mein VK = min(inShopsPrice, EK*FACTOR),
 *   Gewinn = VK - EK - VERSAND. Nur wenn Gewinn >= MINPROFIT und NEU (kein REFURBISHED) + Gewicht ok.
 *   Stock: pro Kandidat via order/check (ER003=leer) verifiziert (nur die besten N, sonst zu langsam).
 * ENV: SHIP=27.94 · MINPROFIT=25 · FACTOR=1.9 · MAXWEIGHT=8 · PAGES=400 · VERIFY=250
 */
import fs from 'node:fs';
const BB=fs.readFileSync('/tmp/bb_key.txt','utf8').trim();
const SHIP=parseFloat(process.env.SHIP||'27.94');
const MINPROFIT=parseFloat(process.env.MINPROFIT||'25');
const FACTOR=parseFloat(process.env.FACTOR||'1.9');
const MAXW=parseFloat(process.env.MAXWEIGHT||'8');
const PAGES=parseInt(process.env.PAGES||'400',10);
const VERIFY=parseInt(process.env.VERIFY||'250',10);
const EURCHF=parseFloat(process.env.EURCHF||'0.95'); // EUR→CHF grob (BigBuy in EUR)
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function bb(path,opts){for(let a=0;a<4;a++){const r=await fetch(`https://api.bigbuy.eu${path}`,{headers:{Authorization:`Bearer ${BB}`,'Content-Type':'application/json'},...opts});if(r.status===429){await sleep(4000);continue;}try{return{status:r.status,json:await r.json()};}catch{return{status:r.status,json:null};}}return{status:0,json:null};}
const BAD=/refurb|restaurad|generalüberholt|note [abc]\b/i;
const ADULT=/sexfun|intimax|dildo|vibrator|erotik|dessous|gleitgel|analplug|kondom|sex.?toy|lingerie/i;
const JUNK=/\btoner\b|patrone|\bram\b|\bssd\b|festplatte|netzteil|router|firewall|drucker|tastatur|grafikkarte|\bakku\b|batterie|\bpc\b|desktop|laptop|monitor/i;

let cands=[];
console.log(`Scan startet: bis ${PAGES} Seiten, MINPROFIT €${MINPROFIT}, NEU only.`);
for(let p=1;p<=PAGES;p++){
  const {status,json}=await bb(`/rest/catalog/products.json?isoCode=de&pageSize=100&page=${p}`);
  if(status!==200||!Array.isArray(json)||json.length===0){console.log(`Seite ${p}: Ende (status ${status}).`);break;}
  for(const d of json){
    if(d.active!==1) continue;
    if(/REFURBISHED/i.test(d.condition||'')) continue;
    const ek=Number(d.wholesalePrice)||0, mkt=Number(d.inShopsPrice)||Number(d.retailPrice)||0;
    if(ek<8||mkt<=0) continue;
    if((Number(d.weight)||0)>MAXW) continue;
    const sell=Math.min(mkt, ek*FACTOR);           // VK: Markt-RRP, gedeckelt auf EK*Faktor
    const profit=sell-ek-SHIP;                      // Gewinn in EUR nach Versand
    if(profit<MINPROFIT) continue;
    cands.push({id:d.id,ref:d.sku,ek,mkt,sell:+(sell*1/EURCHF).toFixed(2),profitEur:+profit.toFixed(2),w:d.weight});
  }
  if(p%25===0)console.log(`  Seite ${p}: ${cands.length} rentable Kandidaten bisher`);
  await sleep(700);
}
fs.writeFileSync('/tmp/bb_candidates.json',JSON.stringify(cands));
// Repräsentativen Querschnitt mischen (Top-Margen sind überproportional Ladenhüter → nicht profit-first prüfen)
for(let i=cands.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cands[i],cands[j]]=[cands[j],cands[i]];}
console.log(`\nRentable Kandidaten (vor Stock-Check): ${cands.length}. Verifiziere Lager von ${VERIFY} (Querschnitt)…`);
// Stock verifizieren via order/check (Dummy-Adresse CH)
const viable=[], ref2id={};
let checked=0,instock=0;
for(const c of cands.slice(0,VERIFY)){
  const body={order:{internalReference:'stockchk',language:'de',paymentMethod:'moneybox',carriers:[{name:'seur'}],
    shippingAddress:{firstName:'Test',lastName:'CH',country:'CH',postcode:'8000',town:'Zürich',address:'Teststrasse 1',phone:'+41000000000',email:'test@luxestyle.ch',comment:''},
    products:[{reference:c.ref,quantity:1}]}};
  const {json}=await bb('/rest/order/check.json',{method:'POST',body:JSON.stringify(body)});
  checked++;
  const code=json&&json.code;
  if(code!=='ER003'){ // ER003=leer; alles andere (ok / ER005 money / etc.) = lieferbar
    viable.push({ref:c.ref,sell:c.sell,qty:5});
    ref2id[c.ref.toUpperCase()]=String(c.id);
    instock++;
  }
  if(checked%50===0)console.log(`  geprüft ${checked}/${Math.min(VERIFY,cands.length)}, lagernd ${instock}`);
  await sleep(1100);
}
fs.writeFileSync('/tmp/bb_viable_ch.json',JSON.stringify(viable));
fs.writeFileSync('/tmp/bb_ref2id.json',JSON.stringify(ref2id));
console.log(`\n✅ FERTIG: ${viable.length} rentable + lagernde CH-Produkte → /tmp/bb_viable_ch.json`);
console.log(`   (dann: node automation/bb_viable_ch_import.mjs importiert sie, tracked+DENY)`);
