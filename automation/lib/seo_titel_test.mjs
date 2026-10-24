/** Test fuer seoTitel. Die Titel unten sind ECHT, am 2026-10-17 aus dem Live-Katalog gelesen.
 *  Lauf: /opt/node22/bin/node automation/lib/seo_titel_test.mjs   */
import { seoTitel, seoOffen, titelNormalisieren, kuerzen, MAX_TITEL, MAX_BESCHREIBUNG, seoNachtrag } from './seo_titel.mjs';
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

// ── seoOffen: Shopify speichert einen SEO-Titel nicht, der dem Produkttitel gleicht ──
// Echter Fall vom 2026-10-23: 54 Zeichen, Marke passt nicht mehr dazu, gekuerzt wird nichts.
const GLEICH = 'Relaxed-Fit Hoodie «Cosy» – mit Fell-Panel & Kordelzug';
pruef('erzeugter Titel gleicht hier dem Produkttitel', seoTitel(GLEICH).title === GLEICH, seoTitel(GLEICH).title);
pruef('Beschreibung da, Titel null, erzeugt = Produkttitel → NICHT offen',
  seoOffen(GLEICH, { title: null, description: 'irgendwas' }) === false);
// GEGENPROBE 1: die alte Regel hielt genau diesen Fall fuer offen — sonst aendert der Fix nichts
pruef('alte Regel haette ihn offen gemeldet', (!null || !'irgendwas') === true);
// GEGENPROBE 2: wo die Marke hineinpasst, ist ein fehlender Titel eine ECHTE Luecke
const KURZ = 'Jade Roller';
pruef('kurzer Titel bekommt die Marke', seoTitel(KURZ).title !== KURZ, seoTitel(KURZ).title);
pruef('Beschreibung da, Titel null, erzeugt ≠ Produkttitel → offen',
  seoOffen(KURZ, { title: null, description: 'irgendwas' }) === true);
// Die uebrigen Faelle
pruef('nichts gesetzt → offen', seoOffen(KURZ, null) === true);
pruef('nur Titel gesetzt → offen (Beschreibung fehlt)', seoOffen(KURZ, { title: 'X', description: '' }) === true);
pruef('beides gesetzt → nicht offen', seoOffen(KURZ, { title: 'X', description: 'Y' }) === false);
pruef('leerer Produkttitel → nicht offen (es gibt nichts zu setzen)', seoOffen('   ', null) === false);


// ---------------------------------------------------------------------------
// seoNachtrag: vorhandene Felder BEWAHREN (Kern von ChatGPTs Entwurf #2694).
// Angehaengt VOR der Zusammenfassung — die Lehre vom 24.10. (CLAUDE.md): Tests nach
// `process.exit` laufen nie, und „alle Tests gruen" kommt dann aus dem alten Block.
// 🚨 Der Patch schickt IMMER beide Felder, sobald er ueberhaupt etwas schickt:
// `ProductInput.seo` ist bei Shopify ein ERSETZEN, kein Zusammenfuehren (am 24.10. am
// echten Shop gemessen: nur `{description}` gesendet → `seo.title` danach `null`).
// Das Zusammenfuehren passiert hier, im Aufrufer.
// ---------------------------------------------------------------------------
const HAND = { title: 'Mein handgeschriebener Keyword-Titel', description: null };
pruef('Titel vorhanden, Beschreibung fehlt → BEIDE Felder im Patch (sonst loescht das Ersetzen den Titel)',
  JSON.stringify(Object.keys(seoNachtrag(KURZ, HAND)).sort()) === JSON.stringify(['description','title']),
  JSON.stringify(seoNachtrag(KURZ, HAND)));
pruef('der vorhandene Titel wird UNVERAENDERT mitgeschickt, nicht ueberschrieben',
  seoNachtrag(KURZ, HAND).title === HAND.title,
  JSON.stringify(seoNachtrag(KURZ, HAND)));
pruef('die fehlende Beschreibung wird wirklich gefuellt',
  seoNachtrag(KURZ, HAND).description === seoTitel(KURZ).description);
// Gegenprobe in die andere Richtung: ist die Beschreibung da und der Titel fehlt,
// muss die vorhandene Beschreibung erhalten bleiben.
pruef('Beschreibung vorhanden, Titel fehlt → vorhandene Beschreibung bleibt erhalten',
  seoNachtrag(KURZ, { title: null, description: 'Mein Text' }).description === 'Mein Text',
  JSON.stringify(seoNachtrag(KURZ, { title: null, description: 'Mein Text' })));
pruef('nichts gesetzt → Titel UND Beschreibung im Patch',
  JSON.stringify(Object.keys(seoNachtrag(KURZ, null)).sort()) === JSON.stringify(['description','title']),
  JSON.stringify(seoNachtrag(KURZ, null)));
pruef('leerer Titel-String gilt als fehlend', seoNachtrag(KURZ, { title: '', description: 'Y' }).title !== undefined);
pruef('beides gesetzt → leerer Patch, es wird nicht geschrieben',
  Object.keys(seoNachtrag(KURZ, { title: 'X', description: 'Y' })).length === 0);
pruef('leerer Produkttitel → leerer Patch', Object.keys(seoNachtrag('   ', null)).length === 0);
// Der Fall, der dem Lauf sonst die Schreib-Abfrage kostet: titelgleicher Vorschlag.
// `seoOffen` sagt hier „nicht offen"; der Patch waere nur die Beschreibung, die schon da ist.
pruef('titelgleicher Fall mit vorhandener Beschreibung → leerer Patch',
  Object.keys(seoNachtrag(GLEICH, { title: null, description: 'irgendwas' })).length === 0,
  JSON.stringify(seoNachtrag(GLEICH, { title: null, description: 'irgendwas' })));
// Titelgleich OHNE Beschreibung: die Beschreibung fehlt wirklich, aber ein titelgleicher
// SEO-Titel wuerde von Shopify nicht gespeichert → er darf NICHT mitgeschickt werden.
pruef('titelgleicher Fall ohne Beschreibung → nur die Beschreibung, kein titelgleicher Titel',
  JSON.stringify(Object.keys(seoNachtrag(GLEICH, null))) === JSON.stringify(['description']),
  JSON.stringify(seoNachtrag(GLEICH, null)));

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler ? 1 : 0);
