// Generische Inserat-Portal-Anbindung (Cross-Post-Export + Import) für beliebig viele
// Portale — Comparis, Homegate, Anibis, Tutti, ImmoScout24, … — ohne Code pro Portal.
//
// No-op-safe nach demselben Muster wie die Comparis-Erstanbindung: ein Portal wird erst
// aktiv, wenn es konfiguriert ist. Zwei Konfig-Quellen (gemerged):
//   1) Legacy-Einzelportal Comparis: COMPARIS_FEED_URL / COMPARIS_IMPORT_URL / COMPARIS_API_KEY
//   2) Beliebig viele Portale via JSON-Secret LISTING_PORTALS, z. B.:
//      [{"name":"Homegate","importUrl":"https://…","feedUrl":"https://…","apiKey":"…"},
//       {"name":"Anibis","importUrl":"https://…"}]
// Felder je Portal: name (Pflicht), feedUrl (Export-Push), importUrl (Import-Pull), apiKey (Bearer, optional).
import { toComparisPayload } from "./_comparis.mjs";

function slug(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "portal";
}

// Liest + normalisiert + merged alle konfigurierten Portale. Wirft nie.
export function getPortals(env) {
  if (!env) return [];
  const out = [], byKey = {};
  const add = (p) => {
    if (!p || !p.name) return;
    const key = slug(p.name);
    const norm = {
      name: String(p.name), slug: key,
      feedUrl: p.feedUrl || p.feed_url || "",
      importUrl: p.importUrl || p.import_url || "",
      apiKey: p.apiKey || p.api_key || "",
    };
    if (byKey[key]) {
      const e = byKey[key];
      e.feedUrl = norm.feedUrl || e.feedUrl;
      e.importUrl = norm.importUrl || e.importUrl;
      e.apiKey = norm.apiKey || e.apiKey;
    } else { byKey[key] = norm; out.push(norm); }
  };
  // 1) Legacy-Comparis
  if (env.COMPARIS_FEED_URL || env.COMPARIS_IMPORT_URL) {
    add({ name: "comparis", feedUrl: env.COMPARIS_FEED_URL, importUrl: env.COMPARIS_IMPORT_URL, apiKey: env.COMPARIS_API_KEY });
  }
  // 2) Generische Portal-Liste
  if (env.LISTING_PORTALS) {
    try { const arr = JSON.parse(env.LISTING_PORTALS); if (Array.isArray(arr)) arr.forEach(add); } catch (e) { /* ignorieren */ }
  }
  return out;
}

export function portalsConfigured(env) { return getPortals(env).some((p) => p.feedUrl); }
export function importPortalsConfigured(env) { return getPortals(env).some((p) => p.importUrl); }

// ---- Export: freigegebenes Inserat an alle Portale pushen ----
async function postToPortal(portal, row, env) {
  try {
    const headers = { "Content-Type": "application/json" };
    if (portal.apiKey) headers["Authorization"] = "Bearer " + portal.apiKey;
    const r = await fetch(portal.feedUrl, { method: "POST", headers, body: JSON.stringify(toComparisPayload(row, env)) });
    return { portal: portal.name, ok: r.ok, status: r.status };
  } catch (e) {
    return { portal: portal.name, ok: false, error: String((e && e.message) || e) };
  }
}

// Pusht ein Inserat an alle Export-Portale (parallel). Wirft NIE — Fehler dürfen die
// Moderation/Freigabe nicht blockieren. Rückgabe: Array von Ergebnissen (leer = keins konfiguriert).
export async function crossPostToPortals(row, env) {
  if (!row || !row.id) return [];
  const ps = getPortals(env).filter((p) => p.feedUrl);
  if (!ps.length) return [];
  return Promise.all(ps.map((p) => postToPortal(p, row, env)));
}

// ---- Import: Portal-Inserate in die aban-Marktplatz-Form mappen ----
// Tolerant (mehrere Feldnamen), damit der Mapper ans echte Feed-Format angepasst werden kann.
export function fromPortalItem(item, portal, i = 0) {
  const it = item || {};
  const pslug = typeof portal === "string" ? slug(portal) : (portal && portal.slug) || "portal";
  const pname = typeof portal === "string" ? portal : (portal && portal.name) || "portal";
  const g = (...keys) => { for (const k of keys) { if (it[k] != null && it[k] !== "") return it[k]; } return ""; };
  const loc = typeof it.location === "object" && it.location ? it.location : {};
  const imgs = Array.isArray(it.images) ? it.images : (it.image ? [it.image] : []);
  const typ = String(g("type", "typ")).toLowerCase();
  let ts = Date.now();
  const created = g("published_at", "created", "date");
  if (created) { const d = new Date(created); if (!isNaN(d.getTime())) ts = d.getTime(); }
  return {
    id: pslug + "-" + String(g("external_id", "id") || i),
    kat: String(g("category", "kat")),
    ort: String(loc.city || g("city", "ort")),
    plz: String(loc.zip || g("zip", "plz")),
    titel: String(g("title", "titel")),
    beschreibung: String(g("description", "beschreibung")),
    preis: String(g("price", "preis")),
    kontakt: "", // externer Kontakt läuft über den Portal-Link, nicht über uns
    typ: (typ === "wanted" || typ === "gesuch") ? "Gesuch" : "Angebot",
    zustand: String(g("condition", "zustand")),
    bild: imgs[0] ? String(imgs[0]) : "",
    featured: 0,
    created: ts,
    status: "approved",
    source: pname,
    url: String(g("permalink", "url", "link")),
  };
}

async function fetchFromPortal(portal, env, { limit = 40 } = {}) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    let res;
    try {
      const headers = {};
      if (portal.apiKey) headers["Authorization"] = "Bearer " + portal.apiKey;
      res = await fetch(portal.importUrl, { headers, signal: ctrl.signal });
    } finally { clearTimeout(t); }
    if (!res || !res.ok) return [];
    const data = await res.json();
    const arr = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : []);
    return arr.map((it, i) => fromPortalItem(it, portal, i)).slice(0, Math.max(0, limit));
  } catch (e) {
    return [];
  }
}

// Holt Inserate aller Import-Portale (parallel, je 2,5s-Timeout), merged + filtert kat/q. Wirft nie.
export async function fetchPortalListings(env, { kat = "", q = "", limit = 40 } = {}) {
  const ps = getPortals(env).filter((p) => p.importUrl);
  if (!ps.length) return [];
  const lists = await Promise.all(ps.map((p) => fetchFromPortal(p, env, { limit })));
  let out = [].concat(...lists);
  if (kat) out = out.filter((x) => x.kat === kat);
  if (q) { const ql = q.toLowerCase(); out = out.filter((x) => (x.titel + " " + x.beschreibung).toLowerCase().includes(ql)); }
  return out.slice(0, Math.max(0, limit));
}
