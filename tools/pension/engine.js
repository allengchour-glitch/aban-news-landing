// Pensions-Check Schweiz — Rechen-Engine (ohne Oberfläche, in Node testbar). Beträge in CHF.
// Grundlagen (Wortlaut fedlex, Stand 1.1.2026): Art. 34 AHVG (Rentenformel, Mindestbetrag 1260, Höchstbetrag = 2×),
// Art. 34ter AHVG (13. Altersrente = 1/12 der Jahresrente, seit 2026), Art. 35 AHVG (Ehepaar max. 150 % des Höchstbetrags),
// Art. 38 AHVG (Teilrente nach Beitragsjahren), Art. 14 BVG (Mindestumwandlungssatz 6,8 % für das Obligatorium).
// Vereinfachung: Rentenformel ohne die Rundung der amtlichen Rentenskala 44; Teilrente = Beitragsjahre / 44.
(function (root) {
  "use strict";
  var AHV = { min: 1260, stand: "1. Januar 2026", volleJahre: 44, ehepaarMax: 1.5 };

  function zahl(x) { x = +x; return isFinite(x) && x > 0 ? x : 0; }

  // Monatliche Vollrente aus dem massgebenden durchschnittlichen Jahreseinkommen (Art. 34 Abs. 2–4 AHVG)
  function vollrente(e) {
    var min = AHV.min, E = zahl(e);
    if (E <= 12 * min) return min;
    if (E >= 72 * min) return 2 * min;
    return E <= 36 * min ? 0.74 * min + 13 / 600 * E : 1.04 * min + 8 / 600 * E;
  }
  // Teilrente (Art. 38): Anteil der vollen Beitragsjahre (vereinfacht)
  function ahvRente(einkommen, jahre) {
    var j = Math.min(zahl(jahre), AHV.volleJahre);
    return vollrente(einkommen) * j / AHV.volleJahre;
  }
  // Ehepaar (Art. 35): Summe höchstens 150 % des Höchstbetrags, im Verhältnis gekürzt
  function ehepaar(r1, r2) {
    var max = AHV.ehepaarMax * 2 * AHV.min, s = r1 + r2;
    if (s <= max || s === 0) return { r1: r1, r2: r2, gekuerzt: false };
    return { r1: r1 * max / s, r2: r2 * max / s, gekuerzt: true, vorher: s, max: max };
  }
  // Zukunftswert: Kapital heute + jährliche Einzahlung (Ende Jahr), Rendite in % p. a.
  function zukunft(heute, proJahr, jahre, rendite) {
    var r = (+rendite || 0) / 100, k = zahl(heute), n = Math.max(0, Math.round(+jahre || 0));
    for (var i = 0; i < n; i++) k = k * (1 + r) + zahl(proJahr);
    return k;
  }
  // Kapital in eine monatliche Entnahme über n Jahre umwandeln (Kapitalverzehr, Rendite während des Verzehrs)
  function verzehr(kapital, jahre, rendite) {
    var n = Math.max(1, Math.round(+jahre || 1)) * 12, r = Math.pow(1 + (+rendite || 0) / 100, 1 / 12) - 1, K = zahl(kapital);
    return r === 0 ? K / n : K * r / (1 - Math.pow(1 + r, -n));
  }
  // Monatliche Sparrate bis zur Pensionierung, die ein Zielkapital erreicht
  function sparrate(ziel, jahre, rendite) {
    var n = Math.max(1, Math.round(+jahre || 0) * 12), r = Math.pow(1 + (+rendite || 0) / 100, 1 / 12) - 1;
    return r === 0 ? ziel / n : ziel * r / (Math.pow(1 + r, n) - 1);
  }

  // e: { alter, pensionsalter, bisAlter, ziel (Monat), personen:[{einkommen, jahre}], pk:{guthaben65 | (heute, proJahr, zins), satz},
  //      saeule3a:{heute, proJahr}, vermoegen:{heute, proJahr}, rendite, renditeRuhestand }
  function check(e) {
    var bis = Math.max(0, (+e.pensionsalter || 65) - (+e.alter || 0));
    var ruhe = Math.max(1, (+e.bisAlter || 90) - (+e.pensionsalter || 65));
    var ps = (e.personen || []).filter(function (p) { return zahl(p.einkommen) || zahl(p.jahre); });
    var renten = ps.map(function (p) { return ahvRente(p.einkommen, p.jahre); });
    var ep = renten.length === 2 ? ehepaar(renten[0], renten[1]) : null;
    if (ep) renten = [ep.r1, ep.r2];
    var ahv = renten.reduce(function (a, b) { return a + b; }, 0);
    var ahv13 = ahv / 12;                                  // 13. Altersrente als Monatsschnitt (1/12 des Jahresbetrags / 12)
    var pk = e.pk || {}, satz = (+pk.satz > 0 ? +pk.satz : 6.8);
    var guthaben = zahl(pk.guthaben65) || zukunft(pk.heute, pk.proJahr, bis, pk.zins == null ? 1.25 : pk.zins);
    var pkRente = guthaben * satz / 100 / 12;
    var r = +e.rendite || 0, rr = e.renditeRuhestand == null ? r : +e.renditeRuhestand;
    var k3a = zukunft((e.saeule3a || {}).heute, (e.saeule3a || {}).proJahr, bis, r);
    var kVerm = zukunft((e.vermoegen || {}).heute, (e.vermoegen || {}).proJahr, bis, r);
    var verzehrM = verzehr(k3a + kVerm, ruhe, rr);
    var total = ahv + ahv13 + pkRente + verzehrM;
    var ziel = zahl(e.ziel), luecke = Math.max(ziel - total, 0);
    var kapitalNoetig = luecke > 0 ? luecke / verzehr(1, ruhe, rr) : 0;   // Kapital, das die Lücke über die Ruhejahre deckt
    return { jahreBis: bis, ruhejahre: ruhe, renten: renten, ehepaar: ep, ahv: ahv, ahv13: ahv13, ahvJahr: ahv * 13,
      pkGuthaben: guthaben, pkSatz: satz, pkRente: pkRente, kapital3a: k3a, kapitalVermoegen: kVerm, verzehr: verzehrM,
      total: total, ziel: ziel, luecke: luecke, deckung: ziel ? total / ziel : null,
      kapitalNoetig: kapitalNoetig, sparrate: kapitalNoetig ? sparrate(kapitalNoetig, bis, r) : 0 };
  }

  var api = { AHV: AHV, vollrente: vollrente, ahvRente: ahvRente, ehepaar: ehepaar, zukunft: zukunft, verzehr: verzehr, sparrate: sparrate, check: check };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.PensionEngine = api;
})(this);
