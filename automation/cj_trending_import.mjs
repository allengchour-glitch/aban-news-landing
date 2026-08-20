#!/usr/bin/env node
/* cj_category_fill.mjs — allgemeiner CJ-Import mit ECHTEN Produktnamen (Gemini→DE-Titel+Beschreibung).
 * CJ-Kategorie-Browse → product/query (echter Name, Bilder, Preis) → Gemini DE-Titel+Galaxus-Beschreibung
 * (grounded, nichts erfinden) → productSet+Media+Publish(6 Kanäle) → Ledger. Dedup dropship/cj_niche_done.txt.
 * ENV: CJ_TOKEN · SHOPIFY_CLIENT_ID/SECRET · GEMINI(/tmp/gemini_key) · GRP=nagel · CAP=40 · DRY=1
 */
import fs from 'node:fs';
import { produktSaeubern } from './marken_filter.mjs';
import { googleKategorie } from './google_kategorie.mjs';
const SHOP='au3j0y-hq.myshopify.com',API='2025-01';
const CID=process.env.SHOPIFY_CLIENT_ID,CSEC=process.env.SHOPIFY_CLIENT_SECRET;
const CJT=(process.env.CJ_TOKEN||'').trim();
const GK=(fs.existsSync('/tmp/gemini_key')?fs.readFileSync('/tmp/gemini_key','utf8'):process.env.GEMINI_API_KEY||'').trim();
const DRY=process.env.DRY==='1', CAP=parseInt(process.env.CAP||'40',10);
const LEDGER='dropship/cj_niche_done.txt';
const PUBS=['301970915713','301971014017','302032716161','302566834561','302872297857','302994456961'].map(id=>({publicationId:`gid://shopify/Publication/${id}`}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const chf=usd=>{const u=parseFloat((''+usd).split('--')[0])||0;
 // 2026-08-03: Kunde zahlt CHF7 Versand → Fracht-Lücke ~CHF8 in Preis (Fracht 15 - 7)
 const landed=u*0.9+8; const p=Math.max(landed*1.4, landed+5, 14.90);
 return (Math.floor(p)+0.90).toFixed(2);};

// ── Fashion-Modus (Zalando-Stil): CJ-Varianten "Farbe-Grösse" → Shopify Farbe+Grösse-Optionen ──
const DECOLOR={apricot:'Aprikose',pink:'Pink','light pink':'Rosa','hot pink':'Pink','sky blue':'Himmelblau','light blue':'Hellblau','dark blue':'Dunkelblau','wine red':'Weinrot','rose red':'Rosarot','army green':'Armeegrün','light green':'Hellgrün','dark green':'Dunkelgrün','light grey':'Hellgrau','dark grey':'Dunkelgrau','light gray':'Hellgrau','dark gray':'Dunkelgrau','black and white':'Schwarz-Weiss','navy blue':'Marineblau',black:'Schwarz',white:'Weiss',red:'Rot',blue:'Blau',green:'Grün',yellow:'Gelb',grey:'Grau',gray:'Grau',beige:'Beige',brown:'Braun',navy:'Marineblau',khaki:'Khaki',purple:'Lila',violet:'Violett',orange:'Orange',rose:'Rosé',coffee:'Kaffeebraun',silver:'Silber',gold:'Gold',champagne:'Champagner',ivory:'Elfenbein',burgundy:'Bordeaux',camel:'Camel',turquoise:'Türkis',mint:'Mintgrün',lavender:'Lavendel',cream:'Creme',nude:'Nude','dark pink':'Dunkelrosa','deep blue':'Dunkelblau','light yellow':'Hellgelb','fluorescent green':'Neongrün','light purple':'Helllila','dark brown':'Dunkelbraun',multicolor:'Bunt',multi:'Bunt'};
const SIZESET=new Set(['XS','S','M','L','XL','XXL','XXXL','2XL','3XL','4XL','5XL','6XL','ONE SIZE','ONESIZE','FREE SIZE','FREESIZE','F']);
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
const deColor=c=>{const t=(c||'').trim();return DECOLOR[t.toLowerCase()]||t;};
// Die Code-Entfernung darf nur greifen, wenn danach ALLE Farben verschieden bleiben:
// «A63 Black» und «A65 Black» würden sonst beide zu «Schwarz» — der Varianten-Dedup unten
// wirft eine der beiden weg, und ein kaufbarer Artikel verschwindet. Lieber der Code als
// eine verlorene Variante (dieselbe Regel wie im Bestandsreiniger: Kollision → gar nichts).
const codeMap=colors=>{const neu=colors.map(c=>deColor(ohneCode(c)));
  if(neu.some(x=>!x)||new Set(neu).size!==colors.length)return null;
  return neu.every((x,i)=>x===colors[i])?null:new Map(colors.map((c,i)=>[c,neu[i]]));};
const isSize=s=>{const u=(s||'').trim().toUpperCase();return SIZESET.has(u)||/^\d{1,2}$/.test(u)||/^(EU|US|UK)?\s?\d{2}$/.test(u);};
const SORDER=['XS','S','M','L','XL','XXL','2XL','3XL','4XL','5XL','6XL'];
function parseVar(v){const k=(v.variantKey||'').trim();const i=k.lastIndexOf('-');let color=null,size=null;
 if(i>0){const a=k.slice(0,i).trim(),b=k.slice(i+1).trim();if(isSize(b)){color=a;size=b.toUpperCase();}else color=k;}
 else if(isSize(k))size=k.toUpperCase();else color=k||null;
 return {color:color?deColor(color):null,size:size||null,price:v.variantSellPrice||v.variantSellPrice===0?v.variantSellPrice:v.sellPrice,sku:v.variantSku||''};}
function buildFashion(d){
 const vs=(d.variants||[]).map(parseVar).filter(v=>v.color||v.size); if(!vs.length)return null;
 const colors=[...new Set(vs.map(v=>v.color).filter(Boolean))];
 const sizes=[...new Set(vs.map(v=>v.size).filter(Boolean))].sort((a,b)=>{const ia=SORDER.indexOf(a),ib=SORDER.indexOf(b);if(ia>=0&&ib>=0)return ia-ib;return (parseInt(a)||99)-(parseInt(b)||99)||a.localeCompare(b);});
 const useC=colors.length>1||(colors.length===1&&!sizes.length), useS=sizes.length>0;
 const sMap=useC?codeMap(colors):null;                 // «A039 Black» → «Schwarz»
 const cVal=c=>sMap?(sMap.get(c)||c):c;
 const opts=[]; if(useC)opts.push({name:'Farbe',values:colors.map(cVal)}); if(useS)opts.push({name:'Grösse',values:sizes});
 if(!opts.length)return null;
 const seen=new Set(),variants=[];
 for(const v of vs){const ov=[]; if(useC)ov.push({optionName:'Farbe',name:cVal(v.color||colors[0])}); if(useS)ov.push({optionName:'Grösse',name:v.size||sizes[0]});
  const key=ov.map(x=>x.name).join('|'); if(seen.has(key))continue; seen.add(key);
  variants.push({optionValues:ov,price:chf(v.price),inventoryItem:{sku:('CJ-'+(v.sku||'')).slice(0,70),tracked:false},inventoryPolicy:'CONTINUE'});
  if(variants.length>=100)break;}
 return {productOptions:opts.map(o=>({name:o.name,values:o.values.map(x=>({name:x}))})),variants};
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
 cjgadgets:{cats:[['907BBB40-C131-4D3C-BA05-794D47EEBC90','Camera Drones'],['E95322D2-FF23-4837-A0C0-0CA686B9F062','Smart Remote Controls'],['36F73513-6A5A-445D-87F9-BF3D6629E649','Smart Home Appliances'],['599DFE31-C6AD-42D2-93AA-762126BBA475','Home Electronic Accessories'],['76B88FB8-9B37-4B55-AA09-082C5627DFE8','HDD Enclosures']],
   type:'Gadget', tags:['elektronik','gadget','tech','trend','cj-real','dropship'], kat:'Coole Gadgets & Technik',
   ban:/wholesale|\bsample\b|replacement part|ersatzteil|kinder/i, minImg:2, minP:2, maxP:110},
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
const GSLEEP=Number(process.env.GSLEEP||4200), CJSLEEP=Number(process.env.CJSLEEP||950);
const MAXPAGE=Number(process.env.MAXPAGE||5), PERCAT=Number(process.env.PERCAT||0); // tiefere Paginierung fürs „voll"-Füllen

async function cj(path){
 for(let a=0;a<7;a++){
  try{
   const r=await fetch('https://developers.cjdropshipping.com/api2.0/v1'+path,{headers:{'CJ-Access-Token':CJT}});
   const j=await r.json();
   if(j.code===1600200){await sleep(2600);continue;} // QPS — warten statt aufgeben
   return j;
  }catch{await sleep(2000);}
 }
 return {};
}
async function shTok(){const r=await fetch(`https://${SHOP}/admin/oauth/access_token`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({client_id:CID,client_secret:CSEC,grant_type:'client_credentials'})});return (await r.json()).access_token;}
async function sgql(t,q,v){const r=await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`,{method:'POST',headers:{'Content-Type':'application/json','X-Shopify-Access-Token':t},body:JSON.stringify({query:q,variables:v})});return r.json();}
const SET=`mutation($i:ProductSetInput!){productSet(synchronous:true,input:$i){product{id}userErrors{message}}}`;
const MED=`mutation($id:ID!,$m:[CreateMediaInput!]!){productCreateMedia(productId:$id,media:$m){mediaUserErrors{message}}}`;
const PUB=`mutation($id:ID!,$p:[PublicationInput!]!){publishablePublish(id:$id,input:$p){userErrors{message}}}`;
// CJ-Produktvideo via Staged-Upload anhängen (externe URLs nimmt Shopify nicht an) — 2026-07-06
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
 }catch{}
}

const TRUST=`<div style="background:#f7faf7;border:1px solid #d9e7d9;border-radius:10px;padding:11px 14px;margin:12px 0;font-size:14px;line-height:1.5;"><strong>\u{1F6E1}️ Sorglos shoppen:</strong> ✅ Geprüfte Qualität · \u{1F69A} Lieferung 10–20 Werktage · \u{1F504} 30 Tage Rückgabe · \u{1F1E8}\u{1F1ED} Schweizer Shop · \u{1F4B3} TWINT, Karte & Klarna.</div>\n<p>Gratis-Versand ab CHF 50 · <strong>–10 % mit Code WELCOME10</strong></p>`;

async function gemini(nameEn,feats,kat){
 const prompt=`Du textest für einen Schweizer Beauty-Shop. Aus dem englischen Produktnamen (und Feature-Text) mache:
1) einen KURZEN, natürlichen DEUTSCHEN Produkttitel (max 60 Zeichen, kein Preis, keine Marke erfinden)
2) eine deutsche Beschreibung (90-150 Wörter, Galaxus-Stil, NUR aus den Fakten – nichts erfinden).
Kategorie: ${kat}
Name (EN): ${nameEn}
Features (EN): ${(feats||'').slice(0,700)}
Gib NUR gültiges JSON zurück: {"title":"...","html":"<p>…</p><h3>Das zeichnet es aus</h3><ul><li>…</li></ul>"} (Schweizer ss statt ß, keine Markdown-Fences).`;
 // KOSTEN-REGEL (User 2026-07-06): Groq (gratis) ist PRIMÄR — Gemini (bezahlt) nur noch Fallback,
 // Massen-Importe haben sonst CHF 46/Woche Gemini-Guthaben verbrannt.
 const g0=await groq(prompt); if(g0&&g0.title&&g0.html)return g0;
 for(let i=0;i<3;i++){const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GK}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{temperature:0.5,maxOutputTokens:1500,thinkingConfig:{thinkingBudget:0},responseMimeType:'application/json'}})});
  const j=await r.json(); if(j.error){if(j.error.code===429){await sleep(15000);continue;}break;}
  try{const t=j.candidates?.[0]?.content?.parts?.[0]?.text||'';const o=JSON.parse(t);if(o.title&&o.html)return o;}catch{}
 }
 return null;
}

// Fallback: Groq (OpenAI-kompatibel), falls Gemini-Quota erschöpft (2026-07-05).
const GROQ_KEYS=[(process.env.GROQ_API_KEY||''),(process.env.GROQ_API_KEY2||'')].map(s=>s.trim()).filter(Boolean);
// Siehe cj_category_fill.mjs: 3.3-70b wird am 16.08.2026 abgeschaltet, qwen3-32b ist schon weg.
const GROQ_MODELS=['openai/gpt-oss-120b','meta-llama/llama-4-scout-17b-16e-instruct','llama-3.1-8b-instant'];
async function groq(prompt){
 for(const model of GROQ_MODELS)for(const key of GROQ_KEYS){
  try{
   const r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},
    body:JSON.stringify({model,temperature:0.5,max_tokens:1200,
     response_format:{type:'json_object'},messages:[{role:'user',content:prompt}]})});
   if(r.status===429)continue;
   const j=await r.json(); if(j.error)continue;
   const o=JSON.parse(j.choices?.[0]?.message?.content||''); if(o.title&&o.html)return o;
  }catch{}
 }
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

// ── TRENDING-Modus: Top-Produkte nach listedNum (CJ "Trending/Video Products") ──
// Mit Seiten-Cursor (dropship/_cj_all_page.txt) wird daraus der "CJ ALLES"-Sweep:
// jede Welle setzt dort fort, wo die letzte aufhörte → frisst sich durch den GANZEN Katalog
// (Popularität absteigend). Am Katalog-Ende springt der Cursor auf 1 zurück.
const CAPT=parseInt(process.env.CAP||'108',10);
const PAGES=parseInt(process.env.PAGES||'8',10);
const VIDEO_ONLY=process.env.VIDEO_ONLY==='1'; // «Video-Kategorie kopieren»: nur Produkte MIT CJ-Video
const CURF=VIDEO_ONLY?'dropship/_cj_video_page.txt':'dropship/_cj_all_page.txt';
const PSTART=parseInt(process.env.PSTART||(fs.existsSync(CURF)?fs.readFileSync(CURF,'utf8').trim():'')||'1',10)||1;
const BAN=/wholesale|\bsample\b|disney|marvel|frozen|spider|barbie|pokemon|nintendo|halloween|christmas|weihnacht|sex|adult|vibrat|cigarette|vape|hookah|shisha|knife|gun|weapon|swimming ring|swim ring|arm ?band.*swim/i;
const done=new Set(fs.existsSync(LEDGER)?fs.readFileSync(LEDGER,'utf8').split('\n').map(s=>s.replace('cj:','').trim()).filter(Boolean):[]);
const st=DRY?null:await shTok();

// 1) Top-N nach listedNum einsammeln (ab Cursor-Seite PSTART)
const cand=[];
let lastPage=PSTART;
for(let page=PSTART;page<PSTART+PAGES;page++){
 const j=await cj(`/product/list?pageSize=50&pageNum=${page}&orderBy=listedNum`); await sleep(1100);
 const list=(j.data&&j.data.list)||[];
 if(!list.length){
  if(j.code===200||j.code===0){fs.writeFileSync(CURF,'1');console.log(`Katalog-Ende bei Seite ${page} — Cursor auf 1 zurückgesetzt.`);break;}
  console.log(`Seite ${page}: API-Fehler code=${j.code} — überspringe (Cursor bleibt).`);continue;
 }
 lastPage=page;
 for(const p of list){
  const nm=p.productNameEn||'';
  if(!nm||done.has(String(p.pid))||BAN.test(nm))continue;
  const _pp=(''+p.sellPrice).split('--'); const _lo=parseFloat(_pp[0])||0, _hi=parseFloat(_pp[1]||_pp[0])||_lo; if(_hi<1.5||_lo>90)continue;
  cand.push(p);
 }
 fs.writeFileSync(CURF,String(page+1));
}
console.log(`Seiten ${PSTART}–${lastPage}: ${cand.length} Kandidaten nach Filter (Ziel: ${CAPT}). Nächste Welle ab Seite ${fs.existsSync(CURF)?fs.readFileSync(CURF,'utf8').trim():lastPage+1}.`);

// 2) Anlegen wie gehabt (fashion-aware)
let total=0;
for(const p of cand){
 if(total>=CAPT)break;
 const nm=p.productNameEn||'';
 const dj=await cj(`/product/query?pid=${p.pid}`); await sleep(CJSLEEP);
 const d=dj.data||{}; const imgs=((d.productImageSet)||[]).filter(u=>/^https/.test(u)).slice(0,20);
 if(imgs.length<2){continue;}
 const feats=(d.description||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
 if(VIDEO_ONLY&&!(d.productVideo&&/^https/.test(d.productVideo))){continue;} // ohne Video überspringen
 const g=await gemini(nm,feats,'Trend-Produkt (viral)'); await sleep(GSLEEP);
 if(!g){console.log('  skip(copy)',nm.slice(0,30));continue;}
 // Marken-Filter (14.08.2026), siehe automation/marken_filter.mjs
 const ms=produktSaeubern(g.title, g.html);
 if(ms.verdacht){console.log('  skip(marke)',nm.slice(0,40));continue;}
 g.title=ms.title; g.html=ms.html;
 // ß→ss (15.08.2026): CH-Schreibung, Quelle-Fix wie in cj_category_fill
 const title=g.title.slice(0,70).replace(/ß/g,'ss').replace(/ẞ/g,'SS');
 if(DRY){console.log(`  [DRY] CHF${chf(p.sellPrice)} | ${title} | listed ${p.listedNum}`);total++;continue;}
 const slug=title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,46)+'-'+String(p.pid).slice(-6);
 const html=`${g.html}\n${TRUST}`.replace(/ß/g,'ss').replace(/ẞ/g,'SS');
 const looksFashion=(d.variants||[]).some(v=>{const pv=parseVar(v);return pv.size||pv.color;});
 const fash=looksFashion?buildFashion(d):null;
 const productOptions=fash?fash.productOptions:[{name:'Variante',values:[{name:'Standard'}]}];
 const variants=fash?fash.variants:[{optionValues:[{optionName:'Variante',name:'Standard'}],price:chf(p.sellPrice),inventoryItem:{sku:('CJ-'+p.pid).slice(0,70),tracked:false},inventoryPolicy:'CONTINUE'}];
 const input={title,handle:slug,productType:'Trend-Gadget',vendor:'LuxeStyle',status:'ACTIVE',
  tags:VIDEO_ONLY?['trend','viral','video-hit','cj-video','cj-real','dropship','neu']:['trend','viral','video-hit','cj-real','dropship','neu'],descriptionHtml:html,
  seo:{title:(title+' | LuxeStyle CH').slice(0,70),description:(`${title} – der Trend-Hit bei LuxeStyle Schweiz. Gratis-Versand ab CHF 50, 30 Tage Rückgabe.`).slice(0,320)},
  // Google-Felder gehören in den Importer (15.08.2026, Muster «condition» vom 11.08.):
  // cj_sku_import hatte dieselbe Lücke — jeder Import ohne diese Felder senkt die
  // Feed-Abdeckung, die ein Backfill zuvor teuer gehoben hat.
  metafields:[
   ...(function(){const g=googleKategorie(title,['trend','viral','video-hit','cj-real'],'Trend-Gadget');
     return g?[{namespace:'mm-google-shopping',key:'google_product_category',value:g,type:'single_line_text_field'}]:[];})(),
   {namespace:'mm-google-shopping',key:'condition',value:'new',type:'single_line_text_field'},
   {namespace:'mm-google-shopping',key:'custom_product',value:'true',type:'boolean'},
   {namespace:'mm-google-shopping',key:'age_group',value:'adult',type:'single_line_text_field'},
  ],
  productOptions,variants,files:[{originalSource:imgs[0],contentType:'IMAGE',alt:(title+' | LuxeStyle').slice(0,120)}]};
 // Dubletten-Wache: gleicher Titel schon aktiv? → überspringen (Lieferant listet gleiche Artikel mehrfach)
 const dq=await sgql(st,`query($q:String!){products(first:1,query:$q){edges{node{id}}}}`,{q:`title:"${title.replace(/"/g,'')}" status:active`});
 if(dq.data?.products?.edges?.length){console.log('  skip(dup-titel)',title.slice(0,40));continue;}
 const r=await sgql(st,SET,{i:input}); const e=r.data?.productSet?.userErrors||[]; const pid=r.data?.productSet?.product?.id;
 if(e.length||!pid){console.log('  ✗',title.slice(0,30),JSON.stringify(e).slice(0,80));continue;}
 const media=imgs.slice(1).map((u,i)=>({originalSource:u,mediaContentType:'IMAGE',alt:(title+' – Bild '+(i+2)+' | LuxeStyle').slice(0,120)}));
 if(media.length)await sgql(st,MED,{id:pid,m:media});
 // Hausregel 12.08.: Klingen (auch Küchenmesser) nie in den Google-Kanal.
 const klinge=/\b(messer|klinge\w*|dolch|machete|axt|beil|schwert|katana)/i.test(title)
   &&!/jeans|kleid|hose|shirt|hoodie|wasch|deko|figur|anhänger|halskette|ohrring|spielzeug|plüsch|kostüm/i.test(title);
 await sgql(st,PUB,{id:pid,p:klinge?PUBS.filter(x=>!x.publicationId.endsWith('302872297857')):PUBS});
 if(d.productVideo&&/^https/.test(d.productVideo))await attachVideo(st,pid,d.productVideo,p.pid);
 fs.appendFileSync(LEDGER,'cj:'+p.pid+'\n'); done.add(String(p.pid));
 total++; console.log(`✅ [${p.listedNum}] ${title} → ${pid.split('/').pop()}`);
 await sleep(300);
}
console.log(`\nFERTIG: ${total} Trending-Produkte${DRY?' [DRY]':''}.`);
