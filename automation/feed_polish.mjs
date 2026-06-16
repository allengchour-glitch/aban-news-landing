#!/usr/bin/env node
/**
 * feed_polish.mjs — KATALOG-WEITE, AUTONOME Feed-/Kategorie-Politur (ganzer Shop).
 *
 * Zweck (User 2026-06-16 „polish när ganzi produkt u ds söt scho i richtige kategorie si …
 * mach ds ganze e meisterwärk aber aues outonom"): JEDES Produkt im Shop bekommt
 *   1. die RICHTIGE Shopify-Standard-Produktkategorie (Google-Produktkategorie wird daraus
 *      automatisch abgeleitet) — per Keyword-Mapping aus productType + Titel,
 *   2. Google-Pflichtfelder als mm-google-shopping-Metafelder:
 *        condition = new        (für ALLE Produkte — universell)
 *        gender    = male/female (nur Mode/Schmuck/Taschen, wenn im Text erkennbar)
 *        age_group = adult/kids/infant (nur Mode/Schmuck/Taschen)
 *
 * Damit werden Google-Free-Listings + Shopping-Ablehnungen („fehlende Kategorie/condition")
 * katalogweit geschlossen — vollautonom, ohne 14k Produkte von Hand anzufassen.
 *
 * EIGENSCHAFTEN
 *   - Idempotent: Produkte mit bereits gesetztem condition-Metafeld werden übersprungen
 *     (ausser die Kategorie fehlt noch → wird nachgezogen). Resümierbar: einfach neu starten.
 *   - Rate-Limit-fest: THROTTLED → exponentielles Backoff; kleine Pause zwischen Writes.
 *   - MAX (env) begrenzt Produkte pro Lauf (0 = alle). DRY=1 = nur Report, keine Writes.
 *
 * ENV (transient, NIE committen — als Secrets/PC-Env nutzen):
 *   SHOPIFY_SHOP=au3j0y-hq.myshopify.com
 *   SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET   (Client-Credentials-Grant, empfohlen 2026)
 *   ODER SHOPIFY_TOKEN  (direkter Admin-API-Token)
 *   DRY=1   MAX=500   DELAY=250(ms)
 *
 * Lauf:  node automation/feed_polish.mjs            (live, ganzer Katalog)
 *        DRY=1 node automation/feed_polish.mjs      (Report)
 *        MAX=300 node automation/feed_polish.mjs    (300 Produkte, dann nächster Lauf macht weiter)
 */
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com';
const CID = process.env.SHOPIFY_CLIENT_ID, SEC = process.env.SHOPIFY_CLIENT_SECRET;
const DRY = process.env.DRY === '1';
const MAX = parseInt(process.env.MAX || '0', 10);      // 0 = alle
const DELAY = parseInt(process.env.DELAY || '250', 10);
const API = '2025-01';
const T = p => 'gid://shopify/TaxonomyCategory/' + p;

// ── Kategorie-GIDs (Shopify-Standard-Taxonomie; verifiziert via taxonomy-Query) ──
const G = {
  NECK: T('aa-6-8'), EARR: T('aa-6-6'), RING: T('aa-6-9'), BRAC: T('aa-6-3'),
  ANKL: T('aa-6-1'), JEWE: T('aa-6'), WATCH: T('aa-6-11'),
  SUNG: T('aa-2-27'), EYEW: T('aa-2'), HAT: T('aa-2-17'), ACC: T('aa-2'),
  DRESS: T('aa-1-4'), APPAREL: T('aa-1'), SHOES: T('aa-8'),
  HANDBAG: T('aa-5-4'), BAGACC: T('aa-5'), LUGG: T('lb'),
  FRAG: T('hb-3-2-8'), BEAUTY: T('hb-3-2-9'), HEALTH: T('hb'),
  TOYS: T('tg'), PET: T('ap'), BABY: T('bt'), SPORT: T('sg'),
  ELEC: T('el'), HOME: T('hg'), FURN: T('fr'), OFFICE: T('os'), KITCHEN: T('hg'),
  AE: T('ae'), HW: T('ha'), FEIER: T('rc'), AUTO: T('vp'),
};
// Kategorien, die als „Mode" gelten → gender/age_group setzen
const FASHION = new Set([G.NECK,G.EARR,G.RING,G.BRAC,G.ANKL,G.JEWE,G.WATCH,
  G.SUNG,G.EYEW,G.HAT,G.ACC,G.DRESS,G.APPAREL,G.SHOES,G.HANDBAG,G.BAGACC]);

