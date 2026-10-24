#!/usr/bin/env node
/* LuxeStyle — seo-optimizer.mjs  (wöchentlich via .github/workflows/seo-optimizer.yml)
 * Findet aktive Produkte mit FEHLENDEM SEO-Titel/-Meta und füllt sie automatisch
 * (deutsch, Schweiz, Preis-Anker-Stil) — für besseren Google-Traffic.
 * Meldet ausserdem Produkte mit FAILED-Bildern (Bild-QA) per Telegram.
 * No-op-safe: ohne Shopify-Credentials passiert nichts.
 *
 * ENV: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET (oder SHOPIFY_ADMIN_TOKEN),
 *      LIMIT (max Produkte/Lauf, default 120), DRY_RUN=1,
 *      PQUERY="status:active AND tag:…", SORT=UPDATED_AT|CREATED_AT, REVERSE=0 (älteste zuerst),
 *      TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 */
import { shopifyClientSecret } from './lib/shopify_secret.mjs';
import { seoOffen, seoNachtrag } from './lib/seo_titel.mjs';
import { shopifyGql } from './lib/shopify_gql.mjs';
const SHOP = process.env.SHOPIFY_SHOP || '';
const TOK_STATIC = process.env.SHOPIFY_ADMIN_TOKEN || '';
const CID = process.env.SHOPIFY_CLIENT_ID || '';
const CSECRET = shopifyClientSecret(process.env.SHOPIFY_CLIENT_SECRET) || '';
const TG_T = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_C = process.env.TELEGRAM_CHAT_ID || '';
const LIMIT = parseInt(process.env.LIMIT || '120', 10);
// PQUERY/SORT/REVERSE: der Lauf durchsucht sonst IMMER die zuletzt geaenderten Produkte zuerst —
// und genau die hat der vorige Lauf schon versorgt. Gemessen 2026-10-17: der zweite Lauf brauchte
// 15 Minuten fuer 74 Treffer, weil er erst 3315 fertige Produkte neu durchblaettern musste
// (jede Seite eine Abfrage, mit Drosselpausen). Mit SORT=CREATED_AT REVERSE=0 faengt er dort an,
// wo die Luecke noch ist.
const PQUERY = process.env.PQUERY || 'status:active';
const SORT = (process.env.SORT || 'UPDATED_AT').toUpperCase();
const REVERSE = process.env.REVERSE !== '0';
const DRY = process.env.DRY_RUN === '1';

if(!(SHOP && (TOK_STATIC || (CID && CSECRET)))){ console.log('Keine Shopify-Credentials → No-op.'); process.exit(0); }

async function getToken(){
  // Client-Credentials BEVORZUGT (holt pro Lauf einen frischen, gültigen Token — läuft nie ab).
  // Fallback: statischer SHOPIFY_ADMIN_TOKEN. So funktioniert es egal welches Secret gesetzt ist.
  if(CID && CSECRET){
    try{
      const r = await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({client_id:CID,client_secret:CSECRET,grant_type:'client_credentials'})});
      const j = await r.json();
      if(j.access_token) return j.access_token;
      console.error('Client-Credentials abgelehnt:', JSON.stringify(j).slice(0,200));
    }catch(e){ console.error('Client-Credentials-Ausnahme:', e.message); }
  }
  return TOK_STATIC;
}
let TOKEN = '';
// Drosselung aussitzen statt aufgeben (automation/lib/shopify_gql.mjs). Der Lauf geht ueber
// tausende Produkte — ohne Wiederholung endet er nach wenigen Seiten mit „Throttled".
// shopifyGql liefert `data` direkt und wirft bei echten Fehlern; die Aufrufer unten erwarten
// die Form { data }, darum hier wieder einpacken.
async function gql(query, variables){
  try { return { data: await shopifyGql(SHOP, '2025-01', TOKEN, query, variables) }; }
  catch (e) { return { errors: [{ message: e.message }] }; }
}
// Begruendung, Muster und Tests: automation/lib/seo_titel.mjs
// Kurz: das alte Muster `\s*[·–—-]\s*` traf den Bindestrich MITTEN im Wort und machte aus
// „Gaming-Controller" → „Gaming – Controller" (985 von 2415 Titeln = 41 % betroffen); die Marke
// fiel bei langen Titeln ab und hinterliess „|…" (255 = 11 %); und die Beschreibung versprach
// „schnelle Lieferung", obwohl CJ 10–20 Werktage braucht.
// (`seoTitel` wird jetzt ueber `seoNachtrag` aufgerufen — siehe die Schreibstelle unten.)

