// Tests der Bereichs-Taxonomie-Anbindung (lib/bereich_taxonomie.mjs), hier mit der Schmuck-Datei. Gegenproben in BEIDE Richtungen; Zusammenfassung am ENDE.
// Orakel = Mitgliederlisten des Messwerkzeugs (dropship/taxonomie-2610-b/messen.mjs), festgehalten in dropship/taxonomie-2610-b/orakel/ (Trefferzahl + SHA-1 der Mitglieder).
// Katalog: der volle Katalog /tmp/katalog_taxo.json, wenn er denselben Stand hat (gleiche Produktzahl wie im Orakel), sonst der eingecheckte Auszug (Google-Klasse
// «Jewelry» plus alle Orakel-Mitglieder; in der CI ist /tmp leer). Titel der Gegenproben stammen aus dem echten Katalog vom 26.10.2026.
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { SCHMUCK, SCHMUCK_GRUPPEN, SEO_TITEL_MAX, baueBereich, bereichAuswahl, ladeBereich, ladeOrakel, orakelAbweichungen, seoTitel, waehleKategorien } from './bereich_taxonomie.mjs';
import { AESTE, kategorieVon } from './schmuck_menue.mjs';
import { unbelegt, WORTSCHATZ } from './beleg_woerter.mjs';
import { BASIS_SPERR_TAGS, ZUSATZ_SPERR_TAGS_TAXONOMIE } from './sperr_tags.mjs';
import { gehoertIn, KATEGORIEN, SPERR_TAGS as ENGINE_SPERR } from './kategorien.mjs';
import { planMetafelder } from './unterfilter_plan.mjs';
import { HANDLE_RE, gesperrt, imUnterfilter, SPERR_TAGS as KERN_SPERR } from '../../dropship/taxonomie-2610-b/kern.mjs';

let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };
const lies = n => readFileSync(new URL(`../../dropship/taxonomie-2610-b/orakel/${n}`, import.meta.url));

const KAT = SCHMUCK.filter(k => !k.filter), FIL = SCHMUCK.filter(k => k.filter);
const { B, ausgelassen, bestehend, bauen } = bereichAuswahl();
const ORAKEL = JSON.parse(lies('schmuck-orakel.json'));
const SHOP = JSON.parse(lies('collections-2710.json'));

// ── Aufbau ──
ist('Kategorien + Unterfilter (52 Kinder der 14 Gruppen, minus herrenuhren; 31 Chips nach der Gegenlesung 27.10.: 7 mit weniger als 18 Treffern entfernt)', [KAT.length, FIL.length], [51, 31]);
ist('ids eindeutig', new Set(SCHMUCK.map(k => k.id)).size, SCHMUCK.length);
ist('ids tragen den Präfix s-', SCHMUCK.every(k => k.id === 's-' + k.handle), true);
ist('handles eindeutig', new Set(SCHMUCK.map(k => k.handle)).size, SCHMUCK.length);
ist('tags: sort-<handle> und eindeutig', SCHMUCK.every(k => k.tag === 'sort-' + k.handle) && new Set(SCHMUCK.map(k => k.tag)).size === SCHMUCK.length, true);
ist('Shopify-Tags kennen keine Gross-/Kleinschreibung: auch klein gerechnet eindeutig', new Set(SCHMUCK.map(k => k.tag.toLowerCase())).size, SCHMUCK.length);
// Shopify macht aus «ö» ein «o» im Handle, das Tag behält den Umlaut (26.10.: damen-geldboersen-langbörsen) → nur a-z, 0-9, Bindestrich.
ist('Handle und Tag nur a-z, 0-9, Bindestrich', SCHMUCK.filter(k => !/^[a-z0-9-]+$/.test(k.handle) || !/^[a-z0-9-]+$/.test(k.tag) || !HANDLE_RE.test(k.handle)).map(k => k.handle), []);
ist('Gegenprobe: der Prüfer erkennt einen Umlaut-Handle', ['schmuck-für-herren'].filter(h => !/^[a-z0-9-]+$/.test(h)).length, 1);
const ANDERE = KATEGORIEN.filter(k => !k.aus_datei);
ist('kein Tag stösst mit den bisherigen Kategorien (Basis, verengt, Mode) zusammen', ANDERE.filter(k => SCHMUCK.some(s => s.tag.toLowerCase() === k.tag.toLowerCase())).map(k => k.tag), []);
ist('kein Handle stösst mit den bisherigen Kategorien zusammen', ANDERE.filter(k => SCHMUCK.some(s => s.handle === k.handle)).map(k => k.handle), []);
ist('kein id stösst mit den bisherigen Kategorien zusammen', ANDERE.filter(k => SCHMUCK.some(s => s.id === k.id)).map(k => k.id), []);
const belegt = new Set(SHOP.handles);
ist(`Shop-Stand 27.10.: ${SHOP.anzahl} Collections gelesen, Liste vollständig`, SHOP.handles.length, SHOP.anzahl);
ist('Kollisionen mit den vorhandenen Collections (Kategorien und Unterfilter)', SCHMUCK.filter(k => belegt.has(k.handle)).map(k => k.handle), []);
ist('Gegenprobe: der Kollisionsprüfer findet ein belegtes Handle', ['sub-ringe', 'schmuck-sets'].filter(h => belegt.has(h)), ['sub-ringe', 'schmuck-sets']);
ist('die sechs Gruppen-Handles sind im Shop frei', ['schmuck-herren-gruppe', 'schmuck-personalisiert-gruppe', 'schmuck-motiv-gruppe', 'schmuck-stil-gruppe', 'schmuck-zubehoer-gruppe', 'schmuck-sets-gruppe'].filter(h => belegt.has(h)), []);
ist('jede Kategorie und jeder Unterfilter hat min 15', SCHMUCK.every(k => k.min === 15), true);
ist('nichts davon ist «bestehend»: es gibt noch keine Collection', SCHMUCK.some(k => k.bestehend), false);
ist('kein ß in Titel/Beschreibung/SEO', SCHMUCK.some(k => /ß/.test(k.titel + k.beschreibung + k.seoBeschreibung + (k.seoTitel || ''))), false);
ist('SEO-Beschreibung höchstens 160 Zeichen', SCHMUCK.every(k => k.seoBeschreibung.length <= 160), true);
ist('keine Beschreibung nennt Filter oder siezt', SCHMUCK.some(k => /filter|\b(Sie|Ihnen|Ihr|Ihre)\b/i.test(k.beschreibung)), false);
ist('jede Beschreibung hat mindestens 40 Zeichen und endet mit Punkt', SCHMUCK.filter(k => k.beschreibung.length < 40 || !/[.!?]$/.test(k.beschreibung)).map(k => k.handle), []);
const BEHAUPTUNG = /(?<![\d])(?!925|999)\d{3,}|(^|[^a-zäöüß])(beste|bester|original|garantiert|wasserdicht|hypoallergen|nickelfrei|robust|hochwertig|langlebig|strapazierfähig|kratzfest|rostfrei|allergiefrei)/i;
ist('jede Beschreibung nennt keine Zahl (ausser den Silber-Feingehalten 925 und 999), kein Heilsversprechen und keine Eigenschaft ohne Beleg wie «robust» (SPEC 6)', SCHMUCK.filter(k => BEHAUPTUNG.test(k.beschreibung)).map(k => k.handle), []);
ist('jeder Filter kennt seine Kategorie', FIL.every(f => KAT.some(k => k.id === f.eltern_id)), true);
ist('jeder Filter-Handle beginnt mit dem Handle seiner Kategorie', FIL.every(f => f.handle.startsWith(KAT.find(k => k.id === f.eltern_id).handle + '-')), true);
// Gegenlesung 27.10.: 13 von 89 Suchmaschinen-Titeln waren über 70 Zeichen (Maximum 83), bei Mode keiner (Maximum 64). Jetzt bekommt jede Kategorie UND jeder Chip einen Titel bis SEO_TITEL_MAX.
ist(`Suchmaschinen-Titel: höchstens ${SEO_TITEL_MAX} Zeichen, bei allen 82 Kategorien und Chips`, [SCHMUCK.filter(k => !k.seoTitel || k.seoTitel.length > SEO_TITEL_MAX).map(k => k.handle), SCHMUCK.length], [[], 82]);
ist('Suchmaschinen-Titel: der Titel steht am Anfang, danach «online kaufen» und, wenn sie passt, die Marke', SCHMUCK.filter(k => ![k.titel, `${k.titel} online kaufen`, `${k.titel} online kaufen | LuxeStyle CH`].includes(k.seoTitel)).map(k => k.handle), []);
ist('seoTitel: kurz → mit Marke; mittel → ohne Marke; zu lang → nur der Titel', [seoTitel('Ringe'), seoTitel('A'.repeat(40)).endsWith('online kaufen'), seoTitel('B'.repeat(50)), seoTitel('C'.repeat(70)).length], ['Ringe online kaufen | LuxeStyle CH', true, 'B'.repeat(50), 70]);
ist('Gegenprobe: bei den Mode-Taxonomie-Titeln gab es keinen über 64 Zeichen, hier bleibt es unter 61', Math.max(...SCHMUCK.map(k => k.seoTitel.length)) <= 60, true);
{ // Chip-Titel: Bezug zur Eltern-Kategorie im Titel (er ist auch die Seitenüberschrift), und kein Titel mehr als zweimal (Gegenlesung: «Mit Zirkonia» 7-mal, «Armbänder & Armreifen» 6-mal)
  const zaehl = new Map(); for (const f of FIL) zaehl.set(f.titel, (zaehl.get(f.titel) || 0) + 1);
  ist('Chip-Titel: keiner kommt mehr als zweimal vor (Mode: höchstens 2)', [...zaehl].filter(([, n]) => n > 2), []);
  ist('Chip-Titel: der Titel nennt die Eltern-Kategorie (erste vier Buchstaben, z. B. «Herz-Ringe» bei Herz-Schmuck)', FIL.filter(f => !f.titel.toLowerCase().includes(KAT.find(k => k.id === f.eltern_id).titel.slice(0, 4).toLowerCase())).map(f => f.handle), []);
  ist('Gegenprobe: der alte Chip-Titel «Mit Zirkonia» nannte keine Eltern-Kategorie', 'Mit Zirkonia'.toLowerCase().includes('herz-schmuck'.slice(0, 4)), false);
  ist('Chip-Titel höchstens 36 Zeichen (Chip-Zeile)', FIL.filter(f => f.titel.length > 36).map(f => f.handle), []);
  ist('Chip-Beschreibung nennt den Chip-Titel und die Kategorie', FIL.filter(f => !f.beschreibung.startsWith(f.titel) || !f.beschreibung.includes('«' + KAT.find(k => k.id === f.eltern_id).titel + '»')).map(f => f.handle), []);
}