// ── Keyword-Regeln (REIHENFOLGE = Priorität, erster Treffer gewinnt) ──
const RULES = [
  // Elektronik zuerst (smartwatch darf nicht als Uhr/Schmuck landen)
  [/smartwatch|smart.?home|kopfhörer|earbud|ohrhörer|\blautsprecher|\bspeaker\b|powerbank|ladegerät|ladekabel|bluetooth|webcam|drohne|\bdrone\b|tastatur|\bmaus\b|\bmonitor\b|projektor|beamer|konsole|festplatte|\bssd\b|\brouter\b|netzteil|mikrofon|action.?cam|überwachungskamera|\btablet\b|handyhülle|handy.?halter|kabellos.*lade|wlan|\bhdmi\b|kabellose? lade/, G.ELEC],
  [/sonnenbrill/, G.SUNG],
  [/fusskett|fußkett|fussket|fußket|fußkettchen/, G.ANKL],
  [/ohrring|ohrhäng|ohrhang|creole|kreole|ohrstecker|ohrschmuck/, G.EARR],
  [/halskett|\bkette\b|ketten|collier|choker|anhänger|medaillon|brillenkette/, G.NECK],
  [/armbanduhr|\buhr\b|\buhren\b|\bwatch\b|wanduhr/, G.WATCH],
  [/armband|armbänder|armreif|\bbangle\b|armkett|\bcharm/, G.BRAC],
  [/\bring\b|\bringe\b|siegelring|verlobungsring|ehering/, G.RING],
  [/brosche|anstecknadel/, G.JEWE],
  [/\bbrille|brillen|lesebrille|blaulichtbrille/, G.EYEW],
  [/\bcap\b|\bcaps\b|mütze|beanie|\bhut\b|\bhüte\b|kappe|stirnband|schirmmütze|baseballcap|bucket.?hat/, G.HAT],
  [/handschuh|\bschal\b|schals|halstuch|krawatte|\bfliege\b|gürtel|guertel|haarreif|haarspange/, G.ACC],
  [/\bkleid\b|kleider|abendkleid|sommerkleid|maxikleid|cocktailkleid|etuikleid/, G.DRESS],
  [/bluse|\btop\b|\btops\b|shirt|t-shirt|tshirt|oberteil|pullover|\bpulli\b|cardigan|sweatshirt|hoodie|strickjacke|tunika|longsleeve/, G.APPAREL],
  [/\bhose\b|hosen|jeans|leggings|shorts|\brock\b|röcke|jogginghose|chino|culotte/, G.APPAREL],
  [/jacke|mantel|blazer|lederjacke|fleece|\bparka\b|\bweste\b|anorak|steppjacke|daunenjacke/, G.APPAREL],
  [/bikini|bademode|badeanzug|badehose|dessous|unterwäsche|negligee|bademantel|nachthemd|pyjama|socken|strümpfe|strumpfhose|bodysuit/, G.APPAREL],
  [/jumpsuit|overall|trainingsanzug|jogginganzug|jumpsuits/, G.APPAREL],
  [/schuh|sandale|sandalett|sneaker|ballerina|stiefel|\bboots\b|pumps|loafer|espadrille|hausschuh|flip.?flop|stiefelette/, G.SHOES],
  [/handtasche|umhängetasche|umhaengetasche|clutch|schultertasche|shopper|\btote\b|crossbody/, G.HANDBAG],
  [/geldbörse|geldbeutel|portemonnaie|portmonee|\bwallet\b|kartenetui|kartenhalter/, G.BAGACC],
  [/rucksack|\bkoffer\b|trolley|reisetasche|weekender|gepäck|kulturbeutel|laptoptasche/, G.LUGG],
  [/\btasche\b|taschen|\bbeutel\b/, G.HANDBAG],
  [/parfum|parfüm|\bduft\b|düfte|eau de|cologne|aftershave|eau-de/, G.FRAG],
  [/gua.?sha|jade.?roll|gesichtsroller|massageroller|glätteisen|haartrockner|\bföhn\b|\bfön\b|lockenstab|rasierer|epilier|haarbürste|haarschneider|\btrimmer\b|maniküre|pediküre|fusspflege|zahnbürste|wasserzahn|gesichtsbürste/, G.BEAUTY],
  [/creme|crème|serum|\böl\b|gesichtsöl|lotion|gesichtsmaske|\bmaske\b|shampoo|conditioner|spülung|deodorant|\bdeo\b|\bseife\b|kosmetik|lippenstift|lipgloss|mascara|wimpern|nagellack|\bnagel|makeup|make-up|foundation|concealer|\brouge\b|lidschatten|bodylotion|handcreme|peeling|gesichtswasser/, G.BEAUTY],
  [/vitamin|supplement|nahrungsergänz|kollagen|protein|blutdruck|fieberthermometer|massagepistole|massagegerät|akupressur|heizkissen|kompressionsstrumpf|\bbandage\b/, G.HEALTH],
  [/spielzeug|\bpuzzle\b|plüsch|\bplush\b|baustein|baukasten|brettspiel|\bpuppe|spielfigur|kuscheltier|\bknete\b|malset|steckspiel|holzspielzeug|kartenspiel|spielfiguren|kostüm|verkleidung/, G.TOYS],
  [/\bhund|\bkatze|katzen|aquarium|haustier|\bfisch|vogelkäfig|\bnapf\b|hundeleine|hundebett|katzenklo|kratzbaum|terrarium|nagetier|meerschwein|hundespielzeug|katzenspielzeug/, G.PET],
  [/\bbaby\b|\bbabys\b|kinderwagen|\bwindel|strampler|lätzchen|schnuller|babyflasche|wickel|krabbeldecke|babyphone|laufgitter|kleinkind/, G.BABY],
  [/\byoga\b|fitness|\bhantel|kurzhantel|widerstandsband|foam.?roll|boxhandschuh|boxsack|springseil|liegestütz|klimmzug|laufband|heimtrainer|crossfit|pilates|gymnastikball|sportmatte/, G.SPORT],
  [/fahrrad|\bvelo\b|\bbike\b|radsport|fahrradhelm/, G.SPORT],
  [/camping|\bzelt\b|schlafsack|isomatte|\bwandern\b|\bwander|trekking|outdoor|\bangel|angeln|stirnlampe|campingstuhl|kühlbox|thermosflasche|gaskocher|hängematte/, G.SPORT],
  [/\bski\b|snowboard|schlittschuh|\bschlitten\b|skihelm/, G.SPORT],
  [/lampe|leuchte|\blicht\b|laterne|\bkerze|duftkerze|teelicht|lichterkette|nachtlicht|tischlampe|stehlampe|wandleuchte|deckenleuchte/, G.HOME],
  [/möbel|\bregal\b|\bstuhl\b|stühle|\btisch\b|schrank|kommode|sideboard|\bhocker\b|\bsofa\b|sessel|nachttisch|schreibtisch|kleiderständer|garderobe|bettgestell|matratze/, G.FURN],
  [/küche|geschirr|besteck|\bglas\b|gläser|\btasse|\bbecher|\btopf\b|\bpfanne|kochtopf|\bmesser\b|messerset|schneidebrett|backform|backblech|\bmixer\b|entsafter|kaffee|french.?press|wasserkocher|toaster|gewürz|vorratsdose|frischhalte|lunchbox|trinkflasche|brotkasten|dutch.?oven|eismaschine/, G.KITCHEN],
  [/kissen|\bdecke\b|teppich|vorhang|gardine|\bvase\b|\bdeko\b|wandbild|bilderrahmen|blumentopf|übertopf|\bspiegel\b|wäschekorb|aufbewahrung|organizer|\bplaid\b|\bthrow\b|bettwäsche|bettlaken|kopfkissen|bettdecke|handtuch|badematte|fussmatte|fußmatte/, G.HOME],
  [/garten|pflanze|blumen|gartenwerkzeug|bewässerung|gartenmöbel|gartendeko|gartenschlauch|\brasen|\bgrill\b|\bbbq\b|sonnenschirm|pavillon|hochbeet|\bsamen\b|saatgut/, G.HOME],
  [/\bbad\b|badezimmer|duschkopf|seifenspender|zahnputzbecher|\bwc-|badaccessoire|bidet/, G.HOME],
  [/stift|kugelschreiber|\bfüller\b|notizbuch|notizblock|\bjournal\b|kalender|\bplaner\b|\bordner\b|briefpapier|umschlag|brieföffner|\bstempel\b|\blocher\b|\btacker\b|büro|schreibtischunterlage/, G.OFFICE],
  // — Erweiterung (exotische Typen, 2026-06-16) —
  [/gaming|headset|mauspad|mousepad|ringlicht|ring.?light|greenscreen|green.?screen|stream.?deck|capture.?card|audio.?interface|\bmikrofon|webcam|power.?bank|powerbank|\bakku\b|\bbattery\b|\bcharger\b|wearable|fotodrucker|sofortbild|\bdrucker\b|capture|hdmi|ladekabel|\busb\b/, G.ELEC],
  [/diffuser|aroma|aromatherapie|ätherisch|fussbad|fußbad|wellness|\bmassage|wärmedecke|heizdecke|haltungs.?korrektor|maniküre|gesichtspflege|hautpflege|nacken|infrarot/, G.HEALTH],
  [/balance.?board|resistance|widerstandsband|stretch.?strap|hand.?grip|handgrip|massage.?ball|\bsurvival\b|\bpool\b|planschbecken|schwimm|klimmzug|bauch.?trainer/, G.SPORT],
  [/silvester|halloween|weihnacht|christmas|advent|\boster|karneval|fasnacht|deko.?saison|girlande|luftballon|party.?deko/, G.FEIER],
  [/diy.?werkzeug|\bwerkzeug|bohrer|schraub|\bsäge\b|\bzange\b|heimwerk|akkuschrauber|schleif/, G.HW],
  [/sattelbezug|sitzbezug|nummernschild|kennzeichen|auto.?zubehör|\bkfz\b|fahrzeug/, G.AUTO],
  [/sticker|aufkleber|bastel|basteln|\bhobby\b|scrapbook|sammelkarte|diamond.?painting|stickerei|wandtattoo/, G.AE],
  [/fotoalbum|foto.?banner|foto.?karten|foto.?magnete|foto.?sticker|erinnerungsbox|babybuch|gästebuch|sternenkarte|fotorahmen/, G.AE],
  [/poster|wandkunst|wanddeko|wandbild|leinwand|geschenkverpackung|geschenkpapier|geschenkbox|geschenk.?bundle|geschenkbundle/, G.HOME],
  [/küche|kitchen|backzubehör|backform|backblech|milchaufschäumer|haushalt|household|geschirr|besteck|vorrats|trinkflasche|brotkasten/, G.KITCHEN],
  [/\bkarten\b|schreibmappe|notiz|sammelmappe/, G.OFFICE],
  // — Erweiterung Runde 2 (Rest-Cluster) —
  [/skibrille|ski.?goggle|schwimmbrille|tauchbrille|tauch/, G.SPORT],
  [/tennis|badminton|calisthenics|stoppuhr|strandzubehör|\bstrand\b|frisbee|tischtennis|golf/, G.SPORT],
  [/notebook.?ständer|laptop.?ständer|stehpult|monitor.?ständer|tablet.?ständer|stehpult.?aufsatz/, G.OFFICE],
  [/reise.?elektronik|lifestyle.?tech|tech.?mystery|reise.?adapter|\bgadget|mini.?drucker/, G.ELEC],
  [/fineliner|aquarell|siegelstempel|kalligraf|buntstift|marker.?set|filzstift|pinsel|farbset/, G.AE],
  [/self.?care|\bsauna\b|bürsten.?set|gesichtsbürste|körperbürste|peeling|sleep|schlafmaske|einschlaf/, G.HEALTH],
  [/glaswaren|thermosbecher|thermobecher|trinkglas|weinglas|karaffe|cocktail|gläser/, G.KITCHEN],
  [/\bmagnet\b|kühlschrankmagnet|magnettafel/, G.HOME],
];
// productType-Fallback (exakt), falls kein Keyword griff
const TYPE_FALLBACK = {
  'Beauty':G.BEAUTY,'Beauty & Pflege':G.BEAUTY,'Beauty Tools':G.BEAUTY,'Beauty-Tool':G.BEAUTY,'Beauty & Hair':G.BEAUTY,
  'Parfum':G.FRAG,'Schmuck':G.JEWE,'Damen-Schmuck':G.JEWE,'Anhänger':G.NECK,'Armband':G.BRAC,'Armbänder':G.BRAC,
  'Brillen':G.EYEW,'Elektronik':G.ELEC,'Gadget':G.ELEC,'Audio':G.ELEC,'Audio Tech':G.ELEC,'Elektronik & Gadgets':G.ELEC,
  'Garten':G.HOME,'Deko':G.HOME,'Heim & Garten':G.HOME,'Bad & Wellness':G.HOME,'Aufbewahrung':G.HOME,'Beleuchtung':G.HOME,
  'Spielzeug':G.TOYS,'Fitness':G.SPORT,'Camping':G.SPORT,'Baby':G.BABY,'Baby & Kinder':G.BABY,'Möbel':G.FURN,
  'Damen-Mode':G.APPAREL,'Damenmode':G.APPAREL,'Bekleidung':G.APPAREL,'Bademode':G.APPAREL,'Accessoire':G.ACC,'Accessoires':G.ACC,
  'Home':G.HOME,'Kitchen':G.KITCHEN,'Haushalt':G.HOME,'Wohnen':G.HOME,'Gesundheit':G.HEALTH,'Wellness':G.HEALTH,
  'Auto':G.AUTO,'Auto & Lifestyle':G.AUTO,'Auto-Zubehör':G.AUTO,'Tech-Lifestyle':G.ELEC,'Mobile Tech':G.ELEC,'Wearable Tech':G.ELEC,
  'Pool':G.SPORT,'Diffuser':G.HEALTH,'Sticker':G.AE,'Poster':G.HOME,'Wandkunst':G.HOME,'Wanddeko':G.HOME,'Hobby':G.AE,
  'Gaming-Zubehör':G.ELEC,'Gaming-Beleuchtung':G.ELEC,'Beauty Mystery Box':G.BEAUTY,'Beauty Tools':G.BEAUTY,
};

