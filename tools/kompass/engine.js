// Finanz-Kompass Schweiz — verbindet Mietzins-, Budget- und Schulden-Engine zu EINEM Plan (ohne Oberfläche, in Node testbar).
// Reihenfolge (bewusst einfach und überprüfbar):
//   1. Miete prüfen: steht eine Senkung sicher zu, kommt die Ersparnis zum freien Betrag dazu.
//   2. Budget: was nach allen Ausgaben, Rückstellungen und Kreditraten pro Monat frei bleibt.
//   3. Start-Reserve: eine Monatsmenge Fixkosten auf dem Konto, bevor Extra-Geld in die Schulden geht.
//   4. Schulden: freier Betrag als Extra-Zahlung (Lawine oder Schneeball), frei gewordene Raten rollen weiter.
//      Leasing (fest: true) läuft mit seiner Rate weiter und bekommt kein Extra-Geld (ausserordentliche Amortisation kaum möglich).
//   5. Volle Notreserve (3 Monate Fixkosten), danach ist der ganze Betrag frei.
// Kreditraten gehören NICHT ins Budget (Schritt 1), sondern zu den Schulden; die Engine zieht sie selbst ab.
(function (root) {
  "use strict";
  var MAX_MONATE = 600;   // 50 Jahre: alles darüber ist kein Plan mehr

  function zahl(x) { x = +x; return isFinite(x) && x > 0 ? x : 0; }

  function plan(e, dep) {
    var B = dep.BudgetEngine, S = dep.SchuldenEngine, M = dep.MietzinsEngine;
    var b = B.auswerten(e.budget || {});
    var mm = e.miete;
    var miete = mm && zahl(mm.netto) > 0 && +mm.zinsAlt > 0 ? M.berechnen(mm) : null;
    // Sicher nur mit Festlegungsdatum (Kostenpauschale) UND beiden Teuerungsindizes, sonst wird die Senkung überschätzt.
    var mieteSicher = !!(miete && mm.festlegung && zahl(mm.likAlt) && zahl(mm.likNeu));
    var mieteSpar = miete && miete.anspruch && mieteSicher ? Math.max(miete.proMonat, 0) : 0;
    var alle = (e.schulden || []).map(function (d, i) {
      return { name: d.name || ("Schuld " + (i + 1)), betrag: zahl(d.betrag), zins: zahl(d.zins), rate: zahl(d.rate), fest: !!d.fest };
    }).filter(function (d) { return d.betrag > 0; });
    var schulden = alle.filter(function (d) { return !d.fest; });
    var fest = alle.filter(function (d) { return d.fest; });
    var raten = schulden.reduce(function (a, d) { return a + d.rate; }, 0);
    var festRaten = fest.reduce(function (a, d) { return a + d.rate; }, 0);
    var fix = b.gruppen.bedarf + festRaten;              // Fixkosten inkl. Leasingrate (läuft weiter)
    var frei = b.rest - raten - festRaten + mieteSpar;   // freier Betrag nach allen Raten
    var reserve = zahl((e.budget || {}).reserve);
    var startZiel = fix, vollZiel = 3 * fix;
    var methode = e.methode === "schneeball" ? "schneeball" : "lawine";
    var r = { budget: b, miete: miete, mieteSicher: mieteSicher, mieteSpar: mieteSpar, frei: frei, fix: fix, reserve: reserve,
              startZiel: startZiel, vollZiel: vollZiel, raten: raten, festRaten: festRaten, fest: fest, methode: methode,
              schritte: [], geht: frei > 0, warnungen: [] };
    alle.forEach(function (d) {
      if (d.rate <= 0) r.warnungen.push({ art: "ohneRate", name: d.name });
      else if (d.zins > 0 && d.rate <= d.betrag * d.zins / 100 / 12) r.warnungen.push({ art: "rateUnterZins", name: d.name });
    });
    if (miete && miete.anspruch) r.schritte.push({ art: "miete", titel: "Mietzinssenkung verlangen", proMonat: Math.max(miete.proMonat, 0), sicher: mieteSicher });

    if (!(frei > 0)) {
      r.fehlt = -frei;
      r.schritte.push({ art: "loch", titel: "Budget ausgleichen", proMonat: -frei });
      return r;
    }
    r.schritte.push({ art: "rueck", titel: "Dauerauftrag für Rückstellungen", proMonat: b.rueckstellung });

    // 3. Start-Reserve
    var a = reserve >= startZiel ? 0 : Math.ceil((startZiel - reserve) / frei);
    if (a > MAX_MONATE) { r.zuLang = true; r.schritte.push({ art: "start", titel: "Start-Reserve aufbauen", von: 1, bis: null, proMonat: frei, ziel: startZiel }); return r; }
    if (a > 0) r.schritte.push({ art: "start", titel: "Start-Reserve aufbauen", von: 1, bis: a, proMonat: frei, ziel: startZiel });
    var m = a, stand = reserve + a * frei;

    // 4. Schulden: a Monate nur Mindestraten, danach mit Extra = frei
    if (schulden.length) {
      var nurMindest = S.simuliere(schulden, { methode: methode, extra: 0, monate: MAX_MONATE });
      r.zinsenMindest = nurMindest.schuldenfrei === null ? null : nurMindest.zinsen;   // tilgen die Raten nie, gibt es keinen fairen Vergleich
      r.schuldenfreiMindest = nurMindest.schuldenfrei;
      r.reihenfolge = S.ordnung(schulden, methode).map(function (i) { return schulden[i].name; });
      var rest = schulden, zinsenA = 0, schonFrei = null, nachA = 0;
      if (a > 0) {
        var phaseA = S.simuliere(schulden, { methode: methode, extra: 0, monate: a });
        zinsenA = phaseA.zinsen;
        schonFrei = phaseA.schuldenfrei;
        rest = phaseA.einzeln.filter(function (d) { return d.rest > 0.005; })
          .map(function (d) { return { name: d.name, betrag: d.rest, zins: d.zins, rate: d.rate }; });
        // Raten schon getilgter Schulden rollen in Phase B weiter (in Phase A konservativ nicht in die Reserve gezählt)
        nachA = phaseA.einzeln.filter(function (d) { return d.frei !== null; }).reduce(function (s, d) { return s + d.rate; }, 0);
      }
      if (schonFrei !== null) {
        r.schuldenfrei = schonFrei; r.zinsenPlan = zinsenA;
        r.schritte.push({ art: "schuldenA", titel: "Schulden mit den Raten getilgt", von: schonFrei, bis: schonFrei });
      } else {
        var tilg = S.simuliere(rest, { methode: methode, extra: frei + nachA, monate: MAX_MONATE });
        r.zinsenPlan = zinsenA + tilg.zinsen;
        if (tilg.schuldenfrei === null) {
          r.schuldenfrei = null; r.zuLang = true;
          r.schritte.push({ art: "schulden", titel: "Schulden tilgen", von: a + 1, bis: null, proMonat: frei + raten });
          return r;
        }
        r.schuldenfrei = a + tilg.schuldenfrei;
        r.schritte.push({ art: "schulden", titel: "Schulden tilgen (" + (methode === "lawine" ? "Lawine" : "Schneeball") + ")",
          von: a + 1, bis: r.schuldenfrei, proMonat: frei + raten,
          ersparnis: r.zinsenMindest == null ? null : Math.max(r.zinsenMindest - r.zinsenPlan, 0) });
        m = r.schuldenfrei;
      }
      
    }

    // 5. Volle Notreserve: nach den Schulden steht frei + alle (nicht festen) Raten zur Verfügung
    var nachher = frei + raten;
    if (schulden.length && r.schuldenfrei !== null && r.schuldenfrei <= a) {
      // in Phase A getilgt: ab dem Folgemonat fliessen die Raten in die Reserve mit
      stand = reserve + r.schuldenfrei * frei + (a - r.schuldenfrei) * nachher;
    }
    if (stand < vollZiel) {
      var c = Math.ceil((vollZiel - stand) / nachher);
      if (m + c > MAX_MONATE) { r.zuLang = true; return r; }
      r.schritte.push({ art: "voll", titel: "Notreserve auf 3 Monate auffüllen", von: m + 1, bis: m + c, proMonat: nachher, ziel: vollZiel });
      m += c;
    }
    r.ziel = m;                                          // ab diesem Monat: keine Schulden (ausser Leasing), volle Reserve
    r.danachFrei = nachher;
    r.schritte.push({ art: "frei", titel: "Frei für deine Ziele", von: m + 1, proMonat: nachher });
    return r;
  }

  // Monat n (0 = Startmonat) als „Monat Jahr"; start = "JJJJ-MM" oder "JJJJ-MM-TT", lokal gelesen (kein UTC-Versatz)
  function monatName(start, n) {
    var t = String(start || "").split("-"), j = +t[0], mo = +t[1];
    if (!(j > 1900) || !(mo >= 1 && mo <= 12)) { var h = new Date(); j = h.getFullYear(); mo = h.getMonth() + 1; }
    var d = new Date(j, mo - 1 + n, 1);
    return ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"][d.getMonth()] + " " + d.getFullYear();
  }

  var api = { plan: plan, monatName: monatName, MAX_MONATE: MAX_MONATE };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.KompassEngine = api;
})(this);