// ── Auswahl der Gruppen ──
ist('14 Schmuck-Gruppen, alle in der Datei', [SCHMUCK_GRUPPEN.length, SCHMUCK_GRUPPEN.every(h => B.gruppen.some(g => g.handle === h))], [14, true]);
ist('Vorgabe = alle Gruppen ohne eigenen Menüast (menue_oben)', B.gruppen.filter(g => !g.menue_oben).map(g => g.handle), SCHMUCK_GRUPPEN);
ist('die sechs Uhren-Gruppen sind nicht dabei', B.gruppen.filter(g => g.menue_oben === 'Uhren').map(g => g.handle).filter(h => SCHMUCK_GRUPPEN.includes(h)), []);
ist('ausgelassen: nur herrenuhren (steht auch in «Uhren für Herren, Damen & Kinder»)', ausgelassen, [{ handle: 'herrenuhren', grund: 'gehört zum Menüast «Uhren»' }]);
ist('Gegenprobe: herrenuhren steht in einer Schmuck-Gruppe UND einer Uhren-Gruppe', B.gruppen.filter(g => g.kinder.includes('herrenuhren')).map(g => g.handle), ['schmuck-herren-gruppe', 'uhren-traeger-gruppe']);
ist('vorhandene Collections werden nicht neu gebaut (acht Kinder ohne eigenen Datensatz)', bestehend, ['sub-ringe', 'sub-ohrringe', 'sub-armbaender', 'schmuckaufbewahrung', 'schmuck-sets', 'broschen-pins', 'koerper-fussschmuck', 'premium-schmuck']);
ist('…und keiner davon steht in SCHMUCK', bestehend.filter(h => SCHMUCK.some(k => k.handle === h)), []);
ist('…aber alle gibt es im Shop (Stand 27.10.)', bestehend.filter(h => !belegt.has(h)), []);
const nurUhren = B.kategorien.map(k => k.handle).filter(h => !B.gruppen.filter(g => SCHMUCK_GRUPPEN.includes(g.handle)).some(g => g.kinder.includes(h)));
ist('23 Kategorien stehen nur in Uhren-Gruppen, keine davon wird gebaut', [nurUhren.length, nurUhren.filter(h => SCHMUCK.some(k => k.handle === h))], [23, []]);
ist('kein Schmuck-Handle ist eine Uhr', SCHMUCK.filter(k => /uhr/.test(k.handle)).map(k => k.handle), []);
ist('gebaut wird jede Kategorie der gewählten Gruppen genau einmal', bauen.map(k => k.handle).sort(), KAT.map(k => k.handle).sort());
ist('Auswahl per Parameter: nur «ringe-gruppe» ergibt 5 neue Kategorien', baueBereich({ gruppen: ['ringe-gruppe'] }).filter(k => !k.filter).map(k => k.handle), ['moissanit-ringe', 'edelstein-geburtsstein-ringe', 'silberringe', 'edelstahl-titanringe', 'zirkonia-strassringe']);
ist('Auswahl per Parameter: eine Uhren-Gruppe ergibt Uhren-Kategorien (Adapter ist generisch)', baueBereich({ gruppen: ['uhren-funktion-gruppe'], praefix: 'u-' }).filter(k => !k.filter).map(k => k.id), ['u-uhren-mit-kalender', 'u-leuchtuhren', 'u-multifunktionsuhren']);
ist('Gegenprobe: eine unbekannte Gruppe wirft einen Fehler', (() => { try { waehleKategorien(B, ['gibt-es-nicht']); return 'kein Fehler'; } catch (e) { return /gibt-es-nicht/.test(e.message); } })(), true);
ist('Gegenprobe: ein Dateiname mit Pfadanteil wird abgelehnt', (() => { try { ladeBereich('../../etc/passwd'); return 'kein Fehler'; } catch (e) { return /nur a-z/.test(e.message); } })(), true);
// Innerhalb einer Gruppe gilt Vorrang statt Überlappung (Hinweis 1 der Datei) - wird unten am Katalog nachgemessen.

