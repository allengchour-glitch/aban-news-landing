// Gemini-Vision-Aufruf mit ehrlicher Fehlerbehandlung.
// Vorher schluckte image-audit.mjs jeden Fehler (402, 429, kaputte Antwort) als «null» und behandelte das Bild als in Ordnung:
// bei totem oder gedrosseltem Schlüssel meldete der Lauf Erfolg und trug die Produkte ins Ledger ein, ohne dass je ein Bild beurteilt wurde.
// Jetzt: 429/5xx und Zeitüberschreitungen werden wiederholt, ein dauerhafter Schlüsselfehler (401/402/403/404) bricht den Lauf ab,
// und der Aufrufer erfährt, ob die Antwort echt war ({ ok: true, c }) oder nicht ({ ok: false, grund }).
//
// Zweiter Fund, GEMESSEN 08.11.2026 mit drei echten Produktbildern und gemini-3.8-flash: maxOutputTokens 80 reichte bei JEDEM Bild nicht.
// Denkende Modelle zählen ihre Gedanken-Tokens zur Obergrenze (rund 73 von 80), für die Antwort blieben 3 bis 4 Tokens, das JSON brach
// mitten im Wort ab (finishReason MAX_TOKENS, Text «{"zeigt_»). Der Audit hat darum nie ein Bild beurteilt, auch vor dem Umbau nicht.
// Jetzt 1024 Tokens und JSON-Modus; eine gekappte Antwort heisst «abgeschnitten», damit ein Rückfall im Bericht auffällt.
//
// Dritter Fund, derselbe Lauf: der Gratis-Schlüssel antwortete auf Bildanfragen oft nicht innerhalb des Zeitlimits. Der Wechsel auf den
// Ersatzschlüssel galt nur bei 429; Zeitüberschreitungen kosteten ohne Wechsel rund 4,5 Minuten je Produkt (vier Versuche à 60 s).
// Jetzt: gibt es einen Ersatzschlüssel, genügen zwei Versuche, und jeder Ausfall (429, 5xx, Zeitlimit, Schlüsselfehler) wechselt.

export class GeminiFatal extends Error {
  constructor(status, text) {
    super(`Gemini HTTP ${status}: ${text}`);
    this.name = 'GeminiFatal';
    this.status = status;
  }
}

const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const WIEDERHOLBAR = new Set([429, 500, 503]);
// Stati des Bild-Servers, die nach Ausfall aussehen und nicht nach «das Bild gibt es nicht».
const BILD_VORUEBERGEHEND = (s) => s === 408 || s === 425 || s === 429 || s >= 500;
// Gemini verweigert die Antwort aus Sicherheitsgründen: ein Problem dieses Bildes, nicht des Schlüssels.
const GESPERRT = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'IMAGE_SAFETY', 'IMAGE_PROHIBITED_CONTENT', 'SPII', 'RECITATION']);
const BILDARTEN = /^image\/(png|jpeg|webp|heic|heif)$/;

// Antwort lesen: Gedanken-Teile überspringen, Textteile zusammenfügen, erstes JSON-Objekt nehmen.
export function antwortLesen(j) {
  const kand = j?.candidates?.[0];
  const ende = kand?.finishReason;
  if (j?.promptFeedback?.blockReason || GESPERRT.has(ende)) return { ok: false, grund: 'bild-abgelehnt', c: null };
  const txt = (kand?.content?.parts || []).filter((p) => !p?.thought).map((p) => String(p?.text || '')).join('');
  const gekappt = ende === 'MAX_TOKENS';
  const m = txt.match(/\{[^}]*\}/);
  if (!m) return { ok: false, grund: gekappt ? 'abgeschnitten' : 'keine-json-antwort', c: null };
  try { return { ok: true, c: JSON.parse(m[0]) }; } catch { return { ok: false, grund: gekappt ? 'abgeschnitten' : 'json-defekt', c: null }; }
}

