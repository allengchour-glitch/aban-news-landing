#!/usr/bin/env node
/* LuxeStyle — create_seo_pages_batch2.mjs
 * 8 weitere SEO-Landingpages aus dem 20-Agenten-Schwarm (2026-07-04), idempotent per Handle + SEO-Meta.
 * Alle Collection-CTAs vorab per HTTP-200 von den Agenten verifiziert. Ehrlich, strikt CH, keine Fake-Angaben.
 * No-op ohne Creds. DRY_RUN=1.
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
 { handle:'uhren-kaufen-schweiz', title:'Uhren online kaufen in der Schweiz',
   tt:'Uhren online kaufen Schweiz – Damen- & Herrenuhren | LuxeStyle',
   dt:'Damen- und Herrenuhren online kaufen in der Schweiz. Zeitlose Armbanduhren bei LuxeStyle CH – Zahlung mit TWINT & Klarna, gratis Versand ab CHF 50, 30 Tage Rückgabe.',
   body:`<h1>Uhren online kaufen in der Schweiz</h1>
<p>Eine Uhr ist mehr als ein Zeitmesser – sie ist Ausdruck von Stil und Persönlichkeit. Bei <strong>LuxeStyle CH</strong> findest du sorgfältig ausgewählte <strong>Damenuhren</strong> und <strong>Herrenuhren</strong> für jeden Anlass: vom klassischen Business-Look über sportliche Modelle bis zur eleganten Uhr für den Abend. Bequem online bestellt und schweizweit geliefert.</p>
<h2>Damenuhren – elegant und vielseitig</h2>
<p>Feine Gehäuse, filigrane Armbänder und klare Zifferblätter: Unsere Damenuhren passen zu Alltag, Büro und besonderen Momenten. Ob dezent in Silber und Roségold oder als markanter Akzent – hier findest du deine passende Armbanduhr.</p>
<h2>Herrenuhren – markant und zeitlos</h2>
<p>Robuste Modelle mit Edelstahl- oder Lederarmband, gut ablesbare Zifferblätter und schlichtes Design. Unsere Herrenuhren begleiten dich souverän durch Arbeit, Freizeit und Anlass.</p>
<h2>Die richtige Uhr finden</h2>
<p>Achte beim Kauf auf Armbandmaterial, Gehäusegrösse und Stil, der zu dir passt. Detaillierte Angaben findest du auf jeder Produktseite, damit du deine Uhr in Ruhe vergleichen und passend auswählen kannst.</p>
<p>🇨🇭 Aus der Schweiz für die Schweiz: Bezahlung mit TWINT, Klarna & Kreditkarte · gratis Versand ab CHF 50 · 30 Tage Rückgabe.</p>
<p><a href="/collections/uhren"><strong>➡️ Jetzt alle Uhren entdecken</strong></a> und deinen neuen Begleiter fürs Handgelenk finden. Mit dem Code <strong>WELCOME10</strong> sparst du bei deiner ersten Bestellung.</p>` },

 { handle:'sonnenbrillen', title:'Sonnenbrillen mit UV400-Schutz online kaufen',
   tt:'Sonnenbrillen mit UV400 online kaufen | LuxeStyle Schweiz',
   dt:'Sonnenbrillen mit UV400-Schutz online kaufen bei LuxeStyle Schweiz. Damenmodelle für den Sommer, Versand ab CHF 50 gratis, TWINT & 30 Tage Rückgabe.',
   body:`<h2>Sonnenbrillen mit UV400-Schutz für den Schweizer Sommer</h2>
<p>Ob am Zürichsee, auf der Wanderung im Tessin oder in der Stadt: Eine gute Sonnenbrille gehört im Sommer einfach dazu. Bei <strong>LuxeStyle</strong> findest du modische Sonnenbrillen mit UV400-Schutz, die deine Augen zuverlässig vor UVA- und UVB-Strahlung abschirmen. UV400 bedeutet, dass Lichtwellen bis 400 Nanometer gefiltert werden – der Schutz, den Augenärzte empfehlen.</p>
<h2>Modische Damenmodelle für jeden Anlass</h2>
<p>Unsere aktuelle Auswahl ist auf Damen ausgerichtet: von klassischen Cat-Eye- und Oversized-Formen bis zu dezenten, zeitlosen Modellen. Leichte Fassungen sitzen bequem, auch wenn du die Brille den ganzen Tag trägst. So kombinierst du sichtbaren Sonnenschutz mit deinem persönlichen Stil – passend zu jedem Sommer-Outfit.</p>
<h2>Warum bei LuxeStyle kaufen</h2>
<p>Wir liefern in die ganze Schweiz. Ab einem Bestellwert von <strong>CHF 50 ist der Versand gratis</strong>, bezahlen kannst du bequem mit <strong>TWINT</strong>, Karte oder auf Rechnung. Du hast <strong>30 Tage Rückgaberecht</strong> – passt die Brille nicht, schickst du sie unkompliziert zurück. Neu bei uns? Mit dem Code <strong>WELCOME10</strong> sparst du bei deiner ersten Bestellung 10 %.</p>
<h2>Jetzt Sonnenbrillen entdecken</h2>
<p>Stöbere durch unsere Kollektion und finde dein neues Lieblingsmodell für den Sommer.</p>
<p><a href="/collections/sonnenbrillen-damen"><strong>👉 Zur Kollektion Sonnenbrillen Damen</strong></a></p>
<p><em>Hinweis: Sonnenbrillen sind ein modisches Accessoire mit UV-Schutz und ersetzen keine medizinische Sehhilfe.</em></p>` },

 { handle:'herren-mode-fuer-ihn', title:'Herren-Mode & Accessoires für Ihn',
   tt:'Herren-Mode & Accessoires für Ihn | LuxeStyle Schweiz',
   dt:'Herrenmode, Accessoires & Geschenkideen für Männer – online in der Schweiz. Bezahlen mit TWINT & Klarna, gratis Versand ab CHF 50, 30 Tage Rückgabe.',
   body:`<h2>Herren-Mode & Accessoires – die Kollektion «Für Ihn»</h2>
<p>Willkommen bei <strong>LuxeStyle</strong>, Ihrem Schweizer Online-Shop für stilvolle Herrenmode und Accessoires. Ob moderne Basics, edle Accessoires oder das passende Geschenk für einen besonderen Mann – in unserer Kollektion «Für Ihn» finden Sie sorgfältig ausgewählte Stücke, die Alltag und besondere Anlässe aufwerten. Wir setzen auf zeitlose Designs, die man gerne trägt und lange behält.</p>
<h2>Accessoires für Männer, die den Unterschied machen</h2>
<p>Die richtigen Accessoires runden jeden Look ab. Von dezentem Herrenschmuck über praktische Alltagsbegleiter bis zu Details, die Persönlichkeit zeigen: Unsere Auswahl an Männer-Accessoires kombiniert klare Linien mit angenehmen Materialien. So gelingt der stimmige Auftritt – im Büro, in der Freizeit oder unterwegs.</p>
<h2>Geschenk für Männer? Hier werden Sie fündig</h2>
<p>Sie suchen ein Geschenk für Ihren Partner, Vater, Bruder oder Freund? Unsere Herren-Kollektion bietet Geschenkideen für jedes Budget und jeden Geschmack – durchdacht, hochwertig und alltagstauglich. So machen Sie eine Freude, die ankommt.</p>
<h2>Sicher einkaufen bei LuxeStyle Schweiz</h2>
<p>Bezahlen Sie bequem mit <strong>TWINT</strong> oder <strong>Klarna</strong>. Wir liefern <strong>gratis ab CHF 50</strong> und bieten <strong>30 Tage Rückgaberecht</strong> – transparent und fair. Mit dem Code <strong>WELCOME10</strong> sichern Sie sich als Neukunde einen Willkommensrabatt.</p>
<p><a href="/collections/fur-ihn"><strong>Jetzt Herren-Kollektion «Für Ihn» entdecken →</strong></a></p>` },

 { handle:'wasserfester-schmuck-edelstahl', title:'Wasserfester Schmuck aus Edelstahl',
   tt:'Wasserfester Schmuck aus Edelstahl – anlauffrei | LuxeStyle',
   dt:'Wasserfester Schmuck aus Edelstahl: Halsketten, Armbänder & Ohrringe, die Duschen, Schwimmen & Schweiss aushalten. Anlauffrei & hautfreundlich. Gratis ab CHF 50.',
   body:`<h2>Was ist wasserfester Schmuck?</h2>
<p>Wasserfester Schmuck aus Edelstahl ist so gemacht, dass er täglich mit Wasser in Kontakt kommen darf – ohne anzulaufen, zu rosten oder seine Farbe zu verlieren. Statt einer dünnen Beschichtung, die schnell abblättert, setzen wir auf hochwertigen Edelstahl (316L), teilweise mit einer echten PVD-Vergoldung. So bleiben Halsketten, Armbänder und Ohrringe auch nach Wochen des Tragens schön. Der Klassiker unter den Materialien für alle, die ihren Schmuck nicht ständig ablegen möchten.</p>
<h2>Die Vorteile auf einen Blick</h2>
<ul>
  <li><strong>Duschen & Schwimmen erlaubt:</strong> Der Schmuck hält Wasser, Seife und Chlor problemlos aus.</li>
  <li><strong>Anlauffrei:</strong> Edelstahl oxidiert nicht – der Glanz bleibt lange erhalten.</li>
  <li><strong>Hautfreundlich:</strong> Nickelarm und gut verträglich, auch bei empfindlicher Haut.</li>
  <li><strong>Alltagstauglich:</strong> Kratzfest und robust genug für jeden Tag.</li>
</ul>
<h2>Pflege – so einfach geht's</h2>
<p>Wasserfester Schmuck ist pflegeleicht, ein paar Handgriffe erhalten den Glanz aber noch länger. Reinige ihn ab und zu mit lauwarmem Wasser und einem weichen Tuch. Parfüm und Cremes trägst du am besten auf, bevor du den Schmuck anlegst. Zum Aufbewahren eignet sich ein trockener Beutel oder eine Schmuckschachtel, damit nichts verkratzt.</p>
<p><strong>Sicher einkaufen bei LuxeStyle:</strong> Bezahlung mit TWINT, Klarna & Kreditkarte · Gratis Versand ab CHF 50 · 30 Tage Rückgaberecht.</p>
<p><a href="/collections/wasserfester-schmuck"><strong>Jetzt wasserfesten Schmuck entdecken →</strong></a></p>` },

 { handle:'taschen-rucksaecke-schweiz', title:'Taschen & Rucksäcke online kaufen',
   tt:'Taschen & Rucksäcke online kaufen | LuxeStyle Schweiz',
   dt:'Handtaschen, Crossbody-Taschen & Rucksäcke online kaufen bei LuxeStyle. Gratis Lieferung ab CHF 50, 30 Tage Rückgabe, Zahlung mit TWINT. Jetzt entdecken!',
   body:`<h2>Handtaschen, Crossbody- & Schultertaschen für jeden Tag</h2>
<p>Ob elegante Handtasche fürs Büro, praktische Crossbody-Tasche für die Stadt oder geräumige Schultertasche für den Wochenendeinkauf: In unserer Kollektion <strong>Taschen & Rucksäcke</strong> findest du Modelle, die zu deinem Alltag in der Schweiz passen. Vom klassischen Shopper bis zur kompakten Umhängetasche kombinieren unsere Taschen durchdachte Fächeraufteilung mit zeitlosem Design – damit Portemonnaie, Schlüssel und Smartphone ihren festen Platz haben.</p>
<h2>Rucksäcke für Alltag, Schule & Reise</h2>
<p>Du bist viel unterwegs? Unsere Rucksäcke begleiten dich zuverlässig – ob als bequemer Daypack für die Uni, als robuster Begleiter für den Arbeitsweg oder als leichter Rucksack für die nächste Reise. Viele Modelle bieten gepolsterte Fächer für Laptop und Tablet sowie verstellbare Träger für angenehmen Tragekomfort. So hast du unterwegs alles Wichtige sicher dabei.</p>
<h2>Warum bei LuxeStyle bestellen</h2>
<p>Wir setzen auf ausgewählte Modelle und ehrliche Produktangaben – ohne leere Versprechen. Du bestellst bequem und sicher aus der ganzen Schweiz.</p>
<ul>
  <li>🚚 <strong>Gratis Lieferung ab CHF 50</strong> innerhalb der Schweiz</li>
  <li>↩️ <strong>30 Tage Rückgabe</strong> – falls die Tasche doch nicht passt</li>
  <li>💳 Bezahlen mit <strong>TWINT, Kreditkarte, PayPal & Klarna</strong></li>
  <li>🎁 Mit Code <strong>WELCOME10</strong> sparst du bei deiner ersten Bestellung</li>
</ul>
<p>Entdecke jetzt die ganze Auswahl an Handtaschen, Crossbody-Taschen und Rucksäcken und finde deinen neuen Begleiter. <a href="/collections/sub-taschen"><strong>Taschen & Rucksäcke ansehen →</strong></a></p>` },

 { handle:'sommermode', title:'Sommermode – Sommerkleider & leichte Mode',
   tt:'Sommermode 2026 – Sommerkleider & leichte Mode | LuxeStyle CH',
   dt:'Sommermode für Damen: luftige Sommerkleider, Strandmode und leichte Styles für heisse Tage. Gratis Versand ab CHF 50, TWINT & 30 Tage Rückgabe in der Schweiz.',
   body:`<h2>Sommermode für heisse Tage in der Schweiz</h2>
<p>Wenn die Temperaturen steigen, darf die Garderobe leichter werden. In unserer <strong>Sommermode</strong> findest du luftige Sommerkleider, feine Blusen, kurze Röcke und lockere Oberteile aus atmungsaktiven Stoffen – gemacht für sonnige Tage in der Stadt, im Büro oder am See. Ob leichtes Baumwollkleid für den Alltag oder ein elegantes Sommerkleid für laue Abende: Hier findest du Stücke, die kühlen, schmeicheln und mitmachen.</p>
<h2>Sommerkleider, Strandmode & leichte Styles</h2>
<p>Von fliessenden Midikleidern über verspielte Trägertops bis zur bequemen <strong>Strandmode</strong> für die nächste Badi oder den Sommerurlaub – unsere Auswahl deckt jeden sonnigen Anlass ab. Kombiniere leichte Kleider mit passenden Accessoires und Schmuck aus dem LuxeStyle-Sortiment und stelle dir deinen persönlichen Sommer-Look zusammen. Wir setzen auf Schnitte und Farben, die sich vielseitig kombinieren lassen, damit jedes Teil mehrfach zum Einsatz kommt.</p>
<h2>Sicher & bequem einkaufen bei LuxeStyle</h2>
<p>Bezahle entspannt mit TWINT, Kreditkarte oder Klarna. <strong>Gratis Versand ab CHF 50</strong> innerhalb der Schweiz und <strong>30 Tage Rückgaberecht</strong> – passt die Grösse nicht, schickst du unkompliziert zurück. Mit dem Code <strong>WELCOME10</strong> erhältst du bei deiner ersten Bestellung 10 % Rabatt.</p>
<p><a href="/collections/sommer"><strong>Jetzt Sommermode entdecken →</strong></a></p>` },

 { handle:'geschenke-fuer-maenner', title:'Geschenke für Männer – Geschenk für ihn finden',
   tt:'Geschenke für Männer – Geschenk für ihn finden | LuxeStyle',
   dt:'Geschenke für Männer bei LuxeStyle: Herrenuhren, Lederwaren, Gadgets & Bart-Pflege. Gratis Versand ab CHF 50, TWINT & Klarna, 30 Tage Rückgabe. Jetzt finden.',
   body:`<h1>Geschenke für Männer – das passende Geschenk für ihn</h1>
<p>Du suchst ein Geschenk für Männer und weisst nicht, wo anfangen? Bei <strong>LuxeStyle</strong> findest du durchdachte Geschenkideen für ihn – von der klassischen <a href="/collections/herren-uhren">Herrenuhr</a> über hochwertige <a href="/collections/lederwaren">Lederwaren</a> bis zu praktischen <a href="/collections/gadgets">Gadgets</a> und Pflege für Bart und Rasur. Ob Freund, Partner, Papa, Bruder oder Kollege: Hier ist für jeden Typ und jedes Budget etwas dabei.</p>
<h2>Geschenke zum Geburtstag</h2>
<p>Ein Geburtstag darf etwas Besonderes sein. Eine elegante <a href="/collections/herrenuhren-schmuck">Herrenuhr oder Herrenschmuck</a> begleitet ihn jeden Tag, ein gepflegtes <a href="/collections/portemonnaie">Portemonnaie</a> ist ein Klassiker, der nie danebengeht. Stöbere auch durch unsere <a href="/collections/trends-gadgets">Trends & Gadgets</a> für den Mann, der schon alles hat.</p>
<h2>Geschenke für Partner & Ehemann</h2>
<p>Zeig ihm, dass du an ihn denkst: ein <a href="/collections/herren-duefte">Herrenduft</a>, ein sorgfältig ausgewähltes Accessoire aus <a href="/collections/fur-ihn">Für Ihn</a> oder ein Set zur <a href="/collections/sub-bart-rasur">Bart- & Rasur-Pflege</a> für das tägliche Ritual. Kleine Gesten mit grosser Wirkung.</p>
<h2>Geschenke zu Weihnachten & besonderen Anlässen</h2>
<p>Zu Weihnachten, zum Vatertag oder einfach so: Unsere <a href="/collections/geschenke-unter-50-franken">Geschenke unter CHF 50</a> treffen den Geschmack, ohne das Budget zu sprengen. Wer etwas Hochwertigeres sucht, wird bei den <a href="/collections/premium-geschenke">Premium Gifts</a> fündig.</p>
<h2>Warum bei LuxeStyle bestellen</h2>
<p><strong>Gratis Versand ab CHF 50 · Bezahlung mit TWINT, Klarna & Kreditkarte · 30 Tage Rückgabe.</strong> Sicher und unkompliziert bei deinem Schweizer Online-Shop – damit das Schenken Freude macht, ihm und dir.</p>` },

 { handle:'selbst-gestalten', title:'T-Shirt, Tasse & mehr selbst gestalten',
   tt:'T-Shirt & Tasse selbst gestalten Schweiz | LuxeStyle',
   dt:'T-Shirt, Hoodie, Tasse oder Taschen selbst gestalten mit eigenem Text, Name oder Foto. Personalisiert für die Schweiz. Lieferung ca. 7–14 Tage. Jetzt gestalten.',
   body:`<p>Gestalte dein eigenes Lieblingsstück: Bei <strong>LuxeStyle</strong> bedruckst du T-Shirts, Hoodies, Tassen, Taschen und Fan-Trikots mit deinem eigenen Text, Namen oder Foto. Ob Geschenk, Team-Event, Vereinsanlass oder ein Unikat nur für dich – hier entsteht Print-on-Demand für die ganze Schweiz.</p>
<h2>So funktioniert's</h2>
<ol>
  <li><strong>Produkt wählen</strong> – T-Shirt, Hoodie, Tasse, Tasche oder Trikot.</li>
  <li><strong>Motiv hochladen</strong> – dein Text, Name, Datum oder Foto.</li>
  <li><strong>Bestellen</strong> – wir drucken dein Einzelstück und senden es dir zu.</li>
</ol>
<h2>Produkte zum Selbstgestalten</h2>
<ul>
  <li><a href="/products/klassisches-unisex-t-shirt-selbst-gestalten">T-Shirt selbst gestalten</a> – klassischer Unisex-Schnitt, viele Grössen.</li>
  <li><a href="/products/keramik-tasse-selbst-gestalten">Keramik-Tasse bedrucken</a> – für Büro, Küche oder als Geschenk.</li>
  <li><a href="/products/wm-trikot-selbst-gestalten">Fan-Trikot selbst gestalten</a> – mit Wunschname und -nummer.</li>
</ul>
<p>Alle personalisierbaren Artikel findest du in unserer <a href="/collections/sg-alle">Kollektion «Selbst gestalten»</a>.</p>
<h2>Ehrliche Lieferzeit</h2>
<p>Da jedes Stück individuell für dich bedruckt wird, dauern Produktion und Versand in die Schweiz in der Regel <strong>ca. 7–14 Tage</strong>. Wir versprechen bewusst keine Express-Wunder – lieber realistisch planen und dich pünktlich freuen.</p>
<h2>Darauf kannst du zählen</h2>
<p>🇨🇭 Schweizer Shop · Bezahlung mit TWINT & Klarna · Gratis Versand ab CHF 50 · 30 Tage Rückgaberecht. Mit dem Code <strong>WELCOME10</strong> sparst du bei deiner ersten Bestellung.</p>
<p><a href="/collections/sg-alle"><strong>Jetzt dein Unikat gestalten →</strong></a></p>` },

 { handle:'anime-figuren-funko-pop-schweiz', title:'Anime Figuren & Funko Pop online kaufen',
   tt:'Anime Figuren & Funko Pop online kaufen Schweiz | LuxeStyle',
   dt:'Anime Figuren, Funko Pop & Sammelfiguren online kaufen in der Schweiz. Naruto, Dragon Ball & Co. Bezahlung mit TWINT/Klarna, Gratis-Versand ab CHF 50.',
   body:`<h1>Anime Figuren & Funko Pop online kaufen in der Schweiz</h1>
<p>Du suchst Anime Figuren, Funko Pop! oder Sammelfiguren deiner Lieblingsserien? Bei LuxeStyle findest du eine wachsende Auswahl an Figuren rund um Anime & Manga, von Naruto über Dragon Ball bis zu beliebten Funko Pop! Charakteren. Ob für die eigene Sammlung oder als Geschenk für Fans, hier entdeckst du Stücke, die auf jedem Regal, Schreibtisch oder Gaming-Setup eine gute Figur machen.</p>
<h2>Sammelfiguren für Anime- und Manga-Fans</h2>
<p>Von detailreichen Actionfiguren wie dem Dragon Ball Limit Breaker Goku bis zu kompakten Funko Pop! Figuren, die sich ideal stapeln und kombinieren lassen: Unsere Auswahl richtet sich an alle, die ihre Lieblingshelden gerne sichtbar in Szene setzen. Viele Figuren eignen sich auch bestens als Geschenk zu Geburtstag, Weihnachten oder einfach zwischendurch.</p>
<h2>Warum bei LuxeStyle bestellen?</h2>
<p>Wir sind ein Schweizer Onlineshop und liefern in die ganze Schweiz. Du bezahlst bequem und sicher mit TWINT, Klarna, Kredit- oder Debitkarte. Ab einem Bestellwert von CHF 50 ist der Versand gratis, und dank 30 Tagen Rückgaberecht kannst du in Ruhe entscheiden. Mit dem Code WELCOME10 erhältst du bei deiner ersten Bestellung einen Rabatt.</p>
<p><strong>🇨🇭 Schweizer Shop · TWINT & Klarna · Gratis-Versand ab CHF 50 · 30 Tage Rückgaberecht</strong></p>
<h2>Jetzt Anime Figuren & Funko Pop entdecken</h2>
<p>Stöbere durch die aktuelle Auswahl und finde deine nächste Figur. Das Sortiment wird laufend ergänzt, ein Blick lohnt sich also regelmässig.</p>
<p><a href="/collections/anime"><strong>➡️ Zur Anime & Manga Kollektion</strong></a></p>` },

 { handle:'wohnen-deko-home-accessoires-schweiz', title:'Wohnen & Deko – Home-Accessoires',
   tt:'Wohnen & Deko online kaufen | Home-Accessoires Schweiz',
   dt:'Wohnen & Deko für dein Zuhause: Vasen, Wandkunst, Aroma-Diffuser & mehr. Gratis Lieferung ab CHF 50, Zahlung mit TWINT/Klarna, 30 Tage Rückgabe.',
   body:`<h2>Wohnen & Deko für dein Zuhause</h2>
<p>Ein schönes Zuhause beginnt bei den Details. In unserer Kategorie <strong>Wohnen & Deko</strong> findest du Home-Accessoires, die Wohnzimmer, Schlafzimmer, Küche und Eingangsbereich wohnlicher machen – vom Deko-Objekt bis zum praktischen Alltagshelfer. Ob du eine leere Ecke füllen, einen Raum neu gestalten oder einfach etwas Frisches ausprobieren möchtest: Hier stöberst du in Ruhe durch eine grosse, laufend erweiterte Auswahl.</p>
<h2>Vasen, Wandkunst, Beleuchtung & mehr</h2>
<p>Unser Sortiment reicht von <strong>Vasen</strong> und Wandbildern über stimmungsvolle Beleuchtung und Aroma-Diffuser bis zu Aufbewahrung, Kissen und kleinen Deko-Highlights. So kombinierst du unterschiedliche Stile – von schlicht und modern bis warm und gemütlich – ganz nach deinem Geschmack. Viele Artikel eignen sich auch als Geschenk für Einzug, Geburtstag oder als kleine Aufmerksamkeit zwischendurch.</p>
<h2>Warum bei LuxeStyle bestellen</h2>
<p>Wir liefern in die ganze Schweiz und legen Wert auf eine ehrliche, unkomplizierte Bestellung. Preise und Lieferzeiten geben wir so an, wie sie tatsächlich sind – ohne künstlichen Druck.</p>
<p><strong>🇨🇭 Versand in die ganze Schweiz · Bezahlen mit TWINT & Klarna · Gratis Lieferung ab CHF 50 · 30 Tage Rückgabe</strong></p>
<h2>Jetzt Home-Accessoires entdecken</h2>
<p>Bereit, dein Zuhause neu einzurichten? Entdecke die komplette Auswahl in unserer Kategorie <a href="/collections/wohnen-dekoration"><strong>Wohnen & Dekoration</strong></a> und finde die passenden Deko-Ideen für jeden Raum. Neue Produkte kommen regelmässig dazu – ein Blick lohnt sich immer wieder.</p>` },
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