// ── Schalter SCHMUCK=1 in kategorien.mjs ──
const zaehle = schalter => {
  const env = { ...process.env }; delete env.SCHMUCK; if (schalter) env.SCHMUCK = schalter;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', `const m = await import(${JSON.stringify(new URL('./kategorien.mjs', import.meta.url).href)}); console.log(m.KATEGORIEN.filter(k => k.aus_datei).length, m.KATEGORIEN.length);`], { env, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim().split(' ').map(Number) : r.stderr.slice(-300);
};
const ohne = zaehle(''), mit = zaehle('1');
ist('ohne SCHMUCK=1 enthält KATEGORIEN keine Schmuck-Kategorie', ohne[0], 0);
ist('mit SCHMUCK=1 enthält KATEGORIEN alle 82 (51 + 31) und sonst nichts Neues', [mit[0], mit[1] - ohne[1]], [82, 82]);
ist('SCHMUCK=0 schaltet nicht ein', zaehle('0')[0], 0);
// Zusatz-Sperr-Tags der vorhandenen Schmuck-Collections (Gegenlesung 27.10.: fünf Fortura-Kostümstücke standen in sub-ohrringe, sub-armbaender, schmuck-sets, obwohl die neuen Kategorien fortura ausschliessen)
const vorhandenePruefen = schalter => {
  const env = { ...process.env }; delete env.SCHMUCK; if (schalter) env.SCHMUCK = schalter;
  const code = `const m = await import(${JSON.stringify(new URL('./kategorien.mjs', import.meta.url).href)});
    const P = (title, g, tags) => ({ title, g, tags });
    const fort = P('Armband Cleopatra', 'Apparel & Accessories > Jewelry > Bracelets', ['fortura', 'kostuem-accessoire', 'sort-armbaender']);
    const norm = P('Armband mit Herz', 'Apparel & Accessories > Jewelry > Bracelets', ['sort-armbaender']);
    const lizenz = P('Ring Lizenz', 'Apparel & Accessories > Jewelry > Rings', ['lizenz-nicht-bewerben']);
    const adult = P('Ring Erwachsene', 'Apparel & Accessories > Jewelry > Rings', ['adult-nicht-bewerben']);
    const k = h => m.KATEGORIEN.find(x => x.handle === h);
    const aus = {};
    for (const h of ['sub-ringe', 'sub-ohrringe', 'sub-armbaender', 'schmuck-sets', 'broschen-pins', 'koerper-fussschmuck', 'schmuckaufbewahrung']) aus[h] = !!k(h)?.sperrZusatz;
    aus.fortura = m.gehoertIn(k('sub-armbaender'), fort); aus.normal = m.gehoertIn(k('sub-armbaender'), norm); aus.lizenz = m.gehoertIn(k('sub-ringe'), lizenz); aus.adult = m.gehoertIn(k('sub-ringe'), adult);
    aus.fremd = m.gehoertIn(k('sub-halsketten'), P('Halskette Kostüm', 'Apparel & Accessories > Jewelry > Necklaces', ['fortura']));
    console.log(JSON.stringify(aus));`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { env, encoding: 'utf8' });
  return r.status === 0 ? JSON.parse(r.stdout.trim().split('\n').pop()) : r.stderr.slice(-300);
};
{
  const a = vorhandenePruefen(''), b = vorhandenePruefen('1');
  ist('Fortura ohne SCHMUCK=1: die vorhandene Collection nimmt das Kostümstück wie bisher auf (keine Zusatz-Sperre)', [a.fortura, a.normal, Object.values(a).slice(0, 7).some(Boolean)], [true, true, false]);
  ist('Fortura mit SCHMUCK=1: sub-armbaender schliesst das Kostümstück aus, ein gewöhnliches Armband bleibt', [b.fortura, b.normal], [false, true]);
  ist('mit SCHMUCK=1 tragen alle vorhandenen Schmuck-Collections der Auswahl die Zusatz-Sperre', Object.fromEntries(Object.entries(b).slice(0, 7)), { 'sub-ringe': true, 'sub-ohrringe': true, 'sub-armbaender': true, 'schmuck-sets': true, 'broschen-pins': true, 'koerper-fussschmuck': true, 'schmuckaufbewahrung': true });
  ist('Zusatz-Sperre: lizenz-nicht-bewerben fliegt mit SCHMUCK=1 aus sub-ringe, ohne den Schalter nicht', [a.lizenz, b.lizenz], [true, false]);
  ist('Basis-Sperre gilt in beiden Fällen weiter (adult-nicht-bewerben)', [a.adult, b.adult], [false, false]);
  ist('Gegenprobe: eine Collection ausserhalb der Auswahl (sub-halsketten hängt nicht im neuen Ast) sperrt fortura auch mit SCHMUCK=1 nicht', [a.fremd, b.fremd], [true, true]);
}

// ── Orakel: Katalog laden ──
let produkte, katalogArt;
{
  const voll = process.env.KATALOG_VOLL || '/tmp/katalog_taxo.json';
  const k = existsSync(voll) ? JSON.parse(readFileSync(voll, 'utf8')).produkte : null;
  if (k && k.length === ORAKEL.katalogProdukte) { produkte = k; katalogArt = `voller Katalog ${voll} (${k.length} Produkte)`; }
  else {
    const z = JSON.parse(gunzipSync(lies('schmuck-katalog.json.gz'))).produkte;
    produkte = z.map(([handle, title, g, tags]) => ({ handle, title, g, tags })); katalogArt = `eingecheckter Auszug (${z.length} von ${ORAKEL.katalogProdukte} Produkten)`;
  }
}
console.log('Katalog für den Orakel-Vergleich:', katalogArt);
const sha = hs => createHash('sha1').update([...hs].sort().join('\n')).digest('hex');
const mitglieder = new Map(KAT.map(k => [k.handle, produkte.filter(p => gehoertIn(k, p)).map(p => p.handle)]));

