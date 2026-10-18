const E = require(process.argv[2] || __dirname + "/engine.js");
const ok = (c, t) => { console.log((c ? "✅ " : "❌ ") + t); if (!c) process.exitCode = 1; };

/* ----------------------------------------------------------------- Fragen */
let f = E.fragen("Malerarbeiten", "Bern");
ok(f.length === 12 && f.length >= 10, `${f.length} Fragen (die Seite verspricht 10–15)`);
ok(f.every(q => !q.includes("{")), "keine Platzhalter übrig, wenn beides gesetzt ist");
ok(f[0] === "Wer bietet Malerarbeiten in Bern an?", "erste Frage wörtlich korrekt");
ok(new Set(f).size === f.length, "keine doppelte Frage");
// Gegenprobe: ohne Angaben bleiben die Platzhalter sichtbar statt etwas zu erfinden.
let leer = E.fragen("", "");
ok(leer.every(q => q.includes("{leistung}") || q.includes("{ort}")), "ohne Eingabe bleiben Platzhalter stehen");
ok(E.fragen("  Malerarbeiten  ", " Bern ")[0] === f[0], "Leerzeichen am Rand werden entfernt");
// Eine Leistung, die wie ein Platzhalter aussieht, darf nichts kaputt machen.
ok(E.fragen("{ort}", "Bern")[0] === "Wer bietet {ort} in Bern an?", "Eingabe wird nicht erneut ersetzt");

/* ------------------------------------------------------------------ Stand */
const z0 = E.stand([]);
ok(z0.gezaehlt === 0 && z0.punkte === 0, "leeres Protokoll: 0 gezählt, 0 Punkte");
ok(E.urteil(z0) === null, "ohne Daten kein Urteil (statt einer erfundenen Note)");

const alleGenannt = Array.from({length: 6}, () => ({dienst: "ChatGPT", ergebnis: "genannt"}));
ok(E.stand(alleGenannt).punkte === 100, "nur „genannt“ → 100 Punkte");

const alleMitbewerber = Array.from({length: 6}, () => ({dienst: "ChatGPT", ergebnis: "mitbewerber"}));
ok(E.stand(alleMitbewerber).punkte === 0, "nur „Mitbewerber genannt“ → 0 Punkte");

// Die wichtigste Gegenprobe: „Mitbewerber genannt“ muss SCHLECHTER zählen als
// „niemand genannt“ — die KI hatte eine Antwort, nur nicht deine.
const nurNicht = Array.from({length: 6}, () => ({dienst: "ChatGPT", ergebnis: "nicht"}));
ok(E.stand(nurNicht).punkte > E.stand(alleMitbewerber).punkte,
   `„nicht genannt“ (${E.stand(nurNicht).punkte}) besser als „Mitbewerber“ (${E.stand(alleMitbewerber).punkte})`);

const offen = E.stand([{dienst:"ChatGPT", ergebnis:"offen"}, {dienst:"ChatGPT", ergebnis:"genannt"}]);
ok(offen.offen === 1 && offen.gezaehlt === 1 && offen.punkte === 100,
   "noch nicht beantwortete Zeilen verwässern die Punktzahl nicht");

const muell = E.stand([{dienst:"ChatGPT", ergebnis:"vielleicht"}, {}, null, {dienst:"X", ergebnis:"genannt"}]);
ok(muell.gezaehlt === 1 && muell.punkte === 100, "unbekannte Werte werden ignoriert, nicht geraten");

const jeDienst = E.stand([
  {dienst:"ChatGPT", ergebnis:"genannt"}, {dienst:"ChatGPT", ergebnis:"nicht"},
  {dienst:"Perplexity", ergebnis:"genannt"}]);
ok(jeDienst.jeDienst.ChatGPT.gezaehlt === 2 && jeDienst.jeDienst.ChatGPT.genannt === 1
   && jeDienst.jeDienst.Perplexity.genannt === 1, "Auswertung je KI-Dienst stimmt");

ok(E.stand(undefined).gezaehlt === 0, "kein Protokoll übergeben → kein Absturz");

/* ----------------------------------------------------------------- Urteil */
ok(E.urteil(E.stand(alleGenannt)).stufe === "gut", "100 Punkte → gut");
ok(E.urteil(E.stand(alleMitbewerber)).stufe === "schwach", "0 Punkte → schwach");
const mittel = E.stand([{dienst:"ChatGPT",ergebnis:"genannt"},{dienst:"ChatGPT",ergebnis:"mitbewerber"}]);
ok(E.urteil(mittel).stufe === "mittel", `50 Punkte → mittel (ist: ${E.urteil(mittel).stufe})`);
// Grenzen genau: 70 ist noch „gut“, 69 nicht mehr; 35 noch „mittel“, 34 nicht.
const beiPunkten = p => E.urteil({gezaehlt: 1, punkte: p}).stufe;
ok(beiPunkten(70) === "gut" && beiPunkten(69) === "mittel", "Grenze 70 liegt richtig");
ok(beiPunkten(35) === "mittel" && beiPunkten(34) === "schwach", "Grenze 35 liegt richtig");

/* ------------------------------------------------------------ 90-Tage-Plan */
const alle = E.URSACHEN.map(u => u.id);
const p = E.plan(alle);
ok(p.length === 3, "Plan hat drei Monate");
ok(p[0].schritte[0].id === "daten", "wichtigste Ursache (NAP-Daten) steht zuoberst");
ok(p[2].schritte.some(s => s.id === "nachmessen"), "Monat 3 enthält immer das Nachmessen");
const flach = p.flatMap(m => m.schritte.map(s => s.id));
ok(alle.every(id => flach.includes(id)), "keine offene Ursache fällt aus dem Plan");
ok(new Set(flach).size === flach.length, "keine Massnahme steht doppelt im Plan");
// Gegenprobe: ist nichts offen, enthält der Plan NUR das Nachmessen — keine
// erfundene Arbeit für einen Betrieb, der schon alles hat.
const leerPlan = E.plan([]);
ok(leerPlan.flatMap(m => m.schritte).length === 1, "ohne offene Ursache bleibt nur das Nachmessen");
ok(E.plan(["gibtsnicht"]).flatMap(m => m.schritte).length === 1, "unbekannte Ursachen-ID erzeugt keinen Schritt");
ok(E.plan(undefined).length === 3, "kein Argument → kein Absturz");
// Reihenfolge folgt dem Gewicht, nicht der Eingabereihenfolge.
const umgekehrt = E.plan(["inhalte", "daten"]).flatMap(m => m.schritte.map(s => s.id));
ok(umgekehrt[0] === "daten", "Reihenfolge nach Gewicht, nicht nach Eingabe");

/* ------------------------------------------------------------- Stammdaten */
ok(E.URSACHEN.length === 5, "fünf Ursachenfelder wie auf der Verkaufsseite");
ok(E.URSACHEN.every(u => u.frage && u.massnahme && u.titel), "jedes Ursachenfeld hat Frage und Massnahme");
ok(E.DIENSTE.length === 3, "drei KI-Dienste wie versprochen");
