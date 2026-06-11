// Cloudflare Pages Function — POST /api/generate
// „aban Pro": echte KI-Texte & Branchen-Fahrpläne. Pro-Lizenz erforderlich.
// Ohne ANTHROPIC_API_KEY -> 503 (Frontend nutzt Vorlagen-Fallback).
// Ohne gültige Pro-Lizenz -> 402.
import { requirePro, readProKey } from "../_pro.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Pro-Key",
};
const SEC = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" };
const MAX_BODY = 16 * 1024;
const TIMEOUT_MS = 20000;
const RATE = { windowMs: 60000, hits: new Map() };
// Tier-Limits (Läufe/Minute): Jahres-Abo bekommt mehr Tempo als Monats-Abo.
const CAP_MONTHLY = 20;
const CAP_YEARLY = 60;

function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...CORS, ...SEC, "Content-Type": "application/json; charset=utf-8" } });
}
// Rate-Limit pro Bezeichner (hier: Lizenzschlüssel) mit individuellem Cap.
function rateLimited(id, max) {
  if (!id) return false;
  const now = Date.now(), rec = RATE.hits.get(id);
  if (!rec || now - rec.start > RATE.windowMs) { RATE.hits.set(id, { start: now, count: 1 }); if (RATE.hits.size > 5000) RATE.hits.clear(); return false; }
  rec.count++; return rec.count > max;
}
function clamp(s, n) { return String(s == null ? "" : s).slice(0, n).trim(); }

const SYSTEM =
  "Du bist die Schreib- & Strategie-KI von aban news (DACH, anti-hype, ehrlich, du-Form). " +
  "Schreib klar, konkret, ohne Buzzwords und ohne leere Superlative. Keine erfundenen Zahlen, " +
  "Preise oder Quellen. Deutsch, sofort verwendbar. Halte sachliche, seriöse Tonalität.";

