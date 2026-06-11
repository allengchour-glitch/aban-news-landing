// Cloudflare Pages Function — POST /api/generate
// „aban Pro": echte KI-Texte & Branchen-Fahrpläne. Pro-Lizenz erforderlich.
// Ohne ANTHROPIC_API_KEY -> 503 (Frontend nutzt Vorlagen-Fallback).
// Ohne gültige Pro-Lizenz -> 402.
import { requirePro } from "../_pro.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Pro-Key",
};
const SEC = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" };
const MAX_BODY = 16 * 1024;
const TIMEOUT_MS = 20000;
const RATE = { windowMs: 60000, max: 12, hits: new Map() };

function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...CORS, ...SEC, "Content-Type": "application/json; charset=utf-8" } });
}
function rateLimited(ip) {
  if (!ip) return false;
  const now = Date.now(), rec = RATE.hits.get(ip);
  if (!rec || now - rec.start > RATE.windowMs) { RATE.hits.set(ip, { start: now, count: 1 }); if (RATE.hits.size > 5000) RATE.hits.clear(); return false; }
  rec.count++; return rec.count > RATE.max;
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
  // default: text
  return `Schreibe einen ${ton} Text. Zweck/Ziel: „${ziel || "Kurztext"}". Branche/Kontext: „${branche}". ` +
    `${text ? "Ausgangsmaterial:\n\"\"\"" + text + "\"\"\"\n" : ""}Max 220 Wörter, klar gegliedert, sofort verwendbar.`;
}

export function onRequestOptions() { return new Response(null, { status: 204, headers: { ...CORS, ...SEC } }); }

export async function onRequestPost({ request, env }) {
  try {
    if (!env || !env.ANTHROPIC_API_KEY) return json({ error: "ai_off" }, 503);
    const ip = request.headers.get("CF-Connecting-IP") || "";
    if (rateLimited(ip)) return json({ error: "rate_limited" }, 429);

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: "too_large" }, 413);
    let b; try { b = JSON.parse(raw); } catch { return json({ error: "bad_json" }, 400); }

    const pro = await requirePro(request, b, env);
    if (!pro.ok) return json({ error: "pro_required", reason: pro.reason }, 402);

    const prompt = buildPrompt(b);
    const model = env.GENERATE_MODEL || "claude-sonnet-4-6";
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctl.signal,
        headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 900, system: SYSTEM, messages: [{ role: "user", content: prompt }] }),
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
