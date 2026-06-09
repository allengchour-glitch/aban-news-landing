/**
 * aban news — KI-Werkzeug AI Worker (Phase 2)
 * ---------------------------------------------------------------------------
 * Cloudflare Worker hinter `AI_ENDPOINT` von ki-werkzeug.html / en/ki-werkzeug.html.
 *
 * Zweck:
 *   1) Hält den KI-API-Key SERVERSEITIG (nie im Frontend).
 *   2) Erzwingt eine VERLUSTSICHERE Kosten-Bremse (User-Vorgabe: „Pro = unbegrenzt,
 *      nicht dass ich minus mache"): harte Tages-Obergrenzen pro IP UND global,
 *      gespeichert in Cloudflare KV. Selbst im Missbrauchsfall sind die Kosten
 *      gedeckelt und liegen klar unter den Pro-Einnahmen.
 *   3) Baut den Prompt serverseitig (Frontend schickt nur Felder), antwortet als JSON.
 *
 * Endpoints:
 *   POST /api/generate   { type, branche, thema, kw, ton, name, stimmung, lang, pro? }
 *   GET  /api/health     -> { ok:true }
 *
 * Erwartete Bindings/Vars (siehe wrangler.toml):
 *   KV-Binding  CAP_KV
 *   Secret      GEMINI_API_KEY
 *   Vars        GEMINI_MODEL, ALLOW_ORIGIN, GLOBAL_DAILY_CAP, IP_DAILY_CAP, PRO_TOKEN
 */

const DEFAULTS = {
  GEMINI_MODEL: "gemini-2.0-flash",
  ALLOW_ORIGIN: "https://abannews.com",
  GLOBAL_DAILY_CAP: "500", // harte globale Obergrenze/Tag → deckelt die Gesamtkosten
  IP_DAILY_CAP: "30",      // pro IP/Tag (Fair Use); Pro-Token hebt das auf IP_DAILY_CAP*5
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function cfg(env, key) {
  return (env[key] != null && env[key] !== "") ? String(env[key]) : DEFAULTS[key];
}

function corsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": cfg(env, "ALLOW_ORIGIN"),
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Aban-Pro",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body, status, env) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json", ...corsHeaders(env) },
  });
}

// --- Kosten-Bremse: zählt Aufrufe in KV, lehnt über dem Limit ab ----------
async function underCap(env, ip, isPro) {
  const kv = env.CAP_KV;
  if (!kv) return { ok: true }; // ohne KV keine Zählung (nur lokaler Test)
  const d = today();
  const gCap = parseInt(cfg(env, "GLOBAL_DAILY_CAP"), 10);
  const ipBase = parseInt(cfg(env, "IP_DAILY_CAP"), 10);
  const ipCap = isPro ? ipBase * 5 : ipBase;

  const gKey = `g:${d}`;
  const ipKey = `ip:${d}:${ip}`;
  const [gRaw, ipRaw] = await Promise.all([kv.get(gKey), kv.get(ipKey)]);
  const g = parseInt(gRaw || "0", 10);
  const i = parseInt(ipRaw || "0", 10);

  if (g >= gCap) return { ok: false, reason: "global" };
  if (i >= ipCap) return { ok: false, reason: "ip" };

  // hochzählen (TTL 2 Tage, damit alte Keys verfallen)
  await Promise.all([
    kv.put(gKey, String(g + 1), { expirationTtl: 172800 }),
    kv.put(ipKey, String(i + 1), { expirationTtl: 172800 }),
  ]);
  return { ok: true };
}

