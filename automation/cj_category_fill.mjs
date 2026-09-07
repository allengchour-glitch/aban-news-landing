#!/usr/bin/env node
/* cj_category_fill.mjs — allgemeiner CJ-Import mit ECHTEN Produktnamen (Gemini→DE-Titel+Beschreibung).
 * CJ-Kategorie-Browse → product/query (echter Name, Bilder, Preis) → Gemini DE-Titel+Galaxus-Beschreibung
 * (grounded, nichts erfinden) → productSet+Media+Publish(6 Kanäle) → Ledger. Dedup dropship/cj_niche_done.txt.
 * ENV: CJ_TOKEN · SHOPIFY_CLIENT_ID/SECRET · GEMINI(/tmp/gemini_key) · GRP=nagel · CAP=40 · DRY=1
 */
import fs from 'node:fs';
import { istKlinge } from './klingenregel.mjs';
import { schonBeansprucht } from './cj_claim.mjs';
import {googleKategorie} from './google_kategorie.mjs';
import {materialKanonisch} from './material_kanonisch.mjs';
import { produktSaeubern } from './marken_filter.mjs';
import { medizinZweck } from './medizin_zweck.mjs';
import { tierschutzGeraet } from './tierschutz_geraet.mjs';
import { heikelZweck } from './heikel_zweck.mjs';
// ⚠️ 21.08.2026: Diese Zeile FEHLTE, während `echoVomLieferanten` an drei Stellen (708/710/714)
// schon aufgerufen wurde. Folge: `ReferenceError: echoVomLieferanten is not defined` beim
// Start — der Importer starb VOR dem Anlegen, also legte der CJ-Grind gar nichts mehr an,
// und die Runner deuteten den RC≠0 wie immer als Punktemangel und schliefen. Die Funktion
// war korrekt exportiert und gegen 8'629 Titel geprüft; nur der Import wurde vergessen.
import { echoVomLieferanten } from './titel_sprache.mjs';
import { technikWache } from './technik_plausibel.mjs';
import { produktdetails } from './cj_specs.mjs';
import { copyPrompt, messSicher, wirkSicher} from './cj_copy_prompt.mjs';
import { groqText } from './groq_text.mjs';
const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const CJT=(process.env.CJ_TOKEN||'').trim();
const GK=(fs.existsSync('/tmp/gemini_key')?fs.readFileSync('/tmp/gemini_key','utf8'):process.env.GEMINI_API_KEY||'').trim();
const DRY=process.env.DRY==='1', CAP=parseInt(process.env.CAP||'40',10);
const LEDGER='dropship/cj_niche_done.txt';
import { publishVerified as _publishVerified, PUBS, GOOGLE_PUB } from './cj_publish.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const chf=(usd,grams)=>{const u=parseFloat((''+usd).split('--')[0])||0;
 // 2026-08-03: China→CH-Fracht REAL ~CHF 15 (Order #1011: $15.77) — MUSS in den Preis, sonst Verlust bei billiger Ware!
 const kg=(parseFloat(grams)||0)/1000;
 // Kunde zahlt CHF 7 Versand unter Gratis-Schwelle → nur die Fracht-LÜCKE (Fracht - 7) in den Preis
 const freight=Math.max(15, 3.4+16.3*kg);       // reale Fracht CHF
 const gap=Math.max(0, freight-7);              // vom Preis zu deckende Fracht-Lücke (~CHF 8 leicht)
 const landed=u*0.9+gap;                        // Kosten die der Produktpreis tragen muss
 // ⚠️ 20.08.2026 — DIE ALTE MARGE WAR SYSTEMATISCH ZU KNAPP: `landed+5`.
 // `landed` trägt nur die Fracht-LÜCKE (freight−7), die VOLLEN Stückkosten sind `landed+7`.
 // Der Aufschlag von 5 lag also 2 Franken UNTER den Kosten, sobald der Kunde keine
 // Versandpauschale zahlt. Genau das passiert ab CHF 50 Warenwert (Gratis-Versand) — und
 // der automatische «2+ Artikel −10 %» trifft dieselben Warenkörbe ein zweites Mal.
 // Durchgerechnet an echten Kostendaten (665 Varianten, erstmals vorhanden am 20.08.):
 //   EK $3 / 0,3 kg → Preis 15.90, Kosten 17.70 → mit Versandbeitrag +5.20,
 //   bei Gratis-Versand −1.80, mit Rabatt −3.39. Von 665 Varianten standen 200 unter Einstand.
 // Der Aufschlag deckt jetzt die vollen Kosten UND hält dem 10-%-Rabatt stand:
 // gefordert ist p·0,9 ≥ Kosten·1,05, also p ≥ (landed+7)·1,167.
 let p=Math.max(landed*1.4, landed*1.167+8.2, 16.90);
 return (Math.floor(p)+0.90).toFixed(2);};

// ⚠️ KOSTEN MITSCHREIBEN (20.08.2026). Die Rechnung oben KENNT den Einkaufspreis — sie hat ihn
// bisher nur weggeworfen. Folge: Shopifys «Kosten pro Artikel» war bei 86 % der Produkte leer,
// und damit konnte NIEMAND sagen, ob eine Bestellung Gewinn bringt. Bei Order #1011 (Hängematte
// CHF 14.90 + CHF 7 Versand) ist das keine akademische Frage.
// Definition: Warenkosten + VOLLE Fracht. Die CHF 7, die der Kunde für den Versand zahlt, sind
// Erlös und stehen in der Bestellung — sie gehören nicht in die Stückkosten, sonst rechnet sich
// die Marge künstlich schön (genau das täte der `landed`-Wert oben, der nur die Fracht-LÜCKE trägt).
// ⚠️ DAS GEWICHT WURDE BISHER WEGGEWORFEN (22.08.2026). chf() und kosten() lesen es von CJ
// und rechnen die Fracht daraus — geschrieben wurde es nie. Ergebnis: 45'700 von 45'741
// aktiven Produkten stehen in Shopify auf Gewicht 0. Damit ist weder eine gewichtsbasierte
// Versandregel moeglich noch die Frage «welche Ware ist schwer?» beantwortbar — und genau
// das Gewicht entscheidet ueber Gewinn oder Verlust (Fracht gemessen: $6.34 · $9.49 · $19.35).
// Exakt dasselbe Muster wie beim Einkaufspreis vor dem 20.08.: bekannt, benutzt, verworfen.
const gewicht=(grams)=>{const g=parseFloat(grams)||0;
  return g>0?{measurement:{weight:{value:g,unit:'GRAMS'}}}:{};};

const kosten=(usd,grams)=>{const u=parseFloat((''+usd).split('--')[0])||0;
 const kg=(parseFloat(grams)||0)/1000;
 const freight=Math.max(15, 3.4+16.3*kg);
 return (u*0.9+freight).toFixed(2);};

// ── Fashion-Modus (Zalando-Stil): CJ-Varianten "Farbe-Grösse" → Shopify Farbe+Grösse-Optionen ──
// Farbtabelle liegt seit 21.08.2026 in automation/farben_de.mjs — es gab drei
// Kopien, und die kleinste kannte «dark gray» nicht (51 Produkte mit «Dark Gray»
// im Farbwaehler). Neue Farben NUR dort nachtragen.
import { FARBEN as DECOLOR, deColor } from './farben_de.mjs';
import { titelMitMenge } from './stueckzahl.mjs';
import { SIZESET, SORDER } from './cj_groessen.mjs';
import { slugStamm, laufSlugs } from './cj_dublette.mjs';
import { snippet } from './cj_snippet.mjs';   // Google-Suchergebnis-Text, EINE Quelle
// Grössen kommen aus automation/cj_groessen.mjs — dort und NUR dort ergänzen.
// ⚠️ CJ stellt der Farbe oft seinen Artikelcode voran: «A039 Black», «E7916 White»,
// «Ts3018 Pink» — und der stand danach im Farb-Dropdown, wo die Kundin ihn anklicken MUSS
// (2026-08-20, 151 aktive Produkte betroffen). `istCode` fing das nicht ab, weil es nur
// Werte prüft, die GANZ aus einem Code bestehen. Deshalb hier: Code-Token am Anfang oder
// Ende abschneiden, dann erst übersetzen.
// ⚠️ Kein Bindestrich im Token — «Beige-110v» (Spannung), «Yellow Bunny-100» (Grösse) und
// «Black-240D» sind Angaben, keine Artikelnummern. Kein Kleinbuchstaben-Start («tube24v»),
// keine Masseinheit hinter der Zahl, und der Buchstabenteil darf kein Farbwort sein.
const CODETOKEN=/^[A-Z][A-Za-z]{0,9}\d{2,7}[A-Za-z]?$/;
const CODEEINHEIT=/\d+(?:v|w|ml|cm|mm|kg|g|db|hz|mah|a|k)$/i;
const istCodeToken=t=>CODETOKEN.test(t)&&!CODEEINHEIT.test(t)
  &&!/^(?:UV\d{3}|TR\d{2}|RF\d{3}|SR\d{3,4}|IP\d{2}|CR\d{4}|LR\d{2,4}|AG\d{1,2}|20\d{2})$/i.test(t)
  &&!DECOLOR[(t.match(/^[A-Za-z]+/)||[''])[0].toLowerCase()];
const ohneCode=c=>{const p=(c||'').trim().split(/\s+/); if(p.length<2)return (c||'').trim();
  if(istCodeToken(p[0]))return p.slice(1).join(' ');
  if(istCodeToken(p[p.length-1]))return p.slice(0,-1).join(' ');
  return (c||'').trim();};
// Die Code-Entfernung darf nur greifen, wenn danach ALLE Farben verschieden bleiben:
// «A63 Black» und «A65 Black» würden sonst beide zu «Schwarz» — der Varianten-Dedup unten
// wirft eine der beiden weg, und ein kaufbarer Artikel verschwindet. Lieber der Code als
// eine verlorene Variante (dieselbe Regel wie im Bestandsreiniger: Kollision → gar nichts).
const codeMap=colors=>{const neu=colors.map(c=>deColor(ohneCode(c)));
  if(neu.some(x=>!x)||new Set(neu).size!==colors.length)return null;
  return neu.every((x,i)=>x===colors[i])?null:new Map(colors.map((c,i)=>[c,neu[i]]));};
// Reine Buchstabengrösse — strenger als isSize(), weil dieser Test auch auf den VORDEREN
// Teil eines variantKey angewendet wird («S-Weiss»). «3L» wäre dort 3 Liter (E-Scooter-
// Falttasche) und «10 M» 10 Meter, deshalb Ziffer-Formen nur mit X (14.08.2026).
const LETTERSIZE=/^(?:[0-9]X{1,5}[SL]|X{1,5}[SL]|S|M|L)$/i;
// Körper-/Schuhgrösse in cm («90cm», «73CM») ist bei CJ-Kinderware der Normalfall.
const CMSIZE=/^(\d{2,3})\s*cm$/i;
const isSize=s=>{const u=(s||'').trim().toUpperCase();return SIZESET.has(u)||CMSIZE.test(u)||/^\d{1,2}$/.test(u)||/^(EU|US|UK)?\s?\d{2}$/.test(u);;};
// «FREE SIZE»/«ONE SIZE» ist die Lieferantenformulierung. Im Schweizer Handel heisst das
// «Einheitsgrösse»; «Free Size» liest sich auf Deutsch sogar wie «Grösse gratis» (14.08.2026).
const EINHEITSGROESSE=new Set(['ONE SIZE','ONESIZE','FREE SIZE','FREESIZE','F']);
const deSize=s=>{const t=(s||'').trim(),u=t.toUpperCase();const cm=t.match(CMSIZE);
 return EINHEITSGROESSE.has(u)?'Einheitsgrösse':(cm?(+cm[1])+' cm':u);};
// CJ übersetzt das chinesische 码 (= Grösse) wörtlich mit «yards»: «Gold-17 Yards» ist die
// Schuhgrösse 17, «Gray-160 Yards» die Körpergrösse 160 cm. Die Ziffern MÜSSEN unmittelbar vor
// dem Wort stehen — sonst greift das Muster in «Vineyard» und «lanyard» (14.08.2026).
const YARDS=/^(.*?)[\s\-–]*(\d+)(?:\s*(?:to|or)\s*(\d+))?\s*yards?$/i;
const numOf=s=>{const m=String(s||'').match(/\d+/);return m?+m[0]:null;};
// Eine Farb-Option, in der JEDER Wert eine reine Lieferanten-Artikelnummer ist («JM721»,
// «MK1578»), ist keine Farbe. Die Kundin wählt dort blind zwischen fremden Codes.
const CODE=/^[A-Za-z][A-Za-z0-9]{2,17}$/;
// «1Style», «Style 1», «No 7», «Color 2», «29 Models» — kein Deutsch, keine Farbe; die Zahl ist
// die Entwurfsnummer des Lieferanten. Wortweise «Modell N» bzw. «Farbton N» (14.08.2026).
const ZAEHL=/^(?:(?:no\.?|nr\.?|colou?r|style|models?|figure|patterns?|design)\s*[-. ]?\s*(\d{1,3})|(\d{1,3})\s*[-. ]?\s*(?:style|models?|figure|colou?r|patterns?|design))$/i;
const istZaehl=v=>ZAEHL.test((v||'').trim());
// ⚠️ CJ hängt an den Code oft noch ein Grössenkürzel: «HQ24799-XXS» neben «HQ24799».
// Ohne diese Form fiel das «Karierte Hemd» durch die Code-Erkennung und stand mit 14
// Lieferantencodes im Farb-Dropdown (2026-08-20).
const CODEGR=/^([A-Za-z][A-Za-z0-9]{2,17})-(?:XXS|XS|S|M|L|XL|XXL|XXXL|[2-6]XL)$/i;
const istCode=v=>{const t0=(v||'').trim(),mg=t0.match(CODEGR),t=mg?mg[1]:t0;return CODE.test(t)&&(t.match(/\d/g)||[]).length>=2
  &&!/(xs|s|m|l|xl|xxl|xxxl)$/i.test(t)
  &&!/(gb|tb|mb|mah|ma|mm|cm|ml|kg|pcs|pc|pack|ports|inch|yards?|frequency|style|model|color|size|no)/i.test(t)
  &&!/(black|white|red|blue|green|yellow|grey|gray|pink|purple|brown|beige|gold|silver|orange|navy|khaki)/i.test(t);};

// Ist der Wert eine brauchbare Farbangabe für Google? Ziffern, Stück-/Stilwörter und
// Grössen-Präfixe beweisen das Gegenteil («Black-1XL», «Style 1-1 PC», «Picture Color»).
// Ein leeres Farbfeld kostet im Feed nichts, ein falsches macht die Ware unauffindbar.
const farbeSauber=c=>{const t=(c||'').trim();return !!t&&t.length<=40
  &&!/\d|\bStyle\b|\bPCS?\b|\bpair\b|\bSet\b|\bYards?\b|\bcm\b|\bmm\b|\bml\b|\bInch\b|\btype\b|Picture\s*Color|Random|Assorted/i.test(t)
  &&!/^(?:XXS|XS|S|M|L|XL|XXL)\s*[-–\/]/i.test(t);};
