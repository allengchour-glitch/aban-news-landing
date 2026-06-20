// Geteilter LLM-Adapter für die Cloudflare-Pages-Functions — Universal-Switch.
// Ein Adapter, ein Env-Schalter (docs/TOKEN-SPAREN.md). Erkennt automatisch den
// ersten vorhandenen Anbieter-Key. Per env.LLM_PROVIDER lässt sich ein Anbieter
// erzwingen (sofern dessen Key gesetzt ist).
//
// Unterstützte Anbieter (Key → Anbieter):
//   ANTHROPIC_API_KEY   → Anthropic (Claude)        [eigenes Format]
//   OPENAI_API_KEY      → OpenAI (ChatGPT)
//   DEEPSEEK_API_KEY    → DeepSeek
//   XAI_API_KEY         → xAI (Grok)
//   MISTRAL_API_KEY     → Mistral
//   GEMINI_API_KEY      → Google Gemini (OpenAI-kompatibler Endpoint)
//   OPENROUTER_API_KEY  → OpenRouter (viele Modelle, auch gratis)
//   GROQ_API_KEY        → Groq (Llama, grosse Gratis-Stufe)
// Alle ausser Anthropic sprechen das OpenAI-kompatible /chat/completions-Format.
//
// 🔐 Keys werden AUSSCHLIESSLICH aus `env` gelesen — niemals hartcodiert/committet.

// OpenAI-kompatible Anbieter: Reihenfolge = Standard-Priorität (erster Key gewinnt).
const OPENAI_COMPAT = [
  { id: "openai", keyEnv: "OPENAI_API_KEY", url: "https://api.openai.com/v1/chat/completions", modelEnv: "OPENAI_MODEL", model: "gpt-4o-mini" },
  { id: "deepseek", keyEnv: "DEEPSEEK_API_KEY", url: "https://api.deepseek.com/chat/completions", modelEnv: "DEEPSEEK_MODEL", model: "deepseek-chat" },
  { id: "xai", keyEnv: "XAI_API_KEY", url: "https://api.x.ai/v1/chat/completions", modelEnv: "XAI_MODEL", model: "grok-2-latest" },
  { id: "mistral", keyEnv: "MISTRAL_API_KEY", url: "https://api.mistral.ai/v1/chat/completions", modelEnv: "MISTRAL_MODEL", model: "mistral-small-latest" },
  { id: "gemini", keyEnv: "GEMINI_API_KEY", url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", modelEnv: "GEMINI_MODEL", model: "gemini-1.5-flash" },
  { id: "openrouter", keyEnv: "OPENROUTER_API_KEY", url: "https://openrouter.ai/api/v1/chat/completions", modelEnv: "OPENROUTER_MODEL", model: "meta-llama/llama-3.3-70b-instruct:free" },
  { id: "groq", keyEnv: "GROQ_API_KEY", url: "https://api.groq.com/openai/v1/chat/completions", modelEnv: "GROQ_MODEL", model: "llama-3.3-70b-versatile" },
];
// Anthropic zuerst, dann die OpenAI-kompatiblen.
const ORDER = ["anthropic", ...OPENAI_COMPAT.map((p) => p.id)];

function has(env, id) {
  if (!env) return false;
  if (id === "anthropic") return !!env.ANTHROPIC_API_KEY;
  const cfg = OPENAI_COMPAT.find((p) => p.id === id);
  return !!(cfg && env[cfg.keyEnv]);
}

export function llmProvider(env) {
  const forced = env && env.LLM_PROVIDER;
  if (forced && has(env, forced)) return forced;
  for (const id of ORDER) if (has(env, id)) return id;
  return null;
}

export function llmAvailable(env) {
  return llmProvider(env) !== null;
}

// Liefert { text, model }. Wirft bei Upstream-Fehler einen Error mit `.status`,
// bei fehlendem Provider einen Error mit `.code === "off"`.
export async function llmComplete(env, opts) {
  const {
    system = "",
    prompt = "",
    maxTokens = 900,
    timeoutMs = 20000,
    anthropicModel,
    model: modelOverride,
  } = opts || {};

  const provider = llmProvider(env);
  if (!provider) { const e = new Error("llm_off"); e.code = "off"; throw e; }

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    if (provider === "anthropic") {
      const model = anthropicModel || env.GENERATE_MODEL || "claude-sonnet-4-6";
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: ctl.signal,
        headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: prompt }] }),
      });
      if (!resp.ok) { const e = new Error("upstream"); e.status = resp.status; throw e; }
      const data = await resp.json();
      const text = (data && data.content && data.content[0] && data.content[0].text || "").trim();
      return { text, model };
    }

    // OpenAI-kompatibler Anbieter.
    const cfg = OPENAI_COMPAT.find((p) => p.id === provider);
    const model = modelOverride || env[cfg.modelEnv] || cfg.model;
    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });
    const resp = await fetch(cfg.url, {
      method: "POST",
      signal: ctl.signal,
      headers: { "authorization": "Bearer " + env[cfg.keyEnv], "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
    });
    if (!resp.ok) { const e = new Error("upstream"); e.status = resp.status; throw e; }
    const data = await resp.json();
    const text = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || "").trim();
    return { text, model };
  } finally { clearTimeout(t); }
}