// ── Orakel: Mitglieder je Kategorie (Zahl UND dieselben Produkte) ──
for (const k of KAT) {
  const o = ORAKEL.kategorien[k.handle], m = mitglieder.get(k.handle);
  ist(`Orakel ${k.handle}: Zahl und Mitglieder`, { n: m.length, sha1: sha(m) }, o);
}
ist('Orakel: kein Schmuck-Handle fehlt im Orakel', KAT.filter(k => !(k.handle in ORAKEL.kategorien)).map(k => k.handle), []);
ist('Orakel: Gegenprobe - ein einziges fehlendes Produkt ändert den Hash', sha(mitglieder.get('silberringe').slice(1)) === ORAKEL.kategorien.silberringe.sha1, false);
// ── Orakel: Unterfilter (Zahl der Treffer, wie die Messausgabe sie nennt) ──
for (const f of FIL) ist(`Orakel Unterfilter ${f.handle}`, produkte.filter(p => gehoertIn(f, p)).length, ORAKEL.unterfilter[f.handle]);
ist('Unterfilter: Mitglieder sind immer auch Mitglieder der Kategorie', FIL.filter(f => { const m = new Set(mitglieder.get(KAT.find(k => k.id === f.eltern_id).handle)); return produkte.some(p => gehoertIn(f, p) && !m.has(p.handle)); }).map(f => f.handle), []);
// Marge: die Engine setzt Tag und Collection nur ab 15 Treffern und räumt bei weniger NICHTS mehr auf (kategorien_anlegen.mjs: nur if (ok) wird gesetzt oder entfernt).
// Hing ein Chip an genau 15 Produkten, hätte ihn das Fehlen EINES Produkts (Katalog 26 Stunden alt, laufender Import) mit alten Tags stehen lassen. Darum verlangt der Test 3 mehr.
const MARGE = 18;
ist(`Unterfilter: jeder hat mindestens ${MARGE} Treffer (Engine: 15) und weniger als 90 % der Kategorie`, FIL.filter(f => { const n = produkte.filter(p => gehoertIn(f, p)).length, e = mitglieder.get(KAT.find(k => k.id === f.eltern_id).handle).length; return n < MARGE || n >= e * 0.9; }).map(f => f.handle), []);
ist(`jede Kategorie erreicht min 15 Treffer, mit Marge mindestens ${MARGE}`, KAT.filter(k => mitglieder.get(k.handle).length < Math.max(k.min, MARGE)).map(k => k.handle), []);
ist('Gegenprobe: ein Chip mit genau 15 Treffern (wie die sieben entfernten) fiele durch die Marge', [15, 16, 17, 18].filter(n => n < MARGE), [15, 16, 17]);
// Vorrang statt Überlappung: kein Produkt in zwei Kindern derselben Gruppe (die Sammelkategorie «Alle …» ist nicht gebaut oder ausgenommen)
const ueberlappung = B.gruppen.filter(g => SCHMUCK_GRUPPEN.includes(g.handle)).map(g => {
  const hs = g.kinder.filter(h => mitglieder.has(h) && h !== 'halsketten-alle'), z = new Map();
  for (const h of hs) for (const x of mitglieder.get(h)) z.set(x, (z.get(x) || 0) + 1);
  return [g.handle, [...z.values()].filter(n => n > 1).length];
}).filter(([, n]) => n > 0);
ist('keine Überlappung innerhalb einer Gruppe', ueberlappung, []);
ist('halsketten-alle enthält die Produkte seiner Geschwister (Absicht der Datei)', (() => { const alle = new Set(mitglieder.get('halsketten-alle')); return ['perlenketten', 'choker-layering-ketten', 'glieder-hiphop-ketten', 'ketten-mit-anhaenger', 'silberketten', 'edelstahl-titanketten', 'zirkonia-moissanit-ketten'].filter(h => mitglieder.get(h).some(x => !alle.has(x))); })(), []);

// ── Sperr-Tags: gesperrte Produkte stehen in keiner Kategorie ──
const SILBER = { title: 'Silberring aus 925 Sterling Silber', g: 'Apparel & Accessories > Jewelry > Rings', tags: [] };
const kSilber = KAT.find(k => k.handle === 'silberringe');
ist('ein Silberring steht bei den Silberringen', gehoertIn(kSilber, SILBER), true);
for (const tag of ['adult-nicht-bewerben', '18plus', 'fortura', 'lizenz-nicht-bewerben', 'google-gesperrt-adult', 'nicht-bewerben']) {
  ist(`Sperr-Tag ${tag}: dasselbe Produkt steht in keiner Schmuck-Kategorie`, SCHMUCK.some(k => gehoertIn(k, { ...SILBER, tags: [tag] })), false);
}
ist('Sperr-Tag-Produkte im Katalog stehen in keiner Kategorie', KAT.some(k => produkte.filter(gesperrt).some(p => gehoertIn(k, p))), false);
ist('Gegenprobe: es gibt gesperrte Schmuck-Produkte im Katalog, die sonst passen würden', produkte.filter(gesperrt).length > 0, true);

// ── Gegenproben mit echten Titeln: je Kategorie 2 rein, 2 raus (Material, Motiv, Stil, Herren, Gravur, Zubehör) ──
const G = { R: 'Apparel & Accessories > Jewelry > Rings', O: 'Apparel & Accessories > Jewelry > Earrings', N: 'Apparel & Accessories > Jewelry > Necklaces', A: 'Apparel & Accessories > Jewelry > Charms & Pendants',
  B: 'Apparel & Accessories > Jewelry > Bracelets', S: 'Apparel & Accessories > Jewelry > Jewelry Sets', W: 'Apparel & Accessories > Jewelry > Watches',
  U: 'Apparel & Accessories > Jewelry > Watch Accessories > Watch Bands', K: 'Apparel & Accessories > Handbag & Wallet Accessories > Keychains' };
