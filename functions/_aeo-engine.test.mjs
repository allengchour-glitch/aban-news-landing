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
// 8) Inhalt statt Rahmen — der Fehler, der 234 von 270 eigenen Seiten falsch bewertete
//    (gemessen 2026-09-03). Titel, Menü und Brotkrume enden ohne Punkt und klebten
//    deshalb am ersten Inhaltssatz; gemessen wurde der Rahmen, nicht der Text.
// ---------------------------------------------------------------------------
console.log("\nTest 8 — Inhalt statt Seitenrahmen:");

const SEITE = `<html><head><title>Dreirad kaufen Schweiz 2026 — Kinderdreirad, EN 71 & Mitwachs | aban</title>
<meta name="description" content="Kinderdreirad nach Alter, Mitwachs und EN 71 auswaehlen."></head><body>
<nav class="topnav"><a href="/">aban</a><ul><li><a href="/m">Marktplatz</a></li><li><a href="/j">Jobs</a></li></ul></nav>
<nav class="bc"><a href="/">Start</a> › <a href="/k">Kaufberater</a> › Dreirad kaufen Schweiz</nav>
<header><h1>Dreirad kaufen Schweiz 2026 — Kinderdreirad, EN 71 und Mitwachs im Vergleich</h1></header>
<main><p>Dreiraeder mit Schiebestange passen ab 12 Monaten. Eigenstaendiges
Treten gelingt den meisten Kindern ab 2 Jahren.</p>
<h2>Ab wann ist ein Dreirad sinnvoll?</h2><p>Ab 12 Monaten mit Schiebestange.</p>
<h2>Was kostet ein gutes Modell?</h2><p>Zwischen 80 und 200 Franken.</p></main>
<footer><p>Impressum Datenschutz Kontakt</p></footer></body></html>`;

const seite = analyze(SEITE);
check("Erster Satz ist der Inhalt, nicht Titel/Menue/Brotkrume", seite.metrics.answerFirst === true);
check("Menue-Woerter zaehlen nicht als Text", !/Marktplatz|Brotkrume|Impressum/.test(JSON.stringify(seite.metrics)));
check("Zeilenumbruch im Quelltext ist keine Satzgrenze", seite.metrics.sentenceCount === 6);
check("Ein Absatz mit fuenf Quelltext-Umbruechen bleibt EIN Satz", (() => {
  /* Entscheidender Fall: mit dem alten Verhalten waeren das 6 „Saetze" à 3 Woertern —
     Satzzahl und Ø-Satzlaenge, und damit die Lesbarkeits-Note, waren dann falsch. */
  const r = analyze(`<html><body><main><p>Der Beitrag betraegt
    zwoelf Franken pro
    Monat und ist
    jederzeit auf das
    Monatsende hin kuendbar
    ohne weitere Fristen.</p></main></body></html>`);
  return r.metrics.sentenceCount === 1 && r.metrics.wordCount === 18;
})());
check("Menue-Liste ist keine Inhaltsliste", seite.metrics.listCount === 0);
check("Ueberschrift ohne Satzzeichen klebt nicht am naechsten Absatz", (() => {
  /* Der Kern des Fehlers: Block-Elemente enden meist OHNE Punkt. Ohne Block-Grenze
     verschmelzen Ueberschrift und Absatz zu einem 31-Woerter-Satz — und die Engine
     meldet faelschlich „Erster Satz ist sehr lang". */
  const html = `<html><body><main><h2>Alles zum Kinderdreirad im Ueberblick</h2>
    <p>Ein gutes Modell kostet zwischen achtzig und zweihundert Franken und begleitet ein Kind
    ungefaehr drei bis vier Jahre lang zuverlaessig durch den ganzen Alltag.</p></main></body></html>`;
  const r = analyze(html);
  /* Ueberschrift zaehlt nicht als Fliesstext (kein Satzzeichen) -> 1 Prosa-Satz.
     Ohne Block-Grenze waeren Ueberschrift + Absatz EIN Satz mit 27 Woertern -> „sehr lang". */
  return r.metrics.answerFirst === true && r.metrics.sentenceCount === 1
    && !r.categories.find((c) => c.key === "antwort-zuerst").detail.includes("sehr lang");
})());
check("Lesbarkeit misst Fliesstext, nicht Tabellenzellen", (() => {
  /* Zwoelf kurze Zellen + ein langer Satz: die Zellen duerfen die Ø-Satzlaenge nicht
     auf ein Drittel druecken (gemessen an dreirad-kaufen-schweiz.html: 5,1 statt 10,1). */
  const zellen = Array.from({ length: 12 }, (_, i) => `<td>Wert ${i}</td>`).join("");
  const r = analyze(`<html><body><main><table><tr>${zellen}</tr></table>
    <p>Die Anmeldung dauert zwei Minuten und danach steht das Konto bereit, sodass du sofort
    mit der Einrichtung deiner ersten Kampagne beginnen kannst.</p></main></body></html>`);
  return r.metrics.sentenceCount === 1 && r.metrics.avgSentenceLen >= 20;
})());
check("Antwort-zuerst wird voll bepunktet",
  seite.categories.find((c) => c.key === "antwort-zuerst").points >= 12);
