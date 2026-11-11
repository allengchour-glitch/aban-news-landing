// Geteiltes „aban Pro"-Gating für Edge-Funktionen.
// Validiert einen Lemon-Squeezy-Lizenzschlüssel UND erkennt den Tier (Monat/Jahr)
// über meta.variant_id. No-op-sicher: ohne Schlüssel/bei Fehler => { ok:false }.

const LS_VALIDATE = "https://api.lemonsqueezy.com/v1/licenses/validate";
const CACHE = new Map();            // key -> { ok, status, tier, exp }
const TTL_MS = 10 * 60 * 1000;      // 10 min Cache je Edge-Instanz

// Jahres-Variante (für „Jahr = mehr"). Über Env PRO_YEARLY_VARIANT_ID überschreibbar.
const YEARLY_VARIANT_ID_DEFAULT = 1777696;

export function readProKey(request, body) {
  const h = request.headers.get("X-Pro-Key");
  if (h) return String(h).trim();
  if (body && body.license_key) return String(body.license_key).trim();
  if (body && body.pro_key) return String(body.pro_key).trim();
  return "";
}

export async function validateLicense(key, env) {
  key = (key || "").trim();
  if (!key || key.length < 8) return { ok: false, reason: "missing", tier: null };

  const now = Date.now();
  const c = CACHE.get(key);
  if (c && c.exp > now) return { ok: c.ok, reason: "cache", status: c.status, tier: c.tier };

  const yearlyId = Number((env && env.PRO_YEARLY_VARIANT_ID) || YEARLY_VARIANT_ID_DEFAULT);
  const controller = new AbortController();
  let timeout;
  // Eine gemeinsame Frist für Transport und Inhalt; Abort allein reicht nicht
  // bei blockierten Adaptern. Keine Wiederholung oder negative Cache-Antwort.
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error("Lizenzprüfung abgelaufen"));
    }, 8000);
  });
  try {
    const r = await Promise.race([fetch(LS_VALIDATE, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: "license_key=" + encodeURIComponent(key),
      signal: controller.signal,
    }), deadline]);
    // Anbieterfehler sind kein Nachweis einer ungültigen Lizenz. Nicht cachen,
    // damit eine spätere manuelle Prüfung nach der Störung wieder möglich ist.
    if (!r.ok) return { ok: false, reason: "error", tier: null };
    const d = await Promise.race([r.json(), deadline]);
    // Nur eine ausdrückliche boolesche Entscheidung ist eine Lizenzantwort.
    // HTML, leere oder unvollständige Antworten bleiben Anbieterfehler und
    // dürfen die spätere manuelle Prüfung nicht durch einen Cache sperren.
    if (!d || typeof d !== "object" || Array.isArray(d) || typeof d.valid !== "boolean"
        || (d.valid && (typeof d.license_key?.status !== "string" || !d.license_key.status.trim()))) {
      return { ok: false, reason: "error", tier: null };
    }
    const status = (d && d.license_key && d.license_key.status) || "";
    const ok = !!(d && d.valid) && (status === "active" || status === "inactive");
    const variantId = d && d.meta && Number(d.meta.variant_id);
    const tier = ok ? (variantId === yearlyId ? "yearly" : "monthly") : null;
    if (CACHE.size > 5000) CACHE.clear();
    CACHE.set(key, { ok, status, tier, exp: now + TTL_MS });
    return { ok, reason: ok ? "valid" : "invalid", status, tier };
  } catch (e) {
    return { ok: false, reason: "error", tier: null };
  } finally {
    clearTimeout(timeout);
  }
}

export async function requirePro(request, body, env) {
  return validateLicense(readProKey(request, body), env);
}
