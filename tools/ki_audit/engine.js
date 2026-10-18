/* KI-Sichtbarkeits-Audit — Rechen- und Regelkern.
 *
 * Eine Quelle der Wahrheit für das verkaufte Workbook. Reines JavaScript ohne
 * Abhängigkeiten, läuft im Browser (offline) und unter node (Tests).
 *
 * Die Zahlen hier sind KEINE Prognose. Der Stand zählt nur aus, was die
 * Nutzerin selbst ins Protokoll eingetragen hat.
 */
(function (root) {
  "use strict";

  /** Mögliche Antworten je Frage und KI. */
  var ERGEBNISSE = ["genannt", "nicht", "mitbewerber", "offen"];

  /** Die drei KI-Dienste, die das Audit abfragt. */
  var DIENSTE = ["ChatGPT", "Perplexity", "Google AI"];

  /* ---------------------------------------------------------------- Fragen */

  /* Fragenmuster. {leistung} und {ort} setzt der Nutzer ein — wir erfinden
     keine Branchendaten, sondern geben die Form vor, in der Kund:innen fragen. */
  var MUSTER = [
    "Wer bietet {leistung} in {ort} an?",
    "Bester Anbieter für {leistung} in {ort}?",
    "{leistung} {ort} Empfehlung",
    "Was kostet {leistung} in {ort}?",
    "Welche Firma macht {leistung} in der Nähe von {ort}?",
    "{leistung} in {ort} — wen kann man empfehlen?",
    "Ich suche {leistung} in {ort}, wen soll ich fragen?",
    "Gibt es {leistung} in {ort} mit guten Bewertungen?",
    "Worauf muss ich bei {leistung} achten?",
    "{leistung} {ort} Vergleich",
    "Wer macht kurzfristig {leistung} in {ort}?",
    "{leistung} in {ort} für kleine Betriebe"
  ];

  /** Baut die Fragenliste aus Leistung und Ort. Leere Angaben bleiben als Platzhalter stehen. */
  function fragen(leistung, ort) {
    var l = (leistung || "").trim() || "{leistung}";
    var o = (ort || "").trim() || "{ort}";
    // In EINEM Durchgang ersetzen: nacheinander würde eine Eingabe, die selbst
    // „{ort}" enthält, im zweiten Schritt nochmals ersetzt.
    return MUSTER.map(function (m) {
      return m.replace(/\{(leistung|ort)\}/g, function (_, k) { return k === "ort" ? o : l; });
    });
  }

  /* ----------------------------------------------------------------- Stand */

  /* Punkte je Antwort. „Mitbewerber genannt" ist schlechter als „niemand
     genannt": die KI hat eine Antwort — nur nicht deine. */
  var PUNKTE = { genannt: 1, mitbewerber: 0, nicht: 0.25, offen: null };

  /**
   * Zählt das Protokoll aus.
   * @param {Array<Object>} protokoll Einträge {frage, dienst, ergebnis}
   * @returns {{gezaehlt:number, offen:number, genannt:number, nicht:number,
   *            mitbewerber:number, punkte:number, jeDienst:Object}}
   */
  function stand(protokoll) {
    var z = { gezaehlt: 0, offen: 0, genannt: 0, nicht: 0, mitbewerber: 0, punkte: 0, jeDienst: {} };
    (protokoll || []).forEach(function (e) {
      var r = e && e.ergebnis;
      if (ERGEBNISSE.indexOf(r) < 0) return;          // Unbekanntes zählt nicht mit
      if (r === "offen") { z.offen++; return; }
      z[r]++;
      z.gezaehlt++;
      var d = e.dienst || "—";
      if (!z.jeDienst[d]) z.jeDienst[d] = { gezaehlt: 0, genannt: 0 };
      z.jeDienst[d].gezaehlt++;
      if (r === "genannt") z.jeDienst[d].genannt++;
    });
    if (z.gezaehlt > 0) {
      var summe = z.genannt * PUNKTE.genannt + z.nicht * PUNKTE.nicht + z.mitbewerber * PUNKTE.mitbewerber;
      z.punkte = Math.round((summe / z.gezaehlt) * 100);
    }
    return z;
  }

  /** Einordnung in Worten. Null, solange nichts gezählt wurde. */
  function urteil(z) {
    if (!z || z.gezaehlt === 0) return null;
    if (z.punkte >= 70) return { stufe: "gut", text: "Die KI nennt dich in den meisten Fällen. Halte den Stand und miss in 90 Tagen nach." };
    if (z.punkte >= 35) return { stufe: "mittel", text: "Du kommst vor, aber unzuverlässig. Die Ursachen unten sind der Hebel." };
    return { stufe: "schwach", text: "Die KI nennt dich fast nie. Fang oben im Plan an — Daten und Verzeichnisse zuerst." };
  }

  /* --------------------------------------------------------------- Ursachen */

  /* Die fünf Ursachenfelder der Verkaufsseite, mit Gewicht für die Reihenfolge
     im Plan. Höheres Gewicht = wirkt früher und breiter. */
  var URSACHEN = [
    { id: "daten", titel: "Konsistente Firmendaten (NAP)", gewicht: 5,
      frage: "Stehen Name, Adresse und Telefon überall identisch — Website, Google, Verzeichnisse?",
      massnahme: "Schreibweise festlegen und überall angleichen. Eine Abweichung reicht, damit die KI zwei Betriebe sieht." },
    { id: "verzeichnisse", titel: "Einträge in Verzeichnissen", gewicht: 4,
      frage: "Bist du in den Verzeichnissen deiner Branche und deiner Region eingetragen?",
      massnahme: "Die wichtigsten Verzeichnisse deiner Branche eintragen oder beanspruchen." },
    { id: "schema", titel: "Schema-Markup auf der Website", gewicht: 3,
      frage: "Hat deine Website maschinenlesbare Angaben zu Firma, Leistung, Ort und Öffnungszeiten?",
      massnahme: "LocalBusiness-Markup ergänzen, damit die Angaben nicht nur im Fliesstext stehen." },
    { id: "bewertungen", titel: "Bewertungen", gewicht: 3,
      frage: "Hast du aktuelle, echte Bewertungen — und antwortest du darauf?",
      massnahme: "Zufriedene Kund:innen aktiv um eine Bewertung bitten. Nie welche kaufen oder erfinden." },
    { id: "inhalte", titel: "Inhalte zu deinen Leistungen", gewicht: 2,
      frage: "Gibt es auf deiner Website je Leistung eine eigene Seite, die die Frage beantwortet?",
      massnahme: "Je Leistung eine Seite, die genau die Kundenfrage beantwortet — in deren Worten." }
  ];

  /* ------------------------------------------------------------ 90-Tage-Plan */

  /**
   * Baut den 90-Tage-Plan: offene Ursachen zuerst, nach Gewicht sortiert,
   * dann auf Monat 1–3 verteilt. `offen` ist die Menge der Ursachen-IDs,
   * bei denen die Antwort „nein" war.
   */
  function plan(offen) {
    var menge = {};
    (offen || []).forEach(function (id) { menge[id] = true; });
    var punkte = URSACHEN.filter(function (u) { return menge[u.id]; })
      .sort(function (a, b) { return b.gewicht - a.gewicht || a.id.localeCompare(b.id); });
    var monate = [
      { monat: 1, titel: "Monat 1 — Fundament", schritte: [] },
      { monat: 2, titel: "Monat 2 — Sichtbarkeit", schritte: [] },
      { monat: 3, titel: "Monat 3 — Nachmessen", schritte: [] }
    ];
    punkte.forEach(function (u, i) {
      monate[Math.min(i, 1)].schritte.push({ id: u.id, titel: u.titel, massnahme: u.massnahme });
    });
    monate[2].schritte.push({
      id: "nachmessen", titel: "Dieselben Fragen erneut stellen",
      massnahme: "Protokoll ein zweites Mal ausfüllen und die Punktzahl vergleichen."
    });
    return monate;
  }

  var api = { ERGEBNISSE: ERGEBNISSE, DIENSTE: DIENSTE, MUSTER: MUSTER, URSACHEN: URSACHEN,
              fragen: fragen, stand: stand, urteil: urteil, plan: plan };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.AUDIT = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
