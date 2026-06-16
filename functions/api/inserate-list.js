// GET /api/inserate-list — gibt freigegebene Inserate zurück (mit Filter kat/q).
// ?status=pending nur mit gültigem Admin-Token (Header X-Admin-Token oder ?admin=).
// Falls Portale konfiguriert sind (Comparis/Homegate/… via LISTING_PORTALS), werden deren Inserate mit-eingeblendet.
import { importPortalsConfigured, fetchPortalListings } from "../_portals.mjs";
const H = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: H }); }

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ items: [], demo: true });
  const url = new URL(request.url);
  const status = url.searchParams.get("status") === "pending" ? "pending" : "approved";
  if (status === "pending") {
    const tok = request.headers.get("X-Admin-Token") || url.searchParams.get("admin") || "";
    if (!env.ADMIN_TOKEN || tok !== env.ADMIN_TOKEN) return json({ error: "unauth" }, 401);
  }
  const kat = (url.searchParams.get("kat") || "").slice(0, 40);
  const q = (url.searchParams.get("q") || "").slice(0, 60);
  const now = Date.now();
  let sql = "SELECT id,kat,ort,plz,titel,beschreibung,preis,kontakt,typ,zustand,bild,featured,created,status FROM inserate WHERE status=? AND (expires=0 OR expires>?)";
  const binds = [status, now];
  if (kat) { sql += " AND kat=?"; binds.push(kat); }
  if (q) { sql += " AND (titel LIKE ? OR beschreibung LIKE ?)"; binds.push("%" + q + "%", "%" + q + "%"); }
  sql += " ORDER BY featured DESC, created DESC LIMIT 80";
  try {
    const r = await env.DB.prepare(sql).bind(...binds).all();
    let items = r.results || [];
    // Portal-Inserate (Comparis/Homegate/…) einspeisen (nur in der öffentlichen, freigegebenen Ansicht).
    if (status === "approved" && importPortalsConfigured(env)) {
      const ext = await fetchPortalListings(env, { kat, q, limit: 40 });
      if (ext.length) {
        items = items.concat(ext)
          .sort((a, b) => (b.featured - a.featured) || (b.created - a.created))
          .slice(0, 80);
      }
    }
    return json({ items });
  } catch (e) { return json({ items: [], error: "db" }); }
}
