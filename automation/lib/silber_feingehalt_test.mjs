/** Test für die Silber-Feingehalts-Regel (automation/lib/silber_feingehalt.mjs). Reine Funktion, kein Netz.
 *  Die Beispiele unten sind gebaut wie die echten Texte (Titel, Beschreibungen und Optionen aus dem Katalog vom 17.11.2026); die echten Urteile
 *  stehen in dropship/silber-bazg-1711/urteile.json und werden im Abgleichstest (silber_abgleich_test.mjs) gegen die Regel gehalten.
 *  Lauf: /opt/node22/bin/node automation/lib/silber_feingehalt_test.mjs   */
import { silberFeingehalt, istSilberFeingehalt, fundstellen, bereinige, belegText } from './silber_feingehalt.mjs';

let n = 0, fehler = 0;
const pruef = (name, ist, soll) => {
  n++;
  const ok = JSON.stringify(ist) === JSON.stringify(soll);
  if (!ok) { fehler++; console.log(`FAIL ${name}\n     ist  ${JSON.stringify(ist)}\n     soll ${JSON.stringify(soll)}`); }
};
const treffer = (name, p) => pruef(name, istSilberFeingehalt(p), true);
const keiner = (name, p) => pruef(name, istSilberFeingehalt(p), false);

// ── 1. Titel ──
treffer('925 im Titel', { title: '925 Silber Ring «Luna»' });
treffer('S925 im Titel', { title: 'S925 Ohrstecker Herz' });
treffer('Ag925 im Titel', { title: 'Ag925 Armband' });
treffer('Ag 925 mit Leerzeichen', { title: 'Armband Ag 925 Kette' });
treffer('Sterling im Titel', { title: 'Sterlingsilber Kette «Wave»' });
treffer('Sterling Silver englisch', { title: 'Sterling Silver Anhänger' });
treffer('999 Silber im Titel', { title: '999 Silber-Anhänger «Fortuna»' });
for (const z of ['999', '990', '958', '950', '900', '835', '800']) treffer(`Silber ${z}`, { title: `Silber ${z} Armreif` });
treffer('Silber 999 (umgekehrte Reihenfolge)', { title: 'Silber 999 Münze' });
treffer('990 Silber', { title: 'Kette aus 990 Silber' });
treffer('Feinsilber', { title: 'Feinsilber Armreif' });
treffer('Echtsilber', { title: 'Ring aus Echtsilber' });
treffer('925er', { title: '925er Silberring' });
treffer('«925» mit Anführungszeichen', { title: 'Ring «925» Zirkonia' });
treffer('Komma ohne Leerzeichen davor', { title: 'Ring', description: 'Material: Kupfer,925 Silber' });
treffer('Punkt ohne Leerzeichen davor', { title: 'Ring', description: 'Material:Silber.925' });

