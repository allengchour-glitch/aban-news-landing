// Node-Test der Analyse-Engine: node functions/_engine.test.mjs
import { analyze, LEXICON } from "./_engine.mjs";

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
}

// 1) Hype-lastiger Text
const hype = "Unsere revolutionäre, KI-gestützte Lösung ist ein absoluter Game-Changer " +
  "und steigert deinen Umsatz garantiert um 10x — mühelos und im Handumdrehen!!!";
const r1 = analyze(hype);
console.log("\nTest 1 — Hype-Text (Score " + r1.score + ", " + r1.grade + "):");
check("niedriger Score (<50)", r1.score < 50, "score=" + r1.score);
check("findet 'revolutionär'", r1.findings.some((f) => /revolution/i.test(f.match)));
check("findet Game-Changer", r1.findings.some((f) => /game/i.test(f.match)));
check("findet 10x", r1.findings.some((f) => /10/i.test(f.match)));
check("findet Mehrfach-!", r1.findings.some((f) => f.category === "interpunktion"));
check("Hype-Dichte > 0", r1.metrics.hypeDensity > 0, "dichte=" + r1.metrics.hypeDensity);
check("ruleRewrite markiert/streicht", r1.ruleRewrite.includes("[") || r1.ruleRewrite.length < hype.length);
check("Kategorien gefüllt", r1.categories.length >= 3, "cats=" + r1.categories.length);

// 2) Sauberer Anti-Hype-Text
const clean = "Ich schreibe diesen Newsletter jeden Morgen. Er braucht fünf Minuten. " +
  "Du bekommst drei Meldungen, die für deine Arbeit zählen, und einen Tipp zum Mitnehmen. " +
  "Kein Verkauf, kein Tracking. Wenn dir eine Ausgabe nicht passt, schreib mir kurz.";
const r2 = analyze(clean);
console.log("\nTest 2 — sauberer Text (Score " + r2.score + ", " + r2.grade + "):");
check("hoher Score (>=80)", r2.score >= 80, "score=" + r2.score);
check("keine Hype-Funde", r2.metrics.hypeDensity === 0, "dichte=" + r2.metrics.hypeDensity);
check("Lesbarkeit berechnet", r2.metrics.readingGrade !== null, "grade=" + r2.metrics.readingGrade);

// 3) Schachtelsatz
const long = "Wenn du dir vorstellst, dass du an einem ganz normalen Montagmorgen, noch bevor " +
  "der erste Kaffee überhaupt fertig durchgelaufen ist, schon die erste lange Mail beantworten " +
  "musst, die irgendein Kunde am Wochenende geschrieben hat, dann weißt du, wovon ich rede.";
const r3 = analyze(long);
console.log("\nTest 3 — Schachtelsatz (Score " + r3.score + "):");
check("erkennt langen Satz", r3.metrics.longSentenceCount >= 1, "lang=" + r3.metrics.longSentenceCount);
check("hohe Ø-Satzlänge", r3.metrics.avgSentenceLen > 25, "avg=" + r3.metrics.avgSentenceLen);

// 4) Positionen sind valide & nicht überlappend
const r4 = analyze(hype);
let ok = true, prevEnd = -1;
for (const f of r4.findings) {
  if (f.start < prevEnd || f.end <= f.start || hype.slice(f.start, f.end) !== f.match) ok = false;
  prevEnd = f.end;
}
console.log("\nTest 4 — Highlight-Positionen:");
check("Positionen korrekt & überschneidungsfrei", ok);

// 5) Robustheit
console.log("\nTest 5 — Randfälle:");
check("leerer Text wirft nicht", (() => { analyze(""); return true; })());
check("null wirft nicht", (() => { analyze(null); return true; })());
check("sehr kurzer Text gedeckelt", analyze("Hi").score <= 50);

