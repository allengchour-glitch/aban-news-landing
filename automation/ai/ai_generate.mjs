#!/usr/bin/env node
/* LuxeStyle — ai_generate.mjs  (MULTI-PROVIDER AI-ROUTER mit automatischem Fallback)
 *
 * Ziel (User 2026-06-17 „alles gratis Versionen … falls einer nicht mehr geht … für richtige
 * Vollautomation"): EIN Einstieg für ALLE Text-/Content-KI. Probiert mehrere GRATIS-Provider der
 * Reihe nach durch — wenn einer kein Key hat, ein Limit/Quota wirft oder ausfällt, geht der nächste.
 * So bricht die Automation NIE an einem einzelnen Anbieter/Key. Ganz ohne Key → Template-Fallback.
 *
 * Provider (gratis-Tier zuerst), Key NUR aus ENV (NIE im Repo):
 *   - groq        GROQ_API_KEY            (sehr schnell, grosszügiges Gratis-Tier)   llama-3.3-70b
 *   - gemini      GEMINI_API_KEY          (Google AI Studio, gratis)                 gemini-2.5-flash
 *   - openrouter  OPENROUTER_API_KEY      (hat :free-Modelle)                        llama-3.3-70b:free
 *   - cloudflare  CF_ACCOUNT_ID+CF_API_TOKEN (Workers AI, gratis-Tier)              llama-3.1-8b
 *   - mistral     MISTRAL_API_KEY         (gratis-Tier)                              mistral-small
 *   - openai      OPENAI_API_KEY          (Fallback, kostenpflichtig)               gpt-4o-mini
 *   - template    (immer da) — regelbasiert, kein Netz → Automation läuft IMMER weiter.
 *
 * Reihenfolge via AI_PROVIDER_ORDER (Komma-Liste) überschreibbar.
 *
 * CLI:   node automation/ai/ai_generate.mjs "Schreib 3 TikTok-Captions für …" [--system "…"] [--json]
 * API:   import { generate, listProviders } from './ai/ai_generate.mjs'
 *        const { text, provider } = await generate({ system, prompt, json:false, maxTokens:600 });
 *
 * stdout = nur der Text (Pipeline-tauglich). Logs/Provider-Wahl → stderr.
 */

const ENV = process.env;
const DEFAULT_ORDER = (ENV.AI_PROVIDER_ORDER || 'groq,gemini,together,deepseek,openrouter,cloudflare,mistral,openai')
  .split(',').map(s => s.trim()).filter(Boolean);

const log = (...a) => process.stderr.write(a.join(' ') + '\n');

async function jfetch(url, opts, timeoutMs = 45000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    const txt = await r.text();
    let body; try { body = JSON.parse(txt); } catch { body = { raw: txt }; }
    return { ok: r.ok, status: r.status, body };
  } finally { clearTimeout(t); }
}

