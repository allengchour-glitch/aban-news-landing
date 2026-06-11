// Cloudflare Pages Function — POST /api/audit-report
// „aban Pro": KI-Sichtbarkeits-Audit (Answer Engine Optimization). Strukturierter
// Experten-Report, wie sichtbar eine Marke in KI-Antworten (ChatGPT, Perplexity,
// Google AI Overviews) ist — und was konkret zu tun ist.
//
// Auth: gültiger aban-Pro-Lizenzschlüssel (X-Pro-Key oder body.license_key).
// Ohne ANTHROPIC_API_KEY -> 503. Ohne gültige Pro-Lizenz -> 402.
//
// EHRLICH: Der Report ist eine Experten-Einschätzung auf Basis der Angaben (und,
// falls erreichbar, des öffentlichen Startseiten-Texts). KEINE Live-Messung in
// ChatGPT & Co., KEINE erfundenen Zahlen oder Rankings.
import { requirePro, readProKey } from "../_pro.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Pro-Key",
};
const SEC = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" };
const MAX_BODY = 16 * 1024;
const TIMEOUT_MS = 30000;
const FETCH_TIMEOUT_MS = 6000;
const RATE = { windowMs: 60000, hits: new Map() };
// Audits sind teurer (lange Reports) → strengeres Limit als /api/generate.
const CAP_MONTHLY = 6;
const CAP_YEARLY = 20;

function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...CORS, ...SEC, "Content-Type": "application/json; charset=utf-8" } });
}
function rateLimited(id, max) {
  if (!id) return false;
  const now = Date.now(), rec = RATE.hits.get(id);
  if (!rec || now - rec.start > RATE.windowMs) { RATE.hits.set(id, { start: now, count: 1 }); if (RATE.hits.size > 5000) RATE.hits.clear(); return false; }
  rec.count++; return rec.count > max;
}
function clamp(s, n) { return String(s == null ? "" : s).slice(0, n).trim(); }

// Nur saubere öffentliche http(s)-URLs zulassen (kein localhost/IP/interne Hosts → kein SSRF-Missbrauch).
function safeUrl(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw); } catch { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;        // rohe IPv4
  if (host.includes(":")) return null;                            // IPv6
  if (!host.includes(".")) return null;                          // kein TLD
  return u;
}

// Startseiten-Text leichtgewichtig holen (Tags raus, gekappt). Fehler = einfach ohne Grounding weiter.
async function fetchSiteText(u) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(u.toString(), {
      signal: ctl.signal, redirect: "follow",
      headers: { "User-Agent": "aban-news-audit/1.0 (+https://abannews.com)", "Accept": "text/html" },
    });
    if (!r.ok) return "";
    const ct = r.headers.get("content-type") || "";
    if (!/text\/html|text\/plain/i.test(ct)) return "";
    let html = (await r.text()).slice(0, 120000);
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ""])[1].trim();
    const desc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || [, ""])[1].trim();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    return clamp(`TITEL: ${title}\nMETA-DESCRIPTION: ${desc}\nSEITENTEXT (Auszug): ${text}`, 6000);
  } catch { return ""; } finally { clearTimeout(t); }
}

const SYSTEM =
  "Du bist die KI-Sichtbarkeits-Auditorin von aban news (DACH, anti-hype, ehrlich, du-Form). " +
  "Du bewertest, wie gut eine Marke in KI-Antworten (ChatGPT, Perplexity, Google AI Overviews, Gemini) " +
  "auffindbar/zitierbar ist (Answer Engine Optimization / GEO). Schreib klar, konkret, ohne Buzzwords. " +
  "WICHTIG: Du hast KEINEN Live-Zugriff auf ChatGPT & Co. — erfinde KEINE Rankings, Prozente, Mitbewerber " +
  "oder Zahlen. Stütze dich NUR auf die gegebenen Angaben (und den ggf. mitgelieferten Startseiten-Text). " +
  "Mach Annahmen transparent. Empfehlungen müssen umsetzbar und priorisiert sein.";