// ⚠️ Der CJ-variantKey trägt die Grösse NICHT immer hinten. Bis 14.08.2026 wurde nur am
// LETZTEN Bindestrich gespalten und nur der hintere Teil auf eine Grösse geprüft — «S-Weiss»
// fiel dadurch komplett als «Farbe» durch. Ergebnis: 262 aktive Produkte mit einem einzigen
// Dropdown «Farbe», in dem die Kundin ihre Grösse suchen musste (beim Yoga-Tanktop 44
// Einträge statt 4 Grössen × 11 Farben). Jetzt drei Formen: Farbe-Grösse, GRÖSSE-Farbe und
// Farbe-GRÖSSE-Ausführung («Beige-L-Vest»). «M» mit Ziffer davor bleibt Meter, keine Grösse.
const METERKEY=/\d\s*[.,x×]?\s*\d*\s*M\b/i;
function parseVar(v){const k=(v.variantKey||'').trim();const i=k.lastIndexOf('-');let color=null,size=null,extra=null;
 const ym=k.match(YARDS);
 const p3=k.split('-').map(x=>x.trim());
 if(ym){color=ym[1].trim()||null;size='Gr. '+ym[2]+(ym[3]?'/'+ym[3]:'');}
 else if(p3.length===3&&p3.every(Boolean)&&LETTERSIZE.test(p3[1])&&!METERKEY.test(k)){
   color=p3[0];size=deSize(p3[1]);extra=p3[2];}
 else if(i>0){const a=k.slice(0,i).trim(),b=k.slice(i+1).trim();
   const j=k.indexOf('-'),a1=k.slice(0,j).trim(),b1=k.slice(j+1).trim();
   if(isSize(b)){color=a;size=deSize(b);}
   else if(LETTERSIZE.test(a1)&&b1.length>1&&!/^\d/.test(b1)&&!METERKEY.test(k)){size=deSize(a1);color=b1;}
   else color=k;}
 else if(isSize(k))size=deSize(k);else color=k||null;
 return {color:color?deColor(color):null,size:size||null,extra:extra||null,price:v.variantSellPrice||v.variantSellPrice===0?v.variantSellPrice:v.sellPrice,sku:v.variantSku||'',img:(v.variantImage||'').trim()};}
function buildFashion(d){
 const vs=(d.variants||[]).map(parseVar).filter(v=>v.color||v.size); if(!vs.length)return null;
 const colors=[...new Set(vs.map(v=>v.color).filter(Boolean))];
 const sizes=[...new Set(vs.map(v=>v.size).filter(Boolean))].sort((a,b)=>{const ia=SORDER.indexOf(a),ib=SORDER.indexOf(b);if(ia>=0&&ib>=0)return ia-ib;return ((numOf(a)??99)-(numOf(b)??99))||a.localeCompare(b);});
 const useC=colors.length>1||(colors.length===1&&!sizes.length), useS=sizes.length>0;
 // Reine Lieferanten-Artikelnummern sind keine Farbe: Option «Ausführung», Werte «Modell N»
 // in der Reihenfolge der Bildergalerie. Sonst steht der fremde Code im Kaufbereich und die
 // Kundin wählt blind zwischen «JM721» und «JM722» (14.08.2026).
 const sMap=useC?codeMap(colors):null;                 // «A039 Black» → «Schwarz»
 const eff=colors.map(c=>sMap?sMap.get(c):c);          // was die Kundin am Ende sähe
 const codeOpt=useC&&eff.filter(istCode).length>=2
   &&eff.every(c=>istCode(c)||LETTERSIZE.test(c));
 const zaehlOpt=useC&&!codeOpt&&eff.length>=2&&eff.every(istZaehl);
 // Steht in JEDEM Wert «Color», ist es doch eine Farbwahl — nur unbenannt: «Farbton N».
 // Was als Konfektionsgrösse in den Google-Feed darf. Bewusst eng: Massangaben («25x150cm»),
// Modellnummern und kombinierte Etiketten («S M») sind KEINE Grösse — eine falsche Angabe ist
// schlechter als keine (dieselbe Regel wie bei farbeSauber und beim Material).
const GROESSE_OK=/^(?:[0-9]?X{0,5}(?:S|M|L)|XXS|XS|[0-9]{1,3}(?:[.,][05])?|[0-9]{2,3}\s?cm|[0-9]{1,2}\s?(?:Y|J(?:ahre)?|M(?:onate)?)|EU\s?[0-9]{2}|US\s?[0-9]{1,2}|UK\s?[0-9]{1,2}|One\s?Size|Einheitsgr[\u00f6o]sse|Freie\s?Gr[\u00f6o]sse)$/i;
const groesseSauber=w=>!!w&&GROESSE_OK.test(String(w).trim());
const nurFarbe=zaehlOpt&&eff.every(c=>/colou?r/i.test(c));
 const cName=(codeOpt||(zaehlOpt&&!nurFarbe))?'Ausführung':'Farbe';
 const cMap=(codeOpt||zaehlOpt)
   ?new Map(colors.map((c,i)=>[c,(nurFarbe?'Farbton ':'Modell ')+(i+1)])):sMap;
 const cVal=c=>cMap?(cMap.get(c)||c):c;
 // Dreiteilige variantKeys («Beige-L-Vest», «Blue-M-Thin») tragen hinten eine echte Wahl.
 // Ohne eigene Option würden «…-Thin» und «…-Thick» beim Dedup zu EINER Variante verschmelzen —
 // die Kundin verlöre die Wahl, statt sie besser zu sehen (14.08.2026).
 const extras=[...new Set(vs.map(v=>v.extra).filter(Boolean))];
 const useE=extras.length>1&&useC&&useS;              // Shopify erlaubt höchstens 3 Optionen
 const eName=cName==='Ausführung'?'Variante':'Ausführung';
 const opts=[]; if(useC)opts.push({name:cName,values:colors.map(cVal)}); if(useS)opts.push({name:'Grösse',values:sizes});
 if(useE)opts.push({name:eName,values:extras});
 if(!opts.length)return null;
 const seen=new Set(),variants=[],bilder={};
 for(const v of vs){const ov=[]; if(useC)ov.push({optionName:cName,name:cVal(v.color||colors[0])}); if(useS)ov.push({optionName:'Grösse',name:v.size||sizes[0]}); if(useE)ov.push({optionName:eName,name:v.extra||extras[0]});
  const key=ov.map(x=>x.name).join('|'); if(seen.has(key))continue; seen.add(key);
  // ⚠️ FARBE GEHÖRT AN DIE VARIANTE, sobald es mehr als eine gibt (14.08.2026).
  // Das Produkt-Metafeld `color` liegt auf PRODUKTebene; im Google-Feed ist aber jede
  // Variante ein eigenes Angebot und erbt diesen einen Wert. So meldeten 9'866 Produkte
  // ihre 220'526 Varianten alle in der Farbe der ERSTEN — der rote Hoodie stand als
  // «Schwarz» im Feed und tauchte im Farbfilter «Rot» nie auf.
  const vmf=[];
  const gFarbe=(!codeOpt&&!zaehlOpt&&sMap)?(sMap.get(v.color)||v.color):v.color;
  if(useC&&colors.length>1&&farbeSauber(gFarbe))
    vmf.push({namespace:'mm-google-shopping',key:'color',value:gFarbe,type:'single_line_text_field'});
  // 📏 UND DIE GRÖSSE GENAUSO (28.08.2026). Google verlangt bei Bekleidung und Schuhen das
  // Attribut `size`; ohne das wird das Angebot in Shopping-Ergebnissen beschnitten — im
  // einzigen Kanal mit belegten Verkäufen. Dieselbe Begründung wie bei color: an die
  // VARIANTE, weil jede im Feed ein eigenes Angebot ist. ⚠️ `size_system`/`size_type`
  // bleiben leer — die Ware ist asiatisch konfektioniert, ein «EU» wäre eine Falschangabe.
  const gGroesse=useS?(v.size||sizes[0]):null;
  if(gGroesse&&groesseSauber(gGroesse))
    vmf.push({namespace:'mm-google-shopping',key:'size',value:gGroesse,type:'single_line_text_field'});
  const sku=('CJ-'+(v.sku||'')).slice(0,70);
  // 🎨 DAS BILD DER VARIANTE MITNEHMEN (14.08.2026). CJ liefert zu jeder Variante ein
  // `variantImage` — im SELBEN Aufruf, der schon geholt wird, also ohne einen einzigen
  // zusätzlichen Punkt. Bisher wurde es weggeworfen: die Kundin schaltet auf «Aprikose»
  // und sieht weiterhin dasselbe Bild (Befund des Betreibers am «Midikleid mit
  // Zopfmuster»). ⚠️ Und die naheliegende Notlösung — die Farbe aus dem Bild MESSEN und
  // durchzählen — ist nachweislich falsch: im Probelauf von `variantenbild.py` wurden 2
  // von 2 Bildern falsch zugeordnet (ein schwarzes Portemonnaie als «Dunkelblau», weil
  // der unscharfe Hintergrund blau war). Der Lieferant weiss es, wir müssen nicht raten.
  if(v.img&&/^https/.test(v.img)) bilder[sku]=v.img;
  variants.push({optionValues:ov,price:chf(v.price, v.weight||v.variantWeight),inventoryItem:{sku,tracked:false,cost:kosten(v.price, v.weight||v.variantWeight),...gewicht(v.weight||v.variantWeight)},inventoryPolicy:'CONTINUE',...(vmf.length?{metafields:vmf}:{})});
  if(variants.length>=100)break;}

 // 💥 PREIS-AUSREISSER-WACHE (21.08.2026 — teuer gefunden an der «Sommer Fashion
 // Strand-Sandale» 15503948120449). CJ liefert je Variante einen eigenen Preis, und der
 // wurde bisher UNGEFILTERT übernommen. Ergebnis live: dieselbe Sandale, dieselbe Farbe,
 // kostete in Grösse 37 **CHF 1'332.90** und in Grösse 36/39/40/41 CHF 65.90 — das
 // Zwanzigfache, ACTIVE und in ALLEN sechs Kanälen inkl. Google & YouTube publiziert.
 // Die Kollektionsseite meldete daraufhin «Der höchste Preis ist CHF 1,332.90» und
 // verzerrte den Preisfilter der ganzen Sandalen-Kollektion. Der Fehler ist NICHT
 // einmalig: das Produkt entstand am 19.08. aus dem laufenden Grind, dieselbe Bauart
 // fand sich am «Seiden-Bettwäsche-Set» (66.90 vs. 500.90 für eine Bettbreite mehr).
 //
 // ⚠️ «Teurer als der Median» ALLEIN ist als Regel FALSCH — im Probelauf hätte sie den
 // «V1SPro Programmer» (15480571494785) zerstört: dort ist das Hauptgerät CHF 361.90 und
 // die Erweiterungsmodule kosten ab CHF 18.90. Der Median liegt bei 28.90, das Hauptgerät
 // wäre auf 28.90 heruntergezogen worden — aus einer Wache wäre ein Millionengrab
 // geworden. Zubehör-Varianten sind ECHTE andere Artikel, kein Datenfehler.
 //
 // Der Unterschied ist die LÜCKE, nicht der Abstand zum Median: Ein Datenfehler springt
 // aus dem Nichts (147.90 → 1'332.90 = 9,0×; 66.90 → 500.90 = 7,5×), eine echte
 // Zubehör-Staffel steigt in Stufen (93.90 → 146.90 → 342.90 → 361.90, grösster Sprung
 // 2,3×). Darum gilt beides zugleich: mehr als 3× Median UND mehr als 4× der
 // nächstkleinere vorkommende Preis. Getroffen wird dann auf den Median gezogen, und das
 // Produkt trägt `preis-ausreisser-korrigiert`, damit die Korrektur auffindbar bleibt.
 let preisFix=0;
 if(variants.length>2){
   const zahl=variants.map(v=>parseFloat(v.price)).filter(x=>x>0).sort((a,b)=>a-b);
   const med=zahl[Math.floor(zahl.length/2)];
   const distinct=[...new Set(zahl)].sort((a,b)=>a-b);
   for(const v of variants){
     const pr=parseFloat(v.price);
     if(!(med>0&&pr>med*3)) continue;
     const drunter=distinct.filter(x=>x<pr).pop();       // nächstkleinerer vorkommender Preis
     if(!(drunter>0&&pr>drunter*4)) continue;            // stufenweise Staffel → echtes Zubehör, NICHT anfassen
     console.log(`  ⚠️ Preis-Ausreisser: ${v.inventoryItem?.sku||''} CHF ${v.price} (Median ${med.toFixed(2)}, darunter ${drunter.toFixed(2)}) → ${med.toFixed(2)}`);
     v.price=med.toFixed(2); preisFix++;
   }
 }
 return {productOptions:opts.map(o=>({name:o.name,values:o.values.map(x=>({name:x}))})),variants,bilder,preisFix};
}

