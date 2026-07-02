#!/usr/bin/env node
/* bigbuy_brand_fill.mjs — EIN Befehl füllt den Shop mit echten BigBuy-Marken (EU-Lager).
 * Scan (Voll-Katalog, 1× laden) → Titel putzen → productSet+Media+Publish (6 Kanäle) → Ledger.
 * Dedup über dropship/bigbuy_done.txt. Nur aktive Produkte mit Bild + Preis im Cap.
 *
 * ENV: BIGBUY_API_KEY · SHOPIFY_CLIENT_ID/SECRET[/SHOP]
 *      GROUPS=parfum,uhr,tasche  (Default: alle)  ·  CAP=40 (Default-Stück/Gruppe, per CAP_<grp> überschreibbar)
 *      DRY=1 (nur scannen/zeigen, nichts anlegen)
 * Lauf: ( set -a; source /tmp/lux_env.sh; source /tmp/shopify_creds.env; set +a; GROUPS=parfum,skincare node --max-old-space-size=6144 automation/bigbuy_brand_fill.mjs )
 * ⚠️ HEAP: productsinformation.json ist ~388 MB / 313k Produkte → IMMER mit --max-old-space-size=6144 laufen,
 *          sonst OOM beim r.json()-Parse und "Katalog-Fehler" (curl liefert trotzdem 200 → nicht verwirren lassen).
 */
