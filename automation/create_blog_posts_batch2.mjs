#!/usr/bin/env node
/* LuxeStyle — create_blog_posts_batch2.mjs
 * 3 weitere SEO-Ratgeber-Blogartikel (10-Agenten-Schwarm #2, 2026-07-04), idempotent per Handle + SEO-Meta.
 * Nutzt den ersten vorhandenen Blog (News). Interne Links auf verifizierte Collections. Ehrlich, strikt CH.
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

const POSTS=[
 { handle:'ringgroesse-messen-schweizer-groessen-tabelle',
   title:'Ringgrösse messen: so findest du die richtige Grösse (Schweizer Grössen-Tabelle)',
   tt:'Ringgrösse messen: Schweizer Grössen-Tabelle & Anleitung',
   dt:'Ringgrösse einfach zu Hause messen: mit Faden oder Papierstreifen den Innenumfang in mm bestimmen. Schweizer Grössen-Tabelle, Tipps & Anleitung von LuxeStyle.',
   body:`<p>Du hast den perfekten Ring gefunden – aber welche Grösse passt? Die gute Nachricht: Deine Ringgrösse kannst du in zwei Minuten selbst zu Hause bestimmen, ganz ohne Spezialwerkzeug. In diesem Ratgeber zeigen wir dir die einfachste und zuverlässigste Methode und erklären, was die Schweizer Ringgrössen eigentlich bedeuten.</p>
<h2>Was bedeutet die Schweizer Ringgrösse?</h2>
<p>In der Schweiz und in weiten Teilen Europas entspricht die Ringgrösse dem <strong>Innenumfang des Rings in Millimetern</strong>. Ein Ring der Grösse 54 hat also einen inneren Umfang von 54 mm. Das ist praktisch, weil du dadurch nur eine einzige Zahl brauchst – den Umfang deines Fingers – und schon kennst du deine Grösse. Es gibt keine komplizierte Umrechnung: gemessener Innenumfang in mm = deine Ringgrösse.</p>
<h2>Ringgrösse messen: die Faden- oder Papierstreifen-Methode</h2>
<p>Für diese Methode brauchst du nur einen dünnen Faden oder einen schmalen Papierstreifen, einen Stift und ein Lineal.</p>
<h3>Schritt für Schritt</h3>
<ol>
  <li>Lege den Faden oder Papierstreifen einmal um die Basis des Fingers, an dem du den Ring tragen möchtest.</li>
  <li>Der Streifen sollte satt anliegen, aber nicht einschneiden – er muss später über das Fingergelenk passen.</li>
  <li>Markiere mit dem Stift die Stelle, an der sich die Enden überlappen.</li>
  <li>Miss die Länge vom Anfang bis zur Markierung mit dem Lineal in Millimetern.</li>
  <li>Dieser Wert ist dein Innenumfang – und damit deine Ringgrösse. Beispiel: 54 mm = Grösse 54.</li>
</ol>
<p>Miss am besten zwei- oder dreimal und nimm den Durchschnitt, damit das Ergebnis stimmt.</p>
<h2>Schon einen passenden Ring? So misst du ihn aus</h2>
<p>Wenn du bereits einen Ring hast, der gut sitzt, kannst du seinen <strong>Innendurchmesser</strong> messen. Lege ihn flach hin und miss den Abstand von Innenkante zu Innenkante in Millimetern. Den Umfang erhältst du, indem du den Durchmesser mit 3,14 multiplizierst. Beispiel: 17,2 mm Innendurchmesser × 3,14 ≈ 54 mm – also Grösse 54.</p>
<h2>Ungefähre Orientierung: Umfang und Grösse</h2>
<p>Da die Schweizer Grösse dem Innenumfang in mm entspricht, ist die «Tabelle» denkbar einfach:</p>
<ul>
  <li>Innenumfang 50 mm → Grösse 50</li>
  <li>Innenumfang 52 mm → Grösse 52</li>
  <li>Innenumfang 54 mm → Grösse 54</li>
  <li>Innenumfang 56 mm → Grösse 56</li>
  <li>Innenumfang 58 mm → Grösse 58</li>
</ul>
<p>Liegt dein gemessener Wert zwischen zwei Grössen, wähle im Zweifel die nächstgrössere – das gilt besonders bei breiten Ringen (siehe unten).</p>
<h2>Tipps für ein genaues Ergebnis</h2>
<ul>
  <li><strong>Miss am Abend:</strong> Finger sind morgens oft schlanker und schwellen im Tagesverlauf leicht an. Am Abend gemessen sitzt der Ring auch nach einem langen Tag angenehm.</li>
  <li><strong>Achte auf die Temperatur:</strong> Bei Kälte werden die Finger dünner, bei Wärme etwas dicker. Miss bei normaler Zimmertemperatur, wenn deine Hände weder kalt noch erhitzt sind.</li>
  <li><strong>Breite Ringe grösser wählen:</strong> Ein breiter Ring (ab ca. 6 mm) sitzt enger als ein schmaler. Wenn du einen breiten Ring möchtest, wähle lieber eine halbe bis ganze Grösse grösser.</li>
  <li><strong>Denk an das Fingergelenk:</strong> Ist dein Knöchel deutlich dicker als die Fingerbasis, orientiere dich an einem Wert dazwischen, damit der Ring über das Gelenk passt und danach nicht rutscht.</li>
</ul>
<h2>Bereit für deinen neuen Lieblingsring?</h2>
<p>Sobald du deine Grösse kennst, findest du bei uns die passende Wahl. Entdecke unsere Auswahl an <a href="/collections/premium-schmuck">Premium-Schmuck</a> für besondere Momente oder unseren alltagstauglichen <a href="/collections/wasserfester-schmuck">wasserfesten Schmuck</a>, den du beim Händewaschen und Duschen nicht abnehmen musst. Falls die Grösse doch nicht ganz passt: Bei LuxeStyle geniesst du <strong>30 Tage Rückgaberecht</strong> und <strong>Gratis-Versand ab CHF 50</strong> – so kannst du entspannt bestellen.</p>` },

 { handle:'sonnenbrillen-uv400-kaufberatung',
   title:'Sonnenbrillen mit UV400: worauf du beim Kauf achten solltest',
   tt:'Sonnenbrillen mit UV400: Darauf beim Kauf achten | LuxeStyle',
   dt:'UV400, CE-Zeichen, Tönungskategorien 0–4 und die passende Form: Der ehrliche Ratgeber, worauf du beim Kauf von Sonnenbrillen mit UV-Schutz achten solltest.',
   body:`<p>Eine Sonnenbrille ist weit mehr als ein modisches Accessoire: Sie schützt deine Augen vor UV-Strahlung – vorausgesetzt, sie ist richtig ausgewählt. Zwischen «UV400», «CE-Kennzeichnung» und «Tönungskategorie» verliert man schnell den Überblick. In diesem Ratgeber erklären wir dir ehrlich und verständlich, worauf es beim Kauf wirklich ankommt.</p>
<h2>Was bedeutet UV400 überhaupt?</h2>
<p>UV400 ist die wichtigste Angabe, auf die du achten solltest. Sie bedeutet, dass die Gläser UV-Strahlung bis zu einer Wellenlänge von 400 Nanometern blockieren – und damit sowohl UVA- als auch UVB-Strahlen praktisch vollständig abhalten. Kurz gesagt: UV400 entspricht 100 Prozent UV-Schutz. Alles unterhalb dieses Werts lässt einen Teil der schädlichen Strahlung durch.</p>
<p>Wichtig zu wissen: Der UV-Schutz sitzt in einer speziellen Beschichtung oder im Material des Glases – er ist <strong>unabhängig von der Tönung</strong>. Eine sehr dunkle Brille ohne UV-Filter ist sogar gefährlicher als gar keine Brille, weil sich die Pupille im Schatten weitet und dadurch mehr ungefilterte Strahlung ins Auge gelangt. Umgekehrt kann ein fast klares Glas vollen UV400-Schutz bieten.</p>
<h2>CE-Kennzeichnung: das Mindestmass an Sicherheit</h2>
<p>In der Schweiz und in der EU sollten seriöse Sonnenbrillen eine CE-Kennzeichnung tragen. Sie bestätigt, dass das Modell die grundlegenden Anforderungen an Sonnenbrillen erfüllt. Das CE-Zeichen findest du meist auf dem Bügel oder in den Produktangaben. Fehlt diese Kennzeichnung komplett, ist Vorsicht geboten.</p>
<h2>Tönungskategorien 0 bis 4 verstehen</h2>
<p>Die Tönung wird in fünf Kategorien eingeteilt, die angeben, wie viel sichtbares Licht die Gläser durchlassen. Sie sagt nichts über den UV-Schutz aus, sondern nur über die Helligkeit:</p>
<ul>
  <li><strong>Kategorie 0:</strong> nahezu klar, für bedeckte Tage oder abends.</li>
  <li><strong>Kategorie 1:</strong> leicht getönt, für wechselhaftes Wetter.</li>
  <li><strong>Kategorie 2:</strong> mittlere Tönung, ideal für den Alltag und die Stadt.</li>
  <li><strong>Kategorie 3:</strong> dunkel, perfekt für sonnige Tage, Strand und Berge.</li>
  <li><strong>Kategorie 4:</strong> sehr dunkel, für Hochgebirge und Gletscher – aber nicht zum Autofahren geeignet.</li>
</ul>
<p>Für die meisten Menschen im Alltag ist Kategorie 2 oder 3 die beste Wahl.</p>
<h2>Passform und Gesichtsform</h2>
<p>Die schönste Brille bringt wenig, wenn sie nicht sitzt. Achte darauf, dass die Gläser gross genug sind, um seitlich einfallendes Licht abzuhalten, und dass die Bügel nicht drücken. Als grobe Orientierung gilt:</p>
<h3>Welche Form passt zu dir?</h3>
<ul>
  <li><strong>Rundes Gesicht:</strong> eckige oder kantige Fassungen setzen einen klaren Kontrast.</li>
  <li><strong>Eckiges Gesicht:</strong> runde oder ovale Modelle wirken weicher.</li>
  <li><strong>Herzförmiges Gesicht:</strong> Cat-Eye- oder schmale Formen schmeicheln.</li>
  <li><strong>Ovales Gesicht:</strong> die meisten Formen stehen dir – experimentiere ruhig.</li>
</ul>
<p>Am Ende zählt aber vor allem, dass du dich wohlfühlst und die Brille bequem sitzt.</p>
<h2>Ehrlich gesagt: ein Accessoire mit Schutzfunktion</h2>
<p>Eine modische Sonnenbrille mit UV400 schützt deine Augen zuverlässig vor Sonnenstrahlung und rundet dein Outfit ab. Sie ist aber ein Accessoire und <strong>ersetzt keine medizinische Sehhilfe</strong> und keine augenärztliche Beratung. Wenn du eine Sehkorrektur benötigst oder gesundheitliche Beschwerden hast, wende dich an deinen Optiker oder deine Augenärztin.</p>
<h2>Kurz zusammengefasst</h2>
<p>Achte beim Kauf auf UV400 für vollen UV-Schutz, auf die CE-Kennzeichnung, auf eine zur Situation passende Tönungskategorie und auf eine bequeme Passform. Dann bist du gut gerüstet – stilvoll und geschützt.</p>
<p>Entdecke jetzt unsere aktuelle Auswahl an <a href="/collections/sonnenbrillen-damen">Sonnenbrillen für Damen</a> und finde dein Lieblingsmodell für den Sommer.</p>` },

 { handle:'geschenke-geburtstag-muttertag-frauen',
   title:'Geschenke zum Geburtstag & Muttertag: persönliche Ideen für Frauen (Schweiz)',
   tt:'Geschenke Geburtstag & Muttertag für Frauen | LuxeStyle CH',
   dt:'Persönliche Geschenkideen für Frauen zum Geburtstag & Muttertag: Schmuck, Beauty & Mode nach Typ und Budget. Ehrliche Tipps aus der Schweiz, Versand ab CHF 50.',
   body:`<p>Ein Geschenk, das wirklich ankommt, muss weder teuer noch kompliziert sein – es muss persönlich sein. Ob zum Geburtstag der besten Freundin oder zum Muttertag: Wer die Empfängerin kennt und ein paar durchdachte Ideen zur Hand hat, findet schnell etwas Passendes. In diesem Ratgeber haben wir für dich persönliche Geschenkideen für Frauen zusammengestellt – sortiert nach Typ und Budget, damit du entspannt auswählen kannst.</p>
<h2>Warum persönliche Geschenke besser ankommen</h2>
<p>Ein Geschenk sagt: «Ich habe an dich gedacht.» Genau darum funktionieren persönliche Präsente so gut – sie treffen den Geschmack, den Lebensstil oder ein kleines Detail, das nur du kennst. Statt Gutscheinen oder Standardsträussen lohnt es sich, etwas zu wählen, das die Beschenkte im Alltag begleitet: ein Schmuckstück, ein Pflegeprodukt oder ein Kleidungsstück, das sie sich selbst vielleicht nicht gekauft hätte.</p>
<h2>Geschenkideen nach Typ</h2>
<p><strong>Für die Klassische:</strong> Zeitloser Schmuck ist immer eine sichere Wahl. Feine Ohrringe oder eine dezente Halskette aus unserer <a href="/collections/premium-schmuck">Premium-Schmuck-Kollektion</a> passen zu fast jedem Outfit und wirken edel, ohne aufdringlich zu sein.</p>
<p><strong>Für die Aktive:</strong> Wer viel unterwegs ist, im Alltag, beim Sport oder am See, freut sich über Schmuck, der mitmacht. <a href="/collections/wasserfester-schmuck">Wasserfester Schmuck</a> läuft nicht an und bleibt auch beim Händewaschen oder Schwimmen schön – praktisch und schön zugleich.</p>
<p><strong>Für die Geniesserin:</strong> Ein kleines Beauty- und Self-Care-Set schenkt Momente der Ruhe. In der <a href="/collections/beauty-selfcare">Beauty- & Self-Care-Kollektion</a> findest du Produkte, mit denen sie sich zuhause eine Auszeit gönnen kann.</p>
<p><strong>Für die Modebewusste:</strong> Ein Accessoire oder ein schönes Teil aus der <a href="/collections/damen-mode">Damen-Mode-Kollektion</a> trifft den aktuellen Look und lässt sich vielseitig kombinieren.</p>
<h2>Geschenkideen nach Budget</h2>
<p><strong>Unter CHF 30:</strong> Kleine Freuden mit Wirkung – etwa ein Paar filigrane Ohrstecker, ein einzelnes Pflegeprodukt oder ein feines Armband. Persönlich wird es, wenn du eine handgeschriebene Karte dazulegst.</p>
<p><strong>CHF 30–60:</strong> Hier hast du viel Auswahl. Ein wasserfestes Schmuckstück, ein Beauty-Set oder ein modisches Accessoire liegen in diesem Rahmen. Tipp: Ab CHF 50 liefern wir versandkostenfrei in die ganze Schweiz.</p>
<p><strong>Ab CHF 60:</strong> Für besondere Anlässe darf es ein hochwertigeres Schmuckstück aus der Premium-Kollektion sein oder eine Kombination aus zwei kleineren Geschenken, etwa Schmuck plus Pflege.</p>
<h2>Geschenke zum Muttertag: worauf es ankommt</h2>
<p>Zum Muttertag zählt vor allem die Geste. Mütter schätzen oft etwas, das an gemeinsame Momente erinnert oder ihren Alltag ein bisschen schöner macht. Zeitloser Schmuck, ein durchdachtes Pflegeset oder ein Accessoire in ihrer Lieblingsfarbe kommen erfahrungsgemäss gut an. Wichtig: rechtzeitig bestellen, damit das Geschenk pünktlich da ist.</p>
<h2>Tipps für die Auswahl</h2>
<ul>
  <li><strong>Beobachte Details:</strong> Trägt sie eher Gold oder Silber? Mag sie es schlicht oder auffällig? Solche Kleinigkeiten machen den Unterschied.</li>
  <li><strong>Denk an den Alltag:</strong> Ein Geschenk, das sie oft nutzen kann, bleibt länger in Erinnerung als etwas, das im Schrank landet.</li>
  <li><strong>Kombiniere clever:</strong> Zwei kleine, aufeinander abgestimmte Teile wirken persönlicher als ein einzelnes Standardgeschenk.</li>
  <li><strong>Plane die Zeit ein:</strong> Gerade vor dem Muttertag lohnt es sich, ein paar Tage Puffer einzurechnen.</li>
</ul>
<p>Du bist noch unsicher? Stöbere in Ruhe durch unser <a href="/collections/sg-alle">gesamtes Sortiment</a> – dort findest du alle Kategorien auf einen Blick und entdeckst vielleicht genau das Richtige. Bei uns geniesst du versandkostenfreie Lieferung ab CHF 50 innerhalb der Schweiz, Bezahlung per TWINT oder Klarna sowie 30 Tage Rückgaberecht. So kannst du entspannt aussuchen und im Zweifel unkompliziert umtauschen.</p>` },
];

const tok=await token();
let blogId=null, blogTitle=null;
try{ const r=await gql(tok,`{ blogs(first:5){ edges{ node{ id title handle } } } }`); const b=(r?.data?.blogs?.edges||[]).map(e=>e.node); blogId=b[0]?.id||null; blogTitle=b[0]?.title||null; }catch(e){}
if(!blogId){
  if(DRY){ console.log('DRY: kein Blog vorhanden → würde Blog "Ratgeber" anlegen.'); }
  else { const r=await gql(tok,`mutation($blog:BlogCreateInput!){ blogCreate(blog:$blog){ blog{ id title } userErrors{ field message } } }`,{blog:{title:'Ratgeber'}}); blogId=r?.data?.blogCreate?.blog?.id||null; blogTitle=r?.data?.blogCreate?.blog?.title||null; if(!blogId){ console.error('❌ Kein Blog anlegbar:',JSON.stringify(r?.data?.blogCreate?.userErrors||r).slice(0,200)); process.exit(0); } }
}
console.log(`Blog: ${blogTitle||'(neu)'} (${blogId||'DRY'})`);

const FIND=`query($q:String!){ articles(first:5, query:$q){ edges{ node{ id handle } } } }`;
const CRE=`mutation($article:ArticleCreateInput!){ articleCreate(article:$article){ article{ id handle } userErrors{ field message } } }`;
const UPD=`mutation($id:ID!,$article:ArticleUpdateInput!){ articleUpdate(id:$id, article:$article){ article{ id } userErrors{ field message } } }`;
const MF=`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ field message } } }`;
let created=0, updated=0, fails=[];
for(const p of POSTS){
  let ex=null; try{ const r=await gql(tok,FIND,{q:`handle:${p.handle}`}); ex=(r?.data?.articles?.edges||[]).map(e=>e.node).find(n=>n.handle===p.handle)||null; }catch(e){}
  if(DRY){ console.log(`DRY ${ex?'update':'create'}: /blogs/.../${p.handle}`); continue; }
  let id=ex?.id||null;
  if(ex){ const r=await gql(tok,UPD,{id:ex.id,article:{title:p.title,body:p.body,isPublished:true}}); const ue=r?.data?.articleUpdate?.userErrors||[]; if(ue.length){fails.push(`${p.handle}:${JSON.stringify(ue).slice(0,90)}`);continue;} updated++; }
  else { const r=await gql(tok,CRE,{article:{blogId,title:p.title,handle:p.handle,body:p.body,isPublished:true}}); const ue=r?.data?.articleCreate?.userErrors||[]; if(ue.length){fails.push(`${p.handle}:${JSON.stringify(ue).slice(0,120)}`);continue;} id=r?.data?.articleCreate?.article?.id; created++; }
  if(id) await gql(tok,MF,{mf:[{ownerId:id,namespace:'global',key:'title_tag',type:'single_line_text_field',value:p.tt},{ownerId:id,namespace:'global',key:'description_tag',type:'single_line_text_field',value:p.dt}]});
  console.log(`✓ ${p.handle}`); await new Promise(x=>setTimeout(x,300));
}
if(fails.length) fails.forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${created} Artikel angelegt, ${updated} aktualisiert${fails.length?`, ${fails.length} Fehler`:''}.`);
