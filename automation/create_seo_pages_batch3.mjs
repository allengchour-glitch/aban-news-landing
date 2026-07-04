#!/usr/bin/env node
/* LuxeStyle — create_seo_pages_batch3.mjs
 * 4 weitere SEO-Landingpages (10-Agenten-Schwarm #2, 2026-07-04), idempotent per Handle + SEO-Meta.
 * CTAs per HTTP-200 verifiziert: sub-ringe, sub-ohrringe, beauty-makeup, smartwatches-wearables.
 * Ehrlich, strikt CH, keine Fake-Angaben. No-op ohne Creds. DRY_RUN=1.
 * ENV: SHOPIFY_SHOP + SHOPIFY_CLIENT_ID/SECRET (oder SHOPIFY_ADMIN_TOKEN) · [DRY_RUN=1]
 */
const ADMIN_TOKEN=(process.env.SHOPIFY_ADMIN_TOKEN||'').trim();
const CID=(process.env.SHOPIFY_CLIENT_ID||'').trim(); const CSEC=(process.env.SHOPIFY_CLIENT_SECRET||'').trim();
const DRY=process.env.DRY_RUN==='1'; const API='2025-01';
let SHOP=(process.env.SHOPIFY_SHOP||'').replace(/^https?:\/\//,'').replace(/\/.*$/,'').trim(); if(!/myshopify\.com$/.test(SHOP)) SHOP='au3j0y-hq.myshopify.com';
if(!ADMIN_TOKEN && !(CID&&CSEC)){ console.log('Keine Shopify-Creds → No-op.'); process.exit(0); }
async function gql(tok,q,v){ const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})}); return r.json(); }
async function works(t){ try{const r=await gql(t,'{shop{name}}');return r?.data?.shop?.name||null;}catch{return null;} }
async function cc(){ const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})}); const j=await r.json().catch(()=>({})); return j.access_token||null; }
async function token(){ if(ADMIN_TOKEN&&await works(ADMIN_TOKEN))return ADMIN_TOKEN; if(CID&&CSEC){const t=await cc(); if(t&&await works(t))return t;} console.error('❌ Auth'); process.exit(0); }

