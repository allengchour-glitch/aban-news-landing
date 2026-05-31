// ============================================================================
// Hype-Filter — Analyse-Engine (reines JS, keine Abhängigkeiten)
// Wird sowohl von der Cloudflare Pages Function (functions/api/hype-check.js)
// als auch vom Node-Test (functions/_engine.test.mjs) importiert.
//
// Idee: Der interne Brand-Voice-Linter von aban news, als öffentliches Tool.
// Bewertet deutschen Marketing-/Website-Text auf Klartext statt Hype.
// ============================================================================

// ---------------------------------------------------------------------------
// Hype-Lexikon: [regex-Quelle, Label, Kategorie, Gewicht, [Alternativen]]
// Gewicht = wie stark es den Score senkt. Kategorien steuern Gruppierung.
// ---------------------------------------------------------------------------
export const LEXICON = [
  // Superlative & Wow-Wörter
  ["revolution(?:är|äre|ären|ärer|äres|ar|ary)?", "revolutionär", "superlativ", 3, ["neu", "anders", "das erste, das"]],
  ["bahnbrech(?:end|ende|ender|endes|enden)", "bahnbrechend", "superlativ", 3, ["neu", "ungewöhnlich"]],
  ["disrupt(?:iv|ive|iven|ion|s)?", "disruptiv", "superlativ", 3, ["verändert den Markt", "macht X überflüssig"]],
  ["einzigartig(?:e|er|es|en)?", "einzigartig", "superlativ", 2, ["als Einzige", "konkret: was genau anders ist"]],
  ["weltklasse|world[- ]?class", "Weltklasse", "superlativ", 2, ["gut", "verlässlich"]],
  ["unglaublich(?:e|er|es|en)?", "unglaublich", "superlativ", 2, ["weglassen", "Zahl nennen"]],
  ["wahnsinnig(?:e|er|es|en)?", "wahnsinnig", "superlativ", 2, ["weglassen"]],
  ["phänomenal(?:e|er|es|en)?", "phänomenal", "superlativ", 2, ["gut", "konkret belegen"]],
  ["herausragend(?:e|er|es|en)?", "herausragend", "superlativ", 1, ["gut", "konkret belegen"]],
  ["spielend[- ]?leicht|kinderleicht", "kinderleicht", "superlativ", 1.5, ["einfach", "in X Schritten"]],
  ["perfekt(?:e|er|es|en)?", "perfekt", "superlativ", 1.5, ["passend", "weglassen"]],
  ["nie[- ]?dagewesen(?:e|er|es|en)?", "nie dagewesen", "superlativ", 2, ["neu"]],

  // Denglisch & Buzzwords
  ["game[- ]?changer", "Game-Changer", "buzzword", 3, ["ändert, wie du X machst", "konkret: was es ändert"]],
  ["next[- ]?level", "Next-Level", "buzzword", 2, ["besser", "konkret benennen"]],
  ["cutting[- ]?edge", "Cutting-Edge", "buzzword", 2, ["aktuell", "neu"]],
  ["state[- ]?of[- ]?the[- ]?art", "State-of-the-Art", "buzzword", 2, ["aktuell", "Stand der Technik"]],
  ["best[- ]?in[- ]?class", "Best-in-Class", "buzzword", 2, ["eines der besten", "konkret vergleichen"]],
  ["synerg(?:ie|ien|etisch|etische)", "Synergie", "buzzword", 2, ["passt zusammen", "ergänzt sich"]],
  ["leverag(?:e|en|ing|ed)", "leverage", "buzzword", 2, ["nutzen", "einsetzen"]],
  ["ai[- ]?powered|ki[- ]?gestützt(?:e|er|es|en)?|ki[- ]?basiert(?:e|er|es|en)?", "KI-gestützt", "buzzword", 1.5, ["nutzt KI für X", "konkret: welche Aufgabe"]],
  ["next[- ]?gen(?:eration)?", "Next-Gen", "buzzword", 1.5, ["neu", "die nächste Version"]],
  ["seamless|nahtlos(?:e|er|es|en)?", "nahtlos", "buzzword", 1, ["ohne Umweg", "direkt"]],
  ["end[- ]?to[- ]?end|ganzheitlich(?:e|er|es|en)?", "ganzheitlich", "buzzword", 1.5, ["von Anfang bis Ende", "konkret: was alles"]],
  ["skalierbar(?:e|er|es|en)?", "skalierbar", "buzzword", 1, ["wächst mit", "konkret: bis wohin"]],
  ["maßgeschneidert(?:e|er|es|en)?", "maßgeschneidert", "buzzword", 1, ["auf dich zugeschnitten", "passend"]],
  ["innovativ(?:e|er|es|en)?", "innovativ", "buzzword", 1.5, ["neu", "konkret: was neu ist"]],
  ["mehrwert", "Mehrwert", "buzzword", 1.5, ["Nutzen", "konkret: was du davon hast"]],
  ["lösung(?:s)?(?:anbieter)?", "Lösung", "buzzword", 0.8, ["konkret: was es löst", "Werkzeug", "Weg"]],

  // Versprechen & Übertreibung
  ["10[- ]?x|10[- ]?fach", "10x", "versprechen", 2.5, ["spürbar mehr", "konkrete Zahl"]],
  ["skyrocket\\w*|durch[- ]?die[- ]?decke", "durch die Decke", "versprechen", 2.5, ["wächst", "Zahl nennen"]],
  ["garantiert(?:e|er|es|en)?", "garantiert", "versprechen", 2, ["meist", "in der Regel", "weglassen"]],
  ["mühelos(?:e|er|es|en)?", "mühelos", "versprechen", 1.5, ["ohne großen Aufwand", "in X Minuten"]],
  ["im[- ]?handumdrehen", "im Handumdrehen", "versprechen", 1.5, ["in X Minuten", "schnell"]],
  ["in[- ]?nur[- ]?\\d+[- ]?(?:tagen|minuten|stunden|wochen)", "in nur X Tagen", "versprechen", 1.5, ["nüchtern: realistischer Zeitraum"]],
  ["passive[s]?[- ]?einkommen", "passives Einkommen", "versprechen", 1.5, ["Einnahmen nebenbei", "ehrlich: Aufwand nennen"]],
  ["finanzielle[- ]?freiheit", "finanzielle Freiheit", "versprechen", 1.5, ["mehr Spielraum", "konkret"]],
  ["100[- ]?%|hundertprozentig", "100%", "versprechen", 1, ["meist", "fast immer"]],

  // Intensivierer (Weichmacher nach oben)
  ["mega|krass|hammer", "mega/krass", "intensivierer", 1, ["weglassen"]],
  ["absolut(?:e|er|es|en)?", "absolut", "intensivierer", 0.8, ["weglassen"]],
  ["äußerst|extrem(?:e|er|es|en)?", "äußerst/extrem", "intensivierer", 0.8, ["sehr", "weglassen"]],
  ["total(?:e|er|es|en)?", "total", "intensivierer", 0.6, ["weglassen"]],

  // Füllwörter / Weichmacher (machen Aussagen unscharf)
  ["eigentlich", "eigentlich", "füllwort", 0.5, ["weglassen"]],
  ["quasi|sozusagen|gewissermaßen", "quasi/sozusagen", "füllwort", 0.5, ["weglassen"]],
  ["im[- ]?grunde[- ]?genommen|im[- ]?grunde", "im Grunde", "füllwort", 0.5, ["weglassen"]],
  ["letztendlich|letzten[- ]?endes", "letztendlich", "füllwort", 0.4, ["weglassen"]],
  ["natürlich", "natürlich", "füllwort", 0.3, ["weglassen, wenn nicht nötig"]],
];