const GEGENPROBEN = [
  ['silberringe', [['Runder Ehering aus 925 Sterling Silber', G.R], ['Eleganter 4 Karat Radiant-Schliff S925 Silberring', G.R]], [['Moissanit-Ring mit Krappenfassung aus 925er Silber', G.R], ['S925 Sterling Silber Aquamarin Würfel-Ring', G.R]]],
  ['edelstahl-titanringe', [['Retro Punk Gothic Ring aus Titanstahl', G.R], ['Edelstahlring mit Buchstaben', G.R]], [['Titanstahl-Ring mit Emaille und grossem Edelstein', G.R], ['Damenring aus Titanstahl mit Katzenaugenstein', G.R]]],
  ['moissanit-ringe', [['Moissanit-Ring mit Krappenfassung aus 925er Silber', G.R], ['Moissanite Verlobungsring', G.R]], [['S925 Sterling Silber Aquamarin Würfel-Ring', G.R], ['Runder Ehering aus 925 Sterling Silber', G.R]]],
  ['edelstein-geburtsstein-ringe', [['Personalisierbarer Geburtsstein-Ring', G.R], ['S925 Sterling Silber Aquamarin Würfel-Ring', G.R]], [['DIY Laser gravierter Geburtsstein-Ring', G.R], ['2 Karat Moissanit Ring Smaragd-Schliff', G.R]]],
  ['zirkonia-strassringe', [['Funkelnder Bicolor-Blumenring mit Zirkonia', G.R], ['Verstellbarer Schlangenring mit Zirkonia', G.R]], [['Luxuriöser Strassring aus S925 Sterlingsilber', G.R], ['Edelstahl-Zirkonring "Snake"', G.R]]],
  ['silber-ohrringe', [['Edle Silberohrringe mit Strass-Inlay', G.O], ['Herz-Ohrstecker aus 925er Sterlingsilber', G.O]], [['Schmuck-Set «Trio» · 925 Silber (Kette · Ohrringe · Armband)', G.O], ['Perlen-Ohrhänger mit Goldfinish', G.O]]],
  ['perlen-ohrringe', [['Perlen-Ohrhänger mit Goldfinish', G.O], ['Mondförmige Perlenohrringe', G.O]], [['S925 Sterling Silber Ohrringe mit langen Perlen', G.O], ['Halskette und Ohrringe mit Perlen und Strass', G.O]]],
  ['zirkonia-strass-ohrringe', [['C-förmige Creolen mit Zirkonia', G.O], ['Olivegrüne Zirkon-Ohrstecker', G.O]], [['Edle Silberohrringe mit Strass-Inlay', G.O], ['Blumen-Ohrstecker mit Strass & Perlen', G.O]]],
  ['silberketten', [['S925 Sterling Silber Halskette mit Lab-Emerald', G.N], ['Opal-Halskette aus 925er Silber, oval, blau-weiss', G.N]], [['Edelstahl-Halskette «Goutte» · Tropfen-Anhänger, Silber', G.N], ['Layering-Halsketten Set · Gliederkette Gold & Silber', G.N]]],
  ['edelstahl-titanketten', [['Halskette aus Edelstahl mit Anhänger', G.N], ['Geometrische Halskette Edelstahl', G.N]], [['DIY Buchstaben-Halskette aus Edelstahl', G.N], ['Taille-Anhänger aus Titanstahl', G.N]]],
  ['zirkonia-moissanit-ketten', [['Halskette mit Zirkonia-Tropfenanhänger', G.N], ['Moissanite-Halskette mit Zirkon-Blatt-Anhänger', G.N]], [['Kreuz-Halskette aus Edelstahl mit Zirkonia', G.N], ['Halskette und Armband mit Strasssteinen', G.N]]],
  ['perlenketten', [['Herzförmige Perlen-Halskette', G.N], ['Barocke Süsswasserperlen-Halskette aus Titanstahl', G.N]], [['Achatperlen-Schlüsselanhänger mit geflochtener Kordel', G.A], ['Künstlerische Anhänger-Perlen', G.N]]],
  ['silberarmbaender', [['925-Silber Armband «Onda» · Kleeblatt-Glieder', G.B], ['Strassbesetztes Kreuz-Armband aus 925er Silber', G.B]], [['Edelstahl-Armband «Trésor» · Doppellagig mit Charms, Silber', G.B], ['Armband-Set: Gold, Silber und Anthrazit', G.B]]],
  ['edelstahl-titanarmbaender', [['Zirkon-Kettenarmband aus Edelstahl', G.B], ['Damen Armband aus Titanstahl – Gold', G.B]], [['Halskette und Armband aus Edelstahl mit Zirkonia', G.B], ['DIY-Armband mit Herzanhänger aus Edelstahl', G.B]]],
  ['vergoldete-armbaender', [['Vergoldetes Armband mit Zirkonia, zweilagig', G.B], ['Armband mit bunten Zirkonia-Steinen, 18K vergoldet', G.B]], [['Vergoldetes Edelstahlarmband', G.B], ['Armband «Sun» aus vergoldetem Edelstahl', G.B]]],
  ['zirkonia-strassarmbaender', [['Rhombus Zirkon Armband', G.B], ['Verstellbares Zirkonia-Armband', G.B]], [['Strassbesetztes Edelstahl-Armband', G.B], ['Armband mit Zirkonia-Steinen, 18K vergoldet', G.B]]],
  ['lederarmbaender', [['Herrenarmband aus Leder mit Gravur', G.B], ['Geflochtenes Edelstahl-Lederarmband', G.B]], [['Geflochtenes Lederarmband aus Mikrofaser', G.B], ['Leder-Riemen-Armreif', G.B]]],
  ['kupfer-magnetarmbaender', [['Kupferarmband im Retro-Stil für Herren', G.B], ['Magnetarmband aus rotem Kupfer', G.B]], [['Geflochtenes Lederarmband mit Magnetverschluss', G.B], ['Vintage Lotus Armreif – Messing & Silber', G.B]]],
  ['perlen-edelsteinarmbaender', [['Handgefertigtes Armband mit bunten Natursteinperlen', G.B], ['Doppelseitiges Achat-Armband mit mehrfarbigen Perlen', G.B]], [['DIY Armband-Perle, versilbert', G.B], ['Armreif aus natürlicher, weisser Xinjiang Jade', G.B]]],
  ['gluecks-schutzschmuck', [['Armband mit Glückskatze aus Jadeit', G.B], ['Metall Armreif mit Hufeisen-Glockenblumen', G.B]], [['Schmuckset Anker & Hufeisen', G.S], ['Glücksklee-Bead Set für DIY Armbänder', G.B]]],
  ['kreuz-schmuck', [['Kreuz-Titanstahl-Perlen-Halskette', G.N], ['Kreuz-Anhänger mit Kunststein', G.N]], [['Doppellagiges Kreuzstich-Armband mit Strasssteinen', G.B], ['Kreuzförmige Uhren Stahlband Strassverziert Quarzwerk', G.W]]],
  ['herz-schmuck', [['S925 Sterling Silber Armband mit Scheiben und Herzen', G.B], ['Champagner-Gold Armband mit grünem Herz', G.B]], [['Smartwatch mit Herzfrequenz & Blutsauerstoff', G.W], ['Smart-Armbanduhr mit Herzfrequenz-Messung', G.W]]],
  ['stern-mond-schmuck', [['Edelstahl-Anhänger: Sternzeichen und Monate', G.N], ['Doppellagiges S925 Silber Armband mit Sternen', G.B]], [['Herren-Quarzuhr mit Chronograph und Mondphase', G.W], ['Sternenmond Quarzuhr', G.W]]],
  ['blumen-schmetterlingsschmuck', [['Perlenring Schmetterling', G.R], ['Weisse Perlen-Schmetterlings-Armband', G.B]], [['Rosenquarz Perlenarmband handgeflochten', G.B], ['Quarzuhr mit Rosenmuster und Stahlarmband', G.W]]],
  ['tier-schmuck', [['S925 Sterling Silber Katzenring, verstellbar', G.R], ['Agat-Fuchs-Armband', G.B]], [['Doppellagige Fischgrät-Halskette aus Edelstahl', G.N], ['Vergoldetes Schlangenketten-Armband', G.B]]],
  ['minimalistischer-schmuck', [['Minimalistischer Armband', G.B], ['Minimalistischer Anhänger', G.N]], [['Keramik-Damenuhr mit minimalistischem Design', G.W], ['Minimalistische geometrische Ohrstecker aus Edelstahl', G.O]]],
  ['vintage-retro-schmuck', [['Vintage Halskette', G.N], ['Kristallarmband Obsidian & Aquamarin im Retro-Stil', G.B]], [['Vintage-Armbanduhr mit Lederarmband', G.W], ['Retro-Kupfer-Schädel-Anhänger', G.N]]],
  ['boho-ethno-schmuck', [['Nordisches Armband mit geometrischem Design', G.B], ['Halskette im traditionellen chinesischen Stil', G.N]], [['Boho-Armband für Apple Watch mit Natursteinen', G.U], ['Nordische Wandlampe für stimmungsvolles Licht', G.N]]],
  ['punk-gothic-schmuck', [['Serpent Skull Anhänger aus Edelstahl', G.N], ['Vintage Halskette im Punk-Stil', G.N]], [['Diamant-Rap-Hip-Hop Armbanduhr', G.W], ['Metall-Punk-Uhrarmband für Apple Watch', G.U]]],
  ['geometrischer-schmuck', [['Geometrische Halskette Edelstahl', G.N], ['Diamant Armband mit geometrischem Muster', G.B]], [['Geometrisches Metall-Armband für Apple Watch', G.U], ['Geometrisches Retro-Armband', G.B]]],
  ['korea-frankreich-oldmoney-schmuck', [['Französisches ovales Zirkon-Armband', G.B], ['Armband Korean Chic mit mattiertem blauem Zirkon', G.B]], [['Koreanisches Canvas-Lederarmband für Apple Watch', G.U], ['Japanisches Retro Beret mit Kette', G.N]]],
  ['herrenarmbaender', [['Vintage Lederarmband für Herren', G.B], ['Lederarmband mit Löwenkopf für Herren', G.B]], [['Bernsteinarmband für Damen und Herren', G.B], ['Armband aus Edelstahl für Männer und Frauen', G.B]]],
  ['personalisierte-ringe', [['Personalisierbarer Ring mit Stein', G.R], ['Personalisierter Geburtsstein-Ring', G.R]], [['DIY Buchstaben-Ring mit offenem Mund', G.R], ['DIY Laser gravierter Geburtsstein-Ring', G.R]]],
  ['personalisierte-armbaender', [['Buntes Buchstaben-Armband', G.B], ['Zirkon-Armreif mit Buchstaben-Design', G.B]], [['DIY Armband mit Buchstaben-Anhänger', G.B], ['DIY Gravur-Armband für Paare', G.B]]],
  ['schluessel-taschenanhaenger', [['Retro Anhänger Schlüsselanhänger handgewoben', G.A], ['6-teiliges Schlüsselanhänger-Set', G.A]], [['Plüschtier-Schlüsselanhänger für Taschen', G.K], ['Plüsch Schnauzer Schlüsselanhänger', G.K]]],
];
const P_ = ([title, g]) => ({ title, g, tags: [] });
ist('Gegenproben: 35 Kategorien mit je 2 Titeln rein und 2 raus', [GEGENPROBEN.length, GEGENPROBEN.every(([, a, b]) => a.length === 2 && b.length === 2)], [35, true]);
ist('Gegenproben decken alle Material-, Motiv- und Stil-Kategorien ab', ['silberringe', 'edelstahl-titanringe', 'moissanit-ringe', 'edelstein-geburtsstein-ringe', 'zirkonia-strassringe', 'silber-ohrringe', 'perlen-ohrringe', 'zirkonia-strass-ohrringe', 'silberketten', 'edelstahl-titanketten',
  'zirkonia-moissanit-ketten', 'silberarmbaender', 'edelstahl-titanarmbaender', 'vergoldete-armbaender', 'zirkonia-strassarmbaender', 'gluecks-schutzschmuck', 'kreuz-schmuck', 'herz-schmuck', 'stern-mond-schmuck', 'blumen-schmetterlingsschmuck', 'tier-schmuck',
  'minimalistischer-schmuck', 'vintage-retro-schmuck', 'boho-ethno-schmuck', 'punk-gothic-schmuck', 'geometrischer-schmuck', 'korea-frankreich-oldmoney-schmuck'].filter(h => !GEGENPROBEN.some(g => g[0] === h)), []);
