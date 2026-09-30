// Hochzeits-Budget — Rechen-Engine (ohne Oberfläche, in Node testbar). Beträge in CHF (oder jeder anderen Währung).
(function (root) {
  "use strict";
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function minusMonate(datum, m) { var d = new Date(datum); d.setDate(1); d.setMonth(d.getMonth() - (+m || 0)); return d; } // 1. des Monats
  function monate(von, bis) { var a = new Date(von), b = new Date(bis); return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()); }

  function kosten(p, gaeste) { return (+p.betrag || 0) * (p.proGast ? (+gaeste || 0) : 1); }

  function auswerten(e) {
    var g = +e.gaeste || 0, budget = +e.budget || 0;
    var posten = (e.posten || []).map(function (p) {
      var k = kosten(p, g), anz = Math.min(1, Math.max(0, +p.anzahlung || 0)) * k, bez = Math.min(k, +p.bezahlt || 0);
      return { name: p.name, kosten: k, anzahlung: anz, rest: k - anz, bezahlt: bez, offen: k - bez,
        anzahlungMonate: +p.anzahlungMonate || 0, proGast: !!p.proGast, betrag: +p.betrag || 0 };
    });
    var total = posten.reduce(function (a, p) { return a + p.kosten; }, 0);
    var proGastSumme = posten.reduce(function (a, p) { return a + (p.proGast ? p.betrag : 0); }, 0);
    var fix = total - proGastSumme * g;
    var bezahlt = posten.reduce(function (a, p) { return a + p.bezahlt; }, 0);
    var r = {
      total: total, proGast: g > 0 ? total / g : 0, rest: budget - total, fix: fix,
      proZusatzgast: proGastSumme,
      maxGaeste: proGastSumme > 0 ? Math.max(0, Math.floor((budget - fix) / proGastSumme)) : null,
      bezahlt: bezahlt, offen: total - bezahlt,
      posten: posten.slice().sort(function (a, b) { return b.kosten - a.kosten; })
    };
    // Zahlungsplan: Anzahlung am 1. des Monats X Monate vorher (frühestens heute), Rest am Hochzeitstag.
    // Bereits Bezahltes deckt zuerst die Anzahlung, dann den Rest.
    if (e.datum && e.heute) {
      var heute = new Date(e.heute), z = [];
      posten.forEach(function (p) {
        var anzOffen = Math.max(0, p.anzahlung - p.bezahlt), restOffen = p.offen - anzOffen;
        if (anzOffen > 0.004) { var d = minusMonate(e.datum, p.anzahlungMonate); if (d < heute) d = heute; z.push({ datum: iso(d), name: p.name, art: "Anzahlung", betrag: anzOffen }); }
        if (restOffen > 0.004) z.push({ datum: e.datum, name: p.name, art: p.anzahlung > 0 ? "Rest" : "Zahlung", betrag: restOffen });
      });
      z.sort(function (a, b) { return a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0; });
      r.zahlungen = z;
      // Nötige Sparrate: für jede Fälligkeit muss (bis dahin fällig − gespart) in den Monaten bis dahin angespart sein.
      var gespart = +e.gespart || 0, spar = +e.sparenMonat || 0, kum = 0, noetig = 0, luecke = null;
      r.monateBis = Math.max(0, monate(e.heute, e.datum));
      z.forEach(function (x, i) {
        kum += x.betrag;
        if (z[i + 1] && z[i + 1].datum === x.datum) return; // erst nach allen Zahlungen desselben Tages prüfen
        var m = Math.max(0, monate(e.heute, x.datum));
        var fehlt = kum - gespart;
        if (fehlt > 0) noetig = Math.max(noetig, m > 0 ? fehlt / m : Infinity);
        var vorhanden = gespart + spar * m;
        if (luecke === null && vorhanden + 0.004 < kum) luecke = { datum: x.datum, fehlt: kum - vorhanden };
      });
      r.sparrateNoetig = noetig;   // Infinity = sofort fällig und nicht gedeckt
      r.luecke = luecke;           // erste Fälligkeit, die mit der geplanten Sparrate nicht gedeckt ist
    }
    return r;
  }
  var api = { auswerten: auswerten, kosten: kosten };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.HochzeitEngine = api;
})(this);
