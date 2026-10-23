/** Test fuer lieferurteil — reine Funktion, keine Netzaufrufe.
 *  Lauf: /opt/node22/bin/node automation/lib/lieferbarkeit_test.mjs
 *
 *  Die Gegenprobe in die ANDERE Richtung ist hier die wichtigere: ein Produkt, das CJ nur
 *  gerade nicht lesen kann, darf NIEMALS gesperrt werden. Zu streng nimmt gesunde Ware aus
 *  dem Verkauf; zu lasch kostet eine Erstattung. Beides wird geprueft. */
import { lieferurteil, darfSperren } from './lieferbarkeit.mjs';
let fehler = 0;
const pruef = (n, ok, extra = '') => { if (!ok) { fehler++; console.log(`FAIL ${n} ${extra}`); } else console.log(`ok   ${n}`); };

// ── Richtung 1: echte Befunde muessen gefunden werden ────────────────────────────────
// Acht bekannt gesperrte Produkte lieferten am 23.10. je 0 Linien (Wassersprinkler,
// Hunde-Snackball, Uebersetzer-Kopfhoerer, Dashcam, Gemueseschneider, Reed-Diffuser,
// Quallen-Diffuser, Gua-Sha-Set).
{ const u = lieferurteil({ cjCode: 200, vid: '206055', linien: 0 });
  pruef('0 Linien → nicht lieferbar', u.urteil === 'nicht_lieferbar' && u.tag === 'cj-nicht-versendbar-ch', JSON.stringify(u)); }
{ const u = lieferurteil({ cjCode: 1602002, vid: null, linien: null });
  pruef('CJ ausgelistet (1602002) → nicht lieferbar', u.urteil === 'nicht_lieferbar' && u.tag === 'cj-ausgelistet', JSON.stringify(u)); }
{ const u = lieferurteil({ cjCode: 1602003, vid: null, linien: null });
  pruef('Variante ausgelistet (1602003) → nicht lieferbar', u.urteil === 'nicht_lieferbar', JSON.stringify(u)); }

// ── Richtung 2: GEGENPROBE — gesunde Ware bleibt unangetastet ────────────────────────
// Aurora/Provence/Sirene hatten je 16 Linien, Rizinusoel nur 3 — wenige Linien sind KEIN Befund.
{ const u = lieferurteil({ cjCode: 200, vid: '2606080925471613100', linien: 16 });
  pruef('16 Linien → lieferbar', u.urteil === 'lieferbar' && u.tag === null, JSON.stringify(u)); }
{ const u = lieferurteil({ cjCode: 200, vid: '2006997782977490945', linien: 3 });
  pruef('3 Linien → lieferbar (wenige sind kein Befund)', u.urteil === 'lieferbar', JSON.stringify(u)); }
{ const u = lieferurteil({ cjCode: 200, vid: '1', linien: 1 });
  pruef('1 Linie → lieferbar', u.urteil === 'lieferbar', JSON.stringify(u)); }

// ── Richtung 3: die teure Falle — unbekannt ist KEIN Befund ──────────────────────────
// Zwei der 30 besuchten Produkte tragen eine UUID als SKU; CJ antwortet 1602001.
{ const u = lieferurteil({ cjCode: 1602001, vid: null, linien: null });
  pruef('SKU nicht gefunden → unbekannt, kein Tag', u.urteil === 'unbekannt' && u.tag === null, JSON.stringify(u)); }
{ const u = lieferurteil({ cjCode: 200, vid: null, linien: null });
  pruef('gelesen, aber keine Variante → unbekannt', u.urteil === 'unbekannt', JSON.stringify(u)); }
// Die vid-Pruefung wird sonst von der Fracht-Pruefung verdeckt (beide enden auf `unbekannt`).
// Darum ein Fall, der NUR sie erreicht: Fracht gemessen, aber keine Variante dazu — das waere
// eine veraltete Zahl aus einem frueheren Produkt und darf nie `lieferbar` ergeben.
{ const u = lieferurteil({ cjCode: 200, vid: null, linien: 16 });
  pruef('Fracht ohne Variante → unbekannt (nicht lieferbar!)', u.urteil === 'unbekannt', JSON.stringify(u)); }
{ const u = lieferurteil({ cjCode: 200, vid: '1', linien: null });
  pruef('Fracht nicht gemessen → unbekannt', u.urteil === 'unbekannt', JSON.stringify(u)); }
{ const u = lieferurteil({});
  pruef('leere Erhebung → unbekannt', u.urteil === 'unbekannt', JSON.stringify(u)); }
{ const u = lieferurteil({ cjCode: 500, vid: '1', linien: 0 });
  pruef('CJ-Fehler 500 → unbekannt, obwohl 0 Linien', u.urteil === 'unbekannt', JSON.stringify(u)); }

// ── Richtung 4: nur ein Befund darf den Shop aendern ─────────────────────────────────
pruef('darfSperren: nicht_lieferbar → ja', darfSperren({ urteil: 'nicht_lieferbar' }) === true);
pruef('darfSperren: unbekannt → NEIN', darfSperren({ urteil: 'unbekannt' }) === false);
pruef('darfSperren: lieferbar → NEIN', darfSperren({ urteil: 'lieferbar' }) === false);
pruef('darfSperren: nichts → NEIN', darfSperren(undefined) === false);

// ── Mutationsprobe: wer `linien === 0` zu `linien <= 0` ... bleibt gleich; wer aber den
//    unbekannt-Zweig entfernt, faellt bei Test 7 und 11 durch. Wer `!e.vid` streicht, bei 8.
console.log(fehler ? `\n${fehler} FEHLER` : '\nalle gruen');
process.exit(fehler ? 1 : 0);
