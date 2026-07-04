#!/usr/bin/env node
/* LuxeStyle — create_blog_posts_batch3.mjs
 * 3 Buy-Intent-Vergleichs-/Trust-Blogartikel (Schwarm #4, 2026-07-04), idempotent per Handle + SEO-Meta.
 * Nutzt den ersten vorhandenen Blog (News). Ehrlich, strikt CH. No-op ohne Creds. DRY_RUN=1.
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
 { handle:'wasserfester-edelstahl-vs-vergoldeter-schmuck',
   title:'Wasserfester Edelstahl-Schmuck vs. vergoldeter Schmuck: Was hält länger?',
   tt:'Edelstahl vs. vergoldeter Schmuck: Was hält länger?',
   dt:'316L-Edelstahl mit PVD oder vergoldetes Messing: Welcher Schmuck bleibt länger schön? Ehrlicher Vergleich zu Haltbarkeit, Pflege und Anlaufen im Alltag.',
   body:`<h2>Die kurze Antwort vorweg</h2>
<p>Wenn es nur um Haltbarkeit geht, gewinnt wasserfester Edelstahl-Schmuck aus 316L mit PVD-Beschichtung fast immer gegen klassisch vergoldeten Schmuck aus Messing oder Silber. Aber so einfach ist es nicht: Beide Materialien haben ihre Berechtigung, und die ehrliche Wahrheit hängt davon ab, wie und wie oft Sie Ihren Schmuck tragen. Wir vergleichen beide fair – ohne Marketing-Versprechen.</p>
<h2>Was steckt hinter den Materialien?</h2>
<h3>316L-Edelstahl mit PVD-Beschichtung</h3>
<p>316L ist ein chirurgischer Edelstahl, der auch in der Medizintechnik eingesetzt wird. Er ist von Natur aus korrosionsbeständig, läuft nicht an und reagiert kaum mit Schweiss, Wasser oder Kosmetik. Die goldene Optik entsteht durch eine PVD-Beschichtung (Physical Vapour Deposition): Eine hauchdünne, aber sehr harte Metallschicht wird im Vakuum aufgedampft. Diese Schicht ist deutlich widerstandsfähiger als eine galvanische Vergoldung.</p>
<h3>Vergoldetes Messing oder Silber</h3>
<p>Bei vergoldetem Schmuck liegt unter der Goldschicht meist Messing oder Silber. Die Goldauflage wird galvanisch aufgetragen und ist oft nur wenige Mikrometer dünn. Das sieht anfangs edel aus und fühlt sich hochwertig an – die Optik ist häufig wärmer und satter als bei PVD-Gold. Der Nachteil: Die Schicht nutzt sich mit der Zeit ab, und das Grundmetall kann durchscheinen oder anlaufen.</p>
<h2>Der ehrliche Haltbarkeits-Vergleich</h2>
<p>Im täglichen Gebrauch zeigt sich der Unterschied klar. Wasserfester Edelstahl mit PVD verträgt Duschen, Händewaschen, Sport und Schwitzen in der Regel problemlos, ohne die Farbe zu verlieren. Genau deshalb nennt man ihn «wasserfest» – nicht, weil er unzerstörbar wäre, sondern weil Wasser und Schweiss ihm im Alltag wenig anhaben.</p>
<p>Vergoldeter Schmuck ist empfindlicher. Häufiger Kontakt mit Wasser, Parfum, Cremes oder Reibung lässt die dünne Goldschicht schneller verblassen. Je nach Trageintensität kann sichtbarer Abrieb schon nach einigen Monaten bis wenigen Jahren auftreten. Bei sorgfältiger Pflege und seltenem Tragen hält vergoldeter Schmuck deutlich länger – nur ist er eben nicht für den Dauereinsatz gemacht.</p>
<p>Wichtig für ehrliche Erwartungen: Auch PVD-Edelstahl ist nicht ewig unveränderlich. Starke mechanische Kratzer oder aggressive Chemikalien können auch hier Spuren hinterlassen. «Wasserfest» heisst langlebig im Alltag, nicht unkaputtbar.</p>
<h2>Richtige Pflege für lange Freude</h2>
<h3>Edelstahl-Schmuck</h3>
<p>Sehr pflegeleicht: Mit einem weichen Tuch und bei Bedarf etwas mildem Seifenwasser reinigen, danach trocken tupfen. Er darf beim Duschen und Sport dranbleiben. Trotzdem gilt: aggressive Reinigungsmittel und Chlor besser meiden.</p>
<h3>Vergoldeter Schmuck</h3>
<p>Deutlich mehr Rücksicht nötig: Vor dem Duschen, Schwimmen und Sport ablegen. Parfum und Creme zuerst auftragen, Schmuck erst danach anlegen. Nach dem Tragen mit einem trockenen, weichen Tuch abwischen und in einem Beutel oder Kästchen trocken lagern. So bleibt die Goldschicht länger schön.</p>
<h2>Wann eignet sich welcher Schmuck?</h2>
<p>Wählen Sie <strong>wasserfesten Edelstahl-Schmuck</strong>, wenn Sie Ihre Lieblingsstücke täglich und ohne Nachdenken tragen möchten – im Büro, beim Sport, unter der Dusche und im Sommer am See. Er ist die pragmatische Wahl für alle, die pflegeleichten, langlebigen Alltagsschmuck suchen.</p>
<p>Vergoldeter Schmuck kann die richtige Wahl sein, wenn Sie ein bestimmtes Design oder eine besonders warme Goldoptik lieben und bereit sind, das Stück bewusst zu pflegen und eher zu besonderen Anlässen zu tragen. Für empfindliche Haut ist ausserdem nickelarmer oder nickelfreier Schmuck generell zu bevorzugen – ein Punkt, bei dem 316L-Edelstahl oft gut abschneidet.</p>
<h2>Unser Fazit</h2>
<p>Wer maximale Haltbarkeit und minimalen Aufwand will, fährt mit wasserfestem Edelstahl klar besser. Wer eine bestimmte Optik sucht und pflegen mag, findet auch bei vergoldetem Schmuck Freude – mit realistischen Erwartungen an die Lebensdauer.</p>
<p>Entdecken Sie unsere Auswahl an langlebigem <a href="/collections/wasserfester-schmuck">wasserfestem Schmuck</a> aus 316L-Edelstahl – und für besondere Momente lohnt ein Blick in unsere <a href="/collections/premium-schmuck">Premium-Schmuck</a>-Kollektion. So finden Sie das Stück, das zu Ihrem Alltag passt.</p>` },

 { handle:'online-shops-twint-kauf-auf-rechnung-schweiz',
   title:'Online-Shops mit TWINT & Kauf auf Rechnung: sicher bezahlen in der Schweiz',
   tt:'TWINT & Kauf auf Rechnung: sicher online bezahlen in der CH',
   dt:'TWINT, Klarna Rechnung und Ratenkauf einfach erklärt: So bezahlen Sie in Schweizer Online-Shops sicher und flexibel. Ehrlicher Ratgeber für CH-Käufer.',
   body:`<p>Online einkaufen soll bequem sein – aber vor allem sicher. Viele Schweizerinnen und Schweizer möchten erst dann bestellen, wenn die Bezahlung zu ihnen passt: mit einem vertrauten Zahlungsmittel und ohne, dass sie das ganze Geld schon vor dem Auspacken überweisen müssen. Genau hier kommen <strong>TWINT</strong> und der <strong>Kauf auf Rechnung</strong> ins Spiel. Dieser Ratgeber erklärt beide Wege sachlich und zeigt, worauf Sie beim Bezahlen achten sollten.</p>
<h2>TWINT: die Schweizer Bezahl-App</h2>
<p>TWINT ist die in der Schweiz entwickelte Bezahl-App, die von den meisten Schweizer Banken unterstützt wird. Sie verbinden die App einmalig mit Ihrem Bankkonto oder Ihrer Kreditkarte. Im Online-Shop wählen Sie TWINT als Zahlungsart, scannen einen QR-Code oder bestätigen die Zahlung direkt in der App.</p>
<p>Die Vorteile für CH-Käufer liegen auf der Hand:</p>
<ul>
  <li><strong>Vertraut und lokal:</strong> TWINT wurde für den Schweizer Markt gemacht und rechnet in Franken ab – keine Umrechnung, keine Überraschungen.</li>
  <li><strong>Keine Kartendaten im Shop:</strong> Sie bestätigen in Ihrer eigenen App. Der Shop sieht Ihre Kontodaten nicht.</li>
  <li><strong>Schnell:</strong> Die Zahlung ist mit wenigen Klicks abgeschlossen, gerade auf dem Handy.</li>
</ul>
<h2>Kauf auf Rechnung und Ratenkauf mit Klarna</h2>
<p>Beim Kauf auf Rechnung bezahlen Sie erst, <em>nachdem</em> die Ware bei Ihnen angekommen ist. In vielen Schweizer Shops wird das über Anbieter wie <strong>Klarna</strong> abgewickelt. So funktioniert es:</p>
<h3>Rechnung</h3>
<p>Sie bestellen, erhalten die Ware und bezahlen danach innerhalb der angegebenen Frist. Das gibt Ihnen die Sicherheit, das Produkt zuerst zu prüfen. Passt etwas nicht, lässt sich die Rücksendung abwickeln, bevor Sie zahlen.</p>
<h3>Ratenkauf</h3>
<p>Bei grösseren Beträgen können Sie den Betrag in mehreren Teilzahlungen begleichen. Achten Sie hier immer auf die Konditionen: Wie viele Raten, welche Fristen, und ob Kosten anfallen. Diese Angaben zeigt Ihnen der Zahlungsanbieter transparent an, bevor Sie zusagen.</p>
<p>Wichtig und ehrlich gesagt: Ob Rechnung oder Raten angeboten werden, entscheidet der Zahlungsanbieter oft anhand einer kurzen Prüfung. Es kann also sein, dass nicht in jedem Fall alle Optionen erscheinen.</p>
<h2>Warum diese Zahlungsarten Vertrauen schaffen</h2>
<p>Beide Wege verschieben ein Stück Sicherheit auf die Seite der Käuferin und des Käufers. Bei TWINT bleiben Ihre Bankdaten in Ihrer eigenen App. Beim Kauf auf Rechnung sehen Sie die Ware zuerst und zahlen danach. Für einen Online-Shop bedeuten diese Optionen vor allem eines: Er nimmt Ihnen die Vorleistung ab und signalisiert, dass er es ernst meint.</p>
<h2>Worauf Sie beim sicheren Bezahlen achten sollten</h2>
<ul>
  <li><strong>Verschlüsselte Verbindung:</strong> Achten Sie auf «https» und das Schloss-Symbol im Browser, besonders auf der Bezahlseite.</li>
  <li><strong>Klare Angaben:</strong> Preis in Franken, Versandkosten, Lieferzeit und Rückgabebedingungen sollten vor dem Kauf klar ersichtlich sein.</li>
  <li><strong>Bekannte Zahlungsanbieter:</strong> Namen wie TWINT oder Klarna erkennen Sie wieder – das erleichtert die Einschätzung.</li>
  <li><strong>Erreichbarkeit:</strong> Ein seriöser Shop nennt Kontaktmöglichkeiten und beantwortet Fragen.</li>
  <li><strong>Fristen im Blick:</strong> Beim Kauf auf Rechnung die Zahlungsfrist notieren, damit keine Mahngebühren entstehen.</li>
</ul>
<h2>Fazit</h2>
<p>TWINT und der Kauf auf Rechnung machen das Online-Einkaufen in der Schweiz sicherer und flexibler. Mit TWINT bezahlen Sie schnell und ohne Kartendaten im Shop, mit der Rechnung prüfen Sie die Ware zuerst und zahlen danach. Wer auf eine verschlüsselte Verbindung, klare Angaben und faire Fristen achtet, ist gut geschützt.</p>
<p>Bei <strong>LuxeStyle</strong> setzen wir auf gängige, in der Schweiz vertraute Zahlungsarten und transparente Angaben – damit Sie sich auf das Wesentliche konzentrieren können: entspannt aussuchen und sicher bezahlen. <a href="/collections/all">Entdecken Sie unser Sortiment</a> und wählen Sie an der Kasse die Zahlungsart, die zu Ihnen passt.</p>` },

 { handle:'edelstahl-schmuck-vs-silber-vergleich',
   title:'Edelstahl-Schmuck vs. Silber: Vor- und Nachteile im Vergleich',
   tt:'Edelstahl-Schmuck vs. Silber: Der ehrliche Vergleich',
   dt:'Edelstahl 316L oder echtes Silber? Anlaufen, Pflege, Allergie, Preis ehrlich verglichen – damit Sie wissen, welcher Schmuck wirklich zu Ihnen passt.',
   body:`<p>Sie stehen vor der Wahl zwischen Edelstahl-Schmuck und echtem Silber und fragen sich, was langfristig die bessere Entscheidung ist? Beide Materialien haben ihre Berechtigung – aber sie unterscheiden sich deutlich bei Pflege, Haltbarkeit, Allergieverträglichkeit und Preis. Wir vergleichen ehrlich, ohne Marketing-Schönfärberei, damit Sie das Richtige für Ihren Alltag finden.</p>
<h2>Edelstahl-Schmuck: pflegeleicht und robust</h2>
<p>Hochwertiger Schmuck aus <strong>Edelstahl 316L</strong> (auch «chirurgischer Edelstahl» genannt) ist bekannt dafür, dass er nicht anläuft. Er reagiert kaum auf Sauerstoff, Feuchtigkeit oder Hautschweiss und behält seinen Glanz über Jahre, ohne dass Sie ihn regelmässig polieren müssen. Das macht ihn besonders praktisch für den täglichen Gebrauch.</p>
<h3>Die Vorteile im Überblick</h3>
<ul>
  <li><strong>Anlauffrei:</strong> 316L oxidiert im normalen Alltag praktisch nicht – kein Nachpolieren nötig.</li>
  <li><strong>Nickelarm:</strong> 316L gibt sehr wenig Nickel ab und wird von vielen Menschen mit empfindlicher Haut gut vertragen. Ein Nickelallergie-Garant ist es nicht, aber die Verträglichkeit ist meist deutlich besser als bei günstigen Modelegierungen.</li>
  <li><strong>Robust:</strong> kratzfester und weniger verformbar als Silber – ideal für Ringe, Armbänder und Ketten, die viel mitmachen.</li>
  <li><strong>Wasserbeständig:</strong> Duschen, Händewaschen oder Schwitzen sind in der Regel kein Problem.</li>
  <li><strong>Preislich attraktiv:</strong> meist günstiger als echtes Silber bei sehr guter Langlebigkeit.</li>
</ul>
<h3>Die ehrlichen Nachteile</h3>
<p>Edelstahl wirkt etwas kühler und «technischer» als Silber. Er lässt sich schlechter aufwendig gravieren oder umarbeiten, und der Materialwert ist – anders als bei Edelmetall – gering. Wer einen klassischen Edelmetall-Charakter oder eine Wertanlage sucht, findet ihn hier nicht.</p>
<h2>Silber: edler Klassiker mit etwas mehr Pflegeaufwand</h2>
<p>Echtes Silber – meist als <strong>Sterlingsilber 925</strong> – hat einen warmen, edlen Glanz, den viele als hochwertiger empfinden. Es ist ein echtes Edelmetall mit langer Tradition und eignet sich wunderbar für feine, klassische Stücke.</p>
<h3>Die Vorteile</h3>
<ul>
  <li><strong>Edler Look:</strong> warmer, tiefer Glanz, der als besonders wertig gilt.</li>
  <li><strong>Echtes Edelmetall:</strong> mit eigenem Materialwert und zeitlosem Charakter.</li>
  <li><strong>Gut verarbeitbar:</strong> lässt sich fein gestalten, gravieren und bei Bedarf neu polieren.</li>
</ul>
<h3>Die Nachteile – ehrlich benannt</h3>
<ul>
  <li><strong>Silber oxidiert:</strong> An der Luft und durch Hautkontakt läuft es mit der Zeit an und wird dunkler. Das ist normal und lässt sich mit einem Silberputztuch beheben, bedeutet aber regelmässige Pflege.</li>
  <li><strong>Weicher:</strong> anfälliger für Kratzer und Verformung als Edelstahl.</li>
  <li><strong>Empfindlicher gegen Wasser & Kosmetik:</strong> Chlor, Parfum und Cremes können das Anlaufen beschleunigen – besser vor dem Duschen ablegen.</li>
  <li><strong>Meist teurer</strong> als Edelstahl.</li>
</ul>
<h2>Allergie und Pflege im direkten Vergleich</h2>
<p>Bei empfindlicher Haut spielt der Alltag die grösste Rolle. Sterlingsilber ist grundsätzlich hautfreundlich, kann aber je nach Legierung geringe Anteile anderer Metalle enthalten. Edelstahl 316L punktet mit seiner sehr niedrigen Nickelabgabe und ist besonders pflegeleicht, weil kein Anlaufen entsteht. Wer Schmuck möglichst dauerhaft tragen möchte – auch beim Sport oder am Wasser – fährt mit Edelstahl in der Praxis oft unkomplizierter.</p>
<h2>Für wen eignet sich was?</h2>
<p><strong>Edelstahl ist ideal</strong>, wenn Sie pflegeleichten, robusten Schmuck für jeden Tag suchen, empfindliche Haut haben oder Ihren Schmuck nicht ständig ablegen möchten. <strong>Silber ist ideal</strong>, wenn Sie den warmen Edelmetall-Look lieben, feine klassische Stücke schätzen und mit etwas Pflege kein Problem haben.</p>
<p>In unserer Kollektion <a href="/collections/wasserfester-schmuck">wasserfester Schmuck</a> finden Sie robuste Edelstahl-Modelle, die Duschen und Alltag problemlos mitmachen. Möchten Sie es besonders edel, entdecken Sie ausgewählte Stücke in der <a href="/collections/premium-schmuck">Premium-Schmuck</a>-Auswahl. So finden Sie das Material, das wirklich zu Ihrem Leben passt – ehrlich beraten, langlebig gedacht.</p>` },
];

const tok=await token();
let blogId=null, blogTitle=null;
try{ const r=await gql(tok,`{ blogs(first:5){ edges{ node{ id title handle } } } }`); const b=(r?.data?.blogs?.edges||[]).map(e=>e.node); blogId=b[0]?.id||null; blogTitle=b[0]?.title||null; }catch(e){}
if(!blogId){
  if(DRY){ console.log('DRY: kein Blog vorhanden → würde Blog "Ratgeber" anlegen.'); }
  else { const r=await gql(tok,`mutation($blog:BlogCreateInput!){ blogCreate(blog:$blog){ blog{ id title } userErrors{ field message } } }`,{blog:{title:'Ratgeber'}}); blogId=r?.data?.blogCreate?.blog?.id||null; if(!blogId){ console.error('❌ Kein Blog anlegbar'); process.exit(0); } }
}
console.log(`Blog: ${blogTitle||'(neu)'} (${blogId||'DRY'})`);
const FIND=`query($q:String!){ articles(first:5, query:$q){ edges{ node{ id handle } } } }`;
const CRE=`mutation($article:ArticleCreateInput!){ articleCreate(article:$article){ article{ id handle } userErrors{ field message } } }`;
const UPD=`mutation($id:ID!,$article:ArticleUpdateInput!){ articleUpdate(id:$id, article:$article){ article{ id } userErrors{ field message } } }`;
const MF=`mutation($mf:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$mf){ userErrors{ field message } } }`;
let created=0, updated=0, fails=[];
for(const p of POSTS){
  let ex=null; try{ const r=await gql(tok,FIND,{q:`handle:${p.handle}`}); ex=(r?.data?.articles?.edges||[]).map(e=>e.node).find(n=>n.handle===p.handle)||null; }catch(e){}
  if(DRY){ console.log(`DRY ${ex?'update':'create'}: ${p.handle}`); continue; }
  let id=ex?.id||null;
  if(ex){ const r=await gql(tok,UPD,{id:ex.id,article:{title:p.title,body:p.body,isPublished:true}}); const ue=r?.data?.articleUpdate?.userErrors||[]; if(ue.length){fails.push(`${p.handle}:${JSON.stringify(ue).slice(0,90)}`);continue;} updated++; }
  else { const r=await gql(tok,CRE,{article:{blogId,title:p.title,handle:p.handle,body:p.body,isPublished:true}}); const ue=r?.data?.articleCreate?.userErrors||[]; if(ue.length){fails.push(`${p.handle}:${JSON.stringify(ue).slice(0,120)}`);continue;} id=r?.data?.articleCreate?.article?.id; created++; }
  if(id) await gql(tok,MF,{mf:[{ownerId:id,namespace:'global',key:'title_tag',type:'single_line_text_field',value:p.tt},{ownerId:id,namespace:'global',key:'description_tag',type:'single_line_text_field',value:p.dt}]});
  console.log(`✓ ${p.handle}`); await new Promise(x=>setTimeout(x,300));
}
if(fails.length) fails.forEach(f=>console.error('✗',f));
console.log(`\nFertig: ${created} angelegt, ${updated} aktualisiert${fails.length?`, ${fails.length} Fehler`:''}.`);
