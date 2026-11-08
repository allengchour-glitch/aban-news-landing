// Gemini-Vision-Aufruf mit ehrlicher Fehlerbehandlung.
// Vorher schluckte image-audit.mjs jeden Fehler (402, 429, kaputte Antwort) als «null» und behandelte das Bild als in Ordnung:
// bei totem oder gedrosseltem Schlüssel meldete der Lauf Erfolg und trug die Produkte ins Ledger ein, ohne dass je ein Bild beurteilt wurde.
// Jetzt: 429/5xx werden mit Wartezeit wiederholt, ein dauerhafter Schlüsselfehler (401/402/403/404) bricht den Lauf ab,
// und der Aufrufer erfährt, ob die Antwort echt war ({ ok: true, c }) oder nicht ({ ok: false, grund }).

export class GeminiFatal extends Error {
  constructor(status, text) {
    super(`Gemini HTTP ${status}: ${text}`);
    this.name = 'GeminiFatal';
    this.status = status;
  }
}

const warte = (ms) => new Promise((r) => setTimeout(r, ms));

export async function bildKlassifizieren({ url, key, keyFallback = null, model, base, prompt, fetchFn = fetch, sleepFn = warte, versuche = 4, zeitlimitMs = 60000 }) {
  // 1) Bild holen. Ein Fehler hier ist KEIN Gemini-Fehler.
  let buf;
  try {
    const img = await fetchFn(url);
    if (!img.ok) return { ok: false, grund: 'bild-nicht-lesbar', c: null };
    buf = Buffer.from(await img.arrayBuffer());
  } catch {
    return { ok: false, grund: 'bild-nicht-lesbar', c: null };
  }
  const mime = String(url).toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg';
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: buf.toString('base64') } }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 80 },
  });
  // 2) Gemini fragen.
  for (let v = 1; v <= versuche; v++) {
    let r;
    let j = null;
    try {
      r = await fetchFn(`${base}/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body,
        signal: AbortSignal.timeout(zeitlimitMs),
      });
      try { j = await r.json(); } catch { j = null; }
    } catch {
      if (v === versuche) return { ok: false, grund: 'netz', c: null };
      await sleepFn(5000 * v);
      continue;
    }
    if (r.status === 200) {
      const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const m = txt.match(/\{[^}]*\}/);
      if (!m) return { ok: false, grund: 'keine-json-antwort', c: null };
      try { return { ok: true, c: JSON.parse(m[0]) }; } catch { return { ok: false, grund: 'json-defekt', c: null }; }
    }
    if (r.status === 429 || r.status === 500 || r.status === 503) {
      if (v === versuche) {
        // Gratis-Schlüssel erschöpft: mit dem Ersatzschlüssel weitermachen, statt das Bild unbeurteilt zu lassen.
        if (r.status === 429 && keyFallback) {
          const r2 = await bildKlassifizieren({ url, key: keyFallback, keyFallback: null, model, base, prompt, fetchFn, sleepFn, versuche, zeitlimitMs });
          return { ...r2, wechsel: true };
        }
        return { ok: false, grund: `http-${r.status}`, c: null };
      }
      const hinweis = JSON.stringify(j?.error?.details || []).match(/"retryDelay":"(\d+)(?:\.\d+)?s"/);
      await sleepFn((hinweis ? Math.min(90, Number(hinweis[1]) + 2) : 20 * v) * 1000);
      continue;
    }
    const meldung = String(j?.error?.message || '').slice(0, 120);
    // Ein einzelnes Bild, das Gemini nicht lesen kann, ist ein Bildproblem; alles andere (Schlüssel, Rechte, Modell) ändert sich nicht von selbst.
    if (r.status === 400 && /image|input|mime/i.test(meldung)) return { ok: false, grund: 'bild-abgelehnt', c: null };
    throw new GeminiFatal(r.status, meldung);
  }
  return { ok: false, grund: 'unbekannt', c: null };
}
