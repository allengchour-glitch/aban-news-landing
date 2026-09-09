// wahlsicher_test.mjs — prueft wahlSicher() in BEIDE Richtungen (09.09.2026).
// Anlass: 3 Durchrutscher unter den Neuimporten des Tages, davon EINER ein Fehlalarm
// («mit Zirkonia in verschiedenen Farben besetzt» ist eine Beschreibung, keine Wahl).
// Aufruf:  /opt/node22/bin/node automation/wahlsicher_test.mjs
// ⚠️ Die Testtexte sind bewusst LANG: wahlSicher gibt bei unter 120 Zeichen Resttext das
// Original zurueck («lieber die falsche Klausel als ein leerer Text») — kurze Testfaelle
// fallen deshalb durch, ohne dass die Regel falsch waere.
import { wahlSicher } from '/home/user/aban-news-landing/automation/cj_copy_prompt.mjs';
const F = [
 // [Text, soll die Klausel WEG?]
 ['<p>Dieser Kissenbezug schützt dein Zierkissen und verleiht deinem Sofa eine neue Optik. Er ist in verschiedenen Farben wie Blasenbraun und Rosenbraun erhältlich. Der Bezug ist 45 x 45 cm gross und wird ohne Kissenfüllung geliefert und passt auf handelsübliche Kissen.</p>', true, 'Zwischenwoerter vor erhältlich'],
 ['<ul><li>Aus reiner Baumwolle gefertigt</li><li>Masse: 45 x 45 cm</li><li>Vier verschiedene Farben erhältlich</li><li>Mit dekorativen Quasten</li></ul><p>Ein schöner Bezug für das Sofa im Wohnzimmer, weich und langlebig im Alltag.</p>', true, 'Zahlwort ohne «in»'],
 ['<p>Das Armband ist aus robustem Edelstahl gefertigt und 18K vergoldet. Es ist mit Zirkonia in verschiedenen Farben besetzt und wurde galvanisiert. Die Länge beträgt 17.5 cm und der Verschluss hält sicher.</p>', false, 'GEGENPROBE: besetzt = Beschreibung'],
 ['<p>Der Schal ist in verschiedenen Farben gemustert und aus weicher Wolle gefertigt, angenehm auf der Haut und warm im Winter bei Kälte.</p>', false, 'GEGENPROBE: gemustert'],
 ['<p>Das Set enthält 4 Boxen in zwei Grössen: 2x gross und 2x klein, alle stapelbar und aus Bambus gefertigt für Ordnung im Schrank.</p>', false, 'GEGENPROBE: Set-Inhalt'],
 ['<p>Der Dellenlifter ist einfach zu bedienen und repariert Dellen effizient. Im Lieferumfang sind 10 Gummilaschen in verschiedenen Grössen enthalten, passend für unterschiedliche Dellenformen. Das Werkzeug besteht aus einer Alu-Legierung und liegt gut in der Hand.</p>', false, 'GEGENPROBE: Lieferumfang = Set-Inhalt'],
 ['<p>Erhältlich in verschiedenen Farben passend zu jedem Wohnstil. Die Lampe misst 30 cm und wird per USB betrieben, das Kabel ist 1,5 m lang und abnehmbar. Der Schirm besteht aus mattem Glas und streut das Licht weich in den Raum.</p>', true, 'klassische Form'],
 ['<p>Die Kette ist in Gold erhältlich und misst 45 cm. Sie besteht aus 925 Silber und ist vergoldet, dazu kommt ein Karabinerverschluss aus Edelstahl.</p>', false, 'GEGENPROBE: EINE Farbe'],
 ['<p>Wählen Sie zwischen Schwarz und Weiss. Der Becher fasst 350 ml und ist spülmaschinenfest, dazu hält er Getränke lange warm im Alltag. Der Deckel schliesst dicht und der Griff liegt gut in der Hand beim Trinken.</p>', true, 'wählen Sie zwischen'],
 ['<p>Das Shirt gibt es in einer Grösse und besteht aus Baumwolle, angenehm zu tragen und bei 30 Grad waschbar ohne Einlaufen im Alltag.</p>', false, 'GEGENPROBE: eine Grösse'],
];
let fehler=0;
for (const [html, sollWeg, name] of F) {
  const vor = html;
  const nach = wahlSicher({html: html}).html;
  const geaendert = nach !== vor;
  const ok = geaendert === sollWeg;
  if (!ok) fehler++;
  console.log(`${ok?'✓':'⛔'}  ${sollWeg?'schneiden':'stehen lassen'}: ${name}`);
  if (!ok) console.log('     nachher:', nach.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,140));
}
console.log(fehler===0 ? `\n${F.length} Faelle, 0 Abweichungen` : `\n${fehler} ABWEICHUNGEN`);
