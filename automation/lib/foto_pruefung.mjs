/**
 * Bildprüfung per Gemini-Vision für Kategorie-Bilder (Pinnwand-Banner, Label). Zwei Fragen:
 *  1) geminiSauber(foto): ist das EIN sauberes Produktfoto (kein Text, keine Masspfeile, keine Collage, keine Marke/Monogramm/Lizenzmotiv)?
 *  2) geminiBanner(banner, titel): ist das fertige Banner brauchbar (Titel lesbar, Fotos passen zur Kategorie, kein lesbarer Fremdtext/Logo)?
 * Rückgabe: true | false | null (null = Gemini nicht erreichbar oder Antwort nicht lesbar; der Aufrufer entscheidet, nie stillschweigend «ok»).
 */
const MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GBASE = () => process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';

/** Liest {"ok"|"sauber": bool, "grund": "…"} auch aus ```json-Zäunen. Rein, getestet. */
export function urteilAus(text, feld) {
  try {
    const t = String(text || '').replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
    const j = JSON.parse(t);
    return typeof j[feld] === 'boolean' ? { wert: j[feld], grund: String(j.grund || '') } : null;
  } catch { return null; }
}

async function frage(prompt, b64, mime, feld, fetchFn = fetch) {
  try {
    const r = await fetchFn(`${GBASE()}/models/${MODEL()}:generateContent?key=${process.env.GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: b64 } }] }], generationConfig: { temperature: 0, responseMimeType: 'application/json' } }) });
    if (!r.ok) return null;
    const j = await r.json();
    return urteilAus(j.candidates?.[0]?.content?.parts?.[0]?.text, feld);
  } catch { return null; }
}

const SAUBER = 'Ist das ein sauberes Produktfoto für eine Kategorie-Kachel eines Online-Shops? Sauber heisst: das Produkt ist klar sichtbar (allein, in der Hand, getragen oder in einer Wohnumgebung), KEIN eingeblendeter Text oder chinesische Schrift, KEINE Masspfeile oder Grössentabelle, KEIN Wasserzeichen, KEINE Collage aus mehreren Einzelbildern, nicht unscharf. '
  + 'Zusätzlich NICHT sauber, wenn ein Markenlogo, ein Luxusmarken-Monogramm (z. B. Louis Vuitton, Gucci, Chanel), ein erkennbares Markenstreifen- oder Karomuster (z. B. Burberry, Thom Browne) oder ein Lizenzmotiv (Disney, Marvel, Pokémon) zu sehen ist — auch als Nachahmung. '
  + 'Antworte NUR als JSON: {"sauber": true|false, "grund": "kurz"}';

/** Zusatz je Foto: das Produkt ist als Ganzes erkennbar (kein reiner Stoff-/Musterausschnitt) und gehört zur Kategorie `kategorie` (wenn angegeben). */
export const GANZ = 'Zusätzlich NICHT sauber, wenn nur ein Stoff-, Muster- oder Detailausschnitt zu sehen ist und das Produkt als Ganzes nicht erkennbar ist. '
  + 'Zusätzlich NICHT sauber, wenn im Hintergrund oder auf Gegenständen neben dem Produkt Text gut lesbar ist (Buchtitel, Zeitschriften, Verpackungen, Etiketten, Schilder, Postkarten). Ein Aufdruck oder Motiv auf dem Produkt selbst ist erlaubt. ';
export const KATEGORIE = k => `Zusätzlich NICHT sauber, wenn das Foto offensichtlich keine Ware der Kategorie «${k}» zeigt (z. B. ein Spielzeug in «Tassen & Becher»). `;
export function saeuberPrompt(kategorie) { return SAUBER.replace('Antworte NUR als JSON', GANZ + (kategorie ? KATEGORIE(kategorie) : '') + 'Antworte NUR als JSON'); }

export async function geminiSauber(b64, mime = 'image/jpeg', fetchFn, kategorie) {
  const u = await frage(saeuberPrompt(kategorie), b64, mime, 'sauber', fetchFn); return u ? u.wert : null;
}

export async function geminiBanner(b64, titel, mime = 'image/jpeg', fetchFn) {
  const prompt = `Das ist ein Kategorie-Banner eines Schweizer Online-Shops: eine Pinnwand-Collage aus Produktfotos mit einem dunklen Titelband in der Mitte, Titel «${titel}». Prüfe streng und antworte NUR als JSON {"ok": true|false, "grund": "kurz"}. `
    + 'ok ist false, wenn EINES zutrifft: (1) der Titel ist nicht lesbar oder abgeschnitten; (2) mehr als ein Foto ist offensichtlich kaputt, leer oder nur weiss; (3) auf mehr als einem Foto ist Text AUSSERHALB des Produkts (Bücher, Zeitschriften, Verpackungen, Etiketten, Schilder, Wasserzeichen) oder ein Markenlogo gut lesbar — ein Aufdruck oder Motiv auf dem Produkt selbst zählt nicht; '
    + `(4) weniger als drei Viertel der Fotos zeigen Ware, die zur Kategorie «${titel}» passt (ein Spielzeug in «Tassen & Becher» oder ein Hundefoto in «Damen-Kleider» zählt als nicht passend); (5) ein Foto zeigt nackte Haut über das Übliche von Mode hinaus.`;
  const u = await frage(prompt, b64, mime, 'ok', fetchFn); return u ? { ok: u.wert, grund: u.grund } : null;
}
