// Prüfungen für apply.mjs (rein, ohne Netz). Aufruf: node dropship/maengelfrist-0911/apply_test.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { planeZiel, pruefeDaten } from './apply.mjs';
import { gruppiere } from '../rueckgabe-0611/apply2.mjs';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; }; const gl = (a, b, m) => { assert.equal(a, b, m); n++; };
const alle = JSON.parse(readFileSync(new URL('./daten/ziele.json', import.meta.url), 'utf8'));

// ---- Daten
gl(alle.length, 7, 'sieben Ersetzungen');
gl(JSON.stringify(pruefeDaten(alle)), '[]', 'Datenprüfung ohne Befund');
gl(new Set(alle.map((e) => e.nr)).size, 7, 'Nummern eindeutig');
ok(pruefeDaten([{ nr: 'X', art: 'seite_veroeffentlicht', handle: 'a', id: 'gid://x', vorher: 'in 7 Tagen', nachher: 'in 7 Tagen!' }]).length >= 2, 'Datenprüfung erkennt eine übrig gebliebene 7-Tage-Frist');
ok(pruefeDaten([{ nr: 'X', art: 'seite_veroeffentlicht', handle: 'a', id: 'gid://x', vorher: 'in 14 Tagen', nachher: 'in 30 Tagen' }]).length === 1, 'Datenprüfung erkennt «vorher» ohne 7 Tage');
ok(pruefeDaten([{ nr: 'X', art: 'seite_veroeffentlicht', handle: 'a', vorher: 'in 7 Tagen', nachher: 'in 30 Tagen' }]).length === 1, 'Datenprüfung erkennt fehlende ID');
ok(pruefeDaten([{ nr: 'X', art: 'theme_liquid', feld: 'f', vorher: 'in 7 Tagen', nachher: 'in 30\nTagen' }]).length >= 1, 'Datenprüfung erkennt Umbruch/fehlende 30');

// ---- Ziele
const ziele = gruppiere(alle);
gl(ziele.length, 6, 'sechs Ziele');
gl(ziele.filter((z) => z.art === 'richtlinie').length, 2); gl(ziele.filter((z) => z.art === 'seite').length, 3); gl(ziele.filter((z) => z.art === 'theme').length, 1);
gl(ziele.find((z) => z.art === 'theme').eintraege.length, 2, 'Chat: zwei Antworten in einer Datei');
gl(ziele.find((z) => z.art === 'theme').datei, 'sections/lux-assistent.liquid');
ok(ziele.filter((z) => z.art === 'richtlinie').map((z) => z.typ).sort().join() === 'REFUND_POLICY,TERMS_OF_SERVICE', 'Richtlinientypen');
ok(ziele.filter((z) => z.art !== 'theme').every((z) => /^gid:\/\/shopify\//.test(z.id)), 'IDs sind Shopify-IDs');

// ---- Erlaubte Änderungsarten: nur die Zahl, oder die dadurch sinnlose Klammer fällt weg. Sonst nichts.
const KLAMMER = / \(bei selbst gestalteten Artikeln bitte (<b>)?inn(erhalb von|ert) 30 Tagen(<\/b>)?\)/;
for (const e of alle) {
  const nurZahl = e.vorher.replace('innerhalb von 7 Tagen', 'innerhalb von 30 Tagen').replace('innert 7 Tagen', 'innert 30 Tagen').replace('within 7 days', 'within 30 days');
  if (KLAMMER.test(e.vorher)) {
    const ohneKlammer = nurZahl.replace(KLAMMER, '');
    gl(e.nachher, ohneKlammer, `${e.nr}: nur Zahl + Klammer`);
    ok(!/<b>innerhalb von 30 Tagen<\/b>\)/.test(e.nachher) && !/selbst gestalteten/.test(e.nachher), `${e.nr}: Klammer ist weg`);
    gl(e.nachher.match(/<b>/g)?.length ?? 0, (e.vorher.match(/<b>/g)?.length ?? 0) - (/<b>innerhalb von 30 Tagen<\/b>\)/.test(e.vorher) ? 1 : 0), `${e.nr}: keine verwaisten <b>-Tags`);
    gl((e.nachher.match(/<\/b>/g) || []).length, (e.nachher.match(/<b>/g) || []).length, `${e.nr}: <b> und </b> gleich oft`);
  } else {
    gl(e.nachher, nurZahl, `${e.nr}: nur die Zahl`);
  }
  gl((e.nachher.match(/info@luxestyle\.ch/g) || []).length, (e.vorher.match(/info@luxestyle\.ch/g) || []).length, `${e.nr}: Mailadresse unverändert`);
  gl((e.nachher.match(/\+MAIL\+/g) || []).length, (e.vorher.match(/\+MAIL\+/g) || []).length, `${e.nr}: Platzhalter unverändert`);
  gl((e.nachher.match(/'/g) || []).length, (e.vorher.match(/'/g) || []).length, `${e.nr}: gleiche Zahl Hochkommas (Chat-Skript bleibt gültig)`);
}

