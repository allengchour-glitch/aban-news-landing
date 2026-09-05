/* qr-rechnung.js — Schweizer QR-Rechnung (Zahlteil + Empfangsschein) im Browser.
   Rechenkern nach Swiss Payment Standards (QR-Rechnung, Version 0200).
   Läuft komplett lokal; die Datei exportiert ihre Funktionen auch für Node-Tests. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.QRRECHNUNG = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ── IBAN ───────────────────────────────────────────────────────────────── */
  function ibanNorm(s) { return String(s || "").replace(/\s+/g, "").toUpperCase(); }
  function mod97(str) {
    // ISO 7064 Mod 97-10 über eine (lange) Ziffernkette, stückweise
    var rest = 0;
    for (var i = 0; i < str.length; i += 7) rest = parseInt(String(rest) + str.slice(i, i + 7), 10) % 97;
    return rest;
  }
  function ibanOk(iban) {
    var s = ibanNorm(iban);
    if (!/^(CH|LI)\d{19}$/.test(s)) return false;          // QR-Rechnung: nur CH/LI-Konten
    var um = s.slice(4) + s.slice(0, 4);
    var ziffern = um.replace(/[A-Z]/g, function (c) { return String(c.charCodeAt(0) - 55); });
    return mod97(ziffern) === 1;
  }
  /* QR-IBAN: Instituts-Identifikation (Stellen 5–9) 30000–31999 → verlangt QR-Referenz. */
  function istQrIban(iban) {
    var s = ibanNorm(iban); var iid = parseInt(s.slice(4, 9), 10);
    return iid >= 30000 && iid <= 31999;
  }
  function ibanFormat(iban) { return ibanNorm(iban).replace(/(.{4})/g, "$1 ").trim(); }

  /* ── QR-Referenz (27 Stellen, Prüfziffer Modulo 10 rekursiv) ───────────── */
  var M10 = [0, 9, 4, 6, 8, 2, 7, 1, 3, 5];
  function mod10Pruefziffer(ziffern) {
    var c = 0;
    for (var i = 0; i < ziffern.length; i++) c = M10[(c + parseInt(ziffern[i], 10)) % 10];
    return (10 - c) % 10;
  }
  function qrrErzeugen(basis) {
    var z = String(basis || "").replace(/\D/g, "").slice(0, 26);
    z = z.padStart(26, "0");
    return z + mod10Pruefziffer(z);
  }
  function qrrOk(ref) {
    var z = String(ref || "").replace(/\s+/g, "");
    return /^\d{27}$/.test(z) && mod10Pruefziffer(z.slice(0, 26)) === parseInt(z[26], 10);
  }
  function qrrFormat(ref) { var z = String(ref).replace(/\s+/g, ""); return z.slice(0, 2) + " " + z.slice(2).replace(/(.{5})/g, "$1 ").trim(); }

  /* ── Creditor Reference (ISO 11649, „RF…") für normale IBANs ──────────── */
  function rfErzeugen(basis) {
    var b = String(basis || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 21);
    if (!b) return "";
    var ziffern = (b + "RF00").replace(/[A-Z]/g, function (c) { return String(c.charCodeAt(0) - 55); });
    var pz = 98 - mod97(ziffern);
    return "RF" + String(pz).padStart(2, "0") + b;
  }
  function rfOk(ref) {
    var s = String(ref || "").replace(/\s+/g, "").toUpperCase();
    if (!/^RF\d{2}[A-Z0-9]{1,21}$/.test(s)) return false;
    var um = s.slice(4) + s.slice(0, 4);
    return mod97(um.replace(/[A-Z]/g, function (c) { return String(c.charCodeAt(0) - 55); })) === 1;
  }
  function rfFormat(ref) { return String(ref).replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim(); }

  /* ── Betrag ────────────────────────────────────────────────────────────── */
  function betragNorm(s) {
    var t = String(s == null ? "" : s).trim().replace(/['’\s]/g, "").replace(",", ".");
    if (t === "") return "";
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
    var n = Math.round(parseFloat(t) * 100) / 100;
    if (n < 0.01 || n > 999999999.99) return null;
    return n.toFixed(2);
  }
  function betragAnzeige(s) {
    if (!s) return "";
    var t = s.split("."); return t[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ") + "." + t[1];
  }

  /* ── Nutzdaten (Swiss QR Code, Typ K = kombinierte Adresse) ─────────────
     Zeilen 1–31 sind Pflicht (leere Felder bleiben leere Zeilen), 32 optional. */
  function saeubern(s, max) { return String(s || "").replace(/[\r\n]+/g, " ").trim().slice(0, max); }
  function payload(d) {
    var fehler = pruefen(d);
    if (fehler.length) return { ok: false, fehler: fehler };
    var refTyp = d.refTyp || "NON";
    var zeilen = [
      "SPC", "0200", "1", ibanNorm(d.iban),
      "K", saeubern(d.name, 70), saeubern(d.strasse, 70), saeubern(d.plzOrt, 70), "", "", "CH",
      "", "", "", "", "", "", "",                       /* Endgültiger Zahlungsempfänger: nicht erlaubt/leer */
      d.betrag ? betragNorm(d.betrag) : "", d.waehrung || "CHF"
    ];
    if (d.zahlerName) zeilen.push("K", saeubern(d.zahlerName, 70), saeubern(d.zahlerStrasse, 70), saeubern(d.zahlerPlzOrt, 70), "", "", "CH");
    else zeilen.push("", "", "", "", "", "", "");
    zeilen.push(refTyp, refTyp === "NON" ? "" : String(d.referenz || "").replace(/\s+/g, "").toUpperCase(),
                saeubern(d.mitteilung, 140), "EPD");
    return { ok: true, text: zeilen.join("\n"), zeilen: zeilen };
  }

  function pruefen(d) {
    var f = [];
    if (!ibanOk(d.iban)) f.push("IBAN ungültig — es braucht eine Schweizer oder Liechtensteiner IBAN (21 Zeichen).");
    if (!saeubern(d.name, 70)) f.push("Name des Zahlungsempfängers fehlt.");
    if (!saeubern(d.plzOrt, 70)) f.push("PLZ und Ort des Zahlungsempfängers fehlen.");
    var refTyp = d.refTyp || "NON";
    var qr = ibanOk(d.iban) && istQrIban(d.iban);
    if (qr && refTyp !== "QRR") f.push("Diese IBAN ist eine QR-IBAN — dann ist eine QR-Referenz (27 Ziffern) Pflicht.");
    if (!qr && refTyp === "QRR") f.push("Eine QR-Referenz gibt es nur zusammen mit einer QR-IBAN. Für eine normale IBAN: Creditor Reference (RF) oder keine Referenz.");
    if (refTyp === "QRR" && !qrrOk(d.referenz)) f.push("QR-Referenz ungültig (27 Ziffern, letzte ist die Prüfziffer).");
    if (refTyp === "SCOR" && !rfOk(d.referenz)) f.push("Creditor Reference ungültig (RF + 2 Prüfziffern + bis zu 21 Zeichen).");
    if (d.betrag && betragNorm(d.betrag) === null) f.push("Betrag ungültig — 0.01 bis 999 999 999.99, zwei Nachkommastellen.");
    if (d.waehrung && d.waehrung !== "CHF" && d.waehrung !== "EUR") f.push("Währung muss CHF oder EUR sein.");
    if (d.zahlerName && !saeubern(d.zahlerPlzOrt, 70)) f.push("Beim Zahler fehlen PLZ und Ort.");
    return f;
  }

  return {
    ibanNorm: ibanNorm, ibanOk: ibanOk, istQrIban: istQrIban, ibanFormat: ibanFormat,
    qrrErzeugen: qrrErzeugen, qrrOk: qrrOk, qrrFormat: qrrFormat,
    rfErzeugen: rfErzeugen, rfOk: rfOk, rfFormat: rfFormat,
    betragNorm: betragNorm, betragAnzeige: betragAnzeige,
    payload: payload, pruefen: pruefen
  };
});