check("kein falscher Rat mehr zu 'erster Satz'",
  !seite.recommendations.some((r) => r.category === "antwort-zuerst" && r.severity === "hoch"));

check("Leeres <main> (App-Geruest) faellt auf das Dokument zurueck", (() => {
  const r = analyze(`<html><body><nav>Menue</nav><main><div id="app"></div></main>
    <div><p>Die Anmeldung dauert zwei Minuten. Danach steht das Konto bereit und du kannst starten.</p></div></body></html>`);
  return r.metrics.wordCount > 10 && r.metrics.answerFirst === true;
})());

check("<article> wird genutzt, wenn kein <main> da ist", (() => {
  const r = analyze(`<html><body><nav><a>Start</a><a>Blog</a></nav><article><p>Die Frist endet am 31. Maerz.
    Wer spaeter einreicht, zahlt eine Gebuehr von 50 Franken pro angefangenem Monat und riskiert eine Mahnung.</p></article></body></html>`);
  return r.metrics.answerFirst === true && !/Blog/.test(JSON.stringify(r.metrics));
})());

check("Inhalt ohne <main>/<article>: nav und footer fliegen raus", (() => {
  const r = analyze(`<html><body><nav><a>aban</a><a>Jobs</a></nav>
    <p>Der Beitrag betraegt 12 Franken pro Monat. Kuendbar ist er jederzeit auf Monatsende.</p>
    <footer><p>Impressum</p></footer></body></html>`);
  return r.metrics.answerFirst === true;
})());

// ---------------------------------------------------------------------------
// 9) Navigation IM Inhalt, Etiketten und kurze Antworten (gemessen 2026-09-03)
// ---------------------------------------------------------------------------
console.log("\nTest 9 — Navigation im Inhalt, Etiketten, kurze Antworten:");

check("Brotkrume IM <main> zaehlt nicht als Inhalt", (() => {
  /* 157 eigene Seiten tragen Brotkrume oder Ruecklink INNERHALB von <main>. Wer nav nur
     ausserhalb entfernt, misst weiter die Navigation: beratung.html bekam 3/18, obwohl
     ihr Einstieg direkt antwortet. */
  const r = analyze(`<html><body><main><nav aria-label="Brotkrume"><p><a href="/">Startseite</a> › <a href="/x">Alle Angebote und Leistungen</a> › <span>Beratung</span></p></nav>
    <h1>Beratung und KI-Setup</h1>
    <p>Ich helfe Selbststaendigen, KI praktisch einzufuehren. Kein Buzzword-Bingo, sondern konkrete Ablaeufe,
    die nach dem Termin wirklich laufen und die du selbst anpassen kannst, ohne auf eine Agentur zu warten.</p></main></body></html>`);
  /* ⚠️ Der Inhalt MUSS ueber 200 Zeichen liegen, sonst greift der Rueckfall aufs ganze
     Dokument — der entfernt nav ohnehin, und die Pruefung liefe ins Leere (genau so
     passiert: Sabotage „nav im main mitlesen" blieb gruen). Jetzt 32 Woerter Inhalt;
     die sechs Woerter der Brotkrume duerfen nicht mitzaehlen. */
  return r.metrics.answerFirst === true && r.metrics.wordCount === 32;
})());

