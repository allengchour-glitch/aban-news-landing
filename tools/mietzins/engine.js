// Mietzins-Paket Schweiz — Rechen-Engine (ohne Oberfläche, in Node testbar).
// Grundlage: Art. 13 VMWG (Hypothekarzins), Art. 16 VMWG (Teuerung, 40 % des LIK), Art. 12 VMWG (Kostensteigerungen),
// Art. 270a OR (Herabsetzungsbegehren auf den nächstmöglichen Kündigungstermin).
(function (root) {
  "use strict";
  var AKTUELL = { satz: 1.25, stand: "2. September 2026", naechste: "1. Dezember 2026" };

  // Art. 13 Abs. 1 VMWG: Erhöhung um ¼ % → höchstens 3 % (< 5 %), 2,5 % (5–6 %), 2 % (> 6 %).
  function satzProSchritt(zins) { return zins < 5 ? 0.03 : (zins <= 6 ? 0.025 : 0.02); }

  // Veränderung des Mietzinses in Anteilen (−0.0566 = −5,66 %) von Referenzzins alt → neu.
  // Eine Senkung ist die Umkehrung der Erhöhung: 1,25 → 1,75 = +6 % ⇒ 1,75 → 1,25 = 1 − 1/1,06 = −5,66 %.
  function zinsAnteil(alt, neu) {
    var a = Math.round(alt * 4), n = Math.round(neu * 4);
    if (a === n) return 0;
    var tief = Math.min(a, n), hoch = Math.max(a, n), summe = 0;
    for (var s = tief; s < hoch; s++) summe += satzProSchritt(s / 4);
    return n > a ? summe : -(1 - 1 / (1 + summe));
  }

  // Art. 16 VMWG: höchstens 40 % der Veränderung des Landesindexes der Konsumentenpreise.
  function teuerungAnteil(likAlt, likNeu) {
    likAlt = +likAlt; likNeu = +likNeu;
    if (!(likAlt > 0) || !(likNeu > 0)) return 0;
    return 0.4 * (likNeu / likAlt - 1);
  }

  // Allgemeine Kostensteigerungen als Pauschale pro Jahr (z. B. 0.005 = 0,5 %/Jahr), anteilig nach Monaten.
  function kostenAnteil(monate, proJahr) { return Math.max(0, +monate || 0) / 12 * Math.max(0, +proJahr || 0); }

  function monateZwischen(von, bis) {
    if (!von || !bis) return 0;
    var a = new Date(von), b = new Date(bis);
    return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
  }

  function monatsende(j, m) { return new Date(j, m + 1, 0); } // m: 0–11
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  // Nächstmöglicher Kündigungstermin: das Schreiben muss spätestens am letzten Tag vor Beginn der Frist ankommen.
  // termine: Liste erlaubter Monate (1–12, jeweils Monatsende). zugang: Datum, an dem der Brief ankommt.
  function naechsterTermin(zugang, fristMonate, termine) {
    var z = new Date(zugang); z.setHours(0, 0, 0, 0);
    var f = Math.max(1, Math.round(+fristMonate || 3));
    var erlaubt = (termine && termine.length) ? termine : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    for (var i = 0; i < 60; i++) {
      var j = z.getFullYear(), m = z.getMonth() + i;
      var t = monatsende(j, m);
      if (erlaubt.indexOf(t.getMonth() + 1) < 0) continue;
      var spaetestens = monatsende(t.getFullYear(), t.getMonth() - f); // Ende des Monats vor Fristbeginn
      if (z <= spaetestens) {
        var ab = new Date(t.getFullYear(), t.getMonth() + 1, 1);
        return { termin: iso(t), wirksamAb: iso(ab), spaetestensZugang: iso(spaetestens) };
      }
    }
    return null;
  }

  function plusTage(datum, tage) { var d = new Date(datum); d.setDate(d.getDate() + tage); return iso(d); }

  function berechnen(e) {
    var netto = +e.netto || 0;
    var zins = zinsAnteil(+e.zinsAlt, e.zinsNeu == null ? AKTUELL.satz : +e.zinsNeu);
    var teuerung = teuerungAnteil(e.likAlt, e.likNeu);
    var monate = monateZwischen(e.festlegung, e.heute);
    var kosten = kostenAnteil(monate, e.kostenProJahr == null ? 0.005 : e.kostenProJahr);
    var total = zins + teuerung + kosten;
    var neu = Math.round(netto * (1 + total) * 20) / 20; // auf 5 Rappen
    var r = {
      zins: zins, teuerung: teuerung, kosten: kosten, monate: monate, total: total,
      nettoNeu: neu, proMonat: netto - neu, proJahr: (netto - neu) * 12,
      anspruch: total < 0
    };
    if (e.zugang) {
      r.termin = naechsterTermin(e.zugang, e.frist, e.termine);
      r.antwortBis = plusTage(e.zugang, 30);                 // Art. 270a Abs. 2 OR: Vermieter nimmt innert 30 Tagen Stellung
      r.schlichtungBis = plusTage(r.antwortBis, 30);         // danach 30 Tage für die Schlichtungsbehörde (ohne Antwort)
    }
    return r;
  }

  var api = { AKTUELL: AKTUELL, zinsAnteil: zinsAnteil, teuerungAnteil: teuerungAnteil, kostenAnteil: kostenAnteil,
    naechsterTermin: naechsterTermin, monateZwischen: monateZwischen, berechnen: berechnen };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.MietzinsEngine = api;
})(this);
