// Umzugs-Paket Schweiz — Rechen-Engine (ohne Oberfläche, in Node testbar).
// Kündigung durch Mieter: Art. 266a–266c OR (3 Monate auf ortsüblichen Termin / Vertrag), Art. 266l (schriftlich),
// Art. 266m (Familienwohnung: Zustimmung des Ehegatten / eingetragenen Partners), Art. 266o (sonst nichtig),
// Art. 264 (vorzeitige Rückgabe: zumutbarer Nachmieter), Art. 267/267a (Rückgabe, Mängelmeldung), Art. 257e (Kaution).
// Den Termin rechnet die geprüfte Mietzins-Engine (naechsterTermin, Zugangsprinzip).
(function (root) {
  "use strict";
  var M = root.MietzinsEngine || (typeof require !== "undefined" ? require("../mietzins/engine.js") : null);

  function d(x) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(x)); var t = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(x); t.setHours(12, 0, 0, 0); return t; }
  function wochenende(x) { var g = d(x).getDay(); return g === 0 || g === 6; }
  function iso(t) { return t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0"); }
  function plusTage(x, n) { var t = d(x); t.setDate(t.getDate() + n); return iso(t); }
  // Arbeitstag davor (Sa/So → Freitag); Feiertage sind kantonal und werden NICHT berücksichtigt
  function werktagDavor(x) { var t = d(x); while (t.getDay() === 0 || t.getDay() === 6) t.setDate(t.getDate() - 1); return iso(t); }

  // Kündigung: zugang = Tag, an dem der Brief beim Vermieter ankommen kann. Empfehlung Postaufgabe: 7 Tage vorher (Puffer).
  function kuendigung(e) {
    var frist = Math.max(3, Math.round(+e.fristMonate || 3));   // Art. 266a/266c: kürzer als 3 Monate nicht vereinbar
    var termine = (e.termine && e.termine.length) ? e.termine : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    var zugang = e.zugang || iso(new Date());
    var t = M.naechsterTermin(zugang, frist, termine);
    if (!t) return null;
    // Wenn heute versendet: Zugang realistisch +2 Tage (A-Post Einschreiben); erst daraus den Termin rechnen
    var r = { frist: frist, termine: termine, termin: t.termin, auszugBis: t.termin, spaetestensZugang: t.spaetestensZugang,
      aufgebenBis: werktagDavor(plusTage(t.spaetestensZugang, -7)), wirksamAb: t.wirksamAb };
    var heute = e.heute || iso(new Date());
    r.warnungen = [];
    if (zugang < heute) r.warnungen.push("zugangVergangen");
    else if (r.aufgebenBis < heute) r.warnungen.push(r.spaetestensZugang < heute ? "zuSpaet" : "knapp");
    if (wochenende(r.spaetestensZugang)) r.warnungen.push("zugangWochenende");
    if (wochenende(r.termin)) r.warnungen.push("terminWochenende");
    // Wie lange noch Miete bis zum Termin (Monate inkl. Monat des Zugangs)
    var a = d(zugang), b = d(t.termin);
    r.monateMiete = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1;
    r.mieteBisTermin = (+e.miete || 0) * r.monateMiete;
    // Vorzeitiger Auszug (Art. 264): gespart, wenn ein Nachmieter ab dem Wunschdatum übernimmt
    if (e.auszug) {
      var w = d(e.auszug);
      if (w < b) {
        // Auszug am 1. eines Monats: dieser Monat ist schon frei; sonst ist er bezahlt
        var monate = (b.getFullYear() - w.getFullYear()) * 12 + (b.getMonth() - w.getMonth()) + (w.getDate() === 1 ? 1 : 0);
        r.vorzeitig = { monate: monate, ersparnis: monate * (+e.miete || 0) };
      } else if (w > b) r.warnungen.push("auszugNachTermin");
    }
    return r;
  }

  // Umzugsplan rückwärts ab Umzugstag. tage < 0 = vor dem Umzug, > 0 = danach.
  var AUFGABEN = [
    { id: "kuendigen", tage: null, titel: "Alte Wohnung kündigen", text: "Schriftlich und unterschrieben (Art. 266l OR), von allen Mietern im Vertrag; bei der Familienwohnung mit Zustimmung des Ehegatten oder eingetragenen Partners (Art. 266m OR). Per Einschreiben, früh genug: Wer die Abholungseinladung bekommt, holt oft erst Tage später ab." },
    { id: "offerten", tage: -60, titel: "Offerten für Umzug einholen", text: "Mindestens drei Offerten: Zügelfirma, Mietwagen oder Helfer. Fix- oder Stundenpreis, Versicherung, Material." },
    { id: "reinigung", tage: -45, titel: "Endreinigung organisieren", text: "Offerte mit Abnahmegarantie, also Nachreinigung inklusive, falls bei der Abgabe etwas beanstandet wird." },
    { id: "ausmisten", tage: -42, titel: "Ausmisten", text: "Was nicht mitkommt: verkaufen, verschenken, Sperrgut-Termine der Gemeinde nachschauen." },
    { id: "parkplatz", tage: -28, titel: "Parkfeld für den Umzugswagen", text: "Bei der Gemeinde oder Polizei eine Bewilligung für Halteverbot oder Parkfeld beantragen, an beiden Adressen." },
    { id: "post", tage: -21, titel: "Nachsendeauftrag bei der Post", text: "Online bei der Post, gilt ab Umzugstag. Kostet je nach Dauer." },
    { id: "strom", tage: -14, titel: "Strom, Internet, TV ummelden", text: "Zählerstand am Auszugstag notieren. Internet-Umzug früh anmelden, Anschlüsse brauchen oft zwei Wochen." },
    { id: "adressen", tage: -10, titel: "Adressänderungen verschicken", text: "Arbeitgeber, Bank, Krankenkasse, Versicherungen, Abos. Liste im Paket abhaken." },
    { id: "kartons", tage: -7, titel: "Packen nach Zimmern", text: "Kartons beschriften: Zimmer und Inhalt. Eine Kiste für die erste Nacht: Werkzeug, Bettwäsche, Ladekabel, Medikamente." },
    { id: "protokoll", tage: -1, titel: "Wohnungsabgabe vorbereiten", text: "Abgabeprotokoll vom Einzug hervorholen. Alle Schlüssel zählen, auch Briefkasten und Keller." },
    { id: "abmelden", tage: -5, titel: "Bei der alten Gemeinde abmelden", text: "Persönlich, online (eUmzug, wo angeboten) oder per Formular. Manche Gemeinden verlangen die Abmeldung vor dem Wegzug." },
    { id: "umzug", tage: 0, titel: "Umzugstag", text: "Zählerstände an beiden Adressen fotografieren. Schäden beim Ausladen sofort mit Foto festhalten." },
    { id: "abgabe", tage: null, titel: "Wohnungsabgabe", text: "Mit dem Vermieter durchgehen. Nur unterschreiben, was stimmt. Der Vermieter muss Mängel sofort melden (Art. 267a OR)." },
    { id: "gemeinde", tage: 3, titel: "Bei der neuen Gemeinde anmelden", text: "Persönlich oder online (eUmzug, wo angeboten), mit Ausweis, Mietvertrag und Krankenkassen-Nachweis. Die Frist regelt der Kanton, meist 14 Tage." },
    { id: "verkehr", tage: 5, titel: "Strassenverkehrsamt: neue Adresse", text: "Führer- und Fahrzeugausweis brauchen die neue Adresse, auch bei einem Umzug innerhalb des Kantons, meist innert 14 Tagen. Bei Kantonswechsel gibt es neue Kontrollschilder." },
    { id: "kasse", tage: 7, titel: "Krankenkasse: neue Prämienregion", text: "Die Prämie hängt vom Wohnort ab. Neue Adresse melden, bei Kantonswechsel kann sich die Prämie ändern." },
    { id: "kaution", tage: 30, titel: "Mietkaution zurückfordern", text: "Freigabe beim Vermieter verlangen. Hat er innert eines Jahres nach Mietende nichts rechtlich geltend gemacht, zahlt die Bank dir die Kaution auf Verlangen aus (Art. 257e OR). Bei einer Mietkautionsversicherung gilt das nicht: dort die Police beim Versicherer kündigen." }
  ];

  function plan(umzug, kuend, abgabe) {
    return AUFGABEN.map(function (a) {
      var datum = a.id === "kuendigen" ? (kuend ? kuend.aufgebenBis : null)
        : a.id === "abgabe" ? (abgabe || (kuend ? kuend.termin : umzug))
        : plusTage(umzug, a.tage);
      return { id: a.id, titel: a.titel, text: a.text, datum: datum };
    }).sort(function (x, y) { return (x.datum || "9") < (y.datum || "9") ? -1 : 1; });
  }

  var api = { kuendigung: kuendigung, plan: plan, AUFGABEN: AUFGABEN, werktagDavor: werktagDavor, plusTage: plusTage, wochenende: wochenende };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.UmzugEngine = api;
})(this);
