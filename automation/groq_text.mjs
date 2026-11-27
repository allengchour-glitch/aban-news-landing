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

import fs from 'node:fs';
import { floskelZaehler, VERBOTEN, beginntMitDies } from './cj_copy_prompt.mjs';
// 26.11.2026: alle fünf Schlüssel (KEY4/KEY5 lagen ungenutzt im Env). Gemessen: je Schlüssel 8'000 Tokens/Minute und
// ~1'000 Anfragen/Tag je Modell — 4 parallele Runner sprengten mit 3 Schlüsseln die Minutengrenze → «skip(gemini)», CJ-Punkte verloren.
const KEYS = [...new Set([process.env.GROQ_API_KEY, process.env.GROQ_API_KEY2, process.env.GROQ_API_KEY3 || process.env.GROQ_API_KEY_3,
  process.env.GROQ_API_KEY4, process.env.GROQ_API_KEY5].map(s => (s || '').trim()).filter(Boolean))];

export const GROQ_MODELLE = [
  { model: 'openai/gpt-oss-20b', body: { reasoning_effort: 'low', max_tokens: 1500 } },
  // 04.10.2026 22:50: gpt-oss-20b hatte das Tageskontingent (200'000 Tokens JE Modell und Organisation) auf BEIDEN
  // Organisationen verbraucht, DeepSeek und Gemini 402 → die Importer bekamen keine Texte («skip(gemini)» ~ jeder zweite).
  // gpt-oss-120b hat ein eigenes Kontingent; mit reasoning_effort low und 2'500 Tokens kommt JSON (gemessen 1,7 s,
  // «Gepolsterte Kapuzenjacke für Damen» — besser als 20b). Vor compound-mini, das Details erfindet.
  { model: 'openai/gpt-oss-120b', body: { reasoning_effort: 'low', max_tokens: 2500 } },
  // 26.11.2026: groq/compound-mini gibt es nicht mehr (404 model_not_found für alle Schlüssel) — entfernt.
  // 26.11.2026 23:45 (Messung): Das Limit ist 200'000 Tokens/TAG je Modell und ORGANISATION, nicht je Schlüssel —
  // Schlüssel 1, 2, 4, 5 sind dieselbe Organisation (…00m9s9vb), Schlüssel 3 eine zweite. Beide Organisationen hatten
  // gpt-oss-20b UND -120b am Abend bei ~199'800 → 22 von 28 Produkten «skip(gemini)», DeepSeek (Guthaben 0.00) und Gemini
  // (402 prepayment depleted) fangen nichts auf. qwen3.8-27b hat ein eigenes Kontingent; mit reasoning_effort none kommt
  // gültiges JSON in ~0,7 s mit ~150 Ausgabe-Tokens (Probe Herrenhemd: Format, ss, keine erfundenen Angaben) — die
  // Grenze von 1'000 Ausgabe-Tokens/Minute reicht damit für ~6 Texte/Minute je Organisation. Darum als drittes Modell.
  { model: 'qwen/qwen3.8-27b', body: { reasoning_effort: 'none', max_tokens: 1400 } },
];

export function jsonAusText(c) {
  c = String(c || '').replace(/```json|```/g, '').trim();
  const a = c.indexOf('{'), b = c.lastIndexOf('}');
  if (a < 0 || b < 0) return null;
  try { return JSON.parse(c.slice(a, b + 1)); } catch { return null; }
}

// Gibt das geparste JSON-Objekt zurueck (title/html), oder null wenn kein Modell antwortet.
// 27.11.2026 (Workflow automation-und-kunden P4): Tageskontingent (TPD) leer → Merker, damit der Grind VOR der
// CJ-Detailabfrage (10 Punkte) anhält statt ~280 Produkte/Tag mit «skip(gemini)» zu verwerfen. Datei, weil jede
// Runner-Gruppe ein eigener node-Prozess ist. Gilt nicht mehr, sobald DeepSeek/Gemini seit dem Merker geliefert haben.
const TPD_DATEI = '/tmp/groq_tpd_leer.json';
let ersatzSeit = 0;
function tpdMerken(sek) {
  const bis = Date.now() + Math.max(sek || 0, 1800) * 1000;
  try { fs.writeFileSync(TPD_DATEI, JSON.stringify({ bis, gesetzt: Date.now() })); } catch {}
}
export function kontingentFrei() {
  let m; try { m = JSON.parse(fs.readFileSync(TPD_DATEI, 'utf8')); } catch { return true; }
  if (!m || Date.now() >= m.bis) return true;
  return ersatzSeit > (m.gesetzt || 0);
}
export async function groqText(prompt, { temperature = 0.5, nachbesserung = false, runde = 0 } = {}) {
  let warte = 0;   // 26.11.2026: höchste retry-after-Angabe aller 429 dieser Runde (Sekunden)
  let versuche = 0, tpd = 0;
  for (const { model, body } of GROQ_MODELLE) for (const key of KEYS) {
    try {
      versuche++;
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, temperature, messages: [{ role: 'user', content: prompt }], ...body }) });
      if (r.status === 429) {
        warte = Math.max(warte, Number(r.headers.get('retry-after')) || 5);
        try { if (/tokens per day|\bTPD\b/i.test(await r.text())) tpd++; } catch {}
        continue;
      }
      const j = await r.json(); if (j.error) continue;
      const o = jsonAusText(j.choices?.[0]?.message?.content);
      if (o && o.title && o.html) {
        // 03.09.: Stichprobe 8 Neuimporte → 2 mit «sorgt für»/«hochwertig». Einmal nachbessern
        // (~700 ms), dann nehmen, was kommt — ein Floskelsatz ist kein Grund, das Produkt zu verwerfen.
        // 14.09.: auch der Einheitsanfang «Dieser/Diese/Dieses …» (99 % der Importe) ist ein
        // Grund fuer EINE Nachbesserung — genommen wird sie nur, wenn sie besser ist.
        const mangel = (x) => floskelZaehler(x.html) + (beginntMitDies(x.html) ? 1 : 0);
        if (!nachbesserung && mangel(o) >= 1) {
          const o2 = await groqText(prompt + `\n\nACHTUNG: Der vorige Entwurf begann mit «Dieser/Diese/Dieses» oder enthielt verbotene Wendungen. Schreibe den Text neu: Satz 1 beginnt mit Anlass, Nutzen oder Material, OHNE: ${VERBOTEN.join(', ')}. Gleiche Fakten, gleiche Form.`, { temperature, nachbesserung: true });
          if (o2 && mangel(o2) < mangel(o)) return o2;
        }
        return o;
      }
    } catch {}
  }
  // 26.11.2026: Waren ALLE Versuche gedrosselt (Minutengrenze), einmal warten und neu versuchen statt das Produkt zu verwerfen —
  // ein verworfenes Produkt hat seine CJ-Punkte schon gekostet und kommt später erneut (doppelte Punkte).
  if (versuche && tpd === versuche) { tpdMerken(warte); return null; }   // 27.11.: alle Modelle × Schlüssel Tageslimit — Warten hilft nicht
  if (warte && runde < 2) { await new Promise(res => setTimeout(res, Math.min(20, warte) * 1000)); return groqText(prompt, { temperature, nachbesserung, runde: runde + 1 }); }
  return null;
}

