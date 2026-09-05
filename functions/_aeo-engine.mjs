// ============================================================================
// AI-Sichtbarkeits-Check — AEO/GEO-Analyse-Engine (reines JS, keine Deps)
// Wird sowohl von der Cloudflare Pages Function (functions/api/aeo-check.js)
// als auch vom Node-Test (functions/_aeo-engine.test.mjs) importiert.
//
// Idee: Prüft, wie gut eine Seite auf Antwort-Maschinen (ChatGPT, Perplexity,
// Google AI Overviews & Co.) vorbereitet ist — Answer-Engine-Optimierung (AEO)
// bzw. Generative-Engine-Optimierung (GEO) für DACH-Firmen.
//
// Rein lokal & deterministisch. KEINE externen API-Calls, kein Live-Query an
// irgendein Sprachmodell. Nimmt HTML oder reinen Text der Seite entgegen.
// ============================================================================

// ---------------------------------------------------------------------------
// HTML → strukturierte Felder. Toleranter, ReDoS-fester Mini-Parser (kein DOM).
// Alle Regex haben begrenzte Quantifizierer bzw. arbeiten auf Vorab-Slices.
// ---------------------------------------------------------------------------

// Eingebettete <script>/<style>-Inhalte vor der Textextraktion entfernen.
// [\s\S]*? mit fester Tag-Grenze ist linear, kein katastrophales Backtracking.
function stripScriptsStyles(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeFromCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeFromCode(parseInt(d, 10)));
}
function safeFromCode(n) {
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return "";
  try { return String.fromCodePoint(n); } catch { return ""; }
}

// Erkennt, ob die Eingabe HTML ist (mindestens ein Tag-artiges Muster).
function looksLikeHtml(s) {
  return /<\s*(?:html|head|body|div|p|h[1-6]|section|article|main|ul|ol|table|script|meta|title|nav|span|a|br)\b/i.test(s)
    || /<\/[a-z]+\s*>/i.test(s);
}

// Tag-Inhalte einsammeln (z. B. alle <h2>…</h2>). Begrenzte Tiefe, linear.
function collectTags(html, tag) {
  const re = new RegExp("<" + tag + "\\b[^>]*>([\\s\\S]{0,4000}?)<\\/" + tag + "\\s*>", "gi");
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push(stripTags(m[1]).trim());
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out.filter(Boolean);
}

function stripTags(s) {
  return decodeEntities(s.replace(/<[^>]{0,2000}>/g, " ")).replace(/\s+/g, " ").trim();
}

/* ⚠️ GEMESSEN 2026-09-03 an den eigenen 270 Kaufberater-Seiten: 234 davon bekamen
   „Erster Satz ist sehr lang" — und zwar ausnahmslos zu Unrecht. `stripTags` machte aus
   JEDEM Tag ein Leerzeichen, also klebte alles ohne Satzzeichen zu EINEM Satz zusammen:
   <title> + Navigation + Brotkrume + H1 + erster Absatz. Der gemessene „erste Satz" von
   dreirad-kaufen-schweiz.html lautete: „Dreirad kaufen Schweiz 2026 — Kinderdreirad, EN 71
   & Mitwachs | aban aban Marktplatz Jobs Angebote Start › Kaufberater › Dreirad kaufen
   Schweiz Dreirad kaufen …" (43 Wörter). Der echte erste Inhaltssatz war
   „Auf einen Blick: Dreiräder mit Schiebestange passen ab 12 Monaten." (11 Wörter).
   Die Folge traf nicht nur die eigenen Seiten: JEDER bezahlte Kunden-Audit bekam beim
   wichtigsten AEO-Signal denselben falschen Rat („Beantworte die Kernfrage gleich im
   ersten Satz"), obwohl die Seite genau das tut. Fast jede Website der Welt ist betroffen,
   denn Titel, Menüpunkte und Überschriften enden nun einmal ohne Punkt.
   Zwei Korrekturen, beide inhaltlich richtig und nicht bloss punktebringend:
   1) Block-Elemente (</p>, </h1>, </li>, </div> …) werden zu Zeilenumbrüchen — genau die
      Grenzen, die `splitSentences` ohnehin schon als Satzende akzeptiert (\n+).
   2) Der <head> (und <noscript>/<template>/<svg>) gehört nicht zum sichtbaren Text; der
      Title wird in der Kategorie „meta" ohnehin getrennt bewertet, sonst zählte er doppelt.
   `stripTags` selbst bleibt unverändert — Titel und Überschriften sollen einzeilig bleiben. */
