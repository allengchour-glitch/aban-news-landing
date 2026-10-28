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
  // Typ muss stimmen: ein Objekt würde sonst zu «[object Object]», eine Zahl zu «5» und beides ginge als Bewertungstext live.
  // Eine leere Zeichenkette bleibt erlaubt (an ihrer Stelle gilt das Original, siehe fuelle), alles andere verwirft die ganze Antwort.
  if (!arr.every(x => typeof x === 'string')) return null;
  return arr;
}

/** Leere Einträge bleiben das Original an ihrer Stelle; `fehlt` nennt diese Stellen (dort wurde NICHT übersetzt). */
function fuelle(a, texte) {
  const fehlt = [];
  const out = a.map((s, i) => { const t = s.trim(); if (t) return t; fehlt.push(i); return texte[i]; });
  return { texte: out, fehlt };
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
 * @returns {Promise<{texte: string[], weg: 'gemini'|'groq'|'original', fehlt: number[], grund?: string}>}
 *   `fehlt`: Stellen, an denen NICHT übersetzt wurde (bei weg 'original' alle). Wer Texte veröffentlicht, darf diese nur
 *   senden, wenn sie schon deutsch wirken (wirktDeutsch) oder das Original ausdrücklich erlaubt ist.
 */
export async function nachDeutsch(texte, opt = {}) {
  if (!texte?.length) return { texte: texte || [], weg: 'original', fehlt: [] };
  const fetchFn = opt.fetch ?? fetch;
  const gk = (opt.geminiKey ?? process.env.GEMINI_API_KEY ?? '').trim();
  // Groq: bis zu vier Schlüssel (GROQ_API_KEY, _2, _3, _4); jeder hat sein eigenes Tageslimit (gemessen 27.10.2026: 1000 Anfragen je Modell und Tag). Ist einer erschöpft, fragt der nächste.
  const qks = opt.groqKey !== undefined ? [String(opt.groqKey).trim()] : [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY2, process.env.GROQ_API_KEY3, process.env.GROQ_API_KEY4].map(k => (k ?? '').trim());
  const groqKeys = [...new Set(qks.filter(Boolean))];
  const modelle = opt.groqModelle ?? GROQ_MODELLE;
  const gruende = [];
  if (gk) {
    try { const a = await gemini(texte, gk, fetchFn, opt.auftrag); if (a) return { ...fuelle(a, texte), weg: 'gemini' }; gruende.push('Gemini: Antwort passte nicht'); }
    catch (e) { gruende.push(e.message); }
  }
  for (const qk of groqKeys) {
    try { const a = await groq(texte, qk, fetchFn, modelle, opt.auftrag); return { ...fuelle(a, texte), weg: 'groq' }; }
    catch (e) { gruende.push(e.message); }
  }
  return { texte, weg: 'original', fehlt: texte.map((_, i) => i), grund: gruende.join(' · ') || 'kein Schlüssel gesetzt' };
}

/**
 * Das kleine Groq-Modell (openai/gpt-oss-20b, springt ein, wenn das grosse am Minutenlimit ist) liefert Etikettenwörter klein geschrieben («purpurrot»).
 * Beginnt das Original gross und die Übersetzung klein, wird der erste Buchstabe der Übersetzung gross gesetzt (nur Buchstaben, sonst unverändert).
 */
export function gleicheGrossschreibung(original, uebersetzt) {
  const o = String(original ?? ''), u = String(uebersetzt ?? '');
  const a = o.match(/\p{L}/u)?.[0], i = u.search(/\p{L}/u);
  if (!a || i < 0 || a !== a.toUpperCase() || a === a.toLowerCase()) return u;
  const b = u[i]; if (b === b.toUpperCase()) return u;
  return u.slice(0, i) + b.toUpperCase() + u.slice(i + 1);
}

// Wirkt der Text schon deutsch? Bewusst VORSICHTIG: im Zweifel «nein». Wer «ja» sagt, darf unübersetzt veröffentlichen — ein falsches «ja»
// brächte englische oder chinesische Texte in den Schweizer Shop, ein falsches «nein» kostet nur eine Wiederholung bei der nächsten Runde.
const ASIATISCH = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;   // Kana, CJK, Hangul
const DE_WOERTER = new Set(['und','nicht','sehr','ist','ich','das','der','die','mit','für','ein','eine','auch','aber','sind','wurde','schnell',
  'passt','gut','schön','qualität','lieferung','danke','habe','hat','würde','empfehle','kaufen']);
const EN_WOERTER = new Set(['the','and','is','are','very','good','great','nice','quality','fast','love','perfect','product','thanks','with','for',
  'this','it','my','bought','delivery','item','works']);
export function wirktDeutsch(text) {
  const t = String(text ?? '');
  if (ASIATISCH.test(t)) return false;
  const woerter = t.toLowerCase().match(/\p{L}+/gu) || [];
  const de = new Set(woerter.filter(w => DE_WOERTER.has(w))).size;
  const en = new Set(woerter.filter(w => EN_WOERTER.has(w))).size;
  return de >= 2 && de > en;
}
