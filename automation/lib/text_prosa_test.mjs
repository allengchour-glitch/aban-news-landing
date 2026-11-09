import assert from 'node:assert/strict';
import { zerlege, schlichtesProsa, prosaPruefen, prosaEinsetzen, belegErweitert, erlaubteStatus, prosaBearbeitbar, MARKER, ENDE } from './text_prosa.mjs';
let n = 0; const t = (name, f) => { try { f(); n++; } catch (e) { console.error('✗', name, '\n  ', e.message); process.exitCode = 1; } };

const LIEFER = '<p class="ls-liefer" data-tier="direkt" style="x">📦 Lieferzeit 10–20 Werktage</p>\n';
const TRUST = '<p style="font-size:1.05em;background:#f7faf7;border:1px solid #d9e7d9;"><strong>🛡️ Ohne Risiko:</strong> 30 Tage</p>\n';
const PROSA = '<p>Ein Kleid aus Polyester.</p><ul><li>Elastisch</li></ul>';
const SEITE = LIEFER + TRUST + PROSA + '<div class="ls-produktdetails"><h4>Produktdetails</h4></div><!-- ls-fakten-v1 --><div class="ls-fakten">x</div><!-- /ls-fakten-v1 --><!-- ls-xsell-v1 --><p>mehr</p>';

t('Zerlegen: Kopf = beide Kästen, Prosa bis zum Detailkasten', () => {
  const z = zerlege(SEITE);
  assert.equal(z.kopf, LIEFER + TRUST); assert.equal(z.prosa, PROSA); assert.ok(z.rest.startsWith('<div class="ls-produktdetails"'));
  assert.equal(z.kopf + z.prosa + z.rest, SEITE);
});
t('Zerlegen ohne Kästen: Prosa ab Anfang', () => { const z = zerlege('<p>Text</p><div class="ls-fakten">x</div>'); assert.equal(z.kopf, ''); assert.equal(z.prosa, '<p>Text</p>'); });
t('Zerlegen: Prosa bis zum ersten Marker-Kommentar', () => assert.equal(zerlege('<p>A</p><!-- ls-xsell-v1 --><p>B</p>').prosa, '<p>A</p>'));
t('Zerlegen: nur Kopf, keine Prosa → leere Prosa', () => assert.equal(zerlege(LIEFER + TRUST + '<div class="ls-produktdetails">x</div>').prosa, ''));
t('Zerlegen: Sorglos-Kasten (div) beendet die Prosa', () => assert.equal(zerlege('<p>A</p><div style="background:#f7faf7;x">S</div>').prosa, '<p>A</p>'));
t('Zerlegen erkennt einen vorhandenen Textblock', () => { const z = zerlege(LIEFER + MARKER + '<p>alt</p>' + ENDE + '<div class="ls-fakten">x</div>'); assert.equal(z.markiert, true); assert.equal(z.prosa, '<p>alt</p>'); });

t('schlichte Prosa: p/ul ja, Tabelle und Bild nein', () => { assert.equal(schlichtesProsa(PROSA), true); assert.equal(schlichtesProsa('<p>x</p><table></table>'), false); assert.equal(schlichtesProsa('<p>x</p><img src="a">'), false); });
t('schlichte Prosa: leere Prosa zählt nicht', () => assert.equal(schlichtesProsa(''), false));