function buildPrompt(b) {
  const kind = clamp(b.kind || "text", 24);
  const branche = clamp(b.branche || b.industry, 120);
  const ziel = clamp(b.ziel || b.goal, 400);
  const ton = clamp(b.ton || b.tone, 60) || "sachlich, freundlich";
  const text = clamp(b.text || b.input, 4000);
  const plattform = clamp(b.plattform || b.platform, 60);

  if (kind === "plan") {
    const team = clamp(b.team, 60), zeit = clamp(b.zeit || b.time, 60);
    return `Erstelle einen ehrlichen, umsetzbaren KI-Fahrplan für: Branche „${branche || "Selbstständige"}", ` +
      `Team „${team || "1 Person"}", verfügbare Zeit „${zeit || "wenige Stunden/Woche"}". ` +
      `Liefere: (1) 3 schnelle Hebel mit konkretem Tool-Typ + erstem Schritt, (2) 1 Sache, die man NICHT automatisieren sollte, ` +
      `(3) einen 4-Wochen-Plan in Stichpunkten. Keine Tool-Markennamen erfinden; nenne Kategorien.`;
  }
  if (kind === "email") {
    return `Schreibe eine kurze, höfliche deutsche E-Mail. Anlass/Ziel: „${ziel || "Kontaktaufnahme"}". ` +
      `Branche/Kontext: „${branche}". Ton: ${ton}. Max 150 Wörter, mit Betreffzeile.`;
  }
  if (kind === "rewrite") {
    return `Schreibe den folgenden Text klarer und anti-hype um (gleiche Sprache, keine Superlative, ehrlich):\n\n"""${text}"""`;
  }
  if (kind === "contentplan") {
    return `Erstelle einen ehrlichen 2-Wochen-Redaktionsplan (10 Werktage) für „${branche || "ein kleines Unternehmen"}". ` +
      `Ziel/Zielgruppe: „${ziel || "Fachpublikum"}". Pro Tag: Plattform-Idee, Hook und 1-Satz-Kernaussage. ` +
      `Anti-Hype, abwechslungsreich, ohne erfundene Zahlen. Kompakt als Liste.`;
  }
  if (kind === "emailserie") {
    return `Schreibe eine ehrliche 3-teilige E-Mail-Serie (Willkommen → Mehrwert → sanfter CTA) für „${branche}". ` +
      `Ziel: „${ziel || "neue Kontakte aktivieren"}". Ton: ${ton}. Je E-Mail: Betreff + kurzer Body (max 120 Wörter), keine Spam-Floskeln.`;
  }
  if (kind === "translate") {
    return `Übersetze den folgenden Text natürlich und passe den Ton an (nicht wörtlich). Zielsprache/Stil: „${ziel || "Englisch, professionell"}".\n\n"""${text}"""`;
  }
  if (kind === "prompt") {
    return `Verbessere den folgenden Prompt für ein Sprachmodell: präziser, mit Rolle, Kontext, Format und Beispiel. ` +
      `Gib zuerst den verbesserten Prompt, dann 1–2 Sätze Begründung.\n\n"""${text || ziel}"""`;
  }
  if (kind === "marketbrief") {
    return `Fasse die folgenden aktuellen Marktdaten in 4–6 nüchternen Sätzen zusammen (Deutsch, anti-hype, ` +
      `KEINE Anlageberatung). Nutze NUR die gegebenen Zahlen, erfinde nichts. Nenne die größten Bewegungen ` +
      `und ordne kurz ein.\n\n"""${text}"""`;
  }
  if (kind === "social") {
    return `Schreibe 3 Varianten eines Social-Media-Posts (Instagram/Facebook/LinkedIn) für „${branche}". ` +
      `Thema/Ziel: „${ziel}". Je 2–4 Sätze, starker Hook in Zeile 1, klarer CTA, 3–5 passende Hashtags, kein Hype.`;
  }
  if (kind === "product") {
    return `Schreibe eine ehrliche Produkt-/Leistungsbeschreibung für „${ziel || text}" (Branche: ${branche}). ` +
      `Nutzen statt Floskeln: 2 kurze Absätze + 3 Stichpunkte (konkrete Merkmale). Keine Superlativ-Schlacht.`;
  }
  if (kind === "blog") {
    return `Erstelle ein Blog-Artikel-Gerüst zum Thema „${ziel}" (Branche: ${branche}). Liefere: 2 Titel-Vorschläge, ` +
      `1-Satz-Teaser, 5–7 Gliederungspunkte mit je 1 Stichwort, und eine Schluss-CTA. Anti-hype, konkret.`;
  }
  if (kind === "faq") {
    return `Schreibe 6 ehrliche FAQ (Frage + kurze, klare Antwort) zum Thema „${ziel}" für „${branche}". ` +
      `Echte Kundenfragen, keine Marketing-Floskeln, sachlich.`;
  }
  if (kind === "jobad") {
    return `Schreibe eine ehrliche Stellenanzeige für „${ziel}" bei einem ${branche || "kleinen Unternehmen"}. ` +
      `Abschnitte: Aufgaben, Das bringst du mit, Das bieten wir — konkret, ohne „Rockstar/Ninja"-Floskeln, mit klarem Bewerbungs-CTA.`;
  }
  if (kind === "summary") {
    return `Fasse den folgenden Text sachlich zusammen: 3–5 Stichpunkte + ein Fazit-Satz (gleiche Sprache, nichts erfinden):\n\n"""${text || ziel}"""`;
  }
  if (kind === "slogan") {
    return `Entwickle 8 kurze, ehrliche Slogan-/Claim-Vorschläge für „${branche}" (Ziel: „${ziel}"). ` +
      `Klar, merkfähig, ohne leere Superlative. Als nummerierte Liste.`;
  }
  if (kind === "ad") {
    return `Schreibe 5 kurze Werbeanzeigen-Texte (z. B. Google/Meta Ads) für „${ziel || text}" (Branche: ${branche}). ` +
      `Je: knackige Headline (max 8 Wörter) + 1–2 Sätze Body + klarer CTA. Ehrlich, kein Clickbait, ` +
      `keine erfundenen Rabatte oder Zahlen. Als nummerierte Liste.`;
  }
  if (kind === "seo") {
    return `Erstelle SEO-Metadaten für eine Seite zum Thema „${ziel || text}" (Branche: ${branche}). ` +
      `Liefere: 2 Title-Tags (je ≤ 60 Zeichen), 2 Meta-Descriptions (je ≤ 155 Zeichen, mit sanftem CTA) ` +
      `und 5 relevante Keywords. Natürliche Sprache, kein Keyword-Spam.`;
  }
  if (kind === "newsletter") {
    return `Schreibe eine kurze, ehrliche Newsletter-Ausgabe für „${branche}". Thema/Ziel: „${ziel}". ` +
      `Aufbau: Betreffzeile → persönlicher Einstieg → 1 Kernidee → 1 umsetzbarer Tipp → kurzer CTA. ` +
      `Ton: ${ton}. Nah, klar, kein Marketing-Geschwurbel, keine erfundenen Zahlen.`;
  }
  if (kind === "review") {
    return `Schreibe eine ruhige, professionelle Antwort auf diese Kundenbewertung (Branche: ${branche}):\n\n` +
      `"""${text || ziel}"""\n\nWertschätzend, lösungsorientiert, max 4 Sätze, kein Streit. ` +
      `Bei Kritik: Verständnis zeigen und einen konkreten nächsten Schritt/Kontakt anbieten.`;
  }
  if (kind === "angebot") {
    return `Formuliere ein klares Angebots-/Kostenvoranschlag-Anschreiben für „${ziel || text}" (Branche: ${branche}). ` +
      `Struktur: Bezug/Anlass → was geliefert wird (Stichpunkte) → Nutzen → nächster Schritt. ` +
      `Preise/Beträge als [Platzhalter] lassen, nichts erfinden. Ton: ${ton}.`;
  }
  if (kind === "anleitung") {
    return `Schreibe eine klare Schritt-für-Schritt-Anleitung (SOP) für „${ziel || text}" (Kontext: ${branche}). ` +
      `Nummerierte Schritte, je 1–2 Sätze, so dass auch eine Vertretung es versteht. ` +
      `Am Ende ein kurzer Abschnitt „Häufige Fehler" mit 2–3 Punkten.`;
  }
  if (kind === "ideas") {
    return `Liefere 10 konkrete, umsetzbare Ideen zu „${ziel || text}" für „${branche}". ` +
      `Je Idee 1 Satz, vielfältig, ohne Hype, sortiert von einfach → aufwändiger. Nummerierte Liste.`;
  }
  if (kind === "landing") {
    return `Schreibe den Text für eine Landingpage zu „${ziel || text}" (Branche: ${branche}). Liefere: ` +
      `Headline + Unterzeile, 3 Nutzen-Blöcke (je Mini-Überschrift + 1 Satz), 1 ehrliches Vertrauens-Element ` +
      `(ohne erfundene Zahlen) und einen klaren CTA. Ton: ${ton}.`;
  }
  if (kind === "script") {
    return `Schreibe ein Skript für ein kurzes Video/Reel (ca. 30–45 Sek.) zu „${ziel || text}" ` +
      `(Branche: ${branche}, Plattform: ${plattform || "Instagram/TikTok"}). Aufbau: Hook (erste 2 Sek.) → ` +
      `3–4 kurze Szenen mit Bild-Hinweis + Voiceover/On-Screen-Text → CTA. Knapp, gesprochene Sprache, kein Hype.`;
  }
  if (kind === "press") {
    return `Schreibe eine sachliche Pressemitteilung für „${ziel || text}" (Branche: ${branche}). Aufbau: ` +
      `Schlagzeile, „Ort, [Datum]" als Platzhalter, 1 Kernabsatz (Wer/Was/Warum), 1 Zitat [Platzhalter Person/Rolle], ` +
      `kurzer Boilerplate-Absatz über das Unternehmen. Nüchtern, faktenbasiert, keine Superlative.`;
  }
  // default: text
  return `Schreibe einen ${ton} Text. Zweck/Ziel: „${ziel || "Kurztext"}". Branche/Kontext: „${branche}". ` +
    `${text ? "Ausgangsmaterial:\n\"\"\"" + text + "\"\"\"\n" : ""}Max 220 Wörter, klar gegliedert, sofort verwendbar.`;
}