const BLOCK_TAGS = /<\/?(?:address|article|aside|blockquote|br|dd|details|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|summary|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]{0,2000}>/gi;
/* Der INHALT einer Seite, nicht ihr Rahmen.
   ⚠️ Erster Anlauf (nur Block-Umbrüche) machte es schlimmer statt besser: der „erste Satz"
   war danach „aban" — der Markenlink der Navigation. Gemessen fiel „antwort-zuerst" bei den
   Kaufberatern von 40 % auf 31 %, bei den Rechnern von 35 % auf 5 %. Die Klebe-Ursache war
   behoben, die eigentliche aber nicht: bewertet wurde weiterhin der Seitenrahmen.
   Antwort-Maschinen ziehen ihre Zitate aus dem Inhalt, nicht aus dem Menü — also misst die
   Engine jetzt dort: <main>, ersatzweise <article>, sonst das Dokument ohne nav/footer/aside.
   Die 200-Zeichen-Schwelle verhindert, dass ein leeres <main> (App-Gerüst) den ganzen Text
   verschluckt; dann gilt wieder das ganze Dokument. */
function ohneNavigation(teil) {
  /* ⚠️ Zweiter Anlauf. Erst wurden nav/footer/aside NUR im Rückfall entfernt, nicht
     innerhalb eines <main> — und genau dort stehen sie in der Praxis: Brotkrume und
     Rücklink sitzen fast immer im Inhaltsbereich. Gemessen an 157 eigenen Seiten: das
     Auszeichnen der Brotkrumen als <nav> änderte am Ergebnis exakt nichts, weil die
     Engine sie im <main> weiterlas. Eine Navigation ist Navigation, wo immer sie steht. */
  return teil
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav\s*>/gi, " ")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer\s*>/gi, " ")
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside\s*>/gi, " ");
}
function inhaltsBereich(htmlOhneSkripte) {
  for (const tag of ["main", "article"]) {
    const m = new RegExp("<" + tag + "\\b[^>]*>([\\s\\S]*?)<\\/" + tag + "\\s*>", "i").exec(htmlOhneSkripte);
    if (m && m[1].replace(/<[^>]{0,2000}>/g, " ").replace(/\s+/g, " ").trim().length >= 200) return ohneNavigation(m[1]);
  }
  return ohneNavigation(htmlOhneSkripte);
}
function visibleText(htmlOhneSkripte) {
  const ohneKopf = htmlOhneSkripte
    .replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript\s*>/gi, " ")
    .replace(/<template\b[^>]*>[\s\S]*?<\/template\s*>/gi, " ")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg\s*>/gi, " ");
  /* ⚠️ Reihenfolge zählt. Erst ein Platzhalter für Block-Grenzen, dann Leerraum
     zusammenfassen, dann Zeilenumbrüche setzen. Andersherum wird jeder Zeilenumbruch im
     QUELLTEXT zu einer Satzgrenze: aus „… ab 12 Monaten. Eigenständiges\nTreten gelingt …"
     wurden die „Sätze" „Eigenständiges" (1 Wort) und „Treten gelingt …" — das verfälscht
     Satzzahl und Ø-Satzlänge und damit die Lesbarkeits-Note. */
  const mitMarke = ohneKopf.replace(BLOCK_TAGS, "\u0000").replace(/<[^>]{0,2000}>/g, " ");
  return decodeEntities(mitMarke)
    .replace(/[\s\u200b]+/g, " ")
    .replace(/ *\u0000[ \u0000]*/g, "\n")
    .trim();
}

