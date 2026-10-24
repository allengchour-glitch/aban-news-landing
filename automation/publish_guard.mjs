#!/usr/bin/env node
/**
 * publish_guard.mjs — zieht fehlende Verkaufskanäle nach, OHNE bewusste Kanal-Sperren zu überfahren.
 * (Der am häufigsten wiederholte Handgriff: nach create-product wird nicht automatisch in alle Kanäle publiziert.)
 *
 * Zielkanäle = die echten Verkaufskanäle (ohne „Point of Sale" und ohne „Inbox"; Headless nur mit INCLUDE_HEADLESS=1). Für jedes gescannte aktive Produkt wird der
 * fehlende Kanal-Satz per publishablePublish nachgezogen. Idempotent (bereits publizierte werden übersprungen).
 *
 * ⚠️ SPERRTAGS WERDEN RESPEKTIERT (gemessen 2026-10-17, s. unten): Produkte mit Tags wie
 *    `adult-nicht-bewerben`, `18plus`, `nicht-bewerben`, `social-pause-*`, `*-raus-*`,
 *    `compliance-pruefen` bekommen NUR den Onlineshop nachgezogen — nie Social, Google oder Shop.
 *
 * No-op-sicher · DRY-Default · Schreiben nur mit LIVE=1 UND APPROVE_PUBLISH=1.
 * SCAN=zuletzt geänderte Produkte (Default 250).
 *      [INCLUDE_GOOGLE=1] [INCLUDE_HEADLESS=1] [PQUERY="status:active AND tag:…"]
 * ENV: SHOPIFY_SHOP + (SHOPIFY_ADMIN_TOKEN | SHOPIFY_CLIENT_ID+SHOPIFY_CLIENT_SECRET)
 */
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { erlaubteKanaele } from './lib/kanal_sperren.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
import { normalizeShopifyHost } from './lib/shopify_host.mjs';
const SHOP=normalizeShopifyHost(process.env.SHOPIFY_SHOP||''), TOK_ST=process.env.SHOPIFY_ADMIN_TOKEN||'',
  CID=process.env.SHOPIFY_CLIENT_ID||'', CS=shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET)||'',
  LIVE_REQUESTED=process.env.LIVE==='1', APPROVED=process.env.APPROVE_PUBLISH==='1',
  LIVE=LIVE_REQUESTED&&APPROVED, SCAN=Math.min(parseInt(process.env.SCAN||'250',10),3000), API='2025-01',
  // PQUERY: Teilmenge statt „die zuletzt geaenderten". Damit laesst sich der Waechter gezielt
  // pruefen (z. B. PQUERY="status:active AND tag:18plus") statt blind ueber den ganzen Katalog.
  PQUERY=process.env.PQUERY||'status:active';

async function getToken(){
  if(!(CID&&CS)&&TOK_ST) return TOK_ST;
  if(SHOP&&CID&&CS){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',
    redirect:'error',signal:AbortSignal.timeout(30000),
    headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CS,grant_type:'client_credentials'})});
    if(!r.ok) throw new Error(`OAuth: HTTP ${r.status}`);
    const j=await r.json();
    if(typeof j?.access_token!=='string'||!j.access_token) throw new Error('OAuth: Antwort enthält keinen Token');
    return j.access_token; }
  return TOK_ST||'';
}
// Drosselung aussitzen statt aufgeben — Begruendung + Tests in automation/lib/shopify_gql.mjs
const gql=(token,query,variables)=>shopifyGql(SHOP,API,token,query,variables);