// ---- Planen: jede Ersetzung einzeln gegen einen künstlichen Text
for (const z of ziele) {
  for (const e of z.eintraege) {
    const ist = `Anfang ${e.vorher} Ende`;
    const p = planeZiel(ist, { ...z, eintraege: [e] });
    gl(p.art, 'aendern', `${e.nr}: ändert`); gl(p.soll, `Anfang ${e.nachher} Ende`, `${e.nr}: Ergebnis`);
    gl(planeZiel(p.soll, { ...z, eintraege: [e] }).art, 'fertig', `${e.nr}: zweiter Lauf ist fertig (idempotent)`);
    gl(planeZiel(`${ist} ${e.vorher}`, { ...z, eintraege: [e] }).art, 'problem', `${e.nr}: doppelt = Problem`);
    gl(planeZiel('Text ohne Frist', { ...z, eintraege: [e] }).art, 'problem', `${e.nr}: fehlt = Problem`);
  }
}
gl(planeZiel(null, ziele[0]).art, 'problem', 'nicht lesbar = Problem');
// Chat-Datei mit beiden Antworten: beide ersetzt, sonst nichts verändert
{
  const z = ziele.find((x) => x.art === 'theme'); const [a, b] = z.eintraege;
  const ist = `X1 ${a.vorher} X2 ${b.vorher} X3`; const p = planeZiel(ist, z);
  gl(p.art, 'aendern'); gl(p.soll, `X1 ${a.nachher} X2 ${b.nachher} X3`);
  gl(p.soll.replace(a.nachher, a.vorher).replace(b.nachher, b.vorher), ist, 'Rückweg stellt den Stand davor exakt wieder her');
  gl(planeZiel(`X1 ${a.nachher} X2 ${b.vorher} X3`, z).art, 'aendern', 'halb fertig: nur die zweite Antwort wird noch geändert');
}

// ---- Gegen die echten Texte vom 09.11. (Sicherung von Welle 2: Stand nach dem Einspielen um 11:32 UTC)
const w2 = new URL('../rueckgabe-0611/sicherung/welle2.json', import.meta.url);
if (existsSync(w2)) {
  const s = JSON.parse(readFileSync(w2, 'utf8')); const text = (key) => s.ziele.find((x) => x.key === key)?.nachher;
  for (const z of ziele.filter((x) => ['richtlinie:refund-policy', 'richtlinie:terms-of-service', 'seite:garantie', 'theme:sections/lux-assistent.liquid'].includes(x.key))) {
    const ist = text(z.key); ok(typeof ist === 'string' && ist.length > 1000, `${z.key}: Text aus der Sicherung da`);
    const p = planeZiel(ist, z); gl(p.art, 'aendern', `${z.key}: echter Text → ändern`);
    ok(p.soll.length < ist.length + 5, `${z.key}: Länge ändert sich kaum`);
    for (const e of z.eintraege) { ok(p.soll.includes(e.nachher), `${z.key} ${e.nr}: neuer Wortlaut steht drin`); ok(!p.soll.includes(e.vorher), `${z.key} ${e.nr}: alter Wortlaut weg`); }
    // Die Frist «7 Tage» darf in diesen Texten nirgends mehr stehen
    ok(!/\b7 Tagen?\b/.test(p.soll), `${z.key}: keine 7-Tage-Frist mehr`);
  }
}
console.log('apply_test.mjs: ' + n + ' Prüfungen bestanden');
