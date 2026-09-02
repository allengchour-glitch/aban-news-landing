// cj_specs.mjs — EINE Quelle fuer den Faktenblock «Produktdetails» aller CJ-Importer (02.09.2026).
//
// Anlass (Betreiber 02.09.2026): «spezifikation besser beschreiben vertiefen». Die Produktseite
// zeigt seit dem 02.09. eine Tabelle «Spezifikationen & Details» (templates/product.json,
// Block lux_spezifikationen) und liest dafuer zur Laufzeit die Liste
// <div class="ls-produktdetails"><h4>Produktdetails</h4><ul><li><strong>Schluessel:</strong> Wert</li>…
// aus dem Beschreibungstext. Die drei CJ-Importer schrieben diese Liste bisher NICHT — Material,
// Gewicht und Masse stehen bei CJ (materialNameEn, productWeight, «Size: …»-Zeilen), wurden gelesen
// und weggeworfen (dieselbe Klasse wie Einkaufspreis und Gewicht vor dem 20./22.08.).
//
// Regeln: NUR belegte Werte (Material nur, wenn die Tabelle es kennt — kein englisches Wort in
// einer deutschen Tabelle; Masse nur mit Ziffer; Gewicht nur > 0). Fehlt alles, kommt KEIN Block —
// eine leere Ueberschrift ist schlimmer als keine. Schluessel-Form muss zur Theme-Parserei passen:
// <li><strong>K:</strong> V</li>. Herkunft der Muster: cj_variant_backfill.mjs (buildDetails), das
// jetzt ebenfalls von hier liest.

export const MAT_DE = { plastic:'Kunststoff', metal:'Metall', glass:'Glas', 'stainless steel':'Edelstahl',
  cotton:'Baumwolle', polyester:'Polyester', 'polyester fiber':'Polyester', wood:'Holz', ceramic:'Keramik',
  silicone:'Silikon', 'silica gel':'Silikon', leather:'Leder', 'pu leather':'PU-Leder', pu:'PU-Leder',
  alloy:'Metall-Legierung', 'zinc alloy':'Zinklegierung', copper:'Kupfer', acrylic:'Acryl', nylon:'Nylon',
  canvas:'Canvas', latex:'Latex', resin:'Harz', bamboo:'Bambus', linen:'Leinen', velvet:'Samt', tpu:'TPU',
  abs:'ABS-Kunststoff', pvc:'PVC', sponge:'Schaumstoff', iron:'Eisen', rubber:'Gummi', paper:'Papier',
  crystal:'Kristall', pearl:'Perle', zircon:'Zirkonia', flannel:'Flanell', 'oxford cloth':'Oxford-Gewebe',
  oxford:'Oxford-Gewebe', spandex:'Elasthan', silk:'Seide', wool:'Wolle', aluminum:'Aluminium',
  aluminium:'Aluminium', 'aluminum alloy':'Aluminium-Legierung', 'carbon fiber':'Carbon', eva:'EVA-Schaum',
  pp:'Polypropylen', pet:'PET', lace:'Spitze', denim:'Denim', chiffon:'Chiffon', cashmere:'Kaschmir',
  'stainless':'Edelstahl', 'titanium steel':'Titanstahl', titanium:'Titan', brass:'Messing', '925 silver':'925er Silber',
  'sterling silver':'925er Silber', 'plush':'Pluesch', fleece:'Fleece', 'faux fur':'Kunstfell', 'microfiber':'Mikrofaser',
  'polyurethane':'PU', 'tempered glass':'Gehaertetes Glas', 'stone':'Stein', 'marble':'Marmor', 'cork':'Kork',
  'rattan':'Rattan', 'jute':'Jute', 'felt':'Filz', 'mesh':'Mesh-Gewebe', 'knitted':'Strick', 'viscose':'Viskose' };

// Uebersetzt ein CJ-Materialwort; unbekannt → null (nichts Englisches in die Tabelle).
export function deMat(m){ const k=String(m||'').toLowerCase().trim(); if(!k) return null; return MAT_DE[k] || null; }

