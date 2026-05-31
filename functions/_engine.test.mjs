// Node-Test der Analyse-Engine: node functions/_engine.test.mjs
import { analyze } from "./_engine.mjs";

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

console.log("\n" + (fail === 0 ? "✅ ALLE TESTS BESTANDEN" : "❌ " + fail + " FEHLER") +
  "  (" + pass + " ok, " + fail + " fehlerhaft)");
process.exit(fail === 0 ? 0 : 1);
