// Cloudflare Pages Function — POST /api/hype-check
// Läuft serverseitig am Edge. Keine externen Abhängigkeiten für die Analyse.
// Optionale KI-Umschreibung via Claude, wenn das Secret ANTHROPIC_API_KEY
// im Pages-Projekt gesetzt ist — sonst regelbasierter Fallback.
import { analyze } from "../_engine.mjs";
import { requirePro } from "../_pro.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Pro-Key",
};
// Sicherheits-/Cache-Header auf allen Antworten.
const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
};
const MAX_CHARS = 20000;
const MAX_BULK = 25; // Premium-Bulk-Check: max. Texte pro Anfrage
const MAX_BODY_BYTES = 600 * 1024; // ~600 KB Body-Limit
const CLAUDE_TIMEOUT_MS = 25000; // Timeout für den Anthropic-fetch

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

// Content-Type tolerant prüfen: fehlt der Header, versuchen wir trotzdem zu
// parsen. Ist er gesetzt, muss er JSON sein.
function contentTypeIsJsonOrMissing(request) {
  const ct = request.headers.get("Content-Type");
  if (!ct) return true; // tolerant: kein Header → trotzdem versuchen
  return /\bapplication\/json\b/i.test(ct) || /\+json\b/i.test(ct);
}

// Content-Length prüfen, falls vorhanden — vor dem Parsen abweisen.
function bodyTooLarge(request) {
  const cl = request.headers.get("Content-Length");
  if (!cl) return false;
  const n = Number(cl);
  return Number.isFinite(n) && n > MAX_BODY_BYTES;
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: baseHeaders() });
}

// Methoden-Guard: alle nicht erlaubten Methoden → 405 mit Allow-Header.
// onRequestPost/onRequestOptions bleiben die eigentlichen Handler; dieser
// generische Handler greift nur für GET/PUT/DELETE/… .
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
  const { request, env } = context;

  // 1) Body-Größenlimit (falls Content-Length bekannt) — vor dem Parsen.
  if (bodyTooLarge(request)) {
    return err("Anfrage zu groß.", 413);
  }

  // 2) Content-Type prüfen (tolerant, falls Header fehlt).
  if (!contentTypeIsJsonOrMissing(request)) {
    return err("Content-Type muss application/json sein.", 415);
  }

  // 3) Body lesen und JSON parsen. Auch hier hart gegen zu große Bodies
  //    absichern, falls Content-Length gefehlt hat.
  let raw;
  try {
    raw = await request.text();
  } catch {
    return err("Body konnte nicht gelesen werden.", 400);
  }
  if (raw && raw.length > MAX_BODY_BYTES) {
    return err("Anfrage zu groß.", 413);
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return err("Ungültiger JSON-Body.", 400);
  }
  if (body === null || typeof body !== "object") {
    return err("Ungültiger JSON-Body.", 400);
  }

  // Bulk-Modus (Premium-Basis): { texts: ["...", "..."] } → { results: [...] }
  if (Array.isArray(body.texts)) {
    const texts = body.texts.slice(0, MAX_BULK);
    if (texts.length === 0) return err("Leere Liste.", 400);
    const results = texts.map((t, i) => {
      const txt = String(t == null ? "" : t).slice(0, MAX_CHARS);
      if (!txt.trim()) return { index: i, error: "leer" };
      const r = analyze(txt);
      // schlanke Bulk-Antwort: Kennzahlen statt voller Findings/Highlights
      return {
        index: i,
        score: r.score,
        grade: r.grade,
        hypeDensity: r.metrics.hypeDensity,
        wordCount: r.metrics.wordCount,
        topCategories: r.categories.slice(0, 3).map((c) => ({ label: c.label, count: c.count })),
      };
    });
    return json({ count: results.length, truncated: body.texts.length > MAX_BULK, results });
  }

  const text = (body.text != null ? String(body.text) : "").slice(0, MAX_CHARS);
  const action = body.action != null ? String(body.action) : "analyze";

  if (!text.trim()) {
    return err("Kein Text übergeben.", 400);
  }

  const result = analyze(text);

  // KI-Umschreibung: Claude nur für „aban Pro" (gültige Lizenz) + gesetzten Key.
  // Ohne Pro/Key → regelbasierter Fallback (free), mit Hinweis proRequired.
  if (action === "rewrite") {
    const pro = (env && env.ANTHROPIC_API_KEY) ? await requirePro(request, body, env) : { ok: false, reason: "ai_off" };
    if (env && env.ANTHROPIC_API_KEY && pro.ok) {
      try {
        result.aiRewrite = await claudeRewrite(text, env);
        result.aiRewriteSource = "claude";
      } catch (e) {
        // Niemals den API-Key oder Klartext-Eingaben in der Antwort leaken.
        result.aiRewrite = result.ruleRewrite;
        result.aiRewriteSource = "fallback";
        result.aiRewriteError = safeErrorMessage(e);
      }
    } else {
      result.aiRewrite = result.ruleRewrite;
      result.aiRewriteSource = "fallback";
      if (env && env.ANTHROPIC_API_KEY && !pro.ok) result.proRequired = true;
    }
  }

  return json(result);
}

// Fehlermeldung säubern: niemals einen API-Key durchreichen.
function safeErrorMessage(e) {
  let msg = String(e && e.message ? e.message : e);
  if (msg.length > 200) msg = msg.slice(0, 200);
  // Defensive: falls jemals ein sk-... in eine Message gerät, maskieren.
  return msg.replace(/sk-[A-Za-z0-9_\-]{6,}/g, "sk-***");
}

async function claudeRewrite(text, env) {
  const model = env.HYPE_MODEL || "claude-sonnet-4-6";
  const system =
    "Du bist Lektor für nüchterne deutsche Wirtschaftstexte im Stil von aban news: " +
    "pragmatisch, direkt, anti-hype, durchgehend die du-Form. Schreibe den Text des " +
    "Nutzers um. Entferne Buzzwords, Superlative, übertriebene Versprechen, " +
    "Intensivierer und Füllwörter. Mach vage Aussagen konkret, kürze Schachtelsätze, " +
    "formuliere aktiv. Erfinde keine Fakten oder Zahlen. Gib NUR den umgeschriebenen " +
    "Text zurück, ohne Vorbemerkung.";

  // Timeout/AbortController: schlägt der fetch zu lange an, brechen wir ab und
  // fallen sauber auf ruleRewrite zurück (Aufrufer fängt den Fehler).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS);

  let resp;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1500,
        system,
        messages: [{ role: "user", content: text }],
      }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e && e.name === "AbortError") throw new Error("Anthropic API Timeout");
    throw new Error("Anthropic API nicht erreichbar");
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) throw new Error("Anthropic API " + resp.status);
  const data = await resp.json();
  const out = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  if (!out) throw new Error("Leere Antwort");
  return out;
}
