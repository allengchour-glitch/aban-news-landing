// GET /api/luxestyle — eigener Shop als Quelle für aban (volle Marge statt nur Provision).
// Holt den öffentlichen Shopify-Feed (kein Secret nötig), normalisiert und cached.
// ?q= Stichwort, ?limit= (max 50). Treffer verlinken auf luxestyle.ch/products/<handle>.

const FEED = "https://luxestyle.ch/products.json?limit=250";
const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=1800" };
function json(o) { return new Response(JSON.stringify(o), { headers: CORS }); }

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").toLowerCase().slice(0, 80);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "24", 10) || 24, 50);
  try {
    const r = await fetch(FEED, { cf: { cacheTtl: 1800, cacheEverything: true }, headers: { "user-agent": "aban-marktplatz/1.0" } });
    if (!r.ok) return json({ items: [], error: "feed_" + r.status });
    const d = await r.json();
    let items = (d.products || []).map((p) => {
      const v = (p.variants || [])[0] || {};
      const img = (p.images || [])[0];
      const tags = Array.isArray(p.tags) ? p.tags.join(" ") : String(p.tags || "");
      return {
        title: p.title || "",
        price: v.price ? Number(v.price).toFixed(2) + " CHF" : "",
        img: img ? img.src : "",
        url: "https://luxestyle.ch/products/" + p.handle,
        type: p.product_type || "",
        _hay: ((p.title || "") + " " + (p.product_type || "") + " " + tags).toLowerCase(),
      };
    });
    if (q) items = items.filter((it) => it._hay.includes(q));
    items = items.slice(0, limit).map(({ _hay, ...rest }) => rest);
    return json({ items });
  } catch (e) {
    return json({ items: [], error: "fetch" });
  }
}