// ---- Provider-Implementierungen: nehmen {system, prompt, json, maxTokens}, geben Text oder werfen ----
const PROVIDERS = {
  async groq({ system, prompt, json, maxTokens }) {
    if (!ENV.GROQ_API_KEY) throw new Error('no key');
    const { ok, status, body } = await jfetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ENV.GROQ_API_KEY}` },
      body: JSON.stringify({ model: ENV.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: msgs(system, prompt), max_tokens: maxTokens || 800, temperature: 0.8,
        ...(json ? { response_format: { type: 'json_object' } } : {}) }) });
    if (!ok) throw new Error(`groq ${status}: ${JSON.stringify(body).slice(0, 160)}`);
    return body.choices?.[0]?.message?.content || '';
  },
  async gemini({ system, prompt, json, maxTokens }) {
    if (!ENV.GEMINI_API_KEY) throw new Error('no key');
    const model = ENV.GEMINI_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${ENV.GEMINI_API_KEY}`;
    const { ok, status, body } = await jfetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: maxTokens || 800,
          thinkingConfig: { thinkingBudget: 0 }, ...(json ? { responseMimeType: 'application/json' } : {}) } }) });
    if (!ok) throw new Error(`gemini ${status}: ${JSON.stringify(body).slice(0, 160)}`);
    return body.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
  },
  async openrouter({ system, prompt, json, maxTokens }) {
    if (!ENV.OPENROUTER_API_KEY) throw new Error('no key');
    const { ok, status, body } = await jfetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ENV.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://luxestyle.ch', 'X-Title': 'LuxeStyle' },
      body: JSON.stringify({ model: ENV.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
        messages: msgs(system, prompt), max_tokens: maxTokens || 800, temperature: 0.8,
        ...(json ? { response_format: { type: 'json_object' } } : {}) }) });
    if (!ok) throw new Error(`openrouter ${status}: ${JSON.stringify(body).slice(0, 160)}`);
    return body.choices?.[0]?.message?.content || '';
  },
  async cloudflare({ system, prompt, maxTokens }) {
    if (!ENV.CF_ACCOUNT_ID || !ENV.CF_API_TOKEN) throw new Error('no key');
    const model = ENV.CF_AI_MODEL || '@cf/meta/llama-3.1-8b-instruct';
    const url = `https://api.cloudflare.com/client/v4/accounts/${ENV.CF_ACCOUNT_ID}/ai/run/${model}`;
    const { ok, status, body } = await jfetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ENV.CF_API_TOKEN}` },
      body: JSON.stringify({ messages: msgs(system, prompt), max_tokens: maxTokens || 800 }) });
    if (!ok) throw new Error(`cloudflare ${status}: ${JSON.stringify(body).slice(0, 160)}`);
    return body.result?.response || '';
  },
  async mistral({ system, prompt, json, maxTokens }) {
    if (!ENV.MISTRAL_API_KEY) throw new Error('no key');
    const { ok, status, body } = await jfetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ENV.MISTRAL_API_KEY}` },
      body: JSON.stringify({ model: ENV.MISTRAL_MODEL || 'mistral-small-latest',
        messages: msgs(system, prompt), max_tokens: maxTokens || 800, temperature: 0.8,
        ...(json ? { response_format: { type: 'json_object' } } : {}) }) });
    if (!ok) throw new Error(`mistral ${status}: ${JSON.stringify(body).slice(0, 160)}`);
    return body.choices?.[0]?.message?.content || '';
  },
  async openai({ system, prompt, json, maxTokens }) {
    if (!ENV.OPENAI_API_KEY) throw new Error('no key');
    const { ok, status, body } = await jfetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ENV.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: ENV.OPENAI_MODEL || 'gpt-4o-mini',
        messages: msgs(system, prompt), max_tokens: maxTokens || 800, temperature: 0.8,
        ...(json ? { response_format: { type: 'json_object' } } : {}) }) });
    if (!ok) throw new Error(`openai ${status}: ${JSON.stringify(body).slice(0, 160)}`);
    return body.choices?.[0]?.message?.content || '';
  },
  // Together AI (gratis-Tier, OpenAI-kompatibel) — Llama 3.3 70B free
  async together({ system, prompt, json, maxTokens }) {
    if (!ENV.TOGETHER_API_KEY) throw new Error('no key');
    const { ok, status, body } = await jfetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ENV.TOGETHER_API_KEY}` },
      body: JSON.stringify({ model: ENV.TOGETHER_MODEL || 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
        messages: msgs(system, prompt), max_tokens: maxTokens || 800, temperature: 0.8,
        ...(json ? { response_format: { type: 'json_object' } } : {}) }) });
    if (!ok) throw new Error(`together ${status}: ${JSON.stringify(body).slice(0, 160)}`);
    return body.choices?.[0]?.message?.content || '';
  },
  // DeepSeek (gratis-Tier, OpenAI-kompatibel)
  async deepseek({ system, prompt, json, maxTokens }) {
    if (!ENV.DEEPSEEK_API_KEY) throw new Error('no key');
    const { ok, status, body } = await jfetch('https://api.deepseek.com/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ENV.DEEPSEEK_API_KEY}` },
      body: JSON.stringify({ model: ENV.DEEPSEEK_MODEL || 'deepseek-chat',
        messages: msgs(system, prompt), max_tokens: maxTokens || 800, temperature: 0.8,
        ...(json ? { response_format: { type: 'json_object' } } : {}) }) });
    if (!ok) throw new Error(`deepseek ${status}: ${JSON.stringify(body).slice(0, 160)}`);
    return body.choices?.[0]?.message?.content || '';
  },
};

function msgs(system, prompt) {
  const m = []; if (system) m.push({ role: 'system', content: system });
  m.push({ role: 'user', content: prompt }); return m;
}

export function listProviders() {
  return DEFAULT_ORDER.map(name => ({ name, available: hasKey(name) }));
}
export function hasKey(name) {
  switch (name) {
    case 'groq': return !!ENV.GROQ_API_KEY;
    case 'gemini': return !!ENV.GEMINI_API_KEY;
    case 'openrouter': return !!ENV.OPENROUTER_API_KEY;
    case 'cloudflare': return !!(ENV.CF_ACCOUNT_ID && ENV.CF_API_TOKEN);
    case 'mistral': return !!ENV.MISTRAL_API_KEY;
    case 'openai': return !!ENV.OPENAI_API_KEY;
    case 'together': return !!ENV.TOGETHER_API_KEY;
    case 'deepseek': return !!ENV.DEEPSEEK_API_KEY;
    default: return false;
  }
}

/** Generiert Text über die erste funktionierende Gratis-Quelle. Gibt {text, provider}.
 *  Wirft NIE — bei totalem Ausfall {text:'', provider:'none'} (Caller nutzt sein Template). */
export async function generate({ system = '', prompt, json = false, maxTokens = 800, order = DEFAULT_ORDER } = {}) {
  const errors = [];
  for (const name of order) {
    if (!PROVIDERS[name] || !hasKey(name)) { errors.push(`${name}: kein Key`); continue; }
    try {
      const text = await PROVIDERS[name]({ system, prompt, json, maxTokens });
      if (text && text.trim()) { log(`✓ AI via ${name}`); return { text: text.trim(), provider: name }; }
      errors.push(`${name}: leere Antwort`);
    } catch (e) { errors.push(`${name}: ${e.message}`); log(`… ${name} fiel aus → nächster`); }
  }
  log('⚠️ Alle KI-Provider aus → Template-Fallback. Details:', errors.join(' | '));
  return { text: '', provider: 'none', errors };
}

// ---- CLI ----
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  let system = '';
  const si = args.indexOf('--system'); if (si >= 0) system = args[si + 1] || '';
  const prompt = args.filter((a, i) => !a.startsWith('--') && !(si >= 0 && i === si + 1)).join(' ');
  if (!prompt) { log('Nutzung: node ai_generate.mjs "<prompt>" [--system "…"] [--json]'); process.exit(1); }
  const { text, provider } = await generate({ system, prompt, json });
  if (!text) { log('Kein Provider verfügbar.'); process.exit(2); }
  process.stdout.write(text + '\n');
  log(`(provider: ${provider})`);
}