const GROUPS={
 nagel:{cats:[['9F96CE84-962D-4992-81DC-BF79A4A9002D','Nail Gel'],['E157D35B-156B-49F6-A678-7C55D4E81D6C','Nail Dryers'],['EADB666A-12A5-4FA1-AD1F-BC351A7E7AF5','Nail Art Kits'],['26F7660F-A00A-468A-BA29-E61A465C0D0B','Nail Decorations'],['1B1A9B82-1833-4721-88CA-86F5F542D7A5','Nail Glitters'],['25A6516D-3AE3-4207-BA00-6FD3CCE20201','Nail Stickers']],
   type:'Nageldesign', tags:['naegel','nagel','nageldesign','maniküre','beauty','cj-real','dropship'], kat:'Nageldesign & Maniküre',
   ban:/wholesale|\bfor salon only\b/i, minImg:3, minP:2, maxP:70},
 makeup:{cats:[['A30E8F55-DC2C-4842-9372-91B96DEFDCC2','Makeup Brushes'],['426792A7-4906-403D-AD17-8293AFF00E66','Makeup Set'],['8FB2C16C-4C1B-4B5A-89F8-BC30FB2C442A','Eyeshadow'],['B68DF53F-4DD5-4659-A530-66D414CF2147','Lipstick'],['E31E5996-7B86-4FEC-B929-9AEB11E76853','False Eyelashes']],
   type:'Make-up', tags:['makeup','kosmetik','beauty','cj-real','dropship'], kat:'Make-up & Kosmetik',
   ban:/wholesale|salon only|\bsample\b/i, minImg:3, minP:2, maxP:60},
 kueche:{cats:[['E448A723-43DC-4BD8-A9AD-2FB9699338B4','Cooking Tools'],['23ADD7CB-065A-4A02-B8E8-43D3F041B90B','Kitchen Knives'],['CF330457-0E5B-4FAF-9BAE-7D2C247BD8DE','Drinkware'],['BEDFD1CC-E7CC-438F-9050-D7737904203D','Barware']],
   type:'Küche & Bar', tags:['kueche','kochen','haushalt','cj-real','dropship'], kat:'Küche, Bar & Kochen',
   ban:/wholesale|salon only/i, minImg:3, minP:3, maxP:60},
 skincare:{cats:[['EDE3FAD9-0E6C-4F7C-9016-A2299469AA7C','Facial Care'],['88AF62DE-5586-40E4-A287-864523D9AE50','Face Masks'],['E0238E88-0C63-427F-812E-BA1FCE4C67B4','Body Care'],['CB1A9CEF-8333-4D2F-B19A-418C6DE376C7','Essential Oil'],['B6A8B971-793B-4F9E-AA56-3A5D12F63827','Sun Care']],
   type:'Hautpflege', tags:['skincare','hautpflege','beauty','pflege','cj-real','dropship'], kat:'Hautpflege & Gesichtspflege',
   ban:/wholesale|salon only|\bsample\b|injection|needle/i, minImg:3, minP:3, maxP:55},
 gaming:{cats:[['1F23F16D-0A39-4D38-AB9C-1F21EEDEBEDD','Gamepads'],['56892B7E-0C59-4DAB-8336-57C6CA548043','Video Game Consoles'],['A96C59E8-C39A-4C8E-BA75-5B4AA347FCCC','Joysticks'],['2F6CCFAA-853F-41EF-8B91-24028A333948','Handheld Game Players']],
   type:'Gaming-Zubehör', tags:['gaming','ps4','ps5','xbox','konsole','gadgets','cj-real','dropship'], kat:'Gaming & Konsolen-Zubehör (PS4/PS5/Xbox)',
   ban:/wholesale|salon only|\bsample\b/i, minImg:3, minP:3, maxP:80},
 pet:{cats:[['2410110339451623300','Pet Chew Toys'],['2410110339311602900','Pet Chase Toys'],['2410110340161623400','Pet Sound Toys'],['2410110341061612000','Pet Bowls'],['2410110341451628800','Pet Feeding Tools']],
   type:'Haustierbedarf', tags:['haustier','hund','katze','pet','cj-real','dropship'], kat:'Haustierbedarf für Hund & Katze',
   ban:/wholesale|human|for people/i, minImg:3, minP:2, maxP:50},
 sport:{cats:[['2410301013021610400','Scooters'],['3D0169CF-0F24-4EEA-948E-E48C3980862E','Bicycle Helmets'],['161FA128-487C-4451-8B49-CB81B5A30A54','Bicycle Lights'],['C20B25A2-348C-48C8-A2C8-FE33749A40DE','Fitness & Bodybuilding'],['EA851596-F20F-4AA5-8869-4BB5CA1968DC','Camping & Hiking']],
   type:'Sport & Outdoor', tags:['sport','outdoor','fitness','cj-real','dropship'], kat:'Sport, Fitness & Outdoor',
   ban:/wholesale|\bsample\b/i, minImg:3, minP:3, maxP:90},
 storage:{cats:[['2502140315331600200','Storage Bags & Cases & Boxes'],['56845C3D-4D9E-4729-B5D4-6D7DE310C031','Kitchen Storage'],['B62EE40F-7650-4715-A7A5-BA227540593C','Bathroom Storage'],['A0E89009-FFD6-4B2E-906A-8076DF45B32C','Clothing & Wardrobe Storage'],['87CF251F-8D11-4DE0-A154-9694D9858EB3','Home Office Storage']],
   type:'Aufbewahrung & Organizer', tags:['aufbewahrung','organizer','wohnen','haushalt','cj-real','dropship'], kat:'Aufbewahrung & Organizer',
   ban:/wholesale|\bsample\b|adult/i, minImg:3, minP:2, maxP:50},
 musik:{cats:[['2502140306571605000','Guitars'],['2502140307181607100','Violins'],['2603180848241600400','Steel Tongue Drum']],
   type:'Musikinstrumente', tags:['musik','instrument','hobby','cj-real','dropship'], kat:'Musikinstrumente',
   ban:/wholesale|\bsample\b|zubehör.?set für/i, minImg:3, minP:5, maxP:120},
 cjelektronik:{cats:[['6DB79FAF-593D-4F52-B6FF-AB1D14331862','Charger'],['A0D39205-3770-4F0B-91BD-65E711263577','Batteries'],['D8515A8C-ECAC-422B-9963-14D7B07E10DB','TV Sticks'],['11D33F89-9B90-4D1A-B977-DE229BAA7E86','Wearable Devices'],['895CF515-0F6B-481D-8A32-604EDCBEFBED','Smart Wristbands'],['C83EF2A0-8FA3-4713-9901-2FD6E4554D97','Smart Watches'],['AD21D6F7-42CB-44E7-89B2-542692C7D101','Action Cameras'],['0AC6B44A-12CC-456F-831F-54064C77D303','Projectors'],['C1AB7563-AED4-44D8-9F01-05BD91C65307','Speakers'],['DAECCC3B-13D8-4978-86A8-61D3DF186134','Earphones'],['8FD4CA46-AA88-4CDC-8EBA-EBD8412152E2','Microphones'],['491E5474-524C-4666-BDD7-4E35E38900EA','Power Bank'],['9170B3F9-5B9C-4C39-8CD6-7DC00E481D47','Holders & Stands'],['4D3B9582-E92E-46BF-B00E-715E70FB4742','SSD'],['591E8920-019B-42FA-AE0B-420052E6C4F0','USB Flash Drives'],['7E65A403-CF6E-4B55-96FF-B7C3C376A47A','Memory Cards'],['C62BC6BF-BA2B-41ED-AB12-599A6D7FCAA5','External Hard Drives'],['1F23F16D-0A39-4D38-AB9C-1F21EEDEBEDD','Gamepads'],['2F6CCFAA-853F-41EF-8B91-24028A333948','Handheld Game Players']],
   type:'Elektronik', tags:['elektronik','tech','gadget','cj-real','dropship'], kat:'Elektronik & Technik',
   ban:/wholesale|\bsample\b|replacement part|ersatzteil|kinder|for kids/i, minImg:2, minP:2, maxP:120},
 cjgadgets:{cats:[['EE64B306-1A1F-4879-A080-BF0ACA4400A9','VR & AR Brillen'],['907BBB40-C131-4D3C-BA05-794D47EEBC90','Camera Drones'],['E95322D2-FF23-4837-A0C0-0CA686B9F062','Smart Remote Controls'],['36F73513-6A5A-445D-87F9-BF3D6629E649','Smart Home Appliances'],['599DFE31-C6AD-42D2-93AA-762126BBA475','Home Electronic Accessories'],['76B88FB8-9B37-4B55-AA09-082C5627DFE8','HDD Enclosures']],
   type:'Gadget', tags:['elektronik','gadget','tech','trend','cj-real','dropship'], kat:'Coole Gadgets & Technik',
   ban:/wholesale|\bsample\b|replacement part|ersatzteil|kinder/i, minImg:2, minP:2, maxP:110},
 cjauto:{cats:[['2A64C22F-F04A-4AAA-9C1C-8AF89323FB63','Dashcams'],['C7B399B2-4D26-4363-8062-C6F451DA55B3','Jump Starter'],['B39B6F95-9C89-4D6C-9E98-1633DA6A51CF','GPS Tracker'],['D44C3391-0AF1-455A-A671-29214DA68F27','Auto-Organizer'],['2601070551311618400','Auto-Aromatherapie'],['309854A6-BDC2-4F52-80D8-93E5109B3A53','Schlüssel-Etuis'],['5559DD57-7F12-44BC-9C29-9E9BD1CDB029','Lenkrad-Bezüge'],['00E6FC51-B865-4D50-9EF9-21E7050F5653','Auto-Reinigung'],['77A90826-779B-47DD-AB79-8FEE91AE0A3E','Lack-Pflege']],
   type:'Auto-Zubehör', tags:['auto','kfz','auto-zubehoer','cj-real','dropship'], kat:'Auto-Zubehör (Dashcams, Organizer, Pflege, Starthilfe)',
   ban:/wholesale|\bsample\b|motorcycle|motorrad|brake|bremse|spark plug|exhaust/i, minImg:3, minP:3, maxP:90},
 cjbasteln:{cats:[['EEC881A3-0A55-4BBF-9ADB-EB290116A67A','Diamond Painting'],['C8AA2A38-B339-468F-87D3-AD2DB0697F93','Cross-Stitch'],['93671B1A-DE8F-4398-B139-8B2214206648','Sewing & Fabric'],['D60B979B-3779-47BD-8F55-D17581817273','Ribbons'],['664B9B04-4697-437A-AA46-631EFCC3DF03','Lace'],['2409230854411618700','Decor Paintings']],
   type:'Basteln & DIY', tags:['basteln','diy','handarbeit','kreativ','hobby','cj-real','dropship'], kat:'Basteln, Handarbeit & DIY (Diamond Painting, Sticken, Nähen)',
   ban:/wholesale|\bsample\b|disney|marvel|frozen|spider|barbie|pokemon/i, minImg:3, minP:2, maxP:50},
 cjspielelektronik:{cats:[['6614840A-DB50-4FBB-80FD-705F4FD59BFA','Electronic Pets'],['AEABDF3C-35E9-4BDA-8F5B-DA602BC5B9C8','RC Helicopters'],['835F7743-8432-4D0F-90F0-E76C89F7C5B7','Blocks'],['2F6CCFAA-853F-41EF-8B91-24028A333948','Handheld Game Players']],
   // 31.08.2026: 'elektronik' entfernt — 390 Klemmbaustein-Spielzeuge fluteten die Kategorie
   // «Elektronik & Technik» (TAG=elektronik) und deren Startseiten-Reihe. Spielzeug gehoert
   // in spielzeug/spass-elektronik, nie in die Technik-Kategorie.
   type:'Spass-Elektronik', tags:['spielzeug','gadgets','rc','kinder','cj-real','dropship'], kat:'Günstige Spass-Elektronik & RC-Spielzeug',
   ban:/wholesale|\bsample\b|disney|marvel|frozen|spider|barbie|pokemon|nintendo|gun|weapon/i, minImg:3, minP:2, maxP:45},
 cj3d:{cats:[['C7365895-913A-4078-9946-681EFD45D2B8','3D Printers'],['D8BBE038-9ECD-4698-8CB1-DE63E27F33C7','3D Pens'],['874B7C94-D225-43FE-AB79-FFAF1B800651','Printer Supplies']],
   type:'3D-Druck', tags:['3d-druck','3d-drucker','filament','tech','cj-real','dropship'], kat:'3D-Druck, 3D-Stifte & Filament',
   ban:/wholesale|\bsample\b|toner|\bink\b|tinte|etikett|thermodrucker|thermal|kartusche|cartridge|reispapier|prägefolie|label paper|entwicklereinheit/i, minImg:2, minP:3, maxP:200},
 cjschmuck:{cats:[['0615F8DB-C10F-4BEF-892B-1C5B04268938','Bracelets'],['56B4F8B6-8600-4A18-913E-53F2F693EC2C','Rings'],['95D9F317-1DB3-4E42-A031-02223215B9C5','Necklaces & Pendants'],['D28405AE-66C6-42E6-BFF0-D6FDCB5C083C','Earrings'],['2909669F-96C4-457A-A425-19799F2A47BF','Charms'],['552F095A-904C-40E4-A43B-0CD1CE15D29F','925 Silver'],['84ED4B7F-D7C3-412F-AF18-04F25C91985C','Pearls']],
   type:'Schmuck', tags:['schmuck','damen','geschenk','cj-real','dropship'], kat:'Schmuck & Accessoires',
   ban:/wholesale|\bsample\b|bridal set only/i, minImg:2, minP:2, maxP:70},
 cjuhren:{cats:[['1987B0AD-8C6A-4D02-B5B2-5D94E83B069F','Quartz Watches'],['369EB061-A5CD-4F1F-A105-6DAB1D520F49','Mechanical Watches'],['3D882765-B20E-4EFD-BFCC-136942A83C4C','Digital Watches'],['BF68CA3E-F698-475E-A1AD-C8E4C44D7C8D','Men Sports Watches']],
   type:'Uhren', tags:['uhren','accessoire','geschenk','cj-real','dropship'], kat:'Armbanduhren',
   ban:/wholesale|\bsample\b|smart ?watch|wall clock/i, minImg:2, minP:3, maxP:90},
 cjdamen:{cats:[['D2432903-0D4E-4787-886F-D3D9DA7890D9','Lady Dresses'],['5A3E7341-18B5-4C61-BFCD-8965B3479A9A','Blouses & Shirts'],['5E656DFB-9BAE-44DD-A755-40AFA2E0E686','Woman Hoodies & Sweatshirts'],['DE9C662C-3F48-4855-87E7-E18733EFF6D2','Sweaters'],['3B8946E7-B608-4DAB-B2F0-C425B7875035','Skirts'],['396E962A-5632-49C2-B9BF-9529DE3B9141','Leggings'],['63584B9B-5275-4268-8BEA-7D3C7A7BB925','Woman Jeans'],['7B69E34F-43A3-4143-A22D-30786EE97998','Jumpsuits']],
   type:'Damenmode', tags:['damen','mode','cj-real','dropship'], kat:'Damen-Mode & Kleider', fashion:true,
   ban:/wholesale|\bsample\b|wedding|bridal|bridesmaid|prom dress|flower girl|kinder|kids/i, minImg:2, minP:3, maxP:70},
 cjherren:{cats:[['2409230540121629100','Mens Shirts'],['2409230540351618000','Mens Jackets'],['976399B4-534B-46F0-B18A-62075824A717','Man Hoodies & Sweatshirts'],['1357252400104214528','Mens Sweaters'],['911754C0-443D-4ECF-9083-DF04C907BD81','Man Jeans'],['846D76D8-095D-4DD8-89DF-1E48D869F60C','Cargo Pants'],['BE11EEDB-B765-4A39-8A3D-F6015FC7A846','Print T-Shirts'],['655B8008-6BB9-4AA1-8025-6206ACFF018A','Solid T-Shirts']],
   type:'Herrenmode', tags:['herren','mode','cj-real','dropship'], kat:'Herren-Mode', fashion:true,
   ban:/wholesale|\bsample\b|damen|women|kinder|kids/i, minImg:2, minP:3, maxP:70},
 cjschuhedamen:{cats:[['AAB54987-4E92-40C7-B0F5-5E814C1E6980','Woman Sandals'],['1988B912-7A18-4ED2-B1E1-61ED290A0E82','Woman Boots'],['638284D0-3651-4FC9-9F25-B0A0BA323D83','Pumps'],['F35FC838-1CFE-49D1-A8CA-CF7401F9C444','Flats'],['1B559D30-B370-4C8E-8CFD-1E1BC47E217F','Woman Sneakers'],['8F756420-4840-474E-B2D6-6725ED219970','Woman Slippers']],
   type:'Damenschuhe', tags:['schuhe','damenschuhe','damen','mode','cj-real','dropship'], kat:'Damenschuhe (Sandalen, Boots, Pumps, Sneaker, Ballerinas)', fashion:true,
   ban:/wholesale|\bsample\b|nike|adidas|jordan|yeezy|puma|reebok|new ?balance|converse|vans|timberland|dr\.? ?martens|birkenstock|crocs|gucci|kinder|kids|children/i, minImg:3, minP:4, maxP:70},
 cjschuheherren:{cats:[['F419006D-AE55-4691-93FC-52FEBB459DBA','Casual Shoes'],['0F0296D6-F057-4FD4-9E06-95D5DBCCE6EB','Man Boots'],['B8640E7B-F07D-4C0F-A5CF-8ACC533DA86F','Man Sneakers'],['D0E37ED0-65C8-43E3-8B84-C973040DCE9C','Man Sandals'],['11C9DE73-0438-40E2-80B8-72697795C9F2','Formal Shoes'],['312428E8-5075-4F74-A317-8EB051C0C068','Man Slippers']],
   type:'Herrenschuhe', tags:['schuhe','herrenschuhe','herren','mode','cj-real','dropship'], kat:'Herrenschuhe (Sneaker, Boots, Business-Schuhe, Sandalen)', fashion:true,
   ban:/wholesale|\bsample\b|nike|adidas|jordan|yeezy|puma|reebok|new ?balance|converse|vans|timberland|dr\.? ?martens|birkenstock|crocs|gucci|kinder|kids|children|women|damen/i, minImg:3, minP:4, maxP:80},
 cjsneaker:{cats:[['24A29AC9-8B9B-4552-AF5E-431E6CF47C67','Running Shoes'],['5F140735-E3D7-46A0-A28D-34607B05B720','Hiking Shoes'],['C8FD79F7-DF24-495F-BE12-5F8585A8E5ED','Basketball Shoes'],['4B83DB4C-2D1F-4FA4-8844-FC39C6DBD60B','Skateboarding Shoes'],['3928EB2C-04C4-4862-BCBD-A4987005A629','Dance Shoes']],
   type:'Sportschuhe', tags:['schuhe','sneaker','sportschuhe','sport','cj-real','dropship'], kat:'Sneaker, Lauf- & Wanderschuhe', fashion:true,
   ban:/wholesale|\bsample\b|nike|adidas|jordan|yeezy|puma|reebok|new ?balance|converse|vans|timberland|dr\.? ?martens|birkenstock|crocs|gucci|soccer cleat|football boot/i, minImg:3, minP:5, maxP:80},
 cjschuhekids:{cats:[['2502190154341624400','Childrens Shoes'],['5AF1783E-547C-44E5-AD8A-82B354860BCB','Boys Shoes'],['C6FBABFE-2E34-4BD8-B643-C3060E9D343B','Girls Shoes'],['C7FEF0C8-C59D-44DC-9715-7C377441ECFE','First Walkers']],
   type:'Kinderschuhe', tags:['schuhe','kinderschuhe','kinder','baby-kids','cj-real','dropship'], kat:'Kinderschuhe & Lauflernschuhe', fashion:true,
   ban:/wholesale|\bsample\b|nike|adidas|jordan|yeezy|puma|reebok|new ?balance|converse|vans|timberland|dr\.? ?martens|birkenstock|crocs|gucci|disney|frozen|spider/i, minImg:3, minP:3, maxP:50},
 cjtaschen:{cats:[['CDCCB9B1-D5DD-4C20-AF32-101FE427B63C','Backpacks'],['EA292A58-E696-428B-8BEB-DE105690DDB3','Crossbody Bags'],['E89AC661-0B9E-4967-A0A3-7B0C6DEDDC7D','Luggage & Travel Bags'],['B701FAC3-80F0-43B1-9EA5-2C05C55F582A','Waist Bags'],['F3F4B418-17DF-49A1-AD76-A436B7618FFC','Wallets']],
   type:'Taschen', tags:['tasche','accessoire','cj-real','dropship'], kat:'Taschen & Rucksäcke',
   ban:/wholesale|\bsample\b|kinder|kids|school bag/i, minImg:2, minP:3, maxP:80},
 cjhome:{cats:[['300CC260-CF9D-4AEA-9FC2-6C8DB8A35B51','Cushion Covers'],['6939DA08-F7F8-48FB-A7E8-169AEAC92404','Pillows'],['1A9A9965-A914-46D7-B8E2-49AD256F2B6B','Curtains'],['496E6FFC-4BC4-4CA6-8225-5BC0D56E8E11','Bedding Sets'],['331F43CE-CA1D-45F2-BE2A-8AE62EC10251','Towels'],['0F4CFA22-8B97-4016-94A6-18066B9BD05C','Dinnerware']],
   type:'Wohnen & Deko', tags:['dekoration','wohnen','haushalt','cj-real','dropship'], kat:'Wohnen, Textil & Deko',
   ban:/wholesale|\bsample\b|adult/i, minImg:2, minP:2, maxP:70},
 cjbeautytools:{cats:[['47D355FB-E6C1-4E0B-AE31-0B1696A4B68E','Straightening Irons'],['C75F27EE-695C-423E-BCB4-7CFE67221332','Curling Iron'],['D23FFB85-4185-4FA3-BAF0-224A4F516741','Facial Steamer'],['6D086E0D-8C3F-4B99-BA44-140F3F7C444E','Electric Face Cleanser'],['AB11F624-D292-4A8E-9284-BD368B893A2C','Face Skin Care Tools'],['2502140311201613700','Mirrors']],
   type:'Beauty-Tools', tags:['beauty','pflege','haarstyling','cj-real','dropship'], kat:'Beauty-Geräte & Haarstyling',
   ban:/wholesale|\bsample\b|salon only/i, minImg:2, minP:3, maxP:90},
 cjhaustier:{cats:[['2410110356161627200','Cat Trees & Condos'],['2410110358051626100','Pet Beds'],['2410110340531618900','Pet Plush Toys'],['2410110352331629800','Pet Collars'],['2410110352471611400','Pet Leashes'],['2410110352591600400','Pet Harnesses'],['2410110345121610800','Fish Tanks'],['2410110349061619800','Pet Coats & Jackets']],
   type:'Haustierbedarf', tags:['haustier','hund','katze','pet','cj-real','dropship'], kat:'Haustierbedarf',
   ban:/wholesale|\bsample\b|human|for people/i, minImg:2, minP:2, maxP:80},
};
// Externe Auto-Gruppen (Mega-Abdeckung aller CJ-Kategorien) mergen; ban-String → RegExp.
if(process.env.GROUPS_FILE && fs.existsSync(process.env.GROUPS_FILE)){
 const ext=JSON.parse(fs.readFileSync(process.env.GROUPS_FILE,'utf8'));
 for(const k in ext){const g=ext[k]; if(typeof g.ban==='string')g.ban=new RegExp(g.ban,'i'); GROUPS[k]=g;}
}
// ⛔ GRUPPENÜBERGREIFENDE GESETZESWACHE — Laserpointer (V-NISSG, SR 814.711)
// Die Schweiz verbietet seit 1.6.2021 Anbieten/Abgabe/Besitz aller Laserpointer
// ausser Klasse 1. Die Gruppen-`ban`-Muster kannten das nicht: `cjhaustier` verbot
// nur /wholesale|human|for people/, deshalb kamen zwischen dem 12. und 14.08.2026
// neun weitere Katzenlaser herein, nachdem der Bestand schon einmal geprüft war.
// Darum hier global statt je Gruppe. Bestandsreparatur: automation/laserpointer_guard.py
// LASER_OK schützt die erlaubten Laser-Wörter, die im Probelauf zu Fehltreffern
// führten: Messtechnik (level/rangefinder/distance), Lasergravur, Haarentfernung,
// Projektoren, Schneid-/Schweissgeräte.
const LASER_VERBOTEN=/\blaser\s*(pointer|pen)\b|\b(cat|kitten|dog|puppy|pet)\b[^,.;]{0,25}\blaser\b|\blaser\b[^,.;]{0,25}\b(cat|kitten|dog|puppy|pet)\b|\blaser\s*(collar|teaser)\b/i;
const LASER_OK=/engrav|gravur|\blevel|rangefinder|distance|measur|thermometer|hair\s*remov|epilat|\bipl\b|projector|welding|cutt?er|printer/i;
const laserVerboten=(nm)=>LASER_VERBOTEN.test(nm)&&!LASER_OK.test(nm);

