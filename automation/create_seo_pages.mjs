#!/usr/bin/env node
/* LuxeStyle — create_seo_pages.mjs
 * Legt die vom Recherche-Schwarm gebauten SEO-Landingpages an (idempotent per Handle) + SEO-Meta.
 * Alle Collection-Links vorab per HTTP-200 verifiziert (kaputte 404-Links korrigiert: selbst-gestalten→sg-alle, gaming-zubohor→gaming).
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
 { handle:'damenmode-online-schweiz', title:'Damenmode online kaufen in der Schweiz',
   tt:'Damenmode online kaufen in der Schweiz | LuxeStyle',
   dt:'Damenmode online in der Schweiz: Kleider, Taschen & wasserfester Schmuck. Gratis Versand ab CHF 50, 30 Tage Rückgabe, Zahlung mit TWINT & Klarna bei LuxeStyle.',
   body:`<h2>Damenmode online kaufen in der Schweiz</h2>
<p>Willkommen bei <strong>LuxeStyle</strong> – deinem Shop für <strong>Damenmode online in der Schweiz</strong>. Ob alltagstaugliches Outfit, ein feiner Look fürs Büro oder etwas Besonderes für den Abend: In unserer Kollektion findest du Kleider, Blusen, Taschen, Schuhe und Accessoires, die sich leicht kombinieren lassen.</p>
<h2>Sommermode für jeden Anlass</h2>
<p>Entdecke luftige Sommerkleider, Strandtücher, Cover-ups und Sonnenbrillen für den nächsten See-Tag oder die Städtereise. Filtere bequem nach Grösse, Preis und Kategorie und stell dir dein Sommer-Outfit in wenigen Minuten zusammen.</p>
<h2>Wasserfester Schmuck als perfekte Ergänzung</h2>
<p>Unser <a href="/collections/wasserfester-schmuck">wasserfester Schmuck</a> – Halsketten, Armbänder und Ohrringe – bleibt beim Duschen, Schwimmen und Schwitzen glänzend und ist der ideale Begleiter zu deiner Sommermode.</p>
<h2>Ehrlich einkaufen bei LuxeStyle</h2>
<p>Klare Angaben statt leerer Versprechen: <strong>Gratis Versand ab CHF 50</strong>, <strong>30 Tage Rückgaberecht</strong> und Bezahlung mit <strong>TWINT und Klarna</strong>. Als Neukundin sparst du mit dem Code <strong>WELCOME10</strong>. Lieferung in die ganze Schweiz.</p>
<p><a href="/collections/damen-mode"><strong>➜ Zur Damenmode-Kollektion</strong></a></p>` },

 { handle:'beauty-self-care-schweiz', title:'Beauty & Self-Care online kaufen in der Schweiz',
   tt:'Beauty & Self-Care online kaufen | LuxeStyle Schweiz',
   dt:'Beauty & Self-Care für die Schweiz: Gesichtspflege, Seren, Masken, Make-up & Beauty-Tools. Gratis-Versand ab CHF 50, 30 Tage Rückgabe, TWINT & Klarna.',
   body:`<h2>Beauty & Self-Care online kaufen in der Schweiz</h2>
<p>Deine Pflege-Routine soll zu dir passen. Bei LuxeStyle findest du Beauty- und Self-Care-Produkte für den Alltag in der Schweiz: von der Gesichtspflege über Make-up bis zu praktischen Beauty-Tools – verständlich beschrieben und ehrlich eingeordnet.</p>
<h2>Was dich im Sortiment erwartet</h2>
<ul>
<li><strong>Gesichtspflege & Seren</strong> – Feuchtigkeitspflege und Seren für den täglichen Gebrauch.</li>
<li><strong>Masken</strong> – für die kleine Pflege-Pause zwischendurch.</li>
<li><strong>Make-up</strong> – Foundation, Lippen- und Augen-Produkte für deinen Look.</li>
<li><strong>Beauty-Tools</strong> – Instrumente und Geräte, die deine Pflege-Routine ergänzen.</li>
</ul>
<p>Wir verzichten bewusst auf Heilsversprechen. Kosmetik kann pflegen und sich gut anfühlen – sie ersetzt aber keine ärztliche Beratung. Bei empfindlicher Haut lohnt sich vorab ein Verträglichkeits-Test.</p>
<h2>Sicher bei LuxeStyle bestellen</h2>
<p>Bezahle bequem mit TWINT oder Klarna. Gratis-Versand ab CHF 50 innerhalb der Schweiz, 30 Tage Rückgabe. Mit dem Code <strong>WELCOME10</strong> sparst du bei deiner ersten Bestellung.</p>
<p><a href="/collections/beauty-selfcare"><strong>Jetzt Beauty & Self-Care entdecken →</strong></a></p>` },

 { handle:'schmuck-personalisiert-schweiz', title:'Personalisierter Schmuck & Schmuck-Geschenke aus der Schweiz',
   tt:'Personalisierter Schmuck Schweiz | Armband mit Gravur',
   dt:'Personalisierter Schmuck aus der Schweiz: Geburtsstein-Armbänder mit Buchstabe & Armband mit Gravur. Schöne Geschenkidee. Gratis ab CHF 50, TWINT & Klarna.',
   body:`<h1>Personalisierter Schmuck & Schmuck-Geschenke aus der Schweiz</h1>
<p>Du suchst ein Schmuckstück, das wirklich zu einem Menschen passt? Personalisierter Schmuck macht aus einem Armband oder einer Kette ein persönliches Geschenk – mit Geburtsstein, Buchstabe oder feiner Gravur. Bei LuxeStyle findest du eine handverlesene Auswahl an Damen-Schmuck aus langlebigem Edelstahl.</p>
<h2>Warum personalisierter Schmuck ein so schönes Geschenk ist</h2>
<p>Ein Schmuckstück mit Geburtsstein oder Initiale erzählt eine kleine Geschichte – zum Geburtstag, zur Taufe, als Muttertagsgeschenk oder einfach als Zeichen, dass man an jemanden denkt.</p>
<h2>Unsere Auswahl im Überblick</h2>
<ul>
<li><strong>Geburtsstein-Armbänder mit Buchstabe</strong> – wähle Stein und Initiale passend zur Person.</li>
<li><strong>Armbänder mit Gravur</strong> – zarte Edelstahl-Armbänder für eine persönliche Botschaft.</li>
<li><strong>Ketten, Ringe & Ohrringe</strong> – zeitlose Klassiker in Silber- und Goldoptik, aus Edelstahl und 18K vergoldet.</li>
</ul>
<h2>Sicher & unkompliziert bestellen</h2>
<p>LuxeStyle ist dein Schweizer Online-Shop: Bezahlung mit <strong>TWINT</strong> oder <strong>Klarna</strong>, <strong>Gratis-Versand ab CHF 50</strong> und <strong>30 Tage Rückgaberecht</strong>. Neu hier? Mit <strong>WELCOME10</strong> erhältst du 10 % auf deine erste Bestellung.</p>
<p><a href="/collections/premium-schmuck"><strong>→ Zur Schmuck-Kollektion von LuxeStyle</strong></a></p>` },

 { handle:'geschenke', title:'Geschenke & personalisierte Geschenkideen aus der Schweiz',
   tt:'Geschenke für sie – personalisierte Geschenkideen | LuxeStyle',
   dt:'Geschenkideen für sie: personalisierbare Geschenke, wasserfester Schmuck & Beauty. Gratis-Versand ab CHF 50, 30 Tage Rückgabe, Zahlung mit TWINT & Klarna.',
   body:`<h1>Geschenke & personalisierte Geschenkideen aus der Schweiz</h1>
<p>Du suchst ein Geschenk für sie, das nicht in jedem zweiten Schrank liegt? Bei LuxeStyle findest du durchdachte Geschenkideen – von wasserfestem Schmuck über Beauty bis zu personalisierten Stücken, die du selbst gestaltest.</p>
<h2>Personalisierte Geschenke – mit eigenem Namen, Foto oder Text</h2>
<p>Ein persönliches Geschenk bleibt in Erinnerung. In unserem Bereich <a href="/collections/sg-alle">Selbst gestalten</a> gestaltest du Kleidungsstücke und Accessoires mit deinem eigenen Text, Namen oder Foto – zum Beispiel eine <a href="/products/keramik-tasse-selbst-gestalten">Keramik-Tasse</a> oder ein <a href="/products/klassisches-unisex-t-shirt-selbst-gestalten">T-Shirt</a>.</p>
<h2>Schmuck & Beauty als Geschenkidee für sie</h2>
<p>Zeitlos und immer passend: <a href="/collections/wasserfester-schmuck">wasserfester Schmuck</a> – Halsketten, Armbänder und Ohrringe, die Duschen und Alltag mitmachen. Wer lieber Pflege verschenkt, wird in <a href="/collections/beauty-selfcare">Beauty</a> fündig. Outfits findest du in der <a href="/collections/damen-mode">Damen-Mode</a>.</p>
<h2>Für jeden Anlass das passende Geschenk</h2>
<p>Ob Geburtstag, Muttertag, Jahrestag oder als kleine Aufmerksamkeit – für jedes Budget eine Geschenkidee. Neu bei uns? Mit <strong>WELCOME10</strong> erhältst du 10 % auf deine erste Bestellung.</p>
<h2>Darum bei LuxeStyle bestellen</h2>
<p>Gratis-Versand ab CHF 50 innerhalb der Schweiz · 30 Tage Rückgaberecht · Bezahlung mit TWINT, Klarna, Kreditkarte oder PayPal · Schweizer Onlineshop mit persönlichem Support.</p>` },

 { handle:'gadgets-elektronik-kaufen-schweiz', title:'Gadgets & Elektronik kaufen in der Schweiz',
   tt:'Gadgets & Elektronik online kaufen Schweiz | LuxeStyle',
   dt:'Gadgets & Elektronik online kaufen in der Schweiz: Smart Home, USB-Gadgets, Smartwatches & Tech-Geschenke. Gratis Versand ab CHF 50, TWINT & Klarna, 30 Tage Rückgabe.',
   body:`<h2>Gadgets & Elektronik kaufen in der Schweiz</h2>
<p>Von praktischen Alltagshelfern bis zu cleverer Technik fürs Zuhause: In unserer Kategorie <strong>Gadgets & Elektronik</strong> findest du eine wachsende Auswahl an Tech-Produkten, die den Alltag einfacher und smarter machen.</p>
<h2>Smart Home, USB-Gadgets & mehr</h2>
<p>Mach dein Zuhause smarter mit unseren <a href="/collections/smart-home-sub">Smart-Home-Produkten</a>, entdecke handliche <a href="/collections/reise-gadgets">Reise- und USB-Gadgets</a> oder wirf einen Blick auf <a href="/collections/smartwatches-wearables">Smartwatches & Wearables</a>. Jedes Produkt hat eine ausführliche Beschreibung mit den wichtigsten technischen Angaben – ohne Überraschungen.</p>
<h2>Das perfekte Tech-Geschenk</h2>
<p>Du suchst ein Geschenk für einen Technik-Fan? Gadgets kommen fast immer gut an. Mit dem Code <strong>WELCOME10</strong> erhältst du bei deiner ersten Bestellung 10 % Rabatt.</p>
<h2>Sicher & unkompliziert einkaufen</h2>
<p>Wir liefern in die ganze Schweiz. Bezahlen kannst du mit <strong>TWINT</strong>, <strong>Klarna</strong> und weiteren Methoden. <strong>Versand gratis ab CHF 50</strong>, und dank <strong>30 Tagen Rückgaberecht</strong> kannst du in Ruhe prüfen.</p>
<p><a href="/collections/gadgets"><strong>➜ Jetzt alle Gadgets & Elektronik entdecken</strong></a></p>` },

 { handle:'gaming-zubehoer-schweiz', title:'Gaming-Zubehör Schweiz',
   tt:'Gaming-Zubehör Schweiz: Maus, Headset & PS5 | LuxeStyle',
   dt:'Gaming-Zubehör aus der Schweiz: Gaming-Maus, Headset, Controller & PS5-Zubehör. Versand aus CH, gratis ab CHF 50, 30 Tage Rückgabe. Jetzt entdecken.',
   body:`<h1>Gaming-Zubehör Schweiz</h1>
<p>Du suchst Gaming-Zubehör in der Schweiz? Bei LuxeStyle findest du das Wichtigste für deinen Setup an einem Ort: <strong>Gaming-Maus</strong>, <strong>Gaming-Headset</strong>, <strong>Controller</strong> und <strong>PS5-Zubehör</strong> – geliefert in die ganze Schweiz.</p>
<h2>Für jeden Setup das passende Zubehör</h2>
<p>Eine präzise <strong>Gaming-Maus</strong> macht in schnellen Shootern den Unterschied. Ein gutes <strong>Gaming-Headset</strong> sorgt für klaren Sound. Dazu findest du <strong>Controller und Gamepads</strong> sowie <strong>PS5-Zubehör</strong> – am PC oder an der Konsole.</p>
<h2>Das perfekte Geschenk für Gamer</h2>
<p>Zubehör wie Headset, Maus oder ein Controller ist eine sichere Wahl – praktisch und sofort einsetzbar. Filtere nach Marke und Preis. Mit <strong>WELCOME10</strong> erhältst du 10 % auf deine erste Bestellung.</p>
<h2>Warum bei LuxeStyle bestellen?</h2>
<p>Gratis ab CHF 50 Bestellwert. Bezahle mit TWINT, Kreditkarte oder Klarna. Innerhalb von 30 Tagen kannst du unkompliziert zurückgeben.</p>
<p><a href="/collections/gaming"><strong>➜ Jetzt das ganze Gaming-Zubehör entdecken</strong></a></p>` },
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
