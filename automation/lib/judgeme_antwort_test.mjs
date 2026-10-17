/** Test fuer bewerteAntwort. Lauf: /opt/node22/bin/node automation/lib/judgeme_antwort_test.mjs */
import { bewerteAntwort } from './judgeme_antwort.mjs';
let fehler = 0;
const pruef = (name, ok, extra = '') => { if (!ok) { fehler++; console.log(`FAIL ${name} ${extra}`); } else console.log(`ok   ${name}`); };
const z = (r) => `${r.ok ? 'ok' : ''}${r.abgleichen ? ' abgleichen' : ''}${r.uncertain ? ' uncertain' : ''}`.trim() || 'abgelehnt';

// 1. DER FALL VOM 17.10.: 201 ohne ID → nachlesen, NICHT als unklar abhaken
{
  const r = bewerteAntwort(201, { message: 'Review created' });
  pruef('201 ohne ID → abgleichen', r.abgleichen === true && r.ok === false && r.uncertain === false, z(r));
}
{
  const r = bewerteAntwort(201, {});
  pruef('201 leerer Body → abgleichen', r.abgleichen === true, z(r));
}
// 2. Mit ID (beide Schreibweisen) ist es sofort fertig — kein zusaetzlicher Lesevorgang
for (const body of [{ review: { id: 1384894507 } }, { id: 1384894507 }, { id: 'rev_7' }]) {
  const r = bewerteAntwort(201, body);
  pruef(`ID vorhanden → ok (${JSON.stringify(body)})`, r.ok === true && r.abgleichen === false, z(r));
}
// 3. GEGENPROBE: eine ABLEHNUNG darf niemals als „abgleichen" oder ok durchgehen
for (const body of [{ success: false }, { result: false }, { error: 'product not found' }, { errors: ['rating missing'] }]) {
  const r = bewerteAntwort(200, body);
  pruef(`Ablehnung bleibt Ablehnung (${JSON.stringify(body)})`, r.ok === false && r.abgleichen === false && r.uncertain === false, z(r));
}
// 4. GEGENPROBE: leeres errors-Feld ist KEINE Ablehnung
{
  const r = bewerteAntwort(201, { errors: [] });
  pruef('errors: [] ist keine Ablehnung', r.abgleichen === true, z(r));
}
// 5. Serverfehler → unklar (Ergebnis unbekannt), nie ok
for (const s of [500, 502, 503]) {
  const r = bewerteAntwort(s, null);
  pruef(`HTTP ${s} → uncertain`, r.uncertain === true && r.ok === false && r.abgleichen === false, z(r));
}
// 6. GEGENPROBE: 4xx ist eine Ablehnung, kein Wartefall und kein Abgleich
for (const s of [400, 401, 404, 422]) {
  const r = bewerteAntwort(s, { error: 'nope' });
  pruef(`HTTP ${s} → abgelehnt`, r.ok === false && r.abgleichen === false && r.uncertain === false, z(r));
}
// 7. GEGENPROBE: ID 0 oder leerer String zaehlt nicht als Bestaetigung
for (const body of [{ id: 0 }, { id: '' }, { id: '   ' }, { review: { id: null } }]) {
  const r = bewerteAntwort(201, body);
  pruef(`ungueltige ID → abgleichen (${JSON.stringify(body)})`, r.abgleichen === true && r.ok === false, z(r));
}
// 8. Genau ein Ausgang ist je Antwort wahr
for (const [s, b] of [[201, { id: 5 }], [201, {}], [500, null], [422, { error: 'x' }]]) {
  const r = bewerteAntwort(s, b);
  const n = [r.ok, r.abgleichen, r.uncertain].filter(Boolean).length;
  pruef(`genau ein Ausgang (${s})`, n <= 1, z(r));
}

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler ? 1 : 0);