const PAGES=[
 { handle:'damenringe-edelstahl-wasserfest', title:'Damenringe aus Edelstahl – wasserfest',
   tt:'Damenringe aus Edelstahl – wasserfest | LuxeStyle Schweiz',
   dt:'Wasserfeste Damenringe aus Edelstahl – anlauffrei, hautfreundlich, alltagstauglich. Versand aus der Schweiz, TWINT & Klarna, gratis ab CHF 50. Jetzt entdecken.',
   body:`<h2>Damenringe aus Edelstahl – wasserfest und alltagstauglich</h2>
<p>Ein Ring soll mitmachen: beim Händewaschen, beim Sport, in der Dusche und am See. Unsere <strong>Damenringe aus Edelstahl</strong> sind genau dafür gemacht. Der Werkstoff ist <strong>wasserfest, anlauffrei und rostet nicht</strong> – so behält Ihr Ring seinen Glanz auch nach Wochen des täglichen Tragens. Edelstahl ist zudem hautfreundlich und eine gute Wahl, wenn Sie auf günstige Modeschmuck-Legierungen empfindlich reagieren.</p>
<h2>Für jeden Look den passenden Ring</h2>
<p>Von schmalen, minimalistischen Bändern über verstellbare Modelle bis zu ausdrucksstarken Statement-Ringen: In unserer Ringe-Kollektion finden Sie Stücke für den Alltag und für besondere Anlässe. Silberfarben, goldfarben oder mit dezenten Details – kombinierbar mit Ihrem übrigen Schmuck und ideal auch als Geschenk. Achten Sie beim Kauf auf die richtige Grösse; die Massangaben finden Sie jeweils direkt beim Produkt.</p>
<h2>Pflege leicht gemacht</h2>
<p>Edelstahl ist pflegeleicht: Bei Bedarf einfach mit einem weichen, leicht feuchten Tuch abwischen. Kein aufwendiges Polieren, kein Anlaufen wie bei manchen anderen Materialien – so haben Sie lange Freude an Ihrem Ring.</p>
<h2>Sicher und bequem bei LuxeStyle bestellen</h2>
<p>🇨🇭 Versand aus der Schweiz · Bezahlung mit TWINT, Klarna oder Karte · gratis Versand ab CHF 50 · 30 Tage Rückgaberecht. So bestellen Sie in Ruhe und ohne Risiko. Mit dem Code <strong>WELCOME10</strong> sparen Sie bei Ihrer ersten Bestellung.</p>
<p><a href="/collections/sub-ringe"><strong>Jetzt alle Damenringe entdecken →</strong></a></p>` },

 { handle:'ohrringe-edelstahl-wasserfest', title:'Ohrringe & Ohrstecker aus Edelstahl',
   tt:'Ohrringe & Ohrstecker aus Edelstahl – wasserfest | LuxeStyle',
   dt:'Ohrringe & Ohrstecker aus hypoallergenem Edelstahl: wasserfest, anlauffrei, hautfreundlich. Gratis Versand ab CHF 50, 30 Tage Rückgabe. Jetzt entdecken.',
   body:`<h1>Ohrringe & Ohrstecker aus Edelstahl</h1>
<p>Auf der Suche nach Ohrringen, die den Alltag mitmachen und nicht anlaufen? Unsere Ohrstecker und Ohrringe bestehen aus hochwertigem Edelstahl – wasserfest, farbecht und angenehm leicht zu tragen. Ob beim Duschen, Sport oder Schwimmen: Du kannst sie tragen, ohne ständig ans Abnehmen zu denken.</p>
<h2>Wasserfest und alltagstauglich</h2>
<p>Edelstahl rostet nicht und läuft nicht an. Die Farbe bleibt auch nach häufigem Tragen erhalten, ganz ohne aufwendige Pflege. Damit sind unsere Ohrringe eine langlebige Alternative zu vergoldetem Modeschmuck, der oft schon nach wenigen Wochen nachlässt.</p>
<h2>Hautfreundlich & hypoallergen</h2>
<p>Der verwendete Edelstahl ist nickelarm und hypoallergen – eine gute Wahl für empfindliche Ohren und Menschen, die auf günstigen Modeschmuck sonst empfindlich reagieren. Vom dezenten Ohrstecker für jeden Tag bis zum auffälligeren Statement-Stück findest du Modelle für jeden Anlass.</p>
<h2>Für welchen Look?</h2>
<p>Kleine Stecker wirken zurückhaltend im Büro, grössere Creolen oder Anhänger setzen am Abend Akzente. Kombiniere mehrere Paare für einen persönlichen Stil oder verschenke sie – Ohrringe sind ein Klassiker, der immer passt.</p>
<h2>Sicher bestellen in der Schweiz</h2>
<p>Bezahle bequem mit TWINT, Kreditkarte oder Klarna. Ab CHF 50 liefern wir gratis, und du hast 30 Tage Rückgaberecht, falls etwas nicht passt. Mit dem Code <strong>WELCOME10</strong> erhältst du als Neukundin 10 % auf deine erste Bestellung.</p>
<p><a href="/collections/sub-ohrringe"><strong>Jetzt alle Ohrringe & Ohrstecker entdecken →</strong></a></p>` },

 { handle:'make-up-dekorative-kosmetik', title:'Make-up & dekorative Kosmetik',
   tt:'Make-up & dekorative Kosmetik online kaufen | LuxeStyle CH',
   dt:'Make-up und dekorative Kosmetik bei LuxeStyle: Foundation, Lippen, Augen & Teint. TWINT/Klarna, Gratis-Versand ab CHF 50, 30 Tage Rückgabe. Jetzt entdecken.',
   body:`<h1>Make-up & dekorative Kosmetik</h1>
<p>Entdecke bei LuxeStyle dekorative Kosmetik für deinen Alltag und besondere Momente – von Foundation und Concealer über Rouge und Bronzer bis zu Lippenstiften, Lipglosses, Lidschatten, Eyeliner und Mascara. Unsere Make-up-Auswahl hilft dir, deinen Teint zu verfeinern, Akzente zu setzen und deinen persönlichen Look zu gestalten – unkompliziert und mit Freude am Ausprobieren.</p>
<h2>Für jeden Look das passende Make-up</h2>
<p>Ob natürlicher „No-Make-up"-Look oder ausdrucksstarkes Abend-Make-up: In dieser Kategorie findest du Produkte für Gesicht, Augen und Lippen. Achte beim Aufbau auf leichte Schichten, damit das Ergebnis frisch und ebenmässig wirkt. Farbnuancen lassen sich gut kombinieren – so entsteht dein individueller Stil.</p>
<h2>Ehrlicher Hinweis zur Anwendung</h2>
<p>Dekorative Kosmetik pflegt und verschönert das Erscheinungsbild, ersetzt aber keine ärztliche oder dermatologische Beratung. Wenn du empfindliche Haut hast, teste die Verträglichkeit vorab an einer kleinen Hautstelle und beachte die Angaben auf der Verpackung. Bei anhaltenden Hautreaktionen wende dich an eine Fachperson.</p>
<h2>Sicher einkaufen bei LuxeStyle</h2>
<p>Bezahle bequem mit TWINT oder Klarna. Wir liefern gratis ab CHF 50 innerhalb der Schweiz und bieten dir 30 Tage Rückgaberecht. Neu bei uns? Mit dem Code <strong>WELCOME10</strong> sparst du bei deiner ersten Bestellung.</p>
<p><strong>🇨🇭 Schweizer Onlineshop · TWINT & Klarna · Gratis-Versand ab CHF 50 · 30 Tage Rückgabe</strong></p>
<p><a href="/collections/beauty-makeup"><strong>Jetzt Make-up & Kosmetik entdecken →</strong></a></p>` },

 { handle:'smartwatches-fitness-wearables-kaufen', title:'Smartwatches & Fitness-Wearables',
   tt:'Smartwatches & Fitness-Wearables online kaufen | LuxeStyle CH',
   dt:'Smartwatches & Fitness-Tracker bei LuxeStyle Schweiz: Schrittzähler, Herzfrequenz & Benachrichtigungen. Gratis-Versand ab CHF 50, TWINT/Klarna, 30 Tage Rückgabe.',
   body:`<h2>Smartwatches & Fitness-Wearables für deinen Alltag</h2>
<p>Entdecke bei LuxeStyle unsere Auswahl an <strong>Smartwatches und Fitness-Wearables</strong> – die smarten Begleiter für Sport, Arbeit und Freizeit. Ob du deine Schritte zählen, deine Herzfrequenz im Blick behalten oder Benachrichtigungen direkt am Handgelenk empfangen möchtest: In unserer Kollektion findest du moderne Uhren und Fitness-Tracker, die Technik und Style verbinden.</p>
<h2>Funktionen, die im Alltag zählen</h2>
<p>Viele unserer Smartwatches bieten praktische Funktionen wie Schrittzähler, Aktivitäts- und Schlaf-Übersicht, Herzfrequenz-Messung sowie Anzeige von Anrufen und Nachrichten. Der genaue Funktionsumfang unterscheidet sich je nach Modell – die Details findest du jeweils auf der Produktseite, damit du die passende Uhr für deine Bedürfnisse auswählen kannst. So findest du vom sportlichen Fitness-Tracker bis zur eleganten Smartwatch das richtige Modell.</p>
<h2>Warum bei LuxeStyle in der Schweiz kaufen?</h2>
<p>Wir sind dein Schweizer Online-Shop für Lifestyle-Accessoires und Wearables. Bei uns bezahlst du bequem mit <strong>TWINT, Klarna</strong> und weiteren Methoden.</p>
<p>✔ Gratis-Versand ab CHF 50 &nbsp;✔ 30 Tage Rückgabe &nbsp;✔ Schweizer Kundenservice &nbsp;✔ Sichere Bezahlung mit TWINT & Klarna</p>
<h2>Jetzt deine neue Smartwatch entdecken</h2>
<p>Stöbere durch unsere aktuelle Auswahl an Smartwatches und Fitness-Wearables und finde das Modell, das zu deinem Stil und deinem Alltag passt. Neu bei uns? Mit dem Code <strong>WELCOME10</strong> sparst du bei deiner ersten Bestellung.</p>
<p><a href="/collections/smartwatches-wearables"><strong>Zur Kollektion: Smartwatches & Fitness-Wearables →</strong></a></p>` },
];

