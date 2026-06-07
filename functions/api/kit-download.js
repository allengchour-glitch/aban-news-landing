// Cloudflare Pages Function — GET /api/kit-download?session_id=cs_...
// Gibt den Kit-Download erst frei, NACHDEM die Stripe-Zahlung serverseitig
// verifiziert wurde. Dateiname ist mit DOWNLOAD_SALT gehasht (unrätbar).
// Env (Pages-Projekt): STRIPE_API_KEY (geheim), DOWNLOAD_SALT (geheim).

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
  const key = env.STRIPE_API_KEY, salt = env.DOWNLOAD_SALT || "";
  if (!key) return json({ error: "Shop nicht konfiguriert." }, 503);

  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return json({ error: "Ungültige Session." }, 400);

  let session;
  try {
    const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!r.ok) return json({ error: "Zahlung nicht gefunden." }, 404);
    session = await r.json();
  } catch (e) {
    return json({ error: "Verifizierung fehlgeschlagen." }, 502);
  }

  if (session.payment_status !== "paid") return json({ error: "Zahlung nicht abgeschlossen.", status: session.payment_status }, 402);
  const slug = (session.metadata && session.metadata.slug) || "";
  if (!slug) return json({ error: "Kein Produkt zugeordnet." }, 422);

  const url = `/downloads/kits/${await dlHash(slug, salt)}.zip`;
  return json({ ok: true, slug, url });
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: SECURITY });
}
