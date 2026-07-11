// /go/galaxus?q=<Suchbegriff>[&customid=<Seite>] — serverseitiger Redirect zur
// Galaxus-Suche (galaxus.ch). Bisher 404 (Funktion fehlte!) — 6 Kauf-CTAs auf
// 4 Kaufberater-Seiten liefen ins Leere.
//
// Galaxus-Affiliate läuft über externe Netzwerke; ohne Partner-ID ist das ein
// sauberer Deep-Link (Nutzerversprechen „auf Galaxus vergleichen" wird erfüllt).
// Optional: env GALAXUS_AFF_URL als Prefix-Wrapper (z. B. Netzwerk-Deeplink),
// dann wird die Ziel-URL URL-encodiert angehängt.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 200);

  const target = new URL("https://www.galaxus.ch/search");
  if (q) target.searchParams.set("q", q);

  let dest = target.toString();
  const wrap = (env.GALAXUS_AFF_URL || "").trim();
  if (wrap) dest = wrap + encodeURIComponent(dest);

  return new Response(null, {
    status: 302,
    headers: { "Location": dest, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer-when-downgrade" },
  });
}