check("Ueberschrift ist ein Etikett, kein Antwortsatz", (() => {
  /* Rechner-Seiten beginnen mit einer zweiwoertrigen H1 („Farben umrechnen"). Der Satz
     darunter ist die eigentliche Antwort — der wird bewertet. */
  /* Ein-Wort-Ueberschrift: als „Satz" gelesen faellt sie durch (zu kurz), als Etikett
     erkannt zaehlt der Absatz darunter. */
  const r = analyze(`<html><body><main><h1>Farben</h1>
    <p>HEX, RGB und HSL rechnen sich hier ineinander um, mit Vorschau und Werten zum Kopieren.</p>
    </main></body></html>`);
  return r.metrics.answerFirst === true;
})());

check("Kurzer, direkter Einstieg zaehlt (3 Woerter)", (() => {
  /* „Viel ist kostenlos." und „Ich bin Aban." sind die besten denkbaren Anfaenge und
     fielen an der alten Untergrenze von vier Woertern durch. */
  const r = analyze(`<html><body><main><p>Viel ist kostenlos. Die Bezahl-Produkte sind fair und ohne Hype.</p></main></body></html>`);
  return r.metrics.answerFirst === true;
})());

check("GEGENPROBE: Floskel bleibt Floskel", (() => {
  const r = analyze(`<html><body><main><p>Willkommen auf unserer Seite. Hier finden Sie alles rund um unser Angebot.</p></main></body></html>`);
  return r.metrics.answerFirst === false;
})());

check("GEGENPROBE: blosse Frage ohne Antwort bleibt durchgefallen", (() => {
  const r = analyze(`<html><body><main><h1>Preise</h1><p>Was kostet eine Steuererklaerung?</p></main></body></html>`);
  return r.metrics.answerFirst === false;
})());

check("GEGENPROBE: sehr langer erster Satz bleibt durchgefallen", (() => {
  const lang = "Wir sind ein Unternehmen das seit vielen Jahren im Bereich der ganzheitlichen Beratung taetig ist und dabei stets darauf achtet die individuellen Beduerfnisse jedes einzelnen Kunden umfassend zu beruecksichtigen.";
  const r = analyze(`<html><body><main><p>${lang}</p></main></body></html>`);
  return r.metrics.answerFirst === false;
})());

check("Ueberschriften in einer Skript-Zeichenkette zaehlen nicht", (() => {
  /* ai-sichtbarkeit.html traegt Beispiel-HTML in einem <script> (Demo des Checks) und
     bekam dafuer „2 H1" und fuenf Frage-Ueberschriften angerechnet, die kein Leser sieht. */
  const r = analyze(`<html><body><main><h1>Echte Seite</h1>
    <p>Der Check misst, wie gut eine Seite fuer Antwort-Maschinen aufgestellt ist.</p>
    <script>const BEISPIEL = "<h1>Demo-Kanzlei</h1><h2>Was kostet es?</h2><h2>Wie lange dauert es?</h2>";</script>
    </main></body></html>`);
  return r.metrics.h1Count === 1 && r.metrics.questionHeadings === 0;
})());

// ---------------------------------------------------------------------------
console.log("\n" + "=".repeat(48));
console.log(pass + " bestanden, " + fail + " fehlgeschlagen.");
if (fail > 0) process.exit(1);
