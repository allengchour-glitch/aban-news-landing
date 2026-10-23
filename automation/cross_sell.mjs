#!/usr/bin/env node
/**
 * cross_sell.mjs — hängt aktiven Produkten OHNE internen Collection-Link eine themen-passende
 * „🛍️ Das könnte dir auch gefallen"-Box an (interne Verlinkung = SEO + AOV).
 *
 * Wählt die Ziel-Collection deterministisch aus Tags/Produkttyp (nur VERIFIZIERTE Handles).
 * Idempotent: überspringt Produkte, deren Beschreibung schon einen /collections/-Link enthält.
 * Body wird per GraphQL-Variable gesetzt (kein Escaping/Timeout-Risiko), 1 productUpdate/Produkt.
 *
 * No-op-sicher · DRY-Default · LIVE=1 · SCAN=Anzahl geprüfter Produkte (Default 300, max 3000).
 * Katalogregion: PQUERY (Default status:active) · SORT (Default UPDATED_AT) · REVERSE=0 für aufsteigend.
 * ENV: SHOPIFY_SHOP + (SHOPIFY_ADMIN_TOKEN | SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET)
 */
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
// Ziel-Collection, Begruendung und Tests: automation/lib/cross_sell_ziel.mjs
import { zielFinden } from './lib/cross_sell_ziel.mjs';
const SHOP=process.env.SHOPIFY_SHOP||'', TOK_ST=process.env.SHOPIFY_ADMIN_TOKEN||'',
  CID=process.env.SHOPIFY_CLIENT_ID||'', CS=shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET)||'',
  LIVE=process.env.LIVE==='1', SCAN=Math.min(parseInt(process.env.SCAN||'300',10),3000),
  MAXFIX=Math.min(parseInt(process.env.MAXFIX||'150',10),1000), API='2025-01',
  // Vorgabe: nur Produkte mit ERKANNTEM Thema bekommen eine Box. Gemessen am 2026-10-18 landen
  // sonst 282 von 600 (47 %) im Rueckfall „Geschenkideen" — eine Box, die nichts Passendes nennt,
  // ist kein interner Link, sondern Fuellmaterial. NUR_THEMA=0 schaltet den Rueckfall wieder ein.
  NUR_THEMA=process.env.NUR_THEMA!=='0',
  // Wie beim seo-optimizer und beim alt_text_guard: ohne diese Schalter beginnt JEDER Lauf bei den
  // zuletzt geaenderten Produkten — also genau bei denen, die der vorige Lauf gerade versorgt hat.
  // Nach den 2400 Boxen vom 18.10. blaettert ein neuer Lauf damit zuerst durch das schon Fertige.
  // Gegenmittel: SORT=CREATED_AT REVERSE=0 fuer den alten, noch unversorgten Teil des Katalogs.
  // Vorgabe bleibt UPDATED_AT absteigend, damit sich am bisherigen Verhalten nichts aendert.
  PQUERY=process.env.PQUERY||'status:active',
  SORT=(process.env.SORT||'UPDATED_AT').toUpperCase().replace(/[^A-Z_]/g,''),
  REVERSE=process.env.REVERSE==='0'?false:true;

async function getToken(){
  if(!(CID&&CS)&&TOK_ST) return TOK_ST;
  if(SHOP&&CID&&CS){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CS,grant_type:'client_credentials'})});
    const j=await r.json().catch(()=>({})); return j.access_token||''; }
  return TOK_ST||'';
}
// Drosselung aussitzen statt aufgeben — Begruendung + Tests in automation/lib/shopify_gql.mjs
const gql=(token,query,variables)=>shopifyGql(SHOP,API,token,query,variables);
// Marker wie beim Rizinusoel-Block (`ls-riz-link-v1`): nur damit laesst sich der eigene Block
// spaeter wiedererkennen, nachfuehren oder entfernen. Ohne ihn ist ein Massen-Schreiben in
// Produktbeschreibungen nicht zurueckholbar.
export const MARKER='<!-- ls-xsell-v1 -->';
const box=(h,l)=>`${MARKER}<p><strong>🛍️ Das könnte dir auch gefallen:</strong> <a href="/collections/${h}">${l}</a> · <a href="/collections/bestseller-premium-heroes">Bestseller</a></p>`;

async function main(){
  const report={ ts:new Date().toISOString(), live:LIVE };
  if(!SHOP){ console.log('no-op: kein SHOPIFY_SHOP.'); return; }
  const token=await getToken(); if(!token){ console.log('no-op: kein Token.'); return; }

  let prods=[], cur=null;
  while(prods.length<SCAN){
    // first:50 statt 100: Shopifys Eimer fasst 2000 Punkte, und je Knoten kostet die Seite einen —
    // 52 Punkte passen in die Luecken, 102 nicht. Begruendung: automation/lib/shopify_gql.mjs.
    const d=await gql(token,`query($c:String,$q:String){ products(first:50, after:$c, sortKey:${SORT}, reverse:${REVERSE}, query:$q){ pageInfo{hasNextPage endCursor} nodes{ id title tags productType descriptionHtml createdAt } } }`,{c:cur,q:PQUERY});
    prods.push(...d.products.nodes);
    if(!d.products.pageInfo.hasNextPage) break; cur=d.products.pageInfo.endCursor;
  }
  prods=prods.slice(0,SCAN); report.scanned=prods.length;
  report.region=`${PQUERY} · ${SORT} ${REVERSE?'absteigend':'aufsteigend'}`;
  // Damit das naechste Zeitfenster nicht geraten werden muss: der Lauf nennt das Erstelldatum des
  // letzten geprueften Produkts. Mit SORT=CREATED_AT REVERSE=0 ist das genau der Anfang des
  // naechsten Fensters (`created_at:>=…`). Vorher musste man es ueber productsCount suchen — und
  // das zaehlt nur bis 10 000, taugt also fuer diesen Katalog nicht.
  report.letztesErstellt=prods.length?prods[prods.length-1].createdAt:null;

  const todo=prods.filter(p=>!(p.descriptionHtml||'').includes('/collections/'));
  report.missingCrossSell=todo.length;

  // Der Trockenlauf muss ZEIGEN, was er schreiben wuerde — eine blosse Zahl ist nicht pruefbar.
  let plan=todo.map(p=>({ p, titel:p.title, ...zielFinden(p.tags||[], p.productType) }));
  report.jeZiel=plan.reduce((a,z)=>{ a[z.label]=(a[z.label]||0)+1; return a; }, {});
  if(NUR_THEMA){
    const vorher=plan.length;
    plan=plan.filter(z=>z.schluessel!=='geschenk');
    report.ohneThemaUebersprungen=vorher-plan.length;
  }
  report.zuSetzen=plan.length;
  if(!LIVE){
    report.beispiele=plan.slice(0,12).map(z=>`${z.titel} → ${z.label} (wegen „${z.grund}")`);
    report.hinweis='Trockenlauf — nichts geschrieben. Mit LIVE=1 scharf stellen.';
  }

  if(LIVE && plan.length){
    let fixed=0;
    for(const { p, handle:h, label:l } of plan.slice(0,MAXFIX)){
      const html=(p.descriptionHtml||'')+box(h,l);
      const d=await gql(token,`mutation($id:ID!,$html:String!){ productUpdate(input:{id:$id, descriptionHtml:$html}){ product{id} userErrors{message} } }`,{id:p.id,html});
      if(!d.productUpdate.userErrors.length) fixed++;
    }
    report.crossSellAdded=fixed;
  }
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{ console.error('Fehler:',e.message); process.exit(0); });
