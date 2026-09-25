// Budget-Plan Schweiz — Rechen-Engine (ohne Oberfläche, in Node testbar). Beträge in CHF.
(function (root) {
  "use strict";
  // Wie oft pro Jahr fällt ein Posten an?
  var PRO_JAHR = { monat: 12, quartal: 4, halbjahr: 2, jahr: 1 };
  // Gruppen für 50/30/20: bedarf = muss, wunsch = kann, sparen = Sparen/Tilgen
  function monatlich(p) { return (+p.betrag || 0) * (PRO_JAHR[p.takt] || 12) / 12; }

  function auswerten(plan) {
    var ein = (plan.einnahmen || []).reduce(function (a, p) { return a + monatlich(p); }, 0);
    var gruppen = { bedarf: 0, wunsch: 0, sparen: 0 }, rueck = 0, wohnen = 0, fix = 0, posten = [];
    (plan.ausgaben || []).forEach(function (p) {
      var m = monatlich(p);
      gruppen[p.gruppe || "bedarf"] += m;
      if (p.takt && p.takt !== "monat") rueck += m;       // nicht monatlich bezahlt → monatlich zurücklegen
      if (p.wohnen) wohnen += m;
      if ((p.gruppe || "bedarf") === "bedarf") fix += m;
      posten.push({ name: p.name, monat: m, gruppe: p.gruppe || "bedarf" });
    });
    var aus = gruppen.bedarf + gruppen.wunsch + gruppen.sparen;
    var rest = ein - aus;
    var reserveZiel = 3 * fix;
    var reserve = +plan.reserve || 0;
    var sparMonat = gruppen.sparen + Math.max(rest, 0);
    var monateBisReserve = reserve >= reserveZiel ? 0 : (sparMonat > 0 ? Math.ceil((reserveZiel - reserve) / sparMonat) : null);
    var q = function (x) { return ein > 0 ? x / ein : 0; };
    return {
      einnahmen: ein, ausgaben: aus, rest: rest, gruppen: gruppen,
      anteile: { bedarf: q(gruppen.bedarf), wunsch: q(gruppen.wunsch), sparen: q(gruppen.sparen + Math.max(rest, 0)) },
      rueckstellung: rueck, wohnquote: q(wohnen), reserveZiel: reserveZiel, monateBisReserve: monateBisReserve,
      posten: posten.sort(function (a, b) { return b.monat - a.monat; })
    };
  }
  var api = { auswerten: auswerten, monatlich: monatlich, PRO_JAHR: PRO_JAHR };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.BudgetEngine = api;
})(this);
