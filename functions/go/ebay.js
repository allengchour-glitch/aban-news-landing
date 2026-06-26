// /go/ebay?q=<Suchbegriff> — serverseitiger Affiliate-Redirect zu eBay.ch
// Liest EBAY_CAMPAIGN_ID aus den Cloudflare-Pages-Secrets (nie im Repo!).
// Ohne gesetztes Secret wird ohne campid weitergeleitet (kein Tracking, kein Fehler).
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 200);

  const target = new URL("https://www.ebay.ch/sch/i.html");
  if (q) target.searchParams.set("_nkw", q);
  target.searchParams.set("_sop", "12"); // sort: best match

  const campid = (env.EBAY_CAMPAIGN_ID || "").trim();
  if (campid) {
    target.searchParams.set("campid", campid);
    target.searchParams.set("toolid", "10001");
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      "Cache-Control": "no-store",
    },
  });
}
