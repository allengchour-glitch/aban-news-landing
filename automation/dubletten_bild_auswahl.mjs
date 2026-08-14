/**
 * dubletten_bild_auswahl.mjs — Auswahlschritt für Gruppe C von dubletten_draften.mjs
 * ================================================================================
 * Nimmt die bildgleichen Gruppen (byte-identisches Hauptbild) und entscheidet, welche
 * davon echte Dubletten sind. Die maschinellen Wachen laufen VORHER (Set-/Farb-/
 * Modell-/Masseinheits-/Verneinungsunterschied); was sie durchlassen, steht hier mit
 * der Handentscheidung. Begründung jeder Ausnahme im SKIP-Objekt, auf Deutsch.
 *
 * Gewinnerregel, in dieser Reihenfolge:
 *   1. Ein Produkt mit Bewertungen wird nie gedraftet (in dubletten_draften.mjs).
 *   2. Liegt eines unter dem absoluten Preisboden von CHF 14.90 und das andere nicht,
 *      verliert das billige — sonst bliebe der Verlustbringer stehen (CLAUDE.md
 *      «Relativer Boden ist kein Boden», automation/preisboden.py).
 *   3. Sonst verliert das Produkt mit WENIGER Bildern.
 *   4. Bei Gleichstand verliert das jüngere (die ältere URL trägt die SEO-Historie).
 *
 * Ausgabe: plan_c.json für dubletten_draften.mjs.
 */
import fs from 'fs';
const P=JSON.parse(fs.readFileSync('active.json','utf8')); const byId=new Map(P.map(x=>[x.id,x]));
const gut=JSON.parse(fs.readFileSync('cgut.json','utf8'));
// Handprüfung: Nummern (1-basiert) die NICHT angefasst werden, mit Grund
const SKIP={
 4:'POD-/Editor-Linie — «Selbst gestalten» ist laut CLAUDE.md heilig, nicht ohne POD-QA anfassen',
 5:'Bambusfaser gegen Baumwolle — widersprüchliche Materialangabe, evtl. zwei Artikel',
 7:'Bambus-Baumwolle gegen Bambus-Cashmere — andere Materialangabe',
 14:'Modellname T87 nur auf einer Seite',
 17:'«S6 Blau» — Modellcode und Farbe nur auf einer Seite',
 18:'zwei verschiedene CJ-Artikelnummern, Preis 31.90/39.90 — vermutlich zwei Bettgrössen',
 35:'«geometrisch» gegen «vergoldet, bunt» — andere Ausführung',
 38:'«mit Ball» ist ein Ausstattungsunterschied',
 40:'«rote und weisse» gegen «rote» — anderes Nageldesign',
 43:'«3-Kamera» gegen «Hindernis-Erkennung» — andere Ausstattung',
 47:'«Feldfahrer» gegen «taktisch» — vermutlich zwei Helme',
 51:'Hundemantel gegen Hunde-Kleid — anderes Kleidungsstück',
 58:'«mit Leine» — der eine enthält die Leine, der andere nicht',
 60:'«mit Naturstein» gegen «Wickelarmband» — andere Ausführung',
 64:'Fortura-Kostüm mit Grösse im Titel — Grössendeckung nicht geprüft',
 65:'Fortura-Kostüm mit Grösse im Titel — Grössendeckung nicht geprüft',
 66:'Fortura-Kostüm mit Grösse im Titel — Grössendeckung nicht geprüft',
 67:'Fortura-Kostüm — Kinder- gegen Erwachsenenschnitt möglich',
 68:'Fortura-Dirndlbluse mit Grösse 54 im Titel',
 69:'Fortura-Dirndlbluse «mit Spitze» gegen ohne',
 70:'Fortura-Dirndl mit Grösse 48 im Titel',
 71:'Dirndl antikblau gegen hellblau — zwei Farben',
 72:'Fortura-Kostüm mit Altersangabe im Titel',
 55:'Fortura: identischer Titel, aber CHF 49.90/51.50 — nach dem Muster aus Gruppe A zwei Grössen, keine Dublette',
 73:'Fortura: identischer Titel, CHF 27.50/24.00 — vermutlich zwei Ausführungen',
 74:'Fortura: identischer Titel, CHF 48/45 — vermutlich zwei Grössen',
 75:'Fächer gegen Bolero — völlig verschiedene Artikel',
 76:'Tutu mit Grössenangabe im Titel',
 77:'Waggishose Erwachsene gegen Kinder',
 78:'Waggishose Erwachsene gegen Kinder',
 79:'Fahne gegen Flagge 90x90 cm — Grössenangabe nur auf einer Seite',
 81:'Latte-Kännchen 350 ml gegen Milchgiesskanne mit Silikon — andere Ausstattung',
 82:'Feuerdrache gegen Traktor — zwei verschiedene Motive',
 83:'«zum Schnüren» ist ein Ausstattungsunterschied',
 85:'Mules gegen Canvas-Slipper — zwei Schuhtypen',
 86:'Geburtsstein-Ring gegen Engel-Flügel-Ring — zwei Ringe',
 87:'Kugelkettchen gegen Buchstaben-Halskette — zwei Ketten',
};
const BODEN=14.90;
const plan=[],uebersprungen=[];
gut.forEach((g,i)=>{
 const n=i+1;
 if(SKIP[n]){ uebersprungen.push([g,SKIP[n]]); return; }
 const [a,b]=g.map(x=>byId.get(x));
 let los,win;
 const aUnter=a.price<BODEN-0.001, bUnter=b.price<BODEN-0.001;
 if(aUnter!==bUnter){ los=aUnter?a:b; win=aUnter?b:a; }          // Preisboden schlägt Bildzahl
 else if(a.mc!==b.mc){ los=a.mc<b.mc?a:b; win=a.mc<b.mc?b:a; }   // weniger Bilder verliert
 else { los=a.id>b.id?a:b; win=a.id>b.id?b:a; }                  // sonst: das jüngere verliert
 plan.push({loser:los.id,winner:win.id,gruppe:'bild'});
});
fs.writeFileSync('plan_c.json',JSON.stringify(plan,null,1));
console.log('von Hand ausgenommen:',uebersprungen.length);
for(const [g,r] of uebersprungen) console.log('   ['+r+']\n      '+g.map(i=>byId.get(i).t.slice(0,50)).join('  |  '));
console.log('\nzu draften:',plan.length);
for(const p of plan){const l=byId.get(p.loser),w=byId.get(p.winner);
 console.log(`  DRAFT ${l.id} CHF${l.price} b${l.mc} "${l.t.slice(0,48)}"  <=  bleibt ${w.id} CHF${w.price} b${w.mc} "${w.t.slice(0,48)}"`);}