// Attribut aus einem Tag lesen (z. B. content="…" eines <meta>).
function attr(tagSource, name) {
  const re = new RegExp(name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i");
  const m = re.exec(tagSource);
  if (!m) return null;
  return decodeEntities((m[1] != null ? m[1] : m[2] != null ? m[2] : m[3] || "")).trim();
}

// Alle <meta …>-Tags als Roh-Strings.
function metaTags(html) {
  return (html.match(/<meta\b[^>]*>/gi) || []);
}

function parseHtml(html) {
  const noScript = stripScriptsStyles(html);

  // Title
  const titleM = /<title\b[^>]*>([\s\S]{0,1000}?)<\/title\s*>/i.exec(html);
  const title = titleM ? stripTags(titleM[1]) : "";

  // Meta-Description
  let metaDesc = "";
  let metaRobots = "";
  let lang = "";
  const htmlTag = /<html\b[^>]*>/i.exec(html);
  if (htmlTag) lang = attr(htmlTag[0], "lang") || "";
  for (const t of metaTags(html)) {
    const nameAttr = (attr(t, "name") || attr(t, "property") || "").toLowerCase();
    if (nameAttr === "description" && !metaDesc) metaDesc = attr(t, "content") || "";
    if (nameAttr === "robots" && !metaRobots) metaRobots = (attr(t, "content") || "").toLowerCase();
  }

  /* ⚠️ Überschriften aus dem Dokument OHNE Skripte lesen. Gemessen an ai-sichtbarkeit.html
     (2026-09-05): die Seite bekam „2 H1" und fünf Frage-Überschriften angerechnet, die es
     auf der Seite gar nicht gibt — sie stehen als Beispiel-HTML in einer JavaScript-
     Zeichenkette (die Demo „Gut optimiert" des Checks). Ein Kunde mit einem HTML-Beispiel
     im Skript bekäme denselben falschen Befund „mehrere H1". */
  const h1 = collectTags(noScript, "h1");
  const h2 = collectTags(noScript, "h2");
  const h3 = collectTags(noScript, "h3");

  // Strukturierte Daten / JSON-LD
  const jsonLd = [];
  const ldRe = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]{0,20000}?)<\/script\s*>/gi;
  let lm;
  while ((lm = ldRe.exec(html)) !== null) {
    jsonLd.push(lm[1].trim());
    if (lm.index === ldRe.lastIndex) ldRe.lastIndex++;
  }

  // Listen & Tabellen (Zählung der Container)
  /* Listen/Tabellen zählen nur im Inhalt: ein <ul> im Menü ist keine Inhaltsliste. */
  const inhalt = inhaltsBereich(noScript);
  const listCount = (inhalt.match(/<(?:ul|ol)\b/gi) || []).length;
  const tableCount = (inhalt.match(/<table\b/gi) || []).length;

  // Sichtbarer Text
  const text = visibleText(inhalt);

  // FAQPage-Hinweis im JSON-LD
  const hasFaqSchema = jsonLd.some((b) => /"@type"\s*:\s*"(?:FAQPage|QAPage|Question)"/i.test(b));

  return {
    isHtml: true, title, metaDesc, metaRobots, lang,
    h1, h2, h3, jsonLd, hasFaqSchema, listCount, tableCount, text,
  };
}

// Reiner Text: keine Struktur-Signale, nur der Fließtext zählt.
function parseText(raw) {
  return {
    isHtml: false, title: "", metaDesc: "", metaRobots: "", lang: "",
    h1: [], h2: [], h3: [], jsonLd: [], hasFaqSchema: false,
    listCount: 0, tableCount: 0, text: raw.replace(/\s+/g, " ").trim(),
  };
}

// ---------------------------------------------------------------------------
// Lesbarkeit — geteilte Logik mit dem Hype-Filter (_engine.mjs):
// Wiener Sachtextformel (1. Variante). Hier eigenständig, damit die Engine
// keine Abhängigkeit zur Hype-Engine hat (beide bleiben einzeln deploybar).
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
function readingLabelFor(grade) {
  if (grade === null || grade === undefined) return null;
  if (grade <= 7) return "leicht";
  if (grade <= 10) return "mittel";
  if (grade <= 13) return "schwer";
  return "sehr schwer";
}
function wienerSachtextformel(ws, wordCount, sentenceCount) {
  if (ws.length < 20) return null;
  const n = ws.length;
  const longWords = ws.filter((w) => w.length >= 6).length;
  const polysyll = ws.filter((w) => countSyllables(w) >= 3).length;
  const monosyll = ws.filter((w) => countSyllables(w) === 1).length;
  const MS = (polysyll / n) * 100;
  const SL = wordCount / sentenceCount;
  const IW = (longWords / n) * 100;
  const ES = (monosyll / n) * 100;
  let g = 0.1935 * MS + 0.1672 * SL + 0.1297 * IW - 0.0327 * ES - 0.875;
  return Math.max(4, Math.min(15, Math.round(g * 10) / 10));
}

// ---------------------------------------------------------------------------
// Heuristik: Beginnt ein Text mit einer direkten Antwort?
// AEO belohnt den "Answer-first"-Aufbau: das Wichtigste im 1. Satz, keine
// langatmige Einleitung, keine reine Frage als Auftakt ohne Antwort.
// ---------------------------------------------------------------------------
const FLUFF_OPENERS = /^(?:in[- ]?diesem[- ]?(?:artikel|beitrag|text)|willkommen|herzlich[- ]?willkommen|heutzutage|in[- ]?der[- ]?heutigen[- ]?zeit|stell(?:e)?[- ]?dir[- ]?vor|kennst[- ]?du[- ]?das|wir[- ]?freuen[- ]?uns|seit[- ]?jeher|schon[- ]?immer)/i;

