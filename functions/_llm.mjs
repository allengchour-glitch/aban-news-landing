// Geteilter LLM-Adapter für die Cloudflare-Pages-Functions.
// Primär Anthropic (Claude). Fällt automatisch auf Groq (Llama, OpenAI-kompatibel,
// grosse Gratis-Stufe) zurück, wenn KEIN ANTHROPIC_API_KEY, aber ein GROQ_API_KEY
// in der Umgebung liegt. „Ein Adapter, ein Env-Switch" (docs/TOKEN-SPAREN.md).
//
// 🔐 Keys werden AUSSCHLIESSLICH aus `env` gelesen — niemals hartcodiert/committet.

export function llmProvider(env) {
  if (env && env.ANTHROPIC_API_KEY) return "anthropic";
  if (env && env.GROQ_API_KEY) return "groq";
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
    groqModel,
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

    // Groq — OpenAI-kompatibler Chat-Completions-Endpoint.
    const model = groqModel || env.GROQ_MODEL || "llama-3.3-70b-versatile";
    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: ctl.signal,
      headers: { "authorization": "Bearer " + env.GROQ_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ model, max_tokens: maxTokens, messages }),
    });
    if (!resp.ok) { const e = new Error("upstream"); e.status = resp.status; throw e; }
    const data = await resp.json();
    const text = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content || "").trim();
    return { text, model };
  } finally { clearTimeout(t); }
}