// --- Prompt serverseitig bauen (Frontend schickt nur Felder) --------------
function buildPrompt(p) {
  const lang = p.lang === "en" ? "en" : "de";
  const branche = (p.branche || "").replace(/\s*\(.*\)/, "");
  const kw = (p.kw || "").trim();
  const ton = p.ton || "freundlich";
  const tones = {
    freundlich: lang === "en" ? "friendly and approachable" : "freundlich und nahbar",
    professionell: lang === "en" ? "factual and professional" : "sachlich und professionell",
    locker: lang === "en" ? "casual and young" : "locker und jung",
    edel: lang === "en" ? "elegant and premium" : "edel und hochwertig",
  };
  const tone = tones[ton] || tones.freundlich;

  const typLabels = {
    produkt: lang === "en" ? "a short product/service description" : "einen kurzen Produkt-/Leistungstext",
    social: lang === "en" ? "a social media post (with 3-5 hashtags)" : "einen Social-Media-Post (mit 3-5 Hashtags)",
    bewertung: lang === "en" ? "a reply to a customer review" : "eine Antwort auf eine Kundenbewertung",
    email: lang === "en" ? "a short customer email (with subject line)" : "eine kurze Kunden-E-Mail (mit Betreffzeile)",
  };
  const what = typLabels[p.type] || typLabels.produkt;
  const stimmung = p.type === "bewertung"
    ? (p.stimmung === "kritisch"
        ? (lang === "en" ? " The review was critical/a complaint." : " Die Bewertung war kritisch/eine Beschwerde.")
        : (lang === "en" ? " The review was positive." : " Die Bewertung war positiv."))
    : "";

  const sys = lang === "en"
    ? `You are a copywriter for small businesses in the DACH region. Write honestly, concretely, no hype, no buzzwords, no invented facts or prices. Tone: ${tone}.`
    : `Du bist Texter:in für kleine Betriebe im DACH-Raum. Schreibe ehrlich, konkret, ohne Hype, ohne Buzzwords, ohne erfundene Fakten oder Preise. Tonfall: ${tone}.`;

  const task = lang === "en"
    ? `Write ${what} for a "${branche || "business"}". Topic: ${p.thema || "(general)"}.${stimmung} Keywords: ${kw || "(none)"}.${p.name ? " Sign-off/name: " + p.name + "." : ""} Keep it ready to use; do not add explanations around it.`
    : `Schreibe ${what} für „${branche || "einen Betrieb"}". Thema: ${p.thema || "(allgemein)"}.${stimmung} Stichworte: ${kw || "(keine)"}.${p.name ? " Anrede/Name: " + p.name + "." : ""} Gib den Text direkt fertig aus, ohne Erklärungen drumherum.`;

  return sys + "\n\n" + task;
}

async function callGemini(env, prompt) {
  const model = cfg(env, "GEMINI_MODEL");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, maxOutputTokens: 700 },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = (((data.candidates || [])[0] || {}).content || {}).parts || [];
  return text.map((x) => x.text || "").join("").trim();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }
    if (url.pathname === "/api/health") {
      return json({ ok: true }, 200, env);
    }
    if (url.pathname !== "/api/generate" || request.method !== "POST") {
      return json({ error: "not found" }, 404, env);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: "AI not configured" }, 503, env);
    }

    let body;
    try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400, env); }

    // Pro-Token (optional): hebt das IP-Limit, NICHT das globale (Verlustschutz bleibt)
    const token = request.headers.get("X-Aban-Pro") || "";
    const isPro = !!(env.PRO_TOKEN && token && token === env.PRO_TOKEN);

    const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
    const cap = await underCap(env, ip, isPro);
    if (!cap.ok) {
      const msg = cap.reason === "global"
        ? "Tageskontingent erreicht — morgen wieder verfügbar."
        : "Tageslimit für heute erreicht. Mit Pro gibt es mehr.";
      return json({ error: "rate_limited", reason: cap.reason, message: msg }, 429, env);
    }

    try {
      const text = await callGemini(env, buildPrompt(body));
      if (!text) return json({ error: "empty" }, 502, env);
      return json({ text }, 200, env);
    } catch (e) {
      return json({ error: "ai_error", message: String(e.message || e).slice(0, 200) }, 502, env);
    }
  },
};
