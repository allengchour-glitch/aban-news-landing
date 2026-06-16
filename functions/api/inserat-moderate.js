// POST /api/inserat-moderate — Moderation (nur mit Admin-Token).
// Body: { admin, id, action }  action = "approve" | "reject" | "delete"
import { portalsConfigured, crossPostToPortals } from "../_portals.mjs";
const H = { "Access-Control-Allow-Origin": "https://abannews.com", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: H }); }

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "db_not_configured" }, 503);
  let b; try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  const tok = b.admin || request.headers.get("X-Admin-Token") || "";
  if (!env.ADMIN_TOKEN || tok !== env.ADMIN_TOKEN) return json({ ok: false, error: "unauth" }, 401);
  const id = parseInt(b.id, 10), action = b.action;
  if (!id) return json({ ok: false, error: "id" }, 400);
  try {
    if (action === "approve") {
      // Nur bei der ERSTEN Freigabe an alle Portale cross-posten (Idempotenz: kein Re-Post bei Re-Approve).
      const cur = await env.DB.prepare("SELECT status FROM inserate WHERE id=?").bind(id).first();
      await env.DB.prepare("UPDATE inserate SET status='approved' WHERE id=?").bind(id).run();
      if (cur && cur.status !== "approved" && portalsConfigured(env)) {
        const row = await env.DB.prepare("SELECT * FROM inserate WHERE id=?").bind(id).first();
        if (row) await crossPostToPortals(row, env); // wirft nie; Fehler blockiert die Freigabe nicht
      }
    }
    else if (action === "reject" || action === "delete") await env.DB.prepare("DELETE FROM inserate WHERE id=?").bind(id).run();
    else return json({ ok: false, error: "action" }, 400);
  } catch (e) { return json({ ok: false, error: "db" }, 500); }
  return json({ ok: true });
}