export function onRequestOptions() { return new Response(null, { status: 204, headers: { ...CORS, ...SEC } }); }

export async function onRequestPost({ request, env }) {
  try {
    if (!env || !env.ANTHROPIC_API_KEY) return json({ error: "ai_off" }, 503);
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: "too_large" }, 413);
    let b; try { b = JSON.parse(raw); } catch { return json({ error: "bad_json" }, 400); }

    // Pro-Lizenz prüfen (kein gültiger Schlüssel → sofort 402, keine teure KI).
    const pro = await requirePro(request, b, env);
    if (!pro.ok) return json({ error: "pro_required", reason: pro.reason }, 402);

    // Tier-abhängiges Tempo-Limit pro Lizenz: Jahr 60/min, Monat 20/min.
    const cap = pro.tier === "yearly" ? CAP_YEARLY : CAP_MONTHLY;
    const lic = readProKey(request, b) || (request.headers.get("CF-Connecting-IP") || "");
    if (rateLimited(lic, cap)) return json({ error: "rate_limited", tier: pro.tier }, 429);

    // Jahres-Abo bekommt längere Outputs.
    const maxTok = pro.tier === "yearly" ? 1600 : 900;
    // Profi-Vorgaben (optional): Zielgruppe, Ton/Stil, Länge — gelten für jede Art.
    const vorgaben = [];
    if (b.zielgruppe || b.audience) vorgaben.push("Zielgruppe: " + clamp(b.zielgruppe || b.audience, 120));
    if (b.ton || b.tone) vorgaben.push("Ton/Stil: " + clamp(b.ton || b.tone, 80));
    if (b.laenge || b.length) {
      const lv = String(b.laenge || b.length);
      const lmap = { kurz: "kurz & knapp", mittel: "mittlere Länge", lang: "ausführlich", short: "kurz & knapp", medium: "mittlere Länge", long: "ausführlich" };
      vorgaben.push("Länge: " + (lmap[lv] || clamp(lv, 30)));
    }
    const prompt = buildPrompt(b) + (vorgaben.length ? "\n\nVorgaben — " + vorgaben.join(" · ") + "." : "");
    const model = env.GENERATE_MODEL || "claude-sonnet-4-6";
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctl.signal,
        headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: maxTok, system: SYSTEM, messages: [{ role: "user", content: prompt }] }),
      });
    } finally { clearTimeout(t); }

    if (!resp.ok) return json({ error: "upstream", status: resp.status }, 502);
    const data = await resp.json();
    const out = (data && data.content && data.content[0] && data.content[0].text || "").trim();
    if (!out) return json({ error: "empty" }, 502);
    return json({ text: out, model });
  } catch (e) {
    return json({ error: "server", detail: String(e && e.message || e) }, 500);
  }
}