// 6) Backward-Compat: Response-Schema vollständig & unverändert
console.log("\nTest 6 — Schema-Rückwärtskompatibilität:");
const rs = analyze(hype);
for (const k of ["score", "grade", "gradeColor", "verdict", "metrics",
  "findings", "categories", "suggestions", "ruleRewrite"]) {
  check("Top-Feld '" + k + "' vorhanden", k in rs, "fehlt");
}
for (const k of ["wordCount", "charCount", "sentenceCount", "avgSentenceLen",
  "hypeDensity", "readingGrade", "longSentenceCount"]) {
  check("metrics.'" + k + "' vorhanden", k in rs.metrics, "fehlt");
}
const ff = rs.findings[0];
for (const k of ["start", "end", "match", "label", "category", "weight", "replacements"]) {
  check("findings[].'" + k + "' vorhanden", ff && k in ff, "fehlt");
}

// 7) Neue Lexikon-Einträge (DACH-Buzzwords / Versprechen)
console.log("\nTest 7 — erweitertes Lexikon:");
check("Lexikon deutlich gewachsen (>=60)", LEXICON.length >= 60, "n=" + LEXICON.length);
const buzz = analyze("Das ist ein Deep Dive in die Pain Points, wir picken die low hanging fruit. " +
  "Best Practice und Benchmark inklusive, alles zukunftssicher und end-to-end.");
const buzzMatches = buzz.findings.map((f) => f.match.toLowerCase());
check("findet Deep Dive", buzzMatches.some((m) => /deep/.test(m)));
check("findet Pain Point", buzzMatches.some((m) => /pain/.test(m)));
check("findet low hanging fruit", buzzMatches.some((m) => /low hanging/.test(m)));
check("findet Best Practice", buzzMatches.some((m) => /best.?practice/.test(m)));
const prom = analyze("Garantierter Erfolg über Nacht, ohne Vorkenntnisse — das Geheimnis ist ein einfacher Hack.");
const promMatches = prom.findings.map((f) => f.match.toLowerCase());
check("findet 'über Nacht'", promMatches.some((m) => /über.?nacht/.test(m)));
check("findet 'ohne Vorkenntnisse'", promMatches.some((m) => /vorkenntnisse/.test(m)));
check("findet 'Geheimnis'", promMatches.some((m) => /geheim/.test(m)));
check("findet 'Hack'", promMatches.some((m) => /hack/.test(m)));

// 8) Vage Mengenangaben (neue Kategorie)
console.log("\nTest 8 — vage Mengenangaben:");
const vag = analyze("Wir haben viele zufriedene Kunden und zahlreiche Projekte für diverse Branchen umgesetzt.");
check("Kategorie 'vage' vorhanden", vag.categories.some((c) => c.category === "vage"));
const vagF = vag.findings.filter((f) => f.category === "vage").map((f) => f.match.toLowerCase());
check("findet 'viele'", vagF.includes("viele"));
check("findet 'zahlreiche'", vagF.includes("zahlreiche"));
check("findet 'diverse'", vagF.includes("diverse"));
check("vage-Vorschlag erscheint", vag.suggestions.some((s) => /Zahl/.test(s)));

// 9) Nominalstil (neue Kategorie) — nur bei Häufung im selben Satz
console.log("\nTest 9 — Nominalstil:");
const nom = analyze("Die Optimierung der Verarbeitung erfolgt durch die Automatisierung der " +
  "Bereitstellung und die Sicherstellung der Verfügbarkeit.");
check("Kategorie 'nominalstil' vorhanden", nom.categories.some((c) => c.category === "nominalstil"));
const nomHits = nom.findings.filter((f) => f.category === "nominalstil");
check("mehrere Substantivierungen markiert (>=3)", nomHits.length >= 3, "n=" + nomHits.length);
check("markiert 'Optimierung'", nomHits.some((f) => /Optimierung/.test(f.match)));
check("nominalstil-Vorschlag erscheint", nom.suggestions.some((s) => /Verb/.test(s)));
// False-Positive-Schutz: eine einzelne Substantivierung darf NICHT auslösen
const nomSingle = analyze("Diese Lösung funktioniert gut. Wir sind zufrieden. Der Tag war schön.");
check("einzelne Substantivierung löst NICHT aus",
  nomSingle.findings.filter((f) => f.category === "nominalstil").length === 0);

