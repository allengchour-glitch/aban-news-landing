// Schulden-Plan Schweiz — Rechen-Engine (ohne Oberfläche, auch in Node testbar).
// Alle Beträge in CHF, Zinsen in Prozent pro Jahr, monatliche Verzinsung.
(function (root) {
  "use strict";

  // Reihenfolge der Extra-Zahlungen: Lawine = höchster Zins zuerst, Schneeball = kleinster Betrag zuerst.
  function ordnung(schulden, methode) {
    var idx = schulden.map(function (_, i) { return i; });
    return idx.sort(function (a, b) {
      var A = schulden[a], B = schulden[b];
      if (methode === "schneeball") return A.betrag - B.betrag || B.zins - A.zins;
      return B.zins - A.zins || A.betrag - B.betrag;
    });
  }

  // Monat für Monat: Zins auflaufen, Mindestraten zahlen, dann Extra + frei gewordene Raten nach Reihenfolge.
  // strategie: "tilgen" (Extra geht in die Schulden) oder "investieren" (Extra geht ins Depot).
  // rendite: erwartete Depotrendite in % pro Jahr. steuer: Grenzsteuersatz 0..1 (Schuldzinsabzug), 0 = aus.
  // monate: Horizont. Nach Tilgung aller Schulden fliesst das ganze Budget ins Depot (in beiden Strategien).
  function simuliere(schulden, opt) {
    var methode = opt.methode || "lawine", extra = +opt.extra || 0, monate = opt.monate || 600;
    var rMon = Math.pow(1 + (+opt.rendite || 0) / 100, 1 / 12) - 1, steuer = +opt.steuer || 0;
    var s = schulden.map(function (d) { return { name: d.name, rest: +d.betrag, zins: +d.zins, rate: +d.rate, frei: null }; });
    var reihe = ordnung(schulden, methode);
    var budget = s.reduce(function (a, d) { return a + d.rate; }, 0) + extra;
    var depot = 0, zinsen = 0, plan = [], problem = null, schuldenfrei = null;
    for (var m = 1; m <= monate; m++) {
      var zinsMonat = 0;
      s.forEach(function (d) {
        if (d.rest <= 0) return;
        var z = d.rest * d.zins / 100 / 12;
        d.rest += z; zinsMonat += z;
      });
      zinsen += zinsMonat * (1 - steuer);
      depot += zinsMonat * steuer; // Steuerersparnis aus dem Schuldzinsabzug fliesst ins Depot
      depot *= 1 + rMon;
      var frei = opt.strategie === "investieren" ? budget - extra : budget;
      s.forEach(function (d) {
        if (d.rest <= 0) return;
        var p = Math.min(d.rate, d.rest); d.rest -= p; frei -= p;
      });
      for (var k = 0; k < reihe.length && frei > 0.005; k++) {
        var d = s[reihe[k]];
        if (d.rest <= 0) continue;
        var q = Math.min(frei, d.rest); d.rest -= q; frei -= q;
      }
      if (opt.strategie === "investieren") frei += extra;
      depot += Math.max(frei, 0);
      var offen = 0;
      s.forEach(function (d) {
        if (d.rest <= 0.005 && d.frei === null) { d.rest = 0; d.frei = m; }
        offen += Math.max(d.rest, 0);
      });
      plan.push({ monat: m, offen: offen, zinsen: zinsMonat, depot: depot });
      if (offen <= 0.005 && schuldenfrei === null) schuldenfrei = m;
      if (m === 12 && problem === null) {
        s.forEach(function (d) {
          if (d.rest > 0 && d.rate <= d.rest * d.zins / 100 / 12) problem = d.name;
        });
      }
    }
    var restSchuld = s.reduce(function (a, d) { return a + Math.max(d.rest, 0); }, 0);
    return { schuldenfrei: schuldenfrei, zinsen: zinsen, depot: depot, restSchuld: restSchuld,
             vermoegen: depot - restSchuld, plan: plan, einzeln: s, problem: problem };
  }

  // Ab welcher Depotrendite lohnt sich Investieren statt Tilgen? (Halbierungssuche, 0..30 %)
  function breakEven(schulden, opt) {
    var tief = -5, hoch = 30;
    function diff(r) {
      var o = Object.assign({}, opt, { rendite: r });
      return simuliere(schulden, Object.assign({}, o, { strategie: "investieren" })).vermoegen
           - simuliere(schulden, Object.assign({}, o, { strategie: "tilgen" })).vermoegen;
    }
    if (diff(hoch) < 0) return null;
    for (var i = 0; i < 40; i++) {
      var mid = (tief + hoch) / 2;
      if (diff(mid) > 0) hoch = mid; else tief = mid;
    }
    return (tief + hoch) / 2;
  }

  function schnittZins(schulden, steuer) {
    var sum = schulden.reduce(function (a, d) { return a + (+d.betrag); }, 0);
    if (!sum) return 0;
    return schulden.reduce(function (a, d) { return a + d.betrag * d.zins; }, 0) / sum * (1 - (+steuer || 0));
  }

  var api = { simuliere: simuliere, breakEven: breakEven, ordnung: ordnung, schnittZins: schnittZins };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.SchuldenEngine = api;
})(this);