import fs from 'node:fs';
import { buildGalaxusDesc } from './lib/galaxus_desc.mjs';
const BB=(process.env.BIGBUY_API_KEY||'').trim();
const SHOP=(process.env.SHOPIFY_SHOP||'au3j0y-hq.myshopify.com').replace(/^https?:\/\//,'').replace(/\/.*/,'');
const CID=process.env.SHOPIFY_CLIENT_ID, CSEC=process.env.SHOPIFY_CLIENT_SECRET, API='2025-01';
const DRY=process.env.DRY==='1';
const DEFCAP=parseInt(process.env.CAP||'40',10);
const LEDGER='dropship/bigbuy_done.txt';
const PUBS=['301970915713','301971014017','302032716161','302566834561','302872297857','302994456961'].map(id=>({publicationId:`gid://shopify/Publication/${id}`}));
const chf=eur=>{const m=eur>150?1.5:eur>80?1.8:eur>40?2.2:2.6;return (Math.floor(eur*m)+0.90).toFixed(2);};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// ── Marken-Katalog: regex (Produkttyp) + brand (echte Marken) + cap/cup + Shopify-Routing ──
const B={
 parfum:/hugo boss|calvin klein|versace|dior|chanel|\bysl\b|yves saint|paco rabanne|carolina herrera|dolce.?gabbana|armani|jean paul|davidoff|montblanc|azzaro|lancome|lancôme|guess|tommy hilfiger|bvlgari|givenchy|kenzo|moschino|cacharel|nina ricci|lacoste|gucci|prada|valentino|burberry/i,
 skin:/weleda|vichy|la roche|cerave|eucerin|nivea|garnier|l'?oreal|lancome|clinique|caudalie|bioderma|neutrogena|nuxe|elizabeth arden|shiseido|estee/i,
 makeup:/rimmel|maybelline|max factor|artdeco|\bnyx\b|revlon|catrice|essence|bourjois|loreal|l'oreal|deborah|astor|mia cosmetics|paese/i,
 hair:/l'?oreal|garnier|schwarzkopf|wella|pantene|syoss|nivea|tresemme|kerastase|moroccanoil/i,
 watch:/casio|festina|lotus|citizen|swatch|tommy hilfiger|guess|michael kors|calvin klein|police|viceroy|tous|skagen|fossil|nixon|breil/i,
 bag:/michael kors|guess|calvin klein|tommy hilfiger|lacoste|desigual|pepe jeans|david jones/i,
 sun:/ray.?ban|hugo boss|guess|police|carrera|calvin klein|tommy hilfiger|vogue|arnette|persol/i,
 gadget:/innovagoods|ksix|xiaomi|nedis|denver|forever|celly|muvit|\bspc\b|hama|aukey|baseus|anker/i,
 toy:/lego|playmobil|mattel|hasbro|funko|ravensburger|\bsimba\b|clementoni|bandai|hot wheels|barbie|\bnerf\b|play.?doh|fisher.?price|disney|marvel|paw patrol|lansay|educa|famosa|pinypon|bizak|\bjuguetes\b|cefa/i,
 home:/cecotec|taurus|jata|orbegozo|princess|russell hobbs|tefal|innovagoods|bra\b|masterpro|beper|create|kitchenware|delonghi|de'?longhi|rowenta|moulinex|braun|philips|severin|bomann|melitta|\bwmf\b|kenwood|krups|\bbosch\b|electrolux|\baeg\b|smeg|ariete|\bufesa\b|\bsogo\b|nevir|mellerware/i,
 tool:/black.?decker|michelin|bellota|fartools|bosch|makita|einhell|stanley|wolfcraft|mannesmann|bahco|dewalt|metabo|\bskil\b|ryobi|gedore|\bwera\b|knipex|wiha|tacklife|worx|\bks tools\b|facom|\bpg\b|imex|silverline|gsc|vorel|toptul/i,
 papeterie:/bic|pilot|faber.?castell|\bmilan\b|staedtler|stabilo|pelikan|maped|pentel|edding|\buni.?ball\b|tombow|paper.?mate|sharpie|post.?it|oxford|\bapli\b|liderpapel|\bcanson\b|rotring|lamy/i,
 haustier:/trixie|ferplast|zolux|flamingo|kerbl|\bnobby\b|savic|\bkong\b|\bhunter\b|beeztees|karlie|europet|croci|\bmpets\b|\bcamon\b/i,
 garten:/gardena|nortene|altadex|\bcelaya\b|\bnatuur\b|verdemax|\bfiskars\b|\bralm\b|\boutsunny\b|\bkinzo\b|\bpalisad\b|\bbradas\b/i,
 bar:/vacu.?vin|peugeot|\bwmf\b|\bbra\b|\bibili\b|\bquid\b|\bluminarc\b|\barcoroc\b|\bbormioli\b|\briedel\b|\bvin bouquet\b|\bpulltex\b|\bbodum\b/i,
 auto:/michelin|\bbosch\b|\bosram\b|sonax|turtle wax|\bkärcher\b|karcher|bottari|\bsumex\b|\blampa\b|goodyear|simoniz|\bpingi\b|\bcartrend\b|\bmannol\b|\bpetronas\b|\bfoliatec\b/i,
 beleuchtung:/philips|\bosram\b|ledvance|innovagoods|xanlite|\bgarza\b|\bnedis\b|\btrio\b|\beglo\b|paulmann|activejet|\blutec\b|\bvelamp\b|\bfischer\b/i,
 kueche:/\bwmf\b|masterpro|\bquid\b|\bibili\b|san ignacio|bergner|\barcos\b|\bmonix\b|\bbra\b|tramontina|\bnirosta\b|zwilling|fissler|\btefal\b|\bpyrex\b|\bkitchenaid\b|\bvictorinox\b|\btaurus\b|\bbergner\b|\brösle\b|\bwesco\b/i,
 schmuck:/lotus silver|\bviceroy\b|morellato|\bradiant\b|\btous\b|\bcluse\b|rosefield|\bmarea\b|\bracimo\b|calvin klein|michael kors|\bguess\b|\bpolice\b|swarovski|\bfossil\b|daniel wellington|\bpandora\b/i,
 fitness:/\badidas\b|\bnike\b|\bpuma\b|reebok|\bsoftee\b|atipick|\bavento\b|\bkelme\b|\bspokey\b|body sculpture|\bsveltus\b|\bpure2improve\b|\btunturi\b|\bwilson\b|\bhead\b|\bmolten\b|\bumbro\b/i,
 camping:/bestway|\bintex\b|\baktive\b|regatta|coleman|campingaz|\bmilestone\b|\bhosa\b|\baktive\b|\bjocca\b|\bderyan\b|\bhi-?gear\b|trespass|\bezcool\b|\bcao\b|\bmoncamp\b/i,
 baby:/chicco|\bnuk\b|suavinex|\bsaro\b|bright starts|tommee tippee|philips avent|badabulle|\bbebé?\b|\bnenuco\b|\bmustela\b|\bhaba\b|\bkinderkraft\b|\bolmitos\b|\bminiland\b|\binnovababy\b/i,
 grooming:/\bbraun\b|\bphilips\b|remington|\bwahl\b|panasonic|babyliss|\browenta\b|\bcarrera\b|hatteker|\bcecotec\b|\btaurus\b|\bjata\b|kensington/i,
 reise:/gabol|american tourister|roncato|delsey|samsonite|\bmovom\b|national geographic|\btotto\b|\bantler\b|\bskpat\b|\bitaca\b/i,
 zahn:/oral.?b|sonicare|\bphilips\b|cecotec|\bwaterpik\b|\bforeo\b|colgate|\bbraun\b|panasonic|\bcuraprox\b|\bfairywill\b/i,
 wellness:/beurer|medisana|\bhomedics\b|\bnaipo\b|\brenpho\b|\bsalter\b|cecotec|\btaurus\b|\bpangao\b|\betekcity\b|\borbegozo\b/i,
 deko:/\bwenko\b|\bbalvi\b|\bversa\b|\bsecret de gourmet\b|\batmosphera\b|\bhome deco\b|\bpresent time\b|\bumbra\b|\bqualy\b|\brivadossi\b|yankee candle|\bwoodwick\b|\bpartylite\b|\bcolombina\b|excelsa/i,
 refurb:/medion|dangbei|\bhp\b|lenovo|\basus\b|\bacer\b|apple|macbook|\bipad\b|samsung|xiaomi|\bmsi\b|\blg\b|\bdell\b|microsoft|surface|epson|\bbenq\b|toshiba|huawei|\bhonor\b|\bnokia\b|\bviewsonic\b|gigabyte/i,
};
const GROUPS={
 haushalt:   {re:/küche|kaffee|mixer|standmixer|pfanne|topf|wasserkocher|toaster|fritteuse|airfryer|staubsauger|bügeleisen|waffeleisen|kontaktgrill|zerkleinerer|entsafter|milchaufschäumer|reiskocher|heizung|ventilator|luftreiniger|haushalt/i,
              ban:/ersatz|filter für|zubehör|beutel|hülle/i,
              brand:B.home, cap:150, type:'Haushalt & Küche', tags:['haushalt','kueche','marke','dropship'], blurb:'Marken-Haushaltsgerät'},
 werkzeug:   {re:/werkzeug|bohrer|akkuschrauber|schraubendreher|säge|schleifer|zange|hammer|wasserwaage|maßband|steckschlüssel|werkzeugkoffer|multitool|schraubenschlüssel|bohrmaschine|winkelschleifer|akku.?bohr|stichsäge|kreissäge|kettensäge|hochdruckreiniger|kompressor|schweiss|lötkolben|heissluft|meißel|feile|spachtel|maurerkelle|cutter|messschieber|drehmoment|nietzange|schleifpapier|arbeitshandschuh|schutzbrille|gehörschutz|werkbank|schraubstock|klemme|akkuschlagschrauber|laser.?entfernungs|rührwerk|farbroller|pinsel|malerkrepp|abdeckfolie|leiter|tritthocker|taschenlampe|stirnlampe|kabeltrommel|verlängerungskabel|steckdosenleiste/i,
              ban:/ersatz|klinge für|einzeln|spielzeug|kinder|nagellack|nagel-/i,
              brand:B.tool, cap:250, type:'Werkzeug & Heimwerker', tags:['werkzeug','heimwerker','handwerker','marke','dropship'], blurb:'Marken-Werkzeug'},
 spielzeug:  {re:/spielzeug|puppe|figur|puzzle|plüsch|baustein|spielset|brettspiel|kuscheltier|actionfigur|modellauto|lernspiel|steckspiel|kartenspiel|holzspielzeug|bauklötze|spielfigur|sammelfigur|stofftier|rutscher|kinderspiel/i,
              ban:/erwachsene|adult|messer|munition|softair|laserpointer|batterie(?!n inkl)/i,
              brand:B.toy, cap:200, type:'Spielzeug', tags:['spielzeug','kinder','geschenk','marke','dropship'], blurb:'Marken-Spielzeug'},
 gadget:     {re:/projektor|beamer|\bled\b|\brgb\b|sternenhimmel|galaxy|bluetooth|lautsprecher|kopfhörer|earbuds|ohrhörer|smartwatch|fitness.?tracker|drohne|roboter|sauger|diffusor|luftbefeuchter|ringlicht|selfie|powerbank|wireless|kabellos|ladegerät|ventilator|nachtlicht|projektion|smart.?home|karaoke|mini.?drucker/i,
              ban:/hülle|case|schutzglas|panzerglas|ersatz|kabel(?!los)|adapter|halterung|ständer|stativ|mopp|filter|zubehör|schutzfolie|tasche für|beutel/i,
              brand:B.gadget, cap:220, type:'Gadgets', tags:['gadgets','tech','trend','marke','dropship'], blurb:'cooles Tech-Gadget'},
 parfum:     {re:/eau de toilette|eau de parfum|\bedt\b|\bedp\b|parfum|cologne/i, brand:B.parfum, cap:160, type:'Parfum & Düfte', tags:['parfum','duft','marke','bigbuy-beauty','dropship'], blurb:'Original-Markenparfüm'},
 skincare:   {re:/creme|cream|serum|feuchtigkeit|gesichts|moistur|reinigung|cleanser|pflege|lotion|maske|peeling|sonnenschutz/i, brand:B.skin, cap:90, type:'Hautpflege', tags:['beauty','skincare','hautpflege','marke','bigbuy-beauty','dropship'], blurb:'Marken-Hautpflege'},
 makeup:     {re:/lippenstift|lipstick|lidschatten|eyeshadow|foundation|rouge|blush|highlighter|eyeliner|kajal|concealer|primer|mascara|wimperntusche|puder|powder/i, brand:B.makeup, cap:60, type:'Make-up', tags:['beauty','makeup','marke','bigbuy-beauty','dropship'], blurb:'Original-Marken-Make-up'},
 haircare:   {re:/shampoo|spülung|conditioner|haarmaske|haarpflege|haaröl|haarspray|styling|haarfarbe|färbung/i, brand:B.hair, cap:50, type:'Haarpflege', tags:['beauty','haarpflege','marke','bigbuy-beauty','dropship'], blurb:'Marken-Haarpflege'},
 uhr:        {re:/\buhr\b|armbanduhr|herrenuhr|damenuhr|watch/i, brand:B.watch, cap:260, type:'Uhren', tags:['uhren','marke','accessoire','dropship'], blurb:'Marken-Armbanduhr'},
 tasche:     {re:/tasche|handtasche|umhängetasche|rucksack|geldbörse|portemonnaie|clutch|shopper/i, brand:B.bag, cap:200, type:'Taschen', tags:['taschen','damen','marke','accessoire','dropship'], blurb:'Marken-Tasche'},
 sonnenbrille:{re:/sonnenbrille|sunglasses/i, brand:B.sun, cap:160, type:'Sonnenbrillen', tags:['sonnenbrillen','eyewear','marke','accessoire','dropship'], blurb:'Marken-Sonnenbrille'},
 papeterie:  {re:/kugelschreiber|kuli|füller|füllfeder|filzstift|fineliner|marker|textmarker|bleistift|buntstift|radiergummi|notizbuch|notizblock|heft|ordner|mappe|locher|hefter|tacker|schere|klebe|tinte|patrone|malen|zeichnen|schulbedarf|büro|schreibwaren|federmäppchen|etui/i,
              ban:/spielzeug|kinder-schmink|nagel|toner|drucker/i,
              brand:B.papeterie, cap:120, type:'Schreibwaren & Büro', tags:['papeterie','buero','schule','marke','bigbuy','dropship'], blurb:'Marken-Schreibwaren'},
 haustier:   {re:/hund|katze|hunde|katzen|napf|leine|halsband|kratzbaum|transportbox|katzentoilette|hundebett|katzenbett|spielzeug für|kausnack|futterautomat|aquarium|nager|kaninchen|vogel|haustier|tier/i,
              ban:/mensch|kinder-|baby(?!.?tier)|plüsch(?!tier für)|deko/i,
              brand:B.haustier, cap:150, type:'Haustierbedarf', tags:['haustier','hund','katze','marke','bigbuy','dropship'], blurb:'Marken-Haustierbedarf'},
 garten:     {re:/garten|balkon|terrasse|gartenschlauch|schlauch|gießkanne|gartenschere|rasen|pflanz|blumentopf|übertopf|sprüher|gartenhandschuh|spaten|harke|rechen|schubkarre|sonnenschirm|hängematte|gartenmöbel|grill|pflanzkübel|bewässerung|unkraut|hecke/i,
              ban:/kunstblume|deko-|spielzeug|kinder/i,
              brand:B.garten, cap:120, type:'Garten & Balkon', tags:['garten','balkon','outdoor','marke','bigbuy','dropship'], blurb:'Marken-Gartenprodukt'},
 bar:        {re:/weinglas|weingläser|sektglas|champagner|cocktail|shaker|dekanter|karaffe|korkenzieher|flaschenverschluss|weinkühler|barzubehör|gläser.?set|trinkglas|whiskyglas|bierglas|untersetzer|eiswürfel|barmaß|zapf/i,
              ban:/kinder|plastik.?becher|einweg/i,
              brand:B.bar, cap:100, type:'Bar & Wein', tags:['bar','wein','kueche','marke','bigbuy','dropship'], blurb:'Marken-Barzubehör'},
 auto:       {re:/auto|\bkfz\b|fahrzeug|scheibenwischer|sitzbezug|sitzauflage|kofferraum|autopflege|autowäsche|autoshampoo|felgen|reifen|starthilfe|abdeckplane|autolampe|standlicht|nebelscheinwerfer|innenraum|armaturen|luftauffrischer|lufterfrischer|autozubehör|dachträger|anhänger|scheibenreiniger|frostschutz|wagenheber|warndreieck|verbandskasten/i,
              ban:/spielzeug|kinder|modellauto|rc-|ferngesteuert|halterung für handy|handyhalterung/i,
              brand:B.auto, cap:110, type:'Auto & KFZ', tags:['auto','auto-zubehoer','kfz','marke','bigbuy','dropship'], blurb:'Marken-Autozubehör'},
 beleuchtung:{re:/lampe|leuchte|glühbirne|\bled\b|deckenleuchte|stehlampe|tischlampe|wandleuchte|leuchtmittel|birne|strahler|spot|lichterkette|nachttischlampe|schreibtischlampe|pendelleuchte|solarleuchte|taschenlampe|leuchtröhre|beleuchtung/i,
              ban:/spielzeug|kinder|projektor|auto|kfz|nagel|uv-lampe für näg/i,
              brand:B.beleuchtung, cap:110, type:'Beleuchtung & Lampen', tags:['beleuchtung','lampen','wohnen','marke','bigbuy','dropship'], blurb:'Marken-Leuchte'},
 kueche:     {re:/topf|pfanne|bratpfanne|kochtopf|kasserolle|schmortopf|messerset|küchenmesser|schneidebrett|schüssel|auflaufform|backform|siebe?\b|reibe|schneebesen|kochlöffel|pfannenwender|salatschleuder|dosen|vorratsdose|frischhalte|kaffeekanne|teekanne|mixbecher|küchenwaage|servierplatte|besteck|geschirr/i,
              ban:/spielzeug|kinder|deko-|elektr|akku|batterie/i,
              brand:B.kueche, cap:150, type:'Küche & Kochen', tags:['kueche','kochen','haushalt','marke','bigbuy','dropship'], blurb:'Marken-Küchenhelfer'},
 schmuck:    {re:/kette|halskette|armband|armreif|ohrring|ohrstecker|anhänger|\bring\b|collier|creolen|schmuckset|manschettenknöpfe|brosche|fußkette|choker/i,
              ban:/schlüssel|vorhang|gardinen|schmuckkasten|schmuckständer|uhr\b|werkzeug|kette für|fahrrad|hunde/i,
              brand:B.schmuck, cap:160, type:'Schmuck', tags:['schmuck','damen-schmuck','marke','accessoire','bigbuy','dropship'], blurb:'Marken-Schmuck'},
 fitness:    {re:/hantel|kurzhantel|kettlebell|widerstandsband|fitnessband|yogamatte|gymnastikmatte|springseil|bauchtrainer|klimmzug|laufband|heimtrainer|faszienrolle|dumbbell|expander|sportmatte|boxsack|\bfussball\b|\bfußball\b|basketball|volleyball|tennisschläger|schienbeinschützer|basketballkorb|hanteln/i,
              ban:/spielzeug|kinder|nahrungsergänz|protein|supplement|kleidung|shirt|schuhe|tanktop|trikot|jersey|shorts|hose|anzug|jacke|socken|\btop\b|cap\b|mütze|sweatshirt|leggings|deko/i,
              brand:B.fitness, cap:150, type:'Fitness & Sport', tags:['fitness','sport','marke','bigbuy','dropship'], blurb:'Marken-Sportartikel'},
 camping:    {re:/zelt|schlafsack|isomatte|luftmatratze|campingstuhl|campingtisch|kühlbox|kühltasche|campingkocher|gaskocher|feldbett|hängematte|planschbecken|pool\b|luftbett|thermoskanne|trekking|wanderstock|stirnlampe|taschenlampe|feldflasche|campinggeschirr|outdoor|picknick/i,
              ban:/spielzeug|kinder(?!pool)|deko|auto|kfz/i,
              brand:B.camping, cap:130, type:'Camping & Outdoor', tags:['camping','outdoor','bigbuy','marke','dropship'], blurb:'Marken-Campingausrüstung'},
 baby:       {re:/baby|säugling|schnuller|fläschchen|babyflasche|lätzchen|strampler|babyphone|wickel|windel|hochstuhl|laufgitter|babytrage|kinderwagen|babyschale|beißring|spucktuch|babypflege|babydecke|nuckel|milchpumpe|sterilisator/i,
              ban:/spielzeug|erwachsene|damen|herren|hund|katze/i,
              brand:B.baby, cap:120, type:'Baby & Kleinkind', tags:['baby','baby-kids','bigbuy','marke','dropship'], blurb:'Marken-Babyartikel'},
 grooming:   {re:/rasierer|rasierapparat|barttrimmer|bartschneider|haarschneider|haarschneidemaschine|langhaarschneider|trimmer|epilierer|nasenhaartrimmer|haartrockner|föhn|glätteisen|lockenstab|haarglätter|multigroomer|bodygroomer/i,
              ban:/klinge für|ersatz|scherkopf|aufsatz|zubehör|kinder/i,
              brand:B.grooming, cap:120, type:'Rasur & Haarpflege', tags:['rasur','grooming','haarstyling','beauty','bigbuy','marke','dropship'], blurb:'Marken-Rasierer/Grooming'},
 reise:      {re:/koffer|trolley|reisetasche|reisekoffer|kabinentrolley|hartschalenkoffer|weekender|reisegepäck|bordtasche|kulturbeutel|packwürfel|reiseset|handgepäck/i,
              ban:/kinder|spielzeug|deko/i,
              brand:B.reise, cap:120, type:'Koffer & Reise', tags:['reise','koffer','gepaeck','bigbuy','marke','dropship'], blurb:'Marken-Reisegepäck'},
 zahn:       {re:/zahnbürste|elektrische zahnbürste|schallzahnbürste|munddusche|zahnpflege|aufsteckbürste|zahnreinigung|zungenreiniger|zahnseide/i,
              ban:/kinder(?!.?zahn)|ersatz|nur aufsteck|manuell/i,
              brand:B.zahn, cap:80, type:'Zahnpflege', tags:['zahnpflege','beauty','koerperpflege','bigbuy','marke','dropship'], blurb:'Marken-Zahnpflege'},
 wellness:   {re:/massage|massagegerät|massagepistole|blutdruck|blutdruckmessgerät|fieberthermometer|körperwaage|personenwaage|heizkissen|heizdecke|nackenmassage|fussmassage|shiatsu|pulsoximeter|inhalator|akupressur/i,
              ban:/spielzeug|kinder|tier|auto/i,
              brand:B.wellness, cap:100, type:'Wellness & Gesundheit', tags:['wellness','gesundheit','koerperpflege','bigbuy','marke','dropship'], blurb:'Marken-Wellnessgerät'},
 deko:       {re:/kerze|duftkerze|teelicht|kerzenhalter|vase|bilderrahmen|fotorahmen|windlicht|dekofigur|wanddeko|dekoschale|übertopf|kunstblume|spiegel|wanduhr|schmuckkästchen|aufbewahrungsbox|kissen|tischläufer|laterne/i,
              ban:/kinder|spielzeug|auto|werkzeug|elektr/i,
              brand:B.deko, cap:80, type:'Deko & Wohnaccessoires', tags:['deko','wohnen','marke','bigbuy','dropship'], blurb:'Marken-Wohndeko'},
 refurb:     {re:/\blaptop\b|notebook|\btablet\b|beamer|projektor|projector|\bmonitor\b|smartphone|handy\b|spielekonsole|\bkonsole\b|smartwatch|e-reader|\bpc\b|mini-?pc|all-?in-?one|refurbished|renewed/i,
              ban:/tasche|hülle|\bcase\b|kabel|ladekabel|ständer|halterung|schutz|adapter|maus\b|tastatur|zubehör|reinigung|folie|cover|dock|hub|stift|pen\b|ersatz|halter|arm\b|wandhalter|schutzglas|panzerglas|sleeve|rucksack/i,
              brand:B.refurb, cap:700, type:'Elektronik & Computer', tags:['elektronik','pc','tech','computer','marke','bigbuy','dropship'], blurb:'Marken-Elektronik'},
};

function clean(n){return n
 .replace(/\b\d{3,}-?\d{2,}\b/g,' ').replace(/\b\d{6,}\b/g,' ')
 .replace(/\bN[ºo°]\b/gi,' ').replace(/\b(EDP|EDT)\b(?:\s+\1\b)+/gi,'$1')
 .replace(/\bMake Up\b/g,'').replace(/\s{2,}/g,' ').replace(/\s*\(\s*\)/g,'').trim().slice(0,70);}

async function bb(path){for(let i=0;i<8;i++){try{const r=await fetch('https://api.bigbuy.eu'+path,{headers:{'Authorization':`Bearer ${BB}`,'Accept':'application/json'}});
 if(r.status===429){const reset=Number(r.headers.get('x-ratelimit-reset'))||0;const wait=reset?Math.min(Math.max(reset*1000-Date.now()+400,600),4000):1200;await sleep(wait);continue;}
 if(r.status!==200)return null;return await r.json();}catch{await sleep(1000);}}return null;}
async function shToken(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const j=await r.json();if(!j.access_token)throw new Error('shopify token fail');return j.access_token;}
async function sgql(tok,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':tok},body:JSON.stringify({query:q,variables:v})});return r.json();}
const SET=`mutation($i:ProductSetInput!){productSet(synchronous:true,input:$i){product{id}userErrors{message}}}`;
const MED=`mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){mediaUserErrors{message}}}`;
const PUB=`mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`;

// ⚠️ GROUPS ist eine bash-Spezialvariable (readonly) → `GROUPS=x node …` reicht sie NICHT durch!
//    Darum GRP als Alias (immer nutzbar) ODER `env GROUPS=x node …`.
const want=(process.env.GRP||process.env.GROUPS||Object.keys(GROUPS).join(',')).split(',').map(s=>s.trim()).filter(g=>GROUPS[g]);
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.replace('bb:','').trim()).filter(Boolean):[]);

