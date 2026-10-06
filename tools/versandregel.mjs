// Erkennt NUR echte Gratis-Versand-Schwellen (keine Längen-/Liter-/Meter-Angaben).
// Gegenprobe eingebaut: muss bei Nicht-Versand-Saetzen schweigen.
export const PATTERNS = [
  // "Gratis-Versand ab CHF 50" / "Gratisversand ab 50 CHF" / "kostenloser Versand ab CHF 65"
  /((?:Gratis[-\s]?Versand|Gratisversand|gratis(?:er)?\s+Versand|kostenlose(?:r|n)?\s+Versand|versandkostenfrei)\s*(?:in\s+die\s+ganze\s+Schweiz\s*)?ab\s*(?:CHF|Fr\.?)\s*)(\d{2,3})/gi,
  // "ab CHF 50 gratis" / "ab einem Bestellwert von CHF 65 ... gratis|kostenlos"
  /(ab\s*(?:einem\s*)?(?:Bestellwert\s*(?:von\s*)?)?(?:CHF|Fr\.?)\s*)(\d{2,3})(?=[^.<>]{0,45}?(?:gratis|kostenlos|versandkostenfrei))/gi,
  // "gratis ab CHF 50" / "kostenlos ab 50 CHF"
  /((?:gratis|kostenlos|versandkostenfrei)[^.<>]{0,25}?\bab\s*(?:CHF|Fr\.?)\s*)(\d{2,3})/gi,
];
export function findBad(html){
  const out=[];
  for(const re of PATTERNS){ re.lastIndex=0; let m;
    while((m=re.exec(html))!==null){ if(m[2]!=='45') out.push(m[0].replace(/\s+/g,' ').trim()); } }
  return out;
}
export function fix(html){
  let s=html;
  for(const re of PATTERNS) s=s.replace(re,(all,pre,num)=> num==='45'?all:pre+'45');
  return s;
}
