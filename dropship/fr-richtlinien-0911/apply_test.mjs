// Prüfungen für lib.mjs, paare.mjs und apply.mjs (rein, ohne Netz). Aufruf: node dropship/fr-richtlinien-0911/apply_test.mjs
// Das deutsche Original wird offline nachgebaut: Stand nach Rückgabe-Welle 2 (../rueckgabe-0611/sicherung/welle2.json,
// «nachher» von 09.11. 11:32 UTC) plus die zwei Fristen-Ersetzungen der «Mängelfrist 30 Tage» (09.11. ca. 17:50 UTC).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bloecke, textOhneTags, uebersetzeBody, inlineTags, erwartetFr, restDeutsch, pruefe } from './lib.mjs';
import { RICHTLINIEN } from './paare.mjs';
import { planeRichtlinie } from './apply.mjs';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; }; const gl = (a, b, m) => { assert.equal(a, b, m); n++; };

const w2 = JSON.parse(readFileSync(new URL('../rueckgabe-0611/sicherung/welle2.json', import.meta.url), 'utf8'));
const roh = (key) => w2.ziele.find((z) => z.key === key)?.nachher;
const ersetze = (t, a, b) => { gl(t.split(a).length - 1, 1, 'Ersetzung genau einmal: ' + a.slice(0, 40)); return t.replace(a, b); };
const DE = {
  REFUND_POLICY: ersetze(roh('richtlinie:refund-policy'), 'Melde dich in diesem Fall bitte <strong>innerhalb von 7 Tagen nach Erhalt</strong>', 'Melde dich in diesem Fall bitte <strong>innerhalb von 30 Tagen nach Erhalt</strong>'),
  TERMS_OF_SERVICE: ersetze(roh('richtlinie:terms-of-service'), 'Bei Mängeln informiere uns bitte innerhalb von 7 Tagen ab Erhalt der Ware unter info@luxestyle.ch.', 'Bei Mängeln informiere uns bitte innerhalb von 30 Tagen ab Erhalt der Ware unter info@luxestyle.ch.'),
};
ok(typeof DE.REFUND_POLICY === 'string' && DE.REFUND_POLICY.length > 9000, 'deutsche Rückgaberichtlinie da');
ok(typeof DE.TERMS_OF_SERVICE === 'string' && DE.TERMS_OF_SERVICE.length > 4000, 'deutsche AGB da');
gl(DE.REFUND_POLICY.length, 10009, 'Länge wie im Shop am 09.11. 18:00 UTC'); gl(DE.TERMS_OF_SERVICE.length, 4713, 'Länge AGB wie im Shop');

// ---- Bausteine
gl(bloecke('<h2>A</h2>\n<p>B <b>c</b></p><ul><li>D</li></ul>').map((b) => b.tag).join(), 'h2,p,li', 'Blockarten');
gl(bloecke('<pre>x</pre><p>y</p>').length, 1, '<pre> ist kein <p>');
gl(textOhneTags('<p>a&nbsp;<b>b</b>\n  c</p>'), 'a b c', 'Text ohne Tags');
gl(JSON.stringify(inlineTags('x <a  href="/policies/a">l</a><br>')), JSON.stringify(['<a href="/policies/a">', '</a>', '<br>']), 'Tags eines Blocks');
gl(erwartetFr('<a href="/policies/refund-policy">'), '<a href="/fr/policies/refund-policy">', 'interner Link bekommt /fr');
gl(erwartetFr('<a href="mailto:info@luxestyle.ch">'), '<a href="mailto:info@luxestyle.ch">', 'Mail bleibt');
gl(erwartetFr('<a href="#selbst-gestaltete-artikel">'), '<a href="#selbst-gestaltete-artikel">', 'Anker bleibt');
ok(restDeutsch('Dans ce cas, veuillez nous contacter.').length === 0, 'Französisch ist kein Deutsch');
ok(restDeutsch('Das ist nicht gut').length === 1, 'Deutsch wird erkannt');