const tok=await token();
const Q=`query($q:String!){ pages(first:5, query:$q){ edges{ node{ id handle } } } }`;
const CRE=`mutation($page:PageCreateInput!){ pageCreate(page:$page){ page{ id handle } userErrors{ field message } } }`;
const UPD=`mutation($id:ID!,$page:PageUpdateInput!){ pageUpdate(id:$id, page:$page){ page{ id } userErrors{ field message } } }`;
const MF=`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ field message } } }`;
let created=0, updated=0, fails=[];
for(const p of PAGES){
  let ex=null; try{ const r=await gql(tok,Q,{q:`handle:${p.handle}`}); ex=(r?.data?.pages?.edges||[]).map(e=>e.node).find(n=>n.handle===p.handle)||null; }catch(e){}
  if(DRY){ console.log(`DRY ${ex?'update':'create'}: /pages/${p.handle}`); continue; }
  let id=ex?.id||null;
  if(ex){ const r=await gql(tok,UPD,{id:ex.id,page:{title:p.title,body:p.body,isPublished:true}}); const ue=r?.data?.pageUpdate?.userErrors||[]; if(ue.length){fails.push(`${p.handle}:${JSON.stringify(ue).slice(0,90)}`);continue;} updated++; }
  else { const r=await gql(tok,CRE,{page:{title:p.title,handle:p.handle,body:p.body,isPublished:true}}); const ue=r?.data?.pageCreate?.userErrors||[]; if(ue.length){fails.push(`${p.handle}:${JSON.stringify(ue).slice(0,90)}`);continue;} id=r?.data?.pageCreate?.page?.id; created++; }
  if(id) await gql(tok,MF,{mf:[{ownerId:id,namespace:'global',key:'title_tag',type:'single_line_text_field',value:p.tt},{ownerId:id,namespace:'global',key:'description_tag',type:'single_line_text_field',value:p.dt}]});
  console.log(`✓ /pages/${p.handle}`); await new Promise(x=>setTimeout(x,250));
}
if(fails.length) fails.forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${created} angelegt, ${updated} aktualisiert${fails.length?`, ${fails.length} Fehler`:''}.`);
