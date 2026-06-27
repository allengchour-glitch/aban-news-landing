// /go/ebay?q=<Suchbegriff>[&customid=<Seite>] — serverseitiger Affiliate-Redirect
// zu eBay.de (eBay Partner Network).
//
// Die campid ist KEIN Geheimnis — sie steht in jedem öffentlichen Affiliate-Link.
// Daher fest als Default hinterlegt (aktiv ohne Cloudflare-Dashboard) und per
// Cloudflare-Env EBAY_CAMPAIGN_ID überschreibbar. Volle EPN-Tracking-Parameter
// (mkevt/mkcid/mkrid/siteid/campid/toolid) — Ziel eBay.de (siteid 77), passend
// zum Partner-Konto. eBay.ch mit DE-Parametern trackt nicht zuverlässig.
const CAMPID_DEFAULT = "5339156671";
const MKRID = "707-53477-19255-0"; // eBay DE Rotation
const SITEID = "77";               // eBay Germany

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().slice(0, 200);
  const customid = (url.searchParams.get("customid") || "").trim().slice(0, 64);

  const target = new URL("https://www.ebay.de/sch/i.html");
  if (q) target.searchParams.set("_nkw", q);
  target.searchParams.set("_sop", "12"); // sort: best match

  const campid = (env.EBAY_CAMPAIGN_ID || CAMPID_DEFAULT).trim();
  if (campid) {
    target.searchParams.set("mkevt", "1");
    target.searchParams.set("mkcid", "1");
    target.searchParams.set("mkrid", MKRID);
    target.searchParams.set("siteid", SITEID);
    target.searchParams.set("campid", campid);
    target.searchParams.set("toolid", "10001");
    if (customid) target.searchParams.set("customid", customid);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: target.toString(),
      "Cache-Control": "no-store",
    },
  });
}