// ── 2. Beschreibung (Text und HTML) ──
treffer('Material: 925 Sterling Silber', { title: 'Zirkonia Ohrringe', description: 'Material: 925 Sterling Silber, hypoallergen.' });
treffer('im HTML-Absatz', { title: 'Armband', description: '<p>Hochwertiges <strong>S925</strong> Silber.</p>' });
treffer('HTML-Entität nbsp', { title: 'Kette', description: 'Material:&nbsp;925&nbsp;Silber' });
treffer('92,5 % Silber', { title: 'Ring', description: 'Legierung: 92,5 % Silber, 7,5 % Kupfer' });
treffer('Silber 92.5%', { title: 'Ring', description: 'Silber 92.5% Feingehalt' });
treffer('Nur ein Teil: S925-Nadel', { title: 'Perlenohrringe', description: 'Ohrstecker-Nadel S925, Körper Legierung.' });
treffer('Satz mit Komma davor ist KEINE Verneinung', { title: 'Ring', description: 'Nicht rostend, aus 925 Silber gefertigt.' });
treffer('Verneinung des Gegenteils bleibt Treffer', { title: 'Ring', description: 'Nicht aus Plastik, sondern 925 Sterlingsilber.' });
treffer('Verneinung weiter als drei Wörter davor gilt nicht', { title: 'Ring', description: 'Das ist nicht aus Metall gefertigt aber 925 Silber trägt' });
treffer('descriptionHtml als Feld (Shopify-Name)', { title: 'Ring', descriptionHtml: '<p>S925</p>' });
treffer('Silberwort «Ag» neben 999', { title: 'Ag 999 Barren Anhänger' });
treffer('Satzzeichen beendet die Verneinung (Komma)', { title: 'Ring', description: 'Kein Plastik, 925 Silber' });
treffer('Satzzeichen beendet die Verneinung (Punkt)', { title: 'Ring', description: 'Das ist kein Plastik. 925 Silber.' });
treffer('Satzzeichen beendet die Verneinung (Zeilenumbruch)', { title: 'Ring', description: 'Nicht rostend\n925 Silber' });
treffer('Aufzählung: «Ohne Nickel» davor, 925 in der nächsten Zeile', { title: 'Ring', description: 'Ohne Nickel\n925 Silber' });
treffer('Aufzählung als HTML-Liste', { title: 'Ring', description: '<ul><li>Ohne Nickel</li><li>925 Silber</li></ul>' });
treffer('Absatzgrenze <p>', { title: 'Ring', description: '<p>Kein Nickel</p><p>S925 Silber</p>' });
treffer('Zeilenumbruch <br>', { title: 'Ring', description: 'Kein Nickel<br>S925 Silber' });
keiner('Verneinung im selben Absatz bleibt Verneinung', { title: 'Ring', description: '<p>Edelstahl, kein Sterlingsilber</p>' });

// ── 3. Optionen ──
treffer('Option Material 925 Silber', { title: 'Ring', options: [{ name: 'Material', values: ['925 Silber', 'Gold'] }] });
treffer('Option als Text', { title: 'Ring', options: 'Material: Sterling Silver / Roségold' });
treffer('Option 925 als Wert', { title: 'Ring', options: [{ name: 'Feingehalt', values: ['925'] }] });

// ── 4. Keine Feingehaltsangabe ──
keiner('leer', {});
keiner('nur Silberfarbe', { title: 'Armband silberfarben', description: 'Edelstahl, silberfarben, wasserfest.' });
keiner('Silber-Optik', { title: 'Kette Silber-Optik', description: 'Legierung in Silber-Optik.' });
keiner('versilbert ohne Zahl', { title: 'Ring versilbert', description: 'Messing versilbert.' });
keiner('925 mAh', { title: 'Akku', description: 'Kapazität 925 mAh.' });
keiner('925 mm', { title: 'Seil', description: 'Länge 925 mm.' });
keiner('925 g', { title: 'Beutel', description: 'Gewicht 925 g.' });
keiner('925 Stück', { title: 'Perlen', description: '925 Stück im Set.' });
keiner('19250 ist keine 925', { title: 'Artikel 19250' });
keiner('9250 ist keine 925 (Zahl geht weiter)', { title: 'Artikel 9250' });
keiner('925000 ist keine 925', { title: 'Artikel 925000' });
keiner('Baujahr 1925', { title: 'Uhr Baujahr 1925' });
keiner('Dezimalzahl 9.25', { title: 'Länge 9.25 cm' });
keiner('Tausenderzahl 1,925', { title: 'Preis 1,925' });
keiner('Tausenderzahl 1.925', { title: 'Preis 1.925' });
keiner('800 Stück neben Silber', { title: 'Silber Perlen', description: '800 Stück im Beutel.' });
keiner('Edelstahl 800 ohne Silberwort', { title: 'Edelstahl 800 Schleifpapier' });

