// Cloudflare Pages Function — GET /api/kit-download?session_id=cs_...
// Gibt den Kit-Download erst frei, NACHDEM die Stripe-Zahlung serverseitig
// verifiziert wurde. Dateiname ist mit DOWNLOAD_SALT gehasht (unrätbar).
// Env (Pages-Projekt): STRIPE_API_KEY (geheim), DOWNLOAD_SALT (geheim).
// ASSETS stellt Cloudflare Pages bereit; HEAD prüft Verfügbarkeit, nicht ZIP-Inhalte.

const SECURITY = {
  "Access-Control-Allow-Origin": "*",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: SECURITY });
}

async function dlHash(slug, salt) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${slug}:${salt}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const key = (env.STRIPE_API_KEY || "").trim();
  // Derselbe normalisierte Salt wie beim Paketbau; ohne ihn gibt es keinen
  // belegten Dateinamen. Niemals einen scheinbar fertigen Link berechnen.
  const salt = (env.DOWNLOAD_SALT || "").trim();
  const assets = env.ASSETS;
  if (!key || !salt || !assets || typeof assets.fetch !== "function") {
    return json({ error: "Download derzeit nicht verfügbar. Bitte den Support kontaktieren." }, 503);
  }

  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json({ error: "Ungültige Session." }, 400);

  let session;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: controller.signal,
    });
    if (r.status === 404) return json({ error: "Zahlung nicht gefunden." }, 404);
    if (!r.ok) return json({ error: "Zahlung derzeit nicht prüfbar. Bitte später erneut prüfen." }, 503);
    session = await r.json();
    if (!session || typeof session !== "object" || typeof session.payment_status !== "string") {
      return json({ error: "Verifizierung fehlgeschlagen." }, 502);
    }
  } catch (e) {
    return json({ error: "Verifizierung fehlgeschlagen." }, 502);
  } finally {
    clearTimeout(timeout);
  }

  if (session.payment_status !== "paid") return json({ error: "Zahlung nicht abgeschlossen.", status: session.payment_status }, 402);
  const slug = (session.metadata && session.metadata.slug) || "";
  if (typeof slug !== "string" || !slug) {
    return json({ error: "Kein gültiges Produkt zugeordnet." }, 422);
  }

  const url = `/downloads/kits/${await dlHash(slug, salt)}.zip`;
  // Erst nach bestätigter Zahlung intern nur die Dateiköpfe prüfen. Keine
  // ZIP-Inhalte laden und weder Stripe-Zugang noch Käufer-Cookies weitergeben.
  const fileController = new AbortController();
  let fileTimeout;
  try {
    const deadline = new Promise((_, reject) => {
      fileTimeout = setTimeout(() => { fileController.abort(); reject(new Error("Dateiprüfung abgelaufen")); }, 4000);
    });
    const file = await Promise.race([assets.fetch(new Request(new URL(url, request.url), {
      method: "HEAD", redirect: "manual", signal: fileController.signal,
    })), deadline]);
    const type = (file.headers.get("Content-Type") || "").split(";", 1)[0].trim().toLowerCase();
    const size = file.headers.get("Content-Length");
    if (file.status !== 200 || !["application/zip", "application/x-zip-compressed", "application/octet-stream"].includes(type)
        || (size !== null && (!/^\d+$/.test(size) || Number(size) < 22))) {
      return json({ error: "Die bezahlte Datei ist derzeit nicht verfügbar. Bitte nicht nochmals kaufen und den Support kontaktieren." }, 503);
    }
  } catch {
    return json({ error: "Die bezahlte Datei ist derzeit nicht prüfbar. Bitte später erneut prüfen oder den Support kontaktieren." }, 503);
  } finally {
    clearTimeout(fileTimeout);
  }
  return json({ ok: true, slug, url });
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: SECURITY });
}
