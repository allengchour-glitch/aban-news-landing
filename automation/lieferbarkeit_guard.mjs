#!/usr/bin/env node
/**
 * Wächter: findet aktive Produkte, die CJ gar nicht in die Schweiz liefern kann — BEVOR
 * jemand sie bestellt.
 *
 * WARUM (gemessen 2026-10-23 an allen Bestellungen des Shops): elf von elf Erstattungen
 * hatten denselben Grund, „nicht lieferbar", und jedes Mal wurde das Produkt erst NACH dem
 * Kauf auf DRAFT gesetzt. 1998 Produkte tragen den Sperr-Tag, gesetzt von Hand; kein Lauf im
 * Repo prüft das. Begründung und Gegenproben des Messgeräts: automation/lib/lieferbarkeit.mjs.
 *
 * DER LAUF IST ABSICHTLICH KLEIN. Jede Prüfung kostet CJ-Tagespunkte, und die Punkte sind die
 * knappste Grösse im Shop. Darum prüft er NICHT den ganzen Katalog, sondern eine Auswahl —
 * sinnvoll ist die Ware, die wirklich besucht wird, denn nur die kann als Nächstes bestellt
 * werden. Vorgabe ist der Trockenlauf; geändert wird nur mit LIVE=1.
 *
 * Schalter:
 *   PQUERY   Shopify-Suche   (Vorgabe `status:active AND tag:cj-real`)
 *   SORT / REVERSE           (wie seo-optimizer/cross_sell: sonst beginnt jeder Lauf von vorn)
 *   SCAN     wie viele Produkte gelesen werden        (Deckel 1000)
 *   MAXPRUEF wie viele davon bei CJ geprüft werden    (Deckel 200 — Punkte!)
 *   HANDLES  Komma-Liste statt Suche (z. B. die besuchten Produkte)
 *   ERNEUT=1 prüft auch schon gesperrte Ware — findet, was wieder lieferbar ist
 *   LIVE=1   setzt Tag + DRAFT; ohne LIVE wird nur gemessen
 */
import { shopifyGql } from './lib/shopify_gql.mjs';
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { cjFetch } from './lib/cj_fetch.mjs';
import { lieferurteil, darfSperren, CJ_UNBEKANNT, CJ_AUSGELISTET } from './lib/lieferbarkeit.mjs';

const SHOP=process.env.SHOPIFY_SHOP||'', TOK_ST=process.env.SHOPIFY_ADMIN_TOKEN||'',
  CID=process.env.SHOPIFY_CLIENT_ID||'', CS=shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET)||'',
  LIVE=process.env.LIVE==='1', API='2025-01',
  SCAN=Math.min(parseInt(process.env.SCAN||'200',10),1000),
  MAXPRUEF=Math.min(parseInt(process.env.MAXPRUEF||'40',10),200),
  PQUERY=process.env.PQUERY||'status:active AND tag:cj-real',
  SORT=(process.env.SORT||'UPDATED_AT').toUpperCase().replace(/[^A-Z_]/g,''),
  REVERSE=process.env.REVERSE==='0'?false:true,
  HANDLES=(process.env.HANDLES||'').split(',').map(s=>s.trim()).filter(Boolean),
  ERNEUT=process.env.ERNEUT==='1',
  CJ_BASE='https://developers.cjdropshipping.com/api2.0/v1',
  CJ_EMAIL=process.env.CJ_EMAIL||'', CJ_KEY=process.env.CJ_API_KEY||'';

const schlaf=ms=>new Promise(r=>setTimeout(r,ms));
const gql=(t,q,v)=>shopifyGql(SHOP,API,t,q,v);

async function shopToken(){
  if(!(CID&&CS)&&TOK_ST) return TOK_ST;
  if(SHOP&&CID&&CS){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CS,grant_type:'client_credentials'})});
    const j=await r.json().catch(()=>({})); return j.access_token||''; }
  return TOK_ST||'';
}
// CJ erwartet das Feld `password` fuer den API-Key (2026 verifiziert), `apiKey` als Rueckfall.
async function cjToken(){
  let j={};
  for(const feld of ['password','apiKey']){
    const r=await fetch(`${CJ_BASE}/authentication/getAccessToken`,{method:'POST',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({email:CJ_EMAIL,[feld]:CJ_KEY})});
    j=await r.json().catch(()=>({})); if(j?.result&&j?.data?.accessToken) break;
  }
  return j?.data?.accessToken||'';
}

