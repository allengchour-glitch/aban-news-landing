// Tests der Bereichs-Taxonomie-Anbindung (lib/bereich_taxonomie.mjs), hier mit der Schmuck-Datei. Gegenproben in BEIDE Richtungen; Zusammenfassung am ENDE.
// Orakel = Mitgliederlisten des Messwerkzeugs (dropship/taxonomie-2610-b/messen.mjs), festgehalten in dropship/taxonomie-2610-b/orakel/ (Trefferzahl + SHA-1 der Mitglieder).
// Katalog: der volle Katalog /tmp/katalog_taxo.json, wenn er denselben Stand hat (gleiche Produktzahl wie im Orakel), sonst der eingecheckte Auszug (Google-Klasse
// «Jewelry» plus alle Orakel-Mitglieder; in der CI ist /tmp leer). Titel der Gegenproben stammen aus dem echten Katalog vom 26.10.2026.
import { readFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { SCHMUCK, SCHMUCK_GRUPPEN, baueBereich, bereichAuswahl, ladeBereich, waehleKategorien } from './bereich_taxonomie.mjs';
import { gehoertIn, KATEGORIEN } from './kategorien.mjs';
import { planMetafelder } from './unterfilter_plan.mjs';
import { HANDLE_RE, gesperrt } from '../../dropship/taxonomie-2610-b/kern.mjs';

let ok = 0, fehl = 0;
const ist = (name, wert, soll) => { const a = JSON.stringify(wert), b = JSON.stringify(soll); if (a === b) ok++; else { fehl++; console.log('FEHLER', name, '\n  ist  ', a, '\n  soll ', b); } };
const lies = n => readFileSync(new URL(`../../dropship/taxonomie-2610-b/orakel/${n}`, import.meta.url));

const KAT = SCHMUCK.filter(k => !k.filter), FIL = SCHMUCK.filter(k => k.filter);
const { B, ausgelassen, bestehend, bauen } = bereichAuswahl();
const ORAKEL = JSON.parse(lies('schmuck-orakel.json'));
const SHOP = JSON.parse(lies('collections-2710.json'));

// ── Aufbau ──
ist('Kategorien + Unterfilter (52 Kinder der 14 Gruppen, minus herrenuhren, 38 Chips)', [KAT.length, FIL.length], [51, 38]);
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
ist('jede Beschreibung nennt keine Zahl (ausser den Silber-Feingehalten 925 und 999) und kein Heilsversprechen (SPEC 6)', SCHMUCK.filter(k => /(?<![\d])(?!925|999)\d{3,}|(^|[^a-zäöüß])(beste|bester|original|garantiert|wasserdicht|hypoallergen|nickelfrei)/i.test(k.beschreibung)).map(k => k.handle), []);
ist('jeder Filter kennt seine Kategorie', FIL.every(f => KAT.some(k => k.id === f.eltern_id)), true);
ist('jeder Filter-Handle beginnt mit dem Handle seiner Kategorie', FIL.every(f => f.handle.startsWith(KAT.find(k => k.id === f.eltern_id).handle + '-')), true);
ist('Filter: der Suchmaschinen-Titel nennt die Kategorie (der Chip-Titel «Mit Zirkonia» ist mehrfach vergeben)', FIL.every(f => f.seoTitel.startsWith(KAT.find(k => k.id === f.eltern_id).titel + ': ') && f.seoTitel.endsWith(' | LuxeStyle CH')), true);
ist('Chip-Titel wiederholen sich: «Mit Zirkonia» steht bei mehreren Eltern', FIL.filter(f => f.titel === 'Mit Zirkonia').length > 3, true);
ist('Kategorien tragen keinen eigenen SEO-Titel (Vorgabe «<Titel> online kaufen» aus kategorien_anlegen.mjs)', KAT.some(k => 'seoTitel' in k), false);

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
ist('mit SCHMUCK=1 enthält KATEGORIEN alle 89 (51 + 38) und sonst nichts Neues', [mit[0], mit[1] - ohne[1]], [89, 89]);
ist('SCHMUCK=0 schaltet nicht ein', zaehle('0')[0], 0);

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
ist('Unterfilter: jeder hat mindestens 15 Treffer und weniger als die Kategorie (SPEC: 15 bis unter 90 %)', FIL.filter(f => { const n = produkte.filter(p => gehoertIn(f, p)).length, e = mitglieder.get(KAT.find(k => k.id === f.eltern_id).handle).length; return n < 15 || n >= e * 0.9; }).map(f => f.handle), []);
ist('jede Kategorie erreicht min 15 Treffer', KAT.filter(k => mitglieder.get(k.handle).length < k.min).map(k => k.handle), []);
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
  ['edelstahl-titanringe', [['Retro Punk Gothic Ring aus Titanstahl', G.R], ['Herrenring aus Wolframkarbid mit Zirkonia', G.R]], [['Titanstahl-Ring mit Emaille und grossem Edelstein', G.R], ['Damenring aus Titanstahl mit Katzenaugenstein', G.R]]],
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
  ['zirkonia-strassarmbaender', [['Rhombus Zirkon Armband', G.B], ['Ast-Armband mit Kristallen', G.B]], [['Strassbesetztes Edelstahl-Armband', G.B], ['Armband mit Zirkonia-Steinen, 18K vergoldet', G.B]]],
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
ist('Chips: ein Listenfeld je Kategorie mit Unterfiltern, ein Rückverweis je Unterfilter', [plan.writes.filter(w => w.key === 'unterfilter').length, plan.writes.filter(w => w.key === 'eltern').length], [eltern.length, 38]);
ist('Chips: 11 Kategorien tragen Chips', eltern.length, 11);
ist('Chips: nichts fehlt, nichts übersprungen', [plan.fehlend, plan.uebersprungen], [[], []]);
ist('Chips: das Listenfeld von herz-schmuck enthält seine 6 Filter in Reihenfolge der Datei', JSON.parse(plan.writes.find(w => w.handle === 'herz-schmuck').value), B.kategorien.find(k => k.handle === 'herz-schmuck').unterfilter.map(u => 'gid://test/' + u.handle));
ist('Chips: fehlt die Collection einer Kategorie, wird sie gemeldet und nichts für sie geplant', (() => { const p = planMetafelder(SCHMUCK, { ...gids, 'herz-schmuck': null }); return [p.fehlend.includes('herz-schmuck'), p.writes.some(w => w.handle === 'herz-schmuck')]; })(), [true, false]);

console.log(`${ok} ok, ${fehl} Fehler`);
process.exit(fehl ? 1 : 0);
