// Node-Test der AEO-Analyse-Engine: node functions/_aeo-engine.test.mjs
import { analyze } from "./_aeo-engine.mjs";

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name + (extra ? "  → " + extra : "")); }
}

// ---------------------------------------------------------------------------
// 1) Gut optimierte Seite (Answer-first, FAQ-Schema, H1/H2, Listen, JSON-LD)
// ---------------------------------------------------------------------------
const goodHtml = `<!DOCTYPE html>
<html lang="de">
<head>
  <title>Steuerberatung für Selbstständige in Bern — Klartext-Kanzlei</title>
  <meta name="description" content="Wir machen die Steuererklärung für Selbstständige in Bern in der Regel innerhalb von zwei Wochen fertig. Feste Preise, klare Termine.">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Was kostet die Steuererklärung?","acceptedAnswer":{"@type":"Answer","text":"Ab 250 Franken."}}]}
  </script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"LocalBusiness","name":"Klartext-Kanzlei"}
  </script>
</head>
<body>
  <h1>Steuerberatung für Selbstständige in Bern</h1>
  <p>Wir erledigen deine Steuererklärung in der Regel in zwei Wochen zum Festpreis. Du schickst die Belege, wir kümmern uns um den Rest und melden uns mit dem fertigen Ergebnis.</p>
  <h2>Was kostet die Steuererklärung?</h2>
  <p>Eine einfache Steuererklärung beginnt bei 250 Franken. Den genauen Preis nennen wir vor Beginn.</p>
  <ul><li>Belege sammeln</li><li>Termin buchen</li><li>Ergebnis erhalten</li></ul>
  <h2>Wie lange dauert die Bearbeitung?</h2>
  <p>In der Regel zwei Wochen ab Eingang der Unterlagen.</p>
  <h2>Für wen eignet sich das Angebot?</h2>
  <p>Für Selbstständige und kleine Firmen in der Region Bern.</p>
  <table><tr><td>Paket</td><td>Preis</td></tr></table>
</body>
</html>`;
const g = analyze(goodHtml);
console.log("\nTest 1 — Gut optimierte Seite (Score " + g.score + ", " + g.grade + "):");
check("hoher Score (>=75)", g.score >= 75, "score=" + g.score);
check("erkennt HTML", g.inputType === "html");
check("genau eine H1", g.metrics.h1Count === 1, "h1=" + g.metrics.h1Count);
check("mehrere H2", g.metrics.h2Count >= 3, "h2=" + g.metrics.h2Count);
check("FAQ-Schema erkannt", g.metrics.hasFaqSchema === true);
check("Frage-Überschriften gezählt", g.metrics.questionHeadings >= 2, "fragen=" + g.metrics.questionHeadings);
check("JSON-LD-Blöcke gezählt", g.metrics.jsonLdBlocks === 2, "blocks=" + g.metrics.jsonLdBlocks);
check("Liste erkannt", g.metrics.listCount >= 1);
check("Tabelle erkannt", g.metrics.tableCount >= 1);
check("Antwort-zuerst ok", g.metrics.answerFirst === true);
check("Title vorhanden", g.metrics.hasTitle === true);
check("Meta-Description vorhanden", g.metrics.hasMetaDesc === true);
check("7 Kategorien bewertet", g.categories.length === 7, "cats=" + g.categories.length);
check("Kategorie-Maxsumme = 100", g.categories.reduce((s, c) => s + c.max, 0) === 100);

// ---------------------------------------------------------------------------
// 2) Schwache Seite (keine H1, kein Schema, Floskel-Einstieg, kein FAQ)
// ---------------------------------------------------------------------------
const weakHtml = `<html>
<head><title>Start</title></head>
<body>
<p>In diesem Artikel möchten wir Ihnen unser ganzheitliches und innovatives Leistungsspektrum vorstellen, das im Rahmen einer umfassenden Betrachtung sämtlicher Anforderungen unter Berücksichtigung der individuellen Gegebenheiten unserer geschätzten Kundschaft eine maßgeschneiderte Begleitung über den gesamten Prozess hinweg ermöglicht.</p>
<p>Wir freuen uns über Ihren Besuch und stehen jederzeit zur Verfügung.</p>
</body>
</html>`;
const w = analyze(weakHtml);
console.log("\nTest 2 — Schwache Seite (Score " + w.score + ", " + w.grade + "):");
check("niedriger Score (<55)", w.score < 55, "score=" + w.score);
check("keine H1 erkannt", w.metrics.h1Count === 0);
check("kein FAQ-Schema", w.metrics.hasFaqSchema === false);
check("Antwort-zuerst NICHT ok", w.metrics.answerFirst === false);
check("Empfehlungen vorhanden", w.recommendations.length >= 3, "recs=" + w.recommendations.length);
check("mindestens eine hoch-Empfehlung", w.recommendations.some((r) => r.severity === "hoch"));
check("Empfehlungen nach Schwere sortiert", (() => {
  const rank = { hoch: 0, mittel: 1, niedrig: 2 };
  for (let i = 1; i < w.recommendations.length; i++)
    if (rank[w.recommendations[i - 1].severity] > rank[w.recommendations[i].severity]) return false;
  return true;
})());