/** Eine Erhebung je Produkt: CJ lesen, dann Fracht CN→CH. Wirft nur bei erschoepften Punkten. */
async function erhebe(tok, sku){
  const roh=String(sku||'').replace(/^CJ-/,'');
  if(!roh) return { cjCode:null, vid:null, linien:null };
  const weich=[...CJ_UNBEKANNT,...CJ_AUSGELISTET];
  const strategien = /^\d{15,}$/.test(roh) ? [{pid:roh}] : [{variantSku:roh},{productSku:roh}];
  let d=null, code=null;
  for(const s of strategien){
    const q=await cjFetch(`${CJ_BASE}/product/query?`+new URLSearchParams(s),
      {headers:{'CJ-Access-Token':tok},context:'product/query',weicheCodes:weich});
    await schlaf(1200);
    code=Number(q?.code);
    if(q?.result===true&&q?.data){ d=q.data; break; }
    if(CJ_AUSGELISTET.includes(code)) return { cjCode:code, vid:null, linien:null };
  }
  if(!d) return { cjCode:code, vid:null, linien:null };
  const vs=d.variants||[]; const v=vs.find(x=>x.variantSku===roh)||vs[0];
  if(!v?.vid) return { cjCode:200, vid:null, linien:null };
  const r=await fetch(`${CJ_BASE}/logistic/freightCalculate`,{method:'POST',
    headers:{'CJ-Access-Token':tok,'Content-Type':'application/json'},
    body:JSON.stringify({startCountryCode:'CN',endCountryCode:'CH',products:[{quantity:1,vid:v.vid}]})});
  const f=await r.json().catch(()=>({})); await schlaf(1200);
  // Eine fehlgeschlagene Frachtabfrage ist KEINE leere Linienliste — sonst sperrt eine
  // Drosselung gesunde Ware. Dann lieber `unbekannt` (linien: null).
  const linien = (Number(f?.code)===200 && Array.isArray(f?.data)) ? f.data.length : null;
  return { cjCode:200, vid:v.vid, linien };
}

async function main(){
  const bericht={ ts:new Date().toISOString(), live:LIVE, gelesen:0, geprueft:0,
    lieferbar:0, unbekannt:0, befunde:[], wiederLieferbar:[], abbruch:null };
  if(!SHOP){ console.log('no-op: kein SHOPIFY_SHOP.'); return; }
  const stok=await shopToken();
  if(!stok){ console.log('no-op: kein Shopify-Token (Client-Credentials fehlgeschlagen).'); return; }
  if(!(CJ_EMAIL&&CJ_KEY)){ console.log('no-op: CJ_EMAIL/CJ_API_KEY fehlen — ohne CJ ist nichts messbar.'); return; }
  const ctok=await cjToken();
  if(!ctok){ console.log('no-op: CJ-Auth fehlgeschlagen → CJ_API_KEY erneuern.'); return; }

  let prods=[];
  if(HANDLES.length){
    for(const h of HANDLES){
      const d=await gql(stok,`query($q:String){products(first:1,query:$q){nodes{id handle title status tags variants(first:1){nodes{sku}}}}}`,{q:`handle:${h}`});
      if(d.products.nodes[0]) prods.push(d.products.nodes[0]);
    }
  } else {
    let cur=null;
    while(prods.length<SCAN){
      const d=await gql(stok,`query($c:String,$q:String){products(first:50,after:$c,sortKey:${SORT},reverse:${REVERSE},query:$q){pageInfo{hasNextPage endCursor} nodes{id handle title status tags variants(first:1){nodes{sku}}}}}`,{c:cur,q:PQUERY});
      prods.push(...d.products.nodes);
      if(!d.products.pageInfo.hasNextPage) break;
      cur=d.products.pageInfo.endCursor;
    }
  }
  prods=prods.slice(0,SCAN); bericht.gelesen=prods.length;

  for(const p of prods){
    if(bericht.geprueft>=MAXPRUEF) break;
    const sku=p.variants?.nodes?.[0]?.sku||'';
    if(!/^CJ/i.test(sku)) continue;               // nur CJ-Ware ist hier messbar
    // Schon gesperrte ueberspringen — ausser ERNEUT=1. Das ist nicht nur die Gegenprobe des
    // Waechters, sondern ein eigener Hebel: 1998 Produkte sind gesperrt, und ein Lieferant kann
    // wieder liefern. Was erneut Linien hat, meldet der Lauf als `wiederLieferbar`.
    const gesperrt=p.tags?.includes('cj-nicht-versendbar-ch')||p.tags?.includes('cj-ausgelistet');
    if(gesperrt&&!ERNEUT) continue;
    let e;
    try { e=await erhebe(ctok,sku); }
    catch(err){
      if(/CJ_QUOTA/.test(err.message)){ bericht.abbruch='CJ-Tagespunkte erschöpft'; break; }
      bericht.unbekannt++; bericht.geprueft++; continue;       // Drosselung o. Ae.: nichts behaupten
    }
    bericht.geprueft++;
    const u=lieferurteil(e);
    if(u.urteil==='lieferbar'){
      bericht.lieferbar++;
      if(gesperrt) bericht.wiederLieferbar.push({ handle:p.handle, titel:p.title, grund:u.grund });
      continue;
    }
    if(u.urteil==='unbekannt'){ bericht.unbekannt++; continue; }
    bericht.befunde.push({ handle:p.handle, titel:p.title, sku, grund:u.grund, tag:u.tag });
    if(LIVE&&darfSperren(u)){
      await gql(stok,`mutation($i:ProductInput!){productUpdate(input:$i){userErrors{field message}}}`,
        {i:{id:p.id,status:'DRAFT',tags:[...new Set([...(p.tags||[]),u.tag,'lieferbarkeit-geprueft'])]}});
    }
  }
  console.log(JSON.stringify(bericht,null,2));
  if(!LIVE) console.log('\n(Trockenlauf — nichts geändert. Mit LIVE=1 werden Befunde auf DRAFT gesetzt.)');
}
main().catch(e=>{ console.error('FEHLER:',e.message); process.exit(1); });