function categorize(hay, ptype) {
  for (const [re, gid] of RULES) if (re.test(hay)) return gid;
  if (TYPE_FALLBACK[ptype]) return TYPE_FALLBACK[ptype];
  return null;
}
function genderOf(hay) {
  if (/\bherren\b|\bmänner\b|\bmann\b|männlich|für ihn|herrenmode|men'?s\b/.test(hay)) return 'male';
  if (/\bdamen\b|damenmode|\bfrauen\b|weiblich|für sie\b|women'?s\b|ladies|meitschi/.test(hay)) return 'female';
  return null;
}
function ageOf(hay) {
  if (/\bbaby\b|\bbabys\b|strampler|kinderwagen|kleinkind|säugling/.test(hay)) return 'infant';
  if (/\bkinder|\bkids\b|\bjungen\b|kinderschuh|kindermode/.test(hay)) return 'kids';
  return 'adult';
}

async function shToken() {
  if (process.env.SHOPIFY_TOKEN) return process.env.SHOPIFY_TOKEN;
  if (!(SHOP && CID && SEC)) throw new Error('Keine Shopify-Creds (SHOPIFY_TOKEN ODER SHOPIFY_CLIENT_ID/SECRET).');
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({client_id:CID,client_secret:SEC,grant_type:'client_credentials'}) });
  if (!r.ok) throw new Error('Token-Grant fehlgeschlagen: ' + r.status);
  return (await r.json()).access_token;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function gql(tok, query, variables) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method:'POST',
      headers:{'X-Shopify-Access-Token':tok,'Content-Type':'application/json'},
      body:JSON.stringify({query,variables}) });
    const j = await r.json();
    const throttled = j.errors && JSON.stringify(j.errors).includes('THROTTLED');
    if (throttled || r.status === 429) { await sleep(2000 * (attempt+1)); continue; }
    if (j.errors) throw new Error(JSON.stringify(j.errors));
    return j.data;
  }
  throw new Error('THROTTLED: zu viele Versuche');
}