// 10) Lesbarkeits-Label (neues Metrik-Feld, readingGrade bleibt erhalten)
console.log("\nTest 10 — Lesbarkeits-Label:");
check("readingLabel-Feld existiert", "readingLabel" in r2.metrics);
check("readingGrade-Feld weiter vorhanden", "readingGrade" in r2.metrics);
check("sauberer Text -> leicht/mittel",
  ["leicht", "mittel"].includes(r2.metrics.readingLabel), "label=" + r2.metrics.readingLabel);
check("Schachtelsatz -> schwerer Wert",
  ["schwer", "sehr schwer", "mittel"].includes(r3.metrics.readingLabel), "label=" + r3.metrics.readingLabel);
check("zu kurzer Text -> readingLabel null", analyze("Hallo Welt").metrics.readingLabel === null);

// 11) False-Positive-Schutz: sauberer Text bleibt bei ~100, keine neuen Kategorien
console.log("\nTest 11 — kein False-Positive bei sauberem Text:");
const r11 = analyze(clean);
check("sauberer Text weiter Top-Score (>=95)", r11.score >= 95, "score=" + r11.score);
check("keine 'vage'-Kategorie", !r11.categories.some((c) => c.category === "vage"));
check("keine 'nominalstil'-Kategorie", !r11.categories.some((c) => c.category === "nominalstil"));
const cleanSachtext = "Ich teste heute drei Werkzeuge. Jedes prüfe ich an einer echten Aufgabe. " +
  "Danach schreibe ich auf, was funktioniert und was nicht. Du liest das in fünf Minuten.";
const r11b = analyze(cleanSachtext);
check("zweiter sauberer Text >=90", r11b.score >= 90, "score=" + r11b.score);

// 12) Positionen weiter valide bei neuen Kategorien (vage + nominalstil)
console.log("\nTest 12 — Positionen mit neuen Kategorien:");
const mixed = "Viele Kunden schätzen die Optimierung der Verarbeitung, die Automatisierung " +
  "der Bereitstellung und die zahlreiche Sicherstellung der Verfügbarkeit über Nacht.";
const r12 = analyze(mixed);
let ok12 = true, prevEnd12 = -1;
for (const f of r12.findings) {
  if (f.start < prevEnd12 || f.end <= f.start || mixed.slice(f.start, f.end) !== f.match) ok12 = false;
  prevEnd12 = f.end;
}
check("Positionen korrekt & überschneidungsfrei (gemischt)", ok12);
check("enthält vage- und nominalstil-Funde",
  r12.findings.some((f) => f.category === "vage") &&
  r12.findings.some((f) => f.category === "nominalstil"));

// 13) ReDoS / Performance: 20.000 Zeichen müssen schnell durchlaufen
console.log("\nTest 13 — ReDoS / Performance (20k Zeichen):");
const big = ("Die Optimierung der Digitalisierung ist eine Herausforderung über Nacht. ").repeat(400).slice(0, 20000);
const t0 = Date.now();
const rBig = analyze(big);
const dtBig = Date.now() - t0;
check("20k-Zeichen-Analyse < 1000ms", dtBig < 1000, "ms=" + dtBig);
check("liefert gültiges Ergebnis", typeof rBig.score === "number");
const t1 = Date.now();
analyze("a".repeat(20000)); // pathologisch: nur Buchstaben, kein Suffix
const dtPath = Date.now() - t1;
check("pathologische 20k-Eingabe < 1000ms", dtPath < 1000, "ms=" + dtPath);

console.log("\n" + (fail === 0 ? "✅ ALLE TESTS BESTANDEN" : "❌ " + fail + " FEHLER") +
  "  (" + pass + " ok, " + fail + " fehlerhaft)");
process.exit(fail === 0 ? 0 : 1);
