// Comparis-Cross-Posting für freigegebene Inserate.
//
// Comparis hat KEINE öffentliche Push-API zum Inserate-Hochladen. Diese Anbindung
// ist daher konfigurierbar + no-op-safe: erst wenn der Partner-Endpoint als
// Cloudflare-Secret COMPARIS_FEED_URL (optional + COMPARIS_API_KEY) hinterlegt ist,
// wird ein freigegebenes Inserat dorthin geschickt. Ohne Secret → sauber übersprungen,
// die Freigabe läuft normal weiter. Genau dasselbe Muster wie die Social-Autopost-Logik.

export function comparisConfigured(env) {
  return !!(env && env.COMPARIS_FEED_URL);
}

// Mappt eine D1-Inserat-Zeile auf ein neutrales, partner-freundliches Payload.
export function toComparisPayload(row, env) {
  const base = ((env && env.SITE_URL) || "https://abannews.com").replace(/\/+$/, "");
  return {
    external_id: "aban-" + row.id,
    type: row.typ === "Gesuch" ? "wanted" : "offer",
    category: row.kat || "",
    title: row.titel || "",
    description: row.beschreibung || "",
    price: row.preis || "",
    condition: row.zustand || "",
    location: { zip: row.plz || "", city: row.ort || "" },
    images: row.bild ? [row.bild] : [],
    contact: row.kontakt || "",
    source: "aban news",
    permalink: base + "/inserate.html#i" + row.id,
    published_at: new Date(row.created || Date.now()).toISOString(),
  };
}

// Forwardet ein freigegebenes Inserat an Comparis. Wirft NIE — Cross-Post-Fehler
// dürfen die Moderation/Freigabe nicht blockieren.
// Rückgabe: { skipped, reason } | { ok, status } | { ok:false, error }
export async function crossPostToComparis(row, env) {
  if (!comparisConfigured(env)) return { skipped: true, reason: "not_configured" };
  if (!row || !row.id) return { skipped: true, reason: "no_row" };
  try {
    const headers = { "Content-Type": "application/json" };
    if (env.COMPARIS_API_KEY) headers["Authorization"] = "Bearer " + env.COMPARIS_API_KEY;
    const r = await fetch(env.COMPARIS_FEED_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(toComparisPayload(row, env)),
    });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}