export { categorize, genderOf, ageOf, G, RULES, TYPE_FALLBACK };
if (process.env.FEED_TEST === '1') { /* nur Logik importieren, kein Live-Lauf */ }
else await (async () => {
  const tok = await shToken();
  console.log(`feed_polish ${DRY?'[DRY] ':''}— Shop ${SHOP}, MAX=${MAX||'∞'}`);
  let cursor = null, seen = 0, catSet = 0, mfSet = 0, skipped = 0, noMatch = 0;
  outer:
  do {
    const d = await gql(tok, `query($c:String){ products(first:60, after:$c){
        pageInfo{hasNextPage endCursor}
        nodes{ id title productType category{id}
          cond:metafield(namespace:"mm-google-shopping", key:"condition"){id} } } }`, { c: cursor });
    for (const p of d.products.nodes) {
      seen++;
      const hay = ((p.productType||'') + ' ' + (p.title||'')).toLowerCase();
      const want = categorize(hay, p.productType);
      const hasCond = !!p.cond;
      const needCat = want && (!p.category || p.category.id !== want);
      if (hasCond && !needCat) { skipped++; continue; }    // schon poliert
      if (!want && hasCond) { skipped++; continue; }
      if (!want) noMatch++;

      // 1) Kategorie
      if (needCat) {
        if (!DRY) { await gql(tok, `mutation($id:ID!,$c:ID!){ productUpdate(input:{id:$id,category:$c}){ userErrors{message} } }`, { id:p.id, c:want }); await sleep(DELAY); }
        catSet++;
      }
      // 2) Google-Metafelder (condition für alle; gender/age nur Mode)
      if (!hasCond) {
        const mfs = [{ ownerId:p.id, namespace:'mm-google-shopping', key:'condition', type:'single_line_text_field', value:'new' }];
        if (want && FASHION.has(want)) {
          const g = genderOf(hay); if (g) mfs.push({ ownerId:p.id, namespace:'mm-google-shopping', key:'gender', type:'single_line_text_field', value:g });
          mfs.push({ ownerId:p.id, namespace:'mm-google-shopping', key:'age_group', type:'single_line_text_field', value:ageOf(hay) });
        }
        if (!DRY) { await gql(tok, `mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ userErrors{message} } }`, { m:mfs }); await sleep(DELAY); }
        mfSet++;
      }
      if (MAX && (catSet + mfSet) >= MAX) { console.log('MAX erreicht — nächster Lauf macht weiter.'); break outer; }
    }
    cursor = d.products.pageInfo.hasNextPage ? d.products.pageInfo.endCursor : null;
    if (seen % 600 === 0) console.log(`… ${seen} gesehen · ${catSet} Kat · ${mfSet} Felder · ${skipped} schon ok`);
  } while (cursor);

  console.log(`\n✅ ${DRY?'[DRY] ':''}Fertig: ${seen} Produkte gesehen · Kategorie gesetzt ${catSet} · Google-Felder gesetzt ${mfSet} · übersprungen ${skipped} · ohne Mapping ${noMatch}`);
})().catch(e => { console.error('❌', e.message); process.exit(1); });