// ---------------------------------------------------------------------------
// 3) Reiner Text (kein HTML) — Struktur-Checks fallen weich aus
// ---------------------------------------------------------------------------
const plain = "Die Lieferung kommt in der Regel innerhalb von drei Werktagen an. " +
  "Du bekommst eine Sendungsnummer per E-Mail. Bei Fragen meldest du dich kurz, " +
  "und wir klären das am selben Tag. Eine Rücksendung ist 30 Tage lang möglich.";
const p = analyze(plain);
console.log("\nTest 3 — Reiner Text (Score " + p.score + ", " + p.grade + "):");
check("erkennt Text (nicht HTML)", p.inputType === "text");
check("Wörter gezählt", p.metrics.wordCount > 20, "words=" + p.metrics.wordCount);
check("keine H1 im Text", p.metrics.h1Count === 0);
check("Lesbarkeit berechnet", p.metrics.readingGrade !== null, "grade=" + p.metrics.readingGrade);

// ---------------------------------------------------------------------------
// 4) JSON-LD-Validierung: defektes Schema senkt Punkte / erzeugt Empfehlung
// ---------------------------------------------------------------------------
const brokenLd = `<html lang="de"><head><title>Test Seite Titel hier</title>
<script type="application/ld+json">{ kaputt: nicht valides json, }</script></head>
<body><h1>Frage</h1><p>Eine klare Antwort steht direkt hier im ersten Satz.</p></body></html>`;
const b = analyze(brokenLd);
console.log("\nTest 4 — Defektes JSON-LD (Score " + b.score + "):");
check("JSON-LD-Block gezählt", b.metrics.jsonLdBlocks === 1);
check("Empfehlung zu defektem Schema", b.recommendations.some((r) => r.category === "strukturierte-daten" && r.severity === "hoch"));

const validLdTypes = `<html lang="de"><head><title>Eine gute Beispielseite Titel</title>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"X"},{"@type":"Article","headline":"Y"}]}</script>
</head><body><h1>Test</h1><p>Direkte Aussage gleich im ersten Satz dieser Seite.</p></body></html>`;
const v = analyze(validLdTypes);
check("Schema-Typen aus @graph erkannt (gute Bewertung)", v.categories.find((c) => c.key === "strukturierte-daten").points >= 12,
  "pts=" + v.categories.find((c) => c.key === "strukturierte-daten").points);

// ---------------------------------------------------------------------------
// 5) noindex → Empfehlung + Punktabzug bei Meta
// ---------------------------------------------------------------------------
const noindex = `<html lang="de"><head><title>Versteckte Seite Titel hier lang</title>
<meta name="robots" content="noindex, follow"></head>
<body><h1>Test</h1><p>Direkte klare Antwort im ersten Satz dieser Testseite.</p></body></html>`;
const ni = analyze(noindex);
console.log("\nTest 5 — noindex:");
check("noindex erzeugt hoch-Empfehlung", ni.recommendations.some((r) => r.category === "meta" && r.severity === "hoch"));

// ---------------------------------------------------------------------------
// 6) Robustheit / Randfälle
// ---------------------------------------------------------------------------
console.log("\nTest 6 — Randfälle:");
check("leerer Text wirft nicht", (() => { analyze(""); return true; })());
check("null wirft nicht", (() => { analyze(null); return true; })());
check("undefined wirft nicht", (() => { analyze(undefined); return true; })());
check("kurzer Text -> tooShort-Flag", analyze("Kurz.").metrics.tooShort === true);
check("Score immer 0..100", (() => {
  for (const t of ["", "x", goodHtml, weakHtml, plain]) {
    const s = analyze(t).score;
    if (s < 0 || s > 100 || !Number.isFinite(s)) return false;
  }
  return true;
})());
check("Score deterministisch", analyze(goodHtml).score === analyze(goodHtml).score);
check("HTML-Entities werden dekodiert", analyze("<html lang=\"de\"><body><p>Preis &amp; Leistung sind klar.</p></body></html>").metrics.wordCount >= 4);
check("Script-Inhalt zählt nicht als Text", (() => {
  const r = analyze("<html><body><script>var x = 'sehr viele wörter hier drin versteckt blabla'</script><p>Kurz hier.</p></body></html>");
  return r.metrics.wordCount < 6;
})());

// ---------------------------------------------------------------------------
// 7) Antwort-zuerst-Heuristik feinkörnig
// ---------------------------------------------------------------------------
console.log("\nTest 7 — Answer-first-Heuristik:");
check("Floskel-Auftakt = nicht answer-first",
  analyze("In diesem Artikel zeigen wir dir alles über das Thema im Detail Schritt für Schritt.").metrics.answerFirst === false);
check("direkte Aussage = answer-first",
  analyze("Die Bearbeitung dauert zwei Wochen. Danach bekommst du das Ergebnis per Mail zugeschickt.").metrics.answerFirst === true);
check("nur eine reine Frage = nicht answer-first",
  analyze("Was kostet eine Steuererklärung?").metrics.answerFirst === false);

// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(48));
console.log(pass + " bestanden, " + fail + " fehlgeschlagen.");
if (fail > 0) process.exit(1);