function answerFirstScore(text) {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return { ok: false, reason: "kein-text" };
  const first = sentences[0];
  const fw = words(first).length;
  // Direkte Antwort: nicht zu lang, kein Floskel-Auftakt, endet nicht als reine Frage
  const tooLong = fw > 28;
  const isFluff = FLUFF_OPENERS.test(first.trim());
  const isBareQuestion = /\?\s*$/.test(first) && sentences.length === 1;
  /* ⚠️ Die Untergrenze lag bei 4 Wörtern und verwarf damit genau die BESTEN Anfänge:
     „Viel ist kostenlos." und „Ich bin Aban." sind drei Wörter und beantworten die Frage
     sofort — beide Seiten bekamen dafür null Punkte. Die Grenze sollte Bruchstücke
     abwehren (ein hängengebliebenes Wort aus einer Tabellenzelle), und das tut inzwischen
     die Fliesstext-Auswahl: bewertet wird nur, was mit einem Satzzeichen endet. Zwei
     Wörter sind das Minimum für einen echten Satz. */
  const ok = !tooLong && !isFluff && !isBareQuestion && fw >= 2;
  return {
    ok,
    firstSentenceWords: fw,
    tooLong, isFluff, isBareQuestion,
  };
}

// W-Fragen-Erkennung (Überschriften, die direkt eine Frage beantworten).
const QUESTION_WORD = /^(?:was|wie|warum|wieso|weshalb|wann|wo|wer|welche[rsmn]?|wofür|wozu|wodurch|kann|ist|sind|gibt[- ]?es|sollte|muss|darf|braucht)\b/i;

function isQuestionHeading(h) {
  const t = h.trim();
  return /\?\s*$/.test(t) || QUESTION_WORD.test(t);
}

