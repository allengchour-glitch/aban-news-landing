// Kassenvergleich Grundversicherung — rechnet mit den offiziellen BAG-Prämien (data/krankenkassen/<Jahr>/<Kanton>.json).
// Ohne Oberfläche, in Node testbar. Braucht KrankenkasseEngine (engine.js) für Franchise + Selbstbehalt.
//   Kantonsdaten: { tarife: [[kassenNr, typ, name, nurGemeinden?]], p: { "<Region><E|J|K><1|0>": [[tarifIndex, [Prämie je Franchise]]] } }
//   Region 0 = Kanton ohne Prämienregionen. Unfall 1 = mit Unfalldeckung.
(function (root) {
  "use strict";
  var E = root.KrankenkasseEngine || (typeof require !== "undefined" ? require("./engine.js") : null);
  var FRANCHISEN = { E: [300, 500, 1000, 1500, 2000, 2500], J: [300, 500, 1000, 1500, 2000, 2500], K: [0, 100, 200, 300, 400, 500, 600] };
  var TYPEN = { BASE: "Standard (freie Arztwahl)", PRAXIS: "Hausarzt / HMO", TEL_DIG: "Telmed / App", FLEX: "Flex / kombiniert", PHARM: "Apotheke" };
  function art(alter) { return alter === "K" ? "kind" : "erwachsen"; }

  // opt: { region, alter: E|J|K, unfall: 0|1, franchise: Zahl | "beste", kosten, typen: [..] | null, bfs: Gemeinde-Nr | null }
  // → Liste aller Angebote (ein Eintrag pro Tarif), günstigste Jahreskosten zuerst
  function liste(kanton, kassen, opt) {
    var a = opt.alter || "E", fr = FRANCHISEN[a], zeilen = (kanton.p || {})[String(opt.region || 0) + a + (opt.unfall ? 1 : 0)] || [];
    var k = Math.max(0, +opt.kosten || 0), out = [];
    zeilen.forEach(function (z) {
      var t = kanton.tarife[z[0]], nur = t[3] || null;
      if (opt.typen && opt.typen.length && opt.typen.indexOf(t[1]) < 0) return;
      if (nur && opt.bfs && nur.indexOf(+opt.bfs) < 0) return;          // Tarif gibt es in dieser Gemeinde nicht
      var wahl = [];
      z[1].forEach(function (p, i) {
        if (p == null) return;
        if (opt.franchise !== "beste" && fr[i] !== +opt.franchise) return;
        wahl.push({ franchise: fr[i], praemie: p, jahr: E.jahreskosten(p, fr[i], k, art(a)), max: E.maximum(p, fr[i], art(a)) });
      });
      if (!wahl.length) return;
      var b = wahl.reduce(function (x, y) { return y.jahr < x.jahr - 1e-9 ? y : x; });
      out.push({ kasse: t[0], name: kassen[String(t[0])] || ("Kasse " + t[0]), typ: t[1], tarif: t[2], nurGemeinden: !!nur && !opt.bfs,
                 franchise: b.franchise, praemie: b.praemie, jahr: b.jahr, max: b.max });
    });
    return out.sort(function (x, y) { return x.jahr - y.jahr || x.praemie - y.praemie || x.name.localeCompare(y.name); });
  }

  // Pro Kasse nur das günstigste Angebot (für «alle Kassen auf einen Blick»)
  function proKasse(l) {
    var seen = {}, out = [];
    l.forEach(function (x) { if (!seen[x.kasse]) { seen[x.kasse] = 1; out.push(x); } });
    return out;
  }

  // Ersparnis gegenüber dem jetzigen Angebot (gleiche Person, gleiche Kosten) pro Jahr
  function ersparnis(l, jetzt) {
    if (!l.length || !jetzt) return null;
    return { betrag: jetzt.jahr - l[0].jahr, monat: (jetzt.jahr - l[0].jahr) / 12, bestes: l[0] };
  }

  // Region einer Gemeinde (Kantone ohne Regionen → 0)
  function region(index, kanton, bfs) {
    var g = (index.gemeinden || {})[kanton];
    if (!g) return 0;
    for (var i = 0; i < g.length; i++) if (g[i][0] === +bfs) return g[i][2];
    return null;
  }

  var api = { FRANCHISEN: FRANCHISEN, TYPEN: TYPEN, liste: liste, proKasse: proKasse, ersparnis: ersparnis, region: region };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.KassenVergleich = api;
})(this);