// ⛔ GRUPPENÜBERGREIFENDE WACHE — Nachbildungen echter Schusswaffen (20.08.2026)
// Vier Klemmbaustein-Nachbildungen standen aktiv in ALLEN sechs Kanälen inklusive
// «Google & YouTube», dem einzigen Kanal mit belegten Verkäufen: «AK-47 Baukasten»
// (Text: «unterhaltsames Spielzeug für Jungen … 7-14 Jahren»), «Sniper-Baukasten»
// («für Fans von Schiessspielen»), «Nachtjagd-Block» (Bauteilfarbe «MP5-dunkles
// Nachtfeld») und «Bausteine Schiessgewehr Patriotic Barrett» («junge Scharf-
// schützenherzen»). Alle vier trugen kinder+spielzeug und liefen durch sämtliche
// Kinder-Kollektionen.
// WARUM DIE GRUPPEN-`ban` SIE NICHT HIELT: cjspielelektronik verbietet /gun|weapon/,
// aber CJ nennt die Ware «Building Blocks Firearms-Sniper Rifle» — darin steht weder
// «gun» noch «weapon». Deshalb hier global und nach der MODELLBEZEICHNUNG, und
// deshalb prüft zusätzlich heikel_zweck.json den fertigen DEUTSCHEN Text (der
// englische Lieferantenname ist nur die erste von zwei Sperren).
// WAFFE_OK schützt die Compound-Falle, die im Prüflauf gemeldet wurde: «Pistole»/
// «gun» ist im Werkzeug- und Beauty-Bereich ein Griff-Formfaktor (Heissklebepistole,
// Nagelspray-, Sprüh-, Waschpistole, Gaming-Pistolengriff, Massage-«gun»).
// NICHT erfasst und bewusst so: Panzer-, Kampfjet- und Militärfahrzeug-Modelle sind
// Modellbau, keine tragbare Schusswaffe.
const WAFFE_NACHBILDUNG=/\bak-?47\b|\bak-?74\b|kalashnikov|kalaschnikow|\bm4a1\b|\bmp-?5\b|\bmp-?7\b|\buzi\b|\bglock\b|\bar-?15\b|barrett|\bsniper\b|assault\s?rifle|\brifle\b|\bshotgun\b|\bhandgun\b|\bfirearm|sturmgewehr|maschinenpistole|maschinengewehr|scharfsch[üu]tzengewehr|schie[sß]gewehr|schrotflinte|pump-?gun|airsoft|softair/i;
const WAFFE_OK=/glue\s?gun|hot\s?melt|nail\s?gun|spray\s?gun|paint\s?gun|water\s?gun|heat\s?gun|caulk|foam\s?gun|wash\s?gun|pistol\s?grip|massage\s?gun|fascia\s?gun|klebepistole|nagelpistole|spr[üu]hpistole|waschpistole|massagepistole|pistolengriff|hochdruck/i;
const waffenNachbildung=(nm)=>WAFFE_NACHBILDUNG.test(nm)&&!WAFFE_OK.test(nm);

const GSLEEP=Number(process.env.GSLEEP||4200), CJSLEEP=Number(process.env.CJSLEEP||950);
const MAXPAGE=Number(process.env.MAXPAGE||5), PERCAT=Number(process.env.PERCAT||0); // tiefere Paginierung fürs „voll"-Füllen

// ⚠️ Diese Funktion hatte weder Zeitgrenze noch Wiederholung, und `r.json()` warf bei jeder
// Antwort, die kein JSON war. Am 11.08. lieferte der Proxy den nackten Text
// «DNS resolution failure» — daraus wurde ein `SyntaxError`, der den GANZEN Runner beendete.
// Der Runner deutete den Abbruch als «CJ-Tagesbudget erschöpft» und legte sich 30 Minuten
// schlafen. Ein Netz-Zucken von einer Sekunde kostete so eine halbe Stunde Import; alle vier
// Runner traf es reihum, weshalb der Ledger fast stillstand (25'773 → 25'775 in einer Stunde).
//
// Zweitens die QPS-Drossel: CJ erlaubt EINE Anfrage pro Sekunde und zählt sie über alle
// Prozesse gemeinsam. Vier parallele Runner überschreiten das zwangsläufig. Antwort 1600200
// ist also normal und kein Fehler — sie wird abgewartet, nicht weitergereicht.
async function cj(path){
 for(let i=0;i<5;i++){
  try{
   const r=await fetch('https://developers.cjdropshipping.com/api2.0/v1'+path,
     {headers:{'CJ-Access-Token':CJT},signal:AbortSignal.timeout(45000)});
   const t=await r.text();
   let j; try{ j=JSON.parse(t); }catch{
    // Kein JSON = Proxy-/Netzmeldung. Wiederholen statt sterben.
    await sleep(2000*(i+1)); continue;
   }
   if(Number(j.code)===1600200){ await sleep(1500*(i+1)); continue; }   // QPS-Drossel
   return j;
  }catch{ await sleep(2000*(i+1)); }
 }
 // Nach fünf Versuchen aufgeben — aber MIT gültiger Form, damit der Aufrufer den Zeiger
 // behält statt die Kategorie fälschlich als «zu Ende» zu behandeln.
 return {code:0,message:'keine Antwort nach 5 Versuchen',data:null};
}
async function shTok(){for(let a=0;a<5;a++){try{const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});const t=await r.text();try{const tok=JSON.parse(t).access_token;if(tok)return tok;}catch{}}catch{}await sleep(2000*(a+1));}throw new Error('shTok: kein Token nach 5 Versuchen');}
// Wiederholt bei Drossel/Netz-Aussetzer. Ohne das schlug einzelne Aufrufe still fehl — was
// beim Publizieren teuer war: 17 Produkte wurden angelegt, aber nie veröffentlicht und
// lieferten wochenlang 404 (Sauber-Lauf 2026-08-10).
async function sgql(t,q,v){
 for(let i=0;i<4;i++){
  try{
   const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v}),signal:AbortSignal.timeout(60000)});
   const j=await r.json();
   if(j&&j.data)return j;                       // echte Antwort (auch mit userErrors)
   if(r.status!==429&&r.status<500)return j;    // fachlicher Fehler -> nicht wiederholen
  }catch{}
  await sleep(1500*(i+1));
 }
 return {};
}
// Hausregel 12.08.: Klingen (auch Küchenmesser) NIE in den Google-Kanal — kein Richtlinien-
// verstoss, aber Sperr-Risiko. Fashion-/Deko-Fehltreffer (Machete-Jeans, Katana-Figur) bleiben drin.
// ⚠️ 29.08.2026: Die Regel lag in FÜNF Dateien und musste zweimal in allen fünf repariert
// werden. Sie liegt jetzt EINMAL in klingenregel.json — neue Klingenwörter NUR dort.
// Dieser Importer hatte ausserdem die MESSGERÄTE-Ausnahme gar nicht: ein «Herzfrequenzmesser»
// fiel hier unter die Waffenregel und wurde aus dem einzigen verkaufenden Kanal gehalten.
function pubsFuer(title){
 if(istKlinge(title))
  return PUBS.filter(p=>!p.publicationId.endsWith(GOOGLE_PUB));
 return PUBS;
}
// Publizieren + Quittung liegen seit 28.08.2026 in automation/cj_publish.mjs — es gab
// drei Fassungen dieser Funktion, und alle drei lasen nur die ANTWORT der Mutation
// statt des Zustands (Google fiel still aus, userErrors blieb leer).
const publishVerified = (tok, pid, title) => _publishVerified(sgql, tok, pid, pubsFuer(title));

// ⚠️ 20.08.2026: Der Slug-Stamm wird an EINER Stelle gebildet. Die Handle-Wache muss exakt
// so kürzen wie der Handle-Bau — sonst sucht sie nach einem Stamm, den es im Shop nie gibt.
// slugStamm und laufSlugs kommen aus automation/cj_dublette.mjs — dort und NUR dort aendern.
// Slugs, die DIESER Lauf schon vergeben hat. Shopifys `query:`-Suche liest den Suchindex,
// der Sekunden bis Minuten nachhinkt: die beiden «DIY Digital-Ölgemälde nach Zahlen …» vom
// 20.08. entstanden 47 Sekunden auseinander im selben Lauf — die zweite Prüfung sah die
// erste noch nicht. Der lokale Merker kennt sie sofort.

const SET=`mutation($i:ProductSetInput!){productSet(synchronous:true,input:$i){product{id}userErrors{message}}}`;
const MED=`mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){mediaUserErrors{message}}}`;