async function main(){
  const report={ ts:new Date().toISOString(), live:LIVE, liveRequested:LIVE_REQUESTED,
    publishApproved:APPROVED, query:PQUERY, published:0, failed:0, errors:[], skippedInactive:0 };
  const fail=(product,message)=>{report.failed++;report.errors.push({handle:product?.handle||product?.id||'(unbekannt)',message});};
  // Ein Waechter darf aussteigen, aber er muss den Grund NENNEN: LIVE=1 ohne APPROVE_PUBLISH=1
  // laeuft nur trocken. Ohne diese Zeile sieht ein stiller Trockenlauf wie ein erledigter Lauf
  // aus (Fehlerklasse „stummer Skip", CLAUDE.md 17.10.) — der Lauf schreibt dann nie etwas nach.
  // Auf stderr, damit stdout weiterhin reines JSON bleibt (der Test liest es mit JSON.parse).
  if(LIVE_REQUESTED&&!APPROVED) console.error('HINWEIS: LIVE=1 gesetzt, aber APPROVE_PUBLISH=1 fehlt -> Trockenlauf, es wird NICHTS publiziert.');
  if(!SHOP){ console.log('no-op: kein SHOPIFY_SHOP.'); return; }
  const token=await getToken(); if(!token){ console.log('no-op: kein Token.'); return; }

  const pd=await gql(token,`{ publications(first:25){ nodes{ id name } } }`);
  if(!Array.isArray(pd?.publications?.nodes)||pd.publications.nodes.some(p=>!p?.id||typeof p.name!=='string')) {
    throw new Error('Publications: Antwort enthält keine gültige Kanalliste');
  }
  // Nur ECHTE Verkaufskanaele. Gemessen 2026-10-17: „alle ausser Point of Sale" meldete
  // 250 von 250 Produkten als „Kanal fehlt" — fehlten aber ausschliesslich „Inbox"
  // (Shopifys Chat-App, keine Verkaufsfläche) und „Luxe Style Headless" (Headless-Storefront,
  // nicht der Live-Shop). Ein Waechter, der Bauteile als Fehler zaehlt, treibt die Arbeit in
  // die falsche Richtung — und LIVE haette er 250 Produkte ohne jeden Kundennutzen umgeschrieben.
  const AUS = /point of sale|inbox/i;
  const HEADLESS = /headless/i;
  const GOOGLE = /google/i;
  const mitHeadless = process.env.INCLUDE_HEADLESS === '1';
  // Google nur auf ausdruecklichen Wunsch: 1888 aktive Produkte sind dort nicht publiziert
  // (gemessen 2026-10-17, gross: der Fortura-Kostuem-Import vom 23.07.). Das ist eine echte
  // Luecke — aber ein Feed mit ~1900 neuen Artikeln auf einmal ist eine Entscheidung mit
  // Aussenwirkung (Merchant Center), und der Grund der ~60-%-Metafeld-Ausschluesse ist
  // weiter unbekannt (dropship/GOOGLE-SHOPPING-AUSSCHLUSS.md). Darum INCLUDE_GOOGLE=1.
  const mitGoogle = process.env.INCLUDE_GOOGLE === '1';
  const targets=pd.publications.nodes.filter(p=>!AUS.test(p.name)
    && (mitHeadless || !HEADLESS.test(p.name))
    && (mitGoogle || !GOOGLE.test(p.name)));
  report.ignoredChannels=pd.publications.nodes.filter(p=>!targets.some(t=>t.id===p.id)).map(p=>p.name);
  report.targetChannels=targets.map(p=>p.name);
  const targetIds=new Set(targets.map(p=>p.id));

  let prods=[], cur=null;
  while(prods.length<SCAN){
    const d=await gql(token,`query($c:String,$q:String){ products(first:50, after:$c, sortKey:UPDATED_AT, reverse:true, query:$q){ pageInfo{hasNextPage endCursor} nodes{ id handle status tags resourcePublications(first:25){ nodes{ publication{id} } } } } }`,{c:cur,q:PQUERY});
    if(!Array.isArray(d?.products?.nodes)||typeof d.products.pageInfo?.hasNextPage!=='boolean') {
      throw new Error('Products: Antwort enthält keine gültige Produktliste');
    }
    prods.push(...d.products.nodes);
    if(!d.products.pageInfo.hasNextPage) break;
    const next=d.products.pageInfo.endCursor;
    if(typeof next!=='string'||!next||next===cur) throw new Error('Products: ungültiger Seitencursor');
    cur=next;
  }
  prods=prods.slice(0,SCAN); report.scanned=prods.length;

  // Sperrtags: Begruendung, Muster und Tests in automation/lib/kanal_sperren.mjs
  // (gemessen 2026-10-17 — die Luecken auf Social/Shop sind ABSICHT, nicht Versehen).
  const nameVon = new Map(targets.map(t=>[t.id, t.name]));
  const needsPublish=[]; const gesperrt=[];
  for(const p of prods){
    if(!p||typeof p.status!=='string'){fail(p,'Produktstatus fehlt');continue;}
    if(p.status!=='ACTIVE'){report.skippedInactive++;continue;}
    if(typeof p.id!=='string'||!p.id){fail(p,'Produkt-ID fehlt');continue;}
    if(!Array.isArray(p.tags)||p.tags.some(tag=>typeof tag!=='string')){
      fail(p,'Tags fehlen oder sind ungültig; keine Veröffentlichung');continue;
    }
    if(!Array.isArray(p.resourcePublications?.nodes)||p.resourcePublications.nodes.some(n=>!n?.publication?.id)){
      fail(p,'Bestehende Kanalzuordnungen fehlen oder sind ungültig');continue;
    }
    const have=new Set(p.resourcePublications.nodes.map(n=>n.publication.id));
    const fehlend=[...targetIds].filter(id=>!have.has(id)).map(id=>({id, name:nameVon.get(id)}));
    if(!fehlend.length) continue;
    const r=erlaubteKanaele(p.tags, fehlend);
    if(r.blockiert.length) gesperrt.push({handle:p.handle, tags:r.sperrTags, nichtPubliziert:r.blockiert.map(k=>k.name)});
    if(!r.erlaubt.length) continue;
    needsPublish.push({id:p.id, handle:p.handle, missing:r.erlaubt.map(k=>k.id)});
  }
  report.productsMissingChannels=needsPublish.length;
  report.respektierteSperren=gesperrt.length;
  report.sperrenBeispiele=gesperrt.slice(0,8);

  if(LIVE && needsPublish.length){
    for(const pr of needsPublish){
      const input=pr.missing.map(id=>`{publicationId:"${id}"}`).join(',');
      try{ const d=await gql(token,`mutation{ publishablePublish(id:"${pr.id}", input:[${input}]){ userErrors{message} } }`);
        const payload=d?.publishablePublish;
        if(!payload||!Array.isArray(payload.userErrors)) throw new Error('Publish-Antwort enthält keine bestätigte Ergebnismeldung');
        if(payload.userErrors.length) throw new Error('Publish abgelehnt: '+payload.userErrors.map(e=>e?.message||'unbekannter Fehler').join('; '));
        report.published++;
      }catch(e){fail(pr,e.message);}
    }
  }
  console.log(JSON.stringify(report,null,2));
  if(report.failed) process.exitCode=1;
}
main().catch(e=>{ console.error('Fehler:',e.message); process.exitCode=1; });