const ZAHLEN = new Set(['16', '2', '30']);
const GUT = '<p>Dieses Armband aus Edelstahl begleitet dich durch den Alltag, weil es leicht ist und sich angenehm trägt. Die zwei Lagen geben ihm einen verspielten Auftritt, ohne aufdringlich zu wirken.</p><h3>Material und Tragegefühl</h3><p>Das Armband wiegt etwa 16 g und besteht aus Edelstahl. Dadurch fühlt es sich am Handgelenk kaum spürbar an, und du kannst es den ganzen Tag tragen. Es eignet sich für den Alltag ebenso wie für einen schönen Abend.</p><ul><li>Material: Edelstahl</li><li>Zwei Lagen mit kleinen Anhängern</li></ul>';
t('guter Text besteht', () => { const r = prosaPruefen(GUT, ZAHLEN, { titel: 'Edelstahl-Armband Tresor' }); assert.equal(r.ok, true, r.gruende.join(' | ')); });
t('Gegenprobe: erfundene Zahl fällt durch', () => assert.ok(prosaPruefen(GUT.replace('16 g', '45 g'), ZAHLEN).gruende.some(g => /Zahl nicht/.test(g))));
t('Tag ausserhalb der Liste fällt durch', () => assert.ok(prosaPruefen(GUT + '<div>x</div>', ZAHLEN).gruende.some(g => /Tag nicht erlaubt/.test(g))));
t('Attribute fallen durch (Style-Einschleusen)', () => assert.ok(prosaPruefen(GUT.replace('<p>', '<p style="x">'), ZAHLEN).gruende.some(g => /Attribut/.test(g))));
t('zu kurz fällt durch', () => assert.ok(prosaPruefen('<p>Kurz.</p><p>Noch kürzer.</p>', ZAHLEN).gruende.some(g => /zu kurz/.test(g))));
t('Marke fällt durch', () => assert.ok(prosaPruefen(GUT.replace('Alltag', 'Disney-Alltag'), ZAHLEN).gruende.some(g => /verbotenes Wort/.test(g))));
t('Wirkversprechen fällt durch', () => assert.ok(prosaPruefen(GUT.replace('angenehm', 'garantiert angenehm'), ZAHLEN).gruende.some(g => /Behauptung/.test(g))));
t('wasserdicht mit Beleg im Datenblatt ist erlaubt', () => assert.equal(prosaPruefen(GUT.replace('leicht', 'wasserdicht'), ZAHLEN, { beleg: 'Material: steel, waterproof wasserdicht' }).gruende.some(g => /Behauptung/.test(g)), false));
t('«Waterproof: Yes» im englischen Datenblatt belegt «wasserdicht»', () => assert.equal(prosaPruefen(GUT.replace('leicht', 'wasserdicht'), ZAHLEN, { beleg: 'Waterproof: Yes' }).gruende.some(g => /Behauptung/.test(g)), false));
t('«Waterproof: no» belegt «wasserdicht» NICHT', () => assert.ok(prosaPruefen(GUT.replace('leicht', 'wasserdicht'), ZAHLEN, { beleg: 'Waterproof: no' }).gruende.some(g => /Behauptung/.test(g))));
t('«3 ATM» belegt Wasserdichtigkeit', () => assert.ok(belegErweitert('Water resistance: 3 ATM').includes('wasserdicht')));
t('Beleg gilt nur für das genannte Wort', () => assert.ok(prosaPruefen(GUT.replace('leicht', 'wasserdicht').replace('angenehm', 'garantiert angenehm'), ZAHLEN, { beleg: 'wasserdicht' }).gruende.some(g => /garantiert/.test(g))));
t('wasserdicht ohne Beleg fällt durch', () => assert.ok(prosaPruefen(GUT.replace('leicht', 'wasserdicht'), ZAHLEN).gruende.some(g => /Behauptung/.test(g))));
t('ß fällt durch', () => assert.ok(prosaPruefen(GUT.replace('Auftritt', 'Außentritt'), ZAHLEN).gruende.some(g => /ß/.test(g))));
t('Quellenverweis «Datenblatt» fällt durch', () => assert.ok(prosaPruefen(GUT.replace('Das Armband wiegt', 'Laut Datenblatt wiegt das Armband'), ZAHLEN).gruende.some(g => /Quellenverweis/.test(g))));
t('Verwaltungssprache «gehört zur Kategorie» fällt durch', () => assert.ok(prosaPruefen(GUT.replace('Es eignet sich', 'Es gehört zur Kategorie der Armbänder und eignet sich'), ZAHLEN).gruende.some(g => /Verwaltungssprache/.test(g))));
t('Preis im Fliesstext fällt durch', () => assert.ok(prosaPruefen(GUT.replace('Alltag', 'Alltag für CHF 16'), ZAHLEN).gruende.some(g => /Preis/.test(g))));
t('Versandversprechen im Fliesstext fällt durch (steht im Kasten)', () => assert.ok(prosaPruefen(GUT.replace('Alltag', 'Alltag mit schneller Lieferzeit'), ZAHLEN).gruende.some(g => /Versand/.test(g))));
t('weniger als zwei Absätze fällt durch', () => assert.ok(prosaPruefen('<p>' + GUT.replace(/<\/?p>|<h3>.*?<\/h3>|<\/?ul>|<\/?li>/g, ' ') + '</p>', ZAHLEN).gruende.some(g => /Absätze/.test(g))));
t('Text ohne Produktbezug fällt durch', () => assert.ok(prosaPruefen(GUT, ZAHLEN, { titel: 'Hundehalsband Leder' }).gruende.some(g => /nennt das Produkt nicht/.test(g))));
t('leere Antwort', () => assert.deepEqual(prosaPruefen('', ZAHLEN).ok, false));

