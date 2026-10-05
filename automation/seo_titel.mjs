// seo_titel.mjs — SEO-Titel aus dem Produkttitel bauen, OHNE dass Shopify ihn still kappt (05.10.2026, Prüfer «titel-neuimport»).
//
// ANLASS: Die Importer schrieben `(title + ' | LuxeStyle CH').slice(0, 70)`. Shopify nimmt für seo.title höchstens
// 70 Zeichen (gemessen 05.10.: 0 von 1'150 Produkten > 70, 23 exakt 70) — ab 55 Zeichen Titel endete der Meta-Titel
// im Google-Gratis-Eintrag mitten im Wort oder mit halber Marke («… | LuxeSt», «… | »). 15 von 900 Neuimporten.
//
// EINE REGEL (dieselbe wie seo_titel_grenze.py `seo_titel()`): längste saubere Form, die in 70 Zeichen passt —
//   Titel | LuxeStyle CH  →  Titel | LuxeStyle  →  Titel allein  →  Titel an Wortgrenze gekürzt (nie mitten im Wort,
//   nie mit offener Klammer, nie mit Satzzeichen am Ende).
export const GRENZE = 70;
export const MARKE = ['LuxeStyle CH', 'LuxeStyle'];

export function kuerzen(s, n = GRENZE) {
  s = String(s || '').trim();
  if (s.length <= n) return s;
  let k = s.slice(0, n + 1);
  for (const z of ['. ', ' · ', ' – ', ', ']) {
    const i = k.lastIndexOf(z);
    if (i > n * 0.6) { k = k.slice(0, i + (z === '. ' ? 1 : 0)); break; }
  }
  if (k.length > n) k = k.slice(0, k.lastIndexOf(' ') > 0 ? k.lastIndexOf(' ') : n);
  k = k.replace(/[\s,;:–\-·|(]+$/u, '');
  if ((k.match(/\(/g) || []).length > (k.match(/\)/g) || []).length) k = k.slice(0, k.lastIndexOf('(')).replace(/[\s,;:–\-·|]+$/u, '');
  return k.trim();
}

export function seoTitel(titel) {
  const t = String(titel || '').replace(/\s+/g, ' ').trim();
  for (const m of MARKE) {
    const f = `${t} | ${m}`;
    if (f.length <= GRENZE) return f;
  }
  if (t.length <= GRENZE) return t;
  return kuerzen(t, GRENZE);
}

if (process.argv[1] && process.argv[1].endsWith('seo_titel.mjs') && process.argv.includes('--test')) {
  const faelle = [
    ['Rundes Haustierbett aus Cord', 'Rundes Haustierbett aus Cord | LuxeStyle CH'],
    ['304 Edelstahl Lebensmittelbehälter mit luftdichtem Deckel', '304 Edelstahl Lebensmittelbehälter mit luftdichtem Deckel | LuxeStyle'],   // 57 → 69
    ['Schuluniform-Set im Anime-Stil: Blazer, Rock, Hemd & Fliege (Cosplay)', 'Schuluniform-Set im Anime-Stil: Blazer, Rock, Hemd & Fliege (Cosplay)'],   // 69 → allein
    ['Doppelseitiger Blechschneider-Aufsatz für Bohrmaschine, 175 × 80 mm', 'Doppelseitiger Blechschneider-Aufsatz für Bohrmaschine, 175 × 80 mm'],   // 67
    ['Ergonomisches Kopfkissen aus Memory-Schaum mit Armauflagen (Schmetterlingsform) für Rücken- und Seitenschläfer',
     'Ergonomisches Kopfkissen aus Memory-Schaum mit Armauflagen'],   // > 70 → Wortgrenze, keine offene Klammer
  ];
  let fehler = 0;
  for (const [t, soll] of faelle) {
    const ist = seoTitel(t);
    if (ist !== soll || ist.length > GRENZE) { fehler++; console.log(`❌ ${t}\n   ist  ${ist} (${ist.length})\n   soll ${soll}`); }
  }
  console.log(fehler ? `${fehler} Fehler` : `✅ ${faelle.length}/${faelle.length} Kanarienvögel richtig`);
  process.exit(fehler ? 1 : 0);
}
