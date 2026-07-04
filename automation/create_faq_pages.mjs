#!/usr/bin/env node
/* LuxeStyle — create_faq_pages.mjs
 * 4 FAQ/Trust-Seiten (20-Agenten-Schwarm #3, 2026-07-04) — reduzieren Kauf-Unsicherheit = Conversion-Hebel.
 * Idempotent per Handle + SEO-Meta. Ehrlich, strikt CH, keine Fake-Angaben. No-op ohne Creds. DRY_RUN=1.
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
 // ÜBERSCHREIBT die veraltete /pages/faq (hatte Deutschland/international + CHF 99/65-Widerspruch — Audit 2026-07-04).
 { handle:'faq', title:'Häufige Fragen (FAQ)',
   tt:'FAQ – Häufige Fragen | LuxeStyle Schweiz',
   dt:'Häufige Fragen zu Versand, Zahlung, Rückgabe und Pflege bei LuxeStyle. Gratis Versand ab CHF 50, TWINT & Klarna, 30 Tage Rückgabe. Nur Schweiz.',
   body:`<h2>Häufige Fragen (FAQ)</h2>
<p>Hier findest du schnelle Antworten – und für Details die passende Themenseite. Wir liefern ausschliesslich innerhalb der Schweiz (inkl. Liechtenstein).</p>
<h3>Versand & Lieferung</h3>
<p><strong>Gratis Versand ab CHF 50.</strong> Lieferzeit je nach Produkt in der Regel ca. 5–12 Werktage (personalisierte/Print-on-Demand- und Übersee-Artikel ca. 7–14 Werktage). Sendungsverfolgung per E-Mail. Mehr: <a href="/pages/faq-versand-lieferung">FAQ Versand & Lieferung</a>.</p>
<h3>Zahlung & Sicherheit</h3>
<p>Bezahlen mit <strong>TWINT, Klarna (Kauf auf Rechnung/Raten), Visa/Mastercard und PayPal</strong>. Datenschutz nach Schweizer revDSG. Mehr: <a href="/pages/faq-zahlung-sicherheit">FAQ Zahlung & Sicherheit</a>.</p>
<h3>Rückgabe & Umtausch</h3>
<p><strong>30 Tage Rückgaberecht.</strong> Mehr: <a href="/pages/faq-rueckgabe-umtausch">FAQ Rückgabe & Umtausch</a>.</p>
<h3>Schmuck-Pflege & Grössen</h3>
<p>Wasserfester Edelstahl-Schmuck, Pflege und Materialien: <a href="/pages/faq-schmuck-pflege-material">FAQ Schmuck-Pflege</a>. Grössen, Ringgrösse und Kettenlängen: <a href="/pages/groessen-material-guide">Grössen- & Material-Guide</a>.</p>
<h3>Über LuxeStyle</h3>
<p>LuxeStyle ist ein Schweizer Online-Shop. Unsere Produkte stammen von qualifizierten internationalen Herstellern und werden für die Schweiz geliefert. Fragen? Schreib uns – wir helfen gerne persönlich weiter.</p>` },

 { handle:'faq-versand-lieferung', title:'Versand & Lieferung – FAQ',
   tt:'Versand & Lieferung – FAQ | LuxeStyle Schweiz',
   dt:'Alle Antworten zu Versand & Lieferung bei LuxeStyle: Lieferzeiten, Gratis-Versand ab CHF 50, Sendungsverfolgung und was bei Verzögerungen gilt. Nur Schweiz.',
   body:`<h2>Versand & Lieferung – häufige Fragen</h2>
<p>Hier findest du alle wichtigen Antworten rund um deine Bestellung bei LuxeStyle. Fehlt dir etwas? Schreib uns – wir helfen dir gerne weiter.</p>
<h3>Wie lange dauert die Lieferung?</h3>
<p>Die Lieferzeit hängt vom jeweiligen Produkt ab. Artikel aus unserem Lager in der Schweiz und der EU sind in der Regel in ca. 5–12 Werktagen bei dir. Personalisierte Artikel und Produkte, die auf Bestellung gefertigt werden (Print-on-Demand) oder aus Übersee kommen, brauchen meist ca. 7–14 Werktage, in Einzelfällen etwas länger. Die konkrete Angabe findest du jeweils auf der Produktseite.</p>
<h3>Was kostet der Versand?</h3>
<p>Ab einem Bestellwert von CHF 50 liefern wir dir <strong>gratis</strong>. Bei kleineren Bestellungen wird eine faire Versandpauschale angezeigt – den genauen Betrag siehst du transparent im Warenkorb, bevor du bezahlst.</p>
<h3>In welche Länder liefert ihr?</h3>
<p>Wir liefern ausschliesslich innerhalb der Schweiz (inkl. Liechtenstein). Bestellungen ins Ausland sind aktuell nicht möglich.</p>
<h3>Wie kann ich meine Sendung verfolgen?</h3>
<p>Sobald deine Bestellung verschickt wurde, erhältst du eine Versandbestätigung per E-Mail mit einem Tracking-Link. Damit siehst du jederzeit, wo sich dein Paket gerade befindet.</p>
<h3>Was passiert bei einer Verzögerung?</h3>
<p>Wir geben unsere Lieferzeiten bewusst realistisch an. Trotzdem kann es durch Zoll, Feiertage oder hohe Nachfrage einmal länger dauern. Wenn dein Paket deutlich später ankommt als angegeben, melde dich einfach bei uns – wir prüfen den Status und finden gemeinsam eine Lösung.</p>
<h3>Kann meine Bestellung in mehreren Paketen ankommen?</h3>
<p>Ja. Wenn du mehrere Artikel bestellst, die aus verschiedenen Lagern versendet werden, kann deine Bestellung als Teillieferung in getrennten Paketen eintreffen – teils auch zu unterschiedlichen Zeitpunkten. Für dich entstehen dadurch keine zusätzlichen Kosten.</p>
<h3>Noch Fragen?</h3>
<p>Du hast 30 Tage Rückgaberecht und kannst bei uns bequem mit TWINT, Kreditkarte oder Klarna bezahlen. Bei allen weiteren Fragen zu deiner Lieferung sind wir gerne für dich da.</p>` },

 { handle:'faq-zahlung-sicherheit', title:'Zahlung & Sicherheit – FAQ',
   tt:'Zahlung & Sicherheit – FAQ | TWINT, Klarna & Co. | LuxeStyle',
   dt:'Alle Antworten zu Zahlung und Sicherheit bei LuxeStyle: TWINT, Klarna Kauf auf Rechnung, Kreditkarte, PayPal, 3-D-Secure und Datenschutz nach Schweizer revDSG.',
   body:`<p>Ihre Sicherheit hat bei LuxeStyle oberste Priorität. Hier beantworten wir die häufigsten Fragen rund um Zahlung und Datenschutz – ehrlich und transparent.</p>
<h2>Welche Zahlungsarten kann ich nutzen?</h2>
<p>Bei LuxeStyle bezahlen Sie bequem mit:</p>
<ul>
  <li><strong>TWINT</strong> – die Schweizer Bezahl-App</li>
  <li><strong>Klarna</strong> – Kauf auf Rechnung oder in Raten</li>
  <li><strong>Visa und Mastercard</strong> – Kredit- und Debitkarten</li>
  <li><strong>PayPal</strong></li>
</ul>
<h2>Wie funktioniert die Zahlung mit TWINT?</h2>
<p>Wählen Sie im Checkout TWINT aus. Anschliessend scannen Sie den angezeigten QR-Code mit Ihrer TWINT-App oder geben Ihre Handynummer ein und bestätigen die Zahlung direkt in der App. Die Zahlung wird sofort verbucht – schnell, sicher und ohne Kartendaten.</p>
<h2>Wie funktioniert Klarna – Kauf auf Rechnung?</h2>
<p>Mit Klarna erhalten Sie Ihre Bestellung zuerst und bezahlen danach. Sie können den Rechnungsbetrag innerhalb der von Klarna gesetzten Frist begleichen oder in Raten aufteilen. Die Bonitätsprüfung und Abwicklung erfolgen direkt über Klarna. Es gelten die Bedingungen von Klarna, die Ihnen im Checkout angezeigt werden.</p>
<h2>Was ist 3-D-Secure?</h2>
<p>Bei Kartenzahlungen kommt 3-D-Secure zum Einsatz (z. B. Visa Secure oder Mastercard Identity Check). Dabei bestätigen Sie die Zahlung zusätzlich über Ihre Bank – meist per App oder SMS-Code. So wird sichergestellt, dass wirklich Sie die Zahlung auslösen, und Sie sind vor Missbrauch geschützt.</p>
<h2>Sind meine Kartendaten bei Ihnen sicher?</h2>
<p>Ja. Ihre Kreditkartendaten werden ausschliesslich verschlüsselt an unseren Zahlungsdienstleister übermittelt und dort verarbeitet. LuxeStyle speichert und sieht Ihre vollständigen Kartendaten zu keinem Zeitpunkt. Wir geben Ihre Zahlungsdaten nicht an Dritte weiter.</p>
<h2>Wie werden meine persönlichen Daten geschützt?</h2>
<p>Wir verarbeiten Ihre Daten nach dem revidierten Schweizer Datenschutzgesetz (revDSG). Ihre Angaben nutzen wir ausschliesslich zur Abwicklung Ihrer Bestellung. Eine Weitergabe erfolgt nur an die für die Lieferung und Zahlung nötigen Partner. Details finden Sie in unserer Datenschutzerklärung.</p>
<h2>Noch Fragen?</h2>
<p>Schreiben Sie uns – wir helfen Ihnen gerne persönlich weiter und geben Ihnen ehrliche Antworten.</p>` },

 { handle:'faq-rueckgabe-umtausch', title:'Rückgabe & Umtausch – FAQ',
   tt:'FAQ Rückgabe & Umtausch – 30 Tage Rückgaberecht | LuxeStyle',
   dt:'Alles zu Rückgabe, Umtausch und Rückerstattung bei LuxeStyle: 30 Tage Zeit, einfache Rücksendung, faire Abwicklung. Ehrliche Antworten für deinen Einkauf in der Schweiz.',
   body:`<h1>Rückgabe & Umtausch – häufige Fragen</h1>
<p>Wir möchten, dass du mit deiner Bestellung rundum zufrieden bist. Passt einmal etwas nicht, ist die Rückgabe bei LuxeStyle unkompliziert. Hier findest du ehrliche Antworten auf die wichtigsten Fragen.</p>
<h2>Habe ich ein Rückgaberecht?</h2>
<p>Ja. Du hast <strong>30 Tage</strong> ab Erhalt deiner Ware Zeit, Artikel an uns zurückzusenden – ohne Angabe von Gründen. Massgebend ist das Datum, an dem du das Paket erhalten hast.</p>
<h2>Wie sende ich einen Artikel zurück?</h2>
<p>Melde deine Rückgabe zuerst per E-Mail bei uns an (Kontakt siehe unten). Du erhältst von uns die Rücksende-Adresse und alle Schritte. Verpacke den Artikel sicher, lege den Lieferschein oder die Bestellnummer bei und sende das Paket über die Schweizerische Post an uns zurück. Bitte beachte: Die Kosten für die Rücksendung trägst du selbst, ausser der Artikel war fehlerhaft oder wir haben etwas Falsches geliefert.</p>
<h2>In welchem Zustand muss die Ware sein?</h2>
<p>Die Artikel sollten <strong>ungetragen, ungewaschen und vollständig</strong> sein – mit allen Etiketten und, wenn möglich, in der Originalverpackung. Anprobieren ist selbstverständlich in Ordnung. Zeigt ein Artikel deutliche Gebrauchsspuren, können wir die Rückgabe leider nicht annehmen.</p>
<h2>Wie lange dauert die Rückerstattung?</h2>
<p>Sobald deine Rücksendung bei uns eingetroffen und geprüft ist, erstatten wir den Betrag. Wir bearbeiten deine Rückgabe innert weniger Tage. Die Gutschrift erfolgt auf dasselbe Zahlungsmittel, mit dem du bezahlt hast; je nach Bank oder Anbieter kann es einige Werktage dauern, bis der Betrag sichtbar ist.</p>
<h2>Kann ich eine andere Grösse oder Farbe umtauschen?</h2>
<p>Einen direkten Umtausch bieten wir aktuell nicht an. Am schnellsten geht es so: Du sendest den nicht passenden Artikel zurück und bestellst die gewünschte Grösse oder Farbe einfach neu. So ist dein Wunschartikel gesichert, solange er verfügbar ist.</p>
<h2>Gibt es Ausnahmen?</h2>
<p>Von der Rückgabe ausgeschlossen sind aus hygienischen Gründen bestimmte Artikel wie Ohrschmuck sowie <strong>personalisierte oder individuell angefertigte Produkte</strong>, sofern das Siegel geöffnet oder die Personalisierung bereits ausgeführt wurde. Bei Fragen melde dich vorab gerne bei uns.</p>
<h2>Wie erreiche ich euch?</h2>
<p>Schreib uns per E-Mail an <a href="mailto:support@luxestyle.ch">support@luxestyle.ch</a>. Wir antworten dir so rasch wie möglich und begleiten dich durch die Rückgabe.</p>` },

 { handle:'faq-schmuck-pflege-material', title:'Schmuck-Pflege & Material – FAQ',
   tt:'Schmuck-Pflege & Material FAQ | Edelstahl 316L | LuxeStyle',
   dt:'Wie pflege ich wasserfesten Edelstahl-Schmuck? Alle Antworten zu 316L, PVD-Vergoldung, hypoallergen & Pflege. Ehrliche Materialfakten von LuxeStyle Schweiz.',
   body:`<p>Damit du lange Freude an deinem Schmuck hast, findest du hier ehrliche Antworten zu Material und Pflege. Keine Versprechen, die wir nicht halten – nur korrekte Fakten.</p>
<h2>Ist Edelstahl 316L wirklich wasserfest?</h2>
<p>Ja. Chirurgischer Edelstahl 316L ist rostfrei und läuft im Alltag nicht an. Du kannst ihn beim Händewaschen, beim Duschen und beim Schwimmen tragen. Chlor- und Salzwasser sind kein Problem, solange du den Schmuck danach mit klarem Wasser abspülst und trocknest – so bleiben Glanz und Farbe am längsten erhalten.</p>
<h2>Was bedeutet PVD-Vergoldung?</h2>
<p>PVD (Physical Vapour Deposition) ist ein Verfahren, bei dem eine sehr dünne, harte Goldschicht im Vakuum fest mit dem Edelstahl verbunden wird. Diese Beschichtung ist deutlich widerstandsfähiger als klassische Galvanik und hält bei normaler Pflege lange. Wie jede Beschichtung nutzt sie sich mit den Jahren ab – schonende Behandlung verlängert die Lebensdauer.</p>
<h2>Ist der Schmuck hypoallergen?</h2>
<p>316L-Edelstahl ist nickelarm und gilt als hautfreundlich. Die meisten Menschen mit empfindlicher Haut vertragen ihn gut. Bei bekannter, starker Nickelallergie empfehlen wir, die Verträglichkeit zuerst vorsichtig zu testen.</p>
<h2>Wie pflege ich meinen Schmuck richtig?</h2>
<p>Ganz einfach: gelegentlich mit lauwarmem Wasser und einem weichen Tuch abspülen, danach trocken tupfen. Bewahre die Stücke trocken und einzeln auf, damit sie sich nicht verkratzen.</p>
<h2>Was verträgt Schmuck nicht?</h2>
<ul>
  <li><strong>Parfum, Crème & Haarspray zuerst auftragen</strong>, danach den Schmuck anlegen – Chemikalien greifen Beschichtungen an.</li>
  <li>Nach <strong>Chlor- oder Salzwasser</strong> immer mit klarem Wasser abspülen.</li>
  <li>Nicht mit aggressiven Reinigungsmitteln oder Ultraschall behandeln.</li>
</ul>
<h2>Worin unterscheidet sich 316L von vergoldetem Messing oder Silber?</h2>
<p>Vergoldetes Messing läuft über die Zeit an und die Goldschicht ist meist dünner. Silber oxidiert und wird dunkel, wenn es nicht regelmässig poliert wird. Edelstahl 316L mit PVD bleibt bei einfacher Pflege länger unverändert – ideal für den täglichen Gebrauch.</p>
<p><a href="/collections/wasserfester-schmuck"><strong>Jetzt wasserfesten Schmuck entdecken →</strong></a></p>
<p><em>Gratis-Versand ab CHF 50 · 30 Tage Rückgabe</em></p>` },

 { handle:'groessen-material-guide', title:'Grössen- & Material-Guide',
   tt:'Grössen- & Material-Guide | LuxeStyle Schweiz',
   dt:'Ihr Grössen- und Material-Guide von LuxeStyle: Konfektionsgrössen, Ringgrösse, Kettenlängen und Materialien einfach erklärt. So finden Sie die richtige Wahl.',
   body:`<h2>Grössen- & Material-Guide</h2>
<p>Damit Ihre Bestellung auf Anhieb passt, haben wir die häufigsten Fragen zu Grössen und Materialien für Sie zusammengestellt. Die Zahlen sind gängige Orientierungswerte und dienen als Anhaltspunkt – sie ersetzen kein Nachmessen. Prüfen Sie im Zweifel immer die Angaben auf der jeweiligen Produktseite, da die Passform je nach Schnitt und Modell abweichen kann.</p>
<h3>Wie finde ich meine Konfektionsgrösse (XS–XL)?</h3>
<p>Messen Sie mit einem Massband Brust, Taille und Hüfte an der breitesten Stelle. Als grobe Orientierung für Damenmode:</p>
<ul>
  <li><strong>XS</strong> – Brust ca. 78–82 cm, Taille ca. 60–64 cm, Hüfte ca. 84–88 cm</li>
  <li><strong>S</strong> – Brust ca. 82–86 cm, Taille ca. 64–68 cm, Hüfte ca. 88–92 cm</li>
  <li><strong>M</strong> – Brust ca. 86–90 cm, Taille ca. 68–72 cm, Hüfte ca. 92–96 cm</li>
  <li><strong>L</strong> – Brust ca. 90–95 cm, Taille ca. 73–78 cm, Hüfte ca. 97–102 cm</li>
  <li><strong>XL</strong> – Brust ca. 95–100 cm, Taille ca. 79–84 cm, Hüfte ca. 103–108 cm</li>
</ul>
<p>Diese Werte sind Richtwerte zur Orientierung, keine exakte Tabelle.</p>
<h3>Soll ich im Zweifel grösser oder kleiner wählen?</h3>
<p>Liegen Sie zwischen zwei Grössen, empfehlen wir bei lockeren Schnitten, Strick und Oberteilen eher die grössere Grösse für mehr Tragekomfort. Wünschen Sie eine körpernahe Passform, wählen Sie die kleinere. Achten Sie zusätzlich auf das Material: Baumwolle und Leinen fallen meist etwas fester aus, elastische Stoffe geben nach.</p>
<h3>Wie bestimme ich meine Ringgrösse?</h3>
<p>Die Ringgrösse entspricht dem <strong>Innenumfang in Millimetern</strong>. Legen Sie einen gut passenden Ring auf ein Lineal und messen Sie den inneren Durchmesser, oder umwickeln Sie den Finger mit einem Papierstreifen und messen den Umfang. Beispiel: ein Innenumfang von 54 mm entspricht der Grösse 54. Messen Sie am besten abends, wenn die Finger etwas grösser sind.</p>
<h3>Welche Kettenlänge sitzt wo?</h3>
<ul>
  <li><strong>40 cm</strong> – sitzt eng am Hals (Choker-Nähe), knapp unter dem Hals.</li>
  <li><strong>45 cm</strong> – die klassische Länge, liegt am Schlüsselbein.</li>
  <li><strong>50 cm</strong> – fällt auf das Dekolleté, gut sichtbar über dem Ausschnitt.</li>
</ul>
<h3>Aus welchen Materialien bestehen die Produkte?</h3>
<p><strong>Edelstahl 316L</strong> ist rostfrei, hautfreundlich und nickelarm – ideal für den täglichen Gebrauch. <strong>PVD-Beschichtung</strong> ist eine besonders widerstandsfähige Veredelung, die Farbe (z. B. Goldton) länger erhält als herkömmliche Vergoldung. Bei Mode setzen wir auf natürliche Fasern wie <strong>Baumwolle</strong> (weich, atmungsaktiv) und <strong>Leinen</strong> (leicht, kühlend im Sommer). Die genaue Materialzusammensetzung finden Sie jeweils auf der Produktseite.</p>
<p>Noch unsicher? Schreiben Sie uns – wir helfen Ihnen gerne bei der Auswahl der richtigen Grösse.</p>` },
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
