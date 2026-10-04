import {findBad,fix} from './versandregel.mjs';
const POS=['Gratis-Versand ab CHF 50','🇨🇭 Gratis-Versand ab CHF 50','Gratisversand ab CHF 65',
  'gratis Versand ab CHF 50','Gratis-Versand ab CHF 65 · 30 Tage',
  'Ab einem Bestellwert von CHF 65 liefern wir gratis in die ganze Schweiz.',
  'Versand gratis ab CHF 50','kostenloser Versand ab CHF 70','Gratis-Versand ab Fr. 50'];
const NEG=['Mit einer regulären Länge von 50-65 cm','Grosses Fassungsvermögen von 70 Litern',
  'Wasserdichtigkeit von 50 Metern','Lange Lebensdauer von 50\'000 Stunden','AC 100–240V bei 50/60 Hz',
  'Taillenumfang von 60 bis 80 cm','Gratis-Versand ab CHF 45',
  'Innerhalb der Schweiz liefern wir ab einem Bestellwert von CHF 45 gratis, darunter kostet der Versand CHF 7.',
  'Gesamtleistung von 60 Watt','Masse von 65 × 180 cm'];
let ok=true;
for(const s of POS){ const h=findBad(s); if(!h.length){ console.log('✗ nicht erkannt:',s); ok=false; }
  else { const f=fix(s); if(/\b(50|60|65|70)\b/.test(f.replace(/\d+\s*(cm|Liter|Meter|Watt|Hz|Stunden)/gi,''))&&!/45/.test(f)){console.log('✗ nicht korrigiert:',f);ok=false;} } }
for(const s of NEG){ const h=findBad(s); if(h.length){ console.log('✗ FALSCHALARM:',s,'→',h); ok=false; }
  if(fix(s)!==s){ console.log('✗ hat NEG verändert:',s,'→',fix(s)); ok=false; } }
console.log(ok?`\nSelbsttest ok: ${POS.length} erkannt+korrigiert, ${NEG.length} korrekt ignoriert.`:'\nSELBSTTEST FEHLGESCHLAGEN');
if(!ok) process.exit(1);
console.log('Beispiel:', fix('🇨🇭 Gratis-Versand ab CHF 50 · 🔄 30 Tage'));