// Ein Schlüssel, höchstens maxV Versuche. «ausfall» = der Dienst oder der Schlüssel klemmt (wiederholen oder wechseln lohnt),
// «fatal» = der Schlüssel oder das Modell geht dauerhaft nicht, alles andere ist ein Befund über dieses eine Bild.
async function fragen({ schluessel, maxV, endpoint, body, fetchFn, sleepFn, zeitlimitMs }) {
  for (let v = 1; v <= maxV; v++) {
    let r;
    let j = null;
    try {
      r = await fetchFn(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': schluessel },
        body,
        signal: AbortSignal.timeout(zeitlimitMs),
      });
      try { j = await r.json(); } catch { j = null; }
    } catch {
      if (v === maxV) return { ok: false, grund: 'netz', c: null, ausfall: true };
      await sleepFn(5000 * v);
      continue;
    }
    if (r.status === 200) return antwortLesen(j);
    if (WIEDERHOLBAR.has(r.status)) {
      if (v === maxV) return { ok: false, grund: `http-${r.status}`, c: null, ausfall: true };
      const hinweis = JSON.stringify(j?.error?.details || []).match(/"retryDelay":"(\d+)(?:\.\d+)?s"/);
      await sleepFn((hinweis ? Math.min(90, Number(hinweis[1]) + 2) : 20 * v) * 1000);
      continue;
    }
    const meldung = String(j?.error?.message || '').slice(0, 120);
    // Ein einzelnes Bild, das Gemini nicht lesen kann, ist ein Bildproblem; alles andere (Schlüssel, Rechte, Modell) ändert sich nicht von selbst.
    if (r.status === 400 && /image|input|mime/i.test(meldung)) return { ok: false, grund: 'bild-abgelehnt', c: null };
    return { ok: false, c: null, fatal: new GeminiFatal(r.status, meldung) };
  }
  return { ok: false, grund: 'unbekannt', c: null };
}

// Interne Merker nicht nach aussen geben; ein dauerhafter Fehler wird hier geworfen, nicht früher (der Ersatzschlüssel soll vorher drankommen).
function abschluss(r) {
  if (r.fatal) throw r.fatal;
  const { ausfall, fatal, ...rest } = r;
  return rest;
}

// Das Bild holen, ein zweites Mal bei Ausfall des Bild-Servers. Kein Gemini-Problem: 404 und Co. heissen «bild-nicht-lesbar»,
// ein Ausfall oder Zeitlimit des Servers heisst «bild-netz» (der Aufrufer merkt sich dieses Produkt dann nicht).
async function bildHolen(url, fetchFn, sleepFn, zeitlimitMs) {
  for (let v = 1; v <= 2; v++) {
    try {
      const img = await fetchFn(url, { signal: AbortSignal.timeout(zeitlimitMs) });
      if (img.ok) {
        const ct = String(img.headers?.get?.('content-type') || '').split(';')[0].trim().toLowerCase();
        return { ok: true, buf: Buffer.from(await img.arrayBuffer()), ct };
      }
      if (!BILD_VORUEBERGEHEND(img.status)) return { ok: false, grund: 'bild-nicht-lesbar' };
    } catch { /* Netzfehler oder Zeitlimit: unten wiederholen */ }
    if (v === 1) await sleepFn(3000);
  }
  return { ok: false, grund: 'bild-netz' };
}

export async function bildKlassifizieren({
  url, key, keyFallback = null, model, modelFallback = null, base, prompt,
  fetchFn = fetch, sleepFn = warte, versuche = 4, zeitlimitMs = 45000, bildZeitlimitMs = 30000, maxTokens = 1024,
}) {
  // 1) Bild holen (einmal, auch wenn danach der Schlüssel wechselt).
  const bild = await bildHolen(url, fetchFn, sleepFn, bildZeitlimitMs);
  if (!bild.ok) return { ok: false, grund: bild.grund, c: null };
  const mime = BILDARTEN.test(bild.ct) ? bild.ct : (String(url).toLowerCase().includes('.png') ? 'image/png' : 'image/jpeg');
  const body = JSON.stringify({
    contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: bild.buf.toString('base64') } }] }],
    generationConfig: { temperature: 0, maxOutputTokens: maxTokens, responseMimeType: 'application/json' },
  });
  const gemeinsam = { body, fetchFn, sleepFn, zeitlimitMs };
  // Der Gratis-Schlüssel darf oft nur das kleine Modell (GEMESSEN 08.11.: gemini-3.8-flash sofort 429, gemini-flash-lite-latest 200), darum
  // kann der Ersatzschlüssel ein anderes Modell bekommen.
  const endpunkt = (m) => `${base}/models/${m}:generateContent`;
  // 2) Mit dem ersten Schlüssel fragen. Gibt es einen Ersatz, genügen zwei Versuche: ein klemmender Gratis-Schlüssel soll nicht Minuten kosten.
  const erst = await fragen({ ...gemeinsam, endpoint: endpunkt(model), schluessel: key, maxV: keyFallback ? Math.min(versuche, 2) : versuche });
  if ((erst.ausfall || erst.fatal) && keyFallback) {
    const zweit = await fragen({ ...gemeinsam, endpoint: endpunkt(modelFallback || model), schluessel: keyFallback, maxV: versuche });
    return abschluss({ ...zweit, wechsel: true, wechselGrund: erst.fatal ? `http-${erst.fatal.status}` : erst.grund });
  }
  return abschluss(erst);
}
