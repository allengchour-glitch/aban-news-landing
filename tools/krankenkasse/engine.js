// Krankenkassen-Wechsel Schweiz — Rechen-Engine (ohne Oberfläche, in Node testbar).
// Grundlage (geprüft bei fedlex, KVG Stand 2025, KVV Stand 1.8.2026):
//   Art. 7 Abs. 1 KVG: 3 Monate Frist auf Ende Kalendersemester · Abs. 2: bei neuer Prämie 1 Monat auf Ende des Monats
//   vor Gültigkeit (→ Eintreffen bis 30.11.) · Abs. 5: alte Versicherung endet erst mit Bestätigung des neuen Versicherers.
//   Art. 93 KVV: Franchisen Erwachsene 500–2500, Kinder 100–600 · Art. 103 KVV: ordentlich 300, Selbstbehalt-Höchstbetrag
//   700 (Erwachsene) / 350 (Kinder) · Art. 64 Abs. 2 KVG: Selbstbehalt 10 % (Ausnahmen, z. B. Originalpräparate, nicht abgebildet).
//   Art. 94 KVV: höhere Franchise nur auf Jahresbeginn; tiefere Franchise / Wechsel mit den Fristen aus Art. 7 KVG auf Jahresende.
(function (root) {
  "use strict";
  var FRANCHISEN = { erwachsen: [300, 500, 1000, 1500, 2000, 2500], kind: [0, 100, 200, 300, 400, 500, 600] };
  var SB_MAX = { erwachsen: 700, kind: 350 }, SB_SATZ = 0.10;

  // Eigene Kosten (Franchise + Selbstbehalt) bei Gesundheitskosten k (Rechnungen über das Jahr, was die Kasse übernehmen würde)
  function eigenanteil(k, franchise, art) {
    k = Math.max(0, +k || 0);
    var f = Math.min(k, franchise), rest = k - f;
    return f + Math.min(SB_SATZ * rest, SB_MAX[art || "erwachsen"]);
  }
  // Jahreskosten = 12 × Monatsprämie + Eigenanteil
  function jahreskosten(praemieMonat, franchise, k, art) { return 12 * (+praemieMonat || 0) + eigenanteil(k, franchise, art); }
  // Schlimmster Fall: Franchise + voller Selbstbehalt
  function maximum(praemieMonat, franchise, art) { return 12 * (+praemieMonat || 0) + franchise + SB_MAX[art || "erwachsen"]; }

  // optionen: [{franchise, praemie}] → Auswertung bei erwarteten Kosten k, beste Option, Gewinnschwelle zur nächst tieferen
  function vergleich(optionen, k, art) {
    var liste = optionen.filter(function (o) { return +o.praemie > 0; }).map(function (o) {
      return { franchise: +o.franchise, praemie: +o.praemie, jahr: jahreskosten(o.praemie, +o.franchise, k, art), max: maximum(o.praemie, +o.franchise, art), ohneArzt: 12 * o.praemie };
    }).sort(function (a, b) { return a.franchise - b.franchise; });
    if (!liste.length) return { liste: [], beste: null };
    var beste = liste.reduce(function (a, b) { return b.jahr < a.jahr - 1e-9 ? b : a; });
    // Ab welchen Gesundheitskosten lohnt sich die tiefste Franchise gegenüber der höchsten? (Gewinnschwelle per Bisektion)
    var tief = liste[0], hoch = liste[liste.length - 1], schwelle = null;
    if (liste.length > 1) {
      var d = function (x) { return jahreskosten(tief.praemie, tief.franchise, x, art) - jahreskosten(hoch.praemie, hoch.franchise, x, art); };
      if (d(0) > 0 && d(1e6) < 0) { var lo = 0, hi = 1e6; for (var i = 0; i < 80; i++) { var m = (lo + hi) / 2; if (d(m) > 0) lo = m; else hi = m; } schwelle = hi; }
    }
    return { liste: liste, beste: beste, schwelle: schwelle, tiefste: tief, hoechste: hoch };
  }

  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function lokal(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }

  // Fristen ab einem Datum: nächster Wechsel mit neuer Prämie (Art. 7 Abs. 2) und ordentlich (Abs. 1)
  function fristen(heute) {
    var h = lokal(heute), j = h.getFullYear();
    var praemie = { eintreffenBis: iso(new Date(j, 10, 30)), wirksam: iso(new Date(j + 1, 0, 1)), jahr: j + 1 };
    if (h > new Date(j, 10, 30)) praemie = { eintreffenBis: iso(new Date(j + 1, 10, 30)), wirksam: iso(new Date(j + 2, 0, 1)), jahr: j + 2, verpasst: true };
    // ordentlich: auf 30.6. (Eintreffen bis 31.3.) oder 31.12. (bis 30.9.)
    var kandid = [[new Date(j, 2, 31), new Date(j, 6, 1)], [new Date(j, 8, 30), new Date(j + 1, 0, 1)], [new Date(j + 1, 2, 31), new Date(j + 1, 6, 1)]];
    var ord = kandid.filter(function (x) { return h <= x[0]; })[0];
    var tage = Math.round((lokal(praemie.eintreffenBis) - h) / 864e5);
    // Post-Puffer: spätestens abschicken (A-Post 1 Werktag, Einschreiben mit Abholfrist bis 7 Tage → wir empfehlen 10 Tage Reserve)
    var abschicken = new Date(lokal(praemie.eintreffenBis)); abschicken.setDate(abschicken.getDate() - 10);
    return { mitPraemie: praemie, ordentlich: { eintreffenBis: iso(ord[0]), wirksam: iso(ord[1]) }, tageBis: tage, abschickenBis: iso(abschicken) };
  }

  var api = { FRANCHISEN: FRANCHISEN, SB_MAX: SB_MAX, eigenanteil: eigenanteil, jahreskosten: jahreskosten, maximum: maximum, vergleich: vergleich, fristen: fristen };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.KrankenkasseEngine = api;
})(this);