for (const [h, rein, raus] of GEGENPROBEN) {
  const k = KAT.find(x => x.handle === h);
  for (const [t, g] of rein) ist(`rein   ${h}: ${t}`, gehoertIn(k, P_([t, g])), true);
  for (const [t, g] of raus) ist(`raus   ${h}: ${t}`, gehoertIn(k, P_([t, g])), false);
}
// ── Gegenlesung 27.10.2026: Randbegriffe, die Produkte in eine Kategorie zogen, die der Titel nicht nennt (echte Titel aus dem Katalog) ──
{
  const KN = h => KAT.find(k => k.handle === h);
  const rein = (h, titel, g) => ist(`Gegenlesung rein  ${h}: ${titel}`, gehoertIn(KN(h), P_([titel, g])), true);
  const raus = (h, titel, g) => ist(`Gegenlesung raus  ${h}: ${titel}`, gehoertIn(KN(h), P_([titel, g])), false);
  raus('edelstahl-titanringe', 'Wolframring mit Stufenfacetten und roter Beschichtung', G.R);      // 10 von 77 sagten nur Wolfram/Wolframkarbid
  raus('edelstahl-titanringe', 'Wolframstahl-Ring-Set für Herren', G.R);
  rein('zirkonia-strassringe', 'Herrenring aus Wolframkarbid mit Zirkonia', G.R);                    // Vorrang: Wolfram+Zirkonia liegt jetzt bei den Zirkoniaringen statt nirgends
  raus('perlen-ohrringe', 'Old Money Style Ohrklemmen mit Perlmutt', G.O);                           // Perlmutt ist keine Perle
  raus('perlenketten', 'Lesehilfe-Halskette mit Holzperlen', G.N);                                   // 6 von 67: Holz- oder Glasperlen
  raus('perlenketten', 'Halskette mit Glasperlen und Anhänger', G.N);
  rein('perlenketten', 'Herzförmige Perlen-Halskette', G.N);
  raus('kupfer-magnetarmbaender', 'Messing-Armband · Damen', G.B);                                   // 3 von 85 nur Messing
  rein('kupfer-magnetarmbaender', 'Kupferarmband im Retro-Stil für Herren', G.B);
  raus('geflochtene-wickelarmbaender', 'Titan-Stahl Armband mit Zirkonia-Knoten, Gold/Silber', G.B);   // 3 von 29 nur «Knoten»
  raus('minimalistischer-schmuck', '925-Silber Ring «Fleur» · filigrane Blüte', G.R);               // 9 von 83 nur «filigran»
  raus('minimalistischer-schmuck', 'Orchideen-Filigran-Brosche in Lila', 'Apparel & Accessories > Jewelry > Brooches');
  raus('minimalistischer-schmuck', 'Mondstein-Blütenring «Fleur» – zarter Statement-Ring', G.R);
  rein('minimalistischer-schmuck', 'Minimalistischer Anhänger', G.N);
  // Kristall ist weder Zirkonia noch Strass (Ohrringe 10 von 50, Ketten 7 von 51, Armbänder 23 von 207, Ringe 7 von 104 sagten nur Kristall)
  raus('zirkonia-strass-ohrringe', 'Koreanische Kristall-Ohrringe mit lila Blume', G.O);
  raus('zirkonia-moissanit-ketten', 'Halskette mit natürlichem, violettem Kristallanhänger', G.N);
  raus('zirkonia-moissanit-ketten', 'Baum des Lebens Anhänger Stein-Kristall-Säule Kette', G.N);
  raus('zirkonia-strassarmbaender', 'Amethyst Kristallarmband', G.B);
  raus('zirkonia-strassarmbaender', 'Ast-Armband mit Kristallen', G.B);
  raus('zirkonia-strassringe', 'Verstellbarer Kristall-Blumenring', G.R);
  rein('zirkonia-strass-ohrringe', 'C-förmige Creolen mit Zirkonia', G.O);
  rein('zirkonia-strassarmbaender', 'Tennis-Armband Bunt · Zirkonia funkelnd', G.B);
  // Hip-Hop: ein Drittel der Mitglieder von «Punk-, Gothic- & Hip-Hop-Schmuck» sagt nur Hip-Hop → der Titel nennt es jetzt
  rein('punk-gothic-schmuck', 'Modische Damen-Halskette mit Hip-Hop Metall-Design', G.N);
  ist('Hip-Hop steht im Titel der Kategorie, deren Regel es aufnimmt', /Hip-Hop/.test(KN('punk-gothic-schmuck').titel) && /hip-\?hop/.test(B.kategorien.find(k => k.handle === 'punk-gothic-schmuck').titel_muss.join('|')), true);
  ist('«Panzer» steht nicht mehr im Titel der Gliederketten (0 von 18 Titeln)', /Panzer/i.test(KN('glieder-hiphop-ketten').titel), false);
  ist('«Wickel» steht nicht mehr im Titel der geflochtenen Armbänder (1 von 26 Titeln)', /Wickel/i.test(KN('geflochtene-wickelarmbaender').titel), false);
  // Die Chips «Zirkonia & Strass» nehmen kein «nur Kristall» mehr auf
  const rohChips = B.kategorien.flatMap(k => k.unterfilter || []).filter(u => /zirkonia$/.test(u.handle));
  ist('fünf Zirkonia-Chips (von sieben fielen Ohrstecker und Anhänger-Ketten unter die Marge)', rohChips.length, 5);
  ist('Zirkonia-Chips: ein Titel, der nur Kristall sagt, passt in keinen', rohChips.filter(u => imUnterfilter(u, { title: 'Ohrstecker mit Kristallblume' }) || imUnterfilter(u, { title: 'Halskette mit natürlichem Crystal-Anhänger' })).map(u => u.handle), []);
  ist('Gegenprobe: mit Zirkonia, Zircon oder Strass passt derselbe Titel in alle', rohChips.filter(u => !imUnterfilter(u, { title: 'Ohrstecker mit Zirkonia' }) || !imUnterfilter(u, { title: 'Halskette mit Strasssteinen' })).map(u => u.handle), []);
}