// 🎨 Jede Farbvariante bekommt ihr eigenes Bild — aus der Quelle, nicht geraten.
//
// ⚠️ `mediaSrc` IN `productVariantsBulkUpdate` TUT NICHTS. Das Feld steht im Schema, die
// Mutation meldet `userErrors: []` — und es entsteht weder ein Medium noch eine Zuordnung
// (14.08.2026 zweimal live gegengeprüft, einmal mit einer schon vorhandenen und einmal mit
// einer fremden Bild-URL). Dasselbe stille Nichts wie beim PUT auf die Policies. Der Weg,
// der WIRKLICH wirkt: `productCreateMedia` liefert die Medien-IDs in der Reihenfolge der
// Eingabe zurück, danach hängt `mediaId` sie an die Variante — das greift schon im Status
// UPLOADED, es muss nicht auf READY gewartet werden.
async function variantenBilder(st,pid,bilder){
 if(!bilder||!Object.keys(bilder).length)return 0;
 const q=await sgql(st,`query($id:ID!){product(id:$id){variants(first:100){nodes{id sku}}}}`,{id:pid});
 const vs=(q.data?.product?.variants?.nodes||[]).filter(v=>bilder[v.sku]);
 if(!vs.length)return 0;
 // Dieselbe URL kann zu mehreren Varianten gehören (Farbe × Grösse) — dann EIN Medium,
 // mehrfach angehängt, statt fünf gleicher Bilder in der Galerie.
 const urls=[...new Set(vs.map(v=>bilder[v.sku]))];
 const cm=await sgql(st,`mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){media{id} mediaUserErrors{message}}}`,
                     {id:pid,m:urls.map(u=>({originalSource:u,mediaContentType:'IMAGE'}))});
 const neu=cm.data?.productCreateMedia?.media||[];
 if(neu.length!==urls.length)return 0;          // Zuordnung nur über die Reihenfolge — bei
 const zu={}; urls.forEach((u,i)=>zu[u]=neu[i].id);   // Lücke lieber gar nichts anhängen
 const ein=vs.map(v=>({id:v.id,mediaId:zu[bilder[v.sku]]}));
 let n=0;
 for(let i=0;i<ein.length;i+=25){
  const teil=ein.slice(i,i+25);
  const r=await sgql(st,`mutation($p:ID!,$v:[ProductVariantsBulkInput!]!){productVariantsBulkUpdate(productId:$p,variants:$v){userErrors{message}}}`,{p:pid,v:teil});
  const e=r.data?.productVariantsBulkUpdate?.userErrors||[];
  if(e.length){console.log('  ⚠️ Variantenbild:',JSON.stringify(e[0]).slice(0,90));break;}
  n+=teil.length;
 }
 return n;
}
// CJ-Produktvideo via Staged-Upload anhängen (externe URLs nimmt Shopify nicht an) — 2026-07-06
// Wartet, bis Shopify mindestens ein Bild fertig verarbeitet hat. Gibt false zurück, wenn
// nach mehreren Anläufen keines READY ist — dann sind sie FAILED oder die Quelle war tot.
async function hatBild(st,productId){
 for(let i=0;i<6;i++){
  const r=await sgql(st,`query($id:ID!){product(id:$id){media(first:12){nodes{
    ... on MediaImage{status} mediaContentType}}}}`,{id:productId});
  const nodes=r?.data?.product?.media?.nodes||[];
  if(nodes.some(n=>n.mediaContentType==='IMAGE'&&n.status==='READY'))return true;
  // Solange noch etwas verarbeitet wird, lohnt das Warten; sind alle fertig und keines READY,
  // ändert sich nichts mehr.
  if(nodes.length&&nodes.every(n=>n.status&&n.status!=='PROCESSING'&&n.status!=='UPLOADED'))return false;
  await sleep(2500*(i+1));
 }
 return false;
}
// 🖼️ MINIATUR ALS HAUPTBILD (14.08.2026). CJs `productImageSet` kommt in der Reihenfolge des
// Lieferanten, und deren erster Eintrag ist mitunter ein Thumbnail: «Adapter für Hochdruck-
// reiniger-Schaumlanze» stand mit einem 50×50-Hauptbild live im Shop und im Google-Kanal,
// zwei Wimpern-Produkte mit 80×80, während im selben Produkt 800- bis 1785-px-Bilder lagen.
// Weil `imgs[0]` hier zum Hauptbild wird, ist das keine Altlast, sondern entsteht mit jedem
// Lauf neu — 50 der 265 gefundenen Fälle wurden im August angelegt, der jüngste zwei Tage vor
// dem Fund. Ein Aufräumlauf allein wäre also Sisyphusarbeit (dieselbe Lehre wie bei
// `condition` und `google_product_category`).
//
// `featuredMedia` ist genau das Bild, das Google als `image_link` bekommt. Unter 250×250 wird
// ein Bekleidungs- oder Schmuckangebot ABGELEHNT, nicht bloss schlechter platziert.
//
// ⚠️ BEWUSST ENG: eingegriffen wird nur, wenn das erste Bild ein echtes Thumbnail ist
// (< 250 px). Der Probelauf des Bestands-Reinigers zeigte, warum «nimm einfach das grösste»
// falsch wäre: bei 44 % einer Stichprobe war das grosse Bild keine Aufnahme des Produkts,
// sondern eine englische Werbetafel («Wide Compatibility», «U-SHAPE NECK MASSAGER ST-320»)
// oder ein Swatch mit fremdem Markennamen. Die schwierigen Fälle (Hauptbild 250–499 px)
// entscheidet `automation/hauptbild_grossbild.py` mit Text- und Motivprüfung; hier wird nur
// der Schaden verhindert, der ohne Bildvergleich sicher zu erkennen ist.
async function grossbildNachVorn(st,productId){
 try{
  const r=await sgql(st,`query($id:ID!){product(id:$id){media(first:25){nodes{
    id mediaContentType ... on MediaImage{status image{width height}}}}}}`,{id:productId});
  const nodes=(r?.data?.product?.media?.nodes||[]).filter(n=>n.mediaContentType==='IMAGE');
  if(nodes.length<2)return;
  const kante=n=>Math.max(n?.image?.width||0,n?.image?.height||0);
  if(kante(nodes[0])>=250)return;                       // kein Thumbnail → nichts zu tun
  const ziel=nodes.find(n=>n.status==='READY'&&kante(n)>=800);
  if(!ziel||ziel.id===nodes[0].id)return;
  await sgql(st,`mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m){userErrors{message}}}`,
             {id:productId,m:[{id:ziel.id,newPosition:'0'}]});
  console.log(`  🖼️ Miniatur (${kante(nodes[0])}px) war Hauptbild → ${kante(ziel)}px nach vorn`);
 }catch{}
}
// 🏷️ ALT-TEXTE FÜR ALLE BILDER — erst hier, wenn die Medienliste endgültig steht.
// Bis 20.08.2026 trug nur EIN Bild je Produkt einen Alt-Text: `productSet` legte oben
// `files:[imgs[0]]` MIT Alt an, `productCreateMedia` hängte `imgs.slice(1)` OHNE Alt daran.
// Bei 5'739 Produkten ab dem 17.08. blieben so 6–8 Bilder je Produkt stumm.
// Schlimmer noch: `grossbildNachVorn` schiebt danach ein grosses Bild auf Position 0 — und
// das ist eines der Bilder OHNE Alt. Bei rund 9 % der Produkte stand der einzige Alt-Text
// dadurch auf einer 120-px-Miniatur an Position 2, während ausgerechnet das HAUPTBILD leer
// blieb: genau das Bild, das in der Kollektionskachel, im Warenkorb, in der Google-Bildersuche
// und im Merchant-Feed erscheint. Dieselbe Lehre wie beim Refurb-Zusatz, der aus dem Titel
// verschwand und im Feld `condition` stehen blieb: wer eine Angabe verschiebt, muss prüfen,
// welches Feld sie danach trägt. Deshalb läuft dieser Schritt NACH grossbildNachVorn UND
// nach variantenBilder — sonst bleiben die zuletzt angehängten Bilder wieder stumm.
// Vorhandene Alt-Texte werden NIE überschrieben.
async function altTexte(st,productId,title){
 try{
  const r=await sgql(st,`query($id:ID!){product(id:$id){media(first:25){nodes{
    id mediaContentType ... on MediaImage{alt}}}}}`,{id:productId});
  const nodes=(r?.data?.product?.media?.nodes||[]).filter(n=>n.mediaContentType==='IMAGE');
  const t=String(title||'').slice(0,90);
  if(!t||!nodes.length)return 0;
  const files=nodes.map((n,i)=>({node:n,alt:`${t} – Bild ${i+1} | LuxeStyle`}))
                   .filter(x=>!String(x.node.alt||'').trim())
                   .map(x=>({id:x.node.id,alt:x.alt}));
  if(!files.length)return 0;
  const u=await sgql(st,`mutation($files:[FileUpdateInput!]!){fileUpdate(files:$files){userErrors{message}}}`,{files});
  const e=u?.data?.fileUpdate?.userErrors||[];
  if(e.length){console.log('  ⚠️ Alt-Text:',JSON.stringify(e[0]).slice(0,90));return 0;}
  return files.length;
 }catch{return 0;}
}
async function attachVideo(st,productId,vurl,cjpid){
 try{
  const vr=await fetch(vurl,{signal:AbortSignal.timeout(90000)}); if(!vr.ok)return;
  const buf=Buffer.from(await vr.arrayBuffer()); if(buf.length>60*1024*1024)return;
  const stg=await sgql(st,`mutation($input:[StagedUploadInput!]!){stagedUploadsCreate(input:$input){stagedTargets{url resourceUrl parameters{name value}}userErrors{message}}}`,
   {input:[{resource:'VIDEO',filename:`cj-${cjpid}.mp4`,mimeType:'video/mp4',httpMethod:'POST',fileSize:String(buf.length)}]});
  const tgt=stg?.data?.stagedUploadsCreate?.stagedTargets?.[0]; if(!tgt)return;
  const form=new FormData(); for(const pp of tgt.parameters)form.append(pp.name,pp.value);
  form.append('file',new Blob([buf],{type:'video/mp4'}),`cj-${cjpid}.mp4`);
  const up=await fetch(tgt.url,{method:'POST',body:form}); if(up.status!==201&&up.status!==200)return;
  await sgql(st,MED,{id:productId,m:[{originalSource:tgt.resourceUrl,mediaContentType:'VIDEO'}]});
  console.log('  🎬 Video angehängt');
  // Das Video darf NICHT das Hauptmedium werden: sonst zeigen Kollektionskacheln kein
  // Produktbild und Google Merchant bekommt kein image_link (22 Produkte waren so betroffen,
  // gefunden im Katalog-Audit 2026-08-10). Darum das erste fertige Bild wieder nach vorn.
  const mm=await sgql(st,`query($id:ID!){product(id:$id){media(first:25){nodes{id mediaContentType ... on MediaImage{status}}}}}`,{id:productId});
  const ersteBild=(mm?.data?.product?.media?.nodes||[]).find(x=>x.mediaContentType==='IMAGE'&&x.status==='READY');
  if(ersteBild) await sgql(st,`mutation($id:ID!,$m:[MoveInput!]!){productReorderMedia(id:$id,moves:$m){userErrors{message}}}`,{id:productId,m:[{id:ersteBild.id,newPosition:'0'}]});
 }catch{}
}

const TRUST=`<div style="background:#f7faf7;border:1px solid #d9e7d9;border-radius:10px;padding:11px 14px;margin:12px 0;font-size:14px;line-height:1.5;"><strong>\u{1F6E1}️ Sorglos shoppen:</strong> ✅ Geprüfte Angaben · \u{1F69A} Lieferung 10–20 Werktage · \u{1F504} 30 Tage Rückgabe · \u{1F1E8}\u{1F1ED} Schweizer Shop · \u{1F4B3} TWINT, Karte & Klarna.</div>\n<p>Gratis-Versand ab CHF 50 · <strong>–10 % mit Code WELCOME10</strong></p>`;

async function gemini(nameEn,feats,kat){
 const prompt=copyPrompt({nameEn,feats,kat});   // EINE Quelle: automation/cj_copy_prompt.mjs (02.09.2026)
 // KOSTEN-REGEL (User 2026-07-06): Groq (gratis) ist PRIMÄR — Gemini (bezahlt) nur noch Fallback,
 // Massen-Importe haben sonst CHF 46/Woche Gemini-Guthaben verbrannt.
 const g0=await groq(prompt); if(g0&&g0.title&&g0.html)return wirkSicher(messSicher(g0));
 for(let i=0;i<3;i++){const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GK}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.5,maxOutputTokens:1500,thinkingConfig:{thinkingBudget:0},responseMimeType:'application/json'}})});
  const j=await r.json(); if(j.error){if(j.error.code===429){await sleep(15000);continue;}break;}
  try{const t=j.candidates?.[0]?.content?.parts?.[0]?.text||'';const o=JSON.parse(t);if(o.title&&o.html)return wirkSicher(messSicher(o));}catch{}
 }
 return null;
}

// Fallback: Groq (OpenAI-kompatibel), falls Gemini-Quota erschöpft (2026-07-05).
const GROQ_KEYS=[(process.env.GROQ_API_KEY||''),(process.env.GROQ_API_KEY2||'')].map(s=>s.trim()).filter(Boolean);
// ⚠️ ZWEI DER DREI MODELLE WAREN TOT ODER STERBEN (14.08.2026, aus der Groq-Mail + dem
// eigenen Fehler-Zwischenspeicher /tmp/ai_groq.json): «llama-3.3-70b-versatile» wird am
// 16.08. abgeschaltet, «qwen/qwen3-32b» antwortet schon jetzt mit «does not exist or you do
// not have access to it». Übrig geblieben wäre EIN Modell — und fällt das auch, bekommt jedes
// neue Produkt einen englischen Lieferantentitel. Reihenfolge jetzt: von Groq empfohlener
// Ersatz zuerst, hinten als Auffangnetz das Modell, dessen Antwort hier nachweislich
// funktioniert hat (llama-3.1-8b-instant, letzter belegter Erfolg am 04.08.).
// Modellwahl + Parser liegen seit 02.09.2026 in automation/groq_text.mjs (EINE Quelle).
async function groq(prompt){
 const o=await groqText(prompt); if(o) return o;
 return await deepseek(prompt);
}

