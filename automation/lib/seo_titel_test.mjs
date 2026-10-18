/** Test fuer seoTitel. Die Titel unten sind ECHT, am 2026-10-17 aus dem Live-Katalog gelesen.
 *  Lauf: /opt/node22/bin/node automation/lib/seo_titel_test.mjs   */
import { seoTitel, titelNormalisieren, kuerzen, MAX_TITEL, MAX_BESCHREIBUNG } from './seo_titel.mjs';
let fehler = 0;
const pruef = (n, ok, extra = '') => { if (!ok) { fehler++; console.log(`FAIL ${n}  ${extra}`); } else console.log(`ok   ${n}`); };

// ── 1. DER FEHLER, der 41 % der Titel getroffen hätte: Bindestrich IM Wort bleibt ──
const ECHT = [
  'Tanz- & Fitness-Armbänder für Switch Joy-Con',
  'Ausziehbarer Gaming-Controller für Mobilgeräte',
  'Orion-Android-Gamepad',
  'G8 Gamepad mit Type-C für Android',
  'Macro-Programmierbarer Joystick-Griff mit Meterring',
];
for (const t of ECHT) {
  const n = titelNormalisieren(t);
  pruef(`Bindestrich bleibt: ${t.slice(0, 34)}`, !/ – /.test(n) || !/\S-\S/.test(t), n);
  pruef(`  kein " – " eingefügt`, !n.includes(' – '), n);
}

// ── 2. GEGENPROBE: echte Trennzeichen WERDEN vereinheitlicht ──
pruef('Mittelpunkt wird Trenner', titelNormalisieren('Roll-On · 10 ml') === 'Roll-On – 10 ml', titelNormalisieren('Roll-On · 10 ml'));
pruef('Bindestrich MIT Leerzeichen wird Trenner', titelNormalisieren('Haaröl - 60 ml') === 'Haaröl – 60 ml', titelNormalisieren('Haaröl - 60 ml'));
pruef('Geviertstrich wird vereinheitlicht', titelNormalisieren('A — B') === 'A – B', titelNormalisieren('A — B'));
pruef('Mehrfache Leerzeichen weg', titelNormalisieren('A   B') === 'A B');

// ── 3. Marke nur, wenn sie passt — nie ein hängendes "|…" ──
{
  const kurz = seoTitel('Orion-Android-Gamepad');
  pruef('kurzer Titel bekommt die Marke', kurz.title === 'Orion-Android-Gamepad | LuxeStyle CH', kurz.title);
  const lang = seoTitel('Macro-Programmierbarer Joystick-Griff mit Meterring und Zubehör');
  pruef('langer Titel: kein hängendes "|"', !/\|\s*…?$/.test(lang.title), lang.title);
  pruef('langer Titel: höchstens 60 Zeichen', lang.title.length <= MAX_TITEL, `${lang.title.length}: ${lang.title}`);
  pruef('langer Titel: endet mit Auslassungszeichen', lang.title.endsWith('…'), lang.title);
  pruef('langer Titel: kein Trennzeichen vor dem Auslassungszeichen', !/[\s|–,:;.-]…$/.test(lang.title), lang.title);
}

// ── 4. Die Beschreibung verspricht NICHTS, was nicht stimmt ──
{
  const d = seoTitel('Wireless Game Handle').description;
  pruef('keine Lieferzeit-Zusage', !/schnelle? Lieferung|express|sofort/i.test(d), d);
  pruef('nennt Gratis-Versand ab CHF 50', d.includes('Gratis-Versand ab CHF 50'), d);
  pruef('nennt 30 Tage Rückgabe', d.includes('30 Tage Rückgabe'), d);
  pruef('nennt WELCOME10', d.includes('WELCOME10'), d);
  pruef('höchstens 155 Zeichen', d.length <= MAX_BESCHREIBUNG, String(d.length));
}

// ── 5. Randfälle ──
pruef('leer bleibt leer', seoTitel('').title === '' && seoTitel('').description === '');
pruef('null bleibt leer', seoTitel(null).title === '');
pruef('kuerzen schneidet an der Wortgrenze', kuerzen('eins zwei drei vier', 12) === 'eins zwei…', kuerzen('eins zwei drei vier', 12));
pruef('kuerzen laesst Kurzes unberührt', kuerzen('kurz', 60) === 'kurz');
// Ein Titel aus einem Wort, laenger als die Grenze: darf nicht leer werden
pruef('ein überlanges Wort wird nicht leer', kuerzen('A'.repeat(80), 20).length === 20, kuerzen('A'.repeat(80), 20));
// Emoji im Titel (der Katalog hat welche) darf nicht zerstoert werden
pruef('Emoji bleibt', titelNormalisieren('Transportbox 🐾 für Hund') === 'Transportbox 🐾 für Hund');

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler ? 1 : 0);
