#!/usr/bin/env node
// AEO-Audit-Report-Generator — erzeugt den kundenreifen Audit für den
// AI-Sichtbarkeit-Service. Du gibst eine URL ein, bekommst den fertigen Report
// (Markdown) in Sekunden — das ist die Fulfillment-Arbeit, die du sonst von Hand
// machst (€300-900-Audit).
//
// Aufruf:
//   node tools/aeo-report.mjs https://kunde.de            # Report auf stdout
//   node tools/aeo-report.mjs https://kunde.de > audit.md # in Datei
//   node tools/aeo-report.mjs --html seite.html           # lokale Datei statt URL
//
// Markdown → PDF: z. B. `pandoc audit.md -o audit.pdf` (oder im Editor exportieren).
//
// Ehrlich: nutzt nur echte Mess-Werte der Engine (functions/_aeo-engine.mjs),
// erfindet keine Zahlen, verspricht keine Platzierung.

import { analyze } from "../functions/_aeo-engine.mjs";
import { readFileSync } from "node:fs";

const UA = "aban-aeo-report/1.0 (+https://abannews.com/ai-sichtbarkeit.html)";
const args = process.argv.slice(2);
const fileFlag = args.indexOf("--html");
const input = fileFlag > -1 ? args[fileFlag + 1] : args.find(a => a.startsWith("http"));

if (!input) {
  console.error("Bitte eine URL oder --html <datei> angeben.");
  process.exit(1);
}

async function getHtml() {
  if (fileFlag > -1) return readFileSync(input, "utf8");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(input, { headers: { "User-Agent": UA }, redirect: "follow", signal: ctrl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return (await res.text()).slice(0, 200000);
  } finally { clearTimeout(t); }
}

const SEV = { hoch: "🔴 Hoch", mittel: "🟡 Mittel", niedrig: "🟢 Niedrig" };
const SEV_RANK = { hoch: 0, mittel: 1, niedrig: 2 };
const yn = b => (b ? "ja" : "**nein**");

function report(url, r) {
  const m = r.metrics || {};
  const today = new Date().toLocaleDateString("de-CH");
  const recs = (r.recommendations || []).slice().sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);

  const cats = (r.categories || []).map(c =>
    `| ${c.label} | ${c.points}/${c.max} | ${c.status} | ${c.detail || ""} |`).join("\n");

  const recList = recs.map((x, i) =>
    `${i + 1}. **[${SEV[x.severity] || x.severity}]** ${x.text}`).join("\n");

  return `# AI-Sichtbarkeits-Audit

**Geprüfte Seite:** ${url}
**Datum:** ${today}
**Geprüft mit:** aban-news AI-Sichtbarkeits-Check

---

## Gesamt-Ergebnis: ${r.score}/100 — „${r.grade}"

${r.verdict || ""}

> **Worum es geht:** Immer mehr Menschen suchen über KI-Antwortmaschinen
> (ChatGPT, Perplexity, Google AI Overviews). Diese zitieren bevorzugt Seiten,
> die klar strukturiert und direkt beantwortbar sind. Dieser Audit misst, wie
> gut deine Seite dafür aufgestellt ist (AEO/GEO-Reife).

## Detailbewertung

| Bereich | Punkte | Status | Befund |
|---------|:------:|--------|--------|
${cats}

## Prioritäre Maßnahmen (was zuerst, was am meisten bringt)

${recList || "_Keine kritischen Lücken gefunden._"}

## Technische Kennzahlen

- **Überschriften:** ${m.h1Count} × H1, ${m.h2Count} × H2 (davon ${m.questionHeadings} als Frage formuliert)
- **Strukturierte Daten (schema.org):** ${m.jsonLdBlocks} Block/Blöcke · FAQ-Schema: ${yn(m.hasFaqSchema)}
- **Title-Tag:** ${yn(m.hasTitle)} · **Meta-Description:** ${yn(m.hasMetaDesc)}
- **Antwort-zuerst (direkte Aussage im ersten Satz):** ${yn(m.answerFirst)}
- **Listen / Tabellen:** ${m.listCount} / ${m.tableCount}
- **Textlänge:** ${m.wordCount} Wörter · Lesbarkeit: ${m.readingLabel || "—"}

## Nächste Schritte

1. Die Maßnahmen oben **nach Priorität** abarbeiten (Hoch zuerst).
2. Vor allem: eine klare **Antwort im ersten Satz** je Seite, **FAQ-Bereich** mit
   echten Kundenfragen, und **schema.org-Auszeichnung** (FAQPage/Organization).
3. Nach den Änderungen erneut prüfen — der Score sollte messbar steigen.

---

*Erstellt mit dem aban-news AI-Sichtbarkeits-Check. Bewertung nach offenen,
deterministischen Kriterien. **Keine Garantie** auf Nennung oder Platzierung in
einer KI — niemand kontrolliert, was ein Modell ausgibt. Angaben ohne Gewähr.*
`;
}

try {
  const html = await getHtml();
  const r = analyze(html);
  process.stdout.write(report(input, r));
  process.stderr.write(`\n[ok] Score ${r.score}/100 (${r.grade}) — Report auf stdout.\n`);
} catch (e) {
  console.error("Fehler:", e.message);
  process.exit(1);
}
