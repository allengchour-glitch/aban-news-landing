#!/usr/bin/env node
// =============================================================================
//  ai_critique — holt KI-Kritik zu einer Seite (gratis, via Universal-LLM-Adapter)
// -----------------------------------------------------------------------------
//  Extrahiert Titel, Meta-Description, Überschriften und sichtbaren Text einer
//  HTML-Seite und lässt sie von der Gratis-KI (Groq/Gemini/OpenRouter/… je nach
//  gesetztem Key) auf Conversion, Vertrauen, SEO und Klarheit prüfen.
//
//  🔐 API-Key NUR aus der Umgebung (z. B. GROQ_API_KEY). Nichts hartcodiert.
//
//  Aufruf:
//    GROQ_API_KEY=… node automation/ai_critique.mjs inserate.html
//    GROQ_API_KEY=… node automation/ai_critique.mjs index.html --fokus "Newsletter-Anmeldung"
//    node automation/ai_critique.mjs ki-dsgvo-konform.html --punkte 6
// =============================================================================

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function extract(html) {
  const pick = (re) => (html.match(re) || [])[1] || "";
  const title = pick(/<title>([\s\S]*?)<\/title>/i).replace(/\s+/g, " ").trim();
  const desc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i).trim();
  const heads = (html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi) || [])
    .map((x) => x.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean).slice(0, 12);
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, 1600);
  return { title, desc, heads, body };
}

async function main() {
  const file = process.argv[2];
  if (!file || file.startsWith("--")) {
    console.error("Aufruf: node automation/ai_critique.mjs <seite.html> [--fokus \"…\"] [--punkte N]");
    process.exit(1);
  }
  const fokus = arg("fokus", "Conversion, Vertrauen, SEO und Klarheit");
  const punkte = parseInt(arg("punkte", "5"), 10) || 5;

  const abs = path.isAbsolute(file) ? file : path.join(ROOT, file);
  let html;
  try { html = readFileSync(abs, "utf8"); } catch { console.error("❌ Datei nicht gefunden: " + abs); process.exit(1); }
  const { title, desc, heads, body } = extract(html);

  const { llmComplete, llmProvider } = await import(path.join(ROOT, "functions/_llm.mjs"));
  if (!llmProvider(process.env)) {
    console.error("❌ Kein LLM-Key in der Umgebung. Setz z. B. GROQ_API_KEY (gratis).");
    process.exit(1);
  }

  const ctx = `SEITE: ${path.basename(file)}\nTITEL: ${title}\nDESCRIPTION: ${desc}\nÜBERSCHRIFTEN: ${heads.join(" | ")}\nSICHTBARER TEXT (Auszug): ${body}`;
  const prompt =
    `Analysiere diese Seite von abannews.com (DACH, anti-hype).\n\n${ctx}\n\n` +
    `Nenne die ${punkte} WICHTIGSTEN, konkret und schnell umsetzbaren Verbesserungen ` +
    `(je 1 Satz, priorisiert) mit Fokus auf: ${fokus}. Keine Allgemeinplätze. ` +
    `Sag am Ende in 1 Zeile, ob Titel/Description SEO-stark sind.`;

  const { text, model } = await llmComplete(process.env, {
    system: "Du bist Senior-Experte für UX, Conversion und SEO. Antworte auf Deutsch, knapp, konkret, ohne Floskeln.",
    prompt, maxTokens: 600, timeoutMs: 30000,
  });
  console.log(`\n=== KI-Kritik · ${path.basename(file)} · ${model} ===\n${text}\n`);
}

main().catch((e) => { console.error("❌ " + (e && e.message || e)); process.exit(1); });