t('Einsetzen: Kopf und Rest bleiben, Prosa wird ersetzt', () => {
  const neu = prosaEinsetzen(SEITE, '<p>NEU</p>'); const z = zerlege(neu);
  assert.ok(neu.includes(LIEFER) && neu.includes('ls-xsell-v1') && neu.includes('class="ls-fakten"')); assert.equal(z.prosa, '<p>NEU</p>'); assert.ok(!neu.includes('Ein Kleid aus Polyester'));
});
t('Einsetzen: h3 wird zu h4 (einheitliche Überschriftengrösse)', () => { const n = prosaEinsetzen(SEITE, '<p>A</p><h3>Titel</h3><p>B</p>'); assert.ok(n.includes('<h4>Titel</h4>') && !n.includes('<h3>')); });
t('Einsetzen ist wiederholbar und verdoppelt nicht', () => {
  const a = prosaEinsetzen(SEITE, '<p>EINS</p>'), b = prosaEinsetzen(a, '<p>ZWEI</p>');
  assert.equal((b.match(/ls-text-v2 -->/g) || []).length, 2); assert.ok(b.includes('ZWEI') && !b.includes('EINS'));
});
t('Einsetzen: Rest bleibt byte-gleich', () => assert.equal(zerlege(prosaEinsetzen(SEITE, '<p>X</p>')).rest.trim(), zerlege(SEITE).rest.trim()));

// ── 26.10.2026: der Auswahl-Lauf setzt <!-- ls-var-v1 --> (und «Ausführung»-Hinweise) vor die Seite ──
const VAR = '<!-- ls-var-v1 -->';
const MIT_VAR = VAR + '<p>Alte Prosa mit Inhalt.</p><h3>Das zeichnet es aus</h3><ul><li>A</li></ul>\n<div class="ls-produktdetails"><h4>Produktdetails</h4></div>';
t('Var-Marker: Prosa wird gefunden', () => { const z = zerlege(MIT_VAR); assert.ok(z.kopf.includes(VAR)); assert.ok(z.prosa.includes('Alte Prosa')); assert.ok(z.rest.startsWith('<div class="ls-produktdetails"')); });
t('Var-Marker: Hinweis «Ausführung» bleibt im Kopf', () => { const z = zerlege(VAR + '<p><strong>Ausführung:</strong> Ohne Powerbank</p><p>Alte Prosa.</p>'); assert.ok(z.kopf.includes('Ohne Powerbank')); assert.equal(z.prosa.trim(), '<p>Alte Prosa.</p>'); });
t('Var-Marker: Einsetzen erhält Marker und Hinweis', () => { const neu = prosaEinsetzen(VAR + '<p><strong>Ausführung:</strong> Ohne Powerbank</p><p>Alte Prosa.</p>', '<p>NEU</p>'); assert.ok(neu.startsWith(VAR + '<p><strong>Ausführung:</strong> Ohne Powerbank</p>')); assert.ok(neu.includes('NEU') && !neu.includes('Alte Prosa')); });
t('Var-Marker: Gegenprobe — ohne Prosa bleibt die Prosa leer', () => assert.equal(zerlege(VAR + '<div class="ls-produktdetails">x</div>').prosa.trim(), ''));
t('Var-Marker: schlichtesProsa erkennt die Seite jetzt als bearbeitbar', () => assert.ok(schlichtesProsa(zerlege(MIT_VAR).prosa)));

