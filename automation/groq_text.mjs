// groq_text.mjs — EINE Groq-Anbindung fuer alle CJ-Importer (02.09.2026).
//
// Befund: Groq hat llama-3.1-8b-instant und llama-4-scout abgeschaltet; openai/gpt-oss-120b
// scheitert mit response_format=json_object an «Failed to validate JSON» und liefert ohne
// response_format leeren content (Reasoning frisst max_tokens). Alle drei Importer trugen die
// alte Modellliste — Ergebnis am 02.09.: 3'940-mal «skip(gemini)» in vier Runner-Logs, nur 550
// angelegte Produkte. Die Textstufe war der Engpass, nicht CJ und nicht Shopify.
//
// Gemessen (je 3 Muster): openai/gpt-oss-20b mit reasoning_effort=low, OHNE response_format,
// max_tokens 1500 → 3/3, ~700 ms, faktentreu. groq/compound-mini mit json_object → 3/3, ~5 s,
// erfindet aber Details («Aktivkohle, Keramik»). Deshalb 20b zuerst, compound-mini nur Auffangnetz.
// Der Parser nimmt das JSON zwischen erster «{» und letzter «}» — Fences oder Vorspann sind egal.

import { floskelZaehler, VERBOTEN } from './cj_copy_prompt.mjs';
const KEYS = [(process.env.GROQ_API_KEY || ''), (process.env.GROQ_API_KEY2 || '')].map(s => s.trim()).filter(Boolean);

export const GROQ_MODELLE = [
  { model: 'openai/gpt-oss-20b', body: { reasoning_effort: 'low', max_tokens: 1500 } },
  { model: 'groq/compound-mini', body: { max_tokens: 1200, response_format: { type: 'json_object' } } },
];

export function jsonAusText(c) {
  c = String(c || '').replace(/```json|```/g, '').trim();
  const a = c.indexOf('{'), b = c.lastIndexOf('}');
  if (a < 0 || b < 0) return null;
  try { return JSON.parse(c.slice(a, b + 1)); } catch { return null; }
}

// Gibt das geparste JSON-Objekt zurueck (title/html), oder null wenn kein Modell antwortet.
export async function groqText(prompt, { temperature = 0.5, nachbesserung = false } = {}) {
  for (const { model, body } of GROQ_MODELLE) for (const key of KEYS) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, temperature, messages: [{ role: 'user', content: prompt }], ...body }) });
      if (r.status === 429) continue;
      const j = await r.json(); if (j.error) continue;
      const o = jsonAusText(j.choices?.[0]?.message?.content);
      if (o && o.title && o.html) {
        // 03.09.: Stichprobe 8 Neuimporte → 2 mit «sorgt für»/«hochwertig». Einmal nachbessern
        // (~700 ms), dann nehmen, was kommt — ein Floskelsatz ist kein Grund, das Produkt zu verwerfen.
        if (!nachbesserung && floskelZaehler(o.html) >= 1) {
          const o2 = await groqText(prompt + `\n\nACHTUNG: Der vorige Entwurf enthielt verbotene Wendungen. Schreibe den Text neu OHNE: ${VERBOTEN.join(', ')}. Gleiche Fakten, gleiche Form.`, { temperature, nachbesserung: true });
          if (o2 && floskelZaehler(o2.html) < floskelZaehler(o.html)) return o2;
        }
        return o;
      }
    } catch {}
  }
  return null;
}