// ---------------------------------------------------------------------------
// Hauptfunktion: analyze(input)
// input darf HTML oder reiner Text sein — wird automatisch erkannt.
// ---------------------------------------------------------------------------
export function analyze(input) {
  input = (input || "").toString();
  const charCount = input.length;
  const doc = looksLikeHtml(input) ? parseHtml(input) : parseText(input);

  const text = doc.text || "";
  const ws = words(text);
  const wordCount = ws.length;
  const sentences = splitSentences(text);

  /* ⚠️ LESBARKEIT NUR AUF FLIESSTEXT. Seit Block-Elemente Satzgrenzen setzen, ist jede
     Tabellenzelle, jeder Listenpunkt und jede Überschrift eine eigene Einheit — richtig für
     „Antwort zuerst", falsch für die Lesbarkeit: dreirad-kaufen-schweiz.html (12 Tabellen)
     kam damit auf eine Ø-Satzlänge von 5,1 Wörtern und wurde als leicht lesbar ausgewiesen,
     obwohl der Fliesstext unverändert lange Sätze hat. Als Fliesstext zählt, was mit einem
     Satzzeichen endet — Zellen, Labels und Überschriften tun das nicht. Fällt dabei nichts
     übrig (reine Tabellenseite), gilt wieder alles, sonst gäbe es gar keine Note. */
  const prosaSaetze = sentences.filter((x) => /[.!?…]["'»”)\]]?\s*$/.test(x));
  const basis = prosaSaetze.length ? prosaSaetze : sentences;
  const basisWorte = words(basis.join(" "));
  const sentenceCount = basis.length || 1;

  const readingGrade = wienerSachtextformel(basisWorte, basisWorte.length, sentenceCount);
  const readingLabel = readingLabelFor(readingGrade);
  const avgSentenceLen = Math.round((basisWorte.length / sentenceCount) * 10) / 10;
  const longSentenceCount = basis.filter((x) => words(x).length > 25).length;

  /* ⚠️ „Antwort zuerst" misst den ersten FLIESSTEXT-Satz, nicht die erste Zeile.
     Gemessen an den eigenen Rechner-Seiten: deren erste Zeile ist die Überschrift
     („Farben umrechnen", 2 Wörter), und die Prüfung fiel durch, obwohl der Satz direkt
     darunter genau die gewünschte direkte Aussage ist („HEX, RGB und HSL ineinander
     umrechnen — mit Live-Vorschau …"). Überschriften, Knopf-Beschriftungen und
     Tabellenzellen sind Etiketten, keine Sätze; sie werden in „struktur" bzw. „listen"
     ohnehin eigens bewertet. Damit misst dieselbe Grundlage wie bei der Lesbarkeit. */
  const af = answerFirstScore(basis.join("\n"));
  const questionHeadings = [...doc.h1, ...doc.h2, ...doc.h3].filter(isQuestionHeading);

  // -------------------------------------------------------------------------
  // Kategorien: jede vergibt 0..max Punkte. Summe → Score 0..100.
  // Bewusst transparent, damit die Empfehlungen 1:1 erklärbar bleiben.
  // -------------------------------------------------------------------------
  const checks = [];
  const recs = [];
  const tooShort = wordCount < 30;

  function cat(key, label, points, max, status, detail) {
    checks.push({ key, label, points: Math.round(points * 10) / 10, max, status, detail });
  }
  function rec(category, severity, text) {
    recs.push({ category, severity, text });
  }

  // 1) Antwort-zuerst-Struktur (max 18)
  {
    let p = 0;
    const detailBits = [];
    if (af.ok) { p += 12; detailBits.push("Erster Satz liefert direkt eine Aussage."); }
    else {
      if (af.tooLong) { detailBits.push("Erster Satz ist sehr lang."); rec("antwort-zuerst", "hoch", "Beantworte die Kernfrage gleich im ersten Satz. Antwort-Maschinen zitieren bevorzugt kurze, direkte Aussagen am Anfang."); }
      else if (af.isFluff) { detailBits.push("Beginnt mit einer Einleitungs-Floskel."); rec("antwort-zuerst", "hoch", "Streich die Einleitungs-Floskel. Sag im ersten Satz, worum es geht — nicht „In diesem Artikel…“."); }
      else if (af.isBareQuestion) { detailBits.push("Startet mit einer Frage ohne Antwort."); rec("antwort-zuerst", "mittel", "Auf eine Frage als Überschrift sollte sofort die Antwort folgen, nicht erst nach mehreren Absätzen."); }
      else { detailBits.push("Kein klarer Antwort-Einstieg erkennbar."); rec("antwort-zuerst", "mittel", "Bau die Seite nach dem Prinzip „Antwort zuerst“: Kernaussage oben, Details darunter."); }
    }
    // Frage-Überschriften belohnen (gut für AEO, da sie reale Suchanfragen treffen)
    if (questionHeadings.length >= 2) { p += 6; detailBits.push(questionHeadings.length + " Überschriften greifen Fragen auf."); }
    else if (questionHeadings.length === 1) { p += 3; detailBits.push("Eine Überschrift greift eine Frage auf."); }
    else { rec("antwort-zuerst", "niedrig", "Formuliere Zwischenüberschriften als Fragen (Was/Wie/Warum). Das trifft genau die Anfragen, die Nutzer an ChatGPT & Co. stellen."); }
    cat("antwort-zuerst", "Antwort-zuerst-Struktur", Math.min(18, p), 18, p >= 12 ? "gut" : p >= 6 ? "teils" : "schwach", detailBits.join(" "));
  }

  // 2) Überschriften-Hierarchie H1/H2 (max 14)
  {
    let p = 0;
    const detailBits = [];
    if (doc.isHtml) {
      if (doc.h1.length === 1) { p += 7; detailBits.push("Genau eine H1."); }
      else if (doc.h1.length === 0) { detailBits.push("Keine H1 gefunden."); rec("struktur", "hoch", "Setz genau eine H1, die die Hauptfrage der Seite in Klartext benennt."); }
      else { p += 2; detailBits.push(doc.h1.length + " H1 — sollte nur eine sein."); rec("struktur", "mittel", "Verwende nur eine H1 pro Seite. Mehrere H1 verwässern, worum es geht."); }
      if (doc.h2.length >= 2) { p += 7; detailBits.push(doc.h2.length + " H2-Abschnitte."); }
      else if (doc.h2.length === 1) { p += 3; detailBits.push("Nur eine H2."); rec("struktur", "niedrig", "Gliedere den Inhalt in mehrere H2-Abschnitte. Maschinen lesen entlang dieser Struktur."); }
      else { detailBits.push("Keine H2-Gliederung."); rec("struktur", "mittel", "Gliedere die Seite mit H2-Überschriften in klar abgegrenzte Abschnitte."); }
    } else {
      detailBits.push("Reiner Text — keine HTML-Überschriften prüfbar.");
      rec("struktur", "niedrig", "Füg HTML-Überschriften (H1/H2) ein, wenn du die echte Seite prüfst. Im reinen Text fehlt diese Struktur.");
    }
    cat("struktur", "Überschriften-Hierarchie", p, 14, p >= 10 ? "gut" : p >= 5 ? "teils" : "schwach", detailBits.join(" "));
  }

  // 3) FAQ-Vorhandensein (max 14)
  {
    let p = 0;
    const detailBits = [];
    const faqTextHint = /\b(?:häufige[- ]?fragen|h[äa]ufig[- ]?gestellte[- ]?fragen|faq|fragen[- ]?und[- ]?antworten)\b/i.test(text);
    if (doc.hasFaqSchema) { p += 9; detailBits.push("FAQPage-Schema im JSON-LD."); }
    else if (faqTextHint || questionHeadings.length >= 3) { p += 5; detailBits.push("FAQ-Inhalt erkennbar, aber ohne FAQPage-Schema."); rec("faq", "mittel", "Du hast FAQ-Inhalt — kennzeichne ihn zusätzlich als FAQPage-JSON-LD. Das hilft Antwort-Maschinen, Frage und Antwort sauber zu trennen."); }
    else { detailBits.push("Kein FAQ-Bereich erkennbar."); rec("faq", "hoch", "Ergänze einen FAQ-Bereich mit echten Nutzerfragen und kurzen Antworten — das ist eines der stärksten AEO-Signale."); }
    if (questionHeadings.length >= 3) { p += 5; detailBits.push(questionHeadings.length + " Frage-Überschriften."); }
    cat("faq", "FAQ & Fragen", Math.min(14, p), 14, p >= 9 ? "gut" : p >= 5 ? "teils" : "schwach", detailBits.join(" "));
  }

  // 4) Strukturierte Daten / JSON-LD (max 14)
  {
    let p = 0;
    const detailBits = [];
    if (doc.jsonLd.length > 0) {
      let valid = 0, types = new Set();
      for (const b of doc.jsonLd) {
        try {
          const parsed = JSON.parse(b);
          valid++;
          collectTypes(parsed, types);
        } catch { /* defekt — zählt nicht als valide */ }
      }
      if (valid > 0) { p += 8; detailBits.push(valid + " valide JSON-LD-Block/Blöcke (" + ([...types].slice(0, 4).join(", ") || "ohne @type") + ")."); }
      if (valid < doc.jsonLd.length) { detailBits.push((doc.jsonLd.length - valid) + " JSON-LD-Block ist kein gültiges JSON."); rec("strukturierte-daten", "hoch", "Mindestens ein JSON-LD-Block lässt sich nicht parsen. Defektes Schema wird von Maschinen ignoriert — validieren."); }
      // Bonus für nützliche Typen
      const useful = ["Organization", "Article", "FAQPage", "Product", "LocalBusiness", "BreadcrumbList", "WebPage", "HowTo", "QAPage"];
      if ([...types].some((t) => useful.includes(t))) { p += 6; detailBits.push("Nutzt aussagekräftige Schema-Typen."); }
      else if (valid > 0) { rec("strukturierte-daten", "niedrig", "Ergänze sprechende Schema-Typen wie Organization, Article oder FAQPage, damit Maschinen die Entität klar zuordnen."); }
    } else if (doc.isHtml) {
      detailBits.push("Kein JSON-LD gefunden.");
      rec("strukturierte-daten", "hoch", "Füg strukturierte Daten als JSON-LD ein (schema.org). Damit verstehen Antwort-Maschinen, wer du bist und worum es geht.");
    } else {
      detailBits.push("Reiner Text — strukturierte Daten nicht prüfbar.");
      rec("strukturierte-daten", "niedrig", "Strukturierte Daten leben im HTML-Head. Prüf dafür den echten Seiten-Quelltext.");
    }
    cat("strukturierte-daten", "Strukturierte Daten (JSON-LD)", Math.min(14, p), 14, p >= 12 ? "gut" : p >= 6 ? "teils" : "schwach", detailBits.join(" "));
  }

  // 5) Listen & Tabellen (max 10)
  {
    let p = 0;
    const detailBits = [];
    if (doc.isHtml) {
      if (doc.listCount >= 1) { p += 6; detailBits.push(doc.listCount + " Liste(n)."); }
      else { detailBits.push("Keine Listen."); rec("listen", "mittel", "Pack Aufzählbares in echte Listen (<ul>/<ol>). Antwort-Maschinen übernehmen Listen besonders gern wörtlich."); }
      if (doc.tableCount >= 1) { p += 4; detailBits.push(doc.tableCount + " Tabelle(n)."); }
      else { rec("listen", "niedrig", "Für Vergleiche und Daten eignen sich Tabellen — sie sind maschinell gut auswertbar."); }
    } else {
      // Im reinen Text: Aufzählungs-Spiegelstriche zählen als schwaches Signal
      const bulletLines = (input.match(/^[\s]*(?:[-*•·]|\d+[.)])\s+/gm) || []).length;
      if (bulletLines >= 3) { p += 5; detailBits.push(bulletLines + " Aufzählungszeilen im Text."); }
      else { detailBits.push("Kaum Aufzählungen erkennbar."); rec("listen", "niedrig", "Strukturiere Aufzählbares als Liste. Im reinen Text helfen Spiegelstriche, in HTML echte Listen-Tags."); }
    }
    cat("listen", "Listen & Tabellen", Math.min(10, p), 10, p >= 8 ? "gut" : p >= 4 ? "teils" : "schwach", detailBits.join(" "));
  }

  // 6) Klartext / Lesbarkeit (max 14)
  {
    let p = 0;
    const detailBits = [];
    if (readingGrade === null) {
      detailBits.push("Zu wenig Text für eine belastbare Lesbarkeitsmessung.");
      rec("lesbarkeit", "niedrig", "Für eine seriöse Lesbarkeitsmessung braucht es mehr Text — mindestens ein paar Absätze.");
    } else {
      if (readingGrade <= 10) { p += 9; detailBits.push("Lese-Niveau „" + readingLabel + "“ (Klasse " + readingGrade + ")."); }
      else if (readingGrade <= 13) { p += 5; detailBits.push("Lese-Niveau „" + readingLabel + "“ (Klasse " + readingGrade + ")."); rec("lesbarkeit", "mittel", "Der Text liest sich schwer. Kürzere Sätze und einfachere Wörter machen ihn maschinen- und menschenfreundlicher."); }
      else { detailBits.push("Lese-Niveau „" + readingLabel + "“ (Klasse " + readingGrade + ")."); rec("lesbarkeit", "hoch", "Der Text ist sehr schwer lesbar. Antwort-Maschinen bevorzugen klare, kurze Sprache — vereinfachen."); }
      if (avgSentenceLen <= 18) { p += 5; detailBits.push("Ø-Satzlänge " + avgSentenceLen + " Wörter."); }
      else { detailBits.push("Ø-Satzlänge " + avgSentenceLen + " Wörter."); rec("lesbarkeit", "mittel", "Ø-Satzlänge über 18 Wörter. Teil lange Sätze — ein Gedanke pro Satz."); }
    }
    if (longSentenceCount > 0 && readingGrade !== null) {
      rec("lesbarkeit", "niedrig", longSentenceCount + " Satz/Sätze über 25 Wörter. Schachtelsätze auflösen.");
    }
    cat("lesbarkeit", "Klartext & Lesbarkeit", Math.min(14, p), 14, p >= 12 ? "gut" : p >= 6 ? "teils" : "schwach", detailBits.join(" "));
  }

  // 7) Meta / Title / Eindeutige Entität (max 16)
  {
    let p = 0;
    const detailBits = [];
    if (doc.isHtml) {
      const tl = doc.title.length;
      if (tl >= 15 && tl <= 65) { p += 5; detailBits.push("Title-Länge passt (" + tl + " Zeichen)."); }
      else if (tl > 0) { p += 2; detailBits.push("Title vorhanden, aber " + (tl < 15 ? "sehr kurz" : "sehr lang") + " (" + tl + " Zeichen)."); rec("meta", "niedrig", "Halt den Title zwischen 15 und 65 Zeichen, mit der Kernaussage vorne."); }
      else { detailBits.push("Kein Title."); rec("meta", "hoch", "Setz einen aussagekräftigen <title>. Er ist der erste Anker für jede Maschine."); }

      const dl = doc.metaDesc.length;
      if (dl >= 50 && dl <= 165) { p += 4; detailBits.push("Meta-Description passt (" + dl + " Zeichen)."); }
      else if (dl > 0) { p += 2; detailBits.push("Meta-Description " + (dl < 50 ? "kurz" : "lang") + " (" + dl + " Zeichen)."); rec("meta", "niedrig", "Meta-Description zwischen 50 und 165 Zeichen, die die Seite in einem Satz zusammenfasst."); }
      else { detailBits.push("Keine Meta-Description."); rec("meta", "mittel", "Ergänze eine Meta-Description — eine klare Ein-Satz-Zusammenfassung der Seite."); }

      if (doc.lang) { p += 3; detailBits.push("lang=\"" + doc.lang + "\" gesetzt."); }
      else { detailBits.push("Kein lang-Attribut."); rec("meta", "mittel", "Setz lang=\"de\" am <html>-Tag, damit die Sprache eindeutig ist."); }

      if (/noindex/.test(doc.metaRobots)) { detailBits.push("robots = noindex — die Seite ist von Suche/AEO ausgeschlossen."); rec("meta", "hoch", "Die Seite steht auf noindex und wird damit nicht in Suche oder Antwort-Maschinen auftauchen. Entfern das, wenn sie sichtbar sein soll."); }
      else { p += 4; detailBits.push("Indexierung nicht blockiert."); }
    } else {
      detailBits.push("Reiner Text — Meta-Angaben nicht prüfbar.");
      rec("meta", "niedrig", "Title, Meta-Description und lang-Attribut leben im HTML-Head. Prüf dafür den echten Quelltext der Seite.");
    }
    cat("meta", "Meta, Title & Eindeutigkeit", Math.min(16, p), 16, p >= 12 ? "gut" : p >= 6 ? "teils" : "schwach", detailBits.join(" "));
  }

  // -------------------------------------------------------------------------
  // Score (0–100) = Summe der Kategorie-Punkte (max-Summe = 100).
  // -------------------------------------------------------------------------
  const maxSum = checks.reduce((s, c) => s + c.max, 0); // = 100
  const rawSum = checks.reduce((s, c) => s + c.points, 0);
  const score = Math.round(Math.max(0, Math.min(100, (rawSum / maxSum) * 100)));

  // Empfehlungen nach Schweregrad sortieren (hoch → mittel → niedrig).
  const sevRank = { hoch: 0, mittel: 1, niedrig: 2 };
  recs.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

  const grade = scoreGrade(score);
  const verdict = tooShort
    ? grade.verdict + " (Wenig Inhalt — für eine belastbare Bewertung gib die komplette Seite oder mehr Text ein.)"
    : grade.verdict;

  return {
    score,
    grade: grade.label,
    gradeColor: grade.color,
    verdict,
    inputType: doc.isHtml ? "html" : "text",
    metrics: {
      wordCount,
      charCount,
      sentenceCount,
      avgSentenceLen,
      longSentenceCount,
      readingGrade,
      readingLabel,
      h1Count: doc.h1.length,
      h2Count: doc.h2.length,
      questionHeadings: questionHeadings.length,
      jsonLdBlocks: doc.jsonLd.length,
      hasFaqSchema: doc.hasFaqSchema,
      listCount: doc.listCount,
      tableCount: doc.tableCount,
      hasTitle: doc.title.length > 0,
      hasMetaDesc: doc.metaDesc.length > 0,
      answerFirst: af.ok,
      tooShort,
    },
    categories: checks,
    recommendations: recs,
  };
}

// JSON-LD @type rekursiv einsammeln (auch in @graph / Arrays).
function collectTypes(node, set, depth = 0) {
  if (depth > 6 || node == null) return;
  if (Array.isArray(node)) { for (const n of node) collectTypes(n, set, depth + 1); return; }
  if (typeof node !== "object") return;
  const t = node["@type"];
  if (typeof t === "string") set.add(t);
  else if (Array.isArray(t)) t.forEach((x) => typeof x === "string" && set.add(x));
  if (node["@graph"]) collectTypes(node["@graph"], set, depth + 1);
}

function scoreGrade(score) {
  if (score >= 85) return { label: "AEO-stark", color: "#15803d", verdict: "Gut aufgestellt für Antwort-Maschinen. Klare Struktur, lesbar, maschinenfreundlich." };
  if (score >= 70) return { label: "Solide", color: "#65a30d", verdict: "Brauchbare Basis — ein paar Stellschrauben heben die Sichtbarkeit weiter." };
  if (score >= 50) return { label: "Ausbaufähig", color: "#d97706", verdict: "Die Grundlagen stehen, aber wichtige AEO-Signale fehlen noch." };
  if (score >= 30) return { label: "Schwach", color: "#ea580c", verdict: "Antwort-Maschinen tun sich schwer, deine Seite sauber zu verwerten." };
  return { label: "Kaum sichtbar", color: "#dc2626", verdict: "Für Antwort-Maschinen kaum verwertbar. Struktur und Klartext fehlen." };
}
