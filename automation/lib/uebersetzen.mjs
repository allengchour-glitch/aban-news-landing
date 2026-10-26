/**
 * Produktbewertungen nach Deutsch — Gemini zuerst, Groq als Rückfall.
 *
 * WARUM DER RÜCKFALL (gemessen 2026-10-17): Am 04.10. antwortete Gemini mit HTTP 402 („Your
 * prepayment credits are depleted") — importierte CJ-Bewertungen blieben darum in der
 * Originalsprache, und das stand seither als Blocker im Gedächtnis. **Heute antwortet Gemini wieder**
 * (im Importer verifiziert: „Übersetzung über gemini"). Ein aufgebrauchtes Guthaben darf aber nicht
 * wieder stillschweigend dazu führen, dass englische und chinesische Bewertungen im Schweizer Shop
 * landen. Darum Groq als Rückfall: `GROQ_API_KEY` ist in derselben Umgebung gesetzt und übersetzt
 * gut. Die Modellnamen dort sind NICHT die bekannten Llama-Namen (die geben HTTP 404) — geprüft
 * über `/openai/v1/models`: `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`.
 *
 * Grundregel: NIE etwas erfinden. Scheitert die Übersetzung, kommen die Originaltexte zurück —
 * eine Bewertung in der Originalsprache ist ehrlich, eine erfundene Übersetzung wäre es nicht.
 * Deshalb gilt eine Antwort nur, wenn das JSON-Array **genau so viele** Einträge hat wie die Eingabe.
 */
const AUFTRAG = 'Übersetze diese Produktbewertungen in natürliches, flüssiges Deutsch (Du-Form, kurz, authentisch). '
  + 'Gib AUSSCHLIESSLICH ein JSON-Array von Strings in exakt gleicher Reihenfolge zurück, nichts anderes.\n';

export const GROQ_MODELLE = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];

function arrayAus(text, anzahl) {
  let t = String(text || '').replace(/^```(json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('['), b = t.lastIndexOf(']');
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  let arr;
  try { arr = JSON.parse(t); } catch { return null; }
  if (!Array.isArray(arr) || arr.length !== anzahl) return null;   // Länge muss stimmen
  return arr;
}

async function gemini(texte, key, fetchFn, auftrag = AUFTRAG) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`;
  const r = await fetchFn(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: auftrag + JSON.stringify(texte) }] }], generationConfig: { temperature: 0.3 } }) });
  const roh = await r.text();
  let j = {}; try { j = JSON.parse(roh); } catch {}
  if (!r.ok) throw new Error(`Gemini HTTP ${r.status}: ${String(j?.error?.message || roh).slice(0, 140)}`);
  return arrayAus((j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join(''), texte.length);
}

async function groq(texte, key, fetchFn, modelle, auftrag = AUFTRAG) {
  let letzter = '';
  for (const modell of modelle) {
    const r = await fetchFn('https://api.groq.com/openai/v1/chat/completions', { method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modell, temperature: 0.3, messages: [{ role: 'user', content: auftrag + JSON.stringify(texte) }] }) });
    const roh = await r.text();
    if (!r.ok) { letzter = `Groq ${modell} HTTP ${r.status}: ${roh.slice(0, 120)}`; continue; }
    let j = {}; try { j = JSON.parse(roh); } catch { letzter = `Groq ${modell}: Antwort nicht lesbar`; continue; }
    const arr = arrayAus(j?.choices?.[0]?.message?.content, texte.length);
    if (arr) return arr;
    letzter = `Groq ${modell}: Antwort passte nicht (${texte.length} Texte erwartet)`;
  }
  throw new Error(letzter || 'Groq: kein Modell lieferte eine brauchbare Antwort');
}

/**
 * @returns {Promise<{texte: string[], weg: 'gemini'|'groq'|'original', grund?: string}>}
 */
export async function nachDeutsch(texte, opt = {}) {
  if (!texte?.length) return { texte: texte || [], weg: 'original' };
  const fetchFn = opt.fetch ?? fetch;
  const gk = (opt.geminiKey ?? process.env.GEMINI_API_KEY ?? '').trim();
  const qk = (opt.groqKey ?? process.env.GROQ_API_KEY ?? '').trim();
  const modelle = opt.groqModelle ?? GROQ_MODELLE;
  const gruende = [];
  if (gk) {
    try { const a = await gemini(texte, gk, fetchFn, opt.auftrag); if (a) return { texte: a.map((s, i) => (s && String(s).trim()) || texte[i]), weg: 'gemini' }; gruende.push('Gemini: Antwort passte nicht'); }
    catch (e) { gruende.push(e.message); }
  }
  if (qk) {
    try { const a = await groq(texte, qk, fetchFn, modelle, opt.auftrag); return { texte: a.map((s, i) => (s && String(s).trim()) || texte[i]), weg: 'groq' }; }
    catch (e) { gruende.push(e.message); }
  }
  return { texte, weg: 'original', grund: gruende.join(' · ') || 'kein Schlüssel gesetzt' };
}
