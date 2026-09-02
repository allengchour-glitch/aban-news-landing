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

export function gewichtText(g){
  const w=Number(g)||0; if(w<=0||w>50000) return null;
  return w>=1000 ? `ca. ${(w/1000).toFixed(1).replace('.0','')} kg` : `ca. ${Math.round(w)} g`;
}

// Zeilen [Schluessel, Wert] aus dem CJ-Produktobjekt (product/query → data).
export function specZeilen(d){
  const rows=[];
  const mats=[...new Set((d?.materialNameEn||[]).map(deMat).filter(Boolean))];
  if(mats.length) rows.push(['Material', mats.join(', ')]);
  const specs=extractSpecs(d?.description);
  const gw=gewichtText(d?.productWeight);
  if(gw && !specs.some(([k])=>k==='Gewicht')) rows.push(['Gewicht', gw]);
  for(const r of specs) rows.push(r);
  if((d?.productProEn||[]).includes('BATTERY')) rows.push(['Stromversorgung','Batterie/Akku']);
  return rows;
}

// HTML-Block fuer den Beschreibungstext — leer, wenn es nichts Belegtes gibt.
export function produktdetails(d){
  const rows=specZeilen(d);
  if(!rows.length) return '';
  const li=rows.map(([k,v])=>`<li><strong>${k}:</strong> ${String(v).replace(/</g,'&lt;')}</li>`).join('');
  return `<div class="ls-produktdetails"><h4>Produktdetails</h4><ul>${li}</ul></div>`;
}
