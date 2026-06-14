// Cloudflare Pages Function — GET /api/ebay?q=...&limit=24&cat=...
// Holt echte eBay-Artikel über die offizielle Browse API und hängt das EPN-Affiliate-
// Tracking an (du verdienst Provision). Ohne Keys: liefert Demo-Daten, damit die Seite
// sofort funktioniert.
//
// Benötigte Pages-Secrets (Cloudflare-Projekt → Settings → Environment variables):
//   EBAY_CLIENT_ID      (App ID / Client ID aus developer.ebay.com, Production)
//   EBAY_CLIENT_SECRET  (Cert ID / Client Secret)
//   EBAY_CAMPAIGN_ID    (Campaign ID aus dem eBay Partner Network)
//   EBAY_MARKETPLACE    (optional, Standard EBAY_DE; z. B. EBAY_AT)

const CORS = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
}

let TOKEN = { v: null, exp: 0 };
async function getToken(env) {
  const now = Date.now();
  if (TOKEN.v && TOKEN.exp > now) return TOKEN.v;
  const basic = btoa(env.EBAY_CLIENT_ID + ":" + env.EBAY_CLIENT_SECRET);
  const r = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: { "Authorization": "Basic " + basic, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials&scope=" + encodeURIComponent("https://api.ebay.com/oauth/api_scope"),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error("token");
  TOKEN = { v: d.access_token, exp: now + ((d.expires_in || 7200) - 60) * 1000 };
  return TOKEN.v;
}

function demo(q) {
  const base = q || "Angebot";
  const out = [];
  const prices = ["19,90", "49,00", "129,00", "8,50", "299,00", "24,99", "75,00", "12,00"];
  for (let i = 0; i < 8; i++) {
    out.push({
      title: base + " — Beispiel-Artikel " + (i + 1) + " (Demo)",
      price: prices[i % prices.length] + " EUR",
      img: "", url: "#", cond: i % 2 ? "Neu" : "Gebraucht", loc: "DE",
    });
  }
  return out;
}

// Marktplatz → Standard-Währung fürs Preis-Filter
function curOf(mkt) {
  if (/EBAY_GB/.test(mkt)) return "GBP";
  if (/EBAY_US/.test(mkt)) return "USD";
  if (/EBAY_CH/.test(mkt)) return "CHF";
  return "EUR"; // DE/AT/FR/…
}
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const p = url.searchParams;
  const q = (p.get("q") || "").slice(0, 80);
  const limit = Math.min(parseInt(p.get("limit") || "24", 10) || 24, 50);
  if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET) {
    return json({ demo: true, reason: "no_keys", items: demo(q) });
  }
  try {
    const token = await getToken(env);
    const mkt = env.EBAY_MARKETPLACE || "EBAY_DE";
    const headers = { "Authorization": "Bearer " + token, "X-EBAY-C-MARKETPLACE-ID": mkt };
    if (env.EBAY_CAMPAIGN_ID) headers["X-EBAY-C-ENDUSERCTX"] = "affiliateCampaignId=" + env.EBAY_CAMPAIGN_ID;

    // Serverseitige Filter (alle optional, abwärtskompatibel)
    const filters = [];
    const pmin = parseFloat(p.get("pmin")), pmax = parseFloat(p.get("pmax"));
    if (!isNaN(pmin) || !isNaN(pmax)) {
      const lo = isNaN(pmin) ? "" : Math.max(0, pmin);
      const hi = isNaN(pmax) ? "" : Math.max(0, pmax);
      filters.push("price:[" + lo + ".." + hi + "]");
      filters.push("priceCurrency:" + curOf(mkt));
    }
    const cond = (p.get("cond") || "").split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
    const condMap = { neu: "NEW", new: "NEW", gebraucht: "USED", used: "USED" };
    const conds = [...new Set(cond.map((c) => condMap[c]).filter(Boolean))];
    if (conds.length) filters.push("conditions:{" + conds.join("|") + "}");

    const sortMap = { pasc: "price", pdesc: "-price", neu: "newlyListed", new: "newlyListed" };
    const sort = sortMap[(p.get("sort") || "").toLowerCase()] || "";

    let api = "https://api.ebay.com/buy/browse/v1/item_summary/search?limit=" + limit + "&q=" + encodeURIComponent(q || "angebote");
    if (filters.length) api += "&filter=" + encodeURIComponent(filters.join(","));
    if (sort) api += "&sort=" + encodeURIComponent(sort);
    const r = await fetch(api, { headers });
    const d = await r.json();
    if (!d.itemSummaries) return json({ demo: true, reason: "empty", items: demo(q) });
    const items = d.itemSummaries.map(function (it) {
      const img = (it.image && it.image.imageUrl) || (it.thumbnailImages && it.thumbnailImages[0] && it.thumbnailImages[0].imageUrl) || "";
      return {
        title: it.title || "",
        price: (it.price && (it.price.value + " " + it.price.currency)) || "",
        img: img,
        url: it.itemAffiliateWebUrl || it.itemWebUrl || "",
        cond: it.condition || "",
        loc: (it.itemLocation && it.itemLocation.country) || "",
      };
    });
    return json({ demo: false, items: items });
  } catch (e) {
    return json({ demo: true, reason: "error", items: demo(q) });
  }
}
