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

// ---- Import-Richtung: Comparis-Inserate in den aban-Marktplatz einspeisen ----
//
// Auch hier no-op-safe: erst mit Secret COMPARIS_IMPORT_URL werden Comparis-Inserate
// beim Laden der Marktplatz-Liste mit-eingeblendet. Der Mapper ist absichtlich tolerant
// (akzeptiert mehrere Feldnamen), damit er ans echte Feed-Format angepasst werden kann.

export function comparisImportConfigured(env) {
  return !!(env && env.COMPARIS_IMPORT_URL);
}

// Mappt ein Comparis-Item auf die aban-Listen-Form (Inverse von toComparisPayload).
export function fromComparisItem(item, i = 0) {
  const it = item || {};
  const g = (...keys) => { for (const k of keys) { if (it[k] != null && it[k] !== "") return it[k]; } return ""; };
  const loc = typeof it.location === "object" && it.location ? it.location : {};
  const imgs = Array.isArray(it.images) ? it.images : (it.image ? [it.image] : []);
  const typ = String(g("type", "typ")).toLowerCase();
  let ts = Date.now();
  const created = g("published_at", "created", "date");
  if (created) { const d = new Date(created); if (!isNaN(d.getTime())) ts = d.getTime(); }
  return {
    id: "cmp-" + String(g("external_id", "id") || i),
    kat: String(g("category", "kat")),
    ort: String(loc.city || g("city", "ort")),
    plz: String(loc.zip || g("zip", "plz")),
    titel: String(g("title", "titel")),
    beschreibung: String(g("description", "beschreibung")),
    preis: String(g("price", "preis")),
    kontakt: "", // externer Kontakt läuft über den Comparis-Link, nicht über uns
    typ: (typ === "wanted" || typ === "gesuch") ? "Gesuch" : "Angebot",
    zustand: String(g("condition", "zustand")),
    bild: imgs[0] ? String(imgs[0]) : "",
    featured: 0,
    created: ts,
    status: "approved",
    source: "comparis",
    url: String(g("permalink", "url", "link")),
  };
}

// Holt Comparis-Inserate (no-op-safe, 2,5s-Timeout). Filtert optional nach kat/q. Wirft nie.
export async function fetchComparisListings(env, { kat = "", q = "", limit = 40 } = {}) {
  if (!comparisImportConfigured(env)) return [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    let res;
    try {
      const headers = {};
      if (env.COMPARIS_API_KEY) headers["Authorization"] = "Bearer " + env.COMPARIS_API_KEY;
      res = await fetch(env.COMPARIS_IMPORT_URL, { headers, signal: ctrl.signal });
    } finally { clearTimeout(t); }
    if (!res || !res.ok) return [];
    const data = await res.json();
    const arr = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : []);
    let out = arr.map((it, i) => fromComparisItem(it, i));
    if (kat) out = out.filter((x) => x.kat === kat);
    if (q) { const ql = q.toLowerCase(); out = out.filter((x) => (x.titel + " " + x.beschreibung).toLowerCase().includes(ql)); }
    return out.slice(0, Math.max(0, limit));
  } catch (e) {
    return [];
  }
}