TOKEN = await getToken();
if(!TOKEN){ console.error('Kein Token.'); process.exit(0); }

let after = null, scanned = 0, updated = 0, failedImgs = [];
// Abfragekosten am echten Shop gemessen (2026-10-18), je Seite mit 50 Produkten:
//   51 = wie bisher · 44 = ohne das nie gelesene `featuredMedia` · 16 = ohne die Bildpruefung.
// `featuredMedia` wurde geholt und nirgends benutzt — reine Kosten, darum ersatzlos weg.
// Die Bildpruefung (`media`) kostet allein 28 Punkte je Seite und gehoert eigentlich zum
// Bild-Audit; sie bleibt eingeschaltet, laesst sich fuer lange Laeufe aber mit BILDCHECK=0
// abstellen. Das ist kein Schoenheitsfehler: Shopifys Eimer fasst 2000 Punkte und fuellt sich
// mit 100/s nach; teilt sich der Shop den Eimer mit anderen Zugriffen, passt eine Seite zu 16
// Punkten noch in die Luecken, eine zu 51 nicht mehr.
const BILDCHECK = process.env.BILDCHECK !== '0';
const Q = `query($after:String,$q:String){ products(first:50, after:$after, query:$q, sortKey:${SORT}, reverse:${REVERSE}){
  pageInfo{ hasNextPage endCursor }
  nodes{ id title seo{ title description }${BILDCHECK ? ' media(first:3){ nodes{ status } }' : ''} } } }`;
const M = `mutation($input:ProductInput!){ productUpdate(input:$input){ product{ id } userErrors{ field message } } }`;

outer:
while(true){
  const j = await gql(Q, { after, q: PQUERY });
  const conn = j?.data?.products;
  if(!conn){ console.error('Query-Fehler:', JSON.stringify(j).slice(0,300)); break; }
  for(const p of conn.nodes){
    scanned++;
    if(p.media?.nodes?.some(m => m.status && m.status !== 'READY')) failedImgs.push(p.title);
    // Nicht `!seo.title` pruefen: Shopify speichert keinen SEO-Titel, der dem Produkttitel
    // gleicht, und genau den erzeugt seoTitel fuer mittellange Titel. Begruendung + Tests in
    // automation/lib/seo_titel.mjs (seoOffen) — sonst meldet jeder Lauf dieselben Produkte
    // als offen und verbraucht jedes Mal eine Schreib-Abfrage, die nichts aendert.
    const needs = seoOffen(p.title, p.seo);
    if(needs){
      // Nur die FEHLENDEN Felder senden. Vorher ging `seoTitel(titel)` vollstaendig raus,
      // also auch der Titel — bei einem Produkt mit eigenem Titel und fehlender Beschreibung
      // haette der Lauf den handgeschriebenen Keyword-Titel ueberschrieben. Begruendung,
      // Messung und Gegenproben in automation/lib/seo_titel.mjs (seoNachtrag).
      const seo = seoNachtrag(p.title, p.seo);
      if(!Object.keys(seo).length) continue;   // nichts zu setzen — keine Schreib-Abfrage
      if(DRY){ console.log('würde SEO setzen:', p.title, '→', Object.keys(seo).join('+'), seo.title ?? '(Titel bleibt)'); updated++; }
      else{
        const r = await gql(M, { input: { id: p.id, seo } });
        const err = r?.data?.productUpdate?.userErrors?.[0]?.message;
        if(err) console.error('Fehler', p.title, err); else { updated++; console.log('✓ SEO', p.title); }
      }
      if(updated >= LIMIT) break outer;
    }
  }
  if(!conn.pageInfo.hasNextPage) break;
  after = conn.pageInfo.endCursor;
}

const msg = `🔎 SEO-Optimizer: ${scanned} Produkte gescannt (${PQUERY}, ${SORT}${REVERSE?'':' aufsteigend'}) · ${updated} SEO ${DRY?'(DRY)':'gefüllt'}`
  + (!BILDCHECK ? `\n· Bilder nicht geprueft (BILDCHECK=0)`
     : failedImgs.length ? `\n⚠️ ${failedImgs.length} Produkt(e) mit FAILED-Bild: ${failedImgs.slice(0,8).join(', ')}` : `\n✅ keine FAILED-Bilder`);
console.log(msg);
if(TG_T && TG_C && (updated>0 || failedImgs.length)){
  try{ await fetch(`https://api.telegram.org/bot${TG_T}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({chat_id:TG_C,text:msg,disable_web_page_preview:true})}); }catch(e){}
}
process.exit(0);
