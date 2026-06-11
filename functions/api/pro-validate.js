// Cloudflare Pages Function — POST /api/pro-validate
// Prüft einen „aban Pro"-Lizenzschlüssel (Lemon Squeezy). Antwort: { valid, status }.
// Das Frontend (KI-Studio) speichert gültige Schlüssel lokal und schaltet die Tools frei.
import { validateLicense } from "../_pro.mjs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Pro-Key",
};
const SEC = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" };
function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...CORS, ...SEC, "Content-Type": "application/json; charset=utf-8" } });
}

export function onRequestOptions() { return new Response(null, { status: 204, headers: { ...CORS, ...SEC } }); }

export async function onRequestPost({ request, env }) {
  try {
    const raw = await request.text();
    if (raw.length > 2048) return json({ valid: false, error: "too_large" }, 413);
    let b; try { b = JSON.parse(raw); } catch { return json({ valid: false, error: "bad_json" }, 400); }
    const res = await validateLicense(b && b.license_key, env);
    return json({ valid: res.ok, status: res.status || res.reason, tier: res.tier || null });
  } catch (e) {
    return json({ valid: false, error: "server" }, 500);
  }
}