// 3. Stufe: DeepSeek (OpenAI-kompatibel), falls auch Groq klemmt.
const DS_KEY=(process.env.DEEPSEEK_API_KEY||'').trim();
async function deepseek(prompt){
 if(!DS_KEY)return null;
 for(let i=0;i<2;i++){
  try{
   const r=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${DS_KEY}`},
    body:JSON.stringify({model:'deepseek-chat',temperature:0.5,max_tokens:1200,
     response_format:{type:'json_object'},messages:[{role:'user',content:prompt}]})});
   if(r.status===429){await sleep(10000);continue;}
   const j=await r.json(); if(j.error)return null;
   const o=JSON.parse(j.choices?.[0]?.message?.content||'');if(o.title&&o.html)return o;
  }catch{}
 }
 return null;
}

// ⚠️ LABELTAG liest den CJ-KATEGORIENAMEN, nicht den Produkttitel. Deshalb hat
// `/bag/i` bis 20.08.2026 auch die Kategorie «Storage Bags & Cases & Boxes» getroffen —
// JEDES Produkt der Storage-Gruppe bekam den Tag `kategorie-tasche`. Folge: 642 aktive
// Regale, Ablagen und Organizer standen im Google-Feed unter «Handbags» und in der
// Kollektion «Taschen & Rucksäcke». Ein Wandregal ist keine Handtasche.
// Regel: der Tasche-Anker darf nur greifen, wenn der Kategoriename nicht von Aufbewahrung
// spricht (Wortgrenzen + Negativliste, wie 9b es für jede Massen-Tag-Regel verlangt).
const LABEL_KEINE_TASCHE=/storage|organiz|wardrobe|kitchen|bathroom|home office/i;
const LABELTAG=[[/dress/i,'kategorie-kleid'],[/skirt/i,'kategorie-rock'],[/necklace|pendant/i,'kategorie-halskette'],
 [/bracelet|bangle/i,'kategorie-armband'],[/watch/i,'kategorie-uhr'],
 [/\bbags?\b|backpack|handbag|tote/i,'kategorie-tasche',LABEL_KEINE_TASCHE]];
const grp=GROUPS[process.env.GRP||'nagel']; if(!grp){console.error('unknown GRP');process.exit(1);}
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.replace('cj:','').trim()).filter(Boolean):[]);
const st=DRY?null:await shTok();
let total=0;
// ⚠️ Ein erschoepftes Tagesbudget gilt fuer den GANZEN Lauf, nicht fuer eine Kategorie
// (27.08.2026). Vorher brach nur die Seitenschleife ab, und die aeussere Schleife
// probierte JEDE weitere Kategorie einzeln durch — bei leerem Eimer rund 30 sinnlose
// CJ-Anfragen je Gruppe, 2'800 Logzeilen in zehn Minuten und ein Log, in dem der
// eine echte Grund unter Wiederholungen verschwindet. Nur 16900500 bricht alles ab;
// ein transienter Fehler laesst die naechste Kategorie weiter zu.
let budgetLeer=false, catsOk=0, catsFehler=0, letzterFehler='';
for(const [cat,label] of grp.cats){
 if(budgetLeer) break;
 if(total>=CAP)break; let got=0; const perCat=PERCAT||Math.ceil(CAP/3);
 // SEITEN-ZEIGER JE KATEGORIE (2026-08-10). Vorher begann jeder Lauf wieder bei Seite 1 und
 // paginierte bis MAXPAGE — also wurden dieselben, längst abgegrasten Seiten immer wieder
 // gelesen. Das kostete CJ-Punkte ohne Ertrag: an einem Tag 73'220 Punkte für rund 20 neue
 // Produkte, danach war das Budget leer und der Grind stand. Jetzt merkt sich jede Kategorie,
 // bis wohin sie gelesen wurde, und macht dort weiter. Ein Zeiger pro Datei statt einer
 // gemeinsamen JSON: vier Runner schreiben parallel, eine geteilte Datei würde sich gegenseitig
 // überschreiben.
 const ZDIR='dropship/_cj_pages'; try{fs.mkdirSync(ZDIR,{recursive:true});}catch{}
 const zFile=`${ZDIR}/${String(cat).replace(/[^A-Za-z0-9_-]/g,'')}`;
 let startSeite=1;
 try{ const v=parseInt(fs.readFileSync(zFile,'utf8').trim(),10); if(v>0)startSeite=v; }catch{}
 let letzteSeite=startSeite, zeigerBehalten=false;
 for(let page=startSeite;page<startSeite+MAXPAGE && total<CAP && got<perCat;page++){
  letzteSeite=page;
  const WH=(process.env.WAREHOUSE||'').trim(); // EU-Lager-Filter (z.B. DE) — User 2026-07-07 «cj sachen aus eu lager»
  const j=await cj(`/product/list?pageSize=30&pageNum=${page}&categoryId=${cat}${WH?`&countryCode=${WH}`:''}`); await sleep(700);
  const list=(j.data&&j.data.list)||[];
  // ⚠️ «Leere Liste» heisst NICHT automatisch «Kategorie zu Ende». Bei erschöpftem Punkte-
  // budget antwortet CJ mit code 16900500 und ebenfalls leerer Liste. Wer das verwechselt,
  // setzt alle Seiten-Zeiger auf 1 zurück und verliert die mühsam erarbeitete Tiefe — beim
  // ersten Anlauf am 10.08. ist genau das mit vier Kategorien passiert.
  if(!list.length){
    // ⚠️ 1600300 «the max offset is 6000» ist KEIN Ausfall, sondern ein ENDE-Signal: CJ
    // laesst sich ab diesem Offset nicht weiter blaettern, die Kategorie ist bis zur
    // API-Decke ausgelesen. Wer ihn wie einen Punktemangel behandelt, laesst den Zeiger
    // ueber der Decke stehen — die Kategorie liefert dann FUER IMMER 0 und kostet je Lauf
    // eine Anfrage (gemessen 07.09.2026: 2 von 168 Kategorien standen auf Seite 202).
    // Richtig ist der Neu-Sweep von vorn; Dubletten fangen Titel-, SKU-, Bild- und
    // Handle-Wache plus cj_claim ab, und CJ legt oben taeglich neue Ware an.
    const offsetDecke = Number(j.code)===1600300 || /max offset/i.test(String(j.message||''));
    if(Number(j.code)===200 || offsetDecke){ letzteSeite=0; }   // am Ende -> neu von vorn
    else { console.log(`  ⛔ CJ-Fehler ${j.code}: ${String(j.message||'').slice(0,60)} — Zeiger bleibt`); zeigerBehalten=true;
           letzterFehler=`${j.code}: ${String(j.message||'').slice(0,60)}`;
           if(Number(j.code)===16900500||/Insufficient API points/i.test(String(j.message||''))) budgetLeer=true; }
    break;
  }
  for(const p of list){
   if(total>=CAP)break;
   const nm=p.productNameEn||''; if(!nm||done.has(String(p.pid))||(grp.ban&&grp.ban.test(nm)))continue;
   if(laserVerboten(nm)){console.log(`  ⛔ Laserpointer (V-NISSG) übersprungen: ${nm.slice(0,60)}`);continue;}
   if(waffenNachbildung(nm)){console.log(`  ⛔ Schusswaffen-Nachbildung übersprungen: ${nm.slice(0,60)}`);continue;}
   const pr=parseFloat((''+p.sellPrice).split('--')[0])||0; if(pr<grp.minP||pr>grp.maxP)continue;
   // MOQ-Wache (auch FAST): nur ORDINARY/DIY = einzeln bestellbar (list liefert productType mit)
   const pt=p.productType||''; if(pt&&pt!=='ORDINARY_PRODUCT'&&pt!=='DIY_PRODUCT')continue;
   const FAST=process.env.FAST==='1';
   let d, imgs;
   if(FAST){ // GRENZE-ÜBERWINDEN: kein product/query → ~30× weniger CJ-Calls. Einzelbild aus Liste.
     d={}; imgs=(p.productImage&&/^https/.test(p.productImage))?[p.productImage]:[];
     if(!imgs.length)continue;
   } else {
     const dj=await cj(`/product/query?pid=${p.pid}`); await sleep(CJSLEEP);
     d=dj.data||{}; imgs=((d.productImageSet)||[]).filter(u=>/^https/.test(u)).slice(0,20);
     if(imgs.length<grp.minImg)continue;
   }
   const feats=(d.description||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
   const g=await gemini(nm,feats,grp.kat); await sleep(GSLEEP);
   if(!g){console.log('  skip(gemini)',nm.slice(0,30));continue;}
   // Marken-Filter (14.08.2026): CJ-Listings schreiben «Chanel style» in Name/Features, die
   // Übersetzung übernimmt es wörtlich. Ohne diesen Schnitt entstehen mit jedem Lauf neue
   // «im Chanel-Stil»-Produkte — 42 mussten am 14.08. nachträglich bereinigt werden.
   const ms=produktSaeubern(g.title, g.html);
   if(ms.verdacht){console.log('  skip(marke)',nm.slice(0,40));continue;}
   g.title=ms.title; g.html=ms.html;
   // 🇩🇪 Titel-Sprachwache (20.08.2026): der Übersetzer liefert die Beschreibung deutsch, den
   // TITEL aber manchmal roh aus dem CJ-Listing — sechs Fälle standen am 20.08. aktiv im
   // Google-Kanal. Begründung, Fehlalarm-Abgrenzung und Testfälle: automation/titel_sprache.mjs.
   // Erst ein zweiter Übersetzungsversuch, dann übersprungen — KEIN Ledger-Eintrag, das Produkt
   // kommt in einer späteren Runde erneut dran (gleiches Verhalten wie skip(gemini)).
   if(echoVomLieferanten(g.title,nm)){
    const g2=await gemini(nm,feats,grp.kat); await sleep(GSLEEP);
    if(g2&&g2.title&&g2.html&&!echoVomLieferanten(g2.title,nm)){
     const m2=produktSaeubern(g2.title,g2.html);
     if(!m2.verdacht){ g.title=m2.title; g.html=m2.html; }
    }
    if(echoVomLieferanten(g.title,nm)){ console.log('  skip(titel-nicht-uebersetzt)',String(g.title).slice(0,50)); continue; }
   }
   // ß→ss (15.08.2026): Übersetzer liefern bundesdeutsches ß, ein CH-Shop schreibt ss.
   // Quelle hier; Backfill für den Altbestand: automation/ss_statt_scharf_s.py
   // 📦 STÜCKZAHL AUS DEM LIEFERANTENNAMEN (22.08.2026). CJ schreibt die Menge in den
   // englischen Namen («24-piece», «2 Rolls», «Set Of 5»); der Übersetzer baut daraus einen
   // schönen deutschen Titel und lässt die Zahl weg. Ein Multipack sieht dann aus wie ein
   // Einzelstück und der Preis wirkt absurd — genau die Beschwerde vom 26.07.2026
   // («sonst fragen leute zu teuer für ballon»). Damals wurden 15 Ballon-Produkte von HAND
   // korrigiert; der Importer legte am nächsten Tag neue an. Jetzt an der Quelle.
   let title=titelMitMenge(g.title.replace(/ß/g,'ss').replace(/ẞ/g,'SS'), nm, 70);
   // Technik-Plausibilitaet (24.08.2026): 4K-Titel bei nativ 720p, 20'000-mAh-Titel bei
   // 10'000 im Text, 99-Mio-Lumen — Regeln und Belege in automation/technik_plausibel.mjs.
   { const tw=technikWache(title, g.html||'');
     if(tw.verwerfen){ console.log('  skip(technik)', tw.grund, title.slice(0,40)); continue; }
     if(tw.grund) console.log('  technik-korrigiert', tw.grund);
     title=tw.title; }
   // ⚕️ MEDIZINISCHE ZWECKBESTIMMUNG (14.08.2026). Acht im August angelegte Geräte standen
   // aktiv im Google-Kanal, obwohl sie nach MepV eine Konformitätsbewertung brauchen — ein
   // Temperaturpflaster mit 38-°C-Alarm für kranke Kinder, zwei Elektrostimulations-
   // Schlafgeräte, ein Gehörgang-Endoskop, zwei Sets gegen eingewachsene Nägel, ein
   // Zahnsteinentferner, ein Baby-Set mit klinischem Thermometer. Der Bestandswächter
   // `medizinprodukte_guard.py` sah keinen davon: er sucht PRODUKTNAMEN, und alle acht
   // heissen nach aussen «Gadget», «Beauty» oder «Haushalt» — den Zweck verrät erst der
   // Beschreibungstext, den Gemini gerade erzeugt hat. Deshalb wird HIER geprüft und nicht
   // erst im nächsten Aufräumlauf: sonst legt der Importer täglich die nächsten an, und der
   // Wächter räumt hinterher (dieselbe Falle wie bei `condition` und `google_product_category`).
   // Die Ware wird NICHT verworfen — sie kommt als Entwurf in den Shop und lässt sich mit
   // Konformitätsunterlagen jederzeit freischalten. Muster: automation/medizin_zweck.json.
   const med=medizinZweck(title, g.html);
   // 🐾 TIERSCHUTZ, TSchV Art. 76 (20.08.2026). Am 16.08. wurden zwei Schock-Halsbänder als
   // Sofortmassnahme gedraftet; vier Tage später standen VIERZEHN solche Geräte aktiv in allen
   // sechs Kanälen, zwölf davon nach dem 13.08. hier neu angelegt. Der Bestand zu putzen hilft
   // also nichts — diese Zeile ist die eigentliche Reparatur. Die Lieferanten nennen den Schock
   // selten Schock: «statischer Impuls» (99 Stufen), «elektrostatische Stimulation»,
   // «Puls-proportionale Stimulation». Das Muster hängt deshalb an der WIRKMECHANIK.
   // Muster: automation/tierschutz_geraet.json (derselbe Text liest auch tierschutz_guard.py).
   const tsch=tierschutzGeraet(title, g.html);
   // 🕵️ VERDECKTE ÜBERWACHUNG UND WAFFEN (14.08.2026), derselbe Fehler eine Warengruppe
   // weiter. Der Säuberungslauf vom 12.08. nahm 88 Produkte aus dem Google-Kanal; zwei Tage
   // später standen 13 wieder drin, zwei davon frisch importiert. Google führt verdeckte
   // Überwachung unter «Dishonest behavior» — die Sanktion ist die Sperrung des KONTOS, nicht
   // die Ablehnung des Artikels, und Google ist der einzige Kanal mit belegten Verkäufen.
   // Der Reiniger allein reicht deshalb nicht: was der Importer heute publiziert, findet er
   // morgen wieder vor. Muster: automation/heikel_zweck.json (nach der FUNKTION, nicht nach
   // der Produktbezeichnung des Verkäufers — «Abwehrstock» statt Teleskopschlagstock,
   // «lässt sich diskret platzieren» statt «versteckte Kamera»).
   const heik=heikelZweck(title, g.html);
   if(DRY){console.log(`  [DRY]${med?' ⚕️DRAFT('+med.grund+')':''}${tsch?' 🐾DRAFT('+tsch.grund+')':''}${heik?' 🕵️'+(heik.verboten?'DRAFT':'KEIN-KANAL')+'('+heik.grund+')':''} CHF${chf(p.sellPrice)} | ${title}`);got++;total++;continue;}
   const slug=slugStamm(title)+'-'+String(p.pid).slice(-6);
   // 📋 Faktenblock (02.09.2026): Material/Gewicht/Masse aus CJ → Tabelle «Spezifikationen» im Theme. Quelle: cj_specs.mjs
   const html=`${g.html}\n${produktdetails(d, title)}\n${TRUST}`.replace(/ß/g,'ss').replace(/ẞ/g,'SS');
   const fash=(grp.fashion&&!FAST)?buildFashion(d):null; // FAST: keine Varianten-Details → Standard-Variante
   const productOptions=fash?fash.productOptions:[{name:'Variante',values:[{name:'Standard'}]}];
   const variants=fash?fash.variants:[{optionValues:[{optionName:'Variante',name:'Standard'}],price:chf(p.sellPrice, p.productWeight||p.variantWeight),inventoryItem:{sku:('CJ-'+p.pid).slice(0,70),tracked:false,cost:kosten(p.sellPrice, p.productWeight||p.variantWeight),...gewicht(p.productWeight||p.variantWeight)},inventoryPolicy:'CONTINUE'}];
   const katTag=(LABELTAG.find(([re,,verbot])=>re.test(label||'')&&!(verbot&&verbot.test(label||'')))||[])[1];
   // 03.09.2026: Der Tag «neuheit» speist die Startseiten-Reihe «Neuheiten 2026»
   // (Smart-Regel TAG=neuheit, CREATED_DESC). KEIN Importer setzte ihn — der juengste
   // Artikel darin war vom 10.08., die Reihe zeigte 24 Tage lang dieselbe Ware, waehrend
   // taeglich hunderte Produkte dazukamen. Ein Schaufenster, das sich nicht bewegt.
   let tagsFinal=[...(process.env.WAREHOUSE?[...grp.tags,'eu-lager','schnelle-lieferung']:grp.tags),...(katTag?[katTag]:[]),'neuheit'];
   if(fash?.preisFix) tagsFinal=[...tagsFinal,'preis-ausreisser-korrigiert'];
   let typeFinal=grp.type;
   // 🔪 03.09.2026: CJs «Kitchen Knives» liefert auch Outdoor-/Taktik-/Survival-Klingen. Mit den Gruppen-Tags
   // kueche/kochen/haushalt landeten 90 davon in «Wohnen & Dekoration» und «Küche & Bar» — zwischen Sofakissen.
   // Ein Klappmesser ohne Küchenwort ist kein Küchenartikel: Gruppen-Tags weg, Tag outdoor-messer statt dessen.
   if(istKlinge(title)&&/taschenmesser|klappmesser|faltmesser|ausklappmesser|taktisch|outdoor|jagd|survival|camping|karambit|dolch|machete|\baxt\b|\bbeil\b/i.test(title)&&!/k[üu]chen|koch|gem[üu]se|brot|steak|obst|fr[üu]chte|k[äa]se|sch[äa]l/i.test(title)){
     tagsFinal=tagsFinal.filter(t=>!['kueche','kochen','haushalt','wohnen','dekoration'].includes(t)).concat(['outdoor-messer','messer-outdoor']);
     typeFinal='Outdoor-Messer';
   }
   // Titel-Wache: Haustier-/Plüsch-Artikel aus CJ-Elektronik/Gadget-Kategorien nicht als Elektronik taggen (Hundehalsband-Falle 2026-08-04)
   if(/hundehalsband|\bhalsband\b|hundeleine|hundegeschirr|katzenspielzeug|kratzbaum|katzenklo|futternapf|hundebett|katzenbett/i.test(title)&&!/smart|gps|led|leucht/i.test(title)){
     tagsFinal=tagsFinal.filter(t=>!['elektronik','tech','gadget','gadgets','trend'].includes(t)).concat(['haustier','pet']);
     typeFinal='Haustierbedarf';
   } else if(/plüsch|kuscheltier/i.test(title)&&!/lampe|licht/i.test(title)){
     tagsFinal=tagsFinal.filter(t=>!['elektronik','tech'].includes(t)).concat(['spielzeug']);
     typeFinal='Spielzeug & Spiele';
   } else if(/hydraulik|wegeventil|steuerventil|holzspalter|traktor|bew[äa]sserung/i.test(title)){
     // CJ listet Hydraulik-"Joystick"-Ventile unter Gaming/Joysticks (Garten-Filter-Falle 2026-08-05)
     tagsFinal=tagsFinal.filter(t=>!['gaming','ps4','ps5','xbox','konsole','gadgets','elektronik','tech'].includes(t)).concat(['garten']);
     typeFinal=/bew[äa]sserung/i.test(title)?'Garten & Pflanzen':'Gartenwerkzeug';
   }
   // 👶 KINDER-/SPIELZEUG-TAG NUR BEI ECHTEM KINDER-SIGNAL (20.08.2026)
   // Die CJ-Gruppe cjspielelektronik hängt `kinder`+`spielzeug` BLANKO an jedes Produkt,
   // das aus ihren vier Kategorien kommt (Electronic Pets, RC Helicopters, Blocks,
   // Handheld Game Players). Am 20.08. trugen dadurch 775 von 776 aktiven Produkten der
   // Warengruppe «Spass-Elektronik» den Tag `kinder` und 766 den Tag `spielzeug` — und
   // fielen damit in sämtliche Kinder-Kollektionen (Spielzeug & Plüsch, Kinderspielzeug,
   // Geschenke für Kinder, Baby & Kleinkind). In den Kinderreihen standen deshalb unter
   // anderem eine Solar-Ultraschall-Tierabwehr (5 V Gartengerät), ein Hundehalsband, eine
   // Hundeleine, ein 10-kg-Reisbehälter, ein Nintendo-Switch-Etui und ein USB-Stick.
   // Der Blanko-Tag war zugleich der Grund, warum die vier Schusswaffen-Nachbildungen
   // überhaupt als Kinderware galten.
   // Regel: Der Tag muss VERDIENT werden — ein Kinder-Signal im Titel oder Text. Fehlt es
   // ganz, fällt der Tag weg; nennt der TITEL eine klar kinderfremde Warenart (Hundeleine,
   // Ventilator, USB-Stick), fällt er auch dann weg, wenn im Fliesstext beiläufig ein
   // Kinderwort steht. Der Artikel bleibt im Shop und in seinen Sachkollektionen — nur die
   // Kinderreihen verliert er, und Google bekommt kein age_group=kids für Gartengeräte mehr.
   if(tagsFinal.includes('kinder')||tagsFinal.includes('spielzeug')){
     const ktext=(title+' '+String(g.html||'').replace(/<[^>]+>/g,' '));
     // Kinder-Signal = eine Aussage über die Zielgruppe oder ein echtes Spielzeug-Nomen.
     const KIND=/\bkinder|\bkind(?:es|er)?\b|\bkids\b|\bbaby|kleinkind|\bjungen\b|\bm[äa]dchen\b|jugendliche|ab \d{1,2}\s*jahren|\d{1,2}\s*[-–]\s*\d{1,2}\s*jahren|spielspa[sß]s?|spielzeug|pl[üu]sch|kuscheltier|puzzle|baukl[öo]tz\w*|baukasten|baustein|malbuch|lernspiel|rassel|schulkind|kinderzimmer/i;
     // Nicht-Spielzeug wird NUR am TITEL erkannt — an dem, was das Produkt IST. Der erste
     // Entwurf prüfte den Fliesstext und war dadurch unbrauchbar: «im Büro» stand in einem
     // Magnet-Bausteine-Set FÜR KINDER, «Gartentieren» in einem Kinder-Bastelset, «farb-
     // wechselnder Hund» in einem Kinder-Roboter — der Probelauf hätte 293 statt 11 Produkte
     // angefasst und dabei echte Kinderspielzeuge aus den Kinderreihen geworfen. Und ein
     // Kinder-Signal im TITEL sticht immer: «RC Bagger Spielzeug für Kinder» bleibt Kinderware,
     // auch wenn «Fahrzeug» darin vorkommt (die Rock/Schleife-Lehre aus dem Projektgedächtnis).
     const NICHT_SPIELZEUG_TITEL=/haustier|\bhunde?(?:halsband|leine|geschirr|napf|bett|marke)|katzen?(?:klo|baum|napf|bett|toilette)|futternapf|kratzbaum|tierabwehr|vogelabwehr|sch[äa]dling|\blocator\b|luftreiniger|luftbefeuchter|ventilator|reisbeh[äa]lter|vorratsbeh[äa]lter|schutzh[üu]lle|\busb\b|festplatte|speicherkarte|kartenleser|ladeger[äa]t|netzteil|powerbank|tastatur|mauspad|rasierer|epilier|zahnb[üu]rste|schraubendreher|rasenm[äa]her|staubsauger|dashcam|[üu]berwachungskamera/i;
     const kTitel=KIND.test(title);
     if((!KIND.test(ktext)) || (NICHT_SPIELZEUG_TITEL.test(title)&&!kTitel)){
       tagsFinal=tagsFinal.filter(t=>t!=='kinder'&&t!=='spielzeug');
     }
   }
   const input={title,handle:slug,productType:typeFinal,vendor:'LuxeStyle',
    status:(med||tsch)?'DRAFT':'ACTIVE',
    tags:[...tagsFinal,
          ...(med?['medizinprodukt-pruefen','medizin-zweck-'+med.grund]:[]),
          ...(tsch?['tierschutz-tschv76','tierschutz-'+tsch.grund]:[])],
    descriptionHtml:html,
    seo:{title:(title+' | LuxeStyle CH').slice(0,70),description:snippet(html,title).slice(0,320)},
    productOptions, variants,
    files:[{originalSource:imgs[0],contentType:'IMAGE',alt:(title+' | LuxeStyle').slice(0,120)}]};
   // Google-Merchant-Attribute für ALLE Produkte (2026-07-11 «google merchant sachen auch»): gender + age_group
   // + material (aus CJ-Beschreibung extrahiert). Farbe/Grösse kommen aus Varianten. Google liest mm-google-shopping.
   // 🚻 gender kam bis 14.08.2026 NUR aus den Tags — der Titel wurde nie gelesen. Zwei Folgen,
   // beide am 14.08. an 729 aktiven Produkten nachgewiesen und dort repariert
   // (automation/gender_aus_titel.py): (1) Ware, die per cat_tags nur 'schuhe'/'sneaker'/'mode'
   // bekommt, landete zwangsläufig auf 'unisex' — 656 Produkte wie «Herren Combat Boots» fielen
   // damit aus jeder geschlechtsgefilterten Google-Suche heraus, also genau aus den Suchen mit
   // Kaufabsicht. (2) 'damen' wurde VOR 'herren' geprüft, also gewann ein falsch gesetzter
   // Tag 'damen' an einem Herrenartikel: «Herren High-top Ankle Boots» meldete female, und ein
   // falsches Geschlecht ist schlimmer als ein fehlendes, weil Google das Produkt aktiv der
   // falschen Zielgruppe ausspielt. Der TITEL ist die verlässlichere Quelle und sticht deshalb
   // jetzt die Tags; die Tags bleiben das Auffangnetz. Fallen (Regel: deutsche Zusammensetzungen):
   // «herrenlos» heisst OHNE BESITZER und ist kein Herrenartikel; steht «Damen» UND «Herren» im
   // Titel, ist der Artikel unisex. Der Substring 'mens' wird bewusst NICHT gesucht — er steckt
   // in «Da-MENS-onnenbrille» (dieselbe Falle wie «IPL» in «L-IPL-iner»).
   { const gt=(g.title||'').replace(/herrenlos/ig,' ');
     const gH=/herren/i.test(gt), gD=/damen/i.test(gt);
     const gender=(gH&&gD)||/\bunisex\b/i.test(gt) ? 'unisex'
                : gH ? 'male' : gD ? 'female'
                : grp.tags.includes('herren')?'male':grp.tags.includes('damen')?'female':'unisex';
     // ⚠️ age_group las bis 20.08.2026 `grp.tags` — die STATISCHEN Gruppen-Vorgaben — statt
     // `tagsFinal`, also das, was am Produkt wirklich landet. Folge: jedes Produkt der Gruppe
     // cjspielelektronik meldete Google age_group=kids, auch der Reisbehälter, die Hundeleine,
     // der USB-Stick und die Solar-Tierabwehr. Selbst nachdem der Kinder-Tag oben entfernt
     // wurde, hätte das Metafeld die Falschaussage weitergetragen: dieselbe Lehre wie beim
     // Refurb-Zusatz, der aus dem Titel verschwand und im Feld `condition` stehen blieb.
     const age=(tagsFinal.includes('kinder')||tagsFinal.includes('baby-kids'))?'kids':'adult';
     const mf=[{namespace:'mm-google-shopping',key:'gender',value:gender,type:'single_line_text_field'},
               {namespace:'mm-google-shopping',key:'age_group',value:age,type:'single_line_text_field'},
               // `condition` fehlte hier — und damit bei JEDEM neu importierten Produkt. Am
               // 11.08. waren es 1'856 von 1'856 Tagesimporten ohne dieses Feld. Die
               // Nachfüll-Skripte unter automation/google_feed/ laufen nur einmal; was der
               // Importer nicht mitschreibt, fehlt ab dem nächsten Tag wieder. «new» stimmt
               // hier immer: Gebrauchtes und Generalüberholtes ist im Shop durchweg DRAFT.
               {namespace:'mm-google-shopping',key:'condition',value:'new',type:'single_line_text_field'},
               // `custom_product` sagt Google: dieses Produkt hat KEINE Herstellerkennung (kein
               // GTIN/EAN, keine MPN). Ohne die Angabe wartet Merchant auf eine Nummer, die es
               // bei CJ-Ware nie geben wird, und stuft den Eintrag als unvollständig ein.
               // Stichprobe 13.08.2026: von 300 Produkten im Google-Kanal hatten VIER einen
               // Barcode — allesamt Fortura-Ware mit echter EAN. CJ-Ware hat nie eine, deshalb
               // steht der Wert hier fest auf true. Bei einem Lieferanten MIT EAN gehört er
               // NICHT gesetzt: «hat keine Kennung» wäre dann eine Falschaussage, und die
               // echte EAN ordnet den Artikel bei Google deutlich besser ein.
               {namespace:'mm-google-shopping',key:'custom_product',value:'true',type:'boolean'}];
     // google_product_category — dieselbe Lücke wie bei `condition`, eine Feldebene weiter:
     // der 11.08.-Backfill hob die Abdeckung auf 87 %, tags darauf trugen 6 von 1'912
     // Neuimporten den Wert. Was der Importer nicht schreibt, muss jeden Tag nachgeputzt
     // werden. Die Regeln liegen in google_kategorie.mjs, geprüft gegen Googles Quelldatei.
     { const gkat=googleKategorie(title,tagsFinal,typeFinal);
       if(gkat) mf.push({namespace:'mm-google-shopping',key:'google_product_category',
                         value:gkat,type:'single_line_text_field'}); }
     // Farbe aus der Varianten-Option übernehmen, wenn es eine gibt — Google fragt sie bei
     // Bekleidung ab, und sie steht hier ohnehin schon sauber übersetzt bereit.
     { const farbOpt=(productOptions||[]).find(o=>o.name==='Farbe');
       const farben=(farbOpt?.values||[]).map(v=>v.name);
       // ⚠️ Der Wert wurde bisher WÖRTLICH aus der ERSTEN Variante übernommen und nur auf
       // LÄNGE geprüft. Zwei Fehler steckten darin, beide teuer:
       //
       // (1) Der Wert ist bei CJ-Ware oft gar keine Farbe — «Black-1XL» (25×),
       //     «Style 1-1 PC» (40×), «Amber-30X50cm», «1PC-Sponge brush». Dagegen hilft
       //     `farbeSauber()`.
       // (2) Und selbst wenn er eine Farbe IST, gilt er nur für die erste Variante.
       //     Das Metafeld liegt auf Produktebene, im Google-Feed ist aber jede Variante ein
       //     eigenes Angebot: 9'866 Produkte meldeten so alle ihre Farben als die der ersten
       //     (Fehlersuche 14.08.2026). Deshalb wird das PRODUKT-Feld nur noch bei GENAU EINER
       //     Farbe geschrieben; bei mehreren trägt jede Variante ihre eigene Farbe
       //     (siehe buildFashion). Eine falsche Farbe ist schlechter als keine.
       if(farben.length===1&&farbeSauber(farben[0]))
         mf.push({namespace:'mm-google-shopping',key:'color',value:farben[0],type:'single_line_text_field'}); }
     // Material — Erkennung liegt in material_kanonisch.mjs.
     // ⚠️ NUR DAS MATERIALWORT NEHMEN, nicht den ganzen Fund. Der Ausdruck griff über das
     // Material hinaus in die nächste Tabellenüberschrift und schrieb «Polyester Style»
     // (174×), «Plastic Packing list» (73×), «Alloy Packing list» (27×) in den Feed — Google
     // liest das als Materialangabe. Von 4'924 gesetzten Werten waren 4'566 solcher Müll.
     // ⚠️ ZWEITE HÄLFTE DESSELBEN FEHLERS (14.08.2026): «nur das Materialwort» nahm aus der
     // alten MATWORDS-Liste den ERSTEN Treffer — aus «PU leather» also «leather» → «Leather».
     // Live standen dadurch 176 Produkte mit material="Leather", deren eigene Beschreibung
     // PU-/Kunstleder nennt (Merchant-Misrepresentation + UWG: «Leder» ist ein geschützter
     // Begriff), 446 mit dem Nicht-Wort "Stainless" und 16 Schmuckstücke mit "Gold"/"Silver"
     // für vergoldetes Kupfer. materialKanonisch() prüft spezifisch vor allgemein, kennt
     // Plattierung und liefert deutsche Namen.
     // Ein falscher Wert ist im Feed schlechter als ein leerer.
     const mm=(feats||'').match(/\b(?:material|made of|fabric|composition)\b[:\s]+([a-zA-ZäöüÄÖÜ0-9%,\s\/-]{3,40})/i);
     if(mm){const mat=materialKanonisch(mm[1]);
       if(mat) mf.push({namespace:'mm-google-shopping',key:'material',
                        value:mat, type:'single_line_text_field'});}
     input.metafields=mf; }
   // 💾 KAPAZITÄTS-WACHE (16.08.2026): CJ listet Datenträger mit erfundener Kapazität —
   // «256 TB SSD» für CHF 15.90, elf Stück standen ACTIVE im Google-Kanal. Es gibt keine
   // 60/128/256-TB-Consumer-Datenträger, und echte 2-TB-Ware kostet ein Mehrfaches.
   // Regel: TB-Behauptung im Titel/Text + Verkaufspreis unter CHF 60 → gar nicht anlegen.
   // (Gehäuse/Docks sagen «bis X TB» über FREMDE Platten — die Wache greift nur, wenn kein
   // Gehäuse-Wort dabei ist.)
   {
     const tbM=(title+' '+html.slice(0,600)).match(/\b(\d{1,3})\s*TB\b/i);
     const istGehaeuse=/geh[äa]use|enclosure|dock|adapter|kabel|h[üu]lle|case\b/i.test(title);
     const preisNum=parseFloat(variants[0]?.price||'0');
     if(tbM && !istGehaeuse && (parseInt(tbM[1],10)>=32 || preisNum<60)){
       console.log('  skip(kapazitaet-unglaubwuerdig)', tbM[0], 'CHF'+preisNum, title.slice(0,40));
       fs.appendFileSync(LEDGER,'cj:'+p.pid+'\n'); done.add(String(p.pid)); continue;
     }
     // Dasselbe für Powerbank-mAh: ab 50'000 mAh zum Gadget-Preis ist die Zahl erfunden
     // (echte 50-Ah-Geräte sind Power-Stations). 4 Stück standen am 16.08. ACTIVE.
     const mahM=title.match(/\b(\d{4,6})\s*m[aA]h\b/);
     if(mahM && parseInt(mahM[1],10)>=50000){
       console.log('  skip(mah-unglaubwuerdig)', mahM[0], title.slice(0,40));
       fs.appendFileSync(LEDGER,'cj:'+p.pid+'\n'); done.add(String(p.pid)); continue;
     }
     // TSchV Art. 76: Erziehungsgeräte mit Schock-, Impuls- oder Reizstoffwirkung sind in der
     // Schweiz nicht frei verkäuflich — gar nicht erst anlegen. Die heikel-Wache klammert
     // Tiergeräte bewusst aus (kein-mensch-als-ziel).
     // ⚠️ HIER STAND BIS ZUM 20.08.2026 EIN EIGENES, ZU ENGES MUSTER, und es ist genau die
     // Falle, vor der das Gedächtnis an drei anderen Stellen warnt: es verlangte «Halsband»
     // oder «Collar» IM TITEL und kannte als Wirkung nur «Schock/Stromstoss/elektro-impuls».
     // Gegenprobe an den 14 Geräten, die am 20.08. live standen: NEUN wären durchgerutscht —
     // «Drahtloser Hundezaun», «Hundebellen», «Elektronisches Hunde-Trainingsgerät» tragen kein
     // Halsband im Titel, und «statischer Impuls», «elektrostatische Stimulation»,
     // «elektrischem Impuls», «Puls-proportionale Stimulation» sind die Tarnwörter, unter denen
     // der Lieferant den Schock verkauft. Drei der neun hat dieses Muster am 19.08. selbst
     // durchgelassen, am Tag, an dem es geschrieben wurde. Es prüft jetzt nach der WIRKMECHANIK
     // und liest den GANZEN Text — ein Muster, eine Datei, zwei Leser (tierschutz_guard.py).
     if(tsch){
       console.log(`  skip(tschv76/${tsch.grund})`, `«${tsch.muster}»`, title.slice(0,40));
       fs.appendFileSync(LEDGER,'cj:'+p.pid+'\n'); done.add(String(p.pid)); continue;
     }
   }
   // Dubletten-Wache: existiert schon ein aktives Produkt mit exakt diesem Titel? (Lieferant listet gleiche Artikel mehrfach)
   const dq=await sgql(st,`query($q:String!){products(first:1,query:$q){edges{node{id}}}}`,{q:`title:"${title.replace(/"/g,'')}" status:active`});
   if(dq.data?.products?.edges?.length){console.log('  skip(dup-titel)',title.slice(0,40));continue;}
   // ⚠️ ZWEITE STUFE (20.08.2026): Shopifys `title:"…"` ist eine WORT-Suche und tokenisiert
   // Bindestriche NICHT — «Keramik Futternapf für Katzen, erhöht» und «Keramik-Futternapf für
   // Katzen, erhöht» standen beide aktiv im Shop. Auch eine Suche nach «Futternapf Katzen» findet
   // die Bindestrich-Variante nicht, ein normalisierter Titelvergleich hilft also nichts, wenn
   // die Kandidatenliste schon leer zurückkommt.
   // Verlässlich ist der HANDLE: Shopify slugifiziert den Titel (Satzzeichen → «-», Umlaute
   // aufgelöst), unser Importer hängt eine Zufallszahl an. Zwei Titel, die sich nur in
   // Satzzeichen unterscheiden, ergeben denselben Slug — `handle:<slug>*` findet sie beide.
   // Nur `^slug-<Ziffern>$` gilt als Dublette; ein längerer Slug («…-erhohte-position») ist
   // ein anderes Produkt, sonst würde «Kissen» auch «Kissenbezug» erschlagen.
   // ⚠️ DRITTER AKT (20.08.2026): Die Wache kürzte den Stamm NICHT, der Handle-Bau schon (46).
   // Gesucht wurde «…-blumen-landschaft», im Shop steht «…-blumen-lands-166720» → die Abfrage
   // kam leer zurück, beide «DIY Digital-Ölgemälde nach Zahlen …» wurden angelegt. Eine Wache,
   // die anders normalisiert als der Erzeuger, prüft eine Zeichenkette, die es nie gibt.
   const dupSlug = slugStamm(title);
   if(dupSlug.length>8 && laufSlugs.has(dupSlug)){
     console.log('  skip(dup-handle-lauf)',title.slice(0,40));
     fs.appendFileSync(LEDGER,'cj:'+p.pid+'\n'); done.add(String(p.pid)); continue;
   }
   if(dupSlug.length>8){
     const hq=await sgql(st,`query($q:String!){products(first:25,query:$q){edges{node{handle title}}}}`,
                         {q:`handle:${dupSlug}* status:active`});
     // ⚠️ VIERTER AKT (23.08.2026): Das Muster verlangte ZIFFERN als Suffix — aber der
     // Handle-Bau haengt `String(pid).slice(-6)` an, und CJs pid ist nicht immer eine Zahl.
     // Bei einer UUID-pid endet der Handle auf HEX («…-10-teilig-c71e9b»), und die Wache
     // sah ihn nicht. So entstanden «Make-up Pinselset, 10-teilig» und «Make-up Pinselset
     // (10-teilig)» — beide aktiv, beide CHF 15.90, beide im Google-Kanal.
     // Das Suffix darf keinen Bindestrich enthalten; «…-erhohte-position» bleibt damit
     // weiterhin ein ANDERES Produkt (die Regel von 20.08. gilt unveraendert).
     const treffer=(hq.data?.products?.edges||[]).find(e=>new RegExp('^'+dupSlug+'-[0-9a-z]{4,10}$').test(e.node.handle));
     if(treffer){
       console.log('  skip(dup-handle)',title.slice(0,40),'≈',treffer.node.title.slice(0,40));
       fs.appendFileSync(LEDGER,'cj:'+p.pid+'\n'); done.add(String(p.pid)); continue;
     }
   }
   // ⚠️ SKU-WACHE (15.08.2026). Die Titel-Wache greift nicht, wenn zwei Runner dasselbe
   // CJ-Produkt unter VERSCHIEDENEN erzeugten Titeln anlegen — genau so entstanden heute
   // «Apricot-Sandalen mit Klettverschluss» und «Schmale Wedges»: 40 identische Varianten-
   // SKUs, zwei aktive Produkte, beide vom selben Tag. Die Varianten-SKU des Lieferanten
   // ist eindeutig; steht sie schon an einem aktiven Produkt, ist die Ware schon im Shop.
   // ⚠️ 04.09.2026: DIE SKU HAT ZWEI SCHREIBWEISEN. Der Bild-Hash-Waechter fand 13 Paare,
   // deren Varianten-SKU sich NUR im Praefix unterscheidet — «CJLY291739901AZ» (Juni) gegen
   // «CJ-CJLY291739901AZ» (August), dasselbe Kleid, einmal CHF 39.90 und einmal 24.90, beide
   // aktiv. Die Wache suchte exakt die eigene Schreibweise und ging an der anderen vorbei.
   // Gesucht wird deshalb in BEIDEN Formen. (Dieselbe Familie wie «eine Klassenzahl gilt nur
   // fuer die Form, mit der man gesucht hat».)
   const ersteSku=(variants[0]?.inventoryItem?.sku||'').replace(/"/g,'');
   if(ersteSku.length>8){
     const ohne=ersteSku.replace(/^CJ-/,'');
     const formen=[...new Set([ersteSku, ohne, 'CJ-'+ohne])];
     const q=formen.map(f=>`sku:"${f}"`).join(' OR ');
     const sq=await sgql(st,`query($q:String!){products(first:1,query:$q){edges{node{id}}}}`,
                         {q:`(${q}) AND status:active`});
     if(sq.data?.products?.edges?.length){console.log('  skip(dup-sku)',ersteSku.slice(0,30));
       fs.appendFileSync(LEDGER,'cj:'+p.pid+'\n'); done.add(String(p.pid)); continue;}
   }
   // Rennschutz (01.09.): siehe cj_claim.mjs — der Shopify-Suchindex hinkt, die
   // dup-sku-Pruefung oben faengt gleichzeitige Importe deshalb NICHT.
   if(schonBeansprucht(p.pid)){console.log('  = Rennschutz: pid parallel in Arbeit —',title.slice(0,40));continue;}
   const r=await sgql(st,SET,{i:input}); const e=r.data?.productSet?.userErrors||[]; const pid=r.data?.productSet?.product?.id;
   if(e.length||!pid){console.log('  ✗',title.slice(0,30),JSON.stringify(e).slice(0,80));continue;}
   laufSlugs.add(slugStamm(title));
   // Alt gleich beim Anhängen mitgeben — genauso wie es cj_sku_import.mjs und
   // cj_trending_import.mjs seit jeher tun. NUR HIER fehlte es, und genau dieser Importer
   // ist der CJ-Grind mit ~2'000 Produkten am Tag. Zweite Reihe ist `altTexte()` weiter
   // unten, die nach dem Umsortieren des Hauptbildes prüft, ob wirklich jedes Bild eines hat.
   const media=imgs.slice(1).map((u,i)=>({originalSource:u,mediaContentType:'IMAGE',
     alt:(title+' – Bild '+(i+2)+' | LuxeStyle').slice(0,120)}));
 if(media.length)await sgql(st,MED,{id:pid,m:media});
   // ⚠️ BILD-QUITTUNG VOR DEM VERÖFFENTLICHEN (11.08.2026). Shopify lädt Bilder asynchron
   // nach; scheitern ALLE, bleibt `mediaCount` auf 7 stehen, aber `featuredMedia` ist null.
   // Genau so stand «Outdoor Camping Gerades Messer» live im Shop UND im Google-Kanal — mit
   // sieben Medien im Status FAILED und keinem einzigen sichtbaren Bild. In der Kollektion
   // ein leeres Feld, bei Google eine sichere Ablehnung. Ein Produkt ohne Bild ist kein
   // Produkt: dann lieber als Entwurf liegen lassen, als es unsichtbar zu verkaufen.
   if(!await hatBild(st,pid)){
    await sgql(st,`mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}`,
               {i:{id:pid,status:'DRAFT',tags:['bilder-fehlgeschlagen']}});
    console.log('  ⛔ kein Bild geladen → DRAFT:',title.slice(0,44));
    fs.appendFileSync(LEDGER,'cj:'+p.pid+'\n'); done.add(String(p.pid));
    continue;
   }
   // Erst jetzt stehen die Bildmasse fest (Shopify verarbeitet asynchron) — deshalb hier und
   // nicht vor dem Anlegen: eine Miniatur darf nicht das Hauptbild bleiben.
   await grossbildNachVorn(st,pid);
   if(fash?.bilder){const nb=await variantenBilder(st,pid,fash.bilder);
     if(nb)console.log(`  🎨 ${nb} Varianten mit eigenem Bild`);}
   // Alt-Texte ganz zum Schluss: jetzt steht fest, welches Bild das Hauptbild ist und
   // welche Variantenbilder dazugekommen sind.
   { const na=await altTexte(st,pid,title); if(na)console.log(`  🏷️ ${na} Alt-Texte gesetzt`); }
   // Ein Medizinprodukt darf in KEINEN Kanal — am wenigsten in «Google & YouTube», den
   // einzigen mit belegten Verkäufen. Nicht publizieren, Fall im Log benennen.
   if(med){ console.log(`  ⚕️ medizinische Zweckbestimmung (${med.grund}) → DRAFT, nicht publiziert: ${title.slice(0,44)}`);
            fs.appendFileSync(LEDGER,'cj:'+p.pid+'\n'); done.add(String(p.pid)); got++; total++; continue; }
   // Ein nach TSchV Art. 76 unzulässiges Erziehungsgerät ebenso: in KEINEN Kanal, am wenigsten
   // in «Google & YouTube». Nicht löschen — als Entwurf nachvollziehbar und freischaltbar.
   if(tsch){ console.log(`  🐾 Tierschutz TSchV 76 (${tsch.grund}, «${tsch.muster}») → DRAFT, nicht publiziert: ${title.slice(0,44)}`);
            fs.appendFileSync(LEDGER,'cj:'+p.pid+'\n'); done.add(String(p.pid)); got++; total++; continue; }
   // Nach Schweizer Waffenrecht verbotene Ware (Art. 4 Abs. 1 Bst. c-e WG: Schmetterlings-
   // messer, Schlagstock/Tonfa/Nunchaku, Elektroschockgeraet) wird gar nicht erst aktiv
   // geschaltet — bereits das ANBIETEN ist nach Art. 5 verboten. Alles andere Heikle bleibt
   // im Shop kaufbar, kommt aber in KEINEN Kanal: der Kanal ist das Risiko, nicht das Regal.
   if(heik){
    const tag = heik.verboten ? 'waffengesetz-verboten'
              : (heik.gruppe==='waffe' ? 'waffe-pruefen' : 'verdeckte-ueberwachung');
    await sgql(st,`mutation($i:ProductInput!){productUpdate(input:$i){userErrors{message}}}`,
               {i:{id:pid, tags:[...tagsFinal, tag], ...(heik.verboten?{status:'DRAFT'}:{})}});
    console.log(`  🕵️ ${heik.gruppe} (${heik.grund}) → ${heik.verboten?'DRAFT':'kein Kanal'}, Tag ${tag}: ${title.slice(0,40)}`);
    fs.appendFileSync(LEDGER,'cj:'+p.pid+'\n'); done.add(String(p.pid)); got++; total++; continue;
   }
   await publishVerified(st,pid,title);
 if(d.productVideo&&/^https/.test(d.productVideo))await attachVideo(st,pid,d.productVideo,p.pid);
   fs.appendFileSync(LEDGER,'cj:'+p.pid+'\n'); done.add(String(p.pid));
   got++;total++; console.log(`✅ ${title} → ${pid.split('/').pop()}`);
   await sleep(300);
  }
 }
 // Zeiger fortschreiben — NACH der Seitenschleife, nicht darin: bei einer leeren Seite wird
 // die Schleife mit `break` verlassen, ein Schreibbefehl am Schleifenende käme dann nie dran.
 // Genau daran scheiterte der erste Anlauf (alle Zeiger blieben auf 21 stehen).
 // letzteSeite===0 bedeutet «Kategorie war zu Ende» -> wieder bei Seite 1 beginnen.
 if(zeigerBehalten) catsFehler++; else catsOk++;
 if(!zeigerBehalten){ try{ fs.writeFileSync(zFile, String(letzteSeite===0?1:letzteSeite+1)); }catch{} }
 console.log(`${label}: total ${total}${zeigerBehalten?' (Zeiger unveraendert — CJ-Fehler)':` (Zeiger → Seite ${letzteSeite===0?1:letzteSeite+1})`}`);
}
// ⚠️ EIN LAUF, DER KEINE EINZIGE KATEGORIE LESEN KONNTE, IST NICHT FERTIG (27.08.2026).
// Ein fehlender CJ-Token («1600002 access token cannot be empty») liess jede Kategorie
// scheitern, der Lauf endete trotzdem mit «FERTIG: 0» und Exit 0 — und der Queue-Runner
// quittierte die Gruppe als ERLEDIGT, obwohl nichts geholt wurde. Genau die Falle, die
// fuer das leere Punktebudget schon eigens abgefangen wird, nur mit anderem Fehlercode.
// Der Runner darf sich nicht auf eine Fehlerliste verlassen: Exit != 0 sagt ihm, dass
// hier nichts quittiert werden darf.
if(catsOk===0 && catsFehler>0){
  console.log(`\nABBRUCH: keine einzige Kategorie lesbar (${catsFehler} Fehler, zuletzt ${letzterFehler}) — Gruppe bleibt offen.`);
  process.exit(3);
}
console.log(`\nFERTIG: ${total} ${grp.type}${DRY?' [DRY]':''}.`);