// Vorkompilierte Regex (Wortgrenzen, unicode, case-insensitive, global)
const COMPILED = LEXICON.map(([src, label, cat, weight, repl]) => ({
  re: new RegExp("(?<![\\p{L}])(?:" + src + ")(?![\\p{L}])", "giu"),
  label, category: cat, weight, replacements: repl,
}));

const CATEGORY_LABELS = {
  superlativ: "Superlative & Wow-Wörter",
  buzzword: "Buzzwords & Denglisch",
  versprechen: "Übertriebene Versprechen",
  intensivierer: "Intensivierer",
  füllwort: "Füllwörter & Weichmacher",
  passiv: "Passiv-Konstruktionen",
  satzbau: "Schachtelsätze",
  interpunktion: "Ausrufezeichen & Schreien",
};

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------
function splitSentences(text) {
  return text.split(/(?<=[.!?…])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}
function words(text) {
  return (text.match(/[\p{L}\p{N}][\p{L}\p{N}\-']*/gu) || []);
}
function countSyllables(word) {
  const groups = word.toLowerCase().match(/[aeiouäöüy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

// Wiener Sachtextformel (1. Variante) → ungefähres Schul-Niveau (4–15)
function wienerSachtextformel(ws) {
  if (ws.length < 1) return null;
  const n = ws.length;
  const longWords = ws.filter((w) => w.length >= 6).length;       // ≥6 Buchstaben
  const polysyll = ws.filter((w) => countSyllables(w) >= 3).length; // ≥3 Silben
  const monosyll = ws.filter((w) => countSyllables(w) === 1).length;
  return { longWords, polysyll, monosyll, n };
}

// ---------------------------------------------------------------------------
// Hauptfunktion: analyze(text)
// ---------------------------------------------------------------------------
export function analyze(text) {
  text = (text || "").toString();
  const charCount = text.length;
  const ws = words(text);
  const wordCount = ws.length;
  const sentences = splitSentences(text);
  const sentenceCount = sentences.length || 1;

  const findings = [];

  // 1) Hype-Lexikon — mit Positionen fürs Highlighting
  for (const entry of COMPILED) {
    entry.re.lastIndex = 0;
    let m;
    while ((m = entry.re.exec(text)) !== null) {
      findings.push({
        start: m.index,
        end: m.index + m[0].length,
        match: m[0],
        label: entry.label,
        category: entry.category,
        weight: entry.weight,
        replacements: entry.replacements,
      });
      if (m.index === entry.re.lastIndex) entry.re.lastIndex++; // Endlosschutz
    }
  }

  // 2) Mehrfach-Ausrufezeichen
  for (const m of text.matchAll(/!{2,}/g)) {
    findings.push({
      start: m.index, end: m.index + m[0].length, match: m[0],
      label: "Mehrfach-Ausrufezeichen", category: "interpunktion", weight: 1.5,
      replacements: ["ein Satzzeichen reicht"],
    });
  }
  // 3) SCHREIEN in Großbuchstaben (2+ Wörter à ≥3 Buchstaben)
  for (const m of text.matchAll(/\b[A-ZÄÖÜ]{3,}(?:\s+[A-ZÄÖÜ]{3,})+/g)) {
    findings.push({
      start: m.index, end: m.index + m[0].length, match: m[0],
      label: "Großbuchstaben-Schreien", category: "interpunktion", weight: 1.5,
      replacements: ["normale Groß-/Kleinschreibung"],
    });
  }
  // 4) Passiv-Heuristik (werden/wird/wurde + Partizip II auf -t/-en)
  for (const m of text.matchAll(/\b(?:wird|werden|wurde[n]?|geworden)\b\s+(?:\p{L}+\s+){0,3}?(?:ge\p{L}+t|ge\p{L}+en)\b/giu)) {
    findings.push({
      start: m.index, end: m.index + m[0].length, match: m[0],
      label: "Passiv", category: "passiv", weight: 0.8,
      replacements: ["aktiv formulieren: wer tut was?"],
    });
  }

  // Überlappungen auflösen: nach Startposition sortieren, überlappende verwerfen
  findings.sort((a, b) => a.start - b.start || b.weight - a.weight);
  const clean = [];
  let lastEnd = -1;
  for (const f of findings) {
    if (f.start >= lastEnd) { clean.push(f); lastEnd = f.end; }
  }

  // 5) Schachtelsätze
  const longSentences = sentences
    .map((s) => ({ s, n: words(s).length }))
    .filter((x) => x.n > 25);

  // ---- Metriken ----
  const wsf = wienerSachtextformel(ws);
  let readingGrade = null;
  if (wsf && wordCount >= 20) {
    const MS = (wsf.polysyll / wsf.n) * 100;
    const SL = wordCount / sentenceCount;
    const IW = (wsf.longWords / wsf.n) * 100;
    const ES = (wsf.monosyll / wsf.n) * 100;
    readingGrade = 0.1935 * MS + 0.1672 * SL + 0.1297 * IW - 0.0327 * ES - 0.875;
    readingGrade = Math.max(4, Math.min(15, Math.round(readingGrade * 10) / 10));
  }
  const avgSentenceLen = Math.round((wordCount / sentenceCount) * 10) / 10;

  // ---- Score (0–100): Klartext statt Hype. Penalty pro 100 Wörter normiert. ----
  const penaltySum = clean.reduce((s, f) => s + f.weight, 0)
    + longSentences.length * 0.8;
  const per100 = penaltySum / Math.max(wordCount, 20) * 100;
  let score = Math.round(Math.max(0, 100 - per100 * 6));
  if (wordCount < 5) score = Math.min(score, 50);

  // Hype-Dichte pro 100 Wörter (nur echte Hype-Kategorien)
  const hypeFindings = clean.filter((f) =>
    ["superlativ", "buzzword", "versprechen", "intensivierer"].includes(f.category));
  const hypeDensity = Math.round((hypeFindings.length / Math.max(wordCount, 1)) * 1000) / 10;

  // ---- Kategorien-Zusammenfassung ----
  const byCategory = {};
  for (const f of clean) {
    (byCategory[f.category] ||= { category: f.category, label: CATEGORY_LABELS[f.category], count: 0, items: [] });
    byCategory[f.category].count++;
    if (byCategory[f.category].items.length < 12)
      byCategory[f.category].items.push({ match: f.match, replacements: f.replacements });
  }

  const grade = scoreGrade(score);

  return {
    score,
    grade: grade.label,
    gradeColor: grade.color,
    verdict: grade.verdict,
    metrics: {
      wordCount,
      charCount,
      sentenceCount,
      avgSentenceLen,
      hypeDensity,            // Hype-Wörter je 100 Wörter
      readingGrade,           // Schul-Niveau nach Wiener Sachtextformel
      longSentenceCount: longSentences.length,
    },
    findings: clean,          // mit Positionen fürs Highlighting
    categories: Object.values(byCategory).sort((a, b) => b.count - a.count),
    suggestions: buildSuggestions(clean, longSentences, avgSentenceLen),
    ruleRewrite: ruleRewrite(text, clean),
  };
}

function scoreGrade(score) {
  if (score >= 85) return { label: "Klartext", color: "#15803d", verdict: "Sauber. Nüchtern, konkret, kaum Hype." };
  if (score >= 70) return { label: "Solide", color: "#65a30d", verdict: "Gut lesbar — ein paar Stellen lassen sich noch schärfen." };
  if (score >= 50) return { label: "Etwas Hype", color: "#d97706", verdict: "Brauchbar, aber zu viele Wow-Wörter und Weichmacher." };
  if (score >= 30) return { label: "Viel Hype", color: "#ea580c", verdict: "Hier wird mehr versprochen als gesagt. Konkreter werden." };
  return { label: "Hype-Alarm", color: "#dc2626", verdict: "Buzzword-Bingo. Streichen und neu, mit echten Aussagen." };
}

function buildSuggestions(findings, longSentences, avgLen) {
  const out = [];
  const cats = new Set(findings.map((f) => f.category));
  if (cats.has("superlativ"))
    out.push("Ersetze Superlative durch konkrete Aussagen: nicht „revolutionär“, sondern was genau anders ist.");
  if (cats.has("buzzword"))
    out.push("Buzzwords sagen wenig. Schreib, was das Ding tatsächlich tut.");
  if (cats.has("versprechen"))
    out.push("Übertriebene Versprechen kosten Vertrauen. Nenne realistische Zahlen und Zeiträume.");
  if (cats.has("intensivierer"))
    out.push("Streich Intensivierer wie „mega“ oder „absolut“ — sie machen Aussagen nicht stärker, nur lauter.");
  if (cats.has("füllwort"))
    out.push("Füllwörter wie „eigentlich“ oder „quasi“ schwächen den Satz. Weg damit.");
  if (cats.has("passiv"))
    out.push("Aktiv schreiben: Sag, wer was tut, statt „es wird gemacht“.");
  if (longSentences.length > 0)
    out.push(`${longSentences.length} Satz/Sätze über 25 Wörter. Teile lange Sätze auf — ein Gedanke pro Satz.`);
  if (avgLen > 18)
    out.push(`Deine Sätze sind im Schnitt ${avgLen} Wörter lang. Kürzer wirkt klarer.`);
  if (out.length === 0)
    out.push("Nichts zu meckern. Der Text ist konkret und kommt ohne Hype aus.");
  return out;
}

// Regelbasierte Sofort-Umschreibung: Intensivierer/Füllwörter raus,
// Hype-Wörter in [eckige Klammern] zum selbst Ersetzen markiert.
function ruleRewrite(text, findings) {
  // von hinten nach vorne ersetzen, damit Positionen stabil bleiben
  const sorted = [...findings].sort((a, b) => b.start - a.start);
  let out = text;
  for (const f of sorted) {
    if (f.category === "füllwort" || f.category === "intensivierer") {
      // ersatzlos streichen (plus evtl. folgendes Leerzeichen)
      let end = f.end;
      if (out[end] === " ") end++;
      out = out.slice(0, f.start) + out.slice(end);
    } else if (["superlativ", "buzzword", "versprechen"].includes(f.category)) {
      const alt = f.replacements && f.replacements[0] ? f.replacements[0] : f.match;
      out = out.slice(0, f.start) + "[" + alt + "]" + out.slice(f.end);
    }
  }
  // doppelte Leerzeichen aufräumen
  return out.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
}