// ── 14.09.2026: EINE Fallback-Kette fuer alle drei Importer ──────────────────────────────
// Befund: Groq → DeepSeek → Gemini stand in cj_category_fill und cj_trending_import je als
// eigene Kopie, cj_sku_import hatte GAR KEIN Fallback (bei totem Groq: «keine Texte», Exit 3).
// Und die Kette war STUMM: neun Tage lang schrieb das bezahlte Gemini jeden Text, weil der
// Groq-Schluessel ungueltig war (55 Zeichen), und im Log stand nur «✅». Ein Fallback, der
// stumm uebernimmt, verwandelt einen Ausfall in eine Rechnung — deshalb traegt jede Antwort
// hier `_modell`, und der Importer druckt es, sobald es nicht «groq» ist.
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const DS_KEY = (process.env.DEEPSEEK_API_KEY || '').trim();
const GEMINI_KEY = (process.env.GEMINI_API_KEY || '').trim();
let groqTotGemeldet = false;

async function deepseekText(prompt) {
  if (!DS_KEY) return null;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch('https://api.deepseek.com/chat/completions', { method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DS_KEY}` },
        body: JSON.stringify({ model: 'deepseek-chat', temperature: 0.5, max_tokens: 1200,
          response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }) });
      if (r.status === 429) { await sleep(10000); continue; }
      const j = await r.json(); if (j.error) return null;
      const o = jsonAusText(j.choices?.[0]?.message?.content); if (o && o.title && o.html) return o;
    } catch {}
  }
  return null;
}

async function geminiText(prompt) {
  if (!GEMINI_KEY) return null;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 1500, thinkingConfig: { thinkingBudget: 0 }, responseMimeType: 'application/json' } }) });
      const j = await r.json(); if (j.error) { if (j.error.code === 429) { await sleep(15000); continue; } break; }
      const o = jsonAusText(j.candidates?.[0]?.content?.parts?.[0]?.text); if (o && o.title && o.html) return o;
    } catch {}
  }
  return null;
}

// Groq (gratis, primaer) → DeepSeek → Gemini (bezahlt). Rueckgabe traegt `_modell`.
// 14.09. (Beleg am Erzeugnis, 08:20 UTC): Die Nachbesserung in groqText() ist tot, solange
// Groq tot ist — die Fallback-Modelle bekamen KEINE zweite Chance, und 23–33 % der neuen
// Texte begannen weiter mit «Dies…». Deshalb bessert die Kette hier EINMAL nach, egal welches
// Modell geantwortet hat; genommen wird die zweite Fassung nur, wenn sie messbar besser ist.
const MANGEL = (x) => floskelZaehler(x.html) + (beginntMitDies(x.html) ? 1 : 0);
const NACHBESSERUNG = `\n\nACHTUNG: Der vorige Entwurf begann mit «Dieser/Diese/Dieses» oder enthielt verbotene Wendungen. Schreibe den Text neu: Satz 1 beginnt mit Anlass, Nutzen oder Material, OHNE: ${VERBOTEN.join(', ')}. Gleiche Fakten, gleiche Form.`;
async function mitNachbesserung(o, prompt, fn) {
  if (!o || MANGEL(o) < 1) return o;
  const o2 = await fn(prompt + NACHBESSERUNG);
  return (o2 && o2.title && o2.html && MANGEL(o2) < MANGEL(o)) ? o2 : o;
}
export async function textErzeugen(prompt) {
  const g = await groqText(prompt); if (g) { g._modell = 'groq'; return g; }   // bessert selbst nach
  if (!groqTotGemeldet) { groqTotGemeldet = true; console.log('  ⚠️ Groq liefert nichts (Schlüssel/Modell?) — Texte laufen über das Fallback (DeepSeek/Gemini, bezahlt)'); }
  const d = await mitNachbesserung(await deepseekText(prompt), prompt, deepseekText); if (d) { d._modell = 'deepseek'; ersatzSeit = Date.now(); return d; }
  const m = await mitNachbesserung(await geminiText(prompt), prompt, geminiText); if (m) { m._modell = 'gemini'; ersatzSeit = Date.now(); return m; }
  return null;
}