console.log('Lade BigBuy-Katalog…');
const arr=await bb('/rest/catalog/productsinformation.json?isoCode=de');
if(!arr){console.error('Katalog-Fehler');process.exit(1);}
console.log('Katalog:',arr.length,'· Gruppen:',want.join(','));

const tok=DRY?null:await shToken();
let total=0;
for(const gk of want){
 const g=GROUPS[gk]; const cap=parseInt(process.env['CAP_'+gk]||DEFCAP,10);
 const cands=arr.filter(p=>g.re.test(p.name||'')&&g.brand.test(p.name||'')&&!done.has(String(p.id))&&!/set |coffret|display|tester|\bpack\b/i.test(p.name||'')&&!(g.ban&&g.ban.test(p.name||'')));
 console.log(`\n=== ${gk}: ${cands.length} Kandidaten, Ziel ${cap} ===`);
 let got=0;
 for(const p of cands){
  if(got>=cap)break;
  const d=await bb(`/rest/catalog/product/${p.id}.json?isoCode=de`); await sleep(250);
  if(!d||!(d.active===true||d.active===1))continue;
  const eur=Number(d.wholesalePrice)||0; if(!eur||eur>g.cap)continue;
  const im=await bb(`/rest/catalog/productimages/${p.id}.json`); await sleep(250);
  const imgs=((im&&im.images)||[]).map(x=>x.url).filter(u=>/^https/.test(u)).slice(0,20); // ALLE verfügbaren Bilder
  if(!imgs.length)continue;
  const title=clean(p.name); if(title.length<5)continue;
  if(DRY){console.log(`  [DRY] CHF${chf(eur)} | ${title}`);got++;total++;continue;}
  const slug=title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48)+'-bb'+p.id;
  const desc=buildGalaxusDesc(p.description, {title, blurb:g.blurb}); // Galaxus-Stil: Intro + Specs + Trust
  const input={title,handle:slug,productType:g.type,vendor:'LuxeStyle',status:'ACTIVE',tags:g.tags,descriptionHtml:desc,
   seo:{title:(title+' | LuxeStyle CH').slice(0,70),description:(`${title} – ${g.blurb}, 100% Original bei LuxeStyle Schweiz. EU-Lager, schnelle Lieferung. Gratis-Versand ab CHF 65.`).slice(0,320)},
   productOptions:[{name:'Variante',values:[{name:'Standard'}]}],
   variants:[{optionValues:[{optionName:'Variante',name:'Standard'}],price:chf(eur),inventoryItem:{sku:'BB-'+p.id,tracked:false},inventoryPolicy:'CONTINUE'}],
   files:[{originalSource:imgs[0],contentType:'IMAGE'}]};
  const r=await sgql(tok,SET,input?{i:input}:null); const e=r.data?.productSet?.userErrors||[]; const pid=r.data?.productSet?.product?.id;
  if(e.length||!pid){console.log('  ✗',title.slice(0,30),JSON.stringify(e).slice(0,100));continue;}
  if(imgs.length>1)await sgql(tok,MED,{id:pid,m:imgs.slice(1).map(u=>({originalSource:u,mediaContentType:'IMAGE'}))});
  await sgql(tok,PUB,{id:pid,p:PUBS});
  fs.appendFileSync(LEDGER,'bb:'+p.id+'\n'); done.add(String(p.id));
  got++; total++; if(got%10===0)console.log(`  ${gk} ${got}/${cap}…`);
  await sleep(300);
 }
 console.log(`${gk}: ${got} angelegt.`);
}
console.log(`\nFERTIG: ${total} Produkte${DRY?' [DRY]':''}.`);
