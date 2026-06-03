// Cloudflare Pages Function — POST /api/aeo-check
// Läuft serverseitig am Edge. Keine externen Abhängigkeiten, keine KI-Pflicht.
// Bewertet HTML/Text einer Seite auf AEO/GEO-Reife (Answer-/Generative-Engine-
// Optimierung). Rein lokale, deterministische Analyse.
import { analyze } from "../_aeo-engine.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
// Sicherheits-/Cache-Header auf allen Antworten.
const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
};
const MAX_CHARS = 120000;          // ganze Seiten dürfen größer sein als Marketing-Snippets
const MAX_BULK = 20;               // max. Seiten pro Bulk-Anfrage
const MAX_BODY_BYTES = 3 * 1024 * 1024; // ~3 MB Body-Limit (HTML kann groß sein)

// Sehr einfaches In-Memory-Rate-Limit pro Isolate (best effort am Edge).
// Kein KV nötig; bei Cold-Start zurückgesetzt — dämpft nur Burst-Missbrauch.
const RATE = { windowMs: 60000, max: 40, hits: new Map() };
function rateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const rec = RATE.hits.get(ip);
  if (!rec || now - rec.start > RATE.windowMs) {
    RATE.hits.set(ip, { start: now, count: 1 });
    if (RATE.hits.size > 5000) RATE.hits.clear(); // Speicher-Deckel
    return false;
  }
  rec.count++;
  return rec.count > RATE.max;
}

function baseHeaders(extra) {
  return { ...CORS, ...SECURITY, ...extra };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: baseHeaders({ "Content-Type": "application/json; charset=utf-8" }),
  });
}

function err(message, status) {
  return json({ error: message }, status);
}

function contentTypeIsJsonOrMissing(request) {
  const ct = request.headers.get("Content-Type");
  if (!ct) return true; // tolerant: kein Header → trotzdem versuchen
  return /\bapplication\/json\b/i.test(ct) || /\+json\b/i.test(ct);
}

function bodyTooLarge(request) {
  const cl = request.headers.get("Content-Length");
  if (!cl) return false;
  const n = Number(cl);
  return Number.isFinite(n) && n > MAX_BODY_BYTES;
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: baseHeaders() });
}

// Methoden-Guard: alles außer POST/OPTIONS → 405 mit Allow-Header.
export function onRequest(context) {
  const method = context.request.method.toUpperCase();
  if (method === "POST") return onRequestPost(context);
  if (method === "OPTIONS") return onRequestOptions();
  return new Response(JSON.stringify({ error: "Methode nicht erlaubt." }), {
    status: 405,
    headers: baseHeaders({
      "Content-Type": "application/json; charset=utf-8",
      Allow: "POST, OPTIONS",
    }),
  });
}

export async function onRequestPost(context) {
  const { request } = context;

  // 0) Rate-Limit (best effort).
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "";
  if (rateLimited(ip.split(",")[0].trim())) {
    return err("Zu viele Anfragen. Bitte kurz warten.", 429);
  }

  // 1) Body-Größenlimit (falls Content-Length bekannt) — vor dem Parsen.
  if (bodyTooLarge(request)) return err("Anfrage zu groß.", 413);

  // 2) Content-Type prüfen (tolerant, falls Header fehlt).
  if (!contentTypeIsJsonOrMissing(request)) {
    return err("Content-Type muss application/json sein.", 415);
  }

  // 3) Body lesen und JSON parsen.
  let raw;
  try {
    raw = await request.text();
  } catch {
    return err("Body konnte nicht gelesen werden.", 400);
  }
  if (raw && raw.length > MAX_BODY_BYTES) return err("Anfrage zu groß.", 413);

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return err("Ungültiger JSON-Body.", 400);
  }
  if (body === null || typeof body !== "object") {
    return err("Ungültiger JSON-Body.", 400);
  }

  // Bulk-Modus: { pages: ["<html>…", "…"] } → { results: [...] }
  if (Array.isArray(body.pages) || Array.isArray(body.texts)) {
    const list = Array.isArray(body.pages) ? body.pages : body.texts;
    const items = list.slice(0, MAX_BULK);
    if (items.length === 0) return err("Leere Liste.", 400);
    const results = items.map((t, i) => {
      const src = String(t == null ? "" : t).slice(0, MAX_CHARS);
      if (!src.trim()) return { index: i, error: "leer" };
      const r = analyze(src);
      // schlanke Bulk-Antwort: Kennzahlen statt voller Kategorien/Empfehlungen
      return {
        index: i,
        score: r.score,
        grade: r.grade,
        inputType: r.inputType,
        wordCount: r.metrics.wordCount,
        topGaps: r.recommendations.filter((x) => x.severity === "hoch").slice(0, 3).map((x) => x.category),
      };
    });
    return json({ count: results.length, truncated: list.length > MAX_BULK, results });
  }

  // Einzelmodus: { input } oder { html } oder { text } oder { url-paste als text }
  const inputRaw =
    body.input != null ? body.input :
    body.html != null ? body.html :
    body.text != null ? body.text : "";
  const input = String(inputRaw).slice(0, MAX_CHARS);

  if (!input.trim()) {
    return err("Kein Inhalt übergeben. Füg HTML oder den Text deiner Seite ein.", 400);
  }

  const result = analyze(input);
  return json(result);
}
