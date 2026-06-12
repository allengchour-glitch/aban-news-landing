// Cloudflare Pages Function — POST /api/demo
// GRATIS-Mini-Vorgeschmack fürs KI-Studio (ohne Pro-Schlüssel), damit Besucher
// die Qualität erleben, bevor sie aban Pro kaufen. Bewusst eng begrenzt:
//  - nur von abannews.com (Origin-Check) — kein Off-Site-Scripting
//  - wenige, günstige Arten + sehr kurze Ausgabe (kostenarm)
//  - strenges Limit pro IP + weicher Gesamt-Deckel je Edge-Instanz
// Ohne ANTHROPIC_API_KEY -> 503.
const CORS = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const SEC = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" };
const MAX_BODY = 4 * 1024;
const TIMEOUT_MS = 15000;
const MAXTOK = 280;
// Limits (best-effort, in-memory je Edge-Instanz): pro IP und gesamt.
const IP = { windowMs: 24 * 3600 * 1000, cap: 3, hits: new Map() };
const GLOBAL = { windowMs: 3600 * 1000, cap: 400, start: 0, count: 0 };
const ALLOWED = new Set(["text", "email", "social", "slogan", "ad"]);
const ALLOWED_ORIGINS = ["https://abannews.com", "https://www.abannews.com", "https://abannews.pages.dev"];

function corsFor(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin);
  return { ...CORS, "Access-Control-Allow-Origin": ok ? origin : "https://abannews.com" };
}
function json(o, s, origin) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...corsFor(origin), ...SEC, "Content-Type": "application/json; charset=utf-8" } });
}
function clamp(s, n) { return String(s == null ? "" : s).slice(0, n).trim(); }

function ipLimited(ip) {
  if (!ip) return false;
  const now = Date.now(), rec = IP.hits.get(ip);
  if (!rec || now - rec.start > IP.windowMs) { IP.hits.set(ip, { start: now, count: 1 }); if (IP.hits.size > 20000) IP.hits.clear(); return false; }
  rec.count++; return rec.count > IP.cap;
}
function globalLimited() {
  const now = Date.now();
  if (now - GLOBAL.start > GLOBAL.windowMs) { GLOBAL.start = now; GLOBAL.count = 0; }
  GLOBAL.count++; return GLOBAL.count > GLOBAL.cap;
}

const SYSTEM_DE = "Du bist die Schreib-KI von aban news (DACH, anti-hype, ehrlich, du-Form). Klar, konkret, ohne Buzzwords. Keine erfundenen Zahlen/Preise. Halte dich KURZ (Vorgeschmack).";
const SYSTEM_EN = "You are the writing AI of aban news (anti-hype, honest). Clear, concrete, no buzzwords. No invented numbers/prices. Keep it SHORT (a teaser). Respond in English.";

function demoPrompt(kind, branche, ziel, en) {
  const b = branche || (en ? "a small business" : "ein kleines Unternehmen");
  const z = ziel || (en ? "a short intro text" : "ein kurzer Vorstellungstext");
  if (en) {
    if (kind === "email") return `Write a short, friendly email (max 70 words, with subject) for "${b}". Purpose: "${z}".`;
    if (kind === "social") return `Write ONE short social post (max 50 words) for "${b}". Topic: "${z}". One hook, no hype.`;
    if (kind === "slogan") return `Give 4 short, honest slogans for "${b}" (goal: "${z}"). Numbered list.`;
    if (kind === "ad") return `Write 2 short ad texts (headline + 1 sentence + CTA) for "${b}". Goal: "${z}".`;
    return `Write a short, clear text (max 80 words) for "${b}". Purpose: "${z}".`;
  }
  if (kind === "email") return `Schreibe eine kurze, freundliche E-Mail (max 70 Wörter, mit Betreff) für „${b}". Anlass: „${z}".`;
  if (kind === "social") return `Schreibe EINEN kurzen Social-Post (max 50 Wörter) für „${b}". Thema: „${z}". Ein Hook, kein Hype.`;
  if (kind === "slogan") return `Gib 4 kurze, ehrliche Slogans für „${b}" (Ziel: „${z}"). Nummerierte Liste.`;
  if (kind === "ad") return `Schreibe 2 kurze Werbetexte (Headline + 1 Satz + CTA) für „${b}". Ziel: „${z}".`;
  return `Schreibe einen kurzen, klaren Text (max 80 Wörter) für „${b}". Zweck: „${z}".`;
}

export function onRequestOptions({ request }) {
  return new Response(null, { status: 204, headers: { ...corsFor(request.headers.get("Origin") || ""), ...SEC } });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin") || "";
  try {
    if (!env || !env.ANTHROPIC_API_KEY) return json({ error: "ai_off" }, 503, origin);
    // Nur von der eigenen Seite (deckt casual-Missbrauch ab).
    if (!ALLOWED_ORIGINS.includes(origin)) return json({ error: "forbidden" }, 403, origin);
    if (globalLimited()) return json({ error: "demo_busy" }, 429, origin);
    const ip = request.headers.get("CF-Connecting-IP") || "";
    if (ipLimited(ip)) return json({ error: "demo_limit", upsell: true }, 429, origin);

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: "too_large" }, 413, origin);
    let b; try { b = JSON.parse(raw); } catch { return json({ error: "bad_json" }, 400, origin); }

    let kind = clamp(b.kind || "text", 16);
    if (!ALLOWED.has(kind)) kind = "text";
    const en = String(b.lang || "").toLowerCase().startsWith("en");
    const prompt = demoPrompt(kind, clamp(b.branche, 80), clamp(b.ziel, 200), en);
    const model = env.GENERATE_MODEL || "claude-sonnet-4-6";

    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: ctl.signal,
        headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: MAXTOK, system: en ? SYSTEM_EN : SYSTEM_DE, messages: [{ role: "user", content: prompt }] }),
      });
    } finally { clearTimeout(t); }

    if (!resp.ok) return json({ error: "upstream" }, 502, origin);
    const data = await resp.json();
    const out = (data && data.content && data.content[0] && data.content[0].text || "").trim();
    if (!out) return json({ error: "empty" }, 502, origin);
    return json({ text: out, demo: true }, 200, origin);
  } catch (e) {
    return json({ error: "server" }, 500, origin);
  }
}