// ── 09.11.2026: Grind-Entwürfe (nur Datenblatt-Kasten, noch kein Fliesstext) ──
const GRIND_SEITE = '<!-- ls-fakten-v1 --><div class="ls-fakten"><h4>Technische Daten</h4><p>Material: PU</p></div><!-- /ls-fakten-v1 -->';
t('Status: Vorgabe ist nur ACTIVE', () => { assert.deepEqual(erlaubteStatus(undefined), ['ACTIVE']); assert.deepEqual(erlaubteStatus(''), ['ACTIVE']); });
t('Status: DRAFT,ACTIVE (Gross/klein, Leerzeichen, doppelt) nimmt beide, ohne Doppelte', () => assert.deepEqual(erlaubteStatus(' draft , Active,DRAFT'), ['DRAFT', 'ACTIVE']));
t('Status: nur DRAFT bleibt nur DRAFT', () => assert.deepEqual(erlaubteStatus('DRAFT'), ['DRAFT']));
t('Status: unbekannte Werte zählen nie (ARCHIVED, Tippfehler) und fallen auf ACTIVE zurück', () => { assert.deepEqual(erlaubteStatus('ARCHIVED'), ['ACTIVE']); assert.deepEqual(erlaubteStatus('ARCHIVED,DRAFT'), ['DRAFT']); assert.deepEqual(erlaubteStatus('aktiv'), ['ACTIVE']); });
t('bearbeitbar: schlichte Prosa immer, mit und ohne Schalter', () => { assert.equal(prosaBearbeitbar(PROSA), true); assert.equal(prosaBearbeitbar(PROSA, true), true); });
t('bearbeitbar: leere Prosa ohne Schalter nein (wie bisher)', () => { assert.equal(prosaBearbeitbar(''), false); assert.equal(prosaBearbeitbar('  \n'), false); });
t('bearbeitbar: leere Prosa mit Schalter ja, auch nur Leerraum', () => { assert.equal(prosaBearbeitbar('', true), true); assert.equal(prosaBearbeitbar(' \n ', true), true); });
t('bearbeitbar: Schalter muss genau true sein (die Zeichenkette «1» zählt nicht)', () => assert.equal(prosaBearbeitbar('', '1'), false));
t('bearbeitbar: ein Bild ohne Text ist NICHT leer und bleibt tabu', () => assert.equal(prosaBearbeitbar('<img src="a.jpg">', true), false));
t('bearbeitbar: Tabelle, Kasten, Link und Video bleiben tabu, auch mit Schalter', () => { for (const x of ['<table></table>', '<div></div>', '<a href="x"></a>', '<video></video>', '<iframe></iframe>', '<svg></svg>']) assert.equal(prosaBearbeitbar(x, true), false, x); });
t('bearbeitbar: Prosa mit Tabelle bleibt tabu, auch wenn Text dabei steht', () => assert.equal(prosaBearbeitbar('<p>x</p><table></table>', true), false));
t('Grind-Seite: Prosa ist leer, der Kasten gehört zum Rest', () => { const z = zerlege(GRIND_SEITE); assert.equal(z.markiert, false); assert.equal(z.prosa, ''); assert.equal(z.rest, GRIND_SEITE); });
t('Grind-Seite: Einsetzen setzt den Text VOR den Kasten, der Kasten bleibt byte-gleich', () => {
  const neu = prosaEinsetzen(GRIND_SEITE, '<p>NEU</p>');
  assert.ok(neu.startsWith(MARKER + '<p>NEU</p>' + ENDE)); assert.ok(neu.endsWith(GRIND_SEITE)); assert.equal(neu.split(MARKER).length, 2);
});
t('Grind-Seite: ein zweites Einsetzen ersetzt den Block, es entsteht kein zweiter', () => {
  const zweimal = prosaEinsetzen(prosaEinsetzen(GRIND_SEITE, '<p>ERSTER</p>'), '<p>ZWEITER</p>');
  assert.equal(zweimal.split(MARKER).length, 2); assert.ok(zweimal.includes('ZWEITER')); assert.ok(!zweimal.includes('ERSTER')); assert.ok(zweimal.endsWith(GRIND_SEITE));
});

console.log(`text_prosa_test: ${n} ok`);
