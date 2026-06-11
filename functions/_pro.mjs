// Geteiltes „aban Pro"-Gating für Edge-Funktionen.
// Validiert einen Lemon-Squeezy-Lizenzschlüssel des Pro-Abos.
// Wichtig: Der LS-Validate-Endpoint braucht KEINEN Store-API-Key — nur den Schlüssel.
// No-op-sicher: ohne Schlüssel/bei Fehler => { ok:false }.

const LS_VALIDATE = "https://api.lemonsqueezy.com/v1/licenses/validate";
const CACHE = new Map();            // key -> { ok, status, exp }
const TTL_MS = 10 * 60 * 1000;      // 10 min Cache je Edge-Instanz (spart LS-Calls)

export function readProKey(request, body) {
  const h = request.headers.get("X-Pro-Key");
  if (h) return String(h).trim();
  if (body && body.license_key) return String(body.license_key).trim();
  if (body && body.pro_key) return String(body.pro_key).trim();
  return "";
}

export async function validateLicense(key, env) {
  key = (key || "").trim();
  if (!key || key.length < 8) return { ok: false, reason: "missing" };

  const now = Date.now();
  const c = CACHE.get(key);
  if (c && c.exp > now) return { ok: c.ok, reason: "cache", status: c.status };

  try {
    const r = await fetch(LS_VALIDATE, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: "license_key=" + encodeURIComponent(key),
    });
    const d = await r.json().catch(() => ({}));
    const status = (d && d.license_key && d.license_key.status) || "";
    // gültig = LS meldet valid UND Status ist aktiv (oder noch nicht aktiviert).
    const ok = !!(d && d.valid) && (status === "active" || status === "inactive");
    if (CACHE.size > 5000) CACHE.clear();
    CACHE.set(key, { ok, status, exp: now + TTL_MS });
    return { ok, reason: ok ? "valid" : "invalid", status };
  } catch (e) {
    return { ok: false, reason: "error" };
  }
}

// Komfort: liest den Schlüssel aus Header/Body und validiert.
export async function requirePro(request, body, env) {
  return validateLicense(readProKey(request, body), env);
}
