// Cloudflare Pages Function — POST /api/ki-erwaehnung
// KI-Erwähnungs-Check: erzeugt realistische Such-Prompts + Maßnahmen (deterministisch,
// keine KI-Pflicht). Optional eine Stellvertreter-Einschätzung via Claude, ob ein
// Sprachmodell die Firma kennt — ehrlich als Proxy markiert (kein Live-ChatGPT/Perplexity).
import { analyze } from "../_visibility-engine.mjs";
import { requirePro } from "../_pro.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Pro-Key",
};
const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
};
const MAX_BODY_BYTES = 16 * 1024; // kleine, getippte Eingaben
const CLAUDE_TIMEOUT_MS = 12000;

const RATE = { windowMs: 60000, max: 20, hits: new Map() };
function rateLimited(ip) {
  if (!ip) return false;
  const now = Date.now();
  const rec = RATE.hits.get(ip);
  if (!rec || now - rec.start > RATE.windowMs) {
    RATE.hits.set(ip, { start: now, count: 1 });
    if (RATE.hits.size > 5000) RATE.hits.clear();
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

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: baseHeaders({}) });
}

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "";
  if (rateLimited(ip)) return err("Zu viele Anfragen. Bitte kurz warten.", 429);

  const len = Number(request.headers.get("Content-Length") || 0);
  if (len && len > MAX_BODY_BYTES) return err("Eingabe zu groß.", 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return err("Ungültiges JSON.", 400);
  }

  const result = analyze(body);
  if (!result.ok) return err(result.error, 400);

  // KI-Einschätzung (Claude) nur für „aban Pro": Firmenname + Key + gültige Lizenz.
  const proOk = (result.input.firma && env && env.ANTHROPIC_API_KEY)
    ? (await requirePro(request, body, env)).ok : false;
  if (proOk) {
    try {
      result.kiCheck = await claudeKnows(result.input, env);
      result.kiCheckSource = "claude";
    } catch (e) {
      result.kiCheckSource = "fallback";
      result.kiCheckError = safeErrorMessage(e);
    }
  } else {
    result.kiCheckSource = "fallback";
    if (result.input.firma && env && env.ANTHROPIC_API_KEY) result.proRequired = true;
  }
  return json(result);
}

function safeErrorMessage(e) {
  let msg = String(e && e.message ? e.message : e);
  if (msg.length > 200) msg = msg.slice(0, 200);
  return msg.replace(/sk-[A-Za-z0-9_\-]{6,}/g, "sk-***");
}

// Fragt ein Sprachmodell stellvertretend, ob es die Firma kennt. Ergebnis ist eine
// grobe Indikation aus dem Trainingswissen — KEIN Live-Ergebnis aus ChatGPT/Perplexity.
async function claudeKnows(input, env) {
  const model = env.VISIBILITY_MODEL || "claude-haiku-4-5-20251001";
  const system =
    "Du bist ein nüchterner KI-Sichtbarkeits-Prüfer für aban news (anti-hype, du-Form). " +
    "Du bekommst Firma, Branche und Ort. Antworte NUR mit JSON nach diesem Schema: " +
    '{"genannt": true|false, "einschaetzung": "1-2 Sätze, ehrlich", ' +
    '"genannte_wettbewerber": ["..."], "luecken": ["konkrete Lücke", "..."]}. ' +
    "Stütz dich allein auf dein Trainingswissen. Wenn du die Firma nicht kennst, sag das " +
    "klar (genannt=false). Erfinde keine Fakten, keine Zahlen, keine erfundenen Wettbewerber.";
  const user =
    `Firma: ${input.firma}\nBranche: ${input.branche || "—"}\nOrt: ${input.ort || "—"}\n` +
    `Leistungen: ${input.leistungen.join(", ") || "—"}\n\n` +
    "Kennst du diese Firma aus deinem Trainingswissen? Würdest du sie nennen, wenn jemand " +
    "nach so einem Anbieter fragt? Antworte als JSON.";

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
        max_tokens: 600,
        system,
        messages: [{ role: "user", content: user }],
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

  // JSON robust herausziehen (Modell könnte Text drumherum liefern).
  let parsed;
  try {
    const m = out.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(m ? m[0] : out);
  } catch {
    throw new Error("Antwort nicht als JSON lesbar");
  }
  // Auf bekannte Felder beschränken + Typen härten.
  return {
    genannt: parsed.genannt === true,
    einschaetzung: typeof parsed.einschaetzung === "string" ? parsed.einschaetzung.slice(0, 400) : "",
    genannte_wettbewerber: Array.isArray(parsed.genannte_wettbewerber)
      ? parsed.genannte_wettbewerber.filter((x) => typeof x === "string").slice(0, 8).map((x) => x.slice(0, 80))
      : [],
    luecken: Array.isArray(parsed.luecken)
      ? parsed.luecken.filter((x) => typeof x === "string").slice(0, 6).map((x) => x.slice(0, 160))
      : [],
  };
}