function buildPrompt(b, siteText) {
  const website = clamp(b.website || b.url, 200);
  const brand = clamp(b.brand || b.marke, 120);
  const branche = clamp(b.branche || b.industry, 120);
  const beschreibung = clamp(b.beschreibung || b.description, 1200);
  const ziel = clamp(b.ziel || b.goal, 400);
  return (
    `Erstelle einen strukturierten KI-Sichtbarkeits-Audit (Answer Engine Optimization) für diese Marke.\n\n` +
    `ANGABEN:\n` +
    `- Marke: ${brand || "(nicht angegeben)"}\n` +
    `- Website: ${website || "(nicht angegeben)"}\n` +
    `- Branche: ${branche || "(nicht angegeben)"}\n` +
    `- Was die Marke macht: ${beschreibung || "(nicht angegeben)"}\n` +
    `- Ziel des Audits: ${ziel || "Mehr Sichtbarkeit in KI-Antworten gewinnen"}\n` +
    (siteText ? `\nÖFFENTLICHER STARTSEITEN-TEXT (zur Einordnung, evtl. unvollständig):\n"""${siteText}"""\n` : "") +
    `\nLIEFERE DEN REPORT IN GENAU DIESEN ABSCHNITTEN (Markdown-Überschriften):\n` +
    `## 1. Kurz-Einschätzung\n2–4 Sätze: Wie gut ist die Marke vermutlich in KI-Antworten auffindbar — und warum. Annahmen offenlegen.\n` +
    `## 2. Stärken\n3–5 Stichpunkte, was bereits für KI-Sichtbarkeit spricht.\n` +
    `## 3. Lücken & Risiken\n3–6 Stichpunkte mit den größten Hebeln, die fehlen.\n` +
    `## 4. Konkrete Maßnahmen (priorisiert)\n6–9 umsetzbare Schritte, je: Maßnahme — warum sie für KI-Antworten zählt — erster konkreter Schritt. Sortiert nach Wirkung/Aufwand.\n` +
    `## 5. Inhalte, die KI-Systeme gern zitieren\n4–6 konkrete Content-Ideen (FAQ, Vergleiche, Definitionen, Daten) passend zur Branche.\n` +
    `## 6. 30-Tage-Fahrplan\nWoche-für-Woche Stichpunkte, realistisch für ein kleines Team.\n` +
    `## 7. Womit du den Fortschritt selbst prüfst\n3–4 ehrliche, kostenlose Prüf-Methoden (z. B. selbst in ChatGPT/Perplexity nach der Kategorie fragen).\n\n` +
    `Schluss: ein Satz, dass dies eine Experten-Einschätzung ohne Live-Messung ist.`
  );
}

export function onRequestOptions() { return new Response(null, { status: 204, headers: { ...CORS, ...SEC } }); }

export async function onRequestPost({ request, env }) {
  try {
    if (!env || !env.ANTHROPIC_API_KEY) return json({ error: "ai_off" }, 503);
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: "too_large" }, 413);
    let b; try { b = JSON.parse(raw); } catch { return json({ error: "bad_json" }, 400); }

    const pro = await requirePro(request, b, env);
    if (!pro.ok) return json({ error: "pro_required", reason: pro.reason }, 402);

    const cap = pro.tier === "yearly" ? CAP_YEARLY : CAP_MONTHLY;
    const lic = readProKey(request, b) || (request.headers.get("CF-Connecting-IP") || "");
    if (rateLimited(lic, cap)) return json({ error: "rate_limited", tier: pro.tier }, 429);

    // Optionales Grounding: öffentlichen Startseiten-Text holen (nur saubere http(s)-URL).
    let siteText = "";
    const u = safeUrl(clamp(b.website || b.url, 200));
    if (u) siteText = await fetchSiteText(u);

    const isEN = String(b.lang || b.language || "").toLowerCase().startsWith("en");
    let prompt = buildPrompt(b, siteText);
    if (isEN) prompt += "\n\nIMPORTANT: Write the entire report in English (keep the same section structure).";
    const system = isEN ? SYSTEM.replace(
      "Du bist die KI-Sichtbarkeits-Auditorin von aban news (DACH, anti-hype, ehrlich, du-Form).",
      "You are the AI-visibility auditor of aban news (anti-hype, honest, direct). Respond in English."
    ) : SYSTEM;
    const model = env.GENERATE_MODEL || "claude-sonnet-4-6";
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: ctl.signal,
        headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 2400, system, messages: [{ role: "user", content: prompt }] }),
      });
    } finally { clearTimeout(t); }

    if (!resp.ok) return json({ error: "upstream", status: resp.status }, 502);
    const data = await resp.json();
    const out = (data && data.content && data.content[0] && data.content[0].text || "").trim();
    if (!out) return json({ error: "empty" }, 502);
    return json({ report: out, grounded: !!siteText, tier: pro.tier, model });
  } catch (e) {
    return json({ error: "server", detail: String(e && e.message || e) }, 500);
  }
}
