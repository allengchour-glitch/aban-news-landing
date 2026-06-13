// POST /api/inserat-submit — nimmt ein eigenes Inserat entgegen (Status: pending).
// Speichert in Cloudflare D1 (Binding-Name: DB). Ohne DB -> 503 (Anbindung fehlt).
const H = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
function json(o, s = 200) { return new Response(JSON.stringify(o), { status: s, headers: H }); }

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "db_not_configured" }, 503);
  let b; try { b = await request.json(); } catch { return json({ ok: false, error: "bad_json" }, 400); }
  if (b.website) return json({ ok: true }); // Honeypot: Bots tappen rein, wir tun so als ob ok
  const s = (x, n) => String(x == null ? "" : x).trim().slice(0, n);
  const titel = s(b.titel, 120), beschreibung = s(b.beschreibung, 2000), kat = s(b.kat, 40),
    ort = s(b.ort, 60), plz = s(b.plz, 12), preis = s(b.preis, 30), kontakt = s(b.kontakt, 140);
  if (titel.length < 3 || beschreibung.length < 10 || kontakt.length < 3) return json({ ok: false, error: "unvollstaendig" }, 400);
  const now = Date.now();
  const ip = request.headers.get("CF-Connecting-IP") || "";
  try {
    const rc = await env.DB.prepare("SELECT COUNT(*) AS c FROM inserate WHERE ip=? AND created>?").bind(ip, now - 600000).first();
    if (rc && rc.c >= 5) return json({ ok: false, error: "zu_viele" }, 429);
    await env.DB.prepare(
      "INSERT INTO inserate(kat,ort,plz,titel,beschreibung,preis,kontakt,status,created,expires,ip) VALUES(?,?,?,?,?,?,?, 'pending', ?, ?, ?)"
    ).bind(kat, ort, plz, titel, beschreibung, preis, kontakt, now, now + 60 * 86400000, ip).run();
  } catch (e) { return json({ ok: false, error: "db" }, 500); }
  return json({ ok: true });
}
