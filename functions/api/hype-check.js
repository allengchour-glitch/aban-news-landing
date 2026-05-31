// Cloudflare Pages Function — POST /api/hype-check
// Läuft serverseitig am Edge. Keine externen Abhängigkeiten für die Analyse.
// Optionale KI-Umschreibung via Claude, wenn das Secret ANTHROPIC_API_KEY
// im Pages-Projekt gesetzt ist — sonst regelbasierter Fallback.
import { analyze } from "../_engine.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const MAX_CHARS = 20000;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Ungültiger JSON-Body." }, 400);
  }

  const text = (body && body.text ? String(body.text) : "").slice(0, MAX_CHARS);
  const action = body && body.action ? String(body.action) : "analyze";

  if (!text.trim()) {
    return json({ error: "Kein Text übergeben." }, 400);
  }

  const result = analyze(text);

  // KI-Umschreibung nur auf Anfrage und nur, wenn ein Key vorhanden ist.
  if (action === "rewrite") {
    if (env && env.ANTHROPIC_API_KEY) {
      try {
        result.aiRewrite = await claudeRewrite(text, env);
        result.aiRewriteSource = "claude";
      } catch (e) {
        result.aiRewrite = result.ruleRewrite;
        result.aiRewriteSource = "fallback";
        result.aiRewriteError = String(e && e.message ? e.message : e);
      }
    } else {
      result.aiRewrite = result.ruleRewrite;
      result.aiRewriteSource = "fallback";
    }
  }

  return json(result);
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
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
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
  });
  if (!resp.ok) throw new Error("Anthropic API " + resp.status);
  const data = await resp.json();
  const out = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  if (!out) throw new Error("Leere Antwort");
  return out;
}