const MAP={ size:'Masse', dimensions:'Masse', 'product size':'Masse', 'item size':'Masse', 'package size':'Verpackungsmasse',
  thickness:'Dicke', length:'Länge', width:'Breite', height:'Höhe', diameter:'Durchmesser', capacity:'Fassungsvermögen',
  voltage:'Spannung', power:'Leistung', 'battery capacity':'Akku-Kapazität', 'cable length':'Kabellänge',
  'net weight':'Gewicht', weight:'Gewicht', 'screen size':'Bildschirmgrösse', 'input':'Eingang', 'output':'Ausgang',
  'wattage':'Leistung', 'charging time':'Ladezeit', 'working time':'Laufzeit', 'usage time':'Laufzeit' };

// Liest «Size: 20*30cm»-Zeilen aus der CJ-Beschreibung. Nur Werte mit Ziffer, max 4 Zeilen.
export function extractSpecs(desc){
  const t=String(desc||'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/(p|li|div|tr)>/gi,'\n').replace(/<[^>]+>/g,' ');
  const rows=[]; const seen=new Set();
  for(const line of t.split('\n')){
    const m=line.match(/^\s*([A-Za-z][A-Za-z ]{2,20})\s*[:：]\s*([^:：]{2,60}?)\s*$/);
    if(!m) continue;
    const key=m[1].trim().toLowerCase();
    if(!(key in MAP)||seen.has(MAP[key])) continue;
    let val=m[2].trim().replace(/\s+/g,' ').replace(/\*/g,' × ').replace(/\s*x\s*/gi,' × ');
    if(!/\d/.test(val)) continue;
    if(/color|colour/i.test(key)) continue;
    if(/[一-鿿]/.test(val)) continue;      // chinesische Zeichen: nicht in die Tabelle
    seen.add(MAP[key]); rows.push([MAP[key], val]);
    if(rows.length>=4) break;
  }
  return rows;
}

function fmtG(w){ return w>=1000 ? `${(w/1000).toFixed(1).replace('.0','')} kg` : `${Math.round(w)} g`; }
// CJ liefert bei Mehr-Varianten-Produkten SPANNEN («350.00-512.00», Lehre 27.08.) — beide Enden zeigen.
export function gewichtText(g){
  const s=String(g??'').trim(); if(!s) return null;
  const m=s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if(m){ const a=Number(m[1]), b=Number(m[2]); if(a<=0||b>50000||b<=a) return null; return `ca. ${fmtG(a)} – ${fmtG(b)} (je nach Variante)`; }
  const w=Number(s)||0; if(w<=0||w>50000) return null;
  return `ca. ${fmtG(w)}`;
}
// Textmerkmale aus «Product information»-Zeilen: nur Schluessel UND Werte, die die Tabelle kennt —
// nichts Englisches, nichts Geratenes. Unbekannter Wert → Zeile faellt weg.
const TEXTKEYS={ 'sleeve length':['Ärmellänge',{'long sleeve':'Langarm','short sleeve':'Kurzarm','sleeveless':'Ärmellos','three quarter sleeve':'¾-Arm','3/4 sleeve':'¾-Arm','half sleeve':'Halbarm'}],
  'sleeve':['Ärmellänge',{'long sleeve':'Langarm','short sleeve':'Kurzarm','sleeveless':'Ärmellos'}],
  'thickness':['Stoffdicke',{'regular':'normal','thin':'dünn','thick':'dick','medium':'mittel','standard':'normal'}],
  'collar':['Kragen',{'o-neck':'Rundhals','round neck':'Rundhals','crew neck':'Rundhals','v-neck':'V-Ausschnitt','hooded':'Kapuze','turtleneck':'Rollkragen','polo collar':'Polokragen','stand collar':'Stehkragen','lapel':'Revers','square neck':'Karree-Ausschnitt','halter':'Neckholder','off shoulder':'Schulterfrei'}],
  'neckline':['Ausschnitt',{'o-neck':'Rundhals','round neck':'Rundhals','v-neck':'V-Ausschnitt','square neck':'Karree','halter':'Neckholder','off shoulder':'Schulterfrei','boat neck':'U-Boot-Ausschnitt'}],
  'closure':['Verschluss',{'zipper':'Reissverschluss','zip':'Reissverschluss','button':'Knöpfe','buttons':'Knöpfe','pullover':'zum Überziehen','elastic waist':'Gummibund','lace-up':'Schnürung','lace up':'Schnürung','hook':'Haken','velcro':'Klettverschluss','snap':'Druckknöpfe','drawstring':'Kordelzug','none':'ohne'}],
  'closure type':['Verschluss',{'zipper':'Reissverschluss','button':'Knöpfe','lace-up':'Schnürung','lace up':'Schnürung','velcro':'Klettverschluss','slip-on':'zum Hineinschlüpfen','buckle':'Schnalle','hook and loop':'Klettverschluss'}],
  'pattern':['Muster',{'solid':'Uni','solid color':'Uni','print':'Print','printed':'Print','floral':'Blumen','striped':'Gestreift','stripe':'Gestreift','plaid':'Karo','dot':'Punkte','polka dot':'Punkte','geometric':'Geometrisch','letter':'Schriftzug','animal':'Tiermotiv','camouflage':'Camouflage','tie dye':'Batik','leopard':'Leopard'}],
  'fit':['Passform',{'loose':'locker','slim':'schmal','regular':'normal','oversized':'Oversize','straight':'gerade','skinny':'eng'}],
  'fit type':['Passform',{'loose':'locker','slim':'schmal','regular':'normal','oversized':'Oversize','straight':'gerade'}],
  'waist':['Bund',{'high waist':'hohe Taille','mid waist':'mittlere Taille','low waist':'niedrige Taille','elastic waist':'Gummibund'}],
  'waistline':['Bund',{'high waist':'hohe Taille','mid waist':'mittlere Taille','low waist':'niedrige Taille','natural':'natürliche Taille'}],
  'elasticity':['Dehnbarkeit',{'high elasticity':'hoch','micro elastic':'leicht','micro-elastic':'leicht','medium elasticity':'mittel','no elasticity':'keine','non-elastic':'keine','none':'keine'}],
  'season':['Saison',{'spring':'Frühling','summer':'Sommer','autumn':'Herbst','fall':'Herbst','winter':'Winter','spring/autumn':'Frühling/Herbst','spring and autumn':'Frühling/Herbst','four seasons':'ganzjährig','all season':'ganzjährig','all seasons':'ganzjährig'}],
  'style':['Stil',{'casual':'Casual','sport':'Sport','sports':'Sport','elegant':'Elegant','vintage':'Vintage','retro':'Retro','boho':'Boho','bohemian':'Boho','street':'Streetwear','business':'Business','minimalist':'Minimalistisch','sexy':'Figurbetont','sweet':'Verspielt','classic':'Klassisch','modern':'Modern','nordic':'Nordisch','european':'Europäisch','japanese':'Japanisch','korean':'Koreanisch','simple':'Schlicht'}],
  'heel height':['Absatzhöhe',{'flat':'flach','low':'niedrig','medium':'mittel','high':'hoch','flat heel':'flach'}],
  'toe':['Zehenform',{'round toe':'rund','pointed toe':'spitz','square toe':'eckig','open toe':'offen'}],
  'toe shape':['Zehenform',{'round':'rund','pointed':'spitz','square':'eckig','open':'offen','round toe':'rund','pointed toe':'spitz'}],
  'gender':['Für',{'women':'Damen','men':'Herren','unisex':'Unisex','female':'Damen','male':'Herren','kids':'Kinder','children':'Kinder','girls':'Mädchen','boys':'Jungen','baby':'Baby'}],
  'power source':['Stromversorgung',{'battery':'Batterie','usb':'USB','rechargeable':'Akku (aufladbar)','rechargeable battery':'Akku (aufladbar)','solar':'Solar','electric':'Netzstrom','plug in':'Netzstrom','plug-in':'Netzstrom','lithium battery':'Lithium-Akku'}],
  'power supply':['Stromversorgung',{'battery':'Batterie','usb':'USB','rechargeable':'Akku (aufladbar)','solar':'Solar'}],
  'waterproof':['Wasserdicht',{'yes':'ja','no':'nein','waterproof':'ja','ipx7':'IPX7','ipx6':'IPX6','ipx5':'IPX5','ipx4':'IPX4','ip67':'IP67','ip68':'IP68','ip65':'IP65'}],
  'washing':['Pflege',{'machine wash':'Maschinenwäsche','hand wash':'Handwäsche','hand wash only':'nur Handwäsche','dry clean':'Reinigung','machine washable':'Maschinenwäsche'}],
  'care':['Pflege',{'machine wash':'Maschinenwäsche','hand wash':'Handwäsche','hand wash only':'nur Handwäsche','machine washable':'Maschinenwäsche'}],
  'shape':['Form',{'round':'rund','square':'eckig','oval':'oval','rectangular':'rechteckig','rectangle':'rechteckig','heart':'Herz','star':'Stern'}],
};
export function textMerkmale(desc){
  const t=String(desc||'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/(p|li|div|tr)>/gi,'\n').replace(/<[^>]+>/g,' ');
  const rows=[]; const seen=new Set();
  for(const line of t.split('\n')){
    const m=line.match(/^\s*([A-Za-z][A-Za-z \/-]{2,20})\s*[:：]\s*([^:：]{2,40}?)\s*$/); if(!m) continue;
    const key=m[1].trim().toLowerCase(); const def=TEXTKEYS[key]; if(!def) continue;
    const [de,dict]=def; if(seen.has(de)) continue;
    const val=m[2].trim().toLowerCase().replace(/\s+/g,' ');
    const parts=val.split(/\s*[,\/]\s*/).map(v=>dict[v]).filter(Boolean);
    if(!parts.length||parts.length<val.split(/\s*[,\/]\s*/).length) continue;   // ein unbekannter Teil → ganze Zeile weg
    seen.add(de); rows.push([de,[...new Set(parts)].join(', ')]);
    if(rows.length>=6) break;
  }
  return rows;
}

// Zeilen [Schluessel, Wert] aus dem CJ-Produktobjekt (product/query → data).
// CJ liefert materialNameEn/productProEn mal als Array, mal als String («Polyester» oder '["Polyester"]') —
// ein .map auf einem String warf beim ersten echten Aufruf (02.09.2026) und haette JEDEN Import gestoppt.
export function liste(x){
  if(Array.isArray(x)) return x.map(String);
  if(x==null) return [];
  const s=String(x).trim(); if(!s) return [];
  if(s.startsWith('[')){ try{ const j=JSON.parse(s); if(Array.isArray(j)) return j.map(String); }catch{} }
  return s.split(/[,;\/]/).map(t=>t.trim()).filter(Boolean);
}
export function specZeilen(d){
  const rows=[];
  const mats=[...new Set(liste(d?.materialNameEn).map(deMat).filter(Boolean))];
  if(mats.length) rows.push(['Material', mats.join(', ')]);
  const specs=extractSpecs(d?.description);
  const gw=gewichtText(d?.productWeight);
  if(gw && !specs.some(([k])=>k==='Gewicht')) rows.push(['Gewicht', gw]);
  for(const r of specs) rows.push(r);
  for(const r of textMerkmale(d?.description)) if(!rows.some(([k])=>k===r[0])) rows.push(r);
  if(liste(d?.productProEn).includes('BATTERY')) rows.push(['Stromversorgung','Batterie/Akku']);
  return rows;
}

// HTML-Block fuer den Beschreibungstext — leer, wenn es nichts Belegtes gibt.
export function produktdetails(d){
  const rows=specZeilen(d);
  if(!rows.length) return '';
  const li=rows.map(([k,v])=>`<li><strong>${k}:</strong> ${String(v).replace(/</g,'&lt;')}</li>`).join('');
  return `<div class="ls-produktdetails"><h4>Produktdetails</h4><ul>${li}</ul></div>`;
}