// ── 5. Verneinung unmittelbar vor der Angabe ──
keiner('kein Sterlingsilber', { title: 'Ring', description: 'Edelstahl, kein Sterlingsilber.' });
keiner('nicht aus Sterlingsilber', { title: 'Ring', description: 'Silberfarben, nicht aus Sterlingsilber.' });
keiner('ohne 925 Stempel', { title: 'Ring', description: 'Messing, ohne 925 Stempel.' });
keiner('statt Sterling Silber', { title: 'Ring', description: 'Edelstahl statt Sterling Silber.' });
keiner('nicht um Edelstahl- oder Sterlingsilber-Schmuck (drei Wörter dazwischen)', { title: 'Ohrstecker', description: 'Es handelt sich um modischen Schmuck, nicht um Edelstahl- oder Sterlingsilber-Schmuck.' });
keiner('Vergleich: Anders als 925er Silber', { title: 'Set', description: 'Anders als 925er Silber läuft dieser Edelstahl nicht an.' });
keiner('Vergleich: im Gegensatz zu Sterlingsilber', { title: 'Set', description: 'Im Gegensatz zu Sterlingsilber ist dieses Metall nickelfrei.' });
keiner('Vergleich: im Vergleich zu 925 Silber', { title: 'Set', description: 'Im Vergleich zu 925 Silber ist Edelstahl robuster.' });
keiner('Vergleich: gegenüber Sterling Silber', { title: 'Set', description: 'Gegenüber Sterling Silber hat Edelstahl Vorteile.' });
keiner('Vergleich: compared to', { title: 'Set', description: 'Compared to sterling silver this steel is harder.' });
keiner('English not sterling', { title: 'Ring', description: 'Stainless steel, not sterling silver.' });
{
  const r = silberFeingehalt({ title: 'Ring', description: 'Edelstahl, kein Sterlingsilber.' });
  pruef('Verneinung wird als verneint gemeldet', [r.treffer, r.verneint.length, r.belege.length], [false, 1, 0]);
}

// ── 6. Belege ──
{
  const r = silberFeingehalt({ title: '925 Ring', description: 'Sterlingsilber.', options: [{ name: 'Material', values: ['925 Silber'] }] });
  pruef('Felder der Belege', [...new Set(r.belege.map((b) => b.feld))].sort(), ['beschreibung', 'option', 'titel']);
  pruef('Belegtext hat höchstens drei Teile', belegText(r).split(' | ').length <= 3, true);
  pruef('Belegtext nennt Feld und Art', /titel\/925/.test(belegText(r)), true);
}
pruef('fundstellen: Umgebung höchstens 100 Zeichen', fundstellen('x'.repeat(100) + ' 925 silber ' + 'y'.repeat(100) + ' silber ' + 'z'.repeat(20) + ' 999').treffer.every((t) => t.text.length <= 100), true);
{
  const r = silberFeingehalt({ title: 'S925 Ring', description: 'Sterling 925 Sterling Silver 925', options: 'Material: 925' });
  pruef('Belegtext: auch bei vielen Fundstellen höchstens drei Teile', [r.belege.length > 3, belegText(r).split(' | ').length], [true, 3]);
  pruef('Umgebung höchstens 100 Zeichen im ungünstigsten Fall (92,5 neben Silber)', fundstellen('silber' + 'x'.repeat(30) + ' 92,5 ' + 'y'.repeat(30) + ' silber 92,5 ' + 'z'.repeat(60)).treffer.every((t) => t.text.length <= 100), true);
}
pruef('bereinige: HTML, Entität, Grossschreibung', bereinige('<span>S925&nbsp;Silber</span>'), 's925 silber');
pruef('Stabil bei undefined und null', [istSilberFeingehalt(undefined), istSilberFeingehalt(null), istSilberFeingehalt({ title: null, description: null, options: null })], [false, false, false]);

console.log(fehler ? `\n${fehler} FEHLER von ${n}` : `${n} Prüfungen bestanden, 0 Fehler`);
process.exit(fehler ? 1 : 0);
