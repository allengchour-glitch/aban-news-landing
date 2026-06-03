// functions/_visibility-engine.mjs
// Reine, deterministische Engine für den KI-Erwähnungs-Check (Marken-Präsenz in
// KI-Antworten). KEINE externen Aufrufe, keine KI-Pflicht, ReDoS-fest (es werden
// keine Nutzer-Eingaben als Regex ausgeführt; Eingaben werden nur in Templates
// eingesetzt). Aban-Voice: anti-hype, du-Form, keine erfundenen Zahlen.
//
// Eingabe:  { branche, ort?, firma, leistungen?: string[] }
// Ausgabe:  { prompts[], anleitung[], massnahmen[], rubrik[], hinweis }

const MAX_LEN = 80;
const MAX_LEISTUNGEN = 5;

export function sanitizeField(value) {
  if (typeof value !== "string") return "";
  // Steuerzeichen raus, trimmen, Länge deckeln. Kein Markup, keine Regex-Ausführung.
  let s = value.replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim();
  if (s.length > MAX_LEN) s = s.slice(0, MAX_LEN).trim();
  return s;
}

export function normInput(raw) {
  const branche = sanitizeField(raw && raw.branche);
  const ort = sanitizeField(raw && raw.ort);
  const firma = sanitizeField(raw && raw.firma);
  let leistungen = [];
  if (Array.isArray(raw && raw.leistungen)) {
    leistungen = raw.leistungen.map(sanitizeField).filter(Boolean).slice(0, MAX_LEISTUNGEN);
  } else if (typeof (raw && raw.leistungen) === "string") {
    leistungen = raw.leistungen.split(/[,;\n]/).map(sanitizeField).filter(Boolean).slice(0, MAX_LEISTUNGEN);
  }
  return { branche, ort, firma, leistungen };
}

// Erzeugt realistische Kund:innen-Fragen, die jemand einer KI stellt, um einen
// Anbieter wie dich zu finden. Genau diese Prompts solltest du selbst testen.
export function buildPrompts({ branche, ort, leistungen }) {
  const inOrt = ort ? ` in ${ort}` : "";
  const prompts = [];
  if (branche) {
    prompts.push(`Welche ${branche}${inOrt} kannst du empfehlen?`);
    prompts.push(`Ich suche eine gute ${branche}${inOrt} — wen schlägst du vor?`);
    prompts.push(`Beste ${branche}${inOrt}: worauf sollte ich achten?`);
    prompts.push(`${branche}${inOrt} mit guten Bewertungen?`);
    if (ort) prompts.push(`Wer ist die seriöseste ${branche} in ${ort}?`);
  }
  for (const l of leistungen) {
    prompts.push(`Wer bietet ${l}${inOrt} an?`);
    prompts.push(`Was kostet ${l}${ort ? ` in ${ort}` : ""} ungefähr?`);
  }
  // Dedupe, harte Obergrenze.
  return [...new Set(prompts)].slice(0, 12);
}

export function buildAnleitung() {
  return [
    "Öffne nacheinander ChatGPT, Google (AI-Übersicht/Gemini) und Perplexity.",
    "Stell jede Frage oben einzeln — wortwörtlich, ohne deinen Firmennamen zu nennen.",
    "Notiere bei jeder Antwort: Wirst du genannt? An welcher Stelle? Stimmen die Angaben (Ort, Leistung, Kontakt)?",
    "Schreib mit, welche Wettbewerber genannt werden — das ist deine echte KI-Konkurrenz.",
    "Wiederhol den Test einmal im Monat. KI-Antworten ändern sich; nur die Entwicklung zählt.",
  ];
}

// Konkrete, ehrliche Maßnahmen, um in KI-Antworten aufzutauchen.
// Kein Hype, keine Garantien — KI-Sichtbarkeit ist beeinflussbar, nicht kaufbar.
export function buildMassnahmen({ branche, ort, leistungen }) {
  const ortTxt = ort || "deinem Ort";
  const leistungTxt = leistungen[0] || "deiner Hauptleistung";
  return [
    {
      titel: "Beantworte die Fragen selbst — auf deiner Seite",
      text: `Leg pro Frage oben einen klaren Abschnitt an (FAQ oder eigene Seite), der ${branche || "deine Leistung"}${ort ? ` in ${ort}` : ""} wörtlich benennt. KI-Modelle zitieren Quellen, die eine Frage direkt und sauber beantworten.`,
    },
    {
      titel: "Strukturierte Daten (Schema.org)",
      text: "Hinterleg LocalBusiness-/FAQPage-JSON-LD mit Name, Adresse, Leistungen und Öffnungszeiten. Das macht es Maschinen leicht, dich korrekt zuzuordnen.",
    },
    {
      titel: "Name, Adresse, Leistung — überall identisch",
      text: `Schreib ${ortTxt} und ${leistungTxt} auf Website, Google-Unternehmensprofil und in Branchenverzeichnissen exakt gleich. Widersprüche verwässern dein Signal.`,
    },
    {
      titel: "In Verzeichnisse, die KI liest",
      text: "Trag dich in seriöse, branchenrelevante Verzeichnisse und Vergleichsseiten ein. KI-Modelle stützen sich auf solche Listen, wenn sie Anbieter nennen.",
    },
    {
      titel: "Echte Bewertungen sammeln",
      text: "Bitte zufriedene Kund:innen aktiv um Bewertungen (Google, branchenüblich). Menge und Aktualität fließen in das ein, was Modelle als empfehlenswert aufgreifen.",
    },
    {
      titel: "Von Dritten erwähnt werden",
      text: "Eine Erwähnung in lokaler Presse, einem Fachblog oder Partner-Seite wirkt stärker als Eigenlob. Modelle gewichten unabhängige Quellen höher.",
    },
  ];
}

export function buildRubrik() {
  return [
    "0 Treffer in allen drei Tools: KI kennt dich noch nicht — fang bei Maßnahme 1–3 an.",
    "Genannt, aber falsche Angaben: Daten-Konsistenz reparieren (Maßnahme 2–3).",
    "Vereinzelt genannt: dranbleiben, Bewertungen und Drittquellen ausbauen (Maßnahme 5–6).",
    "Regelmäßig oben genannt: gut — monatlich prüfen, dass es so bleibt.",
  ];
}

export function analyze(raw) {
  const input = normInput(raw);
  if (!input.branche && input.leistungen.length === 0) {
    return { ok: false, error: "Bitte mindestens Branche oder eine Leistung angeben." };
  }
  return {
    ok: true,
    input,
    prompts: buildPrompts(input),
    anleitung: buildAnleitung(),
    massnahmen: buildMassnahmen(input),
    rubrik: buildRubrik(),
    hinweis:
      "Diese Prompts und Maßnahmen sind ein Selbst-Test-Bausatz. Es gibt keine Garantie, " +
      "von KI genannt zu werden — Sichtbarkeit ist beeinflussbar, nicht kaufbar. Teste die " +
      "Fragen immer selbst in den echten Tools; nur das zeigt deinen wahren Stand.",
  };
}
