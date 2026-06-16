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
// Näherungskurs EUR→CHF (kein Live-Kurs; Anzeige wird als „ca." gekennzeichnet)
const RATE_EUR_CHF = 0.95;
// Schweizer Tausendertrennung: 1850 -> 1'850
function fmtChf(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "'"); }

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const p = url.searchParams;
  const q = (p.get("q") || "").slice(0, 80);
  const limit = Math.min(parseInt(p.get("limit") || "24", 10) || 24, 50);
  // Besucherland: ?cc= (QA/Override) → Cloudflare cf.country → Header CF-IPCountry
  const cc = String(p.get("cc") || (request.cf && request.cf.country) || request.headers.get("CF-IPCountry") || "").toUpperCase();
  const isCH = cc === "CH";
  const currency = isCH ? "CHF" : "EUR";
  if (!env.EBAY_CLIENT_ID || !env.EBAY_CLIENT_SECRET) {
    return json({ demo: true, reason: "no_keys", currency, items: demo(q) });
  }
  try {
    const token = await getToken(env);
    const mkt = env.EBAY_MARKETPLACE || "EBAY_DE";
    const headers = { "Authorization": "Bearer " + token, "X-EBAY-C-MARKETPLACE-ID": mkt };
    if (env.EBAY_CAMPAIGN_ID) headers["X-EBAY-C-ENDUSERCTX"] = "affiliateCampaignId=" + env.EBAY_CAMPAIGN_ID;

    // Eingabe-Preisgrenzen sind in Anzeige-Währung; eBay-Filter rechnet in Markt-Währung (EBAY_DE = EUR).
    const pmin = parseFloat(p.get("pmin")), pmax = parseFloat(p.get("pmax"));
    const toEur = (v) => (isCH ? v / RATE_EUR_CHF : v);
    const filters = [];
    if (!isNaN(pmin) || !isNaN(pmax)) {
      const lo = isNaN(pmin) ? "" : Math.max(0, Math.floor(toEur(pmin)));
      const hi = isNaN(pmax) ? "" : Math.max(0, Math.ceil(toEur(pmax)));
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
    if (!d.itemSummaries) return json({ demo: true, reason: "empty", currency, items: demo(q) });
    let items = d.itemSummaries.map(function (it) {
      const img = (it.image && it.image.imageUrl) || (it.thumbnailImages && it.thumbnailImages[0] && it.thumbnailImages[0].imageUrl) || "";
      const eur = it.price ? parseFloat(it.price.value) : NaN;          // Originalpreis (EUR, Markt EBAY_DE)
      const dv = isNaN(eur) ? NaN : (isCH ? eur * RATE_EUR_CHF : eur);  // Anzeige-/Filterwert in Besucher-Währung
      const price = isNaN(eur) ? "" : (isCH ? ("≈ " + fmtChf(eur * RATE_EUR_CHF) + " CHF") : (it.price.value + " " + it.price.currency));
      return {
        title: it.title || "",
        price: price,
        img: img,
        url: it.itemAffiliateWebUrl || it.itemWebUrl || "",
        cond: it.condition || "",
        loc: (it.itemLocation && it.itemLocation.country) || "",
        _pv: dv,
      };
    });
    // Defensiv: Preis-/Sortier-Filter serverseitig erzwingen (in Anzeige-Währung)
    if (!isNaN(pmin)) items = items.filter((it) => !isNaN(it._pv) && it._pv >= pmin);
    if (!isNaN(pmax)) items = items.filter((it) => !isNaN(it._pv) && it._pv <= pmax);
    if (sort === "price" || sort === "-price") {
      items.sort((a, b) => {
        const x = isNaN(a._pv) ? Infinity : a._pv, y = isNaN(b._pv) ? Infinity : b._pv;
        return sort === "price" ? x - y : y - x;
      });
    }
    // Fahrzeug-Feinfilter (Jahr ab / km bis) — eBay liefert km/Baujahr nicht strukturiert,
    // daher aus dem Titel geparst. Mehrdeutige (nicht erkennbare) Treffer bleiben drin,
    // damit der Filter nicht alle Resultate verschluckt.
    const yearFrom = parseInt(p.get("yearFrom") || "", 10);
    const kmMax = parseInt(p.get("kmMax") || "", 10);
    const parseYear = (t) => { const m = String(t).match(/\b(19[89]\d|20[0-3]\d)\b/); return m ? parseInt(m[1], 10) : NaN; };
    const parseKm = (t) => {
      const s = String(t).toLowerCase().replace(/['’.\s](?=\d{3}\b)/g, "");
      let m = s.match(/(\d{4,6})\s*km/); if (m) return parseInt(m[1], 10);
      m = s.match(/(\d{1,3})\s*t\.?\s*km/); if (m) return parseInt(m[1], 10) * 1000;
      return NaN;
    };
    if (!isNaN(yearFrom)) items = items.filter((it) => { const y = parseYear(it.title); return isNaN(y) ? true : y >= yearFrom; });
    if (!isNaN(kmMax)) items = items.filter((it) => { const k = parseKm(it.title); return isNaN(k) ? true : k <= kmMax; });
    items.forEach((it) => { delete it._pv; });
    return json({ demo: false, currency, items: items });
  } catch (e) {
    return json({ demo: true, reason: "error", currency, items: demo(q) });
  }
}