// ---- Die echten Texte
gl(bloecke(DE.REFUND_POLICY).length, 41, '41 Blöcke Rückgaberichtlinie'); gl(bloecke(DE.TERMS_OF_SERVICE).length, 35, '35 Blöcke AGB');
gl(RICHTLINIEN.REFUND_POLICY.length, 41); gl(RICHTLINIEN.TERMS_OF_SERVICE.length, 35);
const FR = {};
for (const t of ['REFUND_POLICY', 'TERMS_OF_SERVICE']) {
  const r = uebersetzeBody(DE[t], RICHTLINIEN[t]);
  gl(JSON.stringify(r.probleme), '[]', t + ': Einsetzen ohne Probleme');
  gl(JSON.stringify(pruefe(DE[t], r.out)), '[]', t + ': Prüfung ohne Befund');
  FR[t] = r.out;
  ok(!/\b7\s*(jours|Tage)/.test(r.out), t + ': keine 7-Tage-Frist');
  ok(r.out.length > DE[t].length * 0.9 && r.out.length < DE[t].length * 1.3, t + ': Länge plausibel');
  gl(planeRichtlinie(t, { body: DE[t], fr: null }).fertig, false, t + ': ohne französische Fassung nicht fertig');
  gl(planeRichtlinie(t, { body: DE[t], fr: { value: r.out, outdated: false } }).fertig, true, t + ': gleiche Fassung = fertig');
  gl(planeRichtlinie(t, { body: DE[t], fr: { value: r.out, outdated: true } }).fertig, false, t + ': veraltet = nicht fertig');
  gl(planeRichtlinie(t, { body: DE[t], fr: { value: 'alt', outdated: true } }).probleme.length, 0, t + ': Plan ohne Probleme');
}
ok(FR.REFUND_POLICY.includes('<h3 id="selbst-gestaltete-artikel">') && FR.REFUND_POLICY.includes('href="#selbst-gestaltete-artikel"'), 'Anker der Rückgaberichtlinie bleibt');
ok(FR.REFUND_POLICY.includes('dans les 30 jours suivant la réception</strong> à l\'adresse'), 'Mängelfrist 30 Tage in der französischen Richtlinie');
ok(FR.TERMS_OF_SERVICE.includes('dans les 30 jours suivant la réception de la marchandise'), 'Mängelfrist 30 Tage in den französischen CGV');
ok(FR.TERMS_OF_SERVICE.includes('href="/fr/policies/refund-policy"') && FR.TERMS_OF_SERVICE.includes('href="/fr/policies/privacy-policy"') && FR.TERMS_OF_SERVICE.includes('href="/fr/policies/shipping-policy"'), 'CGV: drei interne Links mit /fr');
ok(FR.REFUND_POLICY.includes('<a href="mailto:info@luxestyle.ch">info@luxestyle.ch</a>'), 'Mailadresse als Link erhalten');
ok(FR.TERMS_OF_SERVICE.includes('0795382814') && FR.REFUND_POLICY.includes('+41 79 538 28 14'), 'Telefonnummern unverändert');
ok(FR.REFUND_POLICY.includes('Hühnerhubelstrasse 37') && FR.REFUND_POLICY.includes('3123 Belp, Suisse'), 'Adresse erhalten');

// ---- Fehler müssen auffallen (Gegenproben)
const t = 'REFUND_POLICY';
const mit = (f) => f(FR[t]);
const hat = (fr, teil) => pruefe(DE[t], fr).some((x) => x.includes(teil));
ok(hat(mit((s) => s.replace('<li>', '<li class="x">')), 'Gerüst'), 'Gegenprobe: geändertes Gerüst');
ok(hat(mit((s) => s.replace('<strong>gratuit</strong>', 'gratuit')), 'Tag-Folge'), 'Gegenprobe: fehlende Tags im Block');
{
  const agb = FR.TERMS_OF_SERVICE.replace('href="/fr/policies/refund-policy"', 'href="/policies/refund-policy"');
  const f = pruefe(DE.TERMS_OF_SERVICE, agb);
  ok(f.some((x) => x.includes('Tag-Folge')) && f.some((x) => x.includes('Interner Link ohne /fr')), 'Gegenprobe: Link ohne /fr');
}
ok(hat(mit((s) => s.replace('30 jours', '31 jours')), 'Zahlen'), 'Gegenprobe: geänderte Zahl');
ok(hat(mit((s) => s + ' <p>und nicht</p>'), 'Blockzahl'), 'Gegenprobe: zusätzlicher Block');
ok(hat(mit((s) => s.replace('Frais de retour', 'Rücksendekosten und nicht')), 'Deutsch'), 'Gegenprobe: deutsche Wörter');
ok(hat(mit((s) => s.replace('Exclus du retour', '7 jours Exclus du retour')), 'Zahlen') && hat(mit((s) => s.replace('Exclus du retour', '7 jours Exclus du retour')), '7-Tage'), 'Gegenprobe: 7-Tage-Frist');
ok(uebersetzeBody(DE[t], RICHTLINIEN[t].slice(0, 40)).probleme.some((p) => p.art === 'anzahl'), 'Gegenprobe: zu wenige Blöcke');
ok(uebersetzeBody(DE[t], RICHTLINIEN[t].map((e, i) => (i === 3 ? { ...e, a: 'Falscher Anker' } : e))).probleme.some((p) => p.art === 'anker' && p.i === 3), 'Gegenprobe: falscher Anker');
ok(uebersetzeBody(DE[t], RICHTLINIEN[t].map((e, i) => (i === 5 ? { ...e, fr: '  ' } : e))).probleme.some((p) => p.art === 'ohne-uebersetzung' && p.i === 5), 'Gegenprobe: leere Übersetzung');
ok(planeRichtlinie(t, { body: DE[t].replace('Rückgabe & Erstattung', 'Rückgabe und mehr'), fr: null }).probleme.some((x) => x.includes('anker')), 'Gegenprobe: geändertes Original fällt am Anker auf');
// Ändert sich im Original eine Zahl (Anker passen noch), muss der Plan es über die Prüfung melden
{
  const geaendert = DE[t].replace('innerhalb von <strong>30 Tagen ab Erhalt</strong>', 'innerhalb von <strong>45 Tagen ab Erhalt</strong>');
  ok(geaendert !== DE[t], 'Testtext wirklich geändert');
  const pl = planeRichtlinie(t, { body: geaendert, fr: null });
  ok(pl.probleme.some((x) => x.includes('Zahlen weichen ab')), 'Plan meldet geänderte Zahl im Original');
  gl(pl.fertig, false);
}
console.log('apply_test.mjs: ' + n + ' Prüfungen bestanden');