// Der Rest ohne Katalog: Wortgrenzen und Vorrang mit selbstgebauten Titeln (jede Regel einmal von beiden Seiten)
const pr = (t, g = G.R) => P_([t, g]);
ist('Wortgrenze: «Silberner Ring in Gold» ist kein Silberring (Silber als Farbe)', gehoertIn(KAT.find(k => k.handle === 'silberringe'), pr('Ring in Silberfarbe aus Messing')), false);
ist('Wortgrenze: «Kreuzstich» ist kein Kreuz-Schmuck', gehoertIn(KAT.find(k => k.handle === 'kreuz-schmuck'), pr('Kreuzstich Armband', G.B)), false);
ist('Wortgrenze: «Herzfrequenz» ist kein Herz-Schmuck', gehoertIn(KAT.find(k => k.handle === 'herz-schmuck'), pr('Armband mit Herzfrequenz-Anzeige', G.B)), false);
ist('Wortgrenze: Herz-Armband ist Herz-Schmuck', gehoertIn(KAT.find(k => k.handle === 'herz-schmuck'), pr('Herz-Armband', G.B)), true);
ist('Google-Klasse: dieselbe Silberring-Wörter in einer Handyhülle sind kein Silberring', gehoertIn(KAT.find(k => k.handle === 'silberringe'), pr('Handyhülle mit 925 Silber Ring', 'Electronics > Communications > Telephony > Mobile Phone Accessories')), false);

// ── D: Unterfilter-Chips lassen sich als Metafelder planen (kategorie_unterfilter.mjs nutzt dieselbe Funktion) ──
const gids = Object.fromEntries(SCHMUCK.map(k => [k.handle, 'gid://test/' + k.handle]));
const eltern = KAT.filter(k => FIL.some(f => f.eltern_id === k.id));
const plan = planMetafelder(SCHMUCK, gids);
ist('Chips: ein Listenfeld je Kategorie mit Unterfiltern, ein Rückverweis je Unterfilter', [plan.writes.filter(w => w.key === 'unterfilter').length, plan.writes.filter(w => w.key === 'eltern').length], [eltern.length, 31]);
ist('Chips: 11 Kategorien tragen Chips', eltern.length, 11);
ist('Chips: nichts fehlt, nichts übersprungen', [plan.fehlend, plan.uebersprungen], [[], []]);
ist('Chips: das Listenfeld von herz-schmuck enthält seine 6 Filter in Reihenfolge der Datei', JSON.parse(plan.writes.find(w => w.handle === 'herz-schmuck').value), B.kategorien.find(k => k.handle === 'herz-schmuck').unterfilter.map(u => 'gid://test/' + u.handle));
ist('Chips: fehlt die Collection einer Kategorie, wird sie gemeldet und nichts für sie geplant', (() => { const p = planMetafelder(SCHMUCK, { ...gids, 'herz-schmuck': null }); return [p.fehlend.includes('herz-schmuck'), p.writes.some(w => w.handle === 'herz-schmuck')]; })(), [true, false]);

// ── Belegpflicht (Gegenlesung 27.10.2026, SPEC-Regel 6): Titel und Beschreibung nennen nur Stoffe, Steine und Motive, die in mindestens zwei Titeln der Mitglieder stehen ──
// Beschreibung und SEO-Text werden als Collection-Text live geschrieben. Gefunden wurde: «Naturstein» (0 von 46), «Süsswasserperlen» (0 von 28), «Panzerketten» (0 von 18), «Gravur» bei Armreifen (0 von 109),
// «Hamsa» (0 von 52), «Kreis/Rhombus» (0 von 67). Der Test bildet das Messgerät der Gegenlesung nach (lib/beleg_woerter.mjs) und läuft über Kategorien, Chips und die sechs Gruppen-Sammlungen.
const titelMap = new Map(KAT.map(k => [k.handle, produkte.filter(p => gehoertIn(k, p)).map(p => p.title)]));
ist('Belegpflicht: Wortschatz hat über 100 Einträge (ein leerer Wortschatz fände nie etwas)', WORTSCHATZ.length > 100, true);
ist('Belegpflicht Kategorien: jedes Material-, Stein- und Motivwort in Titel und Beschreibung steht in mindestens 2 Titeln der Mitglieder', KAT.map(k => [k.handle, unbelegt(`${k.titel}. ${k.beschreibung}`, titelMap.get(k.handle))]).filter(([, u]) => u.length), []);
ist('Belegpflicht Chips: jedes Wort im Chip-Titel steht in mindestens 2 Titeln der Chip-Mitglieder', FIL.map(f => [f.handle, unbelegt(f.titel, produkte.filter(p => gehoertIn(f, p)).map(p => p.title))]).filter(([, u]) => u.length), []);
const gruppenTitel = a => a.kinder.flatMap(h => { const k = kategorieVon(h); return k ? produkte.filter(p => gehoertIn(k, p)).map(p => p.title) : []; });
ist('Belegpflicht Gruppen-Sammlungen (Menü-Köpfe): die sechs Beschreibungen sind belegt', AESTE.filter(a => a.gruppe).map(a => [a.kopf, unbelegt(`${a.gruppe.titel}. ${a.gruppe.beschreibung}`, gruppenTitel(a))]).filter(([, u]) => u.length), []);
// Gegenprobe: die sieben Beschreibungen der Gegenlesung (alter Wortlaut) fielen durch - der Prüfer findet sie
const ALTE = [['herrenarmbaender', 'Armbänder für Herren aus Leder, Stahl, Kupfer und Naturstein.', 'Naturstein'], ['perlen-ohrringe', 'Ohrringe mit Perlen, Süsswasserperlen oder Perlmutt.', 'Süsswasserperlen'],
  ['glieder-hiphop-ketten', 'Kräftige Gliederketten: Cuban- und Panzerketten, Rolo-Ketten und Ketten im Hip-Hop-Stil.', 'Panzer'], ['armreifen-bangles', 'Feste und offene Armreifen aus Metall, auch mit Zirkonia oder Gravur.', 'Gravur'],
  ['gluecks-schutzschmuck', 'Schmuck mit Glückssymbolen und Schutzzeichen: Kleeblatt, Teufelsauge, Hamsa, Amulette und Hufeisen.', 'Hamsa'], ['geometrischer-schmuck', 'Schmuck mit geometrischen Formen wie Kreis, Dreieck, Quadrat und Rhombus.', 'Kreis'],
  ['gliederarmbaender', 'Gliederarmbänder, Panzer- und Cuban-Ketten sowie Tennisarmbänder.', 'Panzer'],
  // eigene Nachmessung bei der Korrektur: weitere Wörter mit weniger als zwei Titeln (Set 1 von 56, Verschluss 0 von 207, Werkzeug 1 von 43)
  ['moissanit-ringe', 'Ringe mit Moissanit, als Solitär, mit Halo oder im Set.', 'Set'], ['perlen-edelsteinarmbaender', 'Armbänder aus Perlen, Natursteinen und Edelsteinen, elastisch oder mit Verschluss.', 'Verschluss'],
  ['schmuck-selbermachen', 'Perlen, Anhänger, Verschlüsse, Werkzeug und Sets, mit denen sich Armbänder selbst gestalten lassen.', 'Werkzeug']];
