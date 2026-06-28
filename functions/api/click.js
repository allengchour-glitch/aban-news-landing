// Cloudflare Pages Function — POST /api/click
// Nimmt einen anonymen Klick entgegen und zählt ihn AGGREGIERT in KV.
// Speichert NUR: Pfad + kurzes Label + Zähler. KEINE IP, KEIN Cookie, KEINE PII.
// Ohne KV-Bindung CLICK_KV → sauberer No-Op (204). Reine Edge-Logik.

function noStore(status) {
  return new Response(null, { status: status, headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.CLICK_KV) return noStore(204);          // nicht aktiviert → nichts tun
  let body;
  try { body = await request.json(); } catch (e) { return noStore(204); }
  let p = (body && body.p ? String(body.p) : "").slice(0, 80).replace(/[^\x20-\x7E]/g, "");
  let l = (body && body.l ? String(body.l) : "").slice(0, 80);
  if (!p && !l) return noStore(204);
  // Schlüssel: Pfad|Label (auf ASCII/erlaubte Länge begrenzt). Keine Nutzerdaten.
  const key = ("c:" + p + "|" + l).slice(0, 480);
  try {
    const cur = await env.CLICK_KV.get(key);
    const n = (parseInt(cur, 10) || 0) + 1;
    await env.CLICK_KV.put(key, String(n));         // racy, aber für grobe Zählung ok
  } catch (e) { /* still */ }
  return noStore(204);
}

export function onRequestOptions() { return noStore(204); }
