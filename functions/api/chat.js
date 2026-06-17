// Cloudflare Pages Function — POST /api/chat
// „Frag aban"-LLM-Modus: natürlichsprachige Antwort, GEERDET auf den vom Widget
// mitgeschickten Kontext-Auszügen von abannews.com (kein freies Halluzinieren).
// Ohne ANTHROPIC_API_KEY -> 503, das Widget fällt sauber auf die Index-Suche zurück.
// (Mit GROQ_API_KEY läuft es per Gratis-Fallback weiter — siehe ../_llm.mjs.)
import { llmAvailable, llmComplete } from "../_llm.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const SECURITY = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 24 * 1024;
const TIMEOUT_MS = 12000;
const RATE = { windowMs: 60000, max: 20, hits: new Map() };

function rateLimited(ip) {
  if (!ip) return false;
  const now = Date.now(), rec = RATE.hits.get(ip);
  if (!rec || now - rec.start > RATE.windowMs) {
    RATE.hits.set(ip, { start: now, count: 1 });
    if (RATE.hits.size > 5000) RATE.hits.clear();
    return false;
  }
  rec.count++; return rec.count > RATE.max;
}
function headers(extra) { return { ...CORS, ...SECURITY, ...extra }; }
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: headers({ "Content-Type": "application/json; charset=utf-8" }) });
}

const SYSTEM =
  "Du bist der freundliche Assistent von aban news — täglicher deutschsprachiger KI-Newsletter für DACH, anti-hype, ehrlich. " +
  "Antworte KURZ (höchstens 3 Sätze), auf Deutsch, in du-Form, ohne Hype/Buzzwords. " +
  "Nutze AUSSCHLIESSLICH die bereitgestellten Kontext-Auszüge von abannews.com. " +
  "Steht die Antwort nicht im Kontext, sag ehrlich, dass du es nicht sicher weißt, und verweise auf hallo@abannews.com oder den Newsletter. " +
  "Erfinde nichts — keine Preise, Fakten oder Versprechen ohne Kontext. Nenne wenn möglich die passende Seite beim Namen.";

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: headers({}) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    if (!llmAvailable(env)) return json({ error: "llm_off" }, 503);
    const ip = request.headers.get("CF-Connecting-IP") || "";
    if (rateLimited(ip)) return json({ error: "rate_limited" }, 429);

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "too_large" }, 413);
    let b; try { b = JSON.parse(raw); } catch { return json({ error: "bad_json" }, 400); }

    const q = String(b.q || b.question || "").slice(0, 600).trim();
    if (!q) return json({ error: "no_question" }, 400);
    const ctx = Array.isArray(b.context) ? b.context.slice(0, 6) : [];
    const ctxText = ctx.map((c, i) =>
      `[${i + 1}] ${String(c.q || c.title || "").slice(0, 200)} — ${String(c.a || c.snippet || "").slice(0, 400)} (${String(c.url || "").slice(0, 200)})`
    ).join("\n") || "(kein Kontext gefunden)";

    const user = `Frage des Besuchers:\n${q}\n\nKontext-Auszüge von abannews.com:\n${ctxText}`;

    let answer;
    try {
      ({ text: answer } = await llmComplete(env, {
        system: SYSTEM,
        prompt: user,
        maxTokens: 320,
        timeoutMs: TIMEOUT_MS,
        anthropicModel: env.CHAT_MODEL || "claude-haiku-4-5-20251001",
      }));
    } catch (e) {
      if (e && e.status) return json({ error: "upstream", status: e.status }, 502);
      throw e;
    }
    if (!answer) return json({ error: "empty" }, 502);
    return json({ answer });
  } catch (e) {
    return json({ error: "server", detail: String(e && e.message || e) }, 500);
  }
}