ist('Gegenprobe: jeder alte Wortlaut fällt beim Prüfer durch (10 Beschreibungen)', ALTE.map(([h, text, wort]) => unbelegt(text, titelMap.get(h)).some(u => u.wort === wort)), Array(10).fill(true));
ist('Gegenprobe: das Eigenschaftswort «robust» (Edelstahl-Armbänder, ohne Beleg) fällt beim Wortprüfer der Beschreibungen durch', BEHAUPTUNG.test('Armbänder aus Edelstahl und Titanstahl, robust für den Alltag.'), true);
ist('Gegenprobe: belegte Wörter fallen nicht auf (Leder 19 von 46 Titeln bei den Herrenarmbändern)', unbelegt('Armbänder für Herren aus Leder, Stahl und Kupfer.', titelMap.get('herrenarmbaender')), []);
ist('Gegenprobe: mit min 1 statt 2 fiele die Teufelsauge-Zahl nicht auf, ein Wort mit genau einem Titel schon bei min 2', unbelegt('Schmuck mit Pixiu.', ['Pixiu-Armband']).length + unbelegt('Schmuck mit Hamsa.', ['Hamsa-Ring', 'Hamsa-Kette']).length, 0);
ist('Gegenprobe: ein Wort mit einem einzigen Titel fällt bei min 2 durch', unbelegt('Schmuck mit Rolo-Ketten.', ['Einfache Rolo-Kette', 'Cuban-Kette']).map(u => u.wort), ['Rolo']);

// ── Katalogdrift gegen das Orakel (Gegenlesung 27.10.: Schnappschuss 26 Stunden alt, Orakel nicht unabhängig) ──
{
  const o = ladeOrakel();
  const zahlen = Object.fromEntries(KAT.map(k => [k.handle, mitglieder.get(k.handle).length]));
  ist('Drift: mit dem Katalog des Orakels weicht keine Kategorie ab', orakelAbweichungen(zahlen, o), []);
  ist('Drift: eine Kategorie mit 10 Produkten weniger fällt auf (grösste zuerst)', orakelAbweichungen({ ...zahlen, silberringe: zahlen.silberringe - 10, ohrstecker: zahlen.ohrstecker + 8 }, o).map(a => [a.handle, a.diff]), [['silberringe', -10], ['ohrstecker', 8]]);
  ist('Drift: zwei Produkte Unterschied sind Rauschen (unter 3 Produkten)', orakelAbweichungen({ ...zahlen, silberringe: zahlen.silberringe - 2 }, o), []);
  ist('Drift: eine grosse Kategorie darf um 3 Produkte schwanken, wenn es unter 10 % sind', orakelAbweichungen({ ...zahlen, 'halsketten-alle': zahlen['halsketten-alle'] + 3 }, o), []);
  ist('Drift: Chips sind im Orakel und werden verglichen; ein unbekannter Handle wird übersprungen', orakelAbweichungen({ 'herz-schmuck-ringe': 40, 'gibt-es-nicht': 5 }, o).map(a => a.handle), ['herz-schmuck-ringe']);
  ist('Orakel: alle 51 Kategorien und alle 31 Chips des Adapters sind im Orakel', [KAT.filter(k => !(k.handle in o.kategorien)).length, FIL.filter(f => typeof o.unterfilter[f.handle] !== 'number').length], [0, 0]);
  ist('Orakel: der Hinweis nennt die Grenze (nicht unabhängig, Schnappschuss)', /NICHT unabhängig/.test(o.hinweis) && /frisch lesen/.test(o.hinweis), true);
}

// ── Sperr-Tags: EINE Quelle (lib/sperr_tags.mjs) statt zweier Listen (8 und 11 Tags), die unbemerkt auseinanderliefen ──
ist('Sperr-Tags: die Engine (kategorien.mjs) sperrt genau die Basisliste', ENGINE_SPERR, BASIS_SPERR_TAGS);
ist('Sperr-Tags: die Taxonomie (kern.mjs) sperrt die Basisliste plus drei', KERN_SPERR, [...BASIS_SPERR_TAGS, ...ZUSATZ_SPERR_TAGS_TAXONOMIE]);
ist('Sperr-Tags: jedes Sperr-Tag der Engine sperrt auch in der Taxonomie', ENGINE_SPERR.filter(t => !KERN_SPERR.includes(t)), []);
ist('Sperr-Tags: der Unterschied ist genau google-gesperrt-adult, lizenz-nicht-bewerben, fortura', KERN_SPERR.filter(t => !ENGINE_SPERR.includes(t)).sort(), ['fortura', 'google-gesperrt-adult', 'lizenz-nicht-bewerben']);
ist('Sperr-Tags: die alte Engine sperrt fortura BEWUSST nicht (kategorien_test.mjs «gewöhnliche Tags sperren nicht»); eine Vereinheitlichung auf die längere Liste liesse Fortura-Ware aus ihren Themenkategorien fallen', ENGINE_SPERR.includes('fortura'), false);
ist('Sperr-Tags: kein Duplikat in den Listen', [new Set(KERN_SPERR).size === KERN_SPERR.length, new Set(ENGINE_SPERR).size === ENGINE_SPERR.length], [true, true]);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
